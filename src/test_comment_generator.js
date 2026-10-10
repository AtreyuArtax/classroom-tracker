/**
 * src/test_comment_generator.js
 *
 * Automated verification suite for the Ontario Report Card Comment Generator.
 * Tests:
 *  - Character budget constraints (strictly <= 400 chars in secondary mode)
 *  - Specific task evidence injection (kinematics, forces lab, etc.)
 *  - Fallback cascade (SBAR -> Category -> Overall Mark)
 *  - Pronoun modes ('preferred', 'name-only')
 *  - Combinatorial uniqueness across student seeds
 *  - Elementary narrative mode expansion
 */

import assert from 'node:assert'
import {
  generateReportComment,
  getAchievementLevel,
  getPronounTokens,
  extractEvidenceFromGrades,
  ACHIEVEMENT_LEVELS
} from './utils/commentGenerator.js'

console.log('=================================================================')
console.log('📝 REPORT CARD COMMENT GENERATOR VERIFICATION SUITE')
console.log('=================================================================')

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`)
    console.error(err)
    process.exit(1)
  }
}

// ── TEST GROUP 1: Secondary 400-Character Budget Constraint ──────────────────
console.log('\nTEST GROUP 1: Secondary Character Budget Enforcement')

test('Level 4 Physics comment stays strictly <= 400 chars with specific tasks', () => {
  const student = { firstName: 'Alex', pronouns: 'they/them' }
  const gradeData = {
    percentage: 88,
    assessments: [
      { name: '1D Kinematics Test', scorePercent: 92 },
      { name: 'Forces & Friction Lab', scorePercent: 68 }
    ]
  }
  const learningSkills = { collaboration: 'G', responsibility: 'G', initiative: 'E' }

  const result = generateReportComment({
    student,
    gradeData,
    learningSkills,
    options: { mode: 'secondary', charLimit: 400 }
  })

  assert.strictEqual(result.isOverLimit, false, `Character count ${result.charCount} exceeded 400 limit`)
  assert(result.charCount <= 400, `Expected <= 400, got ${result.charCount}`)
  assert(result.text.includes('Alex'), 'Must include student name')
  assert(result.text.includes('1D Kinematics Test'), 'Must include specific strength assessment name')
  assert(result.text.includes('Forces & Friction Lab'), 'Must include specific growth assessment name')
})

test('All achievement levels (4+, 4, 3, 2, 1, R) produce valid text <= 400 chars', () => {
  const marks = [98, 85, 74, 63, 52, 42]
  const student = { firstName: 'Jordan', pronouns: 'she/her' }

  marks.forEach(mark => {
    const res = generateReportComment({
      student,
      gradeData: { percentage: mark },
      options: { mode: 'secondary', charLimit: 400 }
    })
    assert(res.charCount <= 400, `Mark ${mark} exceeded limit: ${res.charCount} chars`)
    assert(res.charCount >= 100, `Mark ${mark} produced too short comment: ${res.charCount} chars`)
  })
})

// ── TEST GROUP 2: Specific Evidence Injection & Fallbacks ────────────────────
console.log('\nTEST GROUP 2: Specific Evidence Extraction & Fallback Cascade')

test('Tier 1: SBAR Expectations take precedence when available', () => {
  const gradeData = {
    percentage: 82,
    sbarExpectations: [
      { code: 'B2.1', title: 'solving 1D kinematic equations', average: 95 },
      { code: 'C1.2', title: 'vector components in 2D', average: 65 }
    ],
    assessments: [{ name: 'Generic Quiz', scorePercent: 80 }]
  }

  const evidence = extractEvidenceFromGrades(gradeData)
  assert.strictEqual(evidence.strengthSource, 'sbar')
  assert.strictEqual(evidence.growthSource, 'sbar')
  assert.strictEqual(evidence.strengthTask, 'solving 1D kinematic equations')
  assert.strictEqual(evidence.growthTask, 'vector components in 2D')

  const res = generateReportComment({
    student: { firstName: 'Marcus' },
    gradeData,
    options: { mode: 'secondary' }
  })

  assert(res.text.includes('solving 1D kinematic equations'))
  assert(res.text.includes('vector components in 2D'))
})

test('Tier 2: Traditional Category averages used when SBAR is missing', () => {
  const gradeData = {
    percentage: 78,
    categories: [
      { name: 'Thinking & Inquiry', average: 88 },
      { name: 'Communication', average: 64 },
      { name: 'Knowledge', average: 80 }
    ]
  }

  const evidence = extractEvidenceFromGrades(gradeData)
  assert.strictEqual(evidence.strengthSource, 'category')
  assert.strictEqual(evidence.growthSource, 'category')
  assert.strictEqual(evidence.strengthTask, 'critical thinking and analytical inquiry')
  assert.strictEqual(evidence.growthTask, 'written and technical communication')
})

test('Tier 3: Gracefully handles blank grades without throwing', () => {
  const res = generateReportComment({
    student: { firstName: 'Sam' },
    gradeData: {},
    options: { mode: 'secondary' }
  })

  assert(res.text.length > 50)
  assert(res.text.includes('Sam'))
  assert.strictEqual(res.isOverLimit, false)
})

// ── TEST GROUP 3: Pronoun Modes & Naming ─────────────────────────────────────
console.log('\nTEST GROUP 3: Pronouns & Naming Modes')

test('Preferred pronouns mode correctly applies she/her tokens', () => {
  const student = { firstName: 'Elena', pronouns: 'she/her' }
  const tokens = getPronounTokens(student, 'preferred')
  assert.strictEqual(tokens.subject, 'She')
  assert.strictEqual(tokens.possessive, 'her')
  assert.strictEqual(tokens.isPlural, false)
})

test('Name-Only mode repeats first name and strictly avoids pronouns', () => {
  const student = { firstName: 'Taylor', pronouns: 'they/them' }
  const res = generateReportComment({
    student,
    gradeData: { percentage: 84 },
    options: { pronounMode: 'name-only', mode: 'secondary' }
  })

  assert(!res.text.includes(' they '), 'Must not contain "they"')
  assert(!res.text.includes(' their '), 'Must not contain "their"')
  assert(!res.text.includes(' them '), 'Must not contain "them"')
  assert(res.text.includes('Taylor'), 'Must use student name')
})

// ── TEST GROUP 4: Combinatorial Uniqueness & Rerolling ───────────────────────
console.log('\nTEST GROUP 4: Combinatorial Variation & Uniqueness')

test('Different variant seeds generate distinctly phrased comments', () => {
  const student = { firstName: 'Chris', pronouns: 'he/him' }
  const gradeData = { percentage: 82 }

  const comment1 = generateReportComment({ student, gradeData, options: { variantSeed: 0 } }).text
  const comment2 = generateReportComment({ student, gradeData, options: { variantSeed: 1 } }).text
  const comment3 = generateReportComment({ student, gradeData, options: { variantSeed: 2 } }).text

  assert.notStrictEqual(comment1, comment2, 'Variant 0 and 1 should produce different phrasing')
  assert.notStrictEqual(comment2, comment3, 'Variant 1 and 2 should produce different phrasing')
})

// ── TEST GROUP 5: Elementary Mode Narrative Expansion ───────────────────────
console.log('\nTEST GROUP 5: Elementary Mode Narrative Expansion')

test('Elementary mode produces structured 2-paragraph narrative', () => {
  const student = { firstName: 'Maya', pronouns: 'she/her' }
  const res = generateReportComment({
    student,
    gradeData: { percentage: 86 },
    learningSkills: { collaboration: 'E', responsibility: 'G' },
    options: { mode: 'elementary' }
  })

  assert(res.text.includes('\n\n'), 'Elementary comment must contain paragraph break')
  assert(res.charCount > 250, 'Elementary comment must be richer than secondary')
  assert(res.text.includes("partnership between home and school"))
})

console.log('\n=================================================================')
console.log('🎉 ALL 8 COMMENT GENERATOR TEST SUITES PASSED (100% SUCCESS)!')
console.log('=================================================================')
