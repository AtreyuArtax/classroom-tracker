# Option C — Complete Build Inventory

> What's new, what's modified, what's untouched.
> July 2026 — No code.

---

## The Calculations Question — Direct Answer

**You do not need a new calculations file.**

Here's why: a subject's strands are structurally identical to the class's current categories. Both are an array of items with an ID, a name, and an optional weight. The calculation engine doesn't know or care whether it's receiving "Assessments 60%" or "Number 30%." The math is the same.

The only change to the calculation layer is a single new filter step before the calculation runs: *"when loading assessments for this class, only include assessments that belong to this subject."* That one addition — filtering by `subjectId` — is the entire change to how grades get calculated. The weighted average, the most-consistent logic, the trend analysis, the analytics — all of that runs exactly as it does today, just on a subject-scoped set of assessments instead of a class-wide set.

So: no new file, but small targeted additions to the existing calculation service.

---

## The Two-Picker System

You correctly identified that dropdowns change — but it's important to be precise about which ones and where.

**Picker 1 — The class picker (exists today, unchanged)**
The dropdown in the top nav that lets you switch between your classes. For an elementary teacher with one homeroom, they still pick their homeroom here. This picker doesn't change at all.

**Picker 2 — The subject picker (NEW, lives inside Grades and Setup)**
A new dropdown or tab bar that appears *within* the Grades view and the Setup tab when the active class is elementary mode. This lets the teacher switch between Math, Language, Science, etc. without leaving their class.

The mental model is: *Class Picker selects your homeroom. Subject Picker selects which gradebook within that homeroom you're working in.*

---

## What's Brand New (Doesn't Exist Today)

### 1. The `subjects` IDB Store
A new database table. Each subject record stores: a unique ID, the class it belongs to, its name (e.g., "Mathematics"), and its list of strands (same shape as today's `gradebookCategories` — name, ID, weight). This is the heart of Option C.

### 2. `src/db/subjectService.js`
A new service file to read and write from the subjects store. Mirrors the pattern of the existing `classService.js` and `settingsService.js`. Functions for: create a subject, get all subjects for a class, update a subject's strands, delete a subject and its assessments.

### 3. A Subject Picker UI Component
A small dropdown or tab row that appears in the Grades view header (and in the Setup tab) when the active class is elementary mode. Lets the teacher click between their subjects. When the selection changes, the gradebook grid reloads for that subject.

### 4. Subject Management UI in Setup
Within the existing Setup page's "Grading & Assessments" section, elementary classes show a completely different interface:
- A list of the class's subjects (e.g., Mathematics, Language, Science and Technology)
- Ability to add a new subject (with Ontario curriculum strand presets that auto-fill)
- For each subject: edit its strands and their weights, same controls as current categories

### 5. Ontario Curriculum Strand Presets
A simple lookup table (a static data file, not a database entry) that maps common elementary subject names to their Ontario strands. When a teacher adds "Mathematics" as a subject, the strands pre-fill as Number, Algebra, Spatial Sense, Data Literacy, Financial Literacy. They can edit freely. This saves setup time and reduces errors.

### 6. v28 IDB Migration
A migration that runs when the app updates. It:
- Creates the new `subjects` store
- Adds a `mode: 'secondary'` field to every existing class record (so all current data is untouched in secondary mode)
- Adds a nullable `subjectId` field to every existing assessment record (null for all existing secondary assessments, meaning "no subject, belongs to the class directly")

---

## What's Modified (Exists, Needs Updating)

### `src/db/index.js`
Add the new `subjects` object store with appropriate indexes. Add the v28 migration described above. This file is already the home for all schema changes — this fits naturally.

### `src/db/gradebookService.js`
The existing calculation service. Specific additions:
- `getAssessmentsByClass()` gets an optional `subjectId` parameter. When provided, it adds a filter to only return assessments for that subject. Existing secondary calls pass nothing and get unchanged behavior.
- `calculateStudentGrade()`, `calculateClassGrades()`, `calculateClassAnalytics()` — these currently receive a `classRecord` and pull `gradebookCategories` from it. For elementary, they instead receive a `subject` record and pull its strands. The math inside does not change. The strands serve the same purpose as categories.

**The existing secondary calculation path is completely unaffected.** It still reads `gradebookCategories` off the class record. Elementary classes have no `gradebookCategories` on their class record — their strands live on their subjects. The two paths don't touch each other.

### `src/composables/useGradebook.js`
The reactive bridge between the UI and the calculation service. Additions:
- A new reactive ref for the active subject (`activeSubject`)
- A function to load subjects for the current class
- A function to switch the active subject (clears the current gradebook state and reloads for the new subject)
- `loadGradebook()` updated to check the class mode: if elementary, load the active subject's strands and filter assessments by subjectId; if secondary, behavior is identical to today

### `src/views/Setup.vue`
The setup page. The "Assessment Framework" card (currently showing Categories with weights and Units) changes based on the class mode:

- **Secondary class (unchanged):** Shows exactly what it shows today — Categories with name and weight fields, Units list, Template management. Zero change for existing users.
- **Elementary class (new):** Shows a "Subjects & Strands" interface instead. The teacher sees their subjects listed. Clicking into a subject shows its strands (same name/weight interface as current categories). Buttons to add a new subject (with Ontario presets), rename, reorder, or delete subjects. The "Units" concept still works — units remain as lightweight tags on assessments and don't need to change.

The class creation flow in Setup also gains a mode selection step: when creating a new class, the teacher chooses Secondary or Elementary. Elementary is locked in at that point.

### `src/views/Grades.vue`
The main grades view. When the active class is elementary:
- The subject picker appears at the top of the view (the new component)
- The gradebook grid renders using the active subject's strands as its categories
- The column group headers show strand names (the same visual concept as today's category headers)
- The "Add Assessment" button opens the modal pre-loaded with the current subject's strands in the category picker
- Analytics tabs show strand-level data for the active subject

When the active class is secondary: nothing changes. The grades view renders exactly as it does today.

### `src/components/dossier/AddAssessmentModal.vue`
Currently reads `activeClassRecord.gradebookCategories` to populate the "Category" dropdown. For elementary classes, it reads the active subject's strands instead. The label changes from "Category" to "Strand." Everything else — name, type, date, total points, retest policy — stays the same.

### `src/components/dossier/Student360.vue`
The student dossier. Additions for elementary mode:
- A subject filter at the top of the Academics/Grades section — a dropdown with the class's subjects plus an "All Subjects" option
- When one subject is selected: shows that subject's strands and assessments for this student
- When "All Subjects" is selected: shows each subject as a collapsible section, with strands and assessments inside each
- The Summary tab's "overall grade" card changes: in elementary mode, shows a row of subject marks rather than one overall percentage
- All behavior, attendance, and event tabs are completely unchanged

### `src/components/StudentSidebar.vue`
The sidebar that shows students when you're in the Grades view. Currently shows an overall percentage next to each student's name. For elementary classes, this could either show the active subject's mark or be simplified — the exact treatment is a small design decision, but the change is minor.

### `src/components/PrintGradesGridModal.vue`
Currently prints the full grade grid for a class. For elementary classes: prints the grid for the active subject only (one subject per print). The strand headers appear in the print layout. A secondary class prints exactly as today.

### `src/views/Reports.vue`
The reports view is large and will need updating to understand subjects for elementary classes — filtering by subject when generating progress reports, showing subject-by-subject breakdowns. This is the most work of any single modified file, but the change is scoped to the reports rendered for elementary classes. Secondary reports are unchanged.

---

## What's Completely Untouched

These files and systems require zero changes:

| System | Why It's Untouched |
|---|---|
| Dashboard / Seating Chart | Subject-independent. Student positions, states, and the visual grid are class-level. |
| All behavior event recording | Phone incidents, washroom, notes — all class-level. No subject concept. |
| Attendance recording | Absences and lates belong to the class, not a subject. |
| Parent contact logging | Class-level. |
| RFID / QR Scanner | Scans identify a student in a class. No subject involved. |
| `eventService.js` | Handles all behavior and attendance events. No changes. |
| `classService.js` | Handles the class record and student roster. No changes (except mode field added via migration). |
| `settingsService.js` | Global settings — behavior codes, grade buckets, academic terms. No changes. |
| `useClassroom.js` | The student and class reactive state. Gains only a class creation mode flag; the bulk of it is untouched. |
| `App.vue` | Navigation, view switching, sync — unchanged. |
| CSS / design system | All visual tokens, animations, layout — unchanged. |
| The ClassSwitcher | Teachers still pick their homeroom class here. No changes needed. |
| Secondary mode (everything) | The entire existing app experience for secondary teachers is preserved exactly. |

---

## Build Summary

| Category | Count | Notes |
|---|---|---|
| **New files** | 3 | `subjectService.js`, subject picker component, Ontario strand presets data |
| **New IDB store** | 1 | `subjects` |
| **Modified files** | ~8 | `index.js`, `gradebookService.js`, `useGradebook.js`, `Setup.vue`, `Grades.vue`, `AddAssessmentModal.vue`, `Student360.vue`, `Reports.vue` |
| **Untouched files** | ~15+ | Everything related to dashboard, attendance, events, styling |

The key pattern throughout: every modified file follows the same logic. Check if the active class is elementary. If yes, use subject-scoped data. If no, do exactly what you do today. Secondary teachers never see a difference.

---

*Prepared July 2026.*
