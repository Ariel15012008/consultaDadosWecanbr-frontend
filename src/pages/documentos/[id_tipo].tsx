// src/pages/DocumentList.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomMonthPicker from "@/components/ui/custom-month-picker";
import api from "@/utils/axiosInstance";
import Header from "@/components/header";
import Footer from "@/components/footer";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { toast, Toaster } from "sonner";

// ================================================
// Tipagens auxiliares
// ================================================
interface EmpresaMatricula {
  id: string; // cliente
  nome: string; // nome da empresa
  matricula: string; // matrícula naquela empresa
}

interface DocumentoHolerite {
  id_documento: string;
  anomes: string;
}

interface CabecalhoHolerite {
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
  competencia: string;
  lote: number;
}

interface EventoHolerite {
  evento: number;
  evento_nome: string;
  referencia: number;
  valor: number;
  tipo: string;
}

interface RodapeHolerite {
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

interface DocumentoGenerico {
  id_documento: string;
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
  anomes: string;
  tipodedoc: string;
  status: string;
  observacao: string;
  datadepagamento: string;
  matricula: string;
  _norm_anomes: string;
}

type DocumentoUnion = DocumentoHolerite | DocumentoGenerico;

// ================================================
// CONTRATO: lista de competências (modo discovery)
// ================================================
interface CompetenciaItem {
  ano: number;
  mes: string; // "01".."12"
}

// ================================================
// helpers
// ================================================
const toYYYYDashMM = (v: string) => {
  if (!v) return v;
  return v.includes("-") ? v : v.replace(/(\d{4})(\d{2})/, "$1-$2");
};

const makeYYYYMMLabel = (ano: number, mes: string) => `${ano}-${mes}`;

const makeYYYYMMValue = (ano: number, mes: string | number) =>
  `${ano}${String(mes).padStart(2, "0")}`;

const extractErrorMessage = (err: any, fallback = "Ocorreu um erro.") => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message && typeof detail.message === "string") return detail.message;
  if (err?.response?.data?.message && typeof err.response.data.message === "string")
    return err.response.data.message;
  if (err?.message && typeof err.message === "string") return err.message;
  return fallback;
};

export default function DocumentList() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const [searchParams] = useSearchParams();

  const tipoDocumento = searchParams.get("tipo") || "holerite";
  const templateId = searchParams.get("template") || "3";
  const nomeDocumento = searchParams.get("documento") || "";

  // ================================================
  // ESTADOS GERAIS
  // ================================================
  const [matricula, setMatricula] = useState<string>("");
  const [cpf, setCpf] = useState<string>("");
  const [cpfError, setCpfError] = useState<string>("");
  const [anomes, setAnomes] = useState<string>("");
  const [documents, setDocuments] = useState<DocumentoUnion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  const porPagina = 10;
  const totalPaginas = Math.ceil(documents.length / porPagina);
  const documentosVisiveis = documents.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina
  );

  // ================================================
  // Seleção prévia de EMPRESA e MATRÍCULA (não gestor / holerite)
  // ================================================
  const [empresasDoUsuario, setEmpresasDoUsuario] = useState<EmpresaMatricula[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [selectedEmpresaNome, setSelectedEmpresaNome] = useState<string | null>(null);
  const [selectedMatricula, setSelectedMatricula] = useState<string | null>(null);

  const empresasMap = useMemo(() => {
    const map = new Map<string, { nome: string; matriculas: string[] }>();
    for (const d of empresasDoUsuario) {
      const curr = map.get(d.id);
      if (!curr) {
        map.set(d.id, { nome: d.nome, matriculas: [d.matricula] });
      } else {
        if (!curr.matriculas.includes(d.matricula)) {
          curr.matriculas.push(d.matricula);
        }
      }
    }
    return map;
  }, [empresasDoUsuario]);

  const empresasUnicas = useMemo(() => {
    return Array.from(empresasMap.entries()).map(([id, v]) => ({
      id,
      nome: v.nome,
      qtdMatriculas: v.matriculas.length,
    }));
  }, [empresasMap]);

  const matriculasDaEmpresaSelecionada = useMemo(() => {
    if (!selectedEmpresaId) return [];
    const item = empresasMap.get(selectedEmpresaId);
    return item?.matriculas ?? [];
  }, [selectedEmpresaId, empresasMap]);

  const requerEscolherMatricula = useMemo(() => {
    if (!selectedEmpresaId) return false;
    return (empresasMap.get(selectedEmpresaId)?.matriculas.length ?? 0) > 1;
  }, [selectedEmpresaId, empresasMap]);

  // ================================================
  // DISCOVERY de competências (holerite)
  // ================================================
  const [isLoadingCompetencias, setIsLoadingCompetencias] = useState(false);
  const [competencias, setCompetencias] = useState<CompetenciaItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);

  const anosDisponiveis = useMemo(() => {
    const setAnos = new Set<number>();
    competencias.forEach((c) => setAnos.add(c.ano));
    return Array.from(setAnos).sort((a, b) => b - a);
  }, [competencias]);

  const mesesDoAnoSelecionado = useMemo(() => {
    if (!selectedYear) return [];
    const meses = competencias
      .filter((c) => c.ano === selectedYear)
      .map((c) => c.mes);
    const unicos = Array.from(new Set(meses));
    return unicos.sort((a, b) => Number(b) - Number(a));
  }, [competencias, selectedYear]);

  // ================================================
  // DISCOVERY de competências (genéricos)
  // ================================================
  const fetchedCompetenciasGenericos = useRef(false);
  const [isLoadingCompetenciasGen, setIsLoadingCompetenciasGen] = useState(false);
  const [competenciasGen, setCompetenciasGen] = useState<CompetenciaItem[]>([]);
  const [selectedYearGen, setSelectedYearGen] = useState<number | null>(null);

  const anosDisponiveisGen = useMemo(() => {
    const setAnos = new Set<number>();
    competenciasGen.forEach((c) => setAnos.add(c.ano));
    return Array.from(setAnos).sort((a, b) => b - a);
  }, [competenciasGen]);

  const mesesDoAnoSelecionadoGen = useMemo(() => {
    if (!selectedYearGen) return [];
    const meses = competenciasGen
      .filter((c) => c.ano === selectedYearGen)
      .map((c) => c.mes);
    const unicos = Array.from(new Set(meses));
    return unicos.sort((a, b) => Number(b) - Number(a));
  }, [competenciasGen, selectedYearGen]);

  // ================================================
  // CPF helpers (gestor)
  // ================================================
  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    const limitedNumbers = numbers.slice(0, 11);
    return limitedNumbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2");
  };

  const validateCPF = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, "");
    if (numbers.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(numbers)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(numbers[i]) * (10 - i);
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(numbers[9]) !== digit1) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(numbers[i]) * (11 - i);
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;
    return parseInt(numbers[10]) === digit2;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedValue = formatCPF(value);
    setCpf(formattedValue);

    if (!formattedValue) {
      setCpfError("");
      return;
    }

    const numbers = formattedValue.replace(/\D/g, "");
    if (numbers.length === 11) {
      setCpfError(validateCPF(formattedValue) ? "" : "CPF inválido");
    } else {
      setCpfError("");
    }
  };

  const getCpfNumbers = (cpfValue: string): string => cpfValue.replace(/\D/g, "");

  // compat function
  function formatCompetencia(input: string): string {
    if (input.includes("/")) {
      const [mm, yyyy] = input.split("/");
      return `${yyyy}${mm.padStart(2, "0")}`;
    }
    if (input.includes("-")) return input.split("-").join("");
    return input;
  }

  // ================================================
  // Estados para controlar loading geral
  // ================================================
  const isAnyLoading = useMemo(() => {
    return isLoading || 
           isLoadingCompetencias || 
           isLoadingCompetenciasGen || 
           !!loadingPreviewId ||
           userLoading;
  }, [isLoading, isLoadingCompetencias, isLoadingCompetenciasGen, loadingPreviewId, userLoading]);

  // ================================================
  // Carregar empresas/matrículas do /user/me (não gestor / holerite)
  // ================================================
  useEffect(() => {
    if (userLoading || !user || user.gestor || tipoDocumento !== "holerite") return;

    const dados = (user as any)?.dados as EmpresaMatricula[] | undefined;
    if (!dados || !dados.length) return;

    setEmpresasDoUsuario(dados);

    const porEmpresa = new Map<string, EmpresaMatricula[]>();
    for (const d of dados) {
      const arr = porEmpresa.get(d.id) ?? [];
      arr.push(d);
      porEmpresa.set(d.id, arr);
    }

    const empresas = Array.from(porEmpresa.entries());
    if (empresas.length === 1) {
      const [empresaId, arr] = empresas[0];
      setSelectedEmpresaId(empresaId);
      setSelectedEmpresaNome(arr[0].nome);
      if (arr.length === 1) {
        setSelectedMatricula(arr[0].matricula);
      } else {
        setSelectedMatricula(null);
      }
    } else {
      setSelectedEmpresaId(null);
      setSelectedEmpresaNome(null);
      setSelectedMatricula(null);
    }

    setCompetencias([]);
    setSelectedYear(null);
    setDocuments([]);
    setPaginaAtual(1);
  }, [userLoading, user, tipoDocumento]);

  // ================================================
  // Buscar COMPETÊNCIAS após escolher empresa(/matrícula)
  // ================================================
  useEffect(() => {
    const showDiscoveryFlow = !user?.gestor && tipoDocumento === "holerite";
    if (!showDiscoveryFlow) return;
    if (!selectedEmpresaId) return;
    if (requerEscolherMatricula && !selectedMatricula) return;

    const key = `${selectedEmpresaId}|${requerEscolherMatricula ? selectedMatricula ?? "" : "-"}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;

    const run = async () => {
      try {
        setIsLoadingCompetencias(true);
        setCompetencias([]);
        setSelectedYear(null);
        setDocuments([]);
        setPaginaAtual(1);

        const payload: any = {
          cpf: user?.cpf || "",
          empresa: selectedEmpresaId
        };
        if (selectedMatricula) payload.matricula = selectedMatricula;

        const res = await api.post<{
          tipo: "competencias";
          competencias: { ano: number; mes: number }[];
          empresa: string;
          cliente_nome: string;
        }>("/documents/holerite/buscar", payload);

        const lista = (res.data?.competencias ?? []).map((x) => ({
          ano: x.ano,
          mes: String(x.mes).padStart(2, "0"),
        })) as CompetenciaItem[];

        setCompetencias(lista);

        if (!lista.length) {
          toast.warning("Nenhum período de holerite encontrado para esta empresa.");
        } else {
          toast.success(
            `Períodos disponíveis carregados para ${selectedEmpresaNome ?? "a empresa selecionada"}.`
          );
        }
      } catch (err: any) {
        console.error("Erro ao listar competências:", err);
        toast.error("Erro ao carregar períodos do holerite", {
          description: extractErrorMessage(err, "Falha ao consultar competências."),
        });
      } finally {
        setIsLoadingCompetencias(false);
      }
    };

    run();
  }, [user, tipoDocumento, selectedEmpresaId, selectedMatricula, requerEscolherMatricula, selectedEmpresaNome]);

  // ================================================
  // Genéricos: carregar competências
  // ================================================
  useEffect(() => {
    const deveRodarDiscoveryGen = !userLoading && user && !user.gestor && tipoDocumento !== "holerite";
    if (!deveRodarDiscoveryGen) return;
    if (fetchedCompetenciasGenericos.current) return;
    fetchedCompetenciasGenericos.current = true;

    const run = async () => {
      try {
        setIsLoadingCompetenciasGen(true);
        setDocuments([]);
        setPaginaAtual(1);

        const cp = [
          { nome: "tipodedoc", valor: nomeDocumento },
          { nome: "matricula", valor: String(user?.matricula || "").trim() },
        ];

        const payload = {
          id_template: Number(templateId),
          cp,
          campo_anomes: "anomes",
          anomes: ""
        };

        const res = await api.post<{
          anomes: { ano: number; mes: number }[]
        }>("/documents/search", payload);

        const listaBruta = res.data?.anomes ?? [];
        const lista: CompetenciaItem[] = listaBruta.map((x) => ({
          ano: x.ano,
          mes: String(x.mes).padStart(2, "0"),
        }));

        setCompetenciasGen(lista);

        if (!lista.length) {
          toast.warning(`Nenhum período encontrado para ${nomeDocumento}.`);
        } else {
          toast.success(`Períodos disponíveis de ${nomeDocumento} carregados.`);
        }
      } catch (err: any) {
        console.error("Erro ao listar períodos (genéricos):", err);
        toast.error("Erro ao carregar períodos", {
          description: extractErrorMessage(err, "Falha ao consultar períodos disponíveis."),
        });
      } finally {
        setIsLoadingCompetenciasGen(false);
      }
    };

    run();
  }, [userLoading, user, tipoDocumento, nomeDocumento, templateId]);

  // ==========================================
  // Holerite: buscar de um mês (click)
  // ==========================================
  const buscarHoleritePorAnoMes = async (ano: number, mes: string) => {
    if (!selectedEmpresaId) {
      toast.error("Selecione a empresa antes de continuar.");
      return;
    }

    if (requerEscolherMatricula && !selectedMatricula) {
      toast.error("Selecione a matrícula antes de continuar.");
      return;
    }

    const competenciaYYYYMM = makeYYYYMMValue(ano, mes);
    setIsLoading(true);
    setDocuments([]);
    setPaginaAtual(1);

    try {
      const payload: any = {
        cpf: user?.cpf || "",
        empresa: selectedEmpresaId,
        competencia: competenciaYYYYMM,
      };
      if (selectedMatricula) payload.matricula = selectedMatricula;

      const res = await api.post<{
        tipo: "holerite";
        cabecalho: CabecalhoHolerite;
        eventos: EventoHolerite[];
        rodape: RodapeHolerite;
      }>("/documents/holerite/buscar", payload);

      if (res.data && res.data.cabecalho) {
        const documento: DocumentoHolerite = {
          id_documento: String(res.data.cabecalho.lote || "1"),
          anomes: res.data.cabecalho.competencia || competenciaYYYYMM,
        };
        setDocuments([documento]);
        sessionStorage.setItem("holeriteData", JSON.stringify(res.data));
        toast.success("Holerite encontrado!", {
          description: `Período ${toYYYYDashMM(documento.anomes)} localizado.`,
        });
      } else {
        toast.warning("Nenhum holerite encontrado para o mês selecionado.");
      }
    } catch (err: any) {
      console.error("Erro ao buscar holerite do mês:", err);
      toast.error("Erro ao buscar holerite", {
        description: extractErrorMessage(err, "Falha ao consultar o período escolhido."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Genéricos: buscar documentos de um mês
  // ==========================================
  const buscarGenericoPorAnoMes = async (ano: number, mes: string) => {
    setIsLoading(true);
    setDocuments([]);
    setPaginaAtual(1);

    try {
      const cp = [
        { nome: "tipodedoc", valor: nomeDocumento },
        { nome: "matricula", valor: String(user?.matricula || "").trim() },
      ];

      const payload = {
        id_template: Number(templateId),
        cp,
        campo_anomes: "anomes",
        anomes: `${ano}-${mes}`,
      };

      const res = await api.post<{
        total_bruto: number;
        ultimos_6_meses: string[];
        total_encontrado: number;
        documentos: DocumentoGenerico[];
      }>("/documents/search", payload);

      const documentos = res.data.documentos || [];
      setDocuments(documentos);

      if (documentos.length > 0) {
        toast.success(`${documentos.length} documento(s) encontrado(s)!`, {
          description: `Período ${ano}-${mes} para ${nomeDocumento}.`,
        });
      } else {
        toast.warning("Nenhum documento encontrado para o mês selecionado.");
      }
    } catch (err: any) {
      console.error("Erro ao buscar documentos (genéricos):", err);
      toast.error("Erro ao buscar documentos", {
        description: extractErrorMessage(err, "Falha ao consultar o período escolhido."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Visualizar documento
  // ==========================================
  const visualizarDocumento = async (doc: DocumentoUnion) => {
    setLoadingPreviewId(doc.id_documento);

    try {
      if (tipoDocumento === "holerite") {
        const docHolerite = doc as DocumentoHolerite;
        const matForPreview = user?.gestor ? matricula : (selectedMatricula ?? "");

        const payload: any = {
          cpf: user?.gestor ? getCpfNumbers(cpf) || user?.cpf || "" : user?.cpf || "",
          matricula: matForPreview,
          competencia: docHolerite.anomes,
          lote: docHolerite.id_documento,
        };

        const res = await api.post<{
          cabecalho: CabecalhoHolerite;
          eventos: EventoHolerite[];
          rodape: RodapeHolerite;
          pdf_base64: string;
        }>("/documents/holerite/montar", payload);

        if (res.data && res.data.pdf_base64) {
          navigate("/documento/preview", { state: res.data });
          toast.success("Documento aberto com sucesso!");
        } else {
          throw new Error("Não foi possível gerar o PDF do holerite");
        }
      } else {
        const docGenerico = doc as DocumentoGenerico;

        const payload = {
          id_tipo: Number(templateId),
          id_documento: Number(docGenerico.id_documento),
        };

        const res = await api.post<{
          erro: boolean;
          base64_raw?: string;
          base64?: string;
        }>("/searchdocuments/download", payload);

        if (res.data.erro) {
          throw new Error("O servidor retornou um erro ao processar o documento");
        }

        const pdfBase64 = res.data.base64_raw || res.data.base64;

        if (pdfBase64) {
          navigate("/documento/preview", {
            state: {
              pdf_base64: pdfBase64,
              documento_info: docGenerico,
              tipo: "generico",
            },
          });
          toast.success("Documento aberto com sucesso!");
        } else {
          throw new Error("O documento não possui conteúdo PDF disponível");
        }
      }
    } catch (err: any) {
      console.error("Erro ao visualizar documento:", err);
      toast.error("Erro ao abrir documento", {
        description: extractErrorMessage(err, "Erro ao processar o documento"),
        action: {
          label: "Tentar novamente",
          onClick: () => visualizarDocumento(doc)
        },
      });
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const renderDocumentInfo = (doc: DocumentoUnion) => {
    if (tipoDocumento === "holerite") {
      const docHolerite = doc as DocumentoHolerite;
      return (
        <>
          <td className="px-4 py-2 text-left">{toYYYYDashMM(docHolerite.anomes)}</td>
          <td className="px-4 py-2 text-center">{docHolerite.id_documento}</td>
        </>
      );
    } else {
      const docGenerico = doc as DocumentoGenerico;
      return (
        <>
          <td className="px-4 py-2 text-left">{docGenerico._norm_anomes}</td>
        </>
      );
    }
  };

  const renderTableHeader = () => {
    if (tipoDocumento === "holerite") {
      return (
        <>
          <th className="px-4 py-3 text-left min-w-[120px]">Ano/mês</th>
          <th className="py-3 text-center min-w-[100px]">Lote</th>
          <th className="px-10 py-3 text-right min-w-[100px]">Ações</th>
        </>
      );
    } else {
      return (
        <>
          <th className="px-4 py-3 text-left min-w-[120px]">Ano/mês</th>
          <th className="px-10 py-3 text-right min-w-[100px]">Ações</th>
        </>
      );
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 text-white text-xl font-bold">
        Carregando...
      </div>
    );
  }

  // ================================================
  // UI condicional
  // ================================================
  const showDiscoveryFlow = !user?.gestor && tipoDocumento === "holerite";
  const showDiscoveryFlowGenerico = !user?.gestor && tipoDocumento !== "holerite";
  const gestorGridCols = tipoDocumento === "holerite" ? "sm:grid-cols-4" : "sm:grid-cols-3";

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <Toaster richColors />

      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />

      <main className="relative z-10 flex flex-col flex-grow items-center pt-32 px-4 pb-10">
        <div className="w-full max-w-6xl bg-[#1e1e2f] text-white rounded-xl shadow-2xl p-6">
          <Button
            variant="default"
            onClick={() => navigate("/")}
            className="mb-4 text-white hover:text-gray-300"
            disabled={isAnyLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <h2 className="text-xl font-bold mb-6 text-center">
            {tipoDocumento === "holerite" ? "Holerite" : `Buscar ${nomeDocumento}`}
          </h2>

          {/* ===================== DISCOVERY (NÃO GESTOR / HOLERITE) ===================== */}
          {showDiscoveryFlow ? (
            <>
              {/* Grade (Empresa esquerda, Matrícula direita, Períodos abaixo ocupando toda a largura) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* ====== ESQUERDA — EMPRESA ====== */}
                <section className="bg-[#151527] border border-gray-700 rounded-lg p-4 m-3 h-full flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-200 mb-3 text-center">Empresa</h3>
                  {!selectedEmpresaId ? (
                    empresasUnicas.length === 0 ? (
                      <p className="text-center text-gray-400">Nenhuma empresa encontrada.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {empresasUnicas.map((e) => (
                          <Button
                            key={e.id}
                            variant="default"
                            title={e.nome}
                            className="w-full h-11 min-w-0 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            onClick={() => {
                              setSelectedEmpresaId(e.id);
                              setSelectedEmpresaNome(e.nome);
                              setSelectedMatricula(null);
                              setCompetencias([]);
                              setSelectedYear(null);
                              setDocuments([]);
                              setPaginaAtual(1);
                              // Limpar cache de requisições
                              lastFetchKeyRef.current = null;
                            }}
                            disabled={isAnyLoading}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{e.nome}</span>
                              {e.qtdMatriculas > 1 && (
                                <span className="ml-1 shrink-0 text-xs opacity-90 bg-black/20 rounded px-2 py-0.5">
                                  {e.qtdMatriculas} matr.
                                </span>
                              )}
                            </span>
                          </Button>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-300 text-center">
                        Selecionada:{" "}
                        <span className="font-semibold text-white">{selectedEmpresaNome}</span>
                      </div>
                      <Button
                        variant="default"
                        className="w-full h-10 border border-gray-600 hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        onClick={() => {
                          setSelectedEmpresaId(null);
                          setSelectedEmpresaNome(null);
                          setSelectedMatricula(null);
                          setCompetencias([]);
                          setSelectedYear(null);
                          setDocuments([]);
                          setPaginaAtual(1);
                        }}
                        disabled={isAnyLoading}
                      >
                        Trocar empresa
                      </Button>
                    </div>
                  )}
                </section>

                {/* ====== DIREITA — MATRÍCULA ====== */}
                <section className="bg-[#151527] border border-gray-700 rounded-lg p-4 m-3 h-full flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-200 mb-3 text-center">Matrícula</h3>
                  {requerEscolherMatricula ? (
                    !selectedMatricula ? (
                      // LISTA DE MATRÍCULAS COM SCROLL APÓS 3 ITENS
                      <div
                        className="grid grid-cols-1 gap-2 overflow-y-auto pr-1"
                        style={{
                          // 3 itens * 44px + 2 gaps * 8px ≈ 148px
                          maxHeight: "148px",
                        }}
                      >
                        {matriculasDaEmpresaSelecionada.map((m) => (
                          <Button
                            key={m}
                            variant="default"
                            className="w-full h-11 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            onClick={() => setSelectedMatricula(m)}
                            disabled={isAnyLoading}
                          >
                            Matrícula {m}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm text-gray-300 text-center">
                          Selecionada:{" "}
                          <span className="font-semibold text-white">{selectedMatricula}</span>
                        </div>
                        <Button
                          variant="default"
                          className="w-full h-10 border border-gray-600 hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed"
                          onClick={() => {
                            setSelectedMatricula(null);
                            setCompetencias([]);
                            setSelectedYear(null);
                            setDocuments([]);
                            setPaginaAtual(1);
                            // Limpar cache de requisições
                            lastFetchKeyRef.current = null;
                          }}
                          disabled={isAnyLoading}
                        >
                          Trocar matrícula
                        </Button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-gray-400 text-center">
                      Nenhuma escolha de matrícula necessária.
                    </p>
                  )}
                </section>

                {/* ====== ABAIXO — ANOS & MESES ====== */}
                <section className="md:col-span-2 bg-[#151527] border border-gray-700 rounded-lg p-4 mb-5 m-3">
                  <h3 className="text-sm font-semibold text-gray-200 mb-3 text-center">
                    Períodos (anos e meses)
                  </h3>
                  {!selectedEmpresaId ? (
                    <p className="text-center text-gray-400">
                      Selecione uma empresa para carregar os períodos.
                    </p>
                  ) : requerEscolherMatricula && !selectedMatricula ? (
                    <p className="text-center text-gray-400">
                      Selecione a matrícula para carregar os períodos.
                    </p>
                  ) : isLoadingCompetencias ? (
                    <p className="text-center">Carregando períodos disponíveis...</p>
                  ) : anosDisponiveis.length === 0 ? (
                    <p className="text-center text-gray-300">
                      Nenhum período de holerite encontrado para a seleção atual.
                    </p>
                  ) : !selectedYear ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {anosDisponiveis.map((ano) => (
                        <Button
                          key={ano}
                          variant="default"
                          className="w-full h-11 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                          onClick={() => setSelectedYear(ano)}
                          disabled={isAnyLoading}
                        >
                          {ano}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                        {mesesDoAnoSelecionado.map((mm) => (
                          <Button
                            key={mm}
                            variant="default"
                            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            onClick={() => buscarHoleritePorAnoMes(selectedYear, mm)}
                            disabled={isAnyLoading}
                          >
                            {isLoading ? "Buscando..." : makeYYYYMMLabel(selectedYear, mm)}
                          </Button>
                        ))}
                      </div>
                      <div className="flex justify-center">
                        <Button
                          variant="default"
                          className="border border-gray-600 hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed"
                          onClick={() => {
                            setSelectedYear(null);
                            setDocuments([]);
                            setPaginaAtual(1);
                          }}
                          disabled={isAnyLoading}
                        >
                          Escolher outro ano
                        </Button>
                      </div>
                    </>
                  )}
                </section>
              </div>
            </>
          ) : (
            // ===================== FLUXO (GESTOR) OU (NÃO GESTOR / GENÉRICOS) =====================
            <>
              {user?.gestor ? (
                <div className={`w-fit mx-auto grid gap-4 ${gestorGridCols} mb-6`}>
                  {tipoDocumento === "holerite" && (
                    <div className="flex flex-col">
                      <input
                        type="text"
                        placeholder="CPF"
                        required
                        className={`bg-[#2c2c40] text-white border p-2 rounded ${
                          cpfError ? "border-red-500" : "border-gray-600"
                        } ${isAnyLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                        value={cpf}
                        onChange={handleCpfChange}
                        maxLength={14}
                        disabled={isAnyLoading}
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Matrícula"
                    className={`bg-[#2c2c40] text-white border border-gray-600 p-2 rounded ${
                      isAnyLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    disabled={isAnyLoading}
                  />
                  <div className="w-full max-w-xs">
                    <CustomMonthPicker
                      value={anomes}
                      onChange={setAnomes}
                      placeholder="Selecionar período"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!anomes) {
                        toast.error("Período obrigatório", {
                          description: "Por favor, selecione um período antes de buscar.",
                        });
                        return;
                      }

                      const cpfNumbers = cpf ? getCpfNumbers(cpf) : "";
                      if (cpfNumbers && !validateCPF(cpf)) {
                        toast.error("CPF inválido", {
                          description: "Por favor, informe um CPF válido com 11 dígitos.",
                        });
                        return;
                      }

                      if (!cpfNumbers && !matricula.trim()) {
                        toast.error("CPF ou Matrícula obrigatório", {
                          description: "Para gestores, é necessário informar pelo menos o CPF ou a matrícula.",
                        });
                        return;
                      }

                      setIsLoading(true);

                      try {
                        if (tipoDocumento === "holerite") {
                          const payload = {
                            cpf: getCpfNumbers(cpf.trim()) || user?.cpf || "",
                            matricula: matricula.trim(),
                            competencia: formatCompetencia(anomes),
                          };

                          const res = await api.post<{
                            cabecalho: CabecalhoHolerite;
                            eventos: EventoHolerite[];
                            rodape: RodapeHolerite;
                          }>("/documents/holerite/buscar", payload);

                          if (res.data && res.data.cabecalho) {
                            const documento: DocumentoHolerite = {
                              id_documento: String(res.data.cabecalho.lote || "1"),
                              anomes: res.data.cabecalho.competencia || formatCompetencia(anomes),
                            };
                            setDocuments([documento]);
                            sessionStorage.setItem("holeriteData", JSON.stringify(res.data));
                            toast.success("Holerite encontrado!", {
                              description: `Documento do período ${toYYYYDashMM(documento.anomes)} localizado.`,
                            });
                          } else {
                            setDocuments([]);
                            toast.warning("Nenhum holerite encontrado", {
                              description: "Não foi localizado holerite para o período e critérios informados.",
                            });
                          }
                        } else {
                          const cp = [
                            { nome: "tipodedoc", valor: nomeDocumento },
                            { nome: "matricula", valor: matricula.trim() },
                          ];

                          const payload = {
                            id_template: Number(templateId),
                            cp,
                            campo_anomes: "anomes",
                            anomes: anomes.includes("/")
                              ? `${anomes.split("/")[1]}-${anomes.split("/")[0].padStart(2, "0")}`
                              : anomes.length === 6
                              ? `${anomes.slice(0, 4)}-${anomes.slice(4, 6)}`
                              : anomes,
                          };

                          const res = await api.post<{
                            total_bruto: number;
                            ultimos_6_meses: string[];
                            total_encontrado: number;
                            documentos: DocumentoGenerico[];
                          }>("/documents/search", payload);

                          const documentos = res.data.documentos || [];
                          setDocuments(documentos);

                          if (documentos.length > 0) {
                            toast.success(`${documentos.length} documento(s) encontrado(s)!`, {
                              description: `Foram localizados ${documentos.length} documentos do tipo ${nomeDocumento}.`,
                            });
                          } else {
                            toast.warning("Nenhum documento encontrado", {
                              description: `Não foram localizados documentos do tipo ${nomeDocumento} para os critérios informados.`,
                            });
                          }
                        }

                        setPaginaAtual(1);
                      } catch (err: any) {
                        console.error("Erro ao buscar documentos:", err);
                        setDocuments([]);

                        const description = extractErrorMessage(err, "Erro ao buscar documentos.");
                        const status = err?.response?.status;

                        switch (status) {
                          case 401:
                            toast.error("Não autorizado", {
                              description: "Sua sessão expirou. Faça login novamente.",
                              action: {
                                label: "Ir para login",
                                onClick: () => navigate("/login")
                              },
                            });
                            break;
                          case 403:
                            toast.error("Acesso negado", { description });
                            break;
                          case 404:
                            toast.error("Documento não encontrado", { description });
                            break;
                          case 500:
                            toast.error("Erro interno do servidor", {
                              description: "Ocorreu um problema no servidor. Tente novamente em alguns minutos.",
                              action: {
                                label: "Tentar novamente",
                                onClick: () => window.location.reload()
                              },
                            });
                            break;
                          default:
                            toast.error("Erro ao buscar documentos", {
                              description,
                              action: {
                                label: "Tentar novamente",
                                onClick: () => window.location.reload()
                              },
                            });
                        }
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isAnyLoading || !anomes || (!!cpf && !!cpfError)}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed p-5"
                  >
                    {isLoading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              ) : showDiscoveryFlowGenerico ? (
                <>
                  {isLoadingCompetenciasGen ? (
                    <p className="text-center mb-6">Carregando períodos disponíveis...</p>
                  ) : anosDisponiveisGen.length === 0 ? (
                    <p className="text-center mb-6 text-gray-300">
                      Nenhum período de {nomeDocumento} encontrado para sua conta.
                    </p>
                  ) : !selectedYearGen ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 justify-items-stretch mb-6 px-4">
                      {anosDisponiveisGen.map((ano) => (
                        <Button
                          key={ano}
                          variant="default"
                          className="w-full h-11 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                          onClick={() => setSelectedYearGen(ano)}
                          disabled={isAnyLoading}
                        >
                          {ano}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-3 justify-center mb-4 px-4">
                        {mesesDoAnoSelecionadoGen.map((mm) => (
                          <Button
                            key={mm}
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            onClick={() => buscarGenericoPorAnoMes(selectedYearGen, mm)}
                            disabled={isAnyLoading}
                          >
                            {isLoading ? "Buscando..." : makeYYYYMMLabel(selectedYearGen, mm)}
                          </Button>
                        ))}
                      </div>
                      <div className="flex justify-center mb-6">
                        <Button
                          variant="default"
                          className="border border-gray-600 hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed"
                          onClick={() => {
                            setSelectedYearGen(null);
                            setDocuments([]);
                            setPaginaAtual(1);
                          }}
                          disabled={isAnyLoading}
                        >
                          Escolher outro ano
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                  <div className="w-full max-w-xs">
                    <CustomMonthPicker
                      value={anomes}
                      onChange={setAnomes}
                      placeholder="Selecionar período"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!anomes) {
                        toast.error("Período obrigatório");
                        return;
                      }

                      setIsLoading(true);

                      try {
                        const cp = [
                          { nome: "tipodedoc", valor: nomeDocumento },
                          { nome: "matricula", valor: String(user?.matricula || "").trim() },
                        ];

                        const payload = {
                          id_template: Number(templateId),
                          cp,
                          campo_anomes: "anomes",
                          anomes: anomes.includes("/")
                            ? `${anomes.split("/")[1]}-${anomes.split("/")[0].padStart(2, "0")}`
                            : anomes.length === 6
                            ? `${anomes.slice(0, 4)}-${anomes.slice(4, 6)}`
                            : anomes,
                        };

                        const res = await api.post<{
                          total_bruto: number;
                          ultimos_6_meses: string[];
                          total_encontrado: number;
                          documentos: DocumentoGenerico[];
                        }>("/documents/search", payload);

                        const documentos = res.data.documentos || [];
                        setDocuments(documentos);
                        setPaginaAtual(1);

                        if (documentos.length > 0) {
                          toast.success(`${documentos.length} documento(s) encontrado(s)!`);
                        } else {
                          toast.warning("Nenhum documento encontrado.");
                        }
                      } catch (err: any) {
                        console.error(err);
                        toast.error("Erro ao buscar documentos", {
                          description: extractErrorMessage(err, "Falha ao buscar documentos."),
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isAnyLoading || !anomes}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {isLoading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              )}
            </>
          )}

          {isLoading ? (
            <p className="text-center">Carregando documentos...</p>
          ) : (
            <div className="overflow-x-auto border border-gray-600 rounded">
              <table className="w-full text-sm text-left text-white">
                <thead className="bg-[#2c2c40] text-xs uppercase text-gray-300">
                  <tr>{renderTableHeader()}</tr>
                </thead>
                <tbody>
                  {documentosVisiveis.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tipoDocumento === "holerite" ? 3 : 2}
                        className="text-center py-4 text-gray-400"
                      >
                        Nenhum documento encontrado.
                      </td>
                    </tr>
                  ) : (
                    documentosVisiveis.map((doc) => (
                      <tr
                        key={doc.id_documento}
                        className="border-t border-gray-700 hover:bg-gray-800 transition-colors"
                      >
                        {renderDocumentInfo(doc)}
                        <td className="px-4 py-2 text-right">
                          <Button
                            onClick={() => visualizarDocumento(doc)}
                            disabled={isAnyLoading || loadingPreviewId === doc.id_documento}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-sm rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {loadingPreviewId === doc.id_documento ? "Abrindo..." : "Visualizar"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="flex justify-center mt-6 w-full overflow-x-auto px-2">
              <Pagination>
                <PaginationContent className="flex flex-wrap justify-center gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                      className={
                        paginaAtual === 1 || isAnyLoading
                          ? "pointer-events-none opacity-50"
                          : "hover:bg-gray-700 cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={paginaAtual === p}
                        onClick={() => setPaginaAtual(p)}
                        className={
                          isAnyLoading
                            ? "pointer-events-none opacity-50"
                            : "hover:bg-gray-700 cursor-pointer"
                        }
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                      className={
                        paginaAtual === totalPaginas || isAnyLoading
                          ? "pointer-events-none opacity-50"
                          : "hover:bg-gray-700 cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}