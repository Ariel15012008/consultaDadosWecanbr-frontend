"use client"

import { useEffect } from "react"
import {
  LayoutGrid,
  Gift,
  Clock,
  Users,
  Building,
  UserCog,
  Receipt,
  FileText,
  FileSignature,
  FileSpreadsheet,
  GitBranch,
  BarChart,
  Star,
} from "lucide-react"
import Header from "@/components/header"
import Footer from "@/components/footer"

function Home() {
  useEffect(() => {
    document.title = "Painel do Trabalhador"
  }, [])

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />

      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />

      <main className="relative z-10 flex flex-col items-center flex-grow w-full">
        <div className="p-4">
        {/* Welcome card */}
        <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl p-6 mt-32 mx-auto px-4 ">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
              <img src="Avatar de Recepição.png" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold">SEJA BEM-VINDO AO docRH</h1>
              <p className="text-sm text-gray-300">
                O docRH será o novo meio de comunicação entre você e o RH da Empresa. Através dele você poderá consultar
                seus recibos de pagamento, resolver dúvidas e ter acesso a documentos.
              </p>
            </div>
          </div>
        </div>
        </div>

        {/* Grid of cards - centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10 w-full max-w-6xl mx-auto px-4 pb-10">
          {[{
            icon: <LayoutGrid size={40} className="mb-2" />, title: "Meu Salário", desc: "Holerite, contracheque ou o extrato de salários pagos."
          }, {
            icon: <Gift size={40} className="mb-2" />, title: "Benefícios", desc: "Recibos detalhados dos seus benefícios."
          }, {
            icon: <Clock size={40} className="mb-2" />, title: "Espelho Ponto", desc: "Total de horas trabalhadas por você a cada mês."
          }, {
            icon: <Users size={40} className="mb-2" />, title: "Trabalhadores"
          }, {
            icon: <Building size={40} className="mb-2" />, title: "Empresas"
          }, {
            icon: <UserCog size={40} className="mb-2" />, title: "Gestores"
          }, {
            icon: <Clock size={40} className="mb-2" />, title: "Pontofopag"
          }, {
            icon: <Receipt size={40} className="mb-2" />, title: "Recibos"
          }, {
            icon: <FileText size={40} className="mb-2" />, title: "Documentos"
          }, {
            icon: <FileSignature size={40} className="mb-2" />, title: "Termos e Contratos"
          }, {
            icon: <FileSpreadsheet size={40} className="mb-2" />, title: "Meu Modelo"
          }, {
            icon: <GitBranch size={40} className="mb-2" />, title: "Organograma"
          }, {
            icon: <BarChart size={40} className="mb-2" />, title: "Relatórios"
          }, {
            icon: <Star size={40} className="mb-2" />, title: "Avaliar"
          }].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-[#1e1e2f] text-white rounded-lg cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
            >
              <div className="flex flex-col items-center justify-center p-6">
                {icon}
                <h3 className="text-lg font-semibold text-center">{title}</h3>
                {desc && <p className="text-sm text-gray-400 text-center mt-1">{desc}</p>}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 w-full mt-auto">
        <Footer />
      </footer>
    </div>
  )
}

export default Home
