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
      'desk-tile--late':   student.activeStates?.lateMinutes > 0,
      'desk-tile--flash':  flashing,
    }"
    :aria-label="`${student.firstName} ${student.lastName}`"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="isDragging = false"
    @click="openRadialForStudent"
  >
    <!-- Stats dot — top left corner -->
    <span
      v-if="showStatsDot"
      class="desk-tile__stats-dot"
      :title="statsDotTooltip"
    />

    <!-- Student name -->
    <div class="desk-tile__name">
      <span class="desk-tile__first">{{ student.firstName }}</span>
      <span class="desk-tile__last">{{ student.lastName }}</span>
    </div>

    <div v-if="student.activeStates?.isOut" class="desk-tile__status-info desk-tile__status-info--out">
      <component :is="activeOutIcon" :size="16" class="desk-tile__status-icon" />
      <span class="desk-tile__timer">{{ elapsedFormatted }}</span>
    </div>

    <!-- Absent indicator -->
    <div v-else-if="student.activeStates?.isAbsent" class="desk-tile__status-info desk-tile__status-info--absent">
      <UserX :size="16" class="desk-tile__status-icon" />
      <span class="desk-tile__status-label">Absent</span>
    </div>

    <!-- Late indicator -->
    <div v-else-if="student.activeStates?.lateMinutes > 0" class="desk-tile__status-info desk-tile__status-info--late">
      <Clock :size="16" class="desk-tile__status-icon" />
      <span class="desk-tile__status-label">Late {{ student.activeStates.lateMinutes }}m</span>
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
import { HelpCircle, UserX, Clock, Droplets } from 'lucide-vue-next'
import { resolveIcon }    from '../utils/icons.js'
import { useRadial }    from '../composables/useRadial.js'
import { useClassroom } from '../composables/useClassroom.js'

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

const showStatsDot = computed(() => {
  const stats = studentWeeklyStats.value[props.studentId]
  if (!stats || !thresholds.value) return false
  return (
    stats.washroomTrips >= (thresholds.value.washroomTripsPerWeek ?? 4) ||
    stats.deviceIncidents >= (thresholds.value.deviceIncidentsPerWeek ?? 3)
  )
})

const statsDotTooltip = computed(() => {
  const stats = studentWeeklyStats.value[props.studentId]
  if (!stats || !thresholds.value) return ''
  const parts = []
  if (stats.washroomTrips >= (thresholds.value.washroomTripsPerWeek ?? 4)) {
    parts.push(`${stats.washroomTrips} washroom trips this week`)
  }
  if (stats.deviceIncidents >= (thresholds.value.deviceIncidentsPerWeek ?? 3)) {
    parts.push(`${stats.deviceIncidents} device incidents this week`)
  }
  return parts.join(' · ')
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
  return Droplets
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

  min-width:  44px;   /* §2 touch target */
  min-height: 44px;

  background:    var(--surface);
  border-radius: var(--radius-md);
  box-shadow:    var(--shadow-sm);
  padding:       6px 8px;
  cursor:        pointer;

  /* smooth transition for flash */
  transition: background 0.15s ease, box-shadow 0.15s ease;

  user-select: none;
  -webkit-user-select: none;
}

.desk-tile:active {
  transform: scale(0.97);
}

/* ── Empty seat ─────────────────────────────────────────────────────────── */
.desk-tile--empty {
  background: var(--bg-secondary);
  box-shadow: none;
  cursor:     default;
  opacity:    0.55;
}

.desk-tile--drop-target {
  outline:    2px dashed var(--primary);
  background: var(--primary-light);
  opacity:    1;
}

.desk-tile__empty-label {
  font-size:  0.65rem;
  color:      var(--text-secondary);
  text-align: center;
}

/* ── Stats dot (§10 / Update 07) ─────────────────────────────────────────── */
.desk-tile__stats-dot {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff3b30;
  box-shadow: 0 1px 3px rgba(255, 59, 48, 0.4);
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
  font-weight: 600;
  color:       var(--state-out);
  font-variant-numeric: tabular-nums;
}

/* ── Status Info (Generic) ───────────────────────────────────────────────── */
.desk-tile__status-info {
  display:     flex;
  align-items: center;
  gap:         4px;
  margin-top:  2px;
}

.desk-tile__status-icon {
  font-size: 0.85rem;
}

.desk-tile__status-label {
  font-size:   0.6rem;
  font-weight: 700;
  text-transform: uppercase;
}

/* ── Absent state ────────────────────────────────────────────────────────── */
.desk-tile--absent {
  background: var(--bg-secondary) !important;
  opacity:    0.7;
}

.desk-tile--absent .desk-tile__status-label {
  color: var(--text-secondary);
}

/* ── Late state ──────────────────────────────────────────────────────────── */
.desk-tile--late {
  background: #FFF9E6 !important; /* light amber */
  border: 1px solid #FFCC00;
  box-shadow: 0 0 8px rgba(255, 204, 0, 0.2), var(--shadow-sm);
}

.desk-tile--late .desk-tile__status-label {
  color: #B28F00;
}

/* ── Out-of-room state (§10) ─────────────────────────────────────────────── */
.desk-tile--out {
  border:     2px solid var(--state-out);
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.15);
}

/* ── Event flash (§10) — green for ~700ms ─────────────────────────────── */
.desk-tile--flash {
  background: var(--state-success) !important;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.25);
}
</style>
