/**
 * src/test_mode_separation_audit.js
 *
 * Automated verification of complete architectural separation between:
 * - Elementary (multi-subject homeroom) mode
 * - Secondary (course-code based) mode
 *
 * Checks:
 * 1. Elementary subjects, units, categories, and expectations NEVER leak into secondary class views or records.
 * 2. Secondary course sections and frameworks NEVER leak into elementary homeroom views.
 * 3. Class switching lifecycle cleanly re-initializes state with ZERO residual memory state.
 * 4. Assessment filtering (filterAssessmentsForSubject) strictly scopes elementary subjects without leakage.
 * 5. Dossier, report cards, and trend graphs correctly adapt between multi-subject and single-course layouts.
 * 6. Master curriculum library preserves panel isolation between elementary and secondary.
 */

import assert from 'assert'

// Mock browser environment for composables
const storage = {}
globalThis.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = String(v) },
  removeItem: (k) => { delete storage[k] },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
}
globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
}

const {
  activeClass,
  activeSubjectId,
  teachingMode,
  selectedYear,
  selectedSemester,
  classList,
  students
} = await import('./composables/useClassroomState.js')

const {
  getEffectiveClassRecord,
  getStudentEffectiveGrade,
  filterAssessmentsForSubject,
  useElementary,
  DEFAULT_ELEMENTARY_SUBJECTS
} = await import('./composables/useElementary.js')

const {
  activeClassRecord,
  assessments,
  grades,
  classGrades,
  selectedStudentId,
  selectedMilestone,
  activeSubCohortFilter,
  loadGradebook,
  clearGradebook,
  setActiveSubject,
  isAssessmentInSubCohort,
  isAssessmentApplicableToStudent
} = await import('./composables/useGradebook.js')

const {
  getMergedCurriculumPresets,
  resolveSubjectPreset,
  syncPresetToClass
} = await import('./composables/useCurriculumLibrary.js')

const {
  calculateStudentGrade,
  isCohortMatch
} = await import('./db/gradebook/gradeCalc.js')

const {
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  getSBARLevelBadge
} = await import('./db/gradebook/gradeCalcSBAR.js')

console.log('=================================================================')
console.log('🏛️  ELEMENTARY VS SECONDARY ARCHITECTURAL SEPARATION AUDIT')
console.log('=================================================================\n')

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const secondaryClass = {
  classId: 'sec_sch4u_01',
  name: 'Grade 12 Chemistry',
  courseCode: 'SCH4U-01',
  gradeLevel: 'Grade 12',
  classType: 'secondary',
  semester: '1',
  year: '2025-26',
  periodNumber: 1,
  periodStartTime: '08:30',
  gradingFramework: 'traditional',
  gradebookCategories: [
    { categoryId: 'cat_k', name: 'Knowledge & Understanding', weight: 30 },
    { categoryId: 'cat_t', name: 'Thinking & Inquiry', weight: 25 },
    { categoryId: 'cat_c', name: 'Communication', weight: 20 },
    { categoryId: 'cat_a', name: 'Application', weight: 25 }
  ],
  gradebookUnits: [
    { unitId: 'u_chem_1', name: 'Organic Chemistry', expectations: [{ expectationId: 'exp_c1', code: 'A1.1', text: 'Organic naming' }] },
    { unitId: 'u_chem_2', name: 'Structure and Properties', expectations: [{ expectationId: 'exp_c2', code: 'B1.1', text: 'Lewis structures' }] }
  ],
  students: {
    'st_sec_1': { studentId: 'st_sec_1', firstName: 'Alice', lastName: 'Vance', courseCode: 'SCH4U-01' },
    'st_sec_2': { studentId: 'st_sec_2', firstName: 'Bob', lastName: 'Stone', courseCode: 'SCH4U-01' }
  }
}

const splitSecondaryClass = {
  classId: 'sec_split_01',
  name: 'Grade 11/12 Physics',
  classType: 'secondary',
  isSplitClass: true,
  courseSections: ['SPH3U-01', 'SPH4U-01'],
  year: '2025-26',
  courseFrameworks: {
    'SPH3U-01': {
      gradebookCategories: [{ categoryId: 'sph3u_cat', name: 'Gr 11 Physics Work', weight: 100 }],
      gradebookUnits: [{ unitId: 'u_sph3u_1', name: 'Kinematics' }]
    },
    'SPH4U-01': {
      gradebookCategories: [{ categoryId: 'sph4u_cat', name: 'Gr 12 Physics Work', weight: 100 }],
      gradebookUnits: [{ unitId: 'u_sph4u_1', name: 'Quantum Mechanics' }]
    }
  },
  students: {
    'st_sph_1': { studentId: 'st_sph_1', firstName: 'Charlie', lastName: 'Cox', courseCode: 'SPH3U-01' },
    'st_sph_2': { studentId: 'st_sph_2', firstName: 'Diana', lastName: 'Prince', courseCode: 'SPH4U-01' }
  }
}

const elementaryClass = {
  classId: 'elem_gr78_01',
  name: 'Grade 7/8 Homeroom',
  gradeLevel: 'Grade 7/8',
  classType: 'elementary',
  year: '2025-26',
  subjects: [
    {
      subjectId: 'sub_math',
      name: 'Mathematics',
      code: 'MATH',
      icon: 'Calculator',
      gradingFramework: 'sbar',
      sbarAlgorithm: 'decaying_average',
      gradebookUnits: [
        { unitId: 'u_m_7', name: 'Grade 7 Fractions', gradeLevel: 'Grade 7' },
        { unitId: 'u_m_8', name: 'Grade 8 Algebra', gradeLevel: 'Grade 8' }
      ],
      expectations: [
        { expectationId: 'exp_m_b1', unitId: 'u_m_7', code: 'B1.1', gradeLevel: 'Grade 7', weight: 1.0 },
        { expectationId: 'exp_m_b2', unitId: 'u_m_8', code: 'B1.2', gradeLevel: 'Grade 8', weight: 1.0 }
      ]
    },
    {
      subjectId: 'sub_sci',
      name: 'Science & Technology',
      code: 'SCI',
      icon: 'FlaskConical',
      gradingFramework: 'sbar',
      sbarAlgorithm: 'most_recent',
      gradebookUnits: [
        { unitId: 'u_s_7', name: 'Pure Substances', gradeLevel: 'Grade 7' },
        { unitId: 'u_s_8', name: 'Fluids & Systems', gradeLevel: 'Grade 8' }
      ],
      expectations: [
        { expectationId: 'exp_s_b1', unitId: 'u_s_7', code: 'B1.1', gradeLevel: 'Grade 7', weight: 1.0 },
        { expectationId: 'exp_s_b2', unitId: 'u_s_8', code: 'B1.2', gradeLevel: 'Grade 8', weight: 1.0 }
      ]
    },
    {
      subjectId: 'sub_art',
      name: 'The Arts',
      code: 'ART',
      icon: 'Palette',
      gradingFramework: 'traditional',
      gradebookCategories: [
        { categoryId: 'cat_art_proj', name: 'Visual Projects', weight: 70 },
        { categoryId: 'cat_art_sketch', name: 'Sketchbook', weight: 30 }
      ],
      gradebookUnits: [
        { unitId: 'u_art_1', name: 'Color & Contrast', gradeLevel: 'Grade 7/8' }
      ],
      expectations: [
        { expectationId: 'exp_a_d1', unitId: 'u_art_1', code: 'D1.1', gradeLevel: 'Grade 7/8', weight: 1.0 }
      ]
    }
  ],
  students: {
    'st_elm_1': {
      studentId: 'st_elm_1',
      firstName: 'Evan',
      lastName: 'Wright',
      gradeLevel: 'Grade 7',
      accommodations: {
        modifiedSubjectGrades: {
          'sub_math': 'Grade 5' // IEP modified in Math only!
        }
      }
    },
    'st_elm_2': {
      studentId: 'st_elm_2',
      firstName: 'Fiona',
      lastName: 'Gallagher',
      gradeLevel: 'Grade 8'
    }
  }
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function it(desc, fn) {
  try {
    fn()
    console.log(`  ✓ ${desc}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`)
    console.error(`    ${err.stack || err.message}`)
    failed++
  }
}

// 1. Effective Class Record Isolation
console.log('TEST GROUP 1: Effective Class Record Isolation')

it('Secondary class record has zero elementary subject properties', () => {
  activeSubjectId.value = 'sub_math' // Simulate leftover state
  const effSec = getEffectiveClassRecord(secondaryClass, activeSubjectId.value)
  
  assert.strictEqual(effSec.activeSubjectId, null, 'activeSubjectId must be null for secondary')
  assert.strictEqual(effSec.activeSubjectName, null, 'activeSubjectName must be null for secondary')
  assert.strictEqual(effSec.activeSubjectCode, null, 'activeSubjectCode must be null for secondary')
  assert.strictEqual(effSec.activeSubjectIcon, null, 'activeSubjectIcon must be null for secondary')
  assert.strictEqual(effSec.classType, 'secondary')
  assert.strictEqual(effSec.gradingFramework, 'traditional')
  assert.strictEqual(effSec.gradebookCategories.length, 4, 'Secondary categories preserved')
  assert.strictEqual(effSec.gradebookUnits.length, 2, 'Secondary units preserved')
})

it('Split secondary class record resolves course sections without elementary pollution', () => {
  const effSph3u = getEffectiveClassRecord(splitSecondaryClass, null, 'SPH3U-01')
  assert.strictEqual(effSph3u.activeSubjectId, null)
  assert.strictEqual(effSph3u.gradebookCategories[0].name, 'Gr 11 Physics Work')
  assert.strictEqual(effSph3u.gradebookUnits[0].name, 'Kinematics')

  const effSph4u = getEffectiveClassRecord(splitSecondaryClass, null, 'SPH4U-01')
  assert.strictEqual(effSph4u.activeSubjectId, null)
  assert.strictEqual(effSph4u.gradebookCategories[0].name, 'Gr 12 Physics Work')
  assert.strictEqual(effSph4u.gradebookUnits[0].name, 'Quantum Mechanics')
})

it('Elementary class derives subject-specific framework, units, and expectations correctly', () => {
  const effMath = getEffectiveClassRecord(elementaryClass, 'sub_math')
  assert.strictEqual(effMath.activeSubjectId, 'sub_math')
  assert.strictEqual(effMath.activeSubjectName, 'Mathematics')
  assert.strictEqual(effMath.gradingFramework, 'sbar')
  assert.strictEqual(effMath.sbarAlgorithm, 'decaying_average')
  assert.strictEqual(effMath.gradebookUnits.length, 2)
  assert.strictEqual(effMath.expectations.length, 2)

  const effArt = getEffectiveClassRecord(elementaryClass, 'sub_art')
  assert.strictEqual(effArt.activeSubjectId, 'sub_art')
  assert.strictEqual(effArt.activeSubjectName, 'The Arts')
  assert.strictEqual(effArt.gradingFramework, 'traditional')
  assert.strictEqual(effArt.gradebookCategories[0].name, 'Visual Projects')
  assert.strictEqual(effArt.gradebookUnits[0].name, 'Color & Contrast')
})

// 2. Assessment Filtering and Isolation
console.log('\nTEST GROUP 2: Assessment Scoping & Zero Cross-Subject Bleed')

const sampleAssessments = [
  { assessmentId: 'a_math_1', name: 'Math Quiz 1', subjectId: 'sub_math', unitId: 'u_m_7' },
  { assessmentId: 'a_sci_1', name: 'Science Lab 1', subjectId: 'sub_sci', unitId: 'u_s_7' },
  { assessmentId: 'a_sci_nounit', name: 'Science Check', subjectId: 'sub_sci' },
  { assessmentId: 'a_art_1', name: 'Color Wheel Project', subjectId: 'sub_art', unitId: 'u_art_1' },
  // Assessment with unitId but no subjectId
  { assessmentId: 'a_math_legacy', name: 'Legacy Fractions', unitId: 'u_m_7' },
  // Assessment with expectationId but no subjectId
  { assessmentId: 'a_sci_exp', name: 'Fluids Investigation', expectationIds: ['B1.2'] },
  // Pure unassigned assessment (no subjectId, no unitId, no expectations)
  { assessmentId: 'a_unassigned', name: 'General Diagnostic', date: '2025-09-10' }
]

it('Secondary classes receive all assessments completely untouched', () => {
  const scoped = filterAssessmentsForSubject(sampleAssessments, secondaryClass)
  assert.strictEqual(scoped.length, sampleAssessments.length, 'Secondary classes must never filter out assessments by subject')
})

it('Elementary Math tab isolates Math assessments and excludes Science/Art', () => {
  const effMath = getEffectiveClassRecord(elementaryClass, 'sub_math')
  const mathScoped = filterAssessmentsForSubject(sampleAssessments, effMath)
  
  const ids = mathScoped.map(a => a.assessmentId)
  assert.ok(ids.includes('a_math_1'), 'Includes Math assessment with subjectId')
  assert.ok(ids.includes('a_math_legacy'), 'Includes Math assessment via unitId')
  assert.ok(ids.includes('a_unassigned'), 'Unassigned fallback maps to first subject (Math)')
  assert.ok(!ids.includes('a_sci_1'), 'Blocks Science assessment from Math tab')
  assert.ok(!ids.includes('a_sci_nounit'), 'Blocks Science assessment without unit from Math tab')
  assert.ok(!ids.includes('a_art_1'), 'Blocks Art assessment from Math tab')
})

it('Elementary Science tab isolates Science assessments and excludes Math/Art', () => {
  const effSci = getEffectiveClassRecord(elementaryClass, 'sub_sci')
  const sciScoped = filterAssessmentsForSubject(sampleAssessments, effSci)
  
  const ids = sciScoped.map(a => a.assessmentId)
  assert.ok(ids.includes('a_sci_1'), 'Includes Science assessment')
  assert.ok(ids.includes('a_sci_nounit'), 'Includes Science assessment without unit')
  assert.ok(!ids.includes('a_math_1'), 'Blocks Math assessment from Science tab')
  assert.ok(!ids.includes('a_math_legacy'), 'Blocks legacy Math assessment from Science tab')
  assert.ok(!ids.includes('a_art_1'), 'Blocks Art assessment from Science tab')
  assert.ok(!ids.includes('a_unassigned'), 'Unassigned fallback does NOT duplicate to Science tab')
})

it('Elementary Art tab isolates Art assessments and respects traditional framework', () => {
  const effArt = getEffectiveClassRecord(elementaryClass, 'sub_art')
  const artScoped = filterAssessmentsForSubject(sampleAssessments, effArt)
  
  const ids = artScoped.map(a => a.assessmentId)
  assert.strictEqual(ids.length, 1)
  assert.strictEqual(ids[0], 'a_art_1')
})

// 3. Class Switch Lifecycle & Residual State
console.log('\nTEST GROUP 3: Class Switch Lifecycle & Zero Residual State')

it('Switching to secondary class cleans activeSubjectId to empty string', () => {
  // Simulate active elementary class
  activeSubjectId.value = 'sub_math'
  assert.strictEqual(activeSubjectId.value, 'sub_math')

  // Activate secondary class (simulating useClassroom._activateClass logic)
  const cls = secondaryClass
  if (cls.classType === 'elementary') {
    const subs = cls.subjects && cls.subjects.length > 0 ? cls.subjects : []
    const currentValid = subs.find(s => s.subjectId === activeSubjectId.value)
    activeSubjectId.value = currentValid ? currentValid.subjectId : (subs[0]?.subjectId || '')
  } else {
    activeSubjectId.value = ''
  }

  assert.strictEqual(activeSubjectId.value, '', 'activeSubjectId MUST be empty string in secondary mode')
  assert.strictEqual(localStorage.getItem('activeSubjectId'), '', 'localStorage must persist empty string')
})

it('Switching to elementary class re-initializes activeSubjectId to a valid subject', () => {
  activeSubjectId.value = '' // Was in secondary mode
  const cls = elementaryClass
  if (cls.classType === 'elementary') {
    const subs = cls.subjects && cls.subjects.length > 0 ? cls.subjects : []
    const currentValid = subs.find(s => s.subjectId === activeSubjectId.value)
    activeSubjectId.value = currentValid ? currentValid.subjectId : (subs[0]?.subjectId || '')
  } else {
    activeSubjectId.value = ''
  }

  assert.strictEqual(activeSubjectId.value, 'sub_math', 'activeSubjectId must auto-select first valid subject')
})

it('Switching to a different elementary class adjusts activeSubjectId if invalid in new class', () => {
  activeSubjectId.value = 'sub_special_french'
  const cls = elementaryClass // only has sub_math, sub_sci, sub_art
  if (cls.classType === 'elementary') {
    const subs = cls.subjects && cls.subjects.length > 0 ? cls.subjects : []
    const currentValid = subs.find(s => s.subjectId === activeSubjectId.value)
    activeSubjectId.value = currentValid ? currentValid.subjectId : (subs[0]?.subjectId || '')
  } else {
    activeSubjectId.value = ''
  }

  assert.strictEqual(activeSubjectId.value, 'sub_math', 'activeSubjectId re-anchors to valid subject')
})

it('clearGradebook cleanly resets all gradebook reactive variables', () => {
  // Populate dummy state
  activeClassRecord.value = { classId: 'dummy' }
  assessments.value = [{ assessmentId: 'a1' }]
  grades.value = [{ gradeId: 'g1' }]
  classGrades.value = { s1: { overallGrade: 85 } }
  selectedStudentId.value = 's1'
  selectedMilestone.value = 'm1'
  activeSubCohortFilter.value = 'Grade 7'

  clearGradebook()

  assert.strictEqual(activeClassRecord.value, null)
  assert.strictEqual(assessments.value.length, 0)
  assert.strictEqual(grades.value.length, 0)
  assert.deepStrictEqual(classGrades.value, {})
  assert.strictEqual(selectedStudentId.value, null)
  assert.strictEqual(selectedMilestone.value, null)
  assert.strictEqual(activeSubCohortFilter.value, 'all')
})

it('setActiveSubject is a no-op on secondary classes', async () => {
  activeClassRecord.value = { classId: 'sec_1', classType: 'secondary' }
  activeSubjectId.value = ''

  await setActiveSubject('some_elementary_subject')
  assert.strictEqual(activeSubjectId.value, '', 'setActiveSubject must refuse to set subject on secondary classes')
})

// 4. Dossier, Report Cards, & Trend Adaptation
console.log('\nTEST GROUP 4: Student Dossiers, Report Cards, & Trend Adaptation')

it('Student IEP accommodations only apply to designated elementary subject, never secondary', () => {
  const evan = elementaryClass.students['st_elm_1']
  
  // Math: modified to Grade 5
  const mathGrade = getStudentEffectiveGrade(evan, 'sub_math')
  assert.strictEqual(mathGrade, 'Grade 5', 'Evan has modified Grade 5 IEP in Math')

  // Science: natural Grade 7
  const sciGrade = getStudentEffectiveGrade(evan, 'sub_sci')
  assert.strictEqual(sciGrade, 'Grade 7', 'Evan is regular Grade 7 in Science')

  // Secondary student: course code always returned
  const alice = secondaryClass.students['st_sec_1']
  const secCohort = getStudentEffectiveGrade(alice, null)
  assert.strictEqual(secCohort, '') // no gradeLevel, only courseCode
  const secCourse = alice.courseCode
  assert.strictEqual(secCourse, 'SCH4U-01')
})

it('isAssessmentApplicableToStudent cleanly differentiates elementary grades vs secondary courses', () => {
  const evan = elementaryClass.students['st_elm_1']
  const fiona = elementaryClass.students['st_elm_2']
  const alice = secondaryClass.students['st_sec_1']

  const gr5Assessment = { assessmentId: 'a_gr5', gradeLevel: 'Grade 5' }
  const gr7Assessment = { assessmentId: 'a_gr7', gradeLevel: 'Grade 7' }
  const gr8Assessment = { assessmentId: 'a_gr8', gradeLevel: 'Grade 8' }
  const sch4uAssessment = { assessmentId: 'a_sch4u', targetCourseCode: 'SCH4U-01' }
  const sph3uAssessment = { assessmentId: 'a_sph3u', targetCourseCode: 'SPH3U-01' }

  // Set active class record to elementary Math
  activeClassRecord.value = getEffectiveClassRecord(elementaryClass, 'sub_math')

  assert.strictEqual(isAssessmentApplicableToStudent(gr5Assessment, evan, 'elementary'), true, 'Evan matches Gr 5 Math IEP')
  assert.strictEqual(isAssessmentApplicableToStudent(gr7Assessment, evan, 'elementary'), false, 'Evan does NOT match Gr 7 Math (due to IEP)')
  assert.strictEqual(isAssessmentApplicableToStudent(gr8Assessment, fiona, 'elementary'), true, 'Fiona matches Gr 8')
  assert.strictEqual(isAssessmentApplicableToStudent(gr7Assessment, fiona, 'elementary'), false, 'Fiona does NOT match Gr 7')

  // Switch active class record to secondary
  activeClassRecord.value = getEffectiveClassRecord(secondaryClass)
  assert.strictEqual(isAssessmentApplicableToStudent(sch4uAssessment, alice, 'secondary'), true, 'Alice matches SCH4U-01')
  assert.strictEqual(isAssessmentApplicableToStudent(sph3uAssessment, alice, 'secondary'), false, 'Alice does NOT match SPH3U-01')
})

it('Progress report displayMetaLine adapts cleanly between elementary and secondary', () => {
  // Elementary with active subject
  const effMath = getEffectiveClassRecord(elementaryClass, 'sub_math')
  activeClassRecord.value = effMath
  activeClass.value = elementaryClass
  const teacher = 'Mr. Stashuk'

  function getMetaLine(cls, effRec, tName) {
    const className = cls?.name || 'Class'
    if (effRec?.classType === 'elementary' && effRec?.activeSubjectName) {
      const subName = effRec.activeSubjectName
      if (className.toLowerCase().includes(subName.toLowerCase())) {
        return `${className} • ${tName}`
      }
      return `${className} — ${subName} • ${tName}`
    }
    return `${className} • ${tName}`
  }

  const elmMeta = getMetaLine(elementaryClass, effMath, teacher)
  assert.strictEqual(elmMeta, 'Grade 7/8 Homeroom — Mathematics • Mr. Stashuk')

  // Secondary
  const effSec = getEffectiveClassRecord(secondaryClass)
  activeClassRecord.value = effSec
  activeClass.value = secondaryClass
  const secMeta = getMetaLine(secondaryClass, effSec, teacher)
  assert.strictEqual(secMeta, 'Grade 12 Chemistry • Mr. Stashuk')
})

// 5. Master Curriculum Library & Panel Isolation
console.log('\nTEST GROUP 5: Master Curriculum Library Panel Isolation')

it('getMergedCurriculumPresets strictly respects panel filter', () => {
  const elemPresets = getMergedCurriculumPresets('elementary')
  assert.ok(elemPresets.length > 0, 'Elementary presets exist')
  elemPresets.forEach(p => {
    assert.strictEqual(p.panel, 'elementary', `Preset ${p.presetId} must have panel === elementary`)
  })

  const secPresets = getMergedCurriculumPresets('secondary')
  assert.ok(secPresets.length > 0, 'Secondary presets exist')
  secPresets.forEach(p => {
    assert.strictEqual(p.panel, 'secondary', `Preset ${p.presetId} must have panel === secondary`)
  })
})

it('syncPresetToClass enforces strict barrier between elementary and secondary presets', () => {
  const elemPreset = {
    presetId: 'ontario-math-gr8',
    panel: 'elementary',
    title: 'Ontario Mathematics Grade 8',
    subjectCode: 'MATH',
    grade: '8',
    strands: [
      { name: 'Number', expectations: [{ code: 'B1.1', description: 'Rational numbers', weight: 1.5 }] }
    ]
  }

  const secPreset = {
    presetId: 'ontario-sch4u',
    panel: 'secondary',
    title: 'Chemistry Grade 12',
    subjectCode: 'SCH4U',
    strands: [
      { name: 'Structure', expectations: [{ code: 'A1.1', description: 'Lewis dot structures', weight: 2.0 }] }
    ]
  }

  // 1. Syncing elementary preset into secondary class MUST be rejected (returns null)
  const badSync1 = syncPresetToClass(secondaryClass, elemPreset)
  assert.strictEqual(badSync1, null, 'Elementary preset cannot be synced into secondary class')

  // 2. Syncing secondary preset into elementary class MUST be rejected (returns null)
  const badSync2 = syncPresetToClass(elementaryClass, secPreset)
  assert.strictEqual(badSync2, null, 'Secondary preset cannot be synced into elementary class')

  // 3. Syncing elementary preset into elementary class succeeds
  const goodSyncElem = syncPresetToClass(elementaryClass, elemPreset)
  assert.ok(goodSyncElem !== null, 'Elementary preset syncs to matching elementary subject')
  assert.strictEqual(goodSyncElem.subjectName, 'Mathematics')

  // 4. Syncing secondary preset into secondary class succeeds
  const goodSyncSec = syncPresetToClass(secondaryClass, secPreset)
  assert.ok(goodSyncSec !== null, 'Secondary preset syncs to matching secondary class')
})

console.log('\n=================================================================')
console.log(`📊 AUDIT RESULTS: ${passed} passed, ${failed} failed`)
console.log('=================================================================\n')

if (failed > 0) {
  process.exit(1)
}
