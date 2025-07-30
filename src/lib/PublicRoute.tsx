import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import api from "@/utils/axiosInstance";

export function PublicRoute() {
  const location = useLocation();
  const pathname = location.pathname;

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verificarToken = async () => {
      const loggedUser = Cookies.get("logged_user");
      const now = Date.now();
      const twoMinutes = 2 * 60 * 1000;

      if (loggedUser) {
        const loggedTime = parseInt(loggedUser);
        const diff = now - loggedTime;

        if (diff > twoMinutes) {
          try {
            await api.post("/user/refresh");
            localStorage.setItem("logged_user", Date.now().toString());
            setIsAuthenticated(true);
          } catch (err) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("logged_user");
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    verificarToken();
  }, [pathname]);

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
