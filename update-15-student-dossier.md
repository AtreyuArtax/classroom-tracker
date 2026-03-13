# Update 15 — Student Gradebook Dossier (V4)

## Prerequisite

Updates 10-14 must be complete and verified.

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/views/Grades.vue` — confirm how `selectedStudentId` currently triggers the placeholder
- `src/composables/useGradebook.js` — confirm `classGrades`, `gradeMap`, `assessments` are available
- `src/db/eventService.js` — confirm `getEventsByStudent` exists and accepts filters

---

## What This Update Does

Replaces the student placeholder in the Grades view with a full individual student gradebook dossier. This is the primary view for reviewing a student's complete academic picture and is the foundation for the V5 AI report generation.

---

## Step 1 — Student dossier layout

When `selectedStudentId` is set, render the student dossier in the main panel.

### Header
```
← Back to Class Grid

Henson, Jack
Period 3 · 10 Science

Overall: 78.3%   [Midterm: 71.2%  →  Current: 78.3%  ↑]
```

The trend indicator only shows if milestones are defined. Arrow up (green) = improving, arrow down (red) = declining, dash = flat (within 2%).

Back button clears `selectedStudentId` and returns to grid.

---

## Step 2 — Grade breakdown by category

A row of stat cards, one per category:

```
[Tests: 74.8%]  [Quizzes: 82.3%]  [Assignments: 79.1%]
```

Each card shows:
- Category name
- Category percentage
- Heat map border-left colour (same scale as grid)
- If manually overridden: show override percentage with a small "override" badge and the override note on hover

Clicking a category card filters the assessment list below to show only that category.

---

## Step 3 — Assessment list

A table of all assessments for this class showing the student's performance:

```
Assessment          Type    Date      Score    %       
────────────────────────────────────────────────────
Unit 1 Test         Test    Sep 15    28/35    80%     ●
Quiz 1              Quiz    Sep 22    18/20    90%
Assignment 1        Asgn    Oct 1     14/15    93.3%
Unit 2 Test         Test    Oct 20    M        —       missing
Unit 3 Test         Test    Nov 5     31/35    88.6%   ● 2 attempts
```

- `●` indicator = retest exists, clicking opens attempt history (same modal as Update 14)
- `M` = missing, red
- `EX` = excluded, grey strikethrough
- Empty = not entered yet
- Sorted by date ascending
- Filterable by category (from clicking category card above)
- If a milestone is selected in the sidebar, assessments after the milestone date are greyed out

---

## Step 4 — Grade trend graph

A line graph (vue-chartjs `Line`) showing the student's cumulative weighted grade over time as assessments are added.

- X axis: assessment dates in order
- Y axis: cumulative overall grade after each assessment
- One line: running grade
- Reference lines at 80%, 70%, 60% (dotted, `--text-secondary`)
- Height: 180px
- If fewer than 3 assessments entered, show "Not enough data for trend" instead of graph

---

## Step 5 — Assessment Conversations section

Pull `ac` events for this student from the events store:

```js
const acEvents = await eventService.getEventsByStudent(studentId, { code: 'ac' })
```

Render identically to the Assessment Conversations section in Reports — same badges, same styling, same delete functionality. This is a read-only mirror of the same data.

Section heading: "Assessment Conversations" with `GraduationCap` icon.

If none: do not render the section.

---

## Step 6 — Attendance summary

A compact summary pulled from the events store:

```
Absences: 3  (1 on test days)
Lates: 2  (avg 8 min)
```

Same data as the Reports dossier stat cards, condensed to a single line for the Grades context. Clicking it navigates to `currentView = 'Reports'` and selects this student — so the teacher can see full attendance detail without rebuilding it here.

---

## Step 7 — Category override management

At the bottom of the category breakdown section, a small "Manage Overrides" disclosure:

When expanded, shows each category with:
```
Tests       Calculated: 74.8%    Override: [    ]%    Note: [         ]
```

If an override is set, the calculated grade shows in `--text-secondary` and the override is shown prominently.

Saving an override calls `classService.updateClass` to write `categoryOverrides` to the `studentObj`.

Clearing an override (leaving the field blank and saving) removes the override and returns to calculated grade.

---

## Step 8 — Gradebook notes for this student

A small textarea at the bottom — not the same as `generalNote` from the class record. This is a per-student gradebook-specific note field.

Add `gradebookNote: ''` to `studentObj` in the migration (add to `oldVersion < 11` block in `index.js` — the migration already touches all students so add this field there).

Saves on blur via `classService.updateClass`.

Placeholder: "Notes about this student's grades, accommodations, or grading decisions..."

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Clicking a student in the sidebar opens their dossier
- [ ] Back button returns to the class grid
- [ ] Overall grade displays correctly with milestone comparison if milestones exist
- [ ] Category cards show correct percentages with heat map colours
- [ ] Assessment list shows all assessments with correct scores and states
- [ ] Missing and excluded assessments display correctly
- [ ] Retest indicator opens attempt history modal
- [ ] Grade trend graph renders with 3+ assessments
- [ ] "Not enough data" message shows with fewer than 3 assessments
- [ ] Assessment Conversations section shows `ac` events correctly
- [ ] Section does not render if no `ac` events exist
- [ ] Attendance summary shows correct counts
- [ ] Clicking attendance summary navigates to Reports and selects the student
- [ ] Category override can be set, saved, and cleared
- [ ] Override badge shows on category card when override is active
- [ ] Student gradebook note saves on blur and persists
- [ ] Milestone selection in sidebar correctly filters assessments and recalculates grade
