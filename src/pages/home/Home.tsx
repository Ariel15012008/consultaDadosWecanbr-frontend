"use client"

import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white text-center px-4">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-md">
        Bem-vindo ao Sistema de Consulta de Documentos
      </h1>
      <p className="text-lg md:text-xl mb-8 max-w-xl">
        Essa é uma página inicial temporária. Use os botões abaixo para navegar até o login ou realizar um novo cadastro.
      </p>

      <div className="flex gap-4">
        <Link to="/login">
          <Button className="bg-white text-indigo-600 font-semibold hover:bg-gray-100 transition">
            Acessar Conta
          </Button>
        </Link>

        <Link to="/cadastro">
          <Button className="bg-white text-purple-600 font-semibold hover:bg-gray-100 transition">
            Criar Conta
          </Button>
        </Link>
      </div>
    </div>
  )
}