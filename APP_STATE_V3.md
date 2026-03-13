# Classroom Tracker — App State V3

This document captures the current state of the Classroom Tracker project (V3). It serves as the primary context for future development sessions, documenting architectural locks, database structure, and the software's reactive architecture.

## 1. Database State (IndexedDB)
- **Database Name**: `classroomTrackerDB`
- **Current DB Version**: `10`
- **Object Stores**:
    - `settings`: A singleton store for app-wide configuration. 
        - Key: `'singleton'`
        - Fields: `schemaVersion`, `gridSize {rows, cols}`, `behaviorCodes { [key]: codeObj }`, `thresholds { washroomTripsPerWeek, deviceIncidentsPerWeek }`, `backupFileHandle`.
    - `classes`: Collection of class records.
        - Primary Key: `classId`
        - Fields: `classId`, `name`, `periodNumber`, `periodStartTime`, `archived` (boolean), `students { [studentId]: studentObj }`.
        - `studentObj`: `studentId`, `firstName`, `lastName`, `seat {row, col}`, `generalNote`, `activeStates { isOut, outTime, isAbsent, lateMinutes }`.
    - `events`: Log of all behavioral and attendance actions.
        - Primary Key: `eventId` (auto-increment)
        - Indexes: `by_studentId`, `by_classId`, `by_periodNumber`, `by_timestamp`, `by_category`.
        - Fields: `eventId`, `studentId`, `classId`, `periodNumber`, `dayOfWeek` (0-6), `timestamp` (ISO), `code`, `category`, `duration` (ms, null for standard), `note` (string, null for standard), `testDay` (boolean), `supersededAbsent` (boolean), `acContext` (string, for `ac`), `acOutcome` (string, for `ac`).

## 2. Locked Architectural Decisions
*From CLAUDE.md — Do not deviate without explicit user approval:*
- **Tech Stack**: Vue 3 (Composition API), Vite, Vanilla CSS (CSS Grid + Custom Properties).
- **Offline-First**: Zero cloud dependencies. All data resides in local IndexedDB (`idb` library).
- **No Vue Router**: Navigation is managed via a single `currentView` reactive ref in `App.vue`.
- **Data Flow**: Vue components **never** import directly from `src/db/`. They interact via Composables. Composables use Service layer (`src/db/*Service.js`).
- **Single Source of Truth**: Composable state is the UI's authority. Writes to IDB are followed by immediate updates to reactive state.
- **Radial Menu**: The sole interaction point for logging behavioral events on the Dashboard.
- **CSV Import**: Handled exclusively via `papaparse`. Student ID is always the primary unique key.
- **Undo System**: In-memory singleton stack (depth 10) for reverting IDB writes and UI state changes.

## 3. Behavior Codes & Defaults
Updated mapping in `src/db/index.js` (renamed `ob` to `note`, merged `cv` into `note`, added `ac`):

| Key | Label | Category | Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `note` | Note | note | standard | **Requires Note**, Pinned: **Yes** (Observation/Conversation) |
| `ac` | Assessment | assessment | standard | **Assessment Conversation**, Pinned: **Yes** |
| `m` | On Device | redirect | standard | Pinned to Menu: **Yes** |
| `w` | Washroom | neutral | toggle | Pinned to Menu: **Yes** |
| `a` | Absent | attendance | attendance | Tracking only |
| `l` | Late | attendance | attendance | Prompts for duration |
| `pc` | Parent | communication | standard | **Requires Note**, Pinned: **Yes** |

## 4. Key Reactive Refs (Source of Truth)

### `useClassroom.js`
- `activeClass`: The currently selected class record.
- `students`: Reactive map of students for the active class.
- `behaviorCodes`: Array of available logging codes.
- `gridSize`: `{ rows, cols }` driving the seating chart layout.
- `suggestedClass`: Time-based recommendation for the next class switch.
- `isTestDay`: Boolean toggle for marking absences as test-related.
- `thresholds`: Configuration for behavioral warning dots.
- `studentWeeklyStats`: Aggregate metrics for students in the active class.
- `dismissedSuggestions`: Daily tracking of hidden class switch banners.

### `useRadial.js`
- `isOpen`: Controls menu visibility.
- `targetStudent`: The student receiving the event.
- `visibleItems`: Current slice of codes/categories being displayed.
- `pendingNoteCode`: Triggers the specific Modal (`EventNoteModal` or `AssessmentConversationModal`).
- `noteModalOpen`: Boolean controlling the Note modal UI.

### `useStudentDossier.js`
- `selectedStudentId`: Current student being analyzed in the Reports view.
- `events`: Filtered list of events for the selected student and period.
- `stats`: Computed metrics (Absence count, test-day absences, washroom avg per trip, etc.).
- `assessmentEvents`: Dedicated reactive feed for `ac` code events.
- `noteEvents`: General notes feed (`note`, `pc`).

## 5. File Inventory

| File | Responsibility |
| :--- | :--- |
| `src/main.js` | App entry, storage persistence, and PWA dev kill-switch. |
| `src/App.vue` | Root shell, navigation logic, and global Quick Sync indicator. |
| `src/styles/main.css` | Design system: colors, typography, shadows, and base layout. |
| `src/views/Dashboard.vue` | View A: Active instruction, seating grid, and radial menu logging. |
| `src/views/Setup.vue` | View B: Administrative hub for classes, rosters, and custom codes. |
| `src/views/Reports.vue` | View C: Reporting dashboard, backup utilities, and student dossiers. |
| `src/composables/*` | Logic layers: `useClassroom`, `useRadial`, `useUndo`, `useStudentDossier`. |
| `src/db/index.js` | Database initialization and migration logic (V1 -> V10). |
| `src/db/*Service.js` | IDB APIs: `classService`, `eventService`, `settingsService`. |
| `src/components/DeskTile.vue` | Interactive seat representing student status, stats, and event feedback. |
| `src/components/RadialMenu.vue`| Circular UI for action selection and behavioral categorization. |
| `src/components/StudentProfile.vue`| Core dossier UI showing statistics, trends, and event logs. |
| `src/components/AssessmentConversationModal.vue`| collector for `acContext` and `acOutcome`. |
| `src/components/EventNoteModal.vue`| collector for observations/conversations with `[ob]`/`[cv]` tags. |
| `src/components/EditDurationModal.vue` | Specialized editor for correcting 'Late' or 'Washroom' durations. |
| `src/components/StudentProfileModal.vue` | Provides deep-dive record editing from the Dashboard grid. |
| `src/components/StudentTrendGraph.vue` | Chart.js wrapper for student behavioral trends over time. |
| `src/utils/icons.js` | Central resolver for mapping icon names to Lucide components. |

## 6. Component Specs (V3 Additions)
- **`AssessmentConversationModal.vue`**: 
    - *Purpose*: Specialized UI for capturing Assessment Conversations with Context and Outcome selectors.
    - *Emits*: `save({ note, acContext, acOutcome })`.
- **`EventNoteModal.vue`**:
    - *Update*: Now includes a toggle for Observation vs Conversation, automatically prefixing the note in IDB.
- **`StudentProfile.vue`**:
    - *Update*: Displays "On Test Days" absences and "X.Xmin/trip avg" for washroom usage.
- **`StudentProfileModal.vue`**: Provides deep-dive record editing from the Dashboard grid.
- **`EditDurationModal.vue`**: Specialized editor for correcting 'Late' or 'Washroom' durations.
