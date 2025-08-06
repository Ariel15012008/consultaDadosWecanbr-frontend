// src/pages/DocumentList.tsx
"use client";

import { useEffect, useState } from "react";
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

// --- Tipos para Holerite (mantidos como estavam) ---
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

// --- Tipos para Documentos Genéricos ---
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

// União dos tipos de documento
type DocumentoUnion = DocumentoHolerite | DocumentoGenerico;

export default function DocumentList() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const [searchParams] = useSearchParams();

  // Parâmetros da URL
  const tipoDocumento = searchParams.get("tipo") || "holerite";
  const templateId = searchParams.get("template") || "3";
  const nomeDocumento = searchParams.get("documento") || "";

  const [matricula, setMatricula] = useState<string>("");
  const [anomes, setAnomes] = useState<string>("");
  const [documents, setDocuments] = useState<DocumentoUnion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  const porPagina = 10;
  const totalPaginas = Math.ceil(documents.length / porPagina);
  const documentosVisiveis = documents.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina
  );

  // Define a matrícula quando o usuário não é gestor
  useEffect(() => {
    if (user && !user.gestor) {
      setMatricula(String(user.matricula));
    }
  }, [user]);

  // Formata "MM/YYYY" ou "YYYY-MM" → "YYYYMM"
  function formatCompetencia(input: string): string {
    if (input.includes("/")) {
      const [mm, yyyy] = input.split("/");
      return `${yyyy}${mm.padStart(2, "0")}`;
    }
    if (input.includes("-")) return input.split("-").join("");
    return input;
  }

  // Busca documentos - lógica híbrida
  const handleSearch = async () => {
    if (!anomes) return;
    setIsLoading(true);
    setError(null);

    try {
      if (tipoDocumento === "holerite") {
        // ========== FLUXO HOLERITE (mantém como estava) ==========
        const payload = {
          cpf: user?.cpf || "",
          matricula,
          competencia: formatCompetencia(anomes),
        };
        const res = await api.post<any[]>(
          "/documents/holerite/buscar",
          payload
        );
        const mapped: DocumentoHolerite[] = res.data.map((item) => ({
          id_documento: String(item.lote),
          anomes: item.competencia,
        }));
        setDocuments(mapped);
      } else {
        // ========== FLUXO GENÉRICO (novo) ==========
        const cp = [
          { nome: "tipodedoc", valor: nomeDocumento },
          { nome: "matricula", valor: matricula },
        ];

        const payload = {
          id_template: Number(templateId),
          cp,
          campo_anomes: "anomes",
        };

        const res = await api.post<{
          total_bruto: number;
          ultimos_6_meses: string[];
          total_encontrado: number;
          documentos: DocumentoGenerico[];
        }>("/documents/search", payload);

        setDocuments(res.data.documentos || []);
      }

      setPaginaAtual(1);
    } catch (err: any) {
      console.error("Erro ao buscar documentos:", err);
      setError(err.response?.data?.message || "Erro ao buscar documentos");
    } finally {
      setIsLoading(false);
    }
  };

  // Visualizar documento - lógica híbrida
  const visualizarDocumento = async (doc: DocumentoUnion) => {
    setLoadingPreviewId(doc.id_documento);

    try {
      if (tipoDocumento === "holerite") {
        // ========== FLUXO HOLERITE (mantém como estava) ==========
        const docHolerite = doc as DocumentoHolerite;
        const payload = {
          cpf: user?.cpf || "",
          matricula,
          competencia: docHolerite.anomes,
          lote: docHolerite.id_documento,
        };

        const res = await api.post<{
          cabecalho: CabecalhoHolerite;
          eventos: EventoHolerite[];
          rodape: RodapeHolerite;
          pdf_base64: string;
        }>("/documents/holerite/montar", payload);

        navigate("/documento/preview", { state: res.data });
      } else {
        // ========== FLUXO GENÉRICO (novo) ==========
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

        // Navega para preview com dados genéricos
        navigate("/documento/preview", {
          state: {
            pdf_base64: res.data.base64_raw || res.data.base64,
            documento_info: docGenerico,
            tipo: "generico",
          },
        });
      }
    } catch (err: any) {
      console.error("Erro ao visualizar documento:", err);
      setError(err.response?.data?.message || "Erro ao visualizar documento");
    } finally {
      setLoadingPreviewId(null);
    }
  };

  // Renderiza informações do documento na tabela
  const renderDocumentInfo = (doc: DocumentoUnion) => {
    if (tipoDocumento === "holerite") {
      const docHolerite = doc as DocumentoHolerite;
      return (
        <>
          <td className="px-4 py-2 text-left">{docHolerite.anomes}</td>
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

  // Renderiza cabeçalho da tabela
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

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />
      <main className="relative z-10 flex flex-col flex-grow items-center pt-32 px-4 pb-10">
        <div className="w-full max-w-6xl bg-[#1e1e2f] text-white rounded-xl shadow-2xl p-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-white hover:text-gray-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>

          <h2 className="text-xl font-bold mb-6 text-center">
            {tipoDocumento === "holerite"
              ? "Buscar Holerite"
              : `Buscar ${nomeDocumento}`}
          </h2>

          {error && (
            <div className="bg-red-500 text-white p-4 rounded mb-4 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {user?.gestor ? (
            // Layout em grid para gestores (3 colunas)
            <div className="w-fit mx-auto grid gap-4 sm:grid-cols-3 mb-6">
              <input
                type="text"
                placeholder="Matrícula"
                className="bg-[#2c2c40] text-white border p-2 rounded"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
              <div className="w-full max-w-xs">
                <CustomMonthPicker
                  value={anomes}
                  onChange={setAnomes}
                  placeholder="Selecionar período"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading || !anomes}
                className="bg-green-600 hover:bg-green-500"
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          ) : (
            // Layout em linha para não gestores (apenas anomes e botão)
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <div className="w-full max-w-xs">
                <CustomMonthPicker
                  value={anomes}
                  onChange={setAnomes}
                  placeholder="Selecionar período"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading || !anomes}
                className="bg-green-600 hover:bg-green-500 w-full sm:w-auto"
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
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
                        colSpan={tipoDocumento === "holerite" ? 3 : 4}
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
                            disabled={loadingPreviewId === doc.id_documento}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingPreviewId === doc.id_documento
                              ? "Abrindo..."
                              : "Visualizar"}
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
                        paginaAtual === 1
                          ? "pointer-events-none opacity-50"
                          : "hover:bg-gray-700 cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
                    (p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={paginaAtual === p}
                          onClick={() => setPaginaAtual(p)}
                          className="hover:bg-gray-700 cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPaginaAtual((p) => Math.min(totalPaginas, p + 1))
                      }
                      className={
                        paginaAtual === totalPaginas
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
