# Update 03 — Replace All Emoji with Lucide Icons

## Before You Start

Read `Dashboard.vue` and confirm whether it contains any hardcoded emoji not captured in the audit. Report what you find before proceeding.

Install the Lucide Vue package:

```
npm install lucide-vue-next
```

Confirm installation succeeded before proceeding.

---

## The Core Architecture Change

Behavior code icons are currently stored as emoji strings in IndexedDB (e.g. `"✋"`, `"📱"`). These need to become Lucide icon name strings (e.g. `"Hand"`, `"Smartphone"`). Everywhere that currently renders `{{ code.icon }}` as text must instead dynamically resolve and render the Lucide component.

**The dynamic resolution pattern — use this everywhere a behavior code icon is rendered:**

```vue
<script setup>
import * as LucideIcons from 'lucide-vue-next'

function resolveIcon(name) {
  return LucideIcons[name] ?? LucideIcons.HelpCircle
}
</script>

<template>
  <component :is="resolveIcon(code.icon)" :size="20" />
</template>
```

This pattern is used in: `RadialMenu.vue`, `StudentProfile.vue`, `StudentProfileModal.vue`, and anywhere else `code.icon` is rendered.

---

## Complete Emoji → Lucide Mapping

### Behavior codes (stored in DB — icon field changes)

| Code | Current emoji | New Lucide name | Import name |
|------|--------------|-----------------|-------------|
| p    | ✋           | `Hand`          | `Hand` |
| m    | 📱           | `Smartphone`    | `Smartphone` |
| w    | 🚽           | `Droplets`      | `Droplets` |
| a    | 🚫           | `UserX`         | `UserX` |
| l    | ⏰           | `Clock`         | `Clock` |
| ob   | 👁️           | `Eye`           | `Eye` |
| cv   | 💬           | `MessageSquare` | `MessageSquare` |
| pc   | 📞           | `Phone`         | `Phone` |

### UI icons (hardcoded in templates)

| Location | Current emoji | Lucide component |
|---|---|---|
| App.vue — brand logo | 📋 | `ClipboardList` |
| App.vue — Dashboard nav | 🏠 | `LayoutDashboard` |
| App.vue — Setup nav | ⚙️ | `Settings` |
| App.vue — Reports nav | 📊 | `BarChart2` |
| DeskTile.vue — washroom out | 🚽 | `Droplets` |
| DeskTile.vue — absent | 🚫 | `UserX` |
| DeskTile.vue — late | ⏰ | `Clock` |
| RadialMenu.vue — profile slot | 👤 | `User` |
| RadialMenu.vue — close button | ✕ | `X` |
| RadialMenu.vue — back button | ← | `ChevronLeft` |
| StudentProfile.vue — Absences card | 🚫 | `UserX` |
| StudentProfile.vue — Late Total card | ⏰ | `Clock` |
| StudentProfile.vue — Late Arrivals card | ⏰ | `Clock` |
| StudentProfile.vue — Washroom Trips card | 🚻 | `Droplets` |
| StudentProfile.vue — On Device card | 📱 | `Smartphone` |
| StudentProfile.vue — fallback icon | ❓ | `HelpCircle` |
| StudentProfileModal.vue — close button | ✕ | `X` |
| StudentProfileModal.vue — copy button | 📋 | `ClipboardList` |
| StudentProfileModal.vue — copied confirm | ✓ | `Check` |
| StudentProfileModal.vue — fallback icon | ❓ | `HelpCircle` |
| Reports.vue — Class Overview button | 📊 | `BarChart2` |
| Reports.vue — roster show toggle | ▼ | `ChevronDown` |
| Reports.vue — roster hide toggle | ▲ | `ChevronUp` |
| Reports.vue — download backup | ⬇️ | `Download` |
| Reports.vue — choose backup file | 📂 | `FolderOpen` |
| Setup.vue — archived toggle | 📦 | `Archive` |
| Setup.vue — expand chevron | ▼ | `ChevronDown` |
| Setup.vue — collapse chevron | ▲ | `ChevronUp` |
| Setup.vue — warning dialog | ⚠️ | `AlertTriangle` |
| Setup.vue — choose CSV | 📂 | `FolderOpen` |
| Setup.vue — students added | ✅ | `CheckCircle` |
| Setup.vue — students updated | 🔄 | `RefreshCw` |
| Setup.vue — skipped warning | ⚠️ | `AlertTriangle` |
| Setup.vue — note required badge | 📝 | `FileText` |
| Setup.vue — delete code button | 🗑 | `Trash2` |

---

## Step 1 — Database migration

### `src/db/index.js`

Bump `DB_VERSION` to `3`.

Add a migration block for `oldVersion < 3` that updates the `icon` field on all behavior codes in the settings record:

```js
// oldVersion < 3 migration
const EMOJI_TO_LUCIDE = {
  '✋': 'Hand',
  '📱': 'Smartphone',
  '🚽': 'Droplets',
  '🚫': 'UserX',
  '⏰': 'Clock',
  '👁️': 'Eye',
  '💬': 'MessageSquare',
  '📞': 'Phone',
}

const settings = await tx.objectStore('settings').get('singleton')
if (settings?.behaviorCodes) {
  for (const key of Object.keys(settings.behaviorCodes)) {
    const code = settings.behaviorCodes[key]
    if (EMOJI_TO_LUCIDE[code.icon]) {
      code.icon = EMOJI_TO_LUCIDE[code.icon]
    }
  }
  await tx.objectStore('settings').put(settings)
}
```

Also update the seed data for fresh installs (`oldVersion === 0`) to use Lucide names instead of emoji:

```js
"p":  { icon: "Hand",          label: "Participation",  category: "positive",      type: "standard",   requiresNote: false },
"m":  { icon: "Smartphone",    label: "On Device",      category: "redirect",      type: "standard",   requiresNote: false },
"w":  { icon: "Droplets",      label: "Washroom",       category: "neutral",       type: "toggle",     requiresNote: false },
"a":  { icon: "UserX",         label: "Absent",         category: "attendance",    type: "attendance", requiresNote: false },
"l":  { icon: "Clock",         label: "Late",           category: "attendance",    type: "attendance", requiresNote: false },
"ob": { icon: "Eye",           label: "Observation",    category: "note",          type: "standard",   requiresNote: true  },
"cv": { icon: "MessageSquare", label: "Conversation",   category: "note",          type: "standard",   requiresNote: true  },
"pc": { icon: "Phone",         label: "Parent Contact", category: "communication", type: "standard",   requiresNote: true  }
```

Also update the fallback defaults in `src/db/settingsService.js` to use Lucide names.

---

## Step 2 — Shared icon resolver utility

Create `src/utils/icons.js`:

```js
import * as LucideIcons from 'lucide-vue-next'

/**
 * Resolves a Lucide icon name string to its Vue component.
 * Falls back to HelpCircle if the name is not found.
 */
export function resolveIcon(name) {
  return LucideIcons[name] ?? LucideIcons.HelpCircle
}

/**
 * Common icon size for behavior code contexts (radial, event feed, charts)
 */
export const ICON_SIZE_SM = 18

/**
 * Common icon size for navigation and UI chrome
 */
export const ICON_SIZE_MD = 22
```

Import `resolveIcon` from this utility wherever behavior code icons are rendered dynamically. Do not duplicate the resolver logic across components.

---

## Step 3 — `App.vue`

Import the four nav icons and brand icon directly:

```js
import { ClipboardList, LayoutDashboard, Settings, BarChart2 } from 'lucide-vue-next'
```

Replace:
- `📋` brand logo → `<ClipboardList :size="24" />`
- `🏠` in views array → replace the icon string with the component reference, or switch the views array to use component references instead of emoji strings

For the views array pattern, change from:
```js
{ id: 'Dashboard', label: 'Dashboard', icon: '🏠' }
```
To:
```js
{ id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard }
```

And in the template change `{{ view.icon }}` to `<component :is="view.icon" :size="22" />`.

---

## Step 4 — `RadialMenu.vue`

Import:
```js
import { User, X, ChevronLeft } from 'lucide-vue-next'
import { resolveIcon } from '@/utils/icons.js'
```

Changes:
- Behavior code items: replace `{{ item.icon }}` with `<component :is="resolveIcon(item.icon)" :size="20" />`
- Profile slot: replace `👤` emoji with `<User :size="20" />`
- Close button: replace `✕` with `<X :size="18" />`
- Back button: replace `←` with `<ChevronLeft :size="18" />`

---

## Step 5 — `DeskTile.vue`

Import:
```js
import { Droplets, UserX, Clock } from 'lucide-vue-next'
```

Replace:
- `🚽` washroom → `<Droplets :size="16" />`
- `🚫` absent → `<UserX :size="16" />`
- `⏰` late → `<Clock :size="16" />`

---

## Step 6 — `StudentProfile.vue`

Import:
```js
import { UserX, Clock, Droplets, Smartphone, HelpCircle } from 'lucide-vue-next'
import { resolveIcon } from '@/utils/icons.js'
```

Replace hardcoded stat card label emoji:
- `🚫 Absences` → `<UserX :size="16" /> Absences`
- `⏰ Late Total` → `<Clock :size="16" /> Late Total`
- `⏰ Late Arrivals` → `<Clock :size="16" /> Late Arrivals`
- `🚻 Washroom Trips` → `<Droplets :size="16" /> Washroom Trips`
- `📱 On Device` → `<Smartphone :size="16" /> On Device`

For dynamic code icons (topBehavior, breakdown chart):
- Replace `{{ row.icon }}` with `<component :is="resolveIcon(row.icon)" :size="16" />`
- Replace `❓` fallback with `<HelpCircle :size="16" />`

---

## Step 7 — `StudentProfileModal.vue`

Import:
```js
import { X, ClipboardList, Check, HelpCircle } from 'lucide-vue-next'
import { resolveIcon } from '@/utils/icons.js'
```

Replace:
- Close button `✕` → `<X :size="18" />`
- Copy button `📋 Copy for Report Card` → `<ClipboardList :size="16" /> Copy for Report Card`
- Copied confirm `✓ Copied!` → `<Check :size="16" /> Copied!`
- Event feed `{{ codeInfo(evt.code).icon }}` → `<component :is="resolveIcon(codeInfo(evt.code).icon)" :size="16" />`
- Fallback `❓` → `<HelpCircle :size="16" />`

---

## Step 8 — `Reports.vue`

Import:
```js
import { BarChart2, ChevronDown, ChevronUp, Download, FolderOpen } from 'lucide-vue-next'
```

Replace:
- Class Overview button `📊` → `<BarChart2 :size="16" />`
- Roster show toggle `▼` → `<ChevronDown :size="16" />`
- Roster hide toggle `▲` → `<ChevronUp :size="16" />`
- Download backup `⬇️` → `<Download :size="16" />`
- Choose backup file `📂` → `<FolderOpen :size="16" />`

---

## Step 9 — `Setup.vue`

Import:
```js
import {
  Archive, ChevronDown, ChevronUp, AlertTriangle,
  FolderOpen, CheckCircle, RefreshCw, FileText, Trash2
} from 'lucide-vue-next'
```

Replace:
- Archived toggle `📦` → `<Archive :size="16" />`
- Expand `▼` → `<ChevronDown :size="16" />`
- Collapse `▲` → `<ChevronUp :size="16" />`
- Warning dialog `⚠️` → `<AlertTriangle :size="16" />`
- Choose CSV `📂` → `<FolderOpen :size="16" />`
- Students added `✅` → `<CheckCircle :size="16" />`
- Students updated `🔄` → `<RefreshCw :size="16" />`
- Skipped warning `⚠️` → `<AlertTriangle :size="16" />`
- Note required badge `📝` → `<FileText :size="16" />`
- Delete button `🗑` → `<Trash2 :size="16" />`

Also update the behavior code icon input in the Setup editor. Currently teachers type an emoji character into the icon field — this must now accept a Lucide icon name string instead. Add helper text below the input: "Enter a Lucide icon name, e.g. Hand, Smartphone, Star". Optionally add a small preview that renders the resolved icon live as the teacher types.

---

## Step 10 — `Dashboard.vue`

Read this file first and apply the same pattern to any emoji found. Use the same imports and `resolveIcon` utility as the other files.

---

## Sizing conventions

Use these sizes consistently:
- Navigation icons: `:size="22"`
- Behavior code icons in radial: `:size="20"`
- Behavior code icons in feeds, charts, cards: `:size="16"`
- UI action icons (close, back, delete): `:size="18"`
- Brand logo: `:size="24"`

---

## Verification Checklist

- [ ] `npm run dev` starts with no console errors
- [ ] All 8 behavior codes show Lucide icons in the radial menu — no emoji
- [ ] 👤 Profile slot shows `User` icon in radial
- [ ] Close (X) and back (ChevronLeft) in radial are Lucide icons
- [ ] Dashboard nav shows LayoutDashboard, Setup shows Settings, Reports shows BarChart2
- [ ] Brand logo shows ClipboardList
- [ ] Desk tiles show Droplets (washroom), UserX (absent), Clock (late) — no emoji
- [ ] StudentProfile stat cards show Lucide icons — no emoji
- [ ] StudentProfile breakdown chart shows Lucide icons per code
- [ ] StudentProfileModal event feed shows Lucide icons — no emoji
- [ ] StudentProfileModal close and copy buttons show Lucide icons
- [ ] Reports Class Overview button shows BarChart2
- [ ] Reports roster toggle shows ChevronDown / ChevronUp
- [ ] Reports backup buttons show Download and FolderOpen
- [ ] Setup archived, warnings, CSV, import results, note badge, delete all show Lucide icons
- [ ] Existing students' behavior codes display correctly after DB migration to version 3
- [ ] No emoji characters remain anywhere in the UI
- [ ] Setup behavior code editor accepts Lucide name strings with live preview
