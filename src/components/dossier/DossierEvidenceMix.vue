<template>
  <div class="evidence-mix" :class="{ 'evidence-mix--print': isPrint }">
    <div class="evidence-mix__header">
      <span v-if="!isPrint" class="evidence-mix__title">Triangulation of Evidence</span>
    </div>
    
    <!-- Multi-Segment Bar -->
    <div class="evidence-mix__bar">
      <div 
        class="evidence-segment segment--product" 
        :style="{ width: `${mix.product || 0}%` }"
        :title="`Product: ${Math.round(mix.product || 0)}%`"
      ></div>
      <div 
        class="evidence-segment segment--observation" 
        :style="{ width: `${mix.observation || 0}%` }"
        :title="`Observation: ${Math.round(mix.observation || 0)}%`"
      ></div>
      <div 
        class="evidence-segment segment--conversation" 
        :style="{ width: `${mix.conversation || 0}%` }"
        :title="`Conversation: ${Math.round(mix.conversation || 0)}%`"
      ></div>
    </div>

    <!-- Clean 3-Item Legend -->
    <div class="evidence-mix__legend">
      <div class="legend-item" :title="`Product: ${Math.round(mix.product || 0)}%`">
        <span class="dot dot--product"></span>
        <span class="legend-label">Product</span>
        <span class="legend-val">{{ Math.round(mix.product || 0) }}%</span>
      </div>
      <div class="legend-item" :title="`Observation: ${Math.round(mix.observation || 0)}%`">
        <span class="dot dot--obs"></span>
        <span class="legend-label">Obs</span>
        <span class="legend-val">{{ Math.round(mix.observation || 0) }}%</span>
      </div>
      <div class="legend-item" :title="`Conversation: ${Math.round(mix.conversation || 0)}%`">
        <span class="dot dot--conv"></span>
        <span class="legend-label">Conv</span>
        <span class="legend-val">{{ Math.round(mix.conversation || 0) }}%</span>
      </div>
    </div>
    
    <!-- Subtle Alert Box -->
    <div v-if="balanceAlert && !isPrint" class="evidence-mix__alert">
      <AlertTriangle :size="12" class="alert-icon" />
      <span class="alert-text">{{ balanceAlert }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  mix: { 
    type: Object, 
    required: true,
    default: () => ({ product: 0, observation: 0, conversation: 0 })
  },
  isPrint: {
    type: Boolean,
    default: false
  }
})

const balanceAlert = computed(() => {
  if (props.mix.product > 80) return 'Academic data is heavily weighted toward Products.'
  if (props.mix.observation < 5 && props.mix.conversation < 5) return 'Low triangulation—consider adding observations or conversations.'
  return null
})
</script>

<style scoped>
.evidence-mix {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  padding:       10px 12px;
  display:       flex;
  flex-direction: column;
  gap:            8px;
}

.evidence-mix--print {
  background: none;
  border:     none;
  padding:    0;
}

.evidence-mix__header {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  border-bottom:   1px solid var(--border);
  padding-bottom:  6px;
}

.evidence-mix__title {
  margin:         0;
  font-size:      0.74rem;
  font-weight:    700;
  color:          var(--text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.evidence-mix__bar {
  display:       flex;
  height:        8px;
  background:    var(--bg-secondary);
  border-radius: 4px;
  overflow:      hidden;
  width:         100%;
}

.evidence-segment {
  height:     100%;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.evidence-mix--print .evidence-segment {
  transition: none !important;
}

.segment--product      { background: var(--primary); }
.segment--observation  { background: #34c759; }
.segment--conversation { background: #ff9500; }

.evidence-mix__legend {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.legend-item {
  display:     inline-flex;
  align-items: center;
  gap:         4px;
  font-size:   0.68rem;
  color:       var(--text-secondary);
}

.legend-label {
  font-weight: 500;
}

.legend-val {
  font-weight: 800;
  color:       var(--text);
}

.dot {
  width:         6px;
  height:        6px;
  border-radius: 50%;
  flex-shrink:   0;
}

.dot--product { background: var(--primary); }
.dot--obs     { background: #34c759; }
.dot--conv    { background: #ff9500; }

.evidence-mix__alert {
  display:        flex;
  align-items:    center;
  gap:            6px;
  padding:        5px 8px;
  background:     rgba(255, 149, 0, 0.08);
  border:         1px solid rgba(255, 149, 0, 0.2);
  border-radius:  var(--radius-sm);
  font-size:      0.68rem;
  font-weight:    600;
  color:          #d97706;
  line-height:    1.2;
}

.alert-icon {
  flex-shrink: 0;
  color:       #d97706;
}

.alert-text {
  flex: 1;
}
</style>
