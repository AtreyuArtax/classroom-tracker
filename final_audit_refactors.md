# Final Audit Pass & Refactor Recommendations

## Final Audit Pass — Status: ✅ CLEAN

After a full sweep of all service layers, composables, and views, **no additional bugs were found.** The system is fully hardened.

### Confirmed Clean
| Area | Status | Notes |
|---|---|---|
| All `getDB()` calls | ✅ | Confined to `src/db/` only — architecture boundary respected |
| `toMinutes` usage | ✅ | Centralized in `eventService.js`, correctly imported everywhere |
| `calculateClassGrades` call sites | ✅ | 3 call sites — all pass correct `classRecord` and handle `asOf` |
| Duplicate functions in `Reports.vue` | ✅ | `onDossierDelete` and `deleteEvent` serve two different panels, not duplicates |
| `gradeMap` key types | ✅ | `assessmentId` consistently normalized via `Number()`, `studentId` via `String()` |
| `superseded` event filtering | ✅ | All aggregate queries correctly exclude `!e.superseded` |

---

## Refactor Recommendations

These are prioritized by **impact / risk ratio** — high impact, low disruption first.

---

### 🔴 R1 — Split `Grades.vue` (5,057 lines) into focused components
**Impact: High | Risk: Medium | Est. effort: 3-4 sessions**

This is the single most important refactor. At 5,057 lines, `Grades.vue` contains the Grid View, Analytics Panel, Assessment Modal, Grade Popover, Column Context Menu, Copy Menu, Milestone Selector, and the print/export logic — all inside one file. This means:
- **Slow IDE performance** (parsing 5K line Vue SFC)
- **Hard to navigate and change** without breaking something
- **Impossible to test** individual panels in isolation

**Suggested split:**

```
src/views/grades/
  GradesView.vue           ← shell: tab switching, class loading only (~150 lines)
  
src/components/grades/
  GradeGrid.vue            ← the scrollable assessment × student matrix
  GradeAnalytics.vue       ← analytics panel (charts, triangulation)
  AssessmentModal.vue      ← add/edit assessment form
  GradePopover.vue         ← the per-cell score entry popover
  GradeColumnMenu.vue      ← context menu for assessment columns
  MilestoneSelector.vue    ← milestone date bar
```

All shared state lives in `useGradebook.js` already — so this split is mostly a **template and import reorganization**, not a logic change.

---

### 🔴 R2 — Split `Setup.vue` (3,391 lines) by tab
**Impact: High | Risk: Low | Est. effort: 1-2 sessions**

`Setup.vue` has clearly demarcated tabs (Roster, Behavior, Gradebook, Sync, etc.). Each tab can become its own component with no shared state complexity since setup tabs don't interact.

```
src/components/setup/
  RosterTab.vue
  BehaviorTab.vue
  GradebookSettingsTab.vue
  SyncTab.vue
  DataHealthTab.vue
```

The parent `Setup.vue` becomes a ~100-line shell with `<component :is="activeTab">`.

---

### 🟡 R3 — Extract a `useToast` composable to replace `alert()`
**Impact: Medium | Risk: Low | Est. effort: half-session**

We now have ~25 `alert()` / `window.alert()` calls throughout the codebase. These block the UI thread and look unprofessional compared to the rest of the app's design. A simple toast composable would be a significant UX upgrade.

```js
// src/composables/useToast.js
const toasts = ref([])
function showToast(message, type = 'info', duration = 4000) { ... }
function dismissToast(id) { ... }
export function useToast() { return { toasts, showToast, dismissToast } }
```

Then in every composable, replace:
```js
// Before
alert('Failed to save attendance. Please try again.')

// After
const { showToast } = useToast()
showToast('Failed to save attendance. Please try again.', 'error')
```

A single `<ToastContainer>` in `App.vue` renders all active toasts.

---

### 🟡 R4 — Consolidate `gradebookService.js` into smaller co-located modules
**Impact: Medium | Risk: Low | Est. effort: 1 session**

At 1,335 lines, `gradebookService.js` has four distinct concerns:

| Lines | Concern |
|---|---|
| 1–100 | Assessment CRUD |
| 101–400 | Grade CRUD (attempts, flags) |
| 400–845 | Calculation engine (weighted, median, consistent) |
| 845–1336 | Analytics (distribution, correlation, health scan) |

**Suggested split:**
```
src/db/
  gradebook/
    assessmentService.js   ← CRUD for assessments
    gradeService.js        ← CRUD for grades/attempts  
    gradeCalc.js           ← calculateStudentGrade, calculateClassGrades
    gradeAnalytics.js      ← calculateClassAnalytics, distributions, health
```

`useGradebook.js` imports from these directly. No behavior changes — pure reorganization.

---

### 🟡 R5 — Replace the grade debounce queue with a proper `useDebouncedSave` hook
**Impact: Medium | Risk: Low | Est. effort: half-session**

The grade entry debounce in `useGradebook.js` (lines 261–282) is custom, module-scoped, and not reusable. Extracting it makes debounced saving available for other future features (e.g. note auto-save).

```js
// src/composables/useDebouncedSave.js
export function useDebouncedSave(delay = 500) {
  const queue = new Map()
  let timer = null
  
  function enqueue(key, saveFn) {
    queue.set(key, saveFn)
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const tasks = [...queue.values()]
      queue.clear()
      for (const task of tasks) {
        try { await task() } catch (err) {
          console.error('Save failed:', err)
          // Can emit event or call toast here
        }
      }
    }, delay)
  }
  
  return { enqueue }
}
```

---

### 🟢 R6 — Add a `formatPercent(value)` utility to eliminate inline `.toFixed` / `Math.round` patterns
**Impact: Low | Risk: Very Low | Est. effort: 15 minutes**

There are 30+ places that do variations of:
```js
Math.round(val)          // sometimes
val.toFixed(1)           // sometimes
preciseRound(val)        // sometimes
Number(val).toFixed(0) + '%'  // sometimes
```

A single `formatPercent(val, decimals = 0)` utility in `src/utils/math.js` (which already exists) would standardize all display-layer rounding:
```js
export function formatPercent(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return `${Number(val).toFixed(decimals)}%`
}
```

---

## Summary Priority Matrix

| Ref | What | Impact | Risk | When |
|---|---|---|---|---|
| **R1** | Split `Grades.vue` (5K lines) | 🔴 High | Medium | Next sprint |
| **R2** | Split `Setup.vue` by tab | 🔴 High | Low | Next sprint |
| **R3** | `useToast` replaces `alert()` | 🟡 Medium | Low | Alongside R1 |
| **R4** | Split `gradebookService.js` | 🟡 Medium | Low | After R1 |
| **R5** | `useDebouncedSave` hook | 🟡 Medium | Low | Quick win |
| **R6** | `formatPercent` utility | 🟢 Low | Very Low | Quick win |

> [!NOTE]
> R1 and R2 have the highest payoff — they are the biggest drag on IDE responsiveness, developer speed, and code navigability. None of these refactors change any behavior; they are purely structural.

> [!TIP]
> Start with R2 (Setup tabs) as a warm-up — it's the safest split since each tab is already isolated. Then tackle R1 (Grades split) once you have a feel for the Vue component decomposition workflow.
