/**
 * src/test_curriculum_library_and_weights.js
 *
 * Automated Verification Suite for Master Curriculum Library & Expectation Weights
 *
 * Verifies:
 * 1. Multiplier weight calculations (1x, 2x, 0.5x, 0x diagnostic)
 * 2. Diagnostic (0x) standard exclusion from overall course mastery
 * 3. Weight propagation in calculateSBARExpectationMastery
 * 4. Interaction between professional judgment overrides and weights
 * 5. Preset weight inheritance in populateSubjectFromPresets
 * 6. 100% backwards compatibility for unweighted classes
 * 7. All zero-weight standards edge case (safely returns null without NaN)
 * 8. Master Curriculum Preset Persistence via Settings Service
 */

// Polyfill localStorage for Node.js test environment
const mockStorage = {}
globalThis.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v) },
  removeItem: (k) => { delete mockStorage[k] }
}

const {
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  SBAR_LEVELS
} = await import('./db/gradebook/gradeCalcSBAR.js')

const { populateSubjectFromPresets } = await import('./composables/useElementary.js')
const {
  getCustomCurriculumPresets,
  saveCustomCurriculumPreset,
  deleteCustomCurriculumPreset
} = await import('./db/settingsService.js')

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ ${message}`)
  } else {
    failedTests++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

function assertApprox(val, expected, tolerance = 0.5, message) {
  totalTests++
  if (Math.abs(val - expected) <= tolerance) {
    passedTests++
    console.log(`  ✓ ${message} (got ${val}, expected ${expected})`)
  } else {
    failedTests++
    console.error(`  ✗ FAIL: ${message} (got ${val}, expected ${expected})`)
  }
}

console.log('=================================================================')
console.log('🧪 Master Curriculum Library & Expectation Multipliers Test Suite')
console.log('=================================================================\n')

// ── TEST 1: Multiplier Weights in Overall SBAR Mastery ──────────────
console.log('Test Group 1: Multiplier Weights in Overall SBAR Mastery')
{
  const mockClass = {
    id: 'cls_weights_1',
    name: 'Grade 8 Math (Weighted)',
    sbarCalculationAlgorithm: 'highest',
    students: {
      's1': { id: 's1', firstName: 'Alice', expectationOverrides: {} }
    },
    gradebookUnits: [
      {
        unitId: 'unit_num',
        name: 'Number Sense',
        expectations: [
          { code: 'B1.1', text: 'Rational Numbers', weight: 1.0 },
          { code: 'B1.2', text: 'Fractions & Ratios', weight: 3.0 } // 3x weight
        ]
      }
    ]
  }

  const mockAssessments = [
    {
      assessmentId: 'as_1',
      title: 'Rational Numbers Quiz',
      evaluationType: 'summative',
      expectationIds: ['B1.1'],
      date: '2026-03-01'
    },
    {
      assessmentId: 'as_2',
      title: 'Major Fractions Task',
      evaluationType: 'summative',
      expectationIds: ['B1.2'],
      date: '2026-03-05'
    }
  ]

  // B1.1 = 80%, B1.2 = 90%
  const mockGradeMap = {
    'as_1': {
      's1': { assessmentId: 'as_1', studentId: 's1', expectationScores: { 'B1.1': 80 } }
    },
    'as_2': {
      's1': { assessmentId: 'as_2', studentId: 's1', expectationScores: { 'B1.2': 90 } }
    }
  }

  const masteryMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'highest')
  assert(masteryMap['s1']['B1.1'].weight === 1.0, 'B1.1 reports weight: 1.0')
  assert(masteryMap['s1']['B1.2'].weight === 3.0, 'B1.2 reports weight: 3.0')

  const overall = calculateSBARStudentOverallMastery('s1', mockClass, mockAssessments, mockGradeMap, 'highest')
  
  // Unweighted average would be (80 + 90) / 2 = 85.0%
  // Weighted average: (80 * 1.0 + 90 * 3.0) / (1.0 + 3.0) = (80 + 270) / 4.0 = 350 / 4 = 87.5% -> Math.round is 88%
  assert(overall === 88, 'Weighted mastery reflects 3x multiplier on B1.2: 88% vs unweighted 85%')
}

// ── TEST 2: Diagnostic Standards (0x Weight) Exclusion ──────────────
console.log('\nTest Group 2: Diagnostic Standards (0x Weight) Exclusion')
{
  const mockClassDiag = {
    id: 'cls_diag_1',
    name: 'Grade 7 Science',
    sbarCalculationAlgorithm: 'highest',
    students: {
      's1': { id: 's1', firstName: 'Alice', expectationOverrides: {} }
    },
    gradebookUnits: [
      {
        unitId: 'unit_bio',
        name: 'Cell Biology',
        expectations: [
          { code: 'A1.1', text: 'Diagnostic Prior Knowledge', weight: 0 }, // 0x diagnostic
          { code: 'B1.1', text: 'Cell Organelles Summative', weight: 1.0 }
        ]
      }
    ]
  }

  const mockAssessments = [
    {
      assessmentId: 'as_diag',
      title: 'Diagnostic Baseline Check',
      evaluationType: 'summative',
      expectationIds: ['A1.1'],
      date: '2026-02-01'
    },
    {
      assessmentId: 'as_real',
      title: 'Cell Biology Unit Exam',
      evaluationType: 'summative',
      expectationIds: ['B1.1'],
      date: '2026-02-15'
    }
  ]

  // Student struggled on diagnostic (30%), then excelled on summative (92%)
  const mockGradeMap = {
    'as_diag': {
      's1': { assessmentId: 'as_diag', studentId: 's1', expectationScores: { 'A1.1': 30 } }
    },
    'as_real': {
      's1': { assessmentId: 'as_real', studentId: 's1', expectationScores: { 'B1.1': 92 } }
    }
  }

  const masteryMap = calculateSBARExpectationMastery(mockClassDiag, mockAssessments, mockGradeMap, 'highest')
  assert(masteryMap['s1']['A1.1'].weight === 0, 'Diagnostic expectation A1.1 reports weight: 0')
  assert(masteryMap['s1']['A1.1'].score === 30, 'Diagnostic expectation A1.1 records score: 30%')
  assert(masteryMap['s1']['B1.1'].weight === 1, 'Summative expectation B1.1 reports weight: 1')

  const overall = calculateSBARStudentOverallMastery('s1', mockClassDiag, mockAssessments, mockGradeMap, 'highest')
  // Because A1.1 has weight 0, only B1.1 (92%) counts in overall course mastery!
  assertApprox(overall, 92, 0.1, 'Diagnostic standard with 30% did NOT pull down overall course mastery; overall remains 92%')
}

// ── TEST 3: Weight Extraction Across Expectation Structures ─────────
console.log('\nTest Group 3: Weight Extraction Across Expectation Structures')
{
  // Test with flat curriculumExpectations and customized multipliers
  const mockClassFlat = {
    id: 'cls_flat',
    name: 'Secondary English',
    students: {
      's1': { id: 's1', firstName: 'Alice', expectationOverrides: {} }
    },
    curriculumExpectations: [
      { code: 'EN.1', text: 'Oral Communication', weight: 0.5 },
      { code: 'EN.2', text: 'Writing & Inquiry', weight: 2.0 }
    ]
  }

  const mockAssessments = [
    {
      assessmentId: 'as_en1',
      title: 'Speech',
      evaluationType: 'summative',
      expectationIds: ['EN.1'],
      date: '2026-03-01'
    },
    {
      assessmentId: 'as_en2',
      title: 'Essay',
      evaluationType: 'summative',
      expectationIds: ['EN.2'],
      date: '2026-03-10'
    }
  ]

  // EN.1 = 100%, EN.2 = 70%
  const mockGradeMap = {
    'as_en1': {
      's1': { assessmentId: 'as_en1', studentId: 's1', expectationScores: { 'EN.1': 100 } }
    },
    'as_en2': {
      's1': { assessmentId: 'as_en2', studentId: 's1', expectationScores: { 'EN.2': 70 } }
    }
  }

  const masteryMap = calculateSBARExpectationMastery(mockClassFlat, mockAssessments, mockGradeMap, 'highest')
  assert(masteryMap['s1']['EN.1'].weight === 0.5, 'Flat expectation EN.1 correctly preserves 0.5x weight')
  assert(masteryMap['s1']['EN.2'].weight === 2.0, 'Flat expectation EN.2 correctly preserves 2.0x weight')

  // Weighted average: (100 * 0.5 + 70 * 2.0) / (0.5 + 2.0) = (50 + 140) / 2.5 = 190 / 2.5 = 76.0% -> Math.round is 76%
  // Unweighted average would have been (100 + 70) / 2 = 85.0%
  const overall = calculateSBARStudentOverallMastery('s1', mockClassFlat, mockAssessments, mockGradeMap, 'highest')
  assert(overall === 76, 'Weighted average correctly weights Essay 4x heavier than Speech: 76%')
}

// ── TEST 4: Interaction with Professional Judgment Overrides ───────
console.log('\nTest Group 4: Interaction with Professional Judgment Overrides')
{
  const mockClass = {
    id: 'cls_ovr_weights',
    name: 'Grade 8 Science',
    students: {
      's1': {
        id: 's1',
        firstName: 'Alice',
        expectationOverrides: {
          'SYS.1': {
            level: 'L4',
            score: 88, // Teacher overrides SYS.1 from calculated 60% to 88%
            note: 'Demonstrated mastery on final project discussion'
          }
        }
      }
    },
    gradebookUnits: [
      {
        unitId: 'u1',
        name: 'Systems',
        expectations: [
          { code: 'SYS.1', text: 'System Analysis', weight: 2.0 },
          { code: 'SYS.2', text: 'Safety Procedures', weight: 1.0 }
        ]
      }
    ]
  }

  const mockAssessments = [
    {
      assessmentId: 'as_1',
      title: 'Quiz 1',
      evaluationType: 'summative',
      expectationIds: ['SYS.1'],
      date: '2026-03-01'
    },
    {
      assessmentId: 'as_2',
      title: 'Quiz 2',
      evaluationType: 'summative',
      expectationIds: ['SYS.2'],
      date: '2026-03-02'
    }
  ]

  const mockGradeMap = {
    'as_1': {
      's1': { assessmentId: 'as_1', studentId: 's1', expectationScores: { 'SYS.1': 60 } }
    },
    'as_2': {
      's1': { assessmentId: 'as_2', studentId: 's1', expectationScores: { 'SYS.2': 80 } }
    }
  }

  const masteryMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'highest')
  assert(masteryMap['s1']['SYS.1'].isOverridden === true, 'SYS.1 is marked overridden')
  assert(masteryMap['s1']['SYS.1'].score === 88, 'SYS.1 uses overridden score: 88%')
  assert(masteryMap['s1']['SYS.1'].calculatedScore === 60, 'SYS.1 preserves calculated score: 60%')
  assert(masteryMap['s1']['SYS.1'].weight === 2.0, 'SYS.1 preserves weight: 2.0')

  // Weighted overall with override:
  // (88 * 2.0 + 80 * 1.0) / (2.0 + 1.0) = (176 + 80) / 3.0 = 256 / 3.0 = 85.33% -> Math.round is 85%
  const overall = calculateSBARStudentOverallMastery('s1', mockClass, mockAssessments, mockGradeMap, 'highest')
  assert(overall === 85, 'Weighted overall accurately combines overridden score with 2x weight: 85%')
}

// ── TEST 5: Preset Weight Preservation in populateSubjectFromPresets
console.log('\nTest Group 5: Preset Weight Preservation in populateSubjectFromPresets')
{
  const mockPreset = {
    id: 'ontario-math-8',
    subject: 'Mathematics',
    grade: 'Grade 8',
    strands: [
      {
        name: 'Number',
        code: 'B',
        overalls: [
          {
            code: 'B1',
            description: 'Number Sense Overall',
            weight: 1.5,
            specifics: [
              { code: 'B1.1', description: 'Rational Numbers', weight: 2.0 },
              { code: 'B1.2', description: 'Exponents Diagnostic', weight: 0 }
            ]
          }
        ]
      }
    ]
  }

  const activeSubject = {
    id: 'subj_math',
    name: 'Mathematics',
    gradebookUnits: [],
    expectations: []
  }

  const populated = populateSubjectFromPresets(activeSubject, [mockPreset])

  assert(populated.gradebookUnits.length === 1, 'Populates 1 unit from preset strand')
  assert(populated.expectations.length === 2, 'Populates 2 specific expectations')
  assert(populated.expectations[0].weight === 2.0, 'First expectation preserves weight 2.0')
  assert(populated.expectations[1].weight === 0, 'Diagnostic expectation preserves weight 0')
}

// ── TEST 6: Backwards Compatibility for Unweighted Data ────────────
console.log('\nTest Group 6: Backwards Compatibility for Unweighted Data')
{
  const mockLegacyClass = {
    id: 'cls_legacy',
    name: 'Grade 6 Math Legacy',
    students: {
      's1': { id: 's1', firstName: 'Alice', expectationOverrides: {} }
    },
    gradebookUnits: [
      {
        unitId: 'u1',
        name: 'Geometry',
        expectations: [
          { code: 'E1.1', text: 'Angles' }, // No weight specified
          { code: 'E1.2', text: 'Polygons' } // No weight specified
        ]
      }
    ]
  }

  const mockAssessments = [
    { assessmentId: 'as_1', evaluationType: 'summative', expectationIds: ['E1.1'] },
    { assessmentId: 'as_2', evaluationType: 'summative', expectationIds: ['E1.2'] }
  ]

  const mockGradeMap = {
    'as_1': {
      's1': { assessmentId: 'as_1', studentId: 's1', expectationScores: { 'E1.1': 70 } }
    },
    'as_2': {
      's1': { assessmentId: 'as_2', studentId: 's1', expectationScores: { 'E1.2': 90 } }
    }
  }

  const masteryMap = calculateSBARExpectationMastery(mockLegacyClass, mockAssessments, mockGradeMap, 'highest')
  assert(masteryMap['s1']['E1.1'].weight === 1.0, 'Legacy expectation defaults to weight 1.0')
  assert(masteryMap['s1']['E1.2'].weight === 1.0, 'Legacy expectation defaults to weight 1.0')

  const overall = calculateSBARStudentOverallMastery('s1', mockLegacyClass, mockAssessments, mockGradeMap, 'highest')
  assert(overall === 80, 'Legacy overall mastery is strictly 80% with zero distortion')
}

// ── TEST 7: All Zero-Weight Standards (Edge Case) ───────────────────
console.log('\nTest Group 7: All Zero-Weight Standards (Edge Case)')
{
  const mockClassAllDiag = {
    id: 'cls_all_diag',
    students: {
      's1': { id: 's1', firstName: 'Alice', expectationOverrides: {} }
    },
    gradebookUnits: [
      {
        unitId: 'u1',
        expectations: [
          { code: 'D1', weight: 0 },
          { code: 'D2', weight: 0 }
        ]
      }
    ]
  }

  const mockAssessments = [
    { assessmentId: 'as_1', evaluationType: 'summative', expectationIds: ['D1'] },
    { assessmentId: 'as_2', evaluationType: 'summative', expectationIds: ['D2'] }
  ]

  const mockGradeMap = {
    'as_1': {
      's1': { assessmentId: 'as_1', studentId: 's1', expectationScores: { 'D1': 50 } }
    },
    'as_2': {
      's1': { assessmentId: 'as_2', studentId: 's1', expectationScores: { 'D2': 60 } }
    }
  }

  const overall = calculateSBARStudentOverallMastery('s1', mockClassAllDiag, mockAssessments, mockGradeMap, 'highest')
  assert(overall === null, 'When all assessed standards have 0x weight, overall mastery safely returns null without NaN')
}

// ── TEST 8: Master Curriculum Presets Settings Persistence ──────────
console.log('\nTest Group 8: Master Curriculum Presets Settings Persistence')
{
  const initialPresets = await getCustomCurriculumPresets()
  assert(typeof initialPresets === 'object', 'Initial customCurriculumPresets returns an object')

  const testPreset = {
    presetId: 'custom-grade-8-math',
    title: 'Custom Grade 8 Math (Weighted)',
    grade: 'Grade 8',
    subject: 'Mathematics',
    panel: 'elementary',
    strands: [
      {
        name: 'Strand B: Number',
        overalls: [
          {
            code: 'B1',
            specifics: [
              { code: 'B1.1', weight: 2.0 }
            ]
          }
        ]
      }
    ]
  }

  await saveCustomCurriculumPreset(testPreset)
  const afterSave = await getCustomCurriculumPresets()
  assert(afterSave['custom-grade-8-math'] !== undefined, 'Saved custom preset exists in settings')
  assert(afterSave['custom-grade-8-math'].title === 'Custom Grade 8 Math (Weighted)', 'Title preserved')
  assert(afterSave['custom-grade-8-math'].isCustomMaster === true, 'isCustomMaster flag automatically set to true')

  await deleteCustomCurriculumPreset('custom-grade-8-math')
  const afterDelete = await getCustomCurriculumPresets()
  assert(afterDelete['custom-grade-8-math'] === undefined, 'Deleted preset is cleanly removed from settings')
}

console.log('\n=================================================================')
console.log(`Results: ${passedTests} passed, ${failedTests} failed out of ${totalTests} total tests`)
console.log('=================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL CURRICULUM LIBRARY & WEIGHTS TESTS PASSED!')
}
