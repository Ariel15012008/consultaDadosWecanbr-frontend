"use client";

import avatar from "@/assets/Avatar de Recepição.png";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LoadingScreen from "@/components/ui/loadingScreen";
import api from "@/utils/axiosInstance";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import Cookies from "js-cookie";

interface Documento {
  id: number;
  nome: string;
}

interface TemplateGED {
  id_tipo: string;
}

export default function Home() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [, setTemplates] = useState<TemplateGED[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: userLoading } = useUser();

  useEffect(() => {
    document.title = "Portal do funcionário";
  }, []);

  // 🔥 Hook que carrega documentos — sempre fica DEPOIS dos estados
  useEffect(() => {
    if (!isAuthenticated) return;
    if (userLoading) return;

    const controller = new AbortController();
    setListsLoaded(false);

    (async () => {
      try {
        const shouldFetchTemplates = (Cookies.get("is_sapore") || "").toLowerCase() === "true";

        if (shouldFetchTemplates) {
          const [resDocs, resTemplates] = await Promise.all([
            api.get<Documento[]>("/documents", { signal: controller.signal }),
            api.get<TemplateGED[]>("/searchdocuments/templates", {
              signal: controller.signal,
            }),
          ]);

          const docsSorted = [...resDocs.data].sort((a, b) =>
            a.nome.localeCompare(b.nome)
          );
          setDocumentos(docsSorted);
          setTemplates(resTemplates.data);
        } else {
          const resDocs = await api.get<Documento[]>("/documents", {
            signal: controller.signal,
          });

          const docsSorted = [...resDocs.data].sort((a, b) =>
            a.nome.localeCompare(b.nome)
          );
          setDocumentos(docsSorted);
          setTemplates([]);
        }

        setListsLoaded(true);
      } catch (error: any) {
        if (
          controller.signal.aborted ||
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError"
        ) {
          return;
        }
        toast.error("Falha ao carregar opções", {
          description: "Não foi possível carregar a lista de documentos. Tente novamente.",
        });
        console.warn("Erro ao carregar documentos:", error);
      }
    })();

    return () => controller.abort();
  }, [isAuthenticated, userLoading]);

  // 🔍 Regras de template atualizadas
  const DEFAULT_TEMPLATE_ID = "3";
  const DOC_TEMPLATE_RULES: Array<{ match: (n: string) => boolean; id: string }> = [
    {
      match: (n) => /recibo\s*va|vale\s*alimenta(ç|c)[aã]o/i.test(n ?? ""),
      id: "3",
    },
    {
      match: (n) => /trtc|trct|informe\s*rendimento/i.test(n ?? ""),
      id: "6",
    },
  ];

  const getTemplateId = (nomeDocumento: string): string => {
    const rule = DOC_TEMPLATE_RULES.find((r) => r.match(nomeDocumento));
    return rule?.id || DEFAULT_TEMPLATE_ID;
  };

  // 🔧 Detecção de tipo de documento
  const getDocumentType = (nomeDocumento: string): string => {
    const nomeLower = nomeDocumento.toLowerCase();
    
    if (nomeLower.includes("holerite") || nomeLower.includes("folha") || nomeLower.includes("pagamento")) {
      return "holerite";
    }
    
    if (nomeLower.includes("beneficio") || nomeLower.includes("benefícios")) {
      return "beneficios";
    }
    
    if (nomeLower.includes("trtc") || nomeLower.includes("trct") || nomeLower.includes("informe rendimento")) {
      return "trct";
    }
    
    return "generico";
  };

  // 🔧 Grid dinâmico
  const gridCols = useMemo(() => {
    const total = documentos.length;
    if (total <= 2) return "grid-cols-1 sm:grid-cols-2";
    if (total === 3) return "grid-cols-1 sm:grid-cols-3";
    if (total === 4) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    if (total === 5) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  }, [documentos]);

  // ====================================================
  // 🚀 SOMENTE AQUI COMEÇAM OS RETURNS CONDICIONAIS
  // ====================================================

  // 1) Ainda carregando o usuário? → Não mostra NADA da Home
  if (userLoading) {
    return <LoadingScreen />;
  }

  // 2) Autenticado mas documentos não carregados? → LoadingScreen
  if (isAuthenticated && !listsLoaded) {
    return <LoadingScreen />;
  }

  // 3) Renderização final
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />

      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />

      <main className="relative z-10 flex flex-col items-center flex-grow w-full pt-32">
        {isAuthenticated ? (
          <div className={`grid justify-center items-center gap-6 w-full max-w-6xl mx-auto px-4 pb-10 ${gridCols}`}>
            {documentos.map(({ id, nome }) => {
              const documentType = getDocumentType(nome);
              const templateId = getTemplateId(nome);

              const handleClick = () => {
                if (documentType === "holerite") {
                  navigate("/documentos?tipo=holerite");
                } else if (documentType === "beneficios") {
                  navigate("/documentos?tipo=beneficios");
                } else if (documentType === "trct") {
                  navigate(`/documentos?tipo=trct&template=${templateId}&documento=${encodeURIComponent(nome)}`);
                } else {
                  navigate(`/documentos?tipo=generico&template=${templateId}&documento=${encodeURIComponent(nome)}`);
                }
              };

              return (
                <div
                  key={id}
                  className="bg-[#1e1e2f] text-white rounded-lg cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
                  onClick={handleClick}
                >
                  <div className="flex flex-col items-center justify-center p-6">
                    <FileText size={40} className="mb-2" />
                    <h3 className="text-lg font-semibold text-center">{nome}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 w-full">
            <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl p-6 mx-auto">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">SEJA BEM-VINDO ao SuperRH</h1>
                  <p className="text-sm text-gray-300">
                    O SuperRH é um novo meio de comunicação entre você e o RH da empresa. Consulte seus documentos, converse com o RH e muito mais.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 w-full mt-auto">
        <Footer />
      </footer>
    </div>
  );
}