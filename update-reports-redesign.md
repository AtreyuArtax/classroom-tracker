# Update — Reports Class Overview Redesign

## Prerequisites

Read `CLAUDE.md` for architectural rules. Then read:
- `src/views/Reports.vue` in full — understand the current class overview layout, what data is already computed, and how the time period toggle (Week/Month/Semester) works
- `src/db/eventService.js` — confirm what functions exist for fetching attendance and washroom events
- `APP_STATE_V5.md` — confirm current schema and composable structure

Report findings before writing any code.

---

## What This Update Does

Redesigns the Reports class overview (the view shown when no individual student is selected) into a clean, dense, actionable layout. No new data is needed — all values are derivable from existing events. No schema changes. No DB version bump.

The goal: a teacher opens Reports and knows in 10 seconds who to follow up with and why.

---

## New Layout — Three Sections

### Section 1 — Headline Stats Row (three compact cards)

Replace the current large cards with three compact side-by-side stat cards. Each card is information-dense but small.

**Card 1 — Class Attendance**
```
CLASS ATTENDANCE
[period toggle applies]

87.3%  attendance rate
61 absences · 16 lates
5 absences on test days
3 students chronically absent (5+)
```

Attendance rate calculation:
```js
// school days elapsed = distinct dates on which ANY event was logged for this class
// OR use a simpler proxy: total possible = students.length × weeksElapsed × 5
// Best available: count distinct calendar days in the selected period that have at least one event
// Rate = (possible attendances - absences) / possible attendances × 100
// possible attendances = studentCount × distinctSchoolDaysInPeriod
```

If the calculation cannot be made reliably (no school days data), show absences and lates only without the rate — do not show a wrong percentage.

"Chronically absent" = students with 5 or more absences in the selected period. Show count only, not names (names appear in Follow Up below).

**Card 2 — Washroom**
```
WASHROOM
[period toggle applies]

2.9 trips/student
19.7 min/student avg
⚠ 3 long trips (>15min)
7 trips on test days
```

Flag long trips (>15min) with a warning icon. Count only, names in Follow Up.

**Card 3 — Behavior**
```
BEHAVIOR
[period toggle applies]

5 redirect/device
0 parent contacts
2 notes logged
```

Simple counts only. No chart needed here.

---

### Section 2 — Follow Up List + Washroom Chart (two columns)

Left column (~45% width): **FOLLOW UP**

A single ranked list pulling from all data sources. Each entry has a student name, a reason, and a severity indicator. Clicking any entry opens that student's dossier.

**Entry types and thresholds (apply to selected period):**

| Trigger | Label | Severity |
|---------|-------|----------|
| 5+ absences | X absences | High (red left border) |
| 3+ absences in period | X absences | Medium (amber left border) |
| Long washroom trip (>15min) | Long washroom trip Xmin | Medium |
| 3+ washroom trips in week | X washroom trips this week | Low (blue left border) |
| Grade below 60% (if gradebook data available) | Grade at X% | High |
| Grade declining (dropped 10%+ since midterm) | Grade dropped X% | Medium |

Sort order: High severity first, then Medium, then Low. Within same severity, sort by most extreme value.

If no follow-up items exist: show a green "✓ No students flagged for follow up this period" message. Do not show an empty list.

Maximum 8 entries shown. If more exist, show "and X more →" link that expands the list.

Each entry:
```
[severity border] Shadrach-Ayidu, Jason     17 absences  →
[severity border] Ujvari, Derwin            21min washroom trip  →
[severity border] Berger, Caleb             Grade at 57%  →
```

Right column (~55% width): **WASHROOM DETAIL**

Keep the existing washroom bar chart (trips per student) — it works well. Below the chart, keep the long trips list. This column earns its space.

The two columns sit side by side. On narrow viewports they stack.

---

### Section 3 — Attendance Breakdown (full width, compact, single row)

A single compact strip below the two-column section. Not a card — just a subtle divider row with stats:

```
ATTENDANCE  ·  Rate: 87.3%  ·  Total Absences: 61  ·  Total Lates: 16  ·  Test Day Absences: 5  ·  Top absentees: Shadrach-Ayidu 17 · Bogoje 9 · Ussher 7
```

Small text, `--text-secondary` for labels, normal weight for values. This is a summary strip, not a card.

---

## Remove

- "Trends & Correlations" card — remove entirely
- "Recent Classroom Logs" card — remove entirely
- The large Attendance card (replaced by compact card in Section 1)
- The large Behavior card (replaced by compact card in Section 1)

The washroom section is kept and moved to the right column of Section 2.

---

## Period Toggle Behaviour

The existing This Week / Last Week / This Month / This Semester toggle applies to ALL sections — all stats recalculate for the selected period. This is already implemented — preserve it exactly.

---

## Grade Data in Follow Up

The Follow Up list should include grade-based flags IF `classGrades` data is available from `useGradebook`. If the gradebook has no data for this class (no assessments entered), skip grade-based flags silently — do not show errors or empty grade entries.

Import `classGrades` from `useGradebook` and use it as an optional data source. Do not call `loadGradebook` from Reports — only use whatever is already loaded.

---

## Styling

- Section 1 cards: compact, equal width, roughly 200px tall max. Use the existing card pattern but with tighter padding (`padding: 12px 16px` not `24px`)
- Follow Up list: clean list with left border colour indicating severity. No background colour on entries — border only. Hover state shows subtle background. Each entry is one line.
- Washroom column: keep existing chart styling
- Section 3 strip: `font-size: 13px`, `padding: 8px 0`, `border-top: 1px solid var(--border-color)`
- No new colour tokens needed — use `--grade-low` for red/high severity, `--grade-mid-low` for amber/medium, `--grade-mid-high` for blue/low severity

---

## What Does Not Change

- Individual student dossier view — untouched
- Period toggle — untouched
- Export Summary and Print Reports buttons — untouched
- Sidebar (class selector, student list) — untouched
- Navigation to student dossier on name click — untouched

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Class overview shows three compact headline cards
- [ ] Attendance rate displays correctly (or is hidden if data insufficient)
- [ ] Chronically absent count is correct
- [ ] Follow Up list shows correct entries with correct severity borders
- [ ] Clicking a Follow Up entry opens the correct student's dossier
- [ ] "No students flagged" message shows when list is empty
- [ ] Washroom bar chart and long trips list are in the right column
- [ ] Section 3 attendance strip shows correct totals
- [ ] Period toggle (Week/Month/Semester) correctly updates all three sections
- [ ] Grade-based flags appear in Follow Up when gradebook data is loaded
- [ ] Grade-based flags are silently absent when no gradebook data exists
- [ ] Individual student dossier view is completely unaffected
- [ ] No existing functionality broken
- [ ] Layout does not break on a 1280px wide viewport
