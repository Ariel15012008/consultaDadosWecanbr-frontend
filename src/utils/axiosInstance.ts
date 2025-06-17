import axios from "axios";

const url = process.env.NODE_ENV === "production" ? "https://docrh.onrender.com/" : "http://localhost:8000";

const api = axios.create({
  baseURL: url,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
