<template>
  <ul>
    <li v-for="(item, i) in menu" :key="i" class="mb-2">
      <NavbarItem :item="item" :collapsed="collapsed" />
    </li>
  </ul>
  
  </template>

<script setup>
import NavbarItem from './NavbarItem.vue'
defineProps({ 
  menu: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false }
})
</script>
