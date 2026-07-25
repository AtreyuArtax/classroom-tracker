<template>
  <BaseModal
    v-if="show"
    :show="true"
    :show-x="false"
    @close="$emit('close')"
    max-width="950px"
    title="Print Semester Calendar"
  >
    <template #header>
      <div class="calendar-modal-header">
        <div class="header-title-group">
          <Calendar class="header-icon" :size="22" />
          <h3 class="header-title">Print Semester Calendar ({{ selectedYear }} Sem {{ selectedSemester }})</h3>
        </div>
        <button class="header-close" @click="$emit('close')">
          <X :size="20" />
        </button>
      </div>
    </template>

    <div class="calendar-modal-body">
      <SemesterCalendar 
        v-if="activeTermForCalendar"
        :term="activeTermForCalendar"
        :non-school-days="nonSchoolDays"
        :milestones="filteredMilestones"
        :teacher-name="teacherName"
      />
      <div v-else class="calendar-empty-state">
        <p>No active semester selected. Select a school year and semester in the top bar to print the calendar.</p>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { Calendar, X } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import SemesterCalendar from '../setup/SemesterCalendar.vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { globalMilestones } from '../../composables/useGradebook.js'
import * as settingsService from '../../db/settingsService.js'

defineProps({
  show: { type: Boolean, default: false },
  reportClass: { type: Object, default: null }
})

defineEmits(['close'])

const { 
  nonSchoolDays, 
  selectedYear,
  selectedSemester,
  teacherName,
  getTermRange
} = useClassroom()

const activeTermDetails = computed(() => {
  if (!selectedYear.value || !selectedSemester.value) return null
  return getTermRange(selectedYear.value, selectedSemester.value)
})

const activeTermForCalendar = computed(() => {
  const details = activeTermDetails.value
  if (!details) return null
  return {
    year: selectedYear.value,
    semester: selectedSemester.value,
    startDate: details.start.toISOString().split('T')[0],
    endDate: details.end.toISOString().split('T')[0]
  }
})

const filteredMilestones = computed(() => {
  const year = selectedYear.value
  return globalMilestones.value.filter(m => !m.year || m.year === year)
})

onMounted(async () => {
  if (globalMilestones.value.length === 0) {
    globalMilestones.value = await settingsService.getGlobalMilestones()
  }
})
</script>

<style scoped>
.calendar-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  color: var(--primary);
}

.header-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.header-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
}

.header-close:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.calendar-modal-body {
  padding: 12px 0;
}

.calendar-empty-state {
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
</style>
