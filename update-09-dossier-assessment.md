# Update 09 — Dossier Assessment Conversation Section (V3)

## Prerequisite

Update 08 must be complete and verified. `ac` events with `acContext` and `acOutcome` fields must be loggable before this update runs.

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/views/Reports.vue` — specifically the student dossier section and the "Notes & Parent Contact" feed
- `src/composables/useStudentDossier.js` — confirm how `noteEvents` is currently computed and what it filters for

Confirm:
- The "Notes & Parent Contact" feed currently filters for events where `note` is non-null
- There is no dedicated Assessment Conversation section in the dossier yet

---

## What This Update Does

1. Adds a dedicated "Assessment Conversations" section to the student dossier that surfaces `ac` events prominently with their context and outcome badges
2. Evolves the "Notes & Parent Contact" feed to correctly handle the merged `note` code (ob/cv prefix) and exclude `ac` events (which have their own section)
3. Updates `useStudentDossier.js` to compute assessment conversation stats

---

## Step 1 — Update `useStudentDossier.js`

Add two new computed properties:

```js
// Assessment conversations — separate from general noteEvents
const assessmentEvents = computed(() =>
  events.value.filter(e => e.code === 'ac')
)

// General notes — ob/cv merged note code and pc, excluding ac
const noteEvents = computed(() =>
  events.value.filter(e => e.note && e.code !== 'ac')
)
```

Also add to `stats` computed:
```js
assessmentConversations: assessmentEvents.value.length,
demonstratesUnderstanding: assessmentEvents.value.filter(e => e.acOutcome === 'demonstrates_understanding').length,
gapConfirmed: assessmentEvents.value.filter(e => e.acOutcome === 'gap_confirmed').length,
```

Export `assessmentEvents` from the composable.

---

## Step 2 — Add Assessment Conversations section to dossier in `Reports.vue`

Add a new card section **above** the existing "Notes & Parent Contact" feed. Only render it when `dossier.assessmentEvents.value.length > 0`.

### Card header
"Assessment Conversations" with `GraduationCap` icon. Show a small summary line:
```
3 conversations · 2 demonstrates understanding · 1 gap confirmed
```
Use coloured text for the outcome counts:
- "demonstrates understanding" count in `#34c759` (green)
- "gap confirmed" count in `#ff3b30` (red)

### Conversation list

Each `ac` event renders as a card item with:

**Line 1:** Date (formatted as "Mon, Mar 3") — `font-weight: 600`

**Line 2:** Context badge + Outcome badge side by side

Context badge styling:
- "After Assessment" — `#5856d6` background (purple), white text
- "Proactive" — `#007aff` background (blue), white text

Outcome badge styling:
- "Demonstrates Understanding" — `#34c759` background (green), white text
- "Gap Confirmed" — `#ff3b30` background (red), white text
- "Inconclusive" — `#ff9500` background (amber), white text

**Line 3:** Note text in `--text-secondary`, `font-size: 13px`, italic

**Delete button:** Small `X` button (same pattern as existing event log delete). Deleting an `ac` event removes it from IDB and refreshes the dossier.

### Empty state
If `assessmentEvents.length === 0`, do not render the card at all — no empty state needed since the section only appears when there is data.

---

## Step 3 — Update "Notes & Parent Contact" feed rendering

The existing feed filters for `dossier.noteEvents` which now correctly excludes `ac` events (handled in Step 1).

Update how `note` code events render in this feed. When a note event's `note` field starts with `[ob]` or `[cv]`, strip the prefix for display and show a small tag instead:

```
[Observation]  Mar 3, 12:04 pm
Student seemed to grasp the concept of slope during group work.

[Conversation]  Mar 4, 9:15 am  
Discussed the quiz result — student explained their approach clearly.
```

Tag styling:
- "Observation" — `--bg-secondary` background, `--text-secondary` text, `font-size: 11px`, `border-radius: 4px`, `padding: 2px 6px`
- "Conversation" — same styling

If the note does not start with `[ob]` or `[cv]` (legacy `ob`/`cv` events from before V3), render without a tag — just the note text as before.

---

## Step 4 — Update Absences stat card in dossier

The absences stat card currently shows total absences. If any absence events have `testDay === true`, show a secondary line:

```
4 Absences
2 on test days
```

"2 on test days" in `--text-secondary`, `font-size: 12px`. Only show this line if test day absences > 0.

---

## Step 5 — Update Class Overview attendance card

In the Class Overview unified dashboard (also in `Reports.vue`), the Attendance card should show a class-wide test day stat:

```
Total Absences: 12
On Test Days: 4
```

Derive this by filtering absence events where `testDay === true` within the selected period.

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors
- [ ] Logging an `ac` event and opening the student dossier shows it in the Assessment Conversations section
- [ ] Context and outcome badges render with correct colours
- [ ] Note text renders below the badges
- [ ] Summary line ("3 conversations · 2 demonstrates understanding · 1 gap confirmed") is accurate
- [ ] Deleting an assessment conversation removes it immediately from the section
- [ ] Assessment Conversations section does NOT appear for students with zero `ac` events
- [ ] `ac` events do NOT appear in the Notes & Parent Contact feed
- [ ] Note code events with `[ob]` prefix show "Observation" tag in the feed
- [ ] Note code events with `[cv]` prefix show "Conversation" tag in the feed
- [ ] Legacy `ob`/`cv` events (no prefix) render without a tag, not broken
- [ ] Absences stat card shows "X on test days" line when applicable
- [ ] Class Overview attendance card shows test day absences count
- [ ] Retroactive absence logging (Log Past Absence button) still works correctly
