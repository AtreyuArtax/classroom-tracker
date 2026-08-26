<template>
  <div class="test-day-dot" aria-label="Missed assessment days">
    <span class="test-day-dot__circle"></span>
    <span class="test-day-dot__count">{{ count }}</span>
  </div>
</template>

<script setup>
defineProps({
  count: {
    type: Number,
    required: true
  }
})
</script>

<style scoped>
.test-day-dot {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #b45309;
  white-space: nowrap;
  line-height: 1;
  flex-shrink: 0;
  padding: 1px 4px;
  border-radius: 4px;
  pointer-events: none; /* Allows the entire student cell to handle hover & click cleanly */
}

.test-day-dot__circle {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #f59e0b;
  box-shadow: 0 0 0 1.5px rgba(245, 158, 11, 0.25);
  flex-shrink: 0;
  display: inline-block;
}

.test-day-dot__count {
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #b45309;
}
</style>
