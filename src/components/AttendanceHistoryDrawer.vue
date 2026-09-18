<template>
  <Teleport to="body">
    <Transition name="history-drawer-fade">
      <div 
        class="history-backdrop" 
        @click="onBackdropClick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-drawer-title"
      >
        <div 
          class="history-drawer" 
          :class="{ 'history-drawer--expanded': isExpanded }"
          @click.stop
        >
          
          <!-- ── Tightened Header with Inline Stats ────────────────── -->
          <header class="history-drawer__header">
            <div class="header-left">
              <div class="header-title-group">
                <History :size="18" class="header-icon" />
                <h3 id="history-drawer-title" class="header-title">Attendance History</h3>
                <span class="header-class-tag">
                  {{ classRecord?.name }}<span v-if="classRecord?.periodNumber"> · P{{ classRecord.periodNumber }}</span>
                </span>
                <span class="header-badge-readonly">
                  <Lock :size="10" /> Read-Only
                </span>
              </div>

              <!-- Inline Attendance Stats (Saves an entire row of height!) -->
              <div class="header-stats-group">
                <span 
                  class="stat-chip stat-chip--absent"
                  :class="{ 'stat-chip--highlight': absentStudents.length > 0 }"
                  title="Absent count"
                >
                  <UserX :size="12" />
                  <strong>{{ absentStudents.length }}</strong> Absent
                </span>

                <span 
                  class="stat-chip stat-chip--late"
                  :class="{ 'stat-chip--highlight': lateStudents.length > 0 }"
                  title="Late count"
                >
                  <Clock :size="12" />
                  <strong>{{ lateStudents.length }}</strong> Late
                </span>

                <span class="stat-chip stat-chip--present" title="Present count">
                  <Check :size="12" />
                  <strong>{{ presentStudents.length }}</strong> Present
                </span>

                <span class="stat-chip stat-chip--rate" title="Attendance rate">
                  {{ attendanceRate }}%
                </span>
              </div>
            </div>

            <div class="header-actions">
              <!-- Expand / Collapse Width Toggle -->
              <button 
                type="button"
                class="header-btn" 
                :title="isExpanded ? 'Collapse to Compact Width' : 'Expand Width'"
                :aria-label="isExpanded ? 'Collapse drawer width' : 'Expand drawer width'"
                @click="isExpanded = !isExpanded"
              >
                <component :is="isExpanded ? Minimize2 : Maximize2" :size="16" />
              </button>

              <!-- Close Button -->
              <button 
                type="button"
                class="header-btn header-btn--close" 
                @click="$emit('close')" 
                aria-label="Close attendance history drawer"
                title="Close (Esc)"
              >
                <X :size="18" />
              </button>
            </div>
          </header>

          <!-- ── Date Controller Bar (Single Sleek Row) ─────────────── -->
          <section class="history-drawer__date-bar" aria-label="Date navigation">
            <div class="date-bar-inner">
              <div class="date-stepper">
                <button 
                  type="button" 
                  class="date-stepper__arrow" 
                  @click="shiftDate(-1)" 
                  title="Previous Day"
                  aria-label="Previous day"
                >
                  <ChevronLeft :size="16" />
                </button>

                <div class="date-stepper__box">
                  <input 
                    type="date" 
                    v-model="selectedDate" 
                    :max="todayStr" 
                    class="date-stepper__native" 
                    aria-label="Select date"
                  />
                  <Calendar :size="14" class="date-stepper__icon" />
                  <span class="date-stepper__label">
                    <strong>{{ formattedDayShort }}</strong>, {{ formattedDateDisplay }}
                  </span>
                </div>

                <button 
                  type="button" 
                  class="date-stepper__arrow" 
                  :disabled="isTodaySelected"
                  @click="shiftDate(1)" 
                  title="Next Day"
                  aria-label="Next day"
                >
                  <ChevronRight :size="16" />
                </button>
              </div>

              <!-- Quick Jump Shortcuts Inline -->
              <div class="date-pills">
                <button 
                  type="button" 
                  class="date-pill"
                  :class="{ 'date-pill--active': isTodaySelected }"
                  @click="selectedDate = todayStr"
                >
                  Today
                </button>
                <button 
                  type="button" 
                  class="date-pill"
                  :class="{ 'date-pill--active': isYesterdaySelected }"
                  @click="selectedDate = yesterdayStr"
                >
                  Yesterday
                </button>
                <button 
                  type="button" 
                  class="date-pill"
                  @click="jumpToPrevSchoolDay"
                  title="Jump to previous school day"
                >
                  Prev School Day
                </button>
              </div>
            </div>
          </section>

          <!-- ── View Switcher Toolbar ───────────────────────────────── -->
          <div class="history-drawer__views-toolbar">
            <div class="view-toggle">
              <button 
                type="button"
                class="view-toggle__btn"
                :class="{ 'view-toggle__btn--active': activeTab === 'roster' }"
                @click="activeTab = 'roster'"
              >
                <Users :size="14" />
                <span>Roster Breakdown</span>
              </button>
              <button 
                type="button"
                class="view-toggle__btn"
                :class="{ 'view-toggle__btn--active': activeTab === 'seating' }"
                @click="activeTab = 'seating'"
              >
                <LayoutGrid :size="14" />
                <span>Seating Map</span>
              </button>
            </div>

            <!-- If seating tab is active, offer mini-legend -->
            <div v-if="activeTab === 'seating'" class="seating-toolbar-right">
              <div class="seating-mini-legend">
                <span class="legend-dot legend-dot--absent"></span> Absent ({{ absentStudents.length }})
                <span class="legend-dot legend-dot--late"></span> Late ({{ lateStudents.length }})
                <span class="legend-dot legend-dot--present"></span> Present ({{ presentStudents.length }})
              </div>
            </div>

            <span v-else class="history-drawer__enrolled-count">
              {{ totalEnrolled }} enrolled
            </span>
          </div>

          <!-- ── Drawer Body ───────────────────────────────────────── -->
          <main class="history-drawer__body" :class="{ 'history-drawer__body--seating': activeTab === 'seating' }">

            <div v-if="loading" class="history-drawer__loading" aria-live="polite">
              <span class="loading-spinner"></span>
              <span>Loading records for {{ formattedDateDisplay }}…</span>
            </div>

            <!-- TAB 1: Roster Breakdown View -->
            <div v-else-if="activeTab === 'roster'" class="roster-view">
              
              <!-- Weekend Notice if applicable -->
              <div v-if="isWeekend" class="history-notice history-notice--weekend">
                <Calendar :size="16" />
                <span>Weekend date ({{ formattedDayName }}). No classes were scheduled.</span>
              </div>

              <!-- Perfect Attendance Banner (if 0 absent & 0 late) -->
              <div v-if="absentStudents.length === 0 && lateStudents.length === 0 && !isWeekend" class="perfect-attendance-card">
                <div class="perfect-attendance-card__icon">🎉</div>
                <div class="perfect-attendance-card__info">
                  <span class="perfect-attendance-card__title">All Students Present</span>
                  <span class="perfect-attendance-card__sub">No absences or lates were logged on {{ formattedDateDisplay }}.</span>
                </div>
              </div>

              <!-- Absent Section (Hero Focus) -->
              <section class="roster-group roster-group--absent">
                <div class="roster-group__header">
                  <span class="roster-group__title">
                    <UserX :size="16" class="text-absent" />
                    Absent Students
                  </span>
                  <span class="roster-group__badge roster-group__badge--absent">{{ absentStudents.length }}</span>
                </div>

                <div v-if="absentStudents.length === 0" class="roster-group__empty">
                  No recorded absences on this date.
                </div>
                <div v-else class="roster-group__list">
                  <div 
                    v-for="item in absentStudents" 
                    :key="item.student.studentId" 
                    class="student-item student-item--absent"
                  >
                    <StudentAvatar 
                      :student-id="item.student.studentId"
                      :first-name="item.student.firstName"
                      :last-name="item.student.lastName"
                      size="sm"
                    />
                    <div class="student-item__details">
                      <span class="student-item__name">{{ item.student.firstName }} {{ item.student.lastName }}</span>
                      <span v-if="item.event?.note" class="student-item__note">"{{ item.event.note }}"</span>
                    </div>
                    <div class="student-item__meta">
                      <span v-if="item.event?.timestamp" class="student-item__time">
                        {{ formatTime(item.event.timestamp) }}
                      </span>
                      <span v-if="item.event?.testDay" class="badge-test-day">Test Day</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Late Section (Hero Focus) -->
              <section class="roster-group roster-group--late">
                <div class="roster-group__header">
                  <span class="roster-group__title">
                    <Clock :size="16" class="text-late" />
                    Late Students
                  </span>
                  <span class="roster-group__badge roster-group__badge--late">{{ lateStudents.length }}</span>
                </div>

                <div v-if="lateStudents.length === 0" class="roster-group__empty">
                  No recorded lates on this date.
                </div>
                <div v-else class="roster-group__list">
                  <div 
                    v-for="item in lateStudents" 
                    :key="item.student.studentId" 
                    class="student-item student-item--late"
                  >
                    <StudentAvatar 
                      :student-id="item.student.studentId"
                      :first-name="item.student.firstName"
                      :last-name="item.student.lastName"
                      size="sm"
                    />
                    <div class="student-item__details">
                      <span class="student-item__name">{{ item.student.firstName }} {{ item.student.lastName }}</span>
                      <span v-if="item.event?.note" class="student-item__note">"{{ item.event.note }}"</span>
                    </div>
                    <div class="student-item__meta">
                      <span class="badge-late-duration">
                        +{{ toMinutes(item.event?.duration) }}m
                      </span>
                      <span v-if="item.event?.timestamp" class="student-item__time">
                        {{ formatTime(item.event.timestamp) }}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Present Students Collapsible Summary (Saves Height & Screen Clutter) -->
              <section class="roster-group roster-group--present">
                <button 
                  type="button" 
                  class="roster-group__accordion-btn"
                  @click="showPresentList = !showPresentList"
                  aria-expanded="showPresentList"
                >
                  <div class="roster-group__title">
                    <Check :size="16" class="text-present" />
                    <span>{{ presentStudents.length }} Other Students Present</span>
                  </div>
                  <div class="roster-group__accordion-right">
                    <span class="roster-group__accordion-hint">
                      {{ showPresentList ? 'Hide list' : 'Show full roster' }}
                    </span>
                    <ChevronDown 
                      :size="16" 
                      class="roster-group__accordion-chevron"
                      :class="{ 'rotate-180': showPresentList }" 
                    />
                  </div>
                </button>

                <div v-if="showPresentList" class="present-chips-grid">
                  <div 
                    v-for="item in presentStudents" 
                    :key="item.student.studentId" 
                    class="present-chip"
                  >
                    <span class="present-chip__dot"></span>
                    <span class="present-chip__name">{{ item.student.firstName }} {{ item.student.lastName }}</span>
                  </div>
                </div>
              </section>

            </div>

            <!-- TAB 2: Seating Chart View (Fit to Screen) -->
            <div v-else-if="activeTab === 'seating'" class="seating-view">
              
              <!-- Seating Grid Container (Fits available width/height) -->
              <div class="seating-chart-container">
                <div 
                  class="seating-chart-grid"
                  :style="{
                    gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`
                  }"
                >
                  <template v-for="r in gridRows" :key="`r-${r}`">
                    <template v-for="c in gridCols" :key="`c-${r}-${c}`">
                      <!-- Aisle Walkway -->
                      <div 
                        v-if="isAisle(r, c)" 
                        class="seating-aisle-cell" 
                        aria-hidden="true"
                      />

                      <!-- Desk Cell -->
                      <div 
                        v-else 
                        class="seating-desk-cell"
                        :class="getSeatClasses(r, c)"
                        :title="getSeatTooltip(r, c)"
                      >
                        <template v-if="getStudentAtSeat(r, c)">
                          <div class="desk-cell__top">
                            <span class="desk-cell__name">
                              {{ getStudentAtSeat(r, c).firstName }} {{ (getStudentAtSeat(r, c).lastName || '')[0] ? (getStudentAtSeat(r, c).lastName)[0] + '.' : '' }}
                            </span>
                          </div>

                          <div class="desk-cell__status">
                            <template v-if="getStudentStatusAtSeat(r, c) === 'absent'">
                              <span class="status-pill status-pill--absent">
                                <UserX :size="11" /> Absent
                              </span>
                            </template>
                            <template v-else-if="getStudentStatusAtSeat(r, c) === 'late'">
                              <span class="status-pill status-pill--late">
                                <Clock :size="11" /> +{{ getStudentLateMinutesAtSeat(r, c) }}m
                              </span>
                            </template>
                            <template v-else>
                              <span class="status-dot status-dot--present" title="Present"></span>
                            </template>
                          </div>
                        </template>
                        <span v-else class="desk-cell__empty-label">Empty</span>
                      </div>
                    </template>
                  </template>
                </div>
              </div>

              <!-- Unseated Enrolled Students (if any) -->
              <div v-if="unseatedStudentsList.length > 0" class="mini-unseated-group">
                <span class="mini-unseated-title">Unassigned to Seats ({{ unseatedStudentsList.length }}):</span>
                <div class="mini-unseated-tags">
                  <span 
                    v-for="item in unseatedStudentsList" 
                    :key="item.student.studentId"
                    class="mini-unseated-tag"
                    :class="`mini-unseated-tag--${item.status}`"
                  >
                    <strong>{{ item.student.firstName }} {{ item.student.lastName }}</strong>: {{ item.status.toUpperCase() }}
                  </span>
                </div>
              </div>

              <div class="seating-view__note">
                <Info :size="14" />
                <span>Attendance is mapped to each student's currently assigned seat. Click ↔ to toggle width.</span>
              </div>

            </div>

          </main>

          <!-- ── Footer ────────────────────────────────────────────── -->
          <footer class="history-drawer__footer">
            <span class="history-drawer__footer-hint">
              Press <strong>Esc</strong> or click outside to dismiss
            </span>
            <button 
              type="button" 
              class="history-drawer__btn-done" 
              @click="$emit('close')"
            >
              Done
            </button>
          </footer>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * AttendanceHistoryDrawer.vue
 *
 * Slide-over drawer for viewing historical attendance records by date.
 * Strictly read-only to preserve live cockpit integrity.
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { 
  History, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Check, 
  UserX, 
  Clock, 
  Users, 
  LayoutGrid, 
  Lock, 
  Info,
  Maximize2,
  Minimize2,
  ChevronDown
} from 'lucide-vue-next'
import StudentAvatar from './photos/StudentAvatar.vue'
import * as eventService from '../db/eventService.js'
import { formatLocalDate, formatLocalDisplay, parseLocal } from '../utils/dates.js'

const props = defineProps({
  classRecord: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

// ─── state ────────────────────────────────────────────────────────────────────

const todayStr = formatLocalDate(new Date())

function getYesterdayDateStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatLocalDate(d)
}

const yesterdayStr = getYesterdayDateStr()

// Default date: Yesterday
const selectedDate = ref(yesterdayStr)
const activeTab = ref('roster') // 'roster' | 'seating'
const loading = ref(false)
const eventsOnDate = ref([])

// Layout / UX preferences
const isExpanded = ref(false)
const showPresentList = ref(false) // Default collapsed so teachers aren't overwhelmed with 30 chips

// Automatically expand on Seating Map, collapse back to compact on Roster Breakdown
watch(activeTab, (newTab) => {
  isExpanded.value = (newTab === 'seating')
})

// ─── date formatting & calculations ──────────────────────────────────────────

const isTodaySelected = computed(() => selectedDate.value === todayStr)
const isYesterdaySelected = computed(() => selectedDate.value === yesterdayStr)

const formattedDayName = computed(() => {
  if (!selectedDate.value) return ''
  const d = parseLocal(selectedDate.value)
  return d.toLocaleDateString([], { weekday: 'long' })
})

const formattedDayShort = computed(() => {
  if (!selectedDate.value) return ''
  const d = parseLocal(selectedDate.value)
  return d.toLocaleDateString([], { weekday: 'short' })
})

const formattedDateDisplay = computed(() => {
  if (!selectedDate.value) return ''
  return formatLocalDisplay(selectedDate.value, { month: 'short', day: 'numeric', year: 'numeric' })
})

const isWeekend = computed(() => {
  if (!selectedDate.value) return false
  const day = parseLocal(selectedDate.value).getDay()
  return day === 0 || day === 6
})

function shiftDate(deltaDays) {
  if (!selectedDate.value) return
  const d = parseLocal(selectedDate.value)
  d.setDate(d.getDate() + deltaDays)
  const newDateStr = formatLocalDate(d)
  if (newDateStr <= todayStr) {
    selectedDate.value = newDateStr
  }
}

function jumpToPrevSchoolDay() {
  const d = selectedDate.value ? parseLocal(selectedDate.value) : new Date()
  d.setDate(d.getDate() - 1)
  if (d.getDay() === 0) d.setDate(d.getDate() - 2)
  else if (d.getDay() === 6) d.setDate(d.getDate() - 1)
  selectedDate.value = formatLocalDate(d)
}

// ─── data fetching ────────────────────────────────────────────────────────────

async function fetchAttendance() {
  if (!props.classRecord?.classId || !selectedDate.value) return
  loading.value = true
  try {
    const rawEvents = await eventService.getEventsByClass(props.classRecord.classId, {
      from: selectedDate.value,
      to: selectedDate.value
    })
    eventsOnDate.value = rawEvents || []
  } catch (err) {
    console.error('Failed to fetch attendance history:', err)
    eventsOnDate.value = []
  } finally {
    loading.value = false
  }
}

watch([() => props.classRecord?.classId, selectedDate], () => {
  fetchAttendance()
}, { immediate: true })

// ─── attendance categorization (CRITICAL: Preserving studentId from keys) ──────

const enrolledStudents = computed(() => {
  const studentsMap = props.classRecord?.students || {}
  // Iterate Object.entries to guarantee studentId is preserved even if omitted from inner object
  return Object.entries(studentsMap)
    .filter(([_, s]) => !s.archived)
    .map(([keyId, s]) => ({
      ...s,
      studentId: s.studentId ? String(s.studentId) : String(keyId)
    }))
})

const totalEnrolled = computed(() => enrolledStudents.value.length)

// Map studentId -> status entry
const studentStatusMap = computed(() => {
  const map = {}
  
  // Non-superseded attendance events for this date
  const absents = eventsOnDate.value.filter(e => e.code === 'a' && !e.superseded)
  const lates = eventsOnDate.value.filter(e => e.code === 'l')

  for (const student of enrolledStudents.value) {
    const sId = String(student.studentId)
    const absentEv = absents.find(e => String(e.studentId) === sId)
    const lateEv = lates.find(e => String(e.studentId) === sId)

    if (absentEv) {
      map[sId] = {
        student,
        status: 'absent',
        event: absentEv
      }
    } else if (lateEv) {
      map[sId] = {
        student,
        status: 'late',
        event: lateEv
      }
    } else {
      map[sId] = {
        student,
        status: 'present',
        event: null
      }
    }
  }

  return map
})

const absentStudents = computed(() => {
  return Object.values(studentStatusMap.value)
    .filter(item => item.status === 'absent')
    .sort((a, b) => (a.student.lastName || '').localeCompare(b.student.lastName || ''))
})

const lateStudents = computed(() => {
  return Object.values(studentStatusMap.value)
    .filter(item => item.status === 'late')
    .sort((a, b) => (a.student.lastName || '').localeCompare(b.student.lastName || ''))
})

const presentStudents = computed(() => {
  return Object.values(studentStatusMap.value)
    .filter(item => item.status === 'present')
    .sort((a, b) => (a.student.lastName || '').localeCompare(b.student.lastName || ''))
})

const attendanceRate = computed(() => {
  if (totalEnrolled.value === 0) return 100
  const rate = ((totalEnrolled.value - absentStudents.value.length) / totalEnrolled.value) * 100
  return Math.max(0, Math.min(100, Math.round(rate)))
})

// ─── seating chart helpers ────────────────────────────────────────────────────

const gridRows = computed(() => Number(props.classRecord?.gridSize?.rows || 6))
const gridCols = computed(() => Number(props.classRecord?.gridSize?.cols || 6))

function isAisle(row, col) {
  const layout = props.classRecord?.layoutConfig
  if (!layout) return false
  if (layout.cellTypes?.[`${row}-${col}`] === 'aisle') return true
  const aisles = layout.aisles
  if (aisles?.columns && aisles.columns.includes(col)) return true
  if (aisles?.rows && aisles.rows.includes(row)) return true
  return false
}

function getStudentAtSeat(row, col) {
  return enrolledStudents.value.find(s => s.seat && s.seat.row === row && s.seat.col === col) || null
}

function getStudentStatusAtSeat(row, col) {
  const student = getStudentAtSeat(row, col)
  if (!student) return 'empty'
  return studentStatusMap.value[String(student.studentId)]?.status || 'present'
}

function getStudentLateMinutesAtSeat(row, col) {
  const student = getStudentAtSeat(row, col)
  if (!student) return 0
  const entry = studentStatusMap.value[String(student.studentId)]
  return entry?.event?.duration ? toMinutes(entry.event.duration) : 0
}

function getSeatClasses(row, col) {
  const student = getStudentAtSeat(row, col)
  if (!student) return ['seating-desk-cell--empty']
  const status = getStudentStatusAtSeat(row, col)
  return [`seating-desk-cell--occupied`, `seating-desk-cell--${status}`]
}

function getSeatTooltip(row, col) {
  const student = getStudentAtSeat(row, col)
  if (!student) return `Seat ${row}-${col} (Empty)`
  const status = getStudentStatusAtSeat(row, col)
  if (status === 'absent') return `${student.firstName} ${student.lastName} (Absent)`
  if (status === 'late') {
    const mins = getStudentLateMinutesAtSeat(row, col)
    return `${student.firstName} ${student.lastName} (Late +${mins}m)`
  }
  return `${student.firstName} ${student.lastName} (Present)`
}

const unseatedStudentsList = computed(() => {
  return Object.values(studentStatusMap.value).filter(item => !item.student.seat)
})

// ─── utils ────────────────────────────────────────────────────────────────────

function toMinutes(durationMs) {
  return eventService.toMinutes(durationMs)
}

function formatTime(isoTimestamp) {
  if (!isoTimestamp) return ''
  try {
    const d = new Date(isoTimestamp)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch (err) {
    return ''
  }
}

function onBackdropClick() {
  emit('close')
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
/* ── Backdrop & Transition ────────────────────────────────────────── */
.history-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  z-index: 2500;
  display: flex;
  justify-content: flex-end;
}

.history-drawer-fade-enter-active,
.history-drawer-fade-leave-active {
  transition: opacity 0.22s ease;
}

.history-drawer-fade-enter-from,
.history-drawer-fade-leave-to {
  opacity: 0;
}

.history-drawer-fade-enter-active .history-drawer {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.history-drawer-fade-leave-active .history-drawer {
  transition: transform 0.2s ease-in, width 0.2s ease;
}

.history-drawer-fade-enter-from .history-drawer,
.history-drawer-fade-leave-to .history-drawer {
  transform: translateX(100%);
}

/* ── Drawer Shell ────────────────────────────────────────────────── */
.history-drawer {
  width: 560px;
  max-width: 100vw;
  height: 100%;
  background: var(--surface);
  box-shadow: var(--shadow-lg, -4px 0 24px rgba(0, 0, 0, 0.25));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--border);
  transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.history-drawer--expanded {
  width: min(940px, 95vw);
}

/* ── Tightened Header ────────────────────────────────────────────── */
.history-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.header-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.header-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}

.header-class-tag {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface);
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  white-space: nowrap;
}

.header-badge-readonly {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(142, 142, 147, 0.12);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* Inline Attendance Stats in Header */
.header-stats-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.76rem;
  font-weight: 500;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  white-space: nowrap;
}

.stat-chip strong {
  font-weight: 700;
}

.stat-chip--absent.stat-chip--highlight {
  background: rgba(255, 59, 48, 0.14);
  border-color: rgba(255, 59, 48, 0.4);
  color: var(--state-out, #ff3b30);
}

.stat-chip--late.stat-chip--highlight {
  background: rgba(255, 204, 0, 0.18);
  border-color: rgba(255, 204, 0, 0.4);
  color: var(--state-late-text, #eab308);
}

.stat-chip--present {
  color: var(--text);
}

.stat-chip--present strong {
  color: var(--state-success, #34c759);
}

.stat-chip--rate {
  font-weight: 700;
  color: var(--primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.header-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.header-btn:hover {
  background: var(--border);
  color: var(--text);
}

/* ── Single-Row Date Controller Bar ──────────────────────────────── */
.history-drawer__date-bar {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.date-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.date-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-stepper__arrow {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-sm);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.date-stepper__arrow:hover:not(:disabled) {
  background: var(--border);
}

.date-stepper__arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.date-stepper__box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  height: 32px;
}

.date-stepper__box:hover {
  border-color: var(--primary);
}

.date-stepper__native {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.date-stepper__icon {
  color: var(--text-secondary);
  pointer-events: none;
}

.date-stepper__label {
  font-size: 0.85rem;
  color: var(--text);
  pointer-events: none;
  white-space: nowrap;
}

.date-pills {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-pill {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 4px 9px;
  border-radius: var(--radius-sm);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.date-pill:hover {
  border-color: var(--text-secondary);
  color: var(--text);
}

.date-pill--active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

/* ── View Switcher Toolbar ───────────────────────────────────────── */
.history-drawer__views-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
  gap: 10px;
}

.view-toggle {
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--bg-secondary);
  padding: 2px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.view-toggle__btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-toggle__btn:hover {
  color: var(--text);
}

.view-toggle__btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.seating-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.seating-mini-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 2px;
}

.legend-dot--absent  { background: var(--state-out, #ff3b30); }
.legend-dot--late    { background: var(--state-late, #ffcc00); }
.legend-dot--present { background: var(--state-success, #34c759); }

.history-drawer__enrolled-count {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ── Drawer Body ─────────────────────────────────────────────────── */
.history-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.history-drawer__body--seating {
  padding: 12px 16px;
}

.history-drawer__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 180px;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.loading-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.history-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
}

.history-notice--weekend {
  background: rgba(142, 142, 147, 0.12);
  color: var(--text-secondary);
  border-left: 3px solid var(--text-secondary);
}

/* Perfect attendance banner */
.perfect-attendance-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(52, 199, 89, 0.12);
  border: 1px solid rgba(52, 199, 89, 0.35);
  border-radius: var(--radius-md);
}

.perfect-attendance-card__icon {
  font-size: 1.3rem;
}

.perfect-attendance-card__info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.perfect-attendance-card__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--state-success, #34c759);
}

.perfect-attendance-card__sub {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

/* ── Roster Group ────────────────────────────────────────────────── */
.roster-group {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.roster-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.roster-group__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text);
}

.roster-group__badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
}

.roster-group__badge--absent {
  background: rgba(255, 59, 48, 0.15);
  color: var(--state-out, #ff3b30);
}

.roster-group__badge--late {
  background: rgba(255, 204, 0, 0.18);
  color: var(--state-late-text, #eab308);
}

.roster-group__badge--present {
  background: rgba(52, 199, 89, 0.15);
  color: var(--state-success, #34c759);
}

.roster-group__empty {
  padding: 12px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-style: italic;
}

.roster-group__list {
  display: flex;
  flex-direction: column;
}

.student-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.student-item:last-child {
  border-bottom: none;
}

.student-item__details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.student-item__name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-item__note {
  font-size: 0.76rem;
  color: var(--text-secondary);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.student-item__time {
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.badge-test-day {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: #ff9500;
  color: #fff;
  text-transform: uppercase;
}

.badge-late-duration {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 8px;
  background: rgba(255, 204, 0, 0.2);
  color: var(--state-late-text, #eab308);
}

/* Accordion for Present students */
.roster-group__accordion-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--surface);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.roster-group__accordion-btn:hover {
  background: var(--bg-secondary);
}

.roster-group__accordion-right {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
}

.roster-group__accordion-hint {
  font-size: 0.76rem;
  font-weight: 500;
}

.roster-group__accordion-chevron {
  transition: transform 0.2s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}

/* Present Chips */
.present-chips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 5px;
  padding: 10px 12px;
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.present-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  font-size: 0.78rem;
  overflow: hidden;
}

.present-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--state-success, #34c759);
  flex-shrink: 0;
}

.present-chip__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text);
}

/* ── Seating Map View ────────────────────────────────────────────── */
.seating-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.seating-chart-container {
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: center;
  overflow: visible;
  max-height: calc(100vh - 210px);
}

.seating-chart-grid {
  display: grid;
  gap: 6px;
  width: 100%;
  max-width: 880px;
}

/* Aisle Walkway */
.seating-aisle-cell {
  background: transparent;
  min-height: 44px;
}

/* Desk Cell */
.seating-desk-cell {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6px 8px;
  min-height: 52px;
  position: relative;
  transition: all 0.15s ease;
  user-select: none;
}

.seating-desk-cell--empty {
  border-style: dashed;
  background: transparent;
  align-items: center;
  justify-content: center;
  opacity: 0.55;
}

.desk-cell__empty-label {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.seating-desk-cell--occupied {
  box-shadow: var(--shadow-sm);
}

.seating-desk-cell--absent {
  background: rgba(255, 59, 48, 0.12);
  border-color: var(--state-out, #ff3b30);
}

.seating-desk-cell--late {
  background: rgba(255, 204, 0, 0.15);
  border-color: var(--state-late, #ffcc00);
}

.seating-desk-cell--present {
  border-color: rgba(52, 199, 89, 0.35);
}

.desk-cell__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.desk-cell__name {
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text);
}

.seating-desk-cell--absent .desk-cell__name {
  color: var(--state-out, #ff3b30);
}

.seating-desk-cell--late .desk-cell__name {
  color: var(--state-late-text, #eab308);
}

.desk-cell__status {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 3px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.status-pill--absent {
  background: rgba(255, 59, 48, 0.2);
  color: var(--state-out, #ff3b30);
}

.status-pill--late {
  background: rgba(255, 204, 0, 0.25);
  color: var(--state-late-text, #eab308);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot--present {
  background: var(--state-success, #34c759);
}

.mini-unseated-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.mini-unseated-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.mini-unseated-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.mini-unseated-tag {
  font-size: 0.72rem;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
}

.mini-unseated-tag--absent {
  border-color: var(--state-out, #ff3b30);
  color: var(--state-out, #ff3b30);
}

.mini-unseated-tag--late {
  border-color: var(--state-late, #ffcc00);
  color: var(--state-late-text, #eab308);
}

.seating-view__note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 1px;
  flex-shrink: 0;
}

/* ── Footer ──────────────────────────────────────────────────────── */
.history-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.history-drawer__footer-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.history-drawer__btn-done {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  background: var(--primary);
  color: #ffffff;
  border: none;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.history-drawer__btn-done:hover {
  opacity: 0.9;
}

/* Colors helpers */
.text-absent  { color: var(--state-out, #ff3b30); }
.text-late    { color: var(--state-late-text, #eab308); }
.text-present { color: var(--state-success, #34c759); }
</style>
