// stores/loading.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Global loading state controlled by axios interceptors
export const useLoadingStore = defineStore('loading', () => {
  const pending = ref(0)

  // internal timestamps for UI smoothing (optional usage by component)
  const lastShowAt = ref(0)

  const isLoading = computed(() => pending.value > 0)

  function start() {
    pending.value += 1
    if (pending.value === 1) {
      lastShowAt.value = Date.now()
    }
  }

  function stop() {
    if (pending.value > 0) pending.value -= 1
    if (pending.value === 0) {
      // no-op: component decides min visible duration
    }
  }

  function reset() {
    pending.value = 0
  }

  return { pending, isLoading, lastShowAt, start, stop, reset }
})

