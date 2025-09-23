// src/components/header.tsx
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BiLogOut } from "react-icons/bi";
import { IoPersonCircle } from "react-icons/io5";
import { RxHamburgerMenu } from "react-icons/rx";
import { HiMail, HiHome } from "react-icons/hi";
import { useUser } from "@/contexts/UserContext";

export default function Header() {
  const { user, isAuthenticated, isLoading, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
  };

  // EVITA piscar: enquanto carrega sessão, não exibe "Entrar"
  if (isLoading) {
    return (
      <header className="fixed top-0 w-full bg-gradient-to-r from-blue-800 to-blue-400 text-white shadow-md z-50">
        <div className="container mx-auto flex items-center justify-between pt-4 pb-4 pl-1">
          <span className="bg-white ml-4 text-blue-600 px-2 py-1 rounded">
            SuperRH
          </span>
          <div className="flex items-center gap-4 mr-4">
            <span className="h-8 w-24 rounded animate-pulse bg-white/30" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 w-full bg-gradient-to-r from-blue-800 to-blue-400 text-white shadow-md z-50">
      <div className="container mx-auto flex items-center justify-between pt-4 pb-4 pl-1">
        <Link
          to="/"
          className="flex items-center text-xl font-bold whitespace-nowrap gap-2 cursor-default"
        >
          <span className="bg-white ml-4 text-blue-600 px-2 py-1 rounded">
            SuperRH
          </span>
        </Link>

        <nav className="hidden md:flex space-x-4 pl-10">
          <Link
            to="/"
            className="flex items-center hover:text-[#31d5db] transition-colors text-cyan-50 ml-10"
          >
            <HiHome className="mr-1" /> Início
          </Link>
        </nav>

        <div className="hidden md:flex items-center">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="hover:cursor-pointer ">
                <Button
                  variant="ghost"
                  className="flex items-center bg-transparent hover:bg-blue-700 mr-8"
                >
                  <IoPersonCircle className="!w-8 !h-8" />
                  <span>{user?.nome || "Usuário"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border border-blue-100 hover:cursor-pointer ">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 hover:cursor-pointer hover:bg-gray-200"
                >
                  <BiLogOut className="mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => navigate("/login")}
              className="bg-white text-blue-600 hover:bg-blue-50 mr-4"
            >
              Entrar
            </Button>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild className="md:hidden mr-2">
            <Button variant="ghost" size="icon">
              <RxHamburgerMenu className="!h-6 !w-6 text-white" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-blue-800 text-white">
            <SheetHeader>
              <SheetTitle className="text-left text-white">Menu</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {isAuthenticated && (
                <div className="flex flex-col items-center text-center p-4 bg-blue-700 rounded-lg space-y-1">
                  <IoPersonCircle className="text-4xl mb-1" />
                  <div className="max-w-full break-words">
                    <p className="font-semibold text-white text-sm">
                      {user?.nome}
                    </p>
                    <p className="text-xs text-blue-200 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              )}
              <Link
                to="/"
                className="flex items-center p-2 hover:text-[#31d5db] rounded-lg text-white"
              >
                <HiHome className="mr-2" /> Início
              </Link>
              <Link
                to="/contato"
                className="flex items-center p-2 rounded-lg text-white hover:text-[#31d5db]"
              >
                <HiMail className="mr-2" /> Contato
              </Link>

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center p-2 text-red-300 rounded-lg"
                >
                  <BiLogOut className="mr-2" /> Sair
                </button>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="w-full flex items-center justify-center p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  Entrar
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
