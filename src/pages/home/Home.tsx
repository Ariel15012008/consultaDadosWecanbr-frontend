// src/pages/Home.tsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import api from "@/utils/axiosInstance";

interface Documento {
  id: number;
  nome: string;
}

interface TemplateGED {
  id_tipo: string;
}

export default function Home() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  // Removido idTemplate pois não está sendo utilizado
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loadingUser, setLoadingUser] = useState(true); // NOVO controle de carregamento inicial
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Portal do funcionário";

    const verificarSessao = async () => {
      try {
        await api.get("/user/me");
        setIsAuthenticated(true);

        const [resDocs] = await Promise.all([
          api.get<Documento[]>("/documents"),
          api.get<TemplateGED[]>("/searchdocuments/templates"),
        ]);

        // Código original sem ordenação
        // setDocumentos(resDocs.data);

        // NOVO: ordenação alfabética por nome
        const documentosOrdenados = resDocs.data.sort((a, b) =>
          a.nome.localeCompare(b.nome)
        );
        setDocumentos(documentosOrdenados);
        // Removido setIdTemplate pois não está sendo utilizado
      } catch (error) {
        setIsAuthenticated(false);
        console.warn("Usuário não autenticado:", error);
      } finally {
        setLoadingUser(false); // Finaliza carregamento
      }
    };

    verificarSessao();
  }, []);

  // NOVO: exibe splash de carregamento como na tela DocumentList
  if (loadingUser) {
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

      <main className="relative z-10 flex flex-col items-center flex-grow w-full pt-32">
        {isAuthenticated === null ? (
          // Estado intermediário não será mais alcançado, mas mantido comentado por referência
          // <p className="text-white mt-10 text-2xl font-bold">Carregando</p>
          null
        ) : !isAuthenticated ? (
          <div className="p-4 w-full">
            <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl p-6 mx-auto">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
                  <img
                    src="Avatar de Recepição.png"
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold">SEJA BEM-VINDO ao SuperRH</h1>
                  <p className="text-sm text-gray-300">
                    O SuperRH é um novo meio de comunicação entre você e o RH da
                    empresa. Através dele você poderá tirar dúvidas, consultar
                    seus recibos de pagamento, entre outros documentos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-6xl mx-auto px-4 pb-10">
            {documentos.map(({ id, nome }) => (
              <div
                key={id}
                className="bg-[#1e1e2f] text-white rounded-lg cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
                onClick={() => {
                  // ANTIGO: navegava com idTemplate e nome
                  // navigate(`/documentos/${idTemplate}?valor=${encodeURIComponent(nome)}`);

                  // NOVO: abre a tela de pesquisar holerite sem parâmetros na URL
                  navigate("/documentos");
                }}
              >
                <div className="flex flex-col items-center justify-center p-6">
                  <FileText size={40} className="mb-2" />
                  <h3 className="text-lg font-semibold text-center">{nome}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="relative z-10 w-full mt-auto">
        <Footer />
      </footer>
    </div>
  );
}
