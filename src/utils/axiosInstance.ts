// src/utils/axiosInstance.ts
import axios, {
  AxiosError,
  type AxiosResponse,
  type AxiosRequestConfig,
} from "axios";

type RuntimeConfig = {
  VITE_API_URL_PROD?: string;
  VITE_API_URL_DEV?: string;
  VITE_API_ENVIRONMENT?: "dev" | "prod";
};

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

function resolveBaseUrl() {
  const cfg = (typeof window !== "undefined" ? window.__APP_CONFIG__ : undefined) || {};

  const env =
    cfg.VITE_API_ENVIRONMENT ||
    (import.meta.env.VITE_API_ENVIRONMENT as "dev" | "prod") ||
    "dev";

  const prod =
    cfg.VITE_API_URL_PROD ||
    (import.meta.env.VITE_API_URL_PROD as string) ||
    "https://rh.ziondocs.com.br/";

  const dev =
    cfg.VITE_API_URL_DEV ||
    (import.meta.env.VITE_API_URL_DEV as string) ||
    "http://localhost:8000/";

  return env === "prod" ? prod : dev;
}

const url = resolveBaseUrl();

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

const api = axios.create({
  baseURL: url,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

function shouldSkipRefresh(requestUrl?: string) {
  if (!requestUrl) return true;
  const u = requestUrl.toLowerCase();
  return (
    u.includes("/user/refresh") ||
    u.includes("/user/login") ||
    u.includes("/user/logout")
  );
}

let refreshPromise: Promise<AxiosResponse<any>> | null = null;

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

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
);

export default api;
