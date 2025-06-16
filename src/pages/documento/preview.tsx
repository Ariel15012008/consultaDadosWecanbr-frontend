"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
} from "lucide-react";

function PreviewDocumento() {
  const location = useLocation();
  const id_template = location.state?.id_template;
  const id_documento = location.state?.id_documento;
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [showZoomIcon, setShowZoomIcon] = useState(false);

  useEffect(() => {
    document.title = "Visualizar Documento";

    const fetchImage = async () => {
      console.log("Enviando para download_image:", {
        id_tipo: id_template,
        id_documento,
      });
      try {
        const res = await fetch(
          "http://localhost:8000/searchdocuments/download_image",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              id_tipo: Number(id_template),
              id_documento: Number(id_documento),
            }),
          }
        );

        if (!res.ok) {
          const erro = await res.text();
          throw new Error(`Erro ${res.status}: ${erro}`);
        }

        const data = await res.json();
        const base64 = data.image_base64;

        if (!base64 || base64.length < 100 || base64.trim().startsWith("<")) {
          throw new Error("Base64 inválido recebido do backend");
        }

        const blob = await fetch(`data:image/jpeg;base64,${base64}`).then((r) =>
          r.blob()
        );
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } catch (error) {
        console.error("Erro ao carregar imagem:", error);
      }
    };

    fetchImage();
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [id_template, id_documento]);

  const handleDownload = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/searchdocuments/download",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id_tipo: Number(id_template),
            id_documento: Number(id_documento),
          }),
        }
      );
      const data = await res.json();
      const base64 = data.base64 || data.base64_raw;
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${base64}`;
      link.download = `documento_${id_documento}.pdf`;
      link.click();
    } catch (error) {
      console.error("Erro ao fazer download do PDF:", error);
    }
  };

  const handleFullscreenToggle = () => {
    if (!imageRef.current) return;

    if (!document.fullscreenElement) {
      imageRef.current.requestFullscreen().then(() => {
        setFullscreen(true);
        setZoom(false); // Corrigido para não ativar zoom ao entrar em fullscreen
      });
    } else {
      document.exitFullscreen().then(() => {
        setFullscreen(false);
        setZoom(false); // Corrigido para garantir desativação do zoom
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setZoomPosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const toggleZoom = () => {
    setZoom(!zoom);
  };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <div className="relative z-10 px-4 md:px-28 mt-28 md:mt-28">
        <Button
          variant="ghost"
          onClick={() => navigate(`/documentos/${id_template}`)}
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

          {imageUrl ? (
            <>
              <div
                className="relative mb-4 flex flex-col items-center"
                onMouseEnter={() => setShowZoomIcon(true)}
                onMouseLeave={() => setShowZoomIcon(false)}
              >
                <div className="relative overflow-hidden">
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Documento"
                    className={`w-full max-h-[80vh] object-contain cursor-zoom-in transition-transform duration-300 ${
                      zoom ? "scale-150" : "scale-100"
                    }`}
                    style={{
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                    onMouseMove={handleMouseMove}
                    onClick={toggleZoom}
                  />
                  {showZoomIcon && !zoom && !fullscreen && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 p-2 rounded-full">
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex gap-4 mt-4">
                  <Button
                    onClick={handleFullscreenToggle}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    {fullscreen ? (
                      <>
                        <Minimize2 className="w-4 h-4 mr-2" /> Sair da tela
                        cheia
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-4 h-4 mr-2" /> Tela cheia
                      </>
                    )}
                  </Button>
                  {zoom && (
                    <Button
                      onClick={() => setZoom(false)}
                      className="bg-purple-600 hover:bg-purple-500"
                    >
                      <ZoomOut className="w-4 h-4 mr-2" /> Reduzir zoom
                    </Button>
                  )}
                </div>
              </div>
              <Button
                onClick={handleDownload}
                className="bg-green-600 hover:bg-green-500"
              >
                <Download className="w-4 h-4 mr-2" /> Baixar PDF Original
              </Button>
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
