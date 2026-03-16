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
  }
})

const chartData = computed(() => {
  // Sort by date to be sure
  const sorted = [...props.assessments].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  // Calculate running cumulative weighted grade
  // Since we don't have the full gradebook logic mirrored here,
  // we'll use a simplified version for the graph: running average of percents.
  let cumulativeSum = 0
  let count = 0
  const runningGrades = sorted.map(a => {
    const percent = (a.resolvedScore / a.totalPoints) * 100
    cumulativeSum += percent
    count++
    return Math.round(cumulativeSum / count)
  })

  return {
    labels: sorted.map(a => new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Running Grade',
        backgroundColor: '#4663ac',
        borderColor: '#4663ac',
        data: runningGrades,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `Grade: ${context.parsed.y}%`
      }
    }
  },
  scales: {
    y: {
      min: 0,
      max: 100,
      ticks: {
        callback: (value) => `${value}%`
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
