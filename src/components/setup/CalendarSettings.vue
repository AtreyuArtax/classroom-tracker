<template>
  <div class="calendar-settings">
    <!-- Semester Boundaries -->
    <div class="setup__card">
      <div class="setup__card-header-row">
        <h2 class="setup__card-title">
          <CalendarDays :size="20" /> School Year and Semester
        </h2>
        <button class="setup__btn-ghost setup__btn-sm" @click="showAdvancedModal = true">
          Advanced Settings
        </button>
      </div>
      
      <div class="setup__term-summary">
        <div v-if="activeTermDetails" class="setup__term-status">
          <div class="setup__term-badge" :class="{ 'setup__term-badge--custom': activeTermDetails.isCustom }">
            {{ activeTermDetails.isCustom ? 'Custom Dates' : 'Standard Dates' }}
          </div>
          <div class="setup__term-info">
            <strong>{{ selectedYear }} Sem {{ selectedSemester }}</strong>
            <span class="setup__term-dates">
              {{ activeTermDetails.start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }} 
              – 
              {{ activeTermDetails.end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </span>
          </div>
        </div>
        <p v-else class="setup__hint" style="padding: 10px; background: rgba(0,0,0,0.05); border-radius: 4px;">
          No year or semester selected in the top filter.
        </p>
        
        <p class="setup__hint" style="margin-top: 12px;">
          Define boundaries to enable automated class setup, historical tracking, and semester reports. 
          By default, the app assumes a standard Sept–June calendar.
        </p>
      </div>
      
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <button 
          class="setup__btn-primary" 
          :disabled="!activeTermDetails" 
          @click="showCalendarModal = true"
        >
          <CalendarDays :size="14" /> Print Semester Calendar
        </button>
      </div>

      <!-- Advanced Terms Modal -->
      <BaseModal
        v-if="showAdvancedModal"
        :show="showAdvancedModal"
        title="Advanced Calendar Settings"
        maxWidth="800px"
        @close="showAdvancedModal = false"
      >
        <div class="advanced-terms-modal">
          <p class="setup__hint" style="margin-bottom: 20px;">
            Customize start and end dates for your semesters. These are used for attendance reporting and automated setup.
            Old years are preserved for historical reports.
          </p>

          <div class="setup__gb-list scrollable-list">
            <template v-for="group in termsByYear" :key="group.year">
              <div class="setup__year-group-header">{{ group.year || 'Unknown Year' }}</div>
              
              <div v-for="term in group.terms" :key="term.idx" class="setup__gb-item setup__gb-item--term">
                <div class="setup__term-row">
                  <div class="setup__term-unit">
                    <span class="setup__mini-label">Year</span>
                    <input 
                      v-model="terms[term.idx].year" 
                      class="setup__input setup__input--white" 
                      placeholder="2025-26" 
                      style="width: 110px;"
                      @change="saveTerms" 
                    />
                  </div>
                  <div class="setup__term-unit">
                    <span class="setup__mini-label">Sem</span>
                    <select v-model="terms[term.idx].semester" class="setup__input setup__input--white" style="width: 90px;" @change="saveTerms">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="Full">Full</option>
                    </select>
                  </div>
                  <div class="setup__term-unit" style="flex: 1;">
                    <span class="setup__mini-label">Start Date</span>
                    <input v-model="terms[term.idx].startDate" type="date" class="setup__input setup__input--white" @change="saveTerms" />
                  </div>
                  <span class="setup__range-sep">—</span>
                  <div class="setup__term-unit" style="flex: 1;">
                    <span class="setup__mini-label">End Date</span>
                    <input v-model="terms[term.idx].endDate" type="date" class="setup__input setup__input--white" @change="saveTerms" />
                  </div>
                  <div class="setup__term-unit" style="width: 80px;">
                    <span class="setup__mini-label">Days</span>
                    <input v-model.number="terms[term.idx].instructionalDays" type="number" class="setup__input setup__input--white" @change="saveTerms" />
                  </div>
                </div>
                <button class="setup__icon-btn setup__icon-btn--danger" @click="removeTerm(term.idx)">
                  <Trash2 :size="16" />
                </button>
              </div>
            </template>

            <div v-if="terms.length === 0" class="setup__empty-state">
              No custom calendar settings defined. Using standard defaults.
            </div>
          </div>

          <button class="setup__btn-ghost setup__btn--full" style="margin-top: 16px;" @click="addTerm">
            <Plus :size="14" /> Add Custom Term
          </button>
        </div>
        
        <template #footer>
          <button class="setup__btn-primary" @click="showAdvancedModal = false">Done</button>
        </template>
      </BaseModal>

      <!-- Semester Calendar Modal -->
      <BaseModal 
        v-if="showCalendarModal" 
        :show="showCalendarModal" 
        title="Semester Overview Calendar" 
        maxWidth="1000px"
        @close="showCalendarModal = false"
      >
        <SemesterCalendar 
          :term="activeTermForCalendar"
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

      <!-- CSV Bulk Import & Export for Holidays -->
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

        <button 
          class="setup__btn-ghost setup__btn-sm" 
          @click="exportHolidaysCsv"
          :disabled="filteredNonSchoolDays.length === 0"
          title="Export current year schedule to CSV"
        >
          <Download :size="14" /> Export CSV
        </button>

        <span class="setup__hint" style="margin-left: auto;">Format: <code>Date, [EndDate], Label</code></span>
      </div>

      <div v-if="calendarStatus.text" class="setup__inline-banner" :class="'setup__inline-banner--' + calendarStatus.type" style="margin-top: 12px;">
        <span>{{ calendarStatus.text }}</span>
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
        <div v-for="(day, idx) in filteredNonSchoolDays" :key="idx" class="setup__gb-item">
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
          <button class="setup__icon-btn setup__icon-btn--danger" @click="removeNonSchoolDay(day)">
            <Trash2 :size="16" />
          </button>
        </div>
        <div v-if="filteredNonSchoolDays.length === 0" class="setup__empty-state">
          No holidays or PD days added for this year.
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
        Define key reporting cutoff dates (e.g. Progress Reports, Midterms, Term 1) for <strong>{{ selectedYear }}</strong>. 
        These generate the date filter presets in your Gradebook and reporting snapshots.
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
import { CalendarDays, Palmtree, Trash2, Plus, FileUp, Flag, FileCode, Download } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { globalMilestones } from '../../composables/useGradebook.js'
import * as settingsService from '../../db/settingsService.js'
import { useMessage } from '../../composables/useMessage.js'
import BaseModal from '../BaseModal.vue'
import SemesterCalendar from './SemesterCalendar.vue'
import Papa from 'papaparse'
import { formatLocalDate } from '../../utils/dates.js'

const { 
  academicTerms: terms, 
  nonSchoolDays, 
  selectedYear,
  selectedSemester,
  teacherName,
  updateAcademicTerms,
  updateNonSchoolDays,
  getTermRange
} = useClassroom()

const showPasteModal = ref(false)
const showCalendarModal = ref(false)
const showAdvancedModal = ref(false)
const pastedCsv = ref('')
const { alert, confirm } = useMessage()

const activeTermDetails = computed(() => {
  if (!selectedYear.value || !selectedSemester.value) return null
  return getTermRange(selectedYear.value, selectedSemester.value)
})

// For the calendar modal, we need an object that looks like the DB term record
const activeTermForCalendar = computed(() => {
  const details = activeTermDetails.value
  if (!details) return null
  return {
    year: selectedYear.value,
    semester: selectedSemester.value,
    startDate: formatLocalDate(details.start),
    endDate: formatLocalDate(details.end)
  }
})

/**
 * Groups custom terms by school year for better organization in the modal.
 */
const termsByYear = computed(() => {
  const groups = {}
  terms.value.forEach((t, idx) => {
    const year = t.year || 'Unknown'
    if (!groups[year]) groups[year] = []
    groups[year].push({ ...t, idx })
  })
  
  // Sort years descending
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(year => ({
      year,
      terms: groups[year].sort((a, b) => a.semester.localeCompare(b.semester))
    }))
})

onMounted(async () => {
  if (globalMilestones.value.length === 0) {
    globalMilestones.value = await settingsService.getGlobalMilestones()
  }
})

function addTerm() {
  const newTerms = [...terms.value, { 
    year: selectedYear.value, 
    semester: '1', 
    startDate: '', 
    endDate: '',
    instructionalDays: 94
  }]
  updateAcademicTerms(newTerms)
}

async function removeTerm(index) {
  const term = terms.value[index]
  const label = term ? `${term.year} Sem ${term.semester}` : 'this term'
  if (!await confirm(`Are you sure you want to remove ${label}?`, 'Remove Term', { danger: true })) return
  const newTerms = [...terms.value]
  newTerms.splice(index, 1)
  await updateAcademicTerms(newTerms)
}

async function saveTerms() {
  await updateAcademicTerms(terms.value)
}

const filteredNonSchoolDays = computed(() => {
  if (!selectedYear.value) return nonSchoolDays.value
  const startYear = parseInt(selectedYear.value.split('-')[0])
  const startRange = `${startYear}-08-01`
  const endRange = `${startYear + 1}-07-31`
  return nonSchoolDays.value.filter(d => {
    if (!d.date) return true // Keep blanks visible during creation
    return d.date >= startRange && d.date <= endRange
  })
})

function addNonSchoolDay() {
  const startYear = selectedYear.value ? parseInt(selectedYear.value.split('-')[0]) : new Date().getFullYear()
  const defaultDate = `${startYear}-09-01` // Pre-fill to fit current school year filter
  const newDays = [{ date: defaultDate, endDate: '', label: '' }, ...nonSchoolDays.value]
  updateNonSchoolDays(newDays)
}

async function removeNonSchoolDay(day) {
  const label = day?.label || day?.date || 'this entry'
  if (!await confirm(`Are you sure you want to remove ${label}?`, 'Remove Holiday/PD Day', { danger: true })) return
  const newDays = nonSchoolDays.value.filter(d => d !== day)
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
    date: formatLocalDate(new Date())
  })
  saveMilestones()
}

async function deleteMilestone(id) {
  const ms = globalMilestones.value.find(ms => ms.milestoneId === id)
  const label = ms?.name || 'this milestone'
  if (!await confirm(`Are you sure you want to delete ${label}?`, 'Delete Milestone', { danger: true })) return
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

const calendarStatus = ref({ text: '', type: 'success' })

function setCalendarStatus(text, type = 'success') {
  calendarStatus.value = { text, type }
  setTimeout(() => {
    if (calendarStatus.value.text === text) calendarStatus.value.text = ''
  }, 4000)
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
    // Map existing non-school days by date
    const daysMap = new Map(nonSchoolDays.value.map(d => [d.date, { ...d }]))
    let updatedCount = 0
    let addedCount = 0

    // Overwrite existing entries on matching date or add new ones
    for (const item of newDays) {
      if (daysMap.has(item.date)) {
        daysMap.set(item.date, item)
        updatedCount++
      } else {
        daysMap.set(item.date, item)
        addedCount++
      }
    }

    nonSchoolDays.value = Array.from(daysMap.values())
    await saveNonSchoolDays()

    const summaryParts = []
    if (addedCount > 0) summaryParts.push(`${addedCount} added`)
    if (updatedCount > 0) summaryParts.push(`${updatedCount} updated/overwritten`)
    const message = `Import complete: ${summaryParts.join(', ')}.`
    setCalendarStatus(message, 'success')
  } else {
    const errorMsg = 'No valid dates found in data. Ensure format is YYYY-MM-DD.'
    setCalendarStatus(errorMsg, 'warning')
  }
}

function exportHolidaysCsv() {
  const dataToExport = filteredNonSchoolDays.value
    .filter(d => d.date)
    .map(d => ({
      Date: d.date,
      EndDate: d.endDate || '',
      Label: d.label || ''
    }))

  if (dataToExport.length === 0) {
    alert('No holidays or PD days to export for this school year.', 'Export Notice')
    return
  }

  const csv = Papa.unparse(dataToExport)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const yearTag = selectedYear.value ? `_${selectedYear.value}` : ''
  link.setAttribute('href', url)
  link.setAttribute('download', `school_calendar_holidays${yearTag}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  setCalendarStatus(`Exported ${dataToExport.length} holidays/PD days.`, 'success')
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

.setup__card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.setup__term-summary {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 20px;
  border-left: 5px solid var(--primary);
}

.setup__term-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup__term-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: #34c759;
  color: white;
  text-transform: uppercase;
}

.setup__term-badge--custom {
  background: #5856d6;
}

.setup__term-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.setup__term-info strong {
  font-size: 1.2rem;
  color: var(--text);
}

.setup__term-dates {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.setup__year-group-header {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-secondary);
  margin-top: 16px;
  margin-bottom: 8px;
  border-bottom: 2px solid var(--border);
  padding-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.setup__inline-banner {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup__inline-banner--success {
  background: rgba(52, 199, 89, 0.12);
  border: 1px solid rgba(52, 199, 89, 0.35);
  color: #15803d;
}

.setup__inline-banner--warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #b45309;
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
