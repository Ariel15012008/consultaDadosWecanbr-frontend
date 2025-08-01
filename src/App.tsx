// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { UserProvider } from "@/contexts/UserContext"

import Cadastro            from "@/pages/register/Cadastro"
import Login               from "@/pages/login/Login"
import Home                from "@/pages/home/Home"
import IdTemplate          from "@/pages/documentos/[id_tipo]"
import PreviewPDF          from "@/pages/documento/preview"
import ForgotPasswordPage  from "@/pages/password/ForgotPasswordPage"
import ResetPasswordPage   from "@/pages/resetPassword/ResetPasswordPage"

import { PublicRoute }     from "./lib/PublicRoute"
import { ProtectedRoute }  from "./lib/ProtectedRoute"

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>

          {/* 1) LANDING PAGE / PÚBLICA */}
          <Route path="/" element={<Home />} />

          {/* 2) AUTENTICAÇÃO */}
          <Route element={<PublicRoute />}>
            <Route path="login"           element={<Login />} />
            <Route path="register"        element={<Cadastro />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password"  element={<ResetPasswordPage />} />
          </Route>

          {/* 3) ROTAS PROTEGIDAS */}
          <Route element={<ProtectedRoute />}>
            <Route path="documentos"               element={<IdTemplate />} />
            <Route path="documento/preview/:id"    element={<PreviewPDF />} />
          </Route>

          {/* 4) QUALQUER OUTRA URL vai para “/” */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App
