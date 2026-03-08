# Classroom Tracker — Developer Guideld Instructions

> Distilled from Architecture & Scope v3.1. This file is the authoritative ruleset for all code generation.
> When in doubt, follow the rules here exactly. Do not invent alternatives.

---

## 1. Project Overview

A self-hosted, offline-first Progressive Web App for teachers to track student behavior via a visual seating chart. Tablet-optimized. No server. No cloud. No accounts. All data stays on the device.

**The only anticipated future growth is adding new trackable behavior items. Every architectural decision reflects this.**

---

## 2. Tech Stack — Non-Negotiable

| Concern | Choice |
|---|---|
| Framework | Vue 3 (Composition API only — no Options API) |
| Build tool | Vite |
| Distribution | PWA with Service Worker (Workbox via vite-plugin-pwa) |
| Database | IndexedDB via the `idb` wrapper library (see Section 4) |
| Routing | None. Do not install `vue-router`. Use `<component :is="currentView">` dynamic components managed by a single reactive `ref` in `App.vue`. |
| Styling | CSS Custom Properties + CSS Grid. No CSS framework. |
| Language | JavaScript (ES6+). No TypeScript. |
| CSV Parsing | `papaparse` — do not write a custom CSV parser |

**No backend. No Firebase. No Supabase. No external APIs. No analytics. Nothing leaves the device.**

### Navigation implementation (App.vue)
```js
const currentView = ref('Dashboard') // 'Dashboard' | 'Setup' | 'Reports'
```
```html
<component :is="currentView" />
```
The class switcher dropdown and nav buttons mutate `currentView`. That is the entire routing system. Do not install or use vue-router.

### Styling Directive

The UI must feel clean and modern — iOS-style. White backgrounds, subtle shadows, generous spacing, rounded corners. No heavy borders. No flat grey boxes.

Define these CSS custom properties in `src/styles/main.css` and derive everything else from them:

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

Touch targets minimum 44×44px throughout. Use `--shadow-md` for overlays and the radial menu. Use `--shadow-sm` for desk tiles and cards.

---

## 3. Folder Structure — Generate Exactly This

```
/
├── index.html
├── vite.config.js
├── public/
│   └── manifest.json
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── db/
│   │   ├── index.js          ← IDB open/init/migration. Exports the db instance only.
│   │   ├── settingsService.js
│   │   ├── classService.js
│   │   └── eventService.js
│   ├── composables/
│   │   ├── useClassroom.js
│   │   ├── useRadial.js
│   │   └── useUndo.js
│   ├── components/
│   │   ├── SeatingGrid.vue
│   │   ├── DeskTile.vue
│   │   ├── RadialMenu.vue
│   │   ├── ClassSwitcher.vue
│   │   └── UndoButton.vue
│   ├── views/
│   │   ├── Dashboard.vue     ← View A: active instruction
│   │   ├── Setup.vue         ← View B: seat assignment + behavior code editor
│   │   └── Reports.vue       ← View C: reporting + backup hub
│   └── styles/
│       └── main.css
```

---

## 4. The IDB Service Layer — The Most Important Architectural Rule

### Rule: Vue components NEVER touch IndexedDB directly.

All reads and writes go through the service modules in `src/db/`. Components call composables. Composables call service functions. Service functions call IndexedDB.

```
DeskTile.vue  →  useUndo.js / useClassroom.js  →  eventService.js  →  IndexedDB
```

**Never import `src/db/` files inside `src/components/` or `src/views/`. Ever.**

### Use the `idb` library for all IndexedDB access

Install: `npm install idb`

Use `idb` throughout `src/db/`. It wraps raw IndexedDB callbacks in clean promises with no architectural changes — `await db.put()` instead of 15 lines of nested `onsuccess` handlers. It does not change how IndexedDB works. The service layer abstraction still fully applies.

```js
import { openDB } from 'idb'

const db = await openDB('classroomTrackerDB', 1, {
  upgrade(db) {
    // create stores and indexes here
  }
})

await db.put('events', eventObj)
const result = await db.get('classes', classId)
```

Do not write raw `IDBRequest` / `onsuccess` / `onerror` callback chains. Use `idb` exclusively.

### The Vue reactivity bridge — composables are the single source of truth

IndexedDB is not reactive. Writing to the database does not automatically update the UI. The composables bridge this gap.

**The rule:** When an action occurs, the composable must:
1. Call the service function to write to IndexedDB
2. Immediately update its own local reactive `ref` with the new state
3. Never re-fetch from IndexedDB to update the UI

```js
// CORRECT — write to IDB then update the ref
async function logEvent(studentId, code) {
  const eventId = await eventService.logEvent({ studentId, code, ... })
  students.value[studentId].lastEvent = code   // UI updates immediately
  undoStack.value.push({ type: 'deleteEvent', eventId })
}

// WRONG — do not re-fetch to update the UI
async function logEvent(studentId, code) {
  await eventService.logEvent({ studentId, code, ... })
  const fresh = await classService.getClass(classId)  // unnecessary round-trip
  students.value = fresh.students
}
```

`useClassroom.js` owns the reactive `ref`s for the active class and its students. It is the single source of truth for the Vue UI. IDB is the persistence layer. They are kept in sync by the composable, not by re-fetching.

### Service module public API — implement exactly these function signatures:

**settingsService.js**
```js
export async function getSettings()
export async function saveSettings(settingsObj)
export async function getBehaviorCodes()          // returns array of code objects
export async function saveBehaviorCode(codeObj)
export async function deleteBehaviorCode(codeKey)
```

**classService.js**
```js
export async function getAllClasses()
export async function getClass(classId)
export async function saveClass(classObj)
export async function updateStudentSeat(classId, studentId, seat)  // seat = { row, col } | null
export async function setStudentActiveState(classId, studentId, activeStateObj)
export async function clearStudentActiveState(classId, studentId)
export async function importRoster(classId, studentsArray)         // upserts by studentId
```

**eventService.js**
```js
export async function logEvent(eventObj)                           // returns eventId
export async function deleteEvent(eventId)                         // used by undo
export async function getEventsByStudent(studentId, dateRange)
export async function getEventsByClass(classId, dateRange)
export async function getEventsByPeriod(periodNumber, dateRange)
export async function getAllEvents(dateRange)
export async function exportAllData()                              // returns full backup object
export async function importAllData(backupObj)                     // validates + writes all stores
```

---

## 5. IndexedDB Schema — Implement Exactly

### Database name: `classroomTrackerDB`
### Current schema version: `1`

### Object Store: `settings`
- Key: `"singleton"` (hardcoded string, single record)
```js
{
  gridSize: { rows: 6, cols: 6 },
  behaviorCodes: {
    "p": { icon: "✋", label: "Participation", category: "positive",  type: "standard" },
    "m": { icon: "📱", label: "On Device",     category: "redirect",  type: "standard" },
    "w": { icon: "🚽", label: "Washroom",      category: "neutral",   type: "toggle"   }
  }
}
```

### Object Store: `classes`
- Key: `classId` (string, e.g. `"class_01"`)
```js
{
  classId: "class_01",
  name: "Period 1 — Science",
  periodNumber: 1,                  // integer, never derived, set at class creation
  students: {
    "S10432": {                     // key is Student ID from CSV — never a generated ID
      firstName: "Jane",
      lastName: "Doe",
      seat: { row: 2, col: 3 },    // null if unassigned
      activeStates: {
        isOut: false,
        outTime: null               // ISO string when isOut is true
      }
    }
  }
}
```

### Object Store: `events`
- Key: `eventId` (autoIncrement: true)
- Indexes: `studentId`, `classId`, `periodNumber`, `dayOfWeek`, `timestamp`, `category`
```js
{
  eventId:      undefined,          // auto-assigned by IndexedDB
  studentId:    "S10432",           // from CSV — canonical key
  classId:      "class_01",
  periodNumber: 1,                  // copied from class at write time
  dayOfWeek:    3,                  // 0=Sun…6=Sat, written at event time — never derived later
  timestamp:    "2026-03-05T10:15:00",
  code:         "w",
  category:     "neutral",          // copied from behaviorCode at write time — never derived later
  duration:     null                // milliseconds, populated only on toggle-IN events
}
```

### IDB Initialization (`src/db/index.js`)
- On `onupgradeneeded`, create all three stores and all indexes on `events`
- Include a `schemaVersion` field in the settings record for backup/restore validation
- Exports a single `getDB()` async function that returns the open db instance

---

## 6. CSV Roster Import — Rules

- Required columns: `Student ID`, `First Name`, `Last Name`
- Column order is flexible — detect by reading the header row
- **Use `papaparse` for all CSV parsing. Do not write a custom parser.** A hand-rolled `split(',')` will break on names containing commas (e.g. `"Smith, Jr."`).
- Parse with `Papa.parse(file, { header: true, skipEmptyLines: true })`
- **Student ID is required. Rows without a Student ID are skipped and listed in an error summary shown to the teacher.**
- Student ID is used directly as the database key — never generate a substitute key
- Import is an upsert: if Student ID already exists in the target class, update name fields and preserve all events. Do not create a duplicate record.
- If a Student ID exists in a different class, prompt the teacher: move student or skip row
- All file reading via `FileReader` API. No data transmitted.

---

## 7. Radial Menu — Behaviour Rules

- **The radial menu is the ONLY entry point for logging any event, including washroom toggles.**
- No shortcut exists for tapping a desk icon directly to toggle washroom. Zero exceptions.
- Displays up to 6 behavior code items in a circle. Center button cancels/closes.
- Touch targets minimum 44×44px.
- Tapping outside the overlay closes without logging.

### When behavior codes exceed 6 (category mode — implement from day one):
- Radial shows one button per category instead of individual codes
- Tapping a category opens a second radial showing only codes in that category
- Center button goes back to category view (not close)
- Outermost tap still closes entirely

### Toggle-type codes (washroom):
- If `activeStates.isOut === false`: tapping logs OUT. Sets `isOut: true`, records `outTime`, starts elapsed timer on desk tile.
- If `activeStates.isOut === true`: tapping logs IN. Calculates `duration = Date.now() - outTime`, writes completed event with duration, clears `activeStates`, stops timer.
- Render the toggle item with a distinct active style when the student is currently out.

---

## 8. Event Write Procedure — Follow Exactly

Every time an event is logged, execute these steps in order inside a single async function in `eventService.js`:

1. Fetch current class record to get `periodNumber`
2. Fetch current behavior code to get `category`
3. Compute `dayOfWeek` from `new Date()`
4. Write event object to `events` store with all fields populated (never null for periodNumber, dayOfWeek, category)
5. Return the auto-generated `eventId`
6. Caller pushes the inverse operation onto the undo stack using the returned `eventId`

**Never write an event without `periodNumber`, `dayOfWeek`, and `category` fully populated.**

---

## 9. Undo System

- In-memory stack only. Never persisted to IndexedDB.
- Lives in `useUndo.js` composable.
- Stack depth: 10. Drop oldest when full.
- Undo button is always visible in the dashboard header during View A.
- Cleared on page refresh — this is intentional.

### Stack operations by action:

| Action | Inverse pushed to stack |
|---|---|
| Log standard event | `deleteEvent(eventId)` |
| Toggle washroom OUT | `clearStudentActiveState(classId, studentId)` |
| Toggle washroom IN | `setStudentActiveState(classId, studentId, previousState)` + `deleteEvent(eventId)` |

> **Critical note on washroom IN undo:** The `previousState` closure must capture and restore the **exact original `outTime` timestamp** from when the student left — not a new timestamp. If `isOut` is restored to `true` without the original `outTime`, the desk tile elapsed timer will restart from zero instead of resuming the correct elapsed time. Capture `outTime` before the IN event is written, and include it in the closure.
| Assign student to seat | `updateStudentSeat(classId, studentId, null)` |
| Move student between seats | `updateStudentSeat(classId, studentId, previousSeat)` |

---

## 10. Desk Tile Visual States

Each `DeskTile.vue` reflects state via CSS custom properties and classes. Implement these:

| State | Visual |
|---|---|
| Empty seat | Muted background, no name |
| Occupied, no active state | Student name, neutral background |
| Student is out (isOut: true) | Red border, washroom icon, live elapsed timer (`setInterval`, 1s) |
| Event just logged | Brief green flash (CSS transition, ~600ms), then return to normal |

The elapsed timer starts from `activeStates.outTime`. Format as `MM:SS`. Timer stops when `isOut` is cleared.

---

## 11. Grid Resize Rule

When the teacher changes grid dimensions in Setup view:
1. Check if any currently seated students would be outside the new bounds
2. If yes: show a dialog listing affected students with two options — "Move all to roster pool" or "Cancel resize"
3. Only apply the resize after the teacher confirms
4. Never silently drop seated students

---

## 12. Reports — Required Queries

All reports query the `events` store. Use the indexes — never full table scans.

| Report | Primary index | Secondary filter |
|---|---|---|
| Student Detail | `studentId` | date range on `timestamp` |
| Class Summary | `classId` | date range |
| Period Pattern | `periodNumber` | `dayOfWeek` + date range |
| Washroom Log | `classId` + `code === "w"` | date range, duration populated |
| Daily Overview | `timestamp` (single day) | all classes |

Export formats: print view (CSS `@media print`), CSV download via Blob API.

---

## 13. Backup & Restore

### Export
- Serialize all three stores into one object
- Include `schemaVersion: 1` and `exportedAt` ISO timestamp at root
- Download as `classroom-backup-YYYY-MM-DD.json` via Blob API

### Import
- Read `schemaVersion` — if mismatch, show clear error, abort, do not overwrite any data
- Show a summary of what will be overwritten before committing
- Write all three stores in a single IndexedDB transaction
- All logic lives in `eventService.importAllData()`

---

## 14. PWA Configuration

- `vite-plugin-pwa` with Workbox
- Cache strategy: `CacheFirst` for all static assets
- The app must be fully functional with zero network access after first load
- `manifest.json`: name, short_name, icons (at minimum 192×192 and 512×512), `display: standalone`, `orientation: portrait`

---

## 15. Build Order

Build in this order. Do not skip ahead. Each layer depends on the one before.

1. `src/db/index.js` — IDB open, schema creation, indexes
2. `src/db/settingsService.js`, `classService.js`, `eventService.js` — full service APIs
3. `src/composables/useUndo.js` — undo stack
4. `src/composables/useClassroom.js` — reactive class/student state
5. `src/composables/useRadial.js` — radial open/close/selection logic
6. `src/components/DeskTile.vue` — single desk rendering + timer
7. `src/components/RadialMenu.vue` — flat + category-drill-down radial
8. `src/components/SeatingGrid.vue` — grid layout using DeskTile
9. `src/components/ClassSwitcher.vue` + `UndoButton.vue`
10. `src/views/Dashboard.vue` — wires all components for View A
11. `src/views/Setup.vue` — seat assignment + behavior code editor
12. `src/views/Reports.vue` — all report types + backup hub
13. PWA configuration (manifest, service worker, Workbox)

---

## 16. Hard Rules — Never Violate

- Vue components never import from `src/db/`
- Do not install or use `vue-router` — navigation is a single reactive `ref` in `App.vue`
- Use `papaparse` for CSV parsing — never `split(',')` or any custom parser
- Use the `idb` library for all IndexedDB access — no raw `IDBRequest` callback chains
- Use only the CSS custom properties defined in Section 2 for all colours, shadows, and radii — do not hardcode colour values anywhere else
- Student ID from CSV is always the database key — never generate a substitute
- Every event record must have `periodNumber`, `dayOfWeek`, and `category` written at log time
- Radial menu is the only event entry point — no desk-icon shortcuts
- No external network calls of any kind
- No localStorage — IndexedDB only
- `periodNumber` on a class is a fixed integer set at class creation — never derived from a schedule map
- Category drill-down radial must be implemented from day one, not deferred
