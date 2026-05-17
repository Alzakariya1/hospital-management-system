import axios from "axios";

function normalizeApiBase(url) {
  const raw = (url || "http://localhost:5000/api").trim().replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

const api = axios.create({
  baseURL: normalizeApiBase(import.meta.env.VITE_API_URL),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isLoginRequest = url.includes("/auth/login");
    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent("hms-auth-expired", {
        detail: error.response?.data || { message: "Session expired. Please login again." },
      }));
    }
    return Promise.reject(error);
  }
);

export default api;
