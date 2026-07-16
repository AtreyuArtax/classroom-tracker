# Elementary Mode — Architectural Analysis & Implementation Plan

## Executive Summary

The codebase is a **Vue 3 SPA** (no router, no server) with a clean separation:
`views/` → `composables/` → `db/services/` → IndexedDB (via `idb` wrapper).

The good news: the architecture is modular enough that the Strategy Pattern you've
described can be applied without a rewrite. The key insight is that **`gradebookCategories`
is the single pivot point** — nearly every mode-specific behaviour (inputs, calculations,
display) fans out from this array stored on each class record.

---

## 1. Data Schema

### 1a. The `Class` Record (stored in IDB `classes` store, keyed by `classId`)

This is the most important record — it owns the gradebook configuration.

```js
// Inferred from classService.js L642-659 & index.js migrations
{
  classId: 'class_1720000000_0',   // string ID
  name: 'Grade 10 Science',
  courseCode: 'SNC2D',             // v25
  periodNumber: 1,
  periodStartTime: '08:00',
  year: '2025-2026',
  semester: '1',
  gridSize: { rows: 6, cols: 6 },
  gradebookUnits: [                // lightweight tags (v12, v19)
    { unitId: 'uuid', name: 'Unit 1: Cells', order: 0 }
  ],
  gradebookCategories: [           // ← THE PIVOT for Secondary mode
    { categoryId: 'uuid', name: 'Assessments',   weight: 60 },
    { categoryId: 'uuid', name: 'Activities',    weight: 10 },
    { categoryId: 'uuid', name: 'Culminating',   weight: 15 },
    { categoryId: 'uuid', name: 'Final Exam',    weight: 15 }
  ],
  students: {
    'STU001': {                    // keyed by studentId string
      firstName: 'Jane',
      lastName:  'Doe',
      seat: { row: 0, col: 2 },   // null = roster pool
      generalNote: '',
      gradebookNote: '',           // v11
      parentContacts: [],
      studentEmail: '',
      custody: '',
      livingWith: '',
      birthDate: '',
      rfidTag: '',
      activeStates: { isOut: false, outTime: null, isAbsent: false, lateMs: null },
      excludeFromAnalytics: false, // v15
      archived: false,             // v24
      categoryOverrides: {},       // manual override per categoryId → { overridePercentage }
      adjustedGrade: null          // manual overall grade override
    }
  }
}
```

### 1b. The `Assessment` Record (IDB `assessments` store)

```js
// gradebookService.js L21-44
{
  assessmentId: 7,                 // autoincrement
  classId: 'class_1720000000_0',
  categoryId: 'uuid',              // ← FK to gradebookCategories — SECONDARY PIVOT
  name: 'Unit 1 Test',
  description: '',
  date: '2025-10-15',
  assessmentType: 'product',       // 'product' | 'conversation' | 'observation'
  unitId: 'uuid',                  // tag, nullable
  target: 'class',                 // 'class' | 'individual'
  targetStudentId: null,
  totalPoints: 40,
  scaledTotal: null,               // optional scaling
  excluded: false,
  retestPolicy: 'highest',         // 'highest'|'latest'|'average'|'manual' (v26)
  createdAt: '2025-10-01T12:00:00.000Z'
}
```

### 1c. The `Grade` Record (IDB `grades` store)

```js
// gradebookService.js L123-133
{
  gradeId: 42,                     // autoincrement
  assessmentId: 7,                 // FK → assessments
  studentId: 'STU001',
  classId: 'class_1720000000_0',   // v16 — for by_classId index performance
  missing: false,
  excluded: false,
  attempts: [                      // array of scored attempts
    {
      attemptId: 'uuid',
      pointsEarned: 33,
      date: '2025-10-15T14:00:00.000Z',
      isPrimary: true,
      comment: ''
    }
  ]
}
```

### 1d. Field Classification: Shared vs. Mode-Specific

| Field | Shared? | Notes |
|---|---|---|
| `classId`, `name`, `periodNumber`, `year`, `semester` | ✅ Shared | Pure metadata |
| `students` map (names, seat, contacts, states) | ✅ Shared | 100% reusable |
| `gradebookUnits` | ✅ Shared | Can serve as strand grouping tags in elementary mode |
| `gradebookCategories[].categoryId`, `.name` | ✅ Shared | Field reused |
| `gradebookCategories[].weight` | ❌ Secondary only | Meaningless in elementary |
| `assessmentType` (product/conversation/observation) | ✅ Shared | Maps to Growing Success evidence types |
| `totalPoints` / `scaledTotal` | ❌ Secondary only | Elementary uses Levels (1-4), not points |
| `retestPolicy` | ✅ Shared | "Most Recent" maps to `latest` |
| `attempts[].pointsEarned` | ⚠️ Reuse carefully | In elementary, store Level as a number: 1, 1.5, 2, 2.5, 3, 3.5, 4 |
| `categoryOverrides` / `adjustedGrade` | ✅ Shared | Can store strand-level overrides |

### 1e. New Fields Needed for Elementary Mode (on class record)

```js
// New field on the class record:
{
  mode: 'secondary',   // 'secondary' | 'elementary'  ← NEW (default: 'secondary')
  
  // For elementary classes, gradebookCategories becomes "strands":
  gradebookCategories: [
    { categoryId: 'uuid', name: 'Number',       weight: 0 },  // weight ignored
    { categoryId: 'uuid', name: 'Algebra',      weight: 0 },
    { categoryId: 'uuid', name: 'Spatial Sense', weight: 0 },
    { categoryId: 'uuid', name: 'Data Literacy', weight: 0 },
    { categoryId: 'uuid', name: 'Financial Literacy', weight: 0 }
  ]
}
```

> **Key Insight:** By storing `mode` **on the class record itself** (not just in localStorage), 
> each class is self-describing. A teacher could theoretically have a secondary class and an 
> elementary class simultaneously — future-proofing the design.

---

## 2. The Storage Layer

### 2a. Current Storage Architecture

The app uses **a single IndexedDB database**: `classroomTrackerDB` (v27).

```
IndexedDB: classroomTrackerDB
├── settings       (key: 'singleton')
├── classes        (keyPath: classId, indexes: by_year, by_semester)
├── events         (autoincrement, indexes: by_studentId, by_classId, ...)
├── assessments    (autoincrement, indexes: by_classId, by_categoryId, by_date)
└── grades         (autoincrement, indexes: by_assessmentId, by_studentId,
                    by_classId, by_assessmentAndStudent [unique composite])
```

**There is no localStorage used for data** — only (potentially) for ephemeral UI state. The app is 100% IndexedDB-driven for persistence.

### 2b. How to Implement the Mode Toggle

The `localStorage` toggle you described is the right call for the **global app_mode** setting. However, the stronger pattern is to store `mode` per-class (see §1e above), with `localStorage` only driving the **UI default** for new class creation.

```js
// src/utils/appMode.js  (NEW FILE)
export const APP_MODE_KEY = 'app_mode'

export function getAppMode() {
  return localStorage.getItem(APP_MODE_KEY) ?? 'secondary'
}

export function setAppMode(mode) {
  localStorage.setItem(APP_MODE_KEY, mode)
}

// Vue composable wrapper for reactivity
import { ref, watchEffect } from 'vue'
export const appMode = ref(getAppMode())
watchEffect(() => localStorage.setItem(APP_MODE_KEY, appMode.value))
```

### 2c. Data Isolation Strategy

**You do NOT need separate IDB databases or separate localStorage keys for data.** The data is already naturally isolated by `classId`. The key is that each class record carries its own `mode` field:

- Secondary classes: `mode: 'secondary'`, categories have `weight > 0`, assessments use `totalPoints`.
- Elementary classes: `mode: 'elementary'`, categories are strands, assessments use `totalPoints = 4` (representing the level scale).

**The only thing the localStorage toggle affects is:**
1. Which default categories are pre-filled when creating a new class.
2. Which UI variant (secondary grid vs. elementary grid) is rendered.

> [!IMPORTANT]
> **Zero risk of data corruption.** Secondary class data is NEVER read or written by the 
> elementary engine — they operate on entirely separate class records. The IDB schema 
> doesn't need any changes beyond adding the `mode` field (a v28 migration that defaults 
> all existing records to `'secondary'`).

---

## 3. The Calculation Engine

### 3a. Where the Math Lives

The calculation engine is entirely inside **[gradebookService.js](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebookService.js)** (1,345 lines). The call chain is:

```
useGradebook.js::refreshGrades()
  └─ gradebookService.js::calculateClassGrades(classRecord, { asOf })
       └─ gradebookService.js::calculateStudentGrade(studentId, classRecord, opts)
            ├─ _calculateCategoryGrade(catAssessments, gradeMap)   ← weighted avg per category
            ├─ calculateMostConsistent(...)                         ← bucket-mode algorithm
            └─ calculateWeightedMedian(...)                         ← median per category
```

**Key functions to understand for the Strategy Pattern:**

| Function | Location | What it does |
|---|---|---|
| `calculateStudentGrade()` | [L729](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebookService.js#L729) | Top-level per-student grade, returns `{ overallGrade, categoryResults, mostConsistent, median }` |
| `_calculateCategoryGrade()` | [L507](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebookService.js#L507) | Weighted average for one category (points-based) |
| `calculateMostConsistent()` | [L613](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebookService.js#L613) | Bucket-mode algorithm across categories |
| `calculateWeightedMedian()` | [L682](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebookService.js#L682) | Median per category, weighted rollup |
| `resolveAttemptScore()` | [L459](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebookService.js#L459) | Applies retest policy to select the counting score |
| `calculateClassGrades()` | [L826](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebookService.js#L826) | Batch calculates all students — calls `calculateStudentGrade` |

### 3b. How to Apply the Strategy Pattern

The cleanest approach is **a new `elementaryGradebookService.js`** that mirrors the interface of the relevant functions in `gradebookService.js`, plus a **dispatcher** in `useGradebook.js` that selects the engine based on `classRecord.mode`.

#### Elementary Calculation Semantics

For Ontario Growing Success / Grade 7-8:

```
// Instead of: weighted average (points / totalPoints * weight)
// We use:     "Most Consistent" Level per strand (already partially exists!)
//
// Strand Level = modal level from assessments in that strand (using 10% bucket logic already
//                in calculateMostConsistent — just needs to operate on 0-4 scale vs 0-100%)
//
// Overall = NO single computed %. Instead: a map of { [strandId]: level }
//           The "Most Recent" variant = resolveAttemptScore(..., 'latest')
```

The `calculateMostConsistent` function at [L613](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebookService.js#L613) already implements the *conceptual* equivalent. You essentially need a version that:
1. Operates on a 1–4 level scale instead of 0–100%.
2. Returns `{ strandResults: { [strandId]: { dominantLevel, recentLevel, count } } }` instead of a single `overallGrade`.

#### Implementation Pattern

```js
// src/db/elementaryGradebookService.js  (NEW FILE)

/**
 * Resolves a student's strand level using "Most Consistent" or "Most Recent" policy.
 * Levels are stored as pointsEarned (1, 1.5, 2, 2.5, 3, 3.5, 4, or with +/- as 0.5 offsets).
 */
export function calculateElementaryStudentGrade(studentId, classRecord, { asOf, levelPolicy = 'consistent' } = {}) {
  const strands = classRecord.gradebookCategories
  const strandResults = {}

  for (const strand of strands) {
    const strandAssessments = assessments.filter(a => a.categoryId === strand.categoryId && !a.excluded)
    // collect levels (pointsEarned from 1-4 scale)
    // apply levelPolicy: 'consistent' = modal level, 'recent' = latest attempt
    strandResults[strand.categoryId] = { dominantLevel, recentLevel, evidenceCount }
  }

  return {
    mode: 'elementary',
    strandResults,         // replaces: overallGrade + categoryResults
    overallGrade: null,    // not applicable — set to null to protect secondary grid
  }
}
```

```js
// src/composables/useGradebook.js — modify refreshGrades()
import { calculateClassGrades } from '../db/gradebookService.js'
import { calculateElementaryClassGrades } from '../db/elementaryGradebookService.js'

export async function refreshGrades() {
  if (!activeClassRecord.value) return
  const asOf = /* existing milestone logic */

  const isElementary = activeClassRecord.value.mode === 'elementary'
  
  classGrades.value = isElementary
    ? await calculateElementaryClassGrades(activeClassRecord.value, { asOf })
    : await calculateClassGrades(activeClassRecord.value, { asOf })
}
```

---

## 4. The UI Components

### 4a. Highly-Coupled Components (Must Be Refactored)

These components have **hard-coded assumptions** about secondary mode:

| Component | Coupling Level | Coupling Details |
|---|---|---|
| [AddAssessmentModal.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/dossier/AddAssessmentModal.vue) | 🔴 **High** | "Category" dropdown reads `gradebookCategories`; has `totalPoints` and `scaledTotal` fields; has `Retest Policy` — all secondary concepts |
| [Grades.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/views/Grades.vue) | 🔴 **High** | `formatCellGrade(score, totalPoints)`, `getCellStyle(sId, aId, totalPoints)`, `categoryWeightTotal` computed, the inline numeric input with `:max="a.totalPoints"` — all assume points-out-of-total |
| [Setup.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/views/Setup.vue) | 🟡 **Medium** | Category management UI shows "weight" fields; new class defaults seed secondary categories |
| [PrintGradesGridModal.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/PrintGradesGridModal.vue) | 🟡 **Medium** | Iterates `gradebookCategories` with secondary column headers |
| [ProgressReport.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/dossier/ProgressReport.vue) | 🟡 **Medium** | Reads category names; generates percentage-based report |
| [Student360.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/dossier/Student360.vue) | 🟡 **Medium** | Maps `gradebookCategories` to percentage breakdowns |
| [DossierCategoryGrid.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/dossier/DossierCategoryGrid.vue) | 🟡 **Medium** | Likely renders category-level percentages |
| [StudentSidebar.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/StudentSidebar.vue) | 🟢 **Low** | Shows `overallGrade` from `classGrades` — just needs null handling |

### 4b. Refactoring Strategy

**Do NOT add `v-if="isElementary"` guards scattered throughout** `Grades.vue` (5,400 lines) — it will become unmaintainable.

**Recommended approach: Slot-based sub-components + a mode prop**

#### Step 1: Create an `isElementaryMode` computed in `useGradebook.js`

```js
// src/composables/useGradebook.js
export const isElementaryMode = computed(() => 
  activeClassRecord.value?.mode === 'elementary'
)
```

#### Step 2: Refactor `AddAssessmentModal.vue` with conditional sections

The modal is small (231 lines) — add a conditional block:

```vue
<!-- AddAssessmentModal.vue -->
<!-- SECONDARY fields -->
<template v-if="!isElementaryMode">
  <div class="form-row">
    <div class="form-group">
      <label>Category</label>
      <select v-model="newAssessment.categoryId">...</select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Total Points</label>...</div>
    <div class="form-group"><label>Scaled Total</label>...</div>
  </div>
</template>

<!-- ELEMENTARY fields -->
<template v-else>
  <div class="form-group">
    <label>Strand</label>
    <select v-model="newAssessment.categoryId">
      <option v-for="strand in activeClassRecord.gradebookCategories" ...>
        {{ strand.name }}
      </option>
    </select>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label>Level</label>
      <select v-model.number="newAssessment.levelInput">
        <option value="1">Level 1</option>
        <option value="1.5">Level 1+</option>
        <option value="2">Level 2</option>
        <option value="2.5">Level 2+</option>
        <option value="3">Level 3</option>
        <option value="3.5">Level 3+</option>
        <option value="4">Level 4</option>
      </select>
    </div>
  </div>
</template>
```

> [!TIP]
> Store levels as `pointsEarned` (1.0–4.0) and `totalPoints = 4` in the assessment record. 
> This means the existing `grade.attempts[].pointsEarned` field works without schema change.
> The elementary engine just interprets the scale differently.

#### Step 3: Extract the grade grid cell rendering into a sub-component

Create `src/components/GradeCell.vue` with a `mode` prop:

```vue
<!-- src/components/GradeCell.vue -->
<script setup>
const props = defineProps({
  grade: Object,
  assessment: Object,
  mode: String  // 'secondary' | 'elementary'
})
</script>
<template>
  <!-- Secondary: shows "33/40" or "82.5%" -->
  <template v-if="mode === 'secondary'">
    <span>{{ formatCellGrade(grade.resolvedScore, assessment.totalPoints) }}</span>
  </template>
  <!-- Elementary: shows "L3" or "L3+" -->
  <template v-else>
    <span class="level-badge" :class="`level-badge--${Math.floor(grade.resolvedScore)}`">
      {{ formatLevel(grade.resolvedScore) }}
    </span>
  </template>
</template>
```

#### Step 4: Refactor `Grades.vue` "Overall" column for elementary

In elementary mode, the `Overall` column should become a **strand summary panel** instead of a single percentage. The cleanest approach is to conditionally render a different column header and cell:

```vue
<!-- In Grades.vue grid header -->
<th class="grades__th-overall">
  <span v-if="!isElementaryMode">Overall</span>
  <span v-else>Strand Summary</span>
</th>

<!-- In Grades.vue grid body cell -->
<td class="grades__td-overall" ...>
  <!-- Secondary: single percentage badge -->
  <span v-if="!isElementaryMode">{{ formatGrade(classGrades[student.studentId]?.overallGrade) }}</span>
  <!-- Elementary: level badges per strand -->
  <div v-else class="grades__strand-levels">
    <span 
      v-for="strand in activeClassRecord.gradebookCategories" 
      :key="strand.categoryId"
      class="grades__strand-badge"
    >
      {{ formatLevel(classGrades[student.studentId]?.strandResults?.[strand.categoryId]?.dominantLevel) }}
    </span>
  </div>
</td>
```

#### Step 5: Setup.vue — Mode-aware class creation

```js
// In useClassroom.js createClass()
const defaultCategories = appMode.value === 'elementary'
  ? [
      { categoryId: crypto.randomUUID(), name: 'Number',             weight: 0 },
      { categoryId: crypto.randomUUID(), name: 'Algebra',            weight: 0 },
      { categoryId: crypto.randomUUID(), name: 'Spatial Sense',      weight: 0 },
      { categoryId: crypto.randomUUID(), name: 'Data Literacy',      weight: 0 },
      { categoryId: crypto.randomUUID(), name: 'Financial Literacy',  weight: 0 },
    ]
  : [
      { categoryId: crypto.randomUUID(), name: 'Assessments',  weight: 60 },
      { categoryId: crypto.randomUUID(), name: 'Activities',   weight: 10 },
      { categoryId: crypto.randomUUID(), name: 'Culminating',  weight: 15 },
      { categoryId: crypto.randomUUID(), name: 'Final Exam',   weight: 15 },
    ]

const newCls = {
  ...
  mode: appMode.value,   // ← store mode on the class
  gradebookCategories: defaultCategories,
}
```

---

## 5. Step-by-Step Implementation Roadmap

### Phase 1 — Foundation (No visible changes to secondary users)

1. **[NEW]** `src/utils/appMode.js` — localStorage toggle composable.
2. **[MODIFY]** `src/db/index.js` — v28 migration: add `mode: 'secondary'` to all existing class records.
3. **[MODIFY]** `src/composables/useGradebook.js` — add `isElementaryMode` computed; add dispatcher in `refreshGrades()`.
4. **[MODIFY]** `src/composables/useClassroom.js` — pass `mode` field when creating classes; use mode-aware default categories.

### Phase 2 — Calculation Engine

5. **[NEW]** `src/db/elementaryGradebookService.js` — implement `calculateElementaryStudentGrade()`, `calculateElementaryClassGrades()`, `formatLevel()`.

### Phase 3 — UI Swaps

6. **[MODIFY]** `src/components/dossier/AddAssessmentModal.vue` — conditional `<template v-if>` blocks for secondary vs. elementary inputs.
7. **[NEW]** `src/components/GradeCell.vue` — extract cell rendering; use in `Grades.vue`.
8. **[MODIFY]** `src/views/Grades.vue` — update overall column header/cell; wire `GradeCell`; hide `categoryWeightTotal` warning in elementary mode.
9. **[MODIFY]** `src/views/Setup.vue` — mode toggle UI in header; hide "weight" fields in elementary mode; show Ontario strand presets.
10. **[MODIFY]** `src/App.vue` — add Settings Toggle button (top-right nav) that writes to `appMode`.

### Phase 4 — Print & Reports

11. **[MODIFY]** `src/components/PrintGradesGridModal.vue` — conditional headers (category % vs. strand levels).
12. **[MODIFY]** `src/components/dossier/ProgressReport.vue` — elementary variant showing strand levels instead of percentages.

---

## 6. Open Questions / Design Decisions

> [!IMPORTANT]
> **Q1: Per-class mode or global toggle?**
> The plan above stores `mode` on each class record. This means a teacher can have
> some secondary and some elementary classes at the same time. The localStorage toggle
> only sets the **default** for new class creation. Is this the desired behaviour?
> Alternatively, the toggle could force all classes to the same mode.

> [!IMPORTANT]
> **Q2: Level input — select or numeric?**
> Levels could be a `<select>` (1, 1-, 1+, 2, 2-, 2+ ...) or a direct input (1.5 = "1+").
> Ontario Growing Success uses +/- suffixes. Storing as 0.5 increments (1, 1.5, 2...) 
> preserves the numeric sorted ability. Agreed?

> [!IMPORTANT]
> **Q3: "Most Recent" vs "Most Consistent" — class-level default or per-assessment?**
> Currently `retestPolicy` is stored per assessment ('highest', 'latest', 'average', 
> 'manual'). Should elementary mode add a class-level default `levelPolicy` 
> ('consistent' | 'recent'), or should each assessment keep its own policy?

> [!WARNING]
> **Q4: What about the `PrintGradesGridModal` and `ProgressReport`?**
> These are used for formal reporting. In Ontario, Grade 7/8 provincial report cards 
> use strand-level descriptors (B = Level 3 etc.). Will you need to generate 
> Ontario-format report card output, or is a simple level-per-strand printout sufficient 
> for this phase?

> [!NOTE]
> **Q5: The `gradebookMilestones` (term snapshots) — needed for elementary?**
> Secondary mode uses milestones to freeze a grade snapshot at a point in time (e.g., 
> mid-term). This feature works the same way in elementary mode (the `asOf` date filter 
> in `calculateStudentGrade` is already mode-agnostic). No changes needed.
