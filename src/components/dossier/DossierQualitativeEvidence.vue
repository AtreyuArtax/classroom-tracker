<template>
  <div class="qualitative-evidence">
    <div class="qualitative-evidence__header">
      <div class="qualitative-evidence__header-text">
        <h3 class="qualitative-evidence__title">Observations & Conversations</h3>
        <p class="qualitative-evidence__subtitle">Professional judgment evidence captured via radials</p>
      </div>
      
      <div class="qualitative-evidence__filters">
        <button 
          v-for="type in ['all', 'observation', 'conversation']" 
          :key="type"
          class="filter-pill"
          :class="{ 'filter-pill--active': activeFilter === type }"
          @click="activeFilter = type"
        >
          {{ type.charAt(0).toUpperCase() + type.slice(1) + (type === 'all' ? '' : 's') }}
        </button>
      </div>
    </div>

    <div v-if="events.length === 0" class="qualitative-evidence__empty">
      <p>No qualitative evidence recorded for this student yet.</p>
    </div>

    <div v-else class="qualitative-evidence__list">
      <div v-for="event in filteredEvents" :key="event.eventId" class="qualitative-evidence__item">
        <div class="qualitative-evidence__row">
          <div class="qualitative-evidence__indicator" :class="`qualitative-evidence__indicator--${event.acType || 'conversation'}`"></div>
          
          <div class="qualitative-evidence__main">
            <div class="qualitative-evidence__top-line">
              <div class="qualitative-evidence__type-group">
                <component :is="event.acType === 'observation' ? Eye : MessageSquare" :size="14" class="qualitative-evidence__type-icon" />
                <span class="qualitative-evidence__type-label">{{ event.acType === 'observation' ? 'Observation' : 'Conversation' }}</span>
              </div>
              
              <div class="qualitative-evidence__outcome-group">
                <div class="qualitative-evidence__dot" :class="`qualitative-evidence__dot--${event.acOutcome}`"></div>
                <span class="qualitative-evidence__outcome-text">{{ formatOutcome(event.acOutcome) }}</span>
              </div>

              <span class="qualitative-evidence__context-tag">{{ formatContext(event.acContext) }}</span>
              
              <div style="flex: 1"></div>
              
              <div class="qualitative-evidence__row-actions">
                <span class="qualitative-evidence__date">{{ formatDate(event.timestamp) }}</span>
                <button class="qualitative-evidence__delete-btn" title="Delete Entry" @click="$emit('delete', event.eventId)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <div class="qualitative-evidence__note-preview">
              {{ event.note }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Eye, MessageSquare, Trash2 } from 'lucide-vue-next'
import { formatLocalDisplay } from '../../utils/dates.js'

const props = defineProps({
  events: { type: Array, default: () => [] }
})

const emit = defineEmits(['delete'])

const activeFilter = ref('all')

const filteredEvents = computed(() => {
  if (activeFilter.value === 'all') return props.events
  return props.events.filter(e => e.acType === activeFilter.value)
})

function formatDate(ts) {
  return formatLocalDisplay(ts, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatOutcome(outcome) {
  if (!outcome) return 'Inconclusive'
  return outcome
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatContext(ctx) {
  if (!ctx) return 'General'
  return ctx
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>

<style scoped>
.qualitative-evidence {
  margin-top: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.qualitative-evidence__header {
  padding: 12px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qualitative-evidence__title {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.qualitative-evidence__subtitle {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin: 1px 0 0 0;
  opacity: 0.8;
}

/* ── Filter Pills ────────────────────────────────────────────────── */
.qualitative-evidence__filters {
  display: flex;
  gap: 6px;
}

.filter-pill {
  padding: 4px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.filter-pill:hover {
  background: var(--bg-secondary);
  border-color: var(--primary-light);
}

.filter-pill--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.qualitative-evidence__empty {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-style: italic;
}

.qualitative-evidence__list {
  display: flex;
  flex-direction: column;
}

.qualitative-evidence__item {
  border-bottom: 1px solid var(--border);
  transition: background 0.15s ease;
}

.qualitative-evidence__item:last-child {
  border-bottom: none;
}

.qualitative-evidence__item:hover {
  background: var(--bg-hover);
}

.qualitative-evidence__row {
  display: flex;
  min-height: 48px;
}

.qualitative-evidence__indicator {
  width: 4px;
  flex-shrink: 0;
}

.qualitative-evidence__indicator--observation { background: #0a84ff; }
.qualitative-evidence__indicator--conversation { background: #bf5af2; }

.qualitative-evidence__main {
  flex: 1;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qualitative-evidence__top-line {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 2px;
}

.qualitative-evidence__type-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 90px;
}

.qualitative-evidence__type-icon {
  color: var(--text-secondary);
  opacity: 0.6;
}

.qualitative-evidence__type-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-secondary);
}

.qualitative-evidence__outcome-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.qualitative-evidence__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.qualitative-evidence__dot--demonstrates_understanding { background: #34c759; box-shadow: 0 0 4px #34c759; }
.qualitative-evidence__dot--gap_confirmed { background: #ff3b30; box-shadow: 0 0 4px #ff3b30; }
.qualitative-evidence__dot--inconclusive { background: #ff9500; box-shadow: 0 0 4px #ff9500; }

.qualitative-evidence__outcome-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
}

.qualitative-evidence__context-tag {
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 1px 6px;
  border-radius: 4px;
}

.qualitative-evidence__date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
  transition: opacity 0.2s;
}

.qualitative-evidence__item:hover .qualitative-evidence__date {
  opacity: 0.5;
}

.qualitative-evidence__row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qualitative-evidence__delete-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateX(4px);
  transition: all 0.2s ease;
}

.qualitative-evidence__item:hover .qualitative-evidence__delete-btn {
  opacity: 1;
  transform: translateX(0);
}

.qualitative-evidence__delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.qualitative-evidence__note-preview {
  font-size: 0.88rem;
  color: var(--text);
  line-height: 1.4;
  white-space: pre-wrap;
  padding-left: 0;
}
</style>
