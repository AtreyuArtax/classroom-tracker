<template>
  <div class="attendance-report" :class="{ 'attendance-report--batch': isBatch }">
    <!-- Header -->
    <header class="report-header">
      <div class="report-header__left">
        <h1 class="report-student-name">{{ student?.firstName }} {{ student?.lastName }}</h1>
        <p class="report-meta">{{ activeClass?.name }} • {{ teacherName || 'Teacher' }}</p>
      </div>
      <div class="report-header__right">
        <div class="report-type-badge">Attendance &amp; Activity Report</div>
        <div class="report-date">{{ new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) }}</div>
      </div>
    </header>

    <!-- Sleek High-Density Metrics Ribbon (Mirrors Student Dossier summary style) -->
    <div class="report-metrics-ribbon">
      <div class="report-chip report-chip--absent">
        <div class="report-chip__icon-wrap">
          <UserMinus :size="13" />
        </div>
        <div class="report-chip__content">
          <span class="report-chip__primary"><strong>{{ stats.absences }}</strong> Absences</span>
          <span class="report-chip__secondary">{{ stats.absencesPerWeek }}/wk avg</span>
        </div>
      </div>

      <div class="report-chip report-chip--late">
        <div class="report-chip__icon-wrap">
          <Clock :size="13" />
        </div>
        <div class="report-chip__content">
          <span class="report-chip__primary"><strong>{{ stats.lates }}</strong> Late<span v-if="stats.lateMinutes > 0" class="report-chip__hl"> · {{ stats.lateMinutes }}m lost</span></span>
          <span class="report-chip__secondary">Avg {{ stats.avgLateMinutes }}m · {{ stats.latesPerWeek }}/wk</span>
        </div>
      </div>

      <div class="report-chip report-chip--out">
        <div class="report-chip__icon-wrap">
          <DoorOpen :size="13" />
        </div>
        <div class="report-chip__content">
          <span class="report-chip__primary"><strong>{{ stats.washroomCount }}</strong> Out of Class<span v-if="stats.washroomMinutes > 0" class="report-chip__hl"> · {{ stats.washroomMinutes }}m</span></span>
          <span class="report-chip__secondary">Avg {{ stats.avgWashroomMinutes }}m · {{ stats.washroomPerWeek }}/wk</span>
        </div>
      </div>

      <div class="report-chip report-chip--rate">
        <div class="report-chip__icon-wrap">
          <CheckCircle2 :size="13" />
        </div>
        <div class="report-chip__content">
          <span class="report-chip__primary"><strong>{{ stats.attendanceRate }}%</strong> Present</span>
          <span class="report-chip__secondary">{{ stats.instructionalDays }} School Days</span>
        </div>
      </div>
    </div>

    <!-- Monthly Grids (2 Columns x 3 Rows = 6 Slots, filling the full page perfectly) -->
    <section class="report-section report-section--grids">
      <div class="monthly-grids-container">
        <!-- 5 Months of Calendar Grids -->
        <div v-for="month in calendar" :key="month.key" class="month-box">
          <h4 class="month-title">{{ month.name }} {{ month.year }}</h4>
          <div class="month-grid">
            <!-- Day Headers -->
            <div v-for="d in ['M','T','W','T','F']" :key="d" class="grid-header">{{ d }}</div>
            
            <!-- Dates -->
            <div 
              v-for="(day, idx) in month.days" 
              :key="idx" 
              class="grid-day"
              :class="{ 
                'grid-day--empty': !day.date,
                'grid-day--weekend': day.isWeekend,
                'grid-day--holiday': day.isHoliday,
                'grid-day--outside': day.isOutsideRange
              }"
            >
              <template v-if="day.date">
                <div class="grid-day__top">
                  <div class="day-events">
                    <template v-if="!day.isHoliday">
                      <div v-if="day.events.absent" class="event-tag event-tag--absent">A</div>
                      <div v-if="day.events.late" class="event-tag event-tag--late">
                        L <small>{{ day.events.lateMinutes }}m</small>
                      </div>
                      <div v-if="day.events.washroom" class="event-tag event-tag--washroom">
                        O <small>{{ day.events.washroomMinutes }}m</small>
                      </div>
                    </template>
                  </div>
                  <span class="day-num">{{ day.dayNum }}</span>
                </div>
                <div v-if="day.isHoliday" class="day-holiday-label" :title="day.holidayLabel">
                  {{ day.holidayLabel }}
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Slot 6: Semester Insights & Report Legend -->
        <div class="month-box summary-panel-box">
          <h4 class="month-title summary-panel-title">Semester Insights &amp; Guide</h4>
          <div class="summary-panel-content">
            <div class="summary-panel-stat-row">
              <div class="stat-mini">
                <span class="stat-mini__label">Attendance Rate</span>
                <span class="stat-mini__val" :class="stats.attendanceRate < 85 ? 'text-danger' : 'text-success'">{{ stats.attendanceRate }}%</span>
              </div>
              <div class="stat-mini">
                <span class="stat-mini__label">Total Time Lost</span>
                <span class="stat-mini__val">{{ Number(stats.lateMinutes || 0) + Number(stats.washroomMinutes || 0) }}m</span>
              </div>
              <div class="stat-mini">
                <span class="stat-mini__label">School Days</span>
                <span class="stat-mini__val">{{ stats.instructionalDays }}</span>
              </div>
            </div>

            <div class="legend-divider"></div>

            <div class="summary-panel-legend">
              <div class="legend-entry">
                <span class="event-tag event-tag--absent">A</span>
                <span class="legend-text"><strong>Absent:</strong> Full day absence</span>
              </div>
              <div class="legend-entry">
                <span class="event-tag event-tag--late">L 15m</span>
                <span class="legend-text"><strong>Late:</strong> Arrived late with duration</span>
              </div>
              <div class="legend-entry">
                <span class="event-tag event-tag--washroom">O 10m</span>
                <span class="legend-text"><strong>Out of Class:</strong> Hall departure</span>
              </div>
              <div class="legend-entry">
                <span class="legend-sample-holiday">NON-INST</span>
                <span class="legend-text"><strong>Holiday / PA Day:</strong> No classes</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { UserMinus, Clock, DoorOpen, CheckCircle2 } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { getEventsByStudent, toMinutes } from '../../db/eventService.js'
import { formatLocalDate } from '../../utils/dates.js'

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true },
  isBatch:   { type: Boolean, default: false }
})

const { 
  students, 
  activeClass, 
  teacherName, 
  getTermRange, 
  nonSchoolDays 
} = useClassroom()

const events = ref([])
const loading = ref(true)

const student = computed(() => students.value[props.studentId] || {})

// Determined semester range
const termRange = computed(() => {
  const cls = activeClass.value
  if (!cls || !cls.year || !cls.semester) return null
  return getTermRange(cls.year, cls.semester)
})

onMounted(async () => {
  if (!props.studentId) return
  loading.value = true
  try {
    // Fetch all events for the student, we'll filter by date locally
    events.value = await getEventsByStudent(props.studentId)
  } finally {
    loading.value = false
  }
})

const calendar = computed(() => {
  if (!termRange.value) return []
  
  const months = []
  const start = termRange.value.start
  const end = termRange.value.end
  
  // Pre-calculate holiday map for ranges
  const holidayCache = {}
  nonSchoolDays.value.forEach(h => {
    if (!h.date) return
    const s = h.date
    const e = h.endDate || h.date
    if (s === e) {
      holidayCache[s] = h.label
    } else {
      let curH = new Date(s + 'T12:00:00')
      let endH = new Date(e + 'T12:00:00')
      while (curH <= endH) {
        holidayCache[formatLocalDate(curH)] = h.label
        curH.setDate(curH.getDate() + 1)
      }
    }
  })
  
  let curr = new Date(start.getFullYear(), start.getMonth(), 1)
  
  // Collect 5-6 months until we pass the end date
  while (curr <= end) {
    const monthName = curr.toLocaleString('default', { month: 'long' })
    const monthYear = curr.getFullYear()
    const monthKey = `${monthYear}-${curr.getMonth()}`
    
    // Generate days for this month
    const days = []
    const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay()
    
    // M-F Grid Padding:
    // Mon=1 -> 0 padding, Tue=2 -> 1, ..., Fri=5 -> 4
    // Sat/Sun -> 0 padding (first day will be the 2nd or 3rd)
    let padding = 0
    if (firstDay >= 2 && firstDay <= 5) padding = firstDay - 1
    
    for (let i = 0; i < padding; i++) days.push({ date: null })
    
    const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(curr.getFullYear(), curr.getMonth(), d)
      const dayOfWeek = date.getDay()
      
      // Skip weekends for high density M-F grid
      if (dayOfWeek === 0 || dayOfWeek === 6) continue 
      
      const dateStr = formatLocalDate(date)
      const dayEvents = events.value.filter(e => e.timestamp?.split('T')[0] === dateStr && !e.superseded)
      
      const isOutsideRange = date < start || date > end
      
      days.push({
        date,
        dateStr,
        dayNum: d,
        isHoliday: !!holidayCache[dateStr],
        holidayLabel: holidayCache[dateStr],
        isOutsideRange,
        events: {
          absent: dayEvents.some(e => e.code === 'a'),
          late: dayEvents.some(e => e.code === 'l'),
          lateMinutes: Math.round(dayEvents.filter(e => e.code === 'l').reduce((acc, e) => acc + toMinutes(e.duration), 0)),
          washroom: dayEvents.some(e => e.code === 'w'),
          washroomMinutes: Math.round(dayEvents.filter(e => e.code === 'w').reduce((acc, e) => acc + toMinutes(e.duration), 0))
        }
      })
    }
    
    months.push({ name: monthName, year: monthYear, key: monthKey, days })
    curr.setMonth(curr.getMonth() + 1)
  }
  
  return months
})

const stats = computed(() => {
  const filteredEvents = events.value.filter(e => {
    if (e.superseded) return false
    const d = new Date(e.timestamp)
    return d >= termRange.value.start && d <= termRange.value.end
  })
  
  const absences = filteredEvents.filter(e => e.code === 'a').length
  const lates = filteredEvents.filter(e => e.code === 'l').length
  const lateMinutes = filteredEvents.filter(e => e.code === 'l').reduce((acc, e) => acc + toMinutes(e.duration), 0)
  const washroomCount = filteredEvents.filter(e => e.code === 'w').length
  const washroomMinutes = filteredEvents.filter(e => e.code === 'w').reduce((acc, e) => acc + toMinutes(e.duration), 0)
  
  // Calculate school weeks in range
  const totalDays = (termRange.value.end - termRange.value.start) / (1000 * 60 * 60 * 24)
  const schoolWeeks = Math.max(1, totalDays / 7)
  
  // Calculate total instructional days from calendar
  let instructionalDays = 0
  calendar.value.forEach(m => {
    m.days.forEach(d => {
      if (d.date && !d.isOutsideRange && !d.isHoliday) {
        instructionalDays++
      }
    })
  })
  instructionalDays = Math.max(1, instructionalDays)
  const attendanceRate = Math.max(0, Math.min(100, Math.round(((instructionalDays - absences) / instructionalDays) * 100)))

  const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1)
  const avgFmt = (total, count) => count > 0 ? Math.round(total / count) : 0

  return {
    absences,
    lates,
    lateMinutes,
    washroomCount,
    washroomMinutes,
    instructionalDays,
    attendanceRate,
    absencesPerWeek: fmt(absences / schoolWeeks),
    latesPerWeek: fmt(lates / schoolWeeks),
    washroomPerWeek: fmt(washroomCount / schoolWeeks),
    avgLateMinutes: avgFmt(lateMinutes, lates),
    avgWashroomMinutes: avgFmt(washroomMinutes, washroomCount)
  }
})

</script>

<style scoped>
.attendance-report {
  --print-primary: #1e3a8a;
  --print-border: #cbd5e1;
  --print-text: #1e293b;
  --print-text-muted: #64748b;
  --color-absent: #ef4444;
  --color-late: #f59e0b;
  --color-washroom: #3b82f6;
  --color-holiday: #f1f5f9;
  
  background: white;
  color: var(--print-text);
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  padding: 16px 20px;
  width: 100%;
  max-width: 210mm;
  box-sizing: border-box;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.attendance-report--batch { break-after: page; }

/* --- Header --- */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid var(--print-primary);
  padding-bottom: 4px;
}

.report-student-name {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.01em;
}

.report-meta {
  font-size: 0.82rem;
  color: var(--print-text-muted);
  margin: 1px 0 0;
  font-weight: 500;
}

.report-header__right { text-align: right; }
.report-date { font-size: 0.72rem; font-weight: 600; color: var(--print-text-muted); }
.report-type-badge {
  display: inline-block;
  background: var(--print-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.58rem;
  margin-bottom: 2px;
  text-transform: uppercase;
}

/* --- High-Density Metrics Ribbon --- */
.report-metrics-ribbon {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.report-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid var(--print-border);
  background: #f8fafc;
}

.report-chip__icon-wrap {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-chip--absent .report-chip__icon-wrap { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
.report-chip--late .report-chip__icon-wrap { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.report-chip--out .report-chip__icon-wrap { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.report-chip--rate .report-chip__icon-wrap { background: rgba(16, 185, 129, 0.12); color: #10b981; }

.report-chip__content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.report-chip__primary {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--print-text);
  white-space: nowrap;
}

.report-chip__hl {
  color: #0284c7;
  font-weight: 700;
}

.report-chip__secondary {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--print-text-muted);
  white-space: nowrap;
}

/* --- Grids (2 columns x 3 rows = 6 slots) --- */
.monthly-grids-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.month-box {
  border: 1px solid var(--print-border);
  border-radius: 5px;
  padding: 6px 8px;
  background: white;
  display: flex;
  flex-direction: column;
}

.month-title {
  font-size: 0.75rem;
  font-weight: 800;
  margin: 0 0 4px;
  text-align: center;
  color: var(--print-primary);
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
}

.grid-header {
  text-align: center;
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--print-text-muted);
  padding-bottom: 2px;
}

.grid-day {
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  padding: 2px 3px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 38px;
  overflow: hidden;
  position: relative;
  background: white;
}

.grid-day--empty {
  border: none;
  background: transparent;
}
.grid-day--outside {
  opacity: 0.3;
  background: #f8fafc;
}
.grid-day--holiday {
  background: var(--color-holiday, #f1f5f9);
  border-style: dashed;
  border-color: #cbd5e1;
}

.grid-day__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2px;
  width: 100%;
}

.day-num {
  font-size: 0.58rem;
  font-weight: 700;
  color: var(--print-text-muted);
  line-height: 1;
  margin-left: auto;
}

.day-events {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  align-items: center;
  min-width: 0;
}

.event-tag {
  font-size: 0.52rem;
  font-weight: 800;
  padding: 1px 3px;
  border-radius: 2px;
  color: white;
  line-height: 1.1;
  display: inline-flex;
  align-items: center;
  gap: 1px;
  white-space: nowrap;
}

.event-tag--absent { background: var(--color-absent); }
.event-tag--late { background: var(--color-late); }
.event-tag--washroom { background: var(--color-washroom); }

.event-tag small {
  font-size: 0.46rem;
  opacity: 0.95;
  font-weight: 600;
}

.day-holiday-label {
  font-size: 0.36rem;
  font-weight: 700;
  color: #475569;
  text-align: center;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  width: 100%;
  margin-top: auto;
}

/* --- Slot 6: Summary Panel & Legend --- */
.summary-panel-box {
  background: #f8fafc;
  border: 1px solid var(--print-border);
  border-left: 4px solid var(--print-primary);
}

.summary-panel-title {
  color: var(--print-primary);
  margin-bottom: 6px;
}

.summary-panel-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
}

.summary-panel-stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  background: white;
  border: 1px solid var(--print-border);
  border-radius: 4px;
  padding: 6px 4px;
  text-align: center;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-mini__label {
  font-size: 0.52rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--print-text-muted);
}

.stat-mini__val {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--print-text);
}

.legend-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 1px 0;
}

.summary-panel-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 8px;
  padding: 2px;
}

.legend-entry {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-text {
  font-size: 0.52rem;
  color: var(--print-text);
  line-height: 1.1;
}

.legend-sample-holiday {
  font-size: 0.44rem;
  font-weight: 800;
  padding: 1px 3px;
  border-radius: 2px;
  background: #cbd5e1;
  color: #334155;
  white-space: nowrap;
}

@media print {
  .attendance-report {
    padding: 0;
    margin: 0;
    width: 100%;
    max-width: 100%;
    min-height: auto;
    page-break-after: avoid;
    break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
</style>
