<template>
  <div class="trend">
    <div class="trend__header">
      <div class="trend__title-group">
        <h3 class="trend__title">{{ title }}</h3>
        <span class="trend__subtitle">{{ isDaily ? 'Daily breakdown (Mon–Fri)' : 'Weekly frequency' }}</span>
      </div>
      <div class="trend__legend">
        <div v-for="cat in categories" :key="cat" class="legend-item">
          <span class="dot" :style="{ backgroundColor: CATEGORY_COLOURS[cat] || '#8e8e93' }"></span>
          <span>{{ formatCategoryLabel(cat) }}</span>
        </div>
      </div>
    </div>
    
    <!-- Clean attendance / zero events state -->
    <div v-if="dataPoints.length === 0" class="trend__empty">
      No data available for this period.
    </div>

    <div v-else-if="totalEvents === 0" class="trend__empty trend__empty--clean">
      <CheckCircle2 :size="16" class="clean-icon" />
      <span>{{ isDaily ? 'No absences, lates, or departures logged this week.' : 'No absences, lates, or departures logged for this period.' }}</span>
    </div>
    
    <!-- Active Chart Container -->
    <div v-else class="trend__chart-wrap" ref="chartContainer" style="height: 155px">
      <Bar 
        v-if="isDaily"
        ref="barChart"
        :data="barChartData" 
        :options="barChartOptions" 
      />
      <Line 
        v-else
        ref="lineChart"
        :data="lineChartData" 
        :options="lineChartOptions" 
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
import { CheckCircle2 } from 'lucide-vue-next'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

const props = defineProps({
  title:       { type: String, default: 'Attendance & Habits Trend' },
  weeklyTrend: { type: Array, default: () => [] },
  trendData:   { type: Array, default: null },
  categories:  { type: Array, default: () => ['washroom', 'absence', 'late'] },
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

const isDaily = computed(() => props.period === 'week' || props.period === 'last_week')
const dataPoints = computed(() => props.trendData || props.weeklyTrend || [])

const totalEvents = computed(() => {
  return dataPoints.value.reduce((sum, item) => {
    return sum + props.categories.reduce((catSum, cat) => catSum + (item[cat] || 0), 0)
  }, 0)
})

// Daily Stacked Bar Chart config
const barChartData = computed(() => ({
  labels: dataPoints.value.map(d => d.label || formatWeekLabel(d.week || d.key)),
  datasets: props.categories.map(cat => ({
    label: formatCategoryLabel(cat),
    data: dataPoints.value.map(d => d[cat] || 0),
    backgroundColor: CATEGORY_COLOURS[cat] || '#aaaaaa',
    borderRadius: 4,
    borderSkipped: false,
    maxBarThickness: 34,
  }))
}))

const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        title: (items) => {
          if (!items.length) return ''
          const d = dataPoints.value[items[0].dataIndex]
          return d?.fullDate || d?.label || ''
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      ticks: {
        color: '#64748b',
        font: { size: 11, weight: '500' }
      },
      grid: { display: false }
    },
    y: {
      stacked: true,
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
    }
  }
}))

// Multi-Week Line Chart config
const lineChartData = computed(() => ({
  labels: dataPoints.value.map(d => d.label || formatWeekLabel(d.week || d.key)),
  datasets: props.categories.map(cat => ({
    label: formatCategoryLabel(cat),
    data: dataPoints.value.map(d => d[cat] || 0),
    borderColor: CATEGORY_COLOURS[cat] || '#aaaaaa',
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 3.5,
    pointHoverRadius: 6,
    pointBackgroundColor: CATEGORY_COLOURS[cat] || '#aaaaaa',
    tension: 0.25
  }))
}))

const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        title: (items) => {
          if (!items.length) return ''
          const d = dataPoints.value[items[0].dataIndex]
          return d?.fullDate || (d?.rangeLabel ? `Week of ${d.rangeLabel}` : d?.label || '')
        }
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#64748b',
        font: { size: 11 }
      },
      grid: { display: false }
    },
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

.trend__title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.trend__title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
}

.trend__subtitle {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
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
  padding: 36px 12px;
  font-style: italic;
}

.trend__empty--clean {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-style: normal;
  color: var(--text-secondary, #64748b);
  background: var(--surface-secondary, rgba(0, 0, 0, 0.02));
  border-radius: 8px;
  border: 1px dashed var(--border-color, rgba(0, 0, 0, 0.08));
}

.clean-icon {
  color: #10b981;
  flex-shrink: 0;
}

.trend__chart-wrap {
  width: 100%;
  position: relative;
}
</style>
