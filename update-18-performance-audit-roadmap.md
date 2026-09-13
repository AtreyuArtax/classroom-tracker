# Update 18 — Performance & Memory Audit and Roadmap (Phases 1, 2, & 3)

## Overview

This document records the comprehensive speed, memory, and bundle audit conducted on Classroom Tracker, the changes successfully completed in **Phase 1**, and the detailed implementation specifications and failure-mode safeguards for **Phase 2** and **Phase 3** when revisited.

---

## Part 1: Phase 1 (Completed & Verified)

### Summary of Results

| Asset / Chunk | Before Phase 1 | After Phase 1 | Net Improvement |
|---|---|---|---|
| **Core Vendor (`vendor.js`)** | 1,156.86 kB | **120.13 kB** | **-89.6%** (-1,036 kB) |
| **Icons Chunk (`vendor-icons.js`)** | 892.19 kB | **60.68 kB** | **-93.2%** (-831 kB) |
| **Main App Code (`index.js`)** | 805.70 kB | **204.01 kB** | **-74.7%** (-601 kB) |
| **Supabase SDK on Startup** | 206.25 kB *(preloaded)* | **0.00 kB** *(deferred)* | **-100%** (-206 kB) |
| **Total Startup JS Preloaded** | **3,061.00 kB (3.06 MB)** | **384.82 kB** | **-87.4% (-2.68 MB)** |

### Changes Implemented:

1. **Tree-Shook Lucide Icons** (`src/utils/icons.js`):
   - Replaced wildcard `import * as LucideIcons from 'lucide-vue-next'` with an explicit dictionary of all active system and behavior icons used across the application.
   - Preserved legacy migration aliases (`Toilet: DoorOpen`, `Droplets: DoorOpen`) and safe fallback to `HelpCircle`.
2. **Isolated ExcelJS and JSZip** (`vite.config.js`):
   - Configured `manualChunks` in Rollup to separate `exceljs` and `jszip` into an on-demand chunk `'vendor-excel'`.
   - Prevents 1.03 MB of spreadsheet code from loading until an export or spreadsheet import is requested.
3. **Decoupled Curriculum Dirty Tracking** (`src/composables/useCurriculumEditorState.js` & `src/App.vue`):
   - Extracted `curriculumEditorDirty`, `curriculumEditorTitle`, `curriculumEditorSaveHandler`, and `curriculumEditorDiscardHandler` into a standalone module.
   - `App.vue` now imports the navigation guards without pulling all 28 curriculum JSON files (788 kB) into the app entry chunk.
   - Separated `data/curriculum` into a `'data-curriculum'` chunk.
4. **Lazy-Loaded Supabase Cloud Client** (`src/composables/useClassroom.js`):
   - Removed the top-level static import of `@supabase/supabase-js`.
   - Supabase is loaded dynamically only when `cloudModeEnabled.value === true`.

---

## Part 2: Phase 2 (Pinned for Future Work) — Data Layer & Calculation Speed

### 2.1. Bind `getEventsByClass` to the Composite Index `by_classId_timestamp`
- **Location**: `src/db/eventService.js:L204-208`
- **Current Behavior**:
  ```javascript
  export async function getEventsByClass(classId, dateRange = {}) {
      const db = await getDB()
      const events = await db.getAllFromIndex('events', 'by_classId', classId)
      return _applyDateRange(events, dateRange)
  }
  ```
  Retrieves *all* historical events for the class across the entire school year and filters them in JavaScript memory.
- **Where it hurts**: In `_activateClass` (`useClassroom.js:L1607`), class switching queries today's events: `getEventsByClass(cls.classId, { from: todayStr, to: todayStr })`. As thousands of events accumulate, this query causes GC spikes and slow class switches.
- **Proposed Optimization**:
  Query the existing composite index `by_classId_timestamp` via `IDBKeyRange.bound([classId, fromISO], [classId, toISO])` when date filters are supplied.
- **CRITICAL SAFEGUARD**:
  Lexicographical string matching in IndexedDB requires explicit end-of-day padding (`to + 'T23:59:59.999Z'`), otherwise events logged in the afternoon of the `to` date will be omitted.

### 2.2. Defer Gradebook Calculation on Dashboard
- **Location**: `src/views/Dashboard.vue:L230-237`
- **Current Behavior**:
  `watch(() => activeClass.value?.classId, async (newClassId) => { await loadGradebook(cls) }, { immediate: true })`
  Recalculates every student's course grade, SBAR decaying averages, and assessment analytics whenever the Dashboard mounts.
- **CRITICAL SAFEGUARD — The At-Risk Dot Trap**:
  `DeskTile.vue` lines 233–244 reads `classGrades.value?.[props.studentId]?.overallGrade` to display the discreet red **Academic At-Risk Dot**.
  **Do NOT delete `loadGradebook` from the Dashboard.**
  Instead, run `loadGradebook(cls)` inside `requestIdleCallback` or `setTimeout(..., 100)`. The seating chart and desks will render instantly (0ms delay), and the at-risk dots will fade in smoothly without freezing the UI.

### 2.3. Pre-Index Attendance Events in `useAttendanceInsights.js`
- **Location**: `src/composables/useAttendanceInsights.js:L23-33`
- **Current Behavior**:
  Runs a nested $O(A \times E)$ loop with `.startsWith()` for 50 assessments $\times$ 1,000 absence events (50,000 string checks on every reactive tick).
- **Proposed Optimization**:
  Pre-index absences into a `Map<dateString, Set<studentId>>` in one $O(N)$ pass, transforming lookups to $O(1)$.

---

## Part 3: Phase 3 (Pinned for Future Work) — DOM & Rendering Overhead

### 3.1. Async Splitting for Large Setup Sub-Tabs & Reports Panels
- **Locations**:
  - `src/components/setup/ClassLogisticsSettings.vue`: `AssessmentFrameworkSettings` (2,066 lines), `ElementarySubjectManager` (2,251 lines), and `StudentInfoSurveyModal` (1,307 lines).
  - `src/components/reports/ReportsClassOverview.vue`: `ExpectationMasteryHeatmap`, `StudentRiskScatterPlot`, `StudentMindsetAnalytics`, `OutOfClassAnalytics`.
- **Proposed Optimization**:
  Convert these heavy sub-tabs into `defineAsyncComponent(() => import(...))`.
- **Safeguard Verification**:
  Verified: parent components do not use template method refs on these children. They are purely reactive-data driven (`v-if`), making async component conversion completely safe.

### 3.2. Grades Grid Table Geometry Caution
- **Warning**: Do NOT apply CSS `content-visibility: auto` directly to HTML `<table>`, `<tr>`, or `<td>` elements in `GradesGrid.vue` or `GradesGridSBAR.vue`.
- **Reason**: Browsers calculate table geometry holistically across all cells. Skipping layout on off-screen rows causes column widths to jump while scrolling and breaks `position: sticky` on student name headers in WebKit and Blink.
- **Safe Alternative**: Leave native table rendering intact, or use CSS `contain: paint` on internal cell badges and avatars.

---

## Verification Test Commands

When picking up future phases, run these test suites to guarantee zero regression:

```bash
# Verify dirty tracking and navigation guards
node src/test_curriculum_dirty_protection.js

# Stress-test master curriculum engine & SBAR propagation
node src/test_curriculum_library_stress_suite.js

# Test database pipelines, CSV imports, and backup/restore
node src/test_data_pipelines_audit.js

# Test attendance patterns and math integrity
node src/test_attendance_patterns.js && node src/test_math_and_statistics_audit.js

# Validate all curriculum presets
npm run validate:curriculum

# Measure production bundle sizes
npm run build

# Keep graphify knowledge graph synchronized
graphify update .
```
