import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, Wallet, Clock } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header"; 
import avataRecepicao from "../../../public/Avatar de Recepição.png";

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Painel do Trabalhador";
  }, []);

  return (
    <div className="min-h-screen w-screen overflow-x-hidden relative">
      {/* Fundo gradiente fixo que cobre toda a tela */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />
      
      {/* Conteúdo principal */}
      <div className="relative z-10 flex flex-col items-center p-4 sm:p-6 min-h-screen w-full">
        <Header />
        
        {/* Card de boas-vindas com avatar responsivo */}
        <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl p-4 sm:p-6 mt-28 sm:mt-32">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-4">
            {/* Container do avatar - ajustado para mobile */}
            <div className="h-16 w-16 sm:h-24 sm:w-24 flex-shrink-0">
              <img 
                className="rounded-full w-full h-full object-cover border-2 border-white" 
                src={avataRecepicao} 
                alt="Avatar de Recepção" 
              />
            </div>
            <div className="text-center sm:text-left mt-2 sm:mt-0">
              <h1 className="text-base sm:text-lg font-bold">SEJA BEM-VINDO AO docRH</h1>
              <p className="text-xs sm:text-sm text-gray-300">
                O docRH será o novo meio de comunicação entre você e o RH da Empresa. 
                Através dele você poderá consultar seus recibos de pagamento, 
                resolver dúvidas e ter acesso a documentos.
              </p>
            </div>
          </div>
        </div>

        {/* Grid de cards de funcionalidades */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-10 w-full max-w-4xl mb-6">
          <Card
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-[5px_5px_20px_10px_#00000050] transition-all hover:translate-y-1 sm:hover:translate-x-1"
            onClick={() => navigate("/meu-salario")}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
              <LayoutDashboard size={32} className="mb-2 sm:size-10" />
              <h3 className="text-base sm:text-lg font-semibold">Meu Salário</h3>
              <p className="text-xs sm:text-sm text-gray-400 text-center mt-1">
                Holerite, contracheque ou o extrato de salários pagos.
              </p>
            </CardContent>
          </Card>

          <Card
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-[5px_5px_20px_10px_#00000050] transition-all hover:translate-y-1 sm:hover:translate-x-1"
            onClick={() => navigate("/beneficios")}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
              <Wallet size={32} className="mb-2 sm:size-10" />
              <h3 className="text-base sm:text-lg font-semibold">Benefícios</h3>
              <p className="text-xs sm:text-sm text-gray-400 text-center mt-1">
                Recibos detalhados dos seus benefícios.
              </p>
            </CardContent>
          </Card>

          <Card
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-[5px_5px_20px_10px_#00000050] transition-all hover:translate-y-1 sm:hover:translate-x-1"
            onClick={() => navigate("/espelho-ponto")}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
              <Clock size={32} className="mb-2 sm:size-10" />
              <h3 className="text-base sm:text-lg font-semibold">Espelho Ponto</h3>
              <p className="text-xs sm:text-sm text-gray-400 text-center mt-1">
                Total de horas trabalhadas por você a cada mês.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}