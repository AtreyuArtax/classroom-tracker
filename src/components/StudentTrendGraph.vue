<template>
  <div class="trend">
    <h3 class="trend__title">Behavior Trend</h3>
    
    <div v-if="weeklyTrend.length < 2" class="trend__empty">
      Not enough data to show a trend. Log more events over multiple weeks.
    </div>
    
    <div v-else class="trend__chart-wrap" style="height: 220px">
      <Bar 
        v-if="period === 'week'"
        :data="chartData" 
        :options="chartOptions" 
      />
      <Line 
        v-else
        :data="chartData" 
        :options="chartOptions" 
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

const props = defineProps({
  weeklyTrend: { type: Array, required: true },
  categories:  { type: Array, required: true },
  period:      { type: String, required: true },
})

const CATEGORY_COLOURS = {
  positive:      '#34c759',
  redirect:      '#ff9500',
  attendance:    '#ff3b30',
  note:          '#4663ac',
  communication: '#5856d6',
  neutral:       '#636e7b',
}

function formatWeekLabel(isoDateString) {
  const [year, month, day] = isoDateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

const chartData = computed(() => {
  return {
    labels: props.weeklyTrend.map(w => formatWeekLabel(w.week)),
    datasets: props.categories.map(cat => ({
      label: cat,
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

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
    x: { grid: { display: false } }
  }
}
</script>

<style scoped>
.trend {
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 16px;
  margin-bottom: 20px;
}

.trend__title {
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 16px 0;
  font-weight: 700;
}

.trend__empty {
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: center;
  padding: 40px 0;
  font-style: italic;
}

.trend__chart-wrap {
  width: 100%;
}
</style>
