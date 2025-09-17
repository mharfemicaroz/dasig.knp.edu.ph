<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" class="shrink-0" :class="cls" aria-hidden="true" focusable="false">
    <path :d="path" fill="currentColor" />
  </svg>
</template>

<script setup>
defineProps({ path: { type: String, required: true }, size: { type: [Number, String], default: 20 }, cls: { type: [String, Array, Object], default: 'text-white-300' } })
</script>

