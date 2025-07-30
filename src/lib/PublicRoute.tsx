import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "@/utils/axiosInstance";

export function PublicRoute() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verificarAutenticacao = async () => {
      try {
        await api.get("/user/me"); // 🔐 Confirma se está logado
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false); // ❌ Não logado
      } finally {
        setLoading(false);
      }
    };

    verificarAutenticacao();
  }, [location.pathname]);

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
