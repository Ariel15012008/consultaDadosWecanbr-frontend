import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";

import Login from "@/pages/login/Login";
import Cadastro from "@/pages/register/Cadastro";
import ForgotPasswordPage from "@/pages/password/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/resetPassword/ResetPasswordPage";
import TokenPage from "@/pages/token/page";
import IdTemplate from "@/pages/documentos/[id_tipo]";
import PreviewPDF from "@/pages/documento/preview";
import Chat from "@/pages/chat/Chat";

import ForceChangePasswordPage from "@/pages/password/ForgotPasswordPage";
import HomeGate from "@/pages/home/HomeGate";

import { PublicRoute } from "./lib/PublicRoute";
import { ProtectedRoute } from "./lib/ProtectedRoute";
import { ForcePasswordRoute } from "./lib/ForcePasswordRoute";
import { InternalTokenRoute } from "./lib/InternalTokenRoute";

import OdooLivechatLoader from "@/components/OdooLivechatLoader";
import { useUser } from "@/contexts/UserContext";

function AppInner() {
  const { pathname } = useLocation();
  const { user, isLoading, isAuthenticated } = useUser();

  const shouldShowLivechat =
    pathname === "/" ||
    pathname.startsWith("/documentos") ||
    pathname === "/documento/preview";

  const shouldEnableLivechat =
    shouldShowLivechat && !isLoading && isAuthenticated && !(user?.rh === true);

  const livechatIdentityKey = (user?.cpf ?? user?.email ?? "").trim();

  return (
    <>
      <OdooLivechatLoader
        key={livechatIdentityKey || "anon"}
        enabled={shouldEnableLivechat}
        bottomOffset={50}
        rightOffset={24}
        debug={true}
        identityKey={livechatIdentityKey}
      />

      <Routes>
        <Route path="/" element={<HomeGate />} />

        {/* Rotas públicas */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Cadastro />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Troca de senha obrigatória */}
        <Route element={<ForcePasswordRoute />}>
          <Route path="/trocar-senha" element={<ForceChangePasswordPage />} />
        </Route>

        {/* Token interno (após troca de senha) */}
        <Route element={<InternalTokenRoute />}>
          <Route path="/token" element={<TokenPage />} />
        </Route>

        {/* Rotas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/documentos" element={<IdTemplate />} />
          <Route path="/documento/preview" element={<PreviewPDF />} />
          <Route path="/chat" element={<Chat />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <UserProvider>
      <AppInner />
    </UserProvider>
  );
}

export default App;
