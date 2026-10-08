<template>
  <div class="risk-plot">
    <div class="risk-plot__header">
      <div class="risk-plot__header-left">
        <h4 class="risk-plot__title">Student Risk & Engagement Matrix</h4>
        <p class="risk-plot__subtitle">
          {{ metricSubtitle }}
        </p>
      </div>

      <div class="risk-plot__header-right">
        <!-- Loss Factors Filter Group -->
        <div class="risk-plot__filter-group" role="group" aria-label="Loss Factors Filter">
          <button
            type="button"
            class="risk-plot__filter-chip"
            :class="{ 'risk-plot__filter-chip--active': activeFactors.absences }"
            @click="toggleFactor('absences')"
            title="Include 75m Absences in Lost Time"
          >
            <Check :size="11" class="chip-check" :class="{ 'chip-check--hidden': !activeFactors.absences }" />
            <span>Absences</span>
          </button>
          <button
            type="button"
            class="risk-plot__filter-chip"
            :class="{ 'risk-plot__filter-chip--active': activeFactors.lates }"
            @click="toggleFactor('lates')"
            title="Include Late Minutes in Lost Time"
          >
            <Check :size="11" class="chip-check" :class="{ 'chip-check--hidden': !activeFactors.lates }" />
            <span>Lates</span>
          </button>
          <button
            type="button"
            class="risk-plot__filter-chip"
            :class="{ 'risk-plot__filter-chip--active': activeFactors.washroom }"
            @click="toggleFactor('washroom')"
            title="Include Out-of-Class & Washroom Minutes in Lost Time"
          >
            <Check :size="11" class="chip-check" :class="{ 'chip-check--hidden': !activeFactors.washroom }" />
            <span>Out of Class</span>
          </button>
        </div>

        <!-- View Switcher -->
        <div class="risk-plot__view-switcher">
          <button 
            class="risk-plot__view-btn"
            :class="{ 'risk-plot__view-btn--active': viewMode === 'scatter' }"
            @click="viewMode = 'scatter'"
            title="Visual Scatter Matrix"
          >
            <ScatterPlotIcon :size="13" /> Scatter Plot
          </button>
          <button 
            class="risk-plot__view-btn"
            :class="{ 'risk-plot__view-btn--active': viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="Structured Quadrant Lists"
          >
            <List :size="13" /> Quadrant Lists
          </button>
        </div>
      </div>
    </div>

    <!-- Integrated Responsive Legend Sub-Bar -->
    <div v-if="viewMode === 'scatter'" class="risk-plot__legend-bar">
      <span class="legend-pill legend-pill--green">● Thriving</span>
      <span class="legend-pill legend-pill--yellow">● Academic Risk</span>
      <span class="legend-pill legend-pill--orange">● Presence Risk</span>
      <span class="legend-pill legend-pill--red">● Critical Intervention</span>
      <span class="legend-pill legend-pill--halo" title="Students with frequent or extended out-of-class departures">
        <span class="legend-halo-ring"></span> Frequent Leaver
      </span>
      <span v-if="unassessedCount > 0" class="legend-pill legend-pill--slate">● Pending Marks</span>
    </div>

    <!-- VIEW 1: 4 Quadrants Visual Scatter Canvas -->
    <div v-if="viewMode === 'scatter'" class="risk-plot__canvas">

      <!-- Quadrant Background Labels (Fixed to 4 outer corners of the canvas card) -->
      <div class="risk-plot__quadrant risk-plot__quadrant--top-left">
        <span class="risk-plot__quad-label">Presence Risk</span>
        <span class="risk-plot__quad-sub">{{ isSbar ? 'High Level' : 'High Marks' }} · Low Time in Class</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--top-right">
        <span class="risk-plot__quad-label">Thriving</span>
        <span class="risk-plot__quad-sub">{{ isSbar ? 'High Level' : 'High Marks' }} · High Time in Class</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--bottom-left">
        <span class="risk-plot__quad-label">Critical Intervention</span>
        <span class="risk-plot__quad-sub">{{ isSbar ? 'Low Level' : 'Low Marks' }} · Low Time in Class</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--bottom-right">
        <span class="risk-plot__quad-label">Academic Risk</span>
        <span class="risk-plot__quad-sub">{{ isSbar ? 'Low Level' : 'Low Marks' }} · High Time in Class</span>
      </div>

      <!-- Axis Divider Lines -->
      <div class="risk-plot__axis-x" :style="{ bottom: axisYPercent + '%' }"></div>
      <div class="risk-plot__axis-y" :style="{ left: axisXPercent + '%' }"></div>

      <!-- Student Dots (using crisp 2-letter initials) -->
      <div 
        v-for="s in studentPoints" 
        :key="s.studentId"
        class="risk-plot__dot"
        :class="[
          'risk-plot__dot--' + s.quadrant,
          { 'risk-plot__dot--halo': s.hasHalo }
        ]"
        :style="{ left: s.xPercent + '%', bottom: s.yPercent + '%' }"
        @click="$emit('select-student', s.studentId)"
      >
        <span class="risk-plot__dot-label">{{ s.initials }}</span>
        
        <!-- Multi-Student Cluster Tooltip if overlapping, otherwise Single Student Tooltip -->
        <div 
          class="risk-plot__tooltip"
          :class="{
            'risk-plot__tooltip--anchor-right': s.xPercent > 50,
            'risk-plot__tooltip--anchor-left': s.xPercent <= 50,
            'risk-plot__tooltip--anchor-top': s.yPercent > 50,
            'risk-plot__tooltip--anchor-bottom': s.yPercent <= 50,
            'risk-plot__tooltip--cluster': s.clusterMembers && s.clusterMembers.length > 1
          }"
        >
          <!-- Single Student Tooltip (Sleek, Compact Dashboard Size) -->
          <template v-if="!s.clusterMembers || s.clusterMembers.length <= 1">
            <div class="risk-plot__tt-header">
              <span class="risk-plot__tt-name">{{ s.fullName }}</span>
              <span class="risk-plot__tt-badge" :class="'tt-grade--' + s.quadrant">
                {{ isSbar ? (s.sbarBadge ? s.sbarBadge.level : 'N/A') : (s.grade !== null ? s.grade + '%' : 'N/A') }}
              </span>
            </div>

            <div v-if="s.hasHalo" class="risk-plot__tt-halo">
              <AlertTriangle :size="10" class="tt-halo-icon" />
              <span>{{ s.haloReason }}</span>
            </div>

            <div class="risk-plot__tt-meta">
              <strong>{{ s.timeInClassPct }}%</strong> In-Class
              <span v-if="s.activeLostMins > 0" class="risk-plot__tt-lost">
                ({{ s.activeLostMins }}m lost<template v-if="s.absences > 0 && activeFactors.absences"> · {{ s.absences }}a</template><template v-if="s.lateCount > 0 && activeFactors.lates"> · {{ s.lateCount }}l</template><template v-if="s.washroomCount > 0 && activeFactors.washroom"> · {{ s.washroomCount }} out</template>)
              </span>
            </div>
          </template>

          <!-- Multi-Student Cluster Tooltip -->
          <template v-else>
            <div class="risk-plot__tt-cluster-title">
              Cluster ({{ s.clusterMembers.length }} Students)
            </div>
            <div class="risk-plot__tt-cluster-items">
              <div 
                v-for="cSt in s.clusterMembers" 
                :key="'cl-'+cSt.studentId" 
                class="risk-plot__tt-cluster-row"
                @click.stop="$emit('select-student', cSt.studentId)"
              >
                <div class="cluster-row-top">
                  <span class="cluster-row-name">
                    <AlertTriangle v-if="cSt.hasHalo" :size="9" class="tt-halo-icon" :title="cSt.haloReason" />
                    {{ cSt.fullName }}
                  </span>
                  <span class="cluster-row-grade" :class="'tt-grade--' + cSt.quadrant">
                    {{ isSbar ? (cSt.sbarBadge ? cSt.sbarBadge.level : 'N/A') : (cSt.grade !== null ? cSt.grade + '%' : 'N/A') }}
                  </span>
                </div>
                <div class="cluster-row-sub">
                  {{ cSt.timeInClassPct }}% In-Class ({{ cSt.activeLostMins }}m lost)
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

    </div>

    <!-- VIEW 2: Structured Quadrant Card Lists -->
    <div v-else class="risk-plot__list-view">
      <div 
        v-for="group in quadrantGroups" 
        :key="group.key" 
        class="risk-plot__list-card"
        :class="'list-card--' + group.key"
      >
        <div class="list-card__header">
          <span class="list-card__title">
            <span class="list-card__dot" :class="'dot--' + group.key">●</span>
            {{ group.title }}
          </span>
          <span class="list-card__badge">{{ group.students.length }}</span>
        </div>

        <ul v-if="group.students.length > 0" class="list-card__student-list">
          <li 
            v-for="st in group.students" 
            :key="st.studentId" 
            class="list-card__student-item"
            @click="$emit('select-student', st.studentId)"
          >
            <div class="list-card__student-left">
              <span class="list-card__avatar" :class="'avatar--' + group.key">{{ st.initials }}</span>
              <span class="list-card__name">{{ st.fullName }}</span>
              <span v-if="st.hasHalo" class="list-card__halo-tag" :title="st.haloReason">
                <AlertTriangle :size="10" class="list-card__halo-icon" />
                <span>Frequent Leaver</span>
              </span>
            </div>
            <div class="list-card__student-right">
              <span class="list-card__score">
                <template v-if="isSbar">
                  {{ st.sbarBadge ? st.sbarBadge.level : 'N/A' }}
                </template>
                <template v-else>
                  {{ st.grade !== null ? st.grade + '%' : 'N/A' }}
                </template>
              </span>
              <span class="list-card__att">{{ st.timeInClassPct }}% In-Class ({{ st.activeLostMins }}m lost)</span>
            </div>
          </li>
        </ul>
        <div v-else class="list-card__empty">No students in this quadrant</div>
      </div>
    </div>

    <!-- Bottom summary pills (5 columns single-row) -->
    <div class="risk-plot__summary" :class="{ 'risk-plot__summary--5col': unassessedCount > 0 }">
      <div class="risk-plot__summary-card risk-plot__summary-card--red" @click="viewMode = 'list'">
        <span class="count">{{ criticalCount }}</span>
        <span class="label">Critical</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--yellow" @click="viewMode = 'list'">
        <span class="count">{{ academicRiskCount }}</span>
        <span class="label">Academic Risk</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--orange" @click="viewMode = 'list'">
        <span class="count">{{ attendanceRiskCount }}</span>
        <span class="label">Presence</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--green" @click="viewMode = 'list'">
        <span class="count">{{ thrivingCount }}</span>
        <span class="label">Thriving</span>
      </div>
      <div v-if="unassessedCount > 0" class="risk-plot__summary-card risk-plot__summary-card--slate" @click="viewMode = 'list'">
        <span class="count">{{ unassessedCount }}</span>
        <span class="label">Pending</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { calculateStudentRiskMatrix } from '../../utils/studentRiskMath.js'
import { LayoutGrid as ScatterPlotIcon, List, Check, AlertTriangle } from 'lucide-vue-next'

const { thresholds, behaviorCodes } = useClassroom()

const props = defineProps({
  sidebarStudents: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  aggregates: { type: Object, default: () => ({}) },
  allClassEvents: { type: Array, default: () => [] },
  isSbar: { type: Boolean, default: false }
})

defineEmits(['select-student'])

const viewMode = ref('scatter') // 'scatter' | 'list'

// Loss factors filter state (all 3 active by default for Total Time)
const activeFactors = ref({
  absences: true,
  lates: true,
  washroom: true
})

function toggleFactor(key) {
  const current = activeFactors.value[key]
  const activeCount = Object.values(activeFactors.value).filter(Boolean).length
  // Keep at least one factor active to prevent an empty calculation
  if (current && activeCount <= 1) return
  activeFactors.value[key] = !current
}

const axisXPercent = computed(() => {
  const attCutoff = Number(thresholds.value.attendanceThreshold ?? 85)
  const norm = Math.max(0, Math.min(1, (attCutoff - 50) / 50))
  return Math.max(6, Math.min(92, Math.round(norm * 86 + 6)))
})

const axisYPercent = computed(() => {
  const markCutoff = Number(thresholds.value.atRiskThreshold ?? 70)
  return Math.max(6, Math.min(92, Math.round(markCutoff * 0.86 + 6)))
})

// Set of custom toggle codes representing out-of-class events
const washCodes = computed(() => {
  const custom = (behaviorCodes.value || [])
    .filter(c => c.type === 'toggle')
    .map(c => c.codeKey)
  return new Set(['w', ...custom])
})

const matrixData = computed(() => {
  return calculateStudentRiskMatrix({
    sidebarStudents: props.sidebarStudents,
    allClassEvents: props.allClassEvents,
    classGrades: props.classGrades,
    thresholds: thresholds.value,
    filters: activeFactors.value,
    periodDuration: 75,
    washCodes: washCodes.value,
    isSbar: props.isSbar
  })
})

const studentPoints = computed(() => matrixData.value.studentPoints)
const quadrantGroups = computed(() => matrixData.value.quadrantGroups)
const criticalCount = computed(() => matrixData.value.criticalCount)
const academicRiskCount = computed(() => matrixData.value.academicRiskCount)
const attendanceRiskCount = computed(() => matrixData.value.attendanceRiskCount)
const thrivingCount = computed(() => matrixData.value.thrivingCount)
const unassessedCount = computed(() => matrixData.value.unassessedCount)
const metricSubtitle = computed(() => matrixData.value.metricSubtitle)
</script>

<style scoped>
.risk-plot {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-plot__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.risk-plot__title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 1px 0;
}

.risk-plot__subtitle {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
}

.risk-plot__legend-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 0;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.legend-pill--green  { color: var(--color-success); }
.legend-pill--yellow { color: var(--color-warn); }
.legend-pill--orange { color: var(--color-attention); }
.legend-pill--red    { color: var(--color-danger); }
.legend-pill--slate  { color: var(--color-neutral); }
.legend-pill--halo   { color: var(--color-halo, #cbd5e1); }

.legend-halo-ring {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--color-halo, #cbd5e1);
  box-shadow: 0 0 0 1px var(--color-halo-border, rgba(203, 213, 225, 0.35));
}

.risk-plot__canvas {
  position: relative;
  height: clamp(330px, 46vh, 420px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: visible;
}

.risk-plot__quadrant {
  position: absolute;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  pointer-events: none;
  opacity: 0.45;
  z-index: 0;
}

.risk-plot__quadrant--top-left     { top: 0; left: 0; text-align: left; }
.risk-plot__quadrant--top-right    { top: 0; right: 0; text-align: right; }
.risk-plot__quadrant--bottom-left  { bottom: 0; left: 0; text-align: left; }
.risk-plot__quadrant--bottom-right { bottom: 0; right: 0; text-align: right; }

.risk-plot__quad-label {
  font-weight: 700;
  font-size: 0.72rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.risk-plot__quad-sub {
  font-size: 0.65rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

/* Axis lines: neutral slate so Dark Reader can invert them to a visible
   color. var(--border) is rgba(0,0,0,0.1) which inverts to a near-invisible
   rgba(255,255,255,0.1) on dark backgrounds. */
.risk-plot__axis-x {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(100, 116, 139, 0.35);
  border-top: 1px dashed rgba(100, 116, 139, 0.45);
  z-index: 1;
  transition: bottom 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.risk-plot__axis-y {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(100, 116, 139, 0.35);
  border-left: 1px dashed rgba(100, 116, 139, 0.45);
  z-index: 1;
  transition: left 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.risk-plot__dot {
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: left 0.45s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.45s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.35s ease, border-color 0.35s ease, color 0.35s ease, transform 0.15s ease, box-shadow 0.15s ease, z-index 0.1s ease;
  z-index: 10;
}

.risk-plot__dot:hover {
  transform: translate(-50%, 50%) scale(1.35);
  z-index: 99999 !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

/* Solid opaque backgrounds so overlapping nodes are crisp and distinct */
.risk-plot__dot--green      { background: var(--color-success-bg);   border: 2px solid var(--color-success);   color: var(--color-success-text); }
.risk-plot__dot--yellow     { background: var(--color-warn-bg);       border: 2px solid var(--color-warn);      color: var(--color-warn-text); }
.risk-plot__dot--orange     { background: var(--color-attention-bg);  border: 2px solid var(--color-attention); color: var(--color-attention-text); }
.risk-plot__dot--red        { background: var(--color-danger-bg);     border: 2px solid var(--color-danger);    color: var(--color-danger-text); }
.risk-plot__dot--unassessed { background: var(--color-neutral-bg);    border: 2px dashed var(--color-neutral);  color: var(--color-neutral-text); }

/* Option 1: Chronic / Frequent Disruption Halo Ring (Subtle Architectural Platinum Orbit) */
.risk-plot__dot--halo {
  box-shadow: 
    0 0 0 2px var(--surface), 
    0 0 0 3.5px var(--color-halo, #cbd5e1), 
    0 1px 4px rgba(0, 0, 0, 0.35);
}

.risk-plot__dot--halo:hover {
  box-shadow: 
    0 0 0 2px var(--surface), 
    0 0 0 4px var(--color-halo-text, #e2e8f0), 
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.risk-plot__dot-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 22px;
}

/* ── Sleek, Compact Dashboard-Style Tooltips (Theme-Adaptive) ─────────── */
.risk-plot__tooltip {
  position: absolute;
  background: var(--chart-popover-bg, var(--surface, #ffffff));
  color: var(--chart-popover-text, var(--text, #1c1c1e));
  border: 1px solid var(--chart-popover-border, var(--border, rgba(0, 0, 0, 0.1)));
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 0.65rem;
  line-height: 1.25;
  box-shadow: var(--chart-popover-shadow, 0 4px 18px rgba(0, 0, 0, 0.15));
  pointer-events: auto;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.12s ease, visibility 0.12s ease;
  z-index: 20000;
  display: flex;
  flex-direction: column;
  gap: 2.5px;
  width: max-content;
  max-width: 215px;
  white-space: normal;
}

.risk-plot__dot:hover .risk-plot__tooltip {
  opacity: 1;
  visibility: visible;
}

/* Horizontal & Vertical Boundary Clamping (Guaranteed Zero Bleed) */
.risk-plot__tooltip--anchor-right {
  right: 0;
  left: auto;
  transform: none;
}

.risk-plot__tooltip--anchor-left {
  left: 0;
  right: auto;
  transform: none;
}

.risk-plot__tooltip--anchor-top {
  top: calc(100% + 5px);
  bottom: auto;
}

.risk-plot__tooltip--anchor-bottom {
  bottom: calc(100% + 5px);
  top: auto;
}

/* Single Student Tooltip Elements */
.risk-plot__tt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.risk-plot__tt-name {
  font-weight: 700;
  font-size: 0.72rem;
  color: var(--text, #1c1c1e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.risk-plot__tt-badge {
  font-weight: 800;
  font-size: 0.64rem;
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
}

.tt-grade--green      { color: var(--color-success-text);   background: var(--color-success-bg); }
.tt-grade--yellow     { color: var(--color-warn-text);      background: var(--color-warn-bg); }
.tt-grade--orange     { color: var(--color-attention-text); background: var(--color-attention-bg); }
.tt-grade--red        { color: var(--color-danger-text);    background: var(--color-danger-bg); }
.tt-grade--unassessed { color: var(--color-neutral-text);   background: var(--color-neutral-bg); }

.risk-plot__tt-halo {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  background: var(--color-halo-bg, rgba(203, 213, 225, 0.14));
  border: 1px solid var(--color-halo-border, rgba(203, 213, 225, 0.35));
  color: var(--color-halo-text, #475569);
  font-weight: 700;
  font-size: 0.62rem;
  padding: 1.5px 5px;
  border-radius: 3px;
}

.risk-plot__tt-meta {
  font-size: 0.62rem;
  color: var(--text-secondary, #6e6e73);
  white-space: nowrap;
}

.risk-plot__tt-meta strong {
  color: var(--text, #1c1c1e);
}

.risk-plot__tt-lost {
  color: var(--text-tertiary, #8e8e93);
  margin-left: 2px;
}

/* Cluster Popover Tooltip */
.risk-plot__tooltip--cluster {
  min-width: 175px;
  max-width: 215px;
  padding: 5px 6px;
}

.risk-plot__tt-cluster-title {
  font-weight: 800;
  font-size: 0.65rem;
  color: var(--chart-popover-title, var(--primary, #4663ac));
  border-bottom: 1px solid var(--chart-popover-divider, var(--border, rgba(0, 0, 0, 0.08)));
  padding-bottom: 3px;
  margin-bottom: 2px;
}

.risk-plot__tt-cluster-items {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 140px;
  overflow-y: auto;
}

.risk-plot__tt-cluster-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 5px;
  border-radius: 4px;
  background: var(--chart-popover-row-bg, rgba(0, 0, 0, 0.03));
  cursor: pointer;
  transition: background 0.12s ease;
}

.risk-plot__tt-cluster-row:hover {
  background: var(--chart-popover-row-hover, rgba(0, 0, 0, 0.07));
}

.cluster-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.cluster-row-name {
  font-weight: 700;
  font-size: 0.66rem;
  color: var(--text, #1c1c1e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 3px;
}

.cluster-halo-dot {
  font-size: 0.6rem;
}

.cluster-row-grade {
  font-weight: 800;
  font-size: 0.62rem;
  padding: 0.5px 3.5px;
  border-radius: 2.5px;
}

.cluster-row-sub {
  font-size: 0.58rem;
  color: var(--text-secondary, #6e6e73);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tt-halo-icon {
  flex-shrink: 0;
  color: var(--color-halo, #cbd5e1);
}

.list-card__halo-tag {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--color-halo, #cbd5e1);
  background: var(--color-halo-bg, rgba(203, 213, 225, 0.12));
  border: 1px solid var(--color-halo-border, rgba(203, 213, 225, 0.35));
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
}

.list-card__halo-icon {
  flex-shrink: 0;
  color: var(--color-halo, #cbd5e1);
}

.risk-plot__header-left {
  min-width: 0;
  flex: 1 1 auto;
}

.risk-plot__title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 1px 0;
}

.risk-plot__subtitle {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.risk-plot__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  flex-shrink: 0;
}

.risk-plot__filter-group {
  display: inline-flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 2px;
  border-radius: var(--radius-md);
  gap: 2px;
}

.risk-plot__filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 600;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  user-select: none;
}

.risk-plot__filter-chip:hover {
  color: var(--text);
}

.risk-plot__filter-chip--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

.chip-check {
  color: var(--primary);
  stroke-width: 2.5;
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  transition: opacity 0.12s ease;
}

.chip-check--hidden {
  opacity: 0;
  visibility: hidden;
}

.risk-plot__header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.risk-plot__view-switcher {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 2px;
  border-radius: var(--radius-md);
  gap: 2px;
}

.risk-plot__view-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 0.725rem;
  font-weight: 700;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.risk-plot__view-btn:hover {
  color: var(--text);
}

.risk-plot__view-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* List View Styles */
.risk-plot__list-view {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  min-height: clamp(320px, 44vh, 400px);
}

.risk-plot__list-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.list-card__title {
  font-weight: 800;
  font-size: 0.76rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 5px;
}

.list-card__dot {
  font-size: 0.725rem;
}
.dot--green      { color: var(--color-success); }
.dot--yellow     { color: var(--color-warn); }
.dot--orange     { color: var(--color-attention); }
.dot--red        { color: var(--color-danger); }
.dot--unassessed { color: var(--color-neutral); }

.list-card__badge {
  font-size: 0.68rem;
  font-weight: 800;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 1px 6px;
  border-radius: 8px;
}

.list-card__student-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
}

.list-card__student-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.list-card__student-item:hover {
  background: var(--surface-hover);
  transform: translateX(2px);
}

.list-card__student-left {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.list-card__avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar--green      { background: var(--color-success-bg);   border: 1px solid var(--color-success);   color: var(--color-success-text); }
.avatar--yellow     { background: var(--color-warn-bg);       border: 1px solid var(--color-warn);      color: var(--color-warn-text); }
.avatar--orange     { background: var(--color-attention-bg);  border: 1px solid var(--color-attention); color: var(--color-attention-text); }
.avatar--red        { background: var(--color-danger-bg);     border: 1px solid var(--color-danger);    color: var(--color-danger-text); }
.avatar--unassessed { background: var(--color-neutral-bg);    border: 1px dashed var(--color-neutral);  color: var(--color-neutral-text); }

.list-card__name {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-card__student-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.list-card__score {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--primary);
}

.list-card__att {
  font-size: 0.66rem;
  color: var(--text-secondary);
}

.list-card__empty {
  font-size: 0.725rem;
  color: var(--text-secondary);
  font-style: italic;
  padding: 8px 0;
  text-align: center;
}

.risk-plot__summary {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  width: 100%;
}

.risk-plot__summary-card {
  flex: 1 1 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
  min-width: 0;
}

.risk-plot__summary-card:hover {
  transform: translateY(-1px);
  border-color: var(--primary);
}

.risk-plot__summary-card .count {
  font-size: 0.95rem;
  font-weight: 800;
  flex-shrink: 0;
  line-height: 1;
}

.risk-plot__summary-card .label {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.risk-plot__summary-card--red    .count { color: var(--color-danger); }
.risk-plot__summary-card--yellow .count { color: var(--color-warn); }
.risk-plot__summary-card--orange .count { color: var(--color-attention); }
.risk-plot__summary-card--green  .count { color: var(--color-success); }
.risk-plot__summary-card--slate  .count { color: var(--color-neutral); }

@media (max-height: 760px) {
  .risk-plot { gap: 6px; }
  .risk-plot__canvas { height: clamp(315px, 45vh, 345px); }
  .risk-plot__list-view { min-height: clamp(305px, 43vh, 340px); }
  .risk-plot__dot { width: 25px; height: 25px; font-size: 0.64rem; }
  .risk-plot__summary-card { padding: 3px 6px; }
  .risk-plot__summary-card .count { font-size: 0.88rem; }
}
</style>
