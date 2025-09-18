import axios from "axios";
import { useAuthStore } from "../stores/auth";
import { useLoadingStore } from "@/stores/loading";

// 🔹 Define API and Frontend origins
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// 🔹 Create Axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// 🔹 Request Interceptor: Attach Bearer Token
axiosInstance.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    const loadingStore = useLoadingStore();
    // attach bearer
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    // global loader start for any request
    loadingStore.start();
    return config;
  },
  (error) => {
    try { useLoadingStore().stop(); } catch {}
    return Promise.reject(error);
  }
);

// 🔹 Response Interceptor: Handle Token Expiry & Refresh
axiosInstance.interceptors.response.use(
  (response) => {
    try { useLoadingStore().stop(); } catch {}
    return response;
  },
  async (error) => {
    const authStore = useAuthStore();
    const loadingStore = useLoadingStore();
    const originalRequest = error.config || {};

    // Stop for this failed response
    try { loadingStore.stop(); } catch {}

    // If 401 (Unauthorized), attempt to refresh token
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true; // Prevent infinite loops

      try {
        // Start loader for refresh request
        loadingStore.start();
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {
            refreshToken: authStore.refreshToken,
          }
        );
        // Stop loader for refresh request
        loadingStore.stop();

        // Update tokens
        authStore.token = refreshResponse.data.accessToken;
        authStore.refreshToken = refreshResponse.data.refreshToken;
        localStorage.setItem("authToken", authStore.token);
        localStorage.setItem("refreshToken", authStore.refreshToken);

        // Retry original
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${authStore.token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        try { loadingStore.stop(); } catch {}
        console.error("Refresh token expired or invalid:", refreshError);
        authStore.logout();
      }
    }

    return Promise.reject(error);
  }
);

// --- Global mutation de-duplication (prevent double submit) ---
// Ensures only one in-flight POST/PUT/PATCH/DELETE per URL at a time.
// Subsequent calls while a request is pending will reuse the same promise.
const inflightByKey = new Map();

function mutationKey(config) {
  const method = String(config?.method || "get").toLowerCase();
  // Only guard mutations
  if (!["post", "put", "patch", "delete"].includes(method)) return null;
  const base = config?.baseURL || axiosInstance.defaults.baseURL || "";
  const url = config?.url || "";
  // Keyed only by method + full URL (or path) so any double-click to same endpoint is deduped
  try {
    if (base) {
      return `${method}|${new URL(url, base).toString()}`;
    }
    return `${method}|${url}`;
  } catch {
    // Fallback to concatenation if URL construction fails
    return `${method}|${String(base)}${String(url)}`;
  }
}

const _originalRequest = axiosInstance.request.bind(axiosInstance);

axiosInstance.request = function guardedRequest(config) {
  const key = mutationKey(config);
  if (!key) {
    return _originalRequest(config);
  }
  if (inflightByKey.has(key)) {
    return inflightByKey.get(key);
  }
  const p = _originalRequest(config)
    .finally(() => {
      inflightByKey.delete(key);
    });
  inflightByKey.set(key, p);
  return p;
};

export default axiosInstance;
