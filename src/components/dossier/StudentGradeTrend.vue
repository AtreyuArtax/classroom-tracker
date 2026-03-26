<template>
  <div class="grade-trend" :class="{ 'grade-trend--print': isPrint }">
    <div v-if="!isPrint" class="grade-trend__header">
      <h3 class="grade-trend__title">Grade Performance Trend</h3>
      <div class="grade-trend__legend">
        <div class="legend-item"><span class="dot dot--primary"></span> Overall Average</div>
        <div class="legend-item"><span class="dot dot--secondary"></span> Recent Trend</div>
      </div>
    </div>
    
    <div v-if="history.length < 2" class="grade-trend__empty">
      Insufficient data to visualize a trend.
    </div>
    
    <div v-else class="grade-trend__chart-wrap" :style="{ height: isPrint ? '150px' : '240px' }">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { activeClassRecord } from '../../composables/useGradebook.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps({
  assessments: { type: Array, required: true },
  gradeMap:    { type: Object, required: true },
  studentId:   { type: String, required: true },
  isPrint:     { type: Boolean, default: false }
})

/**
 * Calculates a historical snapshot of the student's grade at each assessment point.
 */
const history = computed(() => {
  if (!props.assessments.length || !activeClassRecord.value) return []

  // Ensure assessments are sorted by date
  const sorted = [...props.assessments]
    .filter(a => !a.excluded && (props.gradeMap[a.assessmentId]?.[props.studentId]?.resolvedScore !== null || props.gradeMap[a.assessmentId]?.[props.studentId]?.missing))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (sorted.length === 0) return []

  const points = []
  const categories = activeClassRecord.value.gradebookCategories || []

  // We iterate through every assessment date to build the running average
  for (let i = 0; i < sorted.length; i++) {
    const currentAsOf = sorted[i].date
    const assessmentSubset = sorted.filter(a => a.date <= currentAsOf)
    
    // Calculate running average for this point in time
    let weightedSum = 0
    let weightUsed = 0

    for (const cat of categories) {
      const catAssessments = assessmentSubset.filter(a => a.categoryId === cat.categoryId)
      if (catAssessments.length === 0) continue

      let catEarned = 0
      let catPossible = 0

      for (const a of catAssessments) {
        const grade = props.gradeMap[a.assessmentId]?.[props.studentId]
        if (!grade || grade.excluded) continue

        const possible = a.scaledTotal ?? a.totalPoints
        if (grade.missing) {
          catPossible += possible
        } else if (grade.resolvedScore !== null) {
          const divisor = a.totalPoints || 1
          catEarned += a.scaledTotal ? (grade.resolvedScore / divisor) * a.scaledTotal : grade.resolvedScore
          catPossible += possible
        }
      }

      if (catPossible > 0) {
        const catPerc = (catEarned / catPossible) * 100
        weightedSum += catPerc * (cat.weight / 100)
        weightUsed += cat.weight
      }
    }

    const overall = weightUsed > 0 ? (weightedSum / weightUsed) * 100 : null
    
    // Calculate 3-assessment moving average for "Recent Trend"
    const recentSubset = sorted.slice(Math.max(0, i - 2), i + 1)
    const recentScores = recentSubset.map(a => {
      const g = props.gradeMap[a.assessmentId]?.[props.studentId]
      if (!g || g.excluded) return null
      if (g.missing) return 0
      return (g.resolvedScore / (a.totalPoints || 1)) * 100
    }).filter(s => s !== null)
    
    const trending = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
      : null

    points.push({
      date: new Date(currentAsOf).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      overall: overall !== null ? Math.round(overall * 10) / 10 : null,
      trending: trending !== null ? Math.round(trending * 10) / 10 : null
    })
  }

  return points
})

const chartData = computed(() => {
  return {
    labels: history.value.map(p => p.date),
    datasets: [
      {
        label: 'Overall Average',
        data: history.value.map(p => p.overall),
        borderColor: '#34c759',
        backgroundColor: 'rgba(52, 199, 89, 0.05)',
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#34c759',
        tension: 0.1,
        fill: true
      },
      {
        label: 'Recent Trend',
        data: history.value.map(p => p.trending),
        borderColor: '#007aff',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#007aff',
        tension: 0.4,
        fill: false
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: props.isPrint ? false : { duration: 1000 },
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
      }
    }
  },
  scales: {
    y: {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 10,
        callback: (value) => value + '%'
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      grid: { display: false }
    }
  }
}))
</script>

<style scoped>
.grade-trend {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-lg);
  padding:       20px;
  margin-top:    16px;
}

.grade-trend--print {
  background: none;
  border:     none;
  padding:    0;
  margin:     0;
}

.grade-trend__header {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  margin-bottom:   20px;
}

.grade-trend__title {
  margin:      0;
  font-size:   1rem;
  font-weight: 700;
  color:       var(--text);
}

.grade-trend__legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display:     flex;
  align-items: center;
  gap:         6px;
  font-size:   0.75rem;
  font-weight: 600;
  color:       var(--text-secondary);
}

.dot {
  width:         8px;
  height:        8px;
  border-radius: 50%;
}

.dot--primary   { background: #34c759; }
.dot--secondary { background: #007aff; }

.grade-trend__empty {
  padding:    40px;
  text-align: center;
  color:      var(--text-secondary);
  font-style: italic;
  font-size:  0.9rem;
}

.grade-trend__chart-wrap {
  width: 100%;
}
</style>
