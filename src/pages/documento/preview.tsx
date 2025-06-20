"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import api from "@/utils/axiosInstance";

function PreviewDocumento() {
  const location = useLocation();
  const id_template = location.state?.id_template;
  const id_documento = location.state?.id_documento;
  const valor = location.state?.valor || ""; // <- pega o valor do nome do documento
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    document.title = "Visualizar Documento";

    const checkViewport = () => {
      setIsMobile(window.innerWidth <= 425);
    };

    if (typeof window !== "undefined") {
      checkViewport();
      window.addEventListener("resize", checkViewport);
    }

    const fetchPdf = async () => {
      try {
        const res = await api.post("/searchdocuments/download", {
          id_tipo: Number(id_template),
          id_documento: Number(id_documento),
        });

        const base64 = res.data.base64 || res.data.base64_raw;
        const blob = await fetch(`data:application/pdf;base64,${base64}`).then((r) => r.blob());
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        console.error("Erro ao carregar PDF:", error);
      }
    };

    fetchPdf();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      window.removeEventListener("resize", checkViewport);
    };
  }, [id_template, id_documento]);

  const handleDownload = async () => {
    try {
      const res = await api.post("/searchdocuments/download", {
        id_tipo: Number(id_template),
        id_documento: Number(id_documento),
      });

      const base64 = res.data.base64 || res.data.base64_raw;
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${base64}`;
      link.download = `documento_${id_documento}.pdf`;
      link.click();
    } catch (error) {
      console.error("Erro ao fazer download do PDF:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <div className="relative z-10 px-4 md:px-28 mt-28 md:mt-28">
        <Button
          variant="ghost"
          onClick={() => navigate(`/documentos/${id_template}?valor=${encodeURIComponent(valor)}`)}
          className="text-white flex items-center gap-2 text-sm md:text-base"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />
      <main className="relative z-10 flex flex-col items-center flex-grow w-full px-4">
        <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-5xl p-6 mt-10">
          <h2 className="text-xl font-bold mb-6 text-center">
            Visualização do Documento
          </h2>

          {pdfUrl ? (
            <>
              {isMobile ? (
                <div className="flex justify-center mb-6">
                  <Button
                    onClick={() => window.open(pdfUrl, "_blank")}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Abrir Documento
                  </Button>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  src={pdfUrl}
                  className="w-full h-[80vh] border rounded-lg shadow-inner mb-6"
                />
              )}

              <div className="flex justify-center">
                <Button
                  onClick={handleDownload}
                  className="bg-green-600 hover:bg-green-500"
                >
                  <Download className="w-4 h-4 mr-2" /> Baixar PDF Original
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-300">Carregando documento...</p>
          )}
        </div>
      </main>
      <footer className="relative z-10 w-full mt-auto pt-6">
        <Footer />
      </footer>
    </div>
  );
}

export default PreviewDocumento;
