"use client";

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
  empresa: string;
  filial: string;
  empresa_nome: string;
  empresa_cnpj: string;
  cliente: string;
  cliente_nome: string;
  cliente_cnpj: string;
  matricula: string;
  nome: string;
  funcao_nome: string;
  admissao: string;
  competencia: string; // pode vir "YYYY", "YYYYMM" ou "YYYY-MM"
  lote: number;
  uuid?: string;
}

interface Evento {
  evento: number;
  evento_nome: string;
  referencia: number;
  valor: number;
  tipo: string;
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
  id_ged?: string; // string! será usado no /status-doc/consultar e /status-doc
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
  anomes: string;        // "YYYY-MM" ou "YYYYMM"
  tipodedoc: string;     // nome do documento
  status: string;
  observacao: string;
  datadepagamento: string;
  matricula: string;
  _norm_anomes: string;  // label
  aceito?: boolean;
}

// Utils
function padLeft(value: string | number, width: number): string {
  return String(value).trim().padStart(width, "0");
}

function fmtNum(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function truncate(text: string | undefined | null, maxLen: number): string {
  const safeText = text ?? "";
  return safeText.length <= maxLen ? safeText : safeText.slice(0, maxLen - 3) + "...";
}

function fmtRef(value: number): string {
  return value === 0
    ? ""
    : value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

// Normaliza para "YYYYMM"
function normalizeCompetencia(v: string | undefined | null): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/^\d{6}$/.test(s)) return s;               // "YYYYMM"
  if (/^\d{4}-\d{2}$/.test(s)) return s.replace("-", ""); // "YYYY-MM" -> "YYYYMM"
  if (/^\d{2}\/\d{4}$/.test(s)) {               // "MM/YYYY" -> "YYYYMM"
    const [mm, yyyy] = s.split("/");
    return `${yyyy}${mm.padStart(2,"0")}`;
  }
  return s.replace(/\D/g, "");
}

function cleanBase64Pdf(b64: string): string {
  return b64.replace(/^data:application\/pdf;base64,/, "");
}

const asStr = (v: unknown) =>
  v === null || v === undefined ? undefined : String(v);

type PreviewState =
  | ({
      pdf_base64: string;
      tipo: "holerite";
      cabecalho: Cabecalho;
      eventos: Evento[];
      rodape: Rodape;
      competencia_forced?: string; // YYYYMM
      aceito?: boolean;
      uuid?: string; // pode vir do montar
    })
  | ({
      pdf_base64: string;
      tipo: "generico";
      documento_info: DocumentoGenerico;
    });

export default function PreviewDocumento() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const [isDownloading, setIsDownloading] = useState(false);

  const state = (location.state as PreviewState | null) || null;

  useEffect(() => {
    if (state?.tipo === "generico" && state?.documento_info) {
      document.title = `${state.documento_info.tipodedoc} - ${state.documento_info._norm_anomes}`;
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
    if (state.tipo === "generico") return !!state.documento_info?.aceito;
    if (typeof state.aceito !== "undefined") return !!state.aceito;
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
  const isAceito = aceiteFlag === true ? true : (aceiteFlag === false ? false : legacyAceito);

  // [NOVO] consulta /status-doc/consultar:
  // - holerite: via uuid
  // - genérico: via id_ged (string) = id_documento
  useEffect(() => {
    if (!state) return;

    let canceled = false;

    const run = async () => {
      try {
        setAceiteLoading(true);

        if (state.tipo === "holerite") {
          // tentar pegar uuid do state/cabecalho/sessionStorage
          let uuid = state.uuid || state.cabecalho?.uuid;
          if (!uuid) {
            try {
              const raw = sessionStorage.getItem("holeriteData");
              if (raw) {
                const j = JSON.parse(raw);
                uuid = j?.uuid || j?.cabecalho?.uuid;
              }
            } catch {}
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
          asStr(state.documento_info?.id_ged) ??
          asStr(state.documento_info?.id_documento);

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
  }, [state]);

  const renderAceitoBadge = () => {
    if (aceiteLoading) {
      return (
        <span className="inline-flex items-center gap-2">
          <span className="text-white/80 text-sm md:text-base">Verificando…</span>
          <span className="inline-flex items-center justify-center rounded-full bg-white/20 p-2">
            <Loader2 className="w-4 h-4 animate-spin text-white" aria-label="Verificando aceite" />
          </span>
        </span>
      );
    }
    if (isAceito) {
      return (
         <span className="inline-flex items-center gap-2 ml-auto self-end sm:self-auto pb-2 sm:pb-0">
          <p className="text-green-500">Aceito</p>
          <FaCheckCircle className="w-10 h-10 text-green-500" aria-label="Documento aceito" />
        </span>
      );
    }
    return null;
  };

  const handleDownload = async () => {
    if (!state?.pdf_base64) {
      alert("PDF não disponível.");
      return;
    }

    try {
      setIsDownloading(true);
      const byteCharacters = atob(cleanBase64Pdf(state.pdf_base64));
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      if (state.tipo === "generico" && state.documento_info) {
        const nome =
          state.documento_info.nomearquivo ||
          state.documento_info.tipodedoc ||
          "documento";
        link.download = `${nome}.pdf`;
      } else if (state.tipo === "holerite" && state.cabecalho) {
        const comp =
          normalizeCompetencia((state as any).competencia_forced) ||
          normalizeCompetencia(state.cabecalho.competencia);
        link.download = `holerite_${state.cabecalho.matricula}_${comp || "YYYYMM"}.pdf`;
      } else {
        link.download = "documento.pdf";
      }

      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      }, 100);
    } catch (e) {
      console.error("Erro ao baixar PDF:", e);
      alert("Erro ao baixar o PDF.");
      setIsDownloading(false);
    }
  };

  // confirma no backend (uuid ou id_ged) e depois baixa
  const handleAcceptAndDownload = async () => {
    if (!state?.pdf_base64) {
      toast.error("PDF não disponível para confirmar.");
      return;
    }

    const tipo_doc =
      state?.tipo === "holerite"
        ? "holerite"
        : (state as any)?.documento_info?.tipodedoc || "generico";

    // matrícula / competência / unidade (holerite vs genérico)
    let matricula = "";
    let competencia = "";
    let unidade = "";
    let uuid: string | undefined;
    let id_ged: string | undefined;

    if (state?.tipo === "holerite" && state?.cabecalho) {
      matricula = String(state.cabecalho.matricula ?? "");
      competencia =
        normalizeCompetencia((state as any).competencia_forced) ||
        normalizeCompetencia(state.cabecalho.competencia);

      if (!/^\d{6}$/.test(competencia)) {
        toast.error("Competência do holerite inválida", {
          description:
            "Não foi possível identificar o mês (formato esperado: YYYYMM). Abra o holerite pelo mês desejado e tente novamente.",
        });
        return;
      }
      unidade = state.cabecalho.cliente_nome || (state.cabecalho as any).cliente || "";
      uuid = state.uuid || state.cabecalho?.uuid;
      if (!uuid) {
        try {
          const raw = sessionStorage.getItem("holeriteData");
          if (raw) {
            const j = JSON.parse(raw);
            uuid = j?.uuid || j?.cabecalho?.uuid;
          }
        } catch {}
      }
    } else if (state?.tipo === "generico" && state?.documento_info) {
      const info = state.documento_info;
      matricula = String(info.matricula ?? "");
      competencia = normalizeCompetencia(info.anomes || info._norm_anomes);
      unidade = info.cliente || "";
      id_ged =
        asStr(info.id_ged) ??
        asStr(info.id_documento); // sempre string
    }

    // CPF do contexto
    const cpfDigits = String((user as any)?.cpf ?? "").replace(/\D/g, "") || "";

    if (!matricula) {
      toast.error("Matrícula não encontrada para confirmar o documento.");
      return;
    }
    if (!competencia || !/^\d{6}$/.test(competencia)) {
      toast.error("Competência inválida para confirmar o documento.");
      return;
    }
    if (!cpfDigits || cpfDigits.length !== 11) {
      toast.error("CPF do usuário indisponível ou inválido.");
      return;
    }

    const payload: any = {
      aceito: true,
      tipo_doc,
      base64: cleanBase64Pdf(state.pdf_base64),
      matricula: String(matricula),
      cpf: String(cpfDigits),
      unidade: String(unidade || ""),
      competencia: String(competencia),
    };

    // adiciona identificador certo
    if (state?.tipo === "holerite" && uuid) {
      payload.uuid = String(uuid);
    }
    if (state?.tipo === "generico" && id_ged) {
      payload.id_ged = String(id_ged);
    }

    try {
      setIsDownloading(true);
      await api.post("/status-doc", payload);
      toast.success("Documento confirmado com sucesso.");
      setAceiteFlag(true); // refletir na UI
      await handleDownload();
    } catch (err: any) {
      console.error("Falha ao confirmar /status-doc:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Não foi possível confirmar o documento.";
      toast.error("Erro ao confirmar", { description: msg });
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

  if (!state || !state.pdf_base64) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 bg-[#1e1e2f] text-white text-center">
          <div className="flex items-center justify-between mb-4">
            <Button variant="default" onClick={() => navigate(-1)} className="flex items-center gap-2">
              <ArrowLeft /> Voltar
            </Button>
            {renderAceitoBadge()}
          </div>

          <p className="text-lg">Dados do documento não encontrados. Volte e tente novamente.</p>
        </main>
        <Footer />
      </div>
    );
  }

  // ======== GENÉRICO ========
  if (state.tipo === "generico" && state.documento_info) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-600">
        <Header />
        <main className="flex-grow p-8 pt-24">
          <div className="flex md:flex-row justify-between items-start rounded-lg">
            <Button variant="default" onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-white ">
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
              src={`data:application/pdf;base64,${cleanBase64Pdf(state.pdf_base64)}`}
              className="w-full h-full border-0"
              title="Visualizador de PDF"
            />
          </div>

          <div className="flex justify-center items-center pb-8 pt-4 gap-3">
            <Button
              onClick={isAceito ? handleDownload : handleAcceptAndDownload}
              className="bg-green-600 hover:bg-green-500 w-full sm:w-56 h-10"
              disabled={isDownloading}
            >
              <Download className="mr-2 w-4 h-4" />
              {isDownloading
                ? "Confirmando..."
                : (isAceito ? "Baixar documento" : "Aceitar e baixar documento")}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ======== HOLERITE ========
  if (state.tipo === "holerite" && (!state.cabecalho || !state.eventos || !state.rodape)) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 bg-[#1e1e2f] text-white text-center">
          <div className="flex items-center justify-between mb-4">
            <Button variant="default" onClick={() => navigate(-1)} className="flex items-center gap-2">
              <ArrowLeft /> Voltar
            </Button>
            {renderAceitoBadge()}
          </div>

          <p className="text-lg">Dados do holerite não encontrados. Volte e tente novamente.</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (state.tipo !== "holerite") return null;
  const { cabecalho, eventos, rodape } = state;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-600">
      <Header />
      <main className="flex-grow p-8 max-sm:p-2 max-sm:pt-24 pt-24 bg-white">
        {/* Linha topo: Voltar / Check/Spinner */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="default" onClick={() => navigate(-1)} className="flex items-center gap-2 text-white ">
            <ArrowLeft /> Voltar
          </Button>

          {renderAceitoBadge()}
        </div>

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold">Recibo de Pagamento de Salário</h1>
            <div className="text-sm md:text-base">
              <strong>Empresa:</strong> {padLeft(cabecalho.empresa, 3)} - {cabecalho.filial} {cabecalho.empresa_nome}
              <div className="block md:hidden text-xs pr-4 whitespace-nowrap overflow-x-auto">
                <strong>Nº Inscrição:</strong> {cabecalho.empresa_cnpj}
              </div>
            </div>
            <div className="text-sm md:text-base mt-2">
              <strong>Cliente:</strong> {cabecalho.cliente} {cabecalho.cliente_nome}
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

        <div className="mb-6 text-xs md:text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Código</strong> {padLeft(cabecalho.matricula, 6)}
          </div>
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Nome do Funcionário</strong> {truncate(cabecalho.nome, 30)}
          </div>
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Função</strong> {cabecalho.funcao_nome}
          </div>
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Admissão</strong> {cabecalho.admissao}
          </div>
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Competência</strong>{" "}
            {state.tipo === "holerite" && (state as any).competencia_forced
              ? `${(state as any).competencia_forced.slice(0,4)}-${(state as any).competencia_forced.slice(4,6)}`
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
              {eventos.map((e: Evento, idx: number) => (
                <tr key={idx} className={idx % 2 ? "bg-gray-100" : "bg-white"}>
                  <td className="p-1 md:p-2 border-r-[1px]">{e.evento}</td>
                  <td className="p-1 md:p-2 border-r-[1px]">{truncate(e.evento_nome, 35)}</td>
                  <td className="p-1 md:p-2 text-center border-r-[1px]">{fmtRef(e.referencia)}</td>
                  <td className="p-1 md:p-2 text-center border-r-[1px]">{e.tipo === "V" ? fmtNum(e.valor) : ""}</td>
                  <td className="p-1 md:p-2 text-center">{e.tipo === "D" ? fmtNum(e.valor) : ""}</td>
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
              <strong>Total Vencimentos:</strong> {fmtNum(rodape.total_vencimentos)}
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

        <div className="bg-gray-300 w-full h-[1px] my-2"></div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 md:gap-4 pt-2 text-xs md:text-sm">
          <div className="flex flex-col text-center">
            <strong>Salário Base:</strong> {fmtNum(rodape.salario_base)}
          </div>
          <div className="flex flex-col text-center">
            <strong>Sal. Contr. INSS:</strong> {fmtNum(rodape.sal_contr_inss)}
          </div>
          <div className="flex flex-col text-center">
            <strong>Base Cálc FGTS:</strong> {fmtNum(rodape.base_calc_fgts)}
          </div>
          <div className="flex flex-col text-center">
            <strong>F.G.T.S. do Mês:</strong> {fmtNum(rodape.fgts_mes)}
          </div>
          <div className="flex flex-col text-center">
            <strong>Base Cálc IRRF:</strong> {fmtNum(rodape.base_calc_irrf)}
          </div>
          <div className="flex flex-col text-center">
            <strong>DEP SF:</strong> {rodape.dep_sf}
          </div>
          <div className="flex flex-col text-center">
            <strong>Dep IRF:</strong> {rodape.dep_irf}
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
          {isDownloading ? "Confirmando..." : (isAceito ? "Baixar holerite" : "Aceitar e baixar holerite")}
        </Button>
      </div>
      <Footer />
    </div>
  );
}
