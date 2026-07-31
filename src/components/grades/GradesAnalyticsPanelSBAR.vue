<template>
  <div class="sbar-analytics">
    <!-- Header Summary Banner -->
    <header class="sbar-analytics__header">
      <div class="sbar-analytics__title-group">
        <h2 class="sbar-analytics__title">SBAR Mastery & Learning Analytics</h2>
        <p class="sbar-analytics__subtitle">Cohort proficiency distribution, curriculum hotspots & growth velocity</p>
      </div>

      <div class="sbar-analytics__algo-badge">
        <span class="algo-label">Engine:</span>
        <strong class="algo-val">{{ algorithmLabel }}</strong>
      </div>
    </header>

    <!-- 1. Cohort Level Distribution Summary Cards -->
    <section class="sbar-analytics__section">
      <h3 class="section-title">Cohort Proficiency Distribution</h3>
      <div class="level-cards-grid">
        <div class="level-card level-card--l4">
          <div class="level-card__top">
            <div class="level-card__header">
              <span class="level-badge level-badge--l4">L4</span>
              <span class="level-title">Exceeding</span>
            </div>
            <div class="level-card__pct level-card__pct--l4">{{ levelDistribution.l4.pct }}%</div>
          </div>
          <div class="level-card__value">
            <span class="num">{{ levelDistribution.l4.count }}</span>
            <span class="unit">students</span>
          </div>

          <div v-if="sbarInputMode === 'fine'" class="substep-pill-group">
            <span v-for="st in levelDistribution.l4.steps" :key="st.code" class="substep-pill">
              {{ st.code }} <strong class="val">{{ st.count }}</strong>
            </span>
          </div>
          <div v-else-if="sbarInputMode === 'numeric' && levelDistribution.l4.avgPct" class="substep-pill-group">
            <span class="substep-pill">Avg Mastery <strong class="val">{{ levelDistribution.l4.avgPct }}</strong></span>
          </div>
        </div>

        <div class="level-card level-card--l3">
          <div class="level-card__top">
            <div class="level-card__header">
              <span class="level-badge level-badge--l3">L3</span>
              <span class="level-title">Meeting Target</span>
            </div>
            <div class="level-card__pct level-card__pct--l3">{{ levelDistribution.l3.pct }}%</div>
          </div>
          <div class="level-card__value">
            <span class="num">{{ levelDistribution.l3.count }}</span>
            <span class="unit">students</span>
          </div>

          <div v-if="sbarInputMode === 'fine'" class="substep-pill-group">
            <span v-for="st in levelDistribution.l3.steps" :key="st.code" class="substep-pill">
              {{ st.code }} <strong class="val">{{ st.count }}</strong>
            </span>
          </div>
          <div v-else-if="sbarInputMode === 'numeric' && levelDistribution.l3.avgPct" class="substep-pill-group">
            <span class="substep-pill">Avg Mastery <strong class="val">{{ levelDistribution.l3.avgPct }}</strong></span>
          </div>
        </div>

        <div class="level-card level-card--l2">
          <div class="level-card__top">
            <div class="level-card__header">
              <span class="level-badge level-badge--l2">L2</span>
              <span class="level-title">Approaching</span>
            </div>
            <div class="level-card__pct level-card__pct--l2">{{ levelDistribution.l2.pct }}%</div>
          </div>
          <div class="level-card__value">
            <span class="num">{{ levelDistribution.l2.count }}</span>
            <span class="unit">students</span>
          </div>

          <div v-if="sbarInputMode === 'fine'" class="substep-pill-group">
            <span v-for="st in levelDistribution.l2.steps" :key="st.code" class="substep-pill">
              {{ st.code }} <strong class="val">{{ st.count }}</strong>
            </span>
          </div>
          <div v-else-if="sbarInputMode === 'numeric' && levelDistribution.l2.avgPct" class="substep-pill-group">
            <span class="substep-pill">Avg Mastery <strong class="val">{{ levelDistribution.l2.avgPct }}</strong></span>
          </div>
        </div>

        <div class="level-card level-card--l1">
          <div class="level-card__top">
            <div class="level-card__header">
              <span class="level-badge level-badge--l1">L1 / R</span>
              <span class="level-title">Intervention</span>
            </div>
            <div class="level-card__pct level-card__pct--l1">{{ levelDistribution.l1.pct }}%</div>
          </div>
          <div class="level-card__value">
            <span class="num">{{ levelDistribution.l1.count }}</span>
            <span class="unit">students</span>
          </div>

          <div v-if="sbarInputMode === 'fine'" class="substep-pill-group">
            <span v-for="st in levelDistribution.l1.steps" :key="st.code" class="substep-pill">
              {{ st.code }} <strong class="val">{{ st.count }}</strong>
            </span>
          </div>
          <div v-else-if="sbarInputMode === 'numeric' && levelDistribution.l1.avgPct" class="substep-pill-group">
            <span class="substep-pill">Avg Mastery <strong class="val">{{ levelDistribution.l1.avgPct }}</strong></span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Curriculum Expectation Hotspots (Re-teaching vs Mastered) -->
    <section class="sbar-analytics__section grid-2col">
      <!-- Hardest Expectations / Needs Intervention -->
      <div class="hotspot-card hotspot-card--intervention">
        <div class="hotspot-card__header">
          <div class="hotspot-icon-wrapper hotspot-icon-wrapper--warning">
            <AlertTriangle :size="18" />
          </div>
          <div>
            <h3 class="hotspot-title">Instructional Focus Areas (Hardest Standards)</h3>
            <p class="hotspot-subtitle">Expectations with highest % of students below Level 3 target</p>
          </div>
        </div>

        <div class="hotspot-list" v-if="hardestExpectations.length">
          <div v-for="exp in hardestExpectations" :key="exp.code" class="hotspot-item">
            <div class="hotspot-item__main">
              <span class="exp-code-badge exp-code-badge--danger">{{ exp.code }}</span>
              <span class="exp-name">{{ exp.name }}</span>
            </div>
            <div class="hotspot-badge-stat hotspot-badge-stat--danger">
              <div class="stat-main">
                <span class="stat-pct">{{ exp.belowL3Pct }}%</span>
                <span class="stat-tag">below L3</span>
              </div>
              <div class="stat-sub">{{ exp.belowL3Count }} of {{ exp.totalEvaluated }} students</div>
            </div>
          </div>
        </div>
        <div v-else class="hotspot-empty">
          <Sparkles :size="16" /> All evaluated expectations have high student proficiency!
        </div>
      </div>

      <!-- Highest Mastered Expectations -->
      <div class="hotspot-card hotspot-card--mastered">
        <div class="hotspot-card__header">
          <div class="hotspot-icon-wrapper hotspot-icon-wrapper--success">
            <CheckCircle2 :size="18" />
          </div>
          <div>
            <h3 class="hotspot-title">Strongest Mastered Standards</h3>
            <p class="hotspot-subtitle">Expectations with highest % of students achieving Level 3+</p>
          </div>
        </div>

        <div class="hotspot-list" v-if="masteredExpectations.length">
          <div v-for="exp in masteredExpectations" :key="exp.code" class="hotspot-item">
            <div class="hotspot-item__main">
              <span class="exp-code-badge exp-code-badge--success">{{ exp.code }}</span>
              <span class="exp-name">{{ exp.name }}</span>
            </div>
            <div class="hotspot-badge-stat hotspot-badge-stat--success">
              <div class="stat-main">
                <span class="stat-pct">{{ exp.atL3PlusPct }}%</span>
                <span class="stat-tag">Level 3+</span>
              </div>
              <div class="stat-sub">{{ exp.atL3PlusCount }} of {{ exp.totalEvaluated }} students</div>
            </div>
          </div>
        </div>
        <div v-else class="hotspot-empty">
          No evaluations logged yet.
        </div>
      </div>
    </section>

    <!-- 3. Growth Velocity & Triangulation Coverage -->
    <section class="sbar-analytics__section grid-2col">
      <!-- Cohort Growth Velocity -->
      <div class="analytics-card">
        <h3 class="card-title">Cohort Growth Velocity</h3>
        <p class="card-subtitle">Trajectory trend breakdown across all evaluated expectations</p>

        <div class="velocity-bars">
          <div class="velocity-row">
            <div class="velocity-label">
              <TrendingUp :size="16" class="trend-icon trend-icon--improving" />
              <strong>Improving Trajectory</strong>
            </div>
            <div class="velocity-progress-container">
              <div class="velocity-bar velocity-bar--improving" :style="{ width: growthVelocity.improvingPct + '%' }"></div>
            </div>
            <span class="velocity-val">{{ growthVelocity.improvingCount }} ({{ growthVelocity.improvingPct }}%)</span>
          </div>

          <div class="velocity-row">
            <div class="velocity-label">
              <Minus :size="16" class="trend-icon trend-icon--steady" />
              <strong>Steady Trajectory</strong>
            </div>
            <div class="velocity-progress-container">
              <div class="velocity-bar velocity-bar--steady" :style="{ width: growthVelocity.steadyPct + '%' }"></div>
            </div>
            <span class="velocity-val">{{ growthVelocity.steadyCount }} ({{ growthVelocity.steadyPct }}%)</span>
          </div>

          <div class="velocity-row">
            <div class="velocity-label">
              <TrendingDown :size="16" class="trend-icon trend-icon--declining" />
              <strong>Declining Trajectory</strong>
            </div>
            <div class="velocity-progress-container">
              <div class="velocity-bar velocity-bar--declining" :style="{ width: growthVelocity.decliningPct + '%' }"></div>
            </div>
            <span class="velocity-val">{{ growthVelocity.decliningCount }} ({{ growthVelocity.decliningPct }}%)</span>
          </div>
        </div>
      </div>

      <!-- Triangulation & Purpose Ratios -->
      <div class="analytics-card">
        <h3 class="card-title">Triangulation & Evidence Balance</h3>
        <p class="card-subtitle">Triangulation of evidence types and practice ratios</p>

        <div class="evidence-stats">
          <div class="evidence-row">
            <span class="ev-label">Product (Tests, Labs, Assignments)</span>
            <span class="ev-count">{{ triangulation.productCount }} tasks</span>
          </div>
          <div class="evidence-row">
            <span class="ev-label">Observation (Practical Labs)</span>
            <span class="ev-count">{{ triangulation.observationCount }} tasks</span>
          </div>
          <div class="evidence-row">
            <span class="ev-label">Conversation (Oral Interviews)</span>
            <span class="ev-count">{{ triangulation.conversationCount }} tasks</span>
          </div>
        </div>

        <div class="purpose-pill-bar">
          <div class="purpose-pill purpose-pill--summative">
            <strong>Summative (Official):</strong> {{ triangulation.summativeCount }} tasks
          </div>
          <div class="purpose-pill purpose-pill--formative">
            <strong>Formative (Practice):</strong> {{ triangulation.formativeCount }} tasks
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-vue-next'
import {
  activeClassRecord,
  assessments,
  gradeMap
} from '../../composables/useGradebook.js'
import {
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  getSBARLevelBadge
} from '../../db/gradebookService.js'

const emit = defineEmits(['select-assessment', 'show-dossier'])

const algorithmLabel = computed(() => {
  const algo = activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
  if (algo === 'power_law') return 'Power Law (Marzano Logarithmic)'
  if (algo === 'mode') return 'Mode (Most Consistent)'
  if (algo === 'most_recent') return 'Most Recent (3)'
  if (algo === 'highest') return 'Highest Score'
  return 'Decaying Avg (65/35)'
})

const activeStudents = computed(() => {
  if (!activeClassRecord.value?.students) return []
  return Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))
})

const sbarMasteryMap = computed(() => {
  if (!activeClassRecord.value || !assessments.value || !gradeMap.value) return {}
  const algo = activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
  return calculateSBARExpectationMastery(activeClassRecord.value, assessments.value, gradeMap.value, algo)
})

const sbarInputMode = computed(() => activeClassRecord.value?.sbarInputMode || 'fine')

// 1. Overall Student Level Distribution
const levelDistribution = computed(() => {
  const total = activeStudents.value.length
  if (total === 0) {
    return {
      l4: { count: 0, pct: 0, subFine: '', avgPct: null },
      l3: { count: 0, pct: 0, subFine: '', avgPct: null },
      l2: { count: 0, pct: 0, subFine: '', avgPct: null },
      l1: { count: 0, pct: 0, subFine: '', avgPct: null }
    }
  }

  let l4 = 0, l3 = 0, l2 = 0, l1 = 0
  const l4Scores = [], l3Scores = [], l2Scores = [], l1Scores = []
  const countsExact = {
    'L4+': 0, 'L4': 0, 'L4-': 0,
    'L3+': 0, 'L3': 0, 'L3-': 0,
    'L2+': 0, 'L2': 0, 'L2-': 0,
    'L1+': 0, 'L1': 0, 'L1-': 0, 'R': 0
  }

  activeStudents.value.forEach(st => {
    const overallPct = calculateSBARStudentOverallMastery(
      st.studentId, 
      activeClassRecord.value, 
      assessments.value, 
      gradeMap.value, 
      activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
    )
    if (overallPct != null) {
      const badge = getSBARLevelBadge(overallPct)
      if (countsExact[badge.level] !== undefined) {
        countsExact[badge.level]++
      }

      if (badge.level.startsWith('L4')) { l4++; l4Scores.push(overallPct); }
      else if (badge.level.startsWith('L3')) { l3++; l3Scores.push(overallPct); }
      else if (badge.level.startsWith('L2')) { l2++; l2Scores.push(overallPct); }
      else if (badge.level.startsWith('L1') || badge.level === 'R') { l1++; l1Scores.push(overallPct); }
    }
  })

  const validEvaluated = l4 + l3 + l2 + l1 || 1
  const calcAvg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) + '%' : null

  return {
    l4: {
      count: l4,
      pct: Math.round((l4 / validEvaluated) * 100),
      steps: [
        { code: 'L4+', count: countsExact['L4+'] },
        { code: 'L4',  count: countsExact['L4'] },
        { code: 'L4−', count: countsExact['L4-'] }
      ],
      avgPct: calcAvg(l4Scores)
    },
    l3: {
      count: l3,
      pct: Math.round((l3 / validEvaluated) * 100),
      steps: [
        { code: 'L3+', count: countsExact['L3+'] },
        { code: 'L3',  count: countsExact['L3'] },
        { code: 'L3−', count: countsExact['L3-'] }
      ],
      avgPct: calcAvg(l3Scores)
    },
    l2: {
      count: l2,
      pct: Math.round((l2 / validEvaluated) * 100),
      steps: [
        { code: 'L2+', count: countsExact['L2+'] },
        { code: 'L2',  count: countsExact['L2'] },
        { code: 'L2−', count: countsExact['L2-'] }
      ],
      avgPct: calcAvg(l2Scores)
    },
    l1: {
      count: l1,
      pct: Math.round((l1 / validEvaluated) * 100),
      steps: [
        { code: 'L1+', count: countsExact['L1+'] },
        { code: 'L1',  count: countsExact['L1'] },
        { code: 'R',   count: countsExact['R'] }
      ],
      avgPct: calcAvg(l1Scores)
    }
  }
})

// 2. Expectation Level Analytics (Hotspots & Mastered)
const expectationStatsList = computed(() => {
  const map = sbarMasteryMap.value
  const expCodeMap = {}

  // Gather expectations metadata
  if (activeClassRecord.value?.gradebookUnits) {
    activeClassRecord.value.gradebookUnits.forEach(u => {
      if (u.expectations) {
        u.expectations.forEach(exp => {
          if (exp.code) {
            expCodeMap[exp.code] = exp.name || exp.description || `Expectation ${exp.code}`
          }
        })
      }
    })
  }
  const classExps = activeClassRecord.value?.expectations || activeClassRecord.value?.curriculumExpectations
  if (classExps && Array.isArray(classExps)) {
    classExps.forEach(exp => {
      if (exp.code && !expCodeMap[exp.code]) {
        expCodeMap[exp.code] = exp.name || exp.description || `Expectation ${exp.code}`
      }
    })
  }

  const result = []

  Object.keys(expCodeMap).forEach(code => {
    let totalEvaluated = 0
    let belowL3Count = 0
    let atL3PlusCount = 0

    Object.keys(map).forEach(studentId => {
      const expObj = map[studentId]?.[code]
      if (expObj && expObj.score != null) {
        totalEvaluated++
        const badge = expObj.badge
        if (badge.level.startsWith('L4') || badge.level.startsWith('L3')) {
          atL3PlusCount++
        } else {
          belowL3Count++
        }
      }
    })

    if (totalEvaluated > 0) {
      result.push({
        code,
        name: expCodeMap[code],
        totalEvaluated,
        belowL3Count,
        belowL3Pct: Math.round((belowL3Count / totalEvaluated) * 100),
        atL3PlusCount,
        atL3PlusPct: Math.round((atL3PlusCount / totalEvaluated) * 100)
      })
    }
  })

  return result
})

const hardestExpectations = computed(() => {
  return [...expectationStatsList.value]
    .filter(e => e.belowL3Count > 0)
    .sort((a, b) => b.belowL3Pct - a.belowL3Pct)
    .slice(0, 5)
})

const masteredExpectations = computed(() => {
  return [...expectationStatsList.value]
    .filter(e => e.atL3PlusCount > 0)
    .sort((a, b) => b.atL3PlusPct - a.atL3PlusPct)
    .slice(0, 5)
})

// 3. Growth Velocity
const growthVelocity = computed(() => {
  const map = sbarMasteryMap.value
  let improving = 0, steady = 0, declining = 0

  Object.keys(map).forEach(studentId => {
    Object.keys(map[studentId]).forEach(code => {
      const expObj = map[studentId][code]
      if (expObj?.trend === 'improving') improving++
      else if (expObj?.trend === 'declining') declining++
      else if (expObj?.trend === 'steady') steady++
    })
  })

  const total = improving + steady + declining || 1
  return {
    improvingCount: improving,
    improvingPct: Math.round((improving / total) * 100),
    steadyCount: steady,
    steadyPct: Math.round((steady / total) * 100),
    decliningCount: declining,
    decliningPct: Math.round((declining / total) * 100)
  }
})

// 4. Triangulation & Purpose Ratios
const triangulation = computed(() => {
  const asts = assessments.value || []
  let productCount = 0, observationCount = 0, conversationCount = 0
  let summativeCount = 0, formativeCount = 0

  asts.forEach(a => {
    if (a.assessmentType === 'observation') observationCount++
    else if (a.assessmentType === 'conversation') conversationCount++
    else productCount++

    if (a.isFormative || a.purpose === 'formative') formativeCount++
    else summativeCount++
  })

  return {
    productCount,
    observationCount,
    conversationCount,
    summativeCount,
    formativeCount
  }
})
</script>

<style scoped>
.sbar-analytics {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.sbar-analytics__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
}

.sbar-analytics__title {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0;
  color: var(--text);
}

.sbar-analytics__subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

.sbar-analytics__algo-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-secondary);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  font-size: 0.825rem;
}

.algo-label {
  color: var(--text-secondary);
}

.algo-val {
  color: var(--primary);
  font-weight: 700;
}

.sbar-analytics__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 850px) {
  .grid-2col {
    grid-template-columns: 1fr;
  }
}

/* Level Distribution Cards */
.level-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) {
  .level-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.level-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-top-width: 4px;
  border-radius: var(--radius-md);
  padding: 1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.level-card--l4 { border-top-color: #16a34a; }
.level-card--l3 { border-top-color: #2563eb; }
.level-card--l2 { border-top-color: #f59e0b; }
.level-card--l1 { border-top-color: #dc2626; }

.level-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.level-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
}

.level-badge--l4 { background: #16a34a; }
.level-badge--l3 { background: #2563eb; }
.level-badge--l2 { background: #f59e0b; }
.level-badge--l1 { background: #dc2626; }

.level-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.level-card__pct {
  font-size: 0.825rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 12px;
}

.level-card__pct--l4 { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
.level-card__pct--l3 { background: rgba(37, 99, 235, 0.12); color: #2563eb; }
.level-card__pct--l2 { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.level-card__pct--l1 { background: rgba(220, 38, 38, 0.12); color: #dc2626; }

.level-card__value {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.level-card__value .num {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
  color: var(--text);
}

.level-card__value .unit {
  font-size: 0.825rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.substep-pill-group {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.substep-pill {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.725rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.substep-pill .val {
  font-weight: 800;
  color: var(--text);
}

/* Hotspots Cards */
.hotspot-card, .analytics-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hotspot-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hotspot-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.hotspot-icon-wrapper--warning {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.25);
}

.hotspot-icon-wrapper--success {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
  border: 1px solid rgba(22, 163, 74, 0.25);
}

.hotspot-title, .card-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.hotspot-subtitle, .card-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0.2rem 0 0 0;
}

.hotspot-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hotspot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  gap: 12px;
}

.hotspot-item__main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.exp-code-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 1px;
}

.exp-code-badge--danger {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.25);
}

.exp-code-badge--success {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
  border: 1px solid rgba(22, 163, 74, 0.25);
}

.exp-name {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
}

.hotspot-badge-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
  min-width: 125px;
  flex-shrink: 0;
  white-space: nowrap;
}

.hotspot-badge-stat--danger {
  border-color: rgba(220, 38, 38, 0.25);
  background: rgba(220, 38, 38, 0.04);
}

.hotspot-badge-stat--success {
  border-color: rgba(22, 163, 74, 0.25);
  background: rgba(22, 163, 74, 0.04);
}

.stat-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-pct {
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1;
}

.hotspot-badge-stat--danger .stat-pct,
.hotspot-badge-stat--danger .stat-tag {
  color: #dc2626;
}

.hotspot-badge-stat--success .stat-pct,
.hotspot-badge-stat--success .stat-tag {
  color: #16a34a;
}

.stat-tag {
  font-size: 0.7rem;
  font-weight: 700;
}

.stat-sub {
  font-size: 0.725rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-top: 3px;
}

.hotspot-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 1.25rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
}

/* Velocity Bars */
.velocity-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.velocity-row {
  display: grid;
  grid-template-columns: 170px 1fr 100px;
  align-items: center;
  gap: 12px;
}

.velocity-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.825rem;
  color: var(--text);
}

.velocity-progress-container {
  height: 10px;
  background: var(--bg-secondary);
  border-radius: 5px;
  overflow: hidden;
}

.velocity-bar {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s ease;
}

.velocity-bar--improving { background: #16a34a; }
.velocity-bar--steady { background: #3b82f6; }
.velocity-bar--declining { background: #dc2626; }

.velocity-val {
  font-size: 0.8rem;
  font-weight: 700;
  text-align: right;
  color: var(--text-secondary);
}

/* Triangulation & Purpose */
.evidence-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evidence-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.ev-label {
  color: var(--text);

}

.ev-count {
  font-weight: 700;
  color: var(--primary);
}

.purpose-pill-bar {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.purpose-pill {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  text-align: center;
}

.purpose-pill--summative {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
  border: 1px solid rgba(22, 163, 74, 0.3);
}

.purpose-pill--formative {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.level-card__sub {
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 3px 6px;
  border-radius: 4px;
  margin-top: 2px;
  display: inline-block;
}
</style>
