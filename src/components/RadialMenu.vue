<template>
  <BaseModal
    :show="isOpen"
    unstyled
    close-on-backdrop
    @close="close"
  >
    <div class="radial-ring" :style="ringStyle">

      <!-- Sector buttons (behavior codes only) -->
      <button
        v-for="(item, idx) in visibleItems"
        :key="item.codeKey ?? item.categoryKey"
        :class="['radial-btn', 'radial-btn--' + item.category, getActiveToggleClass(item)]"
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
  </BaseModal>
</template>

<script setup>
/**
 * RadialMenu.vue
 *
 * Circular action menu that appears when a DeskTile is tapped.
 */

import { computed } from 'vue'
import { User, X, ChevronLeft } from 'lucide-vue-next'
import { resolveIcon }  from '../utils/icons.js'
import { useRadial }    from '../composables/useRadial.js'
import { useClassroom } from '../composables/useClassroom.js'
import BaseModal from './BaseModal.vue'

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
const RING_SIZE  = 320
/** Radius of the orbit on which all buttons (codes + Profile) sit */
const ORBIT_R    = 120
/** Size of each sector button */
const BTN_SIZE   = 76

const ringStyle = {
  width:  `${RING_SIZE}px`,
  height: `${RING_SIZE}px`,
}

/**
 * Evenly distribute ALL N+1 items (N behavior items + 1 Profile) around 360°.
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

function isActiveToggle(item) {
  return getActiveToggleClass(item) !== null
}

function getActiveToggleClass(item) {
  if (!item.codeKey) return null
  const code = behaviorCodes.value.find(c => c.codeKey === item.codeKey)
  if (!code) return null
  if (code.type === 'toggle' && targetStudent.value?.activeStates?.isOut === true) {
    return 'radial-btn--active radial-btn--active-out'
  }
  if (code.codeKey === 'a' && targetStudent.value?.activeStates?.isAbsent === true) {
    return 'radial-btn--active radial-btn--active-absent'
  }
  if (code.codeKey === 'l' && targetStudent.value?.activeStates?.lateMs != null && targetStudent.value?.activeStates?.lateMs > 0) {
    return 'radial-btn--active radial-btn--active-late'
  }
  return null
}

// ─── item tap handler ─────────────────────────────────────────────────────────

async function onItemTap(item) {
  const result = handleItemTap(item)
  if (!result) return

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
/* ── Ring container ──────────────────────────────────────────────── */
.radial-ring {
  position: relative;
  z-index: 1;
  animation: ring-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes ring-pop {
  from { transform: scale(0.8); opacity: 0; }
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
  width:           76px;
  cursor:          pointer;
  padding:         0;
  transition:      transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease;
  transform:       translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.radial-btn:hover {
  transform: translateY(-2px) scale(1.05);
}

.radial-btn:active {
  transform: scale(0.94);
}

.radial-btn__icon-circle {
  width:           52px;
  height:          52px;
  border-radius:   50%;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(255, 255, 255, 0.98);
  color:           #1c1c1e;
  box-shadow:      0 8px 24px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12);
  border:          1px solid rgba(255, 255, 255, 0.6);
  transition:      all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover: Matching the app's primary interactive state */
.radial-btn:hover .radial-btn__icon-circle {
  background:      #ffffff;
  color:           var(--primary, #4663ac);
  border-color:    #ffffff;
  box-shadow:      0 10px 28px rgba(70, 99, 172, 0.45);
}

.radial-btn:hover .radial-btn__label {
  color:           #ffffff;
  text-shadow:     0 2px 8px rgba(0, 0, 0, 0.9), 0 0 14px rgba(99, 133, 230, 0.9);
  transform:       scale(1.05);
}

/* Active/Pressed state */
.radial-btn:active .radial-btn__icon-circle {
  background:      var(--primary, #4663ac);
  color:           #ffffff;
}

/* Active toggle: Out of Class (Sky Blue — matches out-of-room desk) */
.radial-btn--active .radial-btn__icon-circle,
.radial-btn--active-out .radial-btn__icon-circle {
  background:      #0284c7 !important;
  border-color:    #38bdf8 !important;
  box-shadow:      0 8px 24px rgba(2, 132, 199, 0.55), 0 0 0 3px rgba(56, 189, 248, 0.3) !important;
  color:           #ffffff !important;
}

.radial-btn--active .radial-btn__label,
.radial-btn--active-out .radial-btn__label {
  color:           #ffffff !important;
  font-weight:     700 !important;
  text-shadow:     0 1px 3px rgba(0, 0, 0, 0.8), 0 0 12px rgba(56, 189, 248, 0.85) !important;
}

.radial-btn--active-out:hover .radial-btn__icon-circle {
  background:      #0369a1 !important;
  border-color:    #7dd3fc !important;
  box-shadow:      0 10px 28px rgba(2, 132, 199, 0.7), 0 0 0 4px rgba(56, 189, 248, 0.45) !important;
  color:           #ffffff !important;
}

/* Active toggle: Absent (Vibrant Red — matches absent desk) */
.radial-btn--active-absent .radial-btn__icon-circle {
  background:      #ef4444 !important;
  border-color:    #f87171 !important;
  box-shadow:      0 8px 24px rgba(239, 68, 68, 0.55), 0 0 0 3px rgba(248, 113, 113, 0.3) !important;
  color:           #ffffff !important;
}

.radial-btn--active-absent .radial-btn__label {
  color:           #ffffff !important;
  font-weight:     700 !important;
  text-shadow:     0 1px 3px rgba(0, 0, 0, 0.8), 0 0 12px rgba(248, 113, 113, 0.85) !important;
}

.radial-btn--active-absent:hover .radial-btn__icon-circle {
  background:      #dc2626 !important;
  border-color:    #fca5a5 !important;
  box-shadow:      0 10px 28px rgba(239, 68, 68, 0.7), 0 0 0 4px rgba(248, 113, 113, 0.45) !important;
  color:           #ffffff !important;
}

/* Active toggle: Late (Warm Amber / Gold — matches late desk) */
.radial-btn--active-late .radial-btn__icon-circle {
  background:      #f59e0b !important;
  border-color:    #fde047 !important;
  box-shadow:      0 8px 24px rgba(245, 158, 11, 0.55), 0 0 0 3px rgba(253, 224, 71, 0.3) !important;
  color:           #ffffff !important;
}

.radial-btn--active-late .radial-btn__label {
  color:           #ffffff !important;
  font-weight:     700 !important;
  text-shadow:     0 1px 3px rgba(0, 0, 0, 0.8), 0 0 12px rgba(253, 224, 71, 0.85) !important;
}

.radial-btn--active-late:hover .radial-btn__icon-circle {
  background:      #d97706 !important;
  border-color:    #fef08a !important;
  box-shadow:      0 10px 28px rgba(245, 158, 11, 0.7), 0 0 0 4px rgba(253, 224, 71, 0.45) !important;
  color:           #ffffff !important;
}

.radial-btn__icon {
  font-size: 1.25rem;
  line-height: 1;
}

.radial-btn__label {
  font-size:       11px;
  font-weight:     600;
  letter-spacing:  0.015em;
  white-space:     nowrap;
  color:           #ffffff;
  text-align:      center;
  text-shadow:     0 1px 3px rgba(0, 0, 0, 0.85), 0 2px 8px rgba(0, 0, 0, 0.5);
  line-height:     1.2;
  transition:      all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events:  none;
}

/* ── Centre button ───────────────────────────────────────────────── */
.radial-centre {
  position:        absolute;
  top:             50%;
  left:            50%;
  transform:       translate(-50%, -50%);

  width:           48px;
  height:          48px;
  border-radius:   50%;
  border:          1px solid rgba(255, 255, 255, 0.4);
  background:      rgba(255, 255, 255, 0.96);
  box-shadow:      0 6px 20px rgba(0, 0, 0, 0.3);
  cursor:          pointer;

  display:         flex;
  align-items:     center;
  justify-content: center;

  color:           #334155;
  transition:      all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.radial-centre:hover {
  background:      #ffffff;
  color:           var(--primary, #4663ac);
  border-color:    #ffffff;
  box-shadow:      0 8px 24px rgba(70, 99, 172, 0.35);
  transform:       translate(-50%, -50%) scale(1.08);
}

.radial-centre:active {
  transform: translate(-50%, -50%) scale(0.94);
}
</style>
