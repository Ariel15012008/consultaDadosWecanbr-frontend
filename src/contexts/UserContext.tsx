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

const REVALIDATE_ON_FOCUS =
  (import.meta.env.VITE_AUTH_REVALIDATE_ON_FOCUS ?? "true") === "true";
const MIN_FOCUS_REVALIDATION_MS = Number(
  import.meta.env.VITE_AUTH_FOCUS_THROTTLE_MS ?? 300_000
);

export function UserProvider({ children }: UserProviderProps) {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [, _setIsAuthenticated] = useState(false);
  const isAuthRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const didLogout = useRef(false);

  const inflightRef = useRef<Promise<void> | null>(null);
  const lastSyncRef = useRef<number>(0);

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
      _setIsAuthenticated(next);
    }
  };

  const fetchMe = async (opts?: { background?: boolean }) => {
    const background = !!opts?.background;

    if (!background) setIsLoading(true);
    try {
      const res = await api.get("/user/me");
      const is_sapore = res.data.dados[0].id == 5849;

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
    } catch {
      assignUserIfChanged(null);
      setIsAuthenticatedSafe(false);
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

      try {
        localStorage.setItem("auth:changed", String(Date.now()));
      } catch {}

      // limpa identidade do livechat e faz reset forte da sessão antes do reload
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
  }, []);

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
    if (!isAuthRef.current) return;

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
  }, []); // eslint-disable-line

  const value: UserContextType = {
    user,
    isAuthenticated: isAuthRef.current,
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
