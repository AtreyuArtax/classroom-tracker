<template>
  <div class="dashboard">

    <!-- ── Header ──────────────────────────────────────────────────── -->
    <header class="dashboard__header">
      <ClassSwitcher @navigate="emit('navigate', $event)" />

      <div class="dashboard__header-right">
        <!-- Students-out badge -->
        <div v-if="studentsOut.length > 0" class="dashboard__out-badge" aria-live="polite">
          <span aria-hidden="true">🚽</span>
          {{ studentsOut.length }} out
        </div>
        
        <!-- Toggle Pool Button -->
        <button 
          v-if="activeClass"
          class="dashboard__pool-toggle" 
          @click="isPoolOpen = !isPoolOpen"
          :class="{ 'dashboard__pool-toggle--active': isPoolOpen }"
          title="Toggle Unassigned List"
        >
          <span aria-hidden="true">👥</span>
          <span class="dashboard__pool-toggle-label">Pool</span>
        </button>

        <UndoButton />
      </div>
    </header>

    <!-- ── Content area ─────────────────────────────────────────────── -->
    <div class="dashboard__content">
      <section class="dashboard__grid-area" aria-label="Seating chart">
        <SeatingGrid v-if="activeClass" />
        <div v-else class="dashboard__empty">
          <p class="dashboard__empty-title">No class selected</p>
          <p class="dashboard__empty-sub">Go to <strong>Setup</strong> to create your first class.</p>
          <button class="dashboard__go-setup" @click="emit('navigate', 'Setup')">Go to Setup →</button>
        </div>
      </section>

      <!-- ── Unassigned Pool (Drag source & Drop target) ────────────── -->
      <Transition name="slide-pool">
        <aside v-if="activeClass && isPoolOpen" class="dashboard__pool" aria-label="Unassigned students">
          <h3 class="dashboard__pool-title">Unassigned ({{ unseatedStudents.length }})</h3>
        <div 
          class="dashboard__pool-list"
          @dragover.prevent="isPoolDragOver = true"
          @dragleave.prevent="isPoolDragOver = false"
          @drop.prevent="onPoolDrop"
          :class="{ 'dashboard__pool-list--drop': isPoolDragOver }"
        >
          <div v-if="unseatedStudents.length === 0" class="dashboard__pool-empty">
            Drag a student here to remove them from their seat.
          </div>
          <div
            v-for="s in unseatedStudents"
            :key="s.studentId"
            class="dashboard__pool-item"
            draggable="true"
            @dragstart="onDragStart($event, s)"
          >
            <span class="dashboard__pool-name">{{ s.firstName }} {{ s.lastName }}</span>
            <span class="dashboard__pool-drag" aria-hidden="true">≡</span>
          </div>
        </div>
      </aside>
      </Transition>
    </div>

    <!-- ── Radial menu overlay (Teleport is inside the component) ─── -->
    <RadialMenu />

  </div>
</template>

<script setup>
/**
 * Dashboard.vue — View A: Active Instruction
 *
 * Wires SeatingGrid, RadialMenu, ClassSwitcher, and UndoButton together.
 * CLAUDE.md §4: no direct src/db/ imports.
 */

import ClassSwitcher from '../components/ClassSwitcher.vue'
import SeatingGrid   from '../components/SeatingGrid.vue'
import RadialMenu    from '../components/RadialMenu.vue'
import UndoButton    from '../components/UndoButton.vue'
import { useClassroom } from '../composables/useClassroom.js'
import { ref } from 'vue'

const emit = defineEmits(['navigate'])

const { activeClass, studentsOut, unseatedStudents, assignSeat } = useClassroom()

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
    // If dropping a student from the grid back into the pool, unassign their seat
    if (payload.studentId && payload.fromRow !== undefined) {
      await assignSeat(payload.studentId, null)
    }
  } catch (err) {
    // ignore
  }
}
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

@media (max-width: 480px) {
  .dashboard__pool-toggle-label {
    display: none; /* Hide 'Pool' text on very small screens to save header space */
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

/* ── Grid area ───────────────────────────────────────────────────── */
.dashboard__grid-area {
  flex:     1;
  overflow: auto;
  padding:  8px;
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

/* ── Content Layout ──────────────────────────────────────────────── */
.dashboard__content {
  display:        flex;
  flex:           1;
  overflow:       hidden;
  flex-direction: column; /* Stack on mobile: grid top, pool bottom */
}

@media (min-width: 768px) {
  .dashboard__content {
    flex-direction: row; /* Side-by-side on desktop */
  }
}

/* ── Pool ────────────────────────────────────────────────────────── */
.dashboard__pool {
  background:     var(--surface);
  border-top:     1px solid var(--border);
  display:        flex;
  flex-direction: column;
  flex-shrink:    0;
  max-height:     28vh; /* Reduced height on mobile to leave grid space */
}

@media (min-width: 768px) {
  .dashboard__pool {
    width:        220px; /* Reduced width to leave grid space */
    max-height:   none;
    border-top:   none;
    border-left:  1px solid var(--border);
    box-shadow:   -2px 0 8px rgba(0, 0, 0, 0.05);
  }
}

.dashboard__pool-title {
  font-size:     0.8rem;
  font-weight:   700;
  color:         var(--text-secondary);
  padding:       10px 12px;
  background:    var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  margin:        0;
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
  padding:         6px 10px; /* Denser padding */
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
  font-size:     0.82rem; /* Denser font */
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
.slide-pool-enter-active,
.slide-pool-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

/* On desktop, pool slides in from the right */
@media (min-width: 768px) {
  .slide-pool-enter-from,
  .slide-pool-leave-to {
    opacity: 0;
    transform: translateX(30px);
  }
}

/* On mobile, pool slides in from the bottom */
@media (max-width: 767px) {
  .slide-pool-enter-from,
  .slide-pool-leave-to {
    opacity: 0;
    transform: translateY(30px);
  }
}
</style>
