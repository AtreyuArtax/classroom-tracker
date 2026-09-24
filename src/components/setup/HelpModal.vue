<template>
  <BaseModal :show="show" title="User Guide & Getting Started" maxWidth="860px" @close="emit('close')">
    <GettingStartedGuide :show-mode-selector="false" :initial-tab="initialTab" />
  </BaseModal>
</template>

<script setup>
import BaseModal from '../BaseModal.vue'
import GettingStartedGuide from './GettingStartedGuide.vue'

defineProps({
  show: { type: Boolean, required: true },
  initialTab: { type: String, default: 'quickstart' }
})

const emit = defineEmits(['close'])
</script>
