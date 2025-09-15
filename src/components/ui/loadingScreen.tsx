// src/components/LoadingScreen.tsx
import { Loader2 } from "lucide-react";

type LoadingScreenProps = {
  // overlay = tela inteira | container = cobre só o pai (precisa do pai com className="relative") | inline = linha
  variant?: "overlay" | "container" | "inline";
  message?: string;
  subtext?: string;
  className?: string;
};

export default function LoadingScreen({
  variant = "overlay",
  message = "Carregando...",
  subtext = "Preparando seus dados.",
  className,
}: LoadingScreenProps) {
  if (variant === "inline") {
    return (
      <div className={`flex items-center justify-center gap-3 ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <div className="text-base font-semibold">{message}</div>
      </div>
    );
  }

  if (variant === "container") {
    // cobre apenas o container pai (que deve ser relative)
    return (
      <div className="absolute inset-0 z-20 grid place-items-center rounded-xl">
        <div className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 px-6 py-8 bg-black/30 rounded-xl text-white shadow">
          <Loader2 className="h-6 w-6 animate-spin" />
          <div className="text-base font-semibold">{message}</div>
          {subtext ? <p className="text-xs opacity-80 text-center">{subtext}</p> : null}
        </div>
      </div>
    );
  }

  // fallback: tela inteira
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300" />
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-6 py-8 bg-black/20 rounded-xl backdrop-blur-sm text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <div className="text-lg font-semibold">{message}</div>
        {subtext ? <p className="text-sm opacity-80 text-center">{subtext}</p> : null}
      </div>
    </div>
  );
}
