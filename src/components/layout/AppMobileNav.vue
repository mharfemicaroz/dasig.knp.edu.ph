<template>
  <div v-if="show" class="md:hidden border-b bg-white">
    <nav class="px-4 py-2 space-x-4">
      <router-link v-if="!hasNoDeptUser" class="text-sm text-primary hover:underline" :to="{ name: 'dashboard' }">Dashboard</router-link>
      <router-link class="text-sm text-primary hover:underline" :to="{ name: 'profile' }">Profile</router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import userService from '@/services/user/userService'

defineProps({ show: { type: Boolean, default: false } })

const auth = useAuthStore()
const baseRole = computed(() => String(auth.user?.role || '').toLowerCase())
const isAdmin = computed(() => baseRole.value === 'admin')
const memberships = ref([])
onMounted(async () => {
  try {
    if (!isAdmin.value && auth.user?.id) {
      memberships.value = await userService.getDepartments(auth.user.id)
    }
  } catch { memberships.value = [] }
})
const hasNoDeptUser = computed(() => baseRole.value === 'user' && (!Array.isArray(memberships.value) || memberships.value.length === 0))
</script>
