<template>
  <div class="stat-card" :class="[`stat-card--${color}`]">
    <div class="stat-card__main">
      <div class="stat-card__header">
        <div class="stat-card__icon-wrapper">
          <slot name="icon">
            <component :is="icon" v-if="icon" :size="13" />
          </slot>
        </div>
        <span class="stat-card__label">{{ label }}</span>
        <component :is="alertIcon" v-if="alertIcon" :size="12" class="stat-card__alert-icon" />
      </div>

      <div class="stat-card__value-group">
        <span class="stat-card__value">{{ value }}</span>
        <span v-if="value2" class="stat-card__value-sep">·</span>
        <span v-if="value2" class="stat-card__value2">{{ value2 }}</span>
        <span v-if="trend !== undefined && !value2" class="stat-card__trend" :class="trendClass">
          <TrendingUp v-if="trend > 0" :size="11" />
          <TrendingDown v-if="trend < 0" :size="11" />
          {{ Math.abs(trend) }}%
        </span>
      </div>
    </div>

    <div v-if="subValue || subValue2" class="stat-card__sub-group">
      <span v-if="subValue" class="stat-card__sub-value">{{ subValue }}</span>
      <span v-if="subValue2" class="stat-card__sub-value">{{ subValue2 }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'

const props = defineProps({
  label:     { type: String, required: true },
  value:     { type: [String, Number], required: true },
  subValue:  { type: String, default: null },
  value2:    { type: [String, Number], default: null },
  subValue2: { type: String, default: null },
  icon:      { type: [Object, Function], default: null },
  alertIcon: { type: [Object, Function], default: null },
  color:     { type: String, default: 'neutral' },
  trend:     { type: Number, default: undefined }
})

const trendClass = computed(() => {
  if (!props.trend) return ''
  return props.trend > 0 ? 'stat-card__trend--up' : 'stat-card__trend--down'
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  min-height: 42px;
  min-width: 0;
  overflow: hidden;
}

.stat-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.stat-card__main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.stat-card__header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-card__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card__label {
  font-size: 0.675rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.stat-card__alert-icon {
  color: #ff3b30;
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.stat-card__value-group {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-card__value {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.stat-card__value-sep {
  color: var(--border);
  font-size: 0.8rem;
}

.stat-card__value2 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.stat-card__sub-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.stat-card__sub-value {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary);
  line-height: 1.1;
  white-space: nowrap;
}

.stat-card__trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.675rem;
  font-weight: 700;
}

.stat-card__trend--up { color: var(--state-safe); }
.stat-card__trend--down { color: var(--state-danger); }

/* Color variants for header icons */
.stat-card--neutral .stat-card__icon-wrapper { color: var(--text-secondary); }
.stat-card--primary .stat-card__icon-wrapper { color: var(--primary); }
.stat-card--success .stat-card__icon-wrapper { color: #34c759; }
.stat-card--warning .stat-card__icon-wrapper { color: #ff9500; }
.stat-card--danger  .stat-card__icon-wrapper { color: #ff3b30; }
</style>
