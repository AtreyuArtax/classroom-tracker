<template>
  <BaseModal :show="show" title="User Guide & Getting Started" maxWidth="800px" @close="emit('close')">
    <GettingStartedGuide :show-mode-selector="false" />
  </BaseModal>
</template>

<script setup>
import BaseModal from '../BaseModal.vue'
import GettingStartedGuide from './GettingStartedGuide.vue'

defineProps({
  show: { type: Boolean, required: true }
})

const emit = defineEmits(['close'])
</script>
