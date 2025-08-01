// src/App.tsx

import { Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";

import Cadastro from "@/pages/register/Cadastro";
import Login from "@/pages/login/Login";
import Home from "@/pages/home/Home";
import IdTemplate from "@/pages/documentos/[id_tipo]";
import PreviewPDF from "@/pages/documento/preview";
import ForgotPasswordPage from "@/pages/password/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/resetPassword/ResetPasswordPage";

import { PublicRoute } from "./lib/PublicRoute";
import { ProtectedRoute } from "./lib/ProtectedRoute";

function App() {
  return (
    <UserProvider>
      <Routes>
        {/* 1) ROTAS PÚBLICAS */}
        <Route element={<PublicRoute />}>
          {/* "/" agora é sua landing page */}
          <Route path="/" element={<Home />} />

          {/* acesso ao fluxo de autenticação */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Cadastro />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* 2) ROTAS QUE EXIGEM AUTENTICAÇÃO */}
        <Route element={<ProtectedRoute />}>
          {/* só estes dois paths ficam aqui */}
          <Route path="/documentos" element={<IdTemplate />} />
          <Route path="/documento/preview" element={<PreviewPDF />} />
        </Route>

        {/* 3) QUALQUER OUTRA ROTA volta para "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  );
}

export default App;
