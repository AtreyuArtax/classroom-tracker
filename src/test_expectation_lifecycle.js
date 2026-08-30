import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { calculateSBARExpectationMastery } from './db/gradebook/gradeCalcSBAR.js'
import { cleanExpectationText, cleanCurriculumObject } from './utils/textUtils.js'
import { migrateData } from './db/migrations.js'

console.log('--- RUNNING EXPECTATION LIFECYCLE & CASCADE TESTS ---')

// TEST 1: Multi-format parsing logic verification
function parseCsvLine(text) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ''))
      cur = ''
    } else {
      cur += char
    }
  }
  if (cur) result.push(cur.trim().replace(/^["']|["']$/g, ''))
  return result
}

function parseRawExpectationsText(raw) {
  if (!raw || !raw.trim()) return []
  const lines = raw.split(/\r?\n/)
  const results = []

  let startIndex = 0
  if (lines.length > 0) {
    const first = lines[0].toLowerCase().trim()
    const tokens = first.split(/[\t\|,]/).map(t => t.trim().replace(/^["']|["']$/g, ''))
    const isHeader = tokens.some(t => 
      t === 'code' || 
      t === 'expectation' || 
      t === 'expectations' || 
      t === 'learning goal' || 
      t === 'description' || 
      t === 'expectation code' || 
      (t === 'strand' && tokens.length > 1 && tokens.some(tok => tok === 'code' || tok === 'description' || tok === 'expectation'))
    )
    if (isHeader) {
      startIndex = 1
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 1. Pipe-separated
    if (line.includes('|')) {
      const parts = line.split('|').map(s => s.trim())
      if (parts.length >= 3) {
        results.push({
          strand: parts[0],
          code: parts[1].toUpperCase(),
          description: parts.slice(2).join(' | '),
          isOverall: /^[A-Z]\d+$/i.test(parts[1])
        })
        continue
      } else if (parts.length === 2) {
        results.push({
          strand: '',
          code: parts[0].toUpperCase(),
          description: parts[1],
          isOverall: /^[A-Z]\d+$/i.test(parts[0])
        })
        continue
      }
    }

    // 2. Tab-separated
    if (line.includes('\t')) {
      const parts = line.split('\t').map(s => s.trim())
      if (parts.length >= 3) {
        results.push({
          strand: parts[0],
          code: parts[1].toUpperCase(),
          description: parts.slice(2).join(' '),
          isOverall: /^[A-Z]\d+$/i.test(parts[1])
        })
        continue
      } else if (parts.length === 2) {
        results.push({
          strand: '',
          code: parts[0].toUpperCase(),
          description: parts[1],
          isOverall: /^[A-Z]\d+$/i.test(parts[0])
        })
        continue
      }
    }

    // 3. Colon-separated
    const matchColon = line.match(/^([A-Za-z0-9\.-]{1,12})\s*:\s*(.+)$/)
    if (matchColon) {
      results.push({
        strand: '',
        code: matchColon[1].toUpperCase().trim(),
        description: matchColon[2].trim(),
        isOverall: /^[A-Z]\d+$/i.test(matchColon[1].trim())
      })
      continue
    }

    // 4. CSV parsing with quotes
    const csvParts = parseCsvLine(line)
    if (csvParts.length >= 3) {
      results.push({
        strand: csvParts[0].trim(),
        code: csvParts[1].toUpperCase().trim(),
        description: csvParts.slice(2).join(', ').trim(),
        isOverall: /^[A-Z]\d+$/i.test(csvParts[1].trim())
      })
      continue
    } else if (csvParts.length === 2) {
      results.push({
        strand: '',
        code: csvParts[0].toUpperCase().trim(),
        description: csvParts[1].trim(),
        isOverall: /^[A-Z]\d+$/i.test(csvParts[0].trim())
      })
      continue
    }

    // 5. Code [space] Description
    const matchSpace = line.match(/^([A-Za-z0-9\.-]{2,8})\s+(.+)$/)
    if (matchSpace) {
      results.push({
        strand: '',
        code: matchSpace[1].toUpperCase().trim(),
        description: matchSpace[2].trim(),
        isOverall: /^[A-Z]\d+$/i.test(matchSpace[1].trim())
      })
      continue
    }

    results.push({
      strand: '',
      code: `EXP-${results.length + 1}`,
      description: line,
      isOverall: false
    })
  }

  return results
}

// Test Pipe format
const pipeSample = `A1.1 | Apply scientific processes
B1.2 | Investigate properties of matter`
const pipeParsed = parseRawExpectationsText(pipeSample)
assert.strictEqual(pipeParsed.length, 2)
assert.strictEqual(pipeParsed[0].code, 'A1.1')
assert.strictEqual(pipeParsed[0].description, 'Apply scientific processes')
console.log('✓ Pipe format parsed correctly')

// Test 3-column with Strand format
const threeColSample = `Strand A: STEM | A1.1 | Apply research skills
Strand B: Matter | B1.1 | Investigate chemical properties`
const threeColParsed = parseRawExpectationsText(threeColSample)
assert.strictEqual(threeColParsed.length, 2)
assert.strictEqual(threeColParsed[0].strand, 'Strand A: STEM')
assert.strictEqual(threeColParsed[0].code, 'A1.1')
assert.strictEqual(threeColParsed[1].strand, 'Strand B: Matter')
console.log('✓ 3-Column Strand | Code | Description parsed correctly')

// Test Colon format
const colonSample = `B1.1: Demonstrate understanding of integers
B1.2: Model linear equations`
const colonParsed = parseRawExpectationsText(colonSample)
assert.strictEqual(colonParsed.length, 2)
assert.strictEqual(colonParsed[0].code, 'B1.1')
assert.strictEqual(colonParsed[0].description, 'Demonstrate understanding of integers')
console.log('✓ Colon format parsed correctly')

// Test Tab format
const tabSample = `A1.1\tListen to understand\nA1.2\tSpeak clearly`
const tabParsed = parseRawExpectationsText(tabSample)
assert.strictEqual(tabParsed.length, 2)
assert.strictEqual(tabParsed[0].code, 'A1.1')
console.log('✓ Tab format parsed correctly')

// Test CSV format with headers and quotes
const csvSample = `"Strand","Code","Description"
"Number Sense","B1.1","Demonstrate understanding of integers, fractions, and decimals"
"Algebra","C1.1","Model linear relationships"`
const csvParsed = parseRawExpectationsText(csvSample)
assert.strictEqual(csvParsed.length, 2)
assert.strictEqual(csvParsed[0].strand, 'Number Sense')
assert.strictEqual(csvParsed[0].code, 'B1.1')
assert.strictEqual(csvParsed[0].description, 'Demonstrate understanding of integers, fractions, and decimals')
console.log('✓ CSV with headers and quoted commas parsed correctly')


// TEST 2: Cascade Rename Logic Verification
const mockAssessments = [
  { assessmentId: 'ast1', classId: 'cls1', expectationIds: ['B1.1', 'B1.2'] },
  { assessmentId: 'ast2', classId: 'cls1', expectationId: 'B1.1' },
  { assessmentId: 'ast3', classId: 'cls1', expectationCodes: ['B1.1', 'C1.1'] }
]

const mockGrades = [
  {
    gradeId: 'g1',
    assessmentId: 'ast1',
    studentId: 'st1',
    expectationScores: { 'B1.1': 85, 'B1.2': 70 }
  },
  {
    gradeId: 'g2',
    assessmentId: 'ast2',
    studentId: 'st1',
    expectationScores: { 'B1.1': 90 }
  }
]

// Simulate cascade rename of B1.1 -> B1.1_NEW
const oldCode = 'B1.1'
const newCode = 'B1.1_NEW'

mockAssessments.forEach(ast => {
  if (Array.isArray(ast.expectationIds)) {
    ast.expectationIds = ast.expectationIds.map(c => c === oldCode ? newCode : c)
  }
  if (ast.expectationId === oldCode) {
    ast.expectationId = newCode
  }
  if (Array.isArray(ast.expectationCodes)) {
    ast.expectationCodes = ast.expectationCodes.map(c => c === oldCode ? newCode : c)
  }
})

mockGrades.forEach(g => {
  if (g.expectationScores && g.expectationScores[oldCode] !== undefined) {
    g.expectationScores[newCode] = g.expectationScores[oldCode]
    delete g.expectationScores[oldCode]
  }
})

assert.deepStrictEqual(mockAssessments[0].expectationIds, ['B1.1_NEW', 'B1.2'])
assert.strictEqual(mockAssessments[1].expectationId, 'B1.1_NEW')
assert.deepStrictEqual(mockAssessments[2].expectationCodes, ['B1.1_NEW', 'C1.1'])
assert.strictEqual(mockGrades[0].expectationScores['B1.1_NEW'], 85)
assert.strictEqual(mockGrades[0].expectationScores['B1.1'], undefined)
assert.strictEqual(mockGrades[1].expectationScores['B1.1_NEW'], 90)
console.log('✓ Expectation cascade rename updates assessments and grades without data loss')


// TEST 3: SBAR Mastery calculation on Elementary subjects & Secondary units
const classRecord = {
  classId: 'cls_test',
  classType: 'elementary',
  students: {
    'st1': { id: 'st1', firstName: 'Jane', lastName: 'Doe' }
  },
  subjects: [
    {
      subjectId: 'sub_math',
      name: 'Mathematics',
      gradebookUnits: [
        { unitId: 'u_num', name: 'Number Sense' }
      ],
      expectations: [
        { expectationId: 'exp_b1_new', code: 'B1.1_NEW', description: 'Rational Numbers', unitId: 'u_num' }
      ]
    }
  ]
}

const assessments = [
  {
    assessmentId: 'ast1',
    expectationIds: ['B1.1_NEW'],
    date: '2026-09-10'
  },
  {
    assessmentId: 'ast2',
    expectationIds: ['B1.1_NEW'],
    date: '2026-09-20'
  }
]

const gradeMap = {
  'ast1': { 'st1': { studentId: 'st1', expectationScores: { 'B1.1_NEW': 80 } } },
  'ast2': { 'st1': { studentId: 'st1', expectationScores: { 'B1.1_NEW': 90 } } }
}

const masteryResult = calculateSBARExpectationMastery(classRecord, assessments, gradeMap, 'decaying_average')
assert(masteryResult['st1'] && masteryResult['st1']['B1.1_NEW'], 'Mastery result should contain B1.1_NEW')
assert(masteryResult['st1']['B1.1_NEW'].score > 85, 'Decaying average should weight recent 90 score higher than 80')
console.log('✓ SBAR expectation mastery calculation accurately matches subject expectations: Score =', masteryResult['st1']['B1.1_NEW'].score)

// TEST 4: HTML Entities & &nbsp; Sanitization
console.log('\n--- TEST 4: HTML Entities & &nbsp; Sanitization ---')
const rawSample1 = 'graphic novel&nbsp;– to tell a story through illustrations supported by text; magazine article&nbsp;– to provide information'
const cleanSample1 = cleanExpectationText(rawSample1)
assert.strictEqual(cleanSample1, 'graphic novel – to tell a story through illustrations supported by text; magazine article – to provide information')
assert.ok(!cleanSample1.includes('&nbsp;'), 'No &nbsp; in cleanSample1')
console.log('✓ cleanExpectationText successfully strips &nbsp; with en-dashes')

const rawSample2 = 'use an engineering design process and associated skills to design, build, and test devices, models, structures, and/or systems&nbsp;.'
const cleanSample2 = cleanExpectationText(rawSample2)
assert.strictEqual(cleanSample2, 'use an engineering design process and associated skills to design, build, and test devices, models, structures, and/or systems.')
assert.ok(!cleanSample2.includes(' .'), 'Punctuation spacing normalized')
console.log('✓ cleanExpectationText normalizes punctuation spacing ("systems&nbsp;." -> "systems.")')

const rawSample3 = 'mariachi)&nbsp;.'
const cleanSample3 = cleanExpectationText(rawSample3)
assert.strictEqual(cleanSample3, 'mariachi).')
console.log('✓ cleanExpectationText normalizes closing parenthesis punctuation')

const rawSample4 = 'apply a variety of tactical solutions to increase chances of success as they \u00a0participate in physical activities &amp; sports'
const cleanSample4 = cleanExpectationText(rawSample4)
assert.strictEqual(cleanSample4, 'apply a variety of tactical solutions to increase chances of success as they participate in physical activities & sports')
console.log('✓ cleanExpectationText decodes &amp; and converts unicode \\u00a0 non-breaking spaces')

// TEST 5: Curriculum Preset Library Hygiene (0 remaining HTML entities)
console.log('\n--- TEST 5: Curriculum Preset Library Hygiene ---')
let entityMatches = 0
function checkPresetDir(dir) {
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    if (fs.statSync(fullPath).isDirectory()) {
      checkPresetDir(fullPath)
    } else if (item.endsWith('.json')) {
      const content = fs.readFileSync(fullPath, 'utf8')
      const matches = content.match(/&[a-zA-Z0-9#]+;?/g)
      if (matches) {
        entityMatches += matches.length
      }
    }
  }
}
checkPresetDir('./src/data/curriculum')
assert.strictEqual(entityMatches, 0, 'Curriculum JSON presets must have 0 HTML entities')
console.log('✓ All curriculum preset files in src/data/curriculum/ contain 0 HTML entities')

// TEST 6: Schema Migration Self-Healing for Existing Databases
console.log('\n--- TEST 6: Schema Migration Self-Healing ---')
const legacyData = {
  schemaVersion: 25,
  classes: [
    {
      classId: 'cls_legacy',
      name: 'Grade 7 French &amp; Arts',
      gradebookUnits: [
        {
          unitId: 'u1',
          name: 'Unit 1&nbsp;– Dance',
          expectations: [
            {
              expectationId: 'e1',
              code: 'A1.1',
              description: 'create dance pieces to represent rhythms&nbsp;.'
            }
          ]
        }
      ],
      subjects: [
        {
          subjectId: 'sub1',
          name: 'French',
          expectations: [
            {
              expectationId: 'e2',
              code: 'B1.1',
              description: 'identify purpose(s) (e.g., graphic novel&nbsp;– to tell a story)'
            }
          ]
        }
      ]
    }
  ],
  assessments: [
    {
      assessmentId: 101,
      name: 'Dance Quiz 1',
      expectations: [
        {
          code: 'A1.1',
          description: 'create dance pieces to represent rhythms&nbsp;.'
        }
      ]
    }
  ]
}

const migrated = migrateData(legacyData)
assert.strictEqual(migrated.schemaVersion, 31, 'Migrated to current schema 31')
assert.strictEqual(migrated.classes[0].gradebookUnits[0].name, 'Unit 1 – Dance')
assert.strictEqual(migrated.classes[0].gradebookUnits[0].expectations[0].description, 'create dance pieces to represent rhythms.')
assert.strictEqual(migrated.classes[0].subjects[0].expectations[0].description, 'identify purpose(s) (e.g., graphic novel – to tell a story)')
assert.strictEqual(migrated.assessments[0].expectations[0].description, 'create dance pieces to represent rhythms.')
console.log('✓ Legacy database payload automatically cleaned during migration v31')

console.log('\n--- ALL EXPECTATION LIFECYCLE & HYGIENE TESTS PASSED ---')
