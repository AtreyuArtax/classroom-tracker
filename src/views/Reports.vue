<template>
  <div class="reports">
    <div class="reports__layout">

      <!-- ══ LEFT SIDEBAR ══════════════════════════════════════════════ -->
      <StudentSidebar 
        :students="sidebarStudents"
        :selected-student-id="dossier.selectedStudentId.value"
        :show-academics="false"
        :is-collapsed="isSidebarCollapsed"
        @select-student="onSelectStudent"
        @navigate="$emit('navigate', $event)"
        @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      />

      <!-- ══ RIGHT PANEL ════════════════════════════════════════════════ -->
      <main class="reports__main">

        <!-- Loading -->
        <div v-if="dossier.loading.value" class="reports__loading" aria-live="polite">Loading…</div>

        <!-- ── NEW UNIFIED STUDENT 360 DOSSIER ────────────────────────── -->
        <template v-else-if="rightMode === 'dossier' && dossier.selectedStudentId.value">
          <Student360 
            :student-id="dossier.selectedStudentId.value" 
            :class-id="sidebarClassId"
            @close="showOverview"
          />
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
                <div class="reports__export-group" ref="exportContainer">
                  <button class="reports__btn-export" @click="showExportMenu = !showExportMenu">
                    <Download :size="16" /> Export Summary
                  </button>
                  <div v-if="showExportMenu" class="reports__export-menu">
                    <button @click="downloadAggregateCsv('attendance')">Attendance</button>
                    <button @click="downloadAggregateCsv('washroom')">Washroom</button>
                    <button @click="downloadAggregateCsv('behavior')">Behavior</button>
                    <button @click="downloadReportCardCsv(true)">Comments (names)</button>
                    <button @click="downloadReportCardCsv(false)">Comments (no names)</button>
                  </div>
                </div>
                <!-- Batch Print Button -->
                <button class="reports__btn-export" style="margin-left: 8px;" @click="openPrintModal">
                  <Printer :size="16" /> Print Reports
                </button>
              </div>

              <div v-if="loading" class="reports__loading" aria-live="polite">Loading…</div>

              <div v-else class="reports__overview">

                <!-- ── Section 1: Headline Stats ──────────────────────────── -->
                <div class="reports__headline-grid">

                  <!-- Card 1: Attendance -->
                  <div class="reports__headline-card">
                    <div class="reports__headline-label"><UserCheck :size="13" /> CLASS ATTENDANCE</div>
                    <div v-if="attendanceRate !== null" class="reports__headline-rate">{{ attendanceRate }}<span class="reports__headline-unit">%</span></div>
                    <div class="reports__headline-sub">{{ aggregates.attendance.totalAbsences }} absences · {{ aggregates.attendance.totalLates }} lates</div>
                    <div v-if="attendanceRate === null" class="reports__headline-sub">No attendance data for rate</div>
                    <div v-if="aggregates.attendance.testDayAbsences > 0" class="reports__headline-detail">{{ aggregates.attendance.testDayAbsences }} absences on test days</div>
                    <div v-if="chronicallyAbsentCount > 0" class="reports__headline-alert"><AlertTriangle :size="12" /> {{ chronicallyAbsentCount }} chronically absent (5+)</div>
                  </div>

                  <!-- Card 2: Washroom -->
                  <div class="reports__headline-card">
                    <div class="reports__headline-label"><Toilet :size="13" /> WASHROOM</div>
                    <div class="reports__headline-rate">{{ tripsPerStudentAvg }}<span class="reports__headline-unit"> trips/student</span></div>
                    <div class="reports__headline-sub">{{ aggregates.washroom.avgDuration }} min/trip · {{ aggregates.washroom.totalTrips }} total</div>
                    <div v-if="aggregates.washroom.testDayTrips > 0" class="reports__headline-detail">{{ aggregates.washroom.testDayTrips }} trips on test days</div>
                    <div v-if="aggregates.washroom.longTrips.length > 0" class="reports__headline-alert"><AlertTriangle :size="12" /> {{ aggregates.washroom.longTrips.length }} long trip{{ aggregates.washroom.longTrips.length !== 1 ? 's' : '' }} (&gt; 15 min)</div>
                  </div>

                  <!-- Card 3: Behavior -->
                  <div class="reports__headline-card">
                    <div class="reports__headline-label"><Activity :size="13" /> BEHAVIOR</div>
                    <div class="reports__headline-rate">{{ aggregates.behavior.totalRedirects }}<span class="reports__headline-unit"> redirect/device</span></div>
                    <div class="reports__headline-sub">{{ aggregates.behavior.totalParentContacts }} parent contacts</div>
                    <div class="reports__headline-detail">{{ notesLoggedCount }} notes logged</div>
                    <div v-if="aggregates.behavior.redirectAlerts.length > 0" class="reports__headline-alert"><AlertTriangle :size="12" /> {{ aggregates.behavior.redirectAlerts.length }} student{{ aggregates.behavior.redirectAlerts.length !== 1 ? 's' : '' }} with 3+ redirects</div>
                  </div>

                </div>

                <!-- ── Section 2: Follow Up + Washroom Detail ─────────────── -->
                <div class="reports__two-col">

                  <!-- Left: Follow Up -->
                  <div class="reports__followup-col">
                    <h4 class="reports__col-title">FOLLOW UP</h4>
                    <div v-if="followUpItems.length === 0" class="reports__followup-empty">
                      <span class="reports__followup-ok">✓ No students flagged for follow up this period</span>
                    </div>
                    <ul v-else class="reports__followup-list">
                      <li
                        v-for="item in followUpVisible"
                        :key="item.studentId + '-' + item.reason"
                        class="reports__followup-item"
                        :class="`reports__followup-item--${item.severity}`"
                        role="button"
                        tabindex="0"
                        @click="onSelectStudent(item.studentId)"
                        @keydown.enter="onSelectStudent(item.studentId)"
                      >
                        <span class="reports__followup-name">{{ item.name }}</span>
                        <span class="reports__followup-reason">{{ item.reason }}</span>
                        <span class="reports__followup-arrow">→</span>
                      </li>
                    </ul>
                    <button
                      v-if="followUpItems.length > 8"
                      class="reports__followup-more"
                      @click="followUpExpanded = !followUpExpanded"
                    >
                      {{ followUpExpanded ? 'show less ↑' : `and ${followUpItems.length - 8} more →` }}
                    </button>
                  </div>

                  <!-- Right: Washroom Detail -->
                  <div class="reports__washroom-col">
                    <h4 class="reports__col-title">WASHROOM DETAIL</h4>
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
                        @click="longTripsExpanded = !longTripsExpanded"
                      >
                        {{ longTripsExpanded ? 'show less ↑' : `and ${aggregates.washroom.longTrips.length - 5} more →` }}
                      </button>
                    </div>

                    <!-- Recent Logs Sub-section -->
                    <div v-if="hasAnyNotes" class="reports__logs-section">
                      <div class="reports__section-header-row">
                        <h4 class="reports__section-title">RECENT CLASSROOM LOGS</h4>
                        <button class="reports__btn-text" @click="showCompletedNotes = !showCompletedNotes">
                          {{ showCompletedNotes ? 'Hide Completed' : 'Show Completed' }}
                        </button>
                      </div>
                      
                      <div v-if="recentNotes.length > 0" class="reports__logs-grid">
                        <div 
                          v-for="note in recentNotes" 
                          :key="note.eventId" 
                          class="reports__log-card"
                          :class="{ 'reports__log-card--completed': note.completed }"
                        >
                          <div class="reports__log-header">
                            <span class="reports__log-student">{{ note.studentName }}</span>
                            <div class="reports__log-actions">
                              <span class="reports__log-date">{{ formatTimestamp(note.timestamp) }}</span>
                              <button 
                                class="reports__log-check" 
                                :class="{ 'reports__log-check--active': note.completed }"
                                @click.stop="onToggleNoteComplete(note.eventId, note.completed)"
                                :title="note.completed ? 'Mark Incomplete' : 'Mark Complete'"
                              >
                                <Check :size="14" />
                              </button>
                            </div>
                          </div>
                          <p class="reports__log-content">{{ note.note }}</p>
                        </div>
                      </div>
                      <div v-else class="reports__logs-empty">
                        <Check :size="24" class="reports__logs-empty-icon" />
                        <p>All logs for this period are completed!</p>
                      </div>
                    </div>
                  </div>

                </div>

                </div>
              </template>
            </template>

        </main>
      </div>


    <!-- Batch Print Configuration Modal -->
    <div v-if="showPrintModal" class="reports__modal-overlay">
      <div class="reports__print-modal reports__print-modal--wide">
        <header class="reports__modal-header">
          <div class="header-content">
            <Printer class="header-icon" :size="24" />
            <div>
              <h3 class="header-title">Batch Print Progress Reports</h3>
              <p class="header-subtitle">Generating professional reports for {{ sidebarStudents.length }} students.</p>
            </div>
          </div>
          <button class="header-close" @click="showPrintModal = false">
            <X :size="20" />
          </button>
        </header>

        <div class="reports__modal-body">
          <div class="config-section">
            <div class="config-section-header">
              <h4 class="config-section-title">Include in Documents</h4>
              <button class="reports__btn-preview" @click="showPreview = !showPreview">
                {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
              </button>
            </div>
            <div class="print-modal__options">
              <div class="print-modal__section-title">Report Content</div>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeOverallGrade" />
                Overall Grade Badge
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeMedians" />
                Weighted Median & Consistent Grade
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeGradeTrend" />
                Performance Trend Graph
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeTriangulation" />
                Evidence Triangulation (Pie)
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeCategorySummary" />
                Category Performance Summary
              </label>
              <div class="print-modal__divider"></div>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeAttendance" />
                Attendance Table
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeBehavior" />
                Out-of-Class Table
              </label>
            </div>
          </div>

          <!-- Live Preview Section -->
          <div v-if="showPreview" class="reports__print-preview-area">
            <header class="preview-banner">
              <Activity :size="14" /> LIVE PREVIEW (First Student)
            </header>
            <div class="preview-content">
              <ProgressReport 
                v-if="sidebarStudents.length > 0"
                :student-id="sidebarStudents[0].studentId" 
                :class-id="sidebarClassId" 
                :config="printConfig" 
                :is-batch="false"
              />
            </div>
          </div>

          <div v-else class="report-preview-mini">
            <p>Each student's report will start on a new page. Ideal for printing or saving as a single class PDF.</p>
          </div>
        </div>

        <footer class="reports__modal-footer">
          <button class="reports__btn-ghost" @click="showPrintModal = false">Cancel</button>
          <button class="reports__btn-primary" @click="triggerBatchPrint">
            Open Print Dialog
            <Printer :size="18" />
          </button>
        </footer>
      </div>
    </div>

    <!-- Hidden/Active Batch Print Container -->
    <Teleport to="body">
      <div class="print-only-container" :class="{ 'print-only-container--active': isSystemPrinting }">
        <template v-if="isSystemPrinting">
          <ProgressReport 
            v-for="s in sidebarStudents" 
            :key="s.studentId"
            :student-id="s.studentId" 
            :class-id="sidebarClassId" 
            :config="printConfig" 
            :is-batch="true"
          />
        </template>
      </div>
    </Teleport>
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

import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { 
  BarChart2, Download, Trash2, PlusCircle, ChevronLeft, 
  UserCheck, Toilet, Activity, 
  Printer, X, AlertTriangle, Check
} from 'lucide-vue-next'
import { useMessage }        from '../composables/useMessage.js'
import { resolveIcon }         from '../utils/icons.js'
import { useClassroom }        from '../composables/useClassroom.js'
import { formatLocalDisplay }  from '../utils/dates.js'
import { useStudentDossier }   from '../composables/useStudentDossier.js'
import { useUndo }             from '../composables/useUndo.js'
import * as classService       from '../db/classService.js'
import * as eventService       from '../db/eventService.js'
import { toMinutes }          from '../db/eventService.js'
import Student360            from '../components/dossier/Student360.vue'
import StudentSidebar        from '../components/StudentSidebar.vue'
import StudentTrendGraph       from '../components/StudentTrendGraph.vue'
import ClassSwitcher           from '../components/ClassSwitcher.vue'
import ProgressReport          from '../components/dossier/ProgressReport.vue'
import { calculateClassGrades } from '../db/gradebookService.js'
import { exportGradebookToExcel } from '../db/exportService.js'
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
  filteredClassList,
  syncLateActiveState,
  switchClass,
  academicTerms
} = useClassroom()

const { push: pushUndo } = useUndo()
const { alert, confirm } = useMessage()

// --- Sorted Class List for Dropdowns ---
const sortedClassList = computed(() => {
  return [...filteredClassList.value].sort((a, b) => {
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
  { label: 'Last Week',     value: 'last_week'},
  { label: 'This Month',    value: 'month'    },
  { label: 'This Semester', value: 'semester' },
  { label: 'All Time',      value: 'all'      },
]

// ─── sidebar state ────────────────────────────────────────────────────────────

/** Class selected in the sidebar dropdown */
const sidebarClassId = ref(activeClass.value?.classId || filteredClassList.value[0]?.classId || null)

// Watch filteredClassList to ensure sidebarClassId remains valid for the selected term
watch(filteredClassList, (newList) => {
  if (newList.length > 0) {
    const stillExists = newList.find(c => c.classId === sidebarClassId.value)
    if (!stillExists) {
      sidebarClassId.value = newList[0].classId
      runReport()
    }
  } else {
    sidebarClassId.value = null
  }
}, { immediate: true })

watch(sidebarClassId, () => {
  followUpExpanded.value = false
  longTripsExpanded.value = false
})

watch(activeClass, async (newClass, oldClass) => {
  if (newClass && (!oldClass || newClass.classId !== oldClass.classId)) {
    sidebarClassId.value = newClass.classId
    dossier.clearStudent()
    dossier.loadSidebarClass(newClass.classId)
    // Synchronize the academic state for the new class
    await loadGradebook(newClass)
    rightMode.value = 'overview'
    runReport()
  }
})
const isSidebarCollapsed = ref(false)

// Trigger global resize event when sidebar collapses/expands to fix Chart.js layout
watch(isSidebarCollapsed, () => {
  // Wait for the 0.3s CSS transition to complete
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
  }, 350)
})

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
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Semester', value: 'semester' },
]

watch(selectedPeriod, () => {
  if (rightMode.value === 'overview') runReport()
})

// Reset expansion and toggle states when switching classes
watch(sidebarClassId, () => {
  followUpExpanded.value = false
  longTripsExpanded.value = false
  showCompletedNotes.value = false
})

/** Called when a student row is tapped */
async function onSelectStudent(studentId) {
  rightMode.value = 'dossier'
  await dossier.loadStudent(sidebarClassId.value, studentId)
}

// --- Batch Print Logic ---
const showPrintModal = ref(false)
const showPreview = ref(false)
const isSystemPrinting = ref(false)

// Watch for changes in isSystemPrinting to apply/remove print styles
watch(isSystemPrinting, (newValue) => {
  if (newValue) {
    document.body.classList.add('is-printing')
  } else {
    document.body.classList.remove('is-printing')
  }
})

const printConfig = reactive({
  reportType: 'progress',
  includeAttendance: true,
  includeBehavior: false,
  includeOverallGrade: true,
  includeMedians: false,
  includeGradeTrend: true,
  includeTriangulation: false,
  includeCategorySummary: true
})

import { nextTick } from 'vue'
import { loadGradebook, activeClassRecord, assessments, gradeMap, filteredMilestones, globalMilestones } from '../composables/useGradebook.js'

const { teacherName } = useClassroom()

async function openPrintModal() {
  if (reportClass.value) {
    await loadGradebook(reportClass.value)
  }
  showPrintModal.value = true
}

async function triggerBatchPrint() {
  showPrintModal.value = false
  isSystemPrinting.value = true
  
  // Ensure all student dossiers are loaded or that ProgressReport can handle its own data.
  // We use loadGradebook to refresh the reactive state for the current class.
  if (reportClass.value) {
    await loadGradebook(reportClass.value)
  }
  
  nextTick(async () => {
    // Give charts 1500ms to render properly on the now-visible canvas
    await new Promise(resolve => setTimeout(resolve, 1500))
    window.print()
    isSystemPrinting.value = false
  })
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

// --- Duration Normalization Helper ---


/** Delete an event from the dossier (sync or note feed) */
async function onDossierDelete(eventId) {
  if (!await confirm('Delete this event? This cannot be undone.', 'Delete Event', { danger: true })) return
  try {
    await eventService.deleteEvent(eventId)
    await dossier.loadStudent(sidebarClassId.value, dossier.selectedStudentId.value)
  } catch (err) {
    await alert('Failed to delete event: ' + err.message)
  }
}

/** Edit an event's duration from the dossier profile */
async function editEvent(evt) {
  try {
    await eventService.updateEvent(evt.eventId, { duration: evt.newDuration })
    if (evt.code === 'l') {
        await syncLateActiveState(evt.classId, evt.studentId, evt.oldDuration, evt.newDuration)
    }
    
    // Refresh dossier safely
    await dossier.loadStudent(sidebarClassId.value, dossier.selectedStudentId.value)
  } catch (err) {
    await alert('Failed to edit event: ' + err.message)
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

const reportStudents = computed(() => {
  const students = reportClass.value?.students ?? {}
  const active = {}
  for (const [id, s] of Object.entries(students)) {
    if (!s.archived) active[id] = s
  }
  return active
})



// ─── aggregate query runner ───────────────────────────────────────────────────

const reportData = ref([])
const allClassEvents = ref([])
const loading    = ref(false)

const aggregates = reactive({
  attendance: {
    totalAbsences: 0,
    testDayAbsences: 0,
    totalLates: 0,
    testDayLates: 0,
    avgAbsences: 0,
    avgAbsencesPerWeek: 0,
    avgLatesPerWeek: 0,
    avgLateDuration: 0,
    topAbsentees: []
  },
  washroom: {
    totalTrips: 0,
    testDayTrips: 0,
    totalDuration: 0, // minutes
    avgDuration: 0,
    avgTripsPerWeek: 0,
    studentTrips: [], // { name, count }
    longTrips: [] // { name, date, duration }
  },
  behavior: {
    topCode: null, // { icon, label, count }
    totalRedirects: 0,
    testDayRedirects: 0,
    totalParentContacts: 0,
    redirectAlerts: [] // names
  }
})

const classGrades = ref({})

const showCompletedNotes = ref(false)

/** Aggregated notes for the class overview */
const recentNotes = computed(() => {
  const studentsMap = reportStudents.value
  let filtered = allClassEvents.value
    .filter(e => e.note && e.code !== 'a' && e.code !== 'ac' && e.code !== 'l' && e.code !== 'w' && e.code !== 'pc' && !e.superseded && !e.note.startsWith('[ob]') && !e.note.startsWith('[cv]'))
  
  if (!showCompletedNotes.value) {
    filtered = filtered.filter(e => !e.completed)
  }

  return filtered
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(e => ({
      ...e,
      studentName: studentsMap[e.studentId] ? `${studentsMap[e.studentId].firstName} ${studentsMap[e.studentId].lastName}` : 'Unknown Student'
    }))
    .slice(0, 12)
})

const hasAnyNotes = computed(() => {
  return allClassEvents.value.some(e => e.note && e.code !== 'a' && e.code !== 'ac' && e.code !== 'l' && e.code !== 'w' && e.code !== 'pc' && !e.superseded && !e.note.startsWith('[ob]') && !e.note.startsWith('[cv]'))
})

const studentsMap = computed(() => reportStudents.value)

/** Class-wide correlation insights */
const correlationInsights = computed(() => {
  if (!classGrades.value || Object.keys(classGrades.value).length === 0) return null
  
  const studentIds = Object.keys(reportStudents.value)
  if (studentIds.length === 0) return null

  // Group 1: High Absences (>= 3)
  const highAbsenceIds = studentIds.filter(id => {
    const events = reportData.value.filter(e => e.studentId === id && e.code === 'a' && !e.superseded)
    return events.length >= 3
  })

  // Group 2: Low/No Absences (< 3)
  const lowAbsenceIds = studentIds.filter(id => !highAbsenceIds.includes(id))

  const getAvg = (ids) => {
    const grades = ids.map(id => classGrades.value[id]?.overallGrade).filter(g => g != null)
    if (grades.length === 0) return null
    return grades.reduce((a, b) => a + b, 0) / grades.length
  }

  const highAbsenceAvg = getAvg(highAbsenceIds)
  const lowAbsenceAvg = getAvg(lowAbsenceIds)

  if (highAbsenceAvg === null || lowAbsenceAvg === null) return null

  const diff = lowAbsenceAvg - highAbsenceAvg
  
  return {
    highAbsenceAvg: Math.round(highAbsenceAvg),
    lowAbsenceAvg: Math.round(lowAbsenceAvg),
    diff: Math.round(diff),
    impactLevel: diff > 10 ? 'Significant' : diff > 5 ? 'Moderate' : 'Low'
  }
})

/** Selected student correlation alert */
const studentCorrelationAlert = computed(() => {
  const sId = dossier.selectedStudentId.value
  if (!sId || !classGrades.value[sId]) return null

  const grade = classGrades.value[sId].overallGrade
  const absences = dossier.stats.value.absences

  if (grade !== null && grade < 70 && absences >= 3) {
    return {
      type: 'warning',
      title: 'Coaching Insight: Attendance Correlation',
      message: `Overall grade (${Math.round(grade)}%) correlates with high absences (${absences}).`,
      recommendation: 'Recommend proactive parent contact or assessment conversation to identify gaps.'
    }
  }

  return null
})

async function onToggleNoteComplete(eventId, currentStatus) {
  await eventService.updateEvent(eventId, { completed: !currentStatus })
  // We need to trigger a re-render of the overview. 
  // Since reportData is a ref, and we just updated IDB, we should re-run the report or update local state.
  // Re-running is safest and fairly fast with indexes.
  await runReport()
}

async function runReport() {
  if (!sidebarClassId.value) return
  loading.value = true
  try {
    const dr = eventService.getDateRangeForClassPeriod(selectedPeriod.value, reportClass.value, academicTerms.value)
    const rawEvents = await eventService.getEventsByClass(sidebarClassId.value, Object.keys(dr).length ? dr : undefined)
    
    // Independent active student check to ensure robustness during transitions
    const currentClass = await classService.getClass(sidebarClassId.value)
    const activeStudents = {}
    Object.entries(currentClass?.students || {}).forEach(([id, s]) => {
      if (!s.archived) activeStudents[id] = s
    })
    const activeStudentIds = new Set(Object.keys(activeStudents))
    const studentsMap = activeStudents // used by legacy code in this function
    const studentCount = activeStudentIds.size

    // Filter events to only include active students
    const events = rawEvents.filter(e => activeStudentIds.has(e.studentId))
    reportData.value = events

    const allEventsRaw = await eventService.getEventsByClass(sidebarClassId.value)
    allClassEvents.value = allEventsRaw.filter(e => activeStudentIds.has(e.studentId))

    // Fetch Academic Grades — respect the 'to' date of the reporting period
    const grades = await calculateClassGrades(reportClass.value, { asOf: dr.to || null })
    classGrades.value = grades

    // --- Process Attendance ---
    const attEvents = events.filter(e => (e.code === 'a' || e.code === 'l') && !e.superseded)
    const absenceEvents = attEvents.filter(e => e.code === 'a')
    const lateEvents = attEvents.filter(e => e.code === 'l')
    
    const absences = absenceEvents.length
    const testDayAbsences = absenceEvents.filter(e => e.testDay).length
    const lates = lateEvents.length
    const testDayLates = lateEvents.filter(e => e.testDay).length
    
    // Calculate weeks in the reporting period
    let weeks = 1
    if (selectedPeriod.value === 'month') weeks = 4.3
    else if (selectedPeriod.value === 'semester') weeks = 20
    else if (selectedPeriod.value === 'all' && events.length > 0) {
      const first = new Date(events[0].timestamp)
      const last = new Date(events[events.length - 1].timestamp)
      const diffMs = Math.abs(last - first)
      weeks = Math.max(1, diffMs / (1000 * 60 * 60 * 24 * 7))
    }

    const totalLateMins = lateEvents.reduce((acc, e) => acc + toMinutes(e.duration), 0)
    const avgLateDuration = lates.length ? (totalLateMins / lates.length).toFixed(1) : '0.0'
    
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
      testDayLates,
      avgAbsences: studentCount ? (absences / studentCount).toFixed(1) : 0,
      avgAbsencesPerWeek: (absences / weeks).toFixed(1),
      avgLatesPerWeek: (lates / weeks).toFixed(1),
      avgLateDuration: avgLateDuration,
      topAbsentees
    }

    // --- Process Washroom ---
    const washCodes = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)
    const washEvents = events.filter(e => washCodes.includes(e.code) && e.duration != null && !e.superseded)
    const totalTrips = washEvents.length
    const testDayTrips = washEvents.filter(e => e.testDay).length
    const totalMins = washEvents.reduce((acc, e) => acc + toMinutes(e.duration), 0)
    
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

    aggregates.washroom = {
      totalTrips,
      testDayTrips,
      totalDuration: totalMins.toFixed(1),
      avgDuration: totalTrips ? (totalMins / totalTrips).toFixed(1) : '0.0',
      avgTripsPerWeek: (totalTrips / weeks).toFixed(1),
      avgMinsPerWeek: (totalMins / weeks).toFixed(1),
      studentTrips: studentTripsData,
      longTrips: washEvents
        .filter(e => toMinutes(e.duration) > 15)
        .map(e => ({
          name: studentsMap[e.studentId] ? `${studentsMap[e.studentId].lastName}, ${studentsMap[e.studentId].firstName}` : e.studentId,
          date: formatTimestamp(e.timestamp),
          duration: toMinutes(e.duration)
        }))
        .sort((a, b) => b.duration - a.duration)
    }

    // --- Process Behavior (Redirect/Device entries only) ---
    const behaviorEvents = events.filter(e => e.category === 'redirect' && !e.superseded)
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

    const redirects = behaviorEvents.length
    const testDayRedirects = behaviorEvents.filter(e => e.testDay).length
    const parentContacts = events.filter(e => behaviorCodesMap.value[e.code]?.label?.toLowerCase().includes('parent') && !e.superseded).length
    
    const redCounts = {}
    events.filter(e => e.category === 'redirect' && !e.superseded).forEach(e => {
      redCounts[e.studentId] = (redCounts[e.studentId] ?? 0) + 1
    })
    const redirectAlerts = Object.entries(redCounts)
      .filter(([id, count]) => count >= 3)
      .map(([id]) => studentsMap[id] ? `${studentsMap[id].lastName}, ${studentsMap[id].firstName}` : id)

    aggregates.behavior = {
      topCode: topCodeObject,
      totalRedirects: redirects,
      testDayRedirects,
      totalParentContacts: parentContacts,
      redirectAlerts
    }

  } finally {
    loading.value = false
  }
}

async function deleteEvent(eventId) {
  if (!await confirm('Delete this event? This cannot be undone.', 'Delete Event', { danger: true })) return
  try {
    await eventService.deleteEvent(eventId)
    await runReport()
  } catch (err) {
    await alert('Failed to delete event: ' + err.message)
  }
}

// ─── behavior codes map ───────────────────────────────────────────────────────

const behaviorCodesMap = computed(() =>
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)


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

async function downloadReportCardCsv(includeName) {
  showExportMenu.value = false
  const classObj = reportClass.value
  if (!classObj) return
  
  const isFinal = await confirm(
    'Select the report card term for this comment export.',
    'Select Report Type',
    { confirmLabel: 'Final', cancelLabel: 'Midterm' }
  )
  const reportType = isFinal ? 'Final' : 'Midterm'
  
  const className = classObj.name ?? 'Class'
  const date = new Date().toISOString().slice(0, 10)
  const filename = `${className}-report-card-comments-${reportType.toLowerCase()}-${includeName ? 'with-names' : 'anonymous'}-${date}.csv`
  
  console.log(`[CSV Export] Starting report card comment export for class: ${className}`);
  
  try {
    // Ensure gradebook data is loaded
    await loadGradebook(classObj)
  } catch (err) {
    console.error('[CSV Export] Failed to load gradebook:', err)
    await alert('Failed to load gradebook data for export: ' + err.message)
    return
  }
  
  // Ensure all class events are loaded
  let classEvents = allClassEvents.value
  if (!classEvents || classEvents.length === 0) {
    try {
      const activeStudentIds = new Set(sidebarStudents.value.map(s => s.studentId))
      const allEventsRaw = await eventService.getEventsByClass(sidebarClassId.value)
      classEvents = allEventsRaw.filter(e => activeStudentIds.has(e.studentId))
    } catch (err) {
      console.error('[CSV Export] Failed to load class events:', err)
      classEvents = []
    }
  }
  
  const dr = eventService.getDateRangeForClassPeriod(selectedPeriod.value, reportClass.value, academicTerms.value)
  const classCode = classObj.courseCode ? ` (${classObj.courseCode})` : ''
  
  const midtermMs = filteredMilestones.value?.find(m => m.name?.toLowerCase() === 'midterm') || 
                    globalMilestones.value?.find(m => m.name?.toLowerCase() === 'midterm')
  const midtermDate = midtermMs?.date || 'N/A'
  
  let csvContent = includeName 
    ? 'Student,Course,Progress Summary\r\n'
    : 'Row,Course,Progress Summary\r\n'
    
  sidebarStudents.value.forEach((studentItem, index) => {
    const sId = studentItem.studentId
    const s = classObj.students[sId]
    if (!s) return
    
    try {
      // 1. Header
      const header = includeName
        ? `Student Name: ${s.firstName} ${s.lastName}${classCode}`
        : `Student${classCode} — Progress Summary`
        
      // 2. Current Grade
      const studentGrades = classGrades.value?.[sId] || {}
      const overallGrade = studentGrades.overallGrade ?? null
      const formattedGrade = overallGrade !== null ? `${Math.round(overallGrade)}%` : 'N/A'
      
      // 3. Attendance
      const studentEvents = classEvents.filter(e => {
        if (e.studentId !== sId) return false
        if (dr.from && e.timestamp < dr.from) return false
        if (dr.to && e.timestamp > dr.to + 'T23:59:59') return false
        return true
      })
      const nonSupersededEvents = studentEvents.filter(e => !e.superseded)
      const absences = nonSupersededEvents.filter(e => e.code === 'a').length
      const lates = nonSupersededEvents.filter(e => e.code === 'l').length
      
      // 4. Academic Record & Recent Progress (Chronological Gradebook Log)
      const studentAssessments = assessments.value
        .map(a => {
          const g = gradeMap.value[a.assessmentId]?.[sId]
          return {
            ...a,
            score: g?.resolvedScore ?? null,
            attempts: g?.attempts || [],
            missing: g?.missing,
            excluded: g?.excluded
          }
        })
        .filter(a => !a.excluded && (a.target !== 'individual' || (a.target === 'individual' && String(a.targetStudentId) === String(sId))))
        
      const academicList = studentAssessments
        .filter(a => a.score !== null || a.missing || a.attempts?.some(att => att.comment?.trim()))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        
      let boundaryInserted = false
      const academicLines = []
      academicList.forEach(a => {
        if (midtermDate !== 'N/A' && a.date > midtermDate && !boundaryInserted) {
          academicLines.push('--- MIDTERM CUTOFF BOUNDARY ---')
          boundaryInserted = true
        }
        const displayDate = formatLocalDisplay(a.date, { month: 'short', day: 'numeric' })
        const unit = classObj.gradebookUnits?.find(u => u.unitId === a.unitId)
        const unitPrefix = unit ? `[${unit.name}] ` : ''
        
        let line = `- ${displayDate} - ${unitPrefix}${a.name}: `
        if (a.missing) {
          line += 'Missing'
        } else if (a.score !== null) {
          line += `${Math.round((a.score / (a.totalPoints || 1)) * 100)}%`
        } else {
          line += 'Ungraded'
        }

        if (a.attempts?.length > 1) {
          const history = a.attempts
            .map(att => {
              if (att.pointsEarned === null || att.pointsEarned === undefined) return 'Ungraded'
              return Math.round((att.pointsEarned / (a.totalPoints || 1)) * 100) + '%'
            })
            .join(', ')
          line += ` (Attempts history: ${history})`
        }
        const comments = (a.attempts || [])
          .map((att, idx) => {
            const trimmed = att.comment?.trim()
            if (!trimmed) return null
            if ((a.attempts || []).length === 1) return `[Note] ${trimmed}`
            if (att.pointsEarned === null || att.pointsEarned === undefined) {
              return `[Note - Attempt ${idx + 1}] ${trimmed}`
            }
            const pct = Math.round((att.pointsEarned / (a.totalPoints || 1)) * 100)
            return `[Note - Attempt ${idx + 1} (${pct}%)] ${trimmed}`
          })
          .filter(Boolean)
        
        comments.forEach(c => {
          line += `\n  ↳ ${c}`
        })
        academicLines.push(line)
      })
      
      // 5. Category Averages
      const results = studentGrades.categoryResults || {}
      const categoryLines = (classObj.gradebookCategories || []).map(cat => {
        const score = results[cat.categoryId]?.percentage ?? null
        return `- ${cat.name}: ${score !== null ? Math.round(score) + '%' : 'N/A'}`
      })
      
      // 6. Professional Judgment
      const activeStudentEventsFiltered = studentEvents
        .filter(e => e.code === 'ac')
        .sort((a, b) => new Date(b.ts || b.timestamp) - new Date(a.ts || a.timestamp))
        .slice(0, 5)
        
      const judgmentLines = activeStudentEventsFiltered.map(e => {
        const displayDate = new Date(e.ts || e.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
        const type = e.acType === 'observation' ? 'Obs' : 'Conv'
        const outcome = e.acOutcome ? ` [${e.acOutcome.replace(/_/g, ' ')}]` : ''
        return `- ${displayDate} (${type}): ${e.note}${outcome}`
      })
      if (activeStudentEventsFiltered.length === 0) {
        judgmentLines.push('None')
      }
      
      // 7. Teacher Working Notes
      const notesLine = s.gradebookNote?.trim() || 'None'
      
      // Assemble the complete progress block text
      const textLines = [
        header
      ]
      if (classObj.courseCode) {
        textLines.push(`Course: ${classObj.courseCode}`)
      }
      textLines.push(`Current Grade: ${formattedGrade}`)
      if (midtermDate !== 'N/A') {
        textLines.push(`Midterm Cutoff Date: ${midtermDate}`)
      }
      textLines.push(`Report Type: ${reportType}`)
      textLines.push(`Attendance: ${absences} Absences, ${lates} Lates`)
      textLines.push('')
      textLines.push('Gradebook Log (Chronological):')
      textLines.push(...academicLines)
      textLines.push('')
      textLines.push('Category Averages:')
      textLines.push(...categoryLines)
      textLines.push('')
      textLines.push('Professional Judgment (Observations & Conversations):')
      textLines.push(...judgmentLines)
      textLines.push('')
      textLines.push('Teacher Working Notes (Comment Ideas):')
      textLines.push(notesLine)
      
      const text = textLines.join('\r\n')
      
      if (index === 0) {
        console.log(`[CSV Export] Sample output for first student (${s.firstName}):`, text);
      }
      
      // Escape quotes for CSV format: double any double quotes, and wrap in double quotes
      const escapedText = `"${text.replace(/"/g, '""')}"`
      const escapedCourse = `"${(classObj.courseCode || '').replace(/"/g, '""')}"`
      
      if (includeName) {
        const escapedName = `"${`${s.lastName}, ${s.firstName}`.replace(/"/g, '""')}"`
        csvContent += `${escapedName},${escapedCourse},${escapedText}\r\n`
      } else {
        csvContent += `${index + 1},${escapedCourse},${escapedText}\r\n`
      }
    } catch (studentErr) {
      console.error(`[CSV Export] Error generating comment block for student ${sId} (${s.lastName}, ${s.firstName}):`, studentErr)
      const fallbackText = `"${`Error compiling progress summary for ${s.firstName} ${s.lastName}: ${studentErr.message}`.replace(/"/g, '""')}"`
      const escapedCourse = `"${(classObj.courseCode || '').replace(/"/g, '""')}"`
      if (includeName) {
        const escapedName = `"${`${s.lastName}, ${s.firstName}`.replace(/"/g, '""')}"`
        csvContent += `${escapedName},${escapedCourse},${fallbackText}\r\n`
      } else {
        csvContent += `${index + 1},${escapedCourse},${fallbackText}\r\n`
      }
    }
  })
  
  // Prepend UTF-8 BOM (\uFEFF) to guarantee Excel reads it as UTF-8 encoded
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  console.log('[CSV Export] File download triggered successfully.');
}

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
          summary[evt.studentId] = { absences: 0, testDayAbsences: 0, lates: 0, testDayLates: 0, lateTotalMins: 0, lateCount: 0 }
        }
        if (evt.code === 'a') {
          summary[evt.studentId].absences++
          if (evt.testDay) summary[evt.studentId].testDayAbsences++
        }
        else if (evt.code === 'l') {
          summary[evt.studentId].lates++
          if (evt.testDay) summary[evt.studentId].testDayLates++
          if (evt.duration != null) {
            summary[evt.studentId].lateTotalMins += toMinutes(evt.duration)
            summary[evt.studentId].lateCount++
          }
        }
      }
    })
    
    csvContent = 'Student,Absences,Test Day Absences,Lates,Test Day Lates,Avg Late (min)\n'
    Object.entries(studentsMap).forEach(([id, s]) => {
      const stats = summary[id] || { absences: 0, testDayAbsences: 0, lates: 0, testDayLates: 0, lateTotalMins: 0, lateCount: 0 }
      const avg = stats.lateCount > 0 ? (stats.lateTotalMins / stats.lateCount).toFixed(1) : 0
      csvContent += `"${s.lastName}, ${s.firstName}",${stats.absences},${stats.testDayAbsences},${stats.lates},${stats.testDayLates},${avg}\n`
    })

  } else if (section === 'washroom') {
    const summary = {}
    const washCodes = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)
    const studentsMap = reportStudents.value
    reportData.value.forEach(evt => {
      if (washCodes.includes(evt.code) && evt.duration != null) {
        if (!summary[evt.studentId]) {
          summary[evt.studentId] = { trips: 0, testDayTrips: 0, totalMins: 0 }
        }
        summary[evt.studentId].trips++
        if (evt.testDay) summary[evt.studentId].testDayTrips++
        summary[evt.studentId].totalMins += toMinutes(evt.duration)
      }
    })
    
    csvContent = 'Student,Trips,Test Day Trips,Total Duration (min),Avg Duration (min)\n'
    Object.entries(studentsMap).forEach(([id, s]) => {
      const stats = summary[id] || { trips: 0, testDayTrips: 0, totalMins: 0 }
      const totalMin = stats.totalMins.toFixed(1)
      const avg = stats.trips > 0 ? (stats.totalMins / stats.trips).toFixed(1) : '0.0'
      csvContent += `"${s.lastName}, ${s.firstName}",${stats.trips},${stats.testDayTrips},${totalMin},${avg}\n`
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

// ─── New overview computed properties ────────────────────────────────────────

/** Attendance rate as a percentage string, or null if data is insufficient */
const attendanceRate = computed(() => {
  const studentCount = Object.keys(reportStudents.value).length
  if (studentCount === 0) return null
  const dates = new Set(
    reportData.value.filter(e => !e.superseded).map(e => e.timestamp.slice(0, 10))
  )
  const distinctDays = dates.size
  if (distinctDays === 0) return null
  const possible = studentCount * distinctDays
  const absences = aggregates.attendance.totalAbsences
  return ((possible - absences) / possible * 100).toFixed(1)
})

/** Count of students with 5+ absences in the selected period */
const chronicallyAbsentCount = computed(() => {
  const map = {}
  reportData.value.forEach(e => {
    if (e.code === 'a' && !e.superseded) {
      map[e.studentId] = (map[e.studentId] ?? 0) + 1
    }
  })
  return Object.values(map).filter(c => c >= 5).length
})

/** Average washroom trips per student (total trips / active student count) */
const tripsPerStudentAvg = computed(() => {
  const studentCount = Object.keys(reportStudents.value).length
  if (studentCount === 0) return '0.0'
  return (aggregates.washroom.totalTrips / studentCount).toFixed(1)
})

/** Count of events with notes (excluding attendance/washroom codes) */
const notesLoggedCount = computed(() =>
  reportData.value.filter(e => e.note && e.code !== 'a' && e.code !== 'l' && e.code !== 'w' && !e.superseded).length
)

const followUpExpanded = ref(false)
const longTripsExpanded = ref(false)

/** Ranked Follow Up list — built fresh from reportData, sorted High→Medium→Low */
const followUpItems = computed(() => {
  const items = []
  const students = reportStudents.value
  const washCodes = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)

  // Build per-student absence and washroom maps directly from raw events
  const absMap = {}
  const washMap = {}
  reportData.value.forEach(e => {
    if (e.superseded) return
    if (e.code === 'a') {
      absMap[e.studentId] = (absMap[e.studentId] ?? 0) + 1
    }
    if (washCodes.includes(e.code) && e.duration != null) {
      if (!washMap[e.studentId]) washMap[e.studentId] = []
      washMap[e.studentId].push(toMinutes(e.duration))
    }
  })

  const nameFor = id => students[id] ? `${students[id].lastName}, ${students[id].firstName}` : id

  // 1. High: 5+ absences
  Object.entries(absMap).forEach(([id, count]) => {
    if (count >= 5 && students[id]) {
      items.push({ studentId: id, name: nameFor(id), reason: `${count} absences`, severity: 'high', sortVal: count })
    }
  })

  // 2. High: Grade below 60% (optional, only when grades loaded)
  if (classGrades.value && Object.keys(classGrades.value).length > 0) {
    Object.entries(classGrades.value).forEach(([id, data]) => {
      if (data.overallGrade != null && data.overallGrade < 60 && students[id]) {
        const alreadyHigh = items.some(i => i.studentId === id && i.severity === 'high')
        if (!alreadyHigh) {
          items.push({ studentId: id, name: nameFor(id), reason: `Grade at ${Math.round(data.overallGrade)}%`, severity: 'high', sortVal: 100 - data.overallGrade })
        }
      }
    })
  }

  // 3. Medium: 3–4 absences
  Object.entries(absMap).forEach(([id, count]) => {
    if (count >= 3 && count < 5 && students[id]) {
      items.push({ studentId: id, name: nameFor(id), reason: `${count} absences`, severity: 'medium', sortVal: count })
    }
  })

  // 4. Medium: Longest washroom trip > 15 min (one entry per student)
  Object.entries(washMap).forEach(([id, durations]) => {
    if (!students[id]) return
    const longest = Math.max(...durations)
    if (longest > 15) {
      items.push({ studentId: id, name: nameFor(id), reason: `${longest.toFixed(0)}min washroom trip`, severity: 'medium', sortVal: longest })
    }
  })

  // 5. Low: 3+ washroom trips in period (skip if already listed for long trip)
  Object.entries(washMap).forEach(([id, durations]) => {
    if (!students[id]) return
    if (durations.length >= 3) {
      const alreadyListed = items.some(i => i.studentId === id && i.reason.includes('washroom'))
      if (!alreadyListed) {
        items.push({ studentId: id, name: nameFor(id), reason: `${durations.length} washroom trips`, severity: 'low', sortVal: durations.length })
      }
    }
  })

  const order = { high: 0, medium: 1, low: 2 }
  items.sort((a, b) => {
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity]
    return b.sortVal - a.sortVal
  })
  return items
})

const followUpVisible = computed(() =>
  followUpExpanded.value ? followUpItems.value : followUpItems.value.slice(0, 8)
)

/** Slice of longTrips shown before toggle */
const longTripsVisible = computed(() =>
  longTripsExpanded.value ? aggregates.washroom.longTrips : aggregates.washroom.longTrips.slice(0, 5)
)

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

.reports__student-header {
  display: flex;
  justify-content: flex-end;
  padding: 10px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.reports__btn-ghost--sm {
  padding: 6px 12px;
  font-size: 0.8rem;
  min-height: 32px;
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
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

/* Removed fixed 3-column media query in favor of auto-fit */

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
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px 12px;
  padding: 24px 20px;
  background: var(--surface);
}
@media (max-width: 400px) {
  .reports__card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.reports__metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reports__metric-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0;
}

.reports__metric-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.reports__metric-value--small {
  font-size: 1.15rem;
}

.reports__metric-value small {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__metric--border {
  border-top: 1px dashed var(--border);
  padding-top: 16px;
  margin-top: 0;
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
  min-width: 180px;
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
  white-space: nowrap;
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

/* ── Recent Notes ────────────────────────────────────────────────── */
.reports__note-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
}

.reports__note-item {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s;
}

.reports__note-item:hover {
  background: var(--bg-secondary);
}

.reports__note-item:last-child {
  border-bottom: none;
}

.reports__note-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.reports__note-student {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--primary);
}

.reports__note-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.reports__note-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.4;
  white-space: pre-wrap;
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

/* ── Correlation Alerts & Insights ───────────────────────────────────── */
.reports__coaching-alert {
  background: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.reports__alert-icon {
  color: #ef4444;
  flex: 0 0 auto;
  margin-top: 2px;
}

.reports__alert-title {
  font-weight: 700;
  color: #991b1b;
  font-size: 0.95rem;
  margin-bottom: 2px;
}

.reports__alert-message {
  font-size: 0.9rem;
  color: #b91c1c;
  margin-bottom: 4px;
}

.reports__alert-recommendation {
  font-size: 0.85rem;
  color: #7f1d1d;
  opacity: 0.9;
}

.reports__dashboard-card--insight {
  border: 1px solid var(--primary-light);
  background: linear-gradient(to bottom right, var(--surface), var(--bg-secondary));
}

.reports__insight-content {
  padding: 16px;
}

.reports__insight-text {
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 16px;
  color: var(--text);
}

.reports__insight-val {
  font-weight: 700;
  color: var(--primary);
}

.reports__insight-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.reports__insight-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__insight-diff {
  font-size: 0.9rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
}

.reports__insight-diff--bad {
  background: #fef2f2;
  color: #dc2626;
}

.reports__insight-diff--good {
  background: #f0fdf4;
  color: #16a34a;
}

.reports__insight-diff--low {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

/* --- Print Styles --- */
/* (Replaced by global rules in main.css) */

.reports__btn-preview {
  background: none;
  border: 1px solid var(--primary-light);
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.config-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.reports__print-preview-area {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.print-modal__options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 24px;
  background: var(--bg-hover);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.print-modal__type-selector {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.print-modal__type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.print-modal__type-btn input {
  display: none;
}

.print-modal__type-btn--active {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

.print-modal__option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}

.print-modal__section-title {
  grid-column: 1 / -1;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 4px;
  letter-spacing: 0.05em;
}

.print-modal__divider {
  grid-column: 1 / -1;
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

.preview-banner {
  background: #333;
  color: white;
  padding: 6px 12px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-content {
  height: 450px;
  overflow-y: auto;
  background: #f1f5f9;
  padding: 30px;
  display: flex;
  justify-content: center;
}

.preview-content :deep(.progress-report),
.preview-content :deep(.attendance-report) {
  transform: scale(0.65);
  transform-origin: top center;
  margin-bottom: -150px; /* Offset the scale-down space */
  box-shadow: var(--shadow-lg);
}

/* --- Modal Styles --- */
.reports__modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.reports__print-modal {
  background: var(--surface);
  width: 95%;
  max-width: 500px;
  max-height: calc(100vh - 40px);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  animation: modalEnter 0.3s ease-out;
  transition: max-width 0.3s ease;
}

.reports__print-modal--wide {
  max-width: 700px;
}

@keyframes modalEnter {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.reports__modal-header {
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  gap: 16px;
  align-items: center;
}

.header-icon {
  color: var(--primary);
  background: var(--primary-light);
  padding: 8px;
  border-radius: var(--radius-md);
  box-sizing: content-box;
}

.header-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.header-subtitle {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.header-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.header-close:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.reports__modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.config-section-title {
  margin: 0 0 12px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s;
}

.option-item:hover {
  background: var(--bg-secondary);
}

.option-item input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
}

.option-label {
  font-size: 0.95rem;
  color: var(--text);
}

.reports__modal-footer {
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.report-preview-mini {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  line-height: 1.4;
}

/* ── Redesigned Overview Container ───────────────────────────────── */
.reports__overview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Section 1: Headline Stats Grid ──────────────────────────────── */
.reports__headline-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 900px) {
  .reports__headline-grid {
    grid-template-columns: 1fr;
  }
}

.reports__headline-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.reports__headline-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}

.reports__headline-rate {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.reports__headline-unit {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__headline-sub {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.reports__headline-detail {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.reports__headline-alert {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #c0392b;
  margin-top: 4px;
}

/* ── Section 2: Two-Column Layout ────────────────────────────────── */
.reports__two-col {
  display: grid;
  grid-template-columns: 42% 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .reports__two-col {
    grid-template-columns: 1fr;
  }
}

.reports__col-title {
  margin: 0 0 10px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Follow Up Column ─────────────────────────────────────────────── */
.reports__followup-col {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 14px 16px;
}

.reports__followup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.reports__followup-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 8px 12px;
  border-left: 3px solid transparent;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 0.87rem;
}

.reports__followup-item:hover {
  background: var(--bg-secondary);
}

.reports__followup-item--high {
  border-left-color: var(--state-out);
}

.reports__followup-item--medium {
  border-left-color: #e67e22;
}

.reports__followup-item--low {
  border-left-color: var(--primary);
}

.reports__followup-name {
  font-weight: 600;
  color: var(--text);
  flex: 0 0 auto;
  min-width: 0;
}

.reports__followup-reason {
  flex: 1;
  color: var(--text-secondary);
  font-size: 0.82rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reports__followup-arrow {
  color: var(--text-secondary);
  font-size: 0.8rem;
  flex: 0 0 auto;
}

.reports__followup-empty {
  padding: 20px 0;
}

.reports__followup-ok {
  font-size: 0.88rem;
  color: #27ae60;
  font-weight: 600;
}

.reports__followup-more {
  margin-top: 8px;
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  display: block;
}

/* ── Washroom Column ─────────────────────────────────────────────── */
.reports__washroom-col {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 14px 16px;
}

.reports__long-trips {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.reports__logs-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.reports__logs-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.reports__log-card {
  padding: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary-light);
  transition: all 0.2s ease;
}

.reports__log-card--completed {
  opacity: 0.6;
  border-left-color: var(--state-success);
  background: var(--bg-secondary);
}

.reports__log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.reports__log-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reports__log-student {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text);
}

.reports__log-date {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.reports__log-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.reports__log-check:hover {
  border-color: var(--state-success);
  color: var(--state-success);
  background: rgba(52, 199, 89, 0.1);
}

.reports__log-check--active {
  background: var(--state-success);
  border-color: var(--state-success);
  color: white;
}

.reports__log-content {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.reports__section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.reports__btn-text {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.reports__btn-text:hover {
  background: var(--bg-hover);
  color: var(--primary-dark);
}

.reports__logs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
  gap: 8px;
}

.reports__logs-empty p {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.reports__logs-empty-icon {
  color: var(--state-success);
  opacity: 0.6;
}
</style>

