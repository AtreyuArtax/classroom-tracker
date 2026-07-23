<template>
  <div>
    <!-- Context Menu -->
    <div v-if="contextMenu" class="context-menu-backdrop" @click="$emit('close-context-menu')">
      <div 
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click.stop
      >
        <button class="context-menu__item" @click="$emit('start-new-attempt', contextMenu.assessmentId)">
          <Plus :size="14" /> New Attempt...
        </button>
        <button 
          v-if="gradeMap[contextMenu.assessmentId]?.[studentId]?.attempts?.length >= 1"
          class="context-menu__item" 
          @click="$emit('open-attempts', $event, contextMenu.assessmentId)"
        >
          <Calendar :size="14" /> View Notes
        </button>
        <div class="context-menu__divider"></div>
        <button class="context-menu__item" @click="$emit('toggle-missing', contextMenu.assessmentId)">
          <AlertCircle :size="14" /> {{ gradeMap[contextMenu.assessmentId]?.[studentId]?.missing ? 'Unmark Missing' : 'Mark Missing' }}
        </button>
        <button class="context-menu__item" @click="$emit('toggle-excluded', contextMenu.assessmentId)">
          <XCircle :size="14" /> {{ gradeMap[contextMenu.assessmentId]?.[studentId]?.excluded ? 'Unmark Excluded' : 'Mark Excluded' }}
        </button>
        <div class="context-menu__divider"></div>
        <button class="context-menu__item text-danger" @click="$emit('delete-assessment', contextMenu.assessmentId)">
          <Trash2 :size="14" /> Delete Assessment
        </button>
      </div>
    </div>

    <!-- Attempts Popover -->
    <div v-if="attemptsPopover" class="context-menu-backdrop" @click="$emit('close-attempts-popover')">
      <div 
        class="attempts-popover"
        :style="{ top: attemptsPopover.y + 'px', left: attemptsPopover.x + 'px' }"
        @click.stop
      >
        <div class="attempts-popover__header">Attempt History</div>
        <div class="attempts-popover__list">
          <div 
            v-for="att in gradeMap[attemptsPopover.assessmentId]?.[studentId]?.attempts" 
            :key="att.attemptId"
            class="attempt-item"
            :class="{ 'attempt-item--primary': att.isPrimary }"
          >
            <div class="attempt-item__row">
              <div class="attempt-item__main">
                <span class="attempt-item__score">{{ att.pointsEarned }}</span>
                <span class="attempt-item__date">{{ formatLocalDisplay(att.date, { month: 'short', day: 'numeric' }) }}</span>
              </div>
              <div class="attempt-item__actions">
                <button 
                  v-if="!att.isPrimary" 
                  class="btn-icon-sm" 
                  title="Set as Primary"
                  @click="$emit('set-primary', attemptsPopover.assessmentId, att.attemptId)"
                >
                  <Check :size="12" />
                </button>
                <button 
                  class="btn-icon-sm btn-icon-sm--danger" 
                  title="Delete Attempt"
                  @click="$emit('delete-attempt', attemptsPopover.assessmentId, att.attemptId)"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
            <!-- Per-attempt comment -->
            <textarea
              class="attempt-comment-input"
              :value="att.comment || ''"
              placeholder="Add a note about this attempt…"
              rows="2"
              @change="$emit('update-comment', attemptsPopover.assessmentId, att.attemptId, $event.target.value)"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- New Attempt Modal -->
    <BaseModal
      :show="!!newAttemptForm"
      title="Record New Attempt"
      :z-index="3000"
      @close="$emit('close-new-attempt')"
    >
      <div v-if="newAttemptForm" class="modal-body-content">
        <div class="form-group">
          <label>Points Earned</label>
          <input type="number" v-model="newAttemptForm.points" autofocus />
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" v-model="newAttemptForm.date" />
        </div>
        <div class="form-group">
          <label>Comment (Optional)</label>
          <textarea v-model="newAttemptForm.comment" rows="2"></textarea>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="$emit('close-new-attempt')">Cancel</button>
        <button class="btn-primary" @click="$emit('submit-new-attempt')">Save Attempt</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { Plus, Calendar, AlertCircle, XCircle, Trash2, Check } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { formatLocalDisplay } from '../../utils/dates.js'

defineProps({
  contextMenu: { type: Object, default: null },
  attemptsPopover: { type: Object, default: null },
  newAttemptForm: { type: Object, default: null },
  gradeMap: { type: Object, default: () => ({}) },
  studentId: { type: String, required: true }
})

defineEmits([
  'close-context-menu',
  'close-attempts-popover',
  'close-new-attempt',
  'start-new-attempt',
  'open-attempts',
  'toggle-missing',
  'toggle-excluded',
  'delete-assessment',
  'set-primary',
  'delete-attempt',
  'update-comment',
  'submit-new-attempt'
])
</script>

<style scoped>
.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
}

.context-menu {
  position: fixed;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 2501;
  min-width: 160px;
}

.context-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.context-menu__item:hover {
  background: var(--bg-secondary);
}

.context-menu__item.text-danger {
  color: var(--danger);
}

.context-menu__divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.attempts-popover {
  position: fixed;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 12px;
  width: 260px;
  z-index: 2501;
}

.attempts-popover__header {
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 8px;
}

.attempts-popover__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attempt-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px;
}

.attempt-item--primary {
  border-color: var(--primary);
}

.attempt-item__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.attempt-item__score {
  font-weight: 700;
}

.attempt-item__date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: 6px;
}

.attempt-item__actions {
  display: flex;
  gap: 4px;
}

.btn-icon-sm {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 2px;
}

.btn-icon-sm:hover {
  color: var(--primary);
}

.btn-icon-sm--danger:hover {
  color: var(--danger);
}

.attempt-comment-input {
  width: 100%;
  margin-top: 6px;
  padding: 6px;
  font-size: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  resize: vertical;
}

.modal-body-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
}

.form-group input, .form-group textarea {
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.btn-ghost {
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.btn-primary {
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
}
</style>
