# Update 17 — Analytics UI (V5)

## Prerequisites

Update 16 must be complete and verified. All items on the Update 16 checklist must pass before starting this update. `classAnalytics`, `analyticsMode`, `excludeOutliers`, `toggleOutlierExclusion`, `toggleStudentFromAnalytics`, and `resetAnalyticsState` must all be available from `useGradebook.js`.

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/views/Grades.vue` in full — understand the current toolbar structure, how `analyticsMode` will integrate, and how the sidebar switches between grid mode and dossier mode
- `src/composables/useGradebook.js` — confirm all Update 16 exports are present
- `main.css` — confirm `--grade-high`, `--grade-mid-high`, `--grade-mid-low`, `--grade-low` CSS variables exist

Report findings before writing any code.

---

## What This Update Does

Adds the complete Analytics panel UI to `Grades.vue`. This is a UI-only update — no changes to service files or composables beyond what Update 16 already added.

Specifically:
- Grid/Analytics toggle in the Grades toolbar
- Analytics panel layout with four sections
- Class overview stat cards
- Grade distribution histogram (vue-chartjs Bar)
- Per-assessment breakdown table with sparkline bars
- Outlier toggle with active state notice
- Student exclusion from analytics via context menu

All changes are in `src/views/Grades.vue` only unless a minor import addition is needed in `useGradebook.js`.

---

## Step 1 — Grid/Analytics Toggle in Toolbar

In the Grades toolbar, add a segmented toggle between the Add Assessment button and the milestone buttons:

```
[⚙ Settings]  [Period 1 - 12 Physics ▼]  [+ Add Assessment]  [Grid | Analytics]  [Current | Midterm]  [Raw | %]  Class Avg: 70.1%
```

The toggle uses the same segmented button style as Raw/% and milestone buttons.

**Behaviour:**
- Clicking Analytics:
  - Sets `analyticsMode.value = true`
  - Calls `refreshClassAnalytics()` from `useGradebook`
  - Hides the grid, shows the Analytics panel
  - Hides the Add Assessment button (not relevant in analytics mode)
  - Hides the Raw/% toggle (not relevant in analytics mode)
- Clicking Grid:
  - Sets `analyticsMode.value = false`
  - Calls `resetAnalyticsState()`
  - Shows the grid, hides the Analytics panel
  - Restores Add Assessment and Raw/% toggle

The milestone toggle remains visible in both modes — analytics respects the selected milestone.

**Loading state:**
While `refreshClassAnalytics()` is running, show a subtle spinner or "Calculating..." text in the main panel. Analytics calculations may take a moment for large classes.

---

## Step 2 — Analytics Panel Layout

When `analyticsMode === true` and no student is selected, render the Analytics panel in the main content area.

The sidebar behaves the same as grid mode — hidden when analytics mode is active (no student selected).

### Panel structure (top to bottom):

```
[Class Overview Cards]
[Triangulation Coverage]
[Grade Distribution Histogram]
[Per-Assessment Breakdown Table]
[Active Outlier Notice (conditional)]
```

---

## Step 3 — Class Overview Cards

Four stat cards in a row across the top of the Analytics panel:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  CLASS AVERAGE  │ │ WEIGHTED MEDIAN │ │ MOST CONSISTENT │ │  STD DEVIATION  │
│                 │ │                 │ │                 │ │                 │
│     70.1%       │ │     73.2%       │ │  74-79% range   │ │     11.2%       │
│                 │ │                 │ │  18 of 30 stu.  │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Data sources from `classAnalytics.value`:**
- Class Average → `classAnalytics.mean`
- Weighted Median → `classAnalytics.median`
- Most Consistent → compute from student-level `mostConsistent` values: find the dominant bucket across all students (bucket with most students in it), show range and count
- Std Deviation → `classAnalytics.sd`

**Styling:**
- Cards use the existing card pattern from Reports/Dashboard
- Apply muted heat map tint to the percentage values (same `--grade-*` CSS variables)
- Std Deviation gets a calibration colour:
  - SD < 8% → green tint (well-clustered class)
  - SD 8-15% → amber tint (normal spread)
  - SD > 15% → red tint (wide spread, worth investigating)

**Empty state:**
If `classAnalytics` is null (no grades entered yet): show "No data yet — enter grades to see analytics" centred in the panel.

---

## Step 4 — Triangulation Coverage

Below the stat cards, a small coverage section showing triangulation health:

```
TRIANGULATION COVERAGE
Products: ████████████████████  30/30 students  (100%)
Conversations: ████████░░░░░░░░  18/30 students  (60%)
Observations: ██████░░░░░░░░░░░  12/30 students  (40%)
```

**Data sources:**
- `classAnalytics.conversationCoverage`
- `classAnalytics.observationCoverage`
- Products: always 100% if any grade exists (since all students did the same assessments)

**Styling:**
- CSS progress bars, not a chart library
- Use the existing `--grade-*` colour tokens:
  - 80%+ coverage → `--grade-high` background
  - 50-79% → `--grade-mid-high`
  - Below 50% → `--grade-mid-low`
- Small label: "Conversations and Observations show % of students with at least one recorded grade"

---

## Step 5 — Grade Distribution Histogram

A bar chart showing how many students fall in each 10% grade bucket.

**Implementation:** Use `vue-chartjs` Bar component (already installed — used in `GradeTrendChart.vue`).

```vue
<Bar :data="distributionChartData" :options="distributionChartOptions" />
```

**Chart data:**
```js
const distributionChartData = computed(() => {
  if (!classAnalytics.value) return null
  const buckets = classAnalytics.value.distributionBuckets
  return {
    labels: buckets.map(b => b.label),
    datasets: [{
      label: 'Students',
      data: buckets.map(b => b.count),
      backgroundColor: buckets.map(b => {
        const midpoint = (b.range[0] + b.range[1]) / 2
        if (midpoint >= 80) return 'var(--grade-high)'
        if (midpoint >= 70) return 'var(--grade-mid-high)'
        if (midpoint >= 60) return 'var(--grade-mid-low)'
        return 'var(--grade-low)'
      }),
      borderRadius: 4
    }]
  }
})
```

**Chart options:**
- Y axis: integer steps only (can't have 0.5 students), min 0
- X axis: all 10 bucket labels always shown even if count is 0
- No legend
- Tooltip: "N students"
- Height: 200px
- Title above chart: "Grade Distribution (Product Assessments)"

---

## Step 6 — Per-Assessment Breakdown Table

Below the histogram, a table showing analytics for each Product assessment:

```
ASSESSMENT BREAKDOWN
                                                    Outlier
Assessment    Category   Avg    Med    SD     High  Low   Flag    Distribution
──────────────────────────────────────────────────────────────────────────────
Test 1        Tests      71%    74%    12.1%  95%   40%   ⚠       ▁▂▄█▆▃▁▁▁▁
other         Other      63%    65%    18.4%  90%   20%   🔴      ▁▁▃▅▄▆▂▁▁▁
test 2        Tests      77%    80%    8.2%   95%   62%   ✓       ▁▁▁▂▅█▄▂▁▁
```

**Columns:**
- Assessment name (clickable — clicking opens the Assessment View for that assessment, same as clicking column header in grid)
- Category name
- Avg (mean)
- Med (median)
- SD (standard deviation)
- High (highest score)
- Low (lowest score)
- Flag:
  - 🔴 = `calibrationFlag: 'too_hard'` (mean < 60% AND SD > 15%)
  - 🟡 = mean < 70% (worth watching)
  - ✓ = well calibrated
- Distribution sparkline (mini bar chart, CSS only — no chart library)

**Sparkline implementation (CSS only):**
Ten tiny divs in a row, height proportional to bucket count:

```vue
<div class="sparkline">
  <div
    v-for="bucket in assessment.distributionBuckets"
    :key="bucket.label"
    class="sparkline__bar"
    :style="{ height: `${Math.max(4, (bucket.count / maxBucketCount) * 32)}px` }"
    :title="`${bucket.label}: ${bucket.count} students`"
  />
</div>
```

**Sorting:**
Table is sortable by clicking any column header. Default sort: by date ascending (same order as grid).

**Empty state:**
If no Product assessments exist: "No product assessments yet — add tests, quizzes, or assignments to see breakdown."

---

## Step 7 — Outlier Toggle and Active Notice

In the Analytics panel header bar (above the stat cards), add the outlier toggle:

```
[Include All Students]  [Exclude Outliers]          ← toggle, right-aligned
```

Same segmented toggle style as other toggles in the app.

**When Exclude Outliers is active:**
- Calls `toggleOutlierExclusion()` from `useGradebook`
- All stats (cards, histogram, table) recalculate immediately
- Show a persistent amber notice bar below the toggle:

```
⚠ Outlier mode active — 2 students excluded from class stats (scores more than 1.5 SD below mean).
Individual grades are unaffected. Toggle off to include all students.
```

- The notice names how many students were excluded but does NOT name them (privacy in shared screen situations)
- The histogram shows excluded students' bars with reduced opacity so the full distribution is still visible

---

## Step 8 — Student Exclusion from Analytics

**Permanent exclusion (persists to IDB):**

In the Analytics panel, show the student list in a collapsible section at the bottom: "Student Exclusions."

List all students with a checkbox per student:
```
☑ Ahmad, Shazil          (included in analytics)
☑ Ahmed, Temi            (included in analytics)
☐ Larena Gonzalez, Alex  (excluded from analytics)
```

Toggling a checkbox calls `toggleStudentFromAnalytics(studentId)` from `useGradebook`. Updates persist to IDB immediately.

**Visual indicator in histogram:**
When a student is permanently excluded, their contribution to the distribution buckets is shown with a striped/hatched pattern to distinguish from the outlier-excluded (toggle-based) students.

**Note displayed above the list:**
"Students excluded here are permanently removed from all analytics calculations for this class. Their grades are unaffected."

---

## Step 9 — Empty and Loading States

**Loading state** (while `refreshClassAnalytics` is running):
```
[spinner]  Calculating analytics...
```
Use a simple CSS spinner. Do not show stale data while recalculating.

**No grades state:**
```
[BarChart2 icon, large]
No analytics available yet.
Enter grades in the Grid view to see class performance data.
[→ Switch to Grid]  ← button that sets analyticsMode = false
```

**No Product assessments state:**
Class overview cards show but per-assessment table shows empty state message.

---

## Step 10 — Sidebar Behaviour in Analytics Mode

Analytics mode has no student dossier, so the sidebar is hidden the same way as grid mode (no student selected). The full width goes to the analytics panel.

If a student IS selected while in analytics mode (shouldn't happen but handle gracefully): clear `selectedStudentId` when entering analytics mode.

---

## Styling Notes

- Analytics panel uses the same card/panel pattern as Reports and the student dossier
- No new colour tokens needed — use existing `--grade-*` and `--text-*` variables throughout
- The histogram and sparklines use the four `--grade-*` colours for visual consistency with the grid
- Calibration flags use standard iOS-style colours: red for 'too_hard', amber for warning, green for good
- The triangulation coverage bars use `--grade-*` colours based on coverage percentage thresholds

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Grid/Analytics toggle appears in toolbar
- [ ] Clicking Analytics hides the grid and shows the Analytics panel
- [ ] Clicking Grid returns to the grid with all grades intact
- [ ] Add Assessment and Raw/% buttons are hidden in Analytics mode
- [ ] Milestone toggle works in Analytics mode — switching milestone recalculates all stats
- [ ] Class Overview cards show correct mean, median, SD values
- [ ] Grade Distribution histogram renders with correct bucket counts and heat map colours
- [ ] Histogram bars are coloured correctly by grade range
- [ ] Per-assessment table shows only Product assessments (no Conversations or Observations)
- [ ] Individual assessments do not appear in the per-assessment table
- [ ] Sparklines render correctly for each assessment
- [ ] Calibration flag (🔴) appears on assessments with mean < 60% and SD > 15%
- [ ] Triangulation coverage bars show correct percentages
- [ ] Outlier toggle recalculates all stats immediately when toggled
- [ ] Amber notice bar appears when outlier mode is active with correct student count
- [ ] Student exclusion checkboxes persist to IDB after page reload
- [ ] Permanently excluded student is removed from all analytics calculations
- [ ] Loading spinner appears while analytics are being calculated
- [ ] Empty state renders correctly when no grades are entered
- [ ] No student is selected when entering analytics mode
- [ ] Back to grid button in empty state works correctly
- [ ] No existing Grades functionality broken — grid, dossier, assessment view all work normally
- [ ] No existing Dashboard, Reports, or Setup functionality broken
