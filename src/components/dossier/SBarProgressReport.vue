<template>
  <div class="sbar-progress-report" :class="{ 'sbar-progress-report--batch': isBatch }">
    <!-- Header -->
    <header class="report-header">
      <div class="report-header__left">
        <div class="header-title-row">
          <h1 class="report-student-name">{{ student?.firstName }} {{ student?.lastName }}</h1>
          <span 
            v-if="config.includeOverallBadge && overallBadge" 
            class="header-grade-badge" 
            :style="{ background: overallBadge.color || '#3b82f6' }"
            :title="overallBadge.label"
          >
            {{ overallBadge.level }}
          </span>
        </div>
        <p class="report-meta">{{ displayMetaLine }}</p>
      </div>
      <div class="report-header__right">
        <div class="report-date">{{ formattedDate }}</div>
        <div class="report-type-badge">SBAR Progress Report</div>
      </div>
    </header>

    <!-- Expectations & Progression Matrix Table -->
    <section class="report-section report-section--expectations">
      <div class="section-title-row">
        <h3 class="section-title">Curriculum Expectation Mastery</h3>
        <span class="scope-chip">
          Scope: {{ scopeLabel }}
        </span>
      </div>

      <div v-if="!unitsData.length" class="empty-expectations">
        <p>No assessed expectations recorded for this period.</p>
      </div>

      <div v-else class="units-container">
        <div v-for="unit in unitsData" :key="unit.unitId" class="unit-block">
          <h4 class="unit-title">{{ unit.name }}</h4>
          
          <table class="sbar-matrix-table">
            <thead>
              <tr>
                <th style="width: 70px;">Code</th>
                <th>Expectation Description</th>
                <th v-if="config.includeProgression" style="width: 240px;">Growth Progression</th>
                <th style="width: 80px; text-align: center;">Mastery</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="exp in unit.expectations" 
                :key="exp.code"
              >
                <td class="code-cell">
                  <span class="exp-code">{{ exp.code }}</span>
                  <span v-if="exp.isProvisional" class="provisional-chip" title="Calculated provisionally from formative evidence">
                    Formative
                  </span>
                </td>
                <td class="desc-cell">{{ exp.description }}</td>
                <td v-if="config.includeProgression" class="progression-cell">
                  <div class="inline-timeline">
                    <template v-for="(evalItem, idx) in (exp.evaluations || []).slice(-3)" :key="evalItem.assessmentId || idx">
                      <span 
                        class="timeline-pill"
                        :style="{ borderColor: evalItem.badge?.color || '#94a3b8' }"
                        :title="evalItem.name + ' (' + formatDateShort(evalItem.date) + ')'"
                      >
                        <span class="pill-date">{{ formatDateShort(evalItem.date) }}</span>
                        <span class="pill-badge">{{ evalItem.badge?.level || '—' }}</span>
                      </span>
                      <span v-if="idx < Math.min(exp.evaluations.length, 3) - 1" class="timeline-arrow">➔</span>
                    </template>
                    <span v-if="!exp.evaluations?.length" class="empty-timeline">—</span>
                  </div>
                </td>
                <td class="level-cell text-center">
                  <div class="level-cell-wrapper">
                    <span 
                      v-if="exp.trend && exp.evaluations?.length >= 2" 
                      class="trend-icon" 
                      :class="'trend-icon--' + exp.trend"
                      :title="'Trend: ' + exp.trend"
                    >
                      <template v-if="exp.trend === 'improving'">↗</template>
                      <template v-else-if="exp.trend === 'declining'">↘</template>
                      <template v-else>→</template>
                    </span>

                    <span 
                      class="level-badge" 
                      :style="{ background: exp.badge.color || '#64748b' }"
                    >
                      {{ exp.badge.level }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Attendance & Behavior Markers (Matching Traditional Mode) -->
    <section v-if="config.includeAttendance || config.includeBehavior" class="report-section report-section--attendance">
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
      <p>Standards-Based Assessment &amp; Reporting (S-BAR) · Values reflect records to date.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { 
  assessments, 
  gradeMap, 
  activeClassRecord 
} from '../../composables/useGradebook.js'
import { getEventsByStudent } from '../../composables/useClassroom.js'
import { toMinutes, getDateRangeForClassPeriod } from '../../utils/timeUtils.js'
import { formatLocalDisplay } from '../../utils/dates.js'
import { useSBarPrintOptions } from '../../composables/useSBarPrintOptions.js'
import { LEARNING_SKILL_CATEGORIES, getLearningSkillsByStudent, hasLearningSkillsData } from '../../composables/useLearningSkills.js'

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true },
  config:    { type: Object, default: () => ({ 
    expectationScope: 'assessed', 
    includeProgression: true, 
    includeOverallBadge: true, 
    includeAttendance: true, 
    includeBehavior: false,
    includeLearningSkills: true
  }) },
  stats:     { type: Object, default: null },
  isBatch:   { type: Boolean, default: false }
})

const { students, activeClass, teacherName, academicTerms } = useClassroom()
const { getStudentOverallSBarBadge, prepareSBarReportData } = useSBarPrintOptions()

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

function getRatingLabel(rating) {
  if (!rating) return 'Not Evaluated'
  const map = {
    E: 'Excellent',
    G: 'Good',
    S: 'Satisfactory',
    N: 'Needs Improvement'
  }
  return map[rating.toUpperCase()] || rating
}

const student = computed(() => students.value[props.studentId] || {})

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
})

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

import { getEffectiveClassRecord } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'

const effectiveClass = computed(() => {
  return getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
})

const overallBadge = computed(() => {
  return getStudentOverallSBarBadge(
    props.studentId, 
    effectiveClass.value, 
    assessments.value, 
    gradeMap.value, 
    events.value
  )
})

const scopeLabel = computed(() => {
  const scope = props.config.expectationScope || 'assessed'
  if (scope === 'overall') return 'Overall Expectations / Success Criteria'
  if (scope === 'all') return 'All Curriculum Expectations'
  return 'Assessed Expectations Only'
})

const unitsData = computed(() => {
  return prepareSBarReportData(
    props.studentId,
    effectiveClass.value,
    assessments.value,
    gradeMap.value,
    events.value,
    props.config.expectationScope || 'assessed'
  )
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
  
  const earliestAssessment = assessments.value?.[0]?.date
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

function formatDateShort(d) {
  if (!d) return ''
  return formatLocalDisplay(d)
}
</script>

<style scoped>
.sbar-progress-report {
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
  gap: 14px;
  box-sizing: border-box;
  
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.sbar-progress-report--batch {
  break-after: page;
}

/* Header */
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

.report-student-name {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--print-text);
}

.header-grade-badge {
  color: white;
  padding: 4px 14px;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.report-meta {
  font-size: 1.05rem;
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
  font-size: 0.9rem;
}

.report-type-badge {
  display: inline-block;
  background: var(--print-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.725rem;
  margin-top: 6px;
  letter-spacing: 0.04em;
}

/* Attendance Cards */
.footer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

/* Section Header */
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1.5px solid var(--print-border);
  padding-bottom: 6px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--print-text);
}

.scope-chip {
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--print-text-muted);
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
}

.empty-expectations {
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed var(--print-border);
  border-radius: 8px;
  font-style: italic;
  font-size: 0.85rem;
  color: var(--print-text-muted);
}

/* Units & Matrix Table */
.units-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.unit-block {
  break-inside: auto;
}

.unit-title {
  font-size: 0.875rem;
  font-weight: 800;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 6px 0;
  padding-bottom: 3px;
  border-bottom: 2px solid #0f172a;
  page-break-after: avoid;
}

.sbar-matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  table-layout: fixed;
}

.sbar-matrix-table thead {
  display: table-header-group;
}

.sbar-matrix-table tr {
  page-break-inside: avoid;
}

.sbar-matrix-table th {
  background: #f8fafc;
  border-bottom: 1.5px solid #cbd5e1;
  padding: 6px 8px;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #475569;
  letter-spacing: 0.02em;
}

.sbar-matrix-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
  color: #334155;
}

.code-cell {
  vertical-align: middle;
}

.exp-code {
  font-weight: 800;
  font-size: 0.8rem;
  color: var(--print-primary);
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.provisional-chip {
  display: inline-block;
  font-size: 0.625rem;
  font-weight: 700;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  padding: 1px 4px;
  border-radius: 3px;
  margin-top: 2px;
}

.desc-cell {
  font-size: 0.78rem;
  line-height: 1.35;
  color: #1e293b;
}

.progression-cell {
  vertical-align: middle;
}

.inline-timeline {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.timeline-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f8fafc;
  border: 1.5px solid #94a3b8;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.675rem;
}

.pill-date {
  color: var(--print-text-muted);
  font-size: 0.65rem;
}

.pill-badge {
  font-weight: 800;
  color: #0f172a;
}

.timeline-arrow {
  font-size: 0.65rem;
  color: #94a3b8;
}

.empty-timeline {
  color: #cbd5e1;
  font-size: 0.8rem;
}

.level-cell-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.trend-icon {
  font-weight: 800;
  font-size: 0.85rem;
}

.trend-icon--improving { color: #166534; }
.trend-icon--declining { color: #991b1b; }
.trend-icon--steady    { color: #64748b; }

.level-badge {
  color: white;
  font-weight: 800;
  font-size: 0.825rem;
  padding: 3px 9px;
  border-radius: 4px;
  min-width: 32px;
  text-align: center;
  display: inline-block;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.text-center {
  text-align: center;
}

/* Footer */
.report-page-footer {
  margin-top: auto;
  border-top: 1px solid var(--print-border);
  padding-top: 12px;
  text-align: center;
  font-size: 0.725rem;
  color: var(--print-text-muted);
  font-style: italic;
}

@media print {
  .sbar-progress-report {
    padding: 0;
    margin: 0;
    width: 100%;
    min-height: auto;
    box-shadow: none;
    border: none;
    border-radius: 0;
  }
}
</style>
