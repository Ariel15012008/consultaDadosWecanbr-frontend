import { Navigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import LoadingScreen from "@/components/ui/loadingScreen";
import Home from "@/pages/home/Home";

export default function HomeGate() {
  const {
    isLoading,
    isAuthenticated,
    mustChangePassword,
    mustValidateInternalToken,
    internalTokenPromptedInSession,
  } = useUser();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) return <Home />;

  if (mustChangePassword) {
    return <Navigate to="/trocar-senha" replace />;
  }

  // ✅ Só redireciona para /token se ainda não "promptou" nesta sessão
  if (mustValidateInternalToken && !internalTokenPromptedInSession) {
    return <Navigate to="/token" replace />;
  }

  return <Home />;
}
