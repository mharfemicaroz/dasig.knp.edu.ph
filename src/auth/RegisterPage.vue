<template>
  <div class="min-h-screen relative overflow-hidden">
    <!-- Background layers -->
    <div class="absolute inset-0">
      <div class="h-full w-full bg-cover bg-center" :style="`background-image:url(/images/bg.jpg)`"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
      <div class="absolute inset-0 backdrop-blur-sm"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,.08),_transparent_40%),radial-gradient(circle_at_80%_0,_rgba(255,255,255,.06),_transparent_35%),radial-gradient(circle_at_50%_100%,_rgba(255,255,255,.05),_transparent_45%)]"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-lg">
        <div class="mb-8 text-center">
          <a class="inline-flex items-center justify-center">
            <img src="/images/logo.png" alt="DASIG" class="h-16 w-auto drop-shadow" />
          </a>
          <h1 class="mt-5 text-3xl font-extrabold tracking-tight text-white">Create Your DASIG Account</h1>
          <p class="mt-2 text-white/80 text-sm">Quick sign up with your institutional Google account.</p>
        </div>

        <div class="rounded-2xl bg-white/85 backdrop-blur-xl border border-white/40 shadow-2xl ring-1 ring-black/5">
          <div class="p-7">
            <div class="text-center mb-6">
              <h2 class="text-lg font-semibold text-gray-900">Sign up with Google</h2>
              <p class="text-xs text-gray-500 mt-1">Only <b>@knp.edu.ph</b> accounts are permitted.</p>
            </div>

            <div class="space-y-4">
              <button type="button" @click="signUpWithSchoolAccount"
                class="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-gray-300/80 bg-white/95 px-5 py-3 text-gray-900 hover:bg-white focus:outline-none focus:ring-4 focus:ring-primary/20 transition font-medium">
                <img src="/images/google.svg" class="h-5 w-5" alt="Google" />
                <span>Continue with Google</span>
              </button>

              <div class="flex items-center gap-2 text-[12px] text-gray-500 justify-center">
                <i class="mdi mdi-shield-check-outline"></i>
                <span>Protected by reCAPTCHA • <span :class="recaptchaStatusClass">{{ recaptchaStatusText }}</span></span>
              </div>
            </div>
          </div>

          <div class="px-7 pb-6">
            <div class="text-[11px] text-gray-600 leading-relaxed">
              <p class="mb-2">Click Continue to be redirected to Google. After confirming your KNP account, you will be returned to DASIG and signed in automatically.</p>
              <ul class="list-disc pl-5 space-y-1">
                <li>Use your official <b>@knp.edu.ph</b> email</li>
                <li>Do not share your account</li>
                <li>Need help? Contact IT support</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mt-6 text-center text-xs text-gray-300">
          <p>Already registered? <router-link to="/login" class="text-white/90 underline underline-offset-2">Sign in</router-link></p>
        </div>

        <ToasterComponent ref="toast" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import ToasterComponent from '@/components/ToasterComponent.vue'
import { useAuthStore } from '@/stores/auth'

defineOptions({ name: 'RegisterPage' })

const router = useRouter()
const auth = useAuthStore()
const toast = ref(null)

// reCAPTCHA status display (informational only)
const recaptchaReady = ref(false)
const recaptchaError = ref('')
const recaptchaStatusClass = computed(() => {
  if (recaptchaError.value) return 'text-red-600'
  return recaptchaReady.value ? 'text-green-700' : 'text-gray-500'
})
const recaptchaStatusText = computed(() => {
  if (recaptchaError.value) return 'unavailable'
  return recaptchaReady.value ? 'ready' : 'initializing…'
})

const signUpWithSchoolAccount = () => {
  try {
    auth.startGoogleLogin('#/register')
  } catch (e) {
    toast.value?.showToast('warning', e?.message || 'Unable to start Google sign-up')
  }
}

const tryConsumeSso = () => {
  try {
    const consumed = auth.consumeSsoFromHash()
    if (consumed) toast.value?.showToast('success', 'Signed up with school account')
  } catch (e) {
    toast.value?.showToast('warning', e?.message || 'Google sign-up failed')
  }
}

const checkRecaptchaReady = () => {
  try {
    const g = window.grecaptcha?.enterprise || window.grecaptcha
    if (g?.ready) {
      g.ready(() => { recaptchaReady.value = true })
    } else {
      setTimeout(checkRecaptchaReady, 600)
    }
  } catch (e) {
    recaptchaError.value = 'not loaded'
  }
}

onMounted(() => {
  tryConsumeSso()
  nextTick(() => tryConsumeSso())
  checkRecaptchaReady()
})
</script>

<style scoped>
/* additional accents if needed */
</style>

