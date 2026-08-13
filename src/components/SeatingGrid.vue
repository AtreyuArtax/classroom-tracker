<template>
  <div
    class="seating-grid"
    :style="gridContainerStyle"
    aria-label="Classroom seating chart"
  >
    <template v-for="row in gridSize.rows" :key="row">
      <template v-for="col in gridSize.cols" :key="`${row}-${col}`">
        <!-- Aisle walkway cell -->
        <div 
          v-if="isAisle(row, col)"
          class="seating-grid__aisle-cell"
          aria-hidden="true"
        />

        <!-- Student seat desk tile -->
        <div 
          v-else 
          class="seating-grid__tile-wrapper"
          :style="getPodWrapperStyle(row, col)"
        >
          <!-- Pod badge -->
          <span 
            v-if="getPod(row, col)" 
            class="seating-grid__pod-badge" 
            :style="{ backgroundColor: getPod(row, col).color }"
          >
            {{ getPod(row, col).name }}
          </span>

          <DeskTile
            :row="row"
            :col="col"
            v-memo="[
              seatMap[`${row}-${col}`] ?? null,
              students[seatMap[`${row}-${col}`]]?.activeStates?.isOut,
              students[seatMap[`${row}-${col}`]]?.activeStates?.isAbsent,
              students[seatMap[`${row}-${col}`]]?.activeStates?.lateMs,
              students[seatMap[`${row}-${col}`]]?.lastEvent?.ts,
              studentWeeklyStats[seatMap[`${row}-${col}`]]?.washroomTrips,
              studentWeeklyStats[seatMap[`${row}-${col}`]]?.deviceIncidents,
            ]"
            :student-id="seatMap[`${row}-${col}`] ?? null"
            :student="seatMap[`${row}-${col}`] ? students[seatMap[`${row}-${col}`]] : null"
            :class-id="activeClass?.classId ?? ''"
            @seat-drop="onSeatDrop"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * SeatingGrid.vue
 *
 * Renders the full CSS Grid of DeskTile components with custom layoutConfig support (aisles & table pods).
 */

import { computed } from 'vue'
import DeskTile       from './DeskTile.vue'
import { useClassroom } from '../composables/useClassroom.js'

const { gridSize, students, activeClass, assignSeat, studentWeeklyStats } = useClassroom()

// ─── computed ─────────────────────────────────────────────────────────────────

/** Map of "row-col" → studentId for quick seat lookup */
const seatMap = computed(() => {
  const map = {}
  for (const [studentId, s] of Object.entries(students.value)) {
    if (s.seat && !s.archived) {
      map[`${s.seat.row}-${s.seat.col}`] = studentId
    }
  }
  return map
})

const layoutConfig = computed(() => activeClass.value?.layoutConfig || {})

function isAisle(row, col) {
  return layoutConfig.value.cellTypes?.[`${row}-${col}`] === 'aisle'
}

function getPod(row, col) {
  const key = `${row}-${col}`
  return layoutConfig.value.pods?.find(p => p.cells?.includes(key)) || null
}

function getPodWrapperStyle(row, col) {
  const pod = getPod(row, col)
  if (!pod) return {}
  return {
    borderColor: pod.color,
    boxShadow: `0 0 0 1px ${pod.color}`
  }
}

const gridContainerStyle = computed(() => {
  const cols = gridSize.value.cols
  const rows = gridSize.value.rows
  const cellTypes = layoutConfig.value.cellTypes || {}

  // Check if an entire column consists of aisles
  const colTracks = []
  for (let c = 1; c <= cols; c++) {
    let isFullAisleCol = true
    for (let r = 1; r <= rows; r++) {
      if (cellTypes[`${r}-${c}`] !== 'aisle') {
        isFullAisleCol = false
        break
      }
    }
    colTracks.push(isFullAisleCol ? '0.35fr' : '1fr')
  }

  return {
    gridTemplateColumns: colTracks.join(' '),
    gridTemplateRows: `repeat(${rows}, 1fr)`,
  }
})

// ─── drag-and-drop seat swapping ──────────────────────────────────────────────

async function onSeatDrop({ studentId, fromRow, fromCol, toRow, toCol, toStudentId }) {
  if (isAisle(toRow, toCol)) return // Ignore drops onto aisle cells

  const toSeat = { row: toRow, col: toCol }
  const fromSeat = (fromRow !== undefined && fromCol !== undefined) 
    ? { row: fromRow, col: fromCol } 
    : null

  await assignSeat(studentId, toSeat)

  if (toStudentId) {
    await assignSeat(toStudentId, fromSeat)
  }
}
</script>

<style scoped>
.seating-grid {
  display:    grid;
  gap:        6px;
  padding:    4px;
  width:      100%;
  height:     100%;
  flex:       1;
  min-height: 0;
}

.seating-grid__aisle-cell {
  background: transparent;
  border: none;
  pointer-events: none;
}

.seating-grid__tile-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.seating-grid__pod-badge {
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 5;
  font-size: 0.58rem;
  font-weight: 800;
  color: #ffffff;
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
</style>
