import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { FaWhatsapp, FaInstagram, FaFacebookF } from "react-icons/fa"

export default function Footer() {
  return (
    <footer className="bg-blue-800 text-white py-8 px-6 sm:px-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {/* Branding */}
        <div>
          <h2 className="text-2xl font-bold mb-3">docRH</h2>
          <p className="text-sm text-blue-100 leading-relaxed">
            Conectando colaboradores ao RH com tecnologia, transparência e agilidade.
          </p>
          <div className="flex gap-4 mt-4">
            <a href="#" className="hover:text-blue-300">
              <FaWhatsapp className="w-5 h-5" />
            </a>
            <a href="#" className="hover:text-blue-300">
              <FaInstagram className="w-5 h-5" />
            </a>
            <a href="#" className="hover:text-blue-300">
              <FaFacebookF className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Links rápidos */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Links Rápidos</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/meu-salario" className="hover:text-blue-300">
                Meu Salário
              </Link>
            </li>
            <li>
              <Link to="/beneficios" className="hover:text-blue-300">
                Benefícios
              </Link>
            </li>
            <li>
              <Link to="/documentos" className="hover:text-blue-300">
                Documentos
              </Link>
            </li>
            <li>
              <Link to="/contato" className="hover:text-blue-300">
                Contato RH
              </Link>
            </li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Receba Novidades</h3>
          <p className="text-sm text-blue-100 mb-3">
            Cadastre seu email para receber atualizações do RH.
          </p>
          <div className="flex">
            <input
              type="email"
              placeholder="Seu email"
              className="px-4 py-2 text-sm text-gray-800 w-full rounded-l-md"
            />
            <Button className="bg-blue-600 hover:bg-blue-700 rounded-l-none text-sm px-4">
              Enviar
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-blue-700 mt-10 pt-4 text-center">
        <p className="text-sm text-blue-200">
          © {new Date().getFullYear()} docRH. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}