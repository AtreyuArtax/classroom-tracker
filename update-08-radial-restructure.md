# Update 08 — Radial & Code Restructure (V3)

## Before You Start

Read `CLAUDE.md` for architectural rules. Then read:
- `src/db/index.js` — confirm DB_VERSION is `8`
- `src/db/settingsService.js` — confirm current default behavior codes
- `src/composables/useRadial.js` — confirm `requiresNote` interception pattern
- `src/components/EventNoteModal.vue` — confirm current modal structure
- `src/views/Dashboard.vue` — confirm how `pendingNoteCode` and `noteModalOpen` are wired

Do not make any changes until you have read all five files and confirmed the above.

---

## What This Update Does

1. Removes the `p` (Participation) behavior code
2. Merges `ob` and `cv` into a single `note` code with an ob/cv toggle in the modal
3. Adds a new `ac` (Assessment Conversation) code with its own dedicated modal
4. Bumps DB to version 9

---

## Step 1 — Database Migration (`src/db/index.js`)

Bump `DB_VERSION` to `9`.

Add an `oldVersion < 9` migration block:

```js
if (oldVersion < 9) {
  const tx9 = db.transaction('settings', 'readwrite')
  const settings = await tx9.objectStore('settings').get('singleton')
  if (settings && settings.behaviorCodes) {
    // Remove participation code
    delete settings.behaviorCodes['p']

    // Remove cv if it exists
    delete settings.behaviorCodes['cv']

    // Rename ob to note if ob exists
    if (settings.behaviorCodes['ob']) {
      settings.behaviorCodes['note'] = {
        ...settings.behaviorCodes['ob'],
        key: 'note',
        icon: 'NotebookPen',
        label: 'Note',
        category: 'note',
        type: 'standard',
        requiresNote: true,
        isTopLevel: false
      }
      delete settings.behaviorCodes['ob']
    }

    // Add ac if it doesn't exist
    if (!settings.behaviorCodes['ac']) {
      settings.behaviorCodes['ac'] = {
        key: 'ac',
        icon: 'GraduationCap',
        label: 'Assessment',
        category: 'assessment',
        type: 'standard',
        requiresNote: true,
        isTopLevel: true
      }
    }

    await tx9.objectStore('settings').put(settings)
  }
  await tx9.done
}
```

Also update the fresh install seed (`oldVersion === 0`) to reflect the new default codes — remove `p`, remove `ob`, remove `cv`, add `note` and `ac`.

---

## Step 2 — Update `settingsService.js`

Update the default behavior codes object to match the new structure:

```js
const DEFAULT_BEHAVIOR_CODES = {
  note: {
    key: 'note',
    icon: 'NotebookPen',
    label: 'Note',
    category: 'note',
    type: 'standard',
    requiresNote: true,
    isTopLevel: false
  },
  m: {
    key: 'm',
    icon: 'Smartphone',
    label: 'On Device',
    category: 'redirect',
    type: 'standard',
    requiresNote: false,
    isTopLevel: true
  },
  w: {
    key: 'w',
    icon: 'Toilet',
    label: 'Washroom',
    category: 'neutral',
    type: 'toggle',
    requiresNote: false,
    isTopLevel: true
  },
  a: {
    key: 'a',
    icon: 'UserX',
    label: 'Absent',
    category: 'attendance',
    type: 'attendance',
    requiresNote: false,
    isTopLevel: false
  },
  l: {
    key: 'l',
    icon: 'Clock',
    label: 'Late',
    category: 'attendance',
    type: 'attendance',
    requiresNote: false,
    isTopLevel: false
  },
  pc: {
    key: 'pc',
    icon: 'Phone',
    label: 'Parent',
    category: 'communication',
    type: 'standard',
    requiresNote: true,
    isTopLevel: true
  },
  ac: {
    key: 'ac',
    icon: 'GraduationCap',
    label: 'Assessment',
    category: 'assessment',
    type: 'standard',
    requiresNote: true,
    isTopLevel: true
  }
}
```

Remove `p`, `ob`, and `cv` entirely from defaults.

---

## Step 3 — Update `EventNoteModal.vue`

The existing modal handles `requiresNote` codes. It needs to support the `note` code's ob/cv toggle.

Add a computed property that checks if the current `behavior-code` prop has `key === 'note'`. If so, render a small toggle below the textarea:

```vue
<div v-if="isNoteCode" class="enm-toggle-row">
  <span class="enm-toggle-label">Type</span>
  <div class="enm-toggle-group">
    <button
      :class="['enm-toggle-btn', noteType === 'ob' ? 'enm-toggle-btn--active' : '']"
      @click="noteType = 'ob'"
    >Observation</button>
    <button
      :class="['enm-toggle-btn', noteType === 'cv' ? 'enm-toggle-btn--active' : '']"
      @click="noteType = 'cv'"
    >Conversation</button>
  </div>
</div>
```

Add `noteType` ref defaulting to `'ob'`.

On save, emit `save` with both the note text and the note type:
```js
emit('save', { note: noteText.value, noteType: noteType.value })
```

**Important:** The existing `pc` (Parent Contact) code also uses this modal and should NOT show the toggle. Only show it when `behaviorCode.key === 'note'`.

Update `Dashboard.vue` to handle the new save payload — when the code is `note`, pass `noteType` into the event being logged. Store it in the event's `note` field as a prefixed string: `[ob] teacher note text here` or `[cv] teacher note text here`. This avoids a DB schema change while preserving the distinction.

---

## Step 4 — Create `AssessmentConversationModal.vue`

Create `src/components/AssessmentConversationModal.vue`.

This is a new modal specifically for the `ac` code. It is NOT a modification of `EventNoteModal` — it is a separate component wired in parallel.

### Props
```js
props: {
  modelValue: Boolean,
  studentName: String
}
```

### Emits
```js
emits: ['update:modelValue', 'save', 'cancel']
```

### Layout

Title: "Assessment Conversation" with `GraduationCap` icon and student name.

**Context toggle** (required, single select):
```
After Assessment    Proactive
```
Default: neither selected — teacher must choose before saving.

**Outcome toggle** (required, single select):
```
Demonstrates Understanding    Gap Confirmed    Inconclusive
```
Default: neither selected — teacher must choose before saving.

**Note textarea** (required):
- Placeholder: "What did the student say or demonstrate?"
- Autofocus on open

**Save button** — disabled until all three fields are filled (context, outcome, note text).

**Cancel button** — dismisses with no action.

**Escape key and backdrop click** = cancel.

On save, emit:
```js
emit('save', {
  note: noteText.value,
  acContext: context.value,    // 'after_assessment' | 'proactive'
  acOutcome: outcome.value     // 'demonstrates_understanding' | 'gap_confirmed' | 'inconclusive'
})
```

### Styling
Match `EventNoteModal` styling. Toggle buttons use:
- Default: `--bg-secondary` background, `--text-secondary` colour
- Selected: `--primary` background, white text
- Outcome "Demonstrates Understanding": selected state uses `#34c759` (green)
- Outcome "Gap Confirmed": selected state uses `#ff3b30` (red)
- Outcome "Inconclusive": selected state uses `#ff9500` (amber)

---

## Step 5 — Wire `AssessmentConversationModal` in `Dashboard.vue`

In `useRadial.js`, the `ac` code already has `requiresNote: true` so `handleItemTap()` will set `pendingNoteCode` and `pendingNoteStudent` when tapped — same as `pc` and `note`.

In `Dashboard.vue`:
- Add a computed `isAssessmentCode` that checks `pendingNoteCode.value?.key === 'ac'`
- When `isAssessmentCode` is true, show `AssessmentConversationModal` instead of `EventNoteModal`
- When `isAssessmentCode` is false and `noteModalOpen` is true, show `EventNoteModal` as before

Handle `AssessmentConversationModal` save:
```js
async function onAssessmentSave({ note, acContext, acOutcome }) {
  await logEvent({
    studentId: pendingNoteStudent.value.studentId,
    code: 'ac',
    category: 'assessment',
    type: 'standard',
    note,
    acContext,
    acOutcome
  })
  pendingNoteCode.value = null
  pendingNoteStudent.value = null
}
```

**DB schema note:** `acContext` and `acOutcome` are new fields on event objects. No DB migration needed — they are simply absent on all existing events and treated as `null` wherever queried.

---

## Step 6 — Add `GraduationCap` to `utils/icons.js`

Add `GraduationCap` and `NotebookPen` to the icon resolver if not already present.

---

## Verification Checklist

- [ ] `npm run dev` starts with no errors after DB migration to v9
- [ ] Participation code no longer appears in the radial or Setup behavior code editor
- [ ] Tapping "Note" on the radial opens `EventNoteModal` with the ob/cv toggle
- [ ] Saving a Note event with "Observation" selected prefixes the note with `[ob]`
- [ ] Saving a Note event with "Conversation" selected prefixes the note with `[cv]`
- [ ] Parent Contact modal shows NO ob/cv toggle
- [ ] Tapping "Assessment" on the radial opens `AssessmentConversationModal`
- [ ] Save button on `AssessmentConversationModal` is disabled until context, outcome, and note are all filled
- [ ] Assessment Conversation events are logged with `acContext` and `acOutcome` fields
- [ ] Existing events without `acContext`/`acOutcome` are unaffected
- [ ] `GraduationCap` and `NotebookPen` icons resolve correctly on desk tiles and radial
- [ ] Setup behavior code editor no longer shows `p`, `ob`, or `cv` codes
