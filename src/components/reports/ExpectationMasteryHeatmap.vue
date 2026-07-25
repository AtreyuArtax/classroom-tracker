<template>
  <div class="expectation-heatmap">
    <div class="expectation-heatmap__header">
      <div>
        <h4 class="expectation-heatmap__title">Curriculum Expectation Mastery</h4>
        <p class="expectation-heatmap__subtitle">Overview of student performance per curriculum expectation and strand.</p>
      </div>
      <div v-if="strugglingCount > 0" class="expectation-heatmap__alert-chip">
        <AlertCircle :size="14" />
        <span>{{ strugglingCount }} expectation{{ strugglingCount !== 1 ? 's' : '' }} need re-teaching (&lt;65%)</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!unitsWithExpectations.length" class="expectation-heatmap__empty">
      <BookOpen :size="36" class="expectation-heatmap__empty-icon" />
      <p class="expectation-heatmap__empty-text">No specific expectations imported or linked yet.</p>
      <p class="expectation-heatmap__empty-sub">Import expectations in <strong>Setup → Framework</strong> to unlock standard-based tracking.</p>
    </div>

    <!-- Units & Expectations List -->
    <div v-else class="expectation-heatmap__content">
      <div 
        v-for="unit in unitsWithExpectations" 
        :key="unit.unitId"
        class="expectation-heatmap__unit-card"
      >
        <div class="expectation-heatmap__unit-header">
          <span class="expectation-heatmap__unit-name">{{ unit.name }}</span>
          <span class="expectation-heatmap__unit-badge">{{ unit.expectations.length }} Expectations</span>
        </div>

        <div class="expectation-heatmap__grid">
          <div 
            v-for="exp in unit.expectations" 
            :key="exp.expectationId || exp.code"
            class="expectation-heatmap__row"
          >
            <div class="expectation-heatmap__code-col">
              <span class="expectation-heatmap__code">{{ exp.code }}</span>
              <span class="expectation-heatmap__desc" :title="exp.description">{{ exp.description }}</span>
            </div>

            <div class="expectation-heatmap__stat-col">
              <span class="expectation-heatmap__count-tag" title="Assessments linked">
                {{ exp.assessmentCount }} {{ exp.assessmentCount === 1 ? 'assessment' : 'assessments' }}
              </span>
            </div>

            <div class="expectation-heatmap__bar-col">
              <div class="expectation-heatmap__progress-track">
                <div 
                  class="expectation-heatmap__progress-fill" 
                  :style="{ 
                    width: (exp.average !== null ? Math.min(100, exp.average) : 0) + '%',
                    backgroundColor: getHeatColor(exp.average)
                  }"
                ></div>
              </div>
            </div>

            <div class="expectation-heatmap__score-col">
              <span 
                class="expectation-heatmap__score-val"
                :style="{ color: getHeatColor(exp.average) }"
              >
                {{ exp.average !== null ? exp.average.toFixed(1) + '%' : '—' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { BookOpen, AlertCircle } from 'lucide-vue-next'

const props = defineProps({
  activeClass: { type: Object, default: null },
  assessments: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) }
})

const unitsWithExpectations = computed(() => {
  if (!props.activeClass?.gradebookUnits) return []

  // Create a map of expectationId -> array of grade scores across students
  const expScores = {}
  const expAssessmentCounts = {}

  props.assessments.forEach(ass => {
    if (!ass.expectationId || ass.excluded) return
    const expId = String(ass.expectationId)
    expAssessmentCounts[expId] = (expAssessmentCounts[expId] || 0) + 1
  })

  // Also collect grades from students if available
  Object.values(props.classGrades).forEach(studentGradeObj => {
    if (!studentGradeObj || !studentGradeObj.assessmentGrades) return
    Object.entries(studentGradeObj.assessmentGrades).forEach(([assId, markObj]) => {
      if (!markObj || markObj.score === null || markObj.score === undefined) return
      const ass = props.assessments.find(a => String(a.assessmentId) === String(assId))
      if (ass && ass.expectationId) {
        const expId = String(ass.expectationId)
        if (!expScores[expId]) expScores[expId] = []
        // calculate percentage for score
        const total = ass.scaledTotal || ass.totalPoints || 100
        const pct = (markObj.score / total) * 100
        expScores[expId].push(pct)
      }
    })
  })

  return props.activeClass.gradebookUnits
    .filter(u => u.expectations && u.expectations.length > 0)
    .map(unit => {
      const expectations = unit.expectations.map(exp => {
        const expId = String(exp.expectationId || exp.code)
        const count = expAssessmentCounts[expId] || 0
        const scores = expScores[expId] || []
        const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null

        return {
          ...exp,
          assessmentCount: count,
          average: avg
        }
      })

      return {
        ...unit,
        expectations
      }
    })
})

const strugglingCount = computed(() => {
  let count = 0
  unitsWithExpectations.value.forEach(unit => {
    unit.expectations.forEach(exp => {
      if (exp.average !== null && exp.average < 65) count++
    })
  })
  return count
})

function getHeatColor(avg) {
  if (avg === null || avg === undefined) return 'var(--text-secondary)'
  if (avg >= 80) return '#10b981' // Green (Level 4)
  if (avg >= 70) return '#3b82f6' // Blue (Level 3)
  if (avg >= 60) return '#f59e0b' // Yellow (Level 2)
  return '#ef4444' // Red (Level 1 / failing)
}
</script>

<style scoped>
.expectation-heatmap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.expectation-heatmap__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.expectation-heatmap__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2px 0;
}

.expectation-heatmap__subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.expectation-heatmap__alert-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.775rem;
  font-weight: 600;
}

.expectation-heatmap__empty {
  text-align: center;
  padding: 32px 16px;
  background: var(--surface);
  border: 1px border-dashed var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
}

.expectation-heatmap__empty-icon {
  margin-bottom: 8px;
  opacity: 0.5;
}

.expectation-heatmap__empty-text {
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0 0 4px 0;
}

.expectation-heatmap__empty-sub {
  font-size: 0.8rem;
  margin: 0;
}

.expectation-heatmap__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.expectation-heatmap__unit-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.expectation-heatmap__unit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.expectation-heatmap__unit-name {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--text);
}

.expectation-heatmap__unit-badge {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--surface-hover);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.expectation-heatmap__grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.expectation-heatmap__row {
  display: grid;
  grid-template-columns: 200px 110px 1fr 70px;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 0.825rem;
}

.expectation-heatmap__code-col {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.expectation-heatmap__code {
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.775rem;
  flex-shrink: 0;
}

.expectation-heatmap__desc {
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expectation-heatmap__stat-col {
  text-align: left;
}

.expectation-heatmap__count-tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.expectation-heatmap__progress-track {
  height: 8px;
  background: var(--surface-hover);
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
}

.expectation-heatmap__progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.expectation-heatmap__score-col {
  text-align: right;
  font-weight: 700;
  font-size: 0.875rem;
}
</style>
