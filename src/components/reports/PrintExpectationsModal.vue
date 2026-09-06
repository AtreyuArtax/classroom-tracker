<template>
  <div v-if="show" class="reports__modal-overlay">
    <div 
      class="reports__print-modal"
      :class="{ 'reports__print-modal--preview-open': showPreview, 'reports__print-modal--compact': !showPreview }"
    >
      <!-- Header -->
      <header class="reports__modal-header">
        <div class="header-content">
          <BookOpen class="header-icon" :size="24" />
          <div>
            <h3 class="header-title">Print Expectation Mastery Audit</h3>
            <p class="header-subtitle">{{ reportClass?.name || 'Class' }} · {{ formattedDate }}</p>
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
            <h4 class="config-section-title">Audit Options</h4>
            <button class="reports__btn-preview" @click="showPreview = !showPreview">
              {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
            </button>
          </div>

          <form class="setup__form" @submit.prevent="doPrint" style="margin-top: 14px;">
            <label v-if="isSplitClass" class="setup__label">
              Students to Include
              <select v-model="selectedCohort" class="setup__input">
                <option value="all">Entire Class Roster</option>
                <option v-for="c in cohortOptionsOnly" :key="c" :value="c">{{ c }} Only</option>
              </select>
            </label>

            <div class="form-hint" style="margin-top: 14px;">
              Audits all curriculum expectations across <strong>{{ unitsData.length }} units</strong> with student mastery averages and assessment coverage counts.
            </div>
          </form>
        </div>

        <!-- Live Preview Section -->
        <div v-if="showPreview" class="reports__print-preview-area">
          <header class="preview-banner">
            <Activity :size="14" /> LIVE PREVIEW (Curriculum Audit)
          </header>

          <div class="preview-content">
            <div class="preview-content-wrapper">
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
                          <th style="width: 100px; text-align: center;">Assessments</th>
                          <th style="width: 90px; text-align: right;">Class Avg</th>
                          <th style="width: 110px; text-align: center;">Mastery Level</th>
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
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="reports__modal-footer">
        <button class="reports__btn-ghost" @click="$emit('close')">Cancel</button>
        <button class="reports__btn-primary" @click="doPrint" :disabled="isPrinting">
          <Printer :size="16" /> Open Print Dialog
        </button>
      </footer>
    </div>

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
import { ref, computed, nextTick } from 'vue'
import { BookOpen, Printer, X, Activity } from 'lucide-vue-next'
import { usePrintOptions, executePrint } from '../../composables/usePrintOptions.js'
import { calculateSBARExpectationMastery } from '../../db/gradebookService.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  reportClass: { type: Object, default: null },
  assessments: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  gradeMap: { type: Object, default: () => ({}) },
  teacherName: { type: String, default: '' },
  events: { type: Array, default: () => [] },
  initialCohort: { type: String, default: 'all' }
})

defineEmits(['close'])

const classRecordRef = computed(() => props.reportClass)
const { selectedCohort, isSplitClass, availableSubCohorts, filterStudents, getSubheader: buildSubheader, isElementary } = usePrintOptions(classRecordRef, props.initialCohort)

const isPrinting = ref(false)
const showPreview = ref(false)

const isSBAR = computed(() => props.reportClass?.gradingFramework === 'sbar' || props.reportClass?.gradingScale === 'sbar')

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

  // 1. Count assessments linking expectations (supports both expectationIds array and single expectationId)
  props.assessments.forEach(ass => {
    if (ass.excluded) return
    const ids = ass.expectationIds && Array.isArray(ass.expectationIds)
      ? ass.expectationIds
      : (ass.expectationId ? [ass.expectationId] : [])
    ids.forEach(id => {
      const sId = String(id)
      expAssessmentCounts[sId] = (expAssessmentCounts[sId] || 0) + 1
    })
  })

  const studentsMap = props.reportClass?.students || {}
  const isElem = isElementary.value

  if (isSBAR.value) {
    const algo = props.reportClass?.sbarAlgorithm || 'decaying_average'
    const sbarMasteryMap = calculateSBARExpectationMastery(
      props.reportClass,
      props.assessments,
      props.gradeMap || {},
      algo,
      props.events
    )

    Object.entries(sbarMasteryMap).forEach(([studentId, studentExpMap]) => {
      if (!studentExpMap) return
      const st = studentsMap[studentId]
      if (st && st.archived) return
      if (selectedCohort.value && selectedCohort.value !== 'all' && st) {
        const tag = isElem ? st.gradeLevel : st.courseCode
        if (tag !== selectedCohort.value) return
      }

      Object.entries(studentExpMap).forEach(([expCode, mObj]) => {
        if (mObj && mObj.score !== null && mObj.score !== undefined) {
          if (!expScores[expCode]) expScores[expCode] = []
          expScores[expCode].push(mObj.score)
        }
      })
    })
  } else {
    // Traditional Mode: Read from classGrades & gradeMap
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
        const ids = ass ? (ass.expectationIds && Array.isArray(ass.expectationIds) ? ass.expectationIds : (ass.expectationId ? [ass.expectationId] : [])) : []
        if (ids.length > 0) {
          const total = ass.scaledTotal || ass.totalPoints || 100
          const pct = (markObj.score / total) * 100
          ids.forEach(id => {
            const expId = String(id)
            if (!expScores[expId]) expScores[expId] = []
            expScores[expId].push(pct)
          })
        }
      })
    })
  }

  return props.reportClass.gradebookUnits
    .filter(u => !u.archived && u.expectations && u.expectations.length > 0)
    .map(u => {
      const expectations = (u.expectations || [])
        .filter(e => !e.archived)
        .map(e => {
          const expId = e.expectationId ? String(e.expectationId) : null
          const expCode = e.code ? String(e.code) : null

          const countId = expId ? (expAssessmentCounts[expId] || 0) : 0
          const countCode = (expCode && expCode !== expId) ? (expAssessmentCounts[expCode] || 0) : 0
          const count = countId + countCode

          const scoresId = expId ? (expScores[expId] || []) : []
          const scoresCode = (expCode && expCode !== expId) ? (expScores[expCode] || []) : []
          const scores = [...scoresId, ...scoresCode]
          const validScores = scores
            .map(Number)
            .filter(v => !isNaN(v) && isFinite(v))

          const avg = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) : null
          return {
            ...e,
            assessmentCount: count,
            average: avg
          }
        })

      return {
        ...u,
        expectations
      }
    })
    .filter(u => u.expectations.length > 0)
})

function getMasteryText(avg) {
  if (avg === null || avg === undefined) return 'Not Assessed'
  if (avg >= 80) return 'Mastery (Level 4)'
  if (avg >= 70) return 'Proficient (Level 3)'
  if (avg >= 60) return 'Approaching (Level 2)'
  if (avg >= 50) return 'Developing (Level 1)'
  return 'Remediation (Below L1)'
}

function getBadgeBg(avg) {
  if (avg === null || avg === undefined) return 'var(--surface-hover)'
  if (avg >= 80) return '#dcfce7'
  if (avg >= 70) return '#e0f2fe'
  if (avg >= 60) return '#fef9c3'
  if (avg >= 50) return '#ffedd5'
  return '#fee2e2'
}

function getBadgeColor(avg) {
  if (avg === null || avg === undefined) return 'var(--text-secondary)'
  if (avg >= 80) return '#166534'
  if (avg >= 70) return '#075985'
  if (avg >= 60) return '#854d0e'
  if (avg >= 50) return '#9a3412'
  return '#991b1b'
}

function doPrint() {
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

.form-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary);
}

/* ── Live Preview Area ── */
.reports__print-preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #cbd5e1;
}

.preview-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
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
  width: 100%;
  max-width: 850px;
  margin: 0 auto 32px auto;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  background: #ffffff;
}

.expectations-print-preview {
  background: white;
  color: #111;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 24px;
  min-height: 297mm;
  box-sizing: border-box;
}

.preview-doc-header {
  border-bottom: 2px solid #222;
  padding-bottom: 8px;
  margin-bottom: 16px;
  text-align: center;
}

.preview-doc-header h2 {
  margin: 0 0 4px 0;
  font-size: 1.3rem;
  font-weight: 800;
  text-transform: uppercase;
}

.doc-meta {
  font-size: 0.85rem;
  color: #555;
}

.audit-units-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.unit-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #222;
  border-bottom: 1px solid #ddd;
  padding-bottom: 4px;
  margin: 0 0 8px 0;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.audit-table th {
  border-bottom: 2px solid #333;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
  background: #f8fafc;
}

.audit-table td {
  border-bottom: 1px solid #eee;
  padding: 6px 8px;
  vertical-align: middle;
}

.code-cell {
  font-weight: 700;
  color: var(--primary);
}

.mastery-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.empty-audit {
  text-align: center;
  padding: 40px;
  color: #666;
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
/* ── Native Print Engine ── */
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
  #app, .reports__modal-overlay {
    display: none !important;
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
    page-break-inside: auto;
  }

  .print-unit-title {
    font-size: 10pt;
    font-weight: bold;
    border-bottom: 1px solid black;
    padding-bottom: 2pt;
    margin: 6pt 0 4pt 0;
    page-break-after: avoid;
  }

  .print-audit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-top: 2pt;
  }

  .print-audit-table thead {
    display: table-header-group;
  }

  .print-audit-table tr {
    page-break-inside: avoid;
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
