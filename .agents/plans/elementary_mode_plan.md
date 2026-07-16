# Elementary Mode — Design & Architecture Plan

> Last updated: 2026-07-15
> Status: **Stages 1 & 2 complete and verified.** Stage 3 is the active next step.
> Next step: Resolve open items below, then write the Stage 3 implementation plan and begin building.

---

## UI Mockups & Visual Design

The following high-fidelity mockups illustrate the visual layout and user experience proposed for elementary mode:

### 1. Radial Menu & Conference Modal Flow
Displays the circular radial menu for student quick notes and how it cascades into the conference details dialog (Subject, Strand, Expectation, Tags, Notes, Next Steps).
![Radial Menu & Conference Flow](/Users/kylestashuk/.gemini/antigravity-ide/brain/a9c73678-b53b-4357-9e6c-a22beb35a4fd/radial_menu_elementary_levels_1784162277755.png)

### 2. Subject Selector & Gradebook Header
Displays the horizontal subject navbar (Mathematics, Language, Science...) and strand-weighted headers ('Number Sense (35%)', etc.) above the spreadsheet grid.
![Subject Selector & Gradebook Header](/Users/kylestashuk/.gemini/antigravity-ide/brain/a9c73678-b53b-4357-9e6c-a22beb35a4fd/subject_selector_elementary_design_1784162287803.png)

### 3. Student Dossier Academics Tab (Expectation Progression View)
Displays the timeline representation for Ontario curriculum codes (e.g., 'B1.2'), showing a chronological path of descriptive tag badges (Needs Support, Developing, Mastered) with expandable comments and next steps.
![Student Dossier Academics Tab](/Users/kylestashuk/.gemini/antigravity-ide/brain/a9c73678-b53b-4357-9e6c-a22beb35a4fd/student_dossier_elementary_academics_1784162296624.png)

---

## Stage Completion Status

| Stage | Description | Status |
|---|---|---|
| Stage 1 | Extract sub-components from Grades.vue, Student360.vue, Setup.vue | ✅ Complete & verified |
| Stage 2 | Shared grade editing composable (`useGradeEditing.js`) | ✅ Complete & verified |
| Stage 3 | Elementary mode implementation | 🔲 Not started |

### What Was Built in Stages 1 & 2

| File | Type | Notes |
|---|---|---|
| `src/utils/gradeColors.js` | NEW | Centralised color/grade utilities |
| `src/components/GradesGrid.vue` | NEW | Extracted spreadsheet grid from `Grades.vue` |
| `src/components/GradesAnalyticsPanel.vue` | NEW | Extracted analytics/distribution panel from `Grades.vue` |
| `src/components/dossier/StudentAcademicsTab.vue` | NEW | Extracted academics tab from `Student360.vue` |
| `src/components/setup/AssessmentFrameworkSettings.vue` | NEW | Extracted framework/category/template cards from `Setup.vue` |
| `src/composables/useGradeEditing.js` | NEW | Shared composable for all cell editing, context menus, attempt popovers |
| `src/views/Grades.vue` | MODIFIED | Now a thin coordinator mounting GradesGrid + GradesAnalyticsPanel |
| `src/components/dossier/Student360.vue` | MODIFIED | Now mounts StudentAcademicsTab for the academics pane |
| `src/views/Setup.vue` | MODIFIED | Now mounts AssessmentFrameworkSettings |
| `src/composables/useGradebook.js` | MODIFIED | Added shared sort/display refs |

**All 35+ grid verification checkpoints passed** (cell editing, arrow-key navigation, context menus, attempt history, sort/filter, privacy mode, print modal, etc.)

**Post-refactor bugs fixed:**
- Context menu emoji regression → restored Lucide icons matching production
- Arrow-key navigation was saving `0` to history → fixed `editInput` DOM ref detection
- Column header three-dot menu throwing `getAdjustedPosition is not defined` → added missing destructure
- Mark Missing / Mark Excluded passing `MouseEvent` as IDB key → sanitised parameter types
- Dossier right-click "Delete Assessment" exposed for class-wide tasks → now hidden; "Clear Mark" added instead
- Template application allowed on classes with existing assessments → now blocked with clear warning

---

## What Elementary Mode Is

A separate operating mode for homeroom elementary teachers. Unlike secondary mode (one teacher, many separate classes by period/subject), an elementary teacher has **one class of students** they teach across **multiple subjects**.

The mode is set at **class creation time** and is locked permanently — it cannot be changed after assessments exist.

---

## Key Structural Differences vs. Secondary Mode

| Concept | Secondary | Elementary |
|---|---|---|
| Class structure | One class per period/subject | One homeroom, many subjects |
| Subjects | Implicit (the class IS the subject) | Explicit: Math, Language, Science, etc. |
| Grading categories | Weighted categories (Test 60%, etc.) | Weighted strands within each subject |
| Assessment grid | One grid per class | Grid filtered by selected subject |
| CSV import | Groups rows by period → creates separate classes | One class created; students imported; default subjects auto-created |
| Class picker | Same (teacher may have >1 homeroom) | Same |

---

## Data Model — Unified Event Schema

Instead of creating entirely parallel database tables and services, we will extend the existing **`events`** object store in IndexedDB. This leverages the application's existing querying, reports syncing, and undo/redo pipelines, making it completely backwards-compatible with secondary mode.

### 1. New Entity Framework (Elementary Setup)
These are teacher-configured per class and stored in IndexedDB:

#### `subjects`
```
subjectId   — UUID
classId     — FK to class
name        — e.g. "Math", "Language", "Science"
order       — display sort order
```

#### `strands`
```
strandId    — UUID
subjectId   — FK to subject
name        — e.g. "Number Sense", "Algebra", "Data Literacy"
order       — display sort order
weight      — percentage weight within subject grade (strands replace categories)
```

#### `expectations`
```
expectationId  — UUID
strandId       — FK to strand
code           — Ontario curriculum code, e.g. "B1.2" (teacher-created)
description    — plain text, e.g. "use mental math strategies for addition..."
```

### 2. Extended Event Schema (`events` Store)
Assessment observations and conversations (logged with `code: 'ac'`) will be saved in the standard `events` table with the following optional metadata fields:

```
eventId        — UUID
studentId      — FK to student
classId        — FK to class
code           — 'ac' (Assessment event)
note           — free text (optional detailed details)
testDay        — boolean
date           — ISO date string
acType         — 'observation' | 'conversation'
acContext      — 'after_assessment' | 'proactive' (Secondary only)
acOutcome      — 'demonstrates_understanding' | 'gap_confirmed' | 'inconclusive' (Secondary only)

[NEW EXTENSIONS FOR ELEMENTARY & INTEGRATED EXPECTATIONS]
subjectId      — FK to subject (optional in Secondary, required in Elementary)
strandId       — FK to strand (optional)
expectationId  — FK to expectation (optional)
tags[]         — string array (stores e.g. 'needs-support', 'developing', 'mastered', 'misconception', 'independent')
nextSteps      — free text (optional next steps note)
```

**Observation Tag Vocabulary:**
- `needs-support` (soft red)
- `developing` (amber)
- `mastered` (emerald)
- `misconception` (orange)
- `independent` (blue)

**Observation Specificity Levels:**
- Subject only — general comment for a subject
- Subject + Strand — strand-level observation, no specific expectation
- Subject + Strand + Expectation — tied to a specific Ontario curriculum code

All entries remain strictly descriptive and do not map to numeric grades or calculations.

---

## Conference & Observation Entry Flow (UI)

### 1. Unified Entry Point
Instead of creating a brand-new component, we will make the existing **`AssessmentConversationModal.vue`** mode-aware. This modal is triggered when the "Assessment" option is selected from the quick-action radial menu (or other dashboard layouts) when clicking on a student name.

### 2. Mode-Aware UI Fields

#### Secondary Mode
Remains identical to the current design:
- **Evidence Type**: Observation vs Conversation toggles
- **Context**: After Assessment vs Proactive toggles
- **Outcome**: Demonstrates Understanding vs Gap Confirmed vs Inconclusive toggles
- **Details Textarea**: Simple note input

#### Elementary Mode (New Unified Flow)
- **Evidence Type**: Observation vs Conversation toggles (retained at the top)
- **Cascading Dropdowns**:
  - **Subject** — required selection (populated by class subjects)
  - **Strand** — optional selection (appears once a subject is selected; filters strands)
  - **Expectation** — optional selection (appears once a strand is selected; filters curriculum codes/descriptions)
- **Descriptive Outcome Tags**: Replaces the default Secondary outcome buttons with a horizontal row of multi-select chips representing the descriptive tags (*Needs Support*, *Developing*, *Mastered*, *Misconception*, *Independent*).
- **Details Textarea**: Main note input (labeled "Observation Details" or "Conversation Details")
- **Next Steps Textarea**: New optional text input for recording feedback and future actions

If the teacher only wants to record a quick note for a subject, they can select the subject, type the note, and press save. All other cascading fields and next steps are optional.

---

## Dossier Display — Progression View

### 1. Presentation Structure
In **Secondary Mode**, observations and conversations collected via the "Assessment" button are displayed as a flat, chronological list under the "Observations & Conversations" section at the bottom of the dossier Academics tab.

In **Elementary Mode**, this flat list is replaced entirely by a structured **Expectation Progression View** that lives inline on the Academics tab. Because each observation note can be tagged with a Subject, Strand, or Expectation, they are dynamically grouped under their respective headers:

```
Math
  Number Sense (Strand)
    B1.2 — Addition strategies (Expectation)
      Nov 3  [needs-support]   "Still counting on fingers"
      Nov 14 [developing]      "Beginning to use partial sums"
      Dec 2  [mastered]        "Consistent with 3-digit addition"
    General Strand Notes (Strand-level comment, no specific expectation)
      Nov 20 [developing]      "Good number sense overall"
  Algebra (Strand)
    General Strand Notes
      Dec 5  []                "Participated well in patterning activity"
  General Subject Notes (Subject-level comment, no strand or expectation)
    Oct 15 []                  "Excellent focus during math period"

Language
  General Subject Notes (Subject-level comment, no strand or expectation)
    Oct 30 []                  "Strong oral communicator"
```

*   **Timelines**: Multiple entries for the same expectation display as a horizontal/chronological trail of tag badges. Clicking an entry expands its card to show the comment details and next steps.
*   **General Notes**: General comments that lack a specific expectation or strand are placed under a "General Strand Notes" or "General Subject Notes" section within the hierarchy so they are never lost.

### 2. Filtering & Sorting in the Dossier
- **Subject Selector**: A dropdown or horizontal tabs at the top allows the teacher to filter the Academics tab to a single subject (e.g. Mathematics).
- **Grouping**: Group/expand items by strand or expectation.
- **Sort Order**: Sort entries chronologically (default) or by expectation code.

---

## Grading in Elementary Mode

Assessments still exist — a teacher can create and grade assignments. The differences are:

- Assessments belong to a **subject** (not just a class)
- Assessment categories are replaced by **strands**, weighted within the subject
- The grade grid filters by the selected subject (`selectedSubjectId` ref)
- Grade calculations run per-subject, using that subject's strands as the weighting structure

The `gradebookService.calculateClassGrades` engine is **unchanged**. `useGradebook.js` is updated to:
1. Filter assessments by `subjectId` before passing them to the engine
2. Use the subject's strands as the "categories" parameter
3. Store results keyed by subject: `{ [studentId]: { [subjectId]: { overallGrade, strandResults, ... } } }`
4. Expose a `selectedSubjectId` ref for the active grid view

---

## Files That Need Mode-Aware Changes — Stage 3 Surface Inventory

> Sourced from `implementation_plan.md` Stage 3. No code is written in this stage — this is a reference for the future implementation plan.

---

### 3.A — CSV Import Branching

**Current location:** `Setup.vue` lines 1767–1900 (`onFileSelected`), `useClassroom.js` lines 710–780 (`importRoster`)

**What changes for elementary:**
- **Secondary (current):** CSV rows are grouped by `year-semester-periodNumber`. Each group becomes a separate class with its own roster.
- **Elementary:** The same CSV creates **one homeroom class**. All students go into that single class. Default subjects (Mathematics, Science, Language, Social Studies, etc.) are auto-created for the class. No period-based grouping.

The parsing stage (PapaParse, header mapping, student field extraction) is **identical** for both modes. The grouping/creation stage is completely different.

**Approach:** The grouping logic inside `onFileSelected` needs a mode branch. The `importRoster` function in `useClassroom.js` stays unchanged — it imports students into a class regardless of mode.

---

### 3.B — `AddAssessmentModal.vue` Subject/Strand Fields

**Current location:** `src/components/dossier/AddAssessmentModal.vue` (231 lines)

**What changes for elementary:**
- Lines 52–57: The "Category" dropdown currently shows `activeClassRecord.gradebookCategories`
- In elementary mode this becomes a **two-step selection**: first pick the Subject, then pick the Strand within that subject

**Approach:** `v-if="isElementaryClass"` branches within the existing modal. Not a parallel component — the modal is mounted globally in `App.vue` and ~80% of the form (name, description, type, date, points, unit, retest policy) is identical between modes.

---

### 3.C — `useGradebook.js` Data Shape Changes

**Current:** `classGrades` ref holds `{ [studentId]: { overallGrade, categoryResults, mostConsistent, median, ... } }`

**Elementary:** Each student has grades per subject. Ref shape becomes `{ [studentId]: { [subjectId]: { overallGrade, strandResults, ... } } }` — or maintain a `selectedSubjectId` ref and recalculate when the subject changes.

**The calculation engine** (`gradebookService.calculateClassGrades`) **does not change** — it takes categories/strands and assessments and produces weighted averages. `useGradebook.js` needs to:
1. Filter assessments by `subjectId` before passing them to the engine
2. Use the subject's strands as the "categories" parameter
3. Store results keyed by subject

**Also needs:**
- `selectedSubjectId` ref — which subject is actively displayed in the grid
- `subjects` ref — list of subjects for the active class
- Subject CRUD functions (`addSubject`, `removeSubject`, `updateSubject`)

---

### 3.D — `createClass` Mode Parameter

**Current location:** `useClassroom.js` line 620

**What changes:** Accept `opts.mode` parameter (`'secondary'` | `'elementary'`). Store it on the class record. When mode is `elementary`:
- Don't create default high-school categories (Assessments 60%, Activities 10%, etc.)
- Instead, create default subjects with default strands (or leave empty for teacher to configure)
- Mode is **locked** at creation time — cannot be changed after the class has assessments

---

### 3.E — `subjectService.js` (New File)

A new IDB store and service for subject CRUD operations.

**Data model:**
```js
{
  subjectId: 'sub_...',
  classId: 'cls_...',
  name: 'Mathematics',
  order: 1,
  strands: [
    { strandId: 'str_...', name: 'Number Sense', weight: 25 },
    { strandId: 'str_...', name: 'Algebra', weight: 25 },
    { strandId: 'str_...', name: 'Geometry', weight: 25 },
    { strandId: 'str_...', name: 'Data Management', weight: 25 }
  ]
}
```

**IDB migration:** Adds `subjects` and `expectations` object stores. This is migration v28 (currently at v27).

Note: We do NOT need a new store for conference entries. Because we extended the existing `events` store schema, those entries save straight into the standard events database.

---

### 3.F — Settings Toggle

A global setting in `settingsService.js` controls the default mode for newly created classes. The toggle lives in a new "App Preferences" section in `Setup.vue`.

**Behavior:** Changing the toggle does NOT affect existing classes. It only sets the default for the "Create Single Class" form and the CSV import behavior.

---

### 3.G — `PrintGradesGridModal.vue`

**Current location:** `src/components/PrintGradesGridModal.vue` (231 lines)

In elementary mode, the print layout needs to show the subject name in the header and group columns by strand. Decision deferred: parallel component (`PrintGradesGridModalElementary.vue`) or conditional sections — to be decided during implementation.

---

### 3.H — `ProgressReport.vue`

**Current location:** `src/components/dossier/ProgressReport.vue` (577 lines)

Includes category averages and grade breakdowns. In elementary mode it would need to show per-subject/per-strand performance. `AttendanceActivityReport.vue` is attendance-focused and mode-agnostic — no changes needed there.

Decision deferred to the elementary implementation plan.

---

### 3.I — New & Modified Files for Elementary Framework

Updated from planning session 2026-07-16:

| File | Change | Purpose |
|---|---|---|
| `src/db/subjectService.js` | NEW | CRUD for subjects, strands, and expectations (Ontario codes) |
| `src/components/AssessmentConversationModal.vue` | MODIFIED | Unified, mode-aware modal supporting both Secondary context/outcomes and Elementary subject/strand/expectation/tags/next-steps |

---

## Integration Surface (When Complete)

```
Grades.vue:
  <GradesGrid v-if="!isElementaryClass" ... />
  <GradesGridElementary v-else ... />

  <GradesAnalyticsPanel v-if="!isElementaryClass" ... />
  <GradesAnalyticsPanelElementary v-else ... />

Student360.vue:
  <StudentAcademicsTab v-if="!isElementaryClass" ... />
  <StudentAcademicsTabElementary v-else ... />

Setup.vue:
  <AssessmentFrameworkSettings v-if="!isElementaryClass" />
  <AssessmentFrameworkSettingsElementary v-else />
```

Each elementary component imports `useGradeEditing` for the shared interaction logic and renders its own mode-specific UI (strand grouping, subject picker, conference entry fields). The secondary components are never touched again.

---

## Decisions Made

- [x] Mode locked at class creation time
- [x] The class picker stays the same (teacher may have >1 homeroom)
- [x] Dashboard/attendance/behaviour data is subject-independent — unchanged
- [x] Expectations are teacher-created with Ontario-style codes (no pre-loaded curriculum data for now)
- [x] Conference entries are strictly descriptive — no numeric grade mapping
- [x] Subject is required; strand and expectation are both optional
- [x] A general subject-level comment with no strand or expectation is valid
- [x] **Unified Database**: Conference/observation entries are saved directly inside the existing `events` object store in IndexedDB under code `ac` with extended schema fields, rather than creating a parallel collection.
- [x] **Unified Modal**: `AssessmentConversationModal.vue` is unified and made mode-aware to handle both secondary and elementary layouts dynamically.
- [x] The "Assessment" sidebar radio button is reused as the conference entry point
- [x] **Default Subjects & Strands**: Newly created elementary classes (via creation form or CSV import) will auto-seed with standard Ontario-aligned core courses and strands:
  *   **Language**: Reading, Writing, Oral Communication, Media Literacy
  *   **Math**: Number Sense, Algebra, Spatial Sense, Data Literacy, Financial Literacy
  *   **Science**: Life Systems, Matter and Energy, Structures and Mechanisms, Earth and Space Systems
  *   **History**: Heritage and Identity, People and Environments
  *   **Geography**: Physical Geography, Human Geography

## Open Items (resolve before implementation)

- [ ] Which other sidebar radio buttons change in elementary mode? (e.g. "On Device")
- [ ] Is AI-suggested next steps in scope for V1 or a stretch goal?
- [ ] Design the Setup UI for managing subjects, strands, and expectations in elementary mode
