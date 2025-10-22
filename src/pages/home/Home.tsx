// src/pages/home/Home.tsx
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

  useEffect(() => {
  if (userLoading || !isAuthenticated) return;

  const controller = new AbortController();
  setListsLoaded(false);

  (async () => {
    try {
      const shouldFetchTemplates =
        (Cookies.get("is_sapore") || "").toLowerCase() === "true";

      if (shouldFetchTemplates) {
        const [resDocs, resTemplates] = await Promise.all([
          api.get<Documento[]>("/documents", { signal: controller.signal }),
          api.get<TemplateGED[]>("/searchdocuments/templates", {
            signal: controller.signal,
          }),
        ]);

        const documentosOrdenados = [...resDocs.data].sort((a, b) =>
          a.nome.localeCompare(b.nome)
        );
        setDocumentos(documentosOrdenados);
        setTemplates(resTemplates.data);
      } else {
        const resDocs = await api.get<Documento[]>("/documents", {
          signal: controller.signal,
        });
        const documentosOrdenados = [...resDocs.data].sort((a, b) =>
          a.nome.localeCompare(b.nome)
        );
        setDocumentos(documentosOrdenados);
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
        description:
          "Não foi possível carregar a lista de documentos. Tente novamente.",
      });
      console.warn("Erro ao carregar documentos/templates:", error);
    }
  })();

  return () => controller.abort();
}, [isAuthenticated, userLoading]);


  const DEFAULT_TEMPLATE_ID = "3";
  const DOC_TEMPLATE_RULES: Array<{
    match: (n: string) => boolean;
    id: string;
  }> = [
    {
      match: (n) => /recibo\s*va|vale\s*alimenta(ç|c)[aã]o/i.test(n ?? ""),
      id: "3",
    },
  ];

  const getTemplateId = (nomeDocumento: string): string => {
    const rule = DOC_TEMPLATE_RULES.find((r) => r.match(nomeDocumento));
    return rule?.id || DEFAULT_TEMPLATE_ID;
  };

  // ✅ mover o useMemo antes de qualquer return condicional
  const gridCols = useMemo(() => {
    const total = documentos.length;
    if (total <= 2) return "grid-cols-1 sm:grid-cols-2";
    if (total === 3) return "grid-cols-1 sm:grid-cols-3";
    if (total === 4) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
    if (total === 5)
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  }, [documentos]);

  // 🔧 Loader total da página — vem DEPOIS dos hooks
  if (userLoading || (isAuthenticated && !listsLoaded)) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />

      <main className="relative z-10 flex flex-col items-center flex-grow w-full pt-32">
        {isAuthenticated ? (
          <div
            className={`grid justify-center items-center gap-6 w-full max-w-6xl mx-auto px-4 pb-10 ${gridCols}`}
          >
            {documentos.map(({ id, nome }) => (
              <div
                key={id}
                className="bg-[#1e1e2f] text-white rounded-lg cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
                onClick={() => {
                  const lower = (nome || "").toLowerCase();
                  const isHolerite =
                    lower.includes("holerite") ||
                    lower.includes("folha") ||
                    lower.includes("pagamento");

                  if (isHolerite) {
                    navigate("/documentos?tipo=holerite");
                  } else {
                    const templateId = getTemplateId(nome);
                    navigate(
                      `/documentos?tipo=generico&template=${templateId}&documento=${encodeURIComponent(
                        nome
                      )}`
                    );
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
        ) : (
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
                  <h1 className="text-lg font-bold">
                    SEJA BEM-VINDO ao SuperRH
                  </h1>
                  <p className="text-sm text-gray-300">
                    O SuperRH é um novo meio de comunicação entre você e o RH da
                    empresa. Através dele você poderá tirar dúvidas, consultar
                    seus recibos de pagamento, entre outros documentos.
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
