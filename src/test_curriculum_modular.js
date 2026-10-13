/**
 * src/test_curriculum_modular.js
 *
 * Verification suite for modular secondary courses, word-boundary keyword matching,
 * description scoring, and AI context integration.
 */

import {
  COURSE_COMPETENCIES,
  getCourseCompetencies,
  mapAssessmentToCompetency,
  extractCompetenciesFromAssessment,
  matchesKeyword
} from './utils/curriculumCompetencies.js'

import { generateReportComment } from './utils/commentGenerator.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

console.log('=================================================================')
console.log('🧪 SECONDARY COURSE MODULARITY & ASSESSMENT SCORING TEST SUITE')
console.log('=================================================================\n')

// ── Test 1: Modular Courses Loaded in Central Registry ──
console.log('TEST GROUP 1: Modular Secondary Course Registry')
const expectedCourses = ['SPH3U', 'SNC1W', 'SBI3U', 'SCH3U', 'SPH4U', 'SNC2D', 'SNC2P', 'MTH1W', 'MPM2D', 'MFM2P']
expectedCourses.forEach(code => {
  const comps = getCourseCompetencies(code)
  assert(Array.isArray(comps) && comps.length > 0, `Course ${code} is registered with ${comps.length} competencies`)
})

// ── Test 2: Word Boundary Keyword Matching ──
console.log('\nTEST GROUP 2: Word Boundary Matching (Preventing False Substring Matches)')
assert(!matchesKeyword('Origins, Systems & Cycles Test', 'stem'), '"systems" does NOT trigger false match on "stem"')
assert(matchesKeyword('STEM Investigation Lab', 'stem'), '"STEM Investigation Lab" triggers true match on "stem"')
assert(matchesKeyword('Forces in 2D Lab', 'force'), '"Forces" matches "force" with plural suffix')
assert(!matchesKeyword('Reinforcement Task', 'force'), '"Reinforcement" does not match "force"')

// ── Test 3: Assessment Description Scoring & Ranking ──
console.log('\nTEST GROUP 3: Assessment Title & Description Scoring')
const vanAssessment = {
  name: 'Origins, Systems & Cycles Test',
  description: 'Astrophysical origin of matter (Big Bang, redshift & Doppler, 2.73 K CMB), nebular accretion & planetary scale, the solar fusion engine, astronomical mechanics (23.5° axial tilt seasons, 50% moon illumination, eclipses & Line of Nodes), and the living biogeochemical engines of life.'
}

const extracted = extractCompetenciesFromAssessment(vanAssessment, 'SNC1W')
assert(extracted.length >= 2, `Extracted ${extracted.length} relevant competencies from description`)
assert(extracted[0].label.includes('Space'), `Top matched competency is Space: "${extracted[0].label}" (Score: ${extracted[0].score})`)
assert(extracted[1].label.includes('Ecosystems'), `Second matched competency is Ecosystems: "${extracted[1].label}" (Score: ${extracted[1].score})`)

// ── Test 4: End-to-End Comment Generation for Van ──
console.log('\nTEST GROUP 4: Van Comment Generation')
const vanResult = generateReportComment({
  student: { firstName: 'Van', pronouns: 'they/them' },
  gradeData: {
    level: '3',
    percentage: 75,
    assessments: [
      {
        ...vanAssessment,
        scorePercent: 75
      }
    ]
  },
  options: {
    mode: 'secondary',
    courseCode: 'SNC1W'
  }
})

assert(vanResult.strengthTask.includes('celestial bodies') || vanResult.strengthTask.includes('space'), `Strength task properly mapped to Space: "${vanResult.strengthTask}"`)
assert(vanResult.growthTask.includes('nutrient cycles') || vanResult.growthTask.includes('ecosystem'), `Growth task properly mapped to Ecosystems: "${vanResult.growthTask}"`)
assert(vanResult.charCount <= 400, `Comment length (${vanResult.charCount} chars) strictly <= 400`)
assert(!vanResult.text.includes('conducting controlled scientific inquiries'), 'Comment does NOT contain false generic STEM inquiry phrase')

console.log('\n=================================================================')
if (failed === 0) {
  console.log(`🎉 ALL ${passed} TESTS PASSED CLEANLY!`)
} else {
  console.error(`💥 ${failed} TESTS FAILED!`)
  process.exit(1)
}
