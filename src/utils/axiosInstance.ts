// src/utils/axiosInstance.ts
import axios, {
  AxiosError,
  type AxiosResponse,
  type AxiosRequestConfig,
} from "axios";

const url =
  import.meta.env.VITE_API_ENVIRONMENT === "prod"
    ? import.meta.env.VITE_API_URL_PROD
    : import.meta.env.VITE_API_URL_DEV;

declare module "axios" {
  // flag interna para evitar loop de refresh
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

// garante apenas UM refresh em andamento
let refreshPromise: Promise<AxiosResponse<any>> | null = null;

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // tenta refresh somente em 401 e se ainda não tentou
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
