<template>
  <footer class="bg-primary p-4 text-center text-white">
    <p class="text-sm">
      {{ currentYear }} &copy; DASIG – Dashboard for Academic Systems, Information & Governance
    </p>
    <p class="text-[11px] text-yellow-300 mt-1">“DASIG: Energizing Academic Leadership and Governance.”</p>
  </footer>
  </template>

<script setup>
const currentYear = new Date().getFullYear()
</script>
