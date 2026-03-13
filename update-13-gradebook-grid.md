# Update 13 — Class Gradebook Grid (V4)

## Prerequisite

Update 12 must be complete and verified. The Grades view shell must exist with working sidebar and class loading.

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/views/Grades.vue` — confirm current layout and placeholders
- `src/composables/useGradebook.js` — confirm `assessments`, `grades`, `gradeMap`, `classGrades`, `assessmentStats` are all available

---

## What This Update Does

Replaces the class gradebook placeholder with a full spreadsheet-style grid showing all students as rows and all assessments as columns, with heat map colouring, inline grade entry, and an Add Assessment modal.

---

## Step 1 — Grid layout

The grid renders when a class is loaded and no student is selected (`selectedStudentId === null`).

### Structure
```
[Add Assessment]  [raw | %]  [Class Avg: 74.2%]

Student Name    | Unit 1 Test | Quiz 1 | Assignment 1 | ... | Overall
                | /35         | /20    | /15          |     |
─────────────────────────────────────────────────────────────────────
Class Avg       | 28.4 (81%)  | 16.2   | 12.8         |     | 74.2%
─────────────────────────────────────────────────────────────────────
Henson, Jack    | 28          | 18     | 14           |     | 78.3%
Kashif, Ibrahim | 31          | 19     | 13           |     | 84.1%
Liu, Enoch      | 24          | 15     | 11           |     | 71.2%
```

### Column structure
- **First column:** Student name — frozen (sticky left), min-width 160px
- **Assessment columns:** One per assessment, sorted by date ascending, min-width 90px
- **Last column:** Overall grade — frozen (sticky right), min-width 80px
- **Header row:** Assessment name, clickable (opens Assessment View in Update 14)
- **Subheader row:** `/35` total points, `unit` tag if set, `assessmentType` badge
- **Class Avg row:** Computed average per assessment and overall, always visible below header

### Scrolling
- Horizontal scroll on the grid body
- Student name column sticky left: `position: sticky; left: 0; z-index: 2`
- Overall column sticky right: `position: sticky; right: 0; z-index: 2`
- Header row sticky top: `position: sticky; top: 0; z-index: 3`

---

## Step 2 — Grade cells

Each cell shows the student's grade for that assessment.

### Display modes
Toggle between raw and percentage in the header bar. Affects all cells simultaneously.

**Raw mode:** Shows `pointsEarned` resolved from attempts. e.g. `28`
**Percentage mode:** Shows percentage. e.g. `80%`

### Cell states
- **Empty (not entered):** blank cell, `--bg-secondary` subtle tint
- **Missing:** shows `M` in red `#ff3b30`, `--bg` with red tint
- **Excluded:** shows `EX` in `--text-secondary`, strikethrough, grey tint
- **Entered, single attempt:** shows score, heat map background
- **Entered, multiple attempts (retest):** shows score with a small dot indicator `•` — tooltip shows attempt history on hover

### Heat map (percentage basis)
Applied as background colour to entered grade cells:
```css
80%+    → background: #d4f0dd  (green tint)
70-79%  → background: #d0e8f5  (blue tint)
60-69%  → background: #fff3cd  (amber tint)
<60%    → background: #f8d7da  (red tint)
```
Colours are subtle — text must remain readable in all states.

---

## Step 3 — Inline grade entry

Clicking an empty or entered cell opens inline editing:

- The cell becomes an `<input type="number">` in place
- Min: 0, Max: assessment totalPoints
- On Enter or blur: save the grade via `useGradebook.enterGrade(assessmentId, studentId, value)`
- On Escape: cancel without saving
- Tab moves to the next student in the same assessment column (arrow down through the column)

**Right-click or long-press on a cell** opens a small context menu:
```
Enter Grade
Mark Missing
Mark Excluded
View Attempt History  (only if attempts > 1)
```

---

## Step 4 — Add Assessment modal

"Add Assessment" button in the grid header opens a modal.

### Fields
- **Name** (required text input)
- **Category** (required dropdown — populated from `activeClassRecord.gradebookCategories`)
- **Assessment Type** (required dropdown: Test, Quiz, Assignment, Lab, Other)
- **Unit** (optional text input — e.g. "Unit 3")
- **Date** (required date input — defaults to today)
- **Total Points** (required number input — min 1)
- **Scaled Total** (optional number input — placeholder "Leave blank to use raw points")
- **Retest Policy** (dropdown: Highest, Latest, Average, Manual — defaults to Highest)

### Behaviour
- Save calls `useGradebook.addAssessment(data)`
- New assessment column appears immediately in the grid
- Cancel dismisses with no action
- Escape key = cancel

### Assessment column header actions
Clicking an assessment name in the header opens an edit dropdown:
```
Edit Assessment Details
Delete Assessment
```

Delete requires confirmation: "Delete [name]? This will remove all grades for this assessment. This cannot be undone."

---

## Step 5 — Class statistics row

The "Class Avg" row below the header shows:
- Per assessment: `avg (percentage%)` — e.g. `28.4 (81%)`
- Overall: weighted class average
- Uses `assessmentStats` from `useGradebook`
- Styled distinctly from student rows — `--bg-secondary`, `font-weight: 600`

---

## Step 6 — Overall column

The rightmost sticky column shows each student's current overall weighted grade.

- Uses `classGrades[studentId].overallGrade` from `useGradebook`
- Heat map colour same as grade cells
- If `null` (no grades entered) show `—`
- If a milestone is selected, shows grade as of that milestone date

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Class with categories and assessments shows the grid correctly
- [ ] Student name column is sticky left, overall column is sticky right
- [ ] Horizontal scroll works with many assessments
- [ ] Raw/percentage toggle switches all cells simultaneously
- [ ] Empty cells are visually distinct from entered cells
- [ ] Clicking a cell opens inline number input
- [ ] Entering a grade saves correctly and updates the overall column
- [ ] Tab moves down through the assessment column
- [ ] Right-click context menu shows correct options
- [ ] "Mark Missing" sets M state in cell
- [ ] "Mark Excluded" sets EX state in cell
- [ ] Heat map colours apply correctly based on percentage
- [ ] Class Avg row shows correct statistics
- [ ] Add Assessment modal opens and saves correctly
- [ ] New assessment column appears immediately after adding
- [ ] Delete assessment removes column and all grades after confirmation
- [ ] Milestone toggle correctly filters assessments by date
- [ ] Retest indicator dot appears on cells with multiple attempts
