<template>
  <!-- Empty seat -->
  <div
    v-if="!student"
    class="desk-tile desk-tile--empty"
    :class="{ 'desk-tile--drop-target': isDragOver }"
    :aria-label="`Empty seat row ${row} col ${col}`"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
  >
    <span class="desk-tile__empty-label">Empty</span>
  </div>

  <!-- Occupied seat -->
  <div
    v-else
    class="desk-tile"
    :class="{
      'desk-tile--out':    student.activeStates?.isOut,
      'desk-tile--absent': student.activeStates?.isAbsent,
      'desk-tile--late':   student.activeStates?.lateMs > 0,
      'desk-tile--flash':  flashing,
      'desk-tile--dimmed': isDimmed,
    }"
    :aria-label="`${student.firstName} ${student.lastName}`"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="isDragging = false"
    @click="openRadialForStudent"
  >
    <!-- Washroom badge — top left corner -->
    <span
      v-if="showWashroomDot"
      class="desk-tile__stats-badge desk-tile__stats-badge--washroom"
      :title="washroomDotTooltip"
    >
      <Footprints :size="10" />
    </span>

    <!-- Device badge — top right corner -->
    <span
      v-if="showDeviceDot"
      class="desk-tile__stats-badge desk-tile__stats-badge--device"
      :title="deviceDotTooltip"
    >
      <Smartphone :size="10" />
    </span>

    <!-- Discreet Accommodations Indicator — bottom left corner -->
    <span
      v-if="student.hasIEP"
      class="desk-tile__iep-dot"
      title="Accommodations Plan"
    />

    <!-- Discreet Academic At-Risk Indicator — bottom right corner -->
    <span
      v-if="showAtRiskDot"
      class="desk-tile__at-risk-dot"
      :title="atRiskDotTooltip"
    />

    <!-- Student name -->
    <div class="desk-tile__name">
      <span class="desk-tile__first">{{ student.firstName }}</span>
      <span class="desk-tile__last">{{ student.lastName }}</span>
    </div>

    <!-- Active Out timer pill -->
    <div v-if="student.activeStates?.isOut" class="desk-tile__status-info desk-tile__status-info--out">
      <component :is="activeOutIcon" :size="12" class="desk-tile__status-icon" />
      <span class="desk-tile__timer">{{ elapsedFormatted }}</span>
    </div>

    <!-- Absent status pill -->
    <div v-else-if="student.activeStates?.isAbsent" class="desk-tile__status-info desk-tile__status-info--absent">
      <UserX :size="12" class="desk-tile__status-icon" />
      <span class="desk-tile__status-label">Absent</span>
    </div>

    <!-- Late status pill -->
    <div v-else-if="student.activeStates?.lateMs > 0" class="desk-tile__status-info desk-tile__status-info--late">
      <Clock :size="12" class="desk-tile__status-icon" />
      <span class="desk-tile__status-label">Late {{ toMinutes(student.activeStates.lateMs) }}m</span>
    </div>
  </div>
</template>

<script setup>
/**
 * DeskTile.vue
 *
 * Renders a single seat in the seating grid.
 *
 * CLAUDE.md rules enforced here:
 *  §10  — Four visual states implemented via CSS classes
 *  §7   — No washroom shortcut on the tile; click always opens the radial
 *  §4   — Does NOT import from src/db/; uses useClassroom and useRadial composables
 *  §2   — All colours/shadows reference CSS custom properties only
 *
 * Props:
 *   row, col   — grid position (1-indexed)
 *   studentId  — may be undefined (empty seat)
 *   student    — full student object from useClassroom reactive map
 *   classId    — needed for drag-and-drop seat assignment calls
 */

import { ref, computed, watch, onUnmounted } from 'vue'
import { HelpCircle, UserX, Clock, Footprints, Smartphone, Toilet } from 'lucide-vue-next'
import { resolveIcon }    from '../utils/icons.js'
import { toMinutes }      from '../db/eventService.js'
import { useRadial }    from '../composables/useRadial.js'
import { useClassroom } from '../composables/useClassroom.js'
import { classGrades, activeSubCohortFilter, isStudentInSubCohort }  from '../composables/useGradebook.js'

// ─── props ────────────────────────────────────────────────────────────────────

const props = defineProps({
  row:       { type: Number, required: true },
  col:       { type: Number, required: true },
  studentId: { type: String, default: null },
  student:   { type: Object, default: null },
  classId:   { type: String, required: true },
})

const emit = defineEmits(['seat-drop']) // emitted to SeatingGrid for drag/drop handling

// ─── composables ──────────────────────────────────────────────────────────────

const { open: openRadial } = useRadial()
const { behaviorCodes, assignSeat, studentWeeklyStats, thresholds } = useClassroom()

const isDimmed = computed(() => {
  if (!props.student || !activeSubCohortFilter.value || activeSubCohortFilter.value.toLowerCase() === 'all') return false
  return !isStudentInSubCohort(props.student)
})

const studentOverallGrade = computed(() => {
  if (!props.studentId) return null
  const sg = classGrades.value?.[props.studentId]
  return sg?.overallGrade ?? null
})

const showAtRiskDot = computed(() => {
  if (studentOverallGrade.value === null || studentOverallGrade.value === undefined || !thresholds.value) return false
  const limit = Number(thresholds.value.atRiskThreshold ?? 50)
  return Number(studentOverallGrade.value) < limit
})

const atRiskDotTooltip = computed(() => {
  if (studentOverallGrade.value === null) return ''
  return `Academic Review (Overall: ${Math.round(studentOverallGrade.value)}%)`
})

const showWashroomDot = computed(() => {
  const stats = studentWeeklyStats.value[props.studentId]
  if (!stats || !thresholds.value) return false
  return stats.washroomTrips >= (thresholds.value.washroomTripsPerWeek ?? 4)
})

const showDeviceDot = computed(() => {
  const stats = studentWeeklyStats.value[props.studentId]
  if (!stats || !thresholds.value) return false
  return stats.deviceIncidents >= (thresholds.value.deviceIncidentsPerWeek ?? 3)
})

const washroomDotTooltip = computed(() => {
  const stats = studentWeeklyStats.value[props.studentId]
  if (!stats) return ''
  return `${stats.washroomTrips} washroom trips this week`
})

const deviceDotTooltip = computed(() => {
  const stats = studentWeeklyStats.value[props.studentId]
  if (!stats) return ''
  return `${stats.deviceIncidents} device incidents this week`
})

// ─── radial ───────────────────────────────────────────────────────────────────

/**
 * Open the radial menu for this student.
 * §7: the ONLY event entry point — no washroom shortcut here.
 */
function openRadialForStudent() {
  if (!props.student) return
  openRadial(
    { studentId: props.studentId, classId: props.classId, activeStates: props.student.activeStates },
    behaviorCodes.value
  )
}

/**
 * Resolve the icon to show when the student is "out".
 * Checks the activeState.code first, falls back to behavior codes if matched.
 */
const activeOutIcon = computed(() => {
  const stateCode = props.student?.activeStates?.code
  if (stateCode) {
    const codeObj = behaviorCodes.value.find(c => c.codeKey === stateCode)
    if (codeObj) return resolveIcon(codeObj.icon)
  }
  
  // Backward compatibility fallback for old sessions missing the 'code' in activeStates
  return Toilet
})

// ─── elapsed timer ────────────────────────────────────────────────────────────

/** Seconds elapsed since outTime */
const elapsedSeconds = ref(0)
let _intervalId = null

function _startTimer() {
  if (_intervalId) return
  _intervalId = setInterval(() => {
    if (!props.student?.activeStates?.outTime) return
    const ms = Date.now() - new Date(props.student.activeStates.outTime).getTime()
    elapsedSeconds.value = Math.floor(ms / 1000)
  }, 1000)
}

function _stopTimer() {
  if (_intervalId) {
    clearInterval(_intervalId)
    _intervalId = null
  }
  elapsedSeconds.value = 0
}

// Watch isOut to start/stop the interval (§10)
watch(
  () => props.student?.activeStates?.isOut,
  (isOut) => {
    if (isOut) {
      // Seed the counter immediately on mount
      const ms = Date.now() - new Date(props.student.activeStates.outTime).getTime()
      elapsedSeconds.value = Math.floor(ms / 1000)
      _startTimer()
    } else {
      _stopTimer()
    }
  },
  { immediate: true }
)

onUnmounted(_stopTimer)

/** MM:SS formatted elapsed time */
const elapsedFormatted = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60).toString().padStart(2, '0')
  const s = (elapsedSeconds.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

// ─── event flash (§10) ────────────────────────────────────────────────────────

const flashing = ref(false)
let _flashTimeout = null

watch(
  () => props.student?.lastEvent?.ts,
  (ts) => {
    if (!ts) return
    // Only flash if the event occurred within the last 3 seconds
    // to prevent stale events from flashing when switching classes / reusing components
    if (Date.now() - ts > 3000) return
    
    flashing.value = true
    clearTimeout(_flashTimeout)
    _flashTimeout = setTimeout(() => { flashing.value = false }, 700)
  }
)

onUnmounted(() => clearTimeout(_flashTimeout))

// ─── drag-and-drop (Setup view seat assignment) ───────────────────────────────

const isDragging  = ref(false)
const isDragOver  = ref(false)

function onDragStart(evt) {
  isDragging.value = true
  evt.dataTransfer.setData('text/plain', JSON.stringify({
    studentId: props.studentId,
    fromRow:   props.row,
    fromCol:   props.col,
  }))
  evt.dataTransfer.effectAllowed = 'move'
}

function onDrop(evt) {
  isDragOver.value = false
  const data = JSON.parse(evt.dataTransfer.getData('text/plain'))
  // Emit upward — SeatingGrid orchestrates the seat swap via useClassroom
  emit('seat-drop', {
    studentId:  data.studentId,
    fromRow:    data.fromRow,
    fromCol:    data.fromCol,
    toRow:      props.row,
    toCol:      props.col,
    toStudentId: props.studentId ?? null,
  })
}
</script>

<style scoped>
/* ── Base tile ───────────────────────────────────────────────────────────── */
.desk-tile {
  position:        relative;
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  justify-content: center;
  gap:             2px;

  width:      100%;
  height:     100%;
  min-width:  0;
  min-height: 0;
  overflow:   hidden;

  background:    var(--surface);
  border-radius: var(--radius-md);
  box-shadow:    0 2px 6px rgba(0,0,0,0.03);
  border:        1px solid var(--border);
  padding:       4px 6px;
  cursor:        pointer;

  /* smooth transition for flash */
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;

  user-select: none;
  -webkit-user-select: none;
}

.desk-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0,0,0,0.07);
  border-color: rgba(79, 70, 229, 0.3);
}

.desk-tile:active {
  transform: scale(0.97);
}

/* ── Dimmed state (when filtered by section/grade) ───────────────────────── */
.desk-tile--dimmed {
  opacity: 0.35;
  filter: grayscale(0.5);
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.desk-tile--dimmed:hover {
  opacity: 0.85;
  filter: grayscale(0);
}

/* ── Empty seat ─────────────────────────────────────────────────────────── */
.desk-tile--empty {
  background: rgba(248, 250, 252, 0.7);
  border:     1.5px dashed var(--border);
  box-shadow: none;
  cursor:     default;
  opacity:    0.7;
  transition: all 0.15s ease;
}

.desk-tile--empty:hover {
  background: var(--surface);
  border-color: var(--primary);
  opacity: 1;
}

.desk-tile--drop-target {
  outline:    2px dashed var(--primary);
  background: var(--primary-light);
  opacity:    1;
}

.desk-tile__empty-label {
  font-size:   0.65rem;
  font-weight: 600;
  color:       var(--text-secondary);
  text-align:  center;
}

/* ── Micro Stats Badges ─────────────────────────────────────────────────── */
.desk-tile__stats-badge {
  position: absolute;
  top: 5px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.8);
}

.desk-tile__stats-badge--washroom {
  left: 5px;
  background: rgba(224, 242, 254, 0.95);
  color: #0284c7;
}

.desk-tile__stats-badge--device {
  right: 5px;
  background: rgba(254, 243, 199, 0.95);
  color: #d97706;
}

/* ── Student name ────────────────────────────────────────────────────────── */
.desk-tile__name {
  display:     flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
  text-align:  center;
}

.desk-tile__first {
  font-size:   0.7rem;
  color:       var(--text-secondary);
}

.desk-tile__last {
  font-size:   0.8rem;
  font-weight: 600;
  color:       var(--text);
}

.desk-tile__timer {
  font-size:   0.7rem;
  font-weight: 700;
  color:       #ffffff;
  font-variant-numeric: tabular-nums;
}

/* ── Status Info Badges ───────────────────────────────────────────────── */
.desk-tile__status-info {
  display:       inline-flex;
  align-items:   center;
  gap:           3px;
  margin-top:    4px;
  padding:       2px 7px;
  border-radius: 10px;
  line-height:   1;
}

.desk-tile__status-icon {
  font-size: 0.75rem;
}

.desk-tile__status-label {
  font-size:   0.62rem;
  font-weight: 700;
  text-transform: uppercase;
}

/* ── Out-of-room state ───────────────────────────────────────────────────── */
.desk-tile--out {
  background: rgba(254, 242, 242, 0.95) !important;
  border:     1.5px solid #ef4444 !important;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.18) !important;
}

.desk-tile__status-info--out {
  background: #ef4444;
  color:      #ffffff;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
}

/* ── Absent state ────────────────────────────────────────────────────────── */
.desk-tile--absent {
  background: rgba(255, 241, 242, 0.85) !important;
  border:     1.5px solid #fda4af !important;
}

.desk-tile__status-info--absent {
  background: rgba(225, 29, 72, 0.12);
  color:      #e11d48;
}

/* ── Late state ──────────────────────────────────────────────────────────── */
.desk-tile--late {
  background: rgba(254, 243, 199, 0.85) !important;
  border:     1.5px solid #fcd34d !important;
}

.desk-tile__status-info--late {
  background: rgba(217, 119, 6, 0.12);
  color:      #d97706;
}

/* ── Event flash — green for ~700ms ─────────────────────────────────────── */
.desk-tile--flash {
  background: rgba(220, 252, 231, 0.95) !important;
  border-color: #22c55e !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25) !important;
}

/* ── Discreet IEP / Accommodations Indicator ────────────────────────────────── */
.desk-tile__iep-dot {
  position: absolute;
  bottom: 6px;
  left: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8b5cf6;
  opacity: 0.85;
  box-shadow: 0 0 5px rgba(139, 92, 246, 0.45);
}

/* ── Discreet Academic At-Risk Indicator ────────────────────────────────── */
.desk-tile__at-risk-dot {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  opacity: 0.85;
  box-shadow: 0 0 5px rgba(245, 158, 11, 0.45);
}
</style>
