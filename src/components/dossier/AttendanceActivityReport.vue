<template>
  <div class="attendance-report" :class="{ 'attendance-report--batch': isBatch }">
    <!-- Header -->
    <header class="report-header">
      <div class="report-header__left">
        <h1 class="report-student-name">{{ student?.firstName }} {{ student?.lastName }}</h1>
        <p class="report-meta">{{ activeClass?.name }} • {{ teacherName || 'Teacher' }}</p>
      </div>
      <div class="report-header__right">
        <div class="report-date">{{ new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) }}</div>
        <div class="report-type-badge">Attendance & Activity Report</div>
      </div>
    </header>

    <!-- Summary Box -->
    <section class="report-section report-section--summary">
      <div class="summary-grid">
        <!-- Attendance Stats -->
        <div class="summary-card summary-card--attendance">
          <h3 class="summary-card-title"><UserX :size="16" /> Attendance</h3>
          <div class="metrics-row">
            <div class="metric">
              <span class="metric-val">{{ stats.absences }}</span>
              <span class="metric-lab">Absences</span>
              <span class="metric-sub">{{ stats.absencesPerWeek }} / week</span>
            </div>
            <div class="metric">
              <span class="metric-val">{{ stats.lates }}</span>
              <span class="metric-lab">Lates</span>
              <span class="metric-sub">{{ stats.latesPerWeek }} / week</span>
            </div>
            <div class="metric">
              <span class="metric-val">{{ stats.lateMinutes }}<small>m</small></span>
              <span class="metric-lab">Late Total</span>
              <span class="metric-sub">Avg {{ stats.avgLateMinutes }}m</span>
            </div>
          </div>
        </div>

        <!-- Activity Stats -->
        <div class="summary-card summary-card--activity">
          <h3 class="summary-card-title"><Toilet :size="16" /> Out-of-Class</h3>
          <div class="metrics-row">
            <div class="metric">
              <span class="metric-val">{{ stats.washroomCount }}</span>
              <span class="metric-lab">Total Trips</span>
              <span class="metric-sub">{{ stats.washroomPerWeek }} / week</span>
            </div>
            <div class="metric">
              <span class="metric-val">{{ stats.washroomMinutes }}<small>m</small></span>
              <span class="metric-lab">Total Time</span>
              <span class="metric-sub">Avg {{ stats.avgWashroomMinutes }}m</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Monthly Grids -->
    <section class="report-section report-section--grids">
      <div class="monthly-grids-container">
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
                <span class="day-num">{{ day.dayNum }}</span>
                <div class="day-events">
                  <div v-if="day.isHoliday" class="day-holiday-label">{{ day.holidayLabel }}</div>
                  <template v-else>
                    <div v-if="day.events.absent" class="event-tag event-tag--absent">A</div>
                    <div v-if="day.events.late" class="event-tag event-tag--late">
                      L <small>{{ day.events.lateMinutes }}m</small>
                    </div>
                    <div v-if="day.events.washroom" class="event-tag event-tag--washroom">
                      W <small>{{ day.events.washroomMinutes }}m</small>
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { UserX, Clock, Toilet } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { getEventsByStudent, toMinutes } from '../../db/eventService.js'

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true },
  isBatch:   { type: Boolean, default: false }
})

const { 
  students, 
  activeClass, 
  teacherName, 
  academicTerms, 
  nonSchoolDays 
} = useClassroom()

const events = ref([])
const loading = ref(true)

const student = computed(() => students.value[props.studentId] || {})

// Determined semester range
const termRange = computed(() => {
  const cls = activeClass.value
  if (!cls) return null
  
  const term = academicTerms.value.find(t => t.year === cls.year && t.semester === cls.semester)
  if (term) {
    return { start: new Date(term.startDate + 'T00:00:00'), end: new Date(term.endDate + 'T23:59:59') }
  }
  
  // Fallback to 5 months from start of September or February
  const now = new Date()
  const startMonth = cls.semester === '2' ? 1 : 8 // Feb or Sept
  const startDate = new Date(now.getFullYear(), startMonth, 1)
  const endDate = new Date(now.getFullYear(), startMonth + 5, 0)
  return { start: startDate, end: endDate }
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
  
  let curr = new Date(start.getFullYear(), start.getMonth(), 1)
  const holidayMap = Object.fromEntries(nonSchoolDays.value.map(d => [d.date, d.label]))
  
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
      
      const dateStr = date.toISOString().split('T')[0]
      const dayEvents = events.value.filter(e => e.timestamp?.split('T')[0] === dateStr && !e.superseded)
      
      const isOutsideRange = date < start || date > end
      
      days.push({
        date,
        dateStr,
        dayNum: d,
        isHoliday: !!holidayMap[dateStr],
        holidayLabel: holidayMap[dateStr],
        isOutsideRange,
        events: {
          absent: dayEvents.some(e => e.code === 'a'),
          late: dayEvents.some(e => e.code === 'l'),
          lateMinutes: dayEvents.filter(e => e.code === 'l').reduce((acc, e) => acc + toMinutes(e.duration), 0),
          washroom: dayEvents.some(e => e.code === 'w'),
          washroomMinutes: dayEvents.filter(e => e.code === 'w').reduce((acc, e) => acc + toMinutes(e.duration), 0)
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
  
  const fmt = (v) => Math.round(v * 10) / 10
  const avgFmt = (total, count) => count > 0 ? Math.round(total / count) : 0

  return {
    absences,
    lates,
    lateMinutes,
    washroomCount,
    washroomMinutes,
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
  padding: 30px; /* Reduced */
  min-height: 297mm;
  width: 210mm;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px; /* Reduced */
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
  padding-bottom: 8px; /* Reduced */
}

.report-student-name {
  font-size: 1.4rem; /* Reduced */
  font-weight: 800;
  margin: 0;
}

.report-meta {
  font-size: 0.9rem; /* Reduced */
  color: var(--print-text-muted);
  margin: 2px 0 0;
}

.report-header__right { text-align: right; }
.report-date { font-size: 0.8rem; font-weight: 600; color: var(--print-text-muted); }
.report-type-badge {
  display: inline-block;
  background: var(--print-primary);
  color: white;
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.6rem;
  margin-top: 2px;
}

/* --- Summary --- */
.summary-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

.summary-card {
  padding: 10px 14px; /* Reduced */
  border: 1.5px solid var(--print-border);
  border-radius: 10px;
  background: #f8fafc;
}

.summary-card--attendance { border-left: 5px solid var(--color-late); }
.summary-card--activity { border-left: 5px solid var(--color-washroom); }

.summary-card-title {
  font-size: 0.75rem; /* Reduced */
  font-weight: 800;
  text-transform: uppercase;
  color: var(--print-text-muted);
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.metrics-row {
  display: flex;
  justify-content: space-between;
  gap: 8px; /* Reduced */
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-val { font-size: 1.1rem; font-weight: 800; line-height: 1; }
.metric-val small { font-size: 0.65rem; color: var(--print-text-muted); margin-left: 1px; }
.metric-lab { font-size: 0.6rem; font-weight: 700; color: var(--print-text-muted); text-transform: uppercase; margin-top: 2px; }
.metric-sub { font-size: 0.55rem; color: var(--print-text-muted); font-style: italic; }

/* --- Grids --- */
.monthly-grids-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* Changed to 3 columns to save vertical space */
  gap: 12px;
}

.month-box {
  border: 1px solid var(--print-border);
  border-radius: 6px;
  padding: 8px;
}

.month-title {
  font-size: 0.75rem;
  font-weight: 800;
  margin: 0 0 6px;
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
  aspect-ratio: 1 / 1.1;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  padding: 2px;
  position: relative;
  min-height: 38px;
}

.grid-day--empty { border: none; }
.grid-day--outside { opacity: 0.3; background: #f8fafc; }
.grid-day--holiday { background: var(--color-holiday); border-style: dashed; }

.day-num {
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 0.55rem;
  font-weight: 700;
  color: var(--print-text-muted);
}

.day-events {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1px;
  margin-top: 5px;
  max-width: 100%;
}

.event-tag {
  font-size: 0.5rem; /* Even smaller */
  font-weight: 800;
  padding: 0px 2px;
  border-radius: 2px;
  color: white;
  line-height: 1.1;
  display: flex;
  align-items: center;
  gap: 1px;
}

.event-tag--absent { background: var(--color-absent); }
.event-tag--late { background: var(--color-late); }
.event-tag--washroom { background: var(--color-washroom); }

.event-tag small { font-size: 0.45rem; opacity: 0.9; font-weight: 600; }

.day-holiday-label {
  font-size: 0.45rem;
  font-weight: 600;
  color: var(--print-text-muted);
  text-align: center;
  line-height: 1;
}

@media print {
  .attendance-report {
    padding: 0;
    margin: 0;
    width: 100%;
    min-height: auto;
    page-break-after: always;
  }
}
</style>
