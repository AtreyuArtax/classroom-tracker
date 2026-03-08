# Update 05 — Auto-Suggest Class by Time of Day

## Before You Start

Read `src/composables/useClassroom.js` and `src/components/ClassSwitcher.vue` and `src/App.vue`.

Confirm:
- `useClassroom.js` loads classes from IDB and manages `activeClass`
- No time-of-day awareness exists anywhere except `logAttendanceEvent` for late calculation
- `ClassSwitcher.vue` renders the class dropdown
- The teacher always manually selects the active class

---

## What This Update Adds

When the Dashboard loads, compare the current time against `periodStartTime` on all classes. If the current time is within a reasonable window of a class start time, surface a non-intrusive suggestion banner beneath the class switcher. The teacher taps to confirm — the class never switches automatically.

---

## Step 1 — Add suggestion logic to `useClassroom.js`

Add a new exported function and ref:

```js
export const suggestedClass = ref(null)  // { classId, name, periodNumber, minutesUntil }

export function computeSuggestedClass() {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  let best = null
  let bestDiff = Infinity

  for (const cls of classList.value) {
    if (!cls.periodStartTime || cls.archived) continue

    const [h, m] = cls.periodStartTime.split(':').map(Number)
    const classMinutes = h * 60 + m

    // Window: suggest if within 15 minutes before or 30 minutes after start
    const diff = classMinutes - currentMinutes
    if (diff >= -30 && diff <= 15 && Math.abs(diff) < Math.abs(bestDiff)) {
      bestDiff = diff
      best = {
        classId: cls.classId,
        name: cls.name,
        periodNumber: cls.periodNumber,
        minutesUntil: diff  // negative = already started
      }
    }
  }

  // Only suggest if it's not already the active class
  if (best && best.classId !== activeClass.value?.classId) {
    suggestedClass.value = best
  } else {
    suggestedClass.value = null
  }
}
```

Call `computeSuggestedClass()` automatically:
- Once when `classList` first loads (watch with `{ immediate: true }`, fire once when list has length)
- Clear `suggestedClass` when the teacher manually switches classes

---

## Step 2 — Add suggestion banner to `ClassSwitcher.vue`

Import `suggestedClass` and `setActiveClass` from `useClassroom`.

Add a suggestion banner that appears directly below the class dropdown when `suggestedClass` is non-null:

### Banner content
```
"Period {periodNumber} starts in {X} min — switch to {name}?"   (if minutesUntil > 0)
"Period {periodNumber} started {X} min ago — switch to {name}?" (if minutesUntil <= 0)
```

### Banner structure
```vue
<div v-if="suggestedClass" class="class-suggestion">
  <span class="class-suggestion__text">{{ suggestionText }}</span>
  <button class="class-suggestion__accept" @click="acceptSuggestion">Switch</button>
  <button class="class-suggestion__dismiss" @click="suggestedClass = null">✕</button>
</div>
```

### `acceptSuggestion()`
1. Call `setActiveClass(suggestedClass.value.classId)`
2. Set `suggestedClass.value = null`

### Styling
- Compact banner — not a modal, not a toast. Sits inline below the dropdown.
- Background: `--primary-light`
- Border-left: 3px solid `--primary`
- Font size: `13px`
- Padding: `8px 12px`
- Dismiss button: small, ghost style, `--text-secondary`
- Switch button: small, primary filled, `--primary`
- Animate in with a subtle slide-down transition (`max-height` transition, 200ms)

---

## Step 3 — Wire up in `Dashboard.vue`

After the class list loads call `computeSuggestedClass()`. Import it from `useClassroom`.

Also call it again if the user leaves the Dashboard and returns (i.e. when `currentView` changes back to `'Dashboard'` — watch for this in `App.vue` or `Dashboard.vue`).

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] With a class whose `periodStartTime` is within 15 minutes from now, the suggestion banner appears below the class switcher on Dashboard load
- [ ] Tapping "Switch" changes the active class and dismisses the banner
- [ ] Tapping ✕ dismisses the banner without switching
- [ ] Banner does not appear if the suggested class is already the active class
- [ ] Banner does not appear if no class has a `periodStartTime` within the window
- [ ] Manually switching classes clears the suggestion
- [ ] Banner does not appear in Setup or Reports views
