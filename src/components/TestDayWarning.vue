<template>
  <div class="test-day-warning" :title="`Missed ${count} assessment/test days`">
    <CalendarX :size="11" />
    <span class="test-day-warning__count">{{ count }}</span>
  </div>
</template>

<script setup>
import { CalendarX } from 'lucide-vue-next'

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
  gap: 3px;
  padding: 1px 5px;
  border-radius: 10px;
  background-color: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.32);
  color: #d97706;
  font-size: 0.65rem;
  font-weight: 700;
  cursor: help;
  white-space: nowrap;
  line-height: 1;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.test-day-warning:hover {
  background-color: rgba(245, 158, 11, 0.24);
  border-color: rgba(245, 158, 11, 0.5);
}

.test-day-warning__count {
  font-variant-numeric: tabular-nums;
}
</style>
