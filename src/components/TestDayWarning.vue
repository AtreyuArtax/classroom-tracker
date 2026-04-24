<template>
  <div class="test-day-warning" :title="`Warning: Missed ${count} Assessment Days`">
    <AlertTriangle :size="14" />
  </div>
</template>

<script setup>
import { AlertTriangle } from 'lucide-vue-next'

defineProps({
  count: {
    type: Number,
    required: true
  }
})
</script>

<style scoped>
.test-day-warning {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ff3b30;
  margin-left: 6px;
  cursor: help;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.test-day-warning:hover {
  opacity: 1;
}
</style>
