import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "@/utils/axiosInstance";
import Cookies from "js-cookie";

export function ProtectedRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarToken = async () => {
      const loggedUser = Cookies.get("logged_user");
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
            setLoading(false);
            navigate("/login", { replace: true });
            return;
          }
        } else {
          setIsAuthenticated(true);
        }

        // Validação especial para resetPassword
        if (pathname.startsWith("/resetPassword")) {
          const urlParams = new URLSearchParams(location.search);
          if (!urlParams.get("token")) {
            navigate("/password", { replace: true });
          }
        }
      } else {
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    verificarToken();
  }, [pathname, navigate, location.search]);

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
