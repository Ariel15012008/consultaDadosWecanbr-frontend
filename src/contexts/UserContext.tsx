// src/contexts/UserContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  useCallback,
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
  const silentAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/user/me");
      if (res.status === 200) {
        setUser(res.data);
        setIsAuthenticated(true);
        Cookies.set("logged_user", Date.now().toString());
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout limpa cookies e redireciona
  const logout = useCallback(async () => {
    try {
      Cookies.remove("access_token");
      Cookies.remove("logged_user");
      await api.post("/user/logout");
      setIsAuthenticated(false);
      setUser(null);
      didLogout.current = true;
      window.history.replaceState(null, "", "/");
      navigate("/", { replace: true });
    } catch {
      // ignore
    }
  }, [navigate]);

  // Função para forçar refresh de usuário
  const refreshUser = useCallback(async () => {
    await silentAuth();
  }, [silentAuth]);

  // Autentica ao montar, se ainda não deslogado
  useEffect(() => {
    if (!didLogout.current) {
      silentAuth();
    }
  }, [silentAuth]);

  // Polling heartbeat: verifica servidor a cada 30s e faz logout se cair
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await api.get("/user/me"); // ping
      } catch {
        await logout();
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [logout]);

  // Efeito de expiração de token (30 dias)
  useEffect(() => {
    const interval = setInterval(async () => {
      const timestamp = Cookies.get("logged_user");
      if (!timestamp) return;
      const loggedTime = parseInt(timestamp, 10);
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
  }, [logout]);

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
