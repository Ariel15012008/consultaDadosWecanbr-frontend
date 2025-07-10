"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomMonthPicker from "@/components/ui/custom-month-picker";
import api from "@/utils/axiosInstance";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Documento {
  id_documento: string;
  anomes: string;
}

function DocumentList() {
  const { id_template } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tipodedoc = new URLSearchParams(location.search).get("valor") || "";

  const [matricula, setMatricula] = useState("");
  const [anomes, setAnomes] = useState("");
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [porPagina] = useState(10);

  const totalPaginas = Math.ceil(documents.length / porPagina);
  const documentosVisiveis = documents.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina
  );

  const gerarPaginas = () => {
    const paginas: (number | string)[] = [];
    if (totalPaginas <= 5) {
      for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
    } else {
      if (paginaAtual <= 2) {
        paginas.push(1, 2, 3, "...", totalPaginas);
      } else if (paginaAtual >= totalPaginas - 2) {
        paginas.push(1, "...", totalPaginas - 2, totalPaginas - 1, totalPaginas);
      } else {
        paginas.push(1, "...", paginaAtual - 1, paginaAtual, paginaAtual + 1, "...", totalPaginas);
      }
    }
    return paginas;
  };

  useEffect(() => {
    const fetchUser = async () => {
      const res = await api.get("/user/me");
      setUser(res.data);
      if (!res.data.gestor) setMatricula(res.data.matricula);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchUltimosDocumentos = async () => {
      const cp = [
        { nome: "tipodedoc", valor: tipodedoc },
        { nome: "matricula", valor: user?.matricula }
      ];

      const request = api.post("/documents/ultimos", {
        id_template: Number(id_template),
        cp,
        campo_anomes: "anomes"
      });

      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 2000)
      );

      try {
        const result = await Promise.race([request, timeout]);

        if (result && "data" in result) {
          setDocuments(result.data.documentos || []);
        } else {
          console.warn("⚠️ Timeout atingido. Requisição lenta, ignorada.");
        }
      } catch (error) {
        console.error("Erro ao buscar últimos documentos:", error);
      }
    };

    if (user && user.gestor === false) {
      fetchUltimosDocumentos();
    }
  }, [id_template, tipodedoc, user]);

  const isGestor = user?.gestor === true;

  const handleSearch = async () => {
    if (!anomes) return;

    setIsLoading(true);
    try {
      const cp = [
        { nome: "tipodedoc", valor: tipodedoc },
        ...(isGestor && matricula
          ? [{ nome: "matricula", valor: matricula }]
          : !isGestor
          ? [{ nome: "matricula", valor: user?.matricula }]
          : []),
        { nome: "anomes", valor: anomes }
      ];

      const res = await api.post("/documents/ultimos", {
        id_template: Number(id_template),
        cp,
        campo_anomes: "anomes",
      });

      setDocuments(res.data.documentos || []);
      setPaginaAtual(1);
    } catch (err) {
      console.error("Erro ao buscar documentos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />

      <main className="relative z-10 flex flex-col flex-grow items-center pt-32 px-4 pb-10">
        <div className="w-full max-w-6xl bg-[#1e1e2f] text-white rounded-xl shadow-2xl p-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 text-white hover:text-gray-300">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>

          <h2 className="text-xl font-bold mb-6 text-center">Buscar Documentos: {tipodedoc}</h2>

          <div className={`w-fit mx-auto grid gap-4 mb-6 grid-cols-1 ${isGestor ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {isGestor && (
              <input
                type="text"
                placeholder="Matrícula"
                className="bg-[#2c2c40] text-white border border-gray-600 p-2 rounded"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
            )}

            <CustomMonthPicker value={anomes} onChange={setAnomes} placeholder="Selecionar período" />

            <Button
              onClick={handleSearch}
              className="bg-green-600 hover:bg-green-500 text-base px-6 py-2"
              disabled={isLoading || !anomes}
            >
              {isLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {isLoading ? (
            <p className="text-center">Carregando documentos...</p>
          ) : (
            <>
              <div className="overflow-x-auto border border-gray-600 rounded">
                <table className="w-full text-sm text-left text-white">
                  <thead className="text-xs uppercase text-gray-300 bg-[#2c2c40]">
                    <tr>
                      <th className="px-4 py-3 text-left">Ano/mês</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentosVisiveis.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center py-4 text-gray-400">
                          Nenhum documento encontrado.
                        </td>
                      </tr>
                    ) : (
                      documentosVisiveis.map((doc) => (
                        <tr key={doc.id_documento} className="border-t border-gray-700 hover:bg-gray-800">
                          <td className="px-4 py-2 text-left">{doc.anomes}</td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              onClick={() =>
                                navigate("/documento/preview", {
                                  state: {
                                    id_template,
                                    id_documento: doc.id_documento,
                                    valor: tipodedoc,
                                  },
                                })
                              }
                              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
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

              {totalPaginas > 1 && (
                <div className="flex justify-center mt-6 w-full overflow-x-auto px-2">
                  <Pagination>
                    <PaginationContent className="flex flex-wrap justify-center gap-1">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                          className={`hover:bg-gray-700 cursor-pointer ${paginaAtual === 1 ? "pointer-events-none opacity-50" : ""}`}
                        />
                      </PaginationItem>
                      {gerarPaginas().map((p, i) => (
                        <PaginationItem key={i}>
                          {typeof p === "string" ? (
                            <span className="px-3 py-1 text-white">{p}</span>
                          ) : (
                            <PaginationLink
                              isActive={paginaAtual === p}
                              onClick={() => setPaginaAtual(p)}
                              className="hover:bg-gray-700 cursor-pointer"
                            >
                              {p}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                          className={`hover:bg-gray-700 cursor-pointer ${paginaAtual === totalPaginas ? "pointer-events-none opacity-50" : ""}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="relative z-10 w-full mt-auto pt-6">
        <Footer />
      </footer>
    </div>
  );
}

export default DocumentList;
