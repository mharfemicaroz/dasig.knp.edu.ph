<template>
  <div class="flex justify-between items-center px-4 sm:px-6 py-3 bg-primary text-white">
    <!-- Left: menu toggle + logo -->
    <div class="flex items-center gap-3">
      <button class="focus:outline-none p-2 rounded hover:bg-white/10" @click="$emit('toggle')" aria-label="Toggle sidebar">
        <i :class="['mdi', open ? 'mdi-menu-open' : 'mdi-menu', 'text-white', 'text-2xl']"></i>
      </button>
      <div class="logo-box flex items-center gap-3">
        <a href="javascript:void(0)" class="flex items-center">
          <img src="/images/logo-banner.png" alt="DASIG" class="hidden md:block" width="158" height="45" />
          <img src="/images/logo-sm.png" alt="DASIG" class="block md:hidden" width="36" height="36" />
        </a>
        <span class="hidden lg:block text-sm leading-4 max-w-[18rem]">
          <span class="font-semibold">DASIG</span>
          <span class="opacity-90"> – Dashboard for Academic Systems, Information & Governance</span>
        </span>
      </div>
    </div>

    <!-- Right: account dropdown -->
    <nav class="relative flex items-center gap-2">
      <button
        class="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-transparent text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        @click="toggleDropdown" :aria-expanded="isOpen ? 'true' : 'false'">
        <div class="h-8 w-8 rounded-full overflow-hidden bg-gray-100 grid place-items-center ring-1 ring-gray-200">
          <img v-if="headerAvatar" :src="headerAvatar" alt="Avatar" class="h-full w-full object-cover" />
          <div v-else class="h-full w-full grid place-items-center text-gray-700 text-xs font-semibold">
            {{ initials(headerName) }}
          </div>
        </div>
        <span class="font-medium truncate max-w-[12rem] text-left hidden sm:block">{{ headerName }}</span>
        <i :class="['mdi', isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down', 'text-lg text-white/90']"></i>
      </button>

      <div v-if="isOpen" class="fixed inset-0 z-30" @click="isOpen = false"></div>

      <div v-if="isOpen" class="absolute right-0 top-full mt-2 z-40 w-64 sm:w-80">
        <div class="absolute right-4 sm:right-6 -top-2 h-3 w-3 rotate-45 bg-white ring-1 ring-black/5"></div>
        <div class="relative bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50">
            <div class="text-[11px] uppercase tracking-wide text-gray-500">Account</div>
          </div>

          <button class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50" @click="goToProfile">
            <div class="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
              <img v-if="avatarSrc" :src="avatarSrc" alt="avatar" class="h-full w-full object-cover" />
              <i v-else class="mdi mdi-account text-gray-400 text-xl"></i>
            </div>
            <div class="min-w-0 flex-1 text-left">
              <div class="text-sm font-medium truncate">See your profile</div>
              <div class="text-xs text-gray-500 truncate">{{ headerName }}</div>
            </div>
            <i class="mdi mdi-chevron-right text-gray-400"></i>
          </button>

          <div class="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <button
              class="w-full px-3 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2"
              @click="isOpen = false; $emit('request-logout')">
              <i class="mdi mdi-logout text-lg"></i>
              <span>Log out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'

defineEmits(['toggle','request-logout'])
defineProps({ avatarSrc: { type: String, default: '' }, open: { type: Boolean, default: true } })

const router = useRouter()
const auth = useAuthStore()
const users = useUserStore()

const isOpen = ref(false)
const toggleDropdown = () => { isOpen.value = !isOpen.value }

const headerName = computed(() => {
  const fn = auth.user?.first_name ?? ''
  const ln = auth.user?.last_name ?? ''
  const name = [fn, ln].filter(Boolean).join(' ')
  return name || (auth.user?.email || '')
})
const headerAvatar = computed(() => {
  const a = auth.user?.avatar
  if (!a) return ''
  if (typeof a === 'string') return a
  if (typeof a === 'object') return a.image || a.url || ''
  return ''
})

const initials = (name) => (String(name || '')).split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()
const goToProfile = () => { isOpen.value = false; router.push({ name: 'profile' }) }
</script>
