import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, Wallet, Clock } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Painel do Trabalhador";
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f172a] bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 items-center justify-start p-6">
      <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl p-6 mt-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 bg-[#2a2a3d] rounded-full flex items-center justify-center text-2xl font-bold">
            👩‍💼
          </div>
          <div>
            <h1 className="text-lg font-bold">SEJA BEM-VINDO AO EPAYS, FERNANDO</h1>
            <p className="text-sm text-gray-300">
              O Epays será o novo meio de comunicação entre você e o RH da Empresa. Através dele você poderá consultar seus recibos de pagamento, resolver dúvidas e ter acesso a documentos.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 w-full max-w-4xl">
        <Card
          className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-2xl transition-all"
          onClick={() => navigate("/meu-salario")}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <LayoutDashboard size={40} className="mb-2" />
            <h3 className="text-lg font-semibold">Meu Salário</h3>
            <p className="text-sm text-gray-400 text-center mt-1">
              Holerite, contracheque ou o extrato de salários pagos.
            </p>
          </CardContent>
        </Card>

        <Card
          className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-2xl transition-all"
          onClick={() => navigate("/beneficios")}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Wallet size={40} className="mb-2" />
            <h3 className="text-lg font-semibold">Benefícios</h3>
            <p className="text-sm text-gray-400 text-center mt-1">
              Recibos detalhados dos seus benefícios.
            </p>
          </CardContent>
        </Card>

        <Card
          className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-2xl transition-all"
          onClick={() => navigate("/espelho-ponto")}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Clock size={40} className="mb-2" />
            <h3 className="text-lg font-semibold">Espelho Ponto</h3>
            <p className="text-sm text-gray-400 text-center mt-1">
              Total de horas trabalhadas por você a cada mês.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
