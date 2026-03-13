# Update 11 — Gradebook Setup (V4)

## Prerequisite

Update 10 must be complete and verified. All class records must have `gradebookCategories`, `gradebookMilestones`, `gradebookNotes`, and `gradingMethod` fields before this update runs.

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/views/Setup.vue` — understand the current tab structure (Classes, Roster, Behavior Codes, Data Backup) and how the active class is selected in Setup
- `src/db/classService.js` — confirm how class records are updated
- `src/db/gradebookService.js` — confirm template functions exist from Update 10

Do not make any changes until you have read all three files.

---

## What This Update Does

Adds a new "Gradebook" tab to Setup with three sections:
1. Category management (name, weight, add/remove/reorder)
2. Milestone management (name, date, add/remove)
3. Template management (save current setup as template, apply a template to current class)

---

## Step 1 — Add "Gradebook" tab to Setup

In `src/views/Setup.vue`, add a fifth tab: "Gradebook" between "Behavior Codes" and "Data Backup."

The tab content renders three sections for the currently selected class in Setup.

If no class is selected, show: "Select a class to manage its gradebook settings."

---

## Step 2 — Categories section

### Display
A list of current categories for the selected class showing name and weight percentage. Weight inputs are editable inline.

```
Categories                          Total: 100%
─────────────────────────────────────────────
Tests                    [50] %     [Delete]
Quizzes                  [25] %     [Delete]  
Assignments              [25] %     [Delete]
─────────────────────────────────────────────
                         [+ Add Category]
```

### Validation
- Weights must sum to exactly 100% — show a warning if they don't: "Weights must total 100%. Current total: X%"
- Category name cannot be empty
- Cannot delete a category that has assessments assigned to it — show inline message: "Remove all assessments in this category before deleting"
- Minimum 1 category required

### Behaviour
- Changes save automatically on blur of any input field — no save button needed
- Adding a category appends it with name "New Category" and weight 0, immediately focused for editing
- Deleting a category removes it from the class record

### Under the hood
Call `classService.updateClass(classId, { gradebookCategories: updatedCategories })` on any change. Use `crypto.randomUUID()` for new category IDs.

---

## Step 3 — Milestones section

### Display
```
Milestones
─────────────────────────────────────────────
Midterm          [2026-11-15]     [Delete]
Final            [2027-01-22]     [Delete]
─────────────────────────────────────────────
                 [+ Add Milestone]
```

### Behaviour
- Name and date are both editable inline
- Save on blur — no save button
- Adding a milestone appends with name "Milestone" and today's date
- No validation required beyond non-empty name

### Under the hood
Call `classService.updateClass(classId, { gradebookMilestones: updatedMilestones })` on any change.

---

## Step 4 — Gradebook Notes section

A simple textarea for the class-level gradebook notes:

```
Gradebook Notes
[                                        ]
[  Physics 12 - Semester 1               ]
[  Decided to drop lowest quiz after     ]
[  Unit 2 based on difficulty.           ]
[                                        ]
```

- Auto-saves on blur
- Placeholder: "Notes about grading decisions for this class..."
- Calls `classService.updateClass(classId, { gradebookNotes: value })` on blur

---

## Step 5 — Templates section

### Display
Two parts:

**Save current as template:**
```
Save as Template
Name: [Physics 12 Standard    ]   [Save Template]
```
Saves current categories and milestones as a named template via `gradebookService.saveGradebookTemplate()`.

**Apply a template:**
A dropdown of existing templates. Selecting one and clicking "Apply" copies that template's categories and milestones into the current class — overwriting existing ones after a confirmation dialog: "This will replace the current categories and milestones. Continue?"

**Existing templates list:**
Shows all saved templates with a delete button each.

### Behaviour
- Templates are stored in settings — changes affect all classes
- Applying a template is destructive — always confirm first
- Template names must be unique — show inline error if duplicate

---

## Step 6 — Grading method (future-proofing)

Add a small read-only display at the top of the Gradebook tab:

```
Grading Method: Traditional  [Change — coming soon]
```

The "Change" link is disabled for now. This reserves the UI space for when Standards Based grading is added in a future version without requiring a layout change.

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Setup has a fifth "Gradebook" tab
- [ ] Selecting a class and opening Gradebook tab shows categories, milestones, notes, and templates sections
- [ ] Adding a category saves to IDB and persists on page reload
- [ ] Editing a category weight saves on blur
- [ ] Weight total warning appears when weights don't sum to 100%
- [ ] Deleting a category works when no assessments are assigned
- [ ] Adding a milestone saves to IDB and persists on page reload
- [ ] Saving a template stores it in settings and appears in the templates list
- [ ] Applying a template (after confirmation) replaces categories and milestones correctly
- [ ] Gradebook notes textarea saves on blur and persists
- [ ] No existing Setup tabs (Classes, Roster, Behavior Codes, Data Backup) are affected
