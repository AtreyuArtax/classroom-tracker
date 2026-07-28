<template>
  <div class="dashboard">

    <!-- ── Header ──────────────────────────────────────────────────── -->
    <header class="dashboard__header">
      <ClassSwitcher @navigate="emit('navigate', $event)" />

      <div class="dashboard__header-right">
        <!-- Students-out badge -->
        <div v-if="studentsOut.length > 0" class="dashboard__out-badge" aria-live="polite">
          <Toilet :size="16" />
          {{ studentsOut.length }} out
        </div>
        
        <!-- Test Day Button -->
        <button
          v-if="activeClass"
          class="dashboard__test-day-btn"
          :class="{ 'dashboard__test-day-btn--active': isTestDay }"
          @click="isTestDay = !isTestDay"
          :title="isTestDay ? 'Deactivate Test Day' : 'Activate Test Day'"
        >
          <component :is="isTestDay ? CalendarCheck : Calendar" :size="20" />
          <span class="dashboard__test-day-label">Test Day</span>
        </button>

        <!-- QR Scanner Toggle -->
        <button 
          v-if="activeClass && showScannerButton"
          class="dashboard__qr-btn" 
          @click="isScannerOpen = !isScannerOpen"
          :class="{ 'dashboard__qr-btn--active': isScannerOpen }"
          title="Toggle Student Kiosk Scanner"
        >
          <Scan :size="20" />
          <span class="dashboard__qr-label">Scanner</span>
        </button>

        <UndoButton />

        <!-- Toggle Unassigned Roster Button -->
        <button 
          v-if="activeClass"
          class="dashboard__pool-toggle" 
          @click="isPoolOpen = !isPoolOpen"
          :class="{ 'dashboard__pool-toggle--active': isPoolOpen }"
          title="Toggle Unassigned Students Roster"
        >
          <Users :size="20" />
          <span class="dashboard__pool-toggle-label">Unassigned</span>
        </button>
      </div>
    </header>

    <!-- ── QR Scanner Component ─── -->
    <!-- MOVED TO App.vue for persistence -->

    <!-- ── Content area ─────────────────────────────────────────────── -->
    <div class="dashboard__content">

      <!-- Grid fills all remaining space -->
      <section class="dashboard__grid-area" aria-label="Seating chart">
        <!-- Test Day Active Banner -->
        <div v-if="activeClass && isTestDay" class="dashboard__test-day-banner">
          <div class="dashboard__test-day-banner-content">
            <CalendarCheck :size="16" class="dashboard__test-day-banner-icon" />
            <span class="dashboard__test-day-banner-text">
              <strong>Test Day Active</strong> — Attendance, lates, hall departures & incidents are tagged for evaluation analytics.
            </span>
          </div>
          <button class="dashboard__test-day-banner-dismiss" @click="isTestDay = false" title="Turn off Test Day">
            Turn Off
          </button>
        </div>

        <SeatingGrid v-if="activeClass" />
        <div v-else-if="classList.length === 0" class="dashboard__getting-started">
          <div class="dashboard__getting-started-card">
            <GettingStartedGuide />
            <div class="dashboard__getting-started-actions">
              <button class="dashboard__go-setup" @click="emit('navigate', 'Setup')">
                Go to Setup & Import CSV →
              </button>
            </div>
          </div>
        </div>
        <div v-else class="dashboard__empty">
          <p class="dashboard__empty-title">No class selected</p>
          <p class="dashboard__empty-sub">Go to <strong>Setup</strong> to select or create a class.</p>
          <button class="dashboard__go-setup" @click="emit('navigate', 'Setup')">Go to Setup →</button>
        </div>
      </section>

      <!-- Pool: fixed-width scrollable column to the right of the grid -->
      <Transition name="pop-pool">
        <aside v-if="activeClass && isPoolOpen" class="dashboard__pool" aria-label="Unassigned students">
          <div class="dashboard__pool-header">
            <h3 class="dashboard__pool-title">Unassigned ({{ unseatedStudents.length }})</h3>
            <button 
              class="dashboard__pool-auto-assign"
              title="Automatically assign seats"
              @click="onAutoAssign"
            >
              Auto
            </button>
          </div>
          <div 
            class="dashboard__pool-list"
            @dragover.prevent="isPoolDragOver = true"
            @dragleave.prevent="isPoolDragOver = false"
            @drop.prevent="onPoolDrop"
            :class="{ 'dashboard__pool-list--drop': isPoolDragOver }"
          >
            <div v-if="unseatedStudents.length === 0" class="dashboard__pool-empty">
              Drag a student here to remove from seat.
            </div>
            <div
              v-for="s in unseatedStudents"
              :key="s.studentId"
              class="dashboard__pool-item"
              draggable="true"
              @dragstart="onDragStart($event, s)"
            >
              <span class="dashboard__pool-name">{{ s.firstName }} {{ s.lastName }}</span>
              <GripVertical :size="16" class="dashboard__pool-drag" />
            </div>
          </div>
        </aside>
      </Transition>

    </div>

    <!-- ── Radial menu overlay (Teleport is inside the component) ─── -->
    <RadialMenu />

    <!-- ── Event Note Modal ─────────────────────────────────────────── -->
    <EventNoteModal
      v-if="!isAssessmentCode"
      v-model="noteModalOpen"
      :student-name="pendingStudentName"
      :behavior-code="pendingNoteCode"
      @save="onNoteSave"
      @cancel="onNoteCancel"
    />

    <AssessmentConversationModal
      v-slot:modal v-if="isAssessmentCode"
      v-model="noteModalOpen"
      :student-name="pendingStudentName"
      :active-class="activeClass"
      @save="onAssessmentSave"
      @cancel="onNoteCancel"
    />

    <!-- ── Student Profile Modal ────────────────────────────────────── -->
    <StudentProfileModal
      v-if="profileModalOpen && profileStudentId"
      v-model="profileModalOpen"
      :student-id="profileStudentId"
      :class-id="profileClassId"
    />

  </div>
</template>

<script setup>
/**
 * Dashboard.vue — View A: Active Instruction
 *
 * Wires SeatingGrid, RadialMenu, ClassSwitcher, and UndoButton together.
 * CLAUDE.md §4: no direct src/db/ imports.
 *
 * Update 01:
 *  - Mounts EventNoteModal: shown when useRadial.pendingNoteCode is set
 *  - Mounts StudentProfileModal: shown when useRadial.profileStudent is set
 */

import { ref, computed, watch } from 'vue'
import ClassSwitcher       from '../components/ClassSwitcher.vue'
import SeatingGrid         from '../components/SeatingGrid.vue'
import RadialMenu          from '../components/RadialMenu.vue'
import UndoButton          from '../components/UndoButton.vue'
import EventNoteModal      from '../components/EventNoteModal.vue'
import AssessmentConversationModal from '../components/AssessmentConversationModal.vue'
import StudentProfileModal from '../components/StudentProfileModal.vue'
import { Toilet, Users, GripVertical, Calendar, CalendarCheck, Scan } from 'lucide-vue-next'
import { useClassroom }    from '../composables/useClassroom.js'
import { useRadial }       from '../composables/useRadial.js'
import { loadGradebook }   from '../composables/useGradebook.js'
import GettingStartedGuide from '../components/setup/GettingStartedGuide.vue'

const emit = defineEmits(['navigate'])

const {
  activeClass,
  classList,
  studentsOut,
  unseatedStudents,
  assignSeat,
  autoAssignSeats,
  students,
  behaviorCodes,
  logStandardEvent,
  logAssessmentEvent,
  isTestDay,
  isScannerOpen,
  showScannerButton,
  getClass,
} = useClassroom()

watch(() => activeClass.value?.classId, async (newClassId) => {
  if (newClassId) {
    const cls = await getClass(newClassId)
    if (cls) {
      await loadGradebook(cls)
    }
  }
}, { immediate: true })

const {
  pendingNoteCode,
  pendingNoteStudent,
  profileStudent,
} = useRadial()

// ─── pool panel ───────────────────────────────────────────────────────────────

const isPoolDragOver = ref(false)
const isPoolOpen     = ref(unseatedStudents.value.length > 0)

function onDragStart(evt, student) {
  evt.dataTransfer.effectAllowed = 'move'
  evt.dataTransfer.setData('text/plain', JSON.stringify({
    studentId: student.studentId
  }))
}

async function onPoolDrop(evt) {
  isPoolDragOver.value = false
  const data = evt.dataTransfer.getData('text/plain')
  if (!data) return
  
  try {
    const payload = JSON.parse(data)
    if (payload.studentId && payload.fromRow !== undefined) {
      await assignSeat(payload.studentId, null)
    }
  } catch (err) {
    // ignore
  }
}

async function onAutoAssign() {
  await autoAssignSeats()
}

// ─── behavior codes map for passing to StudentProfileModal ────────────────────

const behaviorCodesMap = computed(() =>
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)

// ─── Assessment / Note Modal Logic ──────────────────────────────────────────

const noteModalOpen = ref(false)

const isAssessmentCode = computed(() => pendingNoteCode.value?.codeKey === 'ac')

// Derived display name for the pending student
const pendingStudentName = computed(() => {
  const s = pendingNoteStudent.value
  if (!s) return ''
  const data = students.value[s.studentId]
  if (!data) return s.studentId
  return `${data.firstName} ${data.lastName}`
})

// Watch: when a requiresNote code is intercepted, open the modal
watch(pendingNoteCode, (code) => {
  if (code) noteModalOpen.value = true
})

async function onNoteSave(note) {
  const student = pendingNoteStudent.value
  const code    = pendingNoteCode.value
  if (!student || !code) return

  await logStandardEvent(student.studentId, code.codeKey, note)

  // Clear pending state
  pendingNoteCode.value    = null
  pendingNoteStudent.value = null
}

async function onAssessmentSave({ note, acType, acContext, acOutcome, unitId, expectationId, nextSteps }) {
  const student = pendingNoteStudent.value
  if (!student) return

  await logAssessmentEvent({
    studentId: student.studentId,
    note,
    acType,
    acContext,
    acOutcome,
    unitId,
    expectationId,
    nextSteps
  })

  // Clear pending state
  pendingNoteCode.value    = null
  pendingNoteStudent.value = null
}

function onNoteCancel() {
  pendingNoteCode.value    = null
  pendingNoteStudent.value = null
}

// ─── Student Profile Modal ────────────────────────────────────────────────────

const profileModalOpen  = ref(false)
const profileStudentId  = ref('')
const profileClassId    = ref('')

// Watch: when the radial sets profileStudent, open the modal
watch(profileStudent, (student) => {
  if (!student) return
  profileStudentId.value  = student.studentId
  profileClassId.value    = student.classId
  profileModalOpen.value  = true
  // Clear the radial ref so subsequent taps register correctly
  profileStudent.value = null
})
</script>

<style scoped>
.dashboard {
  display:        flex;
  flex-direction: column;
  flex:           1;
  height:         100%;
  overflow:       hidden;
}

/* ── Header ──────────────────────────────────────────────────────── */
.dashboard__header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         10px 16px;
  background:      var(--surface);
  box-shadow:      var(--shadow-sm);
  gap:             12px;
  flex-shrink:     0;
}

.dashboard__header-right {
  display:     flex;
  align-items: center;
  gap:         10px;
}

@media (max-width: 1000px) {
  .dashboard__header-right {
    gap: 6px;
  }
  .dashboard__pool-toggle,
  .dashboard__test-day-btn,
  .dashboard__out-badge {
    padding: 8px 10px;
    min-width: 44px;
    justify-content: center;
  }
}

/* Pool Toggle Button */
.dashboard__pool-toggle {
  display:         flex;
  align-items:     center;
  justify-content: center;
  gap:             6px;
  padding:         8px 12px;
  background:      var(--bg-secondary);
  border:          1px solid var(--border);
  border-radius:   var(--radius-md);
  font-size:       0.85rem;
  font-weight:     600;
  color:           var(--text);
  cursor:          pointer;
  min-height:      44px;
  transition:      all 0.15s ease;
}

.dashboard__pool-toggle:hover {
  background: var(--border);
}

.dashboard__pool-toggle--active {
  background:   var(--primary-light);
  border-color: var(--primary);
  color:        var(--primary);
}

@media (max-width: 1000px) {
  .dashboard__pool-toggle-label {
    display: none;
  }
}

/* Test Day Button */
.dashboard__test-day-btn {
  display:         flex;
  align-items:     center;
  justify-content: center;
  gap:             6px;
  padding:         8px 12px;
  background:      var(--bg-secondary);
  border:          1px solid var(--border);
  border-radius:   var(--radius-md);
  font-size:       0.85rem;
  font-weight:     600;
  color:           var(--text);
  cursor:          pointer;
  min-height:      44px;
  transition:      all 0.15s ease;
}

.dashboard__test-day-btn:hover {
  background: var(--border);
}

.dashboard__test-day-btn--active {
  background:   #ff9500;
  border-color: #ff9500;
  color:        #fff;
}

@media (max-width: 1000px) {
  .dashboard__pool-toggle-label,
  .dashboard__test-day-label,
  .dashboard__qr-label {
    display: none;
  }
}

/* Students-out badge */
.dashboard__out-badge {
  display:       flex;
  align-items:   center;
  gap:           5px;
  padding:       6px 12px;
  border-radius: var(--radius-md);
  background:    rgba(255, 59, 48, 0.1);
  color:         var(--state-out);
  font-size:     0.85rem;
  font-weight:   600;
  min-height:    44px;
}

/* QR Scanner Button */
.dashboard__qr-btn {
  display:         flex;
  align-items:     center;
  justify-content: center;
  gap:             6px;
  padding:         8px 12px;
  background:      var(--bg-secondary);
  border:          1px solid var(--border);
  border-radius:   var(--radius-md);
  font-size:       0.85rem;
  font-weight:     600;
  color:           var(--text);
  cursor:          pointer;
  min-height:      44px;
  transition:      all 0.15s ease;
}

.dashboard__qr-btn:hover {
  background: var(--border);
}

.dashboard__qr-btn--active {
  background:   var(--primary-light);
  border-color: var(--primary);
  color:        var(--primary);
}

/* ── Grid area ───────────────────────────────────────────────────── */
.dashboard__grid-area {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
  padding:        8px;
  min-height:     0;
}

/* ── Test Day Active Banner ────────────────────────────────────────── */
.dashboard__test-day-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.12));
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.84rem;
  backdrop-filter: blur(8px);
}

.dashboard__test-day-banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dashboard__test-day-banner-icon {
  color: #6366f1;
  flex-shrink: 0;
}

.dashboard__test-day-banner-text {
  line-height: 1.3;
}

.dashboard__test-day-banner-dismiss {
  background: rgba(99, 102, 241, 0.14);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.dashboard__test-day-banner-dismiss:hover {
  background: #6366f1;
  color: white;
}

/* ── Empty state ─────────────────────────────────────────────────── */
.dashboard__empty {
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  justify-content: center;
  gap:             12px;
  height:          100%;
  color:           var(--text-secondary);
  text-align:      center;
  padding:         40px;
}

.dashboard__empty-title {
  font-size:   1.2rem;
  font-weight: 600;
  color:       var(--text);
}

.dashboard__empty-sub {
  font-size: 0.9rem;
}

.dashboard__go-setup {
  margin-top:    8px;
  padding:       12px 24px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--primary);
  color:         #fff;
  font-size:     0.95rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
  transition:    opacity 0.15s ease;
}

.dashboard__go-setup:active {
  opacity: 0.8;
}

/* ── Content Layout ─────────────────────────────────────────────── */
.dashboard__content {
  display:        flex;
  flex-direction: row;
  flex:           1;
  overflow:       hidden;
}

/* ── Pool — scrollable right-hand column ──────────────────────── */
.dashboard__pool {
  width:          200px;
  flex-shrink:    0;
  display:        flex;
  flex-direction: column;
  border-left:    1px solid var(--border);
  background:     var(--surface);
  box-shadow:     -2px 0 8px rgba(0,0,0,0.06);
  overflow:       hidden;
}

.dashboard__pool-header {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  padding:         6px 12px;
  background:      var(--bg-secondary);
  border-bottom:   1px solid var(--border);
}

.dashboard__pool-title {
  font-size:     0.8rem;
  font-weight:   700;
  color:         var(--text-secondary);
  margin:        0;
}

.dashboard__pool-auto-assign {
  background:    var(--primary);
  color:         white;
  border:        none;
  border-radius: var(--radius-sm);
  padding:       4px 8px;
  font-size:     0.75rem;
  font-weight:   600;
  cursor:        pointer;
  transition:    background 0.15s ease, transform 0.1s ease;
}

.dashboard__pool-auto-assign:hover {
  background:    var(--primary-hover);
}

.dashboard__pool-auto-assign:active {
  transform:     scale(0.95);
}

.dashboard__pool-list {
  flex:           1;
  overflow-y:     auto;
  padding:        6px;
  display:        flex;
  flex-direction: column;
  gap:            4px;
  transition:     background 0.2s ease;
}

.dashboard__pool-empty {
  padding:       20px 10px;
  text-align:    center;
  color:         var(--text-secondary);
  font-size:     0.8rem;
  border:        2px dashed var(--border);
  border-radius: var(--radius-sm);
  margin:        6px;
}

.dashboard__pool-list--drop {
  background: var(--primary-light);
}

.dashboard__pool-item {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         6px 10px;
  background:      var(--bg-secondary);
  border-radius:   var(--radius-sm);
  cursor:          grab;
  user-select:     none;
  border:          1px solid transparent;
  transition:      border-color 0.15s ease, box-shadow 0.15s ease;
}

.dashboard__pool-item:hover {
  border-color: var(--border);
  box-shadow:   var(--shadow-sm);
}

.dashboard__pool-item:active {
  cursor: grabbing;
}

.dashboard__pool-name {
  font-size:     0.82rem;
  font-weight:   600;
  color:         var(--text);
  white-space:   nowrap;
  overflow:      hidden;
  text-overflow: ellipsis;
}

.dashboard__pool-drag {
  color:     var(--text-secondary);
  font-size: 1rem;
}

/* ── Transitions ─────────────────────────────────────────────────── */
.pop-pool-enter-active,
.pop-pool-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pop-pool-enter-from,
.pop-pool-leave-to {
  opacity:   0;
  transform: scale(0.92) translateY(8px);
  transform-origin: bottom right;
}

/* Getting Started / Onboarding */
.dashboard__getting-started {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px 16px;
  overflow-y: auto;
  height: 100%;
}

.dashboard__getting-started-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  max-width: 900px;
  width: 100%;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard__getting-started-actions {
  display: flex;
  justify-content: center;
  margin-top: 12px;
  border-top: 1px solid var(--border);
  padding-top: 24px;
}
</style>
