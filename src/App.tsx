// src/App.tsx

import { Routes, Route, Navigate } from "react-router-dom"
import { UserProvider } from "@/contexts/UserContext"

import Home                from "@/pages/home/Home"
import Login               from "@/pages/login/Login"
import Cadastro            from "@/pages/register/Cadastro"
import ForgotPasswordPage  from "@/pages/password/ForgotPasswordPage"
import ResetPasswordPage   from "@/pages/resetPassword/ResetPasswordPage"
import IdTemplate          from "@/pages/documentos/[id_tipo]"
import PreviewPDF          from "@/pages/documento/preview"

import { PublicRoute }    from "./lib/PublicRoute"
import { ProtectedRoute } from "./lib/ProtectedRoute"

function App() {
  return (
    <UserProvider>
      <Routes>
        {/*  
          1) Rota pública geral: Home em "/"   
          2) Rotas de autenticação em "/login", "/register", etc.
        */}
        <Route element={<PublicRoute />}>
          <Route path="/"                element={<Home />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Cadastro />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
        </Route>

        {/*
          3) Rotas protegidas: só essas duas
          - /documentos
          - /documento/preview
        */}
        <Route element={<ProtectedRoute />}>
          <Route path="/documentos"            element={<IdTemplate />} />
          <Route path="/documento/preview"     element={<PreviewPDF />} />
        </Route>

        {/*
          4) Qualquer outra URL volta pra "/" (Home)
        */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  )
}

export default App
