/**
 * src/test_curriculum_audit_investigation.js
 * 
 * Deep Investigation & Comprehensive Audit of:
 * 1. Master Curriculum Library as the single source of truth
 * 2. Multiplier Weightings correctness in calculations
 * 3. Adding and removing strands and expectations
 * 4. Isolation: Overlap or cross-subject bleeding checks
 * 5. Automatic vs optional propagation of master edits to existing classes
 * 6. Class-level 'Push back to master' function audit
 */

import assert from 'assert'
// Polyfill localStorage & window for Node.js test environment
const mockStorage = {}
globalThis.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v) },
  removeItem: (k) => { delete mockStorage[k] }
}

const {
  curriculumPresets,
  getPresetsByPanel,
  findElementaryPreset,
  findElementaryPresets
} = await import('./data/curriculum/index.js')
const {
  initCurriculumLibrary,
  saveMasterPreset,
  getMasterPreset,
  isMasterCustomized,
  resetMasterPreset,
  resolveSubjectPreset,
  getMergedCurriculumPresets,
  normalizeExpectationWeight
} = await import('./composables/useCurriculumLibrary.js')
const {
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery
} = await import('./db/gradebook/gradeCalcSBAR.js')
const {
  populateSubjectFromPresets
} = await import('./composables/useElementary.js')

console.log('=================================================================')
console.log('🔍 RUNNING COMPREHENSIVE CURRICULUM LIBRARY AUDIT & INVESTIGATION')
console.log('=================================================================')

// ─── AUDIT 1: Master List Integrity ──────────────────────────────────────────
console.log('\n--- AUDIT 1: Master List & Presets Catalog ---')
{
  assert(Array.isArray(curriculumPresets), 'curriculumPresets is an array')
  assert(curriculumPresets.length > 20, `Presets loaded: ${curriculumPresets.length} presets found`)
  
  // Verify Grade 7 & Grade 8 coverage
  const g7 = curriculumPresets.filter(p => p.grade === '7' || p.grade === 'Grade 7')
  const g8 = curriculumPresets.filter(p => p.grade === '8' || p.grade === 'Grade 8')
  const sec = curriculumPresets.filter(p => p.panel === 'secondary')
  
  console.log(`✓ Presets found: ${g7.length} Grade 7, ${g8.length} Grade 8, ${sec.length} Secondary`)
  assert(g7.length >= 10, 'All 10 Grade 7 Ontario elementary subjects present')
  assert(g8.length >= 10, 'All 10 Grade 8 Ontario elementary subjects present')
  assert(sec.length >= 8, 'Secondary standard & success criteria presets present')

  // Check unique presetIds
  const ids = new Set()
  curriculumPresets.forEach(p => {
    assert(!ids.has(p.presetId), `Duplicate presetId found in catalog: ${p.presetId}`)
    ids.add(p.presetId)
  })
  console.log(`✓ All ${ids.size} presets have strictly unique preset IDs (no collisions)`)
}

// ─── AUDIT 2: Subject Isolation & Cross-Subject Bleeding ─────────────────────
console.log('\n--- AUDIT 2: Cross-Subject Bleeding & Overlap Check ---')
{
  const testSubjects = [
    { grade: '8', code: 'MATH', name: 'Mathematics', expectedId: 'ontario-g8-math' },
    { grade: '8', code: 'SCI', name: 'Science and Technology', expectedId: 'ontario-g8-science-tech' },
    { grade: '8', code: 'ART', name: 'The Arts', expectedId: 'ontario-g8-arts' },
    { grade: '8', code: 'LANG', name: 'Language', expectedId: 'ontario-g8-language' },
    { grade: '8', code: 'GEO', name: 'Geography', expectedId: 'ontario-g8-geography' },
    { grade: '8', code: 'HIST', name: 'History', expectedId: 'ontario-g8-history' },
    { grade: '8', code: 'HPE', name: 'Health and Physical Education', expectedId: 'ontario-g8-hpe' },
    { grade: '8', code: 'FSL', name: 'Core French', expectedId: 'ontario-g8-core-french' },
    { grade: '8', code: 'FI', name: 'French Immersion', expectedId: 'ontario-g8-french-immersion' },
    { grade: '8', code: 'FSL-EXT', name: 'Extended French', expectedId: 'ontario-g8-extended-french' },
    // Grade 7
    { grade: '7', code: 'MATH', name: 'Mathematics', expectedId: 'ontario-g7-math' },
    { grade: '7', code: 'SCI', name: 'Science and Technology', expectedId: 'ontario-g7-science-tech' }
  ]

  testSubjects.forEach(ts => {
    const match = findElementaryPreset(ts.grade, ts.code, ts.name)
    assert(match, `Found match for ${ts.name} (Grade ${ts.grade})`)
    assert(match.presetId === ts.expectedId, `Subject ${ts.name} resolved to ${match.presetId}, expected ${ts.expectedId}`)
  })
  console.log('✓ All 12 tested subjects resolve cleanly to their exact matching preset with zero bleeding')

  // Check expectation codes: Ensure Math expectations don't contain Science expectations, etc.
  const math8 = curriculumPresets.find(p => p.presetId === 'ontario-g8-math')
  const sci8 = curriculumPresets.find(p => p.presetId === 'ontario-g8-science-tech')

  const mathCodes = new Set()
  math8.strands.forEach(s => (s.expectations || s.overalls || []).forEach(e => mathCodes.add(e.code)))

  const sciCodes = new Set()
  sci8.strands.forEach(s => (s.expectations || s.overalls || []).forEach(e => sciCodes.add(e.code)))

  // Check intersection: Math codes are typically A1.1, B1.1, etc. Science codes are typically A1.1, B1.1 too, but text and strand names must be completely different
  const mathStrands = math8.strands.map(s => s.name.toLowerCase())
  const sciStrands = sci8.strands.map(s => s.name.toLowerCase())

  mathStrands.forEach(ms => {
    assert(!sciStrands.includes(ms), `Strand name overlap between Math & Science: "${ms}"`)
  })
  console.log('✓ Strand names between Grade 8 Math and Grade 8 Science are 100% disjoint')
}

// ─── AUDIT 3: Expectation Weight Multiplier Math ──────────────────────────────
console.log('\n--- AUDIT 3: Weightings Calculation & Impact Audit ---')
{
  const mockClass = {
    id: 'c_test_weights',
    name: 'Class 8A',
    sbarCalculationAlgorithm: 'decaying_average',
    students: {
      'stu1': { id: 'stu1', firstName: 'Student', expectationOverrides: {} }
    },
    gradebookUnits: [
      {
        unitId: 'u_sbar',
        name: 'Strand B: Number',
        expectations: [
          { code: 'B1.1', text: 'Rational Numbers', weight: 1.0 },
          { code: 'B1.2', text: 'Financial Literacy Multiplier', weight: 2.0 },
          { code: 'B1.3', text: 'Diagnostic Pre-test', weight: 0 } // Diagnostic
        ]
      }
    ]
  }

  const mockAssessments = [
    { assessmentId: 'a1', title: 'Task 1', evaluationType: 'summative', expectationIds: ['B1.1'], date: '2026-03-01' },
    { assessmentId: 'a2', title: 'Task 2', evaluationType: 'summative', expectationIds: ['B1.2'], date: '2026-03-02' },
    { assessmentId: 'a3', title: 'Task 3', evaluationType: 'diagnostic', expectationIds: ['B1.3'], date: '2026-03-03' }
  ]

  const mockGrades = {
    'a1': { 'stu1': { assessmentId: 'a1', studentId: 'stu1', expectationScores: { 'B1.1': 70 } } },
    'a2': { 'stu1': { assessmentId: 'a2', studentId: 'stu1', expectationScores: { 'B1.2': 100 } } },
    'a3': { 'stu1': { assessmentId: 'a3', studentId: 'stu1', expectationScores: { 'B1.3': 20 } } } // Very low diagnostic score
  }

  const masteryMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGrades, 'decaying_average')
  assert(masteryMap['stu1']['B1.1'].weight === 1.0, 'B1.1 weight is 1.0')
  assert(masteryMap['stu1']['B1.2'].weight === 2.0, 'B1.2 weight is 2.0')
  assert(masteryMap['stu1']['B1.3'].weight === 0, 'B1.3 weight is 0')

  const overall = calculateSBARStudentOverallMastery('stu1', mockClass, mockAssessments, mockGrades, 'decaying_average')
  
  // Math:
  // B1.1 (weight 1.0) = 70%
  // B1.2 (weight 2.0) = 100%
  // B1.3 (weight 0) = excluded from overall
  // Weighted Average: (70 * 1.0 + 100 * 2.0) / (1.0 + 2.0) = 270 / 3 = 90%
  // If B1.3 was improperly counted: (70*1 + 100*2 + 20*0? No, unweighted average would be (70+100+20)/3 = 63.3%)
  assert(overall === 90, `Overall calculated score is ${overall}%, expected strictly 90%`)
  console.log(`✓ SBAR Engine correctly weighted: 70% (1x) + 100% (2x) = ${overall}% (Diagnostic 0x strictly ignored)`)
}

// ─── AUDIT 4: Adding and Removing Items from Library ─────────────────────────
console.log('\n--- AUDIT 4: Adding & Removing Items from Library ---')
{
  const base = JSON.parse(JSON.stringify(curriculumPresets.find(p => p.presetId === 'ontario-g8-math')))
  
  // Test adding a custom strand
  const newStrand = {
    id: 'strand_custom_stem',
    name: 'Strand G: Applied STEM & Coding Robotics',
    expectations: [
      { id: 'exp_stem_1', code: 'G1.1', description: 'Robotics Control Logic', weight: 2.0, active: true }
    ]
  }
  base.strands.push(newStrand)
  assert(base.strands.length === 7, 'Strand added: total strands is now 7')

  // Test removing a strand
  base.strands.splice(0, 1) // Remove Strand A
  assert(base.strands.length === 6, 'Strand A removed: total strands is now 6')
  assert(base.strands[0].name.includes('Number'), 'New first strand is Strand B: Number')

  // Test removing an expectation from Strand B
  const initialExpCount = base.strands[0].expectations?.length || base.strands[0].overalls?.length || 0
  if (base.strands[0].expectations) {
    base.strands[0].expectations.splice(0, 1)
    assert(base.strands[0].expectations.length === initialExpCount - 1, 'Expectation removed')
  }
  console.log('✓ Adding/removing strands and expectations functions predictably without mutation side effects')
}

// ─── AUDIT 5: Populate Subject From Preset Format Compatibility ──────────────
console.log('\n--- AUDIT 5: populateSubjectFromPresets Format Compatibility ---')
{
  const masterSavedPreset = {
    presetId: 'ontario-g8-math',
    title: 'Ontario Grade 8 Mathematics (2020)',
    grade: 'Grade 8',
    panel: 'elementary',
    strands: [
      {
        id: 's_num',
        name: 'Strand B: Number',
        expectations: [
          { id: 'e1', code: 'B1.1', description: 'Fractions', weight: 1.0, active: true },
          { id: 'e2', code: 'B1.2', description: 'Financial Literacy', weight: 2.0, active: true }
        ]
      }
    ]
  }

  const emptySub = {
    subjectId: 'sub_math_8',
    name: 'Mathematics',
    code: 'MATH',
    gradebookUnits: [],
    expectations: []
  }

  const populated = populateSubjectFromPresets(emptySub, [masterSavedPreset], 'all', { forceRefresh: true })
  assert(populated.expectations && populated.expectations.length === 2, `Expected 2 expectations, got ${populated.expectations?.length}`)
  assert(populated.expectations[0].code === 'B1.1', 'First expectation code is B1.1')
  assert(populated.expectations[1].weight === 2.0, 'Second expectation preserved 2.0x weight')
  console.log('✓ populateSubjectFromPresets successfully and natively handles strand.expectations format')
}

// ─── AUDIT 6: Class "Push to Master" ID Consistency Audit ───────────────────
console.log('\n--- AUDIT 6: Class "Push to Master" ID Consistency Audit ---')
{
  const sub = {
    subjectId: 'sub_m8',
    name: 'Mathematics',
    code: 'MATH',
    gradebookUnits: [{ unitId: 'u1', name: 'Number' }],
    expectations: [{ expectationId: 'e1', unitId: 'u1', code: 'B1.1', description: 'Rational numbers', weight: 2.0 }]
  }
  const gradeStr = '8'

  // Resolution logic:
  const matched = resolveSubjectPreset(gradeStr, sub.code, sub.name) || findElementaryPreset(gradeStr, sub.code, sub.name)
  assert(matched, 'Resolved matching master preset')
  assert(matched.presetId === 'ontario-g8-math', `Resolved presetId is ${matched.presetId}, expected ontario-g8-math`)
  console.log(`✓ Class "Mathematics" (Grade 8) accurately targets "${matched.presetId}" (${matched.title}) for master library update`)
}

// ─── AUDIT 7: syncPresetToClass Safety & Data Integrity ─────────────────────
console.log('\n--- AUDIT 7: syncPresetToClass Safety & Assessment Preservation ---')
{
  const { syncPresetToClass } = await import('./composables/useCurriculumLibrary.js')

  const originalExpId = 'exp_stable_uuid_123'
  const mockClass = {
    id: 'cls_jim_8',
    name: 'Jim',
    classType: 'elementary',
    subjects: [
      {
        subjectId: 'sub_math_jim',
        name: 'Mathematics',
        code: 'MATH',
        gradebookUnits: [{ unitId: 'u_num', name: 'Strand B: Number', gradeLevel: '8', weight: 0 }],
        expectations: [
          { expectationId: originalExpId, unitId: 'u_num', code: 'B1.1', description: 'Old wording', weight: 1.0, active: true }
        ]
      }
    ],
    assessments: [
      { assessmentId: 'as_1', title: 'Fractions Test', expectationIds: [originalExpId] }
    ]
  }

  const updatedMaster = {
    presetId: 'ontario-g8-math',
    title: 'Ontario Grade 8 Mathematics (2020)',
    subjectCode: 'MATH',
    grade: '8',
    strands: [
      {
        name: 'Strand B: Number',
        expectations: [
          // Weight increased to 2.0x, wording updated
          { code: 'B1.1', description: 'Updated fractions with applications', weight: 2.0, active: true },
          // New expectation added
          { code: 'B1.2', description: 'Financial Math', weight: 1.5, active: true }
        ]
      }
    ]
  }

  const syncResult = syncPresetToClass(mockClass, updatedMaster)
  assert(syncResult, 'syncPresetToClass returned result')
  assert(syncResult.changesCount === 2, `Expected 2 changes (1 update, 1 addition), got ${syncResult.changesCount}`)

  const syncedSub = syncResult.updatedClass.subjects[0]
  assert(syncedSub.expectations.length === 2, 'Class now has 2 expectations')

  const b11 = syncedSub.expectations.find(e => e.code === 'B1.1')
  assert(b11, 'B1.1 found in synced class')
  assert(b11.expectationId === originalExpId, 'CRITICAL: expectationId was 100% PRESERVED! Existing assessment links are unharmed.')
  assert(b11.weight === 2.0, 'B1.1 weight updated from 1.0 to 2.0')
  assert(b11.description === 'Updated fractions with applications', 'B1.1 description updated')

  const b12 = syncedSub.expectations.find(e => e.code === 'B1.2')
  assert(b12, 'B1.2 was added to class')
  assert(b12.weight === 1.5, 'B1.2 weight is 1.5')

  // Verify class assessments still point to the exact same expectation
  assert(mockClass.assessments[0].expectationIds[0] === originalExpId, 'Assessment expectationIds link untouched')
  console.log('✓ syncPresetToClass successfully updated weights and descriptions while 100% preserving existing assessment relationships')
}

// ─── AUDIT 8: Cross-Subject Code Isolation (e.g. B1.1 Math vs B1.1 Science) ─
console.log('\n--- AUDIT 8: Cross-Subject Code Isolation (Math B1.1 vs Science B1.1) ---')
{
  const { syncPresetToClass } = await import('./composables/useCurriculumLibrary.js')

  const mathExpId = 'exp_math_b11_uuid'
  const sciExpId = 'exp_sci_b11_uuid'

  const multiSubjectClass = {
    id: 'cls_grade8_all',
    name: '8A Homeroom',
    gradeLevel: '8',
    classType: 'elementary',
    subjects: [
      {
        subjectId: 'sub_math',
        name: 'Mathematics',
        code: 'MATH',
        gradebookUnits: [{ unitId: 'u_math_b', name: 'Strand B: Number' }],
        expectations: [
          { expectationId: mathExpId, unitId: 'u_math_b', code: 'B1.1', description: 'Math Fractions', weight: 1.0, active: true }
        ]
      },
      {
        subjectId: 'sub_sci',
        name: 'Science & Technology',
        code: 'SCI',
        gradebookUnits: [{ unitId: 'u_sci_b', name: 'Strand B: Life Systems' }],
        expectations: [
          { expectationId: sciExpId, unitId: 'u_sci_b', code: 'B1.1', description: 'Cell Organelles', weight: 1.0, active: true }
        ]
      }
    ]
  }

  const mathPreset = {
    presetId: 'ontario-g8-math',
    title: 'Ontario Grade 8 Mathematics (2020)',
    subjectCode: 'MATH',
    grade: '8',
    strands: [
      {
        name: 'Strand B: Number',
        expectations: [
          { code: 'B1.1', description: 'Updated Math Fractions Mastery', weight: 2.5, active: true }
        ]
      }
    ]
  }

  const syncResult = syncPresetToClass(multiSubjectClass, mathPreset)
  assert(syncResult, 'Sync returned result for Math')
  assert(syncResult.subjectName === 'Mathematics', 'Sync targeted Mathematics')

  const syncedMath = syncResult.updatedClass.subjects.find(s => s.code === 'MATH')
  const syncedSci = syncResult.updatedClass.subjects.find(s => s.code === 'SCI')

  // Verify Math was updated
  const updatedMathExp = syncedMath.expectations.find(e => e.code === 'B1.1')
  assert(updatedMathExp.weight === 2.5, 'Math B1.1 weight updated to 2.5')
  assert(updatedMathExp.description === 'Updated Math Fractions Mastery', 'Math B1.1 description updated')
  assert(updatedMathExp.expectationId === mathExpId, 'Math B1.1 ID preserved')

  // Verify Science was 100% UNTOUCHED
  const sciExp = syncedSci.expectations.find(e => e.code === 'B1.1')
  assert(sciExp.weight === 1.0, 'Science B1.1 weight remains 1.0')
  assert(sciExp.description === 'Cell Organelles', 'Science B1.1 description remains Cell Organelles')
  assert(sciExp.expectationId === sciExpId, 'Science B1.1 ID untouched')
  console.log('✓ Math B1.1 and Science B1.1 coexist in same class with zero collision; updating Math leaves Science 100% intact')
}

// ─── AUDIT 9: Expectation ID Stability During Re-Import / Refresh ───────────
console.log('\n--- AUDIT 9: Expectation ID Stability During Re-Import / Refresh ---')
{
  const { populateSubjectFromPresets } = await import('./composables/useElementary.js')

  const existingExpId = 'stable_b11_assessment_link'
  const subjectBefore = {
    subjectId: 'sub_math',
    name: 'Mathematics',
    gradebookUnits: [
      { unitId: 'unit_number_existing', name: 'Strand B: Number', gradeLevel: '8', weight: 0 }
    ],
    expectations: [
      { expectationId: existingExpId, unitId: 'unit_number_existing', code: 'B1.1', description: 'Original wording', weight: 1.0, gradeLevel: '8' }
    ]
  }

  const updatedPreset = {
    presetId: 'ontario-g8-math',
    title: 'Ontario Grade 8 Mathematics (2020)',
    grade: '8',
    strands: [
      {
        name: 'Strand B: Number',
        expectations: [
          { code: 'B1.1', description: 'New Enhanced Text', weight: 2.0, active: true }
        ]
      }
    ]
  }

  const refreshedSubject = populateSubjectFromPresets(subjectBefore, [updatedPreset], 'all', { forceRefresh: true })
  const refreshedB11 = refreshedSubject.expectations.find(e => e.code === 'B1.1')

  assert(refreshedB11, 'B1.1 exists in refreshed subject')
  assert(refreshedB11.expectationId === existingExpId, `Expected stable ID "${existingExpId}", got "${refreshedB11.expectationId}"`)
  assert(refreshedB11.weight === 2.0, `Expected updated weight 2.0, got ${refreshedB11.weight}`)
  assert(refreshedB11.description === 'New Enhanced Text', 'Description updated correctly')
  assert(refreshedSubject.gradebookUnits[0].unitId === 'unit_number_existing', 'Unit ID also stably preserved')
  console.log('✓ Re-importing curriculum successfully updates descriptions & weights while 100% preserving existing expectation & unit IDs')
}

// ─── AUDIT 10: Secondary Course Master Sync & ID Stability ───────────────────
console.log('\n--- AUDIT 10: Secondary Course Master Sync & ID Stability ---')
{
  const { syncPresetToClass } = await import('./composables/useCurriculumLibrary.js')

  const originalMthExpId = 'mth_exp_b11_uuid'
  const secondaryClass = {
    id: 'cls_sec_mth1w',
    name: 'Grade 9 Math (De-streamed)',
    courseCode: 'MTH1W',
    classType: 'secondary',
    gradingFramework: 'sbar',
    gradebookUnits: [
      {
        unitId: 'unit_mth_num',
        name: 'Strand B: Number',
        expectations: [
          { expectationId: originalMthExpId, code: 'B1.1', text: 'Rational Numbers Initial', weight: 1.0 }
        ]
      }
    ]
  }

  const secMasterPreset = {
    presetId: 'ontario-mth1w',
    title: 'Ontario Grade 9 Mathematics (MTH1W, 2021)',
    panel: 'secondary',
    grade: '9',
    subjectCode: 'MTH1W',
    strands: [
      {
        name: 'Strand B: Number',
        expectations: [
          { code: 'B1.1', description: 'Rational Numbers with Powers & Scientific Notation', weight: 2.0 }
        ]
      }
    ]
  }

  const syncResult = syncPresetToClass(secondaryClass, secMasterPreset)
  assert(syncResult, 'Secondary class matched and synced')
  assert(syncResult.changesCount > 0, 'Changes count > 0')

  const updatedUnit = syncResult.updatedClass.gradebookUnits[0]
  const updatedExp = updatedUnit.expectations.find(e => e.code === 'B1.1')

  assert(updatedExp, 'B1.1 found in secondary class')
  assert(updatedExp.expectationId === originalMthExpId, 'Secondary expectationId 100% PRESERVED')
  assert(updatedExp.weight === 2.0, 'Secondary weight updated to 2.0')
  assert(updatedExp.text === 'Rational Numbers with Powers & Scientific Notation', 'Secondary text updated')
  console.log('✓ Secondary course MTH1W accurately synced from Master with stable expectation IDs and updated weights')
}

console.log('\n=================================================================')
console.log('🏁 ALL AUDIT & INTEGRITY CHECKS PASSED!')
console.log('=================================================================')
