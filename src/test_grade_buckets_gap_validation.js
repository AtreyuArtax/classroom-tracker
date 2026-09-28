import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLevelDistributionBuckets } from './utils/gradeCalc.js'

function validateBuckets(localBuckets) {
  const validationErrors = {}
  let globalError = ''

  if (!localBuckets || localBuckets.length === 0) {
    globalError = 'At least one level is required.'
    return { valid: false, globalError, validationErrors }
  }

  for (let i = 0; i < localBuckets.length; i++) {
    const b = localBuckets[i]
    if (!b.label || !String(b.label).trim()) {
      validationErrors[i] = true
      globalError = `Level #${i + 1} is missing a name/label.`
      return { valid: false, globalError, validationErrors }
    }
    if (b.min === null || b.min === undefined || b.min === '' || isNaN(Number(b.min)) || 
        b.max === null || b.max === undefined || b.max === '' || isNaN(Number(b.max))) {
      validationErrors[i] = true
      globalError = `Level "${b.label}" must have valid minimum and maximum percentages.`
      return { valid: false, globalError, validationErrors }
    }
    if (Number(b.min) < 0) {
      validationErrors[i] = true
      globalError = `Level "${b.label}" minimum percentage cannot be negative.`
      return { valid: false, globalError, validationErrors }
    }
    if (Number(b.min) > Number(b.max)) {
      validationErrors[i] = true
      globalError = `Level "${b.label}" has an invalid range (${b.min}% > ${b.max}%).`
      return { valid: false, globalError, validationErrors }
    }
  }

  const indexed = localBuckets.map((b, idx) => ({
    ...b,
    origIdx: idx,
    min: Number(b.min),
    max: Number(b.max)
  })).sort((a, b) => a.min - b.min)

  if (indexed[0].min > 0) {
    validationErrors[indexed[0].origIdx] = true
    globalError = `Levels must start at 0% (currently "${indexed[0].label}" starts at ${indexed[0].min}%).`
    return { valid: false, globalError, validationErrors }
  }

  for (let i = 0; i < indexed.length - 1; i++) {
    const curr = indexed[i]
    const next = indexed[i + 1]

    if (curr.max >= next.min) {
      validationErrors[curr.origIdx] = true
      validationErrors[next.origIdx] = true
      globalError = `Levels "${curr.label}" and "${next.label}" have overlapping ranges (${curr.min}–${curr.max}% and ${next.min}–${next.max}%).`
      return { valid: false, globalError, validationErrors }
    }

    if (curr.max + 1 < next.min) {
      validationErrors[curr.origIdx] = true
      validationErrors[next.origIdx] = true
      const gapStart = curr.max + 1
      const gapEnd = next.min - 1
      globalError = `Gap detected between "${curr.label}" and "${next.label}": scores ${gapStart}%–${gapEnd}% are unassigned.`
      return { valid: false, globalError, validationErrors }
    }
  }

  const last = indexed[indexed.length - 1]
  if (last.max < 100) {
    validationErrors[last.origIdx] = true
    globalError = `Levels must reach at least 100% (currently "${last.label}" ends at ${last.max}%).`
    return { valid: false, globalError, validationErrors }
  }

  return { valid: true, globalError: '', validationErrors: {} }
}

test('Grade Buckets: Ontario defaults pass validation with 0 errors', () => {
  const ontario = [
    { label: 'R', min: 0, max: 49, color: '#ff3b30' },
    { label: 'L1', min: 50, max: 59, color: '#ff9500' },
    { label: 'L2', min: 60, max: 69, color: '#ffcc00' },
    { label: 'L3', min: 70, max: 79, color: '#30b0c7' },
    { label: 'L4', min: 80, max: 100, color: '#34c759' }
  ]
  const res = validateBuckets(ontario)
  assert.equal(res.valid, true)
  assert.equal(res.globalError, '')
})

test('Grade Buckets: Catches gap between L3 (ends at 79) and L4 (starts at 90)', () => {
  const gapBuckets = [
    { label: 'R', min: 0, max: 49 },
    { label: 'L1', min: 50, max: 59 },
    { label: 'L2', min: 60, max: 69 },
    { label: 'L3', min: 70, max: 79 },
    { label: 'L4', min: 90, max: 100 }
  ]
  const res = validateBuckets(gapBuckets)
  assert.equal(res.valid, false)
  assert.match(res.globalError, /Gap detected between "L3" and "L4": scores 80%–89% are unassigned/)
  assert.equal(res.validationErrors[3], true)
  assert.equal(res.validationErrors[4], true)
})

test('Grade Buckets: Catches leading gap when lowest bucket starts above 0%', () => {
  const leadingGap = [
    { label: 'L1', min: 50, max: 59 },
    { label: 'L2', min: 60, max: 69 },
    { label: 'L3', min: 70, max: 79 },
    { label: 'L4', min: 80, max: 100 }
  ]
  const res = validateBuckets(leadingGap)
  assert.equal(res.valid, false)
  assert.match(res.globalError, /Levels must start at 0%/)
})

test('Grade Buckets: Catches trailing gap when highest bucket ends below 100%', () => {
  const trailingGap = [
    { label: 'R', min: 0, max: 49 },
    { label: 'L1', min: 50, max: 59 },
    { label: 'L2', min: 60, max: 69 },
    { label: 'L3', min: 70, max: 79 },
    { label: 'L4', min: 80, max: 95 }
  ]
  const res = validateBuckets(trailingGap)
  assert.equal(res.valid, false)
  assert.match(res.globalError, /Levels must reach at least 100%/)
})

test('Grade Buckets: Catches overlapping ranges', () => {
  const overlap = [
    { label: 'R', min: 0, max: 50 },
    { label: 'L1', min: 50, max: 60 },
    { label: 'L2', min: 61, max: 100 }
  ]
  const res = validateBuckets(overlap)
  assert.equal(res.valid, false)
  assert.match(res.globalError, /overlapping ranges/)
})

test('buildLevelDistributionBuckets: Handles decimal scores and extreme bounds safely', () => {
  const scores = [49.4, 49.6, 75, 79.4, 79.6, 105, -5]
  const buckets = buildLevelDistributionBuckets(scores)
  
  assert.equal(buckets.length, 5)
  // 49.4 rounds to 49 (R), 49.6 rounds to 50 (L1), -5 is < 0 (R)
  const rBucket = buckets.find(b => b.label === 'R')
  assert.equal(rBucket.count, 2) // 49.4 and -5

  const l1Bucket = buckets.find(b => b.label === 'L1')
  assert.equal(l1Bucket.count, 1) // 49.6

  const l3Bucket = buckets.find(b => b.label === 'L3')
  assert.equal(l3Bucket.count, 2) // 75 and 79.4

  const l4Bucket = buckets.find(b => b.label === 'L4')
  assert.equal(l4Bucket.count, 2) // 79.6 and 105
})
