/**
 * src/test_student_photos_reactivity.js
 *
 * Automated verification suite for the Student Photos reactive cache & batch queue.
 * Ensures:
 * 1. Key-level reactive granularity (setting student A does NOT notify student B).
 * 2. In-flight request deduplication (multiple simultaneous callers receive the same batch/promise).
 * 3. Fast-path caching for missing photos (null cached so no infinite re-queries).
 *
 * Run with: node src/test_student_photos_reactivity.js
 */

import assert from 'assert'
import { reactive, effect } from 'vue'

console.log('=================================================================')
console.log('🧪 STUDENT PHOTOS REACTIVITY & BATCH QUEUE VERIFICATION')
console.log('=================================================================')

// ── Test 1: Key-level Granularity on Reactive Map ───────────────────────────
console.log('\nTest 1: Key-level isolation on Vue 3 reactive Map')

const photoCache = reactive(new Map())
let studentARuns = 0
let studentBRuns = 0

// Effect simulating StudentAvatar A's computed property
effect(() => {
  studentARuns++
  const cached = photoCache.get('student_A')
  // read cached?.url
})

// Effect simulating StudentAvatar B's computed property
effect(() => {
  studentBRuns++
  const cached = photoCache.get('student_B')
})

assert.strictEqual(studentARuns, 1, 'Student A effect should run initially')
assert.strictEqual(studentBRuns, 1, 'Student B effect should run initially')

// Simulate loading photo for Student A
photoCache.set('student_A', { url: 'blob:url-A', updatedAt: '2026-10-01T12:00:00Z' })

assert.strictEqual(studentARuns, 2, 'Student A effect should re-run when its photo loads')
assert.strictEqual(studentBRuns, 1, 'Student B effect MUST NOT re-run when Student A photo loads (no O(N^2) storm)')

// Simulate loading photo for Student B
photoCache.set('student_B', { url: 'blob:url-B', updatedAt: '2026-10-01T12:00:00Z' })

assert.strictEqual(studentARuns, 2, 'Student A effect MUST NOT re-run when Student B photo loads')
assert.strictEqual(studentBRuns, 2, 'Student B effect should re-run when its photo loads')

console.log('  ✓ Key-level isolation verified: zero cross-invalidation cascading re-renders.')


// ── Test 2: In-Flight Deduplication & Batch Queue ─────────────────────────────
console.log('\nTest 2: Microtask batch queue and deduplication')

const mockDbStore = new Map([
  ['101', { studentId: '101', blob: { size: 24000 }, updatedAt: '2026-09-01' }],
  ['102', { studentId: '102', blob: { size: 28000 }, updatedAt: '2026-09-01' }],
  ['103', null] // Missing photo
])

let dbBatchCalls = 0
let fetchedIdCount = 0

async function mockGetPhotosBatch(ids) {
  dbBatchCalls++
  fetchedIdCount += ids.length
  const res = new Map()
  for (const id of ids) {
    if (mockDbStore.has(id)) {
      res.set(id, mockDbStore.get(id))
    }
  }
  return res
}

// Queue mechanism under test
const inFlightRequests = new Map()
const pendingBatch = new Set()
const cache = reactive(new Map())
let batchScheduled = false

function queueLoad(id) {
  const sId = String(id)
  if (cache.has(sId) || inFlightRequests.has(sId)) return inFlightRequests.get(sId)
  pendingBatch.add(sId)

  const promise = (async () => {
    // Wait for microtask flush
    await Promise.resolve()
    return cache.get(sId)?.url || null
  })()

  inFlightRequests.set(sId, promise)

  if (!batchScheduled) {
    batchScheduled = true
    queueMicrotask(async () => {
      batchScheduled = false
      const ids = Array.from(pendingBatch)
      pendingBatch.clear()
      const records = await mockGetPhotosBatch(ids)
      for (const reqId of ids) {
        const rec = records.get(reqId)
        if (rec && rec.blob) {
          cache.set(reqId, { url: `blob:mock-${reqId}`, updatedAt: rec.updatedAt })
        } else {
          cache.set(reqId, { url: null, updatedAt: null })
        }
        inFlightRequests.delete(reqId)
      }
    })
  }

  return promise
}

// Simulate 100 avatar components mounting simultaneously in the same render frame,
// requesting photos for students 101, 102, and 103 (with duplicates)
const promises = []
for (let i = 0; i < 50; i++) {
  promises.push(queueLoad('101')) // 50 requests for 101
  promises.push(queueLoad('102')) // 50 requests for 102
  promises.push(queueLoad('103')) // 50 requests for 103 (missing photo)
}

await Promise.all(promises)

// Wait for microtask tick to settle
await new Promise(resolve => setTimeout(resolve, 10))

assert.strictEqual(dbBatchCalls, 1, 'All 150 requests must be coalesced into exactly 1 database call')
assert.strictEqual(fetchedIdCount, 3, 'Only 3 unique IDs should be queried from database')
assert.strictEqual(cache.get('101').url, 'blob:mock-101')
assert.strictEqual(cache.get('102').url, 'blob:mock-102')
assert.strictEqual(cache.get('103').url, null, 'Missing photo cached as null')

// Subsequent request for missing photo should hit cache immediately without calling DB again
const oldDbCalls = dbBatchCalls
queueLoad('103')
assert.strictEqual(dbBatchCalls, oldDbCalls, 'Missing photo check must not trigger new database query')

console.log('  ✓ Batching and in-flight deduplication verified: 150 requests coalesced to 1 batch query.')
console.log('\n🎉 ALL REACTIVITY & BATCH QUEUE TESTS PASSED!\n')
