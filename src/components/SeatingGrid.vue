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

const { gridSize, students, activeClass, assignSeat, swapSeats, studentWeeklyStats } = useClassroom()

// ─── computed ─────────────────────────────────────────────────────────────────

/** Map of "row-col" → studentId for quick seat lookup */
const seatMap = computed(() => {
  const map = {}
  for (const [id, s] of Object.entries(students.value ?? {})) {
    if (s.seat && !s.archived) {
      map[`${s.seat.row}-${s.seat.col}`] = id
    }
  }
  return map
})

/** Table Pods lookup: "row-col" -> pod object */
const podMap = computed(() => {
  const map = {}
  const pods = activeClass.value?.layoutConfig?.pods || []
  pods.forEach(pod => {
    (pod.desks || []).forEach(d => {
      map[`${d.row}-${d.col}`] = pod
    })
  })
  return map
})

function getPod(row, col) {
  return podMap.value[`${row}-${col}`] || null
}

function getPodWrapperStyle(row, col) {
  const pod = getPod(row, col)
  if (!pod) return {}
  return {
    outline: `2px solid ${pod.color}`,
    outlineOffset: '-2px',
    backgroundColor: `${pod.color}15`
  }
}

/** Check if a cell is an aisle */
function isAisle(row, col) {
  const layout = activeClass.value?.layoutConfig
  if (!layout) return false
  if (layout.cellTypes?.[`${row}-${col}`] === 'aisle') return true
  const aisles = layout.aisles
  if (aisles?.columns && aisles.columns.includes(col)) return true
  if (aisles?.rows && aisles.rows.includes(row)) return true
  return false
}

/** Grid style mapping custom column widths for aisles (at least half as wide to save space) */
const gridContainerStyle = computed(() => {
  const cols = gridSize.value.cols
  const rows = gridSize.value.rows
  const layout = activeClass.value?.layoutConfig || {}
  const cellTypes = layout.cellTypes || {}
  const legacyColAisles = layout.aisles?.columns || []

  const colTracks = []
  for (let c = 1; c <= cols; c++) {
    let isAisleCol = legacyColAisles.includes(c)
    if (!isAisleCol) {
      let allAisles = true
      let hasAisle = false
      let hasStudent = false

      for (let r = 1; r <= rows; r++) {
        if (isAisle(r, c)) {
          hasAisle = true
        } else {
          allAisles = false
        }
        if (seatMap.value[`${r}-${c}`]) {
          hasStudent = true
        }
      }

      if (allAisles) {
        isAisleCol = true
      } else if (hasAisle && !hasStudent) {
        let onlyAislesAndEmpty = true
        for (let r = 1; r <= rows; r++) {
          if (!isAisle(r, c) && cellTypes[`${r}-${c}`] === 'seat') {
            onlyAislesAndEmpty = false
            break
          }
        }
        if (onlyAislesAndEmpty) isAisleCol = true
      }
    }

    // Aisle column: ultra-compact (0.2fr = 20% of regular desk width)
    colTracks.push(isAisleCol ? 'minmax(14px, 0.2fr)' : '1fr')
  }

  // Row tracks: narrow aisle rows to 0.2fr as well
  const rowTracks = []
  const legacyRowAisles = layout.aisles?.rows || []
  for (let r = 1; r <= rows; r++) {
    let isAisleRow = legacyRowAisles.includes(r)
    if (!isAisleRow) {
      let allAisles = true
      for (let c = 1; c <= cols; c++) {
        if (!isAisle(r, c)) {
          allAisles = false
          break
        }
      }
      if (allAisles) isAisleRow = true
    }
    rowTracks.push(isAisleRow ? 'minmax(12px, 0.2fr)' : '1fr')
  }

  return {
    gridTemplateColumns: colTracks.join(' '),
    gridTemplateRows: rowTracks.join(' '),
  }
})

// ─── drag-and-drop seat swapping ──────────────────────────────────────────────

async function onSeatDrop({ studentId, fromRow, fromCol, toRow, toCol, toStudentId }) {
  if (isAisle(toRow, toCol)) return // Ignore drops onto aisle cells

  const toSeat = { row: toRow, col: toCol }
  const fromSeat = (fromRow !== undefined && fromCol !== undefined) 
    ? { row: fromRow, col: fromCol } 
    : null

  await swapSeats(studentId, toSeat, toStudentId || null, toStudentId ? fromSeat : null)
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
