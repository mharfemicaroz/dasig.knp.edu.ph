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

        <!-- Loading overlay -->
        <div v-if="auth.isLoading" class="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-md">
            <div class="loader"></div>
        </div>

        <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-md">
                <div class="mb-6 text-center">
                    <img src="/images/logo.png" alt="OSAS" class="h-14 w-auto mx-auto" />
                    <h1 class="mt-4 text-2xl font-extrabold tracking-wide text-white">
                        DASIG – Dashboard for Academic Systems, Information & Governance
                    </h1>
                    <p class="mt-1 text-primary-text/90 text-sm">“DASIG: Energizing Academic Leadership and Governance.”</p>
                </div>

                <div
                    class="group rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl ring-1 ring-black/5 transition">
                    <div class="p-6 sm:p-7 text-center">
                        <div v-if="state === 'success'" class="space-y-3">
                            <div
                                class="inline-grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 mx-auto">
                                <i class="mdi mdi-check-decagram text-3xl text-emerald-600"></i>
                            </div>
                            <h2 class="text-lg font-bold text-gray-900">Your email is verified!</h2>
                            <p class="text-sm text-gray-600">Redirecting to login in {{ countdown }}s…</p>
                            <BaseButton class="mt-2" color="primary" label="Go to Login now" @click="goLogin" />
                        </div>

                        <div v-else-if="state === 'error'" class="space-y-3">
                            <div class="inline-grid h-12 w-12 place-items-center rounded-full bg-rose-500/10 mx-auto">
                                <i class="mdi mdi-alert-circle-outline text-3xl text-rose-600"></i>
                            </div>
                            <h2 class="text-lg font-bold text-gray-900">Verification failed</h2>
                            <p class="text-sm text-gray-600">{{ errorMsg || 'The link may be invalid or expired.' }}</p>
                            <BaseButton class="mt-2" color="secondary" outline label="Try again" @click="retry" />
                            <BaseButton class="mt-2 ml-2" color="primary" label="Back to Login" @click="goLogin" />
                        </div>

                        <div v-else class="space-y-3">
                            <div class="inline-grid h-12 w-12 place-items-center rounded-full bg-primary/10 mx-auto">
                                <i class="mdi mdi-email-check-outline text-3xl text-primary"></i>
                            </div>
                            <h2 class="text-lg font-bold text-gray-900">Verifying your email…</h2>
                            <p class="text-sm text-gray-600">Please wait a moment.</p>
                        </div>
                    </div>

                    <div class="px-6 sm:px-7 pb-6">
                        <div class="flex items-center justify-between text-[11px] text-gray-500">
                            <span>OSAS Kiosk v1.0</span>
                            <span>© {{ new Date().getFullYear() }} Student Services</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <ToasterComponent ref="toast" />
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import ToasterComponent from "@/components/ToasterComponent.vue";
import BaseButton from "@/components/commons/BaseButton.vue";

defineOptions({ name: "VerifyingNow" });

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const state = ref("loading"); // 'loading' | 'success' | 'error'
const countdown = ref(3);
let tHandle = null;
const errorMsg = ref("");

const toast = ref(null);

const token = computed(() => String(route.query.token || ""));

const startCountdown = () => {
    tHandle = setInterval(() => {
        if (countdown.value > 0) countdown.value -= 1;
        if (countdown.value === 0) {
            clearInterval(tHandle);
            goLogin();
        }
    }, 1000);
};

const goLogin = () => {
    router.replace({ name: "login" });
};

const verify = async () => {
    if (!token.value) {
        state.value = "error";
        errorMsg.value = "Missing verification token.";
        return;
    }
    try {
        await auth.verifyEmail(token.value); // GET /auth/verify-email?token=...
        state.value = "success";
        toast.value?.showToast?.("success", "Email verified!");
        startCountdown();
    } catch (e) {
        state.value = "error";
        errorMsg.value = e?.message || "Verification failed.";
        toast.value?.showToast?.("warning", errorMsg.value);
    }
};

const retry = () => {
    state.value = "loading";
    errorMsg.value = "";
    verify();
};

onMounted(() => {
    verify();
});

onUnmounted(() => {
    if (tHandle) clearInterval(tHandle);
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
