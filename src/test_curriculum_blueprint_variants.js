import assert from 'node:assert/strict'
import {
  curriculumPresets,
  getPresetsByPanel,
  findElementaryPreset
} from './data/curriculum/index.js'
import {
  initCurriculumLibrary,
  deriveOverallPreset,
  deriveSpecificPreset,
  getSuccessCriteriaPreset,
  getCourseBlueprints,
  getMasterPreset,
  isMasterCustomized,
  saveMasterPreset,
  resetMasterPreset
} from './composables/useCurriculumLibrary.js'

console.log('--- RUNNING CURRICULUM BLUEPRINT & VARIANTS TEST SUITE ---')

// 1. Check raw secondary presets
const secPresets = curriculumPresets.filter(p => p.panel === 'secondary')
console.log(`Loaded ${secPresets.length} raw secondary presets.`)
assert(secPresets.length >= 17, 'Should have at least 17 secondary preset files')

// 2. Test getCourseBlueprints('secondary')
const secBlueprints = getCourseBlueprints('secondary')
console.log(`Collapses into ${secBlueprints.length} distinct course blueprints.`)
assert.equal(secBlueprints.length, 9, 'Should have exactly 9 secondary course blueprints')

const expectedCodes = ['SNC1W', 'MTH1W', 'MPM2D', 'MFM2P', 'SNC2D', 'SNC2P', 'SCH3U', 'SPH3U', 'SPH4U']
expectedCodes.forEach(code => {
  const found = secBlueprints.find(b => b.courseCode === code)
  assert(found, `Should include course blueprint for ${code}`)
})

// 3. Test SNC1W variants
const snc1wBlueprint = secBlueprints.find(b => b.courseCode === 'SNC1W')
assert(snc1wBlueprint, 'SNC1W blueprint exists')
assert.equal(snc1wBlueprint.variants.specific.count, 50, 'SNC1W specific should have 50 expectations')
assert.equal(snc1wBlueprint.variants.overall.count, 10, 'SNC1W overall should have 10 expectations')
assert.equal(snc1wBlueprint.variants.success_criteria.available, true, 'SNC1W has success criteria available')
assert.equal(snc1wBlueprint.variants.success_criteria.count, 13, 'SNC1W success criteria should have 13 expectations')

// 4. Test SPH4U (has no companion success criteria)
const sph4uBlueprint = secBlueprints.find(b => b.courseCode === 'SPH4U')
assert(sph4uBlueprint, 'SPH4U blueprint exists')
assert.equal(sph4uBlueprint.variants.specific.count, 71, 'SPH4U specific should have 71 expectations')
assert.equal(sph4uBlueprint.variants.overall.count, 17, 'SPH4U overall should have 17 expectations')
assert.equal(sph4uBlueprint.variants.success_criteria.available, false, 'SPH4U does not have success criteria')

// 5. Test Elementary Blueprints (Grade 8)
const elemBlueprints = getCourseBlueprints('elementary')
const g8Sci = elemBlueprints.find(b => b.presetId.includes('g8-science-tech'))
assert(g8Sci, 'Grade 8 Science blueprint exists')
assert(g8Sci.variants.specific.count > 20, 'G8 Science has specifics')
assert(g8Sci.variants.overall.count >= 6, 'G8 Science has overalls')

// 6. Test deriveOverallPreset
const snc1wRaw = curriculumPresets.find(p => p.presetId === 'ontario-snc1w')
const snc1wOverall = deriveOverallPreset(snc1wRaw)
assert.equal(snc1wOverall.presetId, 'ontario-snc1w-overall')
const overallCodes = []
snc1wOverall.strands.forEach(s => s.expectations.forEach(e => overallCodes.push(e.code)))
assert.deepEqual(overallCodes, ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'])

console.log('✓ All curriculum blueprint & variant tests PASSED!')
