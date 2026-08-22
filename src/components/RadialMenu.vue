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
  if (!item.codeKey) return false
  const code = behaviorCodes.value.find(c => c.codeKey === item.codeKey)
  if (!code) return false
  if (code.type === 'toggle') {
    return targetStudent.value?.activeStates?.isOut === true
  }
  if (code.codeKey === 'a') {
    return targetStudent.value?.activeStates?.isAbsent === true
  }
  if (code.codeKey === 'l') {
    return targetStudent.value?.activeStates?.lateMs != null && targetStudent.value?.activeStates?.lateMs > 0
  }
  return false
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
  animation: ring-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes ring-pop {
  from { transform: scale(0.65); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
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
  background:      var(--surface, #ffffff);
  color:           var(--text, #1c1c1e);
  box-shadow:      0 4px 14px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06);
  border:          1px solid var(--border, rgba(0, 0, 0, 0.08));
  transition:      all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover: Matching the app's primary interactive state */
.radial-btn:hover .radial-btn__icon-circle {
  background:      var(--primary-light, #eef2ff);
  color:           var(--primary, #4663ac);
  border-color:    var(--primary, #4663ac);
  box-shadow:      0 6px 18px rgba(70, 99, 172, 0.25);
}

.radial-btn:hover .radial-btn__label {
  color:           var(--primary, #4663ac);
  font-weight:     700;
}

/* Active/Pressed state */
.radial-btn:active .radial-btn__icon-circle {
  background:      var(--primary, #4663ac);
  color:           #ffffff;
}

/* Active toggle: student is currently out */
.radial-btn--active .radial-btn__icon-circle {
  background:      var(--state-out, #ef4444) !important;
  border-color:    #dc2626 !important;
  box-shadow:      0 6px 18px rgba(239, 68, 68, 0.45) !important;
  color:           #ffffff !important;
}

.radial-btn--active .radial-btn__label {
  color:           var(--state-out, #ef4444) !important;
  font-weight:     700;
}

.radial-btn__icon {
  font-size: 1.25rem;
  line-height: 1;
}

.radial-btn__label {
  font-size:   11px;
  font-weight: 600;
  white-space: nowrap;
  color:       var(--text, #1c1c1e);
  text-align:  center;
  transition:  color 0.18s ease;
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
  border:          1px solid var(--border);
  background:      var(--surface);
  box-shadow:      0 4px 12px rgba(0, 0, 0, 0.12);
  cursor:          pointer;

  display:         flex;
  align-items:     center;
  justify-content: center;

  color:           var(--text-secondary);
  transition:      all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.radial-centre:hover {
  background:      var(--primary-light, #eef2ff);
  color:           var(--primary, #4663ac);
  border-color:    var(--primary, #4663ac);
  box-shadow:      0 6px 16px rgba(70, 99, 172, 0.2);
  transform:       translate(-50%, -50%) scale(1.08);
}

.radial-centre:active {
  transform: translate(-50%, -50%) scale(0.94);
}
</style>
