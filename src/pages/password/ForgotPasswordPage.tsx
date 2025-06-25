import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Link } from "react-router-dom"
import api from "@/utils/axiosInstance"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/auth/send-reset-email", data)
      toast.success("E-mail enviado com sucesso!")
      navigate("/login")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao enviar o e-mail.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-[#1e1e2f] text-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-6 border border-gray-700"
      >
        <h2 className="text-2xl font-bold text-center">Envio de redefinição de senha</h2>
        <p className="text-sm text-gray-300 text-center">Digite seu e-mail para receber o link de redefinição</p>

        <div>
          <Label htmlFor="email" className="text-gray-200">E-mail</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            className="mt-1 bg-[#2a2a3d] text-white"
          />
          {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          style={{ background: "linear-gradient(to right, #1F52FF, #C263FF)" }}
          className="w-full py-2 text-white font-semibold rounded-lg"
        >
          Enviar link de redefinição
        </Button>

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