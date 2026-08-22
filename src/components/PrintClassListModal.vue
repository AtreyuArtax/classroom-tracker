<template>
  <div class="reports__modal-overlay">
    <div 
      class="reports__print-modal"
      :class="{ 'reports__print-modal--preview-open': showPreview, 'reports__print-modal--compact': !showPreview }"
    >
      <!-- Header (Clean header matching Batch Print) -->
      <header class="reports__modal-header">
        <div class="header-content">
          <Printer class="header-icon" :size="24" />
          <div>
            <h3 class="header-title">Print Class List &amp; Sign-In Sheet</h3>
            <p class="header-subtitle">{{ classRecord?.name || 'Class' }} · {{ sortedStudents.length }} Students</p>
          </div>
        </div>
        <button class="header-close" @click="$emit('close')">
          <X :size="20" />
        </button>
      </header>

      <!-- Body -->
      <div class="reports__modal-body" :class="{ 'reports__modal-body--with-preview': showPreview }">
        <!-- Configuration Section -->
        <div class="config-section">
          <div class="config-section-header">
            <h4 class="config-section-title">Sheet Options</h4>
            <button class="reports__btn-preview" @click="showPreview = !showPreview">
              {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
            </button>
          </div>

          <form class="setup__form" @submit.prevent="handlePrint" style="margin-top: 14px;">
            <label class="setup__label">
              Sheet Title
              <input v-model="form.title" class="setup__input" required placeholder="e.g. ATTENDANCE January 2026" />
            </label>

            <label v-if="isSplitClass" class="setup__label" style="margin-top: 12px;">
              Students to Include
              <select v-model="selectedCohort" class="setup__input">
                <option value="all">Entire Class Roster ({{ totalStudentsCount }})</option>
                <option v-for="c in cohortOptionsOnly" :key="c" :value="c">
                  {{ c }} Only ({{ countForCohort(c) }})
                </option>
              </select>
            </label>

            <div class="modal-form-grid">
              <label class="setup__label">
                Blank Columns
                <input v-model.number="form.blankColumns" type="number" min="1" max="40" class="setup__input" required />
              </label>
              <label class="setup__label">
                Top Blank Rows
                <input v-model.number="form.headerRows" type="number" min="0" max="10" class="setup__input" required />
              </label>
              <label class="setup__label">
                Extra Footer Rows
                <input 
                  v-model.number="form.footerRows" 
                  type="number" 
                  min="0" 
                  max="50" 
                  class="setup__input" 
                  :disabled="form.autoFill"
                  required 
                />
              </label>
              <div class="setup__label" style="justify-content: flex-end; padding-bottom: 8px;">
                <label class="setup__label--checkbox">
                  <input type="checkbox" v-model="form.autoFill" class="setup__checkbox" />
                  Auto-Fill to Page
                </label>
              </div>
            </div>
            
            <div class="form-hint">
              <span v-if="form.autoFill">
                Auto-fill calculated <strong>{{ effectiveFooterRows }}</strong> blank rows to fit exactly 1 page ({{ form.targetTotalRows }} total rows).
              </span>
              <span v-else>
                Total printed table rows: <strong>{{ sortedStudents.length + form.headerRows + form.footerRows }}</strong> rows.
              </span>
            </div>
          </form>
        </div>

        <!-- Live Print Preview Area -->
        <div v-if="showPreview" class="reports__print-preview-area">
          <header class="preview-banner">
            <Activity :size="14" /> LIVE PRINT PREVIEW (Page 1 of 1)
          </header>
          <div class="preview-content">
            <div class="preview-content-wrapper">
              <div class="sheet-preview-card">
                <h2 class="sheet-preview-title">{{ form.title }}</h2>
                <h3 class="sheet-preview-subtitle">{{ subheader }}</h3>
                
                <table class="sheet-preview-table">
                  <thead>
                    <tr class="sheet-preview-header-row">
                      <th class="sheet-preview-name-col">Student Name</th>
                      <th v-for="c in form.blankColumns" :key="'ph'+c" class="sheet-preview-blank-col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- Top blank rows before students -->
                    <tr v-for="r in form.headerRows" :key="'ptop'+r" class="sheet-preview-student-row sheet-preview-row--blank">
                      <td class="sheet-preview-name-cell">&nbsp;</td>
                      <td v-for="c in form.blankColumns" :key="'pblank'+c" class="sheet-preview-blank-cell"></td>
                    </tr>
                    <!-- Student List -->
                    <tr v-for="(s, index) in sortedStudents" :key="s.studentId" :class="['sheet-preview-student-row', { 'sheet-preview-row--first-student': index === 0 && form.headerRows > 0 }]">
                      <td class="sheet-preview-name-cell">
                        <strong>{{ s.lastName }}</strong>, {{ s.firstName }}
                      </td>
                      <td v-for="c in form.blankColumns" :key="'psc'+c" class="sheet-preview-blank-cell"></td>
                    </tr>
                    <!-- Bottom blank rows -->
                    <tr v-for="r in effectiveFooterRows" :key="'pbot'+r" class="sheet-preview-student-row sheet-preview-row--blank">
                      <td class="sheet-preview-name-cell">&nbsp;</td>
                      <td v-for="c in form.blankColumns" :key="'pbc'+c" class="sheet-preview-blank-cell"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="reports__modal-footer">
        <button class="reports__btn-ghost" @click="$emit('close')">Cancel</button>
        <button class="reports__btn-primary" @click="handlePrint" :disabled="isPrinting">
          <Printer :size="16" /> Open Print Dialog
        </button>
      </footer>
    </div>

    <!-- ── Hidden Print Container (Teleported to body for native printing) ─── -->
    <Teleport to="body" v-if="mounted">
      <div class="sheet-print-only" :class="{ 'print-only-container--active': isPrinting }">
        <div class="sheet-print-page">
          <h2 class="sheet-title">{{ form.title }}</h2>
          <h3 class="sheet-subtitle">{{ subheader }}</h3>
          
          <table class="sheet-table">
            <thead>
              <tr class="sheet-header-row">
                <th class="sheet-name-col"></th>
                <th v-for="c in form.blankColumns" :key="'h'+c" class="sheet-blank-col"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Top blank rows before students -->
              <tr v-for="r in form.headerRows" :key="'top'+r" class="sheet-student-row">
                <td class="sheet-name-cell">&nbsp;</td>
                <td v-for="c in form.blankColumns" :key="'blank'+c" class="sheet-blank-cell"></td>
              </tr>
              <!-- Student List -->
              <tr v-for="(s, index) in sortedStudents" :key="s.studentId" :class="['sheet-student-row', { 'sheet-row--first-student': index === 0 }]">
                <td class="sheet-name-cell">{{ s.lastName }}, {{ s.firstName }}</td>
                <td v-for="c in form.blankColumns" :key="'sc'+c" class="sheet-blank-cell"></td>
              </tr>
              <!-- Bottom blank rows -->
              <tr v-for="r in effectiveFooterRows" :key="'bot'+r" class="sheet-student-row">
                <td class="sheet-name-cell">&nbsp;</td>
                <td v-for="c in form.blankColumns" :key="'bc'+c" class="sheet-blank-cell"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { Printer, X, Activity } from 'lucide-vue-next'
import { usePrintOptions, executePrint } from '../composables/usePrintOptions.js'

const props = defineProps({
  classRecord: { type: Object, required: true },
  teacherName: { type: String, default: '' },
  initialCohort: { type: String, default: 'all' }
})

defineEmits(['close'])

const classRecordRef = computed(() => props.classRecord)
const { selectedCohort, isSplitClass, availableSubCohorts, filterStudents, getSubheader: buildSubheader, isElementary } = usePrintOptions(classRecordRef, props.initialCohort)

const isPrinting = ref(false)
const mounted = ref(false)
const showPreview = ref(false)

onMounted(() => {
  mounted.value = true
})

const now = new Date()
const month = now.toLocaleString('default', { month: 'long' })
const year = now.getFullYear()

const form = ref({
  title: `ATTENDANCE ${month} ${year}`,
  blankColumns: 20,
  headerRows: 2,
  footerRows: 12,
  autoFill: true,
  targetTotalRows: 35 // Target 35 rows to fit Letter paper with adjusted header height
})

const cohortOptionsOnly = computed(() => {
  return availableSubCohorts.value.filter(c => c !== 'all')
})

const allStudentsList = computed(() => {
  if (!props.classRecord.students) return []
  return Object.entries(props.classRecord.students)
    .filter(([id, s]) => !s.archived)
    .map(([id, s]) => ({ studentId: id, ...s }))
})

const totalStudentsCount = computed(() => allStudentsList.value.length)

function countForCohort(cohortTag) {
  const isElem = isElementary.value
  return allStudentsList.value.filter(s => {
    const tag = isElem ? s.gradeLevel : s.courseCode
    return tag === cohortTag
  }).length
}

const sortedStudents = computed(() => {
  return filterStudents(allStudentsList.value, selectedCohort.value)
})

// Watch for changes in class/header and auto-calculate footer rows
const effectiveFooterRows = computed(() => {
  if (!form.value.autoFill) return form.value.footerRows
  const currentCount = sortedStudents.value.length + form.value.headerRows
  return Math.max(0, form.value.targetTotalRows - currentCount)
})

const subheader = computed(() => {
  return buildSubheader(props.teacherName ? `Teacher: ${props.teacherName}` : '')
})

function handlePrint() {
  isPrinting.value = true
  nextTick(() => {
    executePrint({
      orientation: 'portrait',
      margin: '12mm',
      onDone: () => {
        isPrinting.value = false
      }
    })
  })
}
</script>

<style scoped>
.reports__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.reports__print-modal {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: 100%;
  transition: max-width 0.3s ease;
  overflow: hidden;
}

.reports__print-modal--compact {
  max-width: 520px;
}

.reports__print-modal--preview-open {
  max-width: 1100px;
  height: 88vh;
}

.reports__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
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

.header-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
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

.reports__modal-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.reports__modal-body--with-preview .config-section {
  width: 360px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
}

.config-section {
  padding: 20px;
  overflow-y: auto;
  width: 100%;
}

.config-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.reports__btn-preview {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
  transition: all 0.15s ease;
}

.reports__btn-preview:hover {
  background: var(--surface-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.modal-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.setup__label--checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-input {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.88rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  user-select: none;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}

.autofill-hint {
  padding: 10px 12px;
  background: var(--info-bg, rgba(59, 130, 246, 0.1));
  border-left: 3px solid var(--info, #3b82f6);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: 0.82rem;
  color: var(--text);
  line-height: 1.4;
}

.preview-pane {
  flex: 1;
  background: #cbd5e1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-pane__banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--primary);
  flex-shrink: 0;
}

.preview-banner-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-content {
  padding: 24px 16px 48px;
  background: #cbd5e1;
  overflow-y: auto !important;
  overflow-x: auto;
  display: block;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.preview-content-wrapper {
  zoom: 0.72;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto 32px auto;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  background: #ffffff;
}

.sheet-preview-card {
  width: 210mm;
  height: 297mm;
  padding: 12mm 12mm;
  background: #ffffff;
  color: #000000;
  font-family: Arial, sans-serif;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.sheet-preview-title {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 6px 0;
  text-transform: uppercase;
}

.sheet-preview-subtitle {
  font-size: 12px;
  font-weight: bold;
  margin: 0 0 8px 0;
  text-align: left;
}

.sheet-preview-table {
  flex: 1 1 0%;
  width: 100%;
  border-collapse: collapse;
  border: 2px solid black;
  table-layout: auto;
}

.sheet-preview-table th, .sheet-preview-table td {
  border: 1px solid black;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-preview-table th.sheet-preview-name-col,
.sheet-preview-table td.sheet-preview-name-cell {
  border-right: 2px solid black;
  width: 120px;
  min-width: 120px;
}

.sheet-preview-table th:nth-child(5n + 1),
.sheet-preview-table td:nth-child(5n + 1) {
  border-right: 2px solid black;
}

.sheet-preview-header-row th {
  height: 50px;
  border-bottom: 2px solid black;
  background: #f8fafc;
  font-size: 10px;
}

.sheet-preview-student-row td {
  padding: 2px 4px;
  font-size: 10px;
}

.sheet-preview-row--blank td {
  background: #fcfcfc;
}

.sheet-preview-row--first-student td {
  border-top: 2px solid black;
}

.sheet-preview-table tbody tr:last-child td {
  border-bottom: 2px solid black !important;
}

.reports__modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.reports__btn-ghost {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
}

.reports__btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}
</style>

<style>
/* ── Native Browser Print Engine Styles ─── */
.sheet-print-only {
  display: none;
  font-family: Arial, sans-serif;
  color: black;
  width: 100%;
}

.sheet-print-only.print-only-container--active {
  display: block;
}

@media print {
  #app, .reports__modal-overlay {
    display: none !important;
  }

  .sheet-print-only {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: visible !important;
    background: white !important;
  }

  .sheet-print-page {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    page-break-inside: avoid;
  }
  
  .sheet-title {
    flex-shrink: 0;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    margin: 0 0 6px 0;
    text-transform: uppercase;
  }
  
  .sheet-subtitle {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: bold;
    margin: 0 0 8px 0;
    text-align: left;
  }

  .sheet-table {
    flex: 1 1 0%;
    width: 100%;
    border-collapse: collapse;
    border: 2px solid black;
    table-layout: auto;
  }
  
  .sheet-table th.sheet-name-col,
  .sheet-table td.sheet-name-cell {
    border-right: 2px solid black;
    width: 120px;
    min-width: 120px;
  }
  
  .sheet-table th:nth-child(5n + 1),
  .sheet-table td:nth-child(5n + 1) {
    border-right: 2px solid black;
  }
  
  .sheet-table th, .sheet-table td {
    border: 1px solid black;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .sheet-header-row th {
    height: 50px;
    border-bottom: 2px solid black;
    background: #f8fafc !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .sheet-row--first-student td {
    border-top: 2px solid black;
  }
  
  .sheet-student-row td {
    padding: 2px 4px;
    font-size: 10px;
  }

  .sheet-table tbody tr:last-child td {
    border-bottom: 2px solid black !important;
  }
  
  .sheet-blank-col, .sheet-blank-cell {
    width: auto;
  }
}
</style>
