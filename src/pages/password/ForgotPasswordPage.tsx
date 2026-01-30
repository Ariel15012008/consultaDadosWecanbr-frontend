"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

import { toast, Toaster } from "sonner";
import api from "@/utils/axiosInstance";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";

const schema = z
  .object({
    novaSenha: z
      .string()
      .min(8, "A nova senha deve ter no mínimo 8 caracteres")
      .max(128, "A nova senha é muito longa"),
    confirmarSenha: z.string().min(8, "Confirme a nova senha"),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    path: ["confirmarSenha"],
    message: "As senhas não conferem",
  });

type FormData = z.infer<typeof schema>;

export default function ForceChangePasswordPage() {
  const navigate = useNavigate();

  const {
    user,
    mustChangePassword,
    getLoginPassword,
    clearLoginPassword,
    refreshUser,
    logout,
  } = useUser();

  const cpf = user?.cpf ?? "";
  const senhaAtual = getLoginPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const [done, setDone] = useState(false);

  const canSubmit = useMemo(() => {
    if (done) return false;
    return Boolean(cpf && senhaAtual && mustChangePassword);
  }, [cpf, senhaAtual, mustChangePassword, done]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setPageError("");
    setPageSuccess("");

    try {
      if (!cpf) {
        setPageError("Não foi possível identificar o CPF do usuário.");
        return;
      }

      if (!senhaAtual) {
        setPageError(
          "Por segurança, é necessário informar sua senha atual novamente. Faça login de novo."
        );
        return;
      }

      await api.put("/user/update-password", {
        cpf,
        senha_atual: senhaAtual,
        senha_nova: data.novaSenha,
      });

      clearLoginPassword();
      setDone(true);

      // ✅ Toast apenas quando deu certo
      toast.success("Senha atualizada com sucesso.", {
        duration: 2500,
      });

      setPageSuccess("Senha atualizada. Redirecionando...");

      // ✅ NOVO: decide destino com base no user atualizado
      const u = await refreshUser();

      if ((u as any)?.interno === true) {
        navigate("/token", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      if (err?.message === "Network Error") {
        setPageError("Não foi possível conectar ao servidor. Verifique sua conexão.");
      } else {
        setPageError(
          err?.response?.data?.detail || err?.message || "Erro ao atualizar a senha"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const showYellowWarning = !done && !pageSuccess && !senhaAtual;

  return (
    <div className="h-screen w-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#0f172a] bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#1F52FF] via-[#7048e8] to-[#C263FF] opacity-30 blur-3xl -z-10" />

      <Toaster richColors position="top-center" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-[#1e1e2f] text-white rounded-2xl shadow-[0_0_120px_rgba(0,0,0,0.6)] p-8 w-full max-w-sm space-y-6 border border-gray-700"
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-center text-white">
            Troca de senha obrigatória
          </h2>
          <p className="text-sm text-center text-gray-300">
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </p>
        </div>

        {showYellowWarning && (
          <div className="text-sm text-yellow-200 bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            Sua sessão está autenticada, mas a senha atual não está disponível na
            memória. Para continuar, faça login novamente.
          </div>
        )}

        <div>
          <Label htmlFor="novaSenha" className="text-gray-200">
            Nova senha
          </Label>
          <div className="relative">
            <Input
              id="novaSenha"
              type={showNewPassword ? "text" : "password"}
              {...register("novaSenha")}
              className="mt-1 pr-10 bg-[#2a2a3d] text-white"
              autoComplete="new-password"
              disabled={!mustChangePassword || loading || done}
            />
            <div
              className="absolute right-2 top-2 text-white cursor-pointer hover:text-blue-400"
              onClick={() => setShowNewPassword((prev) => !prev)}
              role="button"
              aria-label="Alternar visualização da nova senha"
              tabIndex={0}
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
          {errors.novaSenha && (
            <p className="text-red-400 text-sm mt-1">{errors.novaSenha.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmarSenha" className="text-gray-200">
            Confirmar nova senha
          </Label>
          <div className="relative">
            <Input
              id="confirmarSenha"
              type={showConfirmPassword ? "text" : "password"}
              {...register("confirmarSenha")}
              className="mt-1 pr-10 bg-[#2a2a3d] text-white"
              autoComplete="new-password"
              disabled={!mustChangePassword || loading || done}
            />
            <div
              className="absolute right-2 top-2 text-white cursor-pointer hover:text-blue-400"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              role="button"
              aria-label="Alternar visualização da confirmação de senha"
              tabIndex={0}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
          {errors.confirmarSenha && (
            <p className="text-red-400 text-sm mt-1">
              {errors.confirmarSenha.message}
            </p>
          )}
        </div>

        {pageError && <p className="text-red-400 text-sm text-center">{pageError}</p>}

        {pageSuccess && (
          <p className="text-green-300 text-sm text-center">{pageSuccess}</p>
        )}

        <div className="space-y-3">
          <Button
            type="submit"
            className="w-full py-2 text-white font-semibold rounded-lg"
            style={{ background: "linear-gradient(to right, #1F52FF, #C263FF)" }}
            disabled={loading || !canSubmit}
          >
            {loading ? "Atualizando..." : "Atualizar senha"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full bg-[#2a2a3d] hover:bg-[#34344a] text-white border border-gray-600"
            disabled={loading}
            onClick={async () => {
              await logout({ redirectTo: "/login", reload: false });
            }}
          >
            Sair
          </Button>
        </div>

        <div className="text-xs text-center text-gray-400 leading-relaxed">
          Dica: use uma senha forte com letras maiúsculas, minúsculas, números e símbolos.
        </div>
      </form>
    </div>
  );
}
