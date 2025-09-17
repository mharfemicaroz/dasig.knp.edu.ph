import axios from "axios";
import { useAuthStore } from "../stores/auth";

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
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔹 Response Interceptor: Handle Token Expiry & Refresh
axiosInstance.interceptors.response.use(
  (response) => response, // Pass valid responses
  async (error) => {
    const authStore = useAuthStore();
    const originalRequest = error.config;

    // If 401 (Unauthorized), attempt to refresh token
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true; // Prevent infinite loops

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {
            refreshToken: authStore.refreshToken, // Send current refresh token
          }
        );

        // Update both the access token and refresh token in the auth store
        authStore.token = refreshResponse.data.accessToken;
        authStore.refreshToken = refreshResponse.data.refreshToken; // <-- Update refresh token

        // Optionally update localStorage if you're persisting tokens there
        localStorage.setItem("authToken", authStore.token);
        localStorage.setItem("refreshToken", authStore.refreshToken);

        // Update the authorization header and retry the failed request
        originalRequest.headers.Authorization = `Bearer ${authStore.token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token expired or invalid:", refreshError);
        authStore.logout(); // Log the user out if refresh fails
      }
    }

    return Promise.reject(error); // Pass other errors
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
