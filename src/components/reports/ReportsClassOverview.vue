<template>
  <div v-if="loading" class="reports__loading" aria-live="polite">Loading…</div>

  <div v-else class="reports__overview">

    <!-- ── Section 1: 4 Headline Cards ────────────────────────── -->
    <div class="reports__headline-grid">

      <!-- Card 1: Academics -->
      <div class="reports__headline-card reports__headline-card--academics">
        <div class="reports__headline-label"><GraduationCap :size="14" /> ACADEMICS</div>
        <template v-if="isSBAR">
          <div v-if="classAverageBadge !== null" class="reports__headline-rate">
            {{ classAverageBadge.level }}
          </div>
          <div v-else class="reports__headline-rate">—</div>
          <div class="reports__headline-sub">
            Median: {{ classMedianBadge ? classMedianBadge.level : '—' }} · {{ totalAssessmentsCount }} assessments
          </div>
          <div v-if="failingStudentsCount > 0" class="reports__headline-alert">
            <AlertTriangle :size="12" /> {{ failingStudentsCount }} student{{ failingStudentsCount !== 1 ? 's' : '' }} at Level 1 / R
          </div>
          <div v-else class="reports__headline-detail">All students at Level 2+ target</div>
        </template>
        <template v-else>
          <div v-if="classAverage !== null" class="reports__headline-rate">{{ classAverage.toFixed(1) }}<span class="reports__headline-unit">%</span></div>
          <div v-else class="reports__headline-rate">—<span class="reports__headline-unit">%</span></div>
          <div class="reports__headline-sub">
            Median: {{ classMedian !== null ? classMedian.toFixed(1) + '%' : '—' }} · {{ totalAssessmentsCount }} assessments
          </div>
          <div v-if="failingStudentsCount > 0" class="reports__headline-alert">
            <AlertTriangle :size="12" /> {{ failingStudentsCount }} student{{ failingStudentsCount !== 1 ? 's' : '' }} failing (&lt;50%)
          </div>
          <div v-else class="reports__headline-detail">All students currently passing</div>
        </template>
      </div>

      <!-- Card 2: Expectations -->
      <div class="reports__headline-card reports__headline-card--expectations">
        <div class="reports__headline-label"><Target :size="14" /> EXPECTATIONS</div>
        <div class="reports__headline-rate">{{ assessedExpectationsCount }}<span class="reports__headline-unit"> / {{ totalExpectationsCount }}</span></div>
        <div class="reports__headline-sub">Specific curriculum standards evaluated</div>
        <div v-if="strugglingExpectationsCount > 0" class="reports__headline-alert">
          <AlertTriangle :size="12" /> {{ strugglingExpectationsCount }} expectation{{ strugglingExpectationsCount !== 1 ? 's' : '' }} &lt; 65%
        </div>
        <div v-else class="reports__headline-detail">Class mastering curriculum standards</div>
      </div>

      <!-- Card 3: Attendance -->
      <div class="reports__headline-card">
        <div class="reports__headline-label"><UserCheck :size="14" /> ATTENDANCE</div>
        <div v-if="attendanceRate !== null" class="reports__headline-rate">{{ attendanceRate }}<span class="reports__headline-unit">%</span></div>
        <div v-else class="reports__headline-sub">No attendance data</div>
        <div class="reports__headline-sub">{{ aggregates.attendance.totalAbsences }} absences · {{ aggregates.attendance.totalLates }} lates</div>
        <div v-if="chronicallyAbsentCount > 0" class="reports__headline-alert">
          <AlertTriangle :size="12" /> {{ chronicallyAbsentCount }} chronically absent (5+)
        </div>
        <div v-else-if="aggregates.attendance.testDayAbsences > 0" class="reports__headline-detail">
          {{ aggregates.attendance.testDayAbsences }} absences on test days
        </div>
      </div>

      <!-- Card 4: Climate & Behavior -->
      <div class="reports__headline-card">
        <div class="reports__headline-label"><Activity :size="14" /> CLIMATE &amp; BEHAVIOR</div>
        <div class="reports__headline-rate">{{ tripsPerStudentAvg }}<span class="reports__headline-unit"> trips/student</span></div>
        <div class="reports__headline-sub">{{ aggregates.behavior.totalRedirects }} redirects · {{ aggregates.behavior.totalParentContacts }} parent contacts</div>
        <div v-if="aggregates.washroom.longTrips.length > 0" class="reports__headline-alert">
          <AlertTriangle :size="12" /> {{ aggregates.washroom.longTrips.length }} long trip{{ aggregates.washroom.longTrips.length !== 1 ? 's' : '' }} (&gt;15m)
        </div>
        <div v-else-if="aggregates.behavior.redirectAlerts.length > 0" class="reports__headline-alert">
          <AlertTriangle :size="12" /> {{ aggregates.behavior.redirectAlerts.length }} student{{ aggregates.behavior.redirectAlerts.length !== 1 ? 's' : '' }} 3+ redirects
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
          <Check :size="18" class="reports__followup-ok-icon" />
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
                <span class="reports__followup-name">{{ item.name }}</span>
                <span v-if="item.reTriggered" class="reports__retrigger-tag">Re-triggered</span>
              </div>
              <span class="reports__followup-meta">
                <span v-if="item.grade !== null" class="reports__grade-badge" :class="{ 'reports__grade-badge--failing': item.grade < 50 }">
                  {{ formatGradeDisplay(item.grade) }}
                </span>
                <span class="reports__followup-reason">{{ item.reason }}</span>
              </span>
            </div>

            <div class="reports__followup-actions">
              <button 
                class="reports__btn-ack" 
                title="Mark as Addressed"
                @click.stop="acknowledgeItem(item)"
              >
                <Check :size="13" /> Handled
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
              <CheckCircle2 :size="14" class="handled-icon" /> 
              Handled Items ({{ evaluatedActionItems.handled.length }})
            </span>
            <ChevronDown v-if="!showHandledSection" :size="14" />
            <ChevronUp v-else :size="14" />
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
                <RotateCcw :size="12" /> Restore
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
            :class="{ 'reports__visual-tab-btn--active': activeVisualTab === 'expectations' }"
            @click="activeVisualTab = 'expectations'"
          >
            <BookOpen :size="16" /> Expectation Mastery
          </button>
          <button 
            class="reports__visual-tab-btn"
            :class="{ 'reports__visual-tab-btn--active': activeVisualTab === 'risk' }"
            @click="activeVisualTab = 'risk'"
          >
            <BarChart2 :size="16" /> Risk Scatter Matrix
          </button>
          <button 
            class="reports__visual-tab-btn"
            :class="{ 'reports__visual-tab-btn--active': activeVisualTab === 'washroom' }"
            @click="activeVisualTab = 'washroom'"
          >
            <Toilet :size="16" /> Washroom Detail
          </button>
        </div>

        <!-- Tab 1: Expectation Mastery Heatmap -->
        <div v-if="activeVisualTab === 'expectations'" class="reports__visual-pane">
          <ExpectationMasteryHeatmap 
            :active-class="reportClass"
            :assessments="assessments"
            :class-grades="classGrades"
            :active-grade-filter="activeGradeFilter"
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

        <!-- Tab 3: Washroom Detail -->
        <div v-else-if="activeVisualTab === 'washroom'" class="reports__visual-pane">
          <h4 class="reports__col-title">WASHROOM USAGE SUMMARY</h4>
          <div v-if="aggregates.washroom.studentTrips.length" class="reports__chart-container">
            <Bar :data="washroomChartData" :options="washroomChartOptions" />
          </div>
          <p v-else class="reports__no-data">No washroom trips recorded.</p>
          
          <div v-if="aggregates.washroom.longTrips.length" class="reports__long-trips">
            <h4 class="reports__section-title reports__section-title--alert">Long Trips (&gt; 15 min)</h4>
            <ul class="reports__list reports__list--alert">
              <li v-for="t in longTripsVisible" :key="t.date + t.name">
                <span>{{ t.name }} — {{ t.date }}</span>
                <span class="reports__list-count">{{ t.duration.toFixed(1) }} min</span>
              </li>
            </ul>
            <button
              v-if="aggregates.washroom.longTrips.length > 5"
              class="reports__followup-more"
              @click="$emit('toggle-longtrips-expand')"
            >
              {{ longTripsExpanded ? 'show less ↑' : `and ${aggregates.washroom.longTrips.length - 5} more →` }}
            </button>
          </div>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 
  UserCheck, Toilet, Activity, AlertTriangle, Check, 
  GraduationCap, Target, BookOpen, BarChart2,
  CheckCircle2, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-vue-next'
import { Bar } from 'vue-chartjs'
import ExpectationMasteryHeatmap from './ExpectationMasteryHeatmap.vue'
import StudentRiskScatterPlot from './StudentRiskScatterPlot.vue'
import { getSBARLevelBadge } from '../../db/gradebookService.js'

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
  activeGradeFilter: { type: String, default: 'all' }
})

defineEmits([
  'select-student',
  'toggle-followup-expand',
  'toggle-longtrips-expand',
  'toggle-show-completed',
  'toggle-note-complete'
])

const activeVisualTab = ref('expectations')
const followUpExpandedLocal = ref(false)

// Active enrolled student ID set
const activeStudentIds = computed(() => new Set((props.sidebarStudents || []).map(s => String(s.studentId))))

const isSBAR = computed(() => props.reportClass?.gradingFramework === 'sbar')

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
  if (!cls) return props.assessments

  const subId = cls.activeSubjectId
  const unitIds = new Set((cls.gradebookUnits || []).map(u => String(u.unitId)))
  const expCodes = new Set((cls.expectations || []).map(e => String(e.code || e.expectationId).toLowerCase()))

  if (unitIds.size === 0 && expCodes.size === 0) return []

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

const strugglingExpectationsCount = computed(() => 0) // Calculated dynamically in heatmap

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

  return items
})

// ── Option A: Smart Dismissal & Re-trigger Logic ──────────────────────
/**
 * ── Action Required Re-Trigger Thresholds ──────────────────────────────
 * Configurable criteria for automatically re-surfacing a handled student alert:
 * 
 * 1. GRADE_DROP_PCT: Re-trigger if overall grade drops by 2%+ below grade at handling time.
 * 2. NEW_ABSENCES_COUNT: Re-trigger if 2+ new absences/lates accumulate after handling time.
 * 3. LONG_WASHROOM_MIN: Re-trigger if a washroom trip > 15 mins is logged after handling time.
 * 
 * You can modify these threshold constants anytime to tune alert sensitivity.
 */
const RE_TRIGGER_THRESHOLDS = {
  GRADE_DROP_PCT: 2,
  NEW_ABSENCES_COUNT: 2,
  LONG_WASHROOM_MIN: 15
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
  const longTrips = studentEvents.filter(e => e.type === 'washroom' && (e.durationMinutes || 0) > RE_TRIGGER_THRESHOLDS.LONG_WASHROOM_MIN).length

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

    // Evaluate Smart Re-trigger conditions using RE_TRIGGER_THRESHOLDS
    const studentEvents = (props.allClassEvents || []).filter(e => String(e.studentId) === String(sId))
    const currentAbsences = studentEvents.filter(e => e.type === 'absence' || e.type === 'absent').length
    const currentLates = studentEvents.filter(e => e.type === 'late').length
    const currentRedirects = studentEvents.filter(e => e.type === 'redirect' || e.type === 'behavior').length
    const currentLongTrips = studentEvents.filter(e => e.type === 'washroom' && (e.durationMinutes || 0) > RE_TRIGGER_THRESHOLDS.LONG_WASHROOM_MIN).length
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
        reason: `${item.reason} · ⚠️ ${reTriggerReason}`,
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
.reports__loading {
  padding: 40px;
  text-align: center;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.reports__headline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.reports__headline-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reports__headline-card--academics   { border-left: 4px solid var(--primary); }
.reports__headline-card--expectations { border-left: 4px solid #8b5cf6; }

.reports__headline-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.reports__headline-rate {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
}

.reports__headline-unit {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__headline-sub {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.reports__headline-detail {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
}

.reports__headline-alert {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #ef4444;
  font-weight: 600;
}

.reports__two-col {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
}

.reports__followup-col {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reports__col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reports__col-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  margin: 0;
}

.reports__col-badge {
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.reports__followup-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--surface-hover);
  border-radius: var(--radius-md);
}

.reports__followup-ok-icon { color: #10b981; }
.reports__followup-ok { font-size: 0.8rem; color: var(--text-secondary); font-weight: 500; }

.reports__followup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reports__followup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 10px 12px;
  border-radius: var(--radius-md);
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
}

.reports__followup-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reports__followup-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reports__grade-badge {
  font-size: 0.725rem;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 1px 5px;
  border-radius: 4px;
}

.reports__grade-badge--failing {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.reports__followup-reason {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.reports__followup-arrow {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.reports__followup-more {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  text-align: left;
}

.reports__visual-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reports__visual-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.reports__visual-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid transparent;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.reports__visual-tab-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.reports__visual-tab-btn--active {
  background: var(--surface);
  border-color: var(--border);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.reports__visual-pane {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.reports__chart-container {
  height: 240px;
}

.reports__no-data {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 20px 0;
}

/* ── Handled & Re-trigger Option A Styles ── */
.reports__followup-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reports__retrigger-tag {
  font-size: 0.65rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
}

.reports__followup-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.reports__btn-ack {
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.725rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.reports__btn-ack:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
  color: #059669;
}

.reports__col-badge--zero {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.reports__handled-section {
  margin-top: 8px;
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.reports__handled-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  padding: 6px 4px;
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.reports__handled-toggle:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.handled-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.handled-icon {
  color: #10b981;
}

.reports__handled-list {
  list-style: none;
  padding: 6px 0 0 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reports__handled-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface-hover);
  border: 1px dashed var(--border);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  opacity: 0.85;
}

.handled-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.handled-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
}

.handled-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.reports__btn-reopen {
  display: flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.reports__btn-reopen:hover {
  background: var(--surface);
  color: var(--primary);
  border-color: var(--primary);
}
</style>
