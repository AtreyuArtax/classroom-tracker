<template>
  <div class="semester-calendar-root">
    <!-- 1. MODAL PREVIEW (Screen Only) -->
    <div class="cal-preview no-print">
      <header class="cal-header">
        <div class="cal-title-block">
          <label class="setup__label">Classes to Print</label>
          <div v-for="(name, idx) in classTitles" :key="idx" class="cal-class-row">
            <input 
              v-model="classTitles[idx]" 
              class="setup__input cal-title-input" 
              placeholder="e.g. Period 1 - SPH4U"
            />
            <button 
              v-if="classTitles.length > 1" 
              class="setup__icon-btn setup__icon-btn--danger" 
              @click="removeClass(idx)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
          <button class="setup__btn-ghost setup__btn--small" style="margin-top: 8px; width: fit-content;" @click="addClass">
            <Plus :size="14" /> Add Another Class
          </button>
        </div>
        
        <div class="cal-controls">
          <div class="cal-toggle-group">
            <button 
              class="cal-toggle-btn" 
              :class="{ 'cal-toggle-btn--active': !isTwoPage }"
              @click="isTwoPage = false"
            >1 Page</button>
            <button 
              class="cal-toggle-btn" 
              :class="{ 'cal-toggle-btn--active': isTwoPage }"
              @click="isTwoPage = true"
            >2 Page (Duplex)</button>
          </div>
          <button class="setup__btn-primary" @click="printNow" :disabled="isPrinting">
            <Printer :size="16" /> {{ isPrinting ? 'Preparing...' : 'Print All' }}
          </button>
        </div>
      </header>

      <div class="cal-preview-content">
        <AlertCircle :size="14" /> 
        <span v-if="!isTwoPage">Printing <strong>{{ classTitles.length }} calendars</strong> (one side each).</span>
        <span v-else>Printing <strong>{{ classTitles.length }} duplex sets</strong> (2 pages per class).</span>
      </div>
    </div>

    <!-- 2. ACTUAL PRINTABLE ROOT (Teleported to body) -->
    <Teleport to="body" v-if="mounted">
      <div 
        class="sheet-print-only semester-print-root" 
        :class="{ 'print-only-container--active': isPrinting }"
      >
        <!-- LOOP OVER EACH CLASS TITLE -->
        <div v-for="(title, tIdx) in classTitles" :key="tIdx" class="sheet-batch-item">
          
          <!-- PAGE 1 (or Only Page) for this Class -->
          <div class="sheet-print-page" :class="{ 'sheet--duplex-page': isTwoPage }">
            <header class="sheet-header-main">
              <div class="sheet-header-row-flex">
                <h1 class="sheet-title-text">{{ title || defaultTitle }}</h1>
                <span class="sheet-header-teacher">{{ teacherName }}</span>
              </div>
            </header>

            <table class="sheet-cal-table" :class="{ 'sheet-cal-table--large': isTwoPage }">
              <thead>
                <tr class="sheet-cal-header-row">
                  <th class="sheet-month-col-head"></th>
                  <th v-for="d in ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']" :key="d">{{ d }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(week, weekIdx) in (isTwoPage ? topHalf : weeks)" :key="weekIdx">
                  <td v-if="isRowStartOfMonth(weekIdx, isTwoPage ? topHalf : weeks)" :rowspan="getRowSpanForMonth(weekIdx, isTwoPage ? topHalf : weeks)" class="sheet-month-cell">
                    <div class="sheet-month-vlabel">{{ getMonthName(isTwoPage ? topHalf[weekIdx] : weeks[weekIdx]) }}</div>
                  </td>
                  <td v-for="(day, dIdx) in week" :key="dIdx" class="sheet-day-cell" :class="{ 'sheet-day--holiday': day.holiday, 'sheet-day--empty': !day.date, 'sheet-day--outside': day.isOutsideTerm }">
                    <div v-if="day.date" class="sheet-day-inner">
                      <span class="sheet-day-number">{{ day.dayNum }}</span>
                      <div class="sheet-events-stack">
                        <div v-if="day.holiday" class="sheet-event-text sheet-event--holiday">{{ day.holiday }}</div>
                        <div v-if="day.milestone" class="sheet-event-text sheet-event--milestone">{{ day.milestone }}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- PAGE 2 (If Duplex Mode) for this Class -->
          <div v-if="isTwoPage" class="sheet-print-page">
            <header class="sheet-header-main">
              <div class="sheet-header-row-flex">
                <h1 class="sheet-title-text">{{ title || defaultTitle }} (Continued)</h1>
                <span class="sheet-header-teacher">{{ teacherName }}</span>
              </div>
            </header>
            <table class="sheet-cal-table sheet-cal-table--large">
              <thead>
                <tr class="sheet-cal-header-row">
                  <th class="sheet-month-col-head"></th>
                  <th v-for="d in ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']" :key="d">{{ d }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(week, weekIdx) in bottomHalf" :key="weekIdx">
                  <td v-if="isRowStartOfMonth(weekIdx, bottomHalf)" :rowspan="getRowSpanForMonth(weekIdx, bottomHalf)" class="sheet-month-cell">
                    <div class="sheet-month-vlabel">{{ getMonthName(bottomHalf[weekIdx]) }}</div>
                  </td>
                  <td v-for="(day, dIdx) in week" :key="dIdx" class="sheet-day-cell" :class="{ 'sheet-day--holiday': day.holiday, 'sheet-day--empty': !day.date, 'sheet-day--outside': day.isOutsideTerm }">
                    <div v-if="day.date" class="sheet-day-inner">
                      <span class="sheet-day-number">{{ day.dayNum }}</span>
                      <div class="sheet-events-stack">
                        <div v-if="day.holiday" class="sheet-event-text sheet-event--holiday">{{ day.holiday }}</div>
                        <div v-if="day.milestone" class="sheet-event-text sheet-event--milestone">{{ day.milestone }}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Printer, AlertCircle, Plus, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  term: { type: Object, required: true },
  nonSchoolDays: { type: Array, default: () => [] },
  milestones: { type: Array, default: () => [] },
  teacherName: { type: String, default: '' }
})

const isPrinting = ref(false)
const mounted = ref(false)
const isTwoPage = ref(false)

const defaultTitle = computed(() => {
  return `Course Calendar: ${props.term?.year || ''} Semester ${props.term?.semester || ''}`
})

const classTitles = ref([defaultTitle.value])

onMounted(() => {
  mounted.value = true
})

function addClass() {
  classTitles.value.push('')
}

function removeClass(idx) {
  classTitles.value.splice(idx, 1)
}

const holidayCache = computed(() => {
  const map = {}
  props.nonSchoolDays.forEach(h => {
    if (!h.date) return
    const s = h.date
    const e = h.endDate || h.date
    const lbl = h.label
    if (s === e) map[s] = lbl
    else {
      let cur = new Date(s + 'T12:00:00')
      let end = new Date(e + 'T12:00:00')
      while (cur <= end) {
        map[cur.toISOString().split('T')[0]] = lbl
        cur.setDate(cur.getDate() + 1)
      }
    }
  })
  return map
})

const milestoneMap = computed(() => {
  const map = {}
  props.milestones.forEach(m => {
    if (!m.date) return
    map[m.date] = m.name
  })
  return map
})

const weeks = computed(() => {
  if (!props.term?.startDate || !props.term?.endDate) return []
  const startDate = new Date(props.term.startDate + 'T12:00:00')
  const endDate = new Date(props.term.endDate + 'T12:00:00')
  let curr = new Date(startDate)
  const firstDow = curr.getDay()
  if (firstDow === 0) curr.setDate(curr.getDate() + 1)
  else if (firstDow === 6) curr.setDate(curr.getDate() + 2)
  else if (firstDow > 1) curr.setDate(curr.getDate() - (firstDow - 1))

  const allWeeks = []
  let currentWeek = []
  while (curr <= endDate || currentWeek.length > 0) {
    const dow = curr.getDay()
    if (dow === 0 || dow === 6) {
      if (currentWeek.length > 0) {
        while (currentWeek.length < 5) currentWeek.push({ date: null })
        allWeeks.push(currentWeek)
        currentWeek = []
      }
      curr.setDate(curr.getDate() + (dow === 6 ? 2 : 1))
      if (curr > endDate) break
      continue
    }
    const ds = curr.toISOString().split('T')[0]
    currentWeek.push({
      date: new Date(curr),
      dayNum: curr.getDate(),
      month: curr.toLocaleString('default', { month: 'long' }),
      isOutsideTerm: curr < startDate || curr > endDate,
      holiday: holidayCache.value[ds],
      milestone: milestoneMap.value[ds]
    })
    if (currentWeek.length === 5) {
      allWeeks.push(currentWeek)
      currentWeek = []
    }
    curr.setDate(curr.getDate() + 1)
  }
  return allWeeks
})

const splitIndex = computed(() => {
  if (weeks.value.length < 6) return weeks.value.length
  const mid = Math.floor(weeks.value.length / 2)
  let bestIdx = mid
  let minDiff = 999
  for (let i = mid - 4; i <= mid + 4; i++) {
    if (i <= 0 || i >= weeks.value.length) continue
    const currMonth = getMonthName(weeks.value[i])
    const prevMonth = getMonthName(weeks.value[i-1])
    if (currMonth !== prevMonth) {
      const diff = Math.abs(mid - i)
      if (diff < minDiff) { minDiff = diff; bestIdx = i; }
    }
  }
  return bestIdx
})

const topHalf = computed(() => weeks.value.slice(0, splitIndex.value))
const bottomHalf = computed(() => weeks.value.slice(splitIndex.value))
const splitMonthName = computed(() => {
  if (bottomHalf.value.length === 0) return ''
  return getMonthName(bottomHalf.value[0])
})

function isRowStartOfMonth(idx, weekList) {
  if (idx === 0) return true
  return getMonthName(weekList[idx-1]) !== getMonthName(weekList[idx])
}

function getRowSpanForMonth(idx, weekList) {
  const month = getMonthName(weekList[idx])
  let count = 0
  for (let i = idx; i < weekList.length; i++) {
    if (getMonthName(weekList[i]) === month) count++
    else break
  }
  return count
}

function getMonthName(row) {
  const firstDate = row.find(d => d.date)?.date
  return firstDate ? firstDate.toLocaleString('default', { month: 'long' }) : ''
}

function printNow() {
  isPrinting.value = true
  nextTick(() => {
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        isPrinting.value = false
      }, 500)
    }, 50)
  })
}
</script>

<style scoped>
.cal-preview { background: var(--bg-secondary); border-radius: var(--radius-md); padding: 16px; border: 1px dashed var(--border); }
.cal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 16px; }
.cal-title-block { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.cal-class-row { display: flex; gap: 8px; align-items: center; }
.cal-title-input { font-weight: 700; width: 100% !important; min-height: 38px !important; }
.cal-controls { display: flex; align-items: center; gap: 12px; margin-top: 24px; }
.cal-toggle-group { display: flex; background: var(--border); padding: 2px; border-radius: var(--radius-md); }
.cal-toggle-btn { padding: 6px 12px; border: none; background: transparent; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; border-radius: 6px; }
.cal-toggle-btn--active { background: var(--surface); color: var(--primary); box-shadow: var(--shadow-sm); }
.cal-preview-content { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-secondary); }
.setup__btn--small { padding: 6px 12px; min-height: 32px; font-size: 0.8rem; border-radius: var(--radius-md); }
.no-print { display: block; }
@media print { .no-print { display: none !important; } }
</style>

<style>
.semester-print-root { display: none; background: white !important; color: #000 !important; font-family: Arial, sans-serif; width: 100%; }
.semester-print-root.print-only-container--active { display: block; }
@media print { 
  #app, .bm-overlay, .bm-card { display: none !important; } 
  .semester-print-root { display: block !important; position: absolute; top: 0; left: 0; width: 100%; } 
  @page { margin: 10mm; size: portrait; }
  .sheet--duplex-page { page-break-after: always; }
  .sheet--batch-page-break { page-break-after: always; }
}
.sheet-cal-table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 2px solid black; }
.sheet-cal-table th, .sheet-cal-table td { border: 1px solid black; padding: 0; }
.sheet-cal-header-row th { background: #f1f1f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; font-weight: bold; padding: 6px 2px; }
.sheet-month-col-head { width: 30px; border: none; }
.sheet-month-cell { width: 30px; background: #fdfdfd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; vertical-align: middle; text-align: center; }
.sheet-month-vlabel { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; }
.sheet-day-cell { height: 40px; vertical-align: top; }
.sheet-cal-table--large .sheet-day-cell { height: 75px; }
.sheet-day--holiday { background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet-day-inner { padding: 2px 4px; height: 100%; display: flex; flex-direction: column; }
.sheet-day-number { font-size: 9px; font-weight: bold; margin-bottom: 1px; }
.sheet-events-stack { display: flex; flex-direction: column; gap: 1px; }
.sheet-event-text { font-size: 8px; line-height: 1.1; }
.sheet-event--holiday { color: #444; text-transform: uppercase; font-weight: bold; }
.sheet-event--milestone { font-weight: bold; border-left: 2px solid black; padding-left: 2px; }
.sheet-header-main { margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px; }
.sheet-header-row-flex { display: flex; justify-content: space-between; align-items: baseline; }
.sheet-title-text { font-size: 14px; font-weight: bold; margin: 0; text-transform: uppercase; }
.sheet-header-teacher { font-size: 11px; font-weight: bold; color: #444; }
.sheet-batch-item:not(:last-child) { page-break-after: always; }
</style>
