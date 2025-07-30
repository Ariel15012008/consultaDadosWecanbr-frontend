import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "@/utils/axiosInstance";

export function PublicRoute() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verificarAutenticacao = async () => {
      try {
        await api.get("/user/me"); // 🔐 Confirma se está logado
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false); // ❌ Não logado
      }
    };

    verificarAutenticacao();
  }, [location.pathname]);


  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
