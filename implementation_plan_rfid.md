# RFID Keyboard-Wedge Washroom Tracking

Add RFID scanner support alongside the existing QR camera, using the same washroom toggle logic. Since RFID tags encode an arbitrary 14-char hex code, a **mapping layer** (hex → studentId) is required. The scanner widget gains a **mode slider** (QR / RFID) instead of a new toolbar button.

---

## Open Questions

> [!IMPORTANT]
> **Tag terminator assumption**: We'll assume the scanner sends `Enter` to terminate a scan, since you don't have the hardware yet. We can expose a setting later if it turns out to use `Tab` or another character — it would be a 1-line change.

> [!NOTE]
> **Keystroke timing guard**: We'll treat any burst of ≥6 characters completed in under 100 ms as a scanner read. This prevents a teacher typing normally in another field from being misinterpreted as an RFID scan.

---

## Proposed Changes

### 1 — Student Schema: add `rfidTag` field

#### [MODIFY] [classService.js](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/classService.js)

`patchStudent` already accepts an arbitrary `updates` object, so **no structural change** is needed. The `rfidTag` field is just stored on the student record like any other field (`generalNote`, `birthDate`, etc.).

What changes:
- In the "new student" template block inside `syncStudents`, add `rfidTag: ''` as a default field so it's always present.

---

### 2 — RFID Enrollment in Setup

This is the only genuinely new chunk of UI. Teachers need a way to link a physical card to a student.

#### [MODIFY] [Setup.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/views/Setup.vue)

Add a **"Link RFID Card"** row inside each student's edit card (next to the existing QR code button row):

- A small `<input readonly>` field that shows the currently linked hex code (or "Not linked" if empty).
- A **"Scan to Link"** button that:
  1. Puts a global keyboard-wedge listener into **enroll mode** for that specific student.
  2. Shows a brief modal/tooltip: *"Scan the card for [First Last]…"*
  3. On the next valid scanner burst, writes that hex code to `student.rfidTag` via `patchStudent`.
  4. Auto-closes.
- A small **clear/unlink** `✕` icon to wipe the tag.

> [!NOTE]
> The enroll listener is the **exact same** keyboard-wedge accumulator used in the scanner widget — just extracted into a shared composable so it's reusable.

---

### 3 — Shared Composable: `useKeyboardWedge.js` [NEW]

#### [NEW] [useKeyboardWedge.js](file:///Users/kylestashuk/Projects/classroom-tracker/src/composables/useKeyboardWedge.js)

A tiny composable that encapsulates the keyboard-wedge logic so both Setup (enroll) and the scanner widget (scan) share one implementation:

```
useKeyboardWedge(onComplete, options)
  options.terminator  — default '\n' (Enter key)
  options.maxGapMs    — default 80 ms between chars
  options.minLength   — default 6 chars (ignore stray keypresses)

Returns: { start(), stop(), isListening }
```

Internals:
- `keydown` listener accumulates characters into a buffer.
- A `setTimeout` per keystroke resets on each new char; if the gap exceeds `maxGapMs`, the buffer is discarded.
- When the terminator key arrives, if `buffer.length >= minLength`, fires `onComplete(buffer)` and clears.
- `start()` / `stop()` attach/detach the listener so the widget controls its lifetime.

---

### 4 — Scanner Widget: mode slider + RFID mode

#### [MODIFY] [QRScanner.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/QRScanner.vue)

**Header change**: The title becomes a **segmented mode toggle** — a pill-shaped slider with two options: `QR` and `RFID`. Visually similar to an iOS-style segment control.

**Body — RFID mode**: When RFID is selected, the camera viewfinder is replaced by:
- A pulsing antenna/wifi icon indicating "listening"
- "Ready — scan a card" status text
- The `useKeyboardWedge` composable is started; on a valid burst, the hex code is looked up in the RFID map and routed into the existing `handleScan(studentId)` function.

**Body — QR mode**: Exactly as today. No changes to camera logic.

**Mode persistence**: The selected mode is saved to `localStorage` (`scanner-mode`) so it remembers the teacher's preference across sessions.

**RFID lookup**: A computed `rfidMap` is built reactively from `students`:
```js
const rfidMap = computed(() => {
  const map = {}
  for (const [id, s] of Object.entries(students.value)) {
    if (s.rfidTag) map[s.rfidTag.toLowerCase()] = id
  }
  return map
})
```
The scan handler does `rfidMap.value[hexCode.toLowerCase()]` → `studentId` → existing `handleScan`.

**Unknown card**: If the hex code isn't in the map, flash an error overlay: *"Unknown card — link it in Setup"* with the error beep.

---

### 5 — RFID column in student roster (minor)

#### [MODIFY] [Setup.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/views/Setup.vue)

A small **RFID badge** (chip icon + "Linked" / "Not linked") visible on each student card, so teachers can quickly audit which students have cards assigned.

---

## Files Touched Summary

| File | Change |
|------|--------|
| `src/db/classService.js` | Add `rfidTag: ''` default in `syncStudents` new-student block |
| `src/composables/useKeyboardWedge.js` | **NEW** — shared keyboard-wedge accumulator composable |
| `src/components/QRScanner.vue` | Mode slider UI, RFID body panel, `useKeyboardWedge`, rfidMap lookup |
| `src/views/Setup.vue` | "Link RFID Card" scan-to-enroll UI per student |

> [!NOTE]
> `App.vue`, `Dashboard.vue`, `useClassroom.js` — **zero changes needed**. The `isScannerOpen` toggle and widget mounting stay exactly as-is.

---

## Verification Plan

### Functional
1. Assign an RFID tag to a test student via Setup → "Scan to Link" → confirm hex saved to IndexedDB.
2. Open scanner widget → switch to RFID mode → simulate scanner burst via a JS `KeyboardEvent` injection in DevTools → confirm student toggles OUT.
3. Scan unknown hex → confirm error overlay fires.
4. Switch back to QR mode → confirm camera starts normally.
5. Close and reopen widget → confirm mode is remembered from `localStorage`.

### Edge Cases
- Two students accidentally assigned the same tag (Setup should warn/prevent).
- Scanner burst during a debounce cooldown (should be silently ignored, same as QR).
- Teacher types normally in a text field while RFID mode is active (timing guard should not fire).
