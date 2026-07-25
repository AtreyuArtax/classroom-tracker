<template>
  <div class="risk-plot">
    <div class="risk-plot__header">
      <div>
        <h4 class="risk-plot__title">Student Risk & Engagement Matrix</h4>
        <p class="risk-plot__subtitle">2D Quadrant Analysis comparing Academic Mark (%) vs. Attendance Rate (%).</p>
      </div>
      <div class="risk-plot__legend">
        <span class="risk-plot__legend-item risk-plot__legend-item--green">● Thriving</span>
        <span class="risk-plot__legend-item risk-plot__legend-item--yellow">● Academic Risk</span>
        <span class="risk-plot__legend-item risk-plot__legend-item--orange">● Attendance Risk</span>
        <span class="risk-plot__legend-item risk-plot__legend-item--red">● Critical Intervention</span>
      </div>
    </div>

    <!-- 4 Quadrants Canvas / Grid -->
    <div class="risk-plot__canvas">

      <!-- Quadrant Background Labels -->
      <div class="risk-plot__quadrant risk-plot__quadrant--top-left">
        <span class="risk-plot__quad-label">Attendance Risk</span>
        <span class="risk-plot__quad-sub">High Marks · Low Attendance</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--top-right">
        <span class="risk-plot__quad-label">Thriving</span>
        <span class="risk-plot__quad-sub">High Marks · High Attendance</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--bottom-left">
        <span class="risk-plot__quad-label">Critical Intervention</span>
        <span class="risk-plot__quad-sub">Low Marks · Low Attendance</span>
      </div>
      <div class="risk-plot__quadrant risk-plot__quadrant--bottom-right">
        <span class="risk-plot__quad-label">Academic Risk</span>
        <span class="risk-plot__quad-sub">Low Marks · High Attendance</span>
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
        
        <!-- Smart Tooltip -->
        <div 
          class="risk-plot__tooltip"
          :class="{
            'risk-plot__tooltip--left': s.xPercent > 65,
            'risk-plot__tooltip--bottom': s.yPercent > 75
          }"
        >
          <div class="risk-plot__tooltip-name">{{ s.fullName }}</div>
          <div class="risk-plot__tooltip-row">Grade: <strong>{{ s.grade !== null ? s.grade + '%' : 'N/A' }}</strong></div>
          <div class="risk-plot__tooltip-row">Attendance: <strong>{{ s.attendanceRate }}%</strong> ({{ s.absences }} abs)</div>
          <div class="risk-plot__tooltip-hint">Click to view Dossier →</div>
        </div>
      </div>

    </div>

    <!-- Bottom summary pills -->
    <div class="risk-plot__summary">
      <div class="risk-plot__summary-card risk-plot__summary-card--red">
        <span class="count">{{ criticalCount }}</span>
        <span class="label">Critical Intervention</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--yellow">
        <span class="count">{{ academicRiskCount }}</span>
        <span class="label">Academic Risk</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--orange">
        <span class="count">{{ attendanceRiskCount }}</span>
        <span class="label">Attendance Risk</span>
      </div>
      <div class="risk-plot__summary-card risk-plot__summary-card--green">
        <span class="count">{{ thrivingCount }}</span>
        <span class="label">Thriving</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sidebarStudents: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  aggregates: { type: Object, default: () => ({}) },
  allClassEvents: { type: Array, default: () => [] }
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
    const rawGrade = gradeObj && gradeObj.overallGrade !== undefined ? gradeObj.overallGrade : null
    const grade = rawGrade !== null ? Math.round(rawGrade) : null

    const abs = studentAbsences[sId] || 0
    const attendancePct = Math.max(0, Math.min(100, Math.round(100 - (abs / (maxAbs * 1.5)) * 100)))

    // X-axis: Attendance (bounded 8% to 92%)
    const baseX = Math.max(8, Math.min(92, attendancePct))
    // Y-axis: Grade (bounded 8% to 90%)
    const baseY = Math.max(8, Math.min(90, grade !== null ? grade : 70))

    let quadrant = 'green'
    if (attendancePct < 85 && (grade === null || grade < 65)) {
      quadrant = 'red'
    } else if (attendancePct >= 85 && grade !== null && grade < 65) {
      quadrant = 'yellow'
    } else if (attendancePct < 85 && (grade === null || grade >= 65)) {
      quadrant = 'orange'
    }

    const shortName = student.firstName ? `${student.firstName} ${student.lastName ? student.lastName[0] + '.' : ''}` : student.name

    return {
      studentId: sId,
      fullName: student.name || `${student.firstName} ${student.lastName}`,
      shortName,
      grade,
      attendanceRate: attendancePct,
      absences: abs,
      baseX,
      baseY,
      quadrant
    }
  })

  // Apply deterministic jitter to prevent overlapping dots at identical positions
  const coordCounts = {}
  return rawList.map((item, idx) => {
    const key = `${Math.round(item.baseX / 4)}_${Math.round(item.baseY / 4)}`
    const count = coordCounts[key] || 0
    coordCounts[key] = count + 1

    let offsetX = 0
    let offsetY = 0
    if (count > 0) {
      const angle = count * 2.4 // Spiral angle
      const radius = Math.min(6, count * 2.2) // Spiral radius %
      offsetX = Math.cos(angle) * radius
      offsetY = Math.sin(angle) * radius
    }

    const finalX = Math.max(6, Math.min(92, item.baseX + offsetX))
    const finalY = Math.max(6, Math.min(90, item.baseY + offsetY))

    return {
      ...item,
      xPercent: Number(finalX.toFixed(1)),
      yPercent: Number(finalY.toFixed(1))
    }
  })
})

const criticalCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'red').length)
const academicRiskCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'yellow').length)
const attendanceRiskCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'orange').length)
const thrivingCount = computed(() => studentPoints.value.filter(p => p.quadrant === 'green').length)
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
  align-items: center;
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
}

.risk-plot__legend {
  display: flex;
  gap: 12px;
  font-size: 0.775rem;
  font-weight: 600;
}

.risk-plot__legend-item--green  { color: #10b981; }
.risk-plot__legend-item--yellow { color: #f59e0b; }
.risk-plot__legend-item--orange { color: #f97316; }
.risk-plot__legend-item--red    { color: #ef4444; }

.risk-plot__canvas {
  position: relative;
  height: 340px;
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
  opacity: 0.85;
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
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  z-index: 10;
}

.risk-plot__dot:hover {
  transform: translate(-50%, 50%) scale(1.3);
  z-index: 1000 !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

.risk-plot__dot--green  { background: rgba(16, 185, 129, 0.25); border: 2px solid #10b981; color: #065f46; }
.risk-plot__dot--yellow { background: rgba(245, 158, 11, 0.25); border: 2px solid #f59e0b; color: #92400e; }
.risk-plot__dot--orange { background: rgba(249, 115, 22, 0.25); border: 2px solid #f97316; color: #9a3412; }
.risk-plot__dot--red    { background: rgba(239, 68, 68, 0.25); border: 2px solid #ef4444; color: #991b1b; }

.risk-plot__dot-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 28px;
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
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.15);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.risk-plot__dot:hover .risk-plot__tooltip {
  opacity: 1;
  visibility: visible;
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
  gap: 12px;
}

.risk-plot__summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.risk-plot__summary-card .count {
  font-size: 1.25rem;
  font-weight: 800;
}

.risk-plot__summary-card .label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.risk-plot__summary-card--red .count { color: #ef4444; }
.risk-plot__summary-card--yellow .count { color: #f59e0b; }
.risk-plot__summary-card--orange .count { color: #f97316; }
.risk-plot__summary-card--green .count { color: #10b981; }
</style>
