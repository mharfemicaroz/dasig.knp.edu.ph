<script setup>
import { mdiCog } from '@mdi/js'
import { useSlots, computed } from 'vue'
import BaseIcon from '@/components/commons/BaseIcon.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import IconRounded from '@/components/commons/IconRounded.vue'

defineProps({
    icon: { type: String, default: null },
    title: { type: String, required: true },
    main: Boolean
})

const hasSlot = computed(() => useSlots().default)
</script>

<template>
    <!-- Full-bleed, no gaps/padding; auto-wrap when space runs out -->
    <section class="w-full m-0 mb-2 p-0 flex flex-wrap items-center justify-between gap-0">
        <div class="flex items-center m-0 p-0">
            <IconRounded v-if="icon && main" :icon="icon" color="light" bg />
            <BaseIcon v-else-if="icon" :path="icon" size="20" />
            <h1 :class="main ? 'text-3xl' : 'text-2xl'" class="leading-tight m-0 p-0">
                {{ title }}
            </h1>
        </div>

        <!-- Actions: no spacing; wraps to a new line automatically when not enough width -->
        <div class="flex flex-row flex-wrap m-0 p-0 gap-0 w-full sm:w-auto justify-start sm:justify-end">
            <slot>
                <BaseButton :icon="mdiCog" color="whiteDark" />
            </slot>
        </div>
    </section>
</template>
