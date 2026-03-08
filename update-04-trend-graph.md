# Update 04 — Trend Graph on Student Dossier

## Before You Start

Read `src/components/StudentProfile.vue` and `src/composables/useStudentDossier.js`.

Confirm:
- `StudentProfile.vue` renders a weekly bar chart and a horizontal breakdown chart — no line graph exists
- `useStudentDossier.js` provides a filtered `events` array to the dossier view
- The `recharts` library is NOT currently installed

---

## What This Update Adds

A line graph on the student dossier in `Reports.vue` showing behavior frequency over time, grouped by week. It sits above the existing `StudentProfile.vue` component. It is period-aware — it respects the time period toggle (This Week / This Month / This Semester / All Time).

---

## Step 1 — Install vue-chartjs and Chart.js

```
npm install vue-chartjs chart.js
```

Confirm installation before proceeding.

---

## Step 2 — Add trend data computation to `useStudentDossier.js`

Add a new computed property `weeklyTrend` that groups the filtered `events` array by ISO week and category:

```js
const weeklyTrend = computed(() => {
  if (!events.value.length) return []

  // Group events by week start date (Monday) and category
  const weeks = {}
  for (const evt of events.value) {
    const date = new Date(evt.timestamp)
    // Get Monday of that week
    const day = date.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    const monday = new Date(date)
    monday.setDate(date.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    const weekKey = monday.toISOString().split('T')[0]

    if (!weeks[weekKey]) weeks[weekKey] = { week: weekKey }
    weeks[weekKey][evt.category] = (weeks[weekKey][evt.category] || 0) + 1
  }

  // Return sorted array
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
})
```

Also compute `trendCategories` — the unique categories present in the current filtered events:

```js
const trendCategories = computed(() => {
  const cats = new Set(events.value.map(e => e.category))
  return [...cats]
})
```

Export both from the composable.

---

## Step 3 — Create `StudentTrendGraph.vue`

Create `src/components/StudentTrendGraph.vue`.

This component renders a line graph using recharts showing behavior frequency by week.

### Props
```js
props: {
  weeklyTrend: Array,      // from useStudentDossier.weeklyTrend
  categories: Array,       // from useStudentDossier.trendCategories
  period: String           // 'week' | 'month' | 'semester' | 'all'
}
```

### Behaviour
- If `weeklyTrend.length < 2`: render a plain text message "Not enough data to show a trend. Log more events over multiple weeks." — do not render the chart.
- If `period === 'week'`: render a simple bar chart of daily counts instead of a weekly line (one week of data doesn't make a useful line). Use the same recharts component.
- Otherwise: render a `LineChart` from recharts with one line per category.

### Chart spec

```js
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)
```

- Use `<Line>` component for month/semester/all-time periods
- Use `<Bar>` component for the "This Week" period (daily counts, one week of data doesn't make a useful line)
- Pass `:data` and `:options` as props per vue-chartjs conventions
- Set `responsive: true` and `maintainAspectRatio: false` in options
- Wrap in a `<div style="height: 220px">` to control height

### Data shape for `<Line>`

```js
const chartData = computed(() => ({
  labels: weeklyTrend.value.map(w => formatWeekLabel(w.week)), // e.g. "Mar 3"
  datasets: categories.value.map(cat => ({
    label: cat,
    data: weeklyTrend.value.map(w => w[cat] || 0),
    borderColor: CATEGORY_COLOURS[cat] ?? '#aaaaaa',
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 3,
    tension: 0.3
  }))
}))
```

### Chart options

```js
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
    x: { grid: { display: false } }
  }
}
```

### Category colours
Use these consistent colours per category:
```js
const CATEGORY_COLOURS = {
  positive:      '#34c759',
  redirect:      '#ff9500',
  attendance:    '#ff3b30',
  note:          '#4663ac',
  communication: '#5856d6',
  neutral:       '#636e7b',
}
```

If a category has no colour mapping, fall back to `'#aaaaaa'`.

### Styling
- White background, `--radius-md` border radius, `--shadow-sm`
- Padding: 16px
- Title above chart: "Behavior Trend" in `--text-secondary`, small caps, `font-size: 11px`

---

## Step 4 — Add `StudentTrendGraph` to `Reports.vue`

In the student dossier section of `Reports.vue`, import and render `StudentTrendGraph` between the time period toggle and the existing `StudentProfile` component:

```vue
<StudentTrendGraph
  :weekly-trend="dossier.weeklyTrend.value"
  :categories="dossier.trendCategories.value"
  :period="dossier.selectedPeriod.value"
/>
```

---

## Step 5 — Update build order in project root

Add `src/components/StudentTrendGraph.vue` to the file list in `APP_STATE_V1.md` if it exists. Otherwise skip this step.

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Opening a student with events in Reports shows the trend graph above `StudentProfile`
- [ ] Changing the time period toggle updates the graph
- [ ] A student with events in only one week shows "Not enough data" message
- [ ] A student with events across 2+ weeks shows a line graph
- [ ] The "This Week" period shows a bar chart instead of a line
- [ ] Category colours are consistent with the rest of the app
- [ ] Graph does not appear or crash when a student has zero events
