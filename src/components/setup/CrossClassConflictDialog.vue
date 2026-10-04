<template>
  <div class="setup__dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-modal-title">
    <div class="setup__dialog-box setup__dialog-box--large">
      <h3 id="conflict-modal-title" class="setup__dialog-title">
        <AlertTriangle :size="20" style="color: #f59e0b; display: inline-block; vertical-align: -3px; margin-right: 6px;" />
        Student Conflict Detected
      </h3>
      <p class="setup__dialog-body">
        The following students are currently enrolled in another class this school year. Moving them will unenroll them from their current class.
      </p>
      <ul class="setup__dialog-list">
        <li v-for="c in conflicts" :key="c.studentId">
          <strong>{{ c.student.firstName }} {{ c.student.lastName }}</strong>
          (ID: {{ c.studentId }}) is in <em>{{ classLabel(c.existingClassId) }}</em>
        </li>
      </ul>
      <div class="setup__dialog-actions">
        <button class="setup__btn-danger" @click="emit('resolve', 'move')">Move students to this class</button>
        <button class="setup__btn-ghost" @click="emit('resolve', 'skip')">Skip these students</button>
      </div>
    </div>
    <div class="setup__dialog-backdrop" @click="emit('resolve', 'skip')" />
  </div>
</template>

<script setup>
import { AlertTriangle } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'

defineProps({
  /** crossClassConflicts from importRoster: [{ studentId, existingClassId, student }] */
  conflicts: { type: Array, required: true }
})
const emit = defineEmits(['resolve'])

const { classList } = useClassroom()

function classLabel(classId) {
  const cls = classList.value.find(c => c.classId === classId)
  if (!cls) return classId
  return cls.year ? `${cls.name} (${cls.year})` : cls.name
}
</script>
