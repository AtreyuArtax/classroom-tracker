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

        <!-- Sector buttons -->
        <button
          v-for="(item, idx) in visibleItems"
          :key="item.codeKey ?? item.categoryKey"
          class="radial-btn"
          :class="{
            'radial-btn--active': isActiveToggle(item),
          }"
          :style="itemPositionStyle(idx, visibleItems.length)"
          :aria-label="item.label"
          @click.stop="onItemTap(item)"
        >
          <span class="radial-btn__icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="radial-btn__label">{{ item.label }}</span>
        </button>

        <!-- Centre button (cancel / go-back) -->
        <button
          class="radial-centre"
          :aria-label="centreGoesBack ? 'Back' : 'Close menu'"
          @click.stop="handleCentre"
        >
          <span aria-hidden="true">{{ centreGoesBack ? '←' : '✕' }}</span>
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
 * This component ONLY calls useRadial and useClassroom.
 * No direct imports from src/db/.
 */

import { computed } from 'vue'
import { useRadial }    from '../composables/useRadial.js'
import { useClassroom } from '../composables/useClassroom.js'

// ─── composables ──────────────────────────────────────────────────────────────

const {
  isOpen,
  targetStudent,
  visibleItems,
  centreGoesBack,
  viewMode,
  close,
  handleCentre,
  handleItemTap,
} = useRadial()

const { logStandardEvent, logToggleEvent, logAttendanceEvent, behaviorCodes } = useClassroom()

// ─── geometry ─────────────────────────────────────────────────────────────────

/** Diameter of the ring container in px */
const RING_SIZE  = 260
/** Radius of the orbit on which buttons sit */
const ORBIT_R    = 95
/** Size of each sector button */
const BTN_SIZE   = 56

const ringStyle = {
  width:  `${RING_SIZE}px`,
  height: `${RING_SIZE}px`,
}

/**
 * Position each button evenly around the circle.
 * Angles start at the top (−90°) and go clockwise.
 *
 * @param {number} idx   Button index (0-based)
 * @param {number} total Total number of buttons
 */
function itemPositionStyle(idx, total) {
  const angleDeg = -90 + (360 / total) * idx
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
  const result = handleItemTap(item) // returns {student, code} or null (category drill)
  if (!result) return // just drilled into a category — no event

  const { student, code } = result

  if (code.type === 'toggle') {
    await logToggleEvent(student.studentId, code.codeKey)
  } else if (code.type === 'attendance') {
    await logAttendanceEvent(student.studentId, code.codeKey)
  } else {
    await logStandardEvent(student.studentId, code.codeKey)
  }
}
</script>

<style scoped>
/* ── Full-screen overlay ──────────────────────────────────────────────────── */
.radial-overlay {
  position:        fixed;
  inset:           0;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  z-index:         1000;
  /* subtle entrance */
  animation:       overlay-in 0.15s ease;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Ring container ──────────────────────────────────────────────────────── */
.radial-ring {
  position: relative;
  animation: ring-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes ring-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* ── Sector buttons ──────────────────────────────────────────────────────── */
.radial-btn {
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  justify-content: center;
  gap:             2px;

  background:    var(--surface);
  border:        none;
  border-radius: 50%;
  box-shadow:    var(--shadow-md);
  cursor:        pointer;
  padding:       0;
  
  /* minimum 44px enforced via inline style width/height = 56px */
  transition: transform 0.1s ease, background 0.15s ease;
}

.radial-btn:active {
  transform: scale(0.92);
}

/* Active toggle: student is currently out */
.radial-btn--active {
  background:  var(--state-out);
  box-shadow:  0 0 0 3px rgba(255, 59, 48, 0.3), var(--shadow-md);
}

.radial-btn--active .radial-btn__label {
  color: #fff;
}

.radial-btn__icon {
  font-size:   1.25rem;
  line-height: 1;
}

.radial-btn__label {
  font-size:   0.55rem;
  font-weight: 600;
  color:       var(--text-secondary);
  text-align:  center;
  max-width:   50px;
  overflow:    hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Centre button ───────────────────────────────────────────────────────── */
.radial-centre {
  position:        absolute;
  top:             50%;
  left:            50%;
  transform:       translate(-50%, -50%);

  width:           52px;
  height:          52px;
  border-radius:   50%;
  border:          none;
  background:      var(--bg-secondary);
  box-shadow:      var(--shadow-sm);
  cursor:          pointer;

  display:         flex;
  align-items:     center;
  justify-content: center;

  font-size:       1.2rem;
  color:           var(--text-secondary);
  transition:      transform 0.1s ease, background 0.15s ease;
}

.radial-centre:active {
  transform: translate(-50%, -50%) scale(0.92);
}
</style>
