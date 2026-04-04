<template>
  <div class="stat-card" :class="[`stat-card--${color}`]">
    <div class="stat-card__icon-wrapper">
      <slot name="icon">
        <component :is="icon" v-if="icon" :size="16" />
      </slot>
    </div>
    
    <div class="stat-card__content" :class="{ 'stat-card__content--dual': value2 }">
      <div class="stat-card__label-row">
        <span class="stat-card__label">{{ label }}</span>
        <component :is="alertIcon" v-if="alertIcon" :size="14" class="stat-card__alert-icon" />
      </div>
      
      <div class="stat-card__stats-row">
        <!-- Primary Column -->
        <div class="stat-card__stat-col">
          <div class="stat-card__value-row">
            <span class="stat-card__value">{{ value }}</span>
            <span v-if="trend !== undefined && !value2" class="stat-card__trend" :class="trendClass">
              <TrendingUp v-if="trend > 0" :size="14" />
              <TrendingDown v-if="trend < 0" :size="14" />
              {{ Math.abs(trend) }}%
            </span>
          </div>
          <div v-if="subValue" class="stat-card__sub-value">{{ subValue }}</div>
        </div>

        <!-- Secondary Column (Optional) -->
        <div v-if="value2" class="stat-card__stat-col stat-card__stat-col--secondary">
          <div class="stat-card__value-row">
            <span class="stat-card__value">{{ value2 }}</span>
          </div>
          <div v-if="subValue2" class="stat-card__sub-value">{{ subValue2 }}</div>
        </div>
      </div>
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
  display:       flex;
  align-items:   center;
  gap:           8px;
  padding:       10px;
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-lg);
  transition:    transform 0.2s ease, box-shadow 0.2s ease;
  min-width:     120px;
}

.stat-card:hover {
  transform:  translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-card__icon-wrapper {
  display:         flex;
  align-items:     center;
  justify-content: center;
  width:           32px;
  height:          32px;
  border-radius:   var(--radius-md);
  flex-shrink:     0;
}

.stat-card__content {
  display:        flex;
  flex-direction: column;
  gap:            2px;
}

.stat-card__label-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-card__label {
  font-size:   0.75rem;
  font-weight: 600;
  color:       var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.stat-card__value-row {
  display:     flex;
  align-items: baseline;
  gap:         6px;
}

.stat-card__value {
  font-size:   1.25rem;
  font-weight: 700;
  color:       var(--text);
}

.stat-card__trend {
  display:     inline-flex;
  align-items: center;
  gap:         2px;
  font-size:   0.75rem;
  font-weight: 700;
}

.stat-card__sub-value {
  font-size:   0.65rem;
  font-weight: 700;
  color:       var(--text-secondary);
  line-height: 1.1;
}

.stat-card__stats-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.stat-card__stat-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-card__stat-col--secondary {
  padding-left: 10px;
  border-left: 1px solid var(--border);
}

.stat-card__content--dual {
  min-width: 160px;
}

.stat-card__trend--up { color: var(--state-safe); }
.stat-card__trend--down { color: var(--state-danger); }

/* Color variants */
.stat-card--neutral .stat-card__icon-wrapper { background: var(--bg-secondary); color: var(--text-secondary); }
.stat-card--primary .stat-card__icon-wrapper { background: var(--primary-light); color: var(--primary); }
.stat-card--success .stat-card__icon-wrapper { background: rgba(52, 199, 89, 0.1); color: #34c759; }
.stat-card--warning .stat-card__icon-wrapper { background: rgba(255, 149, 0, 0.1); color: #ff9500; }
.stat-card--danger  .stat-card__icon-wrapper { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
</style>
