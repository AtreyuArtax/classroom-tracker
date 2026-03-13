# Update 14 — Assessment Column View (V4)

## Prerequisite

Update 13 must be complete and verified. The class grid must exist with working assessment column headers.

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/views/Grades.vue` — confirm how the main panel currently switches between modes
- `src/composables/useGradebook.js` — confirm `gradeMap` and `enterGrade` are working

---

## What This Update Does

Clicking an assessment column header opens a focused "Assessment View" — a single assessment with all students listed and mark entry per student. Better for initial bulk entry after marking a set of tests.

---

## Step 1 — Assessment view panel

When an assessment header is clicked in the grid, set `selectedAssessmentId` ref in `Grades.vue` and render the Assessment View in the main panel instead of the grid.

Add a back button: `← Back to Class Grid` at the top of the panel. Clicking it clears `selectedAssessmentId` and returns to the grid.

### Layout
```
← Back to Class Grid

Unit 3 Test  ·  Tests  ·  /35  ·  Oct 15, 2026
[Edit Assessment]  [Delete Assessment]

Class Average: 28.4 / 35  (81.2%)
Entered: 24/30 students

Student              Score    %       Status
──────────────────────────────────────────────
Ahmad, Shazil        [28]     80%     ✓
Arevalo, Ximena      [  ]             not entered
Digiglio, Morgan     M                missing
Fortier, Alexei      EX               excluded
Gale, Ashlynn        [31] •   88.6%  2 attempts
```

### Score input column
- Number input, min 0, max totalPoints
- On Enter: save and move to next student
- On blur: save if changed
- Clicking `•` on a student with multiple attempts opens attempt history modal

### Status column
Derived automatically:
- Blank attempts → "not entered"
- `missing: true` → "missing" in red
- `excluded: true` → "excluded" in grey
- Attempts present → "✓" with attempt count if > 1

### Action buttons per row
A small dropdown per student row:
```
Mark Missing
Mark Excluded  
View Attempt History
Add New Attempt (retest)
```

"Add New Attempt" opens a small inline form:
```
New Attempt
Score: [  ] / 35    Date: [today]    Note: [optional]
[Save]  [Cancel]
```

---

## Step 2 — Attempt history modal

When "View Attempt History" is selected or the `•` indicator is clicked, show a small modal:

```
Attempt History — Gale, Ashlynn
Unit 3 Test  (/35)   Retest Policy: Highest

Attempt 1    Oct 15    27/35  (77.1%)   [counting: no]
Attempt 2    Oct 22    31/35  (88.6%)   [counting: yes ✓]

Note on attempt 2: "Retested after extra practice"
```

The "counting" indicator shows which attempt the `retestPolicy` selects. If policy is `'manual'`, each attempt has a radio button to mark as primary.

Closing the modal returns to the Assessment View.

---

## Step 3 — Bulk entry efficiency

When the Assessment View opens, focus the first empty score input automatically.

Tab order: moves down through the Score column only — skipping excluded and missing students.

A progress indicator in the header: "Entered: 24/30 students" updates live as grades are entered.

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Clicking an assessment column header in the grid opens the Assessment View
- [ ] Back button returns to the class grid
- [ ] All students are listed with their current score for the assessment
- [ ] Empty cells show "not entered" status
- [ ] Entering a score saves and shows percentage immediately
- [ ] Tab moves through empty score inputs
- [ ] Mark Missing sets M state and removes score input
- [ ] Mark Excluded sets EX state
- [ ] Add New Attempt adds a second attempt and shows the `•` indicator
- [ ] Attempt history modal shows all attempts with correct "counting" indicator
- [ ] Retest policy `'manual'` shows radio buttons in attempt history
- [ ] Progress indicator updates live
- [ ] Class average updates as grades are entered
- [ ] Edit Assessment opens the same modal as in the grid
- [ ] Delete Assessment requires confirmation and returns to grid after deletion
