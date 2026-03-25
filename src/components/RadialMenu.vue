<template>
  <!-- Full-screen overlay — tap outside to close -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="radial-overlay"
      aria-modal="true"
      role="dialog"
      :aria-label="`Radial menu for ${targetStudent?.firstName ?? 'student'}`"
      @click.self="close"
    >
      <!-- Radial ring ──────────────────────────────────────────────── -->
      <div class="radial-ring" :style="ringStyle">

        <!-- Sector buttons (behavior codes only) -->
        <button
          v-for="(item, idx) in visibleItems"
          :key="item.codeKey ?? item.categoryKey"
          :class="['radial-btn', 'radial-btn--' + item.category, { 'radial-btn--active': isActiveToggle(item) }]"
          :style="slotPositionStyle(idx, totalSlots)"
          :aria-label="item.label"
          @click.stop="onItemTap(item)"
        >
          <div class="radial-btn__icon-circle">
            <component :is="resolveIcon(item.icon)" :size="20" class="radial-btn__icon" />
          </div>
          <span class="radial-btn__label">{{ item.label }}</span>
        </button>

        <!-- Permanent 👤 Profile button — first level only -->
        <button
          v-if="showProfile"
          class="radial-btn radial-btn--profile"
          :style="profilePositionStyle"
          aria-label="Student Profile"
          @click.stop="onProfileTap"
        >
          <div class="radial-btn__icon-circle">
            <User :size="20" class="radial-btn__icon" />
          </div>
          <span class="radial-btn__label">Profile</span>
        </button>

        <!-- Centre button (cancel / go-back) -->
        <button
          class="radial-centre"
          :aria-label="centreGoesBack ? 'Back' : 'Close menu'"
          @click.stop="handleCentre"
        >
          <component :is="centreGoesBack ? ChevronLeft : X" :size="18" />
        </button>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * RadialMenu.vue
 *
 * Circular action menu that appears when a DeskTile is tapped.
 *
 * CLAUDE.md §7 rules enforced:
 *  - Tapping outside the overlay closes without logging
 *  - Category drill-down implemented from day one (not deferred)
 *  - Centre button: cancel in flat/category mode, go-back in sub mode
 *  - Toggle items render with active style when student is currently out
 *  - 44×44px minimum touch targets on all buttons
 *  - Circular layout via absolute positioning + calc()
 *
 * Update 01: permanent 👤 Profile button added at a fixed bottom position.
 *  - Not sourced from behaviorCodes — always rendered regardless of viewMode
 *  - Does not count toward the 6-item limit for behavior codes
 *  - Has a visually distinct secondary style
 *  - On tap: calls handleProfileTap() from useRadial
 *
 * This component ONLY calls useRadial and useClassroom.
 * No direct imports from src/db/.
 */

import { computed } from 'vue'
import { User, X, ChevronLeft } from 'lucide-vue-next'
import { resolveIcon }  from '../utils/icons.js'
import { useRadial }    from '../composables/useRadial.js'
import { useClassroom } from '../composables/useClassroom.js'

// ─── composables ──────────────────────────────────────────────────────────────

const {
  isOpen,
  targetStudent,
  visibleItems,
  centreGoesBack,
  showProfile,
  close,
  handleCentre,
  handleItemTap,
  handleProfileTap,
} = useRadial()

const { logStandardEvent, logToggleEvent, logAttendanceEvent, behaviorCodes } = useClassroom()

// ─── geometry ─────────────────────────────────────────────────────────────────

/** Diameter of the ring container in px */
const RING_SIZE  = 280
/** Radius of the orbit on which all buttons (codes + Profile) sit */
const ORBIT_R    = 108
/** Size of each sector button */
const BTN_SIZE   = 72

const ringStyle = {
  width:  `${RING_SIZE}px`,
  height: `${RING_SIZE}px`,
}

/**
 * Evenly distribute ALL N+1 items (N behavior items + 1 Profile) around 360°.
 * Profile is always the last slot (idx = visibleItems.length).
 * This guarantees no overlap regardless of item count or view mode.
 *
 * @param {number} idx    Button index (0-based)
 * @param {number} total  TOTAL slots including the Profile button (visibleItems.length + 1)
 */
function slotPositionStyle(idx, total) {
  const angleDeg = -90 + (360 / total) * idx   // start at top (-90°)
  const angleRad = (angleDeg * Math.PI) / 180
  const cx       = RING_SIZE / 2
  const cy       = RING_SIZE / 2
  const x        = cx + ORBIT_R * Math.cos(angleRad) - BTN_SIZE / 2
  const y        = cy + ORBIT_R * Math.sin(angleRad) - BTN_SIZE / 2
  return {
    position: 'absolute',
    left:     `${x}px`,
    top:      `${y}px`,
    width:    `${BTN_SIZE}px`,
    height:   `${BTN_SIZE}px`,
  }
}

/** Total slots = behavior items + 1 for Profile (first level only) */
const totalSlots = computed(() =>
  visibleItems.value.length + (showProfile.value ? 1 : 0)
)

/** Profile always occupies the last slot */
const profilePositionStyle = computed(() =>
  slotPositionStyle(visibleItems.value.length, totalSlots.value)
)


// ─── active toggle styling ────────────────────────────────────────────────────

/**
 * A toggle code button should render as "active" (student currently out)
 * when the student is already out and this is the toggle code.
 */
function isActiveToggle(item) {
  if (!item.codeKey) return false
  const code = behaviorCodes.value.find(c => c.codeKey === item.codeKey)
  if (!code || code.type !== 'toggle') return false
  return targetStudent.value?.activeStates?.isOut === true
}

// ─── item tap handler ─────────────────────────────────────────────────────────

async function onItemTap(item) {
  const result = handleItemTap(item) // returns {student, code} or null (category drill or requiresNote intercept)
  if (!result) return // drilled into category, or note modal will handle it

  const { student, code } = result

  if (code.type === 'toggle') {
    await logToggleEvent(student.studentId, code.codeKey)
  } else if (code.type === 'attendance') {
    await logAttendanceEvent(student.studentId, code.codeKey)
  } else {
    await logStandardEvent(student.studentId, code.codeKey)
  }
}

// ─── profile tap handler ──────────────────────────────────────────────────────

function onProfileTap() {
  handleProfileTap()
}
</script>

<style scoped>
/* ── Full-screen overlay ──────────────────────────────────────────── */
.radial-overlay {
  position:        fixed;
  inset:           0;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  z-index:         1000;
  animation:       overlay-in 0.15s ease;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Ring container ──────────────────────────────────────────────── */
.radial-ring {
  position: relative;
  animation: ring-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes ring-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* ── Sector buttons ──────────────────────────────────────────────── */
.radial-btn {
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  gap:             4px;
  background:      transparent;
  box-shadow:      none;
  border:          none;
  width:           72px;
  cursor:          pointer;
  padding:         0;
  transition:      transform 0.1s ease;
}

.radial-btn__icon-circle {
  width:           56px;
  height:          56px;
  border-radius:   50%;
  display:         flex;
  align-items:     center;
  justify-content: center;
  box-shadow:      0 3px 10px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1);
  border:          1px solid rgba(0,0,0,0.07);
  background:      var(--surface);
  transition:      background 0.15s ease, box-shadow 0.1s ease;
}

.radial-btn--positive      .radial-btn__icon-circle { background: #c8f0d0; }
.radial-btn--redirect      .radial-btn__icon-circle { background: #fff3cd; }
.radial-btn--attendance    .radial-btn__icon-circle,
.radial-btn--absence       .radial-btn__icon-circle,
.radial-btn--late          .radial-btn__icon-circle { background: #fde8e8; }
.radial-btn--note          .radial-btn__icon-circle { background: #dce8ff; }
.radial-btn--neutral       .radial-btn__icon-circle { background: #ddeeff; }
.radial-btn--communication .radial-btn__icon-circle { background: #dce8ff; }

.radial-btn:active {
  transform: scale(0.92);
}

/* Active toggle: student is currently out */
.radial-btn--active .radial-btn__icon-circle {
  background: #c0392b;
  box-shadow: 0 2px 8px rgba(192,57,43,0.35);
  color: white;
}

.radial-btn--active .radial-btn__label {
  color: #c0392b;
}

/* Profile slot: distinct secondary appearance */
.radial-btn--profile .radial-btn__icon-circle {
  background:  var(--primary-light);
  box-shadow: 0 2px 8px rgba(70,99,172,0.25);
}

.radial-btn--profile .radial-btn__label {
  color: var(--primary);
}

.radial-btn__icon {
  font-size:   1.25rem;
  line-height: 1;
}

.radial-btn__label {
  font-size:   11px;
  font-weight: 600;
  white-space: nowrap;
  color:       #6e6e73;
  text-align:  center;
}

/* ── Centre button ───────────────────────────────────────────────── */
.radial-centre {
  position:        absolute;
  top:             50%;
  left:            50%;
  transform:       translate(-50%, -50%);

  width:           52px;
  height:          52px;
  border-radius:   50%;
  border:          none;
  background:      #e0e0e5;
  box-shadow:      0 1px 4px rgba(0,0,0,0.1);
  cursor:          pointer;

  display:         flex;
  align-items:     center;
  justify-content: center;

  font-size:       1.2rem;
  color:           #555;
  transition:      transform 0.1s ease, background 0.15s ease;
}

.radial-centre:active {
  transform: translate(-50%, -50%) scale(0.92);
}
</style>
