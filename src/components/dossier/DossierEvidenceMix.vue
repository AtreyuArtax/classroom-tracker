<template>
  <div class="evidence-mix" :class="{ 'evidence-mix--print': isPrint }">
    <div v-if="!isPrint" class="evidence-mix__header">
      <h4 class="evidence-mix__title">Triangulation of Evidence</h4>
      <div class="evidence-mix__legend">
        <span class="legend-item"><span class="dot dot--product"></span> Product</span>
        <span class="legend-item"><span class="dot dot--obs"></span> Observation</span>
        <span class="legend-item"><span class="dot dot--conv"></span> Conversation</span>
      </div>
    </div>
    
    <div class="evidence-mix__bar">
      <div 
        class="evidence-segment segment--product" 
        :style="{ width: `${mix.product}%` }"
        :title="`Product: ${mix.product}%`"
      ></div>
      <div 
        class="evidence-segment segment--observation" 
        :style="{ width: `${mix.observation}%` }"
        :title="`Observation: ${mix.observation}%`"
      ></div>
      <div 
        class="evidence-segment segment--conversation" 
        :style="{ width: `${mix.conversation}%` }"
        :title="`Conversation: ${mix.conversation}%`"
      ></div>
    </div>
    
    <div v-if="balanceAlert" class="evidence-mix__alert">
      <AlertTriangle :size="14" />
      {{ balanceAlert }}
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
  border-radius: var(--radius-lg);
  padding:       16px;
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
  margin-bottom:   12px;
}

.evidence-mix__title {
  margin:      0;
  font-size:   0.9rem;
  font-weight: 700;
  color:       var(--text);
}

.evidence-mix__legend {
  display: flex;
  gap:     12px;
}

.legend-item {
  display:     flex;
  align-items: center;
  gap:         4px;
  font-size:   0.7rem;
  font-weight: 600;
  color:       var(--text-secondary);
}

.dot {
  width:         8px;
  height:        8px;
  border-radius: 50%;
}

.dot--product { background: var(--primary); }
.dot--obs     { background: #34c759; }
.dot--conv    { background: #ff9500; }

.evidence-mix__bar {
  display:       flex;
  height:        12px;
  background:    var(--bg-secondary);
  border-radius: 6px;
  overflow:      hidden;
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

.evidence-mix__alert {
  display:     flex;
  align-items: center;
  gap:         6px;
  margin-top:  12px;
  font-size:   0.75rem;
  font-weight: 600;
  color:       #ff9500;
}
</style>
