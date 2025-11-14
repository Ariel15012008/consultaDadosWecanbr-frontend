// src/lib/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import LoadingScreen from "@/components/ui/loadingScreen";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
