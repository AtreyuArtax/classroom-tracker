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
            v-if="statusLabel" 
            class="dossier-header__badge" 
            :class="[`dossier-header__badge--${statusType}`]"
          >
            <component :is="statusIcon" :size="14" />
            {{ statusLabel }}
          </span>
          <span v-if="student.studentId" class="dossier-header__id">#{{ student.studentId }}</span>
        </div>
      </div>
    </div>

    <div class="dossier-header__right">
      <div class="dossier-header__metrics">
        <div class="dossier-header__metric">
          <span class="dossier-header__metric-label">Grade</span>
          <span class="dossier-header__metric-value" :style="{ color: gradeColor }">
            {{ formattedGrade }}
          </span>
        </div>
        <div v-if="mostConsistent !== null" class="dossier-header__metric dossier-header__metric--secondary">
          <span class="dossier-header__metric-label">Consistent</span>
          <span class="dossier-header__metric-value dossier-header__metric-value--smaller">
            {{ Math.round(mostConsistent) }}%
            <span v-if="consistentIsFallback" class="dossier-header__metric-tip" title="Standard median used due to low data density">
              <HelpCircle :size="14" />
            </span>
          </span>
        </div>
        <div v-if="weightedMedian !== null" class="dossier-header__metric dossier-header__metric--secondary">
          <span class="dossier-header__metric-label">Median</span>
          <span class="dossier-header__metric-value dossier-header__metric-value--smaller">
            {{ Math.round(weightedMedian) }}%
          </span>
        </div>
        <div class="dossier-header__divider"></div>
        <div class="dossier-header__metric">
          <span class="dossier-header__metric-label">Attendance</span>
          <span class="dossier-header__metric-value">
            {{ attendanceSummary }}
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
import { UserCheck, UserMinus, Clock, Toilet, X, HelpCircle } from 'lucide-vue-next'

const props = defineProps({
  student: { type: Object, required: true },
  overallGrade: { type: Number, default: null },
  mostConsistent: { type: Number, default: null },
  consistentIsFallback: { type: Boolean, default: false },
  weightedMedian: { type: Number, default: null },
  attendanceStats: { type: Object, default: () => ({ absences: 0, lates: 0 }) }
})

const initials = computed(() => {
  return `${props.student.firstName?.[0] || ''}${props.student.lastName?.[0] || ''}`.toUpperCase()
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

const attendanceSummary = computed(() => {
  const { absences, lates } = props.attendanceStats
  if (absences === 0 && lates === 0) return 'Perfect'
  return `${absences}A / ${lates}L`
})

const statusLabel = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return 'Absent'
  if (s?.isOut) return 'Out'
  return 'Present'
})

const statusType = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return 'danger'
  if (s?.isOut) return 'warning'
  return 'success'
})

const statusIcon = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return UserMinus
  if (s?.isOut) return Toilet
  return UserCheck
})
</script>

<style scoped>
.dossier-header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         24px;
  background:      var(--surface);
  border-bottom:   1px solid var(--border);
  gap:             24px;
}

.dossier-header__identity {
  display:     flex;
  align-items: center;
  gap:         16px;
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
}

.dossier-header__name {
  margin:      0;
  font-size:   1.75rem;
  font-weight: 800;
  color:       var(--text);
  line-height: 1.1;
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

.dossier-header__id {
  font-size:   0.8rem;
  color:       var(--text-secondary);
  font-family: monospace;
}

.dossier-header__metrics {
  display:     flex;
  align-items: center;
  gap:         32px;
}

.dossier-header__right {
  display:     flex;
  align-items: center;
  gap:         24px;
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

.dossier-header__divider {
  width:      1px;
  height:     40px;
  background: var(--border);
}

@media (max-width: 600px) {
  .dossier-header {
    flex-direction: column;
    align-items:    flex-start;
  }
}
</style>
