# Application State Summary (v1)

## 1. App Overview
**What the app does:**
Classroom Tracker is a web-based educational tool designed to help teachers manage their classrooms. It provides a visual seating chart interface where teachers can track student attendance (absences and lates), monitor out-of-room status (e.g., washroom breaks), and log specific student behaviors or interactions (e.g., participation, device usage, parent communication, custom notes). It also generates aggregate reports and individual student dossiers based on the logged event data.

**How it is distributed and accessed:**
It is a client-side Web Application designed to be run in a modern browser. It is fully offline-capable once loaded, utilizing the browser's native IndexedDB caching for all data persistence, ensuring that student data remains on the device. It contains Service Worker infrastructure for Progressive Web App (PWA) deployment to enable local installation, although the aggressive caching worker is intentionally unregistered in development.

## 2. Tech Stack
The following dependencies define the core technology stack:
* **vue** (^3.5.13) - The core JavaScript framework used for building the reactive user interface and managing components.
* **lucide-vue-next** (^0.475.0) - A consistently styled open-source icon library used for UI elements and customizable behavior event icons.
* **papaparse** (^5.5.2) - A robust CSV parsing library heavily utilized in the 'Setup' view for securely importing multiple student roster rows from CSV files.
* **idb** (^8.0.2) - A lightweight Promise-based wrapper over the native IndexedDB API used for resolving database transactions locally.

Note: Additional build tool dependencies such as Vite are used heavily to manage the local asset bundling structure.

## 3. Database
**Current DB_VERSION:** 6

**Object Stores, Keys, and Fields:**

* **`settings`** (Key: `'singleton'`)
  * `schemaVersion`: tracks the schema/migration number.
  * `gridSize`: an object `{ rows, cols }` representing the seating chart dimensions.
  * `behaviorCodes`: a map of behavior event structures controlling available codes.
  * `backupFileHandle`: stores a resilient File System handler for local cloud syncs.

* **`classes`** (KeyPath: `'classId'`)
  * `classId`: unique identifier for the class.
  * `name`: class name for display.
  * `periodNumber`: assigned period numeric tag.
  * `periodStartTime`: expected start time of the period formatted as a string.
  * `students`: a dictionary mapping student IDs to their subset details:
    * `studentId`, `firstName`, `lastName`, `generalNote`, and `seat` (`{ row, col }` object).
  * `archived`: boolean hiding the class from default views.
  * `archivedAt`, `createdAt`, `updatedAt`, `lastUsedAt`: metadata timestamps.

* **`events`** (KeyPath: `'eventId'` - AutoIncrement)
  * `eventId`: numeric primary key.
  * `studentId`: explicit ID of the target student.
  * `classId`: current active class context tag.
  * `code`: shorthand matching a behavior configured in settings.
  * `category`: semantic group representing the overarching concept (e.g., 'neutral', 'attendance').
  * `type`: actioning mechanic ('standard', 'toggle', 'attendance').
  * `timestamp`: ISO-8601 formatting indicating event creation.
  * `periodNumber`, `dayOfWeek`: automated extraction of schedule timings.
  * `duration`: calculation of open-close times applied for 'toggle' behaviors and extended late tags.
  * `note`: custom written user commentary required for particular codes.
  * `supersededAbsent`: boolean tracking late overrides over absences.

**Indexes (on `events` store):**
* `by_studentId`, `by_classId`, `by_periodNumber`, `by_dayOfWeek`, `by_timestamp`, `by_category`

**Migration Summaries (v1 through current v6):**
* **v0 (Fresh Install):** Seeds default singleton configuration properties with standard basic behavior codes.
* **v1:** Scaffolds the fundamental `settings`, `classes`, and `events` (with 6 fundamental indexes) structure.
* **v2-v5:** Initial logic paths executing legacy features, previously hampered by unhandled promise wrappers failing sequentially to register schema transitions safely.
* **v6:** The sweeping consolidated recovery block containing asynchronous await steps mapping out previously attempted modifications including:
  * Initializing missing `generalNote` string descriptors directly inside individual pre-existing student assignments.
  * Populating missing `requiresNote` boolean properties for pre-existing behavior codes.
  * Instantiating specific newer codes natively ('ob', 'cv', 'pc').
  * Translating legacy hardcoded emoji representations exclusively directly mapped over to standard respective 'Lucide' string equivalents.
  * Inferring logical `isTopLevel` toggles automatically routing directly mapped groupings to the main contextual action overlay.

## 4. File Structure
**Files in `src/`:**
* `App.vue` - Root layout wrapper that manages the main router-less navigation and syncing visual indicator.
* `main.js` - Application entry point mounting Vue directly to the DOM and issuing local persistent storage permissions.
* `components/ClassSwitcher.vue` - Selector module dedicated to changing the primary global class context variable.
* `components/DeskTile.vue` - Physical representation of a discrete seating configuration and drop-target listener for assigned student placement.
* `components/EventNoteModal.vue` - Dialogue overlay requesting supplementary free-text logging for marked behavior events.
* `components/RadialMenu.vue` - The circular modular action context overlay presented when selecting a `DeskTile`.
* `components/SeatingGrid.vue` - Iteration container laying out dynamic dimensions for tracking seating configurations.
* `components/StudentProfile.vue` - Visual breakdown rendering a single student's event history data into structured feeds and graphs.
* `components/StudentTrendGraph.vue` - Period-aware line/bar chart rendering weekly behavior frequency trends on the student dossier.
* `components/StudentProfileModal.vue` - Pop-up overlay encapsulating `StudentProfile.vue` logic specifically for contextual preview contexts during active instructional dashboard states.
* `components/UndoButton.vue` - Contextual action resolving reversal closures tracked across the latest instructional session.
* `composables/useClassroom.js` - Unified state manager syncing interactions surrounding classes, active selection variables, and live event tracking onto service objects.
* `composables/useRadial.js` - Standalone interface specifically parsing layout dimensions, toggles, and targeted behaviors operating inside the dynamic popup.
* `composables/useStudentDossier.js` - Dedicated fetch manager abstracting data lookup operations isolated to single-targeted query history lookups utilized in reports.
* `composables/useUndo.js` - Reversible history tracker executing function closures appended dynamically after discrete mutation interactions occur.
* `db/index.js` - Sole initializer instantiating the core generic IDB schema upgrades.
* `db/classService.js` - Extracted handler performing all standard class-oriented CRUD requests directly onto IndexedDB.
* `db/eventService.js` - Extracted handler isolating event logging workflows, queries, and bulk file-system exports resolving onto IndexedDB.
* `db/settingsService.js` - Intermediary bridging single configurations into unified mapped structures parsed through IndexedDB.
* `styles/main.css` - Native vanilla stylesheet mapping overarching system tokens enforcing structural IOS-aesthetic spacing and variable mappings.
* `utils/icons.js` - Export map specifically resolving dynamic strings against static bundled `lucide-vue-next` component exports.
* `views/Dashboard.vue` - Primary active interface orchestrating unified seating pools and functional menu interactions for instructional monitoring.
* `views/Reports.vue` - Cross-referenced reporting workspace evaluating event occurrences filtered by class ranges and focused student histories.
* `views/Setup.vue` - Comprehensive adjustment terminal dictating layout dimensions, importing legacy data frameworks, and modifying custom tracker capabilities.

## 5. Feature Inventory
* **Class Configuration:** Tracking individual classes capable of renaming, shifting starting periods, archiving to declutter interfaces, and resolving bulk deletion protocols safely.
* **Bulk Roster Imports:** Parsing standard formatted CSV exports to dynamically construct localized independent datasets while highlighting mapping anomalies securely.
* **Seating Layout Dynamics:** Real-time drag-and-drop structural interactions manipulating physical arrays storing specific student associations inside custom bounding layouts.
* **Contextual Log Actions:** A cascading circular interface capable of parsing standardized log variants such as tardiness counters or complex toggled out-of-facility washroom breaks accurately.
* **Granular Feed Profiling:** Detailed student dossiers capable of visualizing frequency models isolating explicitly logged behaviors tracked per specific date constraints safely.
* **Export Workflows:** Localised bulk JSON configuration exporting completely untied to standard local-storage variables ensuring transparent user backups reliably.
* **Reverse History Memory:** Short-term cache manipulation permitting real-time UI reversion reversing immediate specific action sequences smoothly.
* **Behavior Modularization:** Flexible custom configuration dynamically adjusting categorized behaviors specifically assigning whether detailed written insights are explicitly required seamlessly.

## 6. Known Limitations or Incomplete Items
* **Service Worker Isolation:** True PWA standalone installations are currently halted deliberately avoiding aggressive edge-case caching while the foundational iteration stabilises natively on standard browser loading contexts.
* **Roster Duplication Protocols:** Importing student structures directly matching legacy identifiers currently demands manual workflow choices determining targeted overwrite scenarios explicitly.
* **Drag Operation Handlers:** Direct grid assignments rely inherently on standard HTML DOM event data transfers operating optimally on designated desktop click interactions, introducing known usability ceilings directly inside pure-touch mobile layouts realistically lacking complex native cursor bridging equivalents optimally.
* **Live Quick Sync Limits:** Native automated file backups bind closely against browser file handling APIs operating conditionally across shifting browser standards restricting fully native universal platform support globally seamlessly.

## 7. Data Flow
* **Action Context:** The user performs an overarching gesture like interacting immediately with a student's assigned `DeskTile.vue` layout.
* **Component Render:** The click immediately relays specific dimensional viewport states towards the central `useRadial.js` composable mapping physical overlay origins efficiently.
* **Logical Resolution:** The user confirms an interaction trigger prompting `useClassroom.js` composable execution determining valid mapping structures preparing standard logging formats cleanly.
* **Service Transmission:** Validated structures bind internally mapping explicit parameters like explicit string descriptions parsing sequentially over towards `eventService.js` effectively explicitly updating real-time unsynced boolean notifications explicitly natively tracking external data statuses simply.
* **Database Commitment:** The IndexedDB `idb` abstraction validates transactions updating explicitly mapped relational stores reflecting structural modifications universally across dynamically reactive localized component properties.

## 8. Current Default Behavior Codes
* **Participation (`p`):** Mapped dynamically against 'positive' standard interactions, operating natively without explicit notes cleanly. Menu Pinned: `False`.
* **On Device (`m`):** Tagged explicitly against direct 'redirect' contexts tracking standard disruptions uniformly tracking base associations clearly. Menu Pinned: `True`.
* **Washroom (`w`):** Operates distinctly capturing native 'toggle' states tracking active missing elapsed period interactions mapped as 'neutral' seamlessly. Menu Pinned: `True`.
* **Absent (`a`):** Singular explicitly formatted 'attendance' context determining default omission calculations reliably completely. Menu Pinned: `False`.
* **Late (`l`):** Native 'attendance' duration marker calculating delayed arrival intervals frequently. Menu Pinned: `False`.
* **Observation (`ob`):** Custom standard 'note' tag natively demanding written insights parsing specific specific targeted data contextually securely. Menu Pinned: `False`.
* **Conversation (`cv`):** Contextually assigned standard 'note' tag additionally guaranteeing written insight logging accurately reliably. Menu Pinned: `False`.
* **Parent (`pc`):** 'Communication' tag targeted directly onto parent workflows necessitating detailed context insights explicitly natively cleanly. Menu Pinned: `True`.
