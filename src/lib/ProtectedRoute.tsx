import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'

export function ProtectedRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const loggedUser = localStorage.getItem('logged_user')
  const token = localStorage.getItem('access_token')
  const now = Date.now()
  const twoMinutes = 2 * 60 * 1000

  // Verifica se está logado
  const isAuthenticated = !!loggedUser && !!token

  useEffect(() => {
    if (loggedUser) {
      const loggedTime = parseInt(loggedUser)
      const timeDiff = now - loggedTime

      // ✅ Token expirado: redireciona para /auth/refresh-token
      if (timeDiff > twoMinutes) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('logged_user')

        navigate(`/auth/refresh-token?next=${pathname}`, { replace: true })
      }

      // ✅ Se tentar acessar rotas públicas estando logado, redireciona para /home
      const publicRoutes = ['/login', '/register', '/password', '/resetPassword']
      if (publicRoutes.includes(pathname)) {
        navigate('/home', { replace: true })
      }

      // ✅ resetPassword precisa ter token
      if (pathname.startsWith('/resetPassword')) {
        const urlParams = new URLSearchParams(location.search)
        if (!urlParams.get('token')) {
          navigate('/password', { replace: true })
        }
      }
    }
  }, [loggedUser, pathname, navigate, location.search, now])

  if (
    ['/home', '/resetPassword', '/resetPassword/*'].includes(pathname) &&
    !isAuthenticated
  ) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
