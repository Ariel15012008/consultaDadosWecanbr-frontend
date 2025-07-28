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
import { useNavigate } from "react-router-dom";

// --- Tipos ---
interface DocumentoSummary {
  id_documento: string; // equivale a 'lote'
  anomes: string; // competência no formato 'YYYYMM'
}
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
  competencia: string;
  lote: number;
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

export default function DocumentList() {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState<string>("");
  const [anomes, setAnomes] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentoSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const porPagina = 10;

  const totalPaginas = Math.ceil(documents.length / porPagina);
  const documentosVisiveis = documents.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina
  );

  // --- Antiga lógica: buscar últimos documentos via /documents/ultimos ---
  /*
  useEffect(() => {
    const fetchUltimos = async () => {
      const cp = [
        { nome: "tipodedoc", valor: tipodedoc },
        ...(user?.gestor === false
          ? [{ nome: "matricula", valor: user.matricula }]
          : [{ nome: "matricula", valor: matricula }]),
        { nome: "anomes", valor: anomes },
      ];
      const res = await api.post("/documents/ultimos", {
        id_template: Number(id_template),
        cp,
        campo_anomes: "anomes",
      });
      setDocuments(res.data.documentos || []);
    };
    if (user) fetchUltimos();
  }, [id_template, tipodedoc, user]);
  */

  // Carrega dados do usuário
  useEffect(() => {
    const fetchUser = async () => {
      const res = await api.get("/user/me");
      setUser(res.data);
      if (!res.data.gestor) setMatricula(String(res.data.matricula));
    };
    fetchUser();
  }, []);

  // Formata "MM/YYYY" ou "YYYY-MM" → "YYYYMM"
  function formatCompetencia(input: string): string {
    if (input.includes("/")) {
      const [mm, yyyy] = input.split("/");
      return `${yyyy}${mm.padStart(2, "0")}`;
    }
    if (input.includes("-")) return input.split("-").join("");
    return input;
  }

  // Busca sumário de holerite via /documents/holerite/buscar (exibe todos, inclusive duplicados de mesmo mês)
  const handleSearch = async () => {
    if (!anomes) return;
    setIsLoading(true);
    try {
      const payload = { matricula, competencia: formatCompetencia(anomes) };
      const res = await api.post<any[]>("/documents/holerite/buscar", payload);
      // Mapeia todos os resultados, mesmo que haja múltiplos para o mesmo mês
      const mapped: DocumentoSummary[] = res.data.map((item) => ({
        id_documento: String(item.lote),
        anomes: item.competencia,
      }));
      setDocuments(mapped);
      setPaginaAtual(1);
    } catch (err) {
      console.error("Erro ao buscar holerite:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Monta holerite completo e navega para Preview
  const visualizarHolerite = async (doc: DocumentoSummary) => {
    try {
      const payload = {
        matricula,
        competencia: doc.anomes,
        lote: doc.id_documento,
      };
      const res = await api.post<{
        cabecalho: Cabecalho;
        eventos: Evento[];
        rodape: Rodape;
        pdf_base64: string;
      }>("/documents/holerite/montar", payload);
      navigate("/documento/preview", { state: res.data });
    } catch (err) {
      console.error("Erro ao visualizar holerite:", err);
    }
  };

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
            Buscar Holerite
          </h2>
          <div
            className={`w-fit mx-auto grid gap-4 ${
              user?.gestor ? "sm:grid-cols-3" : "sm:grid-cols-2"
            } mb-6`}
          >
            {user?.gestor && (
              <input
                type="text"
                placeholder="Matrícula"
                className="bg-[#2c2c40] text-white border p-2 rounded"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
            )}
            <CustomMonthPicker
              value={anomes}
              onChange={setAnomes}
              placeholder="Selecionar período"
            />
            <Button
              onClick={handleSearch}
              disabled={isLoading || !anomes}
              className="bg-green-600 hover:bg-green-500"
            >
              {isLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
          {isLoading ? (
            <p className="text-center">Carregando documentos...</p>
          ) : (
            <div className="overflow-x-auto border border-gray-600 rounded">
              <table className="w-full text-sm text-left text-white">
        <thead className="bg-[#2c2c40] text-xs uppercase text-gray-300">
          <tr>
            <th className="px-4 py-3 text-left min-w-[120px]">Ano/mês</th>
            <th className="py-3 text-center min-w-[100px]">Lote</th>
            <th className="px-10 py-3 text-right min-w-[100px]">Ações</th>
          </tr>
        </thead>
        <tbody>
          {documentosVisiveis.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-4 text-gray-400">
                Nenhum documento encontrado.
              </td>
            </tr>
          ) : (
            documentosVisiveis.map((doc) => (
              <tr
                key={doc.id_documento}
                className="border-t border-gray-700 hover:bg-gray-800 transition-colors"
              >
                <td className="px-4 py-2 text-left">{doc.anomes}</td>
                <td className="px-4 py-2 text-center">{doc.id_documento}</td>
                <td className="px-4 py-2 text-right">
                  <Button
                    onClick={() => visualizarHolerite(doc)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-sm rounded transition-colors"
                  >
                    Visualizar
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
