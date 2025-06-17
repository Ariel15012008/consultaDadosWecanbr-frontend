import { useEffect } from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import api from "@/utils/axiosInstance"

export function ProtectedRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const loggedUser = localStorage.getItem("logged_user")
  const token = localStorage.getItem("access_token")
  const now = Date.now()
  const twoMinutes = 2 * 60 * 1000

  const isAuthenticated = !!loggedUser && !!token

  useEffect(() => {
    const verificarToken = async () => {
      if (loggedUser) {
        const loggedTime = parseInt(loggedUser)
        const timeDiff = now - loggedTime

        if (timeDiff > twoMinutes) {
          try {
            // Tenta renovar o token
            await api.post("/user/refresh")
            localStorage.setItem("logged_user", Date.now().toString())
          } catch (err) {
            // Se falhar, desloga e redireciona
            localStorage.removeItem("access_token")
            localStorage.removeItem("logged_user")
            navigate("/login", { replace: true })
            return
          }
        }

        const publicRoutes = ["/login", "/register", "/password", "/resetPassword"]
        if (publicRoutes.includes(pathname)) {
          navigate("/home", { replace: true })
        }

        if (pathname.startsWith("/resetPassword")) {
          const urlParams = new URLSearchParams(location.search)
          if (!urlParams.get("token")) {
            navigate("/password", { replace: true })
          }
        }
      }
    }

    verificarToken()
  }, [loggedUser, pathname, navigate, location.search, now])

  if (
    ["/home", "/resetPassword", "/resetPassword/*"].includes(pathname) &&
    !isAuthenticated
  ) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
