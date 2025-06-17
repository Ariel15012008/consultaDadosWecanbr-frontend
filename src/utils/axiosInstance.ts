import axios from "axios";

const url = process.env.NODE_ENV === "production" ? "http://localhost:8000" : "https://docrh.onrender.com/";

const api = axios.create({
  baseURL: url,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
