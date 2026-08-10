<template>
  <div class="risk-plot">
    <div class="risk-plot__header">
      <div class="risk-plot__header-left">
        <h4 class="risk-plot__title">Student Risk & Engagement Matrix</h4>
        <p class="risk-plot__subtitle">
          Comparing {{ isSbar ? 'Academic Level (SBAR)' : 'Academic Mark (%)' }} vs. Attendance Rate
        </p>
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

    <!-- Integrated Responsive Legend Sub-Bar -->
    <div v-if="viewMode === 'scatter'" class="risk-plot__legend-bar">
      <span class="legend-pill legend-pill--green">● Thriving</span>
      <span class="legend-pill legend-pill--yellow">● Academic Risk</span>
      <span class="legend-pill legend-pill--orange">● Attendance Risk</span>
      <span class="legend-pill legend-pill--red">● Critical Intervention</span>
      <span v-if="unassessedCount > 0" class="legend-pill legend-pill--slate">● Pending Marks</span>
    </div>

    <!-- VIEW 1: 4 Quadrants Visual Scatter Canvas -->
    <div v-if="viewMode === 'scatter'" class="risk-plot__canvas">

      <!-- Quadrant Background Labels (Fixed to 4 outer corners of the canvas card) -->
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
      <div class="risk-plot__axis-x" :style="{ bottom: axisYPercent + '%' }"></div>
      <div class="risk-plot__axis-y" :style="{ left: axisXPercent + '%' }"></div>

      <!-- Student Dots (using crisp 2-letter initials) -->
      <div 
        v-for="s in studentPoints" 
        :key="s.studentId"
        class="risk-plot__dot"
        :class="'risk-plot__dot--' + s.quadrant"
        :style="{ left: s.xPercent + '%', bottom: s.yPercent + '%' }"
        @click="$emit('select-student', s.studentId)"
      >
        <span class="risk-plot__dot-label">{{ s.initials }}</span>
        
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
              <span class="list-card__att">{{ st.attendanceRate }}% Att ({{ st.absences }} abs)</span>
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
        <span class="label">Attendance</span>
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
import { getSBARLevelBadge } from '../../db/gradebookService.js'
import { useClassroom } from '../../composables/useClassroom.js'
import { LayoutGrid as ScatterPlotIcon, List } from 'lucide-vue-next'

const { thresholds } = useClassroom()

const props = defineProps({
  sidebarStudents: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  aggregates: { type: Object, default: () => ({}) },
  allClassEvents: { type: Array, default: () => [] },
  isSbar: { type: Boolean, default: false }
})

defineEmits(['select-student'])

const viewMode = ref('scatter') // 'scatter' | 'list'

function getInitials(name, firstName, lastName) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }
  return 'ST'
}

const axisXPercent = computed(() => {
  const attCutoff = Number(thresholds.value.attendanceThreshold ?? 85)
  return Math.max(6, Math.min(92, Math.round(attCutoff * 0.86 + 6)))
})

const axisYPercent = computed(() => {
  const markCutoff = Number(thresholds.value.atRiskThreshold ?? 70)
  return Math.max(6, Math.min(92, Math.round(markCutoff * 0.86 + 6)))
})

const studentPoints = computed(() => {
  if (!props.sidebarStudents || props.sidebarStudents.length === 0) return []

  // Count absences per student from events (checking code === 'a' or eventType === 'absence')
  const studentAbsences = {}
  const distinctDaysSet = new Set()

  props.allClassEvents.forEach(e => {
    if (e.superseded) return
    if (e.timestamp) distinctDaysSet.add(String(e.timestamp).slice(0, 10))
    if ((e.code === 'a' || e.eventType === 'absence') && e.studentId) {
      const sId = String(e.studentId)
      studentAbsences[sId] = (studentAbsences[sId] || 0) + 1
    }
  })

  const maxAbsences = Math.max(...Object.values(studentAbsences), 0)
  const totalDays = Math.max(distinctDaysSet.size, maxAbsences, 1)

  // Map raw coordinates
  const rawList = props.sidebarStudents.map(student => {
    const sId = String(student.studentId)
    const gradeObj = props.classGrades[sId]
    const rawGrade = gradeObj && gradeObj.overallGrade !== undefined && gradeObj.overallGrade !== -1 ? gradeObj.overallGrade : null
    const grade = rawGrade !== null ? Math.round(rawGrade) : null
    const sbarBadge = grade !== null ? getSBARLevelBadge(grade) : null

    const abs = studentAbsences[sId] || 0
    const attendancePct = Math.max(0, Math.min(100, Math.round(((totalDays - abs) / totalDays) * 100)))

    const academicCutoff = Number(thresholds.value.atRiskThreshold ?? 70)
    const attendanceCutoff = Number(thresholds.value.attendanceThreshold ?? 85)

    // X-axis: Map attendance (0% to 100%) to graph X position (5% to 92%)
    const baseX = Math.max(6, Math.min(92, Math.round(attendancePct * 0.86 + 6)))

    // Y-axis: Map grade (0% to 100%) to graph Y position (5% to 92%)
    let baseY = 50
    let quadrant = 'unassessed'

    if (grade === null) {
      quadrant = 'unassessed'
      baseY = 50 // Place unassessed students on 50% neutral baseline
    } else {
      baseY = Math.max(6, Math.min(92, Math.round(grade * 0.86 + 6)))
      if (attendancePct < attendanceCutoff && grade < academicCutoff) {
        quadrant = 'red' // Critical Intervention
      } else if (attendancePct >= attendanceCutoff && grade < academicCutoff) {
        quadrant = 'yellow' // Academic Risk
      } else if (attendancePct < attendanceCutoff && grade >= academicCutoff) {
        quadrant = 'orange' // Attendance Risk
      } else {
        quadrant = 'green' // Thriving
      }
    }

    const initials = getInitials(student.name, student.firstName, student.lastName)

    return {
      studentId: sId,
      fullName: student.name || `${student.firstName} ${student.lastName}`,
      initials,
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
      const radius = 5.5 + Math.sqrt(count) * 4.5 // Radial expansion %
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

const quadrantGroups = computed(() => {
  const points = studentPoints.value
  return [
    { key: 'red', title: 'Critical Intervention', students: points.filter(p => p.quadrant === 'red') },
    { key: 'yellow', title: 'Academic Risk', students: points.filter(p => p.quadrant === 'yellow') },
    { key: 'orange', title: 'Attendance Risk', students: points.filter(p => p.quadrant === 'orange') },
    { key: 'green', title: 'Thriving', students: points.filter(p => p.quadrant === 'green') },
    { key: 'unassessed', title: 'Pending Marks', students: points.filter(p => p.quadrant === 'unassessed') }
  ].filter(g => g.students.length > 0)
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
  align-items: center;
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

.risk-plot__legend-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 0;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.legend-pill--green  { color: #10b981; }
.legend-pill--yellow { color: #f59e0b; }
.legend-pill--orange { color: #f97316; }
.legend-pill--red    { color: #ef4444; }
.legend-pill--slate  { color: #64748b; }

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
  z-index: 0;
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
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
  border-top: 1px dashed var(--border);
  z-index: 1;
}

.risk-plot__axis-y {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  border-left: 1px dashed var(--border);
  z-index: 1;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  min-height: 380px;
}

.risk-plot__list-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.list-card__title {
  font-weight: 800;
  font-size: 0.825rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.list-card__dot {
  font-size: 0.75rem;
}
.dot--green { color: #10b981; }
.dot--yellow { color: #f59e0b; }
.dot--orange { color: #f97316; }
.dot--red { color: #ef4444; }
.dot--unassessed { color: #64748b; }

.list-card__badge {
  font-size: 0.725rem;
  font-weight: 800;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 10px;
}

.list-card__student-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.list-card__student-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius-md);
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
  gap: 8px;
  overflow: hidden;
}

.list-card__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar--green  { background: #e6f4ea; border: 1px solid #10b981; color: #047857; }
.avatar--yellow { background: #fef3c7; border: 1px solid #f59e0b; color: #b45309; }
.avatar--orange { background: #ffedd5; border: 1px solid #f97316; color: #c2410c; }
.avatar--red    { background: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; }
.avatar--unassessed { background: #f1f5f9; border: 1px dashed #64748b; color: #334155; }

.list-card__name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-card__student-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.list-card__score {
  font-size: 0.775rem;
  font-weight: 800;
  color: var(--primary);
}

.list-card__att {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.list-card__empty {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
  padding: 12px 0;
  text-align: center;
}

.risk-plot__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.risk-plot__summary-card {
  flex: 1 1 140px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
  min-width: 0;
}

.risk-plot__summary-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
}

.risk-plot__summary-card .count {
  font-size: 1.15rem;
  font-weight: 800;
  flex-shrink: 0;
}

.risk-plot__summary-card .label {
  font-size: 0.725rem;
  color: var(--text-secondary);
  font-weight: 600;
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
