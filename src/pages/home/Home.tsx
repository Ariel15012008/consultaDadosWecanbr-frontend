import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard,
  Wallet,
  Clock,
  Users,
  Building,
  UserCheck,
  ScrollText,
  FileText,
  FileSignature,
  Star,
  FileBarChart2,
  Spline,
} from "lucide-react";
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
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-green-300 z-0" />
      <Header />
      <div className="relative z-10 flex flex-col items-center min-h-screen w-full pr-5 pl-5 ">
        <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl p-6 mt-32">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
              <img
                src={avataRecepicao}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold">SEJA BEM-VINDO AO docRH</h1>
              <p className="text-sm text-gray-300">
                O docRH será o novo meio de comunicação entre você e o RH da
                Empresa. Através dele você poderá consultar seus recibos de
                pagamento, resolver dúvidas e ter acesso a documentos.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10 w-full max-w-6xl mb-6">
          {/* Primeiros cards existentes */}
          <Card
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
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
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
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
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
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

          {/* Novos cards baseados na imagem */}
          <Card
            onClick={() => navigate("/trabalhadores")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Users size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Trabalhadores</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/empresas")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Building size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Empresas</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/gestores")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <UserCheck size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Gestores</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/pontofopag")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Clock size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Pontofopag</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/recibos")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <ScrollText size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Recibos</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/documentos")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileText size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Documentos</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/termos")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileSignature size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Termos e Contratos</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/meu-modelo")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileText size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Meu Modelo</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/organograma")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Spline size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Organograma</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/relatorios")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileBarChart2 size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Relatórios</h3>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/avaliar")}
            className="bg-[#1e1e2f] text-white cursor-pointer hover:shadow-xl transition-all hover:translate-x-1"
          >
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Star size={40} className="mb-2" />
              <h3 className="text-lg font-semibold">Avaliar</h3>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
