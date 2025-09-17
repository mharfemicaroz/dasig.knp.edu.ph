<template>
    <div class="min-h-screen relative overflow-hidden">
        <!-- Background layers -->
        <div class="absolute inset-0">
            <div class="h-full w-full bg-cover bg-center" :style="`background-image:url(/images/bg.jpg)`"></div>
            <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
            <div class="absolute inset-0 backdrop-blur-sm"></div>
            <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,.08),_transparent_40%),radial-gradient(circle_at_80%_0,_rgba(255,255,255,.06),_transparent_35%),radial-gradient(circle_at_50%_100%,_rgba(255,255,255,.05),_transparent_45%)]">
            </div>
        </div>

        <!-- Loading -->
        <div v-if="auth.isLoading" class="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-md">
            <div class="loader"></div>
        </div>

        <!-- Login form -->
        <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-md">
                <div class="mb-6 text-center">
                    <a href="index.html" class="inline-flex items-center justify-center">
                        <img src="/images/osas.png" alt="OSAS" class="h-14 w-auto" />
                    </a>
                    <h1 class="mt-4 text-2xl font-extrabold tracking-wide text-white">
                        DASIG – Dashboard for Academic Systems, Information & Governance
                    </h1>
                    <p class="mt-1 text-primary-text/90 text-sm">“DASIG: Energizing Academic Leadership and Governance.”</p>
                </div>

                <div
                    class="group rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl ring-1 ring-black/5 hover:ring-black/10 transition">
                    <div class="p-6 sm:p-7">
                        <div class="mb-5 text-center">
                            <div class="inline-flex items-center gap-2">
                                <span class="inline-grid h-8 w-8 place-items-center rounded-full bg-primary/10">
                                    <i class="mdi mdi-account-key text-primary text-xl"></i>
                                </span>
                                <h2 class="text-lg font-bold text-gray-900">Sign In</h2>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Use your email and password</p>
                        </div>

                        <form @submit.prevent="onSubmit" class="space-y-4" novalidate>
                            <!-- honeypot -->
                            <input type="text" v-model="honeypot" class="hidden" tabindex="-1" autocomplete="off"
                                aria-hidden="true" />

                            <!-- Email -->
                            <div class="relative">
                                <label class="sr-only">Email</label>
                                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <i class="mdi mdi-email-outline text-gray-400 text-xl"></i>
                                </div>
                                <input
                                    class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                    type="email" required placeholder="Email" v-model.trim="email"
                                    autocomplete="email" />
                            </div>

                            <!-- Password -->
                            <div class="space-y-2">
                                <div class="relative">
                                    <label class="sr-only">Password</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-lock-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input :type="showPassword ? 'text' : 'password'"
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-11 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        required placeholder="Password" v-model="password" @keyup="detectCaps($event)"
                                        autocomplete="current-password" />
                                    <button type="button" @click="showPassword = !showPassword"
                                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                        <i
                                            :class="showPassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                                    </button>
                                </div>
                                <div v-if="capsOn" class="flex items-center gap-2 text-amber-600 text-xs">
                                    <i class="mdi mdi-alert"></i>
                                    <span>Caps Lock is ON</span>
                                </div>
                            </div>

                            <!-- reCAPTCHA status -->
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] text-gray-500 inline-flex items-center gap-1">
                                    <i class="mdi mdi-shield-check-outline"></i>
                                    Protected by reCAPTCHA Enterprise
                                </span>
                                <span class="text-[11px]" :class="recaptchaStatusClass">
                                    <i :class="recaptchaIconClass"></i>
                                    <span class="ml-1">{{ recaptchaStatusText }}</span>
                                </span>
                            </div>

                            <!-- Forgot password -->
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-700">&nbsp;</span>
                                <BaseButton small outline color="secondary" label="Forgot password?" @click="forgotPassword" />
                            </div>

                            <!-- Submit -->
                            <div class="pt-1">
                                <BaseButton color="primary" type="submit" :disabled="!canSubmit || auth.isLoading" label="Log In" class="w-full justify-center" />
                            </div>

                            <!-- Divider -->
                            <div class="relative my-4">
                                <div class="absolute inset-0 flex items-center">
                                    <span class="w-full border-t border-gray-200"></span>
                                </div>
                                <div class="relative flex justify-center text-xs">
                                    <span class="bg-white/80 px-2 text-gray-500">or continue with</span>
                                </div>
                            </div>

                            <!-- Google -->
                            <div>
                                <BaseButton color="primary" class="w-full justify-center" :disabled="auth.isLoading" label="Sign in with School Account" @click="signInWithSchoolAccount" />
                            </div>

                            <!-- Register -->
                            <div class="text-center text-xs mt-3">
                                <router-link to="/register" class="text-primary hover:underline">
                                    Don't have an account? <span class="font-semibold">Register</span>
                                </router-link>
                            </div>
                        </form>
                    </div>

                    <div class="px-6 sm:px-7 pb-6">
                        <div class="flex items-center justify-between text-[11px] text-gray-500">
                            <span>OSAS Kiosk v1.0</span>
                            <span>© {{ new Date().getFullYear() }} Student Services</span>
                        </div>
                    </div>
                </div>

                <div class="mt-6 text-center text-xs text-gray-300">
                    <p>By signing in, you agree to our Student Portal Guidelines.</p>
                </div>
            </div>
        </div>

        <ToasterComponent ref="toast" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import ToasterComponent from "../components/ToasterComponent.vue";
import BaseButton from "@/components/commons/BaseButton.vue";
import { useAuthStore } from "@/stores/auth";

defineOptions({ name: "LoginPage" });

const router = useRouter();
const auth = useAuthStore();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const capsOn = ref(false);
const honeypot = ref("");
const _ssoHandled = ref(false);

const recaptchaReady = ref(false);
const recaptchaError = ref("");
const toast = ref(null);

// Computed
const canSubmit = computed(() => email.value.trim().length > 0 && password.value.length > 0 && !honeypot.value);
const recaptchaStatusClass = computed(() => {
    if (recaptchaError.value) return "text-red-600";
    return recaptchaReady.value ? "text-green-700" : "text-gray-500";
});
const recaptchaIconClass = computed(() => {
    if (recaptchaError.value) return "mdi mdi-close-circle-outline";
    return recaptchaReady.value ? "mdi mdi-check-circle-outline" : "mdi mdi-dots-horizontal-circle-outline";
});
const recaptchaStatusText = computed(() => {
    if (recaptchaError.value) return "unavailable";
    return recaptchaReady.value ? "ready" : "initializing…";
});

// Methods
const detectCaps = (e) => {
    if (e.getModifierState) capsOn.value = e.getModifierState("CapsLock");
};

const forgotPassword = () => {
    toast.value.showToast("info", "Please contact support to reset your password.");
};

const onSubmit = async () => {
    if (honeypot.value) return;
    try {
        const captchaToken = await auth.getCaptchaToken("login");
        const res = await auth.login(email.value, password.value, captchaToken);

        if (res?.requiresVerification || auth.requiresVerification) {
            toast.value.showToast("info", "Please verify your email before logging in.");
            router.push({ name: "verify-prompt", query: { email: email.value } });
            return;
        }
        if (res?.requires2FA) return;

        toast.value.showToast("success", "Login successful!");
    } catch (error) {
        toast.value.showToast("warning", error.message || "Invalid login credentials!");
    }
};

const signInWithSchoolAccount = () => {
    try {
        auth.startGoogleLogin();
    } catch (e) {
        toast.value.showToast("warning", e.message || "Unable to start Google sign-in");
    }
};

const tryConsumeSso = ({ suppressToast = false } = {}) => {
    if (_ssoHandled.value) return;
    try {
        const consumed = auth.consumeSsoFromHash();
        if (consumed) {
            _ssoHandled.value = true;
            if (!suppressToast) toast.value?.showToast("success", "Signed in with school account");
        }
    } catch (e) {
        _ssoHandled.value = true;
        if (!suppressToast) toast.value?.showToast("warning", e.message || "Google sign-in failed");
    }
};

const checkRecaptchaReady = () => {
    try {
        const g = window.grecaptcha?.enterprise || window.grecaptcha;
        if (g?.ready) {
            g.ready(() => {
                recaptchaReady.value = true;
            });
        } else {
            setTimeout(checkRecaptchaReady, 600);
        }
    } catch (e) {
        recaptchaError.value = "not loaded";
    }
};

// Lifecycle
onMounted(() => {
    tryConsumeSso();
    nextTick(() => tryConsumeSso({ suppressToast: true }));
    checkRecaptchaReady();
});
</script>

<style scoped>
.loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--accent);
    border-radius: 50%;
    width: 42px;
    height: 42px;
    animation: spin 0.9s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
