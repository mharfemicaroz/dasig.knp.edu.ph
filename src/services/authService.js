// services/authService.js
import axiosInstance from "../plugins/axiosConfig";

const API_URL = "/auth";

const SITE_KEY = import.meta.env?.VITE_RECAPTCHA_SITE_KEY || "";
const RECAPTCHA_ENABLED =
  String(import.meta.env?.VITE_RECAPTCHA_ENABLED ?? "true").toLowerCase() ===
  "true";

/**
 * Get a reCAPTCHA Enterprise token for the given action.
 * Returns null if disabled or grecaptcha not available.
 */
async function getCaptchaToken(action) {
  if (!RECAPTCHA_ENABLED) return null;
  if (typeof window === "undefined") return null;

  const g = window.grecaptcha?.enterprise || window.grecaptcha;
  if (!g?.ready || !g?.execute || !SITE_KEY) return null;

  // grecaptcha.ready requires a callback — don't call it with no args
  await new Promise((resolve) => g.ready(resolve));

  try {
    return await g.execute(SITE_KEY, { action });
  } catch {
    return null;
  }
}

export default {
  // expose so callers can fetch explicitly if needed
  getCaptchaToken,

  async register(data, { action = "register", captchaToken } = {}) {
    const token = captchaToken ?? (await getCaptchaToken(action));
    const response = await axiosInstance.post(`${API_URL}/register`, {
      ...data,
      captchaToken: token,
    });
    return response.data;
  },

  async checkEmail(email) {
    const response = await axiosInstance.get(`${API_URL}/check-email`, {
      params: { email },
    });
    return response.data; // { exists: boolean }
  },

  async login(email, password, { action = "login", captchaToken } = {}) {
    const token = captchaToken ?? (await getCaptchaToken(action));
    const response = await axiosInstance.post(`${API_URL}/login`, {
      email,
      password,
      captchaToken: token,
    });
    return response.data;
  },

  async verify2FA(tempToken, otp) {
    const response = await axiosInstance.post(`${API_URL}/verify-2fa`, {
      tempToken,
      otp,
    });
    return response.data;
  },

  async enable2FA(userId) {
    const response = await axiosInstance.post(`${API_URL}/enable-2fa`, {
      userId,
    });
    return response.data;
  },

  async disable2FA(userId) {
    const response = await axiosInstance.post(`${API_URL}/disable-2fa`, {
      userId,
    });
    return response.data;
  },

  async refresh(refreshToken) {
    const response = await axiosInstance.post(`${API_URL}/refresh`, {
      refreshToken,
    });
    return response.data;
  },

  async logout() {
    const response = await axiosInstance.post(`${API_URL}/logout`);
    return response.data;
  },

  async forgotPassword(email) {
    const response = await axiosInstance.post(`${API_URL}/forgot-password`, {
      email,
    });
    return response.data;
  },

  async resetPassword(resetToken, newPassword) {
    const response = await axiosInstance.post(`${API_URL}/reset-password`, {
      resetToken,
      newPassword,
    });
    return response.data;
  },

  async verifyEmail(token) {
    const response = await axiosInstance.get(`${API_URL}/verify-email`, {
      params: { token },
    });
    return response.data;
  },

  async resendVerification(email) {
    const response = await axiosInstance.post(
      `${API_URL}/resend-verification`,
      { email }
    );
    return response.data;
  },

  async checkRole() {
    const response = await axiosInstance.get(`${API_URL}/check-role`);
    return response.data;
  },

  getGoogleStartUrl(redirectUri) {
    return `${
      axiosInstance.defaults.baseURL || ""
    }${API_URL}/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;
  },

  parseSsoHash(hashString = window.location.hash) {
    const href = typeof window !== "undefined" ? window.location.href : "";
    let fragment = "";

    if (href.includes("#")) {
      fragment = href.substring(href.lastIndexOf("#") + 1);
    } else {
      const raw = hashString.startsWith("#") ? hashString.slice(1) : hashString;
      fragment = raw.includes("#") ? raw.split("#").pop() : raw;
    }

    if (
      !fragment ||
      (!fragment.includes("accessToken=") && !fragment.includes("sso="))
    ) {
      return {
        sso: null,
        error: null,
        accessToken: null,
        refreshToken: null,
        userdata: null,
      };
    }

    const p = new URLSearchParams(fragment);
    return {
      sso: p.get("sso"),
      error: p.get("error"),
      accessToken: p.get("accessToken"),
      refreshToken: p.get("refreshToken"),
      userdata: {
        id: p.get("id") ? Number(p.get("id")) : null,
        email: p.get("email"),
        role: p.get("role"),
        first_name: p.get("first_name"),
        last_name: p.get("last_name"),
        twoFAEnabled:
          p.get("twoFAEnabled") === "0" ? false : p.get("twoFAEnabled") === "1",
      },
    };
  },
};
