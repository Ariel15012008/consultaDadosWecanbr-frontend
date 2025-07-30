import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import api from "@/utils/axiosInstance";

export function PublicRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const loggedUser = Cookies.get("logged_user");
  const now = Date.now();
  const twoMinutes = 2 * 60 * 1000;

  const isAuthenticated = !!loggedUser;

  useEffect(() => {
    const verificarToken = async () => {
      if (loggedUser) {
        const loggedTime = parseInt(loggedUser);
        const timeDiff = now - loggedTime;

        if (timeDiff > twoMinutes) {
          try {
            await api.post("/user/refresh");
            localStorage.setItem("logged_user", Date.now().toString());
          } catch (err) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("logged_user");
            return; // Permite continuar na rota pública como anônimo
          }
        }

        // Já autenticado? então redireciona para home.
        navigate("/", { replace: true });
      }
    };

    verificarToken();
  }, [loggedUser, pathname, navigate, now]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
