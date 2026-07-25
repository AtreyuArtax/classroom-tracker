<template>
  <div class="grades__analytics-panel">
    <!-- Outlier Toggle & Notice (Step 7) -->
    <div class="grades__analytics-header">
      <div v-if="exclusionMode !== 'none'" class="grades__outlier-notice" :title="excludedNames">
        <AlertCircle :size="16" />
        <span>Exclusion active: {{ classAnalytics?.outlierCount || 0 }} {{ classAnalytics?.outlierCount === 1 ? 'student' : 'students' }} hidden.</span>
      </div>
      <div class="grades__outlier-toggle">
        <span class="grades__toggle-label">Exclusion Filter:</span>
        <div class="grades__toggle-group">
          <button 
            class="grades__toggle-btn" 
            :class="{ 'grades__toggle-btn--active': exclusionMode === 'none' }"
            @click="setExclusionMode('none')"
          >Include All</button>
          <button 
            class="grades__toggle-btn" 
            :class="{ 'grades__toggle-btn--active': exclusionMode === 'fixed' }"
            @click="setExclusionMode('fixed')"
          >
            <span v-if="exclusionMode !== 'fixed'">Below {{ fixedExclusionThreshold }}%</span>
            <div v-else class="grades__threshold-editor">
              Below <input 
                type="number" 
                v-model.number="fixedExclusionThreshold" 
                @blur="onThresholdChange"
                @keyup.enter="onThresholdChange"
                class="grades__threshold-input"
              />%
            </div>
          </button>
          <button 
            class="grades__toggle-btn" 
            :class="{ 'grades__toggle-btn--active': exclusionMode === 'auto' }"
            @click="setExclusionMode('auto')"
          >Auto Outliers</button>
        </div>
      </div>
    </div>

    <!-- Category Weight Audit Warning -->
    <div v-if="isWeightWarningVisible" 
      class="grades__weight-warning"
      :class="categoryWeightTotal > 100 ? 'grades__weight-warning--over' : 'grades__weight-warning--under'">
      <AlertTriangle :size="16" />
      <span>Audit Note: Category weights sum to {{ categoryWeightTotal }}%. Averages will be scaled, but 100% is recommended for audit clarity.</span>
    </div>

    <!-- Overlay sits on top without removing content -->
    <div v-if="isCalculating" class="grades__calculating-overlay">
      <div class="grades__spinner"></div>
      <p>Calculating analytics...</p>
    </div>

    <!-- Empty state only if no data and NOT calculating -->
    <div v-if="!classAnalytics && !isCalculating" class="grades__empty-analytics">
      <div class="grades__empty-content">
        <BarChart2 :size="64" class="grades__empty-icon" />
        <h3>No analytics available yet.</h3>
        <p>Enter grades in the Grid view to see class performance data.</p>
        <button class="grades__btn-primary" @click="analyticsMode = false">
          <ArrowLeft :size="16" /> Switch to Grid
        </button>
      </div>
    </div>

    <!-- Main content - always stays in DOM if it exists to preserve scroll -->
    <div v-if="classAnalytics" class="grades__analytics-scrollable">
      <div class="grades__analytics-sections">
        <!-- Class Overview Cards (Step 3) -->
        <div class="grades__analytics-row">
          <div class="grades__analytics-card" :style="{ borderLeft: `4px solid ${getHeatColor(overallClassAvg)}` }">
            <div class="grades__card-label">CLASS AVERAGE</div>
            <div class="grades__card-value-group">
              <div class="grades__card-value">{{ formatGrade(overallClassAvg) }}</div>
              <div class="grades__card-hint">{{ formatGrade(classAnalytics.mean) }} products only</div>
            </div>
          </div>
          <div class="grades__analytics-card" :style="{ borderLeft: `4px solid ${getHeatColor(overallClassMedian)}` }">
            <div class="grades__card-label">WEIGHTED MEDIAN</div>
            <div class="grades__card-value-group">
              <div class="grades__card-value">{{ formatGrade(overallClassMedian) }}</div>
              <div class="grades__card-hint">{{ formatGrade(classAnalytics.median) }} products only</div>
            </div>
          </div>
          <div class="grades__analytics-card" :style="{ borderLeft: `4px solid ${getHeatColor(classMostConsistent?.range?.[0])}` }">
            <div class="grades__card-label">MOST CONSISTENT</div>
            <div v-if="classMostConsistent" class="grades__card-value-group">
              <div class="grades__card-value">{{ classMostConsistent.label }}</div>
              <div class="grades__card-hint">{{ classMostConsistent.count }} of {{ classMostConsistent.total }} students</div>
            </div>
            <div class="grades__card-value" v-else>—</div>
          </div>
          <div class="grades__analytics-card" :style="{ borderLeft: `4px solid ${getSDColor(overallClassSD)}` }">
            <div class="grades__card-label">STD DEVIATION</div>
            <div class="grades__card-value-group">
              <div class="grades__card-value">{{ overallClassSD !== null ? overallClassSD.toFixed(1) + '%' : '—' }}</div>
              <div class="grades__card-hint">{{ classAnalytics.sd !== null ? classAnalytics.sd.toFixed(1) + '%' : '—' }} products only</div>
            </div>
          </div>
        </div>

        <!-- Evidence Blend / Triangulation (Step 4 Upgrade) -->
        <div class="grades__analytics-section">
          <h3 class="grades__analytics-subtitle">TRIPLE EVIDENCE BLEND</h3>
          
          <div v-if="classEvidenceBlend" class="grades__blend-container">
            <div class="grades__blend-bar">
              <div 
                class="grades__blend-segment grades__blend-segment--product" 
                :style="{ width: classEvidenceBlend.product.percentage + '%' }"
                :title="`Product: ${classEvidenceBlend.product.count} assessments (${classEvidenceBlend.product.percentage}%)`"
              ></div>
              <div 
                class="grades__blend-segment grades__blend-segment--observation" 
                :style="{ width: classEvidenceBlend.observation.percentage + '%' }"
                :title="`Observation: ${classEvidenceBlend.observation.count} assessments (${classEvidenceBlend.observation.percentage}%)`"
              ></div>
              <div 
                class="grades__blend-segment grades__blend-segment--conversation" 
                :style="{ width: classEvidenceBlend.conversation.percentage + '%' }"
                :title="`Conversation: ${classEvidenceBlend.conversation.count} assessments (${classEvidenceBlend.conversation.percentage}%)`"
              ></div>
            </div>
            
            <div class="grades__blend-legend">
              <div class="grades__legend-item">
                <span class="grades__legend-dot grades__legend-dot--product"></span>
                <span class="grades__legend-text">Product: {{ classEvidenceBlend.product.count }} assessment{{ classEvidenceBlend.product.count !== 1 ? 's' : '' }} ({{ classEvidenceBlend.product.percentage }}%)</span>
              </div>
              <div class="grades__legend-item">
                <span class="grades__legend-dot grades__legend-dot--observation"></span>
                <span class="grades__legend-text">Observation: {{ classEvidenceBlend.observation.count }} assessment{{ classEvidenceBlend.observation.count !== 1 ? 's' : '' }} ({{ classEvidenceBlend.observation.percentage }}%) • {{ classAnalytics.observationCoverage.percentage }}% student coverage</span>
              </div>
              <div class="grades__legend-item">
                <span class="grades__legend-dot grades__legend-dot--conversation"></span>
                <span class="grades__legend-text">Conversation: {{ classEvidenceBlend.conversation.count }} assessment{{ classEvidenceBlend.conversation.count !== 1 ? 's' : '' }} ({{ classEvidenceBlend.conversation.percentage }}%) • {{ classAnalytics.conversationCoverage.percentage }}% student coverage</span>
              </div>
            </div>
          </div>
          
          <p class="grades__analytics-hint">Coverage shows the % of students with at least one entry for that evidence type.</p>
        </div>

        <!-- Grade Distribution Histogram (Step 5) -->
        <div class="grades__analytics-section">
          <div class="grades__section-header-row">
            <h3 class="grades__analytics-subtitle">PRODUCT GRADE DISTRIBUTION</h3>
            <div class="grades__toggle-group">
              <button 
                class="grades__toggle-btn"
                :class="{ 'grades__toggle-btn--active': distributionMode === 'buckets' }"
                @click="distributionMode = 'buckets'"
              >10% Buckets</button>
              <button 
                class="grades__toggle-btn"
                :class="{ 'grades__toggle-btn--active': distributionMode === 'levels' }"
                @click="distributionMode = 'levels'"
              >Levels</button>
            </div>
          </div>
          <div class="grades__chart-container" style="height: 200px;">
            <Bar :data="bucketChartData" :options="bucketChartOptions" />
          </div>
          <p class="grades__analytics-hint">
            {{ distributionMode === 'buckets' 
                ? 'Number of students within each 10% grade bracket (Product assessments only).' 
                : 'Student count by achievement level (Product assessments only).' }}
          </p>
        </div>

        <!-- Per-Assessment Breakdowns (Grouped) -->
        <div class="grades__analytics-section">
          <div class="grades__analytics-groups">
            
            <!-- Product Assessments Table -->
            <div class="grades__analytics-group-box">
              <h3 class="grades__analytics-subtitle">PRODUCT ASSESSMENTS BREAKDOWN</h3>
              <div class="grades__analytics-table-wrapper">
                <table class="grades__analytics-table">
                  <thead>
                    <tr>
                      <th @click="toggleSort('name')">
                        Assessment {{ analyticsSortBy === 'name' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                      </th>
                      <th>Category</th>
                      <th @click="toggleSort('mean')">
                        Avg {{ analyticsSortBy === 'mean' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                      </th>
                      <th @click="toggleSort('median')">
                        Med {{ analyticsSortBy === 'median' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                      </th>
                      <th @click="toggleSort('sd')">
                        SD {{ analyticsSortBy === 'sd' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                      </th>
                      <th>High</th>
                      <th>Low</th>
                      <th>Flag</th>
                      <th>Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="a in sortedProductAssessments" :key="a.assessmentId">
                      <td class="grades__td-assessment-name" :title="a.description || a.name" @click="$emit('select-assessment', a.assessmentId)">
                        {{ a.name }}
                      </td>
                      <td>{{ getCategoryName(a.categoryId) }}</td>
                      <td :style="{ color: getHeatTextColor(a.stats.mean), fontWeight: 'bold' }">{{ formatGrade(a.stats.mean) }}</td>
                      <td>{{ formatGrade(a.stats.median) }}</td>
                      <td>{{ a.stats.sd !== null ? a.stats.sd.toFixed(1) + '%' : '—' }}</td>
                      <td>{{ formatGrade(a.stats.highest) }}</td>
                      <td>{{ formatGrade(a.stats.lowest) }}</td>
                      <td>
                        <div class="grades__flag-group">
                          <span v-if="a.stats.calibrationFlag === 'too_hard'" class="grades__flag grades__flag--red" title="Too Hard / Calibration needed">🔴</span>
                          <span v-else-if="a.stats.calibrationFlag === 'too_easy'" class="grades__flag grades__flag--amber" title="Too Easy / Calibration needed">🟡</span>
                          <span v-else class="grades__flag grades__flag--green" title="Well calibrated">✓</span>
                        </div>
                      </td>
                      <td>
                        <div class="grades__sparkline" v-if="a.stats.distributionBuckets">
                          <div 
                            v-for="bucket in (distributionMode === 'buckets' ? a.stats.distributionBuckets : a.stats.levelBuckets)" 
                            :key="bucket.label"
                            class="grades__sparkline-bar"
                            :style="{ 
                              height: (bucket.count / a.stats.totalCount * 100) + '%',
                              background: getHeatColorHex(bucket.range[0])
                            }"
                            :title="`${bucket.label}: ${bucket.count} students`"
                          ></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="!sortedProductAssessments.length" class="grades__analytics-hint">No product assessments found.</p>
            </div>

            <!-- Observation Assessments Table -->
            <div v-if="sortedObservationAssessments.length" class="grades__analytics-group-box">
              <h3 class="grades__analytics-subtitle">OBSERVATION LABS BREAKDOWN</h3>
              <div class="grades__analytics-table-wrapper">
                <table class="grades__analytics-table">
                  <thead>
                    <tr>
                      <th @click="toggleSort('name')">Observation Assessment</th>
                      <th>Avg</th>
                      <th>Med</th>
                      <th>SD</th>
                      <th>Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="a in sortedObservationAssessments" :key="a.assessmentId">
                      <td class="grades__td-assessment-name" @click="$emit('select-assessment', a.assessmentId)">{{ a.name }}</td>
                      <td :style="{ color: getHeatTextColor(a.stats.mean), fontWeight: 'bold' }">{{ formatGrade(a.stats.mean) }}</td>
                      <td>{{ formatGrade(a.stats.median) }}</td>
                      <td>{{ a.stats.sd !== null ? a.stats.sd.toFixed(1) + '%' : '—' }}</td>
                      <td>
                        <div class="grades__sparkline" v-if="a.stats.distributionBuckets">
                          <div 
                            v-for="bucket in (distributionMode === 'buckets' ? a.stats.distributionBuckets : a.stats.levelBuckets)" 
                            :key="bucket.label"
                            class="grades__sparkline-bar"
                            :style="{ 
                              height: (bucket.count / a.stats.totalCount * 100) + '%',
                              background: getHeatColorHex(bucket.range[0])
                            }"
                            :title="`${bucket.label}: ${bucket.count} students`"
                          ></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Conversation Assessments Table -->
            <div v-if="sortedConversationAssessments.length" class="grades__analytics-group-box">
              <h3 class="grades__analytics-subtitle">CONVERSATION ASSESSMENTS BREAKDOWN</h3>
              <div class="grades__analytics-table-wrapper">
                <table class="grades__analytics-table">
                  <thead>
                    <tr>
                      <th @click="toggleSort('name')">Conversation Assessment</th>
                      <th>Avg</th>
                      <th>Med</th>
                      <th>Coverage</th>
                      <th>Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="a in sortedConversationAssessments" :key="a.assessmentId">
                      <td class="grades__td-assessment-name" @click="$emit('select-assessment', a.assessmentId)">{{ a.name }}</td>
                      <td :style="{ color: getHeatTextColor(a.stats.mean), fontWeight: 'bold' }">{{ formatGrade(a.stats.mean) }}</td>
                      <td>{{ formatGrade(a.stats.median) }}</td>
                      <td>{{ a.stats.totalCount }} Students</td>
                      <td>
                        <div class="grades__sparkline" v-if="a.stats.distributionBuckets">
                          <div 
                            v-for="bucket in (distributionMode === 'buckets' ? a.stats.distributionBuckets : a.stats.levelBuckets)" 
                            :key="bucket.label"
                            class="grades__sparkline-bar"
                            :style="{ 
                              height: (bucket.count / a.stats.totalCount * 100) + '%',
                              background: getHeatColorHex(bucket.range[0])
                            }"
                            :title="`${bucket.label}: ${bucket.count} students`"
                          ></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <!-- Student Exclusion (Step 8) -->
        <div class="grades__analytics-section">
          <header class="grades__analytics-collapsible-header" @click="isExclusionsOpen = !isExclusionsOpen">
            <h3 class="grades__analytics-subtitle">STUDENT EXCLUSIONS</h3>
            <ChevronRight :size="20" :style="{ transform: isExclusionsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }" />
          </header>
          
          <div v-if="isExclusionsOpen" class="grades__exclusion-list">
            <p class="grades__analytics-hint">Students excluded here are permanently removed from all analytics calculations for this class. Their grades are unaffected.</p>
            <div class="grades__exclusion-grid">
              <div v-for="s in sortedRoster" :key="s.studentId" class="grades__exclusion-item">
                <label class="grades__checkbox-label">
                  <input 
                    type="checkbox" 
                    :checked="s.excludeFromAnalytics" 
                    @change="toggleStudentFromAnalytics(s.studentId)"
                  />
                  {{ s.firstName }} {{ s.lastName }}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  activeClassRecord,
  classGrades,
  assessments,
  gradeMap,
  exclusionMode,
  fixedExclusionThreshold,
  distributionMode,
  classAnalytics,
  refreshClassAnalytics,
  setExclusionMode,
  toggleStudentFromAnalytics,
  analyticsMode
} from '../composables/useGradebook.js'
import {
  getHeatColor,
  getHeatColorHex,
  getHeatTextColor,
  getSDColor,
  formatGrade
} from '../utils/gradeColors.js'
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
import { AlertCircle, AlertTriangle, BarChart2, ArrowLeft, ChevronRight } from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const emit = defineEmits(['select-assessment'])

const isExclusionsOpen = ref(false)
const isCalculating = ref(false)

// Outliers lists and display helpers
const excludedNames = computed(() => {
  if (!classAnalytics.value?.outlierStudentIds || classAnalytics.value.outlierStudentIds.length === 0) return ""
  if (!activeClassRecord.value?.students) return ""
  const names = classAnalytics.value.outlierStudentIds
    .map(id => {
      const s = activeClassRecord.value.students[id]
      return s ? `${s.firstName} ${s.lastName}` : id
    })
  return "Hidden students: " + names.join(", ")
})

// Trigger calculation when threshold input is updated
async function onThresholdChange() {
  isCalculating.value = true
  try {
    await refreshClassAnalytics()
  } finally {
    isCalculating.value = false
  }
}

// Watchers for calculations
watch(analyticsMode, async (val) => {
  if (val) {
    isCalculating.value = true
    try {
      await refreshClassAnalytics()
    } finally {
      isCalculating.value = false
    }
  }
})

watch(exclusionMode, async () => {
  isCalculating.value = true
  try {
    await refreshClassAnalytics()
  } finally {
    isCalculating.value = false
  }
})

// Local breakdown sort states
const analyticsSortBy = ref('date')
const analyticsSortOrder = ref('asc')

function toggleSort(field) {
  if (analyticsSortBy.value === field) {
    analyticsSortOrder.value = analyticsSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    analyticsSortBy.value = field
    analyticsSortOrder.value = 'desc'
  }
}

// Computeds
const overallClassAvg = computed(() => {
  const values = Object.values(classGrades.value)
    .map(g => g.overallGrade)
    .filter(val => val !== null && val !== undefined)
  if (values.length === 0) return null
  return values.reduce((sum, val) => sum + val, 0) / values.length
})

const overallClassMedian = computed(() => {
  const values = Object.values(classGrades.value)
    .map(g => g.overallGrade)
    .filter(val => val !== null && val !== undefined)
    .sort((a, b) => a - b)
  if (values.length === 0) return null
  const mid = Math.floor(values.length / 2)
  return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2
})

const overallClassSD = computed(() => {
  const values = Object.values(classGrades.value)
    .map(g => g.overallGrade)
    .filter(val => val !== null && val !== undefined)
  if (values.length < 2) return null
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const sqDiffSum = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0)
  return Math.sqrt(sqDiffSum / (values.length - 1))
})

const getCategoryName = (categoryId) => {
  return activeClassRecord.value?.gradebookCategories
    ?.find(c => c.categoryId === categoryId)?.name ?? '—'
}

const isWeightWarningVisible = computed(() => {
  return categoryWeightTotal.value !== 100
})

const categoryWeightTotal = computed(() => {
  if (!activeClassRecord.value?.gradebookCategories) return 0
  return activeClassRecord.value.gradebookCategories.reduce((sum, cat) => sum + (cat.weight || 0), 0)
})

const classMostConsistent = computed(() => {
  if (!classAnalytics.value || !classAnalytics.value.distributionBuckets) return null
  
  const bucketCounts = {}
  const bucketRanges = {}
  
  const dataset = Object.values(classGrades.value)
    .map(g => g.overallGrade)
    .filter(val => val !== null && val !== undefined)
    
  if (dataset.length === 0) return null
  
  // Set up buckets
  const buckets = [
    { label: '80-100%', range: [80, 100] },
    { label: '70-79%', range: [70, 79] },
    { label: '60-69%', range: [60, 69] },
    { label: '50-59%', range: [50, 59] },
    { label: '0-49%', range: [0, 49] }
  ]
  
  buckets.forEach(b => {
    bucketCounts[b.label] = 0
    bucketRanges[b.label] = b.range
  })
  
  dataset.forEach(score => {
    if (score >= 80) {
      bucketCounts['80-100%']++
    } else if (score >= 70) {
      bucketCounts['70-79%']++
    } else if (score >= 60) {
      bucketCounts['60-69%']++
    } else if (score >= 50) {
      bucketCounts['50-59%']++
    } else {
      bucketCounts['0-49%']++
    }
  })
  
  const sorted = Object.entries(bucketCounts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null
  
  const [label, count] = sorted[0]
  return {
    label,
    count,
    range: bucketRanges[label],
    total: dataset.length
  }
})

const classEvidenceBlend = computed(() => {
  const activeAssessments = (assessments.value || []).filter(a => a.target !== 'individual' && !a.excluded)
  const total = classAnalytics.value?.totalAssessmentsCount ?? activeAssessments.length
  
  if (total === 0) {
    return {
      product: { count: 0, percentage: 0 },
      observation: { count: 0, percentage: 0 },
      conversation: { count: 0, percentage: 0 }
    }
  }
  
  const pCount = classAnalytics.value?.productCount ?? activeAssessments.filter(a => (a.assessmentType || 'product') === 'product').length
  const oCount = classAnalytics.value?.observationCount ?? activeAssessments.filter(a => a.assessmentType === 'observation').length
  const cCount = classAnalytics.value?.conversationCount ?? activeAssessments.filter(a => a.assessmentType === 'conversation').length

  const pPct = Math.round((pCount / total) * 100)
  const oPct = Math.round((oCount / total) * 100)
  const cPct = total > 0 && (oCount > 0 || cCount > 0) ? Math.max(0, 100 - pPct - oPct) : Math.round((cCount / total) * 100)

  return {
    product: { count: pCount, percentage: pPct },
    observation: { count: oCount, percentage: oPct },
    conversation: { count: cCount, percentage: cPct }
  }
})

// Roster for checklist
const sortedRoster = computed(() => {
  if (!activeClassRecord.value?.students) return []
  return Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))
    .sort((a, b) => a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase()))
})

// Chart.js bindings
const bucketChartData = computed(() => {
  if (!classAnalytics.value) return { labels: [], datasets: [] }
  
  const dataset = classAnalytics.value.distributionBuckets || []
  const levels = classAnalytics.value.levelBuckets || []
  
  const activeSet = distributionMode.value === 'buckets' ? dataset : levels
  const labels = activeSet.map(d => d.label)
  const data = activeSet.map(d => d.count)
  
  return {
    labels,
    datasets: [{
      label: 'Students',
      data,
      backgroundColor: activeSet.map(b => getHeatColorHex(b.range[0])),
      borderRadius: 6,
      borderWidth: 0,
      maxBarThickness: 40
    }]
  }
})

const bucketChartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 6,
        displayColors: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { display: false }
      }
    }
  }
})

// Assessment breakdowns
const sortedProductAssessments = computed(() => {
  if (!classAnalytics.value?.assessmentBreakdowns) return []
  return processTypedAssessments('product')
})

const sortedObservationAssessments = computed(() => {
  if (!classAnalytics.value?.assessmentBreakdowns) return []
  return processTypedAssessments('observation')
})

const sortedConversationAssessments = computed(() => {
  if (!classAnalytics.value?.assessmentBreakdowns) return []
  return processTypedAssessments('conversation')
})

function processTypedAssessments(type) {
  const items = classAnalytics.value.assessmentBreakdowns
    .filter(a => (a.assessmentType || 'product').toLowerCase() === type)
    
  return items.sort((a, b) => {
    if (analyticsSortBy.value === 'name') {
      return analyticsSortOrder.value === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name)
    }
    
    let valA = a.stats?.[analyticsSortBy.value] ?? -1
    let valB = b.stats?.[analyticsSortBy.value] ?? -1
    
    return analyticsSortOrder.value === 'asc' ? valA - valB : valB - valA
  })
}
</script>

<style scoped>
/* Scoped overrides to target analytics components and layout */
.grades__analytics-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg);
  position: relative;
}

.grades__analytics-header {
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.grades__outlier-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #856403;
  background: #fff3cd;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  border: 1px solid rgba(0,0,0,0.05);
  white-space: nowrap;
}

.grades__outlier-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.grades__toggle-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.grades__calculating-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  gap: 1rem;
  backdrop-filter: blur(2px);
}

.grades__spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: grades-spin 1s linear infinite;
}

@keyframes grades-spin {
  to { transform: rotate(360deg); }
}

.grades__analytics-scrollable {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem;
}

.grades__analytics-sections {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.grades__analytics-section {
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.grades__analytics-subtitle {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.grades__section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.grades__analytics-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 1rem;
}

.grades__analytics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}

.grades__analytics-card {
  background: var(--surface);
  padding: 1.25rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.grades__analytics-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.grades__card-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
}

.grades__card-hint {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.grades__card-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.grades__analytics-table-wrapper {
  overflow-x: auto;
  margin: 0 -0.5rem;
}

.grades__analytics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.grades__analytics-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.grades__analytics-table th:hover {
  background: var(--bg-secondary);
}

.grades__analytics-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.grades__td-assessment-name {
  font-weight: 600;
  cursor: pointer;
  color: var(--primary);
}

.grades__flag-group {
  display: flex;
  gap: 0.5rem;
}

.grades__flag {
  font-size: 1.1rem;
  line-height: 1;
}

.grades__analytics-collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.grades__exclusion-list {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  animation: slide-down 0.2s ease-out;
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.grades__exclusion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.grades__exclusion-item {
  font-size: 0.875rem;
}

.grades__empty-analytics {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem;
}

.grades__empty-content {
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.grades__empty-icon {
  color: var(--border);
  margin-bottom: 0.5rem;
}

.grades__empty-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.grades__empty-content p {
  color: var(--text-secondary);
}

.grades__toggle-group {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 2px;
  border-radius: var(--radius-md);
  align-items: center;
}

.grades__toggle-btn {
  background: transparent;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.grades__toggle-btn--active {
  background: var(--primary) !important;
  color: #ffffff !important;
  box-shadow: var(--shadow-sm);
}

.grades__toggle-btn--active .grades__threshold-input {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: #ffffff !important;
}

.grades__threshold-editor {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.grades__threshold-input {
  width: 40px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px;
  text-align: center;
  font-size: 0.8rem;
  background: var(--surface);
  color: var(--text);
  font-weight: bold;
}

.grades__weight-warning {
  padding: 0.75rem 1.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.grades__weight-warning--over {
  background: #fdf2f2;
  color: #9b1c1c;
}

.grades__weight-warning--under {
  background: #fefaf0;
  color: #b45309;
}

.grades__blend-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.25rem;
}

.grades__blend-bar {
  display: flex;
  height: 24px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
}

.grades__blend-segment {
  height: 100%;
  transition: width 0.3s ease;
}

.grades__blend-segment--product {
  background: var(--primary);
}

.grades__blend-segment--observation {
  background: #06b6d4;
}

.grades__blend-segment--conversation {
  background: #ec4899;
}

.grades__blend-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.grades__legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.grades__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.grades__legend-dot--product { background: var(--primary); }
.grades__legend-dot--observation { background: #06b6d4; }
.grades__legend-dot--conversation { background: #ec4899; }

.grades__legend-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.grades__sparkline {
  display: flex;
  align-items: flex-end;
  height: 20px;
  gap: 2px;
  width: 100%;
}

.grades__sparkline-bar {
  flex: 1;
  min-width: 4px;
  border-radius: 1px;
}

.grades__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: background-color 0.2s;
}

.grades__btn-primary:hover {
  background: var(--primary-dark, #3b31c8);
}
</style>
