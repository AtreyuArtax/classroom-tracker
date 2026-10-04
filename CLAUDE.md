# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                    # Vite dev server (PWA service worker is disabled in dev)
npm run build                  # Production build to dist/
npm run preview                # Serve the built dist/
npm run deploy                 # Build + publish dist/ to GitHub Pages (gh-pages)
npm run validate:curriculum    # Validate src/data/curriculum presets against schema.json
npm run fix:curriculum         # Same, auto-fixing what it can
npm run check:imports          # Check architectural import boundaries across components
```

There is no linter and no test runner. Tests are standalone Node scripts at `src/test_*.js` that import pure functions (mostly from `src/utils/`, some via `src/db/` re-exports) and use `node:assert`. Run one with:

```bash
node src/test_sbar_math.js
```

They cannot exercise IndexedDB (no fake-indexeddb), so they cover calculation, migration, and parsing logic only. Add new tests as another `src/test_<topic>.js` script.

Build notes: `base` defaults to `/classroom-tracker/` (GitHub Pages); override with `VITE_BASE_URL` (e.g. `/` for Vercel). `__APP_VERSION__` is injected from `package.json` `version`.

## Navigating the codebase with graphify

`graphify-out/graph.json` is a knowledge graph of the code (built from the AST; `.graphifyignore` leaves out docs, CSS, and images). For codebase or architecture questions, query it before grepping or reading whole files. It returns a small, scoped subgraph:

```bash
graphify query "<question>"        # BFS subgraph relevant to the question
graphify path "<A>" "<B>"          # shortest path between two nodes (e.g. a component and getDB())
graphify explain "<concept>"       # one node plus its neighbors
```

- Read `graphify-out/GRAPH_REPORT.md` (communities, god nodes like `getDB()`, `useMessage()`, `formatLocalDate()`) only for a broad architecture review, or when query/path/explain don't give you enough.
- If `graphify-out/wiki/index.md` exists, navigate it instead of raw files. It does not exist at the moment.
- **After you modify code files, run `graphify update .`** to keep the graph current. It is AST-only and costs no API calls. The report's "Built from commit" line tells you whether the graph is stale compared with `git rev-parse HEAD`.

---

## Classroom Tracker — Developer Guide & Instructions

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

1. **Strict File Line Limit (1,000 Lines Max)**: No single `.vue` or `.js` file should exceed **1,000 lines of template + script**. For `.vue` files the `<style>` block is not counted; long CSS is fine and doesn't need to move out. `.js` files count every line. When adding new features or expanding existing views, extract logical sub-components immediately. Moving CSS into a separate file does not count as bringing a file under the limit.
2. **Modular Sub-Component Strategy**: Always build new modals, sub-tabs, toolbars, export dialogs, and detail views as dedicated components in their corresponding component subdirectory (`src/components/grades/`, `src/components/reports/`, `src/components/dossier/`, `src/components/setup/`).
3. **Orchestrator Pattern**: Main view files (`Dashboard.vue`, `Setup.vue`, `Reports.vue`, `Grades.vue`, `Student360.vue`) must function as clean orchestrators, delegating presentational UI, modals, and tab content to focused sub-components.

---

## 3. Architecture Map

Only the non-obvious parts — browse `src/` for the rest.

- **`App.vue`** holds `currentView` and swaps views via `<component :is>`. It opens directly into `ScanStation` (with nav hidden) when the URL ends in `/scan` or has `?view=scan`. Leaving `Setup` is guarded when the curriculum editor has unsaved changes.
- **Student360** (the student dossier) lives at `src/components/dossier/Student360.vue`, not in `src/views/`, but it follows the orchestrator rules for views.
- **Grade math is split between two layers.** The pure algorithms are in `src/utils/gradeCalc.js` and `src/utils/gradeCalcSBAR.js`; components import from there. `src/db/gradebookService.js` is a re-export barrel for `src/db/gradebook/` (`assessmentService`, `gradeService`, `gradeCalc`, `gradeCalcSBAR`, `gradeAnalytics`), which is IDB-backed. `db/gradebook/gradeCalc.js` wraps the pure math with database fetches: `calculateStudentGrade` loads missing data there, while the pure `utils` version treats missing data as empty. `gradeAnalytics.js` calls `getDB()` and is not pure. The same split applies to `src/utils/exportService.js` (pure) and `src/db/exportService.js` (a re-export shim).
- **Two grading models:** traditional weighted categories (`utils/gradeCalc.js`) and SBAR standards-based mastery by curriculum expectation (`utils/gradeCalcSBAR.js`: decaying average, power law, mode, most recent, highest). Grades UI splits along the same line (`GradesGrid.vue` vs `grades/GradesGridSBAR.vue`).
- **Elementary mode:** one elementary class holds several subjects. `useElementary.js` provides `getEffectiveClassRecord(classRecord, subjectId)`, which projects a subject-scoped view of the class. Use it rather than reading `classRecord.units` and categories directly.
- **Curriculum presets** (`src/data/curriculum/`) are JSON files registered in `index.js` and validated against `schema.json` (see its README). They are bundled into a separate `data-curriculum` chunk.
- **Other deliverables in the repo:** `extension/` is a Chrome MV3 extension that routes keyboard-wedge scanner input to the app from other tabs. `rfid-companion/` is a Python tray app for Windows RFID readers, built to an `.exe` by `.github/workflows/build-companion.yml` on push.
- The root-level `update-*.md`, `implementation_plan_*.md`, and `APP_STATE_V*.md` files are historical design notes and may be out of date relative to the code.
- **Known debt (line limit):** 18 non-test files are over the limit (counting template + script only, as of October 2026). They include the composables `useClassroom.js` (~2,100), `useGradebook.js` (~1,800) and `useCurriculumLibrary.js`, `db/classService.js`, and components such as `setup/AssessmentFrameworkSettings.vue`, `setup/ElementarySubjectManager.vue`, `setup/ClassLogisticsSettings.vue` and `reports/OutOfClassAnalytics.vue`. List them with:
  ```bash
  find src \( -name '*.vue' -o -name '*.js' \) ! -name 'test_*' -exec awk '/^<style/{s=1} !s{n++} /^<\/style>/{s=0} END{if(n>1000) print n, FILENAME}' {} \; | sort -rn
  ```
  When you touch one, extract logic out of it (sub-components, composables, or helpers in `src/utils/`); do not add to it. Be especially careful with the two big composables: routing more writes through them (see §4) makes them grow, so split them by domain instead of appending.
- **Known debt (db imports):** `scripts/check_imports.js` has an `APPROVED_BURNDOWN_ALLOWLIST` of four setup components that still import from `src/db/`: `DatabaseMaintenanceSettings`, `AssessmentFrameworkSettings`, `BehaviorSettings` and `ElementarySubjectManager`. The list may only shrink. Never add a file to it; route the access through a composable instead. When you remove the last `src/db/` import from a file, remove that file from the allowlist too (the checker prints a reminder).

---

## 4. The IDB Service Layer — Architectural Rules

### Rule: Vue components NEVER touch IndexedDB directly.

All reads and writes go through the service modules in `src/db/`. Components call composables. Composables call service functions. Service functions call IndexedDB.

```
DeskTile.vue  →  useUndo.js / useClassroom.js  →  eventService.js  →  IndexedDB
```

**Strict rule for components:** Files in `src/components/` NEVER import from `src/db/` under any circumstance. All pure calculations, math algorithms, time/date conversions, and export utilities live in `src/utils/`. All database reads, writes, and mutations must go through reactive composables in `src/composables/`. Raw `getDB()` calls are strictly forbidden in `src/components/`. Enforced via `npm run check:imports`; run it after changing any component's imports. The only exceptions are the four legacy files on the checker's allowlist (see Known debt in §3), and no new ones may be added.

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

Database `classroomTrackerDB`, opened in `src/db/index.js`. Stores:

1. **`settings`**: key `"singleton"` (behavior codes, grid dimensions, grade-scale thresholds, `gradebookMilestones`, `schemaVersion`). Milestones live here; there is no separate `milestones` store.
2. **`classes`**: keyPath `classId`. Class metadata, semester/year, course code, gradebook categories, units, and roster.
3. **`events`**: autoIncrement. Behavior logs, lates, washroom trips, observations/conversations (`code === 'ac'`), parent contacts.
4. **`assessments`**: assessment details, `target` (`class`/`individual`), categoryId, unitId, expectationId, totalPoints, scaledTotal, retestPolicy.
5. **`grades`**: indexed on `assessmentId` and `studentId`. Holds the attempts array, missing/excluded flags, and notes.
6. **`student_photos`**: keyPath `studentId`.
7. **`learning_skills`**: keyPath `id`.

**Schema changes require three edits kept in sync:** bump `DB_VERSION` in `src/db/index.js`, add a versioned block to its `upgrade()` callback, and bump `CURRENT_SCHEMA` and add the matching step to `migrateData()` in `src/db/migrations.js`. The last one migrates imported JSON backups, which may come from any older version.

---

## 6. CSV Roster Import Rules

- Required columns: `Student ID`, `First Name`, `Last Name`
- Use `papaparse` for all CSV parsing. Do not write a custom parser.
- Student ID is required. Rows without a Student ID are skipped and summarized.
- Import is an upsert: if Student ID already exists in the target class, update fields and preserve existing history/events.

---

## 7. Hard Rules — Never Violate

- Components (`src/components/`) NEVER import from `src/db/`, apart from the shrinking legacy allowlist in §3. All pure calculations live in `src/utils/`, and state mutations route through reactive composables. `npm run check:imports` must pass.
- Do not install or use `vue-router` — navigation is a single reactive `ref` in `App.vue`.
- Use `papaparse` for CSV parsing — never `split(',')`.
- Use `idb` library for all IndexedDB access — no raw `IDBRequest` callback chains.
- Every `.vue` and `.js` file must stay under **1,000 lines of template + script**; `<style>` blocks don't count (see §2.1 and Known debt in §3).
- **Student data never leaves the device.** The only permitted external calls are to Supabase for the door scanner feature, transmitting anonymous hex codes and integer counts only.
- Composition API only — never use Options API (`export default { ... }`). Use `defineOptions()` inside `<script setup>` for component options like `inheritAttrs`.
