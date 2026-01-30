"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import api from "@/utils/axiosInstance";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  token: z.string().min(1, "Informe o token").transform((v) => v.trim()),
});

type FormData = z.infer<typeof schema>;

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

type Step = "send" | "validate";

export default function TokenPage() {
  const navigate = useNavigate();
  const { user, setInternalTokenValidated, setInternalTokenBlockedInSession } =
    useUser();

  const cpf = onlyDigits(user?.cpf ?? "");

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const [step, setStep] = useState<Step>("send");

  const [showToken, setShowToken] = useState(false);
  const [sending, setSending] = useState(false);
  const [validating, setValidating] = useState(false);

  const [tokenError, setTokenError] = useState("");
  const [sendMsg, setSendMsg] = useState("");

  const canSend = useMemo(() => Boolean(cpf) && !sending, [cpf, sending]);

  const sendToken = async () => {
    setSending(true);
    setTokenError("");
    setSendMsg("");

    try {
      if (!cpf) {
        setTokenError("Não foi possível identificar o CPF do usuário.");
        return;
      }

      await api.post("/user/internal/send-token", { cpf });

      setSendMsg("Token enviado para o seu e-mail. Verifique sua caixa de entrada.");
      setStep("validate");

      // foca no input automaticamente após mostrar a etapa 2
      setTimeout(() => {
        try {
          setFocus("token");
        } catch {
          // ignore
        }
      }, 0);
    } catch (err: any) {
      setTokenError(
        err?.response?.data?.detail || err?.message || "Erro ao enviar o token"
      );
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setValidating(true);
    setTokenError("");

    try {
      if (!cpf) {
        setTokenError("Não foi possível identificar o CPF do usuário.");
        return;
      }

      const res = await api.post("/user/internal/validate-token", {
        cpf,
        token: data.token,
      });

      const valid = !!res.data?.valid;

      if (!valid) {
        const reason = res.data?.reason ?? "invalid";
        setTokenError(`Token inválido (${reason}).`);
        return;
      }

      // Marca como validado e BLOQUEIA /token até novo login
      setInternalTokenValidated(true);
      setInternalTokenBlockedInSession(true);

      navigate("/", { replace: true });
    } catch (err: any) {
      setTokenError(
        err?.response?.data?.detail || err?.message || "Erro ao validar o token"
      );
    } finally {
      setValidating(false);
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

        {step === "send" && (
          <>
            <p className="text-sm text-gray-300 text-center">
              Clique para enviar um token ao seu e-mail e continuar.
            </p>

            <Button
              type="button"
              className="w-full py-2 text-white font-semibold rounded-lg"
              style={{ background: "linear-gradient(to right, #1F52FF, #C263FF)" }}
              disabled={!canSend}
              onClick={sendToken}
            >
              {sending ? "Enviando..." : "Enviar token para o e-mail"}
            </Button>

            {sendMsg && (
              <div className="text-sm text-blue-200 bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                {sendMsg}
              </div>
            )}
          </>
        )}

        {step === "validate" && (
          <>
            <p className="text-sm text-gray-300 text-center">
              Digite o token enviado para seu e-mail.
            </p>

            {sendMsg && (
              <div className="text-sm text-blue-200 bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                {sendMsg}
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

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full py-2 text-white font-semibold rounded-lg"
                style={{ background: "linear-gradient(to right, #1F52FF, #C263FF)" }}
                disabled={validating}
              >
                {validating ? "Validando..." : "Validar Token"}
              </Button>

              

              <Button
                type="button"
                variant="secondary"
                className="w-full bg-[#2a2a3d] hover:bg-[#34344a] text-white border border-gray-600"
                disabled={sending}
                onClick={sendToken}
              >
                {sending ? "Reenviando..." : "Reenviar token"}
              </Button>
            </div>
          </>
        )}

        {tokenError && (
          <p className="text-red-400 text-sm text-center">{tokenError}</p>
        )}
      </form>
    </div>
  );
}
