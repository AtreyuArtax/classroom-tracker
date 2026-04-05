<template>
  <div class="calendar-settings">
    <!-- Semester Boundaries -->
    <div class="setup__card">
      <h2 class="setup__card-title">
        <CalendarDays :size="20" /> Academic Terms
      </h2>
      <p class="setup__hint">
        Define semester date boundaries to enable automated class setup, historical tracking, and term reports.
      </p>
      
      <div class="setup__gb-list">
        <div v-for="(term, idx) in terms" :key="idx" class="setup__gb-item setup__gb-item--term">
          <div class="setup__term-row">
            <div class="setup__term-unit">
              <span class="setup__mini-label">Year</span>
              <input 
                v-model="term.year" 
                class="setup__input setup__input--white" 
                placeholder="2025-26" 
                style="width: 110px;"
                @change="saveTerms" 
              />
            </div>
            <div class="setup__term-unit">
              <span class="setup__mini-label">Sem</span>
              <select v-model="term.semester" class="setup__input setup__input--white" style="width: 90px;" @change="saveTerms">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="Full">Full</option>
              </select>
            </div>
            <div class="setup__term-unit" style="flex: 1;">
              <span class="setup__mini-label">Start Date</span>
              <input v-model="term.startDate" type="date" class="setup__input setup__input--white" @change="saveTerms" />
            </div>
            <span class="setup__range-sep">—</span>
            <div class="setup__term-unit" style="flex: 1;">
              <span class="setup__mini-label">End Date</span>
              <input v-model="term.endDate" type="date" class="setup__input setup__input--white" @change="saveTerms" />
            </div>
          </div>
          <button class="setup__icon-btn setup__icon-btn--danger" @click="removeTerm(idx)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <button class="setup__btn-ghost" @click="addTerm">
          <Plus :size="14" /> Add Term
        </button>
        <button 
          class="setup__btn-primary" 
          :disabled="!activeTerm" 
          @click="showCalendarModal = true"
        >
          <CalendarDays :size="14" /> Print Semester Calendar
        </button>
      </div>

      <!-- Semester Calendar Modal -->
      <BaseModal 
        v-if="showCalendarModal" 
        :show="showCalendarModal" 
        title="Semester Overview Calendar" 
        maxWidth="1000px"
        @close="showCalendarModal = false"
      >
        <SemesterCalendar 
          :term="activeTerm"
          :non-school-days="nonSchoolDays"
          :milestones="filteredMilestones"
          :teacher-name="teacherName"
        />
        
        <template #footer>
          <button class="setup__btn-ghost" @click="showCalendarModal = false">Close</button>
        </template>
      </BaseModal>
    </div>

    <!-- Non-School Days (Holidays/PD Days) -->
    <div class="setup__card">
      <h2 class="setup__card-title">
        <Palmtree :size="20" /> Holidays & PD Days
      </h2>
      <p class="setup__hint">
        Add non-school days to exclude them from attendance reports and analytics.
      </p>

      <!-- CSV Bulk Import for Holidays -->
      <div class="calendar-import-box" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <label class="setup__btn-primary setup__btn-sm" for="holiday-csv" style="cursor: pointer; position: relative; overflow: hidden;">
          <FileUp :size="14" /> Import CSV
          <input 
            id="holiday-csv" 
            type="file" 
            accept=".csv" 
            style="position: absolute; opacity: 0; left: 0; top: 0; width: 100%; height: 100%; cursor: pointer;"
            @change="handleCsvImport" 
          />
        </label>

        <button class="setup__btn-ghost setup__btn-sm" @click="showPasteModal = true">
          <FileCode :size="14" /> Paste CSV
        </button>

        <span class="setup__hint" style="margin-left: auto;">Format: <code>Date, [EndDate], Label</code></span>
      </div>

      <BaseModal 
        v-if="showPasteModal" 
        :show="showPasteModal" 
        title="Paste Holiday CSV Data" 
        @close="showPasteModal = false"
      >
        <div class="setup__paste-container">
          <p class="setup__hint" style="margin-bottom: 12px;">
            Paste your CSV data below. One line per holiday. <br/>
            Example: <code>2025-12-22, 2026-01-02, Winter Break</code>
          </p>
          <textarea 
            v-model="pastedCsv" 
            class="setup__input setup__input--white" 
            style="width: 100%; height: 200px; font-family: monospace; font-size: 0.85rem; padding: 12px;"
            placeholder="YYYY-MM-DD, [EndDate], Label..."
          ></textarea>
        </div>

        <template #footer>
          <button class="setup__btn-primary" @click="processPastedCsv" :disabled="!pastedCsv.trim()">
            Import Data
          </button>
          <button class="setup__btn-ghost" @click="showPasteModal = false">Cancel</button>
        </template>
      </BaseModal>

      <div class="setup__gb-list scrollable-list">
        <div v-for="(day, idx) in nonSchoolDays" :key="idx" class="setup__gb-item">
          <div class="setup__term-row">
            <div class="setup__term-unit">
              <span class="setup__mini-label">Start Date</span>
              <input v-model="day.date" type="date" class="setup__input setup__input--white" style="width: 140px;" @change="saveNonSchoolDays" />
            </div>
            <span class="setup__range-sep" style="padding-bottom: 8px;">to</span>
            <div class="setup__term-unit">
              <span class="setup__mini-label">End Date (Opt)</span>
              <input v-model="day.endDate" type="date" class="setup__input setup__input--white" style="width: 140px;" @change="saveNonSchoolDays" />
            </div>
            <div class="setup__term-unit" style="flex: 1;">
              <span class="setup__mini-label">Holiday Name</span>
              <input 
                v-model="day.label" 
                class="setup__input setup__input--white" 
                placeholder="e.g. Winter Break" 
                @change="saveNonSchoolDays" 
              />
            </div>
          </div>
          <button class="setup__icon-btn setup__icon-btn--danger" @click="removeNonSchoolDay(idx)">
            <Trash2 :size="16" />
          </button>
        </div>
        <div v-if="nonSchoolDays.length === 0" class="setup__empty-state">
          No holidays or PD days added yet.
        </div>
      </div>

      <button class="setup__btn-ghost setup__btn--full" @click="addNonSchoolDay">
        <Plus :size="14" /> Add Holiday/PD Day
      </button>
    </div>

    <!-- Milestones -->
    <div class="setup__card">
      <h2 class="setup__card-title">
        <Flag :size="20" /> Academic Milestones
      </h2>
      <p class="setup__hint">
        Define key dates (e.g., Progress Reports) for <strong>{{ selectedYear }}</strong>.
      </p>

      <div class="setup__gb-list">
        <div v-for="ms in filteredMilestones" :key="ms.milestoneId" class="setup__gb-item">
          <div class="setup__term-row">
            <input 
              v-model="ms.name" 
              class="setup__input setup__input--white" 
              placeholder="Milestone Name" 
              style="flex: 1;"
              @change="saveMilestones" 
            />
            <input 
              v-model="ms.date" 
              type="date" 
              class="setup__input setup__input--white" 
              style="width: 160px;"
              @change="saveMilestones" 
            />
          </div>
          <button class="setup__icon-btn setup__icon-btn--danger" @click="deleteMilestone(ms.milestoneId)">
            <Trash2 :size="16" />
          </button>
        </div>
        <div v-if="filteredMilestones.length === 0" class="setup__empty-state">
          No milestones added for this year.
        </div>
      </div>
      
      <button class="setup__btn-ghost setup__btn--full" @click="addMilestone">
        <Plus :size="14" /> Add Milestone
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { CalendarDays, Palmtree, Trash2, Plus, FileUp, Flag, FileCode } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { globalMilestones } from '../../composables/useGradebook.js'
import * as settingsService from '../../db/settingsService.js'
import BaseModal from '../BaseModal.vue'
import SemesterCalendar from './SemesterCalendar.vue'
import Papa from 'papaparse'

const { 
  academicTerms: terms, 
  nonSchoolDays, 
  selectedYear,
  selectedSemester,
  teacherName,
  updateAcademicTerms,
  updateNonSchoolDays
} = useClassroom()

const showPasteModal = ref(false)
const showCalendarModal = ref(false)
const pastedCsv = ref('')

const activeTerm = computed(() => {
  return terms.value.find(t => t.year === selectedYear.value && t.semester === selectedSemester.value)
})

onMounted(async () => {
  if (globalMilestones.value.length === 0) {
    globalMilestones.value = await settingsService.getGlobalMilestones()
  }
})

function addTerm() {
  const newTerms = [...terms.value, { year: '', semester: '1', startDate: '', endDate: '' }]
  updateAcademicTerms(newTerms)
}

async function removeTerm(index) {
  const term = terms.value[index]
  const label = term ? `${term.year} Sem ${term.semester}` : 'this term'
  if (!window.confirm(`Are you sure you want to remove ${label}?`)) return
  const newTerms = [...terms.value]
  newTerms.splice(index, 1)
  await updateAcademicTerms(newTerms)
}

async function saveTerms() {
  await updateAcademicTerms(terms.value)
}

function addNonSchoolDay() {
  const newDays = [{ date: '', endDate: '', label: '' }, ...nonSchoolDays.value]
  updateNonSchoolDays(newDays)
}

async function removeNonSchoolDay(index) {
  const newDays = [...nonSchoolDays.value]
  newDays.splice(index, 1)
  await updateNonSchoolDays(newDays)
}

async function saveNonSchoolDays() {
  const sorted = [...nonSchoolDays.value]
    .filter(d => d.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  
  await updateNonSchoolDays(sorted)
}

const filteredMilestones = computed(() => {
  return globalMilestones.value.filter(ms => !ms.year || ms.year === selectedYear.value)
})

async function saveMilestones() {
  await settingsService.saveGlobalMilestones(JSON.parse(JSON.stringify(globalMilestones.value)))
}

function addMilestone() {
  globalMilestones.value.push({
    milestoneId: `ms_${Date.now()}`,
    year: selectedYear.value || '',
    name: '',
    date: new Date().toISOString().split('T')[0]
  })
  saveMilestones()
}

async function deleteMilestone(id) {
  globalMilestones.value = globalMilestones.value.filter(ms => ms.milestoneId !== id)
  await saveMilestones()
}

function handleCsvImport(event) {
  const file = event.target.files[0]
  if (!file) return

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      await importHolidays(results.data)
    }
  })
}

function processPastedCsv() {
  if (!pastedCsv.value.trim()) return

  // Auto-detect if header exists, otherwise force columns
  const firstLine = pastedCsv.value.trim().split('\n')[0]
  const hasHeader = firstLine.toLowerCase().includes('date') || firstLine.toLowerCase().includes('label')

  Papa.parse(pastedCsv.value, {
    header: hasHeader,
    skipEmptyLines: true,
    complete: async (results) => {
      // If no header, transform array of arrays to objects
      let data = results.data
      if (!hasHeader) {
        data = data.map(arr => ({
          date: arr[0],
          endDate: arr.length > 2 ? arr[1] : '',
          label: arr.length > 2 ? arr[2] : (arr[1] || 'Holiday')
        }))
      }
      await importHolidays(data)
      showPasteModal.value = false
      pastedCsv.value = ''
    }
  })
}

async function importHolidays(rawData) {
  const newDays = rawData
    .map(row => {
      const date = row.Date || row.date || row.StartDate || row.startDate || Object.values(row)[0]
      const endDate = row.EndDate || row.endDate || ''
      const label = row.Label || row.label || row.Description || row.description || Object.values(row)[1] || 'Holiday'
      return { date: date?.trim(), endDate: endDate?.trim(), label: label?.trim() }
    })
    .filter(d => d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date))

  if (newDays.length > 0) {
    const existingDates = new Set(nonSchoolDays.value.map(d => d.date))
    const uniqueNew = newDays.filter(d => !existingDates.has(d.date))
    
    nonSchoolDays.value = [...nonSchoolDays.value, ...uniqueNew]
    await saveNonSchoolDays()
    alert(`Imported ${uniqueNew.length} new holidays/PD days.`)
  } else {
    alert('No valid dates found in data. Ensure format is YYYY-MM-DD.')
  }
}
</script>

<style scoped>
.calendar-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Card Styling to match Setup.vue */
.setup__card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 24px;
}

.setup__gb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

/* Standard Gray Item background seen in Graduation Buckets/Behavior Strategy */
.setup__gb-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary); /* This is the gray background */
  border-radius: var(--radius-md);
  gap: 12px;
}

.setup__gb-item--term {
  padding: 16px;
}

.setup__term-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex: 1;
}

.setup__term-unit {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setup__term-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.setup__mini-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: 2px;
}

/* Match Setup.vue inputs (White background on Gray container) */
.setup__input--white {
  background: white !important;
  border: 1px solid var(--border) !important;
}

.setup__range-sep {
  color: var(--text-secondary);
  font-weight: bold;
  padding-bottom: 10px;
}

.calendar-import-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.scrollable-list {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.setup__empty-state {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}

.setup__btn--full {
  width: 100%;
}

@media (max-width: 600px) {
  .setup__term-row {
    flex-wrap: wrap;
  }
}
</style>
