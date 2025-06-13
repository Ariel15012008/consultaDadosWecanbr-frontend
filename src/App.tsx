import { Routes, Route } from "react-router-dom"
import Cadastro from "@/pages/register/Cadastro"
import Login from "@/pages/login/Login"
import Home from "@/pages/home/Home"
import IdTemplate from "@/pages/documentos/[id_tipo]"
import PreviewPDF from "@/pages/documento/preview"
import { ProtectedRoute } from './lib/ProtectedRoute'
import { PublicRoute } from './lib/PublicRoute'


function App() {
  return (
    <Routes>
      {/* ROTA PÚBLICA com verificação */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Cadastro />} />
      </Route>

      {/* ROTA PROTEGIDA */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/documentos/:id_template" element={<IdTemplate />} />
        <Route path="/documento/preview" element={<PreviewPDF />} />
      </Route>
    </Routes>
  )
}
export default App