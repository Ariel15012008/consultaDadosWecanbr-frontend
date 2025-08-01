// src/components/ProtectedRoute.tsx

import { useEffect } from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import api from "@/utils/axiosInstance"
import Cookies from "js-cookie"

export function ProtectedRoute() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()

  const loggedUser = Cookies.get("logged_user")
  const now         = Date.now()
  const twoMinutes  = 2 * 60 * 1000
  const isAuthenticated = !!loggedUser

  // 1) refresh de token e bloqueio de rotas públicas
  useEffect(() => {
    const verificarToken = async () => {
      if (loggedUser) {
        const loggedTime = parseInt(loggedUser)
        if (now - loggedTime > twoMinutes) {
          try {
            await api.post("/user/refresh")
            Cookies.set("logged_user", Date.now().toString())
          } catch {
            Cookies.remove("access_token")
            Cookies.remove("logged_user")
            navigate("/login", { replace: true })
            return
          }
        }

        const publicRoutes = ["/login","/register","/password","/resetPassword"]
        if (publicRoutes.includes(pathname)) {
          navigate("/", { replace: true })
        }

        if (pathname.startsWith("/resetPassword")) {
          const token = new URLSearchParams(search).get("token")
          if (!token) navigate("/password", { replace: true })
        }
      }
    }

    verificarToken()
  }, [loggedUser, pathname, navigate, search, now])

  // 2) determina se a rota atual é protegida
  const protectedExact   = ["/documentos"]
  const protectedPrefix  = ["/documento/preview"]
  const needsAuth = 
    protectedExact.includes(pathname) ||
    protectedPrefix.some(p => pathname.startsWith(p))

  // 3) se precisar de auth e não tiver, manda pro login
  if (!isAuthenticated && needsAuth) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
