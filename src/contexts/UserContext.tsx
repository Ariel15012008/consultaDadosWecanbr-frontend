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

  // 🔧 ALTERAÇÃO: helpers para manter o "marcador" do refresh
  const touchLoggedUserCookie = () => {
    Cookies.set("logged_user", Date.now().toString());
  };
  const ensureLoggedUserCookie = () => {
    if (!Cookies.get("logged_user")) touchLoggedUserCookie();
  };

  const silentAuth = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/user/me");
      if (res.status === 200) {
        setUser(res.data as User);
        setIsAuthenticated(true);

        // 🔧 ALTERAÇÃO: garante existência do marcador de sessão
        ensureLoggedUserCookie();
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
      // Observação: se os cookies HttpOnly forem usados no backend,
      // remover via js-cookie não afeta o cookie HttpOnly (ok).
      Cookies.remove("access_token");
      Cookies.remove("logged_user");

      await api.post("/user/logout");

      setIsAuthenticated(false);
      setUser(null);
      didLogout.current = true;

      // 🔧 ALTERAÇÃO: navegação única e centralizada no contexto
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  useEffect(() => {
    if (!didLogout.current) {
      silentAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const timestamp = Cookies.get("logged_user");
      if (!timestamp) return;

      const loggedTime = parseInt(timestamp, 10);
      if (!Number.isFinite(loggedTime)) return;

      // quando passar de 30 dias, tenta refresh
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
