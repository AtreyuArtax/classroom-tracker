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
        <p class="report-meta">{{ activeClass?.name }} • {{ teacherName || 'Teacher' }}</p>
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
        <h3 class="card-title">Grade Performance Trend</h3>
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
        <div v-for="cat in categoryPerformance" :key="cat.categoryId" class="category-pill">
          <span class="cp-name">{{ cat.name }}</span>
          <span class="cp-weight">{{ cat.weight }}%</span>
          <span class="cp-pct" :style="{ color: getGradeColor(cat.percentage) }">
            {{ cat.percentage !== null ? Math.round(cat.percentage) + '%' : 'N/A' }}
          </span>
        </div>
      </div>
    </section>

    <!-- Assignments Section -->
    <section class="report-section">
      <h3 class="section-title">Academic Record</h3>
      
      <!-- Missing Assignments (Call to Action) -->
      <div v-if="missingAssessments.length" class="report-alert report-alert--missing">
        <h4 class="alert-title">Missing Assessments ({{ missingAssessments.length }})</h4>
        <ul class="missing-list">
          <li v-for="a in missingAssessments" :key="a.assessmentId">
            <span class="m-date">{{ formatDate(a.date) }}</span>
            <span class="m-name">{{ a.name }}</span>
            <span class="m-cat">{{ getCategoryName(a.categoryId) }}</span>
          </li>
        </ul>
      </div>

      <!-- Recent Graded Work -->
      <div class="report-table-wrapper">
        <table class="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Assessment</th>
              <th>Category</th>
              <th class="text-right">Score</th>
              <th class="text-right">%</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in recentGradedAssessments" :key="a.assessmentId">
              <td class="td-date">{{ formatDate(a.date) }}</td>
              <td class="td-name">{{ a.name }}</td>
              <td class="td-cat">{{ getCategoryName(a.categoryId) }}</td>
              <td class="td-score text-right">{{ a.score }} / {{ a.totalPoints }}</td>
              <td class="td-pct text-right" :style="{ color: getGradeColor((a.score / a.totalPoints) * 100) }">
                {{ Math.round((a.score / a.totalPoints) * 100) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Attendance & Behavior (Toggleable) -->
    <section v-if="config.includeAttendance || config.includeBehavior" class="report-section report-section--footer">
      <div class="footer-grid">
        <div v-if="config.includeAttendance" class="footer-card">
          <h4 class="footer-card-title">Attendance Summary</h4>
          <div class="footer-stats">
            <div class="f-stat">
              <span class="f-val">{{ attendanceStats.absences }}</span>
              <span class="f-lab">Absences</span>
            </div>
            <div class="f-stat">
              <span class="f-val">{{ attendanceStats.lates }}</span>
              <span class="f-lab">Late Arrivals</span>
            </div>
          </div>
        </div>
        <div v-if="config.includeBehavior" class="footer-card">
          <h4 class="footer-card-title">Classroom Observations</h4>
          <div class="footer-stats">
            <div class="f-stat">
              <span class="f-val">{{ washroomCount }}</span>
              <span class="f-lab">Out-of-Class Trips</span>
            </div>
            <div v-if="topBehavior" class="f-stat">
              <span class="f-val">{{ topBehavior.count }}</span>
              <span class="f-lab">{{ topBehavior.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Page Footer -->
    <footer class="report-page-footer">
      <p>This report generated automatically via Classroom Tracker. Values reflect data currently on record.</p>
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
  activeClassRecord 
} from '../../composables/useGradebook.js'
import { getEventsByStudent } from '../../db/eventService.js'
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

function formatDate(d) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })
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

// Assessment Logic
const studentAssessments = computed(() => {
  return assessments.value
    .map(a => {
      const g = gradeMap.value[a.assessmentId]?.[props.studentId]
      return { ...a, score: g?.resolvedScore ?? null, missing: g?.missing, excluded: g?.excluded }
    })
    .filter(a => !a.excluded && (a.target === 'class' || (a.target === 'individual' && String(a.targetStudentId) === String(props.studentId))))
})

const missingAssessments = computed(() => studentAssessments.value.filter(a => a.missing))
const recentGradedAssessments = computed(() => 
  studentAssessments.value
    .filter(a => a.score !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15) // Show top 15 recent
)

const allDossierAssessments = computed(() => {
  return studentAssessments.value.sort((a, b) => new Date(a.date) - new Date(b.date))
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
  const lates = filteredEvents.filter(e => e.code === 'l').length
  return { absences, lates }
})

const washroomCount = computed(() => {
  return events.value.filter(e => e.code === 'w').length
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
  padding: 30px;
  min-height: 297mm;
  width: 210mm;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  
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
}

.report-card {
  flex: 1;
  border: 1px solid var(--print-border);
  border-radius: 12px;
  padding: 16px;
}

.card-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--print-text-muted);
  margin: 0 0 12px;
}

.chart-container {
  height: 150px;
}

/* --- Tables & Lists --- */
.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid var(--print-border);
  padding: 6px 12px;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
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

.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table th {
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--print-text-muted);
  padding: 8px 12px;
  border-bottom: 2px solid var(--print-border);
}

.report-table td {
  padding: 8px 12px;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--print-border);
}

.text-right { text-align: right; }
.td-date { width: 80px; font-weight: 600; color: var(--print-text-muted); }
.td-name { font-weight: 600; }
.td-pct { font-weight: 700; }

/* --- Footer Stats --- */
.footer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.footer-card {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.footer-card-title {
  font-size: 0.8rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--print-text-muted);
}

.footer-stats {
  display: flex;
  gap: 24px;
}

.f-stat {
  display: flex;
  flex-direction: column;
}

.f-val {
  font-size: 1.25rem;
  font-weight: 700;
}

.f-lab {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--print-text-muted);
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
  }
}
</style>
