<template>
  <div class="grade-trend-chart">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  assessments: {
    type: Array,
    required: true
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  if (!props.assessments.length) return { labels: [], datasets: [] }

  // Sort by date to be sure
  const sorted = [...props.assessments].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  // 1. Calculate running weighted average
  const categoryStates = {} // { [catId]: { earned: 0, possible: 0 } }
  const runningGrades = []

  sorted.forEach(a => {
    // Initialize category state if needed
    if (!categoryStates[a.categoryId]) {
      categoryStates[a.categoryId] = { earned: 0, possible: 0 }
    }

    // Handle missing/explicit zero
    if (a.missing) {
      categoryStates[a.categoryId].possible += (a.scaledTotal ?? a.totalPoints)
    } else if (a.resolvedScore !== null) {
      const earned = a.resolvedScore
      const possible = a.totalPoints || 1
      const scaledTotal = a.scaledTotal ?? a.totalPoints
      
      const scaledEarned = (earned / possible) * scaledTotal
      categoryStates[a.categoryId].earned += scaledEarned
      categoryStates[a.categoryId].possible += scaledTotal
    }

    // Calculate weighted average at this time point
    let weightedSum = 0
    let weightUsed = 0

    props.categories.forEach(cat => {
      const state = categoryStates[cat.categoryId]
      if (state && state.possible > 0) {
        const catPercent = (state.earned / state.possible) * 100
        weightedSum += catPercent * (cat.weight / 100)
        weightUsed += cat.weight
      }
    })

    const currentOverall = weightUsed === 0 ? 0 : (weightedSum / weightUsed) * 100
    runningGrades.push(Math.round(currentOverall * 10) / 10)
  })

  // 2. Calculate Linear Regression for the trend line
  // Points (x, y) where x is index, y is runningGrade
  const n = runningGrades.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += runningGrades[i]
    sumXY += i * runningGrades[i]
    sumX2 += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const regressionLine = runningGrades.map((_, i) => {
    const val = slope * i + intercept
    return Math.round(Math.max(0, Math.min(100, val)) * 10) / 10
  })

  return {
    labels: sorted.map(a => new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Overall Grade',
        backgroundColor: '#4663ac',
        borderColor: '#4663ac',
        data: runningGrades,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        zIndex: 2
      },
      {
        label: 'General Trend',
        backgroundColor: 'rgba(70, 99, 172, 0.1)',
        borderColor: 'rgba(70, 99, 172, 0.3)',
        borderDash: [5, 5],
        data: regressionLine,
        tension: 0,
        pointRadius: 0,
        fill: false,
        zIndex: 1
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { 
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        padding: 20,
        font: {
          size: 11
        }
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          let label = context.dataset.label || ''
          if (label) label += ': '
          if (context.parsed.y !== null) {
            label += context.parsed.y + '%'
          }
          return label
        }
      }
    }
  },
  scales: {
    y: {
      min: 0,
      max: 100,
      ticks: {
        callback: (value) => `${value}%`,
        stepSize: 20
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      grid: { display: false }
    }
  }
}
</script>

<style scoped>
.grade-trend-chart {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
