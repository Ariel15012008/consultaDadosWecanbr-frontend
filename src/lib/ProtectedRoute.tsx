import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "@/utils/axiosInstance";
import Cookies from "js-cookie";

export function ProtectedRoute() {
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarToken = async () => {
      const waitForCookie = () =>
        new Promise<string | undefined>((resolve) => {
          const interval = setInterval(() => {
            const value = Cookies.get("logged_user");
            if (value) {
              clearInterval(interval);
              resolve(value);
            }
          }, 50);
          setTimeout(() => {
            clearInterval(interval);
            resolve(undefined);
          }, 2000); // espera no máximo 2 segundos
        });

      const loggedUser = await waitForCookie();
      const now = Date.now();
      const twoMinutes = 2 * 60 * 1000;

      if (loggedUser) {
        const loggedTime = parseInt(loggedUser);
        const timeDiff = now - loggedTime;

        if (timeDiff > twoMinutes) {
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
  }, [location.pathname]);

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
