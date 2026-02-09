import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import LoadingScreen from "@/components/ui/loadingScreen";

export function InternalTokenRoute() {
  const {
    isAuthenticated,
    isLoading,
    mustChangePassword,
    mustValidateInternalToken,
    user,
    internalTokenBlockedInSession,
  } = useUser();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (mustChangePassword) {
    return <Navigate to="/trocar-senha" replace />;
  }

  if (user?.interno !== true) {
    return <Navigate to="/" replace />;
  }

  if (internalTokenBlockedInSession) {
    return <Navigate to="/" replace />;
  }

  if (!mustValidateInternalToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
