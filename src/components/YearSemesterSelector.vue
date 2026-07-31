<template>
  <div class="term-selector" v-if="availableTerms.length > 0">
    <div class="term-selector__group">
      <select 
        v-model="selectedYear" 
        class="term-selector__select term-selector__select--year"
        aria-label="Select Academic Year"
      >
        <option v-for="year in uniqueYears" :key="year" :value="year">
          {{ year }}
        </option>
      </select>

      <div v-if="teachingMode !== 'elementary'" class="term-selector__divider"></div>

      <select 
        v-if="teachingMode !== 'elementary'"
        v-model="selectedSemester" 
        class="term-selector__select term-selector__select--sem"
        aria-label="Select Semester"
      >
        <option v-for="sem in uniqueSemesters" :key="sem" :value="sem">
          Sem {{ sem }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useClassroom } from '../composables/useClassroom.js'

const { 
  classList, 
  archivedClasses, 
  selectedYear, 
  selectedSemester,
  teachingMode
} = useClassroom()

const allPossibleClasses = computed(() => [...classList.value, ...archivedClasses.value])

const uniqueYears = computed(() => {
  const years = new Set(allPossibleClasses.value.map(c => c.year).filter(Boolean))
  // Also include the currently selected one just in case
  if (selectedYear.value) years.add(selectedYear.value)
  return Array.from(years).sort().reverse()
})

const uniqueSemesters = computed(() => {
  const sems = new Set(allPossibleClasses.value.map(c => c.semester).filter(Boolean))
  if (selectedSemester.value) sems.add(selectedSemester.value)
  return Array.from(sems).sort()
})

const availableTerms = computed(() => uniqueYears.value)
</script>

<style scoped>
.term-selector {
  display: flex;
  align-items: center;
}

.term-selector__group {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 2px 4px;
  gap: 0;
}

.term-selector__select {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  padding: 4px 8px;
  cursor: pointer;
  outline: none;
  appearance: none;
  text-align: center;
}

.term-selector__select:hover {
  color: var(--primary);
}

.term-selector__select--year {
  min-width: 80px;
}

.term-selector__select--sem {
  min-width: 60px;
}

.term-selector__divider {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 2px;
}

/* Custom chevron for select since we used appearance: none */
.term-selector__group {
  position: relative;
}

.term-selector__select {
  /* Some padding for where the arrow would be if we added one */
}
</style>
