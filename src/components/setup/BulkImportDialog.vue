<template>
  <div class="setup__dialog" role="dialog" aria-modal="true">
    <div class="setup__dialog-box setup__dialog-box--large">
      <h3 class="setup__dialog-title">Multi-Class Import Detected</h3>
      <p class="setup__dialog-body">This CSV contains students for multiple classes. Select the ones you want to create or update.</p>
      <div class="setup__bulk-header">
        <div class="setup__bulk-header-left">
          <label class="setup__label setup__label--checkbox setup__bulk-select-all">
            <input type="checkbox" :checked="isAllSelected" @change="toggleAll" />
            Select All
          </label>
          <button
            v-for="sem in availableSemesters"
            :key="sem"
            class="setup__bulk-sem-btn"
            :class="{ 'setup__bulk-sem-btn--active': isSemesterAllSelected(sem) }"
            @click="toggleSemester(sem)"
          >Sem {{ sem }}</button>
        </div>
        <span class="setup__bulk-summary">{{ selectedCount }} of {{ Object.keys(groups).length }} selected</span>
      </div>

      <!-- New Periods Advisory -->
      <div v-if="newPeriods.length > 0" class="setup__advisory">
        <AlertTriangle :size="16" />
        <div>
          <strong>New Periods Detected ({{ newPeriods.join(', ') }})</strong>
          <p>Importing classes in these periods adds them to your settings. Please review their start times afterwards.</p>
        </div>
      </div>

      <!-- Rows without a Student ID or name -->
      <div v-if="skippedRows.length > 0" class="setup__advisory">
        <AlertTriangle :size="16" />
        <div>
          <strong>{{ skippedRows.length }} CSV row{{ skippedRows.length === 1 ? '' : 's' }} will be skipped</strong>
          <p>Each student needs a Student ID and a name. These rows are listed in the import summary.</p>
        </div>
      </div>

      <div class="setup__bulk-list">
        <template v-for="section in sections" :key="section.label">
          <div class="setup__bulk-section-heading">{{ section.label }}</div>
          <div v-for="{ key, group } in section.groups" :key="key" class="setup__bulk-item">
            <div class="setup__bulk-item-main">
              <input type="checkbox" v-model="group.selected" class="setup__checkbox" />
              <div class="setup__bulk-info">
                <strong>{{ group.name }}</strong>
                <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                  <span class="setup__chip">{{ group.year }} · Sem {{ group.semester }} · P{{ group.periodNumber }}</span>
                  <span v-if="group.term" class="setup__chip setup__chip--purple">{{ group.term }}</span>
                  <span v-if="group.courseCode" class="setup__chip setup__chip--blue">{{ group.courseCode }}</span>
                  <span v-if="group.isSplitClass" class="setup__chip setup__chip--amber">Split Class</span>
                  <span v-if="findMatchingClass(classList, group)" class="setup__badge setup__badge--update">Update Existing</span>
                  <span v-else class="setup__badge setup__badge--new">New Class</span>
                </div>
              </div>
            </div>
            <div class="setup__bulk-count">{{ group.students.length }} students</div>
          </div>
        </template>
      </div>
      <div class="setup__dialog-actions">
        <button class="setup__btn-primary" @click="emit('confirm')" :disabled="selectedCount === 0">
          Import {{ selectedCount }} Classes
        </button>
        <button class="setup__btn-ghost" @click="emit('cancel')">Cancel</button>
      </div>
    </div>
    <div class="setup__dialog-backdrop" @click="emit('cancel')" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { groupBulkBySemester, findMatchingClass } from '../../utils/rosterCsvImport.js'

const props = defineProps({
  /** groupRosterRows() output; each group's `selected` flag is toggled in place */
  groups: { type: Object, required: true },
  newPeriods: { type: Array, default: () => [] },
  skippedRows: { type: Array, default: () => [] }
})
const emit = defineEmits(['confirm', 'cancel'])

const { classList } = useClassroom()

const sections = computed(() => groupBulkBySemester(props.groups))
const allGroups = computed(() => Object.values(props.groups))
const selectedCount = computed(() => allGroups.value.filter(g => g.selected).length)
const isAllSelected = computed(() => allGroups.value.every(g => g.selected))

const availableSemesters = computed(() => {
  const sems = new Set(allGroups.value.map(g => g.semester))
  return [...sems].filter(s => s !== 'Full').sort((a, b) => Number(a) - Number(b))
})

function toggleAll() {
  const target = !isAllSelected.value
  allGroups.value.forEach(g => { g.selected = target })
}

function isSemesterAllSelected(sem) {
  return allGroups.value.filter(g => g.semester === sem).every(g => g.selected)
}

function toggleSemester(sem) {
  const target = !isSemesterAllSelected(sem)
  allGroups.value.filter(g => g.semester === sem).forEach(g => { g.selected = target })
}
</script>
