<template>
    <div class="min-h-screen relative overflow-hidden">
        <!-- Background -->
        <div class="absolute inset-0">
            <div class="h-full w-full bg-cover bg-center" :style="`background-image:url(/images/bg.jpg)`"></div>
            <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
            <div class="absolute inset-0 backdrop-blur-sm"></div>
            <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,.08),_transparent_40%),radial-gradient(circle_at_80%_0,_rgba(255,255,255,.06),_transparent_35%),radial-gradient(circle_at_50%_100%,_rgba(255,255,255,.05),_transparent_45%)]">
            </div>
        </div>

        <!-- Loader -->
        <div v-if="auth.isLoading || verifying"
            class="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-md">
            <div class="loader"></div>
        </div>

        <!-- Content -->
        <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-md">
                <!-- Header -->
                <div class="mb-6 text-center">
                    <a href="index.html" class="inline-flex items-center justify-center">
                        <img src="/images/logo.png" alt="DASIG" class="h-14 w-auto" />
                    </a>
                    <h1 class="mt-4 text-2xl font-extrabold tracking-wide text-white">
                        DASIG – Dashboard for Academic Systems, Information & Governance
                    </h1>
                    <p class="mt-1 text-primary-text/90 text-sm">“DASIG: Energizing Academic Leadership and Governance.”
                    </p>
                </div>

                <!-- Card -->
                <div
                    class="group rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl ring-1 ring-black/5 hover:ring-black/10 transition">
                    <div class="p-6 sm:p-7">
                        <!-- Info -->
                        <div class="mb-5 text-center">
                            <div class="inline-flex items-center gap-2">
                                <span class="inline-grid h-8 w-8 place-items-center rounded-full bg-primary/10">
                                    <i class="mdi mdi-email-check-outline text-primary text-xl"></i>
                                </span>
                                <h2 class="text-lg font-bold text-gray-900">Verify Email</h2>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">We sent a verification link to your email</p>
                        </div>

                        <!-- Success -->
                        <div v-if="status === 'success'"
                            class="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">
                            <div class="flex items-center gap-2">
                                <i class="mdi mdi-check-circle-outline text-lg"></i>
                                <span>Your email has been verified. You can now sign in.</span>
                            </div>
                            <BaseButton color="primary" class="mt-3 w-full justify-center" label="Go to Login"
                                @click="goLogin" />
                        </div>

                        <!-- Error -->
                        <div v-else-if="status === 'error'"
                            class="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 p-3 text-sm">
                            <div class="flex items-center gap-2">
                                <i class="mdi mdi-alert-circle-outline text-lg"></i>
                                <span>The verification link is invalid or expired. You can request a new one
                                    below.</span>
                            </div>
                        </div>

                        <!-- Idle -->
                        <div v-else class="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 p-3 text-sm">
                            <div class="flex items-center gap-2">
                                <i class="mdi mdi-timer-sand-empty text-lg"></i>
                                <span>Waiting for verification. If you didn’t receive the email, resend below.</span>
                            </div>
                        </div>

                        <!-- Form -->
                        <form @submit.prevent="onResend" class="space-y-3 mt-5">
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

                            <BaseButton color="primary" class="w-full justify-center" type="submit"
                                :disabled="!canSubmit || auth.isLoading || verifying"
                                label="Resend Verification Email" />

                            <BaseButton type="button" color="secondary" outline class="w-full justify-center"
                                label="Back to Login" @click="goLogin" />
                        </form>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 sm:px-7 pb-6">
                        <div class="flex items-center justify-between text-[11px] text-gray-500">
                            <span>DASIG Kiosk v1.0</span>
                            <span>© {{ new Date().getFullYear() }} Student Services</span>
                        </div>
                    </div>
                </div>

                <!-- Bottom text -->
                <div class="mt-6 text-center text-xs text-gray-300">
                    <p>By continuing, you agree to our Student Portal Guidelines.</p>
                </div>
            </div>
        </div>

        <ToasterComponent ref="toast" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import ToasterComponent from "../components/ToasterComponent.vue";
import BaseButton from "@/components/commons/BaseButton.vue";

// Refs
const toast = ref(null);
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

// State
const email = ref(route.query.email || "");
const status = ref("idle");
const verifying = ref(false);

// Computed
const canSubmit = computed(() => email.value.trim().length > 0);

// Methods
const goLogin = () => {
    router.push({ name: "login" });
};

const onResend = async () => {
    try {
        await auth.resendVerification(email.value);
        toast.value?.showToast("info", "Verification email sent. Please check your inbox.");
    } catch (e) {
        toast.value?.showToast("warning", e.message || "Failed to resend verification email.");
    }
};

// Lifecycle
onMounted(async () => {
    const token = route.query.token;
    if (token) {
        try {
            verifying.value = true;
            await auth.verifyEmail(token);
            status.value = "success";
            toast.value?.showToast("success", "Email verified successfully.");
        } catch (e) {
            status.value = "error";
            toast.value?.showToast("warning", e.message || "Verification link invalid or expired.");
        } finally {
            verifying.value = false;
        }
    } else if (route.query.email) {
        status.value = "idle";
    }
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
