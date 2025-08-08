// src/contexts/UserContext.tsx

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import api from "@/utils/axiosInstance";

interface User {
  nome: string;
  email: string;
  matricula: string;
  gestor: boolean;
  cpf: string;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const didLogout = useRef(false);

  // Intervalo de expiração (30 dias)
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  // Autenticação silenciosa (usado em mount e refresh)
  const silentAuth = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/user/me");
      if (res.status === 200) {
        setUser(res.data);
        setIsAuthenticated(true);
        // Atualiza timestamp de autenticação
        Cookies.set("logged_user", Date.now().toString());
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Erro na autenticação:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para forçar refresh de usuário
  const refreshUser = async () => {
    await silentAuth();
  };

  // Logout limpa cookies e redireciona para landing
  const logout = async () => {
    try {
      Cookies.remove("access_token");
      Cookies.remove("logged_user");
      await api.post("/user/logout");
      setIsAuthenticated(false);
      setUser(null);
      didLogout.current = true;
      window.history.replaceState(null, "", "/");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  // Autentica ao montar, se ainda não deslogado
  useEffect(() => {
    if (!didLogout.current) {
      silentAuth();
    }
  }, []);

  // Efeito de verificação de expiração e refresh automático
  useEffect(() => {
    const interval = setInterval(async () => {
      const timestamp = Cookies.get("logged_user");
      if (!timestamp) return;
      const loggedTime = parseInt(timestamp, 10);
      // Usa 30 dias em milissegundos para expirar
      if (Date.now() - loggedTime > thirtyDays) {
        try {
          await api.post("/user/refresh");
          Cookies.set("logged_user", Date.now().toString());
        } catch {
          await logout();
        }
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const value: UserContextType = {
    user,
    isAuthenticated,
    isLoading,
    logout,
    refreshUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
