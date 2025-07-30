import { Navigate, Outlet } from 'react-router-dom'
import Cookies from "js-cookie"

export function PublicRoute() {
  const loggedUser = Cookies.get("logged_user")

  if(loggedUser === "true") {
    // Se não houver usuário logado, permite o acesso às rotas públicas
    return <Navigate to="/" replace />
  }

  const isAuthenticated = !!loggedUser

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
