// import { Button } from "@/components/ui/button";
// import { FaWhatsapp, FaInstagram, FaFacebookF } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-blue-800 text-white py-8 px-6 sm:px-10">
      <div className="max-w-7xl mx-auto ">{/* <=== Antes tinha mais isso:
      grid grid-cols-1 sm:grid-cols-2 gap-10 só foi tirado o botão de email por enquanto */}
        {/* Branding */}
        <div className="flex flex-col justify-between items-center">
          <h2 className="text-2xl font-bold mb-3">SuperRH</h2>
          <p className="text-sm text-blue-100 leading-relaxed">
            Conectando colaboradores ao RH com tecnologia, transparência e
            agilidade.
          </p>
          {/* Social Media Icons */}
          {/* <div className="flex justify-center items-center gap-4 mt-4 ">
            <a href="#" className="hover:text-blue-300">
              <FaWhatsapp className="w-5 h-5" />
            </a>
            <a href="#" className="hover:text-blue-300">
              <FaInstagram className="w-5 h-5" />
            </a>
            <a href="#" className="hover:text-blue-300">
              <FaFacebookF className="w-5 h-5" />
            </a>
          </div>  */}
        </div>

        {/* Newsletter
        <div>
          <h3 className="text-xl font-semibold mb-3">Receba Novidades</h3>
          <p className="text-sm text-blue-100 mb-3">
            Cadastre seu email para receber atualizações do RH.
          </p>
          <div className="flex">
            <input
              type="email"
              placeholder="Seu email"
              className="px-4 py-2 text-sm text-white w-full rounded-l-md"
            />
            <Button className="bg-blue-600 hover:bg-blue-700 rounded-l-none text-sm px-4">
              Enviar
            </Button>
          </div>
        </div> */}
      </div>

      <div className="border-t border-blue-700 mt-10 pt-4 text-center">
        <p className="text-sm text-blue-200">
          © {new Date().getFullYear()} SuperRH. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
