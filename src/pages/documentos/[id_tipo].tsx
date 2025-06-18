"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { ArrowLeft } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import api from "@/utils/axiosInstance";

interface Documento {
  id_documento: string;
  anomes: string;
}

function DocumentList() {
  const { id_template } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [porPagina] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Documentos do Template";

    const fetchDocumentosFiltrados = async () => {
      try {
        const res = await api.post("/searchdocuments/documents", {
          id_template: Number(id_template),
          campo: "tipodedoc",
          valor: "Holerite",
        });

        setDocuments(res.data.documents || []);
      } catch (error) {
        console.error("Erro ao buscar documentos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentosFiltrados();
  }, [id_template]);

  const handleVisualizar = async (
    id_documento: string,
  ) => {
    try {
      const endpoint = "/searchdocuments/download";

      const res = await api.post(endpoint, {
        id_tipo: Number(id_template),
        id_documento: Number(id_documento),
      });

      const base64 = res.data.base64 || res.data.base64_raw;

      navigate("/documento/preview", {
        state: {
          base64,
          tipo: "pdf",
          id_template,
          id_documento,
        },
      });
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
    }
  };

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
      if (paginaAtual <= 3) {
        paginas.push(1, 2, 3, 4, "...", totalPaginas);
      } else if (paginaAtual >= totalPaginas - 2) {
        paginas.push(
          1,
          "...",
          totalPaginas - 3,
          totalPaginas - 2,
          totalPaginas - 1,
          totalPaginas
        );
      } else {
        paginas.push(
          1,
          "...",
          paginaAtual - 1,
          paginaAtual,
          paginaAtual + 1,
          "...",
          totalPaginas
        );
      }
    }
    return paginas;
  };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <div className="relative z-10 px-4 md:px-28 mt-28">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-white flex items-center gap-2 text-sm md:text-base"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />
      <main className="relative z-10 flex flex-col items-center pt-24 max-sm:pt-4 flex-grow w-full px-4 pb-24">
        <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto p-6">
          <h2 className="text-xl font-bold mb-6 text-center">Documentos</h2>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-white border-opacity-50" />
            </div>
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
                        <tr
                          key={doc.id_documento}
                          className="border-t border-gray-700 hover:bg-gray-800"
                        >
                          <td className="px-4 py-2 text-left">{doc.anomes}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() =>
                                handleVisualizar(doc.id_documento)
                              }
                              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
                            >
                              Visualizar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setPaginaAtual((p) => Math.max(1, p - 1))
                          }
                          className={
                            paginaAtual === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                      {gerarPaginas().map((p, i) => (
                        <PaginationItem key={i}>
                          {typeof p === "string" ? (
                            <span className="px-3 py-1">{p}</span>
                          ) : (
                            <PaginationLink
                              isActive={paginaAtual === p}
                              onClick={() => setPaginaAtual(p)}
                            >
                              {p}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPaginaAtual((p) =>
                              Math.min(totalPaginas, p + 1)
                            )
                          }
                          className={
                            paginaAtual === totalPaginas
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
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
