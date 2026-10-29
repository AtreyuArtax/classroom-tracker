<template>
  <div class="setup__card" id="sec-seating-display">
    <div class="setup__card-header-row">
      <div>
        <h2 class="setup__card-title">Seating Chart Display</h2>
        <p class="setup__hint">
          Customize which instructional and visual indicators appear on dashboard desk tiles.
        </p>
      </div>
    </div>

    <div class="seating-pref__layout">
      <!-- Live Interactive Mini-Tile Preview -->
      <div class="seating-pref__preview-col">
        <div class="seating-pref__preview-label">LIVE PREVIEW</div>
        <div class="seating-pref__tile-wrapper">
          <div class="mini-tile">
            <!-- Accommodations Dot -->
            <span
              v-if="showIepDot"
              class="mini-tile__iep-dot"
              title="IEP: Accommodations"
            />

            <!-- Academic Warning Dot -->
            <span
              v-if="showAtRiskDot"
              class="mini-tile__at-risk-dot"
              :title="`Academic Review: ${atRiskThreshold - 2}%`"
            />

            <!-- Content Area -->
            <div class="mini-tile__content">
              <template v-if="showDeskPhotos">
                <div class="mini-tile__avatar">
                  <User :size="18" class="mini-tile__avatar-icon" />
                </div>
                <span class="mini-tile__compact-name">Alex M.</span>
              </template>
              <template v-else>
                <span class="mini-tile__first">Alex</span>
                <span class="mini-tile__last">Mercer</span>
              </template>
            </div>
          </div>
        </div>
        <span class="seating-pref__preview-caption">Reflects active settings</span>
      </div>

      <!-- Indicator Toggle Controls -->
      <div class="seating-pref__controls-col">
        <!-- 1. Photos on Desk Tiles -->
        <div class="setup__pref-row seating-pref__row">
          <div class="setup__pref-text">
            <span class="setup__pref-title">Student Headshots</span>
            <span class="setup__pref-desc">Display captured headshots on desk tiles.</span>
          </div>
          <label class="setup__switch">
            <input type="checkbox" v-model="showDeskPhotos" />
            <span class="setup__switch-slider"></span>
          </label>
        </div>

        <!-- 2. Accommodations Dot -->
        <div class="setup__pref-row seating-pref__row">
          <div class="setup__pref-text">
            <div class="seating-pref__title-with-badge">
              <span class="setup__pref-title">Accommodations Dot</span>
              <span class="mini-indicator-chip mini-indicator-chip--iep">Bottom-Left</span>
            </div>
            <span class="setup__pref-desc">
              Discreet 7px purple dot for IEP and cyan dot for Gifted plans.
            </span>
          </div>
          <label class="setup__switch">
            <input type="checkbox" v-model="showIepDot" />
            <span class="setup__switch-slider"></span>
          </label>
        </div>

        <!-- 3. Academic At-Risk Dot + Threshold Input -->
        <div class="setup__pref-row seating-pref__row seating-pref__row--academic">
          <div class="setup__pref-text">
            <div class="seating-pref__title-with-badge">
              <span class="setup__pref-title">Academic Warning Threshold</span>
              <span class="mini-indicator-chip mini-indicator-chip--at-risk">Bottom-Right</span>
            </div>
            <span class="setup__pref-desc">
              Amber dot on desk tiles and triggers academic follow-up in Reports Action Required and Risk Analytics.
            </span>
            <div v-if="showAtRiskDot" class="seating-pref__threshold-inline">
              <span class="seating-pref__threshold-label">Flag marks below:</span>
              <div class="seating-pref__input-wrapper">
                <input
                  v-model.number="atRiskThreshold"
                  type="number"
                  min="30"
                  max="95"
                  step="1"
                  class="setup__input seating-pref__threshold-input"
                  @change="handleThresholdChange"
                />
                <span class="seating-pref__percent-sign">%</span>
              </div>
            </div>
          </div>
          <label class="setup__switch">
            <input type="checkbox" v-model="showAtRiskDot" />
            <span class="setup__switch-slider"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * src/components/setup/SeatingDisplaySettings.vue
 *
 * Dedicated configuration card for dashboard seating chart overlays:
 * - Student headshots
 * - Accommodations (IEP / Gifted) dot
 * - Academic At-Risk dot and threshold
 */

import { ref, watch } from 'vue'
import { User } from 'lucide-vue-next'
import { useSeatingDisplay } from '../../composables/useSeatingDisplay.js'
import { useClassroom } from '../../composables/useClassroom.js'

const { showDeskPhotos, showIepDot, showAtRiskDot, atRiskThreshold: sharedThreshold, updateAtRiskThreshold } = useSeatingDisplay()
const { thresholds } = useClassroom()

const atRiskThreshold = ref(sharedThreshold.value || thresholds.value?.atRiskThreshold || 60)

watch(sharedThreshold, (val) => {
  if (val !== undefined && val !== null) {
    atRiskThreshold.value = Number(val)
  }
})

async function handleThresholdChange() {
  const val = Math.max(30, Math.min(95, Number(atRiskThreshold.value) || 60))
  atRiskThreshold.value = val
  if (thresholds.value) {
    thresholds.value.atRiskThreshold = val
  }
  await updateAtRiskThreshold(val)
}
</script>

<style scoped>
.seating-pref__layout {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .seating-pref__layout {
    flex-direction: column;
    align-items: stretch;
  }
}

/* ── Left Preview Column ── */
.seating-pref__preview-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 140px;
}

.seating-pref__preview-label {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.seating-pref__tile-wrapper {
  width: 120px;
  height: 96px;
  background: var(--bg, #ffffff);
  border-radius: var(--radius-md, 12px);
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border);
}

.mini-tile {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.mini-tile__iep-dot {
  position: absolute;
  bottom: 5px;
  left: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8b5cf6;
  box-shadow: 0 0 5px rgba(139, 92, 246, 0.5);
}

.mini-tile__at-risk-dot {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 5px rgba(245, 158, 11, 0.5);
}

.mini-tile__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.mini-tile__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--bg-secondary, #f2f2f7);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.mini-tile__compact-name {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
  margin-top: 2px;
}

.mini-tile__first {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text);
}

.mini-tile__last {
  font-size: 0.62rem;
  color: var(--text-secondary);
}

.seating-pref__preview-caption {
  font-size: 0.68rem;
  color: var(--text-secondary);
  margin-top: 6px;
  text-align: center;
}

/* ── Right Controls Column ── */
.seating-pref__controls-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.seating-pref__row {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  background: var(--bg-secondary, rgba(0, 0, 0, 0.02));
  margin-bottom: 0;
}

.seating-pref__title-with-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-indicator-chip {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  line-height: 1.2;
}

.mini-indicator-chip--iep {
  background: rgba(139, 92, 246, 0.15);
  color: #7c3aed;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.mini-indicator-chip--at-risk {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.seating-pref__threshold-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.seating-pref__input-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.seating-pref__threshold-input {
  width: 64px !important;
  padding: 3px 20px 3px 8px !important;
  font-size: 0.85rem !important;
  font-weight: 700 !important;
  text-align: right;
  height: 28px !important;
}

.seating-pref__percent-sign {
  position: absolute;
  right: 7px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  pointer-events: none;
}
</style>
