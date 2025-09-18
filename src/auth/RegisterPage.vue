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

        <!-- Page-level loader removed; global overlay is used. -->

        <!-- Registration form -->
        <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-md">
                <div class="mb-6 text-center">
                    <a href="index.html" class="inline-flex items-center justify-center">
                        <img src="/images/logo.png" alt="OSAS" class="h-14 w-auto" />
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
                                    <i class="mdi mdi-account-plus text-primary text-xl"></i>
                                </span>
                                <h2 class="text-lg font-bold text-gray-900">Create Account</h2>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Fill in the details to register</p>
                        </div>

                        <form @submit.prevent="onSubmit" class="space-y-4" novalidate>
                            <!-- Honeypot -->
                            <input type="text" v-model="honeypot" class="hidden" tabindex="-1" autocomplete="off"
                                aria-hidden="true" />

                            <!-- Username -->
                            <div class="space-y-1">
                                <div class="relative">
                                    <label class="sr-only">Username</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-account-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        type="text" required placeholder="Username" v-model.trim="username"
                                        autocomplete="username" />
                                </div>
                                <p v-if="username && !usernameValid" class="text-xs text-rose-600">
                                    Username must be 4–20 characters and use letters, numbers, dot, underscore, or
                                    hyphen.
                                </p>
                            </div>

                            <!-- Email -->
                            <div class="space-y-1">
                                <div class="relative">
                                    <label class="sr-only">Email</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-email-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        type="email" required placeholder="Email (must be @knp.edu.ph)"
                                        v-model.trim="email" autocomplete="email" />
                                </div>
                                <p v-if="email && !validEmailDomain" class="text-xs text-rose-600">
                                    Email must end with @knp.edu.ph
                                </p>
                            </div>

                            <!-- First / Last name -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="space-y-1">
                                    <div class="relative">
                                        <label class="sr-only">First name</label>
                                        <div
                                            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <i class="mdi mdi-card-account-details-outline text-gray-400 text-xl"></i>
                                        </div>
                                        <input
                                            class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                            type="text" required placeholder="First name" v-model.trim="first_name"
                                            autocomplete="given-name" />
                                    </div>
                                    <p v-if="first_name === '' && triedSubmit" class="text-xs text-rose-600">
                                        First name is required.
                                    </p>
                                </div>

                                <div class="space-y-1">
                                    <div class="relative">
                                        <label class="sr-only">Last name</label>
                                        <div
                                            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <i class="mdi mdi-card-account-details text-gray-400 text-xl"></i>
                                        </div>
                                        <input
                                            class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                            type="text" required placeholder="Last name" v-model.trim="last_name"
                                            autocomplete="family-name" />
                                    </div>
                                    <p v-if="last_name === '' && triedSubmit" class="text-xs text-rose-600">
                                        Last name is required.
                                    </p>
                                </div>
                            </div>

                            <input type="hidden" v-model="role" />

                            <!-- Password -->
                            <div class="space-y-2">
                                <div class="relative">
                                    <label class="sr-only">Password</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-lock-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input :type="showPassword ? 'text' : 'password'"
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-11 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        required placeholder="Password" v-model="password"
                                        @keyup="capsOnPwd = detectCaps($event)" autocomplete="new-password"
                                        minlength="8" />
                                    <button type="button" @click="showPassword = !showPassword"
                                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                        <i
                                            :class="showPassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                                    </button>
                                </div>
                                <div v-if="capsOnPwd" class="flex items-center gap-2 text-amber-600 text-xs">
                                    <i class="mdi mdi-alert"></i>
                                    <span>Caps Lock is ON</span>
                                </div>
                                <p v-if="password && !passwordValid" class="text-xs text-rose-600">
                                    Password must be at least 8 characters and include letters and numbers.
                                </p>
                            </div>

                            <!-- Confirm Password -->
                            <div class="space-y-2">
                                <div class="relative">
                                    <label class="sr-only">Confirm Password</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-lock-check-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input :type="showConfirm ? 'text' : 'password'"
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-11 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        required placeholder="Confirm password" v-model="confirmPassword"
                                        @keyup="capsOnConfirm = detectCaps($event)" autocomplete="new-password"
                                        minlength="8" />
                                    <button type="button" @click="showConfirm = !showConfirm"
                                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                        <i :class="showConfirm ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                                    </button>
                                </div>
                                <div v-if="capsOnConfirm" class="flex items-center gap-2 text-amber-600 text-xs">
                                    <i class="mdi mdi-alert"></i>
                                    <span>Caps Lock is ON</span>
                                </div>
                                <p v-if="passwordsDontMatch" class="text-xs text-rose-600">Passwords do not match.</p>
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

                            <!-- Submit -->
                            <div class="pt-1">
                                <BaseButton color="primary" type="submit" :disabled="!canSubmit || auth.isLoading" label="Create Account" class="w-full justify-center" />
                            </div>

                            <!-- Divider -->
                            <div class="relative my-4">
                                <div class="absolute inset-0 flex items-center">
                                    <span class="w-full border-t border-gray-200"></span>
                                </div>
                                <div class="relative flex justify-center text-xs">
                                    <span class="bg-white/80 px-2 text-gray-500">or sign up with</span>
                                </div>
                            </div>

                            <!-- Google sign-up -->
                            <div>
                                <BaseButton color="primary" class="w-full justify-center" :disabled="auth.isLoading" label="Sign up with School Account" @click="signUpWithSchoolAccount" />
                            </div>

                            <!-- Link to login -->
                            <div class="text-center text-xs">
                                <router-link to="/login" class="text-primary hover:underline">
                                    Already have an account? Sign in
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
                    <p>By registering, you agree to our Student Portal Guidelines.</p>
                </div>
            </div>
        </div>

        <ToasterComponent ref="toast" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeMount, nextTick } from "vue";
import { useRouter } from "vue-router";
import ToasterComponent from "../components/ToasterComponent.vue";
import { useAuthStore } from "@/stores/auth";
import BaseButton from "@/components/commons/BaseButton.vue";

defineOptions({ name: "RegisterPage" });

const router = useRouter();
const auth = useAuthStore();

const username = ref("");
const email = ref("");
const first_name = ref("");
const last_name = ref("");
const role = ref("student");
const is_active = ref(0);
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirm = ref(false);
const capsOnPwd = ref(false);
const capsOnConfirm = ref(false);
const triedSubmit = ref(false);
const honeypot = ref("");
const recaptchaReady = ref(false);
const recaptchaError = ref("");
const toast = ref(null);

// Computed
const usernameValid = computed(() => /^[a-zA-Z0-9._-]{4,20}$/.test(username.value));
const validEmailDomain = computed(() => /@knp\.edu\.ph$/i.test(email.value));
const passwordValid = computed(() => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password.value));
const passwordsDontMatch = computed(() => password.value && confirmPassword.value && password.value !== confirmPassword.value);
const captchaAnswer = computed(() => captchaA.value + captchaB.value);
const captchaValid = computed(() => String(parseInt(captchaInput.value || "NaN", 10)) === String(captchaAnswer.value));
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
const canSubmit = computed(() => (
    usernameValid.value &&
    validEmailDomain.value &&
    first_name.value.trim().length > 0 &&
    last_name.value.trim().length > 0 &&
    passwordValid.value &&
    !passwordsDontMatch.value &&
    captchaValid.value &&
    !honeypot.value
));

// Methods
const detectCaps = (e) => e.getModifierState ? e.getModifierState("CapsLock") : false;

const genCaptcha = () => {
    const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    captchaA.value = r(10, 49);
    captchaB.value = r(10, 49);
    captchaInput.value = "";
    captchaError.value = "";
};

const onSubmit = async () => {
    triedSubmit.value = true;
    if (honeypot.value) return;
    if (!canSubmit.value) {
        if (!captchaValid.value) captchaError.value = "Incorrect captcha answer.";
        return;
    }
    captchaError.value = "";
    try {
        const payload = {
            username: username.value.trim(),
            email: email.value.trim(),
            password: password.value,
            role: role.value,
            is_active: is_active.value,
            first_name: first_name.value.trim(),
            last_name: last_name.value.trim(),
        };

        await auth.register(payload);

        toast.value.showToast("success", "Registration successful! Please sign in.");
        username.value = "";
        email.value = "";
        first_name.value = "";
        last_name.value = "";
        password.value = "";
        confirmPassword.value = "";
        captchaInput.value = "";
        triedSubmit.value = false;

        setTimeout(() => {
            router.push({ name: "login" });
        }, 500);
    } catch (error) {
        const msg = error?.message || "Registration failed";
        toast.value.showToast("warning", msg);
        genCaptcha();
    }
};

const signUpWithSchoolAccount = () => {
    try {
        auth.startGoogleLogin("#/register");
    } catch (e) {
        toast.value.showToast("warning", e.message || "Unable to start Google sign-up");
    }
};

const tryConsumeSso = () => {
    try {
        const consumed = auth.consumeSsoFromHash();
        if (consumed) toast.value?.showToast("success", "Signed up with school account");
    } catch (e) {
        toast.value?.showToast("warning", e.message || "Google sign-up failed");
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

onMounted(() => {
    tryConsumeSso();
    nextTick(() => tryConsumeSso());
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
