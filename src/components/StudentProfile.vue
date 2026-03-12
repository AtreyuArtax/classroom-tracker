<template>
  <div class="sp">

    <!-- ── Header ──────────────────────────────────────────────────── -->
    <div class="sp__header">
      <h3 class="sp__name">{{ studentName || 'Student' }}</h3>
      <p class="sp__meta">{{ events.length }} event{{ events.length !== 1 ? 's' : '' }} in selected period</p>
    </div>

    <div v-if="events.length === 0" class="sp__empty">
      No events recorded for this student in the selected date range.
    </div>

    <template v-else>

      <!-- ── Summary cards ────────────────────────────────────────── -->
      <div class="sp__cards">
        <div class="sp__card sp__card--absent">
          <div class="sp__card-value">{{ absenceCount }}</div>
          <div class="sp__card-label"><UserX :size="16" /> Absences</div>
          <div class="sp__card-sub" v-if="testDayAbsenceCount > 0">
            {{ testDayAbsenceCount }} on test days
          </div>
          <div class="sp__card-sub" v-if="selectedPeriod !== 'week'">{{ avgAbsencesPerWeek }}/wk avg</div>
        </div>
        <div class="sp__card sp__card--late">
          <div class="sp__card-value">{{ lateMinutes }}<span class="sp__card-unit">min</span></div>
          <div class="sp__card-label"><Clock :size="16" /> Late Total</div>
          <div class="sp__card-sub" v-if="selectedPeriod !== 'week'">{{ avgLatesPerWeek }}/wk avg</div>
        </div>
        <div class="sp__card sp__card--late">
          <div class="sp__card-value">{{ lateCount }}</div>
          <div class="sp__card-label"><Clock :size="16" /> Late Arrivals</div>
        </div>
        <div class="sp__card sp__card--washroom">
          <div class="sp__card-value">{{ washroomMinutes }}<span class="sp__card-unit">min</span></div>
          <div class="sp__card-label"><Toilet :size="16" /> Washroom Total</div>
        </div>
        <div class="sp__card sp__card--washroom">
          <div class="sp__card-value">{{ washroomTrips }}</div>
          <div class="sp__card-label"><Toilet :size="16" /> Washroom Trips</div>
        </div>
        <div class="sp__card sp__card--device">
          <div class="sp__card-value">{{ onDeviceCount }}</div>
          <div class="sp__card-label"><Smartphone :size="16" /> On Device</div>
        </div>
        <div v-if="topBehavior" class="sp__card sp__card--behavior">
          <div class="sp__card-value">{{ topBehavior.count }}</div>
          <div class="sp__card-label"><component :is="resolveIcon(topBehavior.icon)" :size="16" /> {{ topBehavior.label }}</div>
        </div>
      </div>

      <!-- ── Weekly trend ─────────────────────────────────────────── -->
      <div class="sp__section" v-if="weeklyTrend.length > 1">
        <h4 class="sp__section-title">Weekly Trend</h4>
        <div class="sp__chart">
          <div
            v-for="week in weeklyTrend"
            :key="week.weekKey"
            class="sp__bar-col"
          >
            <div class="sp__bar-wrap">
              <div
                class="sp__bar"
                :style="{ height: week.pct + '%' }"
                :title="`${week.label}: ${week.count} event${week.count !== 1 ? 's' : ''}`"
              ></div>
            </div>
            <div class="sp__bar-label">{{ week.label }}</div>
          </div>
        </div>
      </div>

      <!-- ── Behavior breakdown ───────────────────────────────────── -->
      <div class="sp__section">
        <h4 class="sp__section-title">Breakdown by Code</h4>
        <div class="sp__breakdown">
          <div v-for="row in breakdown" :key="row.code" class="sp__breakdown-row">
            <span class="sp__breakdown-label">
              <component :is="resolveIcon(row.icon)" :size="16" v-if="row.icon !== '?'" />
              <HelpCircle :size="16" v-else />
              {{ row.label }}
            </span>
            <div class="sp__breakdown-bar-wrap">
              <div class="sp__breakdown-bar" :style="{ width: row.pct + '%' }"></div>
            </div>
            <span class="sp__breakdown-count">{{ row.count }}</span>
          </div>
        </div>
      </div>

      <!-- ── Raw event log (collapsed) ───────────────────────────── -->
      <details class="sp__log">
        <summary class="sp__log-summary">Event Log ({{ events.length }})</summary>
        <div class="sp__table-wrap">
          <table class="sp__table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Code</th>
                <th>Detail</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="evt in sortedEvents" :key="evt.eventId">
                <td class="sp__td-time">{{ formatTime(evt.timestamp) }}</td>
                <td>
                  <component :is="resolveIcon(behaviorCodes[evt.code]?.icon)" :size="16" v-if="behaviorCodes[evt.code]" />
                  {{ evt.code }}
                </td>
                <td>
                  <div class="sp__td-detail">
                    <span>{{ eventDetail(evt) }}</span>
                    <span v-if="evt.testDay" class="sp__test-day-badge">Test Day</span>
                  </div>
                </td>
                <td class="sp__td-actions">
                  <div class="sp__action-group">
                    <button 
                      v-if="evt.duration != null || evt.code === 'w'"
                      class="sp__btn-delete sp__btn-edit" 
                      title="Edit duration" 
                      @click="onEditClick(evt)"
                    >
                      <Pencil :size="14" />
                    </button>
                    <button 
                      class="sp__btn-delete" 
                      title="Delete event" 
                      @click="emit('delete-event', evt.eventId)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <EditDurationModal
        v-model="editModalOpen"
        :initial-minutes="editInitialMinutes"
        @save="onEditSave"
      />

    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UserX, Clock, Toilet, Smartphone, HelpCircle, Trash2, Pencil } from 'lucide-vue-next'
import { resolveIcon } from '../utils/icons.js'
import EditDurationModal from './EditDurationModal.vue'

const props = defineProps({
  events:         { type: Array,  required: true },
  behaviorCodes:  { type: Object, default: () => ({}) },
  studentName:    { type: String, default: '' },
  selectedPeriod: { type: String, default: 'week' },
})

const emit = defineEmits(['delete-event', 'edit-event'])

// ── helpers ────────────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return ''
  const parseStr = ts.includes('Z') || ts.match(/[+-]\d{2}:\d{2}$/) ? ts : ts + 'Z'
  const d = new Date(parseStr)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function eventDetail(evt) {
  if (evt.code === 'l') {
    const parts = [`${evt.duration ?? 0}m late`]
    if (evt.supersededAbsent) parts.push('(was absent)')
    return parts.join(' ')
  }
  
  if (evt.duration != null) {
      const c = props.behaviorCodes[evt.code]
      if (c && c.type === 'toggle') {
          if (evt.duration >= 60000) {
              const m = Math.floor(evt.duration / 60000)
              const s = Math.round((evt.duration % 60000) / 1000)
              return `${m}m ${String(s).padStart(2, '0')}s`
          }
          const s = Math.round(evt.duration / 1000)
          return `${s}s`
      }
      return `${evt.duration}m`
  }
  
  return ''
}

/** ISO week key: YYYY-Www */
function isoWeekKey(ts) {
  const d = new Date(ts)
  // Shift to Thursday of the week to get the ISO year/week correctly
  const thursday = new Date(d)
  thursday.setDate(d.getDate() + (4 - (d.getDay() || 7)))
  const year = thursday.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const week = Math.ceil(((thursday - jan1) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Short "Mar 3" label from an ISO week key */
function weekLabel(weekKey) {
  const [year, wStr] = weekKey.split('-W')
  const week = parseInt(wStr)
  // Monday of that ISO week
  const jan4 = new Date(parseInt(year), 0, 4) // Jan 4 is always in week 1
  const dayOfWeek = (jan4.getDay() || 7) - 1  // 0 = Mon
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7)
  return monday.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

// ── computed stats ──────────────────────────────────────────────────────────────

const absenceCount = computed(() =>
  props.events.filter(e => e.code === 'a').length
)

const testDayAbsenceCount = computed(() =>
  props.events.filter(e => e.code === 'a' && e.testDay).length
)

const lateCount = computed(() =>
  props.events.filter(e => e.code === 'l').length
)

const lateMinutes = computed(() =>
  props.events
    .filter(e => e.code === 'l')
    .reduce((sum, e) => sum + (e.duration ?? 0), 0)
)

const washroomMinutes = computed(() => {
  const ms = props.events
    .filter(e => props.behaviorCodes[e.code]?.type === 'toggle')
    .reduce((sum, e) => sum + (e.duration ?? 0), 0)
  return Math.round(ms / 60000)
})

const washroomTrips = computed(() =>
  props.events.filter(e =>
    props.behaviorCodes[e.code]?.type === 'toggle'
  ).length
)

const onDeviceCount = computed(() =>
  props.events.filter(e => e.category === 'redirect').length
)

// --- Averages per week ---
const weeksInPeriod = computed(() => {
  if (props.selectedPeriod === 'week') return 1
  if (props.selectedPeriod === 'month') return 4.34
  if (props.selectedPeriod === 'semester') return 21.7 // approx 5 months
  
  // For 'all', we calculate actual weeks in the range if possible, 
  // but usually we can just fallback to total / 1 or similar if unknown.
  // Given the UI shows these cards for filtered results, let's look at the range.
  if (!props.events.length) return 1
  const sorted = [...props.events].sort((a,b) => a.timestamp.localeCompare(b.timestamp))
  const first = new Date(sorted[0].timestamp)
  const last = new Date(sorted[sorted.length-1].timestamp)
  const diffWeeks = Math.max(1, (last - first) / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks
})

const avgAbsencesPerWeek = computed(() => 
  (absenceCount.value / weeksInPeriod.value).toFixed(1)
)

const avgLatesPerWeek = computed(() => 
  (lateCount.value / weeksInPeriod.value).toFixed(1)
)

const topBehavior = computed(() => {
  // Exclude attendance + toggle codes — focus on behaviour flags
  const counts = {}
  for (const evt of props.events) {
    const c = props.behaviorCodes[evt.code]
    if (!c || c.type === 'toggle' || c.type === 'attendance' || c.category === 'redirect') continue
    counts[evt.code] = (counts[evt.code] ?? 0) + 1
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  const [code, count] = entries[0]
  return { code, count, icon: props.behaviorCodes[code]?.icon ?? '', label: props.behaviorCodes[code]?.label ?? code }
})

const breakdown = computed(() => {
  const counts = {}
  for (const evt of props.events) {
    counts[evt.code] = (counts[evt.code] ?? 0) + 1
  }
  const total = props.events.length || 1
  return Object.entries(counts)
    .map(([code, count]) => ({
      code,
      count,
      pct: Math.round(count / total * 100),
      icon:  props.behaviorCodes[code]?.icon  ?? '?',
      label: props.behaviorCodes[code]?.label ?? code,
    }))
    .sort((a, b) => b.count - a.count)
})

const weeklyTrend = computed(() => {
  const buckets = {}
  for (const evt of props.events) {
    if (!evt.timestamp) continue
    const key = isoWeekKey(evt.timestamp)
    buckets[key] = (buckets[key] ?? 0) + 1
  }
  const keys = Object.keys(buckets).sort()
  const maxCount = Math.max(...Object.values(buckets), 1)
  return keys.map(k => ({
    weekKey: k,
    label:   weekLabel(k),
    count:   buckets[k],
    pct:     Math.round(buckets[k] / maxCount * 100),
  }))
})

const sortedEvents = computed(() =>
  [...props.events].sort((a, b) =>
    (b.timestamp ?? '').localeCompare(a.timestamp ?? '')
  )
)

// ── event editing ─────────────────────────────────────────────────────────────

const editModalOpen      = ref(false)
const editInitialMinutes = ref(0)
const editTargetEvent    = ref(null)

function onEditClick(evt) {
  editTargetEvent.value = evt
  
  // Calculate initial visual minutes based on toggle vs non-toggle
  if (evt.code === 'l') {
    editInitialMinutes.value = evt.duration ?? 0
  } else {
    // Toggled events (like washroom) store duration in ms
    editInitialMinutes.value = Math.floor((evt.duration ?? 0) / 60000)
  }
  
  editModalOpen.value = true
}

function onEditSave(newMinutes) {
  const evt = editTargetEvent.value
  if (!evt) return
  
  let newDuration = newMinutes
  const c = props.behaviorCodes[evt.code]
  
  if (c && c.type === 'toggle') {
     newDuration = newMinutes * 60 * 1000
  }
  
  // Emit to parent with the duration safely calculated for the DB
  emit('edit-event', {
     eventId: evt.eventId,
     classId: evt.classId,
     studentId: evt.studentId,
     code: evt.code,
     timestamp: evt.timestamp,
     newDuration: newDuration,
     oldDuration: evt.duration
  })
}
</script>

<style scoped>
/* ── Shell ──────────────────────────────────────────────────────── */
.sp {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Header ─────────────────────────────────────────────────────── */
.sp__header { border-bottom: 1px solid var(--border); padding-bottom: 10px; }
.sp__name   { font-size: 1.15rem; font-weight: 700; color: var(--text); margin: 0 0 2px; }
.sp__meta   { font-size: 0.78rem; color: var(--text-secondary); margin: 0; }
.sp__empty  { color: var(--text-secondary); font-size: 0.9rem; text-align: center; padding: 24px 0; }

/* ── Stat cards ─────────────────────────────────────────────────── */
.sp__cards {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.sp__card {
  flex: 1 1 100px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  text-align: center;
  border: 1px solid var(--border);
}

.sp__card--absent   { border-left: 3px solid #ff3b30; }
.sp__card--late     { border-left: 3px solid #ff9500; }
.sp__card--washroom { border-left: 3px solid var(--primary); }
.sp__card--device   { border-left: 3px solid #5856d6; }
.sp__card--behavior { border-left: 3px solid #34c759; }

.sp__card-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.sp__card-unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}

.sp__card-label {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-top: 4px;
  font-weight: 500;
}

.sp__card-sub {
  font-size: 0.65rem;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 2px;
}

/* ── Section ────────────────────────────────────────────────────── */
.sp__section { display: flex; flex-direction: column; gap: 10px; }

.sp__section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  margin: 0;
}

/* ── Weekly trend bar chart ─────────────────────────────────────── */
.sp__chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 80px;
  padding-bottom: 22px; /* room for labels */
  position: relative;
}

.sp__bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
}

.sp__bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.sp__bar {
  width: 100%;
  background: var(--primary);
  border-radius: 3px 3px 0 0;
  min-height: 3px;
  transition: height 0.3s ease;
  opacity: 0.8;
}

.sp__bar-label {
  position: absolute;
  bottom: 0;
  font-size: 0.62rem;
  color: var(--text-secondary);
  white-space: nowrap;
  transform: translateX(-50%);
  left: 50%;
}

/* ── Breakdown ──────────────────────────────────────────────────── */
.sp__breakdown {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.sp__breakdown-row {
  display: grid;
  grid-template-columns: 130px 1fr 36px;
  align-items: center;
  gap: 8px;
}

.sp__breakdown-label {
  font-size: 0.8rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sp__breakdown-bar-wrap {
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.sp__breakdown-bar {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.sp__breakdown-count {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: right;
}

/* ── Collapsible event log ──────────────────────────────────────── */
.sp__log { border-top: 1px solid var(--border); padding-top: 10px; }

.sp__log-summary {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  list-style: none;
}

.sp__log-summary::-webkit-details-marker { display: none; }
.sp__log-summary::before { content: '▶  '; font-size: 0.6rem; }
details[open] .sp__log-summary::before { content: '▼  '; }

.sp__table-wrap { overflow-x: auto; margin-top: 10px; }

.sp__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.sp__table th, .sp__table td {
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.sp__table th {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  font-weight: 600;
}

.sp__td-time { color: var(--text-secondary); white-space: nowrap; }

.sp__td-detail {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sp__test-day-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  background: #fff3e0;
  color: #ff9500;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #ffe0b2;
}

.sp__td-actions {
  text-align: right;
  width: 65px;
}

.sp__action-group {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.sp__btn-delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.sp__btn-edit:hover {
  background: rgba(70, 99, 172, 0.1);
  color: var(--primary);
}

.sp__btn-delete:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}
</style>
