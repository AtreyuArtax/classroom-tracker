<template>
  <div class="reports">
    <div class="reports__layout">

      <!-- ══ LEFT SIDEBAR ══════════════════════════════════════════════ -->
      <aside class="reports__sidebar">

        <!-- Class selector -->
        <div class="reports__sidebar-header">
          <ClassSwitcher @navigate="$emit('navigate', $event)" />
        </div>

        <!-- Mobile toggle -->
        <button class="reports__roster-toggle" @click="rosterOpen = !rosterOpen">
          {{ rosterOpen ? '▲ Hide Students' : '▼ Show Students' }}
        </button>

        <!-- Student roster list -->
        <ul class="reports__roster" :class="{ 'reports__roster--open': rosterOpen }">
          <li
            v-for="s in sidebarStudents"
            :key="s.studentId"
            class="reports__roster-item"
            :class="{ 'reports__roster-item--active': dossier.selectedStudentId.value === s.studentId && rightMode === 'dossier' }"
            @click="onSelectStudent(s.studentId)"
          >
            {{ s.lastName }}, {{ s.firstName }}
          </li>
          <li v-if="sidebarStudents.length === 0" class="reports__roster-empty">No students</li>
        </ul>

      </aside>

      <!-- ══ RIGHT PANEL ════════════════════════════════════════════════ -->
      <main class="reports__main">

        <!-- Loading -->
        <div v-if="dossier.loading.value" class="reports__loading" aria-live="polite">Loading…</div>

        <!-- ── STUDENT DOSSIER ──────────────────────────────────────── -->
        <template v-else-if="rightMode === 'dossier' && dossier.selectedStudentId.value">

          <!-- Header + back + period toggle -->
          <div class="reports__dossier-header">
            <button v-if="from === 'Grades'" class="reports__btn-back" @click="$emit('navigate', 'Grades', { classId: sidebarClassId, studentId: props.studentId })">
              <ChevronLeft :size="16" /> Back to Gradebook
            </button>
            <button v-else class="reports__btn-back" @click="showOverview">
              <ChevronLeft :size="16" /> Class Overview
            </button>
            <h2 class="reports__dossier-name">{{ dossierStudentName }}</h2>
            <div class="reports__period-row" role="group" aria-label="Time period">
              <button
                v-for="p in PERIODS"
                :key="p.value"
                class="reports__period-btn"
                :class="{ 'reports__period-btn--active': dossier.selectedPeriod.value === p.value }"
                @click="dossier.selectedPeriod.value = p.value"
              >{{ p.label }}</button>
            </div>
          </div>

          <!-- Trend Graph -->
          <StudentTrendGraph
            :weekly-trend="dossier.weeklyTrend.value"
            :categories="dossier.trendCategories.value"
            :period="dossier.selectedPeriod.value"
          />

          <!-- Existing StudentProfile component -->
          <div class="reports__card">
            <StudentProfile
              v-if="dossier.student.value"
              :events="dossier.events.value"
              :behavior-codes="behaviorCodesMap"
              :student-name="dossierStudentName"
              :selected-period="dossier.selectedPeriod.value"
              @delete-event="onDossierDelete"
              @edit-event="editEvent"
            />
            
            <!-- NEW Log Past Absence panel -->
            <div v-if="dossier.student.value" class="reports__past-absence">
              <button 
                v-if="!showPastAbsencePanel" 
                class="reports__btn-past-absence"
                @click="openPastAbsencePanel"
              >
                <PlusCircle :size="13" class="reports__inline-icon" /> Log Past Absence
              </button>
              
              <div v-else class="reports__past-absence-panel">
                <input 
                  type="date" 
                  v-model="pastAbsenceDate" 
                  :max="pastAbsenceMaxDate" 
                  class="reports__input reports__input--small" 
                />
                <button class="reports__btn-primary--small" @click="submitPastAbsence">Log Absence</button>
                <button class="reports__btn-ghost--small" @click="closePastAbsencePanel">Cancel</button>
                <div class="reports__past-absence-testday">
                  <input type="checkbox" id="pastAbsenceTestDay" v-model="pastAbsenceTestDay" />
                  <label for="pastAbsenceTestDay">Test day?</label>
                </div>
                <span v-if="pastAbsenceError" class="reports__past-absence-error">{{ pastAbsenceError }}</span>
              </div>
            </div>
          </div>

            <!-- Assessment Conversations -->
          <div v-if="dossier.assessmentEvents.value.length > 0" class="reports__card">
            <h3 class="reports__card-title">
              <GraduationCap :size="18" class="reports__inline-icon" /> Assessment Conversations
            </h3>
            <div class="reports__assessment-summary">
              {{ dossier.stats.value.assessmentConversations }} conversation{{ dossier.stats.value.assessmentConversations !== 1 ? 's' : '' }}
              <template v-if="dossier.stats.value.demonstratesUnderstanding > 0">
                · <span class="reports__count-success">{{ dossier.stats.value.demonstratesUnderstanding }} demonstrates understanding</span>
              </template>
              <template v-if="dossier.stats.value.gapConfirmed > 0">
                · <span class="reports__count-danger">{{ dossier.stats.value.gapConfirmed }} gap confirmed</span>
              </template>
            </div>

            <div class="reports__ac-list">
              <div v-for="evt in dossier.assessmentEvents.value" :key="evt.eventId" class="reports__ac-item">
                <div class="reports__ac-header">
                  <span class="reports__ac-date">{{ formatTimestamp(evt.timestamp).split(',').slice(0, 2).join(',') }}</span>
                  <button class="reports__note-delete" @click="onDossierDelete(evt.eventId)">
                    <Trash2 :size="14" />
                  </button>
                </div>
                <div class="reports__ac-badges">
                  <!-- Context Badge -->
                  <span 
                    v-if="evt.acContext" 
                    class="reports__ac-badge"
                    :style="{ background: evt.acContext === 'after_assessment' ? '#5856d6' : '#007aff' }"
                  >
                    {{ evt.acContext === 'after_assessment' ? 'After Assessment' : 'Proactive' }}
                  </span>
                  <!-- Outcome Badge -->
                  <span 
                    v-if="evt.acOutcome" 
                    class="reports__ac-badge"
                    :style="{ background: 
                      evt.acOutcome === 'demonstrates_understanding' ? '#34c759' : 
                      evt.acOutcome === 'gap_confirmed' ? '#ff3b30' : '#ff9500' 
                    }"
                  >
                    {{ 
                      evt.acOutcome === 'demonstrates_understanding' ? 'Demonstrates Understanding' : 
                      evt.acOutcome === 'gap_confirmed' ? 'Gap Confirmed' : 'Inconclusive' 
                    }}
                  </span>
                </div>
                <p class="reports__ac-note">{{ evt.note }}</p>
              </div>
            </div>
          </div>

          <!-- Notes & Parent Contact feed -->
          <div class="reports__card">
            <h3 class="reports__card-title">Notes &amp; Parent Contact</h3>
            <div v-if="dossier.noteEvents.value.length === 0" class="reports__no-data">
              No notes or parent contacts recorded in this period.
            </div>
            <ul v-else class="reports__note-feed">
              <li v-for="evt in dossier.noteEvents.value" :key="evt.eventId" class="reports__note-item">
                <div class="reports__note-meta">
                  <span class="reports__note-time">{{ formatTimestamp(evt.timestamp) }}</span>
                  <div class="reports__note-source">
                    <span v-if="parseNote(evt.note).tag" class="reports__note-tag">
                      {{ parseNote(evt.note).tag }}
                    </span>
                    <span class="reports__note-code">
                      <component 
                        :is="resolveIcon(behaviorCodesMap[evt.code]?.icon)" 
                        :size="14" 
                        v-if="behaviorCodesMap[evt.code]" 
                        class="reports__inline-icon"
                      />
                      <template v-if="evt.code === 'pc'"> Parent Contact</template>
                    </span>
                  </div>
                  <button 
                    class="reports__note-delete" 
                    title="Delete note" 
                    @click="onDossierDelete(evt.eventId)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
                <p class="reports__note-text">{{ parseNote(evt.note).text }}</p>
              </li>
            </ul>
          </div>

          <!-- General Note (read-only) -->
          <div class="reports__card">
            <h3 class="reports__card-title">General Notes</h3>
            <p class="reports__general-note">
              {{ dossier.student.value?.generalNote?.trim() || 'No general notes recorded.' }}
            </p>
          </div>

        </template>

        <!-- ── CLASS OVERVIEW ────────────────────────────────────────── -->
        <template v-else>
          <div v-if="rightMode !== 'overview'" class="reports__placeholder">
            <p>← Select a student to view their dossier, or click <strong><BarChart2 :size="14" class="reports__inline-icon" /> Class Overview</strong> for aggregate reports.</p>
          </div>

          <template v-if="rightMode === 'overview'">
            <!-- Dashboard Content -->
            <div class="reports__filter">
                <div class="reports__period-row" role="group" aria-label="Time period">
                  <button
                    v-for="p in PERIOD_OPTIONS"
                    :key="p.value"
                    class="reports__period-btn"
                    :class="{ 'reports__period-btn--active': selectedPeriod === p.value }"
                    @click="selectedPeriod = p.value"
                  >{{ p.label }}</button>
                </div>
                <div style="flex: 1"></div>
                <!-- Export Sectioned Button -->
                <div class="reports__export-group" ref="exportContainer">
                  <button class="reports__btn-export" @click="showExportMenu = !showExportMenu">
                    <Download :size="16" /> Export Summary
                  </button>
                  <div v-if="showExportMenu" class="reports__export-menu">
                    <button @click="downloadAggregateCsv('attendance')">Attendance</button>
                    <button @click="downloadAggregateCsv('washroom')">Washroom</button>
                    <button @click="downloadAggregateCsv('behavior')">Behavior</button>
                  </div>
                </div>
              </div>

              <div v-if="loading" class="reports__loading" aria-live="polite">Loading…</div>

              <div v-else class="reports__dashboard">
                <!-- Row 1: Attendance -->
                <div class="reports__dashboard-card">
                  <div class="reports__card-header">
                    <h3 class="reports__card-title"><UserCheck :size="18" /> Attendance</h3>
                  </div>
                  <div class="reports__card-grid">
                    <div class="reports__metric">
                      <span class="reports__metric-label">Total Absences</span>
                      <span class="reports__metric-value">{{ aggregates.attendance.totalAbsences }}</span>
                      <span v-if="aggregates.attendance.testDayAbsences > 0" class="reports__metric-sub">
                        {{ aggregates.attendance.testDayAbsences }} on test days
                      </span>
                    </div>
                    <div class="reports__metric">
                      <span class="reports__metric-label">Total Lates</span>
                      <span class="reports__metric-value">{{ aggregates.attendance.totalLates }}</span>
                    </div>
                    <div class="reports__metric">
                      <span class="reports__metric-label">Avg Absences / Student</span>
                      <span class="reports__metric-value">{{ aggregates.attendance.avgAbsences }}</span>
                    </div>
                  </div>
                  <div class="reports__card-section">
                    <h4 class="reports__section-title">Highest Absentees</h4>
                    <ul v-if="aggregates.attendance.topAbsentees.length" class="reports__list">
                      <li v-for="s in aggregates.attendance.topAbsentees" :key="s.name">
                        <span class="reports__list-name">{{ s.name }}</span>
                        <span class="reports__list-count">{{ s.count }}</span>
                      </li>
                    </ul>
                    <p v-else class="reports__no-data">No absences recorded.</p>
                  </div>
                </div>

                <!-- Row 2: Washroom -->
                <div class="reports__dashboard-card">
                  <div class="reports__card-header">
                    <h3 class="reports__card-title"><Toilet :size="18" /> Washroom</h3>
                  </div>
                  <div class="reports__card-grid">
                    <div class="reports__metric">
                      <span class="reports__metric-label">Total Trips</span>
                      <span class="reports__metric-value">{{ aggregates.washroom.totalTrips }}</span>
                    </div>
                    <div class="reports__metric">
                      <span class="reports__metric-label">Total Time (min)</span>
                      <span class="reports__metric-value">{{ aggregates.washroom.totalDuration }}</span>
                    </div>
                    <div class="reports__metric">
                      <span class="reports__metric-label">Avg Duration (min)</span>
                      <span class="reports__metric-value">{{ aggregates.washroom.avgDuration }}</span>
                    </div>
                  </div>
                  <!-- Chart -->
                  <div class="reports__card-section">
                    <h4 class="reports__section-title">Trips per Student</h4>
                    <div v-if="aggregates.washroom.studentTrips.length" class="reports__chart-container">
                      <Bar :data="washroomChartData" :options="washroomChartOptions" />
                    </div>
                    <p v-else class="reports__no-data">No washroom trips recorded.</p>
                  </div>
                  <!-- Long Trips -->
                  <div v-if="aggregates.washroom.longTrips.length" class="reports__card-section">
                    <h4 class="reports__section-title reports__section-title--alert">Long Trips (> 15m)</h4>
                    <ul class="reports__list reports__list--alert">
                      <li v-for="t in aggregates.washroom.longTrips" :key="t.date">
                        <span>{{ t.name }} — {{ t.date }}</span>
                        <span class="reports__list-count">{{ t.duration }}m</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- Row 3: Behavior -->
                <div class="reports__dashboard-card">
                  <div class="reports__card-header">
                    <h3 class="reports__card-title"><Activity :size="18" /> Behavior</h3>
                  </div>
                  <div class="reports__card-grid">
                    <div class="reports__metric reports__metric--top-code">
                      <span class="reports__metric-label">Most Common</span>
                      <div v-if="aggregates.behavior.topCode" class="reports__top-code">
                        <span class="reports__top-code-icon">{{ aggregates.behavior.topCode.icon }}</span>
                        <div class="reports__top-code-info">
                          <span class="reports__top-code-label">{{ aggregates.behavior.topCode.label }}</span>
                          <span class="reports__top-code-count">{{ aggregates.behavior.topCode.count }} logs</span>
                        </div>
                      </div>
                      <span v-else class="reports__metric-value">—</span>
                    </div>
                    <div class="reports__metric">
                      <span class="reports__metric-label">Redirect/Device</span>
                      <span class="reports__metric-value">{{ aggregates.behavior.totalRedirects }}</span>
                    </div>
                    <div class="reports__metric">
                      <span class="reports__metric-label">Parent Contacts</span>
                      <span class="reports__metric-value">{{ aggregates.behavior.totalParentContacts }}</span>
                    </div>
                  </div>
                  <div v-if="aggregates.behavior.redirectAlerts.length" class="reports__card-section">
                    <h4 class="reports__section-title reports__section-title--alert">Multiple Redirects (3+)</h4>
                    <ul class="reports__list reports__list--alert">
                      <li v-for="name in aggregates.behavior.redirectAlerts" :key="name">
                        <span class="reports__list-name">{{ name }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </template>
          </template>

      </main>
    </div>
  </div>
</template>

<script setup>
/**
 * Reports.vue — View C: Reporting + Backup Hub
 *
 * CLAUDE.md §12 — all queries go through indexed reads (no full scans)
 * CLAUDE.md §13 — backup/restore via eventService.exportAllData / importAllData
 * CLAUDE.md §4  — composables handle IDB; eventService used only for backup/restore
 */

import { ref, reactive, computed, watch, defineComponent, h, onMounted, onUnmounted } from 'vue'
import { 
  BarChart2, Download, Trash2, PlusCircle, ChevronLeft, 
  LayoutDashboard, Database, UserCheck, Toilet, Activity, 
  FolderOpen, GraduationCap
} from 'lucide-vue-next'
import { resolveIcon }         from '../utils/icons.js'
import { useClassroom }        from '../composables/useClassroom.js'
import { useStudentDossier }   from '../composables/useStudentDossier.js'
import { useUndo }             from '../composables/useUndo.js'
import * as eventService       from '../db/eventService.js'
import StudentProfile          from '../components/StudentProfile.vue'
import StudentTrendGraph       from '../components/StudentTrendGraph.vue'
import ClassSwitcher           from '../components/ClassSwitcher.vue'
import { Bar } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  Title, 
  Tooltip, 
  Legend, 
  BarElement, 
  CategoryScale, 
  LinearScale 
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  studentId: String,
  classId: String,
  from: String
})

const {
  activeClass,
  behaviorCodes,
  classList,
  syncLateActiveState,
  switchClass
} = useClassroom()

const { push: pushUndo } = useUndo()

// --- Sorted Class List for Dropdowns ---
const sortedClassList = computed(() => {
  return [...classList.value].sort((a, b) => {
    if (!a.periodNumber && !b.periodNumber) return 0;
    if (!a.periodNumber) return 1;
    if (!b.periodNumber) return -1;
    return Number(a.periodNumber) - Number(b.periodNumber);
  });
})

// ─── dossier composable ───────────────────────────────────────────────────────

const dossier = useStudentDossier()

// Period toggle options
const PERIODS = [
  { label: 'This Week',     value: 'week'     },
  { label: 'This Month',    value: 'month'    },
  { label: 'This Semester', value: 'semester' },
  { label: 'All Time',      value: 'all'      },
]

// ─── sidebar state ────────────────────────────────────────────────────────────

/** Class selected in the sidebar dropdown */
const sidebarClassId = ref(activeClass.value?.classId || classList.value[0]?.classId || null)

watch(activeClass, (newClass, oldClass) => {
  if (newClass && (!oldClass || newClass.classId !== oldClass.classId)) {
    sidebarClassId.value = newClass.classId
    dossier.clearStudent()
    dossier.loadSidebarClass(newClass.classId)
    rightMode.value = 'overview'
    runReport()
  }
})
/** Whether the roster list is visible (mobile toggle) */
const rosterOpen     = ref(true)
/** 'dossier' | 'overview' */
const rightMode      = ref('overview')

onMounted(() => {
  if (props.classId) {
    sidebarClassId.value = props.classId
    switchClass(props.classId)
  }

  if (sidebarClassId.value) {
    dossier.loadSidebarClass(sidebarClassId.value)
    if (props.studentId) {
      onSelectStudent(props.studentId)
    } else if (rightMode.value === 'overview') {
      runReport()
    }
  }
})

// Initialise sidebarClassId from classList when it first loads
watch(classList, (list) => {
  if (!sidebarClassId.value && list.length && activeClass.value) {
    sidebarClassId.value = activeClass.value.classId
    dossier.loadSidebarClass(sidebarClassId.value)
    if (rightMode.value === 'overview') {
      runReport()
    }
  }
}, { immediate: true })

/** Students shown in the sidebar, sorted by lastName (from dossier composable) */
const sidebarStudents = dossier.sidebarStudents

/** Called when the class dropdown changes */
function onSidebarClassChange() {
  if (sidebarClassId.value) {
    switchClass(sidebarClassId.value)
  }
}

// --- Period State ---
const selectedPeriod = ref('week')
const PERIOD_OPTIONS = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Semester', value: 'semester' },
]

watch(selectedPeriod, () => {
  if (rightMode.value === 'overview') runReport()
})

/** Called when a student row is tapped */
async function onSelectStudent(studentId) {
  rightMode.value = 'dossier'
  await dossier.loadStudent(sidebarClassId.value, studentId)
}

// Ensure active class syncs with rightmost class selector if on overview */
function showOverview() {
  rightMode.value = 'overview'
  dossier.clearStudent()
  if (!reportData.value.length) runReport()
}

/** Get display text and tag from a note (detects [ob] / [cv] prefixes) */
function parseNote(note) {
  if (!note) return { text: '', tag: null }
  if (note.startsWith('[ob]')) {
    return { text: note.replace('[ob]', '').trim(), tag: 'Observation' }
  }
  if (note.startsWith('[cv]')) {
    return { text: note.replace('[cv]', '').trim(), tag: 'Conversation' }
  }
  return { text: note, tag: null }
}

/** Delete an event from the dossier (sync or note feed) */
async function onDossierDelete(eventId) {
  if (!confirm('Delete this event? This cannot be undone.')) return
  try {
    await eventService.deleteEvent(eventId)
    await dossier.loadStudent(sidebarClassId.value, dossier.selectedStudentId.value)
  } catch (err) {
    alert('Failed to delete event: ' + err.message)
  }
}

/** Edit an event's duration from the dossier profile */
async function editEvent(evt) {
  try {
    await eventService.updateEvent(evt.eventId, { duration: evt.newDuration })
    if (evt.code === 'l') {
        await syncLateActiveState(evt.classId, evt.studentId, evt.oldDuration, evt.newDuration)
    }
    
    // Push the inverse onto the undo stack
    pushUndo(async () => {
      await eventService.updateEvent(evt.eventId, { duration: evt.oldDuration })
      if (evt.code === 'l') {
          await syncLateActiveState(evt.classId, evt.studentId, evt.newDuration, evt.oldDuration)
      }
      await dossier.loadStudent(sidebarClassId.value, dossier.selectedStudentId.value)
    })
    
    // Refresh dossier safely
    await dossier.loadStudent(sidebarClassId.value, dossier.selectedStudentId.value)
  } catch (err) {
    alert('Failed to edit event: ' + err.message)
  }
}

// ─── dossier display helpers ─────────────────────────────────────────────────

const dossierStudentName = computed(() => {
  const s = dossier.student.value
  if (!s) return ''
  return `${s.lastName}, ${s.firstName}`
})

function formatTimestamp(ts) {
  if (!ts) return ''
  const parseStr = ts.includes('Z') || ts.match(/[+-]\d{2}:\d{2}$/) ? ts : ts + 'Z'
  return new Date(parseStr).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ─── aggregate-report class selection (independent of sidebar) ───────────────

const reportClass = computed(() =>
  classList.value.find(c => c.classId === sidebarClassId.value)
  ?? classList.value[0]
  ?? null
)

// (Redundant watcher on classList removed)

const reportStudents = computed(() => reportClass.value?.students ?? {})



// ─── aggregate query runner ───────────────────────────────────────────────────

const reportData = ref([])
const loading    = ref(false)

const aggregates = reactive({
  attendance: {
    totalAbsences: 0,
    testDayAbsences: 0,
    totalLates: 0,
    avgAbsences: 0,
    topAbsentees: []
  },
  washroom: {
    totalTrips: 0,
    totalDuration: 0, // minutes
    avgDuration: 0,
    studentTrips: [], // { name, count }
    longTrips: [] // { name, date, duration }
  },
  behavior: {
    topCode: null, // { icon, label, count }
    totalRedirects: 0,
    totalParentContacts: 0,
    redirectAlerts: [] // names
  }
})

async function runReport() {
  if (!sidebarClassId.value) return
  loading.value = true
  try {
    const from = eventService.getDateBoundary(selectedPeriod.value)
    const dr = { from }
    const events = await eventService.getEventsByClass(sidebarClassId.value, dr)
    reportData.value = events

    const studentsMap = reportStudents.value
    const studentCount = Object.keys(studentsMap).length

    // --- Process Attendance ---
    const attEvents = events.filter(e => (e.code === 'a' || e.code === 'l') && !e.superseded)
    const absenceEvents = attEvents.filter(e => e.code === 'a')
    const absences = absenceEvents.length
    const testDayAbsences = absenceEvents.filter(e => e.testDay).length
    const lates = attEvents.filter(e => e.code === 'l').length
    
    const absCounts = {}
    attEvents.filter(e => e.code === 'a').forEach(e => {
      absCounts[e.studentId] = (absCounts[e.studentId] ?? 0) + 1
    })
    const topAbsentees = Object.entries(absCounts)
      .map(([id, count]) => ({ 
        name: studentsMap[id] ? `${studentsMap[id].lastName}, ${studentsMap[id].firstName}` : id, 
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    aggregates.attendance = {
      totalAbsences: absences,
      testDayAbsences,
      totalLates: lates,
      avgAbsences: studentCount ? (absences / studentCount).toFixed(1) : 0,
      topAbsentees
    }

    // --- Process Washroom ---
    const washCodes = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)
    const washEvents = events.filter(e => washCodes.includes(e.code) && e.duration != null)
    const totalTrips = washEvents.length
    const totalMs = washEvents.reduce((acc, e) => acc + (e.duration || 0), 0)
    const totalMins = Math.round(totalMs / 60000)
    
    const tripCounts = {}
    washEvents.forEach(e => {
      tripCounts[e.studentId] = (tripCounts[e.studentId] ?? 0) + 1
    })
    const studentTripsData = Object.entries(tripCounts)
      .map(([id, count]) => ({ 
        name: studentsMap[id] ? `${studentsMap[id].firstName} ${studentsMap[id].lastName[0]}.` : id, 
        count 
      }))
      .sort((a, b) => b.count - a.count)

    const longTrips = washEvents
      .filter(e => e.duration > 15 * 60000)
      .map(e => ({
        name: studentsMap[e.studentId] ? `${studentsMap[e.studentId].lastName}, ${studentsMap[e.studentId].firstName}` : e.studentId,
        date: formatTimestamp(e.timestamp),
        duration: Math.round(e.duration / 60000)
      }))

    aggregates.washroom = {
      totalTrips,
      totalDuration: totalMins,
      avgDuration: totalTrips ? (totalMs / totalTrips / 60000).toFixed(1) : 0,
      studentTrips: studentTripsData,
      longTrips
    }

    // --- Process Behavior ---
    const behaviorEvents = events.filter(e => e.category !== 'attendance' && !washCodes.includes(e.code))
    const codeCounts = {}
    behaviorEvents.forEach(e => {
      codeCounts[e.code] = (codeCounts[e.code] ?? 0) + 1
    })
    
    let topCodeKey = null
    let maxCount = 0
    Object.entries(codeCounts).forEach(([code, count]) => {
      if (count > maxCount) {
        maxCount = count
        topCodeKey = code
      }
    })

    const topCodeObject = topCodeKey ? {
      ...behaviorCodesMap.value[topCodeKey],
      count: maxCount
    } : null

    const redirects = events.filter(e => e.category === 'redirect').length
    const parentContacts = events.filter(e => behaviorCodesMap.value[e.code]?.label?.toLowerCase().includes('parent')).length
    
    const redCounts = {}
    events.filter(e => e.category === 'redirect').forEach(e => {
      redCounts[e.studentId] = (redCounts[e.studentId] ?? 0) + 1
    })
    const redirectAlerts = Object.entries(redCounts)
      .filter(([id, count]) => count >= 3)
      .map(([id]) => studentsMap[id] ? `${studentsMap[id].lastName}, ${studentsMap[id].firstName}` : id)

    aggregates.behavior = {
      topCode: topCodeObject,
      totalRedirects: redirects,
      totalParentContacts: parentContacts,
      redirectAlerts
    }

  } finally {
    loading.value = false
  }
}

async function deleteEvent(eventId) {
  if (!confirm('Delete this event? This cannot be undone.')) return
  try {
    await eventService.deleteEvent(eventId)
    await runReport()
  } catch (err) {
    alert('Failed to delete event: ' + err.message)
  }
}

// ─── behavior codes map ───────────────────────────────────────────────────────

const behaviorCodesMap = computed(() =>
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)

// ─── past absence logging ─────────────────────────────────────────────────────

const showPastAbsencePanel = ref(false)
const pastAbsenceDate = ref('')
const pastAbsenceTestDay = ref(false)
const pastAbsenceMaxDate = ref('')
const pastAbsenceError = ref('')

function openPastAbsencePanel() {
  const d = new Date()
  pastAbsenceMaxDate.value = d.toISOString().slice(0, 10)
  d.setDate(d.getDate() - 1)
  pastAbsenceDate.value = d.toISOString().slice(0, 10)
  pastAbsenceTestDay.value = false
  pastAbsenceError.value = ''
  showPastAbsencePanel.value = true
}

function closePastAbsencePanel() {
  showPastAbsencePanel.value = false
  pastAbsenceError.value = ''
}

async function submitPastAbsence() {
  if (!pastAbsenceDate.value) return
  const selectedDateStr = pastAbsenceDate.value
  
  const isAlreadyAbsent = dossier.events.value.some(e => {
    if (e.code !== 'a' || !e.timestamp) return false
    const parseStr = e.timestamp.includes('Z') || e.timestamp.match(/[+-]\d{2}:\d{2}$/) ? e.timestamp : e.timestamp + 'Z'
    const evDate = new Date(parseStr)
    const evLocalStr = evDate.getFullYear() + '-' + String(evDate.getMonth() + 1).padStart(2, '0') + '-' + String(evDate.getDate()).padStart(2, '0')
    return evLocalStr === selectedDateStr
  })
  
  if (isAlreadyAbsent) {
    pastAbsenceError.value = 'Already marked absent on this date'
    return
  }
  
  try {
    const timestampStr = `${selectedDateStr}T09:00:00`
    const localDateObj = new Date(timestampStr)
    
    await eventService.logEvent({
      studentId: dossier.selectedStudentId.value,
      classId: dossier.selectedClassId.value,
      code: 'a',
      testDay: pastAbsenceTestDay.value,
      _overrideTimestamp: localDateObj.toISOString(),
      duration: null,
      note: null,
      supersededAbsent: false
    })
    
    await dossier.loadStudent(dossier.selectedClassId.value, dossier.selectedStudentId.value)
    closePastAbsencePanel()
  } catch (err) {
    pastAbsenceError.value = 'Error: ' + err.message
  }
}

const showExportMenu = ref(false)
const exportContainer = ref(null)

function handleClickOutside(event) {
  if (exportContainer.value && !exportContainer.value.contains(event.target)) {
    showExportMenu.value = false
  }
}

watch(showExportMenu, (isOpen) => {
  if (isOpen) {
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside)
    }, 0)
  } else {
    window.removeEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

function downloadAggregateCsv(section) {
  showExportMenu.value = false
  const classObj = reportClass.value
  const className = classObj?.name ?? 'Class'
  const date = new Date().toISOString().slice(0, 10)
  
  let filename = `${className}-${section}-${date}.csv`
  let csvContent = ''

  if (section === 'attendance') {
    const summary = {}
    const studentsMap = reportStudents.value
    reportData.value.forEach(evt => {
      if ((evt.code === 'a' || evt.code === 'l') && !evt.superseded) {
        if (!summary[evt.studentId]) {
          summary[evt.studentId] = { absences: 0, testDayAbsences: 0, lates: 0, lateTotal: 0, lateCount: 0 }
        }
        if (evt.code === 'a') {
          summary[evt.studentId].absences++
          if (evt.testDay) summary[evt.studentId].testDayAbsences++
        }
        else if (evt.code === 'l') {
          summary[evt.studentId].lates++
          if (evt.duration != null) {
            summary[evt.studentId].lateTotal += evt.duration
            summary[evt.studentId].lateCount++
          }
        }
      }
    })
    
    csvContent = 'Student,Absences,Test Day Absences,Lates,Avg Late (min)\n'
    Object.entries(studentsMap).forEach(([id, s]) => {
      const stats = summary[id] || { absences: 0, testDayAbsences: 0, lates: 0, lateTotal: 0, lateCount: 0 }
      const avg = stats.lateCount > 0 ? (stats.lateTotal / stats.lateCount / 60000).toFixed(1) : 0
      csvContent += `"${s.lastName}, ${s.firstName}",${stats.absences},${stats.testDayAbsences},${stats.lates},${avg}\n`
    })

  } else if (section === 'washroom') {
    const summary = {}
    const washCodes = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)
    const studentsMap = reportStudents.value
    reportData.value.forEach(evt => {
      if (washCodes.includes(evt.code) && evt.duration != null) {
        if (!summary[evt.studentId]) {
          summary[evt.studentId] = { trips: 0, totalMs: 0 }
        }
        summary[evt.studentId].trips++
        summary[evt.studentId].totalMs += evt.duration
      }
    })
    
    csvContent = 'Student,Trips,Total Duration (min),Avg Duration (min)\n'
    Object.entries(studentsMap).forEach(([id, s]) => {
      const stats = summary[id] || { trips: 0, totalMs: 0 }
      const totalMin = Math.round(stats.totalMs / 60000)
      const avg = stats.trips > 0 ? (stats.totalMs / stats.trips / 60000).toFixed(1) : 0
      csvContent += `"${s.lastName}, ${s.firstName}",${stats.trips},${totalMin},${avg}\n`
    })

  } else if (section === 'behavior') {
    const summary = {}
    const studentsMap = reportStudents.value
    const washCodes = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)
    
    reportData.value.forEach(evt => {
      if (evt.category !== 'attendance' && !washCodes.includes(evt.code)) {
        if (!summary[evt.studentId]) {
          summary[evt.studentId] = { counts: {}, redirects: 0, parentContacts: 0 }
        }
        summary[evt.studentId].counts[evt.code] = (summary[evt.studentId].counts[evt.code] ?? 0) + 1
        if (evt.category === 'redirect') summary[evt.studentId].redirects++
        if (behaviorCodesMap.value[evt.code]?.label?.toLowerCase().includes('parent')) summary[evt.studentId].parentContacts++
      }
    })
    
    csvContent = 'Student,Top Code,Redirect Incidents,Parent Contacts\n'
    Object.entries(studentsMap).forEach(([id, s]) => {
      const stats = summary[id] || { counts: {}, redirects: 0, parentContacts: 0 }
      let topCode = '—'
      let max = 0
      Object.entries(stats.counts).forEach(([code, count]) => {
        if (count > max) {
          max = count
          topCode = code
        }
      })
      csvContent += `"${s.lastName}, ${s.firstName}",${topCode},${stats.redirects},${stats.parentContacts}\n`
    })
  }

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// --- Chart Logic ---
const washroomChartData = computed(() => {
  const data = aggregates.washroom.studentTrips.slice(0, 10)
  return {
    labels: data.map(d => d.name),
    datasets: [{
      label: 'Washroom Trips',
      data: data.map(d => d.count),
      backgroundColor: '#4663ac',
      borderRadius: 4
    }]
  }
})

const washroomChartOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true }
  },
  scales: {
    x: { beginAtZero: true, ticks: { stepSize: 1 } },
    y: { grid: { display: false } }
  }
}
</script>

<style scoped>
.reports {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
  background:     var(--bg-secondary);
}

/* ── Layout ──────────────────────────────────────────────────────── */
.reports__layout {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
}

@media (min-width: 768px) {
  .reports__layout {
    flex-direction: row;
  }
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
.reports__sidebar {
  background:    var(--surface);
  border-right:  none;
  border-bottom: 1px solid var(--border);
  display:       flex;
  flex-direction: column;
  flex-shrink:   0;
  z-index:       10;
}

@media (min-width: 768px) {
  .reports__sidebar {
    width:         240px;
    border-right:  1px solid var(--border);
    border-bottom: none;
  }
}

.reports__sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reports__sidebar-section {
  padding:       16px;
  border-bottom: 1px solid var(--border);
}

.reports__roster-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--surface);
  border: none;
  border-bottom: 1px solid var(--border);
  width: 100%;
  font-weight: 600;
  color: var(--primary);
  font-size: 0.9rem;
  cursor: pointer;
}

@media (min-width: 768px) {
  .reports__roster-toggle { display: none; }
}

.reports__roster {
  list-style: none;
  margin:     0;
  padding:    0;
  overflow-y: auto;
  flex:       1;
  display:    none;
}

.reports__roster--open {
  display: block;
}

@media (min-width: 768px) {
  .reports__roster { display: block; }
}

.reports__roster-item {
  padding:       12px 16px;
  font-size:     0.95rem;
  color:         var(--text);
  cursor:        pointer;
  border-left:   3px solid transparent;
  border-bottom: 1px solid var(--bg-secondary);
  transition:    background 0.15s, border-color 0.15s;
}

.reports__roster-item:hover {
  background: var(--bg-secondary);
}

.reports__roster-item--active {
  background:   var(--primary-light);
  border-left:  3px solid var(--primary);
  font-weight:  600;
  color:        var(--primary-dark);
}

/* ── Main Panel ──────────────────────────────────────────────────── */
.reports__main {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow-y:     auto;
  padding:        20px;
}

.reports__placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
  padding: 40px;
}

/* ── Tabs ────────────────────────────────────────────────────────── */
.reports__tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.reports__tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.reports__tab:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.reports__tab--active {
  background: var(--primary-light);
  color: var(--primary);
}

/* ── Filters ─────────────────────────────────────────────────────── */
.reports__filter {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.reports__period-row {
  display: flex;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.reports__period-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.reports__period-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

/* ── Dashboard Cards ──────────────────────────────────────────────── */
.reports__dashboard {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 1100px) {
  .reports__dashboard {
    grid-template-columns: repeat(3, 1fr);
  }
}

.reports__dashboard-card {
  background: var(--surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reports__card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.reports__card-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  color: var(--text);
}

.reports__card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 20px;
  background: var(--surface);
}

.reports__metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reports__metric-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reports__metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.2;
}

.reports__metric-sub {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.reports__card-section {
  padding: 0 20px 20px;
}

.reports__section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}

.reports__section-title--alert {
  color: var(--danger);
}

.reports__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.reports__list li {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--bg-secondary);
  font-size: 0.9rem;
}

.reports__list li:last-child {
  border-bottom: none;
}

.reports__list-name {
  color: var(--text);
}

.reports__list-count {
  font-weight: 600;
  color: var(--primary);
}

.reports__list--alert .reports__list-count {
  color: var(--danger);
}

.reports__chart-container {
  height: 200px;
  position: relative;
}

/* ── Behavior Specific ───────────────────────────────────────────── */
.reports__metric--top-code {
  grid-column: span 3;
  margin-bottom: 8px;
}

.reports__top-code {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: var(--radius-md);
  margin-top: 4px;
}

.reports__top-code-icon {
  font-size: 1.8rem;
}

.reports__top-code-info {
  display: flex;
  flex-direction: column;
}

.reports__top-code-label {
  font-weight: 600;
  font-size: 1rem;
}

.reports__top-code-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* ── Export ──────────────────────────────────────────────────────── */
.reports__export-group {
  position: relative;
}

.reports__export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  min-width: 140px;
  display: flex;
  flex-direction: column;
}

.reports__export-menu button {
  padding: 10px 16px;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text);
}

.reports__export-menu button:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

/* ── Data Management ─────────────────────────────────────────────── */
.reports__panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.reports__card {
  background: var(--surface);
  padding: 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.reports__card-title {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 700;
}

.reports__hint {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.reports__hint--danger {
  color: var(--danger);
  font-weight: 600;
}

.reports__btn-row {
  display: flex;
  gap: 12px;
}

.reports__msg {
  margin-top: 16px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  font-size: 0.9rem;
  color: var(--success);
}

.reports__msg.reports__error {
  color: var(--danger);
  background: #fff5f5;
}

.reports__file-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 30px;
  background: var(--bg-secondary);
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__file-input {
  display: none;
}

/* ── Dossier ─────────────────────────────────────────────────────── */
.reports__dossier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.reports__btn-back {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
  padding: 8px 0;
}

.reports__btn-back:hover {
  color: var(--text);
}

.reports__dossier-name {
  margin: 0;
  flex: 1;
  text-align: center;
}

/* ── Shared Buttons ──────────────────────────────────────────────── */
.reports__btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.reports__btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reports__btn-ghost {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.reports__btn-export {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  color: var(--primary);
  border: 1px solid var(--primary);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.reports__loading {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

/* ── Past Absence ────────────────────────────────────────────────── */
.reports__past-absence {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.reports__btn-past-absence {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
}

.reports__past-absence-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.reports__input--small {
  padding: 4px 8px;
  font-size: 0.85rem;
}

.reports__btn-primary--small {
  padding: 4px 12px;
  font-size: 0.85rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
}

.reports__btn-ghost--small {
  padding: 4px 12px;
  font-size: 0.85rem;
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
}

.reports__past-absence-testday {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.reports__past-absence-testday input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.reports__inline-icon {
  vertical-align: middle;
  margin-top: -2px;
}

.reports__ac-list {
  display: flex;
  flex-direction: column;
}

.reports__ac-item {
  padding: 16px 0;
  border-top: 1px solid var(--bg-secondary);
}

.reports__ac-item:first-child {
  padding-top: 0;
  border-top: none;
}

.reports__ac-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reports__ac-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.reports__ac-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.reports__ac-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.reports__ac-note {
  font-size: 0.95rem;
  color: var(--text);
  margin: 0;
  line-height: 1.5;
}

/* ── Feed ────────────────────────────────────────────────────────── */
.reports__note-feed {
  list-style: none;
  padding: 0;
  margin: 0;
}

.reports__note-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.reports__note-text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text);
}

.reports__note-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.reports__note-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.reports__note-source {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reports__note-tag {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.reports__note-code {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
}

.reports__note-delete {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.reports__no-data {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
}

/* ── Print ───────────────────────────────────────────────────────── */
@media print {
  .reports__sidebar, .reports__tabs, .reports__filter, .reports__btn-export, .reports__btn-back {
    display: none !important;
  }
  .reports__main {
    padding: 0;
    overflow: visible;
  }
  .reports__dashboard-card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #eee;
  }
}
</style>
