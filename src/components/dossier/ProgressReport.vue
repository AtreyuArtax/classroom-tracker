<template>
  <template v-if="isSBAR">
    <SBarProgressReport 
      :student-id="studentId" 
      :class-id="classId" 
      :config="config" 
      :stats="stats"
      :is-batch="isBatch" 
    />
  </template>

  <template v-else>
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
        <div class="card-title-group">
          <h3 class="card-title">Evidence Triangulation</h3>
          <span class="card-subtitle">Distribution of assessment sources</span>
        </div>
        <DossierEvidenceMix :mix="evidenceMix" :is-print="true" />
      </div>
    </div>

    <!-- Category Performance Summary -->
    <section v-if="config.includeCategorySummary && categoryPerformance.length" class="report-section">
      <h3 class="section-title">Category Performance</h3>
      <div class="category-pills">
        <div v-for="cat in categoryPerformance" :key="cat.categoryId" class="category-pill">
          <span class="cp-name">{{ cat.name }}</span>
          <span class="cp-weight">({{ cat.weight }}%)</span>
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
                <th style="width: 44px;">Date</th>
                <th>Assessment</th>
                <th style="width: 50px;">Cat</th>
                <th class="text-right" style="width: 58px;">Score</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="a in col" :key="a.assessmentId">
                <tr :class="{ 'row-individual': a.target === 'individual' }">
                  <td class="td-date">{{ formatDate(a.date) }}</td>
                  <td class="td-name">
                    <div class="name-text-row">
                      <span class="name-text" :title="a.name">{{ a.name }}</span>
                      <span v-if="a.target === 'individual'" class="ind-chip" title="Individual Student Task">Ind</span>
                    </div>
                    <div v-if="a.attempts?.length > 1" class="retest-history">
                      <span class="retest-prefix">Retest:</span>
                      <span v-for="(att, idx) in a.attempts" :key="att.attemptId || idx" class="attempt-crumb">
                        {{ att.pointsEarned }}<template v-if="idx < a.attempts.length - 1"> → </template>
                      </span>
                    </div>
                  </td>
                  <td class="td-cat"><span class="cat-chip" :title="getCategoryName(a.categoryId)">{{ getCategoryName(a.categoryId) }}</span></td>
                  <td class="td-score text-right">
                    <div class="score-cell-group">
                      <span class="score-pct" :style="{ color: getGradeColor((a.score / a.totalPoints) * 100) }">
                        {{ Math.round((a.score / a.totalPoints) * 100) }}%
                      </span>
                      <span class="score-fraction">{{ a.score }}/{{ a.totalPoints }}</span>
                    </div>
                  </td>
                </tr>
                <!-- Comment row -->
                <tr
                  v-if="a.attempts?.find(x => x.comment?.trim())"
                  class="comment-row"
                >
                  <td colspan="4" class="comment-cell">
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
        <div v-if="config.includeAttendance" class="footer-card footer-card--attendance">
          <div class="footer-card-header">
            <span class="footer-card-label">Missed Classes:</span>
            <div class="footer-stats-inline">
              <span class="f-stat-inline">
                <strong>{{ attendanceStats.absences }}</strong><template v-if="attendanceStats.totalClasses"> of {{ attendanceStats.totalClasses }} classes</template><template v-else> missed</template>
              </span>
              <span v-if="attendanceStats.rate !== null" class="f-stat-rate" :style="{ color: getAttendanceRateColor(attendanceStats.rate) }">
                ({{ attendanceStats.rate }}% Attendance Rate)
              </span>
              <span class="f-stat-divider">•</span>
              <span class="f-stat-inline"><strong>{{ attendanceStats.lates }}</strong> Late<template v-if="attendanceStats.lates !== 1">s</template></span>
              <template v-if="attendanceStats.lates > 0">
                <span class="f-stat-divider">•</span>
                <span class="f-stat-inline">Total: <strong>{{ attendanceStats.totalMinutes }}m</strong></span>
              </template>
            </div>
          </div>
          <p class="footer-card-explainer">
            Reflects all missed class time; official excused codes are tracked in PowerSchool.
          </p>
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

    <!-- Learning Skills & Work Habits (Compact Footer Section) -->
    <section v-if="config.includeLearningSkills !== false && latestLearningSkillRecord" class="report-section report-section--skills-footer">
      <div class="footer-card footer-card--skills">
        <div class="skills-card-header">
          <div class="skills-card-title-row">
            <span class="footer-card-label">Learning Skills:</span>
            <span v-if="latestLearningSkillRecord.term" class="skills-card-term">({{ latestLearningSkillRecord.term }})</span>
          </div>
          <div class="skills-legend-inline">
            <span><strong>E:</strong> Excellent</span>
            <span><strong>G:</strong> Good</span>
            <span><strong>S:</strong> Satisfactory</span>
            <span><strong>N:</strong> Needs Improvement</span>
          </div>
        </div>
        <div class="skills-compact-row">
          <div v-for="cat in LEARNING_SKILL_CATEGORIES" :key="cat.key" class="skills-compact-cell">
            <span class="scc-label">{{ cat.label }}</span>
            <span 
              class="scc-badge"
              :class="'scc-badge--' + (getSkillRating(cat.key) || 'none').toLowerCase()"
            >
              {{ getSkillRating(cat.key) || '—' }}
            </span>
            <span v-if="getStudentSelfRating(cat.key) && latestLearningSkillRecord.teacherEval?.[cat.key] && getStudentSelfRating(cat.key) !== getSkillRating(cat.key)" class="scc-self">
              Self: {{ getStudentSelfRating(cat.key) }}
            </span>
          </div>
        </div>
        <div v-if="learningSkillComment" class="skills-card-comment">
          <span class="skills-comment-label">Teacher Note:</span>
          <span class="skills-comment-text">"{{ learningSkillComment }}"</span>
        </div>
      </div>
    </section>

    <!-- Page Footer -->
    <footer class="report-page-footer">
      <p>Values reflect data currently on record.</p>
    </footer>
  </div>
  </template>
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
import { getEventsByStudent } from '../../composables/useClassroom.js'
import { toMinutes, getDateRangeForClassPeriod } from '../../utils/timeUtils.js'
import { formatLocalDisplay } from '../../utils/dates.js'
import StudentGradeTrend from './StudentGradeTrend.vue'
import DossierEvidenceMix from './DossierEvidenceMix.vue'
import SBarProgressReport from './SBarProgressReport.vue'
import { getEffectiveClassRecord, getStudentEffectiveGrade } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { LEARNING_SKILL_CATEGORIES, getLearningSkillsByStudent, hasLearningSkillsData } from '../../composables/useLearningSkills.js'

const effectiveClass = computed(() => {
  return getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
})

const isSBAR = computed(() => {
  const fw = effectiveClass.value?.gradingFramework
  return fw === 'sbar' || (typeof fw === 'string' && fw.startsWith('sbar'))
})

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true },
  config:    { type: Object, default: () => ({ 
    includeAttendance: true, 
    includeBehavior: false,
    includeOverallGrade: true,
    includeGradeTrend: true,
    includeTriangulation: false,
    includeCategorySummary: true,
    includeLearningSkills: true
  }) },
  stats:     { type: Object, default: null },
  isBatch:   { type: Boolean, default: false }
})

const { students, activeClass, behaviorCodes, teacherName, academicTerms } = useClassroom()

const events = ref([])
const learningSkills = ref([])
const loading = ref(true)

async function fetchEvents() {
  if (!props.studentId) return
  loading.value = true
  try {
    const [evts, lsList] = await Promise.all([
      getEventsByStudent(props.studentId),
      getLearningSkillsByStudent(props.classId, props.studentId).catch(() => [])
    ])
    events.value = evts || []
    learningSkills.value = lsList || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchEvents)
watch(() => props.studentId, fetchEvents)

const latestLearningSkillRecord = computed(() => {
  const valid = learningSkills.value.filter(hasLearningSkillsData)
  if (!valid.length) return null
  return valid[0]
})

function getSkillRating(key) {
  const rec = latestLearningSkillRecord.value
  if (!rec) return null
  return rec.teacherEval?.[key] || rec.ratings?.[key] || rec.studentEval?.[key] || null
}

function getStudentSelfRating(key) {
  const rec = latestLearningSkillRecord.value
  if (!rec) return null
  return rec.studentEval?.[key] || null
}

const learningSkillComment = computed(() => {
  const rec = latestLearningSkillRecord.value
  if (!rec) return ''
  return rec.teacherComment || rec.comment || ''
})

const student = computed(() => students.value[props.studentId] || {})
const studentGrades = computed(() => classGrades.value?.[props.studentId] || {})
const overallGrade  = computed(() => studentGrades.value.overallGrade ?? null)
const formattedGrade = computed(() => overallGrade.value !== null ? `${Math.round(overallGrade.value)}%` : 'N/A')

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
  return isElem 
    ? (getStudentEffectiveGrade(currentStudentObj.value, activeSubjectId.value) || currentStudentObj.value?.gradeLevel)
    : currentStudentObj.value?.courseCode
})

// Assessment Logic
const studentAssessments = computed(() => {
  return assessments.value
    .filter(a => {
      if (a.purpose === 'administrative') return false
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

const allDossierAssessments = computed(() => {
  return studentAssessments.value.sort((a, b) => new Date(a.date) - new Date(b.date))
})

const allCombinedWork = computed(() => {
  return studentAssessments.value
    .filter(a => a.score !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
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



function getAttendanceRateColor(rate) {
  if (rate === null || rate === undefined) return 'var(--print-text-muted)'
  if (rate >= 90) return '#166534'
  if (rate >= 80) return '#0369a1'
  if (rate >= 70) return '#9a3412'
  return '#991b1b'
}

const currentClassObj = computed(() => {
  return activeClassRecord.value || activeClass.value || {}
})

const matchingTerm = computed(() => {
  const cls = currentClassObj.value
  if (!cls) return null
  return academicTerms.value?.find(t => t.year === cls.year && String(t.semester) === String(cls.semester))
})

const schoolDaysElapsed = computed(() => {
  if (props.stats?.classDays) {
    return props.stats.classDays
  }

  const cls = currentClassObj.value
  const term = matchingTerm.value
  const range = getDateRangeForClassPeriod('semester', cls, academicTerms.value || [])
  
  const earliestAssessment = allDossierAssessments.value[0]?.date
  const earliestEvent = events.value.length ? events.value[events.value.length - 1]?.timestamp?.slice(0, 10) : null
  const anchor = term?.startDate || earliestAssessment || earliestEvent
  const cap = term?.instructionalDays ? Number(term.instructionalDays) : 999

  if (!range?.from && !anchor) return null

  const fromStr = range?.from || anchor
  const toDate = range?.to ? new Date(range.to + 'T23:59:59') : new Date()
  let count = 0
  let cur = new Date(fromStr + 'T00:00:00')
  while (cur <= toDate) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return Math.min(Math.max(1, count), cap)
})

// Stats (Real data from events)
const attendanceStats = computed(() => {
  const filteredEvents = events.value.filter(e => !e.superseded)
  const absences = filteredEvents.filter(e => e.code === 'a').length
  const lateEvents = filteredEvents.filter(e => e.code === 'l')
  const lates = lateEvents.length
  
  const totalMinTotal = lateEvents.reduce((acc, e) => acc + toMinutes(e.duration), 0)
  const average = lates > 0 ? Math.round((totalMinTotal / lates) * 2) / 2 : 0

  const totalClasses = schoolDaysElapsed.value

  let rate = null
  if (props.stats?.attendanceRate !== undefined && props.stats?.attendanceRate !== null) {
    rate = Math.round(Number(props.stats.attendanceRate))
  } else if (totalClasses && totalClasses > 0) {
    rate = Math.round(Math.min(100, Math.max(0, ((totalClasses - absences) / totalClasses) * 100)))
  }

  return { 
    absences, 
    lates, 
    totalMinutes: totalMinTotal, 
    average,
    totalClasses,
    rate
  }
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
  if (isSBAR.value) {
    const breakdown = studentGrades.value?.sbarBreakdown
    if (!breakdown?.enabled) return []
    const list = [
      {
        categoryId: 'sbar_term',
        name: 'Coursework (Expectations)',
        weight: breakdown.termWeight,
        percentage: breakdown.sbarMasteryPct
      }
    ]
    Object.entries(breakdown.components || {}).forEach(([cId, c]) => {
      if (Number(c.weight || 0) > 0) {
        list.push({
          categoryId: cId,
          name: c.name,
          weight: c.weight,
          percentage: c.percentage
        })
      }
    })
    return list
  }

  const cats = effectiveClass.value?.gradebookCategories || activeClassRecord.value?.gradebookCategories || activeClass.value?.gradebookCategories
  if (!cats) return []
  return cats
    .filter(cat => Number(cat.weight || 0) > 0)
    .map(cat => {
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
/* --- Visuals --- */
.report-row--visuals {
  display: flex;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
}

.report-card {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--print-border);
  border-radius: 10px;
  padding: 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.report-card--trend {
  min-width: 0;
}

.report-card--mix {
  min-width: 0;
}

.card-title-group {
  margin-bottom: 8px;
}

.card-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--print-text-muted);
  margin: 0;
  letter-spacing: 0.03em;
}

.card-subtitle {
  font-size: 0.68rem;
  color: var(--print-text-muted);
  font-style: italic;
  display: block;
  margin-top: 1px;
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
  gap: 8px;
}

.category-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f8fafc;
  border: 1px solid var(--print-border);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  flex-shrink: 0;
}

.cp-name { color: var(--print-text); font-weight: 700; }
.cp-weight { color: var(--print-text-muted); font-size: 0.68rem; font-weight: 500; }
.cp-pct { font-weight: 800; margin-left: 2px; }

/* Compact Footer Learning Skills Card */
.report-section--skills-footer {
  margin-top: 4px;
}

.footer-card--skills {
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid var(--print-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skills-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skills-card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.skills-card-term {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--print-text-muted);
}

.skills-legend-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.60rem;
  color: var(--print-text-muted);
}

.skills-legend-inline strong {
  color: var(--print-text);
}

.skills-compact-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.skills-compact-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: white;
  border: 1px solid var(--print-border);
  border-radius: 4px;
  padding: 3px 6px;
  min-width: 0;
}

.scc-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--print-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scc-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 3px;
  line-height: 1.2;
  flex-shrink: 0;
}

.scc-badge--e { background: #dcfce7; color: #166534; }
.scc-badge--g { background: #dbeafe; color: #1e40af; }
.scc-badge--s { background: #fef9c3; color: #854d0e; }
.scc-badge--n { background: #fee2e2; color: #991b1b; }
.scc-badge--none { background: #f1f5f9; color: #64748b; }

.scc-self {
  font-size: 0.58rem;
  color: var(--print-text-muted);
}

.skills-card-comment {
  font-size: 0.65rem;
  color: var(--print-text);
  line-height: 1.25;
  border-top: 1px dashed var(--print-border);
  padding-top: 3px;
  margin-top: 1px;
}

.skills-comment-label {
  font-weight: 700;
  color: var(--print-primary);
  margin-right: 4px;
}

.skills-comment-text {
  font-style: italic;
}

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
  width: 44px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--print-text-muted);
  white-space: nowrap;
}

.td-name {
  font-weight: 600;
  overflow: hidden;
}

.name-text-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--print-text);
  font-weight: 600;
}

.retest-history {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.62rem;
  color: var(--print-text-muted);
  line-height: 1.15;
  margin-top: 1px;
}

.retest-prefix {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.56rem;
  letter-spacing: 0.02em;
  color: #0369a1;
}

.attempt-crumb {
  font-weight: 600;
}

.td-cat {
  width: 50px;
}

.cat-chip {
  display: inline-block;
  font-size: 0.63rem;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 50px;
  vertical-align: middle;
}

.ind-chip {
  display: inline-block;
  font-size: 0.58rem;
  font-weight: 700;
  padding: 0 3px;
  border-radius: 3px;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  flex-shrink: 0;
}

.td-score {
  width: 58px;
}

.score-cell-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.15;
}

.score-pct {
  font-weight: 800;
  font-size: 0.78rem;
  white-space: nowrap;
}

.score-fraction {
  font-size: 0.64rem;
  color: var(--print-text-muted);
  font-weight: 500;
  white-space: nowrap;
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

.footer-card--attendance {
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid var(--print-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.78rem;
  justify-content: center;
}

.footer-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.f-stat-rate {
  font-weight: 700;
}

.footer-card-explainer {
  margin: 0;
  font-size: 0.65rem;
  color: var(--print-text-muted);
  font-style: italic;
  line-height: 1.2;
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
