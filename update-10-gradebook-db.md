# Update 10 — Gradebook DB Migration & Service Layer (V4)

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/db/index.js` — confirm DB_VERSION is `10`
- `src/db/classService.js` — confirm `studentObj` structure and class record shape
- `src/db/settingsService.js` — confirm settings singleton structure

Do not make any changes until you have confirmed all three files match expectations.

---

## What This Update Does

Adds the complete V4 Gradebook data layer:
- DB migration to version 11
- Two new IDB object stores: `assessments` and `grades`
- Updates to `classes` and `settings` stores
- New `gradebookService.js` service file
- New `useGradebook.js` composable skeleton

No UI changes in this update. Pure data layer only.

---

## Step 1 — Database Migration (`src/db/index.js`)

Bump `DB_VERSION` to `11`.

### New object stores

Create two new object stores in the `onupgradeneeded` handler:

```js
if (!db.objectStoreNames.contains('assessments')) {
  const assessmentStore = db.createObjectStore('assessments', { 
    keyPath: 'assessmentId', 
    autoIncrement: true 
  })
  assessmentStore.createIndex('by_classId', 'classId')
  assessmentStore.createIndex('by_categoryId', 'categoryId')
  assessmentStore.createIndex('by_date', 'date')
}

if (!db.objectStoreNames.contains('grades')) {
  const gradeStore = db.createObjectStore('grades', { 
    keyPath: 'gradeId', 
    autoIncrement: true 
  })
  gradeStore.createIndex('by_assessmentId', 'assessmentId')
  gradeStore.createIndex('by_studentId', 'studentId')
  gradeStore.createIndex('by_assessmentAndStudent', ['assessmentId', 'studentId'], { unique: true })
}
```

### Migration block `oldVersion < 11`

```js
if (oldVersion < 11) {
  // Update all class records
  const tx11 = db.transaction('classes', 'readwrite')
  const allClasses = await tx11.objectStore('classes').getAll()
  for (const cls of allClasses) {
    // Add gradebook fields to class record
    if (cls.gradingMethod === undefined) cls.gradingMethod = 'traditional'
    if (cls.gradebookCategories === undefined) cls.gradebookCategories = []
    if (cls.gradebookMilestones === undefined) cls.gradebookMilestones = []
    if (cls.gradebookNotes === undefined) cls.gradebookNotes = ''

    // Add categoryOverrides to each student
    for (const studentId of Object.keys(cls.students)) {
      if (cls.students[studentId].categoryOverrides === undefined) {
        cls.students[studentId].categoryOverrides = {}
      }
    }
    await tx11.objectStore('classes').put(cls)
  }
  await tx11.done

  // Update settings singleton
  const tx11s = db.transaction('settings', 'readwrite')
  const settings = await tx11s.objectStore('settings').get('singleton')
  if (settings) {
    if (settings.gradebookTemplates === undefined) {
      settings.gradebookTemplates = []
    }
    await tx11s.objectStore('settings').put(settings)
  }
  await tx11s.done
}
```

### Update fresh install seed (`oldVersion === 0`)

Add to the class seed:
```js
gradingMethod: 'traditional',
gradebookCategories: [],
gradebookMilestones: [],
gradebookNotes: ''
```

Add to each student in the seed:
```js
categoryOverrides: {}
```

Add to the settings seed:
```js
gradebookTemplates: []
```

---

## Step 2 — Create `src/db/gradebookService.js`

Create a new service file. This is the ONLY file that reads/writes `assessments` and `grades` stores directly.

```js
import { getDB } from './index.js'
import { hasUnsyncedChanges } from './eventService.js'
import { v4 as uuidv4 } from 'uuid'
```

**Note:** If `uuid` is not installed, use `crypto.randomUUID()` instead — it is available in all modern browsers.

### Assessment CRUD

```js
// Create a new assessment
export async function createAssessment({
  classId, categoryId, name, date,
  assessmentType = 'other',
  unit = '',
  totalPoints,
  scaledTotal = null,
  excluded = false,
  retestPolicy = 'highest'
}) {
  const db = await getDB()
  const assessment = {
    classId, categoryId, name, date,
    assessmentType, unit,
    totalPoints, scaledTotal,
    excluded, retestPolicy,
    createdAt: new Date().toISOString()
  }
  const id = await db.add('assessments', assessment)
  hasUnsyncedChanges.value = true
  return { ...assessment, assessmentId: id }
}

// Get all assessments for a class
export async function getAssessmentsByClass(classId) {
  const db = await getDB()
  return await db.getAllFromIndex('assessments', 'by_classId', classId)
}

// Update an assessment
export async function updateAssessment(assessmentId, updates) {
  const db = await getDB()
  const assessment = await db.get('assessments', assessmentId)
  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`)
  Object.assign(assessment, updates)
  await db.put('assessments', assessment)
  hasUnsyncedChanges.value = true
  return assessment
}

// Delete an assessment and all its grades
export async function deleteAssessment(assessmentId) {
  const db = await getDB()
  // Delete all grades for this assessment first
  const grades = await db.getAllFromIndex('grades', 'by_assessmentId', assessmentId)
  const tx = db.transaction(['assessments', 'grades'], 'readwrite')
  for (const grade of grades) {
    await tx.objectStore('grades').delete(grade.gradeId)
  }
  await tx.objectStore('assessments').delete(assessmentId)
  await tx.done
  hasUnsyncedChanges.value = true
}
```

### Grade CRUD

```js
// Get or create a grade record for a student/assessment pair
export async function getOrCreateGrade(assessmentId, studentId) {
  const db = await getDB()
  const existing = await db.getFromIndex('grades', 'by_assessmentAndStudent', [assessmentId, studentId])
  if (existing) return existing

  const grade = {
    assessmentId,
    studentId,
    missing: false,
    excluded: false,
    attempts: []
  }
  const id = await db.add('grades', grade)
  return { ...grade, gradeId: id }
}

// Add an attempt to a grade
export async function addAttempt(assessmentId, studentId, { pointsEarned, date, comment = '' }) {
  const db = await getDB()
  const grade = await getOrCreateGrade(assessmentId, studentId)
  const attempt = {
    attemptId: crypto.randomUUID(),
    pointsEarned,
    date: date || new Date().toISOString(),
    comment
  }
  grade.attempts.push(attempt)
  await db.put('grades', grade)
  hasUnsyncedChanges.value = true
  return grade
}

// Update grade flags (missing, excluded)
export async function updateGradeFlags(assessmentId, studentId, flags) {
  const db = await getDB()
  const grade = await getOrCreateGrade(assessmentId, studentId)
  Object.assign(grade, flags)
  await db.put('grades', grade)
  hasUnsyncedChanges.value = true
  return grade
}

// Get all grades for a class (all students, all assessments)
export async function getGradesByClass(classId) {
  const db = await getDB()
  const assessments = await getAssessmentsByClass(classId)
  const assessmentIds = assessments.map(a => a.assessmentId)
  const allGrades = []
  for (const assessmentId of assessmentIds) {
    const grades = await db.getAllFromIndex('grades', 'by_assessmentId', assessmentId)
    allGrades.push(...grades)
  }
  return allGrades
}

// Get all grades for a specific student across all assessments in a class
export async function getGradesByStudent(studentId, classId) {
  const db = await getDB()
  const assessments = await getAssessmentsByClass(classId)
  const assessmentIds = new Set(assessments.map(a => a.assessmentId))
  const allGrades = await db.getAllFromIndex('grades', 'by_studentId', studentId)
  return allGrades.filter(g => assessmentIds.has(g.assessmentId))
}
```

### Grade calculation

```js
// Resolve which attempt counts based on retestPolicy
export function resolveAttemptScore(attempts, retestPolicy) {
  if (!attempts || attempts.length === 0) return null
  const valid = attempts.filter(a => a.pointsEarned != null)
  if (valid.length === 0) return null

  switch (retestPolicy) {
    case 'highest':
      return Math.max(...valid.map(a => a.pointsEarned))
    case 'latest':
      return valid[valid.length - 1].pointsEarned
    case 'average':
      return valid.reduce((sum, a) => sum + a.pointsEarned, 0) / valid.length
    case 'manual':
      const primary = valid.find(a => a.isPrimary)
      return primary ? primary.pointsEarned : valid[valid.length - 1].pointsEarned
    default:
      return Math.max(...valid.map(a => a.pointsEarned))
  }
}

// Calculate a student's grade for a class
// asOf: optional date string — only count assessments on or before this date
export async function calculateStudentGrade(studentId, classRecord, { asOf = null } = {}) {
  const db = await getDB()
  const assessments = await getAssessmentsByClass(classRecord.classId)
  const grades = await getGradesByStudent(studentId, classRecord.classId)
  const gradeMap = {}
  for (const g of grades) gradeMap[g.assessmentId] = g

  const categories = classRecord.gradebookCategories
  if (!categories || categories.length === 0) return null

  // Validate weights sum to 100
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0)

  const categoryResults = {}

  for (const category of categories) {
    // Filter assessments for this category
    let catAssessments = assessments.filter(a =>
      a.categoryId === category.categoryId &&
      !a.excluded
    )

    // Apply asOf date filter if provided
    if (asOf) {
      catAssessments = catAssessments.filter(a => a.date <= asOf)
    }

    if (catAssessments.length === 0) {
      categoryResults[category.categoryId] = null
      continue
    }

    let totalEarned = 0
    let totalPossible = 0

    for (const assessment of catAssessments) {
      const grade = gradeMap[assessment.assessmentId]
      if (!grade || grade.excluded) continue
      if (grade.missing) {
        // Missing counts as 0
        const possible = assessment.scaledTotal ?? assessment.totalPoints
        totalPossible += possible
        // totalEarned += 0
        continue
      }
      if (!grade.attempts || grade.attempts.length === 0) continue // not entered yet

      const earned = resolveAttemptScore(grade.attempts, assessment.retestPolicy)
      if (earned === null) continue

      const possible = assessment.scaledTotal ?? assessment.totalPoints
      const scaledEarned = assessment.scaledTotal
        ? (earned / assessment.totalPoints) * assessment.scaledTotal
        : earned

      totalEarned += scaledEarned
      totalPossible += possible
    }

    if (totalPossible === 0) {
      categoryResults[category.categoryId] = null
      continue
    }

    // Check for manual category override on this student
    const override = classRecord.students[studentId]?.categoryOverrides?.[category.categoryId]
    if (override !== undefined && override !== null) {
      categoryResults[category.categoryId] = {
        percentage: override.overridePercentage,
        isOverridden: true,
        overrideNote: override.note
      }
    } else {
      categoryResults[category.categoryId] = {
        percentage: (totalEarned / totalPossible) * 100,
        isOverridden: false
      }
    }
  }

  // Calculate weighted final grade
  let weightedSum = 0
  let weightUsed = 0

  for (const category of categories) {
    const result = categoryResults[category.categoryId]
    if (result === null) continue
    weightedSum += result.percentage * (category.weight / 100)
    weightUsed += category.weight
  }

  const overallGrade = weightUsed === 0 ? null : (weightedSum / weightUsed) * 100

  return {
    overallGrade: overallGrade !== null ? Math.round(overallGrade * 10) / 10 : null,
    categoryResults,
    weightUsed,
    asOf
  }
}

// Calculate grades for all students in a class
export async function calculateClassGrades(classRecord, { asOf = null } = {}) {
  const results = {}
  for (const studentId of Object.keys(classRecord.students)) {
    results[studentId] = await calculateStudentGrade(studentId, classRecord, { asOf })
  }
  return results
}

// Calculate class statistics for a specific assessment
export function calculateAssessmentStats(assessmentId, grades, assessment) {
  const scores = grades
    .filter(g => g.assessmentId === assessmentId && !g.excluded && !g.missing && g.attempts.length > 0)
    .map(g => {
      const earned = resolveAttemptScore(g.attempts, assessment.retestPolicy)
      return earned !== null ? (earned / assessment.totalPoints) * 100 : null
    })
    .filter(s => s !== null)

  if (scores.length === 0) return null

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const sorted = [...scores].sort((a, b) => a - b)

  return {
    count: scores.length,
    average: Math.round(avg * 10) / 10,
    highest: Math.round(sorted[sorted.length - 1] * 10) / 10,
    lowest: Math.round(sorted[0] * 10) / 10,
    median: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10
  }
}
```

### Template management

```js
// Get gradebook templates from settings
export async function getGradebookTemplates() {
  const db = await getDB()
  const settings = await db.get('settings', 'singleton')
  return settings?.gradebookTemplates ?? []
}

// Save a new template from a class's current categories and milestones
export async function saveGradebookTemplate(name, classRecord) {
  const db = await getDB()
  const settings = await db.get('settings', 'singleton')
  const template = {
    templateId: crypto.randomUUID(),
    name,
    categories: classRecord.gradebookCategories.map(c => ({ ...c, categoryId: crypto.randomUUID() })),
    milestones: classRecord.gradebookMilestones.map(m => ({ ...m, milestoneId: crypto.randomUUID() }))
  }
  settings.gradebookTemplates.push(template)
  await db.put('settings', settings)
  return template
}

// Delete a template
export async function deleteGradebookTemplate(templateId) {
  const db = await getDB()
  const settings = await db.get('settings', 'singleton')
  settings.gradebookTemplates = settings.gradebookTemplates.filter(t => t.templateId !== templateId)
  await db.put('settings', settings)
}
```

---

## Step 3 — Create `src/composables/useGradebook.js`

Create a skeleton composable. This will be expanded in later updates as UI is built.

```js
import { ref, computed } from 'vue'
import * as gradebookService from '@/db/gradebookService.js'

// Reactive state
export const activeClassRecord = ref(null)
export const assessments = ref([])
export const grades = ref([])
export const classGrades = ref({})
export const selectedStudentId = ref(null)
export const selectedMilestone = ref(null) // null = current

// Load all gradebook data for a class
export async function loadGradebook(classRecord) {
  activeClassRecord.value = classRecord
  assessments.value = await gradebookService.getAssessmentsByClass(classRecord.classId)
  grades.value = await gradebookService.getGradesByClass(classRecord.classId)
  await refreshGrades()
}

// Recalculate all grades
export async function refreshGrades() {
  if (!activeClassRecord.value) return
  const asOf = selectedMilestone.value
    ? activeClassRecord.value.gradebookMilestones.find(m => m.milestoneId === selectedMilestone.value)?.date
    : null
  classGrades.value = await gradebookService.calculateClassGrades(activeClassRecord.value, { asOf })
}

// Add a new assessment
export async function addAssessment(assessmentData) {
  const assessment = await gradebookService.createAssessment({
    classId: activeClassRecord.value.classId,
    ...assessmentData
  })
  assessments.value.push(assessment)
  return assessment
}

// Enter a grade for a student
export async function enterGrade(assessmentId, studentId, pointsEarned, comment = '') {
  await gradebookService.addAttempt(assessmentId, studentId, {
    pointsEarned,
    date: new Date().toISOString(),
    comment
  })
  grades.value = await gradebookService.getGradesByClass(activeClassRecord.value.classId)
  await refreshGrades()
}

// Mark a grade as missing
export async function markMissing(assessmentId, studentId, missing) {
  await gradebookService.updateGradeFlags(assessmentId, studentId, { missing })
  grades.value = await gradebookService.getGradesByClass(activeClassRecord.value.classId)
  await refreshGrades()
}

// Mark a grade as excluded
export async function markExcluded(assessmentId, studentId, excluded) {
  await gradebookService.updateGradeFlags(assessmentId, studentId, { excluded })
  grades.value = await gradebookService.getGradesByClass(activeClassRecord.value.classId)
  await refreshGrades()
}

// Computed: grade map for quick lookup [assessmentId][studentId]
export const gradeMap = computed(() => {
  const map = {}
  for (const grade of grades.value) {
    if (!map[grade.assessmentId]) map[grade.assessmentId] = {}
    map[grade.assessmentId][grade.studentId] = grade
  }
  return map
})

// Computed: assessment stats
export const assessmentStats = computed(() => {
  const stats = {}
  for (const assessment of assessments.value) {
    stats[assessment.assessmentId] = gradebookService.calculateAssessmentStats(
      assessment.assessmentId,
      grades.value,
      assessment
    )
  }
  return stats
})
```

---

## Step 4 — Update backup/restore in `eventService.js`

The existing `exportAllData` and `importAllData` functions need to include the new stores.

Read `src/db/eventService.js` and find the `exportAllData` function. Add `assessments` and `grades` to the export:

```js
const assessments = await db.getAll('assessments')
const grades = await db.getAll('grades')
// Include in the exported object
```

Similarly update `importAllData` to restore `assessments` and `grades` stores when present in the backup file. Use the same pattern as existing stores — clear then re-populate.

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors after DB migration to v11
- [ ] `src/db/index.js` DB_VERSION is `11`
- [ ] `assessments` and `grades` object stores exist in IndexedDB (verify in browser DevTools → Application → IndexedDB)
- [ ] All existing class records have `gradingMethod`, `gradebookCategories`, `gradebookMilestones`, `gradebookNotes` fields
- [ ] All existing student objects have `categoryOverrides: {}` field
- [ ] Settings singleton has `gradebookTemplates: []`
- [ ] `gradebookService.js` imports without errors
- [ ] `useGradebook.js` imports without errors
- [ ] Backup export includes `assessments` and `grades` arrays
- [ ] No existing functionality broken — Dashboard, Reports, Setup all work normally
- [ ] In browser console: `import { calculateStudentGrade } from './src/db/gradebookService.js'` resolves without error
