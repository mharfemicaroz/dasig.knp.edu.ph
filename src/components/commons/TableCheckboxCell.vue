<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
    type: {
        type: String,
        default: 'td'
    },
    modelValue: Boolean // Allow external control of checked state
})

const emit = defineEmits(['update:modelValue'])

const checked = ref(props.modelValue)

watch(checked, (newVal) => {
    emit('update:modelValue', newVal) // Sync with parent component
})

// Watch for external updates to modelValue
watch(
    () => props.modelValue,
    (newVal) => {
        checked.value = newVal
    }
)
</script>

<template>
    <component :is="type" class="lg:w-1">
        <label class="checkbox">
            <input v-model="checked" type="checkbox" />
            <span class="check" />
        </label>
    </component>
</template>
