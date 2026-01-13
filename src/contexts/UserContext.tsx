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
import type { AxiosError } from "axios";

interface EmpresaMatricula {
  id: string;
  nome: string;
  matricula: string;
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
  rh?: boolean;

  // NOVO: vem do /me
  senha_trocada?: boolean;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // NOVO: gate de troca obrigatória
  mustChangePassword: boolean;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // NOVO: senha atual capturada no login (somente memória)
  setLoginPassword: (senhaAtual: string) => void;
  getLoginPassword: () => string | null;
  clearLoginPassword: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

const REVALIDATE_ON_FOCUS =
  (import.meta.env.VITE_AUTH_REVALIDATE_ON_FOCUS ?? "true") === "true";
const MIN_FOCUS_REVALIDATION_MS = Number(
  import.meta.env.VITE_AUTH_FOCUS_THROTTLE_MS ?? 300_000
);

const ENABLE_BACKGROUND_REFRESH =
  (import.meta.env.VITE_AUTH_BACKGROUND_REFRESH ?? "true") === "true";
const BACKGROUND_REFRESH_MS = Number(
  import.meta.env.VITE_AUTH_BACKGROUND_REFRESH_MS ?? 10 * 60 * 1000
);

export function UserProvider({ children }: UserProviderProps) {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAuthRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const didLogout = useRef(false);

  const inflightRef = useRef<Promise<void> | null>(null);
  const lastSyncRef = useRef<number>(0);

  // NOVO: senha atual capturada no login (somente em memória)
  const loginPasswordRef = useRef<string | null>(null);

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const stable = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(stable);
    if (obj && typeof obj === "object") {
      const sorted: Record<string, any> = {};
      Object.keys(obj)
        .sort()
        .forEach((k) => (sorted[k] = stable(obj[k])));
      return sorted;
    }
    return obj;
  };

  const eqUser = (a: User | null, b: User | null) =>
    JSON.stringify(stable(a)) === JSON.stringify(stable(b));

  const assignUserIfChanged = (u: User | null) => {
    const prev = userRef.current;
    if (!eqUser(prev, u)) {
      userRef.current = u;
      setUser(u);
    }
  };

  const setIsAuthenticatedSafe = (next: boolean) => {
    if (isAuthRef.current !== next) {
      isAuthRef.current = next;
      setIsAuthenticated(next);
    }
  };

  const isAuthErrorStatus = (status?: number) => status === 401 || status === 403;

  const fetchMe = async (opts?: { background?: boolean }) => {
    const background = !!opts?.background;

    if (!background) setIsLoading(true);

    try {
      const res = await api.get("/user/me");

      const firstEmpresaId = (res.data?.dados?.[0]?.id ?? null) as number | null;
      const is_sapore = firstEmpresaId === 5849;

      Cookies.set("is_sapore", is_sapore ? "true" : "false", {
        sameSite: "lax",
      });

      if (res.status === 200) {
        const data = res.data as User;
        assignUserIfChanged(data);
        setIsAuthenticatedSafe(true);
      } else {
        assignUserIfChanged(null);
        setIsAuthenticatedSafe(false);
      }
    } catch (err) {
      const ax = err as AxiosError;
      const status = ax.response?.status;

      if (isAuthErrorStatus(status)) {
        assignUserIfChanged(null);
        setIsAuthenticatedSafe(false);
        loginPasswordRef.current = null; // NOVO: limpa senha em caso de queda de auth
      } else {
        // erro transitório: não derruba sessão
      }
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
      Cookies.remove("access_token");
      Cookies.remove("logged_user");
      await api.post("/user/logout");
    } catch {
    } finally {
      setIsAuthenticatedSafe(false);
      assignUserIfChanged(null);
      didLogout.current = true;
      loginPasswordRef.current = null; // NOVO

      try {
        localStorage.setItem("auth:changed", String(Date.now()));
      } catch {}

      try {
        localStorage.removeItem("zion.livechat.identity");
      } catch {}

      try {
        await (window as any).resetOdooLivechatSession?.();
      } catch {}

      navigate("/", { replace: true });
      window.location.reload();
    }
  };

  useEffect(() => {
    if (!didLogout.current) {
      fetchMe({ background: false });
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!REVALIDATE_ON_FOCUS) return;

    const tryBackgroundSync = () => {
      const now = Date.now();
      const elapsed = now - lastSyncRef.current;

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
  }, []); // eslint-disable-line

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth:changed") {
        if (!inflightRef.current) {
          inflightRef.current = fetchMe({ background: true });
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
        } catch {
          await logout();
        }
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]); // eslint-disable-line

  useEffect(() => {
    if (!ENABLE_BACKGROUND_REFRESH) return;
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        await api.post("/user/refresh");
        if (!inflightRef.current) {
          inflightRef.current = fetchMe({ background: true });
        }
      } catch {
        // não derruba aqui
      }
    }, BACKGROUND_REFRESH_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated]); // eslint-disable-line

  // NOVO: regra global
  const mustChangePassword =
    !!isAuthenticated && user?.senha_trocada === false;

  const value: UserContextType = {
    user,
    isAuthenticated,
    isLoading,
    mustChangePassword,
    logout,
    refreshUser,

    setLoginPassword: (senhaAtual: string) => {
      loginPasswordRef.current = senhaAtual;
    },
    getLoginPassword: () => loginPasswordRef.current,
    clearLoginPassword: () => {
      loginPasswordRef.current = null;
    },
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
