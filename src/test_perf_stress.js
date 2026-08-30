import assert from 'assert'
import { performance } from 'perf_hooks'
import { calculateStudentGrade } from './db/gradebook/gradeCalc.js'
import { calculateClassAnalytics } from './db/gradebook/gradeAnalytics.js'
import {
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  calculateDecayingAverage,
  calculatePowerLaw,
  calculateMode
} from './db/gradebook/gradeCalcSBAR.js'
import { migrateData, CURRENT_SCHEMA } from './db/migrations.js'

console.log('=================================================================')
console.log('⚡ HIGH-VOLUME PERFORMANCE & STRESS BENCHMARK SUITE')
console.log('=================================================================')

const benchmarkResults = []

function logBenchmark(name, elapsedMs, budgetMs, itemsCount = null, unit = 'items') {
  const passed = elapsedMs <= budgetMs
  const throughput = itemsCount ? ` (${Math.round((itemsCount / (elapsedMs / 1000))).toLocaleString()} ${unit}/sec)` : ''
  const status = passed ? '✓ PASS' : '✗ FAIL (Exceeded budget)'
  console.log(`  ${passed ? '✓' : '✗'} ${name}: ${elapsedMs.toFixed(2)}ms [Budget: <${budgetMs}ms]${throughput}`)
  benchmarkResults.push({ name, elapsedMs, budgetMs, passed })
  assert.ok(passed, `${name} exceeded performance budget: ${elapsedMs.toFixed(2)}ms > ${budgetMs}ms`)
}

// =============================================================================
// BENCHMARK 1: Mega-Roster Traditional Gradebook (500 Students × 100 Assessments)
// Total Data Points: 50,000 Grades across 5 Weighted Categories
// =============================================================================
console.log('\n--- Benchmark 1: Mega-Roster Traditional Gradebook (500 Students × 100 Assessments = 50k Grades) ---')

const NUM_STUDENTS = 500
const NUM_ASSESSMENTS = 100

// 1. Generate 500 Students
const mockStudents = {}
for (let i = 1; i <= NUM_STUDENTS; i++) {
  const sId = `st_${i}`
  mockStudents[sId] = {
    id: sId,
    studentId: sId,
    firstName: `Student${i}`,
    lastName: `Cohort${Math.ceil(i / 30)}`,
    studentNumber: `${100000 + i}`,
    archived: false,
    excludeFromAnalytics: i % 50 === 0 // 2% excluded from analytics
  }
}

const mockClass = {
  classId: 'cls_mega_trad',
  name: 'Mega Grade 12 Physics (500 Students)',
  schoolYear: '2025-26',
  semester: '2',
  gradingFramework: 'traditional',
  gradebookCategories: [
    { categoryId: 'cat_k', name: 'Knowledge', weight: 25 },
    { categoryId: 'cat_t', name: 'Thinking', weight: 20 },
    { categoryId: 'cat_c', name: 'Communication', weight: 15 },
    { categoryId: 'cat_a', name: 'Application', weight: 20 },
    { categoryId: 'cat_exam', name: 'Final Exam', weight: 20 }
  ],
  students: mockStudents
}

// 2. Generate 100 Assessments across the 5 categories
const categoryIds = ['cat_k', 'cat_t', 'cat_c', 'cat_a', 'cat_exam']
const evidenceTypes = ['product', 'product', 'product', 'observation', 'conversation'] // 60% products, 20% obs, 20% conv
const mockAssessments = []

for (let a = 1; a <= NUM_ASSESSMENTS; a++) {
  const catId = categoryIds[a % categoryIds.length]
  const evType = evidenceTypes[a % evidenceTypes.length]
  mockAssessments.push({
    assessmentId: `ast_${a}`,
    classId: 'cls_mega_trad',
    name: `Assessment ${a} (${catId})`,
    categoryId: catId,
    totalPoints: (a % 4 === 0) ? 50 : (a % 4 === 1 ? 40 : (a % 4 === 2 ? 30 : 20)),
    weight: 1,
    assessmentType: evType,
    purpose: (a % 10 === 0) ? 'formative' : 'summative',
    date: `2026-0${Math.min(9, Math.ceil(a / 12))}-${String((a % 28) + 1).padStart(2, '0')}`
  })
}

// 3. Generate 50,000 Grades with realistic grade distributions & retest attempts
const mockGrades = []
const studentGradeMap = new Map()

for (let i = 1; i <= NUM_STUDENTS; i++) {
  const sId = `st_${i}`
  const sGrades = []
  
  // Deterministic performance band for student (Gaussian-like spread 40% - 98%)
  const baseAbility = 40 + ((i * 17) % 58) 

  for (let a = 1; a <= NUM_ASSESSMENTS; a++) {
    const ast = mockAssessments[a - 1]
    
    // 5% missing, 3% excused
    const isMissing = ((i * a) % 37 === 0)
    const isExcused = !isMissing && ((i * a) % 71 === 0)
    
    // Score variance ±8 around base ability
    const variance = ((i * 7 + a * 13) % 17) - 8
    const rawPct = Math.max(0, Math.min(100, baseAbility + variance))
    const score = Math.round((rawPct / 100) * ast.totalPoints * 10) / 10

    const gradeEntry = {
      gradeId: `grd_${i}_${a}`,
      classId: 'cls_mega_trad',
      studentId: sId,
      assessmentId: ast.assessmentId,
      score: isMissing ? null : (isExcused ? null : score),
      resolvedScore: isMissing ? 0 : (isExcused ? null : score),
      missing: isMissing,
      excluded: isExcused,
      attempts: (a % 5 === 0 && !isMissing && !isExcused) ? [
        { score: Math.max(0, score - 4), date: ast.date },
        { score: score, date: '2026-05-01' }
      ] : []
    }
    mockGrades.push(gradeEntry)
    sGrades.push(gradeEntry)
  }
  studentGradeMap.set(sId, sGrades)
}

// Benchmark 1.1: Calculate All 500 Student Grades in Batch
const settingsMock = { capGradesAt100: true }
const t0 = performance.now()

const computedClassGrades = {}
for (let i = 1; i <= NUM_STUDENTS; i++) {
  const sId = `st_${i}`
  const sGrades = studentGradeMap.get(sId) || []
  computedClassGrades[sId] = await calculateStudentGrade(sId, mockClass, {
    assessmentsPreRef: mockAssessments,
    gradesPreRef: sGrades,
    settingsPreRef: settingsMock
  })
}
const elapsedBatchGrades = performance.now() - t0

assert.strictEqual(Object.keys(computedClassGrades).length, 500, '500 student grades calculated')
assert.ok(typeof computedClassGrades['st_1'].overallGrade === 'number', 'Student 1 overallGrade is valid number')
assert.ok(computedClassGrades['st_1'].overallGrade >= 0 && computedClassGrades['st_1'].overallGrade <= 100, 'Grade within 0-100%')

logBenchmark('500 Students × 100 Assessments (50,000 Grades)', elapsedBatchGrades, 100, 50000, 'grades')

// =============================================================================
// BENCHMARK 2: High-Density Statistical Analytics Engine
// Profiles Mean, Median, SD, Quartiles, Outlier IQR, Hotspots, & Category Breakdowns
// =============================================================================
console.log('\n--- Benchmark 2: High-Density Statistical Analytics Engine ---')

// Benchmark 2.1: Class Analytics with "All Evidence"
const t1 = performance.now()
const analyticsAll = await calculateClassAnalytics(mockClass, mockAssessments, mockGrades, {
  settings: settingsMock,
  evidenceScope: 'all'
})
const elapsedAnalyticsAll = performance.now() - t1

assert.ok(analyticsAll.mean > 0 && analyticsAll.mean < 100, 'Mean computed successfully')
assert.ok(analyticsAll.median > 0 && analyticsAll.median < 100, 'Median computed successfully')
assert.ok(analyticsAll.sd > 0, 'Standard deviation (sd) computed')
assert.strictEqual(analyticsAll.evidenceScope, 'all', 'Evidence scope recorded as all')
assert.ok(analyticsAll.categoryBreakdowns.length > 0, 'Category breakdowns computed')

logBenchmark('Class Analytics (All Evidence: 50k Grades)', elapsedAnalyticsAll, 75, 50000, 'grades')

// Benchmark 2.2: Class Analytics with "Products Only"
const t2 = performance.now()
const analyticsProduct = await calculateClassAnalytics(mockClass, mockAssessments, mockGrades, {
  settings: settingsMock,
  evidenceScope: 'product'
})
const elapsedAnalyticsProduct = performance.now() - t2

assert.ok(analyticsProduct.mean > 0, 'Product mean computed')
assert.strictEqual(analyticsProduct.evidenceScope, 'product', 'Evidence scope recorded as product')
logBenchmark('Class Analytics (Products Only: 30k Grades)', elapsedAnalyticsProduct, 50, 30000, 'grades')

// =============================================================================
// BENCHMARK 3: SBAR Multi-Expectation Deep Matrix (200 Students × 30 Expectations)
// 120,000 Total Evaluation Points across Decaying Average, Power Law, Mode
// =============================================================================
console.log('\n--- Benchmark 3: SBAR Multi-Expectation Deep Matrix (200 Students × 30 Expectations) ---')

const SBAR_STUDENTS = 200
const SBAR_EXPECTATIONS = 30
const SBAR_ASSESSMENTS = 20

// 1. Generate SBAR Units & Expectations
const sbarUnits = []
const allExpectationCodes = []
for (let u = 1; u <= 5; u++) {
  const unitExpectations = []
  for (let e = 1; e <= 6; e++) {
    const code = `SC.U${u}.${e}`
    allExpectationCodes.push(code)
    unitExpectations.push({
      expectationId: `exp_${u}_${e}`,
      code,
      description: `Expectation ${code} Description`
    })
  }
  sbarUnits.push({
    unitId: `unit_${u}`,
    name: `Unit ${u}: Strand ${u}`,
    expectations: unitExpectations
  })
}

// 2. Generate SBAR Class
const sbarStudents = {}
for (let i = 1; i <= SBAR_STUDENTS; i++) {
  const sId = `st_sbar_${i}`
  sbarStudents[sId] = {
    id: sId,
    studentId: sId,
    firstName: `SbarStudent${i}`,
    lastName: `Candidate`,
    archived: false
  }
}

const mockSbarClass = {
  classId: 'cls_sbar_stress',
  name: 'Grade 9 Science SBAR (200 Students)',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  gradebookUnits: sbarUnits,
  students: sbarStudents
}

// 3. Generate 20 SBAR Assessments each targeting 4 expectations
const mockSbarAssessments = []
for (let a = 1; a <= SBAR_ASSESSMENTS; a++) {
  // Select 4 rotating expectations
  const expCodes = [
    allExpectationCodes[(a * 3) % allExpectationCodes.length],
    allExpectationCodes[(a * 3 + 1) % allExpectationCodes.length],
    allExpectationCodes[(a * 3 + 2) % allExpectationCodes.length],
    allExpectationCodes[(a * 3 + 3) % allExpectationCodes.length]
  ]
  mockSbarAssessments.push({
    assessmentId: `ast_sbar_${a}`,
    classId: 'cls_sbar_stress',
    name: `SBAR Task ${a}`,
    purpose: (a % 4 === 0) ? 'formative' : 'summative',
    date: `2026-0${Math.min(9, Math.ceil(a / 3))}-${String((a % 28) + 1).padStart(2, '0')}`,
    expectationIds: expCodes,
    assessmentType: (a % 3 === 0) ? 'observation' : 'product'
  })
}

// 4. Generate SBAR Grades (200 students × 20 assessments = 4,000 grade objects with 16,000 score evaluations)
const mockSbarGrades = []
const sbarStudentGradeMap = new Map()

for (let i = 1; i <= SBAR_STUDENTS; i++) {
  const sId = `st_sbar_${i}`
  const sGrades = []
  const baseAbility = 50 + ((i * 13) % 45)

  for (let a = 1; a <= SBAR_ASSESSMENTS; a++) {
    const ast = mockSbarAssessments[a - 1]
    const expectationScores = {}

    ast.expectationIds.forEach(code => {
      const growthTrend = (a * 1.5) // simulated learning curve
      const score = Math.max(30, Math.min(100, Math.round(baseAbility + growthTrend + ((i + a) % 7) - 3)))
      expectationScores[code] = score
    })

    const gradeEntry = {
      gradeId: `grd_sbar_${i}_${a}`,
      classId: 'cls_sbar_stress',
      studentId: sId,
      assessmentId: ast.assessmentId,
      expectationScores
    }
    mockSbarGrades.push(gradeEntry)
    sGrades.push(gradeEntry)
  }
  sbarStudentGradeMap.set(sId, sGrades)
}

// Build SBAR grade map for matrix calculations
const sbarGradeMap = {}
for (const g of mockSbarGrades) {
  if (!sbarGradeMap[g.assessmentId]) sbarGradeMap[g.assessmentId] = {}
  sbarGradeMap[g.assessmentId][g.studentId] = g
}

// Benchmark 3.1: Decaying Average Matrix Calculation across 200 Students × 30 Expectations
const t3 = performance.now()
const masteryMapDecaying = calculateSBARExpectationMastery(mockSbarClass, mockSbarAssessments, sbarGradeMap, 'decaying_average')
const sbarOverallScores = {}
for (let i = 1; i <= SBAR_STUDENTS; i++) {
  const sId = `st_sbar_${i}`
  sbarOverallScores[sId] = calculateSBARStudentOverallMastery(sId, mockSbarClass, mockSbarAssessments, sbarGradeMap, 'decaying_average', [], masteryMapDecaying)
}
const elapsedSbarDecaying = performance.now() - t3

assert.strictEqual(Object.keys(masteryMapDecaying).length, 200, '200 student SBAR masteries computed')
assert.ok(sbarOverallScores['st_sbar_1'] > 0, 'SBAR overall score computed')
logBenchmark('SBAR Decaying Average (200 Students × 30 Expectations)', elapsedSbarDecaying, 150, 200 * 30, 'evaluations')

// Benchmark 3.2: Power Law Marzano Trajectory Matrix
const t4 = performance.now()
const masteryMapPowerLaw = calculateSBARExpectationMastery(mockSbarClass, mockSbarAssessments, sbarGradeMap, 'power_law')
const elapsedSbarPowerLaw = performance.now() - t4
assert.strictEqual(Object.keys(masteryMapPowerLaw).length, 200, '200 student Power Law masteries computed')
logBenchmark('SBAR Power Law Trajectory (200 Students × 30 Expectations)', elapsedSbarPowerLaw, 150, 200 * 30, 'evaluations')

// Benchmark 3.3: Mode / Most Frequent Matrix
const t5 = performance.now()
const masteryMapMode = calculateSBARExpectationMastery(mockSbarClass, mockSbarAssessments, sbarGradeMap, 'mode')
const elapsedSbarMode = performance.now() - t5
assert.strictEqual(Object.keys(masteryMapMode).length, 200, '200 student Mode masteries computed')
logBenchmark('SBAR Mode Model (200 Students × 30 Expectations)', elapsedSbarMode, 150, 200 * 30, 'evaluations')

// =============================================================================
// BENCHMARK 4: Real-Time Grid Keystroke / Single-Cell Reactive Latency
// Measures single student recalculation latency (simulating rapid grading entries)
// =============================================================================
console.log('\n--- Benchmark 4: Real-Time Grid Keystroke / Single-Cell Reactive Latency ---')

const NUM_RAPID_EDITS = 500
const student1Grades = studentGradeMap.get('st_1') || []

const t6 = performance.now()
for (let edit = 1; edit <= NUM_RAPID_EDITS; edit++) {
  // Simulate modifying single grade in memory
  student1Grades[0].resolvedScore = (edit % 100)
  student1Grades[0].score = (edit % 100)
  
  // Recalculate single student's grade (what Vue computed does on cell blur/keystroke)
  await calculateStudentGrade('st_1', mockClass, {
    assessmentsPreRef: mockAssessments,
    gradesPreRef: student1Grades,
    settingsPreRef: settingsMock
  })
}
const elapsedRapidEdits = performance.now() - t6
const avgLatencyPerEditMs = elapsedRapidEdits / NUM_RAPID_EDITS

assert.ok(avgLatencyPerEditMs < 0.5, `Single cell edit latency under 0.5ms (got ${avgLatencyPerEditMs.toFixed(4)}ms)`)
logBenchmark(`500 Sequential Cell Edits (Avg: ${(avgLatencyPerEditMs * 1000).toFixed(1)}µs/keystroke)`, elapsedRapidEdits, 100, NUM_RAPID_EDITS, 'edits')

// =============================================================================
// BENCHMARK 5: High-Volume Attendance & Event Aggregation (10,000 Events)
// =============================================================================
console.log('\n--- Benchmark 5: High-Volume Attendance & Event Aggregation (10,000 Events) ---')

const NUM_EVENTS = 10000
const eventCodes = ['a', 'l', 'ea', 'w', 'pc', 'ob', 'hw']
const mockEvents = []

for (let e = 1; e <= NUM_EVENTS; e++) {
  const sId = `st_${(e % 100) + 1}`
  const code = eventCodes[e % eventCodes.length]
  mockEvents.push({
    eventId: `evt_${e}`,
    classId: 'cls_mega_trad',
    studentId: sId,
    code,
    timestamp: `2026-0${Math.min(9, Math.ceil(e / 1200))}-${String((e % 28) + 1).padStart(2, '0')}T09:15:00.000Z`,
    durationMinutes: code === 'w' ? ((e % 12) + 2) : null,
    note: code === 'pc' ? 'Contacted guardian regarding attendance' : (code === 'ob' ? 'Demonstrated strong lab leadership' : null)
  })
}

// Benchmark 5.1: Profile Attendance Rates & Washroom Totals
const t7 = performance.now()
const studentAttendanceInsights = {}

for (let i = 1; i <= 100; i++) {
  const sId = `st_${i}`
  studentAttendanceInsights[sId] = {
    absences: 0,
    lates: 0,
    washroomTrips: 0,
    washroomTotalMins: 0,
    parentContacts: 0
  }
}

for (const evt of mockEvents) {
  const insight = studentAttendanceInsights[evt.studentId]
  if (!insight) continue

  if (evt.code === 'a') insight.absences++
  else if (evt.code === 'l') insight.lates++
  else if (evt.code === 'w') {
    insight.washroomTrips++
    insight.washroomTotalMins += (evt.durationMinutes || 0)
  } else if (evt.code === 'pc') {
    insight.parentContacts++
  }
}
const elapsedEvents = performance.now() - t7

assert.ok(studentAttendanceInsights['st_1'].washroomTrips > 0, 'Washroom trips counted')
assert.ok(studentAttendanceInsights['st_1'].absences > 0, 'Absences counted')
logBenchmark('10,000 Attendance & Behavior Events Aggregation', elapsedEvents, 30, NUM_EVENTS, 'events')

// =============================================================================
// BENCHMARK 6: Massive Dataset JSON Serialization & Deserialization
// =============================================================================
console.log('\n--- Benchmark 6: Massive Dataset JSON Serialization & Deserialization ---')

const megaBackupPayload = {
  schemaVersion: CURRENT_SCHEMA,
  exportedAt: new Date().toISOString(),
  settings: mockClass,
  classes: [mockClass, mockSbarClass],
  assessments: [...mockAssessments, ...mockSbarAssessments],
  grades: [...mockGrades, ...mockSbarGrades],
  events: mockEvents,
  learning_skills: [],
  photos: []
}

// 1. Serialization
const t8 = performance.now()
const serializedMegaJson = JSON.stringify(megaBackupPayload)
const elapsedSerialization = performance.now() - t8
const payloadSizeBytes = Buffer.byteLength(serializedMegaJson, 'utf8')
const payloadSizeMb = (payloadSizeBytes / (1024 * 1024)).toFixed(2)

logBenchmark(`Full Backup JSON Serialization (${payloadSizeMb} MB payload)`, elapsedSerialization, 150)

// 2. Deserialization & Schema Migration
const t9 = performance.now()
const parsedPayload = JSON.parse(serializedMegaJson)
const migratedPayload = migrateData(parsedPayload)
const elapsedDeserialization = performance.now() - t9

assert.strictEqual(migratedPayload.schemaVersion, CURRENT_SCHEMA, 'Schema version valid after migration')
assert.strictEqual(migratedPayload.grades.length, 54000, '54,000 total grades deserialized')
assert.strictEqual(migratedPayload.events.length, 10000, '10,000 events deserialized')

logBenchmark(`Full Backup JSON Deserialization & Migration (${payloadSizeMb} MB)`, elapsedDeserialization, 200)

// =============================================================================
// BENCHMARK 7: Memory Footprint & Garbage Collection Stability
// =============================================================================
console.log('\n--- Benchmark 7: Memory Footprint & Heap Allocation ---')

const memoryUsage = process.memoryUsage()
const heapUsedMb = (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2)
const heapTotalMb = (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2)
const rssMb = (memoryUsage.rss / (1024 * 1024)).toFixed(2)

console.log(`  Heap Used:  ${heapUsedMb} MB`)
console.log(`  Heap Total: ${heapTotalMb} MB`)
console.log(`  RSS Memory: ${rssMb} MB`)
assert.ok(memoryUsage.heapUsed < 400 * 1024 * 1024, 'Heap memory remains safely under 400MB threshold under massive stress load')
console.log('  ✓ Memory footprint is lean and stable under massive stress load')

// =============================================================================
// SUMMARY REPORT
// =============================================================================
console.log('\n=================================================================')
console.log('📊 PERFORMANCE BENCHMARK SUMMARY REPORT')
console.log('=================================================================')
benchmarkResults.forEach(r => {
  const pctOfBudget = Math.round((r.elapsedMs / r.budgetMs) * 100)
  console.log(`  ${r.passed ? '⚡ PASS' : '❌ FAIL'} | ${r.name.padEnd(65)} | ${r.elapsedMs.toFixed(2).padStart(7)}ms / ${r.budgetMs}ms (${pctOfBudget}%)`)
})

console.log('\n🎉 ALL PERFORMANCE BENCHMARKS PASSED WELL WITHIN STRICT BUDGETS!')
console.log('=================================================================\n')
