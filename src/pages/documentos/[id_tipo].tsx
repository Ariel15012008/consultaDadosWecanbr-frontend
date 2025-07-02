"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomMonthPicker from "@/components/ui/custom-month-picker";
import api from "@/utils/axiosInstance";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useLocation, useNavigate, useParams } from "react-router-dom";

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

  // Buscar o usuário atual e definir matrícula se não for gestor
  useEffect(() => {
    const fetchUser = async () => {
      const res = await api.get("/user/me");
      setUser(res.data);
      if (!res.data.gestor) setMatricula(res.data.matricula);
    };
    fetchUser();
  }, []);

  // Buscar os últimos documentos apenas se NÃO for gestor
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
        ...(isGestor && matricula ? [{ nome: "matricula", valor: matricula }] : !isGestor ? [{ nome: "matricula", valor: user?.matricula }] : []),
        { nome: "anomes", valor: anomes }
      ];
      const res = await api.post("/searchdocuments/documents", {
        id_template: Number(id_template),
        cp,
      });
      setDocuments(res.data.documents || []);
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

          <div
            className={`w-fit mx-auto grid gap-4 mb-6 grid-cols-1  ${
              isGestor ? "sm:grid-cols-3" : "sm:grid-cols-2"
            }`}
          >
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
            <div className="overflow-x-auto border border-gray-600 rounded">
              <table className="w-full text-sm text-left text-white">
                <thead className="text-xs uppercase text-gray-300 bg-[#2c2c40]">
                  <tr>
                    <th className="px-4 py-3 text-left">Ano/mês</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-4 text-gray-400">
                        Nenhum documento encontrado.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr
                        key={doc.id_documento}
                        className="border-t border-gray-700 hover:bg-gray-800"
                      >
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
