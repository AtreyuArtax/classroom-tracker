# Update 01 — Radial Expansion, Event Notes & Student Profile Modal

## Before You Start

Read these files first. Do not change anything yet.
- `src/components/RadialMenu.vue`
- `src/composables/useRadial.js`
- `src/components/StudentProfile.vue`
- `src/db/classService.js`
- `src/db/eventService.js`
- `src/db/index.js` (specifically the behavior code seed data)

Confirm your understanding of the current state before proceeding:
- The radial renders whatever codes are passed to `open(student, codes)` — no hardcoded items
- There is no Profile slot, no `requiresNote` logic, no note modal
- `StudentProfile.vue` exists as an inline panel with stats and an event log — it is NOT a modal
- Students have no `generalNote` field
- Events have no `note` field

---

## What This Update Adds

1. Three new behavior codes: Observation, Conversation, Parent Contact — all with `requiresNote: true`
2. `note` field on the event object and `logEvent` function
3. `EventNoteModal.vue` — captures a note before logging a `requiresNote` event
4. `generalNote` field on the student object + `updateStudentNote` in classService
5. `StudentProfileModal.vue` — a modal wrapper that shows general note + event feed. Distinct from the existing `StudentProfile.vue` inline panel which stays untouched.
6. Permanent 👤 Profile slot on the radial that opens `StudentProfileModal`

Make these changes in the order listed below. Do not skip ahead.

---

## Step 1 — Schema: Add `note` to events

### `src/db/eventService.js`

Update `logEvent` to accept and store an optional `note` field:

```js
// Current signature:
export async function logEvent({ studentId, classId, code, duration })

// Updated signature:
export async function logEvent({ studentId, classId, code, duration, note = null })
```

The event object written to IndexedDB must include `note` as a field. If not provided it defaults to `null`. All existing calls to `logEvent` that don't pass `note` continue to work unchanged — `null` is the correct default.

---

## Step 2 — Schema: Add `generalNote` to students

### `src/db/classService.js`

**Update `importRoster`** so new students are created with `generalNote: ''`:

```js
{
  firstName,
  lastName,
  seat: null,
  generalNote: '',          // ADD THIS
  activeStates: { isOut: false, outTime: null, isAbsent: false }
}
```

**Add a new exported function:**

```js
export async function updateStudentNote(classId, studentId, note) {
  const db = await getDB()
  const classRecord = await db.get('classes', classId)
  classRecord.students[studentId].generalNote = note
  await db.put('classes', classRecord)
}
```

**Migration for existing students:** In `src/db/index.js`, in the `upgrade` function, add a migration step so existing students who were created before this update get `generalNote: ''` added. Check `oldVersion < 2` and iterate through all class records to patch any student missing the field. Bump the database version to `2`.

---

## Step 3 — Schema: Add new behavior codes

### `src/db/index.js`

Add three new codes to the seed data. Every behavior code must have a `requiresNote` field — add it to the existing five codes as `false`, and set it to `true` on the three new ones:

```js
// Update existing codes to include requiresNote: false
"p":  { icon: "✋", label: "Participation",  category: "positive",       type: "standard",   requiresNote: false },
"m":  { icon: "📱", label: "On Device",      category: "redirect",       type: "standard",   requiresNote: false },
"w":  { icon: "🚽", label: "Washroom",       category: "neutral",        type: "toggle",     requiresNote: false },
"a":  { icon: "🚫", label: "Absent",         category: "attendance",     type: "attendance", requiresNote: false },
"l":  { icon: "⏰", label: "Late",           category: "attendance",     type: "attendance", requiresNote: false },

// Add these three new codes
"ob": { icon: "👁️",  label: "Observation",   category: "note",           type: "standard",   requiresNote: true  },
"cv": { icon: "💬", label: "Conversation",   category: "note",           type: "standard",   requiresNote: true  },
"pc": { icon: "📞", label: "Parent Contact", category: "communication",  type: "standard",   requiresNote: true  }
```

Also update the `settingsService.js` fallback defaults to match — add `requiresNote: false` to the three existing codes there.

**Migration:** In the `upgrade` function, for `oldVersion < 2`, iterate through existing behavior codes and add `requiresNote: false` to any that are missing the field. Add the three new codes if they don't already exist.

---

## Step 4 — Build `EventNoteModal.vue`

Create `src/components/EventNoteModal.vue`.

This is a centered modal overlay. It opens when the teacher taps a behavior code with `requiresNote: true` in the radial. It captures a note before the event is logged.

### Props
```js
props: {
  studentName: String,      // display only — shown in the modal title
  behaviorCode: Object,     // full code object: { icon, label, category, type, requiresNote }
  modelValue: Boolean       // v-model for open/close
}
```

### Emits
```js
emits: ['update:modelValue', 'save', 'cancel']
```

### Behaviour
- Renders as a centered card over a dimmed overlay (`--shadow-md`, `--bg` surface)
- Title: `"{icon} {label} — {studentName}"` (e.g. "📞 Parent Contact — Jane Doe")
- A `<textarea>` for the note. **Autofocus on open.** Placeholder: "Add a note..."
- "Save" button (primary style) and "Cancel" button (secondary/ghost style)
- **Save:** emits `save` with the textarea value as the payload. Does not log the event itself — the caller handles logging.
- **Cancel:** emits `cancel`. No event is logged.
- Pressing **Escape** triggers cancel.
- `Enter` key in the textarea inserts a newline — it does NOT submit. Teachers may want multi-line notes.
- Clicking the dimmed overlay background triggers cancel.

### Styling
Use only CSS custom properties from `main.css`. Modal card: `--radius-lg`, `--shadow-md`, `--surface` background. Overlay: `rgba(0,0,0,0.4)` backdrop. Textarea: full width, minimum 4 rows, `--radius-sm` border.

---

## Step 5 — Build `StudentProfileModal.vue`

Create `src/components/StudentProfileModal.vue`.

This is a modal that opens from the radial 👤 Profile slot. It is **distinct from the existing `StudentProfile.vue`** inline panel — do not modify `StudentProfile.vue`. This modal is specifically for quick access from the Dashboard while teaching.

### Props
```js
props: {
  studentId: String,
  classId: String,
  modelValue: Boolean    // v-model for open/close
}
```

### Emits
```js
emits: ['update:modelValue']
```

### Layout
A large centered modal card (not full screen — approximately 80% viewport width, 85% height, scrollable internally).

**Header:** Student full name (lastName, firstName). Close button (✕) top right. Emits `update:modelValue` with `false` on close.

**General Note section:**
- Label: "General Notes"
- A `<textarea>` pre-populated with `student.generalNote`
- Placeholder: "Notes about this student (seating needs, context, etc.)"
- Auto-saves on `@blur`:
  1. Call `classService.updateStudentNote(classId, studentId, value)`
  2. Update the local reactive ref immediately — do not re-fetch

**Event Feed section:**
- Label: "History" with total event count in brackets
- Load all events for this student via `eventService.getEventsByStudent(studentId, null)` when the modal opens
- Sorted newest first
- Each row: formatted timestamp (e.g. "Mar 7, 3:15 PM"), behavior code icon + label, note text if present (shown below the label in `--text-secondary` colour), duration if present (e.g. "14 min late", "7:32 washroom")
- If no events: "No events recorded yet."

**Report Card Export button:**
- Label: "📋 Copy for Report Card"
- Position: bottom of the modal, full width
- On click: compile and copy the following plain text to clipboard via `navigator.clipboard.writeText()`:

```
[Full Name] — [Class Name]

ATTENDANCE
Absences: X  |  Lates: X  |  Avg. minutes late: X min

GENERAL NOTES
[generalNote text or "None recorded."]

EVENT HISTORY
[Mar 7, 3:15 PM] 📞 Parent Contact: Called dad re: factoring quiz
[Mar 6, 9:02 AM] 👁️ Observation: Struggling with fractions
[Mar 5, 10:15 AM] 🚽 Washroom (7:32)
...
```

- After copying: change button label to "✓ Copied!" for 1.5 seconds then revert. Use a reactive `ref` for this — no setTimeout longer than needed.

### Does not navigate away
The seating grid stays mounted behind this modal. Closing returns the teacher to the exact Dashboard state. Do not change `currentView`.

---

## Step 6 — Update `RadialMenu.vue` and `useRadial.js`

### The permanent 👤 Profile slot

The radial must always show a permanent 👤 Profile button in addition to the behavior code slots. This slot:
- Is **never** sourced from `behaviorCodes` settings
- Does **not** count toward the 6-item limit for behavior codes
- Is **always visible** — including during category drill-down
- Has a visually distinct style (lighter, secondary appearance — use `--text-secondary` and `--primary-light` rather than the primary code style)

Implementation: in `RadialMenu.vue`, after rendering the behavior code items, always render one additional item at a fixed position with icon 👤 and label "Profile". It emits a separate event `profile-tap` rather than going through the normal code selection path.

### The `requiresNote` intercept

Update the tap handler in `useRadial.js` (or wherever `handleItemTap` resolves). When a behavior code is selected:

1. Check if `behaviorCode.requiresNote === true`
2. If **false**: proceed as today — call `logStandardEvent`, `logToggleEvent`, or `logAttendanceEvent` immediately
3. If **true**: 
   - Close the radial overlay
   - Set a reactive ref `pendingNoteCode` to the selected code
   - Open `EventNoteModal` (via a ref or emitted event to the parent `Dashboard.vue`)
   - **Do not log the event yet**

In `Dashboard.vue`:
- Listen for the `profile-tap` event from `RadialMenu` → open `StudentProfileModal` for the tapped student
- Listen for `pendingNoteCode` being set → show `EventNoteModal`
- On `EventNoteModal` `save` event: call `logEvent` with the code + note, close the modal
- On `EventNoteModal` `cancel` event: clear `pendingNoteCode`, close the modal, no event logged

### Category drill-down with `requiresNote` codes

The three new codes (Observation, Conversation, Parent Contact) all have `category: "note"` or `category: "communication"`. With 8 total codes now, the radial exceeds 6 and must switch to category mode automatically. Ensure the category drill-down is working correctly with the new codes before considering this step complete.

---

## Step 7 — Behavior Code Editor in Setup.vue

Update the behavior code editor in `Setup.vue` to include a `requiresNote` toggle for each code. It should render as a simple checkbox or toggle switch labeled "Requires a note when tapped."

When saving a behavior code, always write the `requiresNote` field. Default to `false` for new codes.

---

## Verification Checklist

Before marking this update complete, confirm all of the following work correctly:

- [ ] Tapping a standard code (✋ Participation) logs immediately with no modal
- [ ] Tapping 📞 Parent Contact opens `EventNoteModal` with correct student name and code
- [ ] Saving a note in `EventNoteModal` logs the event with the note attached
- [ ] Cancelling `EventNoteModal` logs nothing
- [ ] Tapping 👤 Profile on the radial opens `StudentProfileModal` for the correct student
- [ ] `generalNote` textarea in `StudentProfileModal` auto-saves on blur
- [ ] Event feed in `StudentProfileModal` shows all events newest first, with notes displayed
- [ ] "Copy for Report Card" copies correct formatted text and shows "✓ Copied!" feedback
- [ ] With 8 behavior codes, the radial shows category mode (not flat 8 items)
- [ ] 👤 Profile slot is visible in both flat and category drill-down radial states
- [ ] Existing `StudentProfile.vue` inline panel in Reports is unchanged
- [ ] No existing functionality is broken
