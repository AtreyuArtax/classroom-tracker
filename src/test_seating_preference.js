import assert from 'node:assert'
import { getFrontSeatStatus, isFrontPreference } from './utils/seatingPreference.js'

const FRONT = 'Front near the board / screen'

// 6-row grid; front of room is the BOTTOM, so row 6 is the front edge.
function cls(students, extra = {}) {
  return { gridSize: { rows: 6, cols: 6 }, students, ...extra }
}

assert.strictEqual(isFrontPreference(FRONT), true)
assert.strictEqual(isFrontPreference('Middle of the room'), false)
assert.strictEqual(isFrontPreference(undefined), false)

// Non-front preferences are never evaluated
assert.deepStrictEqual(
  getFrontSeatStatus('a', cls({ a: { seat: { row: 1, col: 1 } } }), 'Middle of the room'),
  { status: 'na', rowFromFront: null }
)
assert.strictEqual(getFrontSeatStatus('a', null, FRONT).status, 'na')

// Front row (bottom) is met
const c1 = cls({
  a: { seat: { row: 6, col: 1 } },
  b: { seat: { row: 5, col: 1 } },
  c: { seat: { row: 2, col: 1 } },
})
assert.deepStrictEqual(getFrontSeatStatus('a', c1, FRONT), { status: 'met', rowFromFront: 1 })
assert.deepStrictEqual(getFrontSeatStatus('b', c1, FRONT), { status: 'met', rowFromFront: 2 })
assert.deepStrictEqual(getFrontSeatStatus('c', c1, FRONT), { status: 'unmet', rowFromFront: 3 })

// Empty bottom rows don't count: rows 5–6 empty, row 4 is effectively the front
const c2 = cls({
  a: { seat: { row: 4, col: 1 } },
  b: { seat: { row: 3, col: 2 } },
  c: { seat: { row: 1, col: 2 } },
})
assert.deepStrictEqual(getFrontSeatStatus('a', c2, FRONT), { status: 'met', rowFromFront: 1 })
assert.deepStrictEqual(getFrontSeatStatus('b', c2, FRONT), { status: 'met', rowFromFront: 2 })
assert.deepStrictEqual(getFrontSeatStatus('c', c2, FRONT), { status: 'unmet', rowFromFront: 3 })

// Archived students and aisle cells don't create occupied rows
const c3 = cls({
  a: { seat: { row: 6, col: 1 }, archived: true },
  b: { seat: { row: 5, col: 1 } },
  c: { seat: { row: 4, col: 1 } },
  d: { seat: { row: 3, col: 1 } },
}, { layoutConfig: { cellTypes: { '5-1': 'aisle' } } })
assert.strictEqual(getFrontSeatStatus('b', c3, FRONT).status, 'unseated')
assert.deepStrictEqual(getFrontSeatStatus('c', c3, FRONT), { status: 'met', rowFromFront: 1 })
assert.deepStrictEqual(getFrontSeatStatus('d', c3, FRONT), { status: 'met', rowFromFront: 2 })

// Unseated: no seat, or out of bounds after a grid shrink
assert.strictEqual(getFrontSeatStatus('x', cls({ x: {} }), FRONT).status, 'unseated')
assert.strictEqual(getFrontSeatStatus('x', cls({ x: { seat: { row: 8, col: 1 } } }), FRONT).status, 'unseated')
assert.strictEqual(getFrontSeatStatus('missing', cls({}), FRONT).status, 'unseated')

console.log('test_seating_preference: all passed')
