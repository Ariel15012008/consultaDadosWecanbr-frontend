// src/utils/axiosInstance.ts
import axios, { AxiosError, type AxiosResponse } from "axios";

const url =
  import.meta.env.VITE_API_ENVIRONMENT === "prod"
    ? import.meta.env.VITE_API_URL_PROD
    : import.meta.env.VITE_API_URL_DEV;

const api = axios.create({
  baseURL: url,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function shouldSkipRefresh(requestUrl?: string) {
  if (!requestUrl) return true;
  return (
    requestUrl.includes("/user/refresh") ||
    requestUrl.includes("/user/login") ||
    requestUrl.includes("/user/logout")
  );
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest: any = error.config;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        await api.post("/user/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
