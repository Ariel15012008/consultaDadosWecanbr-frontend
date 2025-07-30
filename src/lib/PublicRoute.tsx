import { Navigate, Outlet } from 'react-router-dom'
import Cookies from "js-cookie"

export function PublicRoute() {
  const loggedUser = Cookies.get("logged_user")

  const isAuthenticated = !!loggedUser

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
