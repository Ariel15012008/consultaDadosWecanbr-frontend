import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { BiLogOut, BiUser } from 'react-icons/bi'
import { IoPersonCircle } from 'react-icons/io5'
import { RxHamburgerMenu } from 'react-icons/rx'
import {
  HiCalendar,
  HiInformationCircle,
  HiMail,
  HiHome
} from 'react-icons/hi'

export default function Header() {
  const [user, setUser] = useState<{ nome: string; email: string } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()
  const didLogout = useRef(false)

  const silentAuth = async () => {
    try {
      let res = await fetch('http://localhost:8000/user/me', {
        credentials: 'include'
      })

      if (res.status === 401) {
        await fetch('http://localhost:8000/user/refresh', {
          method: 'POST',
          credentials: 'include'
        })

        res = await fetch('http://localhost:8000/user/me', {
          credentials: 'include'
        })
      }

      if (res.ok) {
        const data = await res.json()
        setUser({ nome: data.nome, email: data.email })
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Erro na autenticação:', error)
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  useEffect(() => {
    if (!didLogout.current) {
      silentAuth()
    }
  }, [])

  const logout = async () => {
  try {
    // Limpa localStorage ANTES de tudo
    localStorage.removeItem('access_token')
    localStorage.removeItem('logged_user')

    await fetch('http://localhost:8000/user/logout', {
      method: 'POST',
      credentials: 'include',
    })

    setIsAuthenticated(false)
    setUser(null)

    navigate('/login', { replace: true })
  } catch (error) {
    console.error('Erro no logout:', error)
  }
}


  return (
    <header className="fixed top-0 w-full bg-gradient-to-r from-blue-800 to-blue-400 text-white shadow-md z-50">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link to="/" className="flex items-center text-xl font-bold">
          <span className="bg-white text-blue-600 px-2 py-1 rounded mr-2">docRH</span>
          <div className="text-white">RH Portal</div>
        </Link>

        <nav className="hidden md:flex space-x-6">
          <Link to="/" className="flex items-center hover:text-[#31d5db] transition-colors text-cyan-50">
            <HiHome className="mr-1 " /> Início
          </Link>
          <Link to="/meu-salario" className="flex items-center hover:text-[#31d5db] transition-colors text-cyan-50">
            <HiCalendar className="mr-1" /> Salário
          </Link>
          <Link to="/beneficios" className="flex items-center hover:text-[#31d5db] transition-colors text-cyan-50">
            <HiInformationCircle className="mr-1" /> Benefícios
          </Link>
          <Link to="/contato" className="flex items-center hover:text-[#31d5db] transition-colors text-cyan-50">
            <HiMail className="mr-1" /> Contato
          </Link>
        </nav>

        <div className="hidden md:flex items-center">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center hover:bg-blue-700">
                  <IoPersonCircle className="!w-8 !h-8" />
                  <span>{user?.nome || 'Usuário'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border border-blue-100">
                <DropdownMenuItem onClick={() => navigate('/perfil')}>
                  <BiUser className="mr-2" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <BiLogOut className="mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/login')} className="bg-white text-blue-600 hover:bg-blue-50">
              Entrar
            </Button>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild className="md:hidden">
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
                    <p className="font-semibold text-white text-sm">{user?.nome}</p>
                    <p className="text-xs text-blue-200 truncate">{user?.email}</p>
                  </div>
                </div>
              )}

              <Link to="/" className="flex items-center p-2 hover:text-[#31d5db] rounded-lg text-white">
                <HiHome className="mr-2" /> Início
              </Link>
              <Link to="/meu-salario" className="flex items-center p-2 rounded-lg text-white hover:text-[#31d5db]">
                <HiCalendar className="mr-2" /> Salário
              </Link>
              <Link to="/beneficios" className="flex items-center p-2 rounded-lg text-white hover:text-[#31d5db]">
                <HiInformationCircle className="mr-2" /> Benefícios
              </Link>
              <Link to="/contato" className="flex items-center p-2 rounded-lg text-white hover:text-[#31d5db]">
                <HiMail className="mr-2" /> Contato
              </Link>

              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="w-full flex items-center p-2 text-red-300 rounded-lg"
                >
                  <BiLogOut className="mr-2" /> Sair
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
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
  )
}
