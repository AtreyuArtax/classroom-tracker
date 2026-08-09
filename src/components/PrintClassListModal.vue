<template>
  <BaseModal
    :show="true"
    @close="$emit('close')"
    max-width="500px"
    title="Print Class List"
  >
    <template #header>
      <div class="setup__dialog-header-custom">
        <h3 class="setup__dialog-title">Print Class List</h3>
        <div class="setup__dialog-actions">
          <button class="setup__btn-primary" @click="handlePrint" :disabled="isPrinting">
            <Printer :size="16" /> Print
          </button>
          <button class="setup__btn-ghost" @click="$emit('close')">
            <X :size="16" /> Close
          </button>
        </div>
      </div>
    </template>

    <div class="setup__dialog-body">
      <form class="setup__form" @submit.prevent="handlePrint">
        <label class="setup__label">
          Sheet Title
          <input v-model="form.title" class="setup__input" required placeholder="e.g. ATTENDANCE January 2024" />
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
        
        <div v-if="form.autoFill" class="form-hint">
          Will automatically add <strong>{{ effectiveFooterRows }}</strong> blank rows to fit exactly one page (target: {{ form.targetTotalRows }} rows).
        </div>
      </form>
    </div>

    <!-- ── Hidden Print Container ─── -->
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
  </BaseModal>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, toRef } from 'vue'
import { Printer, X } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { usePrintOptions } from '../composables/usePrintOptions.js'

const props = defineProps({
  classRecord: { type: Object, required: true },
  teacherName: { type: String, default: '' },
  initialCohort: { type: String, default: 'all' }
})

const emit = defineEmits(['close'])

const classRecordRef = computed(() => props.classRecord)
const { selectedCohort, isSplitClass, availableSubCohorts, filterStudents, getSubheader: buildSubheader, isElementary } = usePrintOptions(classRecordRef, props.initialCohort)

const isPrinting = ref(false)
const mounted = ref(false)

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
    window.print()
    setTimeout(() => {
      isPrinting.value = false
    }, 500)
  })
}
</script>

<style>
/* Not scoped so teleported content applies styles natively */
.sheet-print-only {
  display: none;
  font-family: Arial, sans-serif;
  color: black;
  width: 100%;
}

.sheet-print-only.print-only-container--active {
  display: block;
}

/* Modal specific formatting */
.modal-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.form-hint {
  margin-top: 12px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary);
}

.setup__dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

@media print {
  /* Hide everything except the printable sheet */
  #app, .bm-overlay, .bm-card {
    display: none !important;
  }

  .sheet-print-only {
    display: block !important;
    position: relative;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  @page {
    margin: 12mm;
  }

  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: visible !important;
    background: white !important;
  }

  /* Fill the printable page area — overflow:hidden clips any stray fraction of a row */
  .sheet-print-page {
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .sheet-title {
    flex-shrink: 0;
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    margin: 0 0 10px 0;
    text-transform: uppercase;
  }
  
  .sheet-subtitle {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: bold;
    margin: 0 0 6px 0;
    text-align: left;
  }

  /* Table stretches to fill remaining vertical space */
  .sheet-table {
    flex: 1 1 0%;
    min-height: 0;
    width: 100%;
    border-collapse: collapse;
    border: 3px solid black;
    table-layout: auto;
  }
  
  .sheet-table th.sheet-name-col,
  .sheet-table td.sheet-name-cell {
    border-right: 3px solid black;
  }
  
  /* Bold every 5th vertical line */
  .sheet-table th:nth-child(5n + 1),
  .sheet-table td:nth-child(5n + 1) {
    border-right: 3px solid black;
  }
  
  .sheet-table th, .sheet-table td {
    border: 1px solid black;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .sheet-header-row th {
    height: 85px;
    border-bottom: 3px solid black;
  }
  
  .sheet-row--first-student td {
    border-top: 3px solid black;
  }
  
  .sheet-student-row td {
    padding: 2px 4px;
    font-size: 11px;
  }
  
  .sheet-table th.sheet-name-col,
  .sheet-name-cell {
    width: 110px;
    min-width: 110px;
  }

  .sheet-blank-col, .sheet-blank-cell {
    width: auto;
  }
}
</style>
