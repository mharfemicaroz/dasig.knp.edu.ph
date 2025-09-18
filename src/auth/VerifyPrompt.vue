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

        <!-- Global loading -->
        <div v-if="auth.isLoading" class="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-md">
            <div class="loader"></div>
        </div>

        <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-md">
                <!-- Header -->
                <div class="mb-6 text-center">
                    <a href="index.html" class="inline-flex items-center justify-center">
                        <img src="/images/logo.png" alt="DASIG" class="h-14 w-auto" />
                    </a>
                    <h1 class="mt-4 text-2xl font-extrabold tracking-wide text-white">
                        Office of Student Affairs & Services
                    </h1>
                    <p class="mt-1 text-primary-text/90 text-sm">Serve. Support. Empower.</p>
                </div>

                <!-- Card -->
                <div
                    class="group rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl ring-1 ring-black/5 hover:ring-black/10 transition">
                    <div class="p-6 sm:p-7">
                        <div class="mb-5 text-center">
                            <div class="inline-flex items-center gap-2">
                                <span class="inline-grid h-8 w-8 place-items-center rounded-full bg-primary/10">
                                    <i class="mdi mdi-email-check-outline text-primary text-xl"></i>
                                </span>
                                <h2 class="text-lg font-bold text-gray-900">Verify your email</h2>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">We sent a verification link to</p>
                            <p class="mt-1 text-sm font-semibold text-gray-800">{{ displayEmail }}</p>
                        </div>

                        <div class="space-y-3">
                            <BaseButton color="primary" class="w-full justify-center"
                                :disabled="!displayEmail || cooldown > 0 || auth.isLoading"
                                :label="cooldown === 0 ? 'Resend verification email' : `Resend in ${cooldown}s'"
                                @click="onResend" />

                            <BaseButton type="button" color="info" class="w-full justify-center" label="Open my inbox"
                                @click="openInbox" />
                        </div>

                        <div class="mt-4 text-xs text-gray-600 space-y-1 text-center">
                            <p>Didn’t get the email? Check your spam folder or try resending.</p>
                            <p>
                                Entered the wrong email?
                                <router-link class="text-primary hover:underline font-semibold"
                                    :to="{ name: 'login' }">Go back to Login</router-link>
                                to try again.
                            </p>
                        </div>
                    </div>

                    <div class="px-6 sm:px-7 pb-6">
                        <div class="flex items-center justify-between text-[11px] text-gray-500">
                            <span>DASIG</span>
                            <span>© {{ new Date().getFullYear() }} Student Services</span>
                        </div>
                    </div>
                </div>

                <div class="mt-6 text-center text-xs text-gray-300">
                    <p>After verifying, return to the app and log in.</p>
                </div>
            </div>
        </div>

        <ToasterComponent ref="toast" />
    </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import ToasterComponent from "@/components/ToasterComponent.vue";
import BaseButton from "@/components/commons/BaseButton.vue";

defineOptions({ name: "VerifyPrompt" });

const auth = useAuthStore();
const route = useRoute();
const toast = ref(null);

const cooldown = ref(0);
let cooldownTimer = null;

const displayEmail = computed(() => {
    return route.query.email || auth.user?.email || "";
});

async function onResend() {
    if (!displayEmail.value) {
        toast.value?.showToast("warning", "No email found. Please go back and enter your email.");
        return;
    }
    try {
        await auth.resendVerification(displayEmail.value);
        toast.value?.showToast("success", "Verification email sent. Please check your inbox.");
        startCooldown(30);
    } catch (e) {
        toast.value?.showToast("warning", e.message || "Failed to resend verification email.");
    }
}

function openInbox() {
    window.open("https://mail.google.com/", "_blank", "noopener");
}

function startCooldown(seconds) {
    cooldown.value = seconds;
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
        if (cooldown.value > 0) cooldown.value -= 1;
        if (cooldown.value === 0) clearInterval(cooldownTimer);
    }, 1000);
}

onUnmounted(() => {
    if (cooldownTimer) clearInterval(cooldownTimer);
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
