<template>
  <div class="roster-csv-importer">
    <!-- Drag & Drop CSV Uploader -->
    <div class="setup__card setup__card--accent">
      <h2 class="setup__card-title">Bulk Setup / New Semester</h2>
      <p class="setup__hint">
        Drop your board-provided CSV here to automatically detect, create, and update classes for the new term.
      </p>
      <label 
        class="setup__file-label" 
        for="roster-file"
        :class="{ 'setup__file-label--drag': isDraggingRoster }"
        @dragover.prevent="isDraggingRoster = true"
        @dragleave.prevent="isDraggingRoster = false"
        @drop.prevent="isDraggingRoster = false; onFileSelected($event)"
      >
        <FolderOpen :size="16" /> {{ isDraggingRoster ? 'Drop CSV here...' : 'Choose CSV file or drag & drop here' }}
        <input
          id="roster-file"
          type="file"
          accept=".csv,text/csv"
          class="setup__file-input"
          @change="onFileSelected"
        />
      </label>
      
      <div class="setup__csv-help-container">
        <button 
          type="button" 
          class="setup__csv-help-toggle" 
          @click="isCsvHelpOpen = !isCsvHelpOpen"
        >
          <Info :size="14" />
          <span>{{ isCsvHelpOpen ? 'Hide CSV Format Guide' : 'Show Roster Format & PowerSchool CSV Help' }}</span>
          <component :is="isCsvHelpOpen ? ChevronUp : ChevronDown" :size="14" />
        </button>
        <Transition name="csv-fade">
          <CsvHelpGuide v-if="isCsvHelpOpen" />
        </Transition>
      </div>

      <!-- Quick Success Banner for Single Roster Import -->
      <div v-if="importResult" class="setup__import-result-summary">
        <div v-if="importResult.error" class="setup__import-error">
          ⚠️ {{ importResult.error }}
        </div>
        <div v-else class="setup__import-success">
          ✅ Import Complete: Added {{ importResult.inserted }} students, updated {{ importResult.updated }} students.
        </div>
      </div>
    </div>

    <!-- ── Multi-Class Import Selector Dialog ─── -->
    <div v-if="bulkImportGroups" class="setup__dialog" role="dialog" aria-modal="true">
      <div class="setup__dialog-box setup__dialog-box--large">
        <h3 class="setup__dialog-title">Multi-Class Import Detected</h3>
        <p class="setup__dialog-body">This CSV contains students for multiple classes. Select the ones you want to create or update.</p>
        <div class="setup__bulk-header">
          <div class="setup__bulk-header-left">
            <label class="setup__label setup__label--checkbox setup__bulk-select-all">
              <input type="checkbox" :checked="isAllSelected" @change="toggleAllBulk" />
              Select All
            </label>
            <button
              v-for="sem in bulkAvailableSemesters"
              :key="sem"
              class="setup__bulk-sem-btn"
              :class="{ 'setup__bulk-sem-btn--active': isSemesterAllSelected(sem) }"
              @click="selectSemesterBulk(sem)"
            >Sem {{ sem }}</button>
          </div>
          <span class="setup__bulk-summary">{{ selectedBulkCount }} of {{ Object.keys(bulkImportGroups).length }} selected</span>
        </div>

        <!-- New Periods Advisory -->
        <div v-if="newPeriodsDetected.length > 0" class="setup__advisory">
          <AlertTriangle :size="16" />
          <div>
            <strong>New Periods Detected ({{ newPeriodsDetected.join(', ') }})</strong>
            <p>These periods were added to your settings. Please review their start times after importing.</p>
          </div>
        </div>
        <div class="setup__bulk-list">
          <template v-for="section in bulkImportSemesters" :key="section.label">
            <div class="setup__bulk-section-heading">{{ section.label }}</div>
            <div v-for="{ key, group } in section.groups" :key="key" class="setup__bulk-item">
              <div class="setup__bulk-item-main">
                <input type="checkbox" v-model="group.selected" class="setup__checkbox" />
                <div class="setup__bulk-info">
                  <strong>{{ group.name }}</strong>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <span class="setup__chip">{{ group.year }} · Sem {{ group.semester }} · P{{ group.periodNumber }}</span>
                    <span v-if="group.courseCode" class="setup__chip setup__chip--blue">{{ group.courseCode }}</span>
                    <span v-if="isExistingClass(group)" class="setup__badge setup__badge--update">Update Existing</span>
                    <span v-else class="setup__badge setup__badge--new">New Class</span>
                  </div>
                </div>
              </div>
              <div class="setup__bulk-count">{{ group.students.length }} students</div>
            </div>
          </template>
        </div>
        <div class="setup__dialog-actions">
          <button class="setup__btn-primary" @click="confirmBulkImport" :disabled="selectedBulkCount === 0">
            Import {{ selectedBulkCount }} Classes
          </button>
          <button class="setup__btn-ghost" @click="bulkImportGroups = null">Cancel</button>
        </div>
      </div>
      <div class="setup__dialog-backdrop" @click="bulkImportGroups = null" />
    </div>

    <!-- ── Student ID Conflict Dialog ─── -->
    <div v-if="crossClassConflicts.length > 0" class="setup__dialog" role="dialog" aria-modal="true">
      <div class="setup__dialog-box">
        <h3 class="setup__dialog-title">Student ID Conflict</h3>
        <p class="setup__dialog-body">The following Student IDs already exist in another class. What would you like to do?</p>
        <ul class="setup__dialog-list">
          <li v-for="c in crossClassConflicts" :key="c.studentId">
            <strong>{{ c.student.firstName }} {{ c.student.lastName }}</strong>
            ({{ c.studentId }}) — currently in <em>{{ classNameById(c.existingClassId) }}</em>
          </li>
        </ul>
        <div class="setup__dialog-actions">
          <button class="setup__btn-primary" @click="resolveConflicts('move')">Move to this class</button>
          <button class="setup__btn-ghost"   @click="resolveConflicts('skip')">Skip these students</button>
        </div>
      </div>
      <div class="setup__dialog-backdrop" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import Papa from 'papaparse'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'
import CsvHelpGuide from './CsvHelpGuide.vue'
import { 
  FolderOpen, Info, ChevronUp, ChevronDown, 
  AlertTriangle, UserCheck 
} from 'lucide-vue-next'

const { 
  activeClass, 
  classList,
  periodOptions, 
  periodStartTimes, 
  updatePeriodStartTimes, 
  selectedYear, 
  selectedSemester,
  importRoster, 
  bulkImportClasses, 
  moveStudentFromClass 
} = useClassroom()

const { alert, confirm } = useMessage()

// State
const importResult = ref(null)
const crossClassConflicts = ref([])
const bulkImportGroups = ref(null)
let _pendingConflicts = []
const isDraggingRoster = ref(false)
const isCsvHelpOpen = ref(false)
const newPeriodsDetected = ref([])

const currentSchoolYear = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  if (month >= 8) return `${year}-${(year + 1).toString().slice(-2)}`
  return `${year - 1}-${year.toString().slice(-2)}`
})

function onFileSelected(evt) {
  const file = evt.dataTransfer?.files?.[0] || evt.target?.files?.[0]
  if (!file) return

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data.map(row => {
        const studentId = row['Student ID'] ?? row['Student Number'] ?? row['StudentID'] ?? row['student_id'] ?? ''
        let firstName = row['First Name'] ?? row['FirstName'] ?? row['first_name'] ?? ''
        let lastName  = row['Last Name']  ?? row['LastName']  ?? row['last_name']  ?? ''
        
        const studentName = row['Student Name'] ?? row['StudentName'] ?? row['student_name'] ?? ''
        if (!firstName && !lastName && studentName) {
          const parts = studentName.split(',')
          if (parts.length >= 2) {
            lastName  = parts[0]
            firstName = parts.slice(1).join(',')
          } else {
            lastName = studentName
          }
        }
        
        const studentEmail = row['Student eMail'] ?? row['Student Email'] ?? ''
        const custody = row['Custody'] ?? ''
        const livingWith = row['Living With'] ?? ''
        const birthDate = row['Birth'] ?? ''

        const parentContacts = []
        for (let i = 1; i <= 4; i++) {
          const pName = row[`Par${i} Name`] ?? ''
          const pEmail = row[`Par${i} eMail`] ?? ''
          const pPhone = row[`Par${i} Mobile`] || row[`Par${i} Home`] || ''
          if (pName || pEmail || pPhone) {
            parentContacts.push({ name: pName.trim(), email: pEmail.trim(), phone: pPhone.trim() })
          }
        }

        const rawSem = row['Semester'] ?? row['Sem'] ?? row['Schedule'] ?? ''
        const rawPeriod = row['Period'] ?? ''
        const rawSection = row['Section'] ?? row['Sec Section'] ?? ''
        
        const detectedYear = extractYearFromPeriod(rawPeriod || rawSection)
        const year = row['Year'] ?? detectedYear ?? (activeClass.value?.year || currentSchoolYear.value)
        
        const periodNumber = (rawPeriod || rawSection) ? cleanPeriod(rawPeriod || rawSection) : (activeClass.value?.periodNumber || '1')
        const courseCode = row['Course Code'] ?? row['CourseCode'] ?? (rawSection ? extractCourseCode(rawSection) : '')
        const semester = normalizeSemester(rawSem || (activeClass.value?.semester || '1'))

        const rawGrade = row['Grade'] ?? row['Grade Level'] ?? row['GradeLevel'] ?? row['grade'] ?? ''
        const gNum = parseInt(rawGrade, 10)
        const parsedG = rawGrade ? (!isNaN(gNum) ? `Grade ${gNum}` : (rawGrade.toLowerCase().startsWith('grade') ? rawGrade : `Grade ${rawGrade}`)) : ''

        return { 
          studentId: studentId.trim(), 
          firstName: firstName.trim(), 
          lastName: lastName.trim(),
          grade: parsedG,
          gradeLevel: parsedG,
          parentContacts,
          studentEmail: studentEmail.trim(),
          custody: custody.trim(),
          livingWith: livingWith.trim(),
          birthDate: birthDate.trim(),
          semester,
          periodNumber,
          year,
          courseCode
        }
      })

      const validRows = rows.filter(r => r.firstName.trim() || r.lastName.trim() || r.studentId.trim())

      const groups = {}
      for (const row of validRows) {
        const key = `${row.year}-${row.semester}-P${row.periodNumber}`
        if (!groups[key]) {
          const isHRM = (row.courseCode && row.courseCode.includes('HRM')) || row.periodNumber.toString().includes('AM-PM')
          const displayName = isHRM 
            ? `${row.courseCode || 'Homeroom'} — ${row.year}` 
            : `Period ${row.periodNumber} — ${row.year}`

          groups[key] = {
            name: displayName,
            year: row.year,
            semester: row.semester,
            periodNumber: isNaN(Number(row.periodNumber)) ? 1 : Number(row.periodNumber),
            courseCode: row.courseCode,
            students: [],
            selected: true
          }
        }
        groups[key].students.push(row)
      }

      const detectedPeriods = [...new Set(validRows.map(r => Number(r.periodNumber)))].filter(p => !isNaN(p))

      const missingPeriods = detectedPeriods.filter(p => !periodOptions.value.includes(p))
      
      if (missingPeriods.length > 0) {
        const updated = { ...periodStartTimes.value }
        missingPeriods.forEach(p => {
          const prev = p - 1
          const lastTime = updated[prev] || '08:00'
          const [h, m] = lastTime.split(':').map(Number)
          updated[p] = new Date(0, 0, 0, h, m + 80).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        })
        await updatePeriodStartTimes(updated)
        newPeriodsDetected.value = missingPeriods.sort((a, b) => a - b)
      } else {
        newPeriodsDetected.value = []
      }

      const groupKeys = Object.keys(groups)
      if (groupKeys.length > 1) {
        bulkImportGroups.value = groups
      } else {
        if (!activeClass.value) {
          await alert('This CSV contains only one class group. Please select or create a class first, then re-import. Alternatively, make sure your CSV contains a "Period" or "Semester" column so the bulk importer can detect multiple classes.')
          return
        }
        const result = await importRoster(rows)
        importResult.value = result

        if (result.crossClassConflicts.length > 0) {
          _pendingConflicts = result.crossClassConflicts
          crossClassConflicts.value = result.crossClassConflicts
        }
      }
    },
    error: (err) => {
      importResult.value = { error: err.message, inserted: 0, updated: 0, skipped: [], crossClassConflicts: [] }
    },
  })

  if (evt.target && evt.target.value !== undefined) {
    evt.target.value = ''
  }
}

// Bulk Selection Helpers
const bulkImportSemesters = computed(() => {
  if (!bulkImportGroups.value) return []
  const entries = Object.entries(bulkImportGroups.value).map(([key, group]) => ({ key, group }))
  const semOrder = (s) => s === 'Full' ? 99 : Number(s)
  const sems = [...new Set(entries.map(e => e.group.semester))].sort((a, b) => semOrder(a) - semOrder(b))
  
  return sems.map(sem => ({
    label: sem === 'Full' ? 'Full Year' : `Semester ${sem}`,
    groups: entries
      .filter(e => e.group.semester === sem)
      .sort((a, b) => Number(a.group.periodNumber) - Number(b.group.periodNumber))
  }))
})

const isAllSelected = computed(() => {
  if (!bulkImportGroups.value) return false
  const keys = Object.keys(bulkImportGroups.value)
  return keys.every(k => bulkImportGroups.value[k].selected)
})

const selectedBulkCount = computed(() => {
  if (!bulkImportGroups.value) return 0
  return Object.values(bulkImportGroups.value).filter(g => g.selected).length
})

function toggleAllBulk() {
  const target = !isAllSelected.value
  for (const k in bulkImportGroups.value) {
    bulkImportGroups.value[k].selected = target
  }
}

const bulkAvailableSemesters = computed(() => {
  if (!bulkImportGroups.value) return []
  const sems = new Set(Object.values(bulkImportGroups.value).map(g => g.semester))
  return [...sems].filter(s => s !== 'Full').sort((a, b) => Number(a) - Number(b))
})

function isSemesterAllSelected(sem) {
  if (!bulkImportGroups.value) return false
  return Object.values(bulkImportGroups.value)
    .filter(g => g.semester === sem)
    .every(g => g.selected)
}

function selectSemesterBulk(sem) {
  const target = !isSemesterAllSelected(sem)
  for (const k in bulkImportGroups.value) {
    if (bulkImportGroups.value[k].semester === sem) {
      bulkImportGroups.value[k].selected = target
    }
  }
}

function isExistingClass(group) {
  return classList.value.some(c => 
    c.year === group.year && 
    c.semester === group.semester && 
    Number(c.periodNumber) === Number(group.periodNumber)
  )
}

async function confirmBulkImport() {
  const selectedGroups = Object.values(bulkImportGroups.value).filter(g => g.selected)
  if (selectedGroups.length === 0) return
  
  await bulkImportClasses(selectedGroups)
  bulkImportGroups.value = null
  importResult.value = { inserted: 'Multiple', updated: 'Classes', skipped: [] }
  await alert('Bulk import complete!')
}

async function resolveConflicts(action) {
  if (action === 'move') {
    for (const conflict of _pendingConflicts) {
      await moveStudentFromClass(conflict.existingClassId, conflict.student)
    }
  }
  crossClassConflicts.value = []
  _pendingConflicts = []
}

function classNameById(classId) {
  return classList.value.find(c => c.classId === classId)?.name ?? classId
}

// Smart CSV Cleaning Helpers
function cleanPeriod(raw) {
  if (!raw) return '1'
  const match = raw.toString().match(/^(\d+)/)
  return match ? match[1] : raw.toString()
}

function extractCourseCode(raw) {
  if (!raw) return ''
  // SCDSB Sec Section format: "SPH3U1-2" — code is everything before the trailing "-N" section suffix
  const base = raw.toString().replace(/-\d+$/, '').trim()
  return base
}


function extractYearFromPeriod(raw) {
  if (!raw) return null
  const match = raw.toString().match(/\(Y(\d+)\)/i)
  if (match) {
    const yy = match[1]
    const fullYear = 2000 + parseInt(yy)
    return `${fullYear}-${(fullYear + 1).toString().slice(-2)}`
  }
  return null
}

function normalizeSemester(raw) {
  if (!raw) return '1'
  const str = raw.toString().trim()
  // Bare digit — e.g. Semester column = "2"
  if (str === '2') return '2'
  if (str === '1') return '1'
  // Full year strings like "2025-2026" are NOT semester numbers
  if (/^\d{4}-\d{2,4}$/.test(str)) return '1'
  const lower = str.toLowerCase()
  if (lower.includes('sem 2') || lower.includes('semester 2') || /\bs2\b/.test(lower) || /\bsem2\b/.test(lower)) {
    return '2'
  }
  return '1'
}

</script>

<style scoped>
.setup__card {
  background:    var(--surface, #1e2030);
  padding:       24px;
  border-radius: var(--radius-lg, 12px);
  box-shadow:    var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.15));
  border:        1px solid var(--border, rgba(255, 255, 255, 0.08));
  display:       flex;
  flex-direction: column;
  gap:           16px;
  margin-bottom: 24px;
}

.setup__card--accent {
  background:    var(--primary-light, rgba(99, 102, 241, 0.08));
  border:        1px solid var(--primary, #6366f1);
  border-left:   6px solid var(--primary, #6366f1);
}

.setup__card-title {
  font-size:     1.1rem;
  font-weight:   700;
  color:         var(--text, #ffffff);
  margin:        0 0 4px;
  display:       flex;
  align-items:   center;
  gap:           10px;
}

.setup__hint {
  font-size: 0.82rem;
  color:     var(--text-secondary, #94a3b8);
  line-height: 1.5;
  margin: 0;
}

.setup__file-label {
  display:         flex;
  align-items:     center;
  gap:             8px;
  padding:         14px;
  border:          2px dashed var(--border, rgba(255, 255, 255, 0.15));
  border-radius:   var(--radius-md, 8px);
  cursor:          pointer;
  font-size:       0.9rem;
  color:           var(--primary, #6366f1);
  font-weight:     600;
  min-height:      52px;
  transition:      border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.setup__file-label:hover {
  background:    rgba(99, 102, 241, 0.04);
  border-color:  var(--primary, #6366f1);
}

.setup__file-label--drag {
  background:    rgba(99, 102, 241, 0.1);
  border-color:  var(--primary, #6366f1);
  transform:     scale(1.01);
}

.setup__file-input {
  position: absolute;
  opacity:  0;
  width:    0;
  height:   0;
}

.setup__csv-help-container {
  display: flex;
  flex-direction: column;
}

.setup__csv-help-toggle {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 4px 0;
  width: fit-content;
  transition: color 0.15s ease;
}

.setup__csv-help-toggle:hover {
  color: var(--text, #ffffff);
}

/* Success Banner */
.setup__import-result-summary {
  margin-top: 8px;
}

.setup__import-success {
  background: rgba(34, 197, 94, 0.12);
  color: var(--state-success, #4ade80);
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  font-weight: 600;
}

.setup__import-error {
  background: rgba(239, 68, 68, 0.12);
  color: var(--state-out, #f87171);
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  font-weight: 600;
}

/* Dialogs */
.setup__dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.setup__dialog-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1;
}

.setup__dialog-box {
  background: var(--surface, #1b1d2a);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-lg, 0 10px 30px rgba(0, 0, 0, 0.3));
  padding: 24px;
  width: 100%;
  max-width: 500px;
  z-index: 2;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup__dialog-box--large {
  max-width: 700px;
}

.setup__dialog-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text, #ffffff);
  margin: 0;
}

.setup__dialog-body {
  font-size: 0.9rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
  line-height: 1.5;
}

.setup__dialog-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.setup__dialog-list li {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
}

/* Bulk import options list */
.setup__bulk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.setup__bulk-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup__bulk-sem-btn {
  padding: 4px 10px;
  border-radius: 100px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.setup__bulk-sem-btn--active {
  background: rgba(99, 102, 241, 0.12);
  border-color: var(--primary, #6366f1);
  color: var(--primary, #6366f1);
}

.setup__bulk-summary {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
}

.setup__bulk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 350px;
  overflow-y: auto;
  padding: 4px;
}

.setup__bulk-section-heading {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary, #94a3b8);
  letter-spacing: 0.05em;
  margin-top: 8px;
}

.setup__bulk-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md, 8px);
}

.setup__bulk-item-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setup__bulk-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setup__bulk-count {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
}

.setup__chip {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary, #94a3b8);
}

.setup__chip--blue {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary, #6366f1);
}

.setup__badge {
  font-size: 0.68rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.setup__badge--new {
  background: rgba(34, 197, 94, 0.12);
  color: var(--state-success, #4ade80);
}

.setup__badge--update {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.setup__advisory {
  display: flex;
  gap: 10px;
  background: rgba(245, 158, 11, 0.06);
  border-left: 4px solid #f59e0b;
  padding: 10px 12px;
  border-radius: 0 8px 8px 0;
  font-size: 0.82rem;
  color: var(--text-secondary, #94a3b8);
}

.setup__advisory strong {
  color: var(--text, #ffffff);
}

.setup__advisory p {
  margin: 2px 0 0;
  font-size: 0.78rem;
}

.setup__checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Switch & labels */
.setup__label--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.setup__label--checkbox input {
  margin: 0;
}

.setup__btn-primary {
  min-height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background: var(--primary, #6366f1);
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s ease;
}

.setup__btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.setup__btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setup__btn-ghost {
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 8px);
  background: transparent;
  color: var(--text, #ffffff);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s ease;
}

.setup__btn-ghost:hover {
  background: rgba(255, 255, 255, 0.04);
}

.setup__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

/* Transitions */
.csv-fade-enter-active,
.csv-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.csv-fade-enter-from,
.csv-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
