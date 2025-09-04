import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000", // your FastAPI backend
});

// Automatically attach token if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("id_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
