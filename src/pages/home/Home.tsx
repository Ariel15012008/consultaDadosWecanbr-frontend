"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import api from "@/utils/axiosInstance";

interface TemplateGED {
  id_tipo: string;
  nome_tipo: string;
  nome_divisao: string;
}

interface Documento {
  id: number;
  nome: string;
}

interface TemplateCombinado {
  id_tipo: string;
  nome: string;
}

function Home() {
  const [templates, setTemplates] = useState<TemplateCombinado[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Painel do Trabalhador";

    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);

    if (token) {
      const fetchData = async () => {
        try {
          const [resTemplates, resDocs] = await Promise.all([
            api.get<TemplateGED[]>("/searchdocuments/templates"),
            api.get<Documento[]>("/documents"),
          ]);

          const templatesData = resTemplates.data;
          const docsData = resDocs.data;

          const combinados: TemplateCombinado[] = templatesData.map((template, i) => ({
            id_tipo: template.id_tipo,
            nome: docsData[i]?.nome || "Documento",
          }));

          setTemplates(combinados);
        } catch (error) {
          console.error("Erro ao carregar templates:", error);
        }
      };

      fetchData();
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />

      <main className="relative z-10 flex flex-col items-center flex-grow w-full pt-32">
        {!isAuthenticated ? (
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
                  <h1 className="text-lg font-bold">SEJA BEM-VINDO AO superRH</h1>
                  <p className="text-sm text-gray-300">
                    O superRH será um novo meio de comunicação entre você e o RH da
                    Empresa. Através dele você poderá consultar seus recibos de
                    pagamento, resolver dúvidas e ter acesso a documentos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-6xl mx-auto px-4 pb-10">
            {templates.map(({ id_tipo, nome }) => (
              <div
                key={id_tipo}
                onClick={() => navigate(`/documentos/${id_tipo}`)}
                className="bg-[#1e1e2f] text-white rounded-lg cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
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

export default Home;
