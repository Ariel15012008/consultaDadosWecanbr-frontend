import { useEffect } from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import api from "@/utils/axiosInstance"
import Cookies from "js-cookie"

export function ProtectedRoute() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const loggedUser      = Cookies.get("logged_user")
  const now             = Date.now()
  const twoMinutes      = 2 * 60 * 1000
  const isAuthenticated = !!loggedUser

  // 1) Se existir cookie, tenta refresh automático a cada 2 minutos
  useEffect(() => {
    if (!loggedUser) return

    const verificarToken = async () => {
      const loggedTime = parseInt(loggedUser, 10)
      const elapsed    = now - loggedTime

      if (elapsed > twoMinutes) {
        try {
          await api.post("/user/refresh")
          Cookies.set("logged_user", Date.now().toString())
        } catch {
          // refresh falhou → limpa e manda para /login
          Cookies.remove("access_token")
          Cookies.remove("logged_user")
          navigate("/login", { replace: true })
          return
        }
      }
    }

    verificarToken()
  }, [loggedUser, navigate, now])

  // 2) Defina aqui apenas as rotas protegidas
  const protectedExact   = ["/documentos"]
  const protectedPrefix  = ["/documento/preview"]
  const needsAuth =
    protectedExact.includes(pathname) ||
    protectedPrefix.some(pref => pathname.startsWith(pref))

  // 3) Se for rota protegida e não estiver logado, manda pra /login
  if (needsAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 4) Caso contrário, renderiza a rota filha normalmente
  return <Outlet />
}
