<template>
  <div class="progress-report" :class="{ 'progress-report--batch': isBatch }">
    <!-- Header -->
    <header class="report-header">
      <div class="report-header__left">
        <div class="header-title-row">
          <h1 class="report-student-name">{{ student?.firstName }} {{ student?.lastName }}</h1>
          <span v-if="config.includeOverallGrade && overallGrade !== null" 
                class="header-grade-badge" 
                :style="{ background: getGradeColor(overallGrade) }">
            {{ formattedGrade }}
          </span>
        </div>
        <p class="report-meta">{{ displayMetaLine }}</p>
      </div>
      <div class="report-header__right">
        <div class="report-date">{{ new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) }}</div>
        <div class="report-type-badge">Progress Report</div>
      </div>
    </header>

    <!-- Consistency Metrics (Medians) -->
    <section v-if="config.includeMedians" class="report-section report-section--medians">
      <div class="summary-metrics-row">
        <div class="metric-item">
          <span class="metric-lab">Weighted Median:</span>
          <span class="metric-val">{{ Math.round(overallWeightedMedian || 0) }}%</span>
        </div>
        <div class="metric-item">
          <span class="metric-lab">Most Consistent:</span>
          <span class="metric-val">{{ Math.round(overallMostConsistent || 0) }}%</span>
        </div>
      </div>
    </section>

    <!-- Visuals Row -->
    <div v-if="config.includeGradeTrend || config.includeTriangulation" class="report-row report-row--visuals">
      <div v-if="config.includeGradeTrend" class="report-card report-card--trend">
        <div class="chart-container">
          <StudentGradeTrend 
            v-if="allDossierAssessments.length"
            :assessments="allDossierAssessments" 
            :grade-map="gradeMap" 
            :student-id="props.studentId" 
            :is-print="true"
          />
        </div>
      </div>
      <div v-if="config.includeTriangulation" class="report-card report-card--mix">
        <h3 class="card-title">Evidence Triangulation</h3>
        <DossierEvidenceMix :mix="evidenceMix" :is-print="true" />
      </div>
    </div>

    <!-- Category Performance Summary -->
    <section v-if="config.includeCategorySummary" class="report-section">
      <h3 class="section-title">Category Performance</h3>
      <div class="category-pills">
        <div v-for="cat in categoryPerformance" :key="cat.categoryId" v-memo="[cat.categoryId, cat.percentage, cat.name, cat.weight]" class="category-pill">
          <span class="cp-name">{{ cat.name }}</span>
          <span class="cp-weight">{{ cat.weight }}%</span>
          <span class="cp-pct" :style="{ color: getGradeColor(cat.percentage) }">
            {{ cat.percentage !== null ? Math.round(cat.percentage) + '%' : 'N/A' }}
          </span>
        </div>
      </div>
    </section>

    <!-- Assessments Section -->
    <section v-if="allCombinedWork.length" class="report-section">
      <h3 class="section-title">Assessments</h3>
      <div class="report-table-grid" :class="{ 'report-table-grid--two-col': splitWorkColumns.length > 1 }">
        <div v-for="(col, colIdx) in splitWorkColumns" :key="'col-' + colIdx" class="report-table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 48px;">Date</th>
                <th>Assessment</th>
                <th style="width: 65px;">Cat</th>
                <th class="text-right" style="width: 65px;">Score</th>
                <th class="text-right" style="width: 42px;">%</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="a in col" :key="a.assessmentId">
                <tr :class="{ 'row-individual': a.target === 'individual' }">
                  <td class="td-date">{{ formatDate(a.date) }}</td>
                  <td class="td-name">
                    <span class="name-text" :title="a.name">{{ a.name }}</span>
                    <span v-if="a.target === 'individual'" class="ind-chip">Ind</span>
                  </td>
                  <td class="td-cat"><span class="cat-chip" :title="getCategoryName(a.categoryId)">{{ getCategoryName(a.categoryId) }}</span></td>
                  <td class="td-score text-right">
                    <div class="score-val">{{ a.score }}/{{ a.totalPoints }}</div>
                    <div v-if="a.attempts?.length > 1" class="score-history">
                      <span v-for="(att, idx) in a.attempts" :key="att.attemptId" class="attempt-crumb">
                        {{ att.pointsEarned }}<template v-if="idx < (a.attempts?.length || 0) - 1">,</template>
                      </span>
                    </div>
                  </td>
                  <td class="td-pct text-right" :style="{ color: getGradeColor((a.score / a.totalPoints) * 100) }">
                    {{ Math.round((a.score / a.totalPoints) * 100) }}%
                  </td>
                </tr>
                <!-- Comment row -->
                <tr
                  v-if="a.attempts?.find(x => x.comment?.trim())"
                  class="comment-row"
                >
                  <td colspan="5" class="comment-cell">
                    {{ a.attempts?.find(x => x.comment?.trim())?.comment }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Attendance & Behavior (Toggleable) -->
    <section v-if="config.includeAttendance || config.includeBehavior" class="report-section report-section--footer">
      <div class="footer-grid">
        <div v-if="config.includeAttendance" class="footer-card footer-card--compact">
          <span class="footer-card-label">Attendance Summary:</span>
          <div class="footer-stats-inline">
            <span class="f-stat-inline"><strong>{{ attendanceStats.absences }}</strong> Absences</span>
            <span class="f-stat-divider">•</span>
            <span class="f-stat-inline"><strong>{{ attendanceStats.lates }}</strong> Late Arrivals</span>
            <template v-if="attendanceStats.lates > 0">
              <span class="f-stat-divider">•</span>
              <span class="f-stat-inline">Total: <strong>{{ attendanceStats.totalMinutes }}m</strong></span>
              <span class="f-stat-divider">•</span>
              <span class="f-stat-inline">Avg: <strong>{{ attendanceStats.average }}m</strong></span>
            </template>
          </div>
        </div>
        <div v-if="config.includeBehavior" class="footer-card footer-card--compact">
          <span class="footer-card-label">Out-of-Class Summary:</span>
          <div class="footer-stats-inline">
            <span class="f-stat-inline"><strong>{{ outOfClassStats.count }}</strong> Total Trips</span>
            <template v-if="outOfClassStats.count > 0">
              <span class="f-stat-divider">•</span>
              <span class="f-stat-inline">Total: <strong>{{ outOfClassStats.totalMinutes }}m</strong></span>
              <span class="f-stat-divider">•</span>
              <span class="f-stat-inline">Avg: <strong>{{ outOfClassStats.average }}m</strong></span>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- Page Footer -->
    <footer class="report-page-footer">
      <p>Values reflect data currently on record.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { 
  classGrades, 
  assessments, 
  gradeMap, 
  activeClassRecord,
  isAssessmentInSubCohort
} from '../../composables/useGradebook.js'
import { getEventsByStudent, toMinutes } from '../../db/eventService.js'
import { formatLocalDisplay } from '../../utils/dates.js'
import StudentGradeTrend from './StudentGradeTrend.vue'
import DossierEvidenceMix from './DossierEvidenceMix.vue'

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true },
  config:    { type: Object, default: () => ({ 
    includeAttendance: true, 
    includeBehavior: false,
    includeOverallGrade: true,
    includeMedians: false,
    includeGradeTrend: true,
    includeTriangulation: false,
    includeCategorySummary: true
  }) },
  isBatch:   { type: Boolean, default: false }
})

const { students, activeClass, behaviorCodes, teacherName } = useClassroom()

const events = ref([])
const loading = ref(true)

async function fetchEvents() {
  if (!props.studentId) return
  loading.value = true
  try {
    events.value = await getEventsByStudent(props.studentId)
  } finally {
    loading.value = false
  }
}

onMounted(fetchEvents)
watch(() => props.studentId, fetchEvents)

const student = computed(() => students.value[props.studentId] || {})
const studentGrades = computed(() => classGrades.value?.[props.studentId] || {})
const overallGrade  = computed(() => studentGrades.value.overallGrade ?? null)
const formattedGrade = computed(() => overallGrade.value !== null ? `${Math.round(overallGrade.value)}%` : 'N/A')

const overallMostConsistent = computed(() => studentGrades.value.mostConsistent?.percentage ?? null)
const overallWeightedMedian = computed(() => studentGrades.value.median ?? null)

const displayMetaLine = computed(() => {
  const className = activeClass.value?.name || 'Class'
  const teacher = teacherName.value || 'Teacher'
  if (activeClassRecord.value?.classType === 'elementary' && activeClassRecord.value?.activeSubjectName) {
    const subName = activeClassRecord.value.activeSubjectName
    if (className.toLowerCase().includes(subName.toLowerCase())) {
      return `${className} • ${teacher}`
    }
    return `${className} — ${subName} • ${teacher}`
  }
  return `${className} • ${teacher}`
})

function formatDate(d) {
  return formatLocalDisplay(d)
}

function getCategoryName(catId) {
  return activeClassRecord.value?.gradebookCategories?.find(c => c.categoryId === catId)?.name || 'Misc'
}

function getGradeColor(score) {
  if (score === null || score === undefined) return 'inherit'
  if (score >= 80) return '#166534' // Darker green for print
  if (score >= 70) return '#0369a1' // Darker blue for print
  if (score >= 60) return '#9a3412' // Darker orange for print
  return '#991b1b' // Darker red for print
}

const currentStudentObj = computed(() => {
  return activeClassRecord.value?.students?.[props.studentId]
})

const studentSubCohort = computed(() => {
  const isElem = activeClassRecord.value?.classType === 'elementary'
  return isElem ? currentStudentObj.value?.gradeLevel : currentStudentObj.value?.courseCode
})

// Assessment Logic
const studentAssessments = computed(() => {
  return assessments.value
    .filter(a => {
      if (a.target === 'individual') {
        return String(a.targetStudentId) === String(props.studentId)
      }
      return isAssessmentInSubCohort(a, studentSubCohort.value)
    })
    .map(a => {
      const g = gradeMap.value[a.assessmentId]?.[props.studentId]
      return { 
        ...a, 
        score: g?.resolvedScore ?? null, 
        attempts: g?.attempts || [],
        missing: g?.missing, 
        excluded: g?.excluded 
      }
    })
    .filter(a => !a.excluded)
})

const missingAssessments = computed(() => studentAssessments.value.filter(a => a.missing))
const recentGradedAssessments = computed(() => 
  studentAssessments.value
    .filter(a => a.score !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
)

const recentClassWork = computed(() => 
  recentGradedAssessments.value.filter(a => a.target !== 'individual')
)

const individualTasks = computed(() => 
  recentGradedAssessments.value.filter(a => a.target === 'individual')
)

const allDossierAssessments = computed(() => {
  return studentAssessments.value.sort((a, b) => new Date(a.date) - new Date(b.date))
})

const allCombinedWork = computed(() => {
  const list = []
  if (recentClassWork.value.length) {
    list.push(...recentClassWork.value)
  }
  if (individualTasks.value.length) {
    list.push(...individualTasks.value)
  }
  return list
})

const splitWorkColumns = computed(() => {
  const list = allCombinedWork.value
  if (list.length <= 10) {
    return [list]
  }
  const mid = Math.ceil(list.length / 2)
  return [list.slice(0, mid), list.slice(mid)]
})

const evidenceMix = computed(() => {
  const mix = { product: 0, observation: 0, conversation: 0 }
  const valid = studentAssessments.value.filter(a => a.score !== null)
  if (!valid.length) return mix
  
  valid.forEach(a => {
    const type = a.assessmentType?.toLowerCase() || 'product'
    if (type.includes('prod')) mix.product++
    else if (type.includes('obs')) mix.observation++
    else if (type.includes('conv')) mix.conversation++
  })

  const total = valid.length
  return {
    product:      (mix.product      / total) * 100,
    observation:  (mix.observation  / total) * 100,
    conversation: (mix.conversation / total) * 100
  }
})



// Stats (Real data from events)
const attendanceStats = computed(() => {
  const filteredEvents = events.value.filter(e => !e.superseded)
  const absences = filteredEvents.filter(e => e.code === 'a').length
  const lateEvents = filteredEvents.filter(e => e.code === 'l')
  const lates = lateEvents.length
  
  const totalMinTotal = lateEvents.reduce((acc, e) => acc + toMinutes(e.duration), 0)
  const average = lates > 0 ? Math.round((totalMinTotal / lates) * 2) / 2 : 0

  return { absences, lates, totalMinutes: totalMinTotal, average }
})

const outOfClassStats = computed(() => {
  const ocEvents = events.value.filter(e => e.code === 'w')
  const count = ocEvents.length
  const totalMinTotal = ocEvents.reduce((acc, e) => acc + toMinutes(e.duration), 0)
  const average = count > 0 ? Math.round((totalMinTotal / count) * 2) / 2 : 0
  
  return { count, totalMinutes: totalMinTotal, average }
})

const behaviorCodesMap = computed(() => 
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)

const topBehavior = computed(() => {
  const counts = {}
  events.value.filter(e => !['a', 'l', 'w'].includes(e.code) && !e.superseded).forEach(e => {
    counts[e.code] = (counts[e.code] || 0) + 1
  })
  
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  
  const [code, count] = entries[0]
  const config = behaviorCodesMap.value[code]
  return { 
    label: config?.label || 'Other Behavior',
    count
  }
})

const categoryPerformance = computed(() => {
  if (!activeClass.value?.gradebookCategories) return []
  return activeClass.value.gradebookCategories.map(cat => {
    const res = studentGrades.value?.categoryResults?.[cat.categoryId]
    return {
      categoryId: cat.categoryId,
      name: cat.name,
      weight: cat.weight,
      percentage: res ? res.percentage : null
    }
  })
})

</script>

<style scoped>
.progress-report {
  --print-primary: #1e3a8a;
  --print-border: #e2e8f0;
  --print-text: #1e293b;
  --print-text-muted: #64748b;
  
  background: white;
  color: var(--print-text);
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  padding: 20px 24px;
  min-height: 297mm;
  width: 210mm;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  /* Force background colors to print */
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.progress-report--batch {
  break-after: page;
}

/* --- Header --- */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid var(--print-primary);
  padding-bottom: 12px;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-grade-badge {
  color: white;
  padding: 4px 14px;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
}

.report-student-name {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--print-text);
}

.report-meta {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--print-text-muted);
  margin: 4px 0 0;
}

.report-header__right {
  text-align: right;
}

.report-date {
  font-weight: 600;
  color: var(--print-text-muted);
}

.report-type-badge {
  display: inline-block;
  background: var(--print-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.75rem;
  margin-top: 8px;
}

/* --- Consistency Metrics --- */
.summary-metrics-row {
  display: flex;
  gap: 40px;
  background: #f8fafc;
  border: 1px solid var(--print-border);
  padding: 12px 20px;
  border-radius: 8px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--print-primary);
}

.metric-lab {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--print-text-muted);
}

/* --- Visuals --- */
.report-row--visuals {
  display: flex;
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
}

.report-card {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--print-border);
  border-radius: 12px;
  padding: 16px;
  box-sizing: border-box;
}

.report-card--trend {
  min-width: 0;
}

.report-card--mix {
  min-width: 0;
}

.card-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--print-text-muted);
  margin: 0 0 12px;
}

.chart-container {
  min-width: 0;
  width: 100%;
  position: relative;
}

/* --- Tables & Lists --- */
.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid var(--print-border);
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.cp-name { color: var(--print-text); }
.cp-weight { color: var(--print-text-muted); font-size: 0.7rem; border-right: 1px solid var(--print-border); padding-right: 8px; }
.cp-pct { font-weight: 800; }

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 12px;
  border-bottom: 1px solid var(--print-border);
  padding-bottom: 6px;
}

.report-alert {
  background: #fff1f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.alert-title {
  margin: 0 0 12px;
  color: #991b1b;
  font-weight: 700;
}

.missing-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.missing-list li {
  font-size: 0.85rem;
  display: flex;
  gap: 12px;
}

.m-date { font-weight: 700; color: #991b1b; width: 50px; }
.m-name { font-weight: 600; flex: 1; }
.m-cat { color: var(--print-text-muted); }

.report-table-grid {
  display: block;
  width: 100%;
}

.report-table-grid--two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.report-table-wrapper {
  min-width: 0;
  width: 100%;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.report-table th {
  text-align: left;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--print-text-muted);
  padding: 4px 6px;
  border-bottom: 2px solid var(--print-border);
}

.report-table td {
  padding: 3px 6px;
  font-size: 0.76rem;
  border-bottom: 1px solid var(--print-border);
  vertical-align: middle;
}

.text-right { text-align: right; }

.td-date {
  width: 48px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--print-text-muted);
  white-space: nowrap;
}

.td-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-chip {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 65px;
  vertical-align: middle;
}

.ind-chip {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 3px;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  margin-left: 4px;
  vertical-align: middle;
}

.score-val {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.td-pct {
  font-weight: 800;
  font-size: 0.78rem;
  white-space: nowrap;
}

.score-history {
  font-size: 0.62rem;
  color: var(--print-text-muted);
  font-weight: 500;
  line-height: 1;
}

.comment-row td {
  border-bottom: 1px solid var(--print-border);
}

.comment-cell {
  font-size: 0.72rem;
  font-style: italic;
  color: var(--print-text-muted);
  padding: 1px 6px 4px 16px;
}

.comment-cell::before {
  content: '↳ ';
  font-style: normal;
  font-weight: 600;
  opacity: 0.6;
}

/* --- Footer Stats --- */
.footer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.footer-card--compact {
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid var(--print-border);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.78rem;
}

.footer-card-label {
  font-weight: 700;
  color: var(--print-text);
  white-space: nowrap;
}

.footer-stats-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--print-text-muted);
}

.footer-stats-inline strong {
  color: var(--print-text);
}

.f-stat-divider {
  opacity: 0.4;
}

.report-page-footer {
  margin-top: auto;
  border-top: 1px solid var(--print-border);
  padding-top: 16px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--print-text-muted);
  font-style: italic;
}

@media print {
  .progress-report {
    padding: 0;
    margin: 0;
    width: 100%;
    min-height: auto;
    box-shadow: none;
    border: none;
    border-radius: 0;
    page-break-after: always;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
</style>
