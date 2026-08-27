<template>
  <div v-if="show" class="missing-modal__backdrop" @click.self="$emit('close')">
    <div class="missing-modal" role="dialog" aria-modal="true" aria-labelledby="missing-modal-title">
      
      <!-- Header -->
      <header class="missing-modal__header">
        <div class="missing-modal__header-title-group">
          <div class="missing-modal__icon-wrap">
            <ClipboardList :size="20" class="missing-modal__title-icon" />
          </div>
          <div>
            <h3 id="missing-modal-title" class="missing-modal__title">Missing Work Audit</h3>
            <p class="missing-modal__subtitle">
              {{ totalMissingTasks }} incomplete task{{ totalMissingTasks !== 1 ? 's' : '' }} across {{ missingStudentsList.length }} student{{ missingStudentsList.length !== 1 ? 's' : '' }}
            </p>
          </div>
        </div>
        <button class="missing-modal__close-btn" @click="$emit('close')" aria-label="Close modal">
          <X :size="18" />
        </button>
      </header>

      <!-- Body -->
      <div class="missing-modal__body">
        <div v-if="missingStudentsList.length === 0" class="missing-modal__empty">
          <CheckCircle2 :size="36" class="missing-modal__empty-icon" />
          <p class="missing-modal__empty-text">All caught up! No missing assignments recorded across the class.</p>
        </div>

        <div v-else class="missing-modal__student-list">
          <div 
            v-for="st in missingStudentsList" 
            :key="st.studentId" 
            class="missing-card"
          >
            <!-- Student Header Row -->
            <div class="missing-card__header">
              <div class="missing-card__student-info">
                <span class="missing-card__name">{{ st.name }}</span>
                <span 
                  v-if="st.grade !== null" 
                  class="missing-card__grade-badge"
                  :class="{ 'missing-card__grade-badge--failing': st.grade < 50 }"
                >
                  {{ st.grade }}%
                </span>
                <span class="missing-card__count-badge">
                  {{ st.tasks.length }} missing task{{ st.tasks.length !== 1 ? 's' : '' }}
                </span>
              </div>

              <button 
                class="missing-card__dossier-btn"
                @click="onOpenDossier(st.studentId)"
                title="Open Student Dossier Academics"
              >
                <span>Student Dossier</span>
                <ArrowRight :size="13" />
              </button>
            </div>

            <!-- Task Pills / List -->
            <ul class="missing-card__task-list">
              <li 
                v-for="task in st.tasks" 
                :key="task.assessmentId"
                class="missing-card__task-item"
              >
                <div class="missing-card__task-left">
                  <span class="missing-card__task-dot"></span>
                  <span class="missing-card__task-name">{{ task.name }}</span>
                </div>
                <div class="missing-card__task-meta">
                  <span v-if="task.category" class="missing-card__task-cat">{{ task.category }}</span>
                  <span v-if="task.date" class="missing-card__task-date">{{ formatDate(task.date) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="missing-modal__footer">
        <button type="button" class="missing-modal__btn-close" @click="$emit('close')">
          Close
        </button>
      </footer>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { X, ClipboardList, CheckCircle2, ArrowRight } from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, default: false },
  missingStudentsList: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'select-student'])

const totalMissingTasks = computed(() => {
  return props.missingStudentsList.reduce((sum, s) => sum + (s.tasks ? s.tasks.length : 0), 0)
})

function onOpenDossier(studentId) {
  emit('select-student', studentId)
  emit('close')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}
</script>

<style scoped>
.missing-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.missing-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 620px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

/* Header */
.missing-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.missing-modal__header-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.missing-modal__icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.missing-modal__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  line-height: 1.2;
}

.missing-modal__subtitle {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.missing-modal__close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.missing-modal__close-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

/* Body */
.missing-modal__body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.missing-modal__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 10px;
  text-align: center;
}

.missing-modal__empty-icon {
  color: #10b981;
}

.missing-modal__empty-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
}

/* Student Cards */
.missing-modal__student-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.missing-card {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease;
}

.missing-card:hover {
  border-color: rgba(245, 158, 11, 0.4);
}

.missing-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.missing-card__student-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.missing-card__name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
}

.missing-card__grade-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 1px 6px;
  border-radius: 4px;
}

.missing-card__grade-badge--failing {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.missing-card__count-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  padding: 1px 6px;
  border-radius: 4px;
}

.missing-card__dossier-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.missing-card__dossier-btn:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* Task List */
.missing-card__task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.missing-card__task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
}

.missing-card__task-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.missing-card__task-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

.missing-card__task-name {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.missing-card__task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.missing-card__task-cat {
  background: var(--surface-hover);
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 500;
}

.missing-card__task-date {
  color: var(--text-secondary);
}

/* Footer */
.missing-modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  background: var(--surface);
}

.missing-modal__btn-close {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.missing-modal__btn-close:hover {
  background: var(--surface);
  border-color: var(--primary);
  color: var(--primary);
}
</style>
