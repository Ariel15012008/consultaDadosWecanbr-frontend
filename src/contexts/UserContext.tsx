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

  interno?: boolean;
  senha_trocada?: boolean | null;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  mustChangePassword: boolean;

  mustValidateInternalToken: boolean;

  internalTokenValidated: boolean;
  setInternalTokenValidated: (v: boolean) => void;

  // ✅ NOVO: bloqueio de /token após validação, até novo login
  internalTokenBlockedInSession: boolean;
  setInternalTokenBlockedInSession: (v: boolean) => void;
  clearInternalTokenSession: () => void;

  isLoggingIn: boolean;
  beginLogin: () => void;
  endLogin: () => void;

  logout: (opts?: { redirectTo?: string; reload?: boolean }) => Promise<void>;
  refreshUser: () => Promise<User | null>;

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

const INTERNAL_TOKEN_SESSION_KEY = "auth:internal_token_validated";

function readInternalTokenSession(): boolean {
  try {
    return sessionStorage.getItem(INTERNAL_TOKEN_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function writeInternalTokenSession(v: boolean) {
  try {
    sessionStorage.setItem(INTERNAL_TOKEN_SESSION_KEY, v ? "true" : "false");
  } catch {
    // ignore
  }
}

function clearInternalTokenSessionStorage() {
  try {
    sessionStorage.removeItem(INTERNAL_TOKEN_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function UserProvider({ children }: UserProviderProps) {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAuthRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const didLogout = useRef(false);

  const inflightRef = useRef<Promise<User | null> | null>(null);
  const lastSyncRef = useRef<number>(0);

  const loginPasswordRef = useRef<string | null>(null);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const isLoggingInRef = useRef(false);

  // ✅ token interno validado (memória)
  const [internalTokenValidated, setInternalTokenValidatedState] =
    useState(false);

  // ✅ NOVO: bloqueio por sessão (sessionStorage)
  const [internalTokenBlockedInSession, setInternalTokenBlockedInSessionState] =
    useState(readInternalTokenSession());

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

  // ✅ Setter público usado pela tela /token quando validar com sucesso
  const setInternalTokenValidated = (v: boolean) => {
    setInternalTokenValidatedState(v);
  };

  // ✅ NOVO: controla bloqueio em sessionStorage
  const setInternalTokenBlockedInSession = (v: boolean) => {
    setInternalTokenBlockedInSessionState(v);
    writeInternalTokenSession(v);
  };

  const clearInternalTokenSession = () => {
    setInternalTokenValidatedState(false);
    setInternalTokenBlockedInSessionState(false);
    clearInternalTokenSessionStorage();
  };

  const fetchMe = async (opts?: { background?: boolean; force?: boolean }) => {
    const background = !!opts?.background;
    const force = !!opts?.force;

    if (!force && isLoggingInRef.current) {
      inflightRef.current = null;
      lastSyncRef.current = Date.now();
      return null;
    }

    if (!background) setIsLoading(true);

    try {
      const res = await api.get("/user/me");

      const firstEmpresaId = (res.data?.dados?.[0]?.id ?? null) as number | null;
      const is_sapore = firstEmpresaId === 5849;

      Cookies.set("is_sapore", is_sapore ? "true" : "false", {
        sameSite: "lax",
      });

      if (res.status === 200) {
        const raw = res.data as User;

        const normalized: User = {
          ...raw,
          interno: raw?.interno === true,
          senha_trocada:
            typeof raw?.senha_trocada === "boolean" ? raw.senha_trocada : null,
        };

        assignUserIfChanged(normalized);
        setIsAuthenticatedSafe(true);

        // ✅ mantém o bloqueio por sessão, mas zera o "validado em memória"
        // quando o usuário muda (ou reloga)
        if (!userRef.current) {
          setInternalTokenValidatedState(false);
        }

        return normalized;
      }

      assignUserIfChanged(null);
      setIsAuthenticatedSafe(false);
      setInternalTokenValidatedState(false);
      setInternalTokenBlockedInSession(false);
      return null;
    } catch (err) {
      const ax = err as AxiosError;
      const status = ax.response?.status;

      if (isAuthErrorStatus(status)) {
        assignUserIfChanged(null);
        setIsAuthenticatedSafe(false);
        loginPasswordRef.current = null;
        setInternalTokenValidatedState(false);
        setInternalTokenBlockedInSession(false);
        return null;
      }

      return userRef.current;
    } finally {
      if (!background) setIsLoading(false);
      lastSyncRef.current = Date.now();
      inflightRef.current = null;
    }
  };

  const refreshUser = async () => {
    const u = await fetchMe({ background: false, force: true });
    return u ?? userRef.current;
  };

  const logout = async (opts?: { redirectTo?: string; reload?: boolean }) => {
    const redirectTo = opts?.redirectTo ?? "/";
    const reload = opts?.reload ?? true;

    try {
      Cookies.remove("access_token");
      Cookies.remove("logged_user");
      await api.post("/user/logout");
    } catch {
      // ignore
    } finally {
      clearInternalTokenSession();

      setIsAuthenticatedSafe(false);
      assignUserIfChanged(null);
      didLogout.current = true;
      loginPasswordRef.current = null;

      try {
        localStorage.setItem("auth:changed", String(Date.now()));
      } catch {}

      try {
        localStorage.removeItem("zion.livechat.identity");
      } catch {}

      try {
        await (window as any).resetOdooLivechatSession?.();
      } catch {}

      navigate(redirectTo, { replace: true });

      if (reload) window.location.reload();
    }
  };

  const beginLogin = () => {
    // ✅ NOVO: novo login => libera /token de novo
    clearInternalTokenSession();
    isLoggingInRef.current = true;
    setIsLoggingIn(true);
  };

  const endLogin = () => {
    isLoggingInRef.current = false;
    setIsLoggingIn(false);
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
        // ignore
      }
    }, BACKGROUND_REFRESH_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated]); // eslint-disable-line

  const hasSenhaTrocadaFlag =
    isAuthenticated &&
    user?.senha_trocada !== null &&
    user?.senha_trocada !== undefined;

  const mustChangePassword =
    !!isAuthenticated && (user?.senha_trocada === false || !hasSenhaTrocadaFlag);

  // ✅ Regra: se já validou token nesta sessão, não exige novamente
  const mustValidateInternalToken =
    !!isAuthenticated &&
    !mustChangePassword &&
    user?.interno === true &&
    internalTokenBlockedInSession === false &&
    internalTokenValidated === false;

  const value: UserContextType = {
    user,
    isAuthenticated,
    isLoading,

    mustChangePassword,

    mustValidateInternalToken,

    internalTokenValidated,
    setInternalTokenValidated,

    internalTokenBlockedInSession,
    setInternalTokenBlockedInSession,
    clearInternalTokenSession,

    isLoggingIn,
    beginLogin,
    endLogin,

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
