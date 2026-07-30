<template>
  <div class="sbar-detail-view">
    <!-- Compact Header Bar (120px height) -->
    <header class="sbar-detail-header">
      <div class="sbar-header-top-row">
        <div class="sbar-header-left">
          <button class="sbar-back-btn" @click="$emit('close')">
            <ArrowLeft :size="16" /> {{ returnTabMode === 'dossier' ? 'Back to Student Dossier' : 'Back to Grid' }}
          </button>
          <h2 class="sbar-detail-title">{{ currentAssessment.name }}</h2>
          <div class="sbar-header-tags">
            <span class="sbar-tag sbar-tag--type">SBAR TASK</span>
            <span class="sbar-tag sbar-tag--date" v-if="currentAssessment.date">{{ currentAssessment.date }}</span>
          </div>
        </div>

        <div class="sbar-header-actions">
          <button class="sbar-btn sbar-btn--secondary" @click="$emit('start-edit', currentAssessment)">
            <Edit2 :size="14" /> Edit Setup
          </button>
          <button class="sbar-btn sbar-btn--danger" @click="$emit('confirm-delete', currentAssessment)">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <!-- Metrics Strip -->
      <div class="sbar-metrics-strip">
        <div class="sbar-metric-item">
          <span class="sbar-metric-label">TAGGED STANDARDS:</span>
          <span class="sbar-metric-value">{{ taggedExpectations.length }} Expectations</span>
        </div>
        <div class="sbar-metric-item">
          <span class="sbar-metric-label">EVALUATED:</span>
          <span class="sbar-metric-value">{{ evaluatedCount }} / {{ sortedRoster.length }} Students</span>
        </div>
        <div class="sbar-metric-item" v-if="focusedStudentId">
          <span class="sbar-metric-label">VIEW MODE:</span>
          <div class="sbar-mode-toggle">
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': isSingleStudentMode }"
              @click="isSingleStudentMode = true"
            >Focused Student</button>
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': !isSingleStudentMode }"
              @click="isSingleStudentMode = false"
            >All Class</button>
          </div>
        </div>
        <div class="sbar-metric-item">
          <span class="sbar-metric-label">INPUT MODE:</span>
          <div class="sbar-mode-toggle">
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': inputMode === 'simple' }"
              @click="inputMode = 'simple'"
            >L1–L4</button>
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': inputMode === 'fine' }"
              @click="inputMode = 'fine'"
            >L1- to L4+</button>
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': inputMode === 'numeric' }"
              @click="inputMode = 'numeric'"
            >Exact % / Math</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Inline Multi-Rubric Batch Matrix Table -->
    <div class="sbar-matrix-container">
      <table class="sbar-matrix-table">
        <thead>
          <tr>
            <th class="sticky-col sticky-col--name">STUDENT</th>
            <th 
              v-for="exp in taggedExpectations" 
              :key="exp.code"
              class="matrix-exp-header"
            >
              <div class="exp-code">{{ exp.code }}</div>
              <div class="exp-name">{{ exp.name }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(student, sIdx) in displayedRoster" :key="student.studentId" class="matrix-row">
            <td class="sticky-col sticky-col--name student-name-cell" @click="$emit('show-dossier', student.studentId)">
              <span class="student-name">{{ student.lastName }}, {{ student.firstName }}</span>
            </td>

            <!-- Level Selector Pills or Numeric Input per Expectation -->
            <td v-for="exp in taggedExpectations" :key="exp.code" class="rubric-pill-cell">
              <!-- Exact Numeric Input Mode -->
              <div v-if="inputMode === 'numeric'" class="numeric-input-wrapper">
                <input 
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  class="sbar-numeric-input"
                  :value="getStudentPercentage(student.studentId, exp.code)"
                  placeholder="%"
                  @change="assignNumericPercentage(student.studentId, exp.code, $event.target.value)"
                />
                <span v-if="getStudentPercentage(student.studentId, exp.code) != null" class="numeric-level-badge">
                  {{ getStudentLevelBadge(student.studentId, exp.code).level }}
                </span>
              </div>

              <!-- Granular Levels Mode (1-Click Compact Pills) -->
              <div v-else-if="inputMode === 'fine'" class="level-pill-group level-pill-group--fine">
                <button 
                  v-for="lvl in fineLevels" 
                  :key="lvl.code"
                  class="level-select-pill level-select-pill--fine"
                  :class="{ 
                    'level-select-pill--active': getStudentLevelCode(student.studentId, exp.code) === lvl.code
                  }"
                  :style="getStudentLevelCode(student.studentId, exp.code) === lvl.code ? { background: lvl.color, color: 'white', borderColor: lvl.color } : {}"
                  :title="lvl.code + ' (' + lvl.pct + '%)'"
                  @click="assignLevel(student.studentId, exp.code, lvl.pct)"
                >
                  {{ lvl.label }}
                </button>
              </div>

              <!-- Simple Level Pills Mode (L1-L4) -->
              <div v-else class="level-pill-group">
                <button 
                  v-for="lvl in simpleLevels" 
                  :key="lvl.code"
                  class="level-select-pill"
                  :class="{ 
                    'level-select-pill--active': getStudentLevelCode(student.studentId, exp.code) === lvl.code
                  }"
                  :style="getStudentLevelCode(student.studentId, exp.code) === lvl.code ? { background: lvl.color, color: 'white', borderColor: lvl.color } : {}"
                  @click="assignLevel(student.studentId, exp.code, lvl.pct)"
                >
                  {{ lvl.code }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ArrowLeft, Edit2, Trash2 } from 'lucide-vue-next'
import { enterGradeSBAR, gradeMap, activeClassRecord } from '../../composables/useGradebook.js'
import { getSBARLevelBadge } from '../../db/gradebookService.js'

const props = defineProps({
  currentAssessment: { type: Object, required: true },
  sortedRoster: { type: Array, default: () => [] },
  focusedStudentId: { type: String, default: null },
  returnTabMode: { type: String, default: 'grid' }
})

const emit = defineEmits(['close', 'start-edit', 'confirm-delete', 'show-dossier'])

const isSingleStudentMode = ref(Boolean(props.focusedStudentId))

watch(() => props.focusedStudentId, (newVal) => {
  isSingleStudentMode.value = Boolean(newVal)
}, { immediate: true })

const displayedRoster = computed(() => {
  if (isSingleStudentMode.value && props.focusedStudentId) {
    const found = props.sortedRoster.filter(s => String(s.studentId) === String(props.focusedStudentId))
    if (found.length > 0) return found
  }
  return props.sortedRoster
})

const inputMode = ref(activeClassRecord.value?.sbarInputMode || 'fine') // 'simple' | 'fine' | 'numeric'

const simpleLevels = [
  { code: 'L1', pct: 55, color: '#ef4444' },
  { code: 'L2', pct: 65, color: '#f59e0b' },
  { code: 'L3', pct: 75, color: '#3b82f6' },
  { code: 'L4', pct: 88, color: '#22c55e' }
]

const fineLevels = [
  { code: 'R',   label: 'R',   pct: 45, color: '#991b1b' },
  { code: 'L1-', label: '1-',  pct: 51, color: '#f87171' },
  { code: 'L1',  label: '1',   pct: 55, color: '#ef4444' },
  { code: 'L1+', label: '1+',  pct: 58, color: '#dc2626' },
  { code: 'L2-', label: '2-',  pct: 61, color: '#fbbf24' },
  { code: 'L2',  label: '2',   pct: 65, color: '#f59e0b' },
  { code: 'L2+', label: '2+',  pct: 68, color: '#d97706' },
  { code: 'L3-', label: '3-',  pct: 71, color: '#60a5fa' },
  { code: 'L3',  label: '3',   pct: 75, color: '#3b82f6' },
  { code: 'L3+', label: '3+',  pct: 78, color: '#2563eb' },
  { code: 'L4-', label: '4-',  pct: 82, color: '#4ade80' },
  { code: 'L4',  label: '4',   pct: 88, color: '#22c55e' },
  { code: 'L4+', label: '4+',  pct: 96, color: '#16a34a' }
]

const activeLevelOptions = computed(() => {
  return inputMode.value === 'simple' ? simpleLevels : fineLevels
})

const taggedExpectations = computed(() => {
  const ids = props.currentAssessment.expectationIds || (props.currentAssessment.expectationId ? [props.currentAssessment.expectationId] : [])
  if (ids.length === 0) {
    return [{ code: 'A1.1', name: 'General Inquiry & Assessment' }]
  }
  return ids.map(code => ({ code, name: `Expectation ${code}` }))
})

const evaluatedCount = computed(() => {
  if (!props.currentAssessment?.assessmentId || !props.sortedRoster) return 0
  const astGrades = gradeMap.value[props.currentAssessment.assessmentId] || {}
  return Object.values(astGrades).filter(g => g && (g.expectationScores || g.masteryLevel != null)).length
})

function getStudentPercentage(studentId, expCode) {
  const astId = props.currentAssessment?.assessmentId
  if (!astId) return null
  const astGrades = gradeMap.value[astId] || gradeMap.value[Number(astId)] || gradeMap.value[String(astId)]
  const g = astGrades?.[studentId]
  if (!g) return null
  if (g.expectationScores && typeof g.expectationScores === 'object') {
    if (g.expectationScores[expCode] != null) {
      return Number(g.expectationScores[expCode])
    }
    return null
  }
  if (g.masteryLevel != null) return Number(g.masteryLevel)
  if (g.resolvedScore != null) return Number(g.resolvedScore)
  return null
}

function getStudentLevelBadge(studentId, expCode) {
  const pct = getStudentPercentage(studentId, expCode)
  return getSBARLevelBadge(pct)
}

function getStudentLevelCode(studentId, expCode) {
  const badge = getStudentLevelBadge(studentId, expCode)
  if (badge.level === '—') return null
  if (inputMode.value === 'simple') {
    if (badge.level.startsWith('L4')) return 'L4'
    if (badge.level.startsWith('L3')) return 'L3'
    if (badge.level.startsWith('L2')) return 'L2'
    if (badge.level.startsWith('L1')) return 'L1'
  }
  return badge.level
}

async function assignLevel(studentId, expCode, percentage) {
  await enterGradeSBAR(props.currentAssessment.assessmentId, studentId, expCode, percentage)
}

async function assignLevelByCode(studentId, expCode, code) {
  const item = fineLevels.find(l => l.code === code)
  if (item) {
    await assignLevel(studentId, expCode, item.pct)
  }
}

async function assignNumericPercentage(studentId, expCode, val) {
  const num = parseFloat(val)
  if (isNaN(num)) return
  await enterGradeSBAR(props.currentAssessment.assessmentId, studentId, expCode, Math.max(0, Math.min(100, num)))
}
</script>

<style scoped>
.sbar-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.sbar-detail-header {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sbar-header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sbar-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sbar-back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.sbar-back-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.sbar-detail-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.sbar-header-tags {
  display: flex;
  gap: 6px;
}

.sbar-tag {
  font-size: 0.725rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.sbar-tag--type {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.sbar-tag--date {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.sbar-header-actions {
  display: flex;
  gap: 8px;
}

.sbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sbar-btn--secondary {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.sbar-btn--danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.sbar-metrics-strip {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.sbar-metric-item {
  font-size: 0.775rem;
}

.sbar-metric-label {
  color: var(--text-secondary);
  font-weight: 700;
  margin-right: 6px;
}

.sbar-metric-value {
  font-weight: 700;
  color: var(--text);
}

.sbar-metric-value--highlight {
  color: var(--primary);
}

.sbar-matrix-container {
  flex: 1;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.sbar-matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.sbar-matrix-table th {
  background: var(--bg-secondary);
  padding: 10px 14px;
  border-bottom: 2px solid var(--border);
  border-right: 1px solid var(--border);
  text-align: left;
}

.sticky-col--name {
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--surface);
  min-width: 200px;
  border-right: 2px solid var(--border) !important;
}

.matrix-exp-header {
  min-width: 220px;
}

.exp-header-code {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
}

.exp-header-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: normal;
}

.matrix-row td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.student-name-cell {
  cursor: pointer;
  font-weight: 600;
}

.level-pill-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.level-select-pill {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.level-select-pill:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.level-select-pill--active {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px currentColor;
}

.level-select-pill--l4 {
  background: #22c55e !important;
  color: white !important;
  border-color: #16a34a !important;
}

.level-select-pill--l3 {
  background: #3b82f6 !important;
  color: white !important;
  border-color: #2563eb !important;
}

.level-select-pill--l2 {
  background: #f59e0b !important;
  color: white !important;
  border-color: #d97706 !important;
}

.level-select-pill--l1 {
  background: #ef4444 !important;
  color: white !important;
  border-color: #dc2626 !important;
}

.sbar-mode-toggle {
  display: inline-flex;
  background: var(--bg-secondary);
  padding: 2px;
  border-radius: var(--radius-sm);
  gap: 2px;
  border: 1px solid var(--border);
}

.mode-btn {
  padding: 3px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.725rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  color: var(--text);
}

.mode-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.level-pill-group--fine {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 3px 4px;
}

.level-select-pill--fine {
  padding: 4px 6px;
  font-size: 0.725rem;
  font-weight: 700;
  min-width: 28px;
  border-radius: 4px;
}

.numeric-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.sbar-numeric-input {
  width: 70px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text);
  font-weight: 700;
  font-size: 0.85rem;
  text-align: center;
}

.numeric-level-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
}

.sbar-fine-select {
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  width: 130px;
  text-align: center;
}
</style>
