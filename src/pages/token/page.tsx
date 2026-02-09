"use client";

import { useEffect, useMemo, useState } from "react";
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
type Step = "send" | "validate";

export default function TokenPage() {
  const navigate = useNavigate();

  const {
    user,
    isAuthenticated,
    internalTokenValidated,
    internalTokenBlockedInSession,
    setInternalTokenValidated,
    setInternalTokenBlockedInSession,

    // ✅ NOVO
    setInternalTokenPromptedInSession,
  } = useUser();

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

  const [lastSendAt, setLastSendAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // ✅ Ao entrar em /token, marca como "já foi direcionado"
  useEffect(() => {
    if (isAuthenticated) {
      setInternalTokenPromptedInSession(true);
    }
  }, [isAuthenticated, setInternalTokenPromptedInSession]);

  // Bloqueia acesso ao /token se já validou nessa sessão
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (internalTokenValidated || internalTokenBlockedInSession) {
      navigate("/", { replace: true });
      return;
    }
  }, [
    isAuthenticated,
    internalTokenValidated,
    internalTokenBlockedInSession,
    navigate,
  ]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const canSend = useMemo(
    () => Boolean(user?.cpf) && !sending,
    [user?.cpf, sending]
  );

  const resendCooldownSec = 30;
  const resendRemaining = useMemo(() => {
    if (!lastSendAt) return 0;
    const diffSec = Math.ceil(
      (lastSendAt + resendCooldownSec * 1000 - nowTick) / 1000
    );
    return Math.max(0, diffSec);
  }, [lastSendAt, nowTick]);

  const canResend = useMemo(() => {
    return step === "validate" && !sending && resendRemaining === 0;
  }, [step, sending, resendRemaining]);

  const sendToken = async () => {
    if (sending) return;

    setSending(true);
    setTokenError("");
    setSendMsg("");

    try {
      await api.post("/user/internal/send-token");

      setSendMsg("Token enviado para o seu e-mail. Verifique sua caixa de entrada.");
      setLastSendAt(Date.now());
      setStep("validate");

      setTimeout(() => {
        try {
          setFocus("token");
        } catch {
          // ignore
        }
      }, 0);
    } catch (err: any) {
      setTokenError(err?.response?.data?.detail || err?.message || "Erro ao enviar o token");
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setValidating(true);
    setTokenError("");

    try {
      const res = await api.post("/user/internal/validate-token", {
        token: data.token,
      });

      const valid = !!res.data?.valid;

      if (!valid) {
        const reason = res.data?.reason ?? "invalid";
        setTokenError(`Token inválido (${reason}).`);
        return;
      }

      setInternalTokenValidated(true);
      setInternalTokenBlockedInSession(true);

      navigate("/", { replace: true });
    } catch (err: any) {
      setTokenError(err?.response?.data?.detail || err?.message || "Erro ao validar o token");
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={sendToken}
                  disabled={!canResend}
                  className={[
                    "text-sm underline underline-offset-4",
                    canResend
                      ? "text-blue-300 hover:text-blue-200"
                      : "text-gray-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  {sending
                    ? "Reenviando..."
                    : resendRemaining > 0
                    ? `Reenviar token (aguarde ${resendRemaining}s)`
                    : "Reenviar token"}
                </button>

                <div className="text-xs text-gray-400 mt-2">
                  Ao reenviar, o token anterior pode ser invalidado. Use sempre o último e-mail.
                </div>
              </div>
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
