// src/lib/ProtectedRoute.tsx

import { Navigate, Outlet, useLocation } from "react-router-dom"
import Cookies from "js-cookie"

export function ProtectedRoute() {
  const { pathname } = useLocation()

  // Quais rotas exigem autenticação
  const needsAuth =
    pathname === "/documentos" ||
    pathname.startsWith("/documento/preview")

  // Leia o cookie correto
  const isAuthenticated = Boolean(Cookies.get("logged_user"))

  if (needsAuth && !isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
