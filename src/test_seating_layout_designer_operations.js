import assert from 'node:assert/strict'

function pruneOrphanedLayout(cellTypesMap, podsList, rows, cols) {
  const prunedCellTypes = {}
  Object.entries(cellTypesMap || {}).forEach(([key, val]) => {
    const parts = key.split('-')
    if (parts.length === 2) {
      const r = Number(parts[0])
      const c = Number(parts[1])
      if (r >= 1 && r <= rows && c >= 1 && c <= cols) {
        prunedCellTypes[key] = val
      }
    }
  })

  const prunedPods = (podsList || []).map(pod => ({
    ...pod,
    cells: (pod.cells || []).filter(key => {
      const parts = key.split('-')
      if (parts.length !== 2) return false
      const r = Number(parts[0])
      const c = Number(parts[1])
      return r >= 1 && r <= rows && c >= 1 && c <= cols
    })
  }))

  return { prunedCellTypes, prunedPods }
}

function simulateInsertRow({ rows, cols, cellTypes, pods, students, atRowIndex }) {
  const seatUpdates = {}
  Object.entries(students).forEach(([sId, s]) => {
    if (s.seat && s.seat.row >= atRowIndex) {
      seatUpdates[sId] = { row: s.seat.row + 1, col: s.seat.col }
    }
  })

  const newCellTypes = {}
  Object.entries(cellTypes).forEach(([key, val]) => {
    const [r, c] = key.split('-').map(Number)
    if (r >= atRowIndex) {
      newCellTypes[`${r + 1}-${c}`] = val
    } else {
      newCellTypes[key] = val
    }
  })

  const newPods = pods.map(pod => ({
    ...pod,
    cells: pod.cells.map(key => {
      const [r, c] = key.split('-').map(Number)
      if (r >= atRowIndex) {
        return `${r + 1}-${c}`
      }
      return key
    })
  }))

  const newRows = rows + 1
  const newCols = cols
  const { prunedCellTypes, prunedPods } = pruneOrphanedLayout(newCellTypes, newPods, newRows, newCols)

  const updatedStudents = { ...students }
  Object.entries(seatUpdates).forEach(([sId, seat]) => {
    updatedStudents[sId] = { ...updatedStudents[sId], seat }
  })

  return {
    rows: newRows,
    cols: newCols,
    cellTypes: prunedCellTypes,
    pods: prunedPods,
    students: updatedStudents
  }
}

function simulateDeleteRow({ rows, cols, cellTypes, pods, students, atRowIndex }) {
  const seatUpdates = {}
  const displacedStudents = []

  Object.entries(students).forEach(([sId, s]) => {
    if (s.seat) {
      if (s.seat.row === atRowIndex) {
        seatUpdates[sId] = null
        displacedStudents.push(s)
      } else if (s.seat.row > atRowIndex) {
        seatUpdates[sId] = { row: s.seat.row - 1, col: s.seat.col }
      }
    }
  })

  const newCellTypes = {}
  Object.entries(cellTypes).forEach(([key, val]) => {
    const [r, c] = key.split('-').map(Number)
    if (r === atRowIndex) {
      // deleted
    } else if (r > atRowIndex) {
      newCellTypes[`${r - 1}-${c}`] = val
    } else {
      newCellTypes[key] = val
    }
  })

  const newPods = pods.map(pod => ({
    ...pod,
    cells: pod.cells
      .filter(key => {
        const [r] = key.split('-').map(Number)
        return r !== atRowIndex
      })
      .map(key => {
        const [r, c] = key.split('-').map(Number)
        if (r > atRowIndex) {
          return `${r - 1}-${c}`
        }
        return key
      })
  }))

  const newRows = rows - 1
  const newCols = cols
  const { prunedCellTypes, prunedPods } = pruneOrphanedLayout(newCellTypes, newPods, newRows, newCols)

  const updatedStudents = { ...students }
  Object.entries(seatUpdates).forEach(([sId, seat]) => {
    updatedStudents[sId] = { ...updatedStudents[sId], seat }
  })

  return {
    rows: newRows,
    cols: newCols,
    cellTypes: prunedCellTypes,
    pods: prunedPods,
    students: updatedStudents,
    displacedStudents
  }
}

console.log('--- RUNNING SEATING LAYOUT OPERATIONS TESTS ---')

// Test 1: Phantom Aisle Pruning
{
  const cellTypes = { '2-1': 'aisle', '2-6': 'aisle' }
  const pods = [{ id: 'p1', cells: ['3-1', '3-6'] }]
  
  // Shrink from 6 to 5 cols
  const { prunedCellTypes, prunedPods } = pruneOrphanedLayout(cellTypes, pods, 7, 5)
  assert.equal(prunedCellTypes['2-6'], undefined, 'Orphaned column 6 aisle must be pruned')
  assert.equal(prunedCellTypes['2-1'], 'aisle', 'In-bounds column 1 aisle must be preserved')
  assert.deepEqual(prunedPods[0].cells, ['3-1'], 'Orphaned cell 3-6 must be pruned from pod')
  console.log('✓ Test 1 Passed: Phantom aisle & pod pruning works')
}

// Test 2: Deleting empty top row (Row 1)
{
  const initial = {
    rows: 7,
    cols: 6,
    cellTypes: { '2-1': 'aisle', '2-2': 'aisle', '2-3': 'aisle', '2-4': 'aisle', '2-5': 'aisle', '2-6': 'aisle' },
    pods: [],
    students: {
      s1: { firstName: 'Helena', seat: { row: 3, col: 1 } },
      s2: { firstName: 'Brooke', seat: { row: 3, col: 6 } }
    },
    atRowIndex: 1
  }

  const result = simulateDeleteRow(initial)
  assert.equal(result.rows, 6, 'Rows should decrease from 7 to 6')
  assert.equal(result.displacedStudents.length, 0, 'No students should be displaced when deleting empty row')
  assert.deepEqual(result.students.s1.seat, { row: 2, col: 1 }, 'Helena should shift from row 3 to row 2')
  assert.deepEqual(result.students.s2.seat, { row: 2, col: 6 }, 'Brooke should shift from row 3 to row 2')
  assert.equal(result.cellTypes['1-1'], 'aisle', 'Row 2 aisle should now be at Row 1')
  assert.equal(result.cellTypes['2-1'], undefined, 'Old Row 2 coordinate should be replaced')
  console.log('✓ Test 2 Passed: Deleting empty top row shifts rows without displacing students')
}

// Test 3: Inserting row above Row 3
{
  const initial = {
    rows: 6,
    cols: 6,
    cellTypes: { '1-1': 'aisle' },
    pods: [],
    students: {
      s1: { firstName: 'Helena', seat: { row: 2, col: 1 } },
      s2: { firstName: 'Van', seat: { row: 3, col: 3 } }
    },
    atRowIndex: 3
  }

  const result = simulateInsertRow(initial)
  assert.equal(result.rows, 7, 'Rows should increase to 7')
  assert.deepEqual(result.students.s1.seat, { row: 2, col: 1 }, 'Student above inserted row should remain at row 2')
  assert.deepEqual(result.students.s2.seat, { row: 4, col: 3 }, 'Student at or below inserted row should shift to row 4')
  assert.equal(result.cellTypes['1-1'], 'aisle', 'Row 1 aisle should remain intact')
  console.log('✓ Test 3 Passed: Inserting row cleanly shifts only affected coordinates')
}

// Test 4: Deleting occupied row
{
  const initial = {
    rows: 5,
    cols: 5,
    cellTypes: {},
    pods: [],
    students: {
      s1: { firstName: 'Alice', seat: { row: 2, col: 2 } },
      s2: { firstName: 'Bob', seat: { row: 3, col: 3 } }
    },
    atRowIndex: 2
  }

  const result = simulateDeleteRow(initial)
  assert.equal(result.rows, 4)
  assert.equal(result.displacedStudents.length, 1)
  assert.equal(result.displacedStudents[0].firstName, 'Alice')
  assert.equal(result.students.s1.seat, null, 'Alice should be unseated')
  assert.deepEqual(result.students.s2.seat, { row: 2, col: 3 }, 'Bob should shift from row 3 to row 2')
  console.log('✓ Test 4 Passed: Deleting occupied row unseats occupants and shifts subsequent rows')
}

console.log('ALL SEATING DESIGNER TESTS PASSED!')
