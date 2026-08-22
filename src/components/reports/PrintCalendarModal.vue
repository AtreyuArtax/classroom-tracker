<template>
  <div v-if="show" class="reports__modal-overlay">
    <div 
      class="reports__print-modal"
      :class="{ 'reports__print-modal--preview-open': showPreview, 'reports__print-modal--compact': !showPreview }"
    >
      <!-- Header -->
      <header class="reports__modal-header">
        <div class="header-content">
          <Calendar class="header-icon" :size="24" />
          <div>
            <h3 class="header-title">Print Semester Course Calendar</h3>
            <p class="header-subtitle">{{ selectedYear }} Semester {{ selectedSemester }} · {{ classTitles.length }} Course Calendar(s)</p>
          </div>
        </div>
        <button class="header-close" @click="$emit('close')">
          <X :size="20" />
        </button>
      </header>

      <!-- Body -->
      <div class="reports__modal-body" :class="{ 'reports__modal-body--with-preview': showPreview }">
        <!-- Configuration Section -->
        <div class="config-section">
          <div class="config-section-header">
            <h4 class="config-section-title">Calendar Options</h4>
            <button class="reports__btn-preview" @click="showPreview = !showPreview">
              {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
            </button>
          </div>

          <form class="setup__form" @submit.prevent="handlePrint" style="margin-top: 14px;">
            <label class="setup__label">
              Classes to Print
              <div v-for="(name, idx) in classTitles" :key="idx" class="cal-class-row">
                <input 
                  v-model="classTitles[idx]" 
                  class="setup__input cal-title-input" 
                  placeholder="e.g. Period 1 - SPH4U"
                />
                <button 
                  v-if="classTitles.length > 1" 
                  type="button"
                  class="setup__icon-btn setup__icon-btn--danger" 
                  @click="removeClass(idx)"
                  title="Remove class"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
              <button 
                type="button" 
                class="setup__btn-ghost setup__btn--small" 
                style="margin-top: 8px; width: fit-content;" 
                @click="addClass"
              >
                <Plus :size="14" /> Add Another Class
              </button>
            </label>

            <div class="setup__label" style="margin-top: 14px;">
              Page Layout
              <div class="cal-toggle-group" style="margin-top: 4px;">
                <button 
                  type="button"
                  class="cal-toggle-btn" 
                  :class="{ 'cal-toggle-btn--active': !isTwoPage }"
                  @click="isTwoPage = false"
                >1 Page</button>
                <button 
                  type="button"
                  class="cal-toggle-btn" 
                  :class="{ 'cal-toggle-btn--active': isTwoPage }"
                  @click="isTwoPage = true"
                >2 Page (Duplex)</button>
              </div>
            </div>

            <div class="form-hint" style="margin-top: 14px;">
              <span v-if="!isTwoPage">
                Printing <strong>{{ classTitles.length }} calendar(s)</strong> (single-sided 1-page overview).
              </span>
              <span v-else>
                Printing <strong>{{ classTitles.length }} duplex set(s)</strong> (2 pages per class).
              </span>
            </div>
          </form>
        </div>

        <!-- Live Print Preview Area -->
        <div v-if="showPreview" class="reports__print-preview-area">
          <header class="preview-banner">
            <div class="preview-banner-left">
              <Activity :size="14" /> LIVE CALENDAR PREVIEW ({{ isTwoPage ? `Page ${previewPage} of 2` : 'Page 1 of 1' }})
            </div>
            <!-- Selectors -->
            <div class="preview-banner-controls">
              <div v-if="classTitles.length > 1" class="cal-mini-selector">
                <span>Class:</span>
                <select v-model="previewClassIdx" class="cal-select-mini">
                  <option v-for="(title, idx) in classTitles" :key="idx" :value="idx">
                    {{ title || `Class ${idx + 1}` }}
                  </option>
                </select>
              </div>

              <div v-if="isTwoPage" class="cal-page-toggles">
                <button 
                  type="button"
                  class="cal-page-btn" 
                  :class="{ 'cal-page-btn--active': previewPage === 1 }"
                  @click="previewPage = 1"
                >Page 1</button>
                <button 
                  type="button"
                  class="cal-page-btn" 
                  :class="{ 'cal-page-btn--active': previewPage === 2 }"
                  @click="previewPage = 2"
                >Page 2</button>
              </div>
            </div>
          </header>

          <div class="preview-content">
            <div class="preview-content-wrapper">
              <div class="cal-preview-card">
                <header class="sheet-header-main">
                  <div class="sheet-header-row-flex">
                    <h1 class="sheet-title-text">
                      {{ (classTitles[previewClassIdx] || defaultTitle) + (isTwoPage && previewPage === 2 ? ' (Continued)' : '') }}
                    </h1>
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
                    <tr v-for="(week, weekIdx) in currentPreviewWeeks" :key="weekIdx">
                      <td v-if="isRowStartOfMonth(weekIdx, currentPreviewWeeks)" :rowspan="getRowSpanForMonth(weekIdx, currentPreviewWeeks)" class="sheet-month-cell">
                        <div class="sheet-month-vlabel">{{ getMonthName(currentPreviewWeeks[weekIdx]) }}</div>
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
        </div>
      </div>

      <!-- Footer -->
      <footer class="reports__modal-footer">
        <button class="reports__btn-ghost" @click="$emit('close')">Cancel</button>
        <button class="reports__btn-primary" @click="handlePrint" :disabled="isPrinting">
          <Printer :size="16" /> Open Print Dialog
        </button>
      </footer>
    </div>

    <!-- ── Hidden Print Container (Teleported to body for native printing) ─── -->
    <Teleport to="body" v-if="mounted">
      <div 
        class="sheet-print-only semester-print-root" 
        :class="{ 'print-only-container--active': isPrinting }"
      >
        <div v-for="(title, tIdx) in classTitles" :key="tIdx" class="sheet-batch-item">
          <!-- Page 1 -->
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

          <!-- Page 2 if Duplex -->
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
import { Calendar, X, Printer, Plus, Trash2, Activity } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { globalMilestones } from '../../composables/useGradebook.js'
import { executePrint } from '../../composables/usePrintOptions.js'
import * as settingsService from '../../db/settingsService.js'
import { formatLocalDate } from '../../utils/dates.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  reportClass: { type: Object, default: null }
})

defineEmits(['close'])

const { 
  nonSchoolDays, 
  selectedYear,
  selectedSemester,
  teacherName,
  getTermRange
} = useClassroom()

const isPrinting = ref(false)
const mounted = ref(false)
const showPreview = ref(false)
const isTwoPage = ref(false)
const previewClassIdx = ref(0)
const previewPage = ref(1)

const defaultTitle = computed(() => {
  return `Course Calendar: ${selectedYear.value || ''} Semester ${selectedSemester.value || ''}`
})

const classTitles = ref([props.reportClass?.name ? `${props.reportClass.name} Calendar` : defaultTitle.value])

onMounted(async () => {
  mounted.value = true
  if (globalMilestones.value.length === 0) {
    globalMilestones.value = await settingsService.getGlobalMilestones()
  }
})

function addClass() {
  classTitles.value.push('')
}

function removeClass(idx) {
  classTitles.value.splice(idx, 1)
  if (previewClassIdx.value >= classTitles.value.length) {
    previewClassIdx.value = Math.max(0, classTitles.value.length - 1)
  }
}

const activeTermDetails = computed(() => {
  if (!selectedYear.value || !selectedSemester.value) return null
  return getTermRange(selectedYear.value, selectedSemester.value)
})

const activeTermForCalendar = computed(() => {
  const details = activeTermDetails.value
  if (!details) return null
  return {
    year: selectedYear.value,
    semester: selectedSemester.value,
    startDate: formatLocalDate(details.start),
    endDate: formatLocalDate(details.end)
  }
})

const filteredMilestones = computed(() => {
  const year = selectedYear.value
  return globalMilestones.value.filter(m => !m.year || m.year === year)
})

const holidayCache = computed(() => {
  const map = {}
  nonSchoolDays.value.forEach(h => {
    if (!h.date) return
    const s = h.date
    const e = h.endDate || h.date
    const lbl = h.label
    if (s === e) map[s] = lbl
    else {
      let cur = new Date(s + 'T12:00:00')
      let end = new Date(e + 'T12:00:00')
      while (cur <= end) {
        map[formatLocalDate(cur)] = lbl
        cur.setDate(cur.getDate() + 1)
      }
    }
  })
  return map
})

const milestoneMap = computed(() => {
  const map = {}
  filteredMilestones.value.forEach(m => {
    if (!m.date) return
    map[m.date] = m.name
  })
  return map
})

const weeks = computed(() => {
  const term = activeTermForCalendar.value
  if (!term?.startDate || !term?.endDate) return []
  const startDate = new Date(term.startDate + 'T12:00:00')
  const endDate = new Date(term.endDate + 'T12:00:00')
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
    const ds = formatLocalDate(curr)
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

const currentPreviewWeeks = computed(() => {
  if (!isTwoPage.value) return weeks.value
  return previewPage.value === 1 ? topHalf.value : bottomHalf.value
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
  if (!row) return ''
  const firstDate = row.find(d => d.date)?.date
  return firstDate ? firstDate.toLocaleString('default', { month: 'long' }) : ''
}

function handlePrint() {
  isPrinting.value = true
  nextTick(() => {
    executePrint({
      orientation: 'portrait',
      margin: '10mm',
      onDone: () => {
        isPrinting.value = false
      }
    })
  })
}
</script>

<style scoped>
.reports__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.reports__print-modal {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: 100%;
  transition: max-width 0.3s ease;
  overflow: hidden;
}

.reports__print-modal--compact {
  max-width: 520px;
}

.reports__print-modal--preview-open {
  max-width: 1100px;
  height: 88vh;
}

.reports__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: var(--primary);
}

.header-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.header-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.header-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
}

.header-close:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.reports__modal-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.reports__modal-body--with-preview .config-section {
  width: 360px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
}

.config-section {
  padding: 20px;
  overflow-y: auto;
  width: 100%;
}

.config-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.reports__btn-preview {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
  transition: all 0.15s ease;
}

.reports__btn-preview:hover {
  background: var(--surface-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.cal-class-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
}

.cal-title-input {
  font-weight: 600;
  width: 100% !important;
}

.cal-toggle-group {
  display: flex;
  background: var(--border);
  padding: 2px;
  border-radius: var(--radius-md);
  width: fit-content;
}

.cal-toggle-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
}

.cal-toggle-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.form-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary);
}

/* ── Live Preview Area ── */
.reports__print-preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #cbd5e1;
}

.preview-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.preview-banner-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-banner-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cal-mini-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.cal-select-mini {
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 600;
}

.cal-page-toggles {
  display: flex;
  background: var(--border);
  padding: 2px;
  border-radius: var(--radius-sm);
}

.cal-page-btn {
  padding: 3px 8px;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
}

.cal-page-btn--active {
  background: var(--surface);
  color: var(--primary);
}

.preview-content {
  padding: 24px 16px 48px;
  background: #cbd5e1;
  overflow-y: auto !important;
  overflow-x: auto;
  display: block;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.preview-content-wrapper {
  zoom: 0.72;
  width: 210mm;
  margin: 0 auto 32px auto;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  background: #ffffff;
}

.cal-preview-card {
  padding: 12mm 10mm;
  background: #ffffff;
  color: #000000;
  font-family: Arial, sans-serif;
  min-height: 297mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.reports__modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.reports__btn-ghost {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
}

.reports__btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}
</style>

<style>
/* ── Native Print Engine ── */
.semester-print-root {
  display: none;
  background: white !important;
  color: #000 !important;
  font-family: Arial, sans-serif;
  width: 100%;
}

.semester-print-root.print-only-container--active {
  display: block;
}

@media print {
  #app, .reports__modal-overlay {
    display: none !important;
  }
  .semester-print-root {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
  .sheet-print-page {
    height: calc(100vh - 22mm);
    display: flex;
    flex-direction: column;
    page-break-inside: avoid;
  }
  .sheet--duplex-page {
    page-break-after: always;
  }
  .sheet-batch-item:not(:last-child) {
    page-break-after: always;
  }
}

.sheet-cal-table {
  flex: 1;
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 2px solid black;
  height: 100%;
}

.sheet-cal-table th, .sheet-cal-table td {
  border: 1px solid black;
  padding: 0;
}

.sheet-cal-header-row {
  height: 24px;
}

.sheet-cal-header-row th {
  background: #f1f1f1 !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  font-size: 10px;
  font-weight: bold;
  padding: 6px 2px;
}

.sheet-month-col-head {
  width: 30px;
  border: none;
}

.sheet-month-cell {
  width: 30px;
  background: #fdfdfd !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  vertical-align: middle;
  text-align: center;
}

.sheet-month-vlabel {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  color: #666;
}

.sheet-day-cell {
  vertical-align: top;
}

.sheet-day--holiday {
  background-color: #f5f5f5 !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.sheet-day-inner {
  padding: 2px 4px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sheet-day-number {
  font-size: 9px;
  font-weight: bold;
  margin-bottom: 1px;
}

.sheet-events-stack {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sheet-event-text {
  font-size: 8px;
  line-height: 1.1;
}

.sheet-event--holiday {
  color: #444;
  text-transform: uppercase;
  font-weight: bold;
}

.sheet-event--milestone {
  font-weight: bold;
  border-left: 2px solid black;
  padding-left: 2px;
}

.sheet-header-main {
  margin-bottom: 4px;
  border-bottom: 1px solid #000;
  padding-bottom: 2px;
  flex-shrink: 0;
}

.sheet-header-row-flex {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.sheet-title-text {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  text-transform: uppercase;
}

.sheet-header-teacher {
  font-size: 11px;
  font-weight: bold;
  color: #444;
}
</style>
