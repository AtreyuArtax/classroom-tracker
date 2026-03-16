# Update 16 — Analytics Data Layer (V5)

## Prerequisites

APP_STATE_V4.md must exist in the project root. DB_VERSION must be 14. Read it before starting.

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/db/index.js` — confirm DB_VERSION is 14
- `src/db/gradebookService.js` — understand existing calculation functions: `calculateStudentGrade`, `calculateMostConsistent`, `calculateWeightedMedian`, `getBucketMode`, `calculateMedian`, `resolveAttemptScore`
- `src/composables/useGradebook.js` — confirm existing exported functions and reactive state

Report your findings before writing a single line of code. Do not proceed until findings are confirmed.

---

## What This Update Does

Adds the complete analytics data layer. No UI changes. Pure calculation and service layer additions.

Specifically:
- DB migration to add `excludeFromAnalytics` flag to all student objects
- Standard deviation calculation
- Outlier detection (1.5 SD below mean)
- Per-assessment analytics (expanded stats: median, SD, distribution buckets, outlier-aware)
- Class-level analytics (overall class stats using Product assessments only)
- Conversation and Observation coverage metrics (count-based, not grade-based)
- All new functions exposed through `useGradebook.js`

---

## Step 1 — Database Migration (`src/db/index.js`)

Bump `DB_VERSION` to **15**.

### Migration block `oldVersion < 15`

Add `excludeFromAnalytics: false` to every student object in every class record:

```js
if (oldVersion < 15) {
  const tx15 = db.transaction('classes', 'readwrite')
  const allClasses = await tx15.objectStore('classes').getAll()
  for (const cls of allClasses) {
    for (const studentId of Object.keys(cls.students ?? {})) {
      if (cls.students[studentId].excludeFromAnalytics === undefined) {
        cls.students[studentId].excludeFromAnalytics = false
      }
    }
    const plain = JSON.parse(JSON.stringify(cls))
    await tx15.objectStore('classes').put(plain)
  }
  await tx15.done
}
```

### Update `createClass` in `useClassroom.js`

Add `excludeFromAnalytics: false` to the default student object shape when importing a roster.

### Verify before proceeding

Open DevTools → Application → IndexedDB → classes. Expand a student object and confirm `excludeFromAnalytics: false` is present.

---

## Step 2 — Core Statistical Functions (`src/db/gradebookService.js`)

Add the following functions. These are pure calculations — no IDB access.

### `calculateStandardDeviation(values)`

```js
export function calculateStandardDeviation(values) {
  if (!values || values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(avgSquaredDiff)
}
```

### `detectOutliers(values, threshold = 1.5)`

```js
export function detectOutliers(values, threshold = 1.5) {
  if (!values || values.length < 3) return { clean: values, outliers: [] }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = calculateStandardDeviation(values)
  if (sd === null || sd === 0) return { clean: values, outliers: [] }
  const cutoff = mean - (threshold * sd)
  const clean = values.filter(v => v >= cutoff)
  const outliers = values.filter(v => v < cutoff)
  return { clean, outliers, cutoff, mean, sd }
}
```

### `buildDistributionBuckets(percentages)`

Groups an array of percentage scores into 10% buckets for histogram rendering.

```js
export function buildDistributionBuckets(percentages) {
  const buckets = Array(10).fill(0).map((_, i) => ({
    label: `${i * 10}-${i * 10 + 9}%`,
    range: [i * 10, i * 10 + 9],
    count: 0,
    scores: []
  }))
  // Handle 100% edge case — goes in the last bucket
  for (const p of percentages) {
    const idx = p >= 100 ? 9 : Math.floor(p / 10)
    const safeIdx = Math.max(0, Math.min(9, idx))
    buckets[safeIdx].count++
    buckets[safeIdx].scores.push(p)
  }
  return buckets
}
```

---

## Step 3 — Per-Assessment Analytics (`src/db/gradebookService.js`)

Replace or extend the existing `calculateAssessmentStats` function. The new version returns a richer object.

### `calculateAssessmentAnalytics(assessmentId, grades, assessment, options)`

```js
// options: { excludeOutliers: boolean, excludedStudentIds: Set<string> }
export function calculateAssessmentAnalytics(assessmentId, grades, assessment, options = {}) {
  const { excludeOutliers = false, excludedStudentIds = new Set() } = options

  // Only run analytics on Product assessments
  if (assessment.assessmentType !== 'product') return null
  // Skip individual assessments
  if (assessment.target === 'individual') return null

  // Collect all valid scores
  const allScores = grades
    .filter(g =>
      g.assessmentId === assessmentId &&
      !g.excluded &&
      !g.missing &&
      g.attempts &&
      g.attempts.length > 0 &&
      !excludedStudentIds.has(g.studentId)
    )
    .map(g => {
      const earned = resolveAttemptScore(g.attempts, assessment.retestPolicy)
      if (earned === null) return null
      return {
        studentId: g.studentId,
        percentage: (earned / assessment.totalPoints) * 100
      }
    })
    .filter(s => s !== null)

  if (allScores.length === 0) return null

  const allPercentages = allScores.map(s => s.percentage)

  // Outlier detection
  const outlierResult = detectOutliers(allPercentages)
  const activePercentages = excludeOutliers ? outlierResult.clean : allPercentages
  const outlierStudentIds = excludeOutliers
    ? allScores
        .filter(s => outlierResult.outliers.includes(s.percentage))
        .map(s => s.studentId)
    : []

  if (activePercentages.length === 0) return null

  // Core stats on active (possibly filtered) set
  const mean = activePercentages.reduce((a, b) => a + b, 0) / activePercentages.length
  const sd = calculateStandardDeviation(activePercentages)
  const median = calculateMedian(activePercentages)
  const sorted = [...activePercentages].sort((a, b) => a - b)
  const highest = sorted[sorted.length - 1]
  const lowest = sorted[0]

  // Distribution buckets on full unfiltered set (always show full picture)
  const distributionBuckets = buildDistributionBuckets(allPercentages)

  return {
    assessmentId,
    count: activePercentages.length,
    totalCount: allPercentages.length,
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    sd: sd !== null ? Math.round(sd * 10) / 10 : null,
    highest: Math.round(highest * 10) / 10,
    lowest: Math.round(lowest * 10) / 10,
    distributionBuckets,
    outlierCount: outlierResult.outliers.length,
    outlierStudentIds,
    excludeOutliersActive: excludeOutliers,
    // Calibration signal: low mean + high SD = poorly calibrated assessment
    calibrationFlag: mean < 60 && sd !== null && sd > 15 ? 'too_hard' :
                     mean > 95 && sd !== null && sd < 5 ? 'too_easy' : null
  }
}
```

---

## Step 4 — Class-Level Analytics (`src/db/gradebookService.js`)

### `calculateClassAnalytics(classRecord, assessments, grades, options)`

```js
// options: { excludeOutliers: boolean, asOf: string | null }
export async function calculateClassAnalytics(classRecord, assessments, grades, options = {}) {
  const { excludeOutliers = false, asOf = null } = options

  const studentIds = Object.keys(classRecord.students ?? {})
  const excludedStudentIds = new Set(
    studentIds.filter(id => classRecord.students[id].excludeFromAnalytics)
  )

  // Filter to Product, class-target assessments only
  let productAssessments = assessments.filter(a =>
    a.assessmentType === 'product' &&
    a.target === 'class' &&
    !a.excluded
  )

  // Apply asOf date filter if milestone selected
  if (asOf) {
    productAssessments = productAssessments.filter(a => a.date <= asOf)
  }

  // Build grade map for quick lookup
  const gradeMap = {}
  for (const g of grades) {
    if (!gradeMap[g.assessmentId]) gradeMap[g.assessmentId] = {}
    gradeMap[g.assessmentId][g.studentId] = g
  }

  // Calculate each student's overall grade using Product assessments only
  const studentGrades = []
  for (const studentId of studentIds) {
    if (excludedStudentIds.has(studentId)) continue

    // Temporarily filter classRecord categories to only Product assessments
    let totalEarned = 0
    let totalPossible = 0
    const categoryResults = {}

    for (const cat of classRecord.gradebookCategories) {
      const catAssessments = productAssessments.filter(a => a.categoryId === cat.categoryId)
      let catEarned = 0
      let catPossible = 0

      for (const a of catAssessments) {
        const grade = gradeMap[a.assessmentId]?.[studentId]
        if (!grade || grade.excluded || grade.missing) {
          if (grade?.missing) catPossible += a.scaledTotal ?? a.totalPoints
          continue
        }
        if (!grade.attempts || grade.attempts.length === 0) continue

        const earned = resolveAttemptScore(grade.attempts, a.retestPolicy)
        if (earned === null) continue

        const possible = a.scaledTotal ?? a.totalPoints
        const scaledEarned = a.scaledTotal
          ? (earned / a.totalPoints) * a.scaledTotal
          : earned

        catEarned += scaledEarned
        catPossible += possible
      }

      if (catPossible > 0) {
        categoryResults[cat.categoryId] = (catEarned / catPossible) * 100
      }
    }

    // Weighted rollup
    let weightedSum = 0
    let weightUsed = 0
    for (const cat of classRecord.gradebookCategories) {
      const catGrade = categoryResults[cat.categoryId]
      if (catGrade === undefined) continue
      weightedSum += catGrade * (cat.weight / 100)
      weightUsed += cat.weight
    }

    if (weightUsed > 0) {
      studentGrades.push({
        studentId,
        percentage: (weightedSum / weightUsed) * 100
      })
    }
  }

  if (studentGrades.length === 0) return null

  const allPercentages = studentGrades.map(s => s.percentage)

  // Apply outlier exclusion if toggled
  const outlierResult = detectOutliers(allPercentages)
  const activePercentages = excludeOutliers ? outlierResult.clean : allPercentages
  const outlierStudentIds = excludeOutliers
    ? studentGrades
        .filter(s => outlierResult.outliers.includes(s.percentage))
        .map(s => s.studentId)
    : []

  const mean = activePercentages.reduce((a, b) => a + b, 0) / activePercentages.length
  const sd = calculateStandardDeviation(activePercentages)
  const median = calculateMedian(activePercentages)
  const distributionBuckets = buildDistributionBuckets(allPercentages)

  // Per-assessment analytics
  const assessmentAnalytics = {}
  for (const a of productAssessments) {
    const stats = calculateAssessmentAnalytics(
      a.assessmentId, grades, a,
      { excludeOutliers, excludedStudentIds }
    )
    if (stats) assessmentAnalytics[a.assessmentId] = stats
  }

  // Conversation and Observation coverage
  // Count how many students have at least one entered Conversation/Observation
  const conversationStudents = new Set()
  const observationStudents = new Set()
  for (const a of assessments.filter(a => a.target === 'class' && !a.excluded)) {
    const aGrades = grades.filter(g =>
      g.assessmentId === a.assessmentId &&
      g.attempts &&
      g.attempts.length > 0
    )
    for (const g of aGrades) {
      if (a.assessmentType === 'conversation') conversationStudents.add(g.studentId)
      if (a.assessmentType === 'observation') observationStudents.add(g.studentId)
    }
  }

  const totalStudents = studentIds.length
  const conversationCoverage = {
    studentsWithEvidence: conversationStudents.size,
    totalStudents,
    percentage: totalStudents > 0
      ? Math.round((conversationStudents.size / totalStudents) * 100)
      : 0
  }
  const observationCoverage = {
    studentsWithEvidence: observationStudents.size,
    totalStudents,
    percentage: totalStudents > 0
      ? Math.round((observationStudents.size / totalStudents) * 100)
      : 0
  }

  return {
    // Class-level stats (Product assessments only)
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    sd: sd !== null ? Math.round(sd * 10) / 10 : null,
    distributionBuckets,
    studentCount: activePercentages.length,
    totalStudentCount: allPercentages.length,
    outlierCount: outlierResult.outliers.length,
    outlierStudentIds,
    excludeOutliersActive: excludeOutliers,

    // Per-assessment breakdown
    assessmentAnalytics,

    // Triangulation coverage
    conversationCoverage,
    observationCoverage,

    // Milestone context
    asOf
  }
}
```

---

## Step 5 — Toggle `excludeFromAnalytics` (`src/db/classService.js`)

Add a dedicated function for toggling a student's analytics exclusion:

```js
export async function toggleStudentAnalyticsExclusion(classId, studentId) {
  const db = await getDB()
  const cls = await db.get('classes', classId)
  if (!cls || !cls.students[studentId]) throw new Error('Student not found')
  cls.students[studentId].excludeFromAnalytics = !cls.students[studentId].excludeFromAnalytics
  const plain = JSON.parse(JSON.stringify(cls))
  await db.put('classes', plain)
  hasUnsyncedChanges.value = true
  return cls.students[studentId].excludeFromAnalytics
}
```

---

## Step 6 — Expose through `useGradebook.js`

Add the following to `src/composables/useGradebook.js`:

```js
import {
  calculateClassAnalytics,
  calculateAssessmentAnalytics,
  calculateStandardDeviation,
  detectOutliers,
  buildDistributionBuckets
} from '@/db/gradebookService.js'
import { toggleStudentAnalyticsExclusion } from '@/db/classService.js'

// Reactive state for analytics
export const analyticsMode = ref(false) // false = grid, true = analytics panel
export const excludeOutliers = ref(false) // analytics-only display toggle, not persisted
export const classAnalytics = ref(null) // result of calculateClassAnalytics

// Compute class analytics
export async function refreshClassAnalytics() {
  if (!activeClassRecord.value) return
  const asOf = selectedMilestone.value
    ? activeClassRecord.value.gradebookMilestones
        .find(m => m.milestoneId === selectedMilestone.value)?.date
    : null

  classAnalytics.value = await calculateClassAnalytics(
    activeClassRecord.value,
    assessments.value,
    grades.value,
    { excludeOutliers: excludeOutliers.value, asOf }
  )
}

// Toggle outlier exclusion — recomputes analytics immediately
export async function toggleOutlierExclusion() {
  excludeOutliers.value = !excludeOutliers.value
  await refreshClassAnalytics()
}

// Toggle a student's analytics exclusion — persists to IDB
export async function toggleStudentFromAnalytics(studentId) {
  if (!activeClassRecord.value) return
  await toggleStudentAnalyticsExclusion(activeClassRecord.value.classId, studentId)
  // Reload class record to pick up the change
  const updated = await classService.getClass(activeClassRecord.value.classId)
  activeClassRecord.value = updated
  await refreshClassAnalytics()
}

// Reset analytics state when leaving the analytics panel
export function resetAnalyticsState() {
  excludeOutliers.value = false
  classAnalytics.value = null
  analyticsMode.value = false
}
```

Also call `refreshClassAnalytics()` at the end of `refreshGrades()` when `analyticsMode.value === true` so analytics stay in sync when grades are updated.

---

## Step 7 — Console Verification

After implementation, open the browser console and verify calculations manually:

```js
// Get the db instance and verify
const request = indexedDB.open('classroomTrackerDB', 15)
request.onsuccess = e => {
  const db = e.target.result
  const tx = db.transaction('classes', 'readonly')
  tx.objectStore('classes').getAll().onsuccess = e => {
    const cls = e.target.result[0]
    const firstStudent = Object.values(cls.students)[0]
    console.log('excludeFromAnalytics:', firstStudent.excludeFromAnalytics)
  }
}
```

Expected output: `excludeFromAnalytics: false`

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] DB_VERSION is 15 in DevTools
- [ ] All existing student objects have `excludeFromAnalytics: false`
- [ ] `calculateStandardDeviation([70, 80, 90])` returns approximately `8.2` in console
- [ ] `detectOutliers([90, 88, 85, 82, 40])` correctly identifies `40` as outlier (1.5 SD below mean)
- [ ] `buildDistributionBuckets([45, 72, 78, 82, 88])` returns correct bucket counts
- [ ] `calculateAssessmentAnalytics` returns null for Conversation and Observation type assessments
- [ ] `calculateAssessmentAnalytics` returns null for individual target assessments
- [ ] `calculateClassAnalytics` returns correct mean, median, SD for a class with entered grades
- [ ] `conversationCoverage` correctly counts students with at least one conversation entered
- [ ] `excludeFromAnalytics` toggle on a student correctly excludes them from class analytics recalculation
- [ ] No existing functionality broken — Dashboard, Reports, Grades grid all work normally
- [ ] Backup export still works correctly
