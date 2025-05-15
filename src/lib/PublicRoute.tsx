import { Navigate, Outlet } from 'react-router-dom'

export function PublicRoute() {
  const loggedUser = localStorage.getItem('logged_user')
  const accessToken = localStorage.getItem('access_token')

  const isAuthenticated = !!loggedUser && !!accessToken

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
