<template>
  <div class="duty-cal-view">
    
    <!-- ── Top Calendar Control Bar ───────────────────────────────── -->
    <header class="duty-cal-bar">
      <div class="duty-cal-bar__left">
        <!-- Month Navigation Controls -->
        <div class="duty-cal-nav">
          <button
            type="button"
            class="duty-cal-nav__btn"
            :disabled="selectedMonthIdx <= 0"
            @click="prevMonth"
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft :size="16" />
          </button>

          <h3 class="duty-cal-nav__title">
            {{ currentMonthMeta?.fullName || 'Calendar' }}
          </h3>

          <button
            type="button"
            class="duty-cal-nav__btn"
            :disabled="selectedMonthIdx >= schoolYearMonths.length - 1"
            @click="nextMonth"
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight :size="16" />
          </button>

          <button
            v-if="canJumpToToday"
            type="button"
            class="setup__btn-ghost duty-cal-nav__today-btn"
            @click="jumpToToday"
            title="Jump to current month"
          >
            Today
          </button>
        </div>
      </div>

      <!-- Right: Cadence Rhythm Badge & Month Summary -->
      <div class="duty-cal-bar__right">
        <div v-if="monthMetrics.hasDuties" class="duty-cal-chip duty-cal-chip--highlight">
          <CalendarCheck :size="13" />
          <span>{{ monthMetrics.dutyDaysCount }} duty {{ monthMetrics.dutyDaysCount === 1 ? 'day' : 'days' }} ({{ monthMetrics.totalMinutes }}m)</span>
        </div>
        <div v-else class="duty-cal-chip duty-cal-chip--off">
          <Sparkles :size="13" />
          <span>No duties scheduled for {{ currentMonthMeta?.label }}</span>
        </div>

        <div v-if="cadenceAnalysis.cadenceText" class="duty-cal-chip duty-cal-chip--cadence" :title="`Average spacing between duty cycles in ${activeSchoolYear}`">
          <Activity :size="13" />
          <span>{{ cadenceAnalysis.cadenceText }}</span>
        </div>
      </div>
    </header>

    <!-- ── 10-Month School Year Quick Selector Strip ──────────────── -->
    <div class="duty-cal-months-strip" role="tablist" aria-label="School year months">
      <button
        v-for="(m, idx) in schoolYearMonths"
        :key="m.key"
        type="button"
        role="tab"
        :aria-selected="idx === selectedMonthIdx"
        class="duty-cal-month-pill"
        :class="{
          'duty-cal-month-pill--active': idx === selectedMonthIdx,
          'duty-cal-month-pill--has-duties': m.dutyCount > 0,
          'duty-cal-month-pill--current': m.isCurrentRealMonth
        }"
        @click="selectedMonthIdx = idx"
      >
        <span class="duty-cal-month-pill__label">{{ m.label }}</span>
        <span
          v-if="m.dutyCount > 0"
          class="duty-cal-month-pill__badge"
          :title="`${m.dutyCount} duties (${m.totalMinutes}m) in ${m.fullName}`"
        >
          {{ m.dutyCount }}
        </span>
      </button>
    </div>

    <!-- ── Interactive Calendar Grid (Mon–Fri School Week) ────────── -->
    <div class="duty-cal-card">
      <div class="duty-cal-table-wrap">
        <table class="duty-cal-table">
          <thead>
            <tr>
              <th class="duty-cal-th duty-cal-th--week">Week / Rhythm</th>
              <th v-for="d in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']" :key="d" class="duty-cal-th">
                {{ d }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="week in weeksInMonth"
              :key="week.startDate"
              class="duty-cal-week-row"
              :class="{
                'duty-cal-week-row--active-duty': week.isDutyWeek,
                'duty-cal-week-row--off': !week.isDutyWeek
              }"
            >
              <!-- ── Week Summary & Rhythm Column ── -->
              <td class="duty-cal-td duty-cal-td--week-summary">
                <div class="duty-cal-week-card">
                  <div class="duty-cal-week-card__header">
                    <span class="duty-cal-week-card__dates">{{ week.weekRangeLabel }}</span>
                    <button
                      v-if="week.isDutyWeek"
                      type="button"
                      class="duty-cal-week-card__export-btn"
                      title="Download .ics for this duty week"
                      @click="handleExportWeek(week)"
                    >
                      <Download :size="12" />
                    </button>
                  </div>

                  <div v-if="week.isDutyWeek" class="duty-cal-week-card__badge duty-cal-week-card__badge--active">
                    <div class="duty-cal-week-card__badge-row">
                      <strong>{{ week.weekTotalMinutes }} min</strong>
                      <span class="duty-cal-week-card__badge-count">({{ week.weekDutyCount }}×)</span>
                    </div>
                    <span v-if="week.dutyNames.length > 0" class="duty-cal-week-card__names">
                      {{ week.dutyNames.join(', ') }}
                    </span>
                  </div>

                  <div
                    v-else
                    class="duty-cal-week-card__badge duty-cal-week-card__badge--off"
                    :class="{ 'duty-cal-week-card__badge--holiday': week.isEntireWeekHoliday }"
                  >
                    <span>{{ week.weekHolidayName ? truncateText(week.weekHolidayName, 14) : 'Off Week' }}</span>
                  </div>
                </div>
              </td>

              <!-- ── 5 School Days (Mon–Fri) ── -->
              <td
                v-for="day in week.days"
                :key="day.date"
                class="duty-cal-td duty-cal-td--day"
                :class="{
                  'duty-cal-td--outside': !day.isCurrentMonth,
                  'duty-cal-td--today': day.isToday,
                  'duty-cal-td--holiday': Boolean(day.holiday && day.isNonInstructional),
                  'duty-cal-td--has-duty': day.hasDuties
                }"
                @click="$emit('add-duty', day.date)"
              >
                <div class="duty-cal-day-cell">
                  
                  <!-- Cell Header: Day Number + Holiday/PA tag + Quick Add -->
                  <div class="duty-cal-day-header">
                    <div class="duty-cal-day-num-wrap">
                      <span
                        class="duty-cal-day-num"
                        :class="{ 'duty-cal-day-num--today': day.isToday }"
                      >
                        {{ day.dayNum }}
                      </span>
                      <span v-if="day.isToday" class="duty-cal-today-tag">Today</span>
                    </div>

                    <div class="duty-cal-day-header-right">
                      <!-- Non-School Day / PA Day Label -->
                      <span
                        v-if="day.holiday"
                        class="duty-cal-holiday-tag"
                        :class="{ 'duty-cal-holiday-tag--off': day.isNonInstructional }"
                        :title="day.holiday"
                      >
                        {{ truncateText(day.holiday, 16) }}
                      </span>

                      <!-- Hover Quick Add Button -->
                      <button
                        type="button"
                        class="duty-cal-add-btn"
                        title="Log duty on this date"
                        aria-label="Log duty on this date"
                        @click.stop="$emit('add-duty', day.date)"
                      >
                        <Plus :size="12" />
                      </button>
                    </div>
                  </div>

                  <!-- Cell Body: Stack of Duty Cards -->
                  <div class="duty-cal-duties-stack">
                    <div
                      v-for="duty in day.duties"
                      :key="duty.dutyId"
                      class="duty-card-pill"
                      :class="{
                        'duty-card-pill--emergency': duty.isEmergency && !duty.isSnowDay,
                        'duty-card-pill--snow': duty.isSnowDay
                      }"
                      @click.stop="$emit('edit-duty', duty)"
                      :title="`${duty.dutyName} (${duty.duration}m)${duty.isSnowDay ? ' - Snow Day / Cancelled' : ''}${duty.notes ? ' · ' + duty.notes : ''}\nClick to edit`"
                    >
                      <div class="duty-card-pill__main">
                        <span class="duty-card-pill__name">{{ duty.dutyName }}</span>
                        <span v-if="duty.isEmergency && !duty.isSnowDay" class="duty-card-pill__badge duty-card-pill__badge--emergency">
                          Emerg
                        </span>
                      </div>

                      <div class="duty-card-pill__meta">
                        <span v-if="duty.startTime" class="duty-card-pill__time">
                          {{ formatTime(duty.startTime) }}
                        </span>
                        
                        <span v-if="duty.isSnowDay" class="duty-card-pill__snow-status">
                          <CloudSnow :size="11" />
                          <span class="duty-card-pill__struck">{{ duty.duration }}m</span>
                          <span>0m</span>
                        </span>
                        <span v-else class="duty-card-pill__duration">
                          {{ duty.duration }}m
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Calendar Month Footer / Cadence Insights Banner ─────── -->
      <footer class="duty-cal-footer">
        <div class="duty-cal-metric-group">
          <div class="duty-cal-metric-item">
            <span class="duty-cal-metric-item__label">Month Total</span>
            <strong class="duty-cal-metric-item__val">{{ monthMetrics.totalMinutes }} min</strong>
            <span class="duty-cal-metric-item__sub">{{ monthMetrics.dutyDaysCount }} duties logged</span>
          </div>

          <div class="duty-cal-metric-sep"></div>

          <div class="duty-cal-metric-item">
            <span class="duty-cal-metric-item__label">Active Duty Weeks</span>
            <strong class="duty-cal-metric-item__val">
              {{ monthMetrics.activeWeeksCount }} of {{ weeksInMonth.length }} weeks
            </strong>
            <span class="duty-cal-metric-item__sub">
              {{ Math.round((monthMetrics.activeWeeksCount / (weeksInMonth.length || 1)) * 100) }}% month load
            </span>
          </div>

          <div class="duty-cal-metric-sep"></div>

          <div class="duty-cal-metric-item">
            <span class="duty-cal-metric-item__label">Annual Rotation Cadence</span>
            <strong class="duty-cal-metric-item__val">
              {{ cadenceAnalysis.avgGapWeeks > 0 ? `~${cadenceAnalysis.avgGapWeeks} weeks` : '1 cycle' }}
            </strong>
            <span class="duty-cal-metric-item__sub">
              {{ cadenceAnalysis.totalDutyWeeks }} duty {{ cadenceAnalysis.totalDutyWeeks === 1 ? 'cycle' : 'cycles' }} in {{ activeSchoolYear }}
            </span>
          </div>
        </div>

        <div class="duty-cal-footer__actions">
          <button
            type="button"
            class="setup__btn-ghost duty-cal-export-month-btn"
            :disabled="!monthMetrics.hasDuties"
            @click="handleExportCurrentMonth"
            title="Download Outlook Calendar (.ics) for all duties in this month"
          >
            <Download :size="14" />
            <span>Export {{ currentMonthMeta?.label }} (.ics)</span>
          </button>
        </div>
      </footer>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  Activity,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CloudSnow,
  Download,
  Plus,
  Sparkles
} from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { getBoardCalendar } from '../../utils/calendarLoader.js'
import { getCurrentSchoolYear, formatLocalDate, parseLocal } from '../../utils/dates.js'
import { downloadDutiesIcs, downloadWeekDutiesIcs, getWeekRangeForDate } from '../../utils/dutyCalendarExport.js'

const props = defineProps({
  duties: {
    type: Array,
    default: () => []
  },
  filteredDuties: {
    type: Array,
    default: () => []
  },
  activeSchoolYear: {
    type: String,
    default: ''
  },
  filterDutyType: {
    type: String,
    default: ''
  },
  searchQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['add-duty', 'edit-duty'])

const { nonSchoolDays } = useClassroom()

const todayIso = formatLocalDate(new Date())

// ── 1. School Year Months Generation (Sept -> June) ──────────────────
const schoolYearMonths = computed(() => {
  const targetYear = props.activeSchoolYear || getCurrentSchoolYear()
  const match = String(targetYear).match(/\b(20\d\d)\b/)
  const startYr = match ? parseInt(match[1], 10) : new Date().getFullYear()

  const list = [
    { year: startYr,     month: 8,  label: 'Sep', fullName: `September ${startYr}`,     key: `${startYr}-09` },
    { year: startYr,     month: 9,  label: 'Oct', fullName: `October ${startYr}`,       key: `${startYr}-10` },
    { year: startYr,     month: 10, label: 'Nov', fullName: `November ${startYr}`,      key: `${startYr}-11` },
    { year: startYr,     month: 11, label: 'Dec', fullName: `December ${startYr}`,      key: `${startYr}-12` },
    { year: startYr + 1, month: 0,  label: 'Jan', fullName: `January ${startYr + 1}`,   key: `${startYr + 1}-01` },
    { year: startYr + 1, month: 1,  label: 'Feb', fullName: `February ${startYr + 1}`,  key: `${startYr + 1}-02` },
    { year: startYr + 1, month: 2,  label: 'Mar', fullName: `March ${startYr + 1}`,     key: `${startYr + 1}-03` },
    { year: startYr + 1, month: 3,  label: 'Apr', fullName: `April ${startYr + 1}`,     key: `${startYr + 1}-04` },
    { year: startYr + 1, month: 4,  label: 'May', fullName: `May ${startYr + 1}`,       key: `${startYr + 1}-05` },
    { year: startYr + 1, month: 5,  label: 'Jun', fullName: `June ${startYr + 1}`,      key: `${startYr + 1}-06` }
  ]

  // Annotate each month with its duty metrics
  const dutyList = props.duties || []
  return list.map(item => {
    const monthDuties = dutyList.filter(d => (d.date || '').startsWith(item.key))
    const dutyCount = monthDuties.length
    const totalMinutes = monthDuties
      .filter(d => !d.isSnowDay)
      .reduce((sum, d) => sum + (Number(d.duration) || 0), 0)

    const isCurrentRealMonth = todayIso.startsWith(item.key)

    return {
      ...item,
      dutyCount,
      totalMinutes,
      isCurrentRealMonth
    }
  })
})

// Selected Month Index within the 10 school year months (0 = Sept ... 9 = June)
const selectedMonthIdx = ref(0)

// Helper to determine initial month
function getInitialMonthIndex() {
  const months = schoolYearMonths.value
  // 1. If today's date matches a month in this school year, pick today's month
  const todayIdx = months.findIndex(m => m.isCurrentRealMonth)
  if (todayIdx !== -1) return todayIdx

  // 2. Otherwise pick the month of the most recent duty
  const duties = props.duties || []
  if (duties.length > 0) {
    const dates = duties.map(d => d.date).filter(Boolean).sort()
    const latest = dates[dates.length - 1]
    const foundIdx = months.findIndex(m => latest.startsWith(m.key))
    if (foundIdx !== -1) return foundIdx
  }

  // 3. Fallback: September (0)
  return 0
}

onMounted(() => {
  selectedMonthIdx.value = getInitialMonthIndex()
})

watch(() => props.activeSchoolYear, () => {
  selectedMonthIdx.value = getInitialMonthIndex()
})

const currentMonthMeta = computed(() => {
  return schoolYearMonths.value[selectedMonthIdx.value] || schoolYearMonths.value[0]
})

const canJumpToToday = computed(() => {
  const current = currentMonthMeta.value
  return current ? !current.isCurrentRealMonth : false
})

function prevMonth() {
  if (selectedMonthIdx.value > 0) {
    selectedMonthIdx.value--
  }
}

function nextMonth() {
  if (selectedMonthIdx.value < schoolYearMonths.value.length - 1) {
    selectedMonthIdx.value++
  }
}

function jumpToToday() {
  const idx = schoolYearMonths.value.findIndex(m => m.isCurrentRealMonth)
  if (idx !== -1) {
    selectedMonthIdx.value = idx
  }
}

// Helper to populate single days or multi-day date ranges into the holidays map
function populateHolidayRange(map, h) {
  if (!h || !h.date) return
  const startStr = String(h.date).slice(0, 10)
  const endStr = h.endDate ? String(h.endDate).slice(0, 10) : startStr
  const label = h.label || h.name || 'Holiday'
  const isNonInst = h.nonInstructional !== undefined
    ? Boolean(h.nonInstructional)
    : (h.isNonInstructional !== undefined ? Boolean(h.isNonInstructional) : true)

  const payload = {
    label,
    isNonInstructional: isNonInst
  }

  if (!endStr || endStr <= startStr) {
    map.set(startStr, payload)
    return
  }

  // Iterate day by day from startStr to endStr inclusive using noon to prevent DST shifts
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  const cur = new Date(sy, sm - 1, sd, 12, 0, 0)
  const end = new Date(ey, em - 1, ed, 12, 0, 0)

  while (cur <= end) {
    const yr = cur.getFullYear()
    const mo = String(cur.getMonth() + 1).padStart(2, '0')
    const dy = String(cur.getDate()).padStart(2, '0')
    const iso = `${yr}-${mo}-${dy}`
    map.set(iso, payload)
    cur.setDate(cur.getDate() + 1)
  }
}

// ── 2. Holidays & Non-School Days Resolution ─────────────────────────
const holidaysMap = computed(() => {
  const map = new Map()

  // 1. Board calendar holidays
  try {
    const board = getBoardCalendar(props.activeSchoolYear)
    if (board && Array.isArray(board.holidays)) {
      for (const h of board.holidays) {
        populateHolidayRange(map, h)
      }
    }
  } catch (err) {
    // board calendar not found or failed
  }

  // 2. Custom nonSchoolDays overrides / user settings (takes precedence)
  if (Array.isArray(nonSchoolDays?.value)) {
    for (const h of nonSchoolDays.value) {
      populateHolidayRange(map, h)
    }
  }

  return map
})

// ── 3. Build Weeks & Days for Current Month (Monday–Friday) ──────────
function pad(n) {
  return String(n).padStart(2, '0')
}

const weeksInMonth = computed(() => {
  const current = currentMonthMeta.value
  if (!current) return []

  const { year, month } = current
  const firstOfMonth = new Date(year, month, 1)
  const firstDow = firstOfMonth.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

  // Calculate days offset to Monday of the starting week
  let daysToMonday = 0
  if (firstDow === 0) daysToMonday = 1
  else if (firstDow === 6) daysToMonday = 2
  else daysToMonday = 1 - firstDow

  const cur = new Date(year, month, 1 + daysToMonday)
  const lastOfMonth = new Date(year, month + 1, 0)

  // Index duties by date string for fast lookup
  // Respect parent search query / filterDutyType if active
  const dutiesSource = (props.filterDutyType || props.searchQuery)
    ? (props.filteredDuties || [])
    : (props.duties || [])

  const dutyDateMap = new Map()
  for (const d of dutiesSource) {
    if (!d.date) continue
    if (!dutyDateMap.has(d.date)) {
      dutyDateMap.set(d.date, [])
    }
    dutyDateMap.get(d.date).push(d)
  }

  const weeks = []

  while (cur <= lastOfMonth || (cur.getMonth() === month && cur.getDate() <= lastOfMonth.getDate())) {
    const days = []
    const mondayDate = new Date(cur)
    let weekTotalMinutes = 0
    let weekDutyCount = 0
    const weekDutiesList = []
    const dutyNamesSet = new Set()

    for (let i = 0; i < 5; i++) {
      const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i)
      const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const isCurMo = d.getMonth() === month
      const isToday = iso === todayIso

      // Holidays
      const holidayInfo = holidaysMap.value.get(iso)

      // Duties on this date
      const cellDuties = dutyDateMap.get(iso) || []
      const hasDuties = cellDuties.length > 0

      for (const cd of cellDuties) {
        weekDutiesList.push(cd)
        if (!cd.isSnowDay) {
          weekTotalMinutes += Number(cd.duration) || 0
          weekDutyCount++
        }
        if (cd.dutyName) {
          dutyNamesSet.add(cd.dutyName)
        }
      }

      days.push({
        date: iso,
        dayNum: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        isCurrentMonth: isCurMo,
        isToday,
        holiday: holidayInfo?.label || null,
        isNonInstructional: Boolean(holidayInfo?.isNonInstructional),
        duties: cellDuties,
        hasDuties
      })
    }

    // Only include week if at least 1 day belongs to this month
    if (days.some(d => d.isCurrentMonth)) {
      const startIso = days[0].date
      const endIso = days[4].date
      const range = getWeekRangeForDate(startIso)
      const weekRangeLabel = range ? range.label.replace(/, \d{4}$/, '') : `${days[0].dayNum} – ${days[4].dayNum}`

      // Check if entire school week is holiday / break
      const isEntireWeekHoliday = days.every(d => d.holiday && d.isNonInstructional)
      const weekHolidayName = isEntireWeekHoliday ? days[0].holiday : null

      weeks.push({
        startDate: startIso,
        endDate: endIso,
        weekRangeLabel,
        days,
        weekTotalMinutes,
        weekDutyCount,
        weekDutiesList,
        isDutyWeek: weekDutyCount > 0,
        dutyNames: Array.from(dutyNamesSet),
        isEntireWeekHoliday,
        weekHolidayName
      })
    }

    cur.setDate(cur.getDate() + 7)
  }

  return weeks
})

// ── 4. Month Metrics & Cadence Summary ───────────────────────────────
const monthMetrics = computed(() => {
  const weeks = weeksInMonth.value
  let totalMinutes = 0
  let dutyDaysCount = 0
  let activeWeeksCount = 0

  for (const w of weeks) {
    if (w.isDutyWeek) {
      activeWeeksCount++
      totalMinutes += w.weekTotalMinutes
    }
    for (const d of w.days) {
      if (d.isCurrentMonth && d.hasDuties) {
        dutyDaysCount += d.duties.filter(x => !x.isSnowDay).length
      }
    }
  }

  return {
    totalMinutes,
    dutyDaysCount,
    activeWeeksCount,
    hasDuties: activeWeeksCount > 0
  }
})

// ── 5. Cadence Analysis Across Active School Year ────────────────────
const cadenceAnalysis = computed(() => {
  const duties = (props.duties || []).filter(d => !d.isSnowDay && d.date)
  if (duties.length === 0) {
    return {
      totalDutyWeeks: 0,
      avgGapWeeks: 0,
      cadenceText: 'No duties logged yet'
    }
  }

  const weekMap = new Map()
  for (const d of duties) {
    const range = getWeekRangeForDate(d.date)
    if (!range) continue
    if (!weekMap.has(range.mondayIso)) {
      weekMap.set(range.mondayIso, [])
    }
    weekMap.get(range.mondayIso).push(d)
  }

  const sortedWeeks = Array.from(weekMap.keys()).sort()
  const totalDutyWeeks = sortedWeeks.length

  if (totalDutyWeeks <= 1) {
    return {
      totalDutyWeeks,
      avgGapWeeks: 0,
      cadenceText: totalDutyWeeks === 1 ? '1 duty week logged' : 'No duties logged'
    }
  }

  const gaps = []
  for (let i = 0; i < sortedWeeks.length - 1; i++) {
    const w1 = parseLocal(sortedWeeks[i])
    const w2 = parseLocal(sortedWeeks[i + 1])
    const diffWeeks = Math.round((w2 - w1) / (7 * 24 * 60 * 60 * 1000))
    if (diffWeeks > 0) gaps.push(diffWeeks)
  }

  if (gaps.length === 0) {
    return {
      totalDutyWeeks,
      avgGapWeeks: 1,
      cadenceText: 'Consecutive duty weeks'
    }
  }

  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length
  const roundedGap = Math.round(avgGap * 10) / 10

  return {
    totalDutyWeeks,
    avgGapWeeks: roundedGap,
    cadenceText: `Duties occur ~every ${Math.round(roundedGap)} weeks (${totalDutyWeeks} duty cycles)`
  }
})

// ── 6. Actions & Helpers ─────────────────────────────────────────────
function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'p' : 'a'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')}${ampm}`
}

function truncateText(text, maxLen = 16) {
  if (!text || text.length <= maxLen) return text
  return text.substring(0, maxLen - 1) + '…'
}

function handleExportWeek(week) {
  if (!week || !week.weekDutiesList || week.weekDutiesList.length === 0) return
  downloadDutiesIcs(week.weekDutiesList, `duty_week_${week.startDate}_to_${week.endDate}.ics`)
}

function handleExportCurrentMonth() {
  const current = currentMonthMeta.value
  if (!current) return
  const monthDuties = (props.duties || []).filter(d => !d.isSnowDay && (d.date || '').startsWith(current.key))
  if (monthDuties.length === 0) return
  downloadDutiesIcs(monthDuties, `duties_${current.key}_${current.label}.ics`)
}
</script>

<style scoped>
.duty-cal-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

/* ── Calendar Control Bar ── */
.duty-cal-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.duty-cal-bar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.duty-cal-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duty-cal-nav__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--border);
  background: var(--surface, #ffffff);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.duty-cal-nav__btn:hover:not(:disabled) {
  background: var(--bg-secondary, #f2f2f7);
  border-color: var(--primary, #4663ac);
  color: var(--primary, #4663ac);
}

.duty-cal-nav__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.duty-cal-nav__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 4px;
  min-width: 150px;
}

.duty-cal-nav__today-btn {
  font-size: 0.78rem;
  padding: 4px 10px;
  height: 30px;
  font-weight: 600;
}

.duty-cal-bar__right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.duty-cal-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.76rem;
  font-weight: 600;
}

.duty-cal-chip--highlight {
  background: rgba(70, 99, 172, 0.1);
  color: var(--primary, #4663ac);
  border: 1px solid rgba(70, 99, 172, 0.2);
}

.duty-cal-chip--off {
  background: var(--bg-secondary, #f2f2f7);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.duty-cal-chip--cadence {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

/* ── 10-Month Quick Selector Strip ── */
.duty-cal-months-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 0;
  -webkit-overflow-scrolling: touch;
}

.duty-cal-month-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface, #ffffff);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.duty-cal-month-pill:hover {
  background: var(--bg-secondary, #f2f2f7);
  color: var(--text-primary);
  border-color: var(--primary, #4663ac);
}

.duty-cal-month-pill--active {
  background: var(--primary, #4663ac) !important;
  color: #ffffff !important;
  border-color: var(--primary, #4663ac) !important;
  box-shadow: 0 2px 6px rgba(70, 99, 172, 0.3);
}

.duty-cal-month-pill--has-duties {
  font-weight: 700;
  color: var(--text-primary);
}

.duty-cal-month-pill--current {
  border-color: var(--primary, #4663ac);
}

.duty-cal-month-pill__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(70, 99, 172, 0.15);
  color: var(--primary, #4663ac);
}

.duty-cal-month-pill--active .duty-cal-month-pill__badge {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

/* ── Calendar Table Card ── */
.duty-cal-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.duty-cal-table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.duty-cal-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
  table-layout: fixed;
}

/* ── Column Headers ── */
.duty-cal-th {
  padding: 8px 12px;
  text-align: left;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  background: var(--bg-secondary, #f2f2f7);
  border-bottom: 1px solid var(--border);
}

.duty-cal-th--week {
  width: 140px;
  border-right: 1px solid var(--border);
}

/* ── Table Rows ── */
.duty-cal-week-row {
  border-bottom: 1px solid var(--border);
}

.duty-cal-week-row:last-child {
  border-bottom: none;
}

.duty-cal-week-row--active-duty {
  background: rgba(70, 99, 172, 0.015);
}

.duty-cal-td {
  vertical-align: top;
  padding: 5px 6px;
  border-right: 1px solid var(--border);
  height: 74px;
  position: relative;
}

.duty-cal-td:last-child {
  border-right: none;
}

/* ── Week Summary Column Card ── */
.duty-cal-td--week-summary {
  background: var(--bg-secondary, #f9f9fb);
  border-right: 1px solid var(--border);
  padding: 5px 8px;
  width: 135px;
}

.duty-cal-week-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  height: 100%;
}

.duty-cal-week-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.duty-cal-week-card__dates {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  line-height: 1.2;
}

.duty-cal-week-card__export-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface, #ffffff);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.duty-cal-week-card__export-btn:hover {
  color: var(--primary, #4663ac);
  border-color: var(--primary, #4663ac);
}

.duty-cal-week-card__badge {
  padding: 4px 6px;
  border-radius: var(--radius-sm, 6px);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.duty-cal-week-card__badge--active {
  background: rgba(70, 99, 172, 0.1);
  border: 1px solid rgba(70, 99, 172, 0.25);
  color: var(--primary, #4663ac);
}

.duty-cal-week-card__badge-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 0.76rem;
  line-height: 1.2;
}

.duty-cal-week-card__badge-count {
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.duty-cal-week-card__names {
  font-size: 0.67rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
  line-height: 1.2;
}

.duty-cal-week-card__badge--off {
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 500;
  border: 1px dashed var(--border);
  text-align: center;
  padding: 4px;
}

.duty-cal-week-card__badge--holiday {
  background: rgba(148, 163, 184, 0.12) !important;
  color: var(--text-primary) !important;
  border: 1px solid rgba(148, 163, 184, 0.3) !important;
  font-weight: 600;
}

/* ── Day Cells ── */
.duty-cal-td--day {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.duty-cal-td--day:hover {
  background-color: rgba(70, 99, 172, 0.035);
}

.duty-cal-td--outside {
  background: rgba(0, 0, 0, 0.02);
  opacity: 0.55;
}

.duty-cal-td--today {
  background: rgba(70, 99, 172, 0.04);
}

.duty-cal-td--holiday {
  background: rgba(148, 163, 184, 0.07);
}

.duty-cal-day-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  height: 100%;
}

.duty-cal-day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.duty-cal-day-num-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.duty-cal-day-num {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.duty-cal-day-num--today {
  background: var(--primary, #4663ac);
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(70, 99, 172, 0.4);
}

.duty-cal-today-tag {
  font-size: 0.64rem;
  font-weight: 700;
  color: var(--primary, #4663ac);
  text-transform: uppercase;
}

.duty-cal-day-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.duty-cal-holiday-tag {
  font-size: 0.62rem;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  white-space: nowrap;
}

.duty-cal-holiday-tag--off {
  background: rgba(107, 114, 128, 0.12);
  color: #4b5563;
}

.duty-cal-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface, #ffffff);
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.duty-cal-td:hover .duty-cal-add-btn {
  opacity: 1;
}

.duty-cal-add-btn:hover {
  background: var(--primary, #4663ac);
  color: #ffffff;
  border-color: var(--primary, #4663ac);
}

/* ── Stack of Duty Pills ── */
.duty-cal-duties-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
}

.duty-card-pill {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2.5px 6px;
  border-radius: var(--radius-sm, 6px);
  background: rgba(70, 99, 172, 0.08);
  border: 1px solid rgba(70, 99, 172, 0.2);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.duty-card-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
  border-color: var(--primary, #4663ac);
}

.duty-card-pill__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.duty-card-pill__name {
  font-size: 0.71rem;
  font-weight: 700;
  color: var(--primary, #4663ac);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.duty-card-pill__badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 3px;
  border-radius: 3px;
  text-transform: uppercase;
}

.duty-card-pill__badge--emergency {
  background: #f59e0b;
  color: #ffffff;
}

.duty-card-pill__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  font-size: 0.64rem;
  color: var(--text-secondary);
  line-height: 1.2;
}

.duty-card-pill__duration {
  font-weight: 600;
  color: var(--text-primary);
}

/* Emergency Duty Pill Styling */
.duty-card-pill--emergency {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.35);
}

.duty-card-pill--emergency .duty-card-pill__name {
  color: #d97706;
}

/* Snow Day / Cancelled Duty Pill Styling */
.duty-card-pill--snow {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.3);
  opacity: 0.85;
}

.duty-card-pill--snow .duty-card-pill__name {
  color: var(--text-secondary);
  text-decoration: line-through;
}

.duty-card-pill__snow-status {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #3b82f6;
  font-weight: 600;
}

.duty-card-pill__struck {
  text-decoration: line-through;
  opacity: 0.6;
}

/* ── Calendar Month Footer ── */
.duty-cal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 14px;
  background: var(--bg-secondary, #f9f9fb);
  border-top: 1px solid var(--border);
}

.duty-cal-metric-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.duty-cal-metric-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.duty-cal-metric-item__label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.duty-cal-metric-item__val {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

.duty-cal-metric-item__sub {
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.duty-cal-metric-sep {
  width: 1px;
  height: 20px;
  background: var(--border);
}

.duty-cal-export-month-btn {
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
}

/* ── Dark Theme Overrides ── */
body.dark-theme .duty-cal-td--outside,
:root[data-theme="dark"] .duty-cal-td--outside {
  background: rgba(255, 255, 255, 0.02);
}

body.dark-theme .duty-cal-td--today,
:root[data-theme="dark"] .duty-cal-td--today {
  background: rgba(70, 99, 172, 0.12);
}

body.dark-theme .duty-cal-holiday-tag--off,
:root[data-theme="dark"] .duty-cal-holiday-tag--off {
  background: rgba(255, 255, 255, 0.08);
  color: #9ca3af;
}

body.dark-theme .duty-cal-week-card__badge--off,
:root[data-theme="dark"] .duty-cal-week-card__badge--off {
  border-color: rgba(255, 255, 255, 0.12);
}

body.dark-theme .duty-cal-week-card__badge--holiday,
:root[data-theme="dark"] .duty-cal-week-card__badge--holiday {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #e2e8f0 !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

body.dark-theme .duty-cal-td--holiday,
:root[data-theme="dark"] .duty-cal-td--holiday {
  background: rgba(255, 255, 255, 0.03);
}
</style>
