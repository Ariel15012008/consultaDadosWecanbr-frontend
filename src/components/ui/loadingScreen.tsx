// src/components/LoadingScreen.tsx
import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* fundo com o mesmo gradiente do app */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300" />
      {/* conteúdo */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-6 py-8 bg-black/20 rounded-xl backdrop-blur-sm text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <div className="text-lg font-semibold">Carregando...</div>
        <p className="text-sm opacity-80">
          Preparando seu acesso com segurança.
        </p>
      </div>
    </div>
  );
}
