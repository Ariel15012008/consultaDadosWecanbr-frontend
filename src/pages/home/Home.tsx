// src/pages/Home.tsx
"use client";

import avatar from '@/assets/Avatar de Recepição.png';
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
  const [templates, setTemplates] = useState<TemplateGED[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Portal do funcionário";

    const verificarSessao = async () => {
      try {
        await api.get("/user/me");
        setIsAuthenticated(true);

        const [resDocs, resTemplates] = await Promise.all([
          api.get<Documento[]>("/documents"),
          api.get<TemplateGED[]>("/searchdocuments/templates"),
        ]);

        // Ordenação alfabética por nome
        const documentosOrdenados = resDocs.data.sort((a, b) =>
          a.nome.localeCompare(b.nome)
        );
        setDocumentos(documentosOrdenados);
        setTemplates(resTemplates.data);
      } catch (error) {
        setIsAuthenticated(false);
        console.warn("Usuário não autenticado:", error);
      } finally {
        setLoadingUser(false);
      }
    };

    verificarSessao();
  }, []);

  // Função para determinar o id_template baseado no nome do documento
  const getTemplateId = (nomeDocumento: string): string => {
    // Você pode ajustar essa lógica conforme sua necessidade
    // Por exemplo, se tiver um mapeamento específico ou buscar no array de templates
    const template = templates.find(t => 
      // Ajuste essa condição conforme a relação entre documento e template
      nomeDocumento.toLowerCase().includes('recibo va') ? t.id_tipo === '3' : false
    );
    return template?.id_tipo || '3'; // Default para um template genérico
  };

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
          null
        ) : !isAuthenticated ? (
          <div className="p-4 w-full">
            <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl p-6 mx-auto">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
                  <img
                    src={avatar}
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
                  // Passa o tipo de documento e template para a DocumentList
                  const isHolerite = nome.toLowerCase().includes('holerite') || 
                                   nome.toLowerCase().includes('folha') ||
                                   nome.toLowerCase().includes('pagamento');
                  if (isHolerite) {
                    // Para holerite, navega sem parâmetros específicos (usa fluxo atual)
                    navigate("/documentos?tipo=holerite");
                  } else {
                    // Para outros documentos, passa o template e o tipo
                    const templateId = getTemplateId(nome);
                    navigate(`/documentos?tipo=generico&template=${templateId}&documento=${encodeURIComponent(nome)}`);
                  }
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
