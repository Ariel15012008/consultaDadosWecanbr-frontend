import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "@/utils/axiosInstance";

export function ProtectedRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verificarToken = async () => {
      try {
        await api.get("/user/me"); // 🔐 Valida diretamente com backend
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/login", { replace: true }); // ❌ Token inválido, redireciona
      } finally {
        setLoading(false);
      }
    };

    verificarToken();
  }, [pathname, navigate]);

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
