# Update 02 — Reports Rethink: Sidebar Roster & Student Dossier

## Prerequisite

**Update 01 must be fully complete and verified before starting this update.**

This update surfaces note data, general notes, and parent contact history that Update 01 captures. If those fields don't exist in the data layer yet, this update will produce empty views.

---

## Before You Start

Read these files first. Do not change anything yet.
- `src/views/Reports.vue`
- `src/components/StudentProfile.vue`
- `src/components/StudentProfileModal.vue` (added in Update 01)
- `src/db/eventService.js`
- `src/db/classService.js`

Confirm your understanding:
- Reports currently has a tab bar: Student, Class, Washroom, Attendance, Backup
- The Student tab has a name-search datalist and renders `StudentProfile.vue` inline
- There is no sidebar roster panel
- `StudentProfile.vue` renders stats cards, charts, and a collapsible event log table
- After Update 01: events have a `note` field, students have `generalNote`, new behavior codes exist

---

## What This Update Does

Restructures `Reports.vue` into a persistent two-column layout:
- **Left sidebar:** class selector + alphabetical student roster. Always visible.
- **Right panel:** student dossier by default when a student is selected, with a time period toggle and summary stats. Aggregate reports demoted to a secondary "Class Overview" tab.

The existing `StudentProfile.vue` component is **kept and reused** inside the new dossier view — it already has stats and charts. We wrap it with new time-period filtering and add a notes/contact feed alongside it.

---

## Step 1 — Add time-filtered event queries to `eventService.js`

The dossier view needs events filtered by time period. Add this helper function:

```js
export async function getEventsByStudentInRange(studentId, fromDate) {
  // fromDate is a Date object or null (null = all time)
  // Returns all events for studentId where timestamp >= fromDate
  // Use the existing studentId index
  // Sort results newest first before returning
}
```

Also add a helper to compute date range boundaries — export these constants/functions for use in the composable:

```js
export function getDateBoundary(period) {
  // period: 'week' | 'month' | 'semester' | 'all'
  const now = new Date()
  if (period === 'all') return null
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d
  }
  if (period === 'month') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 1)
    return d
  }
  if (period === 'semester') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 5)   // approx 5 months
    return d
  }
}
```

---

## Step 2 — Build `useStudentDossier.js` composable

Create `src/composables/useStudentDossier.js`.

This composable owns all the data-fetching and computed stats for the student dossier view. Both the Reports inline panel and any future profile surface can use it.

```js
export function useStudentDossier() {
  const selectedStudentId = ref(null)
  const selectedClassId = ref(null)
  const selectedPeriod = ref('month')    // 'week' | 'month' | 'semester' | 'all'
  const events = ref([])
  const student = ref(null)
  const loading = ref(false)

  // Computed stats derived from events ref
  const stats = computed(() => {
    const e = events.value
    const washroomEvents = e.filter(ev => ev.code === 'w' && ev.duration != null)
    const absences = e.filter(ev => ev.code === 'a').length
    const lates = e.filter(ev => ev.code === 'l')
    const redirects = e.filter(ev => ev.category === 'redirect').length
    const parentContacts = e.filter(ev => ev.code === 'pc')
    const noteEvents = e.filter(ev => ev.note)

    return {
      washroomTrips: washroomEvents.length,
      washroomMinutes: Math.round(
        washroomEvents.reduce((sum, ev) => sum + (ev.duration || 0), 0) / 60000
      ),
      absences,
      lateCount: lates.length,
      avgLateMinutes: lates.length
        ? Math.round(lates.reduce((s, ev) => s + (ev.duration || 0), 0) / lates.length)
        : 0,
      redirects,
      parentContactCount: parentContacts.length,
      noteCount: noteEvents.length
    }
  })

  async function loadStudent(classId, studentId) {
    selectedClassId.value = classId
    selectedStudentId.value = studentId
    await fetchEvents()
    const classRecord = await classService.getClass(classId)
    student.value = classRecord?.students?.[studentId] ?? null
  }

  async function fetchEvents() {
    if (!selectedStudentId.value) return
    loading.value = true
    const boundary = getDateBoundary(selectedPeriod.value)
    events.value = await eventService.getEventsByStudentInRange(
      selectedStudentId.value,
      boundary
    )
    loading.value = false
  }

  // Re-fetch when period changes
  watch(selectedPeriod, fetchEvents)

  return {
    selectedStudentId,
    selectedClassId,
    selectedPeriod,
    events,
    student,
    stats,
    loading,
    loadStudent
  }
}
```

---

## Step 3 — Restructure `Reports.vue`

This is the main structural change. Rewrite the layout of `Reports.vue` to a two-column design. **Preserve all existing tab content and report logic** — only the layout and navigation structure changes.

### New layout structure

```
┌─────────────────────┬──────────────────────────────────────┐
│  LEFT SIDEBAR       │  RIGHT PANEL                         │
│  200–240px fixed    │  fills remaining width               │
│                     │                                       │
│  [Class dropdown]   │  [Student Dossier]                   │
│  ──────────────     │   — OR —                             │
│  Student list       │  [Class Overview tabs]               │
│  (scrollable)       │                                       │
└─────────────────────┴──────────────────────────────────────┘
```

On narrow screens (below 768px): stack vertically. Sidebar collapses to just the class dropdown + a "Show Students" toggle that expands the list. Right panel fills the screen below.

### Left Sidebar

**Class dropdown:** lists all classes from `classService.getAllClasses()`. Changing class:
1. Reloads the student list
2. Clears the selected student
3. Resets the right panel to the default state (no student selected)

**Student list:** all students in the selected class sorted alphabetically by `lastName`. Render as a simple scrollable list. Each row: full name (`lastName, firstName`).

- Selected student row: `--primary-light` background, `--primary` left border
- Tapping a row: calls `useStudentDossier.loadStudent(classId, studentId)`, sets right panel to dossier mode
- No search bar needed in the sidebar — list is short enough to scroll

**Class Overview link:** below the student list, a secondary button or link labeled "📊 Class Overview" that switches the right panel to aggregate report mode.

### Right Panel — Mode 1: Student Dossier (default when student selected)

Shown when a student is selected from the sidebar.

**Header row:**
- Student full name (large)
- Time period toggle: `This Week | This Month | This Semester | All Time`
  - Implemented as a segmented control / button group
  - Changing selection updates `useStudentDossier.selectedPeriod` which triggers re-fetch

**Summary stats row** (scoped to selected time period):
Render as a horizontal row of stat cards. Use the existing stat card styling if it exists in `StudentProfile.vue` — match the visual pattern.

| Stat | Value |
|---|---|
| Washroom | X trips, X min total |
| On Device | X incidents |
| Absences | X |
| Lates | X (avg X min) |
| Parent Contacts | X |
| Notes/Observations | X |

**Existing `StudentProfile.vue` component:**
Render it below the stats row, passing it the filtered `events` array from `useStudentDossier`. This preserves the existing charts and event log table without rewriting them.

**Notes & Contact Feed:**
Below `StudentProfile.vue`, add a new section: "Notes & Parent Contact" that shows only events where `note != null`, sorted newest first. Each entry:
- Formatted timestamp
- Code icon + label
- Note text (full, not truncated)

If no note events exist in the selected period: "No notes or parent contacts recorded in this period."

**General Note:**
Below the feed, show the student's `generalNote` as a read-only display (not editable here — editing is in the `StudentProfileModal` on the Dashboard). Label: "General Notes". If empty: show "No general notes recorded."

### Right Panel — Mode 2: Class Overview (aggregate reports)

Shown when "📊 Class Overview" is clicked or no student is selected.

This is the **existing report tab content**, preserved exactly as-is. The only change is that instead of being the primary interface they are now inside the Class Overview panel.

Render the existing tab bar (Class, Washroom, Attendance, Backup) inside the right panel. The Student tab from the old interface is replaced by the new sidebar roster — remove it from the tab bar here.

The existing date range filter bar, CSV export buttons, and all report tables remain unchanged.

---

## Step 4 — Remove the old Student tab from the tab bar

The old Student tab (with name-search datalist) is now superseded by the sidebar roster. Remove it from the Reports tab bar. The remaining tabs inside Class Overview are: Class, Washroom, Attendance, Backup.

Do not delete any of the underlying query logic or components — only remove the tab entry and its rendered section from the new Class Overview panel.

---

## Verification Checklist

Before marking this update complete, confirm all of the following:

- [ ] Left sidebar shows class dropdown and alphabetical student list
- [ ] Selecting a student loads their dossier in the right panel
- [ ] Time period toggle (This Week / This Month / This Semester / All Time) correctly filters all stats and events
- [ ] Summary stats row shows correct counts for the selected period
- [ ] `StudentProfile.vue` renders correctly below the stats, fed by the filtered events array
- [ ] Notes & Parent Contact feed shows only events with notes, newest first
- [ ] General Note displays correctly (read-only)
- [ ] "📊 Class Overview" button switches right panel to aggregate reports
- [ ] Existing Class Summary, Washroom Log, Attendance Summary, and Backup tabs all work correctly inside Class Overview
- [ ] CSV export still works on all aggregate report tabs
- [ ] Narrow screen / portrait layout stacks correctly
- [ ] No existing report functionality is broken or missing
