import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import LoadingScreen from "@/components/ui/loadingScreen";

export function PublicRoute() {
  const { isAuthenticated, isLoading, mustChangePassword, mustValidateInternalToken } =
    useUser();

  if (isLoading) return <LoadingScreen />;

  if (isAuthenticated && mustChangePassword) {
    return <Navigate to="/trocar-senha" replace />;
  }

  if (isAuthenticated && mustValidateInternalToken) {
    return <Navigate to="/token" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
