<template>
  <BaseModal
    :show="true"
    :show-x="false"
    @close="$emit('close')"
    :max-width="(form.orientation === 'landscape' || form.showAssessments) ? '1080px' : '780px'"
    title="Print Final Grades Grid"
  >
    <template #header>
      <div class="grades-print-modal__header">
        <div class="grades-print-modal__header-title-group">
          <Printer :size="20" class="grades-print-modal__header-icon" />
          <h3 class="grades-print-modal__title">Print Final Grades Grid</h3>
        </div>
        <div class="grades-print-modal__header-actions">
          <button class="setup__btn-primary grades-print-modal__btn-print" @click="handlePrint" :disabled="isPrinting">
            <Printer :size="16" /> Print Grid
          </button>
          <button class="setup__btn-ghost" @click="$emit('close')">
            <X :size="16" /> Close
          </button>
        </div>
      </div>
    </template>

    <div class="grades-print-modal__body">
      <div class="grades-print-modal__grid-layout" :class="{ 'with-assessments': form.showAssessments }">
        <!-- Configuration Section -->
        <div class="grades-print-modal__config">
          <h4 class="grades-print-modal__section-title">Print Options</h4>
          <form class="setup__form" @submit.prevent="handlePrint">
            <label class="setup__label">
              Document Title
              <input v-model="form.title" class="setup__input" required placeholder="e.g. Final Grades Grid" />
            </label>

            <label v-if="isSplitClass" class="setup__label">
              Students to Include
              <select v-model="selectedCohort" class="setup__input">
                <option value="all">Entire Class Roster ({{ totalStudentsCount }})</option>
                <option v-for="c in cohortOptionsOnly" :key="c" :value="c">
                  {{ c }} Only ({{ countForCohort(c) }})
                </option>
              </select>
            </label>
            
            <label class="setup__label">
              Orientation
              <select v-model="form.orientation" class="setup__input">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>

            <label class="setup__label">
              Font Scale
              <select v-model="form.fontSize" class="setup__input">
                <option value="auto">Auto (Scale to fit)</option>
                <option value="compact">Compact (9px)</option>
                <option value="normal">Normal (11px)</option>
                <option value="large">Large (13px)</option>
              </select>
            </label>

            <div class="grades-print-modal__checkboxes">
              <label class="setup__label--checkbox">
                <input type="checkbox" v-model="form.showAssessments" class="setup__checkbox" />
                Include All Assessments
              </label>

              <label v-if="form.showAssessments" class="setup__label" style="margin-left: 26px; margin-top: -4px;">
                Score Format
                <select v-model="form.assessmentScoreFormat" class="setup__input">
                  <option value="raw">Raw Score</option>
                  <option value="percent">Percentage</option>
                </select>
              </label>

              <label class="setup__label--checkbox">
                <input type="checkbox" v-model="form.showCategories" class="setup__checkbox" />
                Include Category Breakdowns
              </label>
              
              <label class="setup__label--checkbox">
                <input type="checkbox" v-model="form.showClassAverages" class="setup__checkbox" />
                Include Class Averages Row
              </label>

              <label class="setup__label--checkbox">
                <input type="checkbox" v-model="form.showZebraStriping" class="setup__checkbox" />
                Zebra Striping
              </label>
            </div>

            <div v-if="form.showAssessments" class="form-hint" style="margin-top: 12px; display: flex; align-items: flex-start; gap: 8px;">
              <AlertTriangle :size="16" style="flex-shrink: 0; color: var(--primary);" />
              <span>Landscape mode and Auto Font Scale are recommended to fit assessment columns. Page break rules are active for up to 2 pages.</span>
            </div>
          </form>
        </div>

        <!-- Preview Section -->
        <div class="grades-print-modal__preview">
          <div class="grades-print-modal__preview-header">
            <Eye :size="14" />
            <span>Interactive Live Preview</span>
          </div>
          
          <div class="grades-print-modal__preview-container">
            <div class="grades-print-modal__preview-paper" :class="[form.orientation, 'preview-font--' + resolvedFontSize]">
              <h2 class="preview-title">{{ form.title }}</h2>
              <div class="preview-subtitle">{{ subheader }}</div>
              <div class="preview-meta-date">Date: {{ formattedDate }}</div>
              
              <div class="preview-table-wrapper">
                <table class="preview-table" :class="{ 'zebra-striping': form.showZebraStriping, 'table--two-columns': !form.showAssessments && !form.showCategories }">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th class="text-right font-bold overall-col-header">Overall Grade</th>
                      <template v-if="form.showAssessments">
                        <th v-for="a in sortedAssessments" :key="'prev-h-ass-'+a.assessmentId" class="text-right prev-ass-header">
                          <div class="prev-ass-header-content">
                            <span class="prev-ass-name" :title="a.name">{{ a.name }}</span>
                            <span class="prev-ass-pts">/{{ a.totalPoints }}</span>
                          </div>
                        </th>
                      </template>
                      <template v-if="form.showCategories">
                        <th v-for="cat in classRecord.gradebookCategories" :key="'prev-h-'+cat.categoryId" class="text-right">
                          {{ cat.name }} <span class="prev-weight">({{ cat.weight }}%)</span>
                        </th>
                      </template>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in sortedStudents" :key="'prev-s-'+s.studentId">
                      <td>{{ s.lastName }}, {{ s.firstName }}</td>
                      <td class="text-right font-bold overall-col-cell">
                        {{ formatGradeValue(classGrades[s.studentId]?.overallGrade) }}
                      </td>
                      <template v-if="form.showAssessments">
                        <td v-for="a in sortedAssessments" :key="'prev-c-ass-'+s.studentId+'-'+a.assessmentId" class="text-right num-col prev-ass-cell">
                          {{ formatAssessmentScore(s.studentId, a.assessmentId, a.totalPoints) }}
                        </td>
                      </template>
                      <template v-if="form.showCategories">
                        <td v-for="cat in classRecord.gradebookCategories" :key="'prev-c-'+s.studentId+'-'+cat.categoryId" class="text-right num-col">
                          {{ formatGradeValue(classGrades[s.studentId]?.categoryResults?.[cat.categoryId]?.percentage) }}
                        </td>
                      </template>
                    </tr>
                    
                    <tr v-if="form.showClassAverages" class="prev-avg-row">
                      <td>Class Average</td>
                      <td class="text-right font-bold overall-col-cell">{{ formatGradeValue(overallClassAverage !== null ? Math.round(overallClassAverage) : null) }}</td>
                      <template v-if="form.showAssessments">
                        <td v-for="a in sortedAssessments" :key="'prev-avg-ass-'+a.assessmentId" class="text-right font-bold num-col prev-ass-cell">
                          {{ formatAssessmentAvg(getAssessmentClassAverage(a.assessmentId), a.totalPoints) }}
                        </td>
                      </template>
                      <template v-if="form.showCategories">
                        <td v-for="cat in classRecord.gradebookCategories" :key="'prev-avg-c-'+cat.categoryId" class="text-right font-bold num-col">
                          {{ formatGradeValue(getCategoryClassAverage(cat.categoryId)) }}
                        </td>
                      </template>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="preview-footer">
                <span>Class Size: {{ sortedStudents.length }} students</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Teleport Container for Real Browser Printing -->
    <Teleport to="body" v-if="mounted">
      <div 
        class="grades-grid-print-only" 
        :class="{ 
          'print-only-container--active': isPrinting, 
          'zebra-striping': form.showZebraStriping,
          ['orientation--' + form.orientation]: true
        }"
      >
        <div class="grades-grid-print-page" :class="['font-size--' + resolvedFontSize]">
          <header class="print-header">
            <h2 class="print-title">{{ form.title }}</h2>
            <h3 class="print-subtitle">{{ subheader }}</h3>
            <div class="print-meta-date">Generated: {{ formattedDate }}</div>
          </header>

          <table class="print-table" :class="{ 'zebra-striping': form.showZebraStriping, 'table--two-columns': !form.showAssessments && !form.showCategories }">
            <thead>
              <tr class="print-header-row">
                <th class="print-name-col">Student Name</th>
                <th class="print-overall-col">Overall Grade</th>
                <template v-if="form.showAssessments">
                  <th v-for="a in sortedAssessments" :key="'print-h-ass-'+a.assessmentId" class="print-ass-col">
                    <span class="ass-name">{{ a.name }}</span>
                    <span class="ass-pts">/{{ a.totalPoints }}</span>
                  </th>
                </template>
                <template v-if="form.showCategories">
                  <th v-for="cat in classRecord.gradebookCategories" :key="'print-h-'+cat.categoryId" class="print-cat-col">
                    <span class="cat-name">{{ cat.name }}</span>
                    <span class="cat-weight">{{ cat.weight }}%</span>
                  </th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sortedStudents" :key="'print-row-'+s.studentId" class="print-student-row">
                <td class="print-name-cell">{{ s.lastName }}, {{ s.firstName }}</td>
                <td class="print-overall-cell">{{ formatGradeValue(classGrades[s.studentId]?.overallGrade) }}</td>
                <template v-if="form.showAssessments">
                  <td v-for="a in sortedAssessments" :key="'print-cell-ass-'+s.studentId+'-'+a.assessmentId" class="print-ass-cell">
                    {{ formatAssessmentScore(s.studentId, a.assessmentId, a.totalPoints) }}
                  </td>
                </template>
                <template v-if="form.showCategories">
                  <td v-for="cat in classRecord.gradebookCategories" :key="'print-cell-'+s.studentId+'-'+cat.categoryId" class="print-cat-cell">
                    {{ formatGradeValue(classGrades[s.studentId]?.categoryResults?.[cat.categoryId]?.percentage) }}
                  </td>
                </template>
              </tr>
              
              <!-- Optional Class Averages Row -->
              <tr v-if="form.showClassAverages" class="print-avg-row">
                <td class="print-name-cell">Class Average</td>
                <td class="print-overall-cell font-bold">{{ formatGradeValue(overallClassAverage !== null ? Math.round(overallClassAverage) : null) }}</td>
                <template v-if="form.showAssessments">
                  <td v-for="a in sortedAssessments" :key="'print-avg-cell-ass-'+a.assessmentId" class="print-ass-cell font-bold">
                    {{ formatAssessmentAvg(getAssessmentClassAverage(a.assessmentId), a.totalPoints) }}
                  </td>
                </template>
                <template v-if="form.showCategories">
                  <td v-for="cat in classRecord.gradebookCategories" :key="'print-avg-cell-'+cat.categoryId" class="print-cat-cell font-bold">
                    {{ formatGradeValue(getCategoryClassAverage(cat.categoryId)) }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
          
          <footer class="print-footer">
            <p>Class Size: {{ sortedStudents.length }} students</p>
          </footer>
        </div>
      </div>
    </Teleport>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, toRef } from 'vue'
import { Printer, X, Eye, AlertTriangle } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { assessments, gradeMap, selectedMilestone, filteredMilestones } from '../composables/useGradebook.js'
import { usePrintOptions } from '../composables/usePrintOptions.js'

const props = defineProps({
  classRecord: { type: Object, required: true },
  classGrades: { type: Object, required: true },
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

const form = ref({
  title: 'Final Grades Summary Grid',
  orientation: 'portrait',
  fontSize: 'auto',
  showCategories: false,
  showClassAverages: false,
  showZebraStriping: true,
  showAssessments: false,
  assessmentScoreFormat: 'raw'
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

const sortedAssessments = computed(() => {
  if (!assessments.value) return []
  const asOf = selectedMilestone.value
    ? filteredMilestones.value?.find(m => m.milestoneId === selectedMilestone.value)?.date
    : null
    
  const isSBAR = props.classRecord?.gradingFramework === 'sbar'
  let list = [...assessments.value].filter(a => {
    if (a.target === 'individual') return false
    if (isSBAR) {
      return a.categoryId === 'sbar_general' || (a.expectationIds && a.expectationIds.length > 0)
    } else {
      return a.categoryId !== 'sbar_general'
    }
  })

  // Filter out assessments targeted exclusively at a different sub-cohort
  if (selectedCohort.value && selectedCohort.value !== 'all') {
    const isElem = isElementary.value
    list = list.filter(a => {
      const targetTag = isElem ? a.gradeLevel : (a.targetCourseCode || a.gradeLevel)
      if (!targetTag || targetTag === 'ALL' || targetTag === 'all') return true
      return targetTag === selectedCohort.value
    })
  }

  if (asOf) {
    list = list.filter(a => a.date <= asOf)
  }
  return list.sort((a, b) => new Date(a.date) - new Date(b.date))
})

const subheader = computed(() => {
  return buildSubheader(props.teacherName ? `Teacher: ${props.teacherName}` : '')
})

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const resolvedFontSize = computed(() => {
  if (form.value.fontSize !== 'auto') return form.value.fontSize
  const count = sortedStudents.value.length
  
  if (form.value.showAssessments) {
    const aCount = sortedAssessments.value.length
    if (count > 28 || aCount > 10) return 'compact'
    if (count > 16 || aCount > 5) return 'normal'
    return 'large'
  }
  
  if (count > 32) return 'compact'
  if (count > 18) return 'normal'
  return 'large'
})

// Auto-switch orientation to landscape when showAssessments is checked
watch(() => form.value.showAssessments, (newVal) => {
  if (newVal) {
    form.value.orientation = 'landscape'
  }
})

// watch orientation and apply dynamically to print style
watch(isPrinting, (val) => {
  if (val) {
    document.body.classList.add('is-printing')
    const styleEl = document.createElement('style')
    styleEl.id = 'print-orientation-style'
    styleEl.innerHTML = `@page { size: ${form.value.orientation}; margin: 10mm; }`
    document.head.appendChild(styleEl)
  } else {
    document.body.classList.remove('is-printing')
    const styleEl = document.getElementById('print-orientation-style')
    if (styleEl) styleEl.remove()
  }
})

function formatGradeValue(val) {
  if (val === null || val === undefined) return '—'
  return `${Math.round(val * 10) / 10}%`
}

function formatAssessmentScore(studentId, assessmentId, totalPoints) {
  const g = gradeMap.value[assessmentId]?.[studentId]
  if (!g) return '—'
  if (g.missing) return 'M'
  if (g.excluded) return 'EX'
  if (g.resolvedScore === null || g.resolvedScore === undefined) return '—'
  
  if (form.value.assessmentScoreFormat === 'percent') {
    const pct = (g.resolvedScore / totalPoints) * 100
    return `${Math.round(pct)}%`
  }
  return `${g.resolvedScore}`
}

function getCategoryClassAverage(categoryId) {
  let sum = 0
  let count = 0
  
  sortedStudents.value.forEach(s => {
    const p = props.classGrades[s.studentId]?.categoryResults?.[categoryId]?.percentage
    if (p !== null && p !== undefined) {
      sum += p
      count++
    }
  })
  
  return count > 0 ? (sum / count) : null
}

function getAssessmentClassAverage(assessmentId) {
  let sum = 0
  let count = 0
  
  sortedStudents.value.forEach(s => {
    const g = gradeMap.value[assessmentId]?.[s.studentId]
    if (g && !g.excluded && !g.missing && g.resolvedScore !== null && g.resolvedScore !== undefined) {
      sum += g.resolvedScore
      count++
    }
  })
  
  return count > 0 ? (sum / count) : null
}

function formatAssessmentAvg(avg, totalPoints) {
  if (avg === null || avg === undefined) return '—'
  if (form.value.assessmentScoreFormat === 'percent') {
    return `${Math.round((avg / totalPoints) * 100)}%`
  }
  return `${Math.round(avg * 10) / 10}`
}

const overallClassAverage = computed(() => {
  let sum = 0
  let count = 0
  
  sortedStudents.value.forEach(s => {
    const g = props.classGrades[s.studentId]?.overallGrade
    if (g !== null && g !== undefined) {
      sum += g
      count++
    }
  })
  
  return count > 0 ? (sum / count) : null
})

function handlePrint() {
  isPrinting.value = true
  nextTick(() => {
    window.print()
    setTimeout(() => {
      isPrinting.value = false
    }, 800)
  })
}
</script>

<style>
/* Global print/modal overrides */
.grades-print-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.grades-print-modal__header-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.grades-print-modal__header-icon {
  color: var(--primary);
}

.grades-print-modal__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.grades-print-modal__header-actions {
  display: flex;
  gap: 8px;
}

.grades-print-modal__body {
  display: flex;
  flex-direction: column;
}

.grades-print-modal__grid-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  transition: grid-template-columns 0.3s ease;
}

.grades-print-modal__grid-layout.with-assessments {
  grid-template-columns: 260px 1fr;
}

.grades-print-modal__config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-right: 1px solid var(--border);
  padding-right: 20px;
}

.grades-print-modal__section-title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  margin: 0;
}

.grades-print-modal__checkboxes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

/* Interactive Preview Styles */
.grades-print-modal__preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.grades-print-modal__preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.grades-print-modal__preview-container {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  padding: 16px;
  max-height: 480px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.grades-print-modal__preview-paper {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
  box-sizing: border-box;
  width: 100%;
  height: max-content;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #111;
  transition: width 0.3s;
}

.preview-table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin-top: 10px;
}

.grades-print-modal__preview-paper.portrait {
  max-width: 500px;
  min-height: 707px; /* Virtual A4 Portrait aspect-ratio */
}

.grades-print-modal__preview-paper.landscape {
  max-width: 707px;
  min-height: 500px; /* Virtual A4 Landscape aspect-ratio */
}

.preview-title {
  text-align: center;
  font-size: 1.4em;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: #111;
}

.preview-subtitle {
  text-align: center;
  font-size: 0.9em;
  color: #555;
  margin-bottom: 4px;
}

.preview-meta-date {
  text-align: center;
  font-size: 0.75em;
  color: #777;
  margin-bottom: 16px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.preview-table.table--two-columns {
  max-width: 450px;
}

.preview-table th {
  border-bottom: 2px solid #222;
  padding: 6px 8px;
  text-align: left;
  font-weight: 600;
  color: #222;
}

.preview-table td {
  border-bottom: 1px solid #eee;
  padding: 6px 8px;
}

.preview-table .text-right {
  text-align: right;
}

.preview-table .font-bold {
  font-weight: 700;
}

.preview-table .prev-weight {
  font-size: 0.8em;
  font-weight: normal;
  color: #666;
}

.preview-table.zebra-striping tbody tr:nth-child(even) {
  background-color: #f2f2f2;
}

.preview-table .num-col {
  color: #444;
}

.preview-table .overall-col-header {
  border-bottom: 2px solid var(--primary);
  color: var(--primary);
}

.preview-table .overall-col-cell {
  background-color: color-mix(in srgb, var(--primary) 5%, transparent);
  color: var(--primary);
  font-weight: bold;
}

.preview-table .prev-ass-header {
  font-size: 0.8em;
  line-height: 1.1;
  text-align: right;
  border-bottom: 2px solid #555;
  min-width: 60px;
}

.prev-ass-header-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.prev-ass-name {
  font-weight: 600;
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prev-ass-pts {
  font-size: 0.85em;
  color: #666;
}

.preview-table .prev-ass-cell {
  color: #333;
  border-left: 1px solid #f2f2f7;
}

.prev-avg-row td {
  border-top: 2px solid #222;
  border-bottom: 2px solid #222;
  font-weight: bold;
  background-color: #f5f5f7;
}

.preview-footer {
  margin-top: auto;
  border-top: 1px solid #eee;
  padding-top: 10px;
  font-size: 0.75em;
  color: #777;
  display: flex;
  justify-content: space-between;
}

/* Font Scales for Preview */
.preview-font--compact { font-size: 8px; }
.preview-font--compact td, .preview-font--compact th { padding: 3px 4px; }
.preview-font--normal { font-size: 10px; }
.preview-font--normal td, .preview-font--normal th { padding: 5px 6px; }
.preview-font--large { font-size: 12px; }
.preview-font--large td, .preview-font--large th { padding: 7px 8px; }

/* ─── REAL BROWSER PRINT ONLY LAYOUT ─── */
.grades-grid-print-only {
  display: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: black;
  width: 100%;
  background: white;
}

.grades-grid-print-only.print-only-container--active {
  display: block;
}

@media print {
  #app, .bm-overlay, .bm-card, .reports__modal-overlay {
    display: none !important;
  }

  .grades-grid-print-only.print-only-container--active {
    display: block !important;
    position: relative;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background: white !important;
  }

  .grades-grid-print-page {
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    background: white !important;
  }

  /* Up to 2 pages maximum settings */
  .grades-grid-print-page table {
    page-break-inside: auto;
  }

  .grades-grid-print-page tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  .grades-grid-print-page thead {
    display: table-header-group; /* Repeat header row on second page */
  }

  .print-header {
    text-align: center;
    margin-bottom: 12px;
    flex-shrink: 0;
  }

  .print-title {
    font-size: 1.5rem;
    font-weight: bold;
    text-transform: uppercase;
    margin: 0 0 4px 0;
  }

  .print-subtitle {
    font-size: 0.95rem;
    color: #444;
    margin: 0 0 2px 0;
  }

  .print-meta-date {
    font-size: 0.75rem;
    color: #666;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  .print-table.table--two-columns {
    max-width: 450px;
  }

  .print-table th {
    border-bottom: 2px solid black;
    padding: 6px 8px;
    text-align: left;
    font-weight: bold;
  }

  .print-table td {
    border-bottom: 1px solid #ccc;
    padding: 6px 8px;
  }

  .print-table .print-cat-col,
  .print-table .print-cat-cell {
    text-align: right;
  }

  .print-table th.print-ass-col {
    text-align: right;
    font-size: 0.75rem;
    line-height: 1.2;
    border-bottom: 2px solid black;
  }

  .print-table th.print-ass-col .ass-name {
    display: block;
    font-weight: bold;
    max-width: 48px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .print-table th.print-ass-col .ass-pts {
    display: block;
    font-weight: normal;
    font-size: 0.65rem;
    color: #444;
  }

  .print-table td.print-ass-cell {
    text-align: right;
    border-left: 1px solid #e0e0e0;
  }

  .print-table .print-overall-col,
  .print-table .print-overall-cell {
    text-align: right;
    font-weight: bold;
    border-left: 2px solid black;
  }

  .print-table .cat-weight {
    font-size: 0.75rem;
    font-weight: normal;
    color: #555;
    display: block;
  }

  .print-avg-row td {
    border-top: 2px solid black;
    border-bottom: 2px solid black;
    font-weight: bold;
    background-color: #f0f0f0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .zebra-striping tbody tr:nth-child(even) {
    background-color: #f2f2f2 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-footer {
    margin-top: 15px;
    border-top: 1px solid #ccc;
    padding-top: 8px;
    font-size: 0.75rem;
    color: #666;
    text-align: left;
    flex-shrink: 0;
    page-break-inside: avoid;
  }

  /* Font scales for print output */
  .font-size--compact { font-size: 8pt; }
  .font-size--compact td, .font-size--compact th { padding: 3px 4px; }
  
  .font-size--normal { font-size: 10pt; }
  .font-size--normal td, .font-size--normal th { padding: 5px 6px; }
  
  .font-size--large { font-size: 12pt; }
  .font-size--large td, .font-size--large th { padding: 7px 8px; }
}

:deep(.bm-card) {
  transition: max-width 0.3s ease;
}
</style>
