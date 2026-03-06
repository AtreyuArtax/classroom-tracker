<template>
  <div
    class="seating-grid"
    :style="gridContainerStyle"
    aria-label="Classroom seating chart"
  >
    <template v-for="row in gridSize.rows" :key="row">
      <DeskTile
        v-for="col in gridSize.cols"
        :key="`${row}-${col}`"
        :row="row"
        :col="col"
        :student-id="seatMap[`${row}-${col}`] ?? null"
        :student="seatMap[`${row}-${col}`] ? students[seatMap[`${row}-${col}`]] : null"
        :class-id="activeClass?.classId ?? ''"
        @seat-drop="onSeatDrop"
      />
    </template>
  </div>
</template>

<script setup>
/**
 * SeatingGrid.vue
 *
 * Renders the full CSS Grid of DeskTile components.
 *
 * CLAUDE.md rules:
 *  §4  — No src/db/ imports; uses useClassroom composable only
 *  §11 — Grid resize handled by checkResize/confirmResize in useClassroom
 *  §2  — CSS custom properties only; grid dimensions bound to settings
 *
 * Seat assignment during drag-and-drop:
 *  - DeskTile emits 'seat-drop' with { studentId, fromRow, fromCol, toRow, toCol, toStudentId }
 *  - SeatingGrid calls useClassroom.assignSeat() for the move (and swap if target occupied)
 */

import { computed } from 'vue'
import DeskTile       from './DeskTile.vue'
import { useClassroom } from '../composables/useClassroom.js'

const { gridSize, students, activeClass, assignSeat } = useClassroom()

// ─── computed ─────────────────────────────────────────────────────────────────

/** Map of "row-col" → studentId for quick seat lookup */
const seatMap = computed(() => {
  const map = {}
  for (const [studentId, s] of Object.entries(students.value)) {
    if (s.seat) {
      map[`${s.seat.row}-${s.seat.col}`] = studentId
    }
  }
  return map
})

const gridContainerStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridSize.value.cols}, 1fr)`,
  gridTemplateRows:    `repeat(${gridSize.value.rows}, 1fr)`,
}))

// ─── drag-and-drop seat swapping ──────────────────────────────────────────────

/**
 * Handle a DeskTile seat-drop event.
 * Moves the dragged student to the target cell.
 * If the target is occupied, swaps the two students.
 */
async function onSeatDrop({ studentId, fromRow, fromCol, toRow, toCol, toStudentId }) {
  const toSeat   = { row: toRow, col: toCol }
  const fromSeat = { row: fromRow, col: fromCol }

  // Move dragged student to target cell
  await assignSeat(studentId, toSeat)

  // If target was occupied, move that student to the dragged student's old cell
  if (toStudentId) {
    await assignSeat(toStudentId, fromSeat)
  }
}
</script>

<style scoped>
.seating-grid {
  display: grid;
  gap:     8px;
  padding: 12px;

  /* Grid fills the available space in the dashboard */
  width:  100%;
  height: 100%;
}
</style>
