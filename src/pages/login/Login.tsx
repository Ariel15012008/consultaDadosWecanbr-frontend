"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import api from "@/utils/axiosInstance"; // ajuste o path se necessário

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState("")

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setLoginError("")

    try {
      const response = await api.post("/user/login", data)
      const result = response.data

      // ⬇️ Salva dados no localStorage
      localStorage.setItem("access_token", result.access_token)
      localStorage.setItem("logged_user", Date.now().toString())

      // Redireciona para home
      navigate("/")
    } catch (err: any) {
      setLoginError(
        err?.response?.data?.detail || err?.message || "Erro ao conectar com o servidor"
      )
    } finally {
      setLoading(false)
    }
  }

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
          <Label htmlFor="email" className="text-gray-200">
            Usuário (E-mail)
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            className="mt-1 bg-[#2a2a3d] text-white"
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
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

        <p className="text-sm text-center mt-4 text-gray-300">
          Ainda não tem conta?{" "}
          <a
            href="/register"
            className="text-[#7a8cff] hover:underline font-semibold"
          >
            Criar agora
          </a>
        </p>
      </form>
    </div>
  )
}
