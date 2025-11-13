"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import api from "@/utils/axiosInstance";
import { useUser } from "@/contexts/UserContext";

const schema = z.object({
  usuario: z.string().min(9, "Usuário inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const navigate = useNavigate();
  const { refreshUser } = useUser(); // contexto
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setLoginError("");

    try {
      // 1) Faz login (rápido)
      await api.post("/user/login", data, { withCredentials: true });

      // 2) Já manda o usuário pra Home
      navigate("/");

      // 3) Atualiza dados do usuário em background (sem travar a navegação)
      refreshUser().catch((err) => {
        console.error("Erro ao atualizar usuário após login:", err);
      });
    } catch (err: any) {
      console.error("Erro ao fazer login:", err);
      if (err?.message === "Network Error") {
        setLoginError(
          "Não foi possível conectar ao servidor. Verifique sua conexão."
        );
      } else {
        setLoginError(
          err?.response?.data?.detail ||
            err?.message ||
            "Erro ao conectar com o servidor"
        );
      }
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
          Acesso ao Sistema
        </h2>

        <div>
          <Label className="text-gray-200">Usuário</Label>
          <Input
            id="usuario"
            type="text"
            {...register("usuario")}
            className="mt-1 bg-[#2a2a3d] text-white"
          />
          {errors.usuario && (
            <p className="text-red-400 text-sm mt-1">
              {errors.usuario.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="senha" className="text-gray-200">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="senha"
              type={showPassword ? "text" : "password"}
              {...register("senha")}
              className="mt-1 pr-10 bg-[#2a2a3d] text-white"
            />
            <div
              className="absolute right-2 top-2 text-white cursor-pointer hover:text-blue-400"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
          {errors.senha && (
            <p className="text-red-400 text-sm mt-1">{errors.senha.message}</p>
          )}
        </div>

        {loginError && (
          <p className="text-red-400 text-sm text-center">{loginError}</p>
        )}

        <Button
          type="submit"
          className="w-full py-2 text-white font-semibold rounded-lg"
          style={{ background: "linear-gradient(to right, #1F52FF, #C263FF)" }}
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
