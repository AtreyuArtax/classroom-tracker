<template>
  <div class="trend">
    <div class="trend__header">
      <h3 class="trend__title">{{ title }}</h3>
      <div class="trend__legend">
        <div v-for="cat in categories" :key="cat" class="legend-item">
          <span class="dot" :style="{ backgroundColor: CATEGORY_COLOURS[cat] || '#8e8e93' }"></span>
          <span>{{ formatCategoryLabel(cat) }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="weeklyTrend.length < 2" class="trend__empty">
      Not enough data to show a trend. Log more events over multiple weeks.
    </div>
    
    <div v-else class="trend__chart-wrap" ref="chartContainer" style="height: 155px">
      <Bar 
        v-if="period === 'week'"
        ref="barChart"
        :data="chartData" 
        :options="chartOptions" 
      />
      <Line 
        v-else
        ref="lineChart"
        :data="chartData" 
        :options="chartOptions" 
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

const props = defineProps({
  title:       { type: String, default: 'Attendance & Habits Trend' },
  weeklyTrend: { type: Array, required: true },
  categories:  { type: Array, required: true },
  period:      { type: String, required: true },
})

const chartContainer = ref(null)
const barChart = ref(null)
const lineChart = ref(null)

let resizeObserver = null

onMounted(() => {
  if (chartContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      const chart = barChart.value || lineChart.value
      if (chart && chart.chart) {
        chart.chart.resize()
      }
    })
    resizeObserver.observe(chartContainer.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

const CATEGORY_COLOURS = {
  positive:      '#34c759',
  redirect:      '#ff9500',
  absence:       '#ff3b30',
  late:          '#ffcc00',
  washroom:      '#32ade6',
  note:          '#4663ac',
  communication: '#5856d6',
  neutral:       '#8e8e93',
}

function formatCategoryLabel(cat) {
  if (cat === 'washroom') return 'Out of Class'
  if (cat === 'absence') return 'Absence'
  if (cat === 'late') return 'Late'
  if (cat === 'redirect') return 'Redirect'
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}

function formatWeekLabel(isoDateString) {
  if (!isoDateString) return ''
  const [year, month, day] = isoDateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const chartData = computed(() => {
  return {
    labels: props.weeklyTrend.map(w => formatWeekLabel(w.week)),
    datasets: props.categories.map(cat => ({
      label: formatCategoryLabel(cat),
      data: props.weeklyTrend.map(w => w[cat] || 0),
      borderColor: CATEGORY_COLOURS[cat] || '#aaaaaa',
      backgroundColor: props.period === 'week' 
        ? (CATEGORY_COLOURS[cat] || '#aaaaaa') 
        : 'transparent',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3
    }))
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        precision: 0,
        color: '#64748b',
        font: { size: 11 }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      ticks: {
        color: '#64748b',
        font: { size: 11 }
      },
      grid: { display: false }
    }
  }
}))
</script>

<style scoped>
.trend {
  width: 100%;
  min-width: 0;
}

.trend__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
  flex-wrap: wrap;
}

.trend__title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
}

.trend__legend {
  display: flex;
  gap: 10px;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.trend__empty {
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
  padding: 30px 0;
  font-style: italic;
}

.trend__chart-wrap {
  width: 100%;
  position: relative;
}
</style>
