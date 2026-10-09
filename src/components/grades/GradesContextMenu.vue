<template>
  <div v-if="activeMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="$emit('close')" @contextmenu.prevent="$emit('close')">
    <div class="grades__context-menu" :style="menuStyle" @click.stop>
      <!-- Overall Grade Column Special Actions -->
      <template v-if="isOverall">
        <button class="grades__context-btn" @click="$emit('adjust-grade', activeStudentId); $emit('close')">
          <Pencil :size="14" /> Adjust Grade
        </button>
        <button v-if="isAdjusted" class="grades__context-btn" @click="$emit('reset-grade', activeStudentId); $emit('close')">
          <RotateCcw :size="14" /> Reset to Calculated
        </button>
      </template>

      <!-- Standard Assessment Grade Actions -->
      <template v-else>
        <button class="grades__context-btn" @click="$emit('open-attempts', $event, activeStudentId, activeAssessmentId); $emit('close')">
          <BarChart2 :size="14" /> Attempt History &amp; Notes
        </button>
        <button class="grades__context-btn" @click="$emit('start-new-attempt', $event, activeStudentId, activeAssessmentId); $emit('close')">
          <Plus :size="14" /> Log Re-test / Attempt
        </button>

        <div class="grades__context-divider" />

        <button class="grades__context-btn" @click="$emit('toggle-missing', activeStudentId, activeAssessmentId); $emit('close')">
          <AlertCircle :size="14" /> {{ isMissing() ? 'Unmark Missing' : 'Mark Missing' }}
        </button>
        <button class="grades__context-btn" @click="$emit('toggle-excluded', activeStudentId, activeAssessmentId); $emit('close')">
          <XCircle :size="14" /> {{ isExcluded() ? 'Include in Grade' : 'Mark Excluded' }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertCircle, XCircle, BarChart2, Plus, Pencil, RotateCcw } from 'lucide-vue-next'

const props = defineProps({
  menu: { type: Object, default: null },
  studentActionMenu: { type: Object, default: null },
  selectedAssessmentId: { type: [String, Number], default: null },
  gradeMap: { type: Object, default: () => ({}) },
  classGrades: { type: Object, default: () => ({}) }
})

defineEmits([
  'close',
  'toggle-missing',
  'toggle-excluded',
  'open-attempts',
  'start-new-attempt',
  'adjust-grade',
  'reset-grade'
])

const activeMenu = computed(() => props.menu || props.studentActionMenu)
const activeStudentId = computed(() => activeMenu.value?.studentId || activeMenu.value?.sId)
const activeAssessmentId = computed(() => activeMenu.value?.assessmentId || activeMenu.value?.aId || props.selectedAssessmentId)
const isOverall = computed(() => String(activeAssessmentId.value) === 'overall')

const isAdjusted = computed(() => {
  if (!activeStudentId.value || !props.classGrades) return false
  return !!props.classGrades[activeStudentId.value]?.isGradeAdjusted
})

const menuStyle = computed(() => {
  if (!activeMenu.value) return {}
  let x = activeMenu.value.x ?? 0
  let y = activeMenu.value.y ?? 0
  const width = 210
  const height = 180
  if (typeof window !== 'undefined') {
    if (x + width > window.innerWidth) x = Math.max(10, window.innerWidth - width - 10)
    if (y + height > window.innerHeight) y = Math.max(10, window.innerHeight - height - 10)
  }
  return {
    top: `${y}px`,
    left: `${x}px`
  }
})

function isMissing(studentId, assessmentId) {
  const aId = assessmentId || activeAssessmentId.value
  const sId = studentId || activeStudentId.value
  if (!aId || !sId) return false
  return !!props.gradeMap[aId]?.[sId]?.missing
}

function isExcluded(studentId, assessmentId) {
  const aId = assessmentId || activeAssessmentId.value
  const sId = studentId || activeStudentId.value
  if (!aId || !sId) return false
  return !!props.gradeMap[aId]?.[sId]?.excluded
}
</script>

<style scoped>
.grades__context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
}

.grades__context-backdrop--dim {
  background: rgba(0, 0, 0, 0.15);
}

.grades__context-menu {
  position: fixed;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 2501;
  min-width: 200px;
  animation: contextMenuPop 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes contextMenuPop {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.grades__context-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 6px;
}

.grades__context-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.grades__context-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}
</style>
