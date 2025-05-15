import { Routes, Route } from "react-router-dom"
import Cadastro from "@/pages/register/Cadastro"
import Login from "@/pages/login/Login"
import Home from "@/pages/home/Home"
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
      </Route>
    </Routes>
  )
}
export default App