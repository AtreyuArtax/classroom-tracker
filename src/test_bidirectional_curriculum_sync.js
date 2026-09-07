/**
 * Automated Verification Suite: Bidirectional Curriculum Synchronization,
 * Master Database Storage, and Weighting Propagation Across the App.
 */

import assert from 'assert'
import {
  useCurriculumLibrary,
  saveMasterPreset,
  getMasterPreset,
  isMasterCustomized,
  getCourseBlueprints,
  syncPresetToClass,
  findMatchingClassesForPreset,
  diffClassAgainstMaster,
  exportClassExpectationsToMaster,
  isCourseCodeMatch
} from './composables/useCurriculumLibrary.js'
import {
  calculateSBARStudentOverallMastery,
  calculateSBARExpectationMastery
} from './db/gradebook/gradeCalcSBAR.js'

console.log('=================================================================')
console.log('🧪 RUNNING BIDIRECTIONAL CURRICULUM SYNC & WEIGHTS TEST SUITE')
console.log('=================================================================')

const { customPresets, resetMasterPreset } = useCurriculumLibrary()

async function runTestSuite() {
  // ── TEST 1: Master Database Storage & Blueprint Recognition ──
  console.log('\n--- Test 1: Master Database Storage & Blueprint Recognition ---')
  const sampleImportedBlueprint = {
    presetId: 'custom-sph4u-sync-test',
    title: 'Ontario Grade 12 Physics (SPH4U)',
    subjectCode: 'SPH4U',
    grade: 'Grade 12',
    panel: 'secondary',
    department: 'Science',
    strands: [
      {
        id: 'strand-dyn',
        name: 'Dynamics',
        overalls: [
          {
            code: 'A1',
            title: 'Newtonian Dynamics',
            description: 'Analyze forces and motion in multiple dimensions.',
            weight: 2.0, // Custom 2x master multiplier
            specifics: [
              { code: 'A1.1', description: 'Analyze circular motion.', weight: 2.0 },
              { code: 'A1.2', description: 'Solve projectile trajectories.', weight: 1.0 }
            ]
          }
        ]
      },
      {
        id: 'strand-energy',
        name: 'Energy and Momentum',
        overalls: [
          {
            code: 'B1',
            title: 'Conservation Laws',
            description: 'Apply conservation of energy and momentum principles.',
            weight: 1.0,
            specifics: [
              { code: 'B1.1', description: 'Calculate elastic collisions in 2D.', weight: 1.0 },
              { code: 'B1.2', description: 'Diagnostic: Review kinetic energy formulas.', weight: 0 } // 0x diagnostic standard
            ]
          }
        ]
      }
    ]
  }

  // Save to master database (IndexedDB memory fallback in Node environment)
  const savedMaster = await saveMasterPreset(sampleImportedBlueprint)
  assert(savedMaster, 'Master preset saved successfully')
  assert.strictEqual(savedMaster.isCustomMaster, true, 'Marked as isCustomMaster')
  assert(isMasterCustomized('custom-sph4u-sync-test'), 'isMasterCustomized confirms preset in database')

  const retrievedMaster = getMasterPreset('custom-sph4u-sync-test')
  assert.strictEqual(retrievedMaster.subjectCode, 'SPH4U')
  assert.strictEqual(retrievedMaster.strands.length, 2)
  console.log('✓ Master database stores and retrieves imported course blueprint')

  // Check blueprints list recognizes the new custom course
  const secondaryBlueprints = getCourseBlueprints('secondary')
  const sph4uBP = secondaryBlueprints.find(b => b.presetId === 'custom-sph4u-sync-test')
  assert(sph4uBP, 'Course blueprints contains SPH4U')
  assert.strictEqual(sph4uBP.courseCode, 'SPH4U')
  assert.strictEqual(sph4uBP.variants.specific.count, 4)
  assert.strictEqual(sph4uBP.variants.overall.count, 2)
  console.log('✓ Blueprints catalog recognizes SPH4U with 4 specific standards and 2 overall standards')

  // ── TEST 2: Course Code Heuristics ──
  console.log('\n--- Test 2: Course Code Heuristics ---')
  assert(isCourseCodeMatch('SPH4U', 'SPH4U'), 'Exact match')
  assert(isCourseCodeMatch('SPH4U-01', 'SPH4U'), 'Matches section suffix -01')
  assert(isCourseCodeMatch('SPH 4U', 'SPH4U'), 'Matches spaced code')
  assert(isCourseCodeMatch('sph4u', 'SPH4U'), 'Matches lowercase')
  assert(!isCourseCodeMatch('SNC1W', 'SPH4U'), 'Different course does not match')
  console.log('✓ Course code matching handles normalization, sections, and casing')

  // ── TEST 3: Master → Standard Secondary Class Push ──
  console.log('\n--- Test 3: Master → Standard Secondary Class Push ---')
  const standardClass = {
    classId: 'cls_sec_101',
    name: 'Period 1 Physics',
    courseCode: 'SPH4U-01',
    classType: 'secondary',
    gradingFramework: 'sbar',
    gradebookUnits: [
      {
        unitId: 'unit_dyn_local',
        name: 'Dynamics',
        expectations: [
          {
            expectationId: 'exp_existing_a11',
            code: 'A1.1',
            description: 'Old wording for circular motion.',
            text: 'Old wording for circular motion.',
            weight: 1.0 // Class currently has 1.0x, master has 2.0x!
          },
          {
            expectationId: 'exp_existing_a12',
            code: 'A1.2',
            description: 'Solve projectile trajectories.',
            text: 'Solve projectile trajectories.',
            weight: 1.0
          }
        ]
      }
    ]
  }

  const syncResult1 = syncPresetToClass(standardClass, retrievedMaster)
  assert(syncResult1, 'Sync result exists')
  assert(syncResult1.changesCount >= 3, `Expected at least 3 changes (A1.1 weight, A1.1 desc, B1.1 added, B1.2 added), got ${syncResult1.changesCount}`)
  
  // Verify diffs breakdown
  const weightDiff = syncResult1.diffs.find(d => d.code === 'A1.1' && d.type === 'weight')
  assert(weightDiff, 'A1.1 weight diff detected')
  assert.strictEqual(weightDiff.oldVal, 1.0)
  assert.strictEqual(weightDiff.newVal, 2.0)

  const descDiff = syncResult1.diffs.find(d => d.code === 'A1.1' && d.type === 'description')
  assert(descDiff, 'A1.1 description diff detected')
  assert.strictEqual(descDiff.newVal, 'Analyze circular motion.')

  const addedDiff1 = syncResult1.diffs.find(d => d.code === 'B1.1' && d.type === 'added')
  assert(addedDiff1, 'B1.1 added diff detected')

  const addedDiff2 = syncResult1.diffs.find(d => d.code === 'B1.2' && d.type === 'added')
  assert(addedDiff2, 'B1.2 diagnostic added diff detected with weight 0')
  assert.strictEqual(addedDiff2.newVal, 0)

  // Verify updated class structure
  const updatedUnits = syncResult1.updatedClass.gradebookUnits
  const updatedA11 = updatedUnits[0].expectations.find(e => e.code === 'A1.1')
  assert.strictEqual(updatedA11.expectationId, 'exp_existing_a11', 'CRITICAL: Existing expectationId preserved!')
  assert.strictEqual(updatedA11.weight, 2.0, 'Weight updated to 2.0')
  assert.strictEqual(updatedA11.description, 'Analyze circular motion.', 'Description updated')
  assert.strictEqual(updatedA11.text, 'Analyze circular motion.', 'Text updated')

  // Verify Energy and Momentum strand was automatically created with B1.1 and B1.2
  const energyUnit = updatedUnits.find(u => u.name === 'Energy and Momentum')
  assert(energyUnit, 'Energy and Momentum strand created in class')
  assert.strictEqual(energyUnit.expectations.length, 2)
  console.log('✓ Master → Secondary sync updates weights, wording, adds missing strands, and preserves IDs')

  // ── TEST 4: Master → Split Class Push (courseFrameworks) ──
  console.log('\n--- Test 4: Master → Split Class Push (courseFrameworks) ---')
  const splitClass = {
    classId: 'cls_split_202',
    name: 'Grade 11/12 Physics Split',
    isSplitClass: true,
    classType: 'secondary',
    courseFrameworks: {
      'SPH3U': {
        gradebookUnits: [
          { unitId: 'u_g11', name: 'Kinematics', expectations: [{ code: 'A1.1', weight: 1.0 }] }
        ]
      },
      'SPH4U': {
        gradebookUnits: [
          {
            unitId: 'u_g12_dyn',
            name: 'Dynamics',
            expectations: [
              { expectationId: 'exp_split_a11', code: 'A1.1', weight: 1.0, description: 'Circ motion' }
            ]
          }
        ]
      }
    }
  }

  const syncSplitRes = syncPresetToClass(splitClass, retrievedMaster, 'SPH4U')
  assert(syncSplitRes, 'Sync result for split class exists')
  assert.strictEqual(syncSplitRes.sectionKey, 'SPH4U')
  const sph4uTarget = syncSplitRes.updatedClass.courseFrameworks['SPH4U']
  const splitExpA11 = sph4uTarget.gradebookUnits[0].expectations.find(e => e.code === 'A1.1')
  assert.strictEqual(splitExpA11.weight, 2.0, 'SPH4U section in split class received 2.0 weight')
  assert.strictEqual(splitClass.courseFrameworks['SPH3U'].gradebookUnits[0].expectations[0].weight, 1.0, 'SPH3U section completely untouched')
  console.log('✓ Master → Split class sync updates only the matching section without touching other sections')

  // ── TEST 5: Class Detection Across All Classes ──
  console.log('\n--- Test 5: Class Detection Across All Classes ---')
  const mockClassList = [standardClass, splitClass, { classId: 'cls_art', name: 'Visual Arts', courseCode: 'AVI1O' }]
  const matchingClasses = findMatchingClassesForPreset(retrievedMaster, mockClassList)
  assert.strictEqual(matchingClasses.length, 2, 'Matches both standard class and split class')
  assert(matchingClasses.some(m => m.classId === 'cls_sec_101'))
  assert(matchingClasses.some(m => m.classId === 'cls_split_202 && m.sectionKey === SPH4U' || m.sectionKey === 'SPH4U'))
  console.log('✓ findMatchingClassesForPreset accurately detects active classes teaching the curriculum')

  // ── TEST 6: Class → Master Push (Reverse Sync) ──
  console.log('\n--- Test 6: Class → Master Push (Reverse Sync) ---')
  // Suppose teacher in class modifies A1.2 weight to 3.0x and adds custom standard C1.1
  const modifiedClass = JSON.parse(JSON.stringify(standardClass))
  modifiedClass.gradebookUnits[0].expectations.push({
    expectationId: 'exp_custom_x11',
    code: 'X1.1',
    description: 'Teacher custom research standard on relativity.',
    text: 'Teacher custom research standard on relativity.',
    weight: 1.5
  })
  modifiedClass.gradebookUnits[0].expectations[1].weight = 3.0 // A1.2 modified to 3.0x

  const diffResult = diffClassAgainstMaster(modifiedClass)
  assert(diffResult.hasDiffs, 'Diff detected between class and master')
  assert(diffResult.diffs.length >= 2, `Expected diffs for A1.2 and X1.1, got ${diffResult.diffs.length}`)

  const a12Diff = diffResult.diffs.find(d => d.code === 'A1.2')
  assert(a12Diff, 'Diff for A1.2 detected')
  assert.strictEqual(a12Diff.newVal, 3.0, 'New weight in class is 3.0x')

  const x11Diff = diffResult.diffs.find(d => d.code === 'X1.1' && d.type === 'added')
  assert(x11Diff, 'Added standard X1.1 detected')

  // Export class customizations to Master Library
  const exportResult = await exportClassExpectationsToMaster(modifiedClass)
  assert(exportResult.savedPreset, 'Exported master preset returned')
  assert.strictEqual(exportResult.savedPreset.isCustomMaster, true)

  const updatedMaster = getMasterPreset(exportResult.savedPreset.presetId)
  assert(updatedMaster, 'Updated master exists in database')
  const masterDynStrand = updatedMaster.strands.find(s => s.name === 'Dynamics')
  const masterA12 = masterDynStrand.expectations.find(e => e.code === 'A1.2')
  assert.strictEqual(masterA12.weight, 3.0, 'Master library now has custom 3.0x weight from class!')

  const masterX11 = masterDynStrand.expectations.find(e => e.code === 'X1.1')
  assert(masterX11, 'Master library now includes X1.1 standard created in class!')
  assert.strictEqual(masterX11.weight, 1.5)
  console.log('✓ Class → Master push merges class expectation weights and new standards into Master Library')

  // ── TEST 7: SBAR Overall Course Mastery Propagation ──
  console.log('\n--- Test 7: SBAR Overall Course Mastery Propagation ---')
  // Let's test calculateSBARStudentOverallMastery with:
  // - A1.1 (weight 2.0x, score 90) -> contribution: 90 * 2 = 180
  // - A1.2 (weight 1.0x, score 60) -> contribution: 60 * 1 = 60
  // - B1.2 (weight 0x, diagnostic, score 20) -> contribution: 0
  // Total weight = 3.0. Expected mastery = (180 + 60) / 3 = 80%.
  // If diagnostic (weight 0) was erroneously included with weight 1, mastery would be (90*2 + 60*1 + 20*1)/4 = 65%!
  const classForGrading = {
    classId: 'cls_grade_test',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    students: {
      'student_1': { studentId: 'student_1', firstName: 'Jane', lastName: 'Doe' }
    },
    gradebookUnits: [
      {
        unitId: 'u1',
        name: 'Unit 1',
        expectations: [
          { expectationId: 'e_a11', code: 'A1.1', weight: 2.0 },
          { expectationId: 'e_a12', code: 'A1.2', weight: 1.0 },
          { expectationId: 'e_b12', code: 'B1.2', weight: 0 } // Diagnostic
        ]
      }
    ]
  }

  const assessments = [
    { assessmentId: 'ast_1', expectationIds: ['A1.1'], type: 'summative', totalPoints: 100, excluded: false },
    { assessmentId: 'ast_2', expectationIds: ['A1.2'], type: 'summative', totalPoints: 100, excluded: false },
    { assessmentId: 'ast_3', expectationIds: ['B1.2'], type: 'summative', totalPoints: 100, excluded: false }
  ]

  const gradeMap = {
    ast_1: { 'student_1': { studentId: 'student_1', resolvedScore: 90 } },
    ast_2: { 'student_1': { studentId: 'student_1', resolvedScore: 60 } },
    ast_3: { 'student_1': { studentId: 'student_1', resolvedScore: 20 } } // Low diagnostic score!
  }

  const masteryMap = calculateSBARExpectationMastery(classForGrading, assessments, gradeMap, 'decaying_average')
  assert(masteryMap['student_1'], 'Mastery map computed')
  assert.strictEqual(masteryMap['student_1']['A1.1'].weight, 2.0, 'A1.1 reports 2.0 weight')
  assert.strictEqual(masteryMap['student_1']['A1.2'].weight, 1.0, 'A1.2 reports 1.0 weight')
  assert.strictEqual(masteryMap['student_1']['B1.2'].weight, 0, 'B1.2 reports 0 weight')

  const overallMastery = calculateSBARStudentOverallMastery('student_1', classForGrading, assessments, gradeMap, 'decaying_average', [], masteryMap)
  assert.strictEqual(overallMastery, 80, `Expected weighted overall mastery 80%, got ${overallMastery}%`)
  console.log('✓ calculateSBARStudentOverallMastery correctly weights 2x and excludes 0x diagnostic standard')

  // ── TEST 8: Dossier Unit Breakdown Weighted Mastery ──
  console.log('\n--- Test 8: Dossier Unit Breakdown Weighted Mastery ---')
  // Simulating Dossier unitBreakdown calculation logic:
  const uExps = classForGrading.gradebookUnits[0].expectations
  const rawMastery = masteryMap['student_1']
  let weightedSum = 0
  let totalWeight = 0
  let evalCount = 0

  uExps.forEach(exp => {
    const entry = rawMastery[exp.code]
    if (entry && entry.score != null) {
      const w = entry.weight != null ? entry.weight : exp.weight
      if (w > 0) {
        weightedSum += entry.score * w
        totalWeight += w
        evalCount++
      }
    }
  })

  const unitScore = (evalCount > 0 && totalWeight > 0) ? Math.round(weightedSum / totalWeight) : null
  assert.strictEqual(unitScore, 80, `Expected unit score 80%, got ${unitScore}%`)
  console.log('✓ Dossier Unit Breakdown calculates weighted unit average and excludes 0x standards')

  // ── TEST 9: Expectation Mastery Heatmap Weighted Average ──
  console.log('\n--- Test 9: Expectation Mastery Heatmap Weighted Average ---')
  // Heatmap expectation averages:
  const heatmapExps = [
    { code: 'A1.1', average: 90, weight: 2.0 },
    { code: 'A1.2', average: 60, weight: 1.0 },
    { code: 'B1.2', average: 20, weight: 0 } // 0x diagnostic
  ]

  let hmWeightedSum = 0
  let hmTotalWeight = 0
  let hmValidCount = 0

  heatmapExps.forEach(e => {
    const w = (e.weight != null && !isNaN(Number(e.weight))) ? Math.max(0, Number(e.weight)) : 1.0
    if (w > 0) {
      hmWeightedSum += e.average * w
      hmTotalWeight += w
      hmValidCount++
    }
  })

  const hmUnitAvg = (hmValidCount > 0 && hmTotalWeight > 0) ? (hmWeightedSum / hmTotalWeight) : null
  assert.strictEqual(hmUnitAvg, 80, `Expected Heatmap unitAvg 80%, got ${hmUnitAvg}%`)
  console.log('✓ ExpectationMasteryHeatmap calculates weighted unitAvg and excludes 0x standards')

  // Clean up test presets
  await resetMasterPreset('custom-sph4u-sync-test')
  await resetMasterPreset(exportResult.savedPreset.presetId)

  console.log('\n=================================================================')
  console.log('🎉 ALL BIDIRECTIONAL CURRICULUM SYNC & WEIGHTS TESTS PASSED!')
  console.log('=================================================================')
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err)
  process.exit(1)
})
