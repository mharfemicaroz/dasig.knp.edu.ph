<template>
  <router-link v-if="item?.to" :to="item.to" active-class="bg-tertiary" :class="linkClass">
    <BaseIcon :path="item.icon" :size="20" :cls="iconClass" />
    <span :class="labelClass">{{ item.label }}</span>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import BaseIcon from '@/components/commons/BaseIcon.vue'

const props = defineProps({ item: { type: Object, required: true }, collapsed: { type: Boolean, default: false } })

const linkClass = computed(() => [
  'flex items-center p-2 hover:bg-tertiary rounded transition-colors',
  props.collapsed ? 'justify-center' : ''
])
const iconClass = computed(() => props.collapsed ? 'text-yellow-300' : 'mr-2 text-yellow-300')
const labelClass = computed(() => props.collapsed ? 'hidden md:hidden' : '')
</script>
