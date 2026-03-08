# Update 07 — Quick Stats Dot on Desk Tile

## Prerequisite

None. This update is standalone.

## Before You Start

Read `src/components/DeskTile.vue`, `src/composables/useClassroom.js`, `src/db/eventService.js`, `src/db/settingsService.js`, and `src/db/index.js`.

Confirm:
- `DeskTile.vue` has no stats dot — only washroom, absent, and late active states
- `useClassroom.js` does not compute weekly stats on class load
- `settingsService.js` has no threshold settings in defaults
- `DB_VERSION` is currently `6`

---

## What This Update Adds

When a class loads on the Dashboard, compute weekly behavior stats for every student. If a student's washroom trips or device incidents this week exceed configurable thresholds, show a small coloured dot on their desk tile. Thresholds are configured in Setup.

---

## Step 1 — Add threshold settings to the database

### `src/db/index.js`

Bump `DB_VERSION` to `7`.

Add an `oldVersion < 7` migration that adds threshold defaults to the settings singleton:

```js
if (oldVersion < 7) {
  const tx7 = db.transaction('settings', 'readwrite')
  const settings = await tx7.objectStore('settings').get('singleton')
  if (settings) {
    if (settings.thresholds === undefined) {
      settings.thresholds = {
        washroomTripsPerWeek: 4,
        deviceIncidentsPerWeek: 3
      }
      await tx7.objectStore('settings').put(settings)
    }
  }
  await tx7.done
}
```

Also update the fresh install seed (`oldVersion === 0`) to include:
```js
thresholds: {
  washroomTripsPerWeek: 4,
  deviceIncidentsPerWeek: 3
}
```

### `src/db/settingsService.js`

Add `thresholds` to the defaults object:
```js
thresholds: {
  washroomTripsPerWeek: 4,
  deviceIncidentsPerWeek: 3
}
```

Add two new exported functions:
```js
export async function getThresholds()
export async function saveThresholds(thresholdsObj)  // { washroomTripsPerWeek, deviceIncidentsPerWeek }
```

---

## Step 2 — Add weekly stats computation to `useClassroom.js`

Add a new reactive ref and function:

```js
export const studentWeeklyStats = ref({})
// Shape: { [studentId]: { washroomTrips: N, deviceIncidents: N } }
```

Add a function that runs when a class activates:

```js
async function computeWeeklyStats(classId, studentIds) {
  // Get Monday of current week
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const fromISO = monday.toISOString()

  const stats = {}
  for (const studentId of studentIds) {
    const events = await eventService.getEventsByStudent(studentId, { from: fromISO })
    stats[studentId] = {
      washroomTrips: events.filter(e => e.code === 'w').length,
      deviceIncidents: events.filter(e => e.category === 'redirect').length
    }
  }
  studentWeeklyStats.value = stats
}
```

Call `computeWeeklyStats` after the class and student list load. Pass the classId and array of studentIds.

**Performance note:** This queries IDB once per student on class load. For a class of 30 students this is 30 IDB reads. This is acceptable — it runs once at load, not reactively on every render. Do not run this on every tick or watch.

Also export `thresholds` as a reactive ref loaded from `settingsService.getThresholds()` on class load:

```js
export const thresholds = ref({ washroomTripsPerWeek: 4, deviceIncidentsPerWeek: 3 })
```

Load it alongside weekly stats when the class activates.

---

## Step 3 — Add stats dot to `DeskTile.vue`

Import `studentWeeklyStats` and `thresholds` from `useClassroom`.

Add a computed property that determines if the stats dot should show:

```js
const showStatsDot = computed(() => {
  const stats = studentWeeklyStats.value[props.studentId]
  if (!stats) return false
  return (
    stats.washroomTrips >= thresholds.value.washroomTripsPerWeek ||
    stats.deviceIncidents >= thresholds.value.deviceIncidentsPerWeek
  )
})

const statsDotTooltip = computed(() => {
  const stats = studentWeeklyStats.value[props.studentId]
  if (!stats) return ''
  const parts = []
  if (stats.washroomTrips >= thresholds.value.washroomTripsPerWeek) {
    parts.push(`${stats.washroomTrips} washroom trips this week`)
  }
  if (stats.deviceIncidents >= thresholds.value.deviceIncidentsPerWeek) {
    parts.push(`${stats.deviceIncidents} device incidents this week`)
  }
  return parts.join(' · ')
})
```

Add the dot to the template:

```vue
<!-- Stats dot — top left corner -->
<span
  v-if="showStatsDot"
  class="desk-tile__stats-dot"
  :title="statsDotTooltip"
/>
```

```css
.desk-tile__stats-dot {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff3b30;
  box-shadow: 0 1px 3px rgba(255, 59, 48, 0.4);
}
```

Red dot in the top-left — clearly distinct from the amber flag dot in the top-right.

---

## Step 4 — Add threshold editor to `Setup.vue`

In the Setup view, add a "Behavior Thresholds" section. This can sit alongside or below the existing behavior code editor.

### Layout
A simple card with two number inputs:

```
Behavior Thresholds
These thresholds control when a warning dot appears on a student's desk tile.

Washroom trips per week:    [4] (number input, min: 1, max: 20)
Device incidents per week:  [3] (number input, min: 1, max: 20)

[Save Thresholds]
```

### Behaviour
- Load current values from `settingsService.getThresholds()` on Setup mount
- "Save Thresholds" calls `settingsService.saveThresholds({ washroomTripsPerWeek, deviceIncidentsPerWeek })`
- After saving, update the `thresholds` ref in `useClassroom` so the dots update immediately without a page reload
- Show a brief "Saved!" confirmation for 1.5s after saving

---

## Step 5 — Update weekly stats when new events are logged

When `logEvent` is called for a washroom or redirect event, increment the relevant counter in `studentWeeklyStats` immediately (optimistic update) so the dot appears without waiting for a full reload:

In `useClassroom.js`, after logging a washroom or redirect event:

```js
// Optimistic update for stats dot
if (code === 'w' || category === 'redirect') {
  const current = studentWeeklyStats.value[studentId] || { washroomTrips: 0, deviceIncidents: 0 }
  studentWeeklyStats.value[studentId] = {
    washroomTrips: code === 'w' ? current.washroomTrips + 1 : current.washroomTrips,
    deviceIncidents: category === 'redirect' ? current.deviceIncidents + 1 : current.deviceIncidents
  }
}
```

Also handle undo — when a washroom or redirect event is undone, decrement the counter.

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors after DB migration to v7
- [ ] Setup view shows the Behavior Thresholds section with correct default values (4 washroom, 3 device)
- [ ] Saving new threshold values persists across page reload
- [ ] A student with washroom trips >= threshold this week shows a red dot in top-left of their tile
- [ ] A student with device incidents >= threshold this week shows the same red dot
- [ ] A student exceeding both thresholds shows one dot (not two)
- [ ] Tooltip on the dot correctly describes which threshold(s) were exceeded
- [ ] A student below both thresholds shows no dot
- [ ] Logging a washroom event that pushes a student over the threshold causes the dot to appear immediately — no reload needed
- [ ] Undoing that event removes the dot immediately
- [ ] Changing the threshold in Setup immediately affects which tiles show dots
- [ ] Stats are computed per-week (Monday to Sunday), not per 7 rolling days
