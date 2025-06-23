"use client"

import { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import api from "@/utils/axiosInstance"

const schema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 letras"),
  email: z.string().email("E-mail inválido"),
  cpf: z
    .string()
    .length(14, "CPF inválido. Formato esperado: 999.999.999-99")
    .regex(/^(\d{3}\.){2}\d{3}-\d{2}$/, "CPF inválido. Formato esperado: 999.999.999-99"),
  senha: z.string().min(1, "Senha deve ter no mínimo 6 caracteres"),
})

export default function CadastroPage() {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const navigate = useNavigate()
  const [cpfValue, setCpfValue] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const formatCPF = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }, [])


  const onSubmit = async (data: any) => {
    try {
      const registerResponse = await api.post("/user/register", {
        pessoa: {
          nome: data.nome,
          empresa: 0,
          cliente: 0,
          cpf: data.cpf.replace(/\D/g, ""),
        },
        usuario: {
          email: data.email,
          senha: data.senha,
        },
      })

      if (registerResponse.status !== 201 && registerResponse.status !== 200) {
        console.error("Erro no cadastro:", registerResponse.data)
        return
      }

      // Login automático com cookie
      await api.post(
        "/user/login",
        {
          email: data.email,
          senha: data.senha,
        },
        { withCredentials: true }
      )

      navigate("/")
    } catch (error: any) {
      console.error("Erro na requisição:", error)
    }
  }

  return (
    <div className="h-screen w-screen relative flex items-center justify-center overflow-hidden bg-[#0f172a] bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300">
      <div className="absolute inset-0 animate-pulse blur-3xl -z-10" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-[#1e1e2f] text-white rounded-2xl shadow-[0_0_120px_rgba(0,0,0,0.6)] p-8 w-full max-w-md space-y-6 border border-gray-700"
      >
        <h2 className="text-3xl font-bold text-center text-white">Criar Conta</h2>

        <div>
          <Label htmlFor="nome" className="text-gray-200">Nome</Label>
          <Input id="nome" {...register("nome")} className="mt-1 bg-[#2a2a3d] text-white" />
          {errors.nome && <p className="text-red-400 text-sm mt-1">{errors.nome.message}</p>}
        </div>

        <div>
          <Label htmlFor="email" className="text-gray-200">Email</Label>
          <Input id="email" type="email" {...register("email")} className="mt-1 bg-[#2a2a3d] text-white" />
          {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="cpf" className="text-gray-200">CPF</Label>
          <Input
            id="cpf"
            value={cpfValue}
            onChange={(e) => {
              const masked = formatCPF(e.target.value)
              setCpfValue(masked)
              setValue("cpf", masked, { shouldValidate: true })
            }}
            className="mt-1 bg-[#2a2a3d] text-white"
          />
          {errors.cpf && <p className="text-red-400 text-sm mt-1">{errors.cpf.message}</p>}
        </div>

        <div>
          <Label htmlFor="senha" className="text-gray-200">Senha</Label>
          <div className="relative">
            <Input
              id="senha"
              type={showPassword ? "text" : "password"}
              {...register("senha")}
              className="mt-1 pr-10 bg-[#2a2a3d] text-white"
            />
            <div
              className="absolute right-2 top-2 text-white cursor-pointer transition hover:text-blue-400"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
          {errors.senha && <p className="text-red-400 text-sm mt-1">{errors.senha.message}</p>}
        </div>

        <Button
          type="submit"
          className="w-full py-2 text-white font-semibold rounded-lg"
          style={{ background: "linear-gradient(to right, #1F52FF, #C263FF)" }}
        >
          Cadastrar
        </Button>

        <p className="text-sm text-center mt-4 text-gray-300">
          Já possui uma conta?{" "}
          <a href="/login" className="text-[#7a8cff] hover:underline font-semibold">
            Entrar
          </a>
        </p>
      </form>
    </div>
  )
}
