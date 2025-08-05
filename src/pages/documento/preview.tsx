"use client"

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download } from "lucide-react"
import { useUser } from "@/contexts/UserContext"

// Tipos para Holerite (mantidos como estavam)
interface Cabecalho {
  empresa: string
  filial: string
  empresa_nome: string
  empresa_cnpj: string
  cliente: string
  cliente_nome: string
  cliente_cnpj: string
  matricula: string
  nome: string
  funcao_nome: string
  admissao: string
  competencia: string
  lote: number
}

interface Evento {
  evento: number
  evento_nome: string
  referencia: number
  valor: number
  tipo: string
}

interface Rodape {
  total_vencimentos: number
  total_descontos: number
  valor_liquido: number
  salario_base: number
  sal_contr_inss: number
  base_calc_fgts: number
  fgts_mes: number
  base_calc_irrf: number
  dep_sf: number
  dep_irf: number
}

// Tipos para documentos genéricos
interface DocumentoGenerico {
  id_documento: string
  situacao: string
  nomearquivo: string
  versao1: string
  versao2: string
  tamanho: string
  datacriacao: string
  cliente: string
  colaborador: string
  regional: string
  cr: string
  anomes: string
  tipodedoc: string
  status: string
  observacao: string
  datadepagamento: string
  matricula: string
  _norm_anomes: string
}

// Utilitários para holerite (mantidos como estavam)
function padLeft(value: string | number, width: number): string {
  return String(value).trim().padStart(width, "0")
}

function fmtNum(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function truncate(text: string | undefined | null, maxLen: number): string {
  const safeText = text ?? ""
  return safeText.length <= maxLen ? safeText : safeText.slice(0, maxLen - 3) + "..."
}

function fmtRef(value: number): string {
  return value === 0
    ? ""
    : value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
}

export default function PreviewDocumento() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoading: userLoading } = useUser()
  const [isDownloading, setIsDownloading] = useState(false)

  const state = location.state as {
    pdf_base64: string
    cabecalho?: Cabecalho
    eventos?: Evento[]
    rodape?: Rodape
    documento_info?: DocumentoGenerico
    tipo?: "holerite" | "generico"
  } | null

  useEffect(() => {
    if (state?.tipo === "generico" && state?.documento_info) {
      document.title = `${state.documento_info.tipodedoc} - ${state.documento_info._norm_anomes}`
    } else {
      document.title = "Recibo de Pagamento de Salário"
    }
  }, [state])

  const handleDownload = async () => {
    if (!state?.pdf_base64) {
      alert("PDF não disponível.")
      return
    }

    try {
      setIsDownloading(true)
      // Converter base64 para blob
      const byteCharacters = atob(state.pdf_base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      // Nome do arquivo baseado no tipo
      if (state.tipo === "generico" && state.documento_info) {
        link.download = `${state.documento_info.nomearquivo}`
      } else if (state.cabecalho) {
        link.download = `holerite_${state.cabecalho.matricula}_${state.cabecalho.competencia}.pdf`
      } else {
        link.download = "documento.pdf"
      }

      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setIsDownloading(false)
      }, 100)
    } catch (e) {
      console.error("Erro ao baixar PDF:", e)
      alert("Erro ao baixar o PDF.")
      setIsDownloading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 text-white text-xl font-bold">
        Carregando...
      </div>
    )
  }

  if (!state || !state.pdf_base64) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 bg-[#1e1e2f] text-white text-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2">
            <ArrowLeft /> Voltar
          </Button>
          <p className="text-lg">Dados do documento não encontrados. Volte e tente novamente.</p>
        </main>
        <Footer />
      </div>
    )
  }

  // ========== RENDERIZAÇÃO PARA DOCUMENTOS GENÉRICOS ==========
  if (state.tipo === "generico" && state.documento_info) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-600">
        <Header />
        <main className="flex-grow p-8 pt-24">
          <div className="flex flex-col md:flex-row justify-between items-start rounded-lg">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-white ">
              <ArrowLeft /> Voltar
            </Button>
          </div>

          {/* Container do PDF */}
          <div
            className="relative overflow-hidden border rounded-lg bg-white mx-auto"
            style={{
              width: "100%",
              maxWidth: "900px",
              height: "600px",
            }}
          >
            <iframe
              src={`data:application/pdf;base64,${state.pdf_base64}`}
              className="w-full h-full border-0"
              title="Visualizador de PDF"
            />
          </div>

          <div className="flex justify-center items-center pb-8 pt-4">
            <Button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-500 w-full sm:w-44 h-10"
              disabled={isDownloading}
            >
              <Download className="mr-2 w-4 h-4" />
              {isDownloading ? "Baixando..." : "Baixar Documento"}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ========== RENDERIZAÇÃO PARA HOLERITE (mantida como estava) ==========
  if (!state.cabecalho || !state.eventos || !state.rodape) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-8 bg-[#1e1e2f] text-white text-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2">
            <ArrowLeft /> Voltar
          </Button>
          <p className="text-lg">Dados do holerite não encontrados. Volte e tente novamente.</p>
        </main>
        <Footer />
      </div>
    )
  }

  const { cabecalho, eventos, rodape } = state

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-green-600">
      <Header />
      <main className="flex-grow p-8 pt-24 bg-white">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-white ">
          <ArrowLeft /> Voltar
        </Button>

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold">Recibo de Pagamento de Salário</h1>
            <div className="text-sm md:text-base">
              <strong>Empresa:</strong> {padLeft(cabecalho.empresa, 3)} - {cabecalho.filial} {cabecalho.empresa_nome}
              <div className="block md:hidden text-xs pr-4 whitespace-nowrap overflow-x-auto">
                <strong>Nº Inscrição:</strong> {cabecalho.empresa_cnpj}
              </div>
            </div>
            <div className="text-sm md:text-base mt-2">
              <strong>Cliente:</strong> {cabecalho.cliente} {cabecalho.cliente_nome}
              <div className="block md:hidden text-xs whitespace-nowrap overflow-x-auto">
                <strong>Nº Inscrição:</strong> {cabecalho.cliente_cnpj}
              </div>
            </div>
          </div>
          <div className="text-xs md:text-sm text-left md:text-right md:pt-7 whitespace-nowrap">
            <div className="hidden md:block">
              <strong>Nº Inscrição:</strong> {cabecalho.empresa_cnpj}
            </div>
            <div className="hidden md:block">
              <strong>Nº Inscrição:</strong> {cabecalho.cliente_cnpj}
            </div>
          </div>
        </div>

        <div className="mb-6 text-xs md:text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Código</strong> {padLeft(cabecalho.matricula, 6)}
          </div>
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Nome do Funcionário</strong> {truncate(cabecalho.nome, 30)}
          </div>
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Função</strong> {cabecalho.funcao_nome}
          </div>
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Admissão</strong> {cabecalho.admissao}
          </div>
          <div className="flex flex-col">
            <strong className="pb-1 md:pb-2">Competência</strong> {cabecalho.competencia}
          </div>
        </div>

        <div className="bg-gray-300 w-full h-[1px] my-2"></div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1 md:p-2 text-left border-r-[1px]">Cód.</th>
                <th className="p-1 md:p-2 text-center border-r-[1px]">Descrição</th>
                <th className="p-1 md:p-2 text-center border-r-[1px]">Referência</th>
                <th className="p-1 md:p-2 text-center border-r-[1px]">Vencimentos</th>
                <th className="p-1 md:p-2 text-center">Descontos</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e, i) => (
                <tr key={i} className={i % 2 ? "bg-gray-100" : "bg-white"}>
                  <td className="p-1 md:p-2 border-r-[1px]">{e.evento}</td>
                  <td className="p-1 md:p-2 border-r-[1px]">{truncate(e.evento_nome, 35)}</td>
                  <td className="p-1 md:p-2 text-center border-r-[1px]">{fmtRef(e.referencia)}</td>
                  <td className="p-1 md:p-2 text-center border-r-[1px]">{e.tipo === "V" ? fmtNum(e.valor) : ""}</td>
                  <td className="p-1 md:p-2 text-center">{e.tipo === "D" ? fmtNum(e.valor) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-300 w-full h-[1px] my-2"></div>

        {/* Seção de Totais */}
        <div className="my-4 md:my-6 flex flex-col sm:flex-row justify-between text-xs md:text-sm">
          {/* Versão desktop */}
          <div className="hidden sm:flex justify-end sm:justify-start xl:pl-[700px]">
            <div className="flex flex-col text-right">
              <strong>Total Vencimentos:</strong> {fmtNum(rodape.total_vencimentos)}
            </div>
          </div>
          {/* Versão mobile */}
          <div className="sm:hidden flex flex-col gap-2">
            <div className="flex justify-between">
              <strong>Total Vencimentos:</strong>
              <span>{fmtNum(rodape.total_vencimentos)}</span>
            </div>
            <div className="flex justify-between">
              <strong>Total Descontos:</strong>
              <span>{fmtNum(rodape.total_descontos)}</span>
            </div>
            <div className="flex justify-between">
              <strong>Valor Líquido:</strong>
              <span>{fmtNum(rodape.valor_liquido)}</span>
            </div>
          </div>
          {/* Versão desktop */}
          <div className="hidden sm:flex flex-col text-right">
            <div className="flex flex-col text-right">
              <strong>Total Descontos:</strong> {fmtNum(rodape.total_descontos)}
            </div>
            <div className="pt-2 md:pt-4">
              <strong>Valor Líquido:</strong> {fmtNum(rodape.valor_liquido)}
            </div>
          </div>
        </div>

        <div className="bg-gray-300 w-full h-[1px] my-2"></div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 md:gap-4 pt-2 text-xs md:text-sm">
          <div className="flex flex-col text-center">
            <strong>Salário Base:</strong> {fmtNum(rodape.salario_base)}
          </div>
          <div className="flex flex-col text-center">
            <strong>Sal. Contr. INSS:</strong> {fmtNum(rodape.sal_contr_inss)}
          </div>
          <div className="flex flex-col text-center">
            <strong>Base Cálc FGTS:</strong> {fmtNum(rodape.base_calc_fgts)}
          </div>
          <div className="flex flex-col text-center">
            <strong>F.G.T.S. do Mês:</strong> {fmtNum(rodape.fgts_mes)}
          </div>
          <div className="flex flex-col text-center">
            <strong>Base Cálc IRRF:</strong> {fmtNum(rodape.base_calc_irrf)}
          </div>
          <div className="flex flex-col text-center">
            <strong>DEP SF:</strong> 0{rodape.dep_sf}
          </div>
          <div className="flex flex-col text-center">
            <strong>Dep IRF:</strong> 0{rodape.dep_irf}
          </div>
        </div>
      </main>

      <div className="flex justify-center items-center p-8 md:p-16">
        <Button
          onClick={handleDownload}
          className="bg-green-600 hover:bg-green-500 w-full sm:w-44 h-10"
          disabled={isDownloading}
        >
          <Download className="mr-2 w-4 h-4" />
          {isDownloading ? "Gerando PDF..." : "Baixar Holerite"}
        </Button>
      </div>
      <Footer />
    </div>
  )
}
