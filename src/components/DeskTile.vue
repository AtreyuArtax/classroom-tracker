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

    <!-- Student content -->
    <div 
      class="desk-tile__content" 
      :class="{ 'desk-tile__content--with-photo': showDeskPhotos && currentPhotoUrl }"
      :title="`${student.firstName} ${student.lastName}${student.studentId ? ' (#' + student.studentId + ')' : ''}`"
    >
      <div v-if="showDeskPhotos && currentPhotoUrl" class="desk-tile__avatar-wrap">
        <img 
          :src="currentPhotoUrl" 
          :alt="`${student.firstName} ${student.lastName}`"
          class="desk-tile__photo-img"
        />

        <!-- Floating High-Res Hover Preview -->
        <div class="desk-tile__hover-preview" aria-hidden="true">
          <img 
            :src="currentPhotoUrl" 
            :alt="`${student.firstName} ${student.lastName}`"
            class="desk-tile__hover-preview-img"
          />
          <div class="desk-tile__hover-preview-name">{{ student.firstName }} {{ student.lastName }}</div>
        </div>
      </div>

      <div class="desk-tile__name">
        <template v-if="showDeskPhotos && currentPhotoUrl">
          <span class="desk-tile__compact-name">
            {{ student.firstName }} {{ (student.lastName || '')[0] ? (student.lastName)[0] + '.' : '' }}
          </span>
        </template>
        <template v-else>
          <span class="desk-tile__first">{{ student.firstName }}</span>
          <span class="desk-tile__last">{{ student.lastName }}</span>
        </template>
      </div>
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
import { HelpCircle, UserX, Clock, Footprints, Smartphone, DoorOpen } from 'lucide-vue-next'
import { resolveIcon }    from '../utils/icons.js'
import { toMinutes }      from '../db/eventService.js'
import { useRadial }    from '../composables/useRadial.js'
import { useClassroom } from '../composables/useClassroom.js'
import { useMasterAttendanceTicker } from '../composables/useAttendanceTracker.js'
import { classGrades, activeSubCohortFilter, isStudentInSubCohort }  from '../composables/useGradebook.js'
import { useStudentPhotos } from '../composables/useStudentPhotos.js'
import StudentAvatar from './photos/StudentAvatar.vue'

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
const { showDeskPhotos, getPhotoUrl, hasPhoto } = useStudentPhotos()

const currentPhotoUrl = computed(() => {
  const sId = props.studentId || props.student?.studentId
  return sId ? getPhotoUrl(sId) : null
})

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
  return `${stats.washroomTrips} out-of-class trips this week`
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
  return DoorOpen
})

// ─── elapsed timer (shared master clock) ─────────────────────────────────────

const { masterTimestamp, startTicker, stopTicker } = useMasterAttendanceTicker()

watch(
  () => props.student?.activeStates?.isOut,
  (isOut, wasOut) => {
    if (isOut && !wasOut) {
      startTicker()
    } else if (!isOut && wasOut) {
      stopTicker()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (props.student?.activeStates?.isOut) {
    stopTicker()
  }
})

/** MM:SS formatted elapsed time */
const elapsedFormatted = computed(() => {
  if (!props.student?.activeStates?.isOut || !props.student?.activeStates?.outTime) return '00:00'
  const ms = masterTimestamp.value - new Date(props.student.activeStates.outTime).getTime()
  const elapsedSeconds = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')
  const s = (elapsedSeconds % 60).toString().padStart(2, '0')
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
  const raw = evt.dataTransfer?.getData('text/plain')
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    if (!data || !data.studentId) return
    // Emit upward — SeatingGrid orchestrates the seat swap via useClassroom
    emit('seat-drop', {
      studentId:  data.studentId,
      fromRow:    data.fromRow,
      fromCol:    data.fromCol,
      toRow:      props.row,
      toCol:      props.col,
      toStudentId: props.studentId ?? null,
    })
  } catch (err) {
    // Ignore non-JSON drag drops
  }
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
  overflow:   visible;

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
  background: transparent;
  border:     1.5px dashed var(--border);
  box-shadow: none;
  cursor:     default;
  opacity:    0.45;
  transition: all 0.15s ease;
}

.desk-tile--empty:hover {
  background: var(--surface);
  border-color: var(--primary);
  opacity: 0.9;
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

/* ── Student content & photo layout ──────────────────────────────────────── */
.desk-tile__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  gap: 3px;
}

.desk-tile__content--with-photo {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 1px 2px;
}

.desk-tile__avatar-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
  border: 2px solid var(--surface);
  outline: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.desk-tile__photo-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

/* ── Floating Hover Zoom Card ─────────────────────────────────────────────── */
.desk-tile__hover-preview {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(6px) scale(0.92);
  width: 160px;
  background: var(--surface, #ffffff);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 100;
  /* Instant fade-out when mouse leaves */
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

/* Triangle caret at bottom of hover preview */
.desk-tile__hover-preview::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0 6px;
  border-style: solid;
  border-color: var(--surface, #ffffff) transparent transparent transparent;
}

.desk-tile__hover-preview-img {
  width: 100%;
  height: 148px;
  border-radius: 8px;
  object-fit: cover;
  display: block;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.desk-tile__hover-preview-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0 2px;
}

/* Trigger hover card with intentional 350ms dwell delay */
.desk-tile__avatar-wrap:hover .desk-tile__hover-preview {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0) scale(1);
  transition-delay: 350ms;
}

.desk-tile__compact-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
  text-align: center;
  word-break: break-word;
}

/* ── Student name ────────────────────────────────────────────────────────── */
.desk-tile__name {
  display:     flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.15;
  text-align:  center;
  min-width: 0;
}

.desk-tile__first {
  font-size:   0.82rem;
  font-weight: 700;
  color:       var(--text);
}

.desk-tile__last {
  font-size:   0.72rem;
  font-weight: 400;
  color:       var(--text-secondary);
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
  background: var(--color-danger-bg, rgba(254, 242, 242, 0.95)) !important;
  border:     1.5px solid var(--color-danger, #ef4444) !important;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.18) !important;
}

.desk-tile__status-info--out {
  background: var(--color-danger, #ef4444);
  color:      #ffffff;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
}

/* ── Absent state ────────────────────────────────────────────────────────── */
.desk-tile--absent {
  background: var(--color-danger-bg, rgba(255, 241, 242, 0.85)) !important;
  border:     1.5px solid var(--color-danger, #fda4af) !important;
}

.desk-tile__status-info--absent {
  background: var(--color-danger-bg, rgba(225, 29, 72, 0.12));
  color:      var(--color-danger, #e11d48);
}

/* ── Late state ──────────────────────────────────────────────────────────── */
.desk-tile--late {
  background: var(--color-warn-bg, rgba(254, 243, 199, 0.85)) !important;
  border:     1.5px solid var(--color-warn, #fcd34d) !important;
}

.desk-tile__status-info--late {
  background: var(--color-warn-bg, rgba(217, 119, 6, 0.12));
  color:      var(--color-warn, #d97706);
}

/* ── Event flash — green for ~700ms ─────────────────────────────────────── */
.desk-tile--flash {
  background: var(--color-success-bg, rgba(220, 252, 231, 0.95)) !important;
  border-color: var(--color-success, #22c55e) !important;
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
