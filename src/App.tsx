import { Routes, Route } from "react-router-dom"
import Cadastro from "@/pages/register/Cadastro"
import Login from "@/pages/login/Login"
import Home from "@/pages/home/Home"

function App() {
  return (
    <Routes>
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

export default App
