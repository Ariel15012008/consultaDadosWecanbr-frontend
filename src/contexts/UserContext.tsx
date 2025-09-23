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
  const userRef = useRef<User | null>(null); // evita setState desnecessário
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const didLogout = useRef(false);

  // Controle de revalidação em foco
  const inflightRef = useRef<Promise<void> | null>(null);
  const lastSyncRef = useRef<number>(0);
  const MIN_FOCUS_REVALIDATION_MS = 60_000; // 60s

  // 30 dias em ms
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  // "marcador" de sessão local (não-Httponly) para heurísticas de renovação
  const touchLoggedUserCookie = () => {
    Cookies.set("logged_user", Date.now().toString());
  };

  const assignUserIfChanged = (u: User | null) => {
    const prev = userRef.current;
    const changed =
      JSON.stringify(prev ?? null) !== JSON.stringify(u ?? null);

    if (changed) {
      userRef.current = u;
      setUser(u);
    }
  };

  // fetch /user/me com opção de background (não alterar isLoading)
  const fetchMe = async (opts?: { background?: boolean }) => {
    const background = !!opts?.background;

    if (!background) setIsLoading(true);
    try {
      const res = await api.get("/user/me");
      if (res.status === 200) {
        const data = res.data as User;
        assignUserIfChanged(data);
        setIsAuthenticated(true);
        touchLoggedUserCookie();
      } else {
        assignUserIfChanged(null);
        setIsAuthenticated(false);
      }
    } catch {
      assignUserIfChanged(null);
      setIsAuthenticated(false);
    } finally {
      if (!background) setIsLoading(false);
      lastSyncRef.current = Date.now();
      inflightRef.current = null;
    }
  };

  const refreshUser = async () => {
    await fetchMe({ background: false });
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
      assignUserIfChanged(null);
      didLogout.current = true;
      // sinaliza outras abas
      try {
        localStorage.setItem("auth:changed", String(Date.now()));
      } catch {}
      navigate("/", { replace: true });
    }
  };

  // boot inicial (com loading visível)
  useEffect(() => {
    if (!didLogout.current) {
      fetchMe({ background: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // revalidar ao ganhar foco / voltar visível — em BACKGROUND + THROTTLE
  useEffect(() => {
    const tryBackgroundSync = () => {
      const now = Date.now();
      const elapsed = now - lastSyncRef.current;

      // respeita throttle e deduplica chamadas
      if (elapsed < MIN_FOCUS_REVALIDATION_MS) return;
      if (inflightRef.current) return;

      inflightRef.current = fetchMe({ background: true });
    };

    const onFocus = () => tryBackgroundSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") tryBackgroundSync();
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
      if (e.key === "auth:changed") {
        // sincroniza em background para não “piscar”
        if (!inflightRef.current) {
          inflightRef.current = fetchMe({ background: true });
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // renovação por heurística de "inatividade" longa (30 dias)
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
    isLoading,   // agora só verdadeiro no boot inicial
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
