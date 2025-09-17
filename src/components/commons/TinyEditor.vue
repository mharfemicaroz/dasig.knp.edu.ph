<script setup>
import Editor from '@tinymce/tinymce-vue'
import { computed } from 'vue'

const props = defineProps({
  id: { type: String, default: undefined },
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  height: { type: [Number, String], default: 180 },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const init = {
  menubar: false,
  plugins: 'lists link fullscreen table code autoresize',
  toolbar:
    'undo redo | bold italic underline | bullist numlist | link | alignleft aligncenter alignright | table | code | fullscreen',
  branding: false,
  statusbar: false,
  autoresize_bottom_margin: 16,
  placeholder: props.placeholder,
  license_key: 'gpl',
  content_style: 'body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 14px; }',
}
</script>

<template>
  <Editor v-model="value" :init="init" :disabled="disabled" :tag-name="'div'" :tinymce-script-src="`/tinymce/tinymce.min.js`" licenseKey="gpl" :api-key="'no-api-key'" :id="id" :inline="false" :cloud-channel="'6'" :output-format="'html'" :style="{ minHeight: typeof height==='number' ? height+'px' : String(height) }" />
  
</template>
