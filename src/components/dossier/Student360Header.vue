<template>
  <header class="dossier-header">
    <div class="dossier-header__identity">
      <div class="dossier-header__avatar">
        {{ initials }}
      </div>
      <div class="dossier-header__info">
        <h1 class="dossier-header__name">{{ student.firstName }} {{ student.lastName }}</h1>
        <div class="dossier-header__status-badges">
          <span 
            v-if="student.gradeLevel" 
            class="dossier-header__badge dossier-header__badge--grade"
            title="Student Grade Level"
          >
            <GraduationCap :size="13" />
            {{ student.gradeLevel }}
          </span>
          <span 
            v-if="statusLabel" 
            class="dossier-header__badge" 
            :class="[`dossier-header__badge--${statusType}`]"
          >
            <component :is="statusIcon" :size="14" />
            {{ statusLabel }}
          </span>
          <span 
            v-if="attendanceStats?.testDayAbsences > 0" 
            class="dossier-header__badge dossier-header__badge--warning"
            :title="`Student missed ${attendanceStats.testDayAbsences} test/evaluation days`"
          >
            <CalendarX :size="13" />
            {{ attendanceStats.testDayAbsences }} Missed Test Day{{ attendanceStats.testDayAbsences > 1 ? 's' : '' }}
          </span>
          <span v-if="student.studentId" class="dossier-header__id">#{{ student.studentId }}</span>
        </div>
      </div>
    </div>

    <div class="dossier-header__right">
      <div class="dossier-header__metrics">
        <div class="dossier-header__metric">
          <span class="dossier-header__metric-label">{{ isSBAR ? 'Overall Mastery' : 'Grade' }}</span>
          <span class="dossier-header__metric-value" :style="{ color: isSBAR ? sbarBadge.color : gradeColor }">
            <template v-if="isSBAR">
              {{ sbarBadge.level }}
            </template>
            <template v-else>
              {{ formattedGrade }}
            </template>
          </span>
        </div>
        <div v-if="!isSBAR && mostConsistent !== null" class="dossier-header__metric dossier-header__metric--secondary">
          <span class="dossier-header__metric-label">Consistent</span>
          <span class="dossier-header__metric-value dossier-header__metric-value--smaller">
            {{ Math.round(mostConsistent) }}%
            <span v-if="consistentIsFallback" class="dossier-header__metric-tip" title="Standard median used due to low data density">
              <HelpCircle :size="14" />
            </span>
          </span>
        </div>
        <div v-if="!isSBAR && weightedMedian !== null" class="dossier-header__metric dossier-header__metric--secondary">
          <span class="dossier-header__metric-label">Median</span>
          <span class="dossier-header__metric-value dossier-header__metric-value--smaller">
            {{ Math.round(weightedMedian) }}%
          </span>
        </div>
        <div class="dossier-header__divider"></div>
        <div class="dossier-header__metric">
          <span class="dossier-header__metric-label">Attendance</span>
          <span 
            class="dossier-header__metric-value"
            :style="{ color: attendanceRate === 100 ? '#34c759' : attendanceRate !== null && attendanceRate < 80 ? '#ff9500' : 'var(--text)' }"
          >
            {{ attendanceRate === null ? '--' : attendanceRate === 100 ? 'Perfect' : attendanceRate + '%' }}
          </span>
          <span class="dossier-header__metric-subvalue">
            {{ attendanceStats.absences }}A &middot; {{ attendanceStats.lates }}L
          </span>
        </div>
      </div>
      
      <div class="dossier-header__actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { UserCheck, UserMinus, Clock, Toilet, X, HelpCircle, CalendarX, GraduationCap } from 'lucide-vue-next'
import { activeClassRecord } from '../../composables/useGradebook.js'
import { getSBARLevelBadge } from '../../db/gradebook/gradeCalcSBAR.js'

const props = defineProps({
  student: { type: Object, required: true },
  overallGrade: { type: Number, default: null },
  mostConsistent: { type: Number, default: null },
  consistentIsFallback: { type: Boolean, default: false },
  weightedMedian: { type: Number, default: null },
  attendanceStats: { type: Object, default: () => ({ absences: 0, lates: 0, testDayAbsences: 0 }) },
  attendanceRate:  { type: Number, default: null }
})

const isSBAR = computed(() => activeClassRecord.value?.gradingFramework === 'sbar')

const initials = computed(() => {
  return `${props.student.firstName?.[0] || ''}${props.student.lastName?.[0] || ''}`.toUpperCase()
})

const sbarBadge = computed(() => {
  if (props.overallGrade === null) return { level: '—', color: 'var(--text-secondary)' }
  return getSBARLevelBadge(props.overallGrade)
})

const formattedGrade = computed(() => {
  if (props.overallGrade === null) return '--'
  return `${Math.round(props.overallGrade)}%`
})

const gradeColor = computed(() => {
  const g = props.overallGrade
  if (g === null) return 'var(--text-secondary)'
  if (g >= 80) return '#34c759'
  if (g >= 70) return '#30b0c7'
  if (g >= 60) return '#ff9500'
  return '#ff3b30'
})

// attendanceSummary is no longer needed — the template renders rate and raw counts separately.

const statusLabel = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return 'Absent'
  if (s?.isLate || (s?.lateMs !== null && s?.lateMs !== undefined)) return 'Late'
  if (s?.isOut) return 'Out'
  return 'Present'
})

const statusType = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return 'danger'
  if (s?.isLate || (s?.lateMs !== null && s?.lateMs !== undefined)) return 'warning'
  if (s?.isOut) return 'warning'
  return 'success'
})

const statusIcon = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return UserMinus
  if (s?.isLate || (s?.lateMs !== null && s?.lateMs !== undefined)) return Clock
  if (s?.isOut) return Toilet
  return UserCheck
})
</script>

<style scoped>
.dossier-header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         20px 24px;
  background:      var(--surface);
  border-bottom:   1px solid var(--border);
  gap:             16px;
}

@media (max-width: 900px) {
  .dossier-header {
    padding: 16px 20px;
    gap: 12px;
  }
}

.dossier-header__identity {
  display:     flex;
  align-items: center;
  gap:         16px;
  min-width:   0; /* Allow identity to shrink for ellipsis */
  flex:        1; /* Identity takes available space after right-side items */
}

.dossier-header__avatar {
  display:         flex;
  align-items:     center;
  justify-content: center;
  width:           56px;
  height:          56px;
  border-radius:   50%;
  background:      var(--primary-light);
  color:           var(--primary);
  font-size:       1.4rem;
  font-weight:     700;
  flex-shrink:     0;
}

.dossier-header__info {
  display:        flex;
  flex-direction: column;
  gap:            4px;
  min-width:      0; /* Allow info to shrink for ellipsis */
}

.dossier-header__name {
  margin:         0;
  font-size:      1.75rem;
  font-weight:    800;
  color:          var(--text);
  line-height:    1.1;
  white-space:    nowrap;
  overflow:       hidden;
  text-overflow:  ellipsis;
}

@media (max-width: 1024px) {
  .dossier-header__name { font-size: 1.5rem; }
}

@media (max-width: 900px) {
  .dossier-header__name { font-size: 1.25rem; }
}

.dossier-header__status-badges {
  display:     flex;
  align-items: center;
  gap:         8px;
}

.dossier-header__badge {
  display:       inline-flex;
  align-items:   center;
  gap:           4px;
  padding:       2px 8px;
  border-radius: var(--radius-sm);
  font-size:     0.75rem;
  font-weight:   700;
  text-transform: uppercase;
}

.dossier-header__badge--success { background: rgba(52, 199, 89, 0.1); color: #34c759; }
.dossier-header__badge--warning { background: rgba(255, 149, 0, 0.1); color: #ff9500; }
.dossier-header__badge--danger  { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
.dossier-header__badge--grade   { background: rgba(99, 102, 241, 0.12); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.25); }

.dossier-header__id {
  font-size:   0.8rem;
  color:       var(--text-secondary);
  font-family: monospace;
}

.dossier-header__metrics {
  display:     flex;
  align-items: center;
  gap:         24px; /* Reduced default gap from 32px */
}

@media (max-width: 1200px) {
  .dossier-header__metrics { gap: 16px; }
  .dossier-header__metric--secondary { display: none; }
}

@media (max-width: 900px) {
  .dossier-header__metrics { gap: 12px; }
}

@media (max-width: 900px) {
  .dossier-header__metrics { gap: 12px; }
}

.dossier-header__right {
  display:      flex;
  align-items:  center;
  gap:          24px;
  flex-shrink:  0; /* Ensure right side stays visible */
}

@media (max-width: 1024px) {
  .dossier-header__right { gap: 16px; }
}

.dossier-header__actions {
  display:        flex;
  align-items:    center;
  gap:            8px;
  border-left:    1px solid var(--border);
  padding-left:   16px;
  margin-left:    8px;
  height:         40px;
}

.dossier-header__metric {
  display:        flex;
  flex-direction: column;
  align-items:    flex-end;
}

.dossier-header__metric-label {
  font-size:      0.75rem;
  font-weight:    600;
  color:          var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dossier-header__metric-value {
  font-size:   1.5rem;
  font-weight: 800;
  color:       var(--text);
  line-height: 1;
}

@media (max-width: 1024px) {
  .dossier-header__metric-value { font-size: 1.25rem; }
}

@media (max-width: 900px) {
  .dossier-header__metric-value { font-size: 1.1rem; }
}

.dossier-header__metric-value--smaller {
  font-size: 1.1rem;
}

.dossier-header__metric--secondary {
  border-left: 1px solid var(--border);
  padding-left: 24px;
}

.dossier-header__metric-tip {
  display: inline-flex;
  margin-left: 6px;
  opacity: 0.5;
  color: var(--text-secondary);
  cursor: help;
  vertical-align: middle;
  transition: opacity 0.2s ease;
}

.dossier-header__metric-tip:hover {
  opacity: 1;
  color: var(--primary);
}

.dossier-header__metric-subvalue {
  font-size:    0.72rem;
  font-weight:  600;
  color:        var(--text-secondary);
  letter-spacing: 0.02em;
  margin-top:   2px;
  line-height:  1;
}

.dossier-header__divider {
  width:      1px;
  height:     40px;
  background: var(--border);
}

@media (max-width: 600px) {
  .dossier-header {
    flex-direction: column;
    align-items:    flex-start;
    padding: 16px;
    gap: 16px;
  }
}
</style>
