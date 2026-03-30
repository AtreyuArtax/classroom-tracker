<template>
  <div class="comm-log">
    <div v-if="events.length === 0" class="comm-log__empty">
      <div class="comm-log__empty-icon"><MessageSquare :size="32" /></div>
      <p>No communication logs found for this period.</p>
    </div>

    <div v-else class="comm-log__list">
      <div v-for="event in events" :key="event.eventId" class="comm-log__item">
        <div class="comm-log__header">
          <div class="comm-log__meta">
            <span class="comm-log__date">{{ formatDate(event.timestamp) }}</span>
            <span v-if="event.code === 'pc'" class="comm-log__badge">Parent Contact</span>
          </div>
          <button class="comm-log__delete" @click="emit('delete', event.eventId)" title="Delete entry">
            <Trash2 :size="14" />
          </button>
        </div>
        <div class="comm-log__content">
          <p class="comm-log__note">{{ event.note }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MessageSquare, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  events: { type: Array, default: () => [] }
})

const emit = defineEmits(['delete'])

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}
</script>

<style scoped>
.comm-log {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comm-log__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--text-secondary);
  text-align: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
}

.comm-log__empty-icon {
  margin-bottom: 12px;
  opacity: 0.5;
}

.comm-log__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comm-log__item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease;
}

.comm-log__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.comm-log__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.comm-log__date {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.comm-log__badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.comm-log__delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all 0.15s ease;
}

.comm-log__item:hover .comm-log__delete {
  opacity: 1;
}

.comm-log__delete:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.comm-log__content {
  color: var(--text);
  line-height: 1.5;
}

.comm-log__note {
  margin: 0;
  font-size: 0.9rem;
  white-space: pre-wrap;
}
</style>
