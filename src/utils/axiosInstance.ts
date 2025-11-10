// src/utils/axiosInstance.ts
import axios, {
  AxiosError,
  type AxiosResponse,
  type AxiosRequestConfig,
} from "axios";
import { publishNetEvent, type NetDebugEvent } from "@/utils/netDebug";

const url =
  import.meta.env.VITE_API_ENVIRONMENT === "prod"
    ? import.meta.env.VITE_API_URL_PROD
    : import.meta.env.VITE_API_URL_DEV;

declare module "axios" {
  // flag interna para evitar loop de refresh
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _startedAt?: number;
    _requestId?: string;
  }
}

const api = axios.create({
  baseURL: url,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    // Se você manteve este header por algum motivo,
    // o console vai te mostrar claramente o preflight.
    // "X-Requested-With": "XMLHttpRequest",
  },
});

// --------- DEBUG FLAG ---------
const DEBUG_NET = (import.meta.env.VITE_DEBUG_NET ?? "false") === "true";

// Util para gerar IDs simples de request
function rid() {
  return Math.random().toString(36).slice(2, 10);
}

// Log agrupado no console
function groupLog(ev: NetDebugEvent) {
  if (!DEBUG_NET) return;
  const title = `[NET ${ev.method}] ${ev.url} — ${ev.status ?? "ERR"} (${ev.durationMs ?? "?"}ms)`;
  const collapsed = console.groupCollapsed ?? console.group;
  collapsed?.call(console, title);
  try {
    console.log("baseURL:", ev.baseURL);
    console.log("withCredentials:", ev.withCredentials);
    console.log("requestHeaders:", ev.requestHeaders);
    if (ev.preflightHint) console.warn("preflightHint:", ev.preflightHint);
    if (ev.status === 0 || ev.errorCode === "ERR_NETWORK") {
      console.warn("Possível CORS/Preflight/TLS/Redirect:", {
        origin: window.location.origin,
        target: ev.baseURL ? new URL(ev.url, ev.baseURL).origin : ev.url,
      });
    }
    console.log("status:", ev.status);
    console.log("responseHeaders:", ev.responseHeaders);
    console.log("errorCode/message:", ev.errorCode, ev.errorMessage);
    console.log("payloadPreview:", ev.payloadPreview);
  } finally {
    console.groupEnd?.();
  }
}

// ----------------- INTERCEPTORS -----------------
api.interceptors.request.use((config) => {
  // marca início
  config._startedAt = performance.now();
  config._requestId = rid();

  if (DEBUG_NET) {
    // dica: headers que disparam preflight
    const rh = (config.headers ?? {}) as Record<string, unknown>;
    const preflightCausers: string[] = [];
    if ("X-Requested-With" in rh) preflightCausers.push("X-Requested-With");
    if ("Authorization" in rh) preflightCausers.push("Authorization"); // em POST geralmente não; mas pode
    // publica evento de "request" (pendente)
    publishNetEvent({
      id: config._requestId!,
      phase: "request",
      url: config.url ?? "",
      baseURL: config.baseURL ?? "",
      method: (config.method ?? "get").toUpperCase(),
      withCredentials: !!config.withCredentials,
      requestHeaders: rh,
      preflightHint: preflightCausers.length
        ? `Cabeçalhos que podem disparar preflight: ${preflightCausers.join(", ")}`
        : undefined,
      startedAt: performance.timeOrigin + (config._startedAt ?? 0),
      payloadPreview: safePreview(config.data),
    });
  }

  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const cfg = response.config as AxiosRequestConfig;
    const dur = cfg._startedAt ? performance.now() - cfg._startedAt : undefined;

    const ev: NetDebugEvent = {
      id: cfg._requestId ?? rid(),
      phase: "response",
      url: cfg.url ?? "",
      baseURL: cfg.baseURL ?? "",
      method: (cfg.method ?? "get").toUpperCase(),
      withCredentials: !!cfg.withCredentials,
      status: response.status,
      responseHeaders: headersToObject(response.headers),
      durationMs: dur ? Math.round(dur) : undefined,
      payloadPreview: safePreview(response.data),
    };

    publishNetEvent(ev);
    groupLog(ev);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig | undefined;
    const status = error.response?.status;
    const startedAt = originalRequest?._startedAt;
    const dur = startedAt ? performance.now() - startedAt : undefined;

    // Evento de erro
    const ev: NetDebugEvent = {
      id: originalRequest?._requestId ?? rid(),
      phase: "error",
      url: originalRequest?.url ?? "",
      baseURL: originalRequest?.baseURL ?? "",
      method: (originalRequest?.method ?? "get").toUpperCase(),
      withCredentials: !!originalRequest?.withCredentials,
      requestHeaders: (originalRequest?.headers ?? {}) as Record<string, unknown>,
      status: status ?? (error.request?.status as number | undefined) ?? 0,
      responseHeaders: headersToObject(error.response?.headers),
      durationMs: dur ? Math.round(dur) : undefined,
      errorCode: error.code,
      errorMessage: error.message,
      payloadPreview: safePreview(error.response?.data ?? error.message),
      preflightHint: preflightHint(originalRequest),
    };
    publishNetEvent(ev);
    groupLog(ev);

    // Mantém sua lógica de refresh exatamente igual
    if (!originalRequest) {
      return Promise.reject(error);
    }


    // garante apenas UM refresh em andamento
    // usando a mesma variável do seu arquivo:
    // (colocada fora do interceptor)
    return handleAuthRefreshFlow(error, originalRequest, status);
  }
);

// --------- REFRESH original (sua lógica, intacta) ---------
let refreshPromise: Promise<AxiosResponse<any>> | null = null;

async function handleAuthRefreshFlow(
  error: AxiosError,
  originalRequest: AxiosRequestConfig,
  status?: number
) {
  if (
    status === 401 &&
    !originalRequest._retry &&
    !shouldSkipRefresh(originalRequest.url)
  ) {
    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = api.post("/user/refresh").finally(() => {
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }

  return Promise.reject(error);
}

function shouldSkipRefresh(requestUrl?: string) {
  if (!requestUrl) return true;
  const u = requestUrl.toLowerCase();
  return (
    u.includes("/user/refresh") ||
    u.includes("/user/login") ||
    u.includes("/user/logout")
  );
}

// ---------- HELPERS ----------
function headersToObject(h?: any): Record<string, string> | undefined {
  if (!h) return undefined;
  // Axios pode entregar como objeto simples
  return typeof h === "object" ? (h as Record<string, string>) : undefined;
}

function safePreview(data: unknown) {
  try {
    if (data == null) return data;
    if (typeof data === "string") {
      return data.length > 500 ? data.slice(0, 500) + "…[+]" : data;
    }
    return JSON.stringify(data).slice(0, 500);
  } catch {
    return "[unserializable]";
  }
}

function preflightHint(cfg?: AxiosRequestConfig) {
  if (!cfg?.headers) return undefined;
  const h = cfg.headers as Record<string, unknown>;
  const suspects: string[] = [];
  if ("X-Requested-With" in h) suspects.push("X-Requested-With");
  if ("Authorization" in h) suspects.push("Authorization");
  if (suspects.length === 0) return undefined;
  return `Possível preflight por: ${suspects.join(", ")}`;
}

export default api;
