// src/pages/PreviewDocumento.tsx
"use client";

/**
 * Preview unificado para Holerite, Benefícios e Genérico.
 * - Benefícios usa o mesmo layout do Holerite.
 * - O PDF de Benefícios vem de /documents/beneficios/montar (pdf_base64).
 * - Aceite/baixar: se houver pdf_base64, mantém os mesmos botões/fluxos.
 * - Normalização "cabeçalho" -> cabecalho via helper getCabecalho.
 * - [Ajuste]: quando NÃO houver cabecalho em Benefícios, preenche os mesmos
 *   campos da UI com os dados "soltos" do montar e (se preciso) com /beneficios/buscar.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import api from "@/utils/axiosInstance";
import { toast } from "sonner";
import { FaCheckCircle } from "react-icons/fa";

// Tipos para Holerite
interface Cabecalho {
  empresa: string | number;
  filial: string | number;
  empresa_nome?: string;
  empresa_cnpj?: string;
  cliente: string | number;
  cliente_nome?: string;
  cliente_cnpj?: string;
  matricula: string | number;
  nome?: string;
  funcao_nome?: string;
  admissao?: string;
  competencia: string; // "YYYY", "YYYYMM" ou "YYYY-MM"
  lote?: number | string;
  uuid?: string;
}

interface Evento {
  evento: number;
  evento_nome: string;
  referencia: number;
  valor: number;
  tipo: "V" | "D";
}

interface Rodape {
  total_vencimentos: number;
  total_descontos: number;
  valor_liquido: number;
  salario_base: number;
  sal_contr_inss: number;
  base_calc_fgts: number;
  fgts_mes: number;
  base_calc_irrf: number;
  dep_sf: number;
  dep_irf: number;
}

// Tipos para documentos genéricos
interface DocumentoGenerico {
  id_documento: string;
  id_ged?: string;
  situacao: string;
  nomearquivo: string;
  versao1: string;
  versao2: string;
  tamanho: string;
  datacriacao: string;
  cliente: string;
  colaborador: string;
  regional: string;
  cr: string;
  anomes: string; // "YYYY-MM" ou "YYYYMM"
  tipodedoc: string; // nome do documento
  status: string;
  observacao: string;
  datadepagamento: string;
  matricula: string;
  _norm_anomes: string; // label
  aceito?: boolean;
}

// Utils
function padLeft(value: string | number, width: number): string {
  return String(value).trim().padStart(width, "0");
}

function fmtNum(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function truncate(text: string | undefined | null, maxLen: number): string {
  const safeText = text ?? "";
  return safeText.length <= maxLen
    ? safeText
    : safeText.slice(0, maxLen - 3) + "...";
}

function fmtRef(value: number): string {
  return value === 0
    ? ""
    : Number(value || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

// Normaliza para "YYYYMM"
function normalizeCompetencia(v: string | number | undefined | null): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/^\d{6}$/.test(s)) return s; // "YYYYMM"
  if (/^\d{4}-\d{2}$/.test(s)) return s.replace("-", ""); // "YYYY-MM" -> "YYYYMM"
  if (/^\d{2}\/\d{4}$/.test(s)) {
    // "MM/YYYY"
    const [mm, yyyy] = s.split("/");
    return `${yyyy}${mm.padStart(2, "0")}`;
  }
  return s.replace(/\D/g, "");
}

function cleanBase64Pdf(b64: string): string {
  return String(b64 || "").replace(/^data:application\/pdf;base64,/, "");
}

const asStr = (v: unknown) =>
  v === null || v === undefined ? undefined : String(v);

// Normaliza cabecalho (aceita "cabeçalho" e "cabecalho")
function getCabecalho(obj: any): any {
  if (!obj) return undefined;
  if (obj.cabecalho) return obj.cabecalho;
  if (obj["cabeçalho"]) return obj["cabeçalho"];
  return undefined;
}

// Decode base64 com segurança
function safeAtobToBytes(b64: string): Uint8Array {
  const clean = cleanBase64Pdf(b64).replace(/\s+/g, "");
  const bin = atob(clean);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const isDefined = (v: any) => typeof v !== "undefined" && v !== null;

/** === AJUSTE UUID (novo helper) ======================== */
function extractUuidFromAny(input: any): string | undefined {
  if (!input) return undefined;

  const looksLikeUuid = (val: any) =>
    typeof val === "string" && /^[0-9a-fA-F-]{16,}$/.test(val);

  const tryObj = (obj: any): string | undefined => {
    if (!obj) return undefined;
    // diretos comuns
    if (looksLikeUuid(obj.uuid)) return obj.uuid;
    if (looksLikeUuid(obj.UUID)) return obj.UUID;
    if (looksLikeUuid(obj.id_uuid)) return obj.id_uuid;
    if (looksLikeUuid(obj.uuid_beneficio)) return obj.uuid_beneficio;

    // dentro do cabecalho
    const cab = getCabecalho(obj) || obj.cabecalho || obj["cabeçalho"];
    if (looksLikeUuid(cab?.uuid)) return cab.uuid;

    // itens comuns
    const maybeArrays = ["items", "data", "beneficios", "eventos", "results"];
    for (const key of maybeArrays) {
      const arr = obj?.[key];
      if (Array.isArray(arr)) {
        for (const it of arr) {
          const got = tryObj(it);
          if (got) return got;
        }
      }
    }
    return undefined;
  };

  if (Array.isArray(input)) {
    for (const it of input) {
      const got = tryObj(it);
      if (got) return got;
    }
  }
  return tryObj(input);
}
/** ====================================================== */

type PreviewState =
  | {
      pdf_base64: string;
      tipo: "holerite";
      cabecalho: Cabecalho;
      eventos: Evento[];
      rodape: Rodape;
      competencia_forced?: string; // YYYYMM
      aceito?: boolean;
      uuid?: string;
    }
  | {
      pdf_base64: string;
      tipo: "generico";
      documento_info: DocumentoGenerico;
    }
  | {
      // Benefícios
      tipo: "beneficios";
      pdf_base64?: string; // opcional: se o back mandar
      cabecalho?: any;
      ["cabeçalho"]?: any;
      beneficios?: Array<{
        empresa: number;
        filial: number;
        cliente: number;
        matricula: number | string;
        cpf: string;
        competencia: string; // YYYYMM
        lote: number | string;
        evento: number;
        evento_nome: string;
        referencia: number;
        valor: number;
        tipo: "V" | "D";
      }>;
      competencia_forced?: string; // YYYYMM

      // alguns backends enviam estes campos “soltos” no montar
      cpf?: string;
      matricula?: number | string;
      competencia?: string;
      empresa?: number;
      filial?: number;
      cliente?: number;
      lote?: number | string;
      eventos?: any[]; // em alguns retornos, além de beneficios
    };

export default function PreviewDocumento() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const [isDownloading, setIsDownloading] = useState(false);

  const state = (location.state as PreviewState | null) || null;

  useEffect(() => {
    if (!state) return;
    if (state?.tipo === "generico" && (state as any)?.documento_info) {
      document.title = `${(state as any).documento_info.tipodedoc} - ${
        (state as any).documento_info._norm_anomes
      }`;
    } else if (state?.tipo === "beneficios") {
      document.title = "Demonstrativo de Benefícios";
    } else {
      document.title = "Recibo de Pagamento de Salário";
    }
  }, [state]);

  // ===== Aceite (consulta assíncrona por UUID ou id_ged) =====
  const [aceiteLoading, setAceiteLoading] = useState(false);
  const [aceiteFlag, setAceiteFlag] = useState<boolean | null>(null);

  // fonte “legada” (fallback) — só usada se não houver retorno da consulta
  const legacyAceito = useMemo(() => {
    if (!state) return false;
    if ((state as any).tipo === "generico")
      return !!(state as any).documento_info?.aceito;
    if (typeof (state as any).aceito !== "undefined")
      return !!(state as any).aceito;
    try {
      const raw = sessionStorage.getItem("holeriteData");
      if (!raw) return false;
      const j = JSON.parse(raw);
      return !!j?.aceito;
    } catch {
      return false;
    }
  }, [state]);

  // prioridade: resultado da consulta > legacyAceito
  const isAceito =
    aceiteFlag === true ? true : aceiteFlag === false ? false : legacyAceito;

  // ===== [NOVO] Dados extras de Benefícios quando NÃO há cabecalho =====
  const [benefExtraCab, setBenefExtraCab] = useState<any | null>(null);

  /** === AJUSTE UUID: cache local do uuid de benefícios === */
  const [benefUuid, setBenefUuid] = useState<string | undefined>(undefined);

  // Inicializa benefUuid a partir do state (cabecalho ou qualquer nível)
  useEffect(() => {
    if (!state || (state as any).tipo !== "beneficios") return;
    const cab = getCabecalho(state);
    const u = cab?.uuid || extractUuidFromAny(state);
    if (u) setBenefUuid(u);
  }, [state]);

  // Chama /beneficios/buscar APENAS quando NÃO existe cabecalho no montar
  useEffect(() => {
    if (!state || (state as any).tipo !== "beneficios") return;

    const cabBase = getCabecalho(state);
    const hasCab = !!cabBase;
    if (hasCab) return; // não altera nada quando existe cabecalho

    // payload a partir dos campos “soltos” do montar
    const payload = {
      cpf: (state as any)?.cpf,
      matricula: (state as any)?.matricula,
      competencia: normalizeCompetencia(
        (state as any)?.competencia_forced ?? (state as any)?.competencia
      ),
    };

    if (!payload.cpf || !payload.matricula || !payload.competencia) return;

    (async () => {
      try {
        const res = await api.post("/documents/beneficios/buscar", payload);
        const data = res?.data;
        // tenta extrair cabecalho do retorno
        const candidate =
          getCabecalho(data) ??
          getCabecalho((data && data[0]) || {}) ??
          (Array.isArray(data?.items)
            ? getCabecalho(data.items[0])
            : undefined) ??
          data?.cabecalho ??
          (Array.isArray(data) ? data[0]?.cabecalho : undefined);

        if (candidate) setBenefExtraCab(candidate);

        // [NOVO] captura uuid de qualquer formato/nível e guarda
        const u = extractUuidFromAny(data) || candidate?.uuid;
        if (u) setBenefUuid(u);
      } catch (e) {
        console.warn("fallback beneficios/buscar falhou:", e);
      }
    })();
  }, [state]);

  // ===== Consulta /status-doc/consultar =====
  useEffect(() => {
    if (!state) return;

    let canceled = false;

    const run = async () => {
      try {
        setAceiteLoading(true);

        if (state.tipo === "holerite" || state.tipo === "beneficios") {
          let uuid: string | undefined;

          if (state.tipo === "holerite") {
            uuid = (state as any).uuid || (state as any).cabecalho?.uuid;
            if (!uuid) {
              try {
                const raw = sessionStorage.getItem("holeriteData");
                if (raw) {
                  const j = JSON.parse(raw);
                  uuid = j?.uuid || getCabecalho(j)?.uuid;
                }
              } catch {}
            }
          } else {
            const cabBase = getCabecalho(state);
            const hasCab = !!cabBase;
            const cab = hasCab ? cabBase : benefExtraCab; // só usa buscar quando não tem cabecalho
            uuid = cab?.uuid || benefUuid; // [NOVO] usa benefUuid como fallback
          }

          if (!uuid) {
            setAceiteFlag(null);
            return;
          }

          const res = await api.post<{ id: number; aceito: boolean }>(
            "/status-doc/consultar",
            { uuid: String(uuid) }
          );
          if (canceled) return;
          setAceiteFlag(!!res.data?.aceito);
          return;
        }

        // genérico
        const idGed =
          asStr((state as any)?.documento_info?.id_documento) ??
          asStr((state as any)?.documento_info?.id_ged);

        if (!idGed) {
          setAceiteFlag(null);
          return;
        }

        const res = await api.post<{ id: number; aceito: boolean }>(
          "/status-doc/consultar",
          { id_ged: String(idGed) }
        );
        if (canceled) return;
        setAceiteFlag(!!res.data?.aceito);
      } catch {
        if (canceled) return;
        setAceiteFlag(null);
      } finally {
        if (!canceled) setAceiteLoading(false);
      }
    };

    run();
    return () => {
      canceled = true;
    };
  }, [state, benefExtraCab, benefUuid]);

  const renderAceitoBadge = () => {
    if (aceiteLoading) {
      return (
        <span className="inline-flex items-center gap-2">
          <span className="text-white/80 text-sm md:text-base">
            Verificando…
          </span>
          <span className="inline-flex items-center justify-center rounded-full bg-white/20 p-2">
            <Loader2
              className="w-4 h-4 animate-spin text-white"
              aria-label="Verificando aceite"
            />
          </span>
        </span>
      );
    }
    if (isAceito) {
      return (
        <span className="inline-flex items-center gap-2 ml-auto self-end sm:self-auto pb-2 sm:pb-0">
          <p className="text-emerald-400 font-bold">Aceito</p>
          <FaCheckCircle
            className="w-10 h-10 text-emerald-400"
            aria-label="Documento aceito"
          />
        </span>
      );
    }
    return null;
  };

  const handleDownload = async () => {
    if (!(state as any)?.pdf_base64) {
      alert("PDF não disponível.");
      return;
    }

    try {
      setIsDownloading(true);
      const bytes = safeAtobToBytes((state as any).pdf_base64);
      const ab = (bytes.buffer as ArrayBuffer).slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      );
      const blob = new Blob([ab], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      if ((state as any).tipo === "generico" && (state as any).documento_info) {
        const nome =
          (state as any).documento_info.nomearquivo ||
          (state as any).documento_info.tipodedoc ||
          "documento";
        link.download = `${nome}.pdf`;
      } else if (
        (state as any).tipo === "holerite" &&
        (state as any).cabecalho
      ) {
        const comp =
          normalizeCompetencia((state as any).competencia_forced) ||
          normalizeCompetencia((state as any).cabecalho.competencia);
        link.download = `holerite_${(state as any).cabecalho.matricula}_${
          comp || "YYYYMM"
        }.pdf`;
      } else if ((state as any).tipo === "beneficios") {
        const cabBase = getCabecalho(state);
        const hasCab = !!cabBase;
        const baseFromState = {
          empresa:
            (state as any)?.empresa ??
            (state as any)?.beneficios?.[0]?.empresa ??
            (state as any)?.eventos?.[0]?.empresa,
          filial:
            (state as any)?.filial ??
            (state as any)?.beneficios?.[0]?.filial ??
            (state as any)?.eventos?.[0]?.filial,
          cliente:
            (state as any)?.cliente ??
            (state as any)?.beneficios?.[0]?.cliente ??
            (state as any)?.eventos?.[0]?.cliente,
          matricula:
            (state as any)?.matricula ??
            (state as any)?.beneficios?.[0]?.matricula ??
            (state as any)?.eventos?.[0]?.matricula,
          competencia:
            (state as any)?.competencia ??
            (state as any)?.beneficios?.[0]?.competencia ??
            (state as any)?.eventos?.[0]?.competencia,
        };
        const cabResolved: any = hasCab
          ? cabBase
          : { ...(benefExtraCab || {}), ...baseFromState };

        const comp =
          normalizeCompetencia((state as any).competencia_forced) ||
          normalizeCompetencia(cabResolved?.competencia) ||
          normalizeCompetencia((state as any)?.competencia);
        const mat = (cabResolved?.matricula ?? "mat").toString();
        link.download = `beneficios_${mat}_${comp || "YYYYMM"}.pdf`;
      } else {
        link.download = "documento.pdf";
      }

      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      }, 300);
    } catch (e) {
      console.error("Erro ao baixar PDF:", e);
      alert("Erro ao baixar o PDF.");
      setIsDownloading(false);
    }
  };

  // confirma no backend (uuid ou id_ged) e depois baixa
  // confirma no backend (uuid ou id_ged) e depois baixa
  const handleAcceptAndDownload = async () => {
    if (!(state as any)?.pdf_base64) {
      toast.error("PDF não disponível para confirmar.");
      return;
    }

    const tipo_doc =
      (state as any)?.tipo === "holerite"
        ? "holerite"
        : (state as any)?.tipo === "beneficios"
        ? "beneficios"
        : (state as any)?.documento_info?.tipodedoc || "generico";

    let matricula = "";
    let competencia = "";
    let unidade = "";
    let uuid: string | undefined;
    let id_ged: string | undefined;

    // ===== HOLERITE =====
    if ((state as any)?.tipo === "holerite" && (state as any)?.cabecalho) {
      matricula = String((state as any).cabecalho.matricula ?? "");
      competencia =
        normalizeCompetencia((state as any).competencia_forced) ||
        normalizeCompetencia((state as any).cabecalho.competencia);
      unidade =
        (state as any).cabecalho.cliente_nome ||
        (state as any).cabecalho.cliente ||
        "";
      uuid = (state as any).uuid || (state as any).cabecalho?.uuid;
      if (!uuid) {
        try {
          const raw = sessionStorage.getItem("holeriteData");
          if (raw) {
            const j = JSON.parse(raw);
            uuid = j?.uuid || getCabecalho(j)?.uuid;
          }
        } catch {}
      }

      // ===== BENEFÍCIOS =====
    } else if ((state as any)?.tipo === "beneficios") {
      const cabBase = getCabecalho(state);
      const hasCab = !!cabBase;

      const baseFromState = {
        empresa:
          (state as any)?.empresa ??
          (state as any)?.beneficios?.[0]?.empresa ??
          (state as any)?.eventos?.[0]?.empresa,
        filial:
          (state as any)?.filial ??
          (state as any)?.beneficios?.[0]?.filial ??
          (state as any)?.eventos?.[0]?.filial,
        cliente:
          (state as any)?.cliente ??
          (state as any)?.beneficios?.[0]?.cliente ??
          (state as any)?.eventos?.[0]?.cliente,
        matricula:
          (state as any)?.matricula ??
          (state as any)?.beneficios?.[0]?.matricula ??
          (state as any)?.eventos?.[0]?.matricula,
        competencia:
          (state as any)?.competencia ??
          (state as any)?.beneficios?.[0]?.competencia ??
          (state as any)?.eventos?.[0]?.competencia,
      };

      const cabAll: any = hasCab
        ? cabBase
        : { ...(benefExtraCab || {}), ...baseFromState };

      matricula = String(cabAll?.matricula ?? "");
      competencia =
        normalizeCompetencia((state as any).competencia_forced) ||
        normalizeCompetencia(cabAll?.competencia) ||
        normalizeCompetencia((state as any)?.competencia);
      unidade = cabAll?.cliente_nome || cabAll?.cliente || "";

      // prioridade: cabecalho.uuid -> benefUuid
      uuid = cabAll?.uuid || benefUuid;

      // fallback: buscar uuid na hora (com mais pistas, se tivermos)
      if (!uuid) {
        try {
          const cpfDigits =
            String((user as any)?.cpf ?? "").replace(/\D/g, "") ||
            (state as any)?.cpf;
          const buscarPayload: any = {
            cpf: cpfDigits,
            matricula: String(matricula),
            competencia: String(competencia),
          };
          if (isDefined(baseFromState.empresa))
            buscarPayload.empresa = baseFromState.empresa;
          if (isDefined(baseFromState.filial))
            buscarPayload.filial = baseFromState.filial;
          if (isDefined(baseFromState.cliente))
            buscarPayload.cliente = baseFromState.cliente;

          const res = await api.post(
            "/documents/beneficios/buscar",
            buscarPayload
          );
          uuid =
            extractUuidFromAny(res?.data) ||
            getCabecalho(res?.data)?.uuid ||
            (Array.isArray(res?.data)
              ? getCabecalho(res.data[0])?.uuid
              : undefined);
          if (uuid) setBenefUuid(uuid);
        } catch {}
      }

      // ===== GENÉRICO (TRTC, INFORME, etc) =====
    } else if (
      (state as any)?.tipo === "generico" &&
      (state as any)?.documento_info
    ) {
      const info = (state as any).documento_info;

      // trata vazio como "não preenchido"
      const clean = (v: any) =>
        v === null || v === undefined ? "" : String(v).trim();

      const docMat = clean(info.matricula);
      const stateMat = clean((state as any)?.matricula);
      const userMat =
        clean((user as any)?.matricula) ||
        clean((user as any)?.registration_number) ||
        clean((user as any)?.registration);

      matricula = docMat || stateMat || userMat || "";

      const docCli = clean(info.cliente);
      const userCli = clean((user as any)?.cliente);

      unidade = docCli || userCli || "";

      const rawComp =
        info.anomes ??
        info._norm_anomes ??
        (state as any)?.competencia_forced ??
        info.ano ??
        info.ANO ??
        "";

      // aqui a gente normaliza, mas lá embaixo a validação de YYYYMM só vale para holerite/benefícios
      competencia = normalizeCompetencia(rawComp);

      id_ged =
        asStr(info.id_documento) ??
        asStr(info.id_ged) ??
        asStr(info.id) ??
        asStr(info.ID);

      console.log("[STATUS-DOC] GEN fill (TRTC/Informe)", {
        from: "generico-block",
        docMat,
        stateMat,
        userMat,
        finalMatricula: matricula,
        docCli,
        userCli,
        finalUnidade: unidade,
        rawComp,
        competencia,
        id_ged,
      });
    }

    // [DEBUG] TRTC / Informe – antes de qualquer validação/return
    if (
      (state as any)?.tipo === "generico" &&
      typeof (state as any)?.documento_info?.tipodedoc === "string"
    ) {
      const tipodedocRaw = (state as any).documento_info.tipodedoc;
      const tipodedoc = tipodedocRaw.toLowerCase();
        tipodedoc.includes("informe") && tipodedoc.includes("rend");
    }

    const cpfDigits = String((user as any)?.cpf ?? "").replace(/\D/g, "") || "";

    const isHolBenef =
      (state as any)?.tipo === "holerite" ||
      (state as any)?.tipo === "beneficios";

    if (!matricula && isHolBenef) {
      toast.error("Matrícula não encontrada para confirmar o documento.");
      await handleDownload();
      return;
    }

    // Para holerite/benefícios: exige YYYYMM
    // Para genérico (TRCT, informes etc.): apenas exige que exista algum período
    if (!competencia || (isHolBenef && !/^\d{6}$/.test(competencia))) {
      toast.error(
        isHolBenef
          ? "Competência inválida para confirmar o documento."
          : "Período do documento não localizado para confirmar."
      );
      await handleDownload();
      return;
    }

    if (!cpfDigits || cpfDigits.length !== 11) {
      toast.error("CPF do usuário indisponível ou inválido.");
      await handleDownload();
      return;
    }

    const payload: any = {
  aceito: true,
  tipo_doc,
  base64: cleanBase64Pdf((state as any).pdf_base64),
  cpf: String(cpfDigits),
  // sempre manda matricula, mesmo vazia
  matricula: matricula ?? "",
};

if (unidade) payload.unidade = String(unidade);
if (competencia) payload.competencia = String(competencia);

if (
  (state as any)?.tipo === "holerite" ||
  (state as any)?.tipo === "beneficios"
) {
  if (uuid) payload.uuid = String(uuid);
}
if ((state as any)?.tipo === "generico" && id_ged) {
  payload.id_ged = String(id_ged);
}
    // LOG APENAS PARA TRTC / INFORME DE RENDIMENTOS
    if ((state as any)?.tipo === "generico") {
      const tipodedocRaw = (state as any)?.documento_info?.tipodedoc;
      const tipodedoc = String(tipodedocRaw || "").toLowerCase();
        tipodedoc.includes("informe") && tipodedoc.includes("rend");

    }

    try {
      setIsDownloading(true);
      await api.post("/status-doc", payload);
      toast.success("Documento confirmado com sucesso.");
      setAceiteFlag(true);
      await handleDownload();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Não foi possível confirmar o documento agora.";
      toast.warning("Não confirmamos o aceite, mas vamos baixar o PDF.", {
        description: msg,
      });
      await handleDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 text-white text-xl font-bold">
        Carregando...
      </div>
    );
  }

  // Guard: só bloqueia quando NÃO for benefícios e não houver PDF
  if (
    !state ||
    (!(state as any).pdf_base64 && (state as any).tipo !== "beneficios")
  ) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 bg-[#1e1e2f] text-white text-center">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="default"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft /> Voltar
            </Button>
            {renderAceitoBadge()}
          </div>

          <p className="text-lg">
            Dados do documento não encontrados. Volte e tente novamente.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // ======== GENÉRICO ========
  if ((state as any).tipo === "generico" && (state as any).documento_info) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-600">
        <Header />
        <main className="flex-grow p-8 pt-24">
          <div className="flex md:flex-row justify-between items-start rounded-lg">
            <Button
              variant="default"
              onClick={() => navigate(-1)}
              className="mb-4 flex items-center gap-2 text-white "
            >
              <ArrowLeft /> Voltar
            </Button>

            {renderAceitoBadge()}
          </div>

          {/* PDF */}
          <div
            className="relative overflow-hidden border rounded-lg bg-white mx-auto"
            style={{ width: "100%", maxWidth: "900px", height: "600px" }}
          >
            <iframe
              src={`data:application/pdf;base64,${cleanBase64Pdf(
                (state as any).pdf_base64
              )}`}
              className="w-full h-full border-0"
              title="Visualizador de PDF"
            />
          </div>

          <div className="flex justify-center items-center pb-8 pt-4 gap-3">
            <Button
              onClick={() => {
                return isAceito ? handleDownload() : handleAcceptAndDownload();
              }}
              className="bg-green-600 hover:bg-green-500 w-full sm:w-56 h-10"
              disabled={isDownloading}
            >
              <Download className="mr-2 w-4 h-4" />
              {isDownloading
                ? "Confirmando..."
                : isAceito
                ? "Baixar documento"
                : "Aceitar e baixar documento"}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ======== BENEFÍCIOS — Layout idêntico ao Holerite (sem mudar posições) ========
  if ((state as any).tipo === "beneficios") {
    const cabBase = getCabecalho(state);
    const hasCab = !!cabBase;

    // Quando NÃO há cabecalho: completa dados com “soltos” e (se existir) benefExtraCab
    const baseFromState = {
      empresa:
        (state as any)?.empresa ??
        (state as any)?.beneficios?.[0]?.empresa ??
        (state as any)?.eventos?.[0]?.empresa,
      filial:
        (state as any)?.filial ??
        (state as any)?.beneficios?.[0]?.filial ??
        (state as any)?.eventos?.[0]?.filial,
      cliente:
        (state as any)?.cliente ??
        (state as any)?.beneficios?.[0]?.cliente ??
        (state as any)?.eventos?.[0]?.cliente,
      matricula:
        (state as any)?.matricula ??
        (state as any)?.beneficios?.[0]?.matricula ??
        (state as any)?.eventos?.[0]?.matricula,
      cpf:
        (state as any)?.cpf ??
        (state as any)?.beneficios?.[0]?.cpf ??
        (state as any)?.eventos?.[0]?.cpf,
      competencia:
        (state as any)?.competencia ??
        (state as any)?.beneficios?.[0]?.competencia ??
        (state as any)?.eventos?.[0]?.competencia,
      lote:
        (state as any)?.lote ??
        (state as any)?.beneficios?.[0]?.lote ??
        (state as any)?.eventos?.[0]?.lote,
    };

    const cab: any = hasCab
      ? cabBase
      : { ...(benefExtraCab || {}), ...baseFromState };
    const lista = (state as any).beneficios ?? [];

    // Totais
    const totV = lista.reduce(
      (s: number, b: any) => s + (b?.tipo === "V" ? Number(b.valor || 0) : 0),
      0
    );
    const totD = lista.reduce(
      (s: number, b: any) => s + (b?.tipo === "D" ? Number(b.valor || 0) : 0),
      0
    );
    const valLiq = totV - totD;

    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-600">
        <Header />
        <main className="flex-grow p-4 max-sm:p-2 max-sm:pt-24 pt-24 bg-white">
          {/* Linha topo: Voltar / Check/Spinner */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="default"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-white "
            >
              <ArrowLeft /> Voltar
            </Button>
            {renderAceitoBadge()}
          </div>

          {/* Cabeçalho (mesma estrutura/posições) */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start">
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-bold">
                Demonstrativo de Benefícios
              </h1>
              <div className="text-sm md:text-base">
                <strong>Empresa:</strong>{" "}
                {isDefined(cab?.empresa)
                  ? `${padLeft(cab.empresa, 3)} - ${
                      isDefined(cab?.filial) ? cab.filial : ""
                    } `
                  : ""}
                {cab?.empresa_nome ?? ""}
                {cab?.empresa_cnpj && (
                  <div className="block md:hidden text-xs pr-4 whitespace-nowrap overflow-x-auto">
                    <strong>Nº Inscrição:</strong> {cab.empresa_cnpj}
                  </div>
                )}
              </div>
              <div className="text-sm md:text-base mt-2">
                <strong>Cliente:</strong>{" "}
                {(isDefined(cab?.cliente) ? String(cab.cliente) : "") +
                  (cab?.cliente_nome ? ` ${cab.cliente_nome}` : "")}
                {cab?.cliente_cnpj && (
                  <div className="block md:hidden text-xs whitespace-nowrap overflow-x-auto">
                    <strong>Nº Inscrição:</strong> {cab.cliente_cnpj}
                  </div>
                )}
              </div>
            </div>

            {/* CNPJs (desktop) */}
            <div className="text-xs md:text-sm text-left md:text-right md:pt-7 whitespace-nowrap">
              {cab?.empresa_cnpj && (
                <div className="hidden md:block">
                  <strong>Nº Inscrição:</strong> {cab.empresa_cnpj}
                </div>
              )}
              {cab?.cliente_cnpj && (
                <div className="hidden md:block">
                  <strong>Nº Inscrição:</strong> {cab.cliente_cnpj}
                </div>
              )}
            </div>
          </div>

          {/* Grid infos (mesma estrutura/posições).
              >>> Campos "Nome do Funcionário", "Função" e "Admissão" ficam ocultos se vazios. */}
          <div className="mb-6 text-xs md:text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
            <div className="flex flex-col">
              <strong className="pb-1 md:pb-2">Código</strong>{" "}
              {isDefined(cab?.matricula) ? padLeft(cab.matricula, 6) : "-"}
            </div>

            {cab?.nome && (
              <div className="flex flex-col">
                <strong className="pb-1 md:pb-2">Nome do Funcionário</strong>{" "}
                {truncate(cab.nome, 30)}
              </div>
            )}

            {cab?.funcao_nome && (
              <div className="flex flex-col">
                <strong className="pb-1 md:pb-2">Função</strong>{" "}
                {cab.funcao_nome}
              </div>
            )}

            {cab?.admissao && (
              <div className="flex flex-col">
                <strong className="pb-1 md:pb-2">Admissão</strong>{" "}
                {cab.admissao}
              </div>
            )}

            <div className="flex flex-col">
              <strong className="pb-1 md:pb-2">Competência</strong>{" "}
              {((state as any).competencia_forced || cab?.competencia || "")
                .toString()
                .replace(/(\d{4})(\d{2})/, "$1-$2")}
            </div>
          </div>

          <div className="bg-gray-300 w-full h-[1px] my-2"></div>

          {/* Tabela benefícios (inalterada) */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 md:p-2 text-left border-r-[1px]">
                    <span className="sm:hidden">Cód.</span>
                    <span className="hidden sm:inline">Cód.</span>
                  </th>
                  <th className="p-1 md:p-2 text-center border-r-[1px]">
                    <span className="sm:hidden">Descr</span>
                    <span className="hidden sm:inline">Descrição</span>
                  </th>
                  <th className="p-1 md:p-2 text-center border-r-[1px]">
                    <span className="sm:hidden">Ref</span>
                    <span className="hidden sm:inline">Referência</span>
                  </th>
                  <th className="p-1 md:p-2 text-center border-r-[1px]">
                    <span className="sm:hidden">Venci</span>
                    <span className="hidden sm:inline">Vencimentos</span>
                  </th>
                  <th className="p-1 md:p-2 text-center">
                    <span className="sm:hidden">Desc</span>
                    <span className="hidden sm:inline">Descontos</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {((state as any).beneficios ?? []).map(
                  (b: any, idx: number) => (
                    <tr
                      key={idx}
                      className={idx % 2 ? "bg-gray-100" : "bg-white"}
                    >
                      <td className="p-1 md:p-2 border-r-[1px]">{b.evento}</td>
                      <td className="p-1 md:p-2 border-r-[1px]">
                        {truncate(b.evento_nome, 35)}
                      </td>
                      <td className="p-1 md:p-2 text-center border-r-[1px]">
                        {b?.referencia ? fmtRef(Number(b.referencia)) : ""}
                      </td>
                      <td className="p-1 md:p-2 text-center border-r-[1px]">
                        {b?.tipo === "V" ? fmtNum(Number(b.valor || 0)) : ""}
                      </td>
                      <td className="p-1 md:p-2 text-center">
                        {b?.tipo === "D" ? fmtNum(Number(b.valor || 0)) : ""}
                      </td>
                    </tr>
                  )
                )}
                {(!(state as any).beneficios ||
                  (state as any).beneficios.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center p-3">
                      Sem lançamentos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-300 w-full h-[1px] my-2"></div>

          {/* Totais (inalterado) */}
          <div className="my-4 md:my-6 flex flex-col sm:flex-row justify-between text-xs md:text-sm">
            <div className="hidden sm:flex justify-end sm:justify-start xl:pl-[700px]">
              <div className="flex flex-col text-right">
                <strong>Total Vencimentos:</strong> {fmtNum(totV)}
              </div>
            </div>
            <div className="sm:hidden flex flex-col gap-2">
              <div className="flex justify-between">
                <strong>Total Vencimentos:</strong>
                <span>{fmtNum(totV)}</span>
              </div>
              <div className="flex justify-between">
                <strong>Total Descontos:</strong>
                <span>{fmtNum(totD)}</span>
              </div>
              <div className="flex justify-between">
                <strong>Valor Líquido:</strong>
                <span>{fmtNum(valLiq)}</span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <div className="flex flex-col text-right">
                <strong>Total Descontos:</strong> {fmtNum(totD)}
              </div>
              <div className="pt-2 md:pt-4">
                <strong>Valor Líquido:</strong> {fmtNum(valLiq)}
              </div>
            </div>
          </div>
        </main>

        {(state as any).pdf_base64 && (
          <div className="flex justify-center items-center p-8 md:p-16">
            <Button
              onClick={isAceito ? handleDownload : handleAcceptAndDownload}
              className="bg-green-600 hover:bg-green-500 h-10"
              disabled={isDownloading}
            >
              <Download className="mr-2 w-4 h-4" />
              {isDownloading
                ? "Confirmando..."
                : isAceito
                ? "Baixar demonstrativo"
                : "Aceitar e baixar Benefícios"}
            </Button>
          </div>
        )}
        <Footer />
      </div>
    );
  }

  // ======== HOLERITE ========
  if (
    (state as any).tipo === "holerite" &&
    (!(state as any).cabecalho ||
      !(state as any).eventos ||
      !(state as any).rodape)
  ) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 bg-[#1e1e2f] text-white text-center">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="default"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft /> Voltar
            </Button>
            {renderAceitoBadge()}
          </div>

          <p className="text-lg">
            Dados do holerite não encontrados. Volte e tente novamente.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if ((state as any).tipo !== "holerite") return null;
  const { cabecalho, eventos, rodape } = state as any;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-600">
      <Header />
      <main className="flex-grow p-8 max-sm:p-2 max-sm:pt-24 pt-24 bg-white">
        {/* Linha topo: Voltar / Check/Spinner */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="default"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white "
          >
            <ArrowLeft /> Voltar
          </Button>

          {renderAceitoBadge()}
        </div>

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold">
              Recibo de Pagamento de Salário
            </h1>
            <div className="text-sm md:text-base">
              <strong>Empresa:</strong> {padLeft(cabecalho.empresa, 3)} -{" "}
              {cabecalho.filial} {cabecalho.empresa_nome}
              <div className="block md:hidden text-xs pr-4 whitespace-nowrap overflow-x-auto">
                <strong>Nº Inscrição:</strong> {cabecalho.empresa_cnpj}
              </div>
            </div>
            <div className="text-sm md:text-base mt-2">
              <strong>Cliente:</strong> {cabecalho.cliente}{" "}
              {cabecalho.cliente_nome}
              <div className="block md:hidden text-xs whitespace-nowrap overflow-x-auto">
                <strong>Nº Inscrição:</strong> {cabecalho.cliente_cnpj}
              </div>
            </div>
          </div>
          <div className="text-xs md:text-sm text-left md:text-right md:pt-7 whitespace-nowrap">
            <div className="hidden md:block">
              <strong>Nº Inscrição:</strong> {cabecalho.empresa_cnpj}
            </div>
            <div className="hidden md:block">
              <strong>Nº Inscrição:</strong> {cabecalho.cliente_cnpj}
            </div>
          </div>
        </div>

        {/* >>> Oculta Nome/Função/Admissão se vazios no holerite também */}
        <div className="mb-6 text-xs md:text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Código</strong>{" "}
            {padLeft(cabecalho.matricula, 6)}
          </div>

          {cabecalho.nome && (
            <div className="flex flex-col">
              <strong className="pb-1 md:pb-2">Nome do Funcionário</strong>{" "}
              {truncate(cabecalho.nome, 30)}
            </div>
          )}

          {cabecalho.funcao_nome && (
            <div className="flex flex-col">
              <strong className="pb-1 md:pb-2">Função</strong>{" "}
              {cabecalho.funcao_nome}
            </div>
          )}

          {cabecalho.admissao && (
            <div className="flex flex-col">
              <strong className="pb-1 md:pb-2">Admissão</strong>{" "}
              {cabecalho.admissao}
            </div>
          )}

          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Competência</strong>{" "}
            {(state as any).competencia_forced
              ? `${(state as any).competencia_forced.slice(0, 4)}-${(
                  state as any
                ).competencia_forced.slice(4, 6)}`
              : cabecalho.competencia}
          </div>
        </div>

        <div className="bg-gray-300 w-full h-[1px] my-2"></div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1 md:p-2 text-left border-r-[1px]">
                  <span className="sm:hidden">Cód.</span>
                  <span className="hidden sm:inline">Cód.</span>
                </th>
                <th className="p-1 md:p-2 text-center border-r-[1px]">
                  <span className="sm:hidden">Descr</span>
                  <span className="hidden sm:inline">Descrição</span>
                </th>
                <th className="p-1 md:p-2 text-center border-r-[1px]">
                  <span className="sm:hidden">Ref</span>
                  <span className="hidden sm:inline">Referência</span>
                </th>
                <th className="p-1 md:p-2 text-center border-r-[1px]">
                  <span className="sm:hidden">Venci</span>
                  <span className="hidden sm:inline">Vencimentos</span>
                </th>
                <th className="p-1 md:p-2 text-center">
                  <span className="sm:hidden">Desc</span>
                  <span className="hidden sm:inline">Descontos</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(eventos as Evento[]).map((e: Evento, idx: number) => (
                <tr key={idx} className={idx % 2 ? "bg-gray-100" : "bg-white"}>
                  <td className="p-1 md:p-2 border-r-[1px]">{e.evento}</td>
                  <td className="p-1 md:p-2 border-r-[1px]">
                    {truncate(e.evento_nome, 35)}
                  </td>
                  <td className="p-1 md:p-2 text-center border-r-[1px]">
                    {fmtRef(e.referencia)}
                  </td>
                  <td className="p-1 md:p-2 text-center border-r-[1px]">
                    {e.tipo === "V" ? fmtNum(e.valor) : ""}
                  </td>
                  <td className="p-1 md:p-2 text-center">
                    {e.tipo === "D" ? fmtNum(e.valor) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-300 w-full h-[1px] my-2"></div>

        {/* Totais */}
        <div className="my-4 md:my-6 flex flex-col sm:flex-row justify-between text-xs md:text-sm">
          <div className="hidden sm:flex justify-end sm:justify-start xl:pl-[700px]">
            <div className="flex flex-col text-right">
              <strong>Total Vencimentos:</strong>{" "}
              {fmtNum(rodape.total_vencimentos)}
            </div>
          </div>
          <div className="sm:hidden flex flex-col gap-2">
            <div className="flex justify-between">
              <strong>Total Vencimentos:</strong>
              <span>{fmtNum(rodape.total_vencimentos)}</span>
            </div>
            <div className="flex justify-between">
              <strong>Total Descontos:</strong>
              <span>{fmtNum(rodape.total_descontos)}</span>
            </div>
            <div className="flex justify-between">
              <strong>Valor Líquido:</strong>
              <span>{fmtNum(rodape.valor_liquido)}</span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col text-right">
            <div className="flex flex-col text-right">
              <strong>Total Descontos:</strong> {fmtNum(rodape.total_descontos)}
            </div>
            <div className="pt-2 md:pt-4">
              <strong>Valor Líquido:</strong> {fmtNum(rodape.valor_liquido)}
            </div>
          </div>
        </div>
      </main>

      <div className="flex justify-center items-center p-8 md:p-16">
        <Button
          onClick={isAceito ? handleDownload : handleAcceptAndDownload}
          className="bg-green-600 hover:bg-green-500 h-10"
          disabled={isDownloading}
        >
          <Download className="mr-2 w-4 h-4" />
          {isDownloading
            ? "Confirmando..."
            : isAceito
            ? "Baixar holerite"
            : "Aceitar e baixar holerite"}
        </Button>
      </div>
      <Footer />
    </div>
  );
}
