# Classroom Tracker — Developer Guide & Instructions

> Distilled from Architecture & Scope v4.0. This file is the authoritative ruleset for all code generation and architecture in this repository.
> When in doubt, follow the rules here exactly. Do not invent alternatives.

---

## 1. Project Overview

A self-hosted, offline-first Progressive Web App for teachers to track student behavior via a visual seating chart, record qualitative & quantitative evidence, and manage a complete gradebook and student dossier. Tablet-optimized. All **student data** stays on the device — no names, IDs, behavior logs, or academic records are ever transmitted.

The app has one optional cloud feature: a **door scanner** (ScanStation) that syncs anonymous room-status counts and random hex RFID strings via Supabase Realtime. No student PII is transmitted. This feature is opt-in and requires explicit teacher configuration.

---

## 2. Tech Stack — Non-Negotiable

| Concern | Choice |
|---|---|
| Framework | Vue 3 (Composition API only — no Options API; use `<script setup>`) |
| Build tool | Vite |
| Distribution | PWA with Service Worker (Workbox via `vite-plugin-pwa`) |
| Database | IndexedDB via the `idb` wrapper library (see Section 4) |
| Routing | None. Do not install `vue-router`. Use `<component :is="currentView">` dynamic components managed by a single reactive `ref` in `App.vue`. |
| Styling | CSS Custom Properties + CSS Grid / Flexbox. No Tailwind / Bootstrap. |
| Language | JavaScript (ES6+). No TypeScript. |
| CSV Parsing | `papaparse` — do not write a custom CSV parser |
| Cloud Sync | Supabase (optional, door scanner only) — transmits anonymous hex codes and room counts only. Zero student PII. |

**Privacy rule:** Student names, IDs, events, and grades never leave the device. The only data that touches Supabase is:
- `user_code`: a random hex string generated per teacher installation (no identity link)
- `incoming_scans.rfid_string`: the raw RFID tag value scanned at the door
- `room_status.active_students_out`: an integer count

### Navigation implementation (`App.vue`)
```js
const currentView = ref('Dashboard') // 'Dashboard' | 'Setup' | 'Reports' | 'Grades' | 'ScanStation'
```
```html
<component :is="currentView" />
```
The class switcher dropdown and nav buttons mutate `currentView`. That is the entire routing system. Do not install or use `vue-router`.

### Styling Directive

The UI must feel clean and modern — iOS-style. White backgrounds, subtle shadows, generous spacing, rounded corners. No heavy borders. No flat grey boxes.

Custom properties defined in `src/styles/main.css`:

```css
:root {
  --primary:          #4663ac;
  --primary-light:    color-mix(in srgb, #4663ac 15%, white);
  --primary-dark:     color-mix(in srgb, #4663ac 80%, black);

  --bg:               #ffffff;
  --bg-secondary:     #f2f2f7;   /* iOS system grouped background */
  --surface:          #ffffff;

  --text:             #1c1c1e;   /* iOS label */
  --text-secondary:   #6e6e73;   /* iOS secondary label */

  --border:           rgba(0, 0, 0, 0.1);
  --shadow-sm:        0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md:        0 4px 16px rgba(0, 0, 0, 0.12);

  --radius-sm:        8px;
  --radius-md:        12px;
  --radius-lg:        16px;

  /* Semantic states — derived from primary */
  --state-out:        #ff3b30;   /* iOS red — student is out of room */
  --state-success:    #34c759;   /* iOS green — confirmation flash */
  --state-neutral:    #8e8e93;   /* iOS grey */
}
```

Touch targets minimum 44×44px throughout.

---

## 2.1 Component Architecture & File Size Rules

1. **Strict File Line Limit (1,000 Lines Max)**: No single `.vue` or `.js` file should exceed **1,000 lines**. When adding new features or expanding existing views, extract logical sub-components immediately.
2. **Modular Sub-Component Strategy**: Always build new modals, sub-tabs, toolbars, export dialogs, and detail views as dedicated components in their corresponding component subdirectory (`src/components/grades/`, `src/components/reports/`, `src/components/dossier/`, `src/components/setup/`).
3. **Orchestrator Pattern**: Main view files (`Dashboard.vue`, `Setup.vue`, `Reports.vue`, `Grades.vue`, `Student360.vue`) must function as clean orchestrators, delegating presentational UI, modals, and tab content to focused sub-components.

---

## 3. Current Folder Structure

```
/
├── index.html
├── vite.config.js
├── public/
│   └── manifest.json
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── data/
│   │   └── curriculum/         ← Curriculum frameworks & expectations (e.g. Ontario SNC1W)
│   ├── db/
│   │   ├── index.js            ← IDB open/init/migration. Exports getDB() only.
│   │   ├── settingsService.js
│   │   ├── classService.js
│   │   ├── eventService.js
│   │   ├── gradebookService.js ← Grade calculation, weights, medians, mastery
│   │   └── exportService.js    ← Excel/CSV/JSON export
│   ├── composables/
│   │   ├── useClassroom.js     ← Primary reactive bridge (class/student/behavior state)
│   │   ├── useGradebook.js     ← Gradebook reactive state & calculation bridge
│   │   ├── useStudentDossier.js← Student 360 dossier statistics & multi-term history
│   │   ├── useAttendanceInsights.js
│   │   ├── useAttendanceTracker.js
│   │   ├── useRosterOperations.js
│   │   ├── useRadial.js
│   │   ├── useUndo.js
│   │   ├── useMessage.js       ← Singleton modal system (alert/confirm/prompt)
│   │   └── useKeyboardWedge.js
│   ├── components/
│   │   ├── SeatingGrid.vue
│   │   ├── DeskTile.vue
│   │   ├── RadialMenu.vue
│   │   ├── ClassSwitcher.vue
│   │   ├── StudentSidebar.vue
│   │   ├── UndoButton.vue
│   │   ├── QRScanner.vue
│   │   ├── BaseModal.vue
│   │   ├── GradesGrid.vue
│   │   ├── GradesAnalyticsPanel.vue
│   │   ├── PrintGradesGridModal.vue
│   │   ├── setup/              ← Setup sub-components (RosterCsvImporter, BehaviorSettings, etc.)
│   │   ├── dossier/            ← Student360 sub-components (ProfileTab, HistoryTab, EmailModal, PrintModal, etc.)
│   │   ├── reports/            ← Reports sub-components (ReportsClassOverview, ReportsBatchPrintModal, ReportsExportMenu)
│   │   └── grades/             ← Grades sub-components (GradesAssessmentDetailView, GradesMissingModal, GradesContextMenu)
│   ├── views/
│   │   ├── Dashboard.vue       ← View A: active instruction & seating chart
│   │   ├── Setup.vue           ← View B: class setup, roster import, behavior & grade settings
│   │   ├── Reports.vue         ← View C: aggregate reporting + export + backup hub
│   │   ├── Grades.vue          ← View D: gradebook grid & analytics
│   │   └── ScanStation.vue     ← View E: door scanner (Supabase, opt-in)
│   ├── utils/
│   │   ├── dates.js
│   │   ├── icons.js
│   │   ├── gradeColors.js
│   │   └── supabase.js         ← Supabase client (door scanner only)
│   └── styles/
│       └── main.css
```

---

## 4. The IDB Service Layer — Architectural Rules

### Rule: Vue components NEVER touch IndexedDB directly.

All reads and writes go through the service modules in `src/db/`. Components call composables. Composables call service functions. Service functions call IndexedDB.

```
DeskTile.vue  →  useUndo.js / useClassroom.js  →  eventService.js  →  IndexedDB
```

**Strict rule for components:** Files in `src/components/` must never import from `src/db/`. The only exception is pure utility functions that perform no IDB operations (e.g., `toMinutes` from `eventService.js` is a math helper, not a DB call).

**Relaxed rule for views:** Files in `src/views/` may import directly from `src/db/` when the operation is view-specific and doesn't belong in a shared composable (e.g. one-off report generation, Excel export). Prefer composables when the logic is reused across views.

### Use the `idb` library for all IndexedDB access

Use `idb` throughout `src/db/`. It wraps raw IndexedDB callbacks in clean promises (`await db.put()`, `await db.get()`). Do not write raw `IDBRequest` / `onsuccess` callback chains.

### The Vue reactivity bridge — composables are the single source of truth

IndexedDB is not reactive. Writing to the database does not automatically update the UI. The composables bridge this gap.

**The rule:** When an action occurs, the composable must:
1. Call the service function to write to IndexedDB
2. Immediately update its own local reactive `ref` with the new state
3. Never re-fetch from IndexedDB to update the UI

---

## 5. IndexedDB Schema

### Database name: `classroomTrackerDB`

### Primary Object Stores:
1. **`settings`**: Key `"singleton"` (global behavior codes, grid dimensions, grade scale thresholds).
2. **`classes`**: Key `classId` (e.g., `"class_01"`). Stores class metadata, semester, academic year, course code, gradebook categories, units, and roster array/map.
3. **`events`**: Key `eventId` (autoIncrement). Stores behavior logs, lates, washroom trips, qualitative observations/conversations (`code === 'ac'`), and parent contacts.
4. **`assessments`**: Key `assessmentId`. Stores assessment details, target (`class` vs `individual`), categoryId, unitId, expectationId, totalPoints, scaledTotal, and retestPolicy.
5. **`grades`**: Key `gradeId` (or autoIncrement/composite). Indexes on `assessmentId`, `studentId`. Stores attempts array, missing status, excluded status, and notes per student assessment.
6. **`milestones`**: Key `milestoneId`. Midterm and term reporting boundary dates.

---

## 6. CSV Roster Import Rules

- Required columns: `Student ID`, `First Name`, `Last Name`
- Use `papaparse` for all CSV parsing. Do not write a custom parser.
- Student ID is required. Rows without a Student ID are skipped and summarized.
- Import is an upsert: if Student ID already exists in the target class, update fields and preserve existing history/events.

---

## 7. Hard Rules — Never Violate

- Presentational components (`src/components/`) never import from `src/db/` — use composables.
- Do not install or use `vue-router` — navigation is a single reactive `ref` in `App.vue`.
- Use `papaparse` for CSV parsing — never `split(',')`.
- Use `idb` library for all IndexedDB access — no raw `IDBRequest` callback chains.
- Every `.vue` file must stay under **1,000 lines**.
- **Student data never leaves the device.** The only permitted external calls are to Supabase for the door scanner feature, transmitting anonymous hex codes and integer counts only.
- Composition API only — never use Options API (`export default { ... }`). Use `defineOptions()` inside `<script setup>` for component options like `inheritAttrs`.
