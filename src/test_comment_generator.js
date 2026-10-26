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
  isCommentExcludedAssessment,
  isNonAcademicCategory,
  deriveStudentProfileFocus,
  resolveAssessmentTaskName,
  isGenericTitle,
  sanitizeTaskTitle,
  hasVerbClash,
  condenseTopicForNextStep,
  ACHIEVEMENT_LEVELS
} from './utils/commentGenerator.js'
import { isFormativeAssessment } from './utils/gradeCalc.js'

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

// ── TEST GROUP 9: Formative & 0% Weight Assessment Exclusion ─────────────────
console.log('\nTEST GROUP 9: Formative & 0% Weight Assessment Exclusion')

test('isFormativeAssessment identifies formative by flag, purpose, and 0% category weight', () => {
  const mockClass = {
    gradebookCategories: [
      { categoryId: 'cat_summative', name: 'Tests & Quizzes', weight: 70 },
      { categoryId: 'cat_formative', name: 'Formative Practice', weight: 0 },
      { categoryId: 'cat_zero', name: 'Diagnostics', weight: 0 }
    ]
  }

  // 1. Direct flags
  assert.strictEqual(isFormativeAssessment({ isFormative: true }, mockClass), true)
  assert.strictEqual(isFormativeAssessment({ purpose: 'formative' }, mockClass), true)
  assert.strictEqual(isFormativeAssessment({ purpose: 'administrative' }, mockClass), true)
  assert.strictEqual(isFormativeAssessment({ assessmentType: 'formative' }, mockClass), true)

  // 2. 0% Category Weight lookup
  assert.strictEqual(isFormativeAssessment({ categoryId: 'cat_formative' }, mockClass), true)
  assert.strictEqual(isFormativeAssessment({ categoryId: 'cat_zero' }, mockClass), true)

  // 3. Summative assessment with positive weight
  assert.strictEqual(isFormativeAssessment({ categoryId: 'cat_summative', isFormative: false }, mockClass), false)
})

test('extractEvidenceFromGrades bypasses 100% formative quiz in favor of summative test', () => {
  const gradeData = {
    percentage: 84,
    gradebookCategories: [
      { categoryId: 'cat_formative', name: 'Formative Quizzes', weight: 0 },
      { categoryId: 'cat_tests', name: 'Unit Tests', weight: 100 }
    ],
    assessments: [
      // 100% on formative practice quiz
      {
        name: 'Practice Kinematics Quiz',
        scorePercent: 100,
        categoryId: 'cat_formative'
      },
      // 82% on summative unit test
      {
        name: 'Kinematics Unit Test',
        scorePercent: 82,
        categoryId: 'cat_tests'
      }
    ]
  }

  const evidence = extractEvidenceFromGrades(gradeData, 'SPH3U')
  assert.strictEqual(evidence.strengthSource, 'assessment')
  // Must NOT pick the 100% formative quiz!
  assert(!evidence.strengthTask.toLowerCase().includes('practice kinematics quiz'),
    `Expected summative evidence, but got formative: ${evidence.strengthTask}`)
  assert(evidence.strengthTask.includes('kinematic') || evidence.strengthTask.includes('Kinematics Unit Test'))
})

test('Categories fallback ignores 0% weight formative categories', () => {
  const gradeData = {
    percentage: 75,
    categories: [
      { name: 'Formative Work', average: 98, weight: 0 },
      { name: 'Thinking & Inquiry', average: 80, weight: 30 },
      { name: 'Communication', average: 65, weight: 20 }
    ]
  }

  const evidence = extractEvidenceFromGrades(gradeData)
  assert.strictEqual(evidence.strengthSource, 'category')
  assert.strictEqual(evidence.strengthTask, 'critical thinking and analytical inquiry')
})

test('Attendance and Participation category (even with positive weight) is excluded from comment evidence', () => {
  const mockClass = {
    gradebookCategories: [
      { categoryId: 'cat_att', name: 'Attendance and Participation', weight: 10 },
      { categoryId: 'cat_tests', name: 'Unit Tests', weight: 90 }
    ]
  }

  // Attendance task in weighted category is excluded from comments
  assert.strictEqual(
    isCommentExcludedAssessment({ name: 'Weekly Attendance', categoryId: 'cat_att' }, mockClass),
    true
  )
  assert.strictEqual(
    isCommentExcludedAssessment({ name: 'Class Participation', categoryId: 'cat_att' }, mockClass),
    true
  )

  // Summative academic task is included
  assert.strictEqual(
    isCommentExcludedAssessment({ name: 'Forces Unit Test', categoryId: 'cat_tests' }, mockClass),
    false
  )

  // In extractEvidenceFromGrades, a 100% Attendance mark does NOT usurp an 80% physics test
  const gradeData = {
    percentage: 82,
    gradebookCategories: mockClass.gradebookCategories,
    assessments: [
      { name: 'Attendance and Participation Score', scorePercent: 100, categoryId: 'cat_att' },
      { name: 'Dynamics and Forces Test', scorePercent: 80, categoryId: 'cat_tests' }
    ]
  }

  const evidence = extractEvidenceFromGrades(gradeData, 'SPH3U')
  assert.strictEqual(evidence.strengthSource, 'assessment')
  assert(!evidence.strengthTask.toLowerCase().includes('attendance'),
    `Attendance should not be picked as academic strength. Got: ${evidence.strengthTask}`)
  assert(evidence.strengthTask.includes('force') || evidence.strengthTask.includes('Dynamics'))
})

// ── TEST GROUP 10: Generic Title Resolution & Pedagogical Profile Derivation ─
console.log('\nTEST GROUP 10: Generic Title Resolution & Pedagogical Profile Focus')

test('isGenericTitle detects unit tests, chapter quizzes, and bare assessment labels', () => {
  assert.strictEqual(isGenericTitle('Unit 1 Test'), true)
  assert.strictEqual(isGenericTitle('Unit 2 Quiz'), true)
  assert.strictEqual(isGenericTitle('Ch. 3 Lab'), true)
  assert.strictEqual(isGenericTitle('Module 1 Checkpoint'), true)
  assert.strictEqual(isGenericTitle('Quiz #4'), true)
  assert.strictEqual(isGenericTitle('Forces & Friction Lab'), false)
  assert.strictEqual(isGenericTitle('Kinematics Project'), false)
})

test('resolveAssessmentTaskName resolves generic "Unit 1 Test" via expectations, description, or unit', () => {
  const genericWithExp = {
    name: 'Unit 1 Test',
    expectations: ['A1.1 analyze relationships between displacement, velocity, and time']
  }
  const resolvedExp = resolveAssessmentTaskName(genericWithExp, 'SPH3U')
  assert(resolvedExp.toLowerCase().includes('velocity') || resolvedExp.toLowerCase().includes('motion'),
    `Expected resolved expectation topic, got: ${resolvedExp}`)

  const genericWithDesc = {
    name: 'Unit 2 Quiz',
    description: 'Investigating static and kinetic friction on inclined planes'
  }
  const resolvedDesc = resolveAssessmentTaskName(genericWithDesc, 'SPH3U')
  assert(resolvedDesc.toLowerCase().includes('friction') || resolvedDesc.toLowerCase().includes('net force') || resolvedDesc.toLowerCase().includes('newton'),
    `Expected friction or forces competency topic, got: ${resolvedDesc}`)

  const genericWithUnit = {
    name: 'Lab 1',
    unitName: 'Unit 1: Kinematics'
  }
  const resolvedUnit = resolveAssessmentTaskName(genericWithUnit, 'SPH3U')
  assert(resolvedUnit.toLowerCase().includes('kinematics') || resolvedUnit.toLowerCase().includes('motion'),
    `Expected kinematics topic, got: ${resolvedUnit}`)
})

test('deriveStudentProfileFocus detects practical inquiry, rising trajectory, and consistency', () => {
  // Case A: Practical Inquiry advantage (labs average 90%, tests average 72%)
  const labHeavyData = {
    assessments: [
      { name: 'Forces Lab', scorePercent: 92, date: '2026-10-01' },
      { name: 'Optics Investigation', scorePercent: 88, date: '2026-10-15' },
      { name: 'Dynamics Test', scorePercent: 72, date: '2026-10-05' },
      { name: 'Kinematics Test', scorePercent: 72, date: '2026-10-20' }
    ]
  }
  const focusA = deriveStudentProfileFocus(labHeavyData)
  assert.strictEqual(focusA.key, 'modality_practical')
  assert(focusA.badge.includes('Practical') || focusA.badge.includes('🔬'))

  // Case B: Rising Momentum (+12% across chronological assessments)
  const improvingData = {
    assessments: [
      { name: 'Quiz 1', scorePercent: 68, date: '2026-09-15' },
      { name: 'Test 1', scorePercent: 70, date: '2026-09-30' },
      { name: 'Test 2', scorePercent: 82, date: '2026-10-15' },
      { name: 'Test 3', scorePercent: 84, date: '2026-10-30' }
    ]
  }
  const focusB = deriveStudentProfileFocus(improvingData)
  assert.strictEqual(focusB.key, 'trajectory_improving')
  assert(focusB.label.includes('Rising Momentum') || focusB.badge.includes('📈'))

  // Case C: High Consistency (scores: 85, 86, 84 -> SD ~1)
  const consistentData = {
    assessments: [
      { name: 'Task 1', scorePercent: 85, date: '2026-09-15' },
      { name: 'Task 2', scorePercent: 86, date: '2026-09-30' },
      { name: 'Task 3', scorePercent: 84, date: '2026-10-15' }
    ]
  }
  const focusC = deriveStudentProfileFocus(consistentData)
  assert.strictEqual(focusC.key, 'consistency_high')
})

// ── TEST GROUP 11: 3-Sentence Budget Guarantee & Preposition Cleanliness ─────
console.log('\nTEST GROUP 11: 3-Sentence Preservation & Preposition Verification')

test('3-sentence Growing Success structure is strictly preserved under 400 chars (never drops Sentence 2)', () => {
  const student = { firstName: 'Maya', pronouns: 'she/her' }
  const gradeData = {
    percentage: 78,
    assessments: [
      { name: 'Kinematics Unit Test', scorePercent: 82, date: '2026-09-20' },
      { name: 'Forces and Dynamics Lab', scorePercent: 64, date: '2026-10-10' }
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

  assert(res.charCount <= 400, `Comment exceeded 400 chars: ${res.charCount}`)
  assert.strictEqual(res.isOverLimit, false)

  // Count sentences in comment (must be at least 3)
  const sentences = res.text.split(/(?<=[.!?])\s+/).filter(Boolean)
  assert(sentences.length >= 3, `Expected at least 3 sentences, got ${sentences.length}: "${res.text}"`)

  // Preposition bug verification: NO "before X before unit assessments"
  assert(!res.text.includes('before unit assessments'), 'Must not contain awkward trailing "before unit assessments"')
  assert(!/\bbefore\b.*\bbefore\b/i.test(res.text), 'Must not contain duplicate "before" prepositions in single comment')
})

test('Sentence 1 celebrates strength score performance even when overall grade is Level 2', () => {
  const student = { firstName: 'Liam', pronouns: 'he/him' }
  const gradeData = {
    percentage: 64, // Level 2 overall
    assessments: [
      { name: 'Forces and Dynamics Lab', scorePercent: 92 }, // Level 4 strength task
      { name: 'Kinematics Test', scorePercent: 55 }
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

  // Sentence 1 should celebrate their thorough / strong capability on the Forces lab, not "finds challenging"
  assert(!res.text.toLowerCase().includes('finds forces and dynamics challenging'), 'Strength sentence must not say student finds strength task challenging')
  assert(res.text.includes('Liam'), 'Must include student name')
  assert(res.charCount <= 400, `Expected <= 400, got ${res.charCount}`)
})

// ─── TEST GROUP 12: Administrative Word Scrubbing & Next Step Grammar Adapter ───
console.log('\nTEST GROUP 12: Administrative Word Scrubbing & Next Step Grammar Adapter')

test('Administrative delivery containers (submission, dropbox, worksheet) are scrubbed from topics', () => {
  assert.strictEqual(sanitizeTaskTitle('Hare Lynx Submission'), 'Hare Lynx')
  assert.strictEqual(sanitizeTaskTitle('Forces Lab - Dropbox'), 'Forces Lab')
  assert.strictEqual(sanitizeTaskTitle('Kinematics Worksheet #2'), 'Kinematics')
  assert.strictEqual(sanitizeTaskTitle('Photosynthesis Activity Sheet'), 'Photosynthesis')
  assert.strictEqual(isGenericTitle('Dropbox'), true)
  assert.strictEqual(isGenericTitle('Submission #1'), true)
})

test('Tomi comment in SNC1W resolves "Hare Lynx Submission" to authentic ecology competency without grammar errors', () => {
  const student = { firstName: 'Tomi', pronouns: 'she/her' }
  const gradeData = {
    courseCode: 'SNC1W',
    percentage: 88,
    assessments: [
      { name: 'Space Exploration Inquiry', scorePercent: 96 },
      { name: 'Hare Lynx Submission', scorePercent: 78 }
    ]
  }

  for (let seed = 0; seed < 4; seed++) {
    const res = generateReportComment({
      student,
      gradeData,
      options: {
        mode: 'secondary',
        courseCode: 'SNC1W',
        charLimit: 400,
        variantSeed: seed
      }
    })

    assert(res.charCount <= 400, `Comment exceeds 400 chars: ${res.charCount}`)
    assert(!res.text.includes('submission'), 'Must never include administrative word "submission"')
    assert(!res.text.includes('when working with'), 'Must never produce awkward "when working with" clause')
    assert(!res.text.includes('hare lynx submission'), 'Must not leak raw assignment title')
    assert(res.text.includes('Tomi'), 'Must include student name')
  }
})

test('Reflexive pronouns (herself, himself, themselves) work cleanly in next step templates', () => {
  const female = getPronounTokens({ firstName: 'Maya', pronouns: 'she/her' })
  assert.strictEqual(female.reflexive, 'herself')

  const male = getPronounTokens({ firstName: 'Liam', pronouns: 'he/him' })
  assert.strictEqual(male.reflexive, 'himself')

  const neutral = getPronounTokens({ firstName: 'Alex', pronouns: 'they/them' })
  assert.strictEqual(neutral.reflexive, 'themselves')
})

// ── TEST GROUP 13: Ontario Growing Success Learning Skills Separation ────────
console.log('\nTEST GROUP 13: Ontario Growing Success Learning Skills Exclusion (Secondary)')

test('Secondary comments strictly exclude learning skills and work habits phrasing across all profile focuses', () => {
  const forbiddenPhrases = [
    'disciplined consistency',
    'positive dedication',
    'teacher guidance',
    'incorporating feedback',
    'incorporate feedback',
    'thorough preparation',
    'academic focus and sustained',
    'works diligently',
    'collaborates constructively',
    'completes assigned tasks',
    'satisfactory work habits',
    'manage class time',
    'managing class time',
    'regular attendance',
    'active class engagement',
    'consistent homework completion',
    'diligent approach'
  ]

  const student = { firstName: 'Jordan', pronouns: 'he/him' }
  const profiles = [
    'trajectory_improving',
    'consistency_high',
    'modality_practical',
    'modality_analytical',
    'category_thinking',
    'category_communication',
    'category_application',
    'qualitative_triangulation',
    'curriculum_general'
  ]

  const gradeData = {
    percentage: 84,
    assessments: [
      { name: 'Kinematics Investigation', scorePercent: 90, date: '2026-09-15' },
      { name: 'Dynamics Test', scorePercent: 78, date: '2026-09-30' },
      { name: 'Energy and Society Case Study', scorePercent: 85, date: '2026-10-15' }
    ]
  }

  for (const focus of profiles) {
    for (let seed = 0; seed < 4; seed++) {
      const res = generateReportComment({
        student,
        gradeData,
        learningSkills: { responsibility: 'G', organization: 'G', independentWork: 'E' },
        options: {
          mode: 'secondary',
          courseCode: 'SPH3U',
          charLimit: 400,
          profileFocus: focus,
          variantSeed: seed
        }
      })

      assert(res.charCount <= 400, `Comment exceeds 400 chars for profile ${focus}: ${res.charCount}`)

      const lower = res.text.toLowerCase()
      for (const phrase of forbiddenPhrases) {
        assert(
          !lower.includes(phrase),
          `Secondary comment contains forbidden Learning Skill phrase "${phrase}" under profile "${focus}". Comment: ${res.text}`
        )
      }
    }
  }
})

test('Secondary mode refuses learning_skills / work_habits profile injection', () => {
  const student = { firstName: 'Alex', pronouns: 'they/them' }
  const gradeData = { percentage: 76 }
  const learningSkills = { responsibility: 'N', organization: 'S', independentWork: 'S' }

  // Even if explicitly requested via profileFocus or includeWorkHabits:
  const res = generateReportComment({
    student,
    gradeData,
    learningSkills,
    options: {
      mode: 'secondary',
      charLimit: 400,
      profileFocus: 'work_habits',
      includeWorkHabits: true
    }
  })

  const lower = res.text.toLowerCase()
  assert(!lower.includes('work habits'), 'Must not include work habits phrasing in secondary subject comments')
  assert(!lower.includes('class time'), 'Must not evaluate class time management in secondary subject comments')
  assert(!lower.includes('deadlines'), 'Must not evaluate deadlines in secondary subject comments')
  assert(res.charCount <= 400, `Exceeds 400 characters: ${res.charCount}`)
})

// ── TEST GROUP 14: Anti-Repetition & Non-Generic Sentence 2 (Ashton SNC1W Case) ─
console.log('\nTEST GROUP 14: Anti-Repetition & Non-Generic Sentence 2 (Ashton SNC1W Case)')

test('hasVerbClash accurately detects repeated evaluative verbs across S1 and S2', () => {
  const clash1 = hasVerbClash(
    'Ashton demonstrates strong capability and high effectiveness when evaluating nutrient cycles.',
    'She demonstrates steady progression in applying course concepts and methods.'
  )
  assert.strictEqual(clash1, true, 'Must detect repeated "demonstrates"')

  const clash2 = hasVerbClash(
    'Ashton shows sound capability when evaluating nutrient cycles.',
    'She shows noticeable growth across recent units.'
  )
  assert.strictEqual(clash2, true, 'Must detect repeated "shows"')

  const noClash = hasVerbClash(
    'Ashton excels when evaluating nutrient cycles and sustainable ecosystem dynamics.',
    'She shows clear growth across recent units, solving multi-step problems with increasing precision.'
  )
  assert.strictEqual(noClash, false, 'Must recognize distinct verbs (excels vs shows)')
})

test('condenseTopicForNextStep shortens 3-part compound topics cleanly', () => {
  const longTopic = 'investigating celestial bodies, astronomical phenomena, and space exploration technologies'
  const condensed = condenseTopicForNextStep(longTopic)
  assert(condensed.length <= 65, `Expected <= 65 chars, got ${condensed.length}`)
  assert(condensed.includes('investigating celestial bodies'), 'Must preserve opening action clause')
  assert(condensed.includes('space exploration technologies'), 'Must preserve closing domain clause')
  assert(!condensed.includes('astronomical phenomena'), 'Must omit middle redundant clause in Next Step')
})

test('Ashton comment in SNC1W strictly avoids repeated "demonstrates" and vague boilerplate across seeds', () => {
  const student = { firstName: 'Ashton', pronouns: 'she/her' }
  const gradeData = {
    courseCode: 'SNC1W',
    percentage: 84,
    assessments: [
      { name: 'Ecosystem Sustainability Inquiry', scorePercent: 90, date: '2026-09-15' },
      { name: 'Space Exploration Test', scorePercent: 78, date: '2026-10-15' }
    ]
  }

  for (let seed = 0; seed < 4; seed++) {
    const res = generateReportComment({
      student,
      gradeData,
      options: {
        mode: 'secondary',
        courseCode: 'SNC1W',
        charLimit: 400,
        profileFocus: 'trajectory_improving',
        variantSeed: seed
      }
    })

    assert(res.charCount <= 400, `Comment exceeds 400 chars: ${res.charCount}`)

    // Verify Sentence 1 and Sentence 2 do not repeat the same verb
    const sentences = res.text.split(/(?<=[.?!])\s+/).filter(Boolean)
    assert(sentences.length >= 3, `Expected 3 sentences, got ${sentences.length}: ${res.text}`)

    const s1 = sentences[0]
    const s2 = sentences[1]
    const s1HasDemonstrates = /\bdemonstrates?\b/i.test(s1)
    const s2HasDemonstrates = /\bdemonstrates?\b/i.test(s2)
    assert(
      !(s1HasDemonstrates && s2HasDemonstrates),
      `Sentence 1 and Sentence 2 repeat "demonstrates"! Comment:\n${res.text}`
    )

    // Verify Sentence 2 is concrete and not vague boilerplate
    const lower = res.text.toLowerCase()
    assert(
      !lower.includes('in applying course concepts and methods'),
      `Sentence 2 contains vague boilerplate "in applying course concepts and methods". Comment:\n${res.text}`
    )

    // Verify Sentence 2 has meaningful cognitive action
    assert(
      lower.includes('multi-step') ||
      lower.includes('growth') ||
      lower.includes('precision') ||
      lower.includes('principles') ||
      lower.includes('relationships') ||
      lower.includes('accuracy') ||
      lower.includes('inquiries'),
      `Sentence 2 lacked concrete cognitive descriptors: ${s2}`
    )
  }
})

console.log('\n=================================================================')
console.log('🎉 ALL COMMENT GENERATOR TEST SUITES PASSED (100% SUCCESS)!')
console.log('=================================================================')


