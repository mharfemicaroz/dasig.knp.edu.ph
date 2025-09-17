<!-- src/components/commons/Badge.vue -->
<script setup>
const props = defineProps({
    text: { type: String, required: true },
    tone: { type: String, default: 'gray' }, // blue | indigo | emerald | red | gray | amber
})
const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    gray: 'bg-gray-100 text-gray-700 ring-gray-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
}
</script>

<template>
    <span class="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ring-1"
        :class="tones[tone] || tones.gray">
        {{ text }}
    </span>
</template>
