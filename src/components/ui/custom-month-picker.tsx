"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronDown } from "lucide-react"

interface CustomMonthPickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function CustomMonthPicker({
  value,
  onChange,
  placeholder = "Selecionar mês/ano",
}: CustomMonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(value ? value.split("-")[0] : "")
  const [selectedMonth, setSelectedMonth] = useState(value ? value.split("-")[1] : "")

  // Gerar anos (últimos 10 anos + próximos 2 anos)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i)

  const months = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ]

  const handleApply = () => {
    if (selectedYear && selectedMonth) {
      onChange(`${selectedYear}-${selectedMonth}`)
      setOpen(false)
    }
  }

  const handleClear = () => {
    setSelectedYear("")
    setSelectedMonth("")
    onChange("")
    setOpen(false)
  }

  const getDisplayValue = () => {
    if (!value) return placeholder
    const [year, month] = value.split("-")
    const monthName = months.find((m) => m.value === month)?.label
    return `${monthName} ${year}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-[#2c2c40] text-white border-gray-600 hover:bg-[#3c3c50] hover:text-white justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="truncate">{getDisplayValue()}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-[#2c2c40] border-gray-600"
        align="center"
        sideOffset={5}
      >
        <div className="space-y-4">
          <div className="text-sm font-medium text-white text-center">Selecionar Período</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-gray-300">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-[#1e1e2f] border-gray-600 text-white">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="bg-[#2c2c40] border-gray-600">
                  {years.map((year) => (
                    <SelectItem
                      key={year}
                      value={year.toString()}
                      className="text-white hover:bg-[#3c3c50] focus:bg-[#3c3c50]"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-300">Mês</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="bg-[#1e1e2f] border-gray-600 text-white">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="bg-[#2c2c40] border-gray-600">
                  {months.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value}
                      className="text-white hover:bg-[#3c3c50] focus:bg-[#3c3c50]"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleApply}
              disabled={!selectedYear || !selectedMonth}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              Aplicar
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              className="flex-1 bg-transparent border-gray-600 text-white hover:bg-[#3c3c50]"
            >
              Limpar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
