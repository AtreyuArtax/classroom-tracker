<template>
  <div v-if="loading" class="reports__loading" aria-live="polite">Loading…</div>

  <div v-else class="reports__overview">

    <!-- ── Section 1: Executive KPI Ribbon ────────────────────────── -->
    <div class="reports__kpi-ribbon">

      <!-- Tile 1: Academics -->
      <div class="kpi-tile kpi-tile--academics">
        <div class="kpi-tile__header">
          <span class="kpi-tile__label"><GraduationCap :size="13" /> ACADEMICS</span>
          <span v-if="failingStudentsCount > 0" class="kpi-tile__badge kpi-tile__badge--danger">
            <AlertTriangle :size="10" /> {{ failingStudentsCount }} failing
          </span>
          <span v-else class="kpi-tile__badge kpi-tile__badge--ok">
            <Check :size="10" /> All passing
          </span>
        </div>
        <div class="kpi-tile__body">
          <div class="kpi-tile__primary">
            <template v-if="isSBAR">
              <span class="kpi-tile__value">{{ classAverageBadge ? classAverageBadge.level : '—' }}</span>
            </template>
            <template v-else>
              <span class="kpi-tile__value">{{ classAverage !== null ? classAverage.toFixed(1) : '—' }}</span>
              <span class="kpi-tile__unit">%</span>
            </template>
          </div>
          <div class="kpi-tile__meta">
            <span class="kpi-tile__sub">Med: {{ isSBAR ? (classMedianBadge ? classMedianBadge.level : '—') : (classMedian !== null ? classMedian.toFixed(1) + '%' : '—') }}</span>
            <span class="kpi-tile__dot">·</span>
            <span class="kpi-tile__sub">{{ totalAssessmentsCount }} assessments</span>
          </div>
        </div>
      </div>

      <!-- Tile 2: Expectations (if SBAR or Expectations exist) -->
      <div v-if="isSBAR || totalExpectationsCount > 0" class="kpi-tile kpi-tile--expectations">
        <div class="kpi-tile__header">
          <span class="kpi-tile__label"><Target :size="13" /> EXPECTATIONS</span>
          <span v-if="strugglingExpectationsCount > 0" class="kpi-tile__badge kpi-tile__badge--danger">
            <AlertTriangle :size="10" /> {{ strugglingExpectationsCount }} &lt; 65%
          </span>
          <span v-else class="kpi-tile__badge kpi-tile__badge--ok">
            <Check :size="10" /> On target
          </span>
        </div>
        <div class="kpi-tile__body">
          <div class="kpi-tile__primary">
            <span class="kpi-tile__value">{{ assessedExpectationsCount }}</span>
            <span class="kpi-tile__unit">/ {{ totalExpectationsCount }}</span>
          </div>
          <div class="kpi-tile__meta">
            <span class="kpi-tile__sub">Standards evaluated</span>
            <template v-if="classEvaluationStats.missingCount > 0">
              <span class="kpi-tile__dot">·</span>
              <span class="kpi-tile__sub" style="color: #f59e0b; font-weight: 600;">{{ classEvaluationStats.missingCount }} missing</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Tile 2 (Alt): Task Completion & Missing Work (Traditional / Non-SBAR) -->
      <div 
        v-else 
        class="kpi-tile kpi-tile--completion kpi-tile--clickable"
        title="Click to view missing tasks breakdown"
        @click="showMissingModal = true"
      >
        <div class="kpi-tile__header">
          <span class="kpi-tile__label"><ClipboardCheck :size="13" /> EVALUATION &amp; TASKS</span>
          <span v-if="classEvaluationStats.missingCount > 0" class="kpi-tile__badge kpi-tile__badge--warning">
            <AlertTriangle :size="10" /> {{ classEvaluationStats.missingCount }} missing
          </span>
          <span v-else-if="classEvaluationStats.completionRate !== null" class="kpi-tile__badge kpi-tile__badge--ok">
            <Check :size="10" /> All caught up
          </span>
        </div>
        <div class="kpi-tile__body">
          <div class="kpi-tile__primary">
            <span class="kpi-tile__value">{{ classEvaluationStats.completionRate !== null ? classEvaluationStats.completionRate : '—' }}</span>
            <span v-if="classEvaluationStats.completionRate !== null" class="kpi-tile__unit">%</span>
          </div>
          <div class="kpi-tile__meta">
            <span v-if="classEvaluationStats.missingCount > 0" class="kpi-tile__sub">
              Owed by <strong style="color: #f59e0b;">{{ classEvaluationStats.missingStudentsCount }} student{{ classEvaluationStats.missingStudentsCount !== 1 ? 's' : '' }}</strong>
              <span class="kpi-tile__click-hint">· View details ↗</span>
            </span>
            <span v-else class="kpi-tile__sub">
              All {{ totalAssessmentsCount }} assessments submitted
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Section 2: Action Required + Primary Visual Area ─── -->
    <div class="reports__two-col">

      <!-- Left Column: Action Required Panel -->
      <div class="reports__followup-col">
        <div class="reports__col-header">
          <h4 class="reports__col-title">ACTION REQUIRED</h4>
          <span class="reports__col-badge" :class="{ 'reports__col-badge--zero': evaluatedActionItems.active.length === 0 }">
            {{ evaluatedActionItems.active.length }} Flagged
          </span>
        </div>

        <div v-if="evaluatedActionItems.active.length === 0" class="reports__followup-empty">
          <Check :size="15" class="reports__followup-ok-icon" />
          <span class="reports__followup-ok">No active alerts requiring attention</span>
        </div>

        <ul v-else class="reports__followup-list">
          <li
            v-for="item in activeActionItemsVisible"
            :key="item.studentId + '-' + item.reason"
            class="reports__followup-item"
            :class="`reports__followup-item--${item.severity}`"
            role="button"
            tabindex="0"
            @click="$emit('select-student', item.studentId)"
            @keydown.enter="$emit('select-student', item.studentId)"
          >
            <div class="reports__followup-info">
              <div class="reports__followup-row">
                <span class="reports__followup-name" :title="item.name">{{ item.name }}</span>
                <span v-if="item.reTriggered" class="reports__retrigger-tag">Re-triggered</span>
              </div>
              <div class="reports__followup-meta">
                <span v-if="item.grade !== null" class="reports__grade-badge" :class="{ 'reports__grade-badge--failing': item.grade < 50 }">
                  {{ formatGradeDisplay(item.grade) }}
                </span>
                <span class="reports__followup-reason">{{ item.reason }}</span>
              </div>
            </div>

            <div class="reports__followup-actions">
              <button 
                class="reports__btn-ack" 
                title="Mark as Addressed"
                @click.stop="acknowledgeItem(item)"
              >
                <Check :size="11" /> Handled
              </button>
              <span class="reports__followup-arrow">→</span>
            </div>
          </li>
        </ul>

        <button
          v-if="evaluatedActionItems.active.length > 8"
          class="reports__followup-more"
          @click="followUpExpandedLocal = !followUpExpandedLocal"
        >
          {{ followUpExpandedLocal ? 'show less ↑' : `and ${evaluatedActionItems.active.length - 8} more →` }}
        </button>

        <!-- Handled / Addressed Sub-Section -->
        <div v-if="evaluatedActionItems.handled.length > 0" class="reports__handled-section">
          <button 
            class="reports__handled-toggle" 
            @click="showHandledSection = !showHandledSection"
          >
            <span class="handled-title">
              <CheckCircle2 :size="13" class="handled-icon" /> 
              Handled Items ({{ evaluatedActionItems.handled.length }})
            </span>
            <ChevronDown v-if="!showHandledSection" :size="13" />
            <ChevronUp v-else :size="13" />
          </button>

          <ul v-if="showHandledSection" class="reports__handled-list">
            <li 
              v-for="item in evaluatedActionItems.handled" 
              :key="'handled-' + item.studentId" 
              class="reports__handled-item"
            >
              <div class="handled-info">
                <span class="handled-name">{{ item.name }}</span>
                <span class="handled-meta">Handled {{ item.ackDate }} · {{ item.reason }}</span>
              </div>
              <button 
                class="reports__btn-reopen" 
                title="Re-activate alert"
                @click.stop="unacknowledgeItem(item.studentId)"
              >
                <RotateCcw :size="11" /> Restore
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Right Column: Primary Visual Display Container -->
      <div class="reports__visual-col">
        <!-- Sub-tab Switcher -->
        <div class="reports__visual-tabs">
          <button 
            class="reports__visual-tab-btn"
            :class="{ 'reports__visual-tab-btn--active': activeVisualTab === 'risk' }"
            @click="activeVisualTab = 'risk'"
          >
            <BarChart2 :size="14" /> Risk Scatter Matrix
          </button>
          <button 
            v-if="totalExpectationsCount > 0"
            class="reports__visual-tab-btn"
            :class="{ 'reports__visual-tab-btn--active': activeVisualTab === 'expectations' }"
            @click="activeVisualTab = 'expectations'"
          >
            <BookOpen :size="14" /> Expectation Mastery ({{ assessedExpectationsCount }}/{{ totalExpectationsCount }})
          </button>
          <button 
            class="reports__visual-tab-btn"
            :class="{ 'reports__visual-tab-btn--active': activeVisualTab === 'washroom' }"
            @click="activeVisualTab = 'washroom'"
          >
            <DoorOpen :size="14" /> Out of Class
          </button>
        </div>

        <!-- Tab 1: Expectation Mastery Heatmap -->
        <div v-if="activeVisualTab === 'expectations' && totalExpectationsCount > 0" class="reports__visual-pane">
          <ExpectationMasteryHeatmap 
            :active-class="reportClass"
            :assessments="assessments"
            :class-grades="classGrades"
            :active-grade-filter="activeGradeFilter"
            :events="allClassEvents"
            :sidebar-students="sidebarStudents"
          />
        </div>

        <!-- Tab 2: Student Risk Scatter Plot -->
        <div v-else-if="activeVisualTab === 'risk'" class="reports__visual-pane">
          <StudentRiskScatterPlot
            :sidebar-students="sidebarStudents"
            :class-grades="classGrades"
            :aggregates="aggregates"
            :all-class-events="allClassEvents"
            :is-sbar="isSBAR"
            @select-student="$emit('select-student', $event)"
          />
        </div>

        <!-- Tab 3: Out of Class Detail -->
        <div v-else-if="activeVisualTab === 'washroom'" class="reports__visual-pane">
          <OutOfClassAnalytics
            :sidebar-students="sidebarStudents"
            :all-class-events="allClassEvents"
            :period-events="periodEvents"
            :selected-period="selectedPeriod"
            :aggregates="aggregates"
            :report-class="reportClass"
            @select-student="$emit('select-student', $event)"
          />
        </div>

      </div>

    </div>

    <!-- ── Section 3: Recent Classroom Logs ──────────────────── -->
    <div class="reports__notes-card">
      <div class="reports__notes-header">
        <div class="reports__notes-title-group">
          <h4 class="reports__col-title">RECENT CLASSROOM LOGS</h4>
        </div>
        <button 
          type="button"
          class="reports__notes-toggle-btn" 
          @click="$emit('toggle-show-completed')"
        >
          {{ showCompletedNotes ? 'HIDE COMPLETED' : 'SHOW COMPLETED' }}
        </button>
      </div>

      <div v-if="recentNotes.length === 0" class="reports__notes-empty">
        No classroom notes logged yet.
      </div>

      <ul v-else class="reports__notes-list">
        <li v-for="note in recentNotes" :key="note.eventId" class="reports__note-item">
          <div class="reports__note-content">
            <div class="reports__note-top-row">
              <span class="reports__note-student">{{ note.studentName }}</span>
              <span class="reports__note-time">{{ formatNoteTime(note.timestamp) }}</span>
              <button 
                class="reports__note-check-btn" 
                :class="{ 'reports__note-check-btn--checked': note.isCompleted }"
                :title="note.isCompleted ? 'Mark pending' : 'Mark complete'"
                @click="$emit('toggle-note-complete', note.eventId)"
              >
                <Check :size="12" />
              </button>
            </div>
            <p class="reports__note-text" :class="{ 'reports__note-text--completed': note.isCompleted }">
              {{ note.text }}
            </p>
          </div>
        </li>
      </ul>
    </div>

    <!-- Missing Tasks Drill-Down Modal -->
    <ReportsMissingTasksModal
      :show="showMissingModal"
      :missing-students-list="missingStudentsSummary"
      @close="showMissingModal = false"
      @select-student="$emit('select-student', $event)"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 
  UserCheck, Toilet, Activity, AlertTriangle, Check, 
  GraduationCap, Target, BookOpen, BarChart2,
  CheckCircle2, RotateCcw, ChevronDown, ChevronUp,
  ClipboardCheck, DoorOpen
} from 'lucide-vue-next'
import { Bar } from 'vue-chartjs'
import ExpectationMasteryHeatmap from './ExpectationMasteryHeatmap.vue'
import StudentRiskScatterPlot from './StudentRiskScatterPlot.vue'
import OutOfClassAnalytics from './OutOfClassAnalytics.vue'
import ReportsMissingTasksModal from './ReportsMissingTasksModal.vue'
import { getSBARLevelBadge, calculateSBARExpectationMastery } from '../../db/gradebookService.js'
import { gradeMap } from '../../composables/useGradebook.js'
import { useClassroom } from '../../composables/useClassroom.js'

const props = defineProps({
  loading: { type: Boolean, default: false },
  attendanceRate: { type: [String, Number], default: null },
  aggregates: { type: Object, required: true },
  chronicallyAbsentCount: { type: Number, default: 0 },
  tripsPerStudentAvg: { type: [String, Number], default: '0.0' },
  notesLoggedCount: { type: Number, default: 0 },
  followUpItems: { type: Array, default: () => [] },
  followUpVisible: { type: Array, default: () => [] },
  followUpExpanded: { type: Boolean, default: false },
  washroomChartData: { type: Object, required: true },
  washroomChartOptions: { type: Object, required: true },
  longTripsVisible: { type: Array, default: () => [] },
  longTripsExpanded: { type: Boolean, default: false },
  hasAnyNotes: { type: Boolean, default: false },
  recentNotes: { type: Array, default: () => [] },
  showCompletedNotes: { type: Boolean, default: false },
  // Academic & expectation props
  reportClass: { type: Object, default: null },
  classGrades: { type: Object, default: () => ({}) },
  assessments: { type: Array, default: () => [] },
  sidebarStudents: { type: Array, default: () => [] },
  allClassEvents: { type: Array, default: () => [] },
  periodEvents: { type: Array, default: () => [] },
  selectedPeriod: { type: String, default: 'week' },
  activeVisualTab: { type: String, default: null },
  activeGradeFilter: { type: String, default: 'all' }
})

const emit = defineEmits([
  'select-student',
  'update:activeVisualTab',
  'toggle-followup-expand',
  'toggle-longtrips-expand',
  'toggle-show-completed',
  'toggle-note-complete'
])

const followUpExpandedLocal = ref(false)
const showMissingModal = ref(false)

// Active enrolled student ID set
const activeStudentIds = computed(() => new Set((props.sidebarStudents || []).map(s => String(s.studentId))))

const isSBAR = computed(() => props.reportClass?.gradingFramework === 'sbar')

function formatNoteTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
  return `${dateStr}, ${timeStr}`
}

// Academic Calculations
const classAverage = computed(() => {
  if (totalAssessmentsCount.value === 0) return null
  const gradesArr = Object.entries(props.classGrades)
    .filter(([sId]) => activeStudentIds.value.has(String(sId)))
    .map(([, g]) => g?.overallGrade)
    .filter(g => g !== undefined && g !== null)
  if (gradesArr.length === 0) return null
  return gradesArr.reduce((a, b) => a + b, 0) / gradesArr.length
})

const classAverageBadge = computed(() => {
  if (classAverage.value === null) return null
  return getSBARLevelBadge(classAverage.value)
})

const classMedian = computed(() => {
  if (totalAssessmentsCount.value === 0) return null
  const gradesArr = Object.entries(props.classGrades)
    .filter(([sId]) => activeStudentIds.value.has(String(sId)))
    .map(([, g]) => g?.overallGrade)
    .filter(g => g !== undefined && g !== null)
    .sort((a, b) => a - b)
  if (gradesArr.length === 0) return null
  const mid = Math.floor(gradesArr.length / 2)
  return gradesArr.length % 2 !== 0 ? gradesArr[mid] : (gradesArr[mid - 1] + gradesArr[mid]) / 2
})

const classMedianBadge = computed(() => {
  if (classMedian.value === null) return null
  return getSBARLevelBadge(classMedian.value)
})

function formatGradeDisplay(overallPct) {
  if (overallPct === null || overallPct === undefined) return '—'
  if (isSBAR.value) {
    const badge = getSBARLevelBadge(overallPct)
    return badge.level
  }
  return `${Math.round(overallPct)}%`
}

const subjectAssessments = computed(() => {
  if (!props.assessments || props.assessments.length === 0) return []
  const cls = props.reportClass
  if (!cls || cls.classType !== 'elementary') return props.assessments

  const subId = cls.activeSubjectId
  const unitIds = new Set((cls.gradebookUnits || []).map(u => String(u.unitId)))
  const expCodes = new Set((cls.expectations || []).map(e => String(e.code || e.expectationId).toLowerCase()))

  if (unitIds.size === 0 && expCodes.size === 0 && !subId) return props.assessments

  return props.assessments.filter(a => {
    if (a.subjectId && subId && a.subjectId === subId) return true
    if (a.unitId && unitIds.has(String(a.unitId))) return true
    const aExpIds = a.expectationIds || (a.expectationId ? [a.expectationId] : [])
    if (aExpIds.some(id => expCodes.has(String(id).toLowerCase()))) return true
    return false
  })
})

const totalAssessmentsCount = computed(() => subjectAssessments.value.length)

const failingStudentsCount = computed(() => {
  return Object.entries(props.classGrades)
    .filter(([sId, g]) => activeStudentIds.value.has(String(sId)) && g && g.overallGrade !== undefined && g.overallGrade !== null && g.overallGrade < 50)
    .length
})

// Expectation Calculations
const totalExpectationsCount = computed(() => {
  const cls = props.reportClass
  if (!cls) return 0

  if (cls.expectations && Array.isArray(cls.expectations) && cls.expectations.length > 0) {
    if (props.activeGradeFilter && props.activeGradeFilter !== 'all') {
      const gLower = props.activeGradeFilter.toLowerCase()
      const filtered = cls.expectations.filter(e => !e.gradeLevel || e.gradeLevel.toLowerCase() === gLower)
      return filtered.length
    }
    return cls.expectations.length
  }

  const units = cls.gradebookUnits || cls.units || []
  let total = 0
  units.forEach(u => {
    if (u.expectations && Array.isArray(u.expectations)) {
      total += u.expectations.length
    }
  })
  return total
})

const internalVisualTab = ref(
  props.activeVisualTab || (totalExpectationsCount.value > 0 ? 'expectations' : 'risk')
)

const activeVisualTab = computed({
  get() {
    return props.activeVisualTab || internalVisualTab.value
  },
  set(val) {
    internalVisualTab.value = val
    emit('update:activeVisualTab', val)
  }
})

watch(totalExpectationsCount, (newCount) => {
  if (newCount === 0 && activeVisualTab.value === 'expectations') {
    activeVisualTab.value = 'risk'
  } else if (newCount > 0 && !props.activeVisualTab && activeVisualTab.value === 'risk' && props.reportClass?.gradingFramework === 'sbar') {
    activeVisualTab.value = 'expectations'
  }
}, { immediate: true })

const assessedExpectationsCount = computed(() => {
  if (totalExpectationsCount.value === 0) return 0

  const clsExps = props.reportClass?.expectations || []
  const validExpCodes = new Set(clsExps.map(e => String(e.code || e.expectationId).toLowerCase()))

  const set = new Set()
  props.assessments.forEach(a => {
    const expIds = a.expectationIds || (a.expectationId ? [a.expectationId] : [])
    expIds.forEach(id => {
      const strId = String(id).toLowerCase()
      if (validExpCodes.size === 0 || validExpCodes.has(strId)) {
        set.add(strId)
      }
    })
  })
  return set.size
})

const strugglingExpectationsCount = computed(() => {
  const cls = props.reportClass
  if (!cls || !props.assessments || !props.assessments.length || !gradeMap.value) return 0

  const allClassExps = [
    ...(cls.expectations || []),
    ...((cls.gradebookUnits || []).flatMap(u => u.expectations || []))
  ]
  if (allClassExps.length === 0) return 0

  const expScores = {}

  if (isSBAR.value) {
    const algo = cls.sbarAlgorithm || 'decaying_average'
    const sbarMasteryMap = calculateSBARExpectationMastery(cls, props.assessments, gradeMap.value, algo, props.allClassEvents || [])
    Object.entries(sbarMasteryMap).forEach(([studentId, studentExpMap]) => {
      if (!studentExpMap) return
      if (activeStudentIds.value.size > 0 && !activeStudentIds.value.has(String(studentId))) return
      Object.entries(studentExpMap).forEach(([expCode, mObj]) => {
        if (mObj && mObj.score !== null && mObj.score !== undefined) {
          const key = String(expCode).toLowerCase()
          if (!expScores[key]) expScores[key] = []
          expScores[key].push(mObj.score)
        }
      })
    })
  } else {
    Object.entries(gradeMap.value).forEach(([assId, studentMap]) => {
      if (!studentMap) return
      const ass = props.assessments.find(a => String(a.assessmentId) === String(assId))
      if (!ass || ass.excluded) return
      const ids = ass.expectationIds && Array.isArray(ass.expectationIds) ? ass.expectationIds : (ass.expectationId ? [ass.expectationId] : [])
      const total = ass.scaledTotal || ass.totalPoints || 100

      Object.entries(studentMap).forEach(([studentId, gRecord]) => {
        if (!gRecord || gRecord.excluded || gRecord.missing) return
        if (activeStudentIds.value.size > 0 && !activeStudentIds.value.has(String(gRecord.studentId || studentId))) return

        let hasPerExpScores = false
        if (gRecord.expectationScores && typeof gRecord.expectationScores === 'object' && Object.keys(gRecord.expectationScores).length > 0) {
          Object.entries(gRecord.expectationScores).forEach(([expCode, val]) => {
            if (val != null && val !== '' && !isNaN(Number(val))) {
              const key = String(expCode).toLowerCase()
              if (!expScores[key]) expScores[key] = []
              expScores[key].push(Number(val))
              hasPerExpScores = true
            }
          })
        }
        if (!hasPerExpScores && ids.length > 0 && gRecord.resolvedScore != null && gRecord.resolvedScore !== '' && !isNaN(Number(gRecord.resolvedScore))) {
          const pct = (Number(gRecord.resolvedScore) / total) * 100
          ids.forEach(id => {
            const key = String(id).toLowerCase()
            if (!expScores[key]) expScores[key] = []
            expScores[key].push(pct)
          })
        }
      })
    })
  }

  let count = 0
  const evaluatedExps = new Set()
  allClassExps.forEach(exp => {
    const expId = exp.expectationId ? String(exp.expectationId).toLowerCase() : null
    const expCode = exp.code ? String(exp.code).toLowerCase() : null
    const key = expCode || expId
    if (!key || evaluatedExps.has(key)) return
    evaluatedExps.add(key)

    const scores = [
      ...(expId && expScores[expId] ? expScores[expId] : []),
      ...(expCode && expCode !== expId && expScores[expCode] ? expScores[expCode] : [])
    ]
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (avg < 65) count++
    }
  })

  return count
})

// Missing Tasks Breakdown & Audit
const missingStudentsSummary = computed(() => {
  const activeStudents = (props.sidebarStudents || []).filter(s => activeStudentIds.value.has(String(s.studentId)))
  const astList = subjectAssessments.value || []
  if (activeStudents.length === 0 || astList.length === 0 || !gradeMap.value) return []

  const todayStr = new Date().toISOString().slice(0, 10)
  const result = []

  activeStudents.forEach(st => {
    const sId = String(st.studentId)
    const stTasks = []

    astList.forEach(ast => {
      if (ast.excluded) return
      const astIdStr = String(ast.assessmentId)
      const g = gradeMap.value[astIdStr]?.[sId]

      if (g && g.excluded) return

      const isExplicitMissing = Boolean(g && (g.missing || g.status === 'missing'))

      if (isExplicitMissing) {
        stTasks.push({
          assessmentId: ast.assessmentId,
          name: ast.name || ast.title || 'Untitled Assessment',
          category: ast.category || ast.categoryName || '',
          date: ast.date || ast.dueDate || '',
          isExplicit: true
        })
      }
    })

    if (stTasks.length > 0) {
      const gObj = props.classGrades[sId]
      result.push({
        studentId: sId,
        name: st.name || `${st.firstName} ${st.lastName}`,
        grade: gObj && gObj.overallGrade !== undefined && gObj.overallGrade !== null ? Math.round(gObj.overallGrade) : null,
        tasks: stTasks
      })
    }
  })

  // Sort by most missing tasks descending
  return result.sort((a, b) => b.tasks.length - a.tasks.length)
})

// Task Completion & Evaluation Logistics
const classEvaluationStats = computed(() => {
  const activeStudents = (props.sidebarStudents || []).filter(s => activeStudentIds.value.has(String(s.studentId)))
  const astList = subjectAssessments.value || []
  
  if (activeStudents.length === 0 || astList.length === 0 || !gradeMap.value) {
    return {
      totalExpectedSlots: 0,
      recordedCount: 0,
      missingCount: 0,
      missingStudentsCount: 0,
      completionRate: null
    }
  }

  let totalExpectedSlots = 0
  let recordedCount = 0
  
  astList.forEach(ast => {
    if (ast.excluded) return
    const astIdStr = String(ast.assessmentId)
    const astMap = gradeMap.value[astIdStr] || {}

    activeStudents.forEach(st => {
      const sId = String(st.studentId)
      const g = astMap[sId]

      if (g && g.excluded) return

      totalExpectedSlots++

      if (g && g.resolvedScore !== null && g.resolvedScore !== undefined && !g.missing) {
        recordedCount++
      }
    })
  })

  const missingList = missingStudentsSummary.value
  const totalMissing = missingList.reduce((sum, s) => sum + s.tasks.length, 0)
  const completionRate = totalExpectedSlots > 0 
    ? Math.round((recordedCount / totalExpectedSlots) * 1000) / 10 
    : null

  return {
    totalExpectedSlots,
    recordedCount,
    missingCount: totalMissing,
    missingStudentsCount: missingList.length,
    completionRate
  }
})

// Multi-reason Action Required Items
const multiActionItems = computed(() => {
  const items = []
  
  // 1. Add Academic Risk (Failing < 50% or Level 1 / R) - ONLY for active enrolled students
  Object.entries(props.classGrades).forEach(([sId, gObj]) => {
    if (!activeStudentIds.value.has(String(sId))) return
    if (gObj && gObj.overallGrade !== undefined && gObj.overallGrade !== null && gObj.overallGrade < 50) {
      const student = props.sidebarStudents.find(s => String(s.studentId) === String(sId))
      if (!student) return
      items.push({
        studentId: String(sId),
        name: student.name || `${student.firstName} ${student.lastName}`,
        grade: Math.round(gObj.overallGrade),
        reason: isSBAR.value ? 'Level 1 / Remediation Needed' : 'Failing Grade (<50%)',
        severity: 'danger'
      })
    }
  })

  // 2. Add Attendance items - ONLY for active enrolled students
  props.followUpItems.forEach(item => {
    const sId = String(item.studentId)
    if (!activeStudentIds.value.has(sId)) return
    const existing = items.find(i => i.studentId === sId)
    const gradeVal = props.classGrades[sId]?.overallGrade
    const roundedGrade = gradeVal !== undefined && gradeVal !== null ? Math.round(gradeVal) : null

    if (existing) {
      existing.reason += ` · ${item.reason}`
    } else {
      items.push({
        studentId: sId,
        name: item.name,
        grade: roundedGrade,
        reason: item.reason,
        severity: item.severity || 'warning'
      })
    }
  })

  // 3. Add Missing Work Alerts - ONLY for active enrolled students
  missingStudentsSummary.value.forEach(m => {
    const sId = String(m.studentId)
    const existing = items.find(i => i.studentId === sId)
    const taskCount = m.tasks.length
    const taskText = `${taskCount} missing task${taskCount !== 1 ? 's' : ''}`

    if (existing) {
      existing.reason += ` · ${taskText}`
      if (taskCount >= 3 && existing.severity !== 'danger') {
        existing.severity = 'danger'
      }
    } else {
      items.push({
        studentId: sId,
        name: m.name,
        grade: m.grade,
        reason: `${taskText} overdue`,
        severity: taskCount >= 3 ? 'danger' : 'warning'
      })
    }
  })

  return items
})

const { thresholds } = useClassroom()
const longWashroomThreshold = computed(() => Number(thresholds.value?.washroomDurationLimit ?? 11))

// ── Option A: Smart Dismissal & Re-trigger Logic ──────────────────────
/**
 * ── Action Required Re-Trigger Thresholds ──────────────────────────────
 * Configurable criteria for automatically re-surfacing a handled student alert:
 * 
 * 1. GRADE_DROP_PCT: Re-trigger if overall grade drops by 2%+ below grade at handling time.
 * 2. NEW_ABSENCES_COUNT: Re-trigger if 2+ new absences/lates accumulate after handling time.
 * 3. LONG_WASHROOM_MIN: Re-trigger if a washroom trip > washroomDurationLimit (default 11m) is logged after handling time.
 */
const RE_TRIGGER_THRESHOLDS = {
  GRADE_DROP_PCT: 2,
  NEW_ABSENCES_COUNT: 2
}

const acknowledgedAlerts = ref(loadAcknowledgedAlerts())
const showHandledSection = ref(false)

watch(() => props.reportClass?.classId, () => {
  acknowledgedAlerts.value = loadAcknowledgedAlerts()
})

function getStorageKey() {
  return `classroom_ack_alerts_${props.reportClass?.classId || 'default'}`
}

function loadAcknowledgedAlerts() {
  try {
    const key = getStorageKey()
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : {}
  } catch (e) {
    return {}
  }
}

function saveAcknowledgedAlerts() {
  try {
    const key = getStorageKey()
    localStorage.setItem(key, JSON.stringify(acknowledgedAlerts.value))
  } catch (e) {
    console.error('Failed to save acknowledged alerts', e)
  }
}

function acknowledgeItem(item) {
  const sId = item.studentId
  const currentGrade = item.grade
  const studentEvents = (props.allClassEvents || []).filter(e => String(e.studentId) === String(sId))
  const absences = studentEvents.filter(e => e.type === 'absence' || e.type === 'absent').length
  const lates = studentEvents.filter(e => e.type === 'late').length
  const redirects = studentEvents.filter(e => e.type === 'redirect' || e.type === 'behavior').length
  const longTrips = studentEvents.filter(e => e.type === 'washroom' && (e.durationMinutes || 0) > longWashroomThreshold.value).length

  acknowledgedAlerts.value = {
    ...acknowledgedAlerts.value,
    [sId]: {
      acknowledgedAt: new Date().toISOString(),
      gradeAtAck: currentGrade !== null ? currentGrade : 100,
      absencesAtAck: absences,
      latesAtAck: lates,
      redirectsAtAck: redirects,
      longTripsAtAck: longTrips
    }
  }
  saveAcknowledgedAlerts()
}

function unacknowledgeItem(sId) {
  const updated = { ...acknowledgedAlerts.value }
  delete updated[sId]
  acknowledgedAlerts.value = updated
  saveAcknowledgedAlerts()
}

const evaluatedActionItems = computed(() => {
  const active = []
  const handled = []

  multiActionItems.value.forEach(item => {
    const sId = item.studentId
    const ack = acknowledgedAlerts.value[sId]

    if (!ack) {
      active.push(item)
      return
    }

    // Evaluate Smart Re-trigger conditions
    const studentEvents = (props.allClassEvents || []).filter(e => String(e.studentId) === String(sId))
    const currentAbsences = studentEvents.filter(e => e.type === 'absence' || e.type === 'absent').length
    const currentLates = studentEvents.filter(e => e.type === 'late').length
    const currentRedirects = studentEvents.filter(e => e.type === 'redirect' || e.type === 'behavior').length
    const currentLongTrips = studentEvents.filter(e => e.type === 'washroom' && (e.durationMinutes || 0) > longWashroomThreshold.value).length
    const currentGrade = item.grade

    let reTriggered = false
    let reTriggerReason = ''

    if (currentGrade !== null && ack.gradeAtAck !== null && currentGrade <= ack.gradeAtAck - RE_TRIGGER_THRESHOLDS.GRADE_DROP_PCT) {
      reTriggered = true
      reTriggerReason = `Grade dropped further (${currentGrade}%)`
    } else if ((currentAbsences + currentLates) >= (ack.absencesAtAck + ack.latesAtAck + RE_TRIGGER_THRESHOLDS.NEW_ABSENCES_COUNT)) {
      reTriggered = true
      reTriggerReason = `${RE_TRIGGER_THRESHOLDS.NEW_ABSENCES_COUNT}+ new absences/lates`
    } else if (currentRedirects > ack.redirectsAtAck || currentLongTrips > ack.longTripsAtAck) {
      reTriggered = true
      reTriggerReason = `New climate incident logged`
    }

    if (reTriggered) {
      active.push({
        ...item,
        reason: `${item.reason} · Alert: ${reTriggerReason}`,
        reTriggered: true
      })
    } else {
      handled.push({
        ...item,
        ackDate: new Date(ack.acknowledgedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
      })
    }
  })

  return { active, handled }
})

const activeActionItemsVisible = computed(() => {
  if (followUpExpandedLocal.value) return evaluatedActionItems.value.active
  return evaluatedActionItems.value.active.slice(0, 8)
})
</script>

<style scoped>
.reports__loading { padding: 40px; text-align: center; font-weight: 600; color: var(--text-secondary); }
.reports__overview { display: flex; flex-direction: column; gap: 10px; }

/* ── Section 1: Executive KPI Ribbon ────────────────────────── */
.reports__kpi-ribbon {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px;
}
.kpi-tile {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 7px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 3px;
  min-height: 56px;
  box-sizing: border-box;
}
.kpi-tile--academics { border-left: 3px solid var(--primary); }
.kpi-tile--expectations { border-left: 3px solid #8b5cf6; }
.kpi-tile--completion { border-left: 3px solid #0ea5e9; }
.kpi-tile--clickable {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}
.kpi-tile--clickable:hover {
  border-color: #0ea5e9;
  box-shadow: var(--shadow-sm);
  background: var(--surface-hover);
}
.kpi-tile__click-hint {
  font-size: 0.68rem;
  color: var(--primary);
  margin-left: 4px;
  font-weight: 600;
}
.kpi-tile--interventions { border-left: 3px solid #f59e0b; }
.kpi-tile--attendance { border-left: 3px solid #10b981; }
.kpi-tile--climate { border-left: 3px solid #6366f1; }

.kpi-tile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.kpi-tile__label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}
.kpi-tile__badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
}
.kpi-tile__badge--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}
.kpi-tile__badge--warning {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}
.kpi-tile__badge--ok {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.kpi-tile__body {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: wrap;
}
.kpi-tile__primary {
  display: flex;
  align-items: baseline;
  gap: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}
.kpi-tile__value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
}
.kpi-tile__unit {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.kpi-tile__meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--text-secondary);
}
.kpi-tile__sub {
  white-space: nowrap;
}
.kpi-tile__dot {
  color: var(--border);
}

/* ── Section 2: Two-Column Split ────────────────────────────── */
.reports__two-col {
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
}
@media (max-width: 1000px) {
  .reports__two-col { grid-template-columns: 1fr; }
}

.reports__followup-col {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.reports__col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.reports__col-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
  margin: 0;
}
.reports__col-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  padding: 1px 6px;
  border-radius: 4px;
}
.reports__col-badge--zero {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.reports__followup-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: var(--surface-hover);
  border-radius: var(--radius-sm);
}
.reports__followup-ok-icon { color: #10b981; }
.reports__followup-ok { font-size: 0.78rem; color: var(--text-secondary); font-weight: 500; }

.reports__followup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.reports__followup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.reports__followup-item:hover {
  border-color: var(--primary);
  background: var(--surface);
}
.reports__followup-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  min-width: 0;
}
.reports__followup-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.reports__followup-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reports__retrigger-tag {
  font-size: 0.6rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  padding: 1px 3px;
  border-radius: 3px;
  text-transform: uppercase;
}
.reports__followup-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}
.reports__grade-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}
.reports__grade-badge--failing {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.reports__followup-reason {
  font-size: 0.7rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reports__followup-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 6px;
}
.reports__btn-ack {
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.reports__btn-ack:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
  color: #059669;
}
.reports__followup-arrow {
  color: var(--text-secondary);
  font-size: 0.8rem;
}
.reports__followup-more {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
  text-align: left;
}

/* Handled items */
.reports__handled-section {
  margin-top: 6px;
  border-top: 1px solid var(--border);
  padding-top: 6px;
}
.reports__handled-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  padding: 4px 2px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.reports__handled-toggle:hover { color: var(--text); background: var(--surface-hover); }
.handled-title { display: flex; align-items: center; gap: 4px; }
.handled-icon { color: #10b981; }
.reports__handled-list { list-style: none; padding: 4px 0 0 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.reports__handled-item { display: flex; justify-content: space-between; align-items: center; background: var(--surface-hover); border: 1px dashed var(--border); padding: 4px 8px; border-radius: var(--radius-sm); opacity: 0.85; }
.handled-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.handled-name { font-size: 0.75rem; font-weight: 600; color: var(--text); }
.handled-meta { font-size: 0.68rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.reports__btn-reopen { display: flex; align-items: center; gap: 2px; background: none; border: 1px solid var(--border); color: var(--text-secondary); font-size: 0.65rem; padding: 1px 4px; border-radius: var(--radius-sm); cursor: pointer; }
.reports__btn-reopen:hover { background: var(--surface); color: var(--primary); border-color: var(--primary); }

/* Right Visual Column */
.reports__visual-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; width: 100%; }
.reports__visual-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
.reports__visual-tab-btn { display: flex; align-items: center; gap: 5px; background: none; border: 1px solid transparent; padding: 5px 10px; border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease; }
.reports__visual-tab-btn:hover { background: var(--surface-hover); color: var(--text); }
.reports__visual-tab-btn--active { background: var(--surface); border-color: var(--border); color: var(--primary); box-shadow: var(--shadow-sm); }
.reports__visual-pane { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; }
.reports__chart-container { height: 220px; }
.reports__no-data { font-size: 0.8rem; color: var(--text-secondary); padding: 12px 0; }
.reports__long-trips { margin-top: 10px; }
.reports__section-title { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin: 0 0 6px 0; }
.reports__section-title--alert { color: #ef4444; }
.reports__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem; }
.reports__list--alert li { display: flex; justify-content: space-between; background: rgba(239, 68, 68, 0.05); padding: 4px 8px; border-radius: 4px; }
.reports__list-count { font-weight: 700; color: #ef4444; }

/* Section 3: Notes Card */
.reports__notes-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 10px 14px; margin-top: 4px; }
.reports__notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.reports__notes-toggle-btn { background: none; border: none; color: var(--primary); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; padding: 2px 4px; }
.reports__notes-toggle-btn:hover { text-decoration: underline; }
.reports__notes-empty { font-size: 0.78rem; color: var(--text-secondary); font-style: italic; padding: 4px 0; }
.reports__notes-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.reports__note-item { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 10px; }
.reports__note-top-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.reports__note-student { font-weight: 700; font-size: 0.8rem; color: var(--text); }
.reports__note-time { margin-left: auto; font-size: 0.7rem; color: var(--text-secondary); }
.reports__note-check-btn { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface); color: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; flex-shrink: 0; }
.reports__note-check-btn:hover { border-color: var(--primary); color: var(--primary); }
.reports__note-check-btn--checked { background: var(--primary); border-color: var(--primary); color: #fff !important; }
.reports__note-text { font-size: 0.78rem; color: var(--text); line-height: 1.35; margin: 0; white-space: pre-wrap; }
.reports__note-text--completed { text-decoration: line-through; opacity: 0.6; }
</style>
