<template>
  <div class="sbar-analytics">
    
    <!-- Top Action Bar (Compact Header) -->
    <div class="sbar-analytics__top-bar">
      <div class="sbar-analytics__title-block">
        <h2 class="sbar-analytics__title">SBAR Mastery &amp; Learning Analytics</h2>
        <p class="sbar-analytics__subtitle">Cohort proficiency distribution, curriculum hotspots &amp; growth velocity</p>
      </div>

      <div class="sbar-analytics__controls">
        <!-- Sub-Cohort / Grade Pills (if multi-grade / multi-section) -->
        <div v-if="availableGradeFilters.length > 1" class="sbar-grade-pills">
          <button 
            v-for="gFilter in availableGradeFilters" 
            :key="gFilter" 
            class="grade-pill"
            :class="{ 'grade-pill--active': String(activeSubCohortFilter).toLowerCase() === String(gFilter).toLowerCase() }"
            @click="setSubCohortFilter(gFilter)"
          >
            {{ gFilter === 'all' ? (activeClassRecord?.classType === 'elementary' ? 'All Grades' : 'All Sections') : gFilter }}
          </button>
        </div>

        <!-- Evidence Scope Filter Control Bar -->
        <div class="evidence-toggle">
          <span class="toggle-label">Evidence:</span>
          <div class="toggle-pill-group">
            <button 
              class="toggle-pill" 
              :class="{ 'toggle-pill--active': analyticsEvidenceScope === 'all' }"
              @click="setAnalyticsEvidenceScope('all')"
              title="Include all graded evidence (Products, Observations, Conversations)"
            >
              All Evidence
            </button>
            <button 
              class="toggle-pill" 
              :class="{ 'toggle-pill--active': analyticsEvidenceScope === 'product' }"
              @click="setAnalyticsEvidenceScope('product')"
              title="Isolate uniform Product assessments"
            >
              Products Only
            </button>
          </div>
        </div>

        <!-- Algorithm Engine Badge -->
        <div class="sbar-analytics__algo-badge" :title="`SBAR Calculation Engine: ${algorithmFullLabel}`">
          <Zap :size="12" class="algo-icon" />
          <span class="algo-val">{{ algorithmShortLabel }}</span>
        </div>
      </div>
    </div>

    <!-- 1. Executive Stat Ribbon (5 Symmetrical Compact Cards) -->
    <div class="stat-ribbon">
      
      <!-- Stat 1: Cohort Average -->
      <div 
        class="stat-ribbon__item"
        :title="`Cohort Average: ${cohortAverageBadge ? cohortAverageBadge.level + ' (' + cohortAveragePct + '%)' : '—'}. Calculated using the ${algorithmFullLabel} algorithm across evaluated standards (${analyticsEvidenceScope === 'product' ? 'Products Only' : 'All Evidence'}).`"
      >
        <div class="stat-ribbon__label">
          <BarChart3 :size="13" class="stat-icon stat-icon--blue" />
          <span>Cohort Average</span>
        </div>
        <div class="stat-ribbon__value-row">
          <span 
            v-if="cohortAverageBadge" 
            class="stat-ribbon__num"
            :style="{ color: cohortAverageBadge.color }"
          >
            {{ cohortAverageBadge.level }}
          </span>
          <span v-else class="stat-ribbon__num">—</span>
          <span v-if="cohortAveragePct != null" class="stat-unit">({{ cohortAveragePct }}%)</span>
          <span v-if="analyticsEvidenceScope === 'product'" class="stat-scope-inline-badge">Product Only</span>
        </div>
      </div>

      <!-- Stat 2: Cohort Median -->
      <div 
        class="stat-ribbon__item"
        :title="`Cohort Median (50th Percentile): ${cohortMedianBadge ? cohortMedianBadge.level + ' (' + cohortMedianPct + '%)' : '—'}. Midpoint achievement level of the cohort (${analyticsEvidenceScope === 'product' ? 'Products Only' : 'All Evidence'}).`"
      >
        <div class="stat-ribbon__label">
          <CheckCircle2 :size="13" class="stat-icon stat-icon--green" />
          <span>Cohort Median</span>
        </div>
        <div class="stat-ribbon__value-row">
          <span 
            v-if="cohortMedianBadge" 
            class="stat-ribbon__num"
            :style="{ color: cohortMedianBadge.color }"
          >
            {{ cohortMedianBadge.level }}
          </span>
          <span v-else class="stat-ribbon__num">—</span>
          <span v-if="cohortMedianPct != null" class="stat-unit">({{ cohortMedianPct }}%)</span>
          <span v-if="analyticsEvidenceScope === 'product'" class="stat-scope-inline-badge">Product Only</span>
        </div>
      </div>

      <!-- Stat 3: Target Mastery (Level 3+) -->
      <div 
        class="stat-ribbon__item"
        :title="`Provincial Standard Target (Level 3+): ${targetMasteryCount} of ${totalActiveStudents} students (${targetMasteryPct}%) are currently achieving Level 3 or 4.`"
      >
        <div class="stat-ribbon__label">
          <Target :size="13" class="stat-icon stat-icon--amber" />
          <span>Target Mastery (L3+)</span>
        </div>
        <div class="stat-ribbon__value-row">
          <span class="stat-ribbon__num" :style="{ color: targetMasteryPct >= 70 ? '#16a34a' : targetMasteryPct >= 50 ? '#2563eb' : '#d97706' }">
            {{ targetMasteryPct }}%
          </span>
          <span class="stat-unit">({{ targetMasteryCount }}/{{ totalActiveStudents }})</span>
        </div>
      </div>

      <!-- Stat 4: At-Risk (< L2 / R) with Clickable Popover -->
      <div 
        class="stat-ribbon__item stat-ribbon__item--at-risk"
        :class="{ 'stat-ribbon__item--clickable': atRiskSbarStudents.length > 0, 'stat-ribbon__item--open': isAtRiskPopoverOpen }"
        :title="atRiskSbarStudents.length > 0 ? 'Click to view at-risk students and open profiles' : 'All active students are currently at Level 2 or above'"
        @click="toggleAtRiskPopover"
      >
        <div class="stat-ribbon__label">
          <AlertCircle :size="13" :class="['stat-icon', atRiskSbarStudents.length > 0 ? 'stat-icon--red' : 'stat-icon--green']" />
          <span>At-Risk (&lt; L2)</span>
          <ChevronDown v-if="atRiskSbarStudents.length > 0" :size="12" class="at-risk-chevron" :style="{ transform: isAtRiskPopoverOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }" />
        </div>
        <div class="stat-ribbon__value-row">
          <span class="stat-ribbon__num" :class="{ 'stat-ribbon__num--danger': atRiskSbarStudents.length > 0 }">
            {{ atRiskSbarStudents.length }}
            <span class="stat-unit">{{ atRiskSbarStudents.length === 1 ? 'student' : 'students' }}</span>
          </span>
        </div>

        <!-- Interactive Popover -->
        <div v-if="isAtRiskPopoverOpen && atRiskSbarStudents.length > 0" class="at-risk-popover" @click.stop>
          <div class="at-risk-popover__header">
            <span>At-Risk Students (&lt; L2)</span>
            <span class="at-risk-popover__hint">Click to open Profile</span>
          </div>
          <div class="at-risk-popover__list">
            <button 
              v-for="s in atRiskSbarStudents" 
              :key="s.studentId"
              class="at-risk-popover__item"
              @click="openStudentDossier(s.studentId)"
            >
              <span class="at-risk-popover__name">{{ s.name }}</span>
              <span class="at-risk-popover__badge" :style="{ color: s.badge?.color || '#dc2626' }">{{ s.badge?.level || 'R' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Stat 5: Triangulation Ratio -->
      <div 
        class="stat-ribbon__item stat-ribbon__item--evidence"
        :title="`Evidence Triangulation: ${triangulation.productCount} Products, ${triangulation.observationCount} Observations, ${triangulation.conversationCount} Conversations.`"
      >
        <div class="stat-ribbon__label">
          <Layers :size="13" class="stat-icon stat-icon--purple" />
          <span>Triangulation</span>
        </div>
        <div class="mini-evidence-bar">
          <div 
            class="mini-segment mini-segment--product"
            :style="{ width: triangulationBlend.productPct + '%' }"
            :title="`Product: ${triangulation.productCount} (${triangulationBlend.productPct}%)`"
          ></div>
          <div 
            class="mini-segment mini-segment--observation"
            :style="{ width: triangulationBlend.observationPct + '%' }"
            :title="`Observation: ${triangulation.observationCount} (${triangulationBlend.observationPct}%)`"
          ></div>
          <div 
            class="mini-segment mini-segment--conversation"
            :style="{ width: triangulationBlend.conversationPct + '%' }"
            :title="`Conversation: ${triangulation.conversationCount} (${triangulationBlend.conversationPct}%)`"
          ></div>
        </div>
        <div class="evidence-sub-chips">
          <span class="chip-p">{{ triangulation.productCount }}P</span>
          <span class="chip-o">{{ triangulation.observationCount }}O</span>
          <span class="chip-c">{{ triangulation.conversationCount }}C</span>
        </div>
      </div>

    </div>

    <!-- 2. Two-Column Layout: Distribution Chart + Instructional Hotspots -->
    <div class="sbar-grid-2col">
      
      <!-- Cohort Proficiency Distribution (Chart.js) -->
      <div class="analytics-card">
        <div class="analytics-card__header">
          <div class="card-title-group">
            <BarChart2 :size="15" class="card-header-icon" />
            <h3 class="analytics-card__title">Cohort Proficiency</h3>
          </div>
          <div class="chart-toggle-group">
            <button 
              class="chart-toggle-btn" 
              :class="{ 'chart-toggle-btn--active': distributionViewMode === 'levels' }"
              @click="distributionViewMode = 'levels'"
            >
              Levels
            </button>
            <button 
              class="chart-toggle-btn" 
              :class="{ 'chart-toggle-btn--active': distributionViewMode === 'substeps' }"
              @click="distributionViewMode = 'substeps'"
            >
              Substeps
            </button>
          </div>
        </div>

        <div class="chart-container" style="height: 185px; position: relative;">
          <Bar :data="chartData" :options="chartOptions" />
        </div>

        <!-- Clean Single Distribution Summary Footer -->
        <div class="distribution-footer-stat">
          <span v-if="distributionViewMode === 'levels'">
            <strong>Dominant:</strong> {{ dominantLevel ? dominantLevel.label + ' · ' + dominantLevel.count + ' students (' + dominantLevel.pct + '%)' : '—' }}
          </span>
          <span v-else>
            <strong>Dominant:</strong> {{ dominantSubstep ? dominantSubstep.code + ' · ' + dominantSubstep.count + ' students (' + dominantSubstep.pct + '%)' : '—' }}
          </span>
        </div>
      </div>

      <!-- Curriculum Expectation Hotspots -->
      <div class="analytics-card">
        <div class="analytics-card__header">
          <div class="card-title-group">
            <Sparkles :size="15" class="card-header-icon" />
            <h3 class="analytics-card__title">Curriculum Expectation Hotspots</h3>
          </div>
          <span class="card-header-tag">Pedagogical Signals</span>
        </div>

        <div class="hotspots-container">
          
          <!-- Instructional Focus Area (Hardest) -->
          <div v-if="hardestExpectations.length > 0" class="hotspot-section">
            <div class="hotspot-section-title hotspot-section-title--warning">
              <AlertTriangle :size="13" />
              <span>Instructional Focus (Needs Re-teaching)</span>
            </div>
            <div class="hotspot-list">
              <div v-for="exp in hardestExpectations.slice(0, 2)" :key="exp.code" class="hotspot-row">
                <span class="exp-code-badge exp-code-badge--danger">{{ exp.code }}</span>
                <span class="hotspot-exp-desc" :title="exp.name">{{ exp.name }}</span>
                <span class="hotspot-pill hotspot-pill--danger">{{ exp.belowL3Pct }}% below L3</span>
              </div>
            </div>
          </div>

          <!-- Strongest Mastered Standards -->
          <div v-if="masteredExpectations.length > 0" class="hotspot-section">
            <div class="hotspot-section-title hotspot-section-title--success">
              <CheckCircle2 :size="13" />
              <span>Strongest Mastered Standards (Level 3+)</span>
            </div>
            <div class="hotspot-list">
              <div v-for="exp in masteredExpectations.slice(0, 2)" :key="exp.code" class="hotspot-row">
                <span class="exp-code-badge exp-code-badge--success">{{ exp.code }}</span>
                <span class="hotspot-exp-desc" :title="exp.name">{{ exp.name }}</span>
                <span class="hotspot-pill hotspot-pill--success">{{ exp.atL3PlusPct }}% Level 3+</span>
              </div>
            </div>
          </div>
          <div v-else-if="hardestExpectations.length > 0" class="hotspot-empty-note">
            Standards will appear under Strongest Mastery as cohort achievement reaches 50%+ Level 3.
          </div>

          <!-- Growth Velocity Bar (Compact) -->
          <div class="growth-velocity-compact">
            <div class="velocity-header-compact">
              <span class="velocity-title">Cohort Growth Velocity</span>
              <span class="velocity-stat">{{ growthVelocity.improvingPct }}% Improving · {{ growthVelocity.steadyPct }}% Steady · {{ growthVelocity.decliningPct }}% Declining</span>
            </div>
            <div class="velocity-bar-multi">
              <div class="velocity-seg velocity-seg--improving" :style="{ width: growthVelocity.improvingPct + '%' }" :title="`Improving: ${growthVelocity.improvingCount} (${growthVelocity.improvingPct}%)`"></div>
              <div class="velocity-seg velocity-seg--steady" :style="{ width: growthVelocity.steadyPct + '%' }" :title="`Steady: ${growthVelocity.steadyCount} (${growthVelocity.steadyPct}%)`"></div>
              <div class="velocity-seg velocity-seg--declining" :style="{ width: growthVelocity.decliningPct + '%' }" :title="`Declining: ${growthVelocity.decliningCount} (${growthVelocity.decliningPct}%)`"></div>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- 3. SBAR Assessment & Evidence Performance Matrix -->
    <div class="analytics-card">
      <div class="analytics-card__header">
        <div class="card-title-group">
          <Layers :size="15" class="card-header-icon" />
          <h3 class="analytics-card__title">Assessment &amp; Evidence Performance Matrix</h3>
        </div>
        
        <!-- Filter Tabs (All, Product, Observation, Conversation) -->
        <div class="matrix-filter-tabs">
          <button 
            class="matrix-tab" 
            :class="{ 'matrix-tab--active': activeMatrixTab === 'all' }"
            @click="activeMatrixTab = 'all'"
          >
            All ({{ sbarAssessmentRows.length }})
          </button>
          <button 
            class="matrix-tab" 
            :class="{ 'matrix-tab--active': activeMatrixTab === 'product' }"
            @click="activeMatrixTab = 'product'"
          >
            Products ({{ sbarAssessmentRows.filter(a => a.type === 'product').length }})
          </button>
          <button 
            class="matrix-tab" 
            :class="{ 'matrix-tab--active': activeMatrixTab === 'observation' }"
            @click="activeMatrixTab = 'observation'"
          >
            Observations ({{ sbarAssessmentRows.filter(a => a.type === 'observation').length }})
          </button>
          <button 
            class="matrix-tab" 
            :class="{ 'matrix-tab--active': activeMatrixTab === 'conversation' }"
            @click="activeMatrixTab = 'conversation'"
          >
            Conversations ({{ sbarAssessmentRows.filter(a => a.type === 'conversation').length }})
          </button>
        </div>
      </div>

      <div class="sbar-matrix-table-wrapper">
        <table class="sbar-matrix-table">
          <thead>
            <tr>
              <th style="width: 28%;">Assessment / Task</th>
              <th style="width: 18%;">Type &amp; Purpose</th>
              <th style="width: 26%;">Curriculum Expectation(s)</th>
              <th style="width: 14%; text-align: center;">Class Mastery</th>
              <th style="width: 14%; text-align: right;">Evaluated</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="row in filteredSbarMatrixRows" 
              :key="row.assessmentId"
              class="matrix-row"
              @click="$emit('select-assessment', row.assessmentId)"
              title="Click to view assessment details"
            >
              <td>
                <div class="task-info">
                  <span class="task-title">{{ row.title }}</span>
                  <span v-if="row.date" class="task-date">{{ row.date }}</span>
                </div>
              </td>
              <td>
                <div class="type-purpose-group">
                  <span class="type-badge" :class="'type-badge--' + row.type">
                    {{ row.type === 'observation' ? 'Obs' : row.type === 'conversation' ? 'Conv' : 'Prod' }}
                  </span>
                  <span class="purpose-badge" :class="'purpose-badge--' + row.purpose">
                    {{ row.purpose }}
                  </span>
                </div>
              </td>
              <td>
                <div class="exp-badge-group">
                  <span v-for="exp in row.expectations" :key="exp" class="exp-badge">
                    {{ exp }}
                  </span>
                  <span v-if="!row.expectations.length" class="exp-badge-none">—</span>
                </div>
              </td>
              <td style="text-align: center;">
                <span 
                  v-if="row.masteryBadge && row.masteryBadge.level !== '—'" 
                  class="level-badge"
                  :style="{ backgroundColor: row.masteryBadge.color }"
                >
                  {{ row.masteryBadge.level }}
                </span>
                <span v-else class="mastery-empty">—</span>
              </td>
              <td style="text-align: right;">
                <span class="eval-count"><strong>{{ row.evaluatedCount }}</strong> / {{ totalActiveStudents }}</span>
              </td>
            </tr>
            <tr v-if="!filteredSbarMatrixRows.length">
              <td colspan="5" class="empty-matrix-msg">No assessments recorded for this filter.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  BarChart3,
  CheckCircle2,
  Target,
  Layers,
  Sparkles,
  ChevronDown,
  Zap
} from 'lucide-vue-next'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import {
  activeClassRecord,
  assessments,
  gradeMap,
  activeGradeFilter,
  activeSubCohortFilter,
  availableSubCohorts,
  isStudentInSubCohort,
  getUnitGradeLevel,
  analyticsEvidenceScope,
  setAnalyticsEvidenceScope
} from '../../composables/useGradebook.js'
import { isCohortMatch } from '../../db/gradebook/gradeCalc.js'
import {
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  getSBARLevelBadge
} from '../../db/gradebookService.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const emit = defineEmits(['select-assessment', 'show-dossier'])

const distributionViewMode = ref('levels')
const activeMatrixTab = ref('all')
const isAtRiskPopoverOpen = ref(false)

const availableGradeFilters = computed(() => availableSubCohorts.value)

function setSubCohortFilter(filter) {
  activeSubCohortFilter.value = filter
  activeGradeFilter.value = filter
}

const scopedAssessments = computed(() => {
  if (!assessments.value) return []
  if (analyticsEvidenceScope.value === 'product') {
    return assessments.value.filter(a => (a.assessmentType || 'product') === 'product')
  }
  return assessments.value
})

const algorithmFullLabel = computed(() => {
  const algo = activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
  if (algo === 'power_law') return 'Power Law (Marzano Logarithmic)'
  if (algo === 'mode') return 'Mode (Most Consistent)'
  if (algo === 'most_recent') return 'Most Recent (3)'
  if (algo === 'highest') return 'Highest Score'
  return 'Decaying Average (65/35)'
})

const algorithmShortLabel = computed(() => {
  const algo = activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
  if (algo === 'power_law') return 'Power Law'
  if (algo === 'mode') return 'Mode'
  if (algo === 'most_recent') return 'Recent (3)'
  if (algo === 'highest') return 'Highest'
  return 'Decaying Avg'
})

const activeStudents = computed(() => {
  if (!activeClassRecord.value?.students) return []
  return Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))
})

const filteredStudents = computed(() => {
  let list = activeStudents.value
  if (activeSubCohortFilter.value !== 'all' && availableSubCohorts.value.length > 1) {
    list = list.filter(s => isStudentInSubCohort(s))
  }
  return list
})

const totalActiveStudents = computed(() => filteredStudents.value.length)
const filteredStudentIdSet = computed(() => new Set(filteredStudents.value.map(s => String(s.studentId))))

const sbarMasteryMap = computed(() => {
  if (!activeClassRecord.value || !scopedAssessments.value || !gradeMap.value) return {}
  const algo = activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
  return calculateSBARExpectationMastery(activeClassRecord.value, scopedAssessments.value, gradeMap.value, algo)
})

// Student Overall Masteries
const studentOverallMasteryList = computed(() => {
  const list = []
  filteredStudents.value.forEach(st => {
    const overallPct = calculateSBARStudentOverallMastery(
      st.studentId,
      activeClassRecord.value,
      scopedAssessments.value,
      gradeMap.value,
      activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
    )
    if (overallPct != null && !isNaN(overallPct)) {
      list.push({
        studentId: st.studentId,
        name: `${st.firstName} ${st.lastName}`,
        score: overallPct,
        badge: getSBARLevelBadge(overallPct)
      })
    }
  })
  return list
})

// Stat 1: Cohort Average
const cohortAveragePct = computed(() => {
  const list = studentOverallMasteryList.value
  if (!list.length) return null
  return Math.round(list.reduce((sum, s) => sum + s.score, 0) / list.length)
})

const cohortAverageBadge = computed(() => {
  if (cohortAveragePct.value == null) return null
  return getSBARLevelBadge(cohortAveragePct.value)
})

// Stat 2: Cohort Median
const cohortMedianPct = computed(() => {
  const list = studentOverallMasteryList.value.map(s => s.score).sort((a, b) => a - b)
  if (!list.length) return null
  const mid = Math.floor(list.length / 2)
  return list.length % 2 !== 0 ? Math.round(list[mid]) : Math.round((list[mid - 1] + list[mid]) / 2)
})

const cohortMedianBadge = computed(() => {
  if (cohortMedianPct.value == null) return null
  return getSBARLevelBadge(cohortMedianPct.value)
})

// Stat 3: Target Mastery (Level 3+)
const targetMasteryCount = computed(() => {
  return studentOverallMasteryList.value.filter(s => s.badge.level.startsWith('L3') || s.badge.level.startsWith('L4')).length
})

const targetMasteryPct = computed(() => {
  const total = totalActiveStudents.value
  if (!total) return 0
  return Math.round((targetMasteryCount.value / total) * 100)
})

// Stat 4: At-Risk (< L2 / R)
const atRiskSbarStudents = computed(() => {
  return studentOverallMasteryList.value.filter(s => s.badge.level.startsWith('L1') || s.badge.level === 'R')
})

function toggleAtRiskPopover() {
  if (atRiskSbarStudents.value.length > 0) {
    isAtRiskPopoverOpen.value = !isAtRiskPopoverOpen.value
  }
}

function openStudentDossier(studentId) {
  isAtRiskPopoverOpen.value = false
  emit('show-dossier', studentId)
}

function handleGlobalClick(e) {
  if (isAtRiskPopoverOpen.value && !e.target.closest('.stat-ribbon__item--at-risk')) {
    isAtRiskPopoverOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})

// Level Distribution
const levelDistribution = computed(() => {
  const total = filteredStudents.value.length
  if (total === 0) {
    return {
      l4: { count: 0, pct: 0 },
      l3: { count: 0, pct: 0 },
      l2: { count: 0, pct: 0 },
      l1: { count: 0, pct: 0 },
      substeps: {}
    }
  }

  let l4 = 0, l3 = 0, l2 = 0, l1 = 0
  const countsExact = {
    'L4+': 0, 'L4': 0, 'L4-': 0,
    'L3+': 0, 'L3': 0, 'L3-': 0,
    'L2+': 0, 'L2': 0, 'L2-': 0,
    'L1+': 0, 'L1': 0, 'L1-': 0, 'R': 0
  }

  studentOverallMasteryList.value.forEach(st => {
    const badge = st.badge
    if (countsExact[badge.level] !== undefined) {
      countsExact[badge.level]++
    }

    if (badge.level.startsWith('L4')) l4++
    else if (badge.level.startsWith('L3')) l3++
    else if (badge.level.startsWith('L2')) l2++
    else if (badge.level.startsWith('L1') || badge.level === 'R') l1++
  })

  const validEvaluated = l4 + l3 + l2 + l1 || 1

  return {
    l4: { count: l4, pct: Math.round((l4 / validEvaluated) * 100) },
    l3: { count: l3, pct: Math.round((l3 / validEvaluated) * 100) },
    l2: { count: l2, pct: Math.round((l2 / validEvaluated) * 100) },
    l1: { count: l1, pct: Math.round((l1 / validEvaluated) * 100) },
    substeps: countsExact
  }
})

const dominantLevel = computed(() => {
  const dist = levelDistribution.value
  const levels = [
    { label: 'Level 4', count: dist.l4.count, pct: dist.l4.pct },
    { label: 'Level 3', count: dist.l3.count, pct: dist.l3.pct },
    { label: 'Level 2', count: dist.l2.count, pct: dist.l2.pct },
    { label: 'Level 1 / R', count: dist.l1.count, pct: dist.l1.pct }
  ].filter(l => l.count > 0).sort((a, b) => b.count - a.count)

  if (!levels.length) return null
  return levels[0]
})

const dominantSubstep = computed(() => {
  const steps = levelDistribution.value.substeps || {}
  const entries = Object.entries(steps).filter(([k, v]) => v > 0).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  const total = totalActiveStudents.value || 1
  const pct = Math.round((entries[0][1] / total) * 100)
  return { code: entries[0][0], count: entries[0][1], pct }
})

// Chart.js Configuration
const chartData = computed(() => {
  if (distributionViewMode.value === 'levels') {
    return {
      labels: ['Level 4', 'Level 3', 'Level 2', 'Level 1 / R'],
      datasets: [{
        data: [
          levelDistribution.value.l4.count,
          levelDistribution.value.l3.count,
          levelDistribution.value.l2.count,
          levelDistribution.value.l1.count
        ],
        backgroundColor: ['#16a34a', '#2563eb', '#f59e0b', '#dc2626'],
        borderRadius: 4,
        barPercentage: 0.6
      }]
    }
  } else {
    const keys = ['L4+', 'L4', 'L4-', 'L3+', 'L3', 'L3-', 'L2+', 'L2', 'L2-', 'L1+', 'L1', 'R']
    const colors = [
      '#16a34a', '#22c55e', '#4ade80',
      '#2563eb', '#3b82f6', '#60a5fa',
      '#d97706', '#f59e0b', '#fbbf24',
      '#dc2626', '#ef4444', '#991b1b'
    ]
    return {
      labels: keys,
      datasets: [{
        data: keys.map(k => levelDistribution.value.substeps[k] || 0),
        backgroundColor: colors,
        borderRadius: 4,
        barPercentage: 0.75
      }]
    }
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const count = context.raw || 0
          const total = totalActiveStudents.value || 1
          const pct = Math.round((count / total) * 100)
          return ` ${count} student${count === 1 ? '' : 's'} (${pct}%)`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        maxRotation: 0,
        minRotation: 0,
        autoSkip: false,
        color: '#475569',
        font: { size: 11, weight: '600' }
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: '#64748b',
        font: { size: 10 }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.06)'
      }
    }
  }
}))

// Expectation Hotspots & Mastered
const filteredAssessments = computed(() => {
  let list = scopedAssessments.value || []
  if (activeGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    const gLower = activeGradeFilter.value.toLowerCase()
    const validStudentIds = filteredStudentIdSet.value

    list = list.filter(a => {
      if (a.gradeLevel && a.gradeLevel.toLowerCase() === gLower) return true
      if (gradeMap.value?.[a.assessmentId]) {
        const hasEval = Object.keys(gradeMap.value[a.assessmentId]).some(sId => validStudentIds.has(String(sId)))
        if (hasEval) return true
      }
      return false
    })
  }
  return list
})

const expectationStatsList = computed(() => {
  const map = sbarMasteryMap.value
  const validStudentIds = filteredStudentIdSet.value
  const expCodeMap = {}

  const gLower = activeGradeFilter.value.toLowerCase()

  const units = activeClassRecord.value?.gradebookUnits || []
  units.forEach(u => {
    const uGrade = getUnitGradeLevel(u)
    if (activeGradeFilter.value !== 'all' && uGrade && !isCohortMatch(uGrade, activeGradeFilter.value)) return

    const uExps = u.expectations || []
    uExps.forEach(exp => {
      if (exp.code && (!exp.gradeLevel || activeGradeFilter.value === 'all' || isCohortMatch(exp.gradeLevel, activeGradeFilter.value))) {
        expCodeMap[exp.code] = exp.name || exp.description || `Expectation ${exp.code}`
      }
    })
  })

  const classExps = activeClassRecord.value?.expectations || activeClassRecord.value?.curriculumExpectations || []
  if (Array.isArray(classExps)) {
    classExps.forEach(exp => {
      if (exp.code && (!exp.gradeLevel || activeGradeFilter.value === 'all' || exp.gradeLevel.toLowerCase() === gLower)) {
        if (!expCodeMap[exp.code] || activeGradeFilter.value !== 'all') {
          expCodeMap[exp.code] = exp.name || exp.description || `Expectation ${exp.code}`
        }
      }
    })
  }

  const result = []

  Object.keys(expCodeMap).forEach(code => {
    let totalEvaluated = 0
    let belowL3Count = 0
    let atL3PlusCount = 0

    validStudentIds.forEach(studentId => {
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
    .slice(0, 4)
})

const masteredExpectations = computed(() => {
  // Only include if standard achieved >= 50% Level 3+
  return [...expectationStatsList.value]
    .filter(e => e.atL3PlusPct >= 50)
    .sort((a, b) => b.atL3PlusPct - a.atL3PlusPct)
    .slice(0, 4)
})

// Growth Velocity
const growthVelocity = computed(() => {
  const map = sbarMasteryMap.value
  const validStudentIds = filteredStudentIdSet.value
  let improving = 0, steady = 0, declining = 0

  validStudentIds.forEach(studentId => {
    if (!map[studentId]) return
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

// Triangulation
const triangulation = computed(() => {
  const asts = filteredAssessments.value || []
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

const triangulationBlend = computed(() => {
  const total = triangulation.value.productCount + triangulation.value.observationCount + triangulation.value.conversationCount
  if (!total) return { productPct: 0, observationPct: 0, conversationPct: 0 }
  const pPct = Math.round((triangulation.value.productCount / total) * 100)
  const oPct = Math.round((triangulation.value.observationCount / total) * 100)
  const cPct = Math.max(0, 100 - pPct - oPct)
  return { productPct: pPct, observationPct: oPct, conversationPct: cPct }
})

// SBAR Assessment & Evidence Matrix
const sbarAssessmentRows = computed(() => {
  const asts = filteredAssessments.value || []
  const map = gradeMap.value || {}
  const validStudentIds = filteredStudentIdSet.value

  return asts.map(a => {
    const studentGrades = map[a.assessmentId] || {}
    const evaluatedStudentIds = Object.keys(studentGrades).filter(id => {
      if (!validStudentIds.has(String(id))) return false
      const g = studentGrades[id]
      return g && !g.excluded && !g.missing
    })

    // Compute average score on this assessment
    let sumScores = 0
    let countWithScore = 0
    evaluatedStudentIds.forEach(id => {
      const g = studentGrades[id]
      if (g) {
        let score = null
        if (typeof g === 'number') score = g
        else if (g.score != null && !isNaN(Number(g.score))) score = Number(g.score)
        else if (g.expectationScores && typeof g.expectationScores === 'object') {
          const vals = Object.values(g.expectationScores).map(v => Number(v)).filter(v => !isNaN(v))
          if (vals.length > 0) score = vals.reduce((a, b) => a + b, 0) / vals.length
        }
        if (score != null && !isNaN(score)) {
          sumScores += score
          countWithScore++
        }
      }
    })

    const avgScore = countWithScore > 0 ? sumScores / countWithScore : null
    const masteryBadge = avgScore != null ? getSBARLevelBadge(avgScore) : null

    // Collect tagged expectations
    const exps = []
    if (a.expectationCode) exps.push(a.expectationCode)
    if (a.expectationIds && Array.isArray(a.expectationIds)) {
      a.expectationIds.forEach(eid => {
        if (!exps.includes(eid)) exps.push(eid)
      })
    }

    return {
      assessmentId: a.assessmentId,
      title: a.title || a.name || 'Untitled Assessment',
      date: a.date ? new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
      type: a.assessmentType || 'product',
      purpose: a.isFormative || a.purpose === 'formative' ? 'formative' : 'summative',
      expectations: exps,
      masteryBadge,
      evaluatedCount: evaluatedStudentIds.length
    }
  })
})

const filteredSbarMatrixRows = computed(() => {
  if (activeMatrixTab.value === 'all') return sbarAssessmentRows.value
  return sbarAssessmentRows.value.filter(r => r.type === activeMatrixTab.value)
})
</script>

<style scoped>
.sbar-analytics {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 0 0 1.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* Header Top Bar */
.sbar-analytics__top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem 1.15rem;
  box-shadow: var(--shadow-sm);
}

.sbar-analytics__title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
  line-height: 1.2;
}

.sbar-analytics__subtitle {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.sbar-analytics__controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sbar-grade-pills, .evidence-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.toggle-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.toggle-pill-group {
  display: inline-flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 2px;
  border-radius: var(--radius-md);
  align-items: center;
}

.toggle-pill {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.toggle-pill:hover:not(.toggle-pill--active) {
  color: var(--text);
  background: var(--bg-hover);
}

.toggle-pill--active {
  background: var(--primary) !important;
  color: #ffffff !important;
  box-shadow: var(--shadow-sm);
}

.stat-ribbon__badge-tag, .stat-scope-inline-badge {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary, #3b82f6);
  border: 1px solid rgba(59, 130, 246, 0.22);
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.2;
  align-self: center;
}

.grade-pill {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.grade-pill:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.grade-pill--active {
  background: var(--primary) !important;
  color: #ffffff !important;
}

.sbar-analytics__algo-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 4px 9px;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: help;
}

.algo-icon {
  color: var(--primary);
}

.algo-val {
  color: var(--primary);
}

/* 1. Executive Stat Ribbon */
.stat-ribbon {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: 100%;
  box-sizing: border-box;
}

.stat-ribbon__item {
  padding: 0.65rem 0.95rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 3px;
  border-right: 1px solid var(--border);
  cursor: help;
  transition: background-color 0.15s ease;
  min-width: 0;
}

.stat-ribbon__item:hover {
  background-color: var(--bg-secondary);
}

.stat-ribbon__item:last-child {
  border-right: none;
}

.stat-ribbon__label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-icon {
  flex-shrink: 0;
}
.stat-icon--blue { color: #3b82f6; }
.stat-icon--green { color: #22c55e; }
.stat-icon--amber { color: #f59e0b; }
.stat-icon--purple { color: #a855f7; }
.stat-icon--red { color: #ef4444; }

.stat-ribbon__value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-ribbon__num {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.15;
}

.stat-ribbon__num--danger {
  color: #ef4444 !important;
}

.stat-unit {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* At-Risk Popover */
.stat-ribbon__item--at-risk {
  position: relative;
}

.stat-ribbon__item--clickable {
  cursor: pointer !important;
}

.stat-ribbon__item--clickable:hover {
  background-color: rgba(239, 68, 68, 0.08) !important;
}

.stat-ribbon__item--open {
  background-color: var(--bg-secondary) !important;
  box-shadow: inset 0 0 0 1px var(--border);
}

.at-risk-chevron {
  color: #ef4444;
  margin-left: auto;
}

.at-risk-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
  animation: popover-fade 0.15s ease-out;
}

@keyframes popover-fade {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.at-risk-popover__header {
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.at-risk-popover__hint {
  font-weight: 600;
  font-size: 0.65rem;
  color: var(--primary);
}

.at-risk-popover__list {
  display: flex;
  flex-direction: column;
  max-height: 200px;
  overflow-y: auto;
}

.at-risk-popover__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background-color 0.15s;
}

.at-risk-popover__item:last-child {
  border-bottom: none;
}

.at-risk-popover__item:hover {
  background-color: var(--bg-secondary);
}

.at-risk-popover__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
}

.at-risk-popover__badge {
  font-size: 0.78rem;
  font-weight: 800;
}

/* Triangulation Bar */
.mini-evidence-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  margin: 3px 0 1px 0;
}

.mini-segment {
  height: 100%;
  transition: width 0.3s ease;
}
.mini-segment--product { background: var(--primary); }
.mini-segment--observation { background: #06b6d4; }
.mini-segment--conversation { background: #ec4899; }

.evidence-sub-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
}

.chip-p { color: var(--primary); font-weight: 700; }
.chip-o { color: #0891b2; font-weight: 700; }
.chip-c { color: #db2777; font-weight: 700; }

/* 2. Grid 2-Col */
.sbar-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 1100px) {
  .sbar-grid-2col {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .stat-ribbon {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-ribbon__item {
    border-bottom: 1px solid var(--border);
  }
}

/* Analytics Card */
.analytics-card {
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.analytics-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: nowrap;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.card-header-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.analytics-card__title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-header-tag {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: auto;
}

.chart-toggle-group {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 2px;
  flex-shrink: 0;
  margin-left: auto;
}

.chart-toggle-btn {
  background: transparent;
  border: none;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.chart-toggle-btn--active {
  background: var(--primary);
  color: #ffffff;
}

.distribution-footer-stat {
  font-size: 0.72rem;
  color: var(--text-secondary);
  padding-top: 5px;
  border-top: 1px solid var(--border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.distribution-footer-stat strong {
  color: var(--text);
  font-weight: 700;
}

/* Hotspots Container */
.hotspots-container {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.hotspot-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hotspot-section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.hotspot-section-title--warning { color: #dc2626; }
.hotspot-section-title--success { color: #16a34a; }

.hotspot-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hotspot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 8px;
}

.exp-code-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.exp-code-badge--danger { background: rgba(220, 38, 38, 0.12); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.25); }
.exp-code-badge--success { background: rgba(22, 163, 74, 0.12); color: #16a34a; border: 1px solid rgba(22, 163, 74, 0.25); }

.hotspot-exp-desc {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hotspot-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.hotspot-pill--danger { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
.hotspot-pill--success { background: rgba(22, 163, 74, 0.12); color: #16a34a; }

.hotspot-empty-note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  text-align: center;
}

/* Compact Growth Velocity */
.growth-velocity-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  margin-top: 2px;
}

.velocity-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
}

.velocity-title {
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.velocity-stat {
  font-weight: 600;
  color: var(--text);
}

.velocity-bar-multi {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
}

.velocity-seg {
  height: 100%;
  transition: width 0.3s ease;
}
.velocity-seg--improving { background: #16a34a; }
.velocity-seg--steady { background: #3b82f6; }
.velocity-seg--declining { background: #dc2626; }

/* 3. Performance Matrix Table */
.matrix-filter-tabs {
  display: flex;
  gap: 3px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.matrix-tab {
  background: transparent;
  border: none;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 3px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.matrix-tab--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
  font-weight: 700;
}

.sbar-matrix-table-wrapper {
  overflow-x: auto;
}

.sbar-matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.sbar-matrix-table th {
  padding: 6px 10px;
  text-align: left;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.matrix-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid var(--border);
}

.matrix-row:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.02));
}

.sbar-matrix-table td {
  padding: 7px 10px;
  vertical-align: middle;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.task-title {
  font-weight: 700;
  color: var(--text);
}

.task-date {
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.type-purpose-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.type-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}
.type-badge--product { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
.type-badge--observation { background: rgba(6, 182, 212, 0.12); color: #0891b2; }
.type-badge--conversation { background: rgba(236, 72, 153, 0.12); color: #db2777; }

.purpose-badge {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: capitalize;
  color: var(--text-secondary);
}

.exp-badge-group {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.exp-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--primary);
}

.exp-badge-none {
  color: var(--text-secondary);
}

.level-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  color: #ffffff;
  display: inline-block;
}

.mastery-empty {
  color: var(--text-secondary);
}

.eval-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.eval-count strong {
  color: var(--text);
}

.empty-matrix-msg {
  text-align: center;
  padding: 1.25rem;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
