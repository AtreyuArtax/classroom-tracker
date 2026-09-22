/**
 * src/test_elementary_iep_unit_isolation.js
 *
 * Automated verification for:
 * 1. Unit ID isolation across multi-grade elementary subjects (e.g. Grade 8 class with Grade 6 IEP Math).
 * 2. Expectation ID stability and isolation across identical curriculum codes (B1.1 in Gr 8 vs B1.1 in Gr 6).
 * 3. Pre-existing collided unit ID auto-repair and sanitization.
 * 4. Assessment modal expectation selection accuracy (zero cross-grade bleed).
 */

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
}

import assert from 'assert'

const {
  populateSubjectFromPresets,
  sanitizeSubjectUnitCollisions,
  getEffectiveClassRecord,
  getUnitGradeLevel,
  DEFAULT_ELEMENTARY_SUBJECTS
} = await import('./composables/useElementary.js')

const { isCohortMatch } = await import('./db/gradebook/gradeCalc.js')

console.log('=================================================================')
console.log('🧪 RUNNING ELEMENTARY IEP UNIT ID & EXPECTATION ISOLATION SUITE')
console.log('=================================================================\n')

// ─── TEST 1: Unit ID Isolation Across Different Grades with Identical Strands ───
console.log('TEST 1: Unit ID Isolation Across Different Grades with Identical Strands')

const gr8Preset = {
  presetId: 'ontario-g8-math',
  title: 'Ontario Grade 8 Mathematics (2020)',
  panel: 'elementary',
  grade: 'Grade 8',
  strands: [
    {
      name: 'Strand B: Number',
      overalls: [
        {
          code: 'B1',
          description: 'demonstrate an understanding of numbers (Gr 8)',
          specifics: [
            { code: 'B1.1', description: 'represent and compare very large and very small numbers (Gr 8)' },
            { code: 'B1.2', description: 'describe, compare, and order numbers in real number system (Gr 8)' }
          ]
        }
      ]
    }
  ]
}

const gr6Preset = {
  presetId: 'custom-g6-math',
  title: 'Ontario Grade 6 Mathematics',
  panel: 'elementary',
  grade: 'Grade 6',
  strands: [
    {
      name: 'Strand B: Number',
      overalls: [
        {
          code: 'B1',
          description: 'demonstrate an understanding of numbers (Gr 6)',
          specifics: [
            { code: 'B1.1', description: 'read, represent, compare, and order whole numbers up to 1 000 000 (Gr 6)' },
            { code: 'B1.2', description: 'count forwards and backwards by various fractions (Gr 6)' }
          ]
        }
      ]
    }
  ]
}

let mathSubject = {
  subjectId: 'elem_sub_math',
  name: 'Mathematics',
  code: 'MATH',
  gradebookUnits: [],
  expectations: []
}

// Populate Grade 8 first
mathSubject = populateSubjectFromPresets(mathSubject, [gr8Preset], 'all')
assert.strictEqual(mathSubject.gradebookUnits.length, 1, 'Grade 8 unit added')
assert.strictEqual(mathSubject.expectations.length, 2, 'Grade 8 expectations added')

const gr8Unit = mathSubject.gradebookUnits[0]
const gr8ExpB11 = mathSubject.expectations.find(e => e.code === 'B1.1')
assert.strictEqual(gr8Unit.gradeLevel, 'Grade 8')
assert.strictEqual(gr8ExpB11.gradeLevel, 'Grade 8')
assert.strictEqual(gr8ExpB11.unitId, gr8Unit.unitId)

// Now append Grade 6 (e.g. for IEP student)
mathSubject = populateSubjectFromPresets(mathSubject, [gr6Preset], 'all')

assert.strictEqual(mathSubject.gradebookUnits.length, 2, 'Grade 6 unit added alongside Grade 8 unit')
const gr6Unit = mathSubject.gradebookUnits.find(u => u.gradeLevel === 'Grade 6')
assert.ok(gr6Unit, 'Grade 6 unit exists')

// CRITICAL ASSERTION: Unit IDs must NOT collide even though strand names are identical!
assert.notStrictEqual(gr6Unit.unitId, gr8Unit.unitId, 'Grade 6 and Grade 8 units MUST have distinct unit IDs')

// Expectations check
assert.strictEqual(mathSubject.expectations.length, 4, 'Total 4 expectations (2 for Gr 8, 2 for Gr 6)')
const gr6Exps = mathSubject.expectations.filter(e => e.gradeLevel === 'Grade 6')
const gr8Exps = mathSubject.expectations.filter(e => e.gradeLevel === 'Grade 8')
assert.strictEqual(gr6Exps.length, 2, '2 Grade 6 expectations')
assert.strictEqual(gr8Exps.length, 2, '2 Grade 8 expectations')

const gr6ExpB11 = gr6Exps.find(e => e.code === 'B1.1')
assert.notStrictEqual(gr6ExpB11.expectationId, gr8ExpB11.expectationId, 'B1.1 in Gr 6 must have distinct ID from B1.1 in Gr 8')
assert.strictEqual(gr6ExpB11.unitId, gr6Unit.unitId, 'Gr 6 B1.1 must reference Gr 6 unit ID')
assert.strictEqual(gr8ExpB11.unitId, gr8Unit.unitId, 'Gr 8 B1.1 must reference Gr 8 unit ID')

console.log('✓ Grade 6 and Grade 8 units and expectations have completely isolated IDs\n')

// ─── TEST 2: Re-importing Same Grade Preserves Stable IDs ───────────────────────
console.log('TEST 2: Re-importing Same Grade Preserves Stable IDs')

const prevGr6UnitId = gr6Unit.unitId
const prevGr6ExpId = gr6ExpB11.expectationId

// Re-populate Grade 6 with forceRefresh
const refreshedSubject = populateSubjectFromPresets(mathSubject, [gr6Preset], 'all', { forceRefresh: true })
const reGr6Unit = refreshedSubject.gradebookUnits.find(u => u.gradeLevel === 'Grade 6')
const reGr6ExpB11 = refreshedSubject.expectations.find(e => e.gradeLevel === 'Grade 6' && e.code === 'B1.1')

assert.strictEqual(reGr6Unit.unitId, prevGr6UnitId, 'Re-imported Grade 6 unit retains stable unitId')
assert.strictEqual(reGr6ExpB11.expectationId, prevGr6ExpId, 'Re-imported Grade 6 expectation retains stable expectationId')
assert.strictEqual(refreshedSubject.expectations.filter(e => e.gradeLevel === 'Grade 8').length, 2, 'Grade 8 expectations untouched')

console.log('✓ Re-importing retains stable IDs within the same grade without touching other grades\n')

// ─── TEST 3: Pre-Existing Collided Unit ID Auto-Repair / Sanitization ────────────
console.log('TEST 3: Pre-Existing Collided Unit ID Auto-Repair / Sanitization')

// Construct legacy polluted subject where Grade 8 and Grade 6 were given the SAME unitId ('shared_num_id')
const legacyPollutedSubject = {
  subjectId: 'elem_sub_math',
  name: 'Mathematics',
  gradebookUnits: [
    { unitId: 'shared_num_id', name: 'Strand B: Number', gradeLevel: 'Grade 8' },
    { unitId: 'shared_num_id', name: 'Strand B: Number', gradeLevel: 'Grade 6' }
  ],
  expectations: [
    { expectationId: 'exp_8_b1', unitId: 'shared_num_id', code: 'B1.1', gradeLevel: 'Grade 8', description: 'Gr 8' },
    { expectationId: 'exp_6_b1', unitId: 'shared_num_id', code: 'B1.1', gradeLevel: 'Grade 6', description: 'Gr 6' }
  ]
}

const repairedSubject = sanitizeSubjectUnitCollisions(legacyPollutedSubject)
assert.strictEqual(repairedSubject.gradebookUnits.length, 2, 'Both units kept')
const repGr8Unit = repairedSubject.gradebookUnits.find(u => u.gradeLevel === 'Grade 8')
const repGr6Unit = repairedSubject.gradebookUnits.find(u => u.gradeLevel === 'Grade 6')

assert.strictEqual(repGr8Unit.unitId, 'shared_num_id', 'Primary unit keeps original unitId')
assert.notStrictEqual(repGr6Unit.unitId, 'shared_num_id', 'Collided secondary unit given new unique unitId')

const repGr8Exp = repairedSubject.expectations.find(e => e.gradeLevel === 'Grade 8')
const repGr6Exp = repairedSubject.expectations.find(e => e.gradeLevel === 'Grade 6')

assert.strictEqual(repGr8Exp.unitId, repGr8Unit.unitId, 'Grade 8 expectation matches Grade 8 unit')
assert.strictEqual(repGr6Exp.unitId, repGr6Unit.unitId, 'Grade 6 expectation matches Grade 6 unit')

console.log('✓ Legacy collided unit IDs and expectations successfully detected and repaired\n')

// ─── TEST 4: Assessment Modal Expectation Selection Emulation ───────────────────
console.log('TEST 4: Assessment Modal Expectation Selection Emulation')

// Emulate AddAssessmentModal allAvailableExpectations with hardened key:
function buildModalAvailableExpectations(cls) {
  const expMap = {}
  if (cls.gradebookUnits && Array.isArray(cls.gradebookUnits)) {
    cls.gradebookUnits.forEach(u => {
      const uGrade = getUnitGradeLevel(u)
      ;(u.expectations || []).forEach(e => {
        if (!e.code) return
        const gKey = (e.gradeLevel || uGrade || '').toLowerCase().trim()
        const key = `${u.unitId}::${gKey}::${e.code}`
        expMap[key] = {
          ...e,
          unitId: e.unitId || u.unitId,
          gradeLevel: e.gradeLevel || uGrade
        }
      })
    })
  }

  const flatExps = cls.expectations || cls.curriculumExpectations || []
  if (flatExps.length > 0) {
    flatExps.forEach(e => {
      if (!e.code) return
      const gKey = (e.gradeLevel || '').toLowerCase().trim()
      const key = `${e.unitId || 'flat'}::${gKey}::${e.code}`
      if (!expMap[key]) {
        expMap[key] = { ...e }
      }
    })
  }
  return Object.values(expMap)
}

function filterModalExpectations(allExps, units, selectedUnitId, selectedGradeFilter, subCohorts) {
  let list = allExps
  if (selectedGradeFilter !== 'all' && subCohorts.length > 1) {
    list = list.filter(e => e.gradeLevel && isCohortMatch(e.gradeLevel, selectedGradeFilter))
  }
  if (selectedUnitId) {
    const selectedUnitIdStr = String(selectedUnitId)
    const selectedUnit = units.find(u => String(u.unitId) === selectedUnitIdStr)
    const unitGrade = selectedUnit ? getUnitGradeLevel(selectedUnit) : ''
    list = list.filter(e => {
      const idMatch = e.unitId && String(e.unitId) === selectedUnitIdStr
      if (!idMatch) return false
      if (unitGrade && e.gradeLevel) {
        return isCohortMatch(e.gradeLevel, unitGrade)
      }
      return true
    })
  }
  return list
}

const modalExps = buildModalAvailableExpectations(mathSubject)
assert.strictEqual(modalExps.length, 4, 'All 4 expectations present in modal without collision')

const subCohorts = ['all', 'Grade 6 (IEP)', 'Grade 8']

// Case A: Teacher selects the Grade 8 unit (unitId = gr8Unit.unitId) with gradeFilter = 'all'
const gr8Filtered = filterModalExpectations(modalExps, mathSubject.gradebookUnits, gr8Unit.unitId, 'all', subCohorts)
assert.strictEqual(gr8Filtered.length, 2, 'Selecting Grade 8 unit returns strictly 2 expectations')
assert.ok(gr8Filtered.every(e => e.gradeLevel === 'Grade 8'), 'All expectations returned for Grade 8 unit are Grade 8')

// Case B: Teacher selects the Grade 6 unit (unitId = gr6Unit.unitId) with gradeFilter = 'all'
const gr6Filtered = filterModalExpectations(modalExps, mathSubject.gradebookUnits, gr6Unit.unitId, 'all', subCohorts)
assert.strictEqual(gr6Filtered.length, 2, 'Selecting Grade 6 unit returns strictly 2 expectations')
assert.ok(gr6Filtered.every(e => e.gradeLevel === 'Grade 6'), 'All expectations returned for Grade 6 unit are Grade 6')

console.log('✓ Selecting Grade 8 unit in modal displays strictly Grade 8 expectations, and Grade 6 displays strictly Grade 6\n')

console.log('=================================================================')
console.log('🎉 ALL ELEMENTARY IEP UNIT ISOLATION AUDIT CHECKS PASSED!')
console.log('=================================================================')
