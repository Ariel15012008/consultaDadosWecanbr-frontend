import axios from "axios";

// const url = import.meta.env.VITE_API_ENVIRONMENT == "prod" ? import.meta.env.VITE_API_URL_PROD : import.meta.env.VITE_API_URL_DEV;

const VITE_API_ENVIRONMENT: string = "dev";
const VITE_API_URL_DEV: string = "http://localhost:8000/";
const VITE_API_URL_PROD: string = "https://docrh.onrender.com/";

const url =
  VITE_API_ENVIRONMENT == "prod" ? VITE_API_URL_PROD : VITE_API_URL_DEV;

const api = axios.create({
  baseURL: url,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
