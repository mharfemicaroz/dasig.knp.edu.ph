// stores/auth.js
import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "@/plugins/axiosConfig";
import router from "@/router";
import apiAuth from "@/services/authService";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(JSON.parse(localStorage.getItem("userData")) || null);
  const token = ref(localStorage.getItem("authToken") || null);
  const refreshToken = ref(localStorage.getItem("refreshToken") || null);
  const requires2FA = ref(false);
  const tempToken = ref(null);
  const isLoading = ref(false);
  const requiresVerification = ref(false);

  const register = async (payload, captchaToken) => {
    try {
      isLoading.value = true;

      try {
        const check = await apiAuth.checkEmail(payload.email);
        if (check?.exists) {
          throw new Error(
            "Email already exists. Please sign in or use a different email."
          );
        }
      } catch (e) {
        if (!(e?.response?.status === 404)) {
        }
      }

      const data = await apiAuth.register(payload, { captchaToken });

      if (data.requiresVerification) {
        requiresVerification.value = true;
        return { requiresVerification: true };
      }

      if (data.requires2FA) {
        requires2FA.value = true;
        tempToken.value = data.tempToken;
        localStorage.setItem("requires2FA", "true");
        localStorage.setItem("tempToken", tempToken.value);
        router.push("/otp");
        return { requires2FA: true };
      }

      if (data.accessToken) {
        token.value = data.accessToken;
        refreshToken.value = data.refreshToken;
        localStorage.setItem("authToken", token.value);
        localStorage.setItem("refreshToken", refreshToken.value);

        user.value = {
          id: data.userdata.id,
          email: data.userdata.email,
          role: data.userdata.role,
          twoFAEnabled: data.userdata.twoFAEnabled,
          first_name: data.userdata.first_name,
          last_name: data.userdata.last_name,
          username: data.userdata.username,
        };
        localStorage.setItem("userData", JSON.stringify(user.value));

        router.push("/profile");
        return { ok: true };
      }

      return data;
    } catch (e) {
      throw new Error(
        e.response?.data?.message || e.message || "Registration failed"
      );
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (email, password, captchaToken) => {
    try {
      isLoading.value = true;
      requiresVerification.value = false;

      // pass the token through to the service
      const data = await apiAuth.login(email, password, { captchaToken });

      if (data.requiresVerification) {
        requiresVerification.value = true;
        return { requiresVerification: true };
      }

      if (data.requires2FA) {
        requires2FA.value = true;
        tempToken.value = data.tempToken;
        localStorage.setItem("requires2FA", "true");
        localStorage.setItem("tempToken", tempToken.value);
        router.push("/otp");
        return { requires2FA: true };
      }

      token.value = data.accessToken;
      refreshToken.value = data.refreshToken;
      localStorage.setItem("authToken", token.value);
      localStorage.setItem("refreshToken", refreshToken.value);

      user.value = {
        id: data.userdata.id,
        email: data.userdata.email,
        role: data.userdata.role,
        twoFAEnabled: data.userdata.twoFAEnabled,
        first_name: data.userdata.first_name,
        last_name: data.userdata.last_name,
        username: data.userdata.username,
      };
      console.log("user", user.value);
      localStorage.setItem("userData", JSON.stringify(user.value));

      router.push("/profile");
      return { ok: true };
    } catch (e) {
      throw new Error(e.response?.data?.message || "Login failed");
    } finally {
      isLoading.value = false;
    }
  };

  const verify2FA = async (otp) => {
    try {
      isLoading.value = true;
      const response = await axios.post("/auth/verify-2fa", {
        otp,
        tempToken: localStorage.getItem("tempToken"),
      });

      token.value = response.data.accessToken;
      refreshToken.value = response.data.refreshToken;
      localStorage.setItem("authToken", token.value);
      localStorage.setItem("refreshToken", refreshToken.value);

      user.value = {
        id: response.data.userdata.id,
        email: response.data.userdata.email,
        role: response.data.userdata.role,
        twoFAEnabled: response.data.userdata.twoFAEnabled,
        first_name: response.data.userdata.first_name,
        last_name: response.data.userdata.last_name,
        username: response.data.userdata.username,
      };
      localStorage.setItem("userData", JSON.stringify(user.value));

      requires2FA.value = false;
      tempToken.value = null;
      localStorage.removeItem("requires2FA");
      localStorage.removeItem("tempToken");

      router.push("/profile");
    } catch (error) {
      throw new Error("Invalid OTP");
    } finally {
      isLoading.value = false;
    }
  };

  const enable2FA = async (id) => {
    try {
      isLoading.value = true;
      const response = await axios.post("/auth/enable-2fa", { userId: id });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to enable 2FA");
    } finally {
      isLoading.value = false;
    }
  };

  const disable2FA = async (id) => {
    try {
      isLoading.value = true;
      await axios.post("/auth/disable-2fa", { userId: id });
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to disable 2FA");
    } finally {
      isLoading.value = false;
    }
  };

  const resendVerification = async (email) => {
    try {
      isLoading.value = true;
      await axios.post("/auth/resend-verification", { email });
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to resend verification"
      );
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    token.value = null;
    refreshToken.value = null;
    user.value = null;
    requires2FA.value = false;
    tempToken.value = null;
    requiresVerification.value = false;

    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("requires2FA");
    localStorage.removeItem("tempToken");

    localStorage.setItem("logout", Date.now());

    router.push({ name: "login" });
  };

  const verifyEmail = async (tokenParam) => {
    try {
      isLoading.value = true;
      await axios.get("/auth/verify-email", { params: { token: tokenParam } });
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Email verification failed"
      );
    } finally {
      isLoading.value = false;
    }
  };

  const verifyToken = async () => {
    try {
      isLoading.value = true;
      await axios.get("/auth/verify");
    } catch {
      throw new Error("Invalid token");
    } finally {
      isLoading.value = false;
    }
  };

  const refreshAccessToken = async () => {
    try {
      isLoading.value = true;
      const response = await axios.post("/auth/refresh", {
        refreshToken: refreshToken.value,
      });
      token.value = response.data.accessToken;
      localStorage.setItem("authToken", token.value);
    } catch {
      throw new Error("Refresh token expired");
    } finally {
      isLoading.value = false;
    }
  };

  // make startGoogleLogin accept an action and include a captcha token
  const startGoogleLogin = async (
    hashRoute = "#/login",
    action = "sso_start"
  ) => {
    const state =
      window.location.origin +
      window.location.pathname +
      window.location.search +
      hashRoute;

    let captchaToken = null;
    try {
      // if your backend expects a specific action, change here
      captchaToken = await apiAuth.getCaptchaToken(action);
    } catch {}

    const url = apiAuth.getGoogleStartUrl(state, { captchaToken });
    window.location.href = url;
  };

  const consumeSsoFromHash = () => {
    const parsed = apiAuth.parseSsoHash(window.location.hash);
    console.log(window.location.hash);
    if (parsed.error) throw new Error(parsed.error);
    if (parsed.sso !== "google" || !parsed.accessToken) return false;

    token.value = parsed.accessToken;
    refreshToken.value = parsed.refreshToken || null;
    if (token.value) localStorage.setItem("authToken", token.value);
    if (refreshToken.value)
      localStorage.setItem("refreshToken", refreshToken.value);

    user.value = parsed.userdata || null;
    if (user.value)
      localStorage.setItem("userData", JSON.stringify(user.value));

    if (window.location.hash) {
      if (history.replaceState) {
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      } else {
        window.location.hash = "";
      }
    }

    router.push("/profile");
    return true;
  };

  const checkRole = async () => {
    try {
      isLoading.value = true;
      const data = await apiAuth.checkRole();
      if (data?.userdata) {
        user.value = {
          id: data.userdata.id,
          email: data.userdata.email,
          role: data.userdata.role,
          twoFAEnabled: data.userdata.twoFAEnabled,
          first_name: data.userdata.first_name,
          last_name: data.userdata.last_name,
          username: data.userdata.username,
          is_active: data.userdata.is_active,
        };
        localStorage.setItem("userData", JSON.stringify(user.value));
      } else if (data?.role && user.value) {
        user.value = { ...user.value, role: data.role };
        localStorage.setItem("userData", JSON.stringify(user.value));
      }
      return data?.role || user.value?.role || null;
    } catch (e) {
      if (e?.response?.status === 401) logout();
      throw new Error(e.response?.data?.message || "Failed to check role");
    } finally {
      isLoading.value = false;
    }
  };

  window.addEventListener("storage", (event) => {
    if (event.key === "logout") logout();
  });

  return {
    user,
    token,
    refreshToken,
    requires2FA,
    tempToken,
    isLoading,
    requiresVerification,
    register,
    login,
    logout,
    verify2FA,
    enable2FA,
    disable2FA,
    verifyToken,
    refreshAccessToken,
    verifyEmail,
    resendVerification,
    startGoogleLogin,
    consumeSsoFromHash,
    getCaptchaToken: apiAuth.getCaptchaToken,
    isAuthenticated: () => !!token.value,
    checkRole,
  };
});
