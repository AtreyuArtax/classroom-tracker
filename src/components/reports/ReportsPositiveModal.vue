<template>
  <div v-if="show" class="positive-modal__backdrop" @click.self="$emit('close')">
    <div class="positive-modal" role="dialog" aria-modal="true" aria-labelledby="positive-modal-title">
      
      <!-- Header -->
      <header class="positive-modal__header">
        <div class="positive-modal__header-title-group">
          <div class="positive-modal__icon-wrap">
            <Star :size="20" class="positive-modal__title-icon" />
          </div>
          <div>
            <h3 id="positive-modal-title" class="positive-modal__title">Positive Recognition Audit</h3>
            <p class="positive-modal__subtitle">
              {{ totalEvents }} recognition{{ totalEvents !== 1 ? 's' : '' }} logged across {{ studentsList.length }} student{{ studentsList.length !== 1 ? 's' : '' }}
            </p>
          </div>
        </div>
        <button class="positive-modal__close-btn" @click="$emit('close')" aria-label="Close modal">
          <X :size="18" />
        </button>
      </header>

      <!-- Body -->
      <div class="positive-modal__body">
        <div v-if="studentsList.length === 0" class="positive-modal__empty">
          <Sparkles :size="36" class="positive-modal__empty-icon" />
          <p class="positive-modal__empty-text">No positive recognition logged yet for this selected period.</p>
        </div>

        <div v-else class="positive-modal__student-list">
          <div 
            v-for="st in studentsList" 
            :key="st.studentId" 
            class="positive-card"
          >
            <!-- Student Header Row -->
            <div class="positive-card__header">
              <div class="positive-card__student-info">
                <span class="positive-card__name">{{ st.name }}</span>
                <span class="positive-card__count-badge">
                  <Star :size="11" />
                  {{ st.count }} recognition{{ st.count !== 1 ? 's' : '' }}
                </span>
              </div>

              <button 
                class="positive-card__dossier-btn"
                @click="onOpenDossier(st.studentId)"
                title="Open Student Dossier"
              >
                <span>Student Dossier</span>
                <ArrowRight :size="13" />
              </button>
            </div>

            <!-- Event Pills / List -->
            <ul class="positive-card__event-list">
              <li 
                v-for="(evt, idx) in st.events" 
                :key="evt.eventId || idx"
                class="positive-card__event-item"
              >
                <div class="positive-card__event-left">
                  <span class="positive-card__event-dot">
                    <component :is="resolveIcon(evt.icon)" :size="12" />
                  </span>
                  <span class="positive-card__event-name">{{ evt.label }}</span>
                </div>
                <div class="positive-card__event-meta">
                  <span v-if="evt.note" class="positive-card__event-note">{{ evt.note }}</span>
                  <span v-if="evt.timestamp" class="positive-card__event-date">{{ formatDate(evt.timestamp) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="positive-modal__footer">
        <button type="button" class="positive-modal__btn-close" @click="$emit('close')">
          Close
        </button>
      </footer>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { X, Star, Sparkles, ArrowRight } from 'lucide-vue-next'
import { resolveIcon } from '../../utils/icons.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  positiveSummary: { 
    type: Object, 
    default: () => ({ totalCount: 0, studentsList: [] }) 
  }
})

const emit = defineEmits(['close', 'select-student'])

const studentsList = computed(() => props.positiveSummary?.studentsList || [])
const totalEvents = computed(() => props.positiveSummary?.totalCount || 0)

function onOpenDossier(studentId) {
  emit('select-student', studentId)
  emit('close')
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const month = d.toLocaleDateString('en-US', { month: 'short' })
    const day = d.getDate()
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
    return `${month} ${day}, ${time}`
  } catch {
    return isoStr
  }
}
</script>

<style scoped>
.positive-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: pm-fade-in 0.15s ease;
}

.positive-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  width: 100%;
  max-width: 620px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
  animation: pm-slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes pm-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pm-slide-up {
  from { transform: translateY(12px) scale(0.98); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

/* Header */
.positive-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.positive-modal__header-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.positive-modal__icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md, 8px);
  background: rgba(16, 185, 129, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.positive-modal__title-icon {
  color: #10b981;
}

.positive-modal__title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  line-height: 1.2;
}

.positive-modal__subtitle {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 2px 0 0;
}

.positive-modal__close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.positive-modal__close-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

/* Body */
.positive-modal__body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.positive-modal__empty {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
  text-align: center;
}

.positive-modal__empty-icon {
  color: #10b981;
  opacity: 0.7;
}

.positive-modal__empty-text {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

/* Student Cards */
.positive-modal__student-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.positive-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.positive-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.positive-card__student-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.positive-card__name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text);
}

.positive-card__count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full, 9999px);
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.positive-card__dossier-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.positive-card__dossier-btn:hover {
  background: var(--surface);
  color: var(--primary);
  border-color: var(--primary);
}

/* Event List */
.positive-card__event-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.positive-card__event-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
}

.positive-card__event-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.positive-card__event-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.positive-card__event-name {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.positive-card__event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.positive-card__event-note {
  font-style: italic;
  color: var(--text);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.positive-card__event-date {
  white-space: nowrap;
}

/* Footer */
.positive-modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  background: var(--surface);
}

.positive-modal__btn-close {
  padding: 6px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.positive-modal__btn-close:hover {
  background: var(--bg-hover);
}
</style>
