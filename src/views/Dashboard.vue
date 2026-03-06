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
        <UndoButton />
      </div>
    </header>

    <!-- ── Seating grid ─────────────────────────────────────────────── -->
    <section class="dashboard__grid-area" aria-label="Seating chart">
      <SeatingGrid v-if="activeClass" />
      <div v-else class="dashboard__empty">
        <p class="dashboard__empty-title">No class selected</p>
        <p class="dashboard__empty-sub">Go to <strong>Setup</strong> to create your first class.</p>
        <button class="dashboard__go-setup" @click="emit('navigate', 'Setup')">Go to Setup →</button>
      </div>
    </section>

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

const emit = defineEmits(['navigate'])

const { activeClass, studentsOut } = useClassroom()
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
</style>
