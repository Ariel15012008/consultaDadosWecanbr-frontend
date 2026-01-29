"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

const schema = z.object({
  token: z
    .string()
    .min(1, "Informe o token")
    .transform((v) => v.trim()),
});

type FormData = z.infer<typeof schema>;

export default function TokenPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [tokenSuccess, setTokenSuccess] = useState("");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setTokenError("");
    setTokenSuccess("");

    try {
      // Aqui você implementará a lógica de validação do token
      console.log("Token enviado:", data.token);
      
      // Simulação de sucesso (remover depois)
      setTokenSuccess("Token validado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao validar token:", err);
      setTokenError(
        err?.response?.data?.detail ||
          err?.message ||
          "Erro ao validar o token"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#0f172a] bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#1F52FF] via-[#7048e8] to-[#C263FF] opacity-30 blur-3xl -z-10" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-[#1e1e2f] text-white rounded-2xl shadow-[0_0_120px_rgba(0,0,0,0.6)] p-8 w-full max-w-sm space-y-6 border border-gray-700"
      >
        <h2 className="text-2xl font-bold text-center text-white">
          Validação de Token
        </h2>

        <p className="text-sm text-gray-300 text-center">
          Insira o token de acesso para continuar
        </p>

        {tokenSuccess && (
          <div className="text-sm text-green-200 bg-green-900/20 border border-green-700 rounded-lg p-3">
            {tokenSuccess}
          </div>
        )}

        <div>
          <Label htmlFor="token" className="text-gray-200">
            Token de Acesso
          </Label>
          <div className="relative">
            <Input
              id="token"
              type={showToken ? "text" : "password"}
              {...register("token")}
              placeholder="Digite seu token"
              className="mt-1 pr-10 bg-[#2a2a3d] text-white placeholder:text-gray-500"
              autoComplete="off"
            />
            <div
              className="absolute right-2 top-2 text-white cursor-pointer hover:text-blue-400"
              onClick={() => setShowToken((prev) => !prev)}
              role="button"
              aria-label="Alternar visualização do token"
              tabIndex={0}
            >
              {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
          {errors.token && (
            <p className="text-red-400 text-sm mt-1">{errors.token.message}</p>
          )}
        </div>

        {tokenError && (
          <p className="text-red-400 text-sm text-center">{tokenError}</p>
        )}

        <Button
          type="submit"
          className="w-full py-2 text-white font-semibold rounded-lg"
          style={{ background: "linear-gradient(to right, #1F52FF, #C263FF)" }}
          disabled={loading}
        >
          {loading ? "Validando..." : "Validar Token"}
        </Button>
      </form>
    </div>
  );
}