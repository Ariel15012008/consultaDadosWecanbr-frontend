// src/components/ProtectedRoute.tsx

import { useEffect } from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import api from "@/utils/axiosInstance"
import Cookies from "js-cookie"

export function ProtectedRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname, search } = location

  const loggedUser = Cookies.get("logged_user")
  const now = Date.now()
  const twoMinutes = 2 * 60 * 1000
  const isAuthenticated = !!loggedUser  // true se existir o cookie

  // 1) refresh de token e redirecionamentos de rotas públicas
  useEffect(() => {
    const verificarToken = async () => {
      if (loggedUser) {
        const loggedTime = parseInt(loggedUser)
        const timeDiff   = now - loggedTime

        // —————— Renova token a cada 2 minutos ——————
        if (timeDiff > twoMinutes) {
          try {
            await api.post("/user/refresh")
            Cookies.set("logged_user", Date.now().toString())  // atualiza timestamp
          } catch {
            // falha no refresh → desloga
            Cookies.remove("access_token")
            Cookies.remove("logged_user")
            navigate("/login", { replace: true })
            return
          }
        }

        // —– Se usuário autenticado tentar acessar rota de login/senha, manda pra home —–
        const publicRoutes = ["/login", "/register", "/password", "/resetPassword"]
        if (publicRoutes.includes(pathname)) {
          navigate("/", { replace: true })
        }

        // —– Validação extra em /resetPassword: exige token na query —–
        if (pathname.startsWith("/resetPassword")) {
          const token = new URLSearchParams(search).get("token")
          if (!token) {
            navigate("/password", { replace: true })
          }
        }
      }
    }

    verificarToken()
  }, [loggedUser, pathname, navigate, search, now])

  // 2) validação de rotas PROTEGIDAS
  // ————————————————
  // Só estas duas URIs exigem autenticação:
  const protectedExact = [
    "/documentos",               // rota exata
  ]
  const protectedPrefixes = [
    "/documento/preview"         // qualquer URL que inicie com este prefixo
  ]

  const needsAuth =
    protectedExact.includes(pathname) ||
    protectedPrefixes.some(pref => pathname.startsWith(pref))

  // Se não está autenticado e precisa de auth, redireciona
  if (!isAuthenticated && needsAuth) {
    return <Navigate to="/" replace />
  }

  // 3) tudo certo → renderiza a rota filha
  return <Outlet />
}
