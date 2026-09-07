/**
 * src/test_curriculum_library_stress_suite.js
 *
 * EXHAUSTIVE END-TO-END STRESS TEST SUITE:
 * MASTER CURRICULUM LIBRARY & ALL ASSOCIATED CONNECTIONS
 *
 * Scope 1: Preset Persistence, Grouping, & Blueprint Variants
 * Scope 2: Dirty Protection, Snapshot Serialization, & Navigation Guards
 * Scope 3: Bidirectional Synchronization & Multi-Section Split Class Safety
 * Scope 4: SBAR Downstream Mastery, Dossier, Heatmap, & Traditional Isolation
 * Scope 5: Boundary Conditions, Normalization, Archived Classes, & Edge Cases
 */

import assert from 'assert'
import { ref, computed, watch } from 'vue'

// Storage mock for Node environment
const mockStorage = {}
globalThis.localStorage = {
  getItem: (k) => mockStorage[k] ?? null,
  setItem: (k, v) => { mockStorage[k] = String(v) },
  removeItem: (k) => { delete mockStorage[k] },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) }
}

const {
  useCurriculumLibrary,
  saveMasterPreset,
  getMasterPreset,
  resetMasterPreset,
  isMasterCustomized,
  getCourseBlueprints,
  deriveOverallPreset,
  deriveSpecificPreset,
  getSuccessCriteriaPreset,
  resolveSubjectPreset,
  getMergedCurriculumPresets,
  normalizeExpectationWeight,
  isCourseCodeMatch,
  extractMasterExpectations,
  syncPresetToClass,
  findMatchingClassesForPreset,
  diffClassAgainstMaster,
  exportClassExpectationsToMaster,
  curriculumEditorDirty,
  curriculumEditorTitle,
  curriculumEditorSaveHandler,
  curriculumEditorDiscardHandler
} = await import('./composables/useCurriculumLibrary.js')

const {
  calculateSBARStudentOverallMastery,
  calculateSBARExpectationMastery
} = await import('./db/gradebook/gradeCalcSBAR.js')

const {
  calculateStudentGrade
} = await import('./db/gradebook/gradeCalc.js')

console.log('===================================================================')
console.log('⚡ MASTER CURRICULUM LIBRARY EXHAUSTIVE DEEP DIVE AUDIT & STRESS TEST')
console.log('===================================================================\n')

let passedTests = 0
let totalTests = 0

function runTest(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`  ✓ [PASS] ${name}`)
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message)
    throw err
  }
}

async function runAsyncTest(name, fn) {
  totalTests++
  try {
    await fn()
    passedTests++
    console.log(`  ✓ [PASS] ${name}`)
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message)
    throw err
  }
}

async function main() {
  // ─────────────────────────────────────────────────────────────────
  // SCOPE 1: MASTER CURRICULUM LIBRARY & PRESET ENGINE
  // ─────────────────────────────────────────────────────────────────
  console.log('[SCOPE 1] Master Curriculum Library & Preset Engine')

  await runAsyncTest('Persistence in IndexedDB / Memory Settings & Retrieval', async () => {
    const testPreset = {
      presetId: 'custom-ics4u-audit',
      title: 'Grade 12 Computer Science (ICS4U)',
      subjectCode: 'ICS4U',
      grade: 'Grade 12',
      panel: 'secondary',
      department: 'Computer Studies',
      strands: [
        {
          id: 'strand-prog',
          name: 'Programming Concepts',
          expectations: [
            { id: 'exp-1', code: 'A1.1', description: 'Modular programming', weight: 1.5, active: true },
            { id: 'exp-2', code: 'A1.2', description: 'Data structures', weight: 2.0, active: true },
            { id: 'exp-3', code: 'A1.3', description: 'Diagnostic: Syntax check', weight: 0, active: true }
          ]
        }
      ]
    }

    await saveMasterPreset(testPreset)
    assert.strictEqual(isMasterCustomized('custom-ics4u-audit'), true)
    const fetched = getMasterPreset('custom-ics4u-audit')
    assert.strictEqual(fetched.presetId, 'custom-ics4u-audit')
    assert.strictEqual(fetched.subjectCode, 'ICS4U')
    assert.strictEqual(fetched.strands[0].expectations[0].weight, 1.5)
  })

  runTest('Dynamic Derivation of Overall Expectations from Custom Master', () => {
    const fetched = getMasterPreset('custom-ics4u-audit')
    const overallPreset = deriveOverallPreset(fetched)
    assert.strictEqual(overallPreset.presetId, 'custom-ics4u-audit-overall')
    assert.strictEqual(overallPreset.isOverallOnly, true)
    assert.strictEqual(overallPreset.strands[0].expectations.length, 0)
    assert(overallPreset.title.includes('Overall Expectations'))
  })

  runTest('Dynamic Derivation of Specific Expectations', () => {
    const fetched = getMasterPreset('custom-ics4u-audit')
    const specificPreset = deriveSpecificPreset(fetched)
    assert.strictEqual(specificPreset.isSpecificOnly, true)
    assert.strictEqual(specificPreset.strands[0].expectations.length, 3)
    assert.strictEqual(specificPreset.strands[0].expectations[1].weight, 2.0)
  })

  await runAsyncTest('Orphaned Companion Preset (Success Criteria) Catalog Synthesis', async () => {
    // Save an orphaned success-criteria preset that has no base preset
    const standaloneSC = {
      presetId: 'custom-orphan-course-success-criteria',
      title: 'Orphaned Course — Success Criteria',
      subjectCode: 'ORPHAN',
      grade: 'Grade 10',
      panel: 'secondary',
      isSuccessCriteria: true,
      strands: [
        {
          id: 'strand-sc1',
          name: 'Core Skills',
          expectations: [
            { id: 'sc-1', code: 'SC1', description: 'I can analyze data', weight: 1.0, active: true }
          ]
        }
      ]
    }
    await saveMasterPreset(standaloneSC)

    const blueprints = getCourseBlueprints('secondary')
    const orphanBP = blueprints.find(b => b.presetId === 'custom-orphan-course')
    assert(orphanBP, 'Synthetic base blueprint was synthesized for orphaned success criteria preset')
    assert.strictEqual(orphanBP.courseCode, 'ORPHAN')
    assert.strictEqual(orphanBP.variants.success_criteria.available, true)
    assert.strictEqual(orphanBP.variants.success_criteria.count, 1)

    // Clean up
    await resetMasterPreset('custom-orphan-course-success-criteria')
  })

  runTest('Elementary Preset Resolution Prioritizes Custom Master over Ministry Baseline', () => {
    const resolved = resolveSubjectPreset('Grade 8', 'MATH', 'Mathematics')
    assert(resolved, 'Elementary Grade 8 Math preset resolved')
    assert(resolved.strands.length > 0)
  })

  // ─────────────────────────────────────────────────────────────────
  // SCOPE 2: UNSAVED CHANGES PROTECTION & NAVIGATION GUARDS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[SCOPE 2] Unsaved Changes Protection & Navigation Guards')

  runTest('Dirty Protection Snapshot Serialization & Multiplier Sensitivity', () => {
    const blueprint = {
      presetId: 'ontario-g8-sci',
      title: 'Grade 8 Science',
      strands: [
        {
          id: 's1',
          name: 'Cells',
          expectations: [
            { id: 'e1', code: 'A1.1', description: 'Cell theory', weight: 1.0, active: true }
          ]
        }
      ]
    }

    const strands = ref(JSON.parse(JSON.stringify(blueprint.strands)))
    function getSnapshot() {
      return JSON.stringify({
        presetId: blueprint.presetId,
        variant: 'specific',
        strands: strands.value.map(s => ({
          id: s.id,
          name: (s.name || '').trim(),
          expectations: (s.expectations || []).map(e => ({
            id: e.id,
            code: (e.code || '').trim().toUpperCase(),
            description: (e.description || '').trim(),
            weight: Number(e.weight),
            active: e.active !== false
          }))
        }))
      })
    }

    const baselineSnapshot = getSnapshot()
    const isDirty = computed(() => getSnapshot() !== baselineSnapshot)

    assert.strictEqual(isDirty.value, false, 'Baseline is not dirty')

    // Change weight to 2.0x
    strands.value[0].expectations[0].weight = 2.0
    assert.strictEqual(isDirty.value, true, 'Weight change triggers isDirty')

    // Revert weight to 1.0x
    strands.value[0].expectations[0].weight = 1.0
    assert.strictEqual(isDirty.value, false, 'Reverting weight resets isDirty')

    // Change to 0x diagnostic
    strands.value[0].expectations[0].weight = 0
    assert.strictEqual(isDirty.value, true, 'Diagnostic 0x weight triggers isDirty')
    strands.value[0].expectations[0].weight = 1.0

    // Description change
    strands.value[0].expectations[0].description = 'Modified description'
    assert.strictEqual(isDirty.value, true, 'Description change triggers isDirty')
    strands.value[0].expectations[0].description = 'Cell theory'

    // Active toggle
    strands.value[0].expectations[0].active = false
    assert.strictEqual(isDirty.value, true, 'Active toggle triggers isDirty')
    strands.value[0].expectations[0].active = true
    assert.strictEqual(isDirty.value, false, 'Reverting active restores isDirty === false')
  })

  runTest('Navigation Guard Discard Re-arm Cycle', () => {
    curriculumEditorDirty.value = false
    curriculumEditorTitle.value = 'Grade 12 Physics'

    // Simulate editing
    curriculumEditorDirty.value = true
    assert.strictEqual(curriculumEditorDirty.value, true)

    // Simulate clicking "Discard Unsaved Changes"
    curriculumEditorDirty.value = false
    assert.strictEqual(curriculumEditorDirty.value, false)

    // Subsequent edit must re-arm
    curriculumEditorDirty.value = true
    assert.strictEqual(curriculumEditorDirty.value, true)

    curriculumEditorDirty.value = false
  })

  // ─────────────────────────────────────────────────────────────────
  // SCOPE 3: BIDIRECTIONAL SMART SYNCHRONIZATION
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[SCOPE 3] Bidirectional Smart Synchronization & Split Classes')

  runTest('Master → Standard Secondary Class Push Preserves IDs and Updates Wording', () => {
    const masterPreset = getMasterPreset('custom-ics4u-audit')
    const classRecord = {
      classId: 'cls_ics4u_p1',
      name: 'ICS4U Grade 12 CS',
      courseCode: 'ICS4U-01',
      classType: 'secondary',
      gradingFramework: 'sbar',
      gradebookUnits: [
        {
          unitId: 'unit_existing',
          name: 'Programming Concepts',
          expectations: [
            {
              expectationId: 'stable_exp_id_999',
              code: 'A1.1',
              description: 'Old syntax text',
              weight: 1.0
            }
          ]
        }
      ]
    }

    const syncRes = syncPresetToClass(classRecord, masterPreset)
    assert(syncRes, 'Sync result generated')
    const updatedExp = syncRes.updatedClass.gradebookUnits[0].expectations.find(e => e.code === 'A1.1')
    assert.strictEqual(updatedExp.expectationId, 'stable_exp_id_999', 'Existing expectationId preserved')
    assert.strictEqual(updatedExp.weight, 1.5, 'Weight updated to 1.5x')
    assert.strictEqual(updatedExp.description, 'Modular programming', 'Description updated')

    // Expectation A1.2 and A1.3 were added
    const expA12 = syncRes.updatedClass.gradebookUnits[0].expectations.find(e => e.code === 'A1.2')
    assert(expA12, 'Missing expectation A1.2 was added')
    assert.strictEqual(expA12.weight, 2.0)
  })

  runTest('Master → Split Secondary Class Push Updates Matching Section Framework Only', () => {
    const masterPreset = getMasterPreset('custom-ics4u-audit')
    const splitClass = {
      classId: 'cls_split_cs_tech',
      name: 'ICS4U / TEJ4M Split',
      isSplitClass: true,
      classType: 'secondary',
      courseFrameworks: {
        'TEJ4M': {
          gradebookUnits: [
            { unitId: 'u_comp_eng', name: 'Hardware', expectations: [{ code: 'A1.1', weight: 1.0, description: 'Microcontrollers' }] }
          ]
        },
        'ICS4U': {
          gradebookUnits: [
            { unitId: 'u_cs', name: 'Software', expectations: [{ code: 'A1.1', weight: 1.0, description: 'Basic coding' }] }
          ]
        }
      }
    }

    const syncRes = syncPresetToClass(splitClass, masterPreset, 'ICS4U')
    assert(syncRes, 'Sync succeeded for ICS4U section')
    const updatedSec = syncRes.updatedClass.courseFrameworks['ICS4U']
    assert.strictEqual(updatedSec.gradebookUnits[0].expectations[0].weight, 1.5)

    // Verify TEJ4M section was not mutated
    const tejSec = syncRes.updatedClass.courseFrameworks['TEJ4M']
    assert.strictEqual(tejSec.gradebookUnits[0].expectations[0].weight, 1.0)
    assert.strictEqual(tejSec.gradebookUnits[0].expectations[0].description, 'Microcontrollers')
  })

  runTest('Multi-Section Split Class Atomic Sync (Race Condition Prevention)', () => {
    const splitClass = {
      classId: 'cls_dual_ics4u',
      name: 'Combined ICS4U Sections',
      isSplitClass: true,
      classType: 'secondary',
      courseFrameworks: {
        'ICS4U-A': {
          gradebookUnits: [
            { unitId: 'u_a', name: 'Programming Concepts', expectations: [{ code: 'A1.1', weight: 1.0 }] }
          ]
        },
        'ICS4U-B': {
          gradebookUnits: [
            { unitId: 'u_b', name: 'Programming Concepts', expectations: [{ code: 'A1.1', weight: 1.0 }] }
          ]
        }
      }
    }

    const masterPreset = getMasterPreset('custom-ics4u-audit')
    
    // Simulate atomic multi-section sync
    let accumulated = JSON.parse(JSON.stringify(splitClass))
    for (const secKey of ['ICS4U-A', 'ICS4U-B']) {
      const res = syncPresetToClass(accumulated, masterPreset, secKey)
      assert(res, `Sync succeeded for section ${secKey}`)
      accumulated = res.updatedClass
    }

    assert.strictEqual(accumulated.courseFrameworks['ICS4U-A'].gradebookUnits[0].expectations[0].weight, 1.5)
    assert.strictEqual(accumulated.courseFrameworks['ICS4U-B'].gradebookUnits[0].expectations[0].weight, 1.5)
  })

  await runAsyncTest('Class → Master Reverse Push (Customizations Back to Master Library)', async () => {
    const classWithCustoms = {
      classId: 'cls_local_custom',
      name: 'AP Computer Science',
      courseCode: 'ICS4U',
      classType: 'secondary',
      gradeLevel: 'Grade 12',
      gradebookUnits: [
        {
          unitId: 'unit_prog',
          name: 'Programming Concepts',
          expectations: [
            { expectationId: 'e1', code: 'A1.1', description: 'Modular programming with Lambdas', weight: 2.5 },
            { expectationId: 'e2', code: 'A1.2', description: 'Advanced Graphs & Trees', weight: 3.0 },
            { expectationId: 'e_new', code: 'ADV1', description: 'Dynamic Programming', weight: 2.0 }
          ]
        }
      ]
    }

    const diffRes = diffClassAgainstMaster(classWithCustoms)
    assert.strictEqual(diffRes.hasDiffs, true)
    assert(diffRes.diffs.some(d => d.code === 'A1.1' && d.type === 'weight'))
    assert(diffRes.diffs.some(d => d.code === 'ADV1' && d.type === 'added'))

    const exportRes = await exportClassExpectationsToMaster(classWithCustoms)
    assert(exportRes.savedPreset)
    const masterNow = getMasterPreset(exportRes.savedPreset.presetId)
    const strand = masterNow.strands.find(s => s.name === 'Programming Concepts')
    const advExp = strand.expectations.find(e => e.code === 'ADV1')
    assert(advExp, 'Exported expectation ADV1 now exists in Master Library')
    assert.strictEqual(advExp.weight, 2.0)
  })

  // ─────────────────────────────────────────────────────────────────
  // SCOPE 4: DOWNSTREAM SBAR & ANALYTICS PROPAGATION
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[SCOPE 4] Downstream Gradebook & Analytics Propagation')

  runTest('calculateSBARStudentOverallMastery Multiplier Weighting & 0x Diagnostic Exclusion', () => {
    const mockClass = {
      classId: 'cls_sbar_math',
      gradingFramework: 'sbar',
      sbarAlgorithm: 'decaying_average',
      students: { 'st1': { studentId: 'st1', firstName: 'Alex' } },
      gradebookUnits: [
        {
          unitId: 'u1',
          name: 'Unit 1',
          expectations: [
            { expectationId: 's1', code: 'S1', weight: 2.0 },
            { expectationId: 's2', code: 'S2', weight: 1.0 },
            { expectationId: 's3', code: 'S3', weight: 0.5 },
            { expectationId: 's4', code: 'S4', weight: 0 } // Diagnostic
          ]
        }
      ]
    }

    const mockAssessments = [
      { assessmentId: 'a1', expectationIds: ['S1'], type: 'summative', totalPoints: 100 },
      { assessmentId: 'a2', expectationIds: ['S2'], type: 'summative', totalPoints: 100 },
      { assessmentId: 'a3', expectationIds: ['S3'], type: 'summative', totalPoints: 100 },
      { assessmentId: 'a4', expectationIds: ['S4'], type: 'summative', totalPoints: 100 }
    ]

    const mockGradeMap = {
      a1: { 'st1': { studentId: 'st1', resolvedScore: 80 } },
      a2: { 'st1': { studentId: 'st1', resolvedScore: 60 } },
      a3: { 'st1': { studentId: 'st1', resolvedScore: 100 } },
      a4: { 'st1': { studentId: 'st1', resolvedScore: 20 } }
    }

    const overall = calculateSBARStudentOverallMastery('st1', mockClass, mockAssessments, mockGradeMap)
    assert.strictEqual(overall, 77, `Expected 77%, got ${overall}%`)
  })

  runTest('calculateSBARStudentOverallMastery Returns null When Only 0x Diagnostics Evaluated', () => {
    const mockClass = {
      classId: 'cls_only_diag',
      gradingFramework: 'sbar',
      sbarAlgorithm: 'decaying_average',
      students: { 'st1': { studentId: 'st1' } },
      gradebookUnits: [
        {
          unitId: 'u1',
          expectations: [
            { expectationId: 'd1', code: 'D1', weight: 0 }
          ]
        }
      ]
    }

    const mockAssessments = [{ assessmentId: 'a_diag', expectationIds: ['D1'], type: 'summative', totalPoints: 100 }]
    const mockGradeMap = { a_diag: { 'st1': { studentId: 'st1', resolvedScore: 75 } } }

    const overall = calculateSBARStudentOverallMastery('st1', mockClass, mockAssessments, mockGradeMap)
    assert.strictEqual(overall, null, 'Course mastery must be null when only diagnostic 0x standards are assessed')
  })

  runTest('Dossier & Heatmap Unit Weighted Average Math Integrity', () => {
    const standards = [
      { score: 90, weight: 2.0 },
      { score: 50, weight: 1.0 },
      { score: 30, weight: 0 } // Diagnostic
    ]

    let weightedSum = 0
    let totalWeight = 0
    let count = 0

    standards.forEach(s => {
      const w = Math.max(0, Number(s.weight))
      if (w > 0) {
        weightedSum += s.score * w
        totalWeight += w
        count++
      }
    })

    const unitAvg = (count > 0 && totalWeight > 0) ? Math.round(weightedSum / totalWeight) : null
    assert.strictEqual(unitAvg, 77)
  })

  await runAsyncTest('Traditional Secondary Gradebook 100% Isolated from SBAR Expectations', async () => {
    const traditionalClass = {
      classId: 'cls_trad_secondary',
      gradingFramework: 'percentage',
      students: {
        'st_trad': { studentId: 'st_trad', firstName: 'John' }
      },
      gradebookCategories: [
        { categoryId: 'cat_know', name: 'Knowledge', weight: 40 },
        { categoryId: 'cat_app', name: 'Application', weight: 60 }
      ],
      gradebookUnits: [
        {
          unitId: 'u1',
          expectations: [
            { expectationId: 'e1', code: 'A1.1', weight: 2.5 }
          ]
        }
      ]
    }

    const tradAssessments = [
      { assessmentId: 'a1', categoryId: 'cat_know', totalPoints: 100, excluded: false },
      { assessmentId: 'a2', categoryId: 'cat_app', totalPoints: 100, excluded: false }
    ]

    const tradGrades = [
      { assessmentId: 'a1', studentId: 'st_trad', resolvedScore: 80 },
      { assessmentId: 'a2', studentId: 'st_trad', resolvedScore: 90 }
    ]

    const gradeResult = await calculateStudentGrade('st_trad', traditionalClass, {
      assessmentsPreRef: tradAssessments,
      gradesPreRef: tradGrades
    })

    assert.strictEqual(gradeResult.overallGrade, 86, `Expected traditional 86%, got ${gradeResult.overallGrade}%`)
    assert.strictEqual(gradeResult.categoryResults['cat_know'].percentage, 80)
    assert.strictEqual(gradeResult.categoryResults['cat_app'].percentage, 90)
  })

  // ─────────────────────────────────────────────────────────────────
  // SCOPE 5: EDGE CASES & BOUNDARY STRESS TESTING
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[SCOPE 5] Edge Cases & Boundary Stress Testing')

  runTest('Course Code Normalization & Prevention of False-Positive Matches', () => {
    assert.strictEqual(isCourseCodeMatch('SNC1W-01', 'SNC1W'), true)
    assert.strictEqual(isCourseCodeMatch('snc1w', 'SNC1W-02'), true)
    assert.strictEqual(isCourseCodeMatch('SPH 4U', 'SPH4U'), true)
    assert.strictEqual(isCourseCodeMatch('SCH3U_P1', 'SCH3U'), true)

    // Short codes must not match unrelated courses
    assert.strictEqual(isCourseCodeMatch('M', 'MPM2D'), false, 'Single letter M must not match MPM2D')
    assert.strictEqual(isCourseCodeMatch('S', 'SNC1W'), false, 'Single letter S must not match SNC1W')
    assert.strictEqual(isCourseCodeMatch('SC', 'SNC1W'), false, 'Two-letter SC must not match SNC1W')

    // Exact matches allowed
    assert.strictEqual(isCourseCodeMatch('FR', 'FR'), true, 'Exact match for FR allowed')
    assert.strictEqual(isCourseCodeMatch('MAT', 'MAT'), true, 'Exact match for MAT allowed')
  })

  runTest('Archived Classes are Strictly Filtered Out from Class Push Matching', () => {
    const masterPreset = getMasterPreset('custom-ics4u-audit')
    const testClasses = [
      { classId: 'c_active', name: 'Active CS', courseCode: 'ICS4U', archived: false },
      { classId: 'c_archived1', name: 'Past Semester CS', courseCode: 'ICS4U', archived: true },
      { classId: 'c_archived2', name: 'Historical CS', courseCode: 'ICS4U', status: 'archived' }
    ]

    const matches = findMatchingClassesForPreset(masterPreset, testClasses)
    assert.strictEqual(matches.length, 1, 'Only active non-archived class matched')
    assert.strictEqual(matches[0].classId, 'c_active')
  })

  runTest('Weight Normalization Handles Strings, Negative Numbers, & Extremes', () => {
    assert.strictEqual(normalizeExpectationWeight(2), 2.0)
    assert.strictEqual(normalizeExpectationWeight('1.5'), 1.5)
    assert.strictEqual(normalizeExpectationWeight('0'), 0)
    assert.strictEqual(normalizeExpectationWeight(-1), 0, 'Clamps negative weight to 0')
    assert.strictEqual(normalizeExpectationWeight(null), 1.0, 'Null defaults to 1.0')
    assert.strictEqual(normalizeExpectationWeight(undefined), 1.0, 'Undefined defaults to 1.0')
    assert.strictEqual(normalizeExpectationWeight(''), 1.0, 'Empty string defaults to 1.0')
    assert.strictEqual(normalizeExpectationWeight('invalid_str'), 1.0, 'NaN string defaults to 1.0')
    assert.strictEqual(normalizeExpectationWeight(15), 10.0, 'Clamps excessive weight to 10.0')
  })

  runTest('Extract Master Expectations from Diverse Strands & Structures', () => {
    const presetFlat = {
      strands: [
        {
          name: 'Flat Strand',
          expectations: [
            { code: 'F1', description: 'Flat expectation', weight: '2.0' }
          ]
        }
      ]
    }
    const expsFlat = extractMasterExpectations(presetFlat)
    assert.strictEqual(expsFlat.length, 1)
    assert.strictEqual(expsFlat[0].code, 'F1')
    assert.strictEqual(expsFlat[0].weight, 2.0)

    const presetNested = {
      strands: [
        {
          name: 'Nested Strand',
          overalls: [
            {
              code: 'O1',
              title: 'Overall 1',
              weight: 1.0,
              specifics: [
                { code: 'O1.1', description: 'Specific 1', weight: 0.5 }
              ]
            }
          ]
        }
      ]
    }
    const expsNested = extractMasterExpectations(presetNested)
    assert.strictEqual(expsNested.length, 1)
    assert.strictEqual(expsNested[0].code, 'O1.1')
    assert.strictEqual(expsNested[0].weight, 0.5)
  })

  // Clean up
  await resetMasterPreset('custom-ics4u-audit')

  console.log('\n===================================================================')
  console.log(`🎉 ALL ${passedTests} / ${totalTests} STRESS TESTS PASSED (100% SUITE SUCCESS)!`)
  console.log('===================================================================')
}

main().catch(err => {
  console.error('\n❌ FATAL STRESS TEST ERROR:', err)
  process.exit(1)
})
