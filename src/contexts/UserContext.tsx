// src/contexts/UserContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import api from "@/utils/axiosInstance";

// ================================================
// Tipos para suportar 'dados[]' do /user/me
// ================================================
interface EmpresaMatricula {
  id: string;        // cliente
  nome: string;      // nome da empresa
  matricula: string; // matrícula do usuário nesta empresa
}

interface User {
  nome: string;
  email: string;
  matricula?: string;
  gestor: boolean;
  cpf: string;
  cliente?: string;
  centro_de_custo?: string;
  dados?: EmpresaMatricula[];
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

  // 30 dias em ms
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  // "marcador" de sessão local (não-Httponly) para heurísticas de renovação
  const touchLoggedUserCookie = () => {
    Cookies.set("logged_user", Date.now().toString());
  };

  const silentAuth = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/user/me");
      if (res.status === 200) {
        setUser(res.data as User);
        setIsAuthenticated(true);
        // atualiza sempre que validar com sucesso
        touchLoggedUserCookie();
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
  };

  const refreshUser = async () => {
    await silentAuth();
  };

  const logout = async () => {
    try {
      // remover cookies não HttpOnly (apenas marcadores locais)
      Cookies.remove("access_token");
      Cookies.remove("logged_user");

      await api.post("/user/logout");
    } catch {
      // ignora erro no logout do servidor
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      didLogout.current = true;
      // sinaliza outras abas
      try {
        localStorage.setItem("auth:changed", String(Date.now()));
      } catch {}
      navigate("/", { replace: true });
    }
  };

  // boot inicial
  useEffect(() => {
    if (!didLogout.current) {
      silentAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // revalidar ao ganhar foco / voltar visível
  useEffect(() => {
    const onFocus = () => silentAuth();
    const onVisible = () => {
      if (document.visibilityState === "visible") silentAuth();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // escutar mudanças de auth em outras abas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth:changed") silentAuth();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // renovação por heurística de "inatividade" longa
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const timestamp = Cookies.get("logged_user");
      if (!timestamp) return;

      const loggedTime = parseInt(timestamp, 10);
      if (!Number.isFinite(loggedTime)) return;

      if (Date.now() - loggedTime > thirtyDays) {
        try {
          await api.post("/user/refresh");
          touchLoggedUserCookie();
        } catch {
          await logout();
        }
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: UserContextType = {
    user,
    isAuthenticated,
    isLoading,
    logout,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
