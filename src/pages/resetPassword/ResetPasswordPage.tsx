import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import api from "@/utils/axiosInstance"
import { toast } from "sonner"

const schema = z
  .object({
    newPassword: z.string().min(6, "Senha muito curta"),
    confirmPassword: z.string().min(6, "Confirme a senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const token = searchParams.get("token")

  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!token) toast.error("Token inválido ou expirado.")
  }, [token])

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/auth/reset-password", {
        token,
        nova_senha: data.newPassword,
      })
      toast.success("Senha alterada com sucesso!")
      navigate("/login")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao redefinir a senha.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-[#1e1e2f] text-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-6 border border-gray-700"
      >
        <h2 className="text-2xl font-bold text-center">Redefinir Senha</h2>
        <p className="text-sm text-gray-300 text-center">Digite sua nova senha para continuar</p>

        {!token ? (
          <p className="text-red-400 text-center">Token inválido. Solicite novamente.</p>
        ) : (
          <>
            <div>
              <Label htmlFor="newPassword" className="text-gray-200">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  {...register("newPassword")}
                  className="mt-1 pr-10 bg-[#2a2a3d] text-white"
                />
                <div
                  className="absolute right-2 top-2 text-white cursor-pointer hover:text-blue-400"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
              </div>
              {errors.newPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-200">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  className="mt-1 pr-10 bg-[#2a2a3d] text-white"
                />
                <div
                  className="absolute right-2 top-2 text-white cursor-pointer hover:text-blue-400"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full py-2 text-white font-semibold rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9]"
            >
              Redefinir Senha
            </Button>
          </>
        )}

        <p className="text-sm text-center mt-4 text-gray-300">
          <Link
            to="/login"
            className="text-[#7a8cff] hover:underline font-semibold"
          >
            Voltar para o login
          </Link>
        </p>
      </form>
    </div>
  )
}
