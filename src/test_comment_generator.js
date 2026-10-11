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

  assert(res.text.toLowerCase().includes('solving 1d kinematic equations'))
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

// ── TEST GROUP 6: Authentic Ontario Curriculum Competency Mapping ───────────
console.log('\nTEST GROUP 6: Authentic Curriculum Competency Mapping & Pedagogical Voice')

test('SPH3U correctly maps Kinematics and Forces assessments to authentic competencies', () => {
  const student = { firstName: 'Ella', pronouns: 'she/her' }
  const gradeData = {
    percentage: 84,
    assessments: [
      { name: 'Kinematics Unit Test', scorePercent: 90 },
      { name: 'Forces & Friction Lab', scorePercent: 65 }
    ]
  }

  const res = generateReportComment({
    student,
    gradeData,
    options: {
      mode: 'secondary',
      courseCode: 'SPH3U',
      charLimit: 400
    }
  })

  // Must map to authentic competencies
  assert(res.text.toLowerCase().includes('analyzing 1d and 2d motion and solving projectile kinematics problems'), 'Must map Kinematics test to projectile kinematics competency')
  assert(res.text.includes('constructing free-body diagrams and applying Newton’s laws to solve net force problems'), 'Must map Forces lab to free-body diagrams competency')

  // Must flow naturally without "Next step:" heading
  assert(!res.text.includes('Next step:'), 'Must NOT contain "Next step:" label')
  assert(!res.text.includes('Immediate next step:'), 'Must NOT contain "Immediate next step:" label')

  // Must stay within secondary character budget
  assert(res.charCount <= 400, `Expected <= 400, got ${res.charCount}`)
  assert.strictEqual(res.isOverLimit, false)
})

test('SNC1W destreamed science maps biology, chemistry, physics, and space strands', () => {
  const student = { firstName: 'Noah', pronouns: 'he/him' }
  const gradeData = {
    percentage: 76,
    assessments: [
      { name: 'Ecosystem Sustainability Project', scorePercent: 88 },
      { name: 'Ohm’s Law & Circuits Lab', scorePercent: 62 }
    ]
  }

  const res = generateReportComment({
    student,
    gradeData,
    options: {
      mode: 'secondary',
      courseCode: 'SNC1W',
      charLimit: 400
    }
  })

  assert(res.text.toLowerCase().includes('evaluating nutrient cycles, biodiversity, and sustainable ecosystem dynamics'))
  assert(res.text.includes('designing and analyzing series and parallel circuits using Ohm’s law'))
  assert(!res.text.includes('Next step:'))
  assert(res.charCount <= 400)
})

test('SBI3U, SCH3U, and SPH4U correctly map specialized senior competencies', () => {
  const student = { firstName: 'Chloe', pronouns: 'she/her' }

  // SBI3U: Biology
  const bioRes = generateReportComment({
    student,
    gradeData: {
      percentage: 91,
      assessments: [
        { name: 'Unit 2: Mendelian Genetics Test', scorePercent: 95 },
        { name: 'Internal Systems Circulatory Quiz', scorePercent: 80 }
      ]
    },
    options: { mode: 'secondary', courseCode: 'SBI3U', charLimit: 400 }
  })
  assert(bioRes.text.toLowerCase().includes('analyzing mendelian genetics, monohybrid and dihybrid crosses, and dna inheritance patterns'))
  assert(bioRes.charCount <= 400)

  // SCH3U: Chemistry
  const chemRes = generateReportComment({
    student,
    gradeData: {
      percentage: 82,
      assessments: [
        { name: 'Stoichiometry & Mole Calculations Lab', scorePercent: 88 },
        { name: 'Chemical Reactions & Balancing Equations Test', scorePercent: 70 }
      ]
    },
    options: { mode: 'secondary', courseCode: 'SCH3U', charLimit: 400 }
  })
  assert(chemRes.text.toLowerCase().includes('applying the mole concept and stoichiometry to calculate theoretical yield and limiting reactants'))
  assert(chemRes.charCount <= 400)

  // SPH4U: Physics 12
  const phys12Res = generateReportComment({
    student,
    gradeData: {
      percentage: 85,
      assessments: [
        { name: 'Circular Motion & Orbital Dynamics Test', scorePercent: 90 },
        { name: 'Momentum & 2D Collisions Investigation', scorePercent: 72 }
      ]
    },
    options: { mode: 'secondary', courseCode: 'SPH4U', charLimit: 400 }
  })
  assert(phys12Res.text.toLowerCase().includes('solving 2d circular motion, centripetal force, and orbital mechanics problems'))
  assert(phys12Res.charCount <= 400)
})

// ── TEST GROUP 7: Reporting Period Milestone Windows & Term Independence ────
console.log('\nTEST GROUP 7: Reporting Period Milestone Windows & Term Independence')

test('Progress Report, Midterm, and Final produce distinct comments with staggered default seeds', () => {
  const student = { firstName: 'Lucas', pronouns: 'he/him' }
  const gradeData = {
    percentage: 82,
    assessments: [{ name: 'Kinematics Unit Test', scorePercent: 82 }]
  }

  // Progress Report (seed 0), Midterm (seed 1), Final (seed 2)
  const commentProgress = generateReportComment({
    student,
    gradeData,
    options: { mode: 'secondary', courseCode: 'SPH3U', variantSeed: 0 }
  }).text

  const commentMidterm = generateReportComment({
    student,
    gradeData,
    options: { mode: 'secondary', courseCode: 'SPH3U', variantSeed: 1 }
  }).text

  const commentFinal = generateReportComment({
    student,
    gradeData,
    options: { mode: 'secondary', courseCode: 'SPH3U', variantSeed: 2 }
  }).text

  assert.notStrictEqual(commentProgress, commentMidterm, 'Progress Report and Midterm comments must be distinctly phrased')
  assert.notStrictEqual(commentMidterm, commentFinal, 'Midterm and Final comments must be distinctly phrased')
  assert.notStrictEqual(commentProgress, commentFinal, 'Progress and Final comments must be distinctly phrased')
})

test('Date-scoped assessment filtering dynamically updates evidence between Midterm and Final', () => {
  const student = { firstName: 'Lucas', pronouns: 'he/him' }
  
  // All assessments across the semester
  const allAssessments = [
    { name: 'Kinematics Unit Test', date: '2026-10-10', scorePercent: 92 },
    { name: 'Forces Dynamics Lab', date: '2026-11-20', scorePercent: 68 },
    { name: 'Waves & Sound Inquiry', date: '2026-12-15', scorePercent: 95 }
  ]

  // Midpoint cutoff: 2026-11-15 (includes Kinematics only, excludes Forces & Waves)
  const midtermCutoff = '2026-11-15'
  const midtermAssessments = allAssessments.filter(a => a.date <= midtermCutoff)
  assert.strictEqual(midtermAssessments.length, 1)

  const midtermComment = generateReportComment({
    student,
    gradeData: { percentage: 92, assessments: midtermAssessments },
    options: { mode: 'secondary', courseCode: 'SPH3U', variantSeed: 1 }
  }).text
  assert(midtermComment.toLowerCase().includes('analyzing 1d and 2d motion and solving projectile kinematics problems'))

  // Final cutoff: 2027-01-31 (includes all 3 assessments, top is Waves 95%, low is Forces 68%)
  const finalCutoff = '2027-01-31'
  const finalAssessments = allAssessments.filter(a => a.date <= finalCutoff)
  assert.strictEqual(finalAssessments.length, 3)

  const finalComment = generateReportComment({
    student,
    gradeData: { percentage: 85, assessments: finalAssessments },
    options: { mode: 'secondary', courseCode: 'SPH3U', variantSeed: 2 }
  }).text
  assert(finalComment.toLowerCase().includes('investigating mechanical wave properties, resonance, and the doppler effect'))
  assert(finalComment.includes('constructing free-body diagrams and applying Newton’s laws to solve net force problems'))
})

// ── TEST GROUP 8: Final Report Senior Pathway Next Steps (Ontario Growing Success) ──
console.log('\nTEST GROUP 8: Final Report Senior Pathway Next Steps (Ontario Growing Success & SCDSB)')

test('Final report comments pivot next steps forward to senior course pathways', () => {
  const student = { firstName: 'Lucas', pronouns: 'he/him' }
  const gradeData = {
    percentage: 86,
    assessments: [
      { name: 'Waves & Sound Inquiry', date: '2026-12-15', scorePercent: 92 },
      { name: 'Forces Dynamics Lab', date: '2026-11-20', scorePercent: 74 }
    ]
  }

  // Midterm comment: guides practice before upcoming unit assessments
  const midtermComment = generateReportComment({
    student,
    gradeData,
    options: { mode: 'secondary', courseCode: 'SPH3U', reportingPeriod: 'Midterm', variantSeed: 1 }
  }).text

  // Final comment: guides transition to senior courses or future studies
  const finalComment = generateReportComment({
    student,
    gradeData,
    options: { mode: 'secondary', courseCode: 'SPH3U', reportingPeriod: 'Final', variantSeed: 2 }
  }).text

  assert(finalComment.toLowerCase().includes('senior courses') || finalComment.toLowerCase().includes('subsequent studies') || finalComment.toLowerCase().includes('higher-level coursework') || finalComment.toLowerCase().includes('future academic studies'),
    `Final comment must reference senior coursework / future studies. Got: ${finalComment}`)
  assert(!finalComment.includes('before unit assessments'),
    'Final comment must not tell students to practice before unit assessments when course has ended')
  assert(finalComment.length <= 400, `Final comment exceeded 400 chars: ${finalComment.length}`)
})

test('Level R on Final report explicitly recommends credit recovery or summer school', () => {
  const student = { firstName: 'Taylor', pronouns: 'she/her' }
  const gradeData = {
    percentage: 42,
    assessments: [{ name: 'Electricity Quiz', scorePercent: 40 }]
  }

  const finalFailComment = generateReportComment({
    student,
    gradeData,
    options: { mode: 'secondary', courseCode: 'SNC1W', reportingPeriod: 'Final', variantSeed: 0 }
  }).text

  assert(finalFailComment.toLowerCase().includes('credit recovery') || finalFailComment.toLowerCase().includes('summer school') || finalFailComment.toLowerCase().includes('guidance'),
    `Level R final comment must recommend credit recovery / summer school / guidance. Got: ${finalFailComment}`)
  assert(finalFailComment.length <= 400, `Level R final comment exceeded 400 chars: ${finalFailComment.length}`)
})

test('All levels on Final report remain strictly <= 400 characters across multiple seeds', () => {
  const marks = [95, 84, 73, 62, 53, 41]
  const student = { firstName: 'Morgan', pronouns: 'they/them' }

  marks.forEach(mark => {
    for (let seed = 0; seed < 4; seed++) {
      const res = generateReportComment({
        student,
        gradeData: {
          percentage: mark,
          assessments: [
            { name: 'Conservation of Energy Project', scorePercent: mark },
            { name: 'Electric Circuits Lab', scorePercent: mark - 10 }
          ]
        },
        options: { mode: 'secondary', courseCode: 'SPH3U', reportingPeriod: 'Final', variantSeed: seed, charLimit: 400 }
      })

      assert(res.charCount <= 400, `Final comment for mark ${mark} (seed ${seed}) exceeded 400 chars: ${res.charCount}`)
      assert(res.charCount >= 100, `Final comment for mark ${mark} (seed ${seed}) too short: ${res.charCount}`)
    }
  })
})

console.log('\n=================================================================')
console.log('🎉 ALL 16 COMMENT GENERATOR TEST SUITES PASSED (100% SUCCESS)!')
console.log('=================================================================')


