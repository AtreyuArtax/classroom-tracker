<template>
  <div v-if="isVisible" class="out-capsule-wrapper" aria-live="polite">
    <!-- Single student out -->
    <div
      v-if="globalStudentsOut.length === 1"
      class="out-capsule"
      :class="{ 'out-capsule--overdue': isOverdue(globalStudentsOut[0].activeStates?.outTime) }"
    >
      <button 
        class="out-capsule__info"
        @click="goToDashboard(globalStudentsOut[0])"
        :title="`Click to view on Seating Chart (${globalStudentsOut[0].className || 'Active Class'})`"
        aria-label="View student on Dashboard"
      >
        <DoorOpen :size="15" class="out-capsule__icon" />
        <span class="out-capsule__name">{{ formatStudentName(globalStudentsOut[0]) }}</span>
        <span class="out-capsule__timer">{{ getElapsed(globalStudentsOut[0].activeStates?.outTime) }}</span>
      </button>

      <button
        class="out-capsule__return-btn"
        :disabled="isReturning(globalStudentsOut[0].studentId)"
        @click.stop="handleReturn(globalStudentsOut[0])"
        :title="`Mark ${globalStudentsOut[0].firstName} returned to class`"
        aria-label="Mark student returned"
      >
        <Check :size="13" />
        <span class="out-capsule__return-label">In</span>
      </button>
    </div>

    <!-- 2 students out (expanded pills on desktop / tablet landscape) -->
    <div
      v-else-if="globalStudentsOut.length === 2 && !isCompactMode"
      class="out-capsule-row"
    >
      <div
        v-for="student in globalStudentsOut"
        :key="student.studentId"
        class="out-capsule out-capsule--multi"
        :class="{ 'out-capsule--overdue': isOverdue(student.activeStates?.outTime) }"
      >
        <button 
          class="out-capsule__info"
          @click="goToDashboard(student)"
          :title="`Click to view on Seating Chart (${student.className || 'Active Class'})`"
          aria-label="View student on Dashboard"
        >
          <DoorOpen :size="14" class="out-capsule__icon" />
          <span class="out-capsule__name">{{ formatStudentName(student) }}</span>
          <span class="out-capsule__timer">{{ getElapsed(student.activeStates?.outTime) }}</span>
        </button>

        <button
          class="out-capsule__return-btn out-capsule__return-btn--icon-only"
          :disabled="isReturning(student.studentId)"
          @click.stop="handleReturn(student)"
          :title="`Mark ${student.firstName} returned to class`"
          aria-label="Mark student returned"
        >
          <Check :size="13" />
        </button>
      </div>
    </div>

    <!-- Consolidated Dropdown Pill: 3+ students OR compact tablet mode for 2 students -->
    <div v-else class="out-capsule-dropdown-anchor" ref="dropdownAnchorRef">
      <button
        class="out-capsule out-capsule--dropdown-trigger"
        :class="{ 
          'out-capsule--overdue': hasAnyOverdue,
          'out-capsule--active': isDropdownOpen
        }"
        @click.stop="isDropdownOpen = !isDropdownOpen"
        :aria-expanded="isDropdownOpen"
        aria-haspopup="true"
        title="View students currently out of class"
      >
        <DoorOpen :size="15" class="out-capsule__icon" />
        <span class="out-capsule__count">{{ globalStudentsOut.length }} Out</span>
        <ChevronDown 
          :size="14" 
          class="out-capsule__chevron" 
          :class="{ 'out-capsule__chevron--open': isDropdownOpen }" 
        />
      </button>

      <!-- Dropdown Popover Card -->
      <div
        v-if="isDropdownOpen"
        class="out-dropdown-menu"
        role="dialog"
        aria-label="Students currently out"
        @click.stop
      >
        <div class="out-dropdown__header">
          <span class="out-dropdown__title">Currently Out ({{ globalStudentsOut.length }})</span>
          <button 
            v-if="globalStudentsOut.length > 1" 
            class="out-dropdown__return-all"
            @click.stop="handleReturnAll"
          >
            Return All
          </button>
        </div>

        <div class="out-dropdown__list">
          <div
            v-for="student in globalStudentsOut"
            :key="student.studentId"
            class="out-dropdown__item"
            :class="{ 'out-dropdown__item--overdue': isOverdue(student.activeStates?.outTime) }"
          >
            <div class="out-dropdown__student-info" @click="goToDashboard(student)" title="View on Seating Chart">
              <div class="out-dropdown__student-name">
                {{ student.firstName }} {{ student.lastName }}
                <span v-if="student.className" class="out-dropdown__class-tag">({{ student.className }})</span>
              </div>
              <div class="out-dropdown__time-badge">
                <Clock :size="11" />
                <span>{{ getElapsed(student.activeStates?.outTime) }}</span>
                <span v-if="isOverdue(student.activeStates?.outTime)" class="out-dropdown__overdue-tag">Overdue</span>
              </div>
            </div>

            <button
              class="out-dropdown__item-return-btn"
              :disabled="isReturning(student.studentId)"
              @click.stop="handleReturn(student)"
              :title="`Mark ${student.firstName} returned`"
            >
              <Check :size="13" />
              <span>Return</span>
            </button>
          </div>
        </div>

        <div class="out-dropdown__footer">
          <button class="out-dropdown__dash-link" @click="goToDashboard(globalStudentsOut[0])">
            <span>Go to Seating Chart</span>
            <ArrowRight :size="13" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ActiveStudentsOutCapsule.vue
 *
 * Ambient presence capsule in the top navigation bar.
 * Appears when students are marked out of class and the teacher is on
 * non-Dashboard pages (Reports, Grades, Setup).
 *
 * Follows Approach B: Automatically hides when the floating Kiosk window
 * is open and expanded to avoid duplicate presence lists.
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { DoorOpen, Check, Clock, ChevronDown, ArrowRight } from 'lucide-vue-next'
import { useClassroom } from '../composables/useClassroom.js'
import { useMasterAttendanceTicker } from '../composables/useAttendanceTracker.js'

const props = defineProps({
  currentView: {
    type: String,
    default: 'Dashboard'
  }
})

const emit = defineEmits(['navigate'])

const { 
  globalStudentsOut, 
  isScannerOpen, 
  isScannerMinimized, 
  logToggleEvent,
  activeClass,
  switchClass
} = useClassroom()

const { masterTimestamp, startTicker, stopTicker } = useMasterAttendanceTicker()

const dropdownAnchorRef = ref(null)
const isDropdownOpen = ref(false)
const isCompactMode = ref(false)
const returningIds = ref(new Set())

// ── Visibility: Approach B ───────────────────────────────────────────────────
const isVisible = computed(() => {
  // Presence is already visible on Dashboard seating chart
  if (props.currentView === 'Dashboard') return false
  if (!globalStudentsOut.value || globalStudentsOut.value.length === 0) return false
  
  // If scanner/kiosk is active AND expanded (not minimized), kiosk window already shows the list
  if (isScannerOpen.value && !isScannerMinimized.value) return false
  
  return true
})

// ── Overdue Threshold (10 minutes) ───────────────────────────────────────────
const OVERDUE_MS = 10 * 60 * 1000

function isOverdue(outTime) {
  if (!outTime) return false
  const ms = masterTimestamp.value - new Date(outTime).getTime()
  return ms >= OVERDUE_MS
}

const hasAnyOverdue = computed(() => {
  return globalStudentsOut.value.some(s => isOverdue(s.activeStates?.outTime))
})

// ── Formatted Elapsed Time ───────────────────────────────────────────────────
function getElapsed(outTime) {
  if (!outTime) return '00:00'
  const ms = masterTimestamp.value - new Date(outTime).getTime()
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatStudentName(s) {
  if (!s) return ''
  const first = s.firstName || ''
  const lastInitial = s.lastName ? `${s.lastName[0]}.` : ''
  return lastInitial ? `${first} ${lastInitial}` : first
}

function isReturning(studentId) {
  return returningIds.value.has(studentId)
}

// ── 1-Click Return Action ────────────────────────────────────────────────────
async function handleReturn(student) {
  if (!student?.studentId || isReturning(student.studentId)) return
  returningIds.value.add(student.studentId)
  try {
    const code = student.activeStates?.code || 'w'
    await logToggleEvent(student.studentId, code, student.classId)
  } catch (err) {
    console.error('Failed to sign in student:', err)
  } finally {
    returningIds.value.delete(student.studentId)
  }
}

async function handleReturnAll() {
  const studentsToReturn = [...globalStudentsOut.value]
  isDropdownOpen.value = false
  for (const s of studentsToReturn) {
    await handleReturn(s)
  }
}

async function goToDashboard(student = null) {
  isDropdownOpen.value = false
  const targetClassId = student?.classId || globalStudentsOut.value?.[0]?.classId
  if (targetClassId && targetClassId !== activeClass.value?.classId) {
    await switchClass(targetClassId)
  }
  emit('navigate', 'Dashboard')
}

// ── Responsiveness & Outside Click ──────────────────────────────────────────
function checkCompact() {
  isCompactMode.value = window.innerWidth < 960
}

function handleDocumentClick(e) {
  if (isDropdownOpen.value && dropdownAnchorRef.value && !dropdownAnchorRef.value.contains(e.target)) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  startTicker()
  checkCompact()
  window.addEventListener('resize', checkCompact)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  stopTicker()
  window.removeEventListener('resize', checkCompact)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.out-capsule-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-right: 10px;
}

.out-capsule-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Capsule Shell ────────────────────────────────────────────────────────── */
.out-capsule {
  display: inline-flex;
  align-items: center;
  height: 36px;
  background: rgba(2, 132, 199, 0.08);
  border: 1px solid rgba(2, 132, 199, 0.28);
  border-radius: 18px;
  padding: 0 4px 0 10px;
  gap: 6px;
  transition: all 0.2s ease;
  user-select: none;
}

.out-capsule:hover {
  background: rgba(2, 132, 199, 0.12);
  border-color: rgba(2, 132, 199, 0.4);
}

.out-capsule--multi {
  padding: 0 4px 0 8px;
}

/* Overdue State (>10 minutes) */
.out-capsule--overdue {
  background: rgba(245, 158, 11, 0.1) !important;
  border-color: rgba(245, 158, 11, 0.4) !important;
}

.out-capsule--overdue:hover {
  background: rgba(245, 158, 11, 0.15) !important;
}

.out-capsule--overdue .out-capsule__icon,
.out-capsule--overdue .out-capsule__name,
.out-capsule--overdue .out-capsule__timer,
.out-capsule--overdue .out-capsule__count {
  color: #d97706 !important;
}

.out-capsule--overdue .out-capsule__return-btn {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.out-capsule--overdue .out-capsule__return-btn:hover {
  background: #d97706;
  color: #ffffff;
}

/* ── Inner Info Area ──────────────────────────────────────────────────────── */
.out-capsule__info {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
  font: inherit;
  transition: opacity 0.15s ease;
}

.out-capsule__info:hover {
  opacity: 0.75;
}

.out-capsule__icon {
  color: #0284c7;
  flex-shrink: 0;
}

.out-capsule__name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.out-capsule--multi .out-capsule__name {
  max-width: 95px;
}

.out-capsule__timer {
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0284c7;
  letter-spacing: -0.02em;
}

/* ── 1-Click Return Button ────────────────────────────────────────────────── */
.out-capsule__return-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 26px;
  min-width: 26px;
  padding: 0 6px;
  border: none;
  border-radius: 13px;
  background: rgba(2, 132, 199, 0.15);
  color: #0284c7;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.out-capsule__return-btn--icon-only {
  width: 22px;
  height: 22px;
  min-width: 22px;
  padding: 0;
  border-radius: 50%;
}

.out-capsule__return-btn:hover:not(:disabled) {
  background: #0284c7;
  color: #ffffff;
  transform: scale(1.06);
}

.out-capsule__return-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.out-capsule__return-label {
  font-size: 0.72rem;
  font-weight: 700;
}

/* ── Dropdown Anchor & Trigger ────────────────────────────────────────────── */
.out-capsule-dropdown-anchor {
  position: relative;
}

.out-capsule--dropdown-trigger {
  cursor: pointer;
  padding: 0 10px;
  gap: 6px;
}

.out-capsule--active {
  background: rgba(2, 132, 199, 0.16);
}

.out-capsule__count {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0284c7;
}

.out-capsule__chevron {
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.out-capsule__chevron--open {
  transform: rotate(180deg);
}

/* ── Dropdown Menu Popover ────────────────────────────────────────────────── */
.out-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 250;
  overflow: hidden;
  animation: dropIn 0.15s ease-out;
}

@keyframes dropIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.out-dropdown__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.out-dropdown__title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.out-dropdown__return-all {
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}

.out-dropdown__return-all:hover {
  background: var(--primary-light);
}

.out-dropdown__list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.out-dropdown__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  gap: 8px;
  transition: background 0.15s ease;
}

.out-dropdown__item:hover {
  background: var(--bg-secondary);
}

.out-dropdown__item--overdue {
  background: rgba(245, 158, 11, 0.05);
}

.out-dropdown__student-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.out-dropdown__student-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.out-dropdown__class-tag {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--text-secondary);
}

.out-dropdown__time-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0284c7;
}

.out-dropdown__overdue-tag {
  font-size: 0.65rem;
  font-weight: 700;
  color: #d97706;
  background: rgba(245, 158, 11, 0.15);
  padding: 1px 4px;
  border-radius: 4px;
}

.out-dropdown__item-return-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: rgba(2, 132, 199, 0.1);
  color: #0284c7;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.out-dropdown__item-return-btn:hover:not(:disabled) {
  background: #0284c7;
  color: #ffffff;
}

.out-dropdown__footer {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
  display: flex;
  justify-content: flex-end;
}

.out-dropdown__dash-link {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}

.out-dropdown__dash-link:hover {
  background: var(--primary-light);
}

@media (max-width: 600px) {
  .out-capsule__name {
    display: none;
  }
  .out-dropdown-menu {
    right: -40px;
    width: 260px;
  }
}
</style>
