<template>
  <div class="risk-plot">
    <div class="risk-plot__header">
      <div>
        <h4 class="risk-plot__title">Student Risk & Engagement Matrix</h4>
        <p class="risk-plot__subtitle">
          Comparing {{ isSbar ? 'Academic Level (SBAR)' : 'Academic Mark (%)' }} vs. Attendance Rate
        </p>
      </div>
      <div class="risk-plot__legend">
        <span class="risk-plot__legend-item risk-plot__legend-item--green">● Thriving</span>
        <span class="risk-plot__legend-item risk-plot__legend-item--yellow">● Academic</span>
        <span class="risk-plot__legend-item risk-plot__legend-item--orange">● Attendance</span>
        <span class="risk-plot__legend-item risk-plot__legend-item--red">● Critical</span>
        <span v-if="unassessedCount > 0" class="risk-plot__legend-item risk-plot__legend-item--slate">● Pending</span>
      </div>
    </div>

    <!-- 4 Quadrants Canvas / Grid -->
    <div class="risk-plot__canvas">

      <!-- Quadrant Background Labels -->
      <div class="risk-plot__quadrant risk-plot__quadrant--top-left">
        <span class="risk-plot__quad-label">Attendance Risk</span>
        <span class="risk-plot__quad-sub">{{ isSbar ? 'High Level' : 'High Marks' }} · Low Attendance</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--top-right">
        <span class="risk-plot__quad-label">Thriving</span>
        <span class="risk-plot__quad-sub">{{ isSbar ? 'High Level' : 'High Marks' }} · High Attendance</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--bottom-left">
        <span class="risk-plot__quad-label">Critical Intervention</span>
        <span class="risk-plot__quad-sub">{{ isSbar ? 'Low Level' : 'Low Marks' }} · Low Attendance</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--bottom-right">
        <span class="risk-plot__quad-label">Academic Risk</span>
        <span class="risk-plot__quad-sub">{{ isSbar ? 'Low Level' : 'Low Marks' }} · High Attendance</span>
      </div>

      <!-- Axis Divider Lines -->
      <div class="risk-plot__axis-x"></div>
      <div class="risk-plot__axis-y"></div>

      <!-- Student Dots -->
      <div 
        v-for="s in studentPoints" 
        :key="s.studentId"
        class="risk-plot__dot"
        :class="'risk-plot__dot--' + s.quadrant"
        :style="{ left: s.xPercent + '%', bottom: s.yPercent + '%' }"
        @click="$emit('select-student', s.studentId)"
      >
        <span class="risk-plot__dot-label">{{ s.shortName }}</span>
        
        <!-- Multi-Student Cluster Tooltip if overlapping, otherwise Single Student Tooltip -->
        <div 
          class="risk-plot__tooltip"
          :class="{
            'risk-plot__tooltip--left': s.xPercent > 65,
            'risk-plot__tooltip--bottom': s.yPercent > 75,
            'risk-plot__tooltip--cluster': s.clusterMembers && s.clusterMembers.length > 1
          }"
        >
          <!-- Single Student Tooltip -->
          <template v-if="!s.clusterMembers || s.clusterMembers.length <= 1">
            <div class="risk-plot__tooltip-name">{{ s.fullName }}</div>
            <div class="risk-plot__tooltip-row">
              <template v-if="isSbar">
                Level: <strong>{{ s.sbarBadge ? s.sbarBadge.level : 'N/A (Unassessed)' }}</strong>
              </template>
              <template v-else>
                Grade: <strong>{{ s.grade !== null ? s.grade + '%' : 'N/A (Unassessed)' }}</strong>
              </template>
            </div>
            <div class="risk-plot__tooltip-row">Attendance: <strong>{{ s.attendanceRate }}%</strong> ({{ s.absences }} abs)</div>
            <div class="risk-plot__tooltip-hint">Click to view Dossier →</div>
          </template>

          <!-- Multi-Student Cluster Tooltip -->
          <template v-else>
            <div class="risk-plot__cluster-header">
              Cluster ({{ s.clusterMembers.length }} Students)
            </div>
            <div class="risk-plot__cluster-list">
              <div 
                v-for="cSt in s.clusterMembers" 
                :key="'cl-'+cSt.studentId" 
                class="risk-plot__cluster-item"
                @click.stop="$emit('select-student', cSt.studentId)"
              >
                <span class="cluster-item-name">{{ cSt.fullName }}</span>
                <span class="cluster-item-meta">
                  <template v-if="isSbar">
                    {{ cSt.sbarBadge ? cSt.sbarBadge.level : 'N/A' }}
                  </template>
                  <template v-else>
                    {{ cSt.grade !== null ? cSt.grade + '%' : 'N/A' }}
                  </template>
                  · {{ cSt.attendanceRate }}% Att
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>

    </div>

    <!-- Bottom summary pills (5 columns single-row) -->
    <div class="risk-plot__summary" :class="{ 'risk-plot__summary--5col': unassessedCount > 0 }">
      <div class="risk-plot__summary-card risk-plot__summary-card--red">
        <span class="count">{{ criticalCount }}</span>
        <span class="label">Critical</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--yellow">
        <span class="count">{{ academicRiskCount }}</span>
        <span class="label">Academic Risk</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--orange">
        <span class="count">{{ attendanceRiskCount }}</span>
        <span class="label">Attendance</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--green">
        <span class="count">{{ thrivingCount }}</span>
        <span class="label">Thriving</span>
      </div>
      <div v-if="unassessedCount > 0" class="risk-plot__summary-card risk-plot__summary-card--slate">
        <span class="count">{{ unassessedCount }}</span>
        <span class="label">Pending</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getSBARLevelBadge } from '../../db/gradebookService.js'

const props = defineProps({
  sidebarStudents: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  aggregates: { type: Object, default: () => ({}) },
  allClassEvents: { type: Array, default: () => [] },
  isSbar: { type: Boolean, default: false }
})

defineEmits(['select-student'])

const studentPoints = computed(() => {
  if (!props.sidebarStudents || props.sidebarStudents.length === 0) return []

  // Count absences per student from events
  const studentAbsences = {}
  props.allClassEvents.forEach(e => {
    if (e.eventType === 'absence' && e.studentId) {
      studentAbsences[e.studentId] = (studentAbsences[e.studentId] || 0) + 1
    }
  })

  const maxAbs = Math.max(...Object.values(studentAbsences), 15)

  // Map raw coordinates
  const rawList = props.sidebarStudents.map(student => {
    const sId = String(student.studentId)
    const gradeObj = props.classGrades[sId]
    const rawGrade = gradeObj && gradeObj.overallGrade !== undefined && gradeObj.overallGrade !== -1 ? gradeObj.overallGrade : null
    const grade = rawGrade !== null ? Math.round(rawGrade) : null
    const sbarBadge = grade !== null ? getSBARLevelBadge(grade) : null

    const abs = studentAbsences[sId] || 0
    const attendancePct = Math.max(0, Math.min(100, Math.round(100 - (abs / (maxAbs * 1.5)) * 100)))

    // X-axis: Attendance (bounded 10% to 88%)
    const baseX = Math.max(10, Math.min(88, attendancePct))

    // Y-axis: Grade (bounded 10% to 88%)
    let baseY = 50
    let quadrant = 'unassessed'

    if (grade === null) {
      quadrant = 'unassessed'
      baseY = 50 // Place unassessed students on 50% neutral baseline
    } else if (attendancePct < 85 && grade < 65) {
      quadrant = 'red' // Critical Intervention
      baseY = Math.max(10, Math.min(45, grade))
    } else if (attendancePct >= 85 && grade < 65) {
      quadrant = 'yellow' // Academic Risk
      baseY = Math.max(10, Math.min(45, grade))
    } else if (attendancePct < 85 && grade >= 65) {
      quadrant = 'orange' // Attendance Risk
      baseY = Math.max(55, Math.min(88, grade))
    } else {
      quadrant = 'green' // Thriving
      baseY = Math.max(55, Math.min(88, grade))
    }

    const shortName = student.firstName ? `${student.firstName} ${student.lastName ? student.lastName[0] + '.' : ''}` : student.name

    return {
      studentId: sId,
      fullName: student.name || `${student.firstName} ${student.lastName}`,
      shortName,
      grade,
      sbarBadge,
      attendanceRate: attendancePct,
      absences: abs,
      baseX,
      baseY,
      quadrant,
      isUnassessed: grade === null
    }
  })

  // Group by grid cell to fan out clustered dots using a golden spiral
  const coordCounts = {}
  const processedList = rawList.map((item) => {
    const key = `${Math.round(item.baseX / 6)}_${Math.round(item.baseY / 6)}`
    const count = coordCounts[key] || 0
    coordCounts[key] = count + 1

    let offsetX = 0
    let offsetY = 0
    if (count > 0) {
      const angle = count * 2.39996 // Golden angle in radians
      const radius = 5.5 + Math.sqrt(count) * 4.5 // Wider radial expansion %
      offsetX = Math.cos(angle) * radius
      offsetY = Math.sin(angle) * radius
    }

    const finalX = Math.max(5, Math.min(93, item.baseX + offsetX))
    const finalY = Math.max(5, Math.min(92, item.baseY + offsetY))

    return {
      ...item,
      xPercent: Number(finalX.toFixed(1)),
      yPercent: Number(finalY.toFixed(1))
    }
  })

  // Attach cluster members for multi-student popovers
  return processedList.map(item => {
    const clusterMembers = processedList.filter(other => {
      const dx = Math.abs(other.xPercent - item.xPercent)
      const dy = Math.abs(other.yPercent - item.yPercent)
      return Math.sqrt(dx * dx + dy * dy) <= 7.0 // Nearby distance threshold
    })
    return {
      ...item,
      clusterMembers
    }
  })
})

const criticalCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'red').length)
const academicRiskCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'yellow').length)
const attendanceRiskCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'orange').length)
const thrivingCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'green').length)
const unassessedCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'unassessed').length)
</script>

<style scoped>
.risk-plot {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.risk-plot__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.risk-plot__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2px 0;
}

.risk-plot__subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
}

.risk-plot__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 0.725rem;
  font-weight: 600;
  justify-content: flex-end;
}

.risk-plot__legend-item {
  white-space: nowrap;
}

.risk-plot__legend-item--green  { color: #10b981; }
.risk-plot__legend-item--yellow { color: #f59e0b; }
.risk-plot__legend-item--orange { color: #f97316; }
.risk-plot__legend-item--red    { color: #ef4444; }
.risk-plot__legend-item--slate  { color: #64748b; }

.risk-plot__canvas {
  position: relative;
  height: 380px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: visible;
}

.risk-plot__quadrant {
  position: absolute;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
  opacity: 0.35;
}

.risk-plot__quadrant--top-left     { top: 0; left: 0; text-align: left; }
.risk-plot__quadrant--top-right    { top: 0; right: 0; text-align: right; }
.risk-plot__quadrant--bottom-left  { bottom: 0; left: 0; text-align: left; }
.risk-plot__quadrant--bottom-right { bottom: 0; right: 0; text-align: right; }

.risk-plot__quad-label {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.risk-plot__quad-sub {
  font-size: 0.725rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

.risk-plot__axis-x {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
  border-top: 1px dashed var(--border);
}

.risk-plot__axis-y {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  border-left: 1px dashed var(--border);
}

.risk-plot__dot {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
  transition: transform 0.15s ease, box-shadow 0.15s ease, z-index 0.1s ease;
  z-index: 10;
}

.risk-plot__dot:hover {
  transform: translate(-50%, 50%) scale(1.35);
  z-index: 99999 !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

/* Solid opaque backgrounds so overlapping nodes are crisp and distinct */
.risk-plot__dot--green  { background: #e6f4ea; border: 2px solid #10b981; color: #047857; }
.risk-plot__dot--yellow { background: #fef3c7; border: 2px solid #f59e0b; color: #b45309; }
.risk-plot__dot--orange { background: #ffedd5; border: 2px solid #f97316; color: #c2410c; }
.risk-plot__dot--red    { background: #fee2e2; border: 2px solid #ef4444; color: #b91c1c; }
.risk-plot__dot--unassessed { background: #f1f5f9; border: 2px dashed #64748b; color: #334155; }

.risk-plot__dot-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 26px;
}

.risk-plot__tooltip {
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #f8fafc;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 0.775rem;
  white-space: nowrap;
  pointer-events: auto;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.18);
  z-index: 20000;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.risk-plot__dot:hover .risk-plot__tooltip {
  opacity: 1;
  visibility: visible;
}

/* Cluster Popover Tooltip */
.risk-plot__tooltip--cluster {
  min-width: 180px;
  padding: 10px 12px;
}

.risk-plot__cluster-header {
  font-weight: 800;
  font-size: 0.775rem;
  color: #38bdf8;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  padding-bottom: 4px;
  margin-bottom: 4px;
}

.risk-plot__cluster-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}

.risk-plot__cluster-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.risk-plot__cluster-item:hover {
  background: rgba(255, 255, 255, 0.12);
}

.cluster-item-name {
  font-weight: 700;
  color: #ffffff;
}

.cluster-item-meta {
  font-size: 0.725rem;
  color: #94a3b8;
}

/* Smart Tooltip Orientations */
.risk-plot__tooltip--left {
  left: auto;
  right: 0;
  transform: none;
}

.risk-plot__tooltip--bottom {
  bottom: auto;
  top: 125%;
}

.risk-plot__tooltip-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #ffffff;
  margin-bottom: 2px;
}

.risk-plot__tooltip-row {
  font-size: 0.775rem;
  color: #cbd5e1;
}

.risk-plot__tooltip-hint {
  margin-top: 4px;
  font-size: 0.725rem;
  font-weight: 600;
  color: #38bdf8;
}

.risk-plot__summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.risk-plot__summary--5col {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.risk-plot__summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.risk-plot__summary-card .count {
  font-size: 1.1rem;
  font-weight: 800;
  flex-shrink: 0;
}

.risk-plot__summary-card .label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.risk-plot__summary-card--red .count { color: #ef4444; }
.risk-plot__summary-card--yellow .count { color: #f59e0b; }
.risk-plot__summary-card--orange .count { color: #f97316; }
.risk-plot__summary-card--green .count { color: #10b981; }
.risk-plot__summary-card--slate .count { color: #64748b; }
</style>
