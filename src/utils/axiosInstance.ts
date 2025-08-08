import axios from "axios";

const url = import.meta.env.VITE_API_ENVIRONMENT == "prod" ? import.meta.env.VITE_API_URL_PROD : import.meta.env.VITE_API_URL_DEV;

const api = axios.create({
  baseURL: url,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
