/**
 * Compares a student's survey seating preference against their actual seat.
 *
 * Only the "Front near the board / screen" preference is checked: it is the
 * one the seating grid can answer reliably. The front of the room is the
 * BOTTOM of the on-screen grid, so the front rows are the highest-numbered
 * rows. Rows are ranked among rows that actually hold a seated student, so
 * empty rows at the front edge of the grid don't push students "back".
 */

/** How many occupied rows (counted from the front) satisfy a front-row request. */
export const FRONT_ROW_DEPTH = 2

export function isFrontPreference(preference) {
  return /front/i.test(preference || '')
}

function isSeatInGrid(seat, classRecord) {
  if (!seat || typeof seat.row !== 'number' || typeof seat.col !== 'number') return false
  const maxRows = classRecord?.gridSize?.rows || 6
  const maxCols = classRecord?.gridSize?.cols || 6
  if (seat.row < 1 || seat.row > maxRows) return false
  if (seat.col < 1 || seat.col > maxCols) return false
  return classRecord?.layoutConfig?.cellTypes?.[`${seat.row}-${seat.col}`] !== 'aisle'
}

/**
 * @param {string} studentId
 * @param {Object|null} classRecord  class with `students`, `gridSize`, `layoutConfig`
 * @param {string} preference        survey seatingPreference value
 * @param {number} [depth]
 * @returns {{ status: 'na'|'unseated'|'met'|'unmet', rowFromFront: number|null }}
 *   rowFromFront is 1 for the front-most occupied row.
 */
export function getFrontSeatStatus(studentId, classRecord, preference, depth = FRONT_ROW_DEPTH) {
  if (!isFrontPreference(preference) || !classRecord?.students) {
    return { status: 'na', rowFromFront: null }
  }

  const seat = classRecord.students[studentId]?.seat
  if (!isSeatInGrid(seat, classRecord)) {
    return { status: 'unseated', rowFromFront: null }
  }

  const occupiedRows = new Set()
  for (const s of Object.values(classRecord.students)) {
    if (s?.archived) continue
    if (isSeatInGrid(s?.seat, classRecord)) occupiedRows.add(s.seat.row)
  }
  const rowsFrontToBack = [...occupiedRows].sort((a, b) => b - a)
  const rowFromFront = rowsFrontToBack.indexOf(seat.row) + 1

  return { status: rowFromFront <= depth ? 'met' : 'unmet', rowFromFront }
}
