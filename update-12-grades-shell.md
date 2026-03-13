# Update 12 — Grades View Shell & Navigation (V4)

## Prerequisite

Updates 10 and 11 must be complete and verified.

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/App.vue` — understand how `currentView` drives navigation and how nav icons are rendered
- `src/views/Reports.vue` — understand the two-column sidebar + main panel layout to mirror it
- `src/composables/useGradebook.js` — confirm the skeleton from Update 10 exists

---

## What This Update Does

- Adds the Grades nav item to the app
- Creates `src/views/Grades.vue` with the two-column layout
- Wires up the sidebar: class selector, category summary, student list with current grades
- Main panel shows a placeholder until Update 13 adds the grid

---

## Step 1 — Add Grades to navigation in `App.vue`

Add a fourth nav item after Reports:

```vue
<button 
  :class="['nav-btn', currentView === 'Grades' ? 'nav-btn--active' : '']"
  @click="currentView = 'Grades'"
>
  <BarChart2 :size="22" />
  <span>Grades</span>
</button>
```

Import `BarChart2` from `lucide-vue-next`.

Import and register `Grades.vue` in `App.vue`:
```vue
<Grades v-if="currentView === 'Grades'" />
```

---

## Step 2 — Create `src/views/Grades.vue`

### Layout
Mirror the two-column layout of `Reports.vue`:
- Left sidebar: fixed width, scrollable student list
- Right main panel: flexible width, scrollable content

```vue
<div class="grades">
  <aside class="grades__sidebar">
    <!-- Class selector -->
    <!-- Category summary -->
    <!-- Student list -->
  </aside>
  <main class="grades__main">
    <!-- Content panel -->
  </main>
</div>
```

### Sidebar content

**Class selector dropdown** — same pattern as Reports sidebar. On change, call `loadGradebook(classRecord)` from `useGradebook`.

**Category summary** — below the class selector, show each category with its weight:
```
Tests         50%
Quizzes       25%
Assignments   25%
```
Small, `--text-secondary`, `font-size: 12px`. If no categories defined yet, show: "No categories set. Go to Setup → Gradebook to add categories." as a quiet prompt.

**Milestone toggle** — below category summary, a segmented toggle showing "Current" plus any defined milestones:
```
Current  |  Midterm  |  Final
```
Selecting a milestone sets `selectedMilestone` in `useGradebook` and calls `refreshGrades()`.
If no milestones defined, don't show the toggle.

**Student list** — alphabetical list of students with their current overall grade beside their name:
```
Henson, Jack          78%
Kashif, Ibrahim       84%
Liu, Enoch            71%
```
- Grade shown to one decimal place
- Heat map colour on the grade number:
  - 80%+ green `#34c759`
  - 70-79% blue `#007aff`  
  - 60-69% amber `#ff9500`
  - Below 60% red `#ff3b30`
- If grade is null (no assessments entered yet) show `—` in `--text-secondary`
- Clicking a student sets `selectedStudentId` in `useGradebook` and switches main panel to student mode

**"Manage Gradebook" link** at the bottom of sidebar — clicking navigates to `currentView = 'Setup'`. Small, ghost style, `Settings` Lucide icon.

### Main panel — placeholder

For now render a simple placeholder:

```vue
<div class="grades__placeholder">
  <BarChart2 :size="48" class="grades__placeholder-icon" />
  <p>Select a class to view the gradebook</p>
</div>
```

When a class is loaded but no student is selected, show:
```
Class Gradebook
[Assessment grid coming in next update]
```

When a student is selected, show:
```
[Student name]
[Student dossier coming in next update]
```

These placeholders will be replaced in Updates 13 and 15.

---

## Step 3 — Load gradebook on class select

When the class selector changes in `Grades.vue`:
1. Find the full class record from `classService.getClass(classId)`
2. Call `useGradebook.loadGradebook(classRecord)`
3. Reset `selectedStudentId` to null
4. Reset `selectedMilestone` to null

Show a loading state while `loadGradebook` is running — a subtle spinner or "Loading..." text in the main panel.

---

## Step 4 — Styling

Add `.grades`, `.grades__sidebar`, `.grades__main` CSS classes matching the existing Reports layout patterns. Use the same CSS custom properties throughout — no hardcoded colours except for the heat map grade colours which are defined as local constants.

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Grades nav item appears in the nav bar with BarChart2 icon
- [ ] Clicking Grades nav item shows the Grades view
- [ ] Selecting a class in the sidebar loads the gradebook and shows the student list
- [ ] Student list shows `—` for all students when no assessments exist
- [ ] Category summary shows categories and weights
- [ ] Milestone toggle appears when milestones are defined
- [ ] Selecting a milestone calls `refreshGrades()` with the correct `asOf` date
- [ ] Clicking a student name sets `selectedStudentId`
- [ ] "Manage Gradebook" link navigates to Setup
- [ ] Existing nav items (Dashboard, Reports, Setup) still work correctly
- [ ] Layout matches the two-column pattern of Reports
