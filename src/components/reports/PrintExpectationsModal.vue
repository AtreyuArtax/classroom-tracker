<template>
  <div v-if="show">
    <!-- BaseModal Wrapper for Screen Preview -->
    <BaseModal
      :show="show"
      :show-x="false"
      max-width="900px"
      title="Print Expectation Mastery Audit"
      @close="$emit('close')"
    >
      <template #header>
        <div class="audit-modal-header">
          <div class="header-title-group">
            <BookOpen class="header-icon" :size="22" />
            <div>
              <h3 class="header-title">Print Expectation Mastery Audit</h3>
              <p class="header-subtitle">{{ reportClass?.name || 'Class' }} · {{ formattedDate }}</p>
            </div>
          </div>
          <div class="header-actions">
            <label v-if="isSplitClass" class="setup__label" style="margin: 0; flex-direction: row; align-items: center; gap: 6px; font-size: 0.85rem;">
              <span>Include:</span>
              <select v-model="selectedCohort" class="setup__input" style="padding: 4px 8px; font-size: 0.85rem;">
                <option value="all">Entire Class</option>
                <option v-for="c in cohortOptionsOnly" :key="c" :value="c">{{ c }} Only</option>
              </select>
            </label>
            <button class="reports__btn-primary" @click="doPrint">
              <Printer :size="16" /> Print Audit
            </button>
            <button class="header-close" @click="$emit('close')">
              <X :size="20" />
            </button>
          </div>
        </div>
      </template>

      <!-- Modal Body with Vertical Scrolling -->
      <div class="audit-modal-body">
        <div class="expectations-print-preview">
          <header class="preview-doc-header">
            <h2>Curriculum Expectation Mastery Audit</h2>
            <div class="doc-meta">
              <span>{{ subheader }}</span> · 
              <span>Date: <strong>{{ formattedDate }}</strong></span>
            </div>
          </header>

          <div v-if="!unitsData.length" class="empty-audit">
            <p>No curriculum expectations found for this class.</p>
          </div>

          <div v-else class="audit-units-list">
            <div v-for="unit in unitsData" :key="unit.unitId" class="audit-unit-section">
              <h3 class="unit-title">{{ unit.name }}</h3>
              <table class="audit-table">
                <thead>
                  <tr>
                    <th style="width: 80px;">Code</th>
                    <th>Expectation Description</th>
                    <th style="width: 110px; text-align: center;">Assessments</th>
                    <th style="width: 100px; text-align: right;">Class Avg</th>
                    <th style="width: 120px; text-align: center;">Mastery Level</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="exp in unit.expectations" :key="exp.expectationId || exp.code">
                    <td class="code-cell"><strong>{{ exp.code }}</strong></td>
                    <td>{{ exp.description }}</td>
                    <td style="text-align: center;">{{ exp.assessmentCount }}</td>
                    <td style="text-align: right;" class="score-cell">
                      <strong>{{ exp.average !== null ? exp.average.toFixed(1) + '%' : '—' }}</strong>
                    </td>
                    <td style="text-align: center;">
                      <span class="mastery-badge" :style="{ backgroundColor: getBadgeBg(exp.average), color: getBadgeColor(exp.average) }">
                        {{ getMasteryText(exp.average) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </BaseModal>

    <!-- Teleported Standalone Container for Real Browser Printing -->
    <Teleport to="body">
      <div class="expectations-audit-print-only" :class="{ 'print-active': isPrinting }">
        <header class="print-doc-header">
          <h1>CURRICULUM EXPECTATION MASTERY AUDIT</h1>
          <p class="print-meta">
            Class: <strong>{{ reportClass?.name }}</strong> | 
            Teacher: <strong>{{ teacherName || 'Teacher' }}</strong> | 
            Generated: <strong>{{ formattedDate }}</strong>
          </p>
        </header>

        <div v-for="unit in unitsData" :key="'print-' + unit.unitId" class="print-unit-block">
          <h2 class="print-unit-title">{{ unit.name }}</h2>
          <table class="print-audit-table">
            <thead>
              <tr>
                <th style="width: 10%;">Code</th>
                <th style="width: 56%;">Expectation Description</th>
                <th style="width: 14%; text-align: center;">Assessments</th>
                <th style="width: 20%; text-align: right;">Class Average</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="exp in unit.expectations" :key="'p-' + (exp.expectationId || exp.code)">
                <td><strong>{{ exp.code }}</strong></td>
                <td>{{ exp.description }}</td>
                <td style="text-align: center;">{{ exp.assessmentCount }}</td>
                <td style="text-align: right;">
                  <strong>{{ exp.average !== null ? exp.average.toFixed(1) + '%' : '—' }}</strong>
                  <span style="font-size: 0.8em; color: #555; margin-left: 4px;">({{ getMasteryText(exp.average) }})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BookOpen, Printer, X } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { usePrintOptions } from '../../composables/usePrintOptions.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  reportClass: { type: Object, default: null },
  assessments: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  teacherName: { type: String, default: '' },
  events: { type: Array, default: () => [] },
  initialCohort: { type: String, default: 'all' }
})

defineEmits(['close'])

const classRecordRef = computed(() => props.reportClass)
const { selectedCohort, isSplitClass, availableSubCohorts, filterStudents, getSubheader: buildSubheader, isElementary } = usePrintOptions(classRecordRef, props.initialCohort)

const isPrinting = ref(false)

const cohortOptionsOnly = computed(() => {
  return availableSubCohorts.value.filter(c => c !== 'all')
})

const subheader = computed(() => {
  return buildSubheader(props.teacherName ? `Teacher: ${props.teacherName}` : '')
})

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
})

const unitsData = computed(() => {
  if (!props.reportClass?.gradebookUnits) return []

  const expScores = {}
  const expAssessmentCounts = {}

  props.assessments.forEach(ass => {
    if (!ass.expectationId || ass.excluded) return
    const expId = String(ass.expectationId)
    expAssessmentCounts[expId] = (expAssessmentCounts[expId] || 0) + 1
  })

  // Filter students based on selectedCohort
  const studentsMap = props.reportClass?.students || {}
  const isElem = isElementary.value

  Object.entries(props.classGrades).forEach(([studentId, studentGradeObj]) => {
    if (!studentGradeObj || !studentGradeObj.assessmentGrades) return
    const st = studentsMap[studentId]
    if (st && st.archived) return
    if (selectedCohort.value && selectedCohort.value !== 'all' && st) {
      const tag = isElem ? st.gradeLevel : st.courseCode
      if (tag !== selectedCohort.value) return
    }

    Object.entries(studentGradeObj.assessmentGrades).forEach(([assId, markObj]) => {
      if (!markObj || markObj.score === null || markObj.score === undefined) return
      const ass = props.assessments.find(a => String(a.assessmentId) === String(assId))
      if (ass && ass.expectationId) {
        const expId = String(ass.expectationId)
        if (!expScores[expId]) expScores[expId] = []
        const total = ass.scaledTotal || ass.totalPoints || 100
        const pct = (markObj.score / total) * 100
        expScores[expId].push(pct)
      }
    })
  })

  // Include qualitative radial check-in events
  if (Array.isArray(props.events) && props.events.length > 0) {
    props.events.forEach(evt => {
      if (!evt.expectationId || !evt.acOutcome) return
      const expId = String(evt.expectationId)
      let pct = null
      if (evt.acOutcome === 'demonstrates_understanding') pct = 90
      else if (evt.acOutcome === 'inconclusive') pct = 65
      else if (evt.acOutcome === 'gap_confirmed') pct = 55
      else if (evt.acOutcome === 'remediation_required') pct = 35

      if (pct !== null) {
        if (!expScores[expId]) expScores[expId] = []
        expScores[expId].push(pct)
      }
    })
  }

  return props.reportClass.gradebookUnits
    .filter(u => u.expectations && u.expectations.length > 0)
    .map(unit => {
      const expectations = unit.expectations.map(exp => {
        const expId = String(exp.expectationId || exp.code)
        const count = expAssessmentCounts[expId] || 0
        const scores = expScores[expId] || []
        const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null

        return {
          ...exp,
          assessmentCount: count,
          average: avg
        }
      })

      return {
        ...unit,
        expectations
      }
    })
})

function getMasteryText(avg) {
  if (avg === null || avg === undefined) return 'Unassessed'
  if (avg >= 80) return 'Level 4 (80%+)'
  if (avg >= 70) return 'Level 3 (70-79%)'
  if (avg >= 60) return 'Level 2 (60-69%)'
  return 'Level 1 (<60%)'
}

function getBadgeBg(avg) {
  if (avg === null || avg === undefined) return 'var(--surface-hover)'
  if (avg >= 80) return 'rgba(16, 185, 129, 0.15)'
  if (avg >= 70) return 'rgba(59, 130, 246, 0.15)'
  if (avg >= 60) return 'rgba(245, 158, 11, 0.15)'
  return 'rgba(239, 68, 68, 0.15)'
}

function getBadgeColor(avg) {
  if (avg === null || avg === undefined) return 'var(--text-secondary)'
  if (avg >= 80) return '#065f46'
  if (avg >= 70) return '#1e40af'
  if (avg >= 60) return '#92400e'
  return '#991b1b'
}

function doPrint() {
  isPrinting.value = true
  setTimeout(() => {
    window.print()
    setTimeout(() => {
      isPrinting.value = false
    }, 500)
  }, 150)
}
</script>

<style scoped>
.audit-modal-header {
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

.header-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

.reports__btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.audit-modal-body {
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 4px;
}

.expectations-print-preview {
  background: white;
  color: #1e293b;
  padding: 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-doc-header h2 {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: #0f172a;
}

.doc-meta {
  font-size: 0.825rem;
  color: #64748b;
}

.audit-units-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.unit-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 6px;
  margin: 0 0 10px 0;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
}

.audit-table th {
  background: #f8fafc;
  border-bottom: 1px solid #cbd5e1;
  padding: 8px;
  text-align: left;
  font-weight: 700;
  color: #475569;
}

.audit-table td {
  border-bottom: 1px solid #e2e8f0;
  padding: 8px;
  color: #334155;
}

.mastery-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.75rem;
}

/* ── SMART PRINT FLOW STYLES ── */
.expectations-audit-print-only {
  display: none;
  background: white;
  color: black;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 0;
  margin: 0;
}

.expectations-audit-print-only.print-active {
  display: block;
}

@media print {
  #app, .bm-overlay, .reports__modal-overlay {
    display: none !important;
  }

  @page {
    margin: 12mm 12mm 12mm 12mm;
    size: portrait;
  }

  .expectations-audit-print-only.print-active {
    display: block !important;
    position: relative;
    width: 100%;
    background: white !important;
    color: black !important;
    font-size: 8.5pt;
    line-height: 1.35;
  }

  .print-doc-header {
    text-align: center;
    border-bottom: 2px solid black;
    padding-bottom: 6px;
    margin-bottom: 10px;
  }

  .print-doc-header h1 {
    font-size: 14pt;
    font-weight: bold;
    margin: 0 0 3pt 0;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .print-meta {
    font-size: 8.5pt;
    color: #333;
    margin: 0;
  }

  .print-unit-block {
    margin-bottom: 10pt;
    page-break-inside: auto; /* Allow block to start on page 1 right after header! */
  }

  .print-unit-title {
    font-size: 10pt;
    font-weight: bold;
    border-bottom: 1px solid black;
    padding-bottom: 2pt;
    margin: 6pt 0 4pt 0;
    page-break-after: avoid; /* Prevent title from being stranded at bottom of page */
  }

  .print-audit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-top: 2pt;
  }

  .print-audit-table thead {
    display: table-header-group; /* Repeat table header if unit spans pages */
  }

  .print-audit-table tr {
    page-break-inside: avoid; /* Keep individual rows intact */
  }

  .print-audit-table th {
    border-bottom: 1.5px solid black;
    padding: 3pt 4pt;
    font-weight: bold;
    background: #f5f5f5 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-audit-table td {
    border-bottom: 1px solid #e0e0e0;
    padding: 3pt 4pt;
    vertical-align: top;
  }
}
</style>
