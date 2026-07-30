<template>
  <div class="sbar-expectation-mastery">
    <div class="sbar-mastery-header">
      <div class="sbar-mastery-title-group">
        <h3 class="sbar-mastery-title">
          <Target :size="18" /> CURRICULUM EXPECTATION MASTERY
        </h3>
        <p class="sbar-mastery-subtitle">
          Individual mastery standards evaluated across SBAR assessments
        </p>
      </div>
      <div class="sbar-mastery-badge-count" v-if="expectationList.length > 0">
        {{ expectationList.length }} Evaluated Expectation{{ expectationList.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="expectationList.length === 0" class="sbar-mastery-empty">
      <AlertCircle :size="24" />
      <span>No curriculum expectations evaluated yet for this student.</span>
    </div>

    <!-- Expectations Table -->
    <div v-else class="sbar-mastery-table-wrapper">
      <table class="sbar-mastery-table">
        <thead>
          <tr>
            <th class="th-code">EXPECTATION</th>
            <th class="th-level">MASTERY LEVEL</th>
            <th class="th-pct">PERCENTAGE</th>
            <th class="th-trend">TREND</th>
            <th class="th-evals">EVALUATED TASKS</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in expectationList" :key="item.code">
            <tr 
              class="sbar-mastery-row"
              :class="{ 'sbar-mastery-row--expanded': expandedRow === item.code }"
              @click="toggleRow(item.code)"
            >
              <td class="td-code">
                <div class="code-title">{{ item.code }}</div>
                <div class="code-desc" :title="item.description">{{ item.description }}</div>
              </td>
              <td class="td-level">
                <span 
                  class="sbar-level-badge" 
                  :style="{ background: item.badge.color, color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }"
                >
                  {{ item.badge.level }}
                </span>
              </td>
              <td class="td-pct">
                <strong class="pct-text">{{ item.score }}%</strong>
              </td>
              <td class="td-trend">
                <span v-if="item.trend === 'improving'" class="trend-badge trend-badge--up" title="Improving trend">↗️ Improving</span>
                <span v-else-if="item.trend === 'declining'" class="trend-badge trend-badge--down" title="Declining trend">↘️ Declining</span>
                <span v-else class="trend-badge trend-badge--steady" title="Steady performance">➡️ Steady</span>
              </td>
              <td class="td-evals">
                <div class="evals-count-tag">
                  {{ item.evaluations.length }} Evaluation{{ item.evaluations.length !== 1 ? 's' : '' }}
                  <ChevronDown :size="14" class="chevron-icon" :class="{ 'chevron-icon--open': expandedRow === item.code }" />
                </div>
              </td>
            </tr>

            <!-- Expanded Evaluations Detail Row -->
            <tr v-if="expandedRow === item.code" :key="item.code + '-exp'" class="sbar-mastery-detail-row">
              <td colspan="5">
                <div class="evals-detail-container">
                  <div class="evals-detail-title">Evaluations contributing to {{ item.code }}:</div>
                  <div class="evals-pill-list">
                    <div 
                      v-for="ev in item.evaluations" 
                      :key="ev.assessmentId" 
                      class="eval-item-card"
                      @click.stop="$emit('select-assessment', ev.assessmentId)"
                      title="Click to view assessment matrix"
                    >
                      <span class="eval-name">{{ ev.name }}</span>
                      <span 
                        class="sbar-level-badge" 
                        :style="{ background: ev.badge.color, color: 'white', padding: '1px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }"
                      >
                        {{ ev.badge.level }}
                      </span>
                      <span class="eval-date" v-if="ev.date">({{ ev.date }})</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Target, AlertCircle, ChevronDown } from 'lucide-vue-next'
import { activeClassRecord, assessments, gradeMap } from '../../composables/useGradebook.js'
import { calculateSBARExpectationMastery } from '../../db/gradebook/gradeCalcSBAR.js'

const props = defineProps({
  studentId: { type: String, required: true }
})

defineEmits(['select-assessment'])

const expandedRow = ref(null)

function toggleRow(code) {
  expandedRow.value = expandedRow.value === code ? null : code
}

const expectationList = computed(() => {
  if (!activeClassRecord.value || !props.studentId) return []

  const algorithm = activeClassRecord.value.sbarCalculationAlgorithm || 'decaying_average'
  const fullMasteryMap = calculateSBARExpectationMastery(
    activeClassRecord.value,
    assessments.value || [],
    gradeMap.value || {},
    algorithm
  )

  const studentMastery = fullMasteryMap[props.studentId] || {}
  
  // Map class curriculum expectations for descriptions
  const curriculumMap = {}
  if (Array.isArray(activeClassRecord.value.curriculumExpectations)) {
    activeClassRecord.value.curriculumExpectations.forEach(exp => {
      curriculumMap[exp.code] = exp.description || exp.name || `Expectation ${exp.code}`
    })
  }

  return Object.keys(studentMastery).map(code => {
    const data = studentMastery[code]
    return {
      code,
      description: curriculumMap[code] || `Expectation Standard ${code}`,
      score: data.score,
      badge: data.badge,
      trend: data.trend,
      evaluations: data.evaluations || []
    }
  }).sort((a, b) => a.code.localeCompare(b.code))
})
</script>

<style scoped>
.sbar-expectation-mastery {
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.sbar-mastery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sbar-mastery-title-group {
  display: flex;
  flex-direction: column;
}

.sbar-mastery-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-color, #1e293b);
  letter-spacing: 0.5px;
  margin: 0;
}

.sbar-mastery-subtitle {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  margin: 2px 0 0 0;
}

.sbar-mastery-badge-count {
  font-size: 11px;
  font-weight: 600;
  background: #e0f2fe;
  color: #0369a1;
  padding: 4px 10px;
  border-radius: 12px;
}

.sbar-mastery-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  color: var(--text-secondary, #64748b);
  font-size: 13px;
}

.sbar-mastery-table-wrapper {
  overflow-x: auto;
}

.sbar-mastery-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.sbar-mastery-table th {
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  border-bottom: 2px solid var(--border-color, #e2e8f0);
}

.sbar-mastery-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.sbar-mastery-row:hover {
  background: #f8fafc;
}

.sbar-mastery-row td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color, #f1f5f9);
}

.code-title {
  font-weight: 700;
  color: var(--text-color, #0f172a);
}

.code-desc {
  font-size: 11px;
  color: var(--text-secondary, #64748b);
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trend-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.trend-badge--up {
  background: #dcfce7;
  color: #15803d;
}

.trend-badge--down {
  background: #fee2e2;
  color: #b91c1c;
}

.trend-badge--steady {
  background: #f1f5f9;
  color: #475569;
}

.evals-count-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--primary-color, #2563eb);
  font-weight: 600;
  font-size: 12px;
}

.chevron-icon {
  transition: transform 0.2s ease;
}

.chevron-icon--open {
  transform: rotate(180deg);
}

.sbar-mastery-detail-row td {
  background: #f8fafc;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.evals-detail-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evals-detail-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
}

.evals-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.eval-item-card {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid var(--border-color, #cbd5e1);
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eval-item-card:hover {
  border-color: var(--primary-color, #2563eb);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.eval-name {
  font-weight: 600;
  font-size: 12px;
  color: var(--text-color, #1e293b);
}

.eval-date {
  font-size: 11px;
  color: var(--text-secondary, #64748b);
}
</style>
