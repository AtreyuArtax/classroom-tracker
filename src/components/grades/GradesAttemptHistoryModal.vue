<template>
  <Teleport to="body">
    <div v-if="show" class="attempt-modal-backdrop" @click="handleClose" @contextmenu.prevent="handleClose">
      <div class="attempt-modal-container" @click.stop>
        <!-- Header -->
        <div class="attempt-modal-header">
          <div class="attempt-modal-title-area">
            <h3 class="attempt-modal-title">Attempt History &amp; Notes</h3>
            <p class="attempt-modal-subtitle">
              {{ studentName }} — {{ assessmentName }} (/{{ totalPoints }})
              <span v-if="retestPolicy" class="attempt-policy-badge">· Policy: {{ retestPolicy }}</span>
            </p>
          </div>
          <button class="attempt-modal-close-btn" @click="handleClose" title="Close">
            <X :size="18" />
          </button>
        </div>

        <!-- Scrollable Body -->
        <div class="attempt-modal-body">
          <div v-if="attempts.length === 0" class="attempt-modal-empty">
            <p>No attempts recorded for this student yet.</p>
          </div>

          <div v-else class="attempt-modal-list">
            <div 
              v-for="(att, idx) in attempts" 
              :key="att.attemptId || idx" 
              class="attempt-modal-card"
              :class="{ 'attempt-modal-card--primary': att.isPrimary || isCounting(att) }"
            >
              <!-- Card Header Row -->
              <div class="attempt-card-header-row">
                <div class="attempt-card-scores">
                  <span class="attempt-card-score">{{ att.pointsEarned }} / {{ totalPoints }}</span>
                  <span class="attempt-card-percent">({{ getPercent(att.pointsEarned) }}%)</span>
                  <span class="attempt-card-date" v-if="att.date">{{ formatDate(att.date) }}</span>
                </div>

                <div class="attempt-card-actions">
                  <span v-if="isCounting(att)" class="attempt-badge attempt-badge--counting">counting ✓</span>
                  <span v-else class="attempt-badge attempt-badge--not-counting">not counting</span>

                  <button 
                    class="attempt-delete-btn" 
                    @click="$emit('delete-attempt', att.attemptId)"
                    title="Delete attempt"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>

              <!-- Teacher Note Textarea -->
              <textarea
                class="attempt-note-textarea"
                :value="att.comment || ''"
                placeholder="Add a note or observation about this attempt…"
                rows="2"
                @change="e => $emit('update-comment', att.attemptId, e.target.value)"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="attempt-modal-footer">
          <button class="attempt-add-btn" @click="$emit('start-new-attempt')">
            <Plus :size="16" /> Add Re-test / Attempt
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { X, Trash2, Plus } from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, default: false },
  studentName: { type: String, default: '' },
  assessmentName: { type: String, default: '' },
  totalPoints: { type: Number, default: 100 },
  retestPolicy: { type: String, default: 'highest' },
  resolvedScore: { type: Number, default: null },
  attempts: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'delete-attempt', 'update-comment', 'start-new-attempt'])

function handleClose() {
  emit('close')
}

function getPercent(score) {
  if (score == null || !props.totalPoints) return 0
  return Math.round((Number(score) / Number(props.totalPoints)) * 100)
}

function isCounting(att) {
  if (att.isPrimary) return true
  if (props.resolvedScore != null && Number(att.pointsEarned) === Number(props.resolvedScore)) return true
  return false
}

function formatDate(dStr) {
  if (!dStr) return ''
  try {
    const d = new Date(dStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch (e) {
    return dStr
  }
}
</script>

<style scoped>
.attempt-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.attempt-modal-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl, 16px);
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.attempt-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background: var(--surface);
}

.attempt-modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
}

.attempt-modal-subtitle {
  margin: 4px 0 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.attempt-policy-badge {
  text-transform: capitalize;
}

.attempt-modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.attempt-modal-close-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.attempt-modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.attempt-modal-empty {
  text-align: center;
  padding: 24px 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.attempt-modal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attempt-modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s ease;
}

.attempt-modal-card--primary {
  border-color: var(--primary);
  background: var(--surface);
}

.attempt-card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.attempt-card-scores {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.attempt-card-score {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
}

.attempt-card-percent {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--primary);
}

.attempt-card-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: 4px;
}

.attempt-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.attempt-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 12px;
  text-transform: lowercase;
}

.attempt-badge--counting {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

.attempt-badge--not-counting {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.attempt-delete-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.attempt-delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.attempt-note-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.825rem;
  resize: vertical;
  min-height: 48px;
  font-family: inherit;
}

.attempt-note-textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.attempt-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  justify-content: flex-end;
}

.attempt-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.attempt-add-btn:hover {
  opacity: 0.9;
}
</style>
