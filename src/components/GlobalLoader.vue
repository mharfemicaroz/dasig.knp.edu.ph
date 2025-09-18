<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useLoading } from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import { useLoadingStore } from '@/stores/loading'

// Single, full-page loader instance bound to global loading store
const store = useLoadingStore()
const $loading = useLoading()
const instance = ref(null)

// Debounce show to avoid flicker on very fast requests
const showDelayMs = 150
const minVisibleMs = 350
let showTimer = null

function clearShowTimer() {
  if (showTimer) { clearTimeout(showTimer); showTimer = null }
}

function showOverlay() {
  if (instance.value) return
  instance.value = $loading.show({
    isFullPage: true,
    canCancel: false,
    color: '#3b82f6',
    loader: 'bars',
    opacity: 0.25,
    backgroundColor: '#000'
  })
}

function hideOverlay() {
  if (!instance.value) return
  instance.value.hide()
  instance.value = null
}

watch(() => store.isLoading, (val) => {
  if (val) {
    // schedule show with delay; if more requests arrive, the delay still applies once
    clearShowTimer()
    const elapsed = Date.now() - (store.lastShowAt || 0)
    // If we just hid and immediately show again, still honor delay
    const wait = showDelayMs
    showTimer = setTimeout(() => {
      showOverlay()
    }, wait)
  } else {
    // ensure min visible duration once shown
    clearShowTimer()
    if (!instance.value) return
    const visibleFor = Date.now() - (store.lastShowAt || 0)
    const remaining = Math.max(0, minVisibleMs - visibleFor)
    if (remaining > 0) {
      setTimeout(() => hideOverlay(), remaining)
    } else {
      hideOverlay()
    }
  }
}, { immediate: false })

onBeforeUnmount(() => {
  clearShowTimer()
  hideOverlay()
})
</script>

<template>
  <!-- No template content; overlay is programmatic and full-page -->
  <span style="display:none" />
  
</template>

