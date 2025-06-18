import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { FileText } from "lucide-react";

interface Template {
  id_tipo: string;
  nome_tipo: string;
  nome_divisao: string;
}

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Painel do Trabalhador";

    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);

    const fetchTemplates = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/documents", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Erro ao buscar templates");

        const data = await res.json();
        setTemplates(data);
      } catch (error) {
        console.error("Erro ao carregar templates:", error);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />

      {!isAuthenticated && (
        <div className="p-4">
          <div className="bg-[#1e1e2f] text-white rounded-xl shadow-2xl w-full max-w-4xl p-6 mt-32 mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
                <img
                  src="Avatar de Recepição.png"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold">SEJA BEM-VINDO AO superRH</h1>
                <p className="text-sm text-gray-300">
                  O superRH será um novo meio de comunicação entre você e o RH da
                  Empresa. Através dele você poderá consultar seus recibos de
                  pagamento, resolver dúvidas e ter acesso a documentos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex flex-col gap-6 px-4 py-10 sm:px-10 max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold text-center sm:text-left text-blue-800">
          Tipos de Documentos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id_tipo}
              className="bg-white border border-blue-200 rounded-lg shadow-sm p-4 hover:shadow-lg cursor-pointer transition"
              onClick={() => navigate(`/documents/${template.id_tipo}`)}
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="text-blue-600" />
                <h3 className="font-bold">{template.nome_tipo}</h3>
              </div>
              <p className="text-sm text-gray-600">{template.nome_divisao}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
