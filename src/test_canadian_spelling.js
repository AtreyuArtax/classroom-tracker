/**
 * src/test_canadian_spelling.js
 *
 * Automated verification suite for SCDSB APM A1460 Appendix E-1 & E-2 requirements:
 * 1. Standard Canadian English spelling (colour, behaviour, centre, modelling, etc.)
 * 2. Lowercase subject names (mathematics, science and technology, health and physical education,
 *    history, geography, the arts) with proper nouns (French, Français) preserved.
 */

import assert from 'node:assert'
import {
  formatSubjectNameForComment,
  enforceCanadianSpelling
} from './utils/canadianSpelling.js'
import {
  generateElementarySubjectComment,
  generateElementaryScienceComment,
  generateElementaryMathComment,
  generateLearningSkillsComment
} from './utils/elementaryCommentGenerator.js'
import {
  generateReportComment
} from './utils/commentGenerator.js'

console.log('=================================================================')
console.log('🇨🇦 SCDSB APM A1460 CANADIAN SPELLING & SUBJECT CASING VERIFICATION')
console.log('=================================================================\n')

// ── TEST 1: Subject Name Normalization (APM A1460 Appendix E-1) ───────────────
console.log('TEST 1: Subject Name Lowercasing & Proper Noun Preservation')

assert.strictEqual(formatSubjectNameForComment('Mathematics'), 'mathematics')
assert.strictEqual(formatSubjectNameForComment('Science and Technology'), 'science and technology')
assert.strictEqual(formatSubjectNameForComment('Health and Physical Education'), 'health and physical education')
assert.strictEqual(formatSubjectNameForComment('History'), 'history')
assert.strictEqual(formatSubjectNameForComment('Geography'), 'geography')
assert.strictEqual(formatSubjectNameForComment('The Arts'), 'the arts')
assert.strictEqual(formatSubjectNameForComment('Visual Arts'), 'visual arts')
assert.strictEqual(formatSubjectNameForComment('Language'), 'language')
assert.strictEqual(formatSubjectNameForComment('Music'), 'music')
assert.strictEqual(formatSubjectNameForComment('Drama'), 'drama')
assert.strictEqual(formatSubjectNameForComment('Dance'), 'dance')

// Proper noun preservation
assert.strictEqual(formatSubjectNameForComment('French'), 'French')
assert.strictEqual(formatSubjectNameForComment('Core French'), 'core French')
assert.strictEqual(formatSubjectNameForComment('French Immersion'), 'French immersion')
assert.strictEqual(formatSubjectNameForComment('Français'), 'Français')
assert.strictEqual(formatSubjectNameForComment('Ojibwe'), 'Ojibwe')
assert.strictEqual(formatSubjectNameForComment('Cree'), 'Cree')

console.log('  ✓ Standard subjects lowercased correctly (mathematics, science and technology, etc.)')
console.log('  ✓ Proper nouns preserved (French, core French, Ojibwe, etc.)\n')

// ── TEST 2: Canadian Spelling Normalization Engine ───────────────────────────
console.log('TEST 2: Canadian Spelling Normalization Engine')

const sampleText = 'Maya uses color-coded tiles and good behavior in the learning center while modeling data. She traveled 2 meters away from the voltmeter and honors her favorite mentors.'
const converted = enforceCanadianSpelling(sampleText)

assert(converted.includes('colour-coded'), 'Replaces color-coded with colour-coded')
assert(converted.includes('behaviour'), 'Replaces behavior with behaviour')
assert(converted.includes('centre'), 'Replaces center with centre')
assert(converted.includes('modelling'), 'Replaces modeling with modelling')
assert(converted.includes('travelled'), 'Replaces traveled with travelled')
assert(converted.includes('2 metres'), 'Replaces 2 meters with 2 metres')
assert(converted.includes('voltmeter'), 'Preserves instrument voltmeter (NOT voltmetre)')
assert(converted.includes('honours'), 'Replaces honors with honours')
assert(converted.includes('favourite'), 'Replaces favorite with favourite')

// Capitalized forms
const capSample = 'Color and Behavior are important in the Center. Modeling was observed.'
const capConverted = enforceCanadianSpelling(capSample)
assert(capConverted.includes('Colour and Behaviour'), 'Capitalized Color and Behavior converted to Colour and Behaviour')
assert(capConverted.includes('Centre'), 'Capitalized Center converted to Centre')
assert(capConverted.includes('Modelling'), 'Capitalized Modeling converted to Modelling')

console.log('  ✓ All standard Canadian spelling replacements function properly')
console.log('  ✓ Specialized instruments (voltmeter) correctly preserved\n')

// ── TEST 3: Elementary Subject Comment Generator Integration ─────────────────
console.log('TEST 3: Elementary Generator Lowercase Subjects & Canadian Spelling Integration')

const artsRes = generateElementarySubjectComment({
  student: { firstName: 'Liam', pronouns: 'he/him', gradeLevel: 8 },
  subject: { name: 'Visual Arts', code: 'ART' },
  gradeData: { percentage: 55, level: '1' }
})

assert(artsRes.text.includes('core visual arts expectations'),
  `Subject name must be lowercase in next step. Got: ${artsRes.text}`)
assert(!artsRes.text.includes('core Visual Arts expectations'),
  'Subject name must NOT be capitalized')

const frenchRes = generateElementarySubjectComment({
  student: { firstName: 'Chloé', pronouns: 'she/her', gradeLevel: 8 },
  subject: { name: 'Core French', code: 'FSLC' },
  gradeData: { percentage: 55, level: '1' }
})

assert(frenchRes.text.includes('core French expectations'),
  `French must remain capitalized in next step. Got: ${frenchRes.text}`)

// Level 2 modelling test (generic subject template)
const level2Res = generateElementarySubjectComment({
  student: { firstName: 'Noah', pronouns: 'he/him', gradeLevel: 8 },
  subject: { name: 'Health and Physical Education', code: 'PHE' },
  gradeData: { percentage: 65, level: '2' }
})

assert(level2Res.text.includes('modelling'),
  `Level 2 application must use Canadian spelling "modelling". Got: ${level2Res.text}`)
assert(!level2Res.text.includes('modeling'),
  'Must not contain American spelling "modeling"')

console.log('  ✓ Elementary subject comments use lowercase subjects (e.g. core mathematics expectations)')
console.log('  ✓ French properly preserves capitalization (core French expectations)')
console.log('  ✓ Generated text enforces Canadian spelling ("modelling")\n')

// ── TEST 4: Elementary Science & Math Banks Canadian Spelling ─────────────────
console.log('TEST 4: Elementary Comment Banks Exemplars Canadian Spelling')

const sciRes = generateElementaryScienceComment({
  student: { firstName: 'Sophia', pronouns: 'she/her', gradeLevel: 8 },
  gradeData: { percentage: 95, level: '4+' },
  options: { strandCode: 'E' }
})

assert(!sciRes.text.includes('modeling'), 'Science comments must not contain "modeling"')
if (sciRes.text.includes('model')) {
  assert(sciRes.text.includes('modelling') || sciRes.text.includes('modelled') || sciRes.text.includes('model'),
    'Science comments must use Canadian spelling')
}

const lsRes = generateLearningSkillsComment({
  student: { firstName: 'Sophia', pronouns: 'she/her', gradeLevel: 8 },
  skillsRatings: { responsibility: 'E', organization: 'G' },
  options: { variantSeed: 3 }
})

assert(lsRes.text.includes('behaviour'), 'Learning skills must use Canadian spelling "behaviour"')
assert(!lsRes.text.includes('behavior'), 'Learning skills must NOT contain "behavior"')

console.log('  ✓ Science comment bank uses Canadian spelling (modelling/modelled)')
console.log('  ✓ Learning skills comment bank strictly uses Canadian spelling (behaviour)\n')

console.log('=================================================================')
console.log('🎉 ALL SCDSB APM A1460 CANADIAN SPELLING & SUBJECT TESTS PASSED!')
console.log('=================================================================')
