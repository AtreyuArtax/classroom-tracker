<template>
  <div v-if="studentActionMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="$emit('close')">
    <div class="grades__context-menu" :style="{ top: studentActionMenu.y + 'px', left: studentActionMenu.x + 'px' }" @click.stop>
      <button class="grades__context-btn" @click="$emit('toggle-missing', studentActionMenu.studentId)">
        <AlertCircle :size="14" /> {{ isMissing(studentActionMenu.studentId) ? 'Unmark Missing' : 'Mark Missing' }}
      </button>
      <button class="grades__context-btn" @click="$emit('toggle-excluded', studentActionMenu.studentId)">
        <XCircle :size="14" /> {{ isExcluded(studentActionMenu.studentId) ? 'Include in Grade' : 'Mark Excluded' }}
      </button>
      <button class="grades__context-btn" @click="$emit('open-attempts', $event, studentActionMenu.studentId)">
        <BarChart2 :size="14" /> View Attempt History
      </button>
      <button class="grades__context-btn" @click="$emit('start-new-attempt', studentActionMenu.studentId)">
        <Plus :size="14" /> Add New Attempt
      </button>
    </div>
  </div>
</template>

<script setup>
import { AlertCircle, XCircle, BarChart2, Plus } from 'lucide-vue-next'

const props = defineProps({
  studentActionMenu: { type: Object, default: null },
  selectedAssessmentId: { type: [String, Number], default: null },
  gradeMap: { type: Object, default: () => ({}) }
})

defineEmits([
  'close',
  'toggle-missing',
  'toggle-excluded',
  'open-attempts',
  'start-new-attempt'
])

function isMissing(studentId) {
  if (!props.selectedAssessmentId) return false
  return !!props.gradeMap[props.selectedAssessmentId]?.[studentId]?.missing
}

function isExcluded(studentId) {
  if (!props.selectedAssessmentId) return false
  return !!props.gradeMap[props.selectedAssessmentId]?.[studentId]?.excluded
}
</script>

<style scoped>
.grades__context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
}

.grades__context-backdrop--dim {
  background: rgba(0, 0, 0, 0.1);
}

.grades__context-menu {
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
  min-width: 170px;
}

.grades__context-btn {
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

.grades__context-btn:hover {
  background: var(--bg-secondary);
}
</style>
