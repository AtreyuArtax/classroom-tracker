/**
 * src/test_elementary_comment_generator.js
 *
 * Unit tests for elementary report card comment generator.
 */

import assert from 'assert'
import {
  generateElementaryScienceComment,
  generateElementaryMathComment,
  generateElementaryLanguageComment,
  generateElementaryHistoryComment,
  generateElementaryGeographyComment,
  generateElementarySubjectComment,
  generateLearningSkillsComment
} from './utils/elementaryCommentGenerator.js'
import { getScdsbCharacterLimit } from './data/comments/scdsbCharacterLimits.js'

console.log('--- Elementary Comment Generator Unit Tests ---')

// 1. SCDSB Character Limits
console.log('Test Group 1: SCDSB Character Limit Lookup')
assert.strictEqual(getScdsbCharacterLimit('science', 8), 1050)
assert.strictEqual(getScdsbCharacterLimit('math', 8), 1200)
assert.strictEqual(getScdsbCharacterLimit('language', 8), 1200)
assert.strictEqual(getScdsbCharacterLimit('learning_skills', 8), 2600)
assert.strictEqual(getScdsbCharacterLimit('the_arts', 8), 300)
assert.strictEqual(getScdsbCharacterLimit('history', 8), 600)
assert.strictEqual(getScdsbCharacterLimit('anything', 'SK'), 1700)
console.log('✓ SCDSB character limits resolve correctly')

// 2. Science Strand B (Cells) - Level 3
console.log('\nTest Group 2: Grade 8 Science - Strand B (Cells)')
const studentMaya = {
  firstName: 'Maya',
  preferredName: 'Maya',
  pronouns: 'she/her',
  gradeLevel: 8
}
const scienceRes = generateElementaryScienceComment({
  student: studentMaya,
  gradeData: { percentage: 76, level: '3' },
  options: {
    strandCode: 'B',
    charLimit: 1050
  }
})

console.log('Generated Science Comment (Strand B, L3):')
console.log(scienceRes.text)
console.log(`Length: ${scienceRes.charCount} / ${scienceRes.charLimit} chars`)
assert(scienceRes.text.includes('Maya identifies structures and organelles in cells'), 'Contains concept stem')
assert(scienceRes.text.includes('microscope'), 'Contains in-class investigation')
assert(scienceRes.text.includes('Next Steps:'), 'Contains next steps')
assert(scienceRes.charCount <= 1050, 'Science comment fits under 1050 SCDSB limit')
assert(!scienceRes.isOverLimit, 'isOverLimit is false')
console.log('✓ Grade 8 Science Strand B generates compliant comment')

// 3. Science Strand C (Fluids) - Level 4
console.log('\nTest Group 3: Grade 8 Science - Strand C (Fluids)')
const studentAlex = {
  firstName: 'Alex',
  pronouns: 'they/them',
  gradeLevel: 8
}
const fluidsRes = generateElementaryScienceComment({
  student: studentAlex,
  gradeData: { percentage: 88, level: '4' },
  options: {
    strandCode: 'C',
    charLimit: 1050
  }
})
console.log('Generated Science Comment (Strand C, L4):')
console.log(fluidsRes.text)
console.log(`Length: ${fluidsRes.charCount} / ${fluidsRes.charLimit} chars`)
assert(fluidsRes.text.includes('Alex demonstrates a thorough understanding of viscosity'), 'Contains fluids concept stem')
assert(fluidsRes.text.includes('They'), 'Proper pronoun used')
assert(fluidsRes.charCount <= 1050, 'Fluids comment fits under 1050 SCDSB limit')
console.log('✓ Grade 8 Science Strand C generates compliant comment')

// 4. Mathematics - Level 3
console.log('\nTest Group 4: Elementary Mathematics')
const mathRes = generateElementarySubjectComment({
  student: studentMaya,
  subject: { subjectId: 'subj_math', name: 'Mathematics', code: 'MATH' },
  gradeData: {
    percentage: 74,
    sbarExpectations: [
      { code: 'B1.2', description: 'composing and decomposing multi-digit whole numbers', average: 85 },
      { code: 'B2.4', description: 'solving multi-step word problems involving fractions', average: 62 }
    ]
  },
  options: {
    charLimit: 1200
  }
})
console.log('Generated Math Comment:')
console.log(mathRes.text)
console.log(`Length: ${mathRes.charCount} / ${mathRes.charLimit} chars`)
assert(mathRes.text.includes('composing and decomposing multi-digit whole numbers'), 'Includes auto-detected SBAR strength')
assert(mathRes.text.includes('Next Steps:'), 'Includes next steps')
assert(mathRes.charCount <= 1200, 'Math comment fits under 1200 SCDSB limit')
console.log('✓ Elementary Math integrates SBAR expectations under 1200 chars')

// 5. Learning Skills - Format A & Format B
console.log('\nTest Group 5: Learning Skills Generation')
const skillsRatings = {
  responsibility: 'E',
  organization: 'E',
  independentWork: 'G',
  collaboration: 'S',
  initiative: 'G',
  selfRegulation: 'S'
}

const lsFormatA = generateLearningSkillsComment({
  student: studentMaya,
  skillsRatings,
  options: {
    format: 'format_a',
    charLimit: 2600
  }
})
console.log('Learning Skills Comment (Format A):')
console.log(lsFormatA.text)
console.log(`Length: ${lsFormatA.charCount} / ${lsFormatA.charLimit} chars`)
assert(lsFormatA.text.includes('STRENGTHS:'), 'Includes STRENGTHS label')
assert(lsFormatA.text.includes('NEXT STEPS:'), 'Includes NEXT STEPS label')
assert(lsFormatA.charCount <= 2600, 'Format A fits under 2600 chars')

const lsFormatB = generateLearningSkillsComment({
  student: studentMaya,
  skillsRatings,
  options: {
    format: 'format_b',
    charLimit: 2600
  }
})
console.log('\nLearning Skills Comment (Format B):')
console.log(lsFormatB.text)
console.log(`Length: ${lsFormatB.charCount} / ${lsFormatB.charLimit} chars`)
assert(!lsFormatB.text.includes('STRENGTHS:'), 'Does NOT include section label in Format B')
assert(lsFormatB.charCount <= 2600, 'Format B fits under 2600 chars')
console.log('✓ Learning Skills synthesis passes both Format A and Format B')

// 6. Grade 8 Mathematics Dedicated Strands
console.log('\nTest Group 6: Grade 8 Mathematics Strands (Algebra & Financial Literacy)')
const mathAlgebraRes = generateElementaryMathComment({
  student: studentMaya,
  gradeData: { percentage: 84, level: '4' },
  options: {
    strandCode: 'C',
    charLimit: 1200
  }
})
console.log('Generated Math (Strand C - Algebra) Comment:')
console.log(mathAlgebraRes.text)
console.log(`Length: ${mathAlgebraRes.charCount} / ${mathAlgebraRes.charLimit} chars`)
assert(mathAlgebraRes.text.includes('pattern') || mathAlgebraRes.text.includes('algebra') || mathAlgebraRes.text.includes('equations'), 'Math comment includes algebra concepts')
assert(mathAlgebraRes.text.includes('Next Steps:'), 'Math comment includes next steps')
assert(mathAlgebraRes.charCount <= 1200, 'Math comment fits under 1200 chars')

const mathFinRes = generateElementaryMathComment({
  student: studentAlex,
  gradeData: { percentage: 92, level: '4+' },
  options: {
    strandCode: 'F',
    charLimit: 1200
  }
})
console.log('Generated Math (Strand F - Financial Literacy) Comment:')
console.log(mathFinRes.text)
console.log(`Length: ${mathFinRes.charCount} / ${mathFinRes.charLimit} chars`)
assert(mathFinRes.text.includes('financial') || mathFinRes.text.includes('budget') || mathFinRes.text.includes('interest'), 'Math comment includes financial concepts')
assert(mathFinRes.charCount <= 1200, 'Math comment fits under 1200 chars')
console.log('✓ Math strands generate compliant comments under 1200 chars')

// 7. Grade 8 Language Dedicated Strands (2023 Curriculum)
console.log('\nTest Group 7: Grade 8 Language (Foundations, Comprehension, Composition)')
const langCompRes = generateElementaryLanguageComment({
  student: studentMaya,
  gradeData: { percentage: 78, level: '3' },
  options: {
    strandCode: 'C',
    charLimit: 1200
  }
})
console.log('Generated Language (Strand C - Comprehension) Comment:')
console.log(langCompRes.text)
console.log(`Length: ${langCompRes.charCount} / ${langCompRes.charLimit} chars`)
assert(langCompRes.text.includes('comprehension') || langCompRes.text.includes('text') || langCompRes.text.includes('perspective'), 'Language includes comprehension themes')
assert(langCompRes.text.includes('Next Steps:'), 'Language includes next steps')
assert(langCompRes.charCount <= 1200, 'Language comment fits under 1200 chars')

const langCompRes2 = generateElementaryLanguageComment({
  student: studentAlex,
  gradeData: { percentage: 86, level: '4' },
  options: {
    strandCode: 'D',
    charLimit: 1200
  }
})
console.log('Generated Language (Strand D - Composition) Comment:')
console.log(langCompRes2.text)
console.log(`Length: ${langCompRes2.charCount} / ${langCompRes2.charLimit} chars`)
assert(langCompRes2.text.includes('writing') || langCompRes2.text.includes('draft') || langCompRes2.text.includes('composition'), 'Language includes composition themes')
assert(langCompRes2.charCount <= 1200, 'Language comment fits under 1200 chars')
console.log('✓ Language strands generate compliant comments under 1200 chars')

// 8. Grade 8 History (Strict 600 character cap)
console.log('\nTest Group 8: Grade 8 History (600 Character Cap)')
const histRes = generateElementaryHistoryComment({
  student: studentMaya,
  gradeData: { percentage: 75, level: '3' },
  options: {
    strandCode: 'A',
    charLimit: 600
  }
})
console.log('Generated History (Strand A) Comment:')
console.log(histRes.text)
console.log(`Length: ${histRes.charCount} / ${histRes.charLimit} chars`)
assert(histRes.text.includes('Dominion of Canada') || histRes.text.includes('Confederation') || histRes.text.includes('historical'), 'History includes 1850-1890 concepts')
assert(histRes.text.includes('Next Steps:'), 'History includes next steps')
assert(histRes.charCount <= 600, `History comment STRICTLY fits under 600 chars (was ${histRes.charCount})`)
console.log('✓ History comment respects 600 character SCDSB limit')

// 9. Grade 8 Geography (Strict 600 character cap)
console.log('\nTest Group 9: Grade 8 Geography (600 Character Cap)')
const geogRes = generateElementaryGeographyComment({
  student: studentAlex,
  gradeData: { percentage: 88, level: '4' },
  options: {
    strandCode: 'A',
    charLimit: 600
  }
})
console.log('Generated Geography (Strand A) Comment:')
console.log(geogRes.text)
console.log(`Length: ${geogRes.charCount} / ${geogRes.charLimit} chars`)
assert(geogRes.text.includes('settlement') || geogRes.text.includes('sustainability') || geogRes.text.includes('population'), 'Geography includes settlement concepts')
assert(geogRes.text.includes('Next Steps:'), 'Geography includes next steps')
assert(geogRes.charCount <= 600, `Geography comment STRICTLY fits under 600 chars (was ${geogRes.charCount})`)
console.log('✓ Geography comment respects 600 character SCDSB limit')

// 10. Automatic Subject Dispatching
console.log('\nTest Group 10: Automatic Subject Dispatch via generateElementarySubjectComment')
const dispMath = generateElementarySubjectComment({
  student: studentMaya,
  subject: { code: 'MATH', name: 'Mathematics' },
  gradeData: { percentage: 80 },
  options: { strandCode: 'C' }
})
assert(dispMath.text.includes('Next Steps:'), 'Dispatched math has next steps')
assert(dispMath.charLimit === 1200, 'Math limit is 1200')

const dispHist = generateElementarySubjectComment({
  student: studentMaya,
  subject: { code: 'HIS', name: 'History' },
  gradeData: { percentage: 80 },
  options: { strandCode: 'B' }
})
assert(dispHist.charLimit === 600, 'History limit is 600')
assert(dispHist.charCount <= 600, 'Dispatched history fits under 600 chars')

const dispGeog = generateElementarySubjectComment({
  student: studentMaya,
  subject: { code: 'GEO', name: 'Geography' },
  gradeData: { percentage: 80 },
  options: { strandCode: 'B' }
})
assert(dispGeog.charLimit === 600, 'Geography limit is 600')
assert(dispGeog.charCount <= 600, 'Dispatched geography fits under 600 chars')

console.log('✓ Automatic subject dispatcher routes all subjects correctly')

console.log('\n===============================================')
console.log('ALL 10 ELEMENTARY COMMENT GENERATOR SUITES PASSED!')
console.log('===============================================')
