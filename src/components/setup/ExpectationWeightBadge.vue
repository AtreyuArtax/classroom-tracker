<template>
  <span 
    v-if="shouldRender" 
    class="exp-weight-badge" 
    :class="[
      tierClass,
      { 'exp-weight-badge--compact': compact }
    ]"
    :title="tooltipText"
  >
    <Scale v-if="showIcon" :size="compact ? 10 : 11" class="exp-weight-icon" />
    <span class="exp-weight-text">{{ displayLabel }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { Scale } from 'lucide-vue-next'

const props = defineProps({
  weight: {
    type: [Number, String],
    default: 1.0
  },
  showDefault: {
    type: Boolean,
    default: false
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const numWeight = computed(() => {
  const n = Number(props.weight)
  return isNaN(n) ? 1.0 : Math.max(0, n)
})

const shouldRender = computed(() => {
  if (props.showDefault) return true
  return numWeight.value !== 1.0
})

const tierClass = computed(() => {
  const w = numWeight.value
  if (w === 0) return 'exp-weight-badge--zero'
  if (w > 1.0) return 'exp-weight-badge--high'
  if (w < 1.0) return 'exp-weight-badge--low'
  return 'exp-weight-badge--default'
})

const displayLabel = computed(() => {
  const w = numWeight.value
  if (w === 0) return '0× (Diag)'
  // Format nicely (e.g. 2x instead of 2.0x, but 1.5x for fractions)
  const formatted = (w % 1 === 0) ? w.toString() : w.toFixed(1)
  return `${formatted}×`
})

const tooltipText = computed(() => {
  const w = numWeight.value
  if (w === 0) {
    return 'Weight: 0x (Diagnostic / Formative only • Excluded from overall course mastery)'
  }
  if (w > 1.0) {
    return `Weight: ${w}x (High Priority standard • Counts ${w}x toward overall course mastery)`
  }
  if (w < 1.0) {
    return `Weight: ${w}x (Minor standard • Counts ${w}x toward overall course mastery)`
  }
  return 'Weight: 1.0x (Standard priority)'
})
</script>

<style scoped>
.exp-weight-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  letter-spacing: 0.2px;
  user-select: none;
  transition: all 0.15s ease;
}

.exp-weight-badge--compact {
  padding: 0 4px;
  font-size: 10px;
  gap: 2px;
}

.exp-weight-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

/* High Priority (weight > 1): Purple / Indigo */
.exp-weight-badge--high {
  background: rgba(99, 102, 241, 0.14);
  border: 1px solid rgba(99, 102, 241, 0.38);
  color: #818cf8;
}

/* Low Priority (0 < weight < 1): Amber */
.exp-weight-badge--low {
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.38);
  color: #fbbf24;
}

/* Zero Weight (weight == 0): Gray / Slate */
.exp-weight-badge--zero {
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #94a3b8;
}

/* Default (weight == 1): Subtle Slate */
.exp-weight-badge--default {
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
</style>
