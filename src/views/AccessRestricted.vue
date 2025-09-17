<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'

const route = useRoute()
const router = useRouter()
const seconds = ref(2)
const fallback = typeof route.query?.to === 'string' && route.query.to ? String(route.query.to) : 'dashboard'

onMounted(() => {
  try {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: 'Access restricted',
      text: 'You do not have permission to view that page.',
      showConfirmButton: false,
      timer: 1800,
    })
  } catch {}

  const t = setInterval(() => {
    seconds.value = Math.max(0, seconds.value - 1)
    if (seconds.value <= 0) {
      clearInterval(t)
      router.replace({ name: fallback })
    }
  }, 1000)
})
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <div class="rounded-2xl border bg-white p-6 max-w-2xl mx-auto text-center">
        <div class="text-lg font-semibold text-gray-800 mb-2">Access restricted</div>
        <div class="text-sm text-gray-600 mb-4">You do not have permission to view this page.</div>
        <div class="text-sm text-gray-500">Redirecting in {{ seconds }}s…</div>
        <div class="mt-4">
          <router-link class="text-primary hover:underline text-sm" :to="{ name: fallback }">Go now</router-link>
        </div>
      </div>
    </SectionMain>
  </LayoutAuthenticated>
  
</template>

