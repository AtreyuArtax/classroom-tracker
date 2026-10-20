<template>
  <div class="duties-view">
    <div class="duties-view__container">
      
      <!-- ── Page Header ─────────────────────────────────────────────── -->
    <header class="duties-view__header">
      <div class="duties-view__header-left">
        <!-- Mode Tab Switcher: Schedule & Log (Default) vs Insights & Trends -->
        <div class="duties-view__mode-tabs">
          <button
            type="button"
            class="duties-view__mode-btn"
            :class="{ 'duties-view__mode-btn--active': activeViewTab === 'log' }"
            @click="activeViewTab = 'log'"
          >
            <CalendarCheck :size="14" />
            <span>Schedule & Log</span>
          </button>
          <button
            type="button"
            class="duties-view__mode-btn"
            :class="{ 'duties-view__mode-btn--active': activeViewTab === 'analytics' }"
            @click="activeViewTab = 'analytics'"
          >
            <BarChart2 :size="14" />
            <span>Insights & Trends</span>
          </button>
        </div>

        <!-- School Year Selector Dropdown (visible in log mode) -->
        <div v-if="activeViewTab === 'log'" class="duties-view__year-selector-wrap">
          <select
            v-model="activeSchoolYear"
            class="setup__input duties-view__year-select"
            @change="onYearChange"
            aria-label="Select school year"
          >
            <option
              v-for="yr in availableSchoolYears"
              :key="yr"
              :value="yr"
            >
              {{ yr }} {{ yr === currentSystemYear ? '(Current)' : '' }}
            </option>
          </select>
        </div>
      </div>

      <div class="duties-view__header-right">
        <!-- Consolidated Duty Tools Dropdown -->
        <div class="duties-dropdown-container" ref="dutyToolsContainer">
          <button 
            type="button" 
            class="setup__btn-ghost duties-dropdown-trigger" 
            :class="{ 'duties-dropdown-trigger--active': isDutyToolsOpen }"
            @click="isDutyToolsOpen = !isDutyToolsOpen"
            title="Duty tools, settings, import, and calendar export"
          >
            <SlidersHorizontal :size="15" />
            <span>Duty Tools</span>
            <ChevronDown :size="14" class="duties-dropdown-chevron" :class="{ 'duties-dropdown-chevron--expanded': isDutyToolsOpen }" />
          </button>

          <div 
            v-if="isDutyToolsOpen" 
            class="duties-dropdown-menu"
          >
            <div class="duties-dropdown-header">Actions &amp; Data</div>
            <button 
              type="button" 
              class="duties-dropdown-item" 
              @click="isImportModalOpen = true; isDutyToolsOpen = false;"
            >
              <Upload :size="15" />
              <span>Import Past Duties (.csv)</span>
            </button>
            <button 
              type="button" 
              class="duties-dropdown-item" 
              :disabled="!lastEnteredWeek"
              @click="onExportLastEnteredWeek(); isDutyToolsOpen = false;"
              title="Download Outlook Calendar (.ics) for the last set of duties entered"
            >
              <Calendar :size="15" />
              <div class="duties-dropdown-item__text">
                <span>Export Last Entered Week (.ics)</span>
                <small v-if="lastEnteredWeek" class="duties-dropdown-item__subtext">
                  {{ lastEnteredWeek.label }} · {{ lastEnteredWeek.dutyNames[0] || 'Duty' }}
                </small>
              </div>
            </button>
            <button 
              type="button" 
              class="duties-dropdown-item" 
              :disabled="duties.length === 0"
              @click="isExportModalOpen = true; isDutyToolsOpen = false;"
              title="Choose any past or upcoming week to export to Outlook"
            >
              <CalendarDays :size="15" />
              <span>Export Week to Calendar...</span>
            </button>
            <div class="duties-dropdown-divider"></div>
            <div class="duties-dropdown-header">Configuration</div>
            <button 
              type="button" 
              class="duties-dropdown-item" 
              @click="onOpenSettings(); isDutyToolsOpen = false;"
            >
              <Settings :size="15" />
              <span>Duty Settings</span>
            </button>
          </div>
        </div>

        <button
          class="setup__btn-primary"
          @click="isAddModalOpen = true"
        >
          <Plus :size="15" /> Add Duty / Week
        </button>
      </div>
    </header>

    <!-- ── Mode 1: Schedule & Log (Default) ────────────────────────── -->
    <template v-if="activeViewTab === 'log'">
      
      <!-- ── Compact Duty Command Center Hero ────────────────────────── -->
      <section class="duty-hero-card">
        <div class="duty-hero-card__body">
          <!-- 3-Column KPI Header Row -->
          <div class="duty-progress-metrics">
            <!-- Col 1: Completed -->
            <div class="duty-metric">
              <span class="duty-metric__label">Completed</span>
              <div class="duty-metric__val-row">
                <strong class="duty-metric__big">{{ completedMinutes.toLocaleString() }}</strong>
                <span class="duty-metric__context">/ {{ allottedMinutes.toLocaleString() }} min</span>
                <span class="duty-metric__pct-badge">{{ percentComplete }}%</span>
              </div>
            </div>

            <!-- Col 2: Remaining -->
            <div class="duty-metric">
              <span class="duty-metric__label">Remaining</span>
              <div class="duty-metric__val-row">
                <strong
                  class="duty-metric__big"
                  :class="{ 'duty-metric__big--success': remainingMinutes <= 0 }"
                >
                  {{ (remainingMinutes > 0 ? remainingMinutes : 0).toLocaleString() }}
                </strong>
                <span class="duty-metric__context">min left</span>
              </div>
            </div>

            <!-- Col 3: Emergency On-calls -->
            <div class="duty-metric duty-metric--emergency">
              <span class="duty-metric__label">Emergency On-calls</span>
              <div class="duty-metric__val-row">
                <strong
                  class="duty-metric__big"
                  :class="{ 'duty-metric__big--warn': emergencyCount >= emergencyCap && emergencyCap > 0 }"
                >
                  {{ emergencyCount }}
                </strong>
                <span class="duty-metric__context">/ {{ emergencyCap }} max</span>
                <span
                  v-if="emergencyCap > 0 && emergencyCount >= emergencyCap"
                  class="duty-metric__emergency-badge duty-metric__emergency-badge--alert"
                >
                  Cap Reached
                </span>
              </div>
            </div>
          </div>

          <!-- Multi-Tone Horizontal Bar with Semester 2 & Calendar Markers -->
          <div class="duty-bar-wrap">
            <div
              class="duty-bar-track"
              :title="`Completed: ${completedMinutes.toLocaleString()} / ${allottedMinutes.toLocaleString()} min (${percentComplete}%)`"
            >
              <!-- Progress Fill -->
              <div
                class="duty-bar-fill"
                :style="{ width: `${Math.min(100, percentComplete)}%` }"
              ></div>

              <!-- Semester 2 Milestone Line (Vertical marker line across the bar) -->
              <div
                class="duty-bar-marker duty-bar-marker--sem2"
                :style="{ left: `${sem2MarkerPercent}%` }"
                :title="`Semester 2 Start: ${sem2DisplayDate} (${sem2TargetMinutes.toLocaleString()} min · 50% milestone)`"
              >
                <div class="duty-bar-marker__line"></div>
                <div class="duty-bar-marker__badge">
                  <span>Sem 2</span>
                </div>
              </div>

              <!-- Today's Calendar Position (Instructional Pace) -->
              <div
                v-if="calendarPace && calendarPace.isActiveYear"
                class="duty-bar-marker duty-bar-marker--today"
                :style="{ left: `${Math.min(100, Math.max(0, calendarPace.elapsedPercent))}%` }"
                :title="`Today (${calendarPace.todayDisplay}): ${calendarPace.elapsedPercent}% of school year elapsed (${calendarPace.elapsedDays}/${calendarPace.totalDays} school days)`"
              >
                <div class="duty-bar-marker__today-indicator"></div>
              </div>
            </div>

            <!-- Timeline Labels Below the Bar -->
            <div class="duty-bar-timeline">
              <span class="duty-bar-timeline__point duty-bar-timeline__point--start">
                Sem 1 <small>({{ sem1DisplayDate }})</small>
              </span>

              <span
                class="duty-bar-timeline__point duty-bar-timeline__point--sem2"
                :style="{ left: `${sem2MarkerPercent}%` }"
              >
                <strong class="duty-bar-timeline__sem2-label">Sem 2 Start</strong> · {{ sem2DisplayDate }}
                <span class="duty-bar-timeline__sub">({{ sem2TargetMinutes.toLocaleString() }}m · 50%)</span>
              </span>

              <span class="duty-bar-timeline__point duty-bar-timeline__point--end">
                Target <small>({{ allottedMinutes.toLocaleString() }}m)</small>
              </span>
            </div>
          </div>

          <!-- Integrated School Year Calendar Pace Row (Clean typography & Lucide icons) -->
          <div v-if="calendarPace && calendarPace.isActiveYear" class="duty-bar-pace">
            <div class="duty-bar-pace__calendar">
              <CalendarDays :size="13" class="duty-bar-pace__cal-icon" />
              <span>School Year: <strong>{{ calendarPace.elapsedPercent }}% elapsed</strong> ({{ calendarPace.elapsedDays }}/{{ calendarPace.totalDays }} days)</span>
            </div>

            <span class="duty-bar-pace__sep">•</span>

            <div class="duty-bar-pace__status" :class="`duty-bar-pace__status--${calendarPace.paceStatus}`">
              <CheckCircle2 v-if="calendarPace.paceStatus === 'on-track'" :size="13" class="duty-bar-pace__status-icon" />
              <TrendingUp v-else-if="calendarPace.paceStatus === 'ahead'" :size="13" class="duty-bar-pace__status-icon" />
              <Clock v-else-if="calendarPace.paceStatus === 'behind'" :size="13" class="duty-bar-pace__status-icon" />
              <Check v-else :size="13" class="duty-bar-pace__status-icon" />
              <span>{{ calendarPace.paceMessage }}</span>
            </div>
          </div>

          <div v-if="remainingMinutes <= 0" class="duty-bar-footer">
            <span class="duty-status-complete">
              <CheckCircle2 :size="14" style="vertical-align: -2px; margin-right: 4px;" />
              Annual duty allotment fulfilled!
            </span>
            <span v-if="remainingMinutes < 0" class="duty-status-over">
              (+{{ Math.abs(remainingMinutes).toLocaleString() }} min beyond allotment)
            </span>
          </div>
        </div>

        <!-- Integrated Duty Breakdown Footer (Compact chips folded into card) -->
        <div v-if="dutyBreakdown.length > 0" class="duty-hero-card__footer">
          <span class="duty-hero-card__footer-label">Breakdown:</span>
          <div class="duty-hero-card__chips">
            <span
              v-for="item in dutyBreakdown"
              :key="item.name"
              class="duty-hero-card__chip"
            >
              <strong>{{ item.name }}</strong>
              <span>{{ item.minutes }}m ({{ item.count }}×)</span>
            </span>
          </div>
        </div>
      </section>

    <!-- ── Filter & Search Toolbar ─────────────────────────────────── -->
    <div class="duties-view__toolbar">
      <div class="duties-view__toolbar-left">
        <div class="duties-view__search-wrap">
          <Search :size="15" class="duties-view__search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="setup__input duties-view__search-input"
            placeholder="Search notes, teachers, locations..."
          />
        </div>

        <select v-model="filterDutyType" class="setup__input duties-view__filter-select">
          <option value="">All Duties</option>
          <option v-for="t in dutyTypesList" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="duties-view__toolbar-right">
        <span class="duties-view__count-text">
          Showing {{ filteredDuties.length }} of {{ duties.length }} duties
        </span>

        <div class="duties-view__view-toggle" role="group" aria-label="Duty log view mode">
          <button
            type="button"
            class="duties-view__view-btn"
            :class="{ 'duties-view__view-btn--active': viewMode === 'table' }"
            @click="viewMode = 'table'"
            title="Table List View"
          >
            <List :size="14" />
            <span>Table</span>
          </button>
          <button
            type="button"
            class="duties-view__view-btn"
            :class="{ 'duties-view__view-btn--active': viewMode === 'calendar' }"
            @click="viewMode = 'calendar'"
            title="Calendar Grid View"
          >
            <CalendarDays :size="14" />
            <span>Calendar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Duty Log: Table View vs Calendar View ────────────────── -->
    <template v-if="viewMode === 'table'">
    <div class="duties-view__table-card">
      
      <div v-if="filteredDuties.length === 0" class="duties-view__empty">
        <CalendarCheck :size="48" class="duties-view__empty-icon" />
        <h3 class="duties-view__empty-title">
          {{ duties.length === 0 ? `No Duties Recorded for ${activeSchoolYear}` : 'No Duties Matching Filter' }}
        </h3>
        <p class="duties-view__empty-desc">
          {{ duties.length === 0 
            ? 'Track your AM bus, hallway supervision, on-calls, and cafeteria duties in one unified hub.'
            : 'Try adjusting your search query or duty filter above.' }}
        </p>
        <div v-if="duties.length === 0" style="display: flex; gap: 10px; margin-top: 14px;">
          <button
            class="setup__btn-primary"
            @click="isAddModalOpen = true"
          >
            <Plus :size="15" /> Log Duty
          </button>
          <button
            class="setup__btn-ghost"
            @click="isImportModalOpen = true"
          >
            <Upload :size="15" /> Import Past Spreadsheet (.csv)
          </button>
        </div>
      </div>

      <div v-else class="duties-view__table-scroll">
        <table class="duties-view__table">
          <thead>
            <tr>
              <th
                style="min-width: 140px; cursor: pointer; user-select: none;"
                @click="toggleDateSort"
                title="Click to toggle sorting order (newest / oldest first)"
              >
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <span>Date</span>
                  <ArrowDown v-if="sortOrder === 'desc'" :size="13" style="color: var(--primary);" />
                  <ArrowUp v-else :size="13" style="color: var(--primary);" />
                </div>
              </th>
              <th style="min-width: 150px;">Duty</th>
              <th style="width: 120px;">Duration</th>
              <th style="width: 110px;">Time</th>
              <th style="min-width: 200px;">Notes</th>
              <th style="width: 140px; text-align: center;">Status</th>
              <th style="width: 120px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="duty in filteredDuties"
              :key="duty.dutyId"
              :class="{ 'duties-view__row--snow-day': duty.isSnowDay }"
            >
              <!-- Date -->
              <td class="duties-view__cell-date">
                <div class="duties-view__date-wrap">
                  <span class="duties-view__date-text">
                    {{ formatDateDisplay(duty.date) }}
                  </span>
                  <span class="duties-view__dow-text">
                    {{ getDayOfWeek(duty.date) }}
                  </span>
                </div>
              </td>

              <!-- Duty Name -->
              <td>
                <div class="duties-view__duty-badge-wrap">
                  <span class="duties-view__duty-name">{{ duty.dutyName }}</span>
                  <span
                    v-if="duty.isEmergency"
                    class="duties-view__tag duties-view__tag--emergency"
                  >
                    Emergency
                  </span>
                </div>
              </td>

              <!-- Duration -->
              <td>
                <span v-if="duty.isSnowDay" class="duties-view__duration--struck">
                  <span class="duties-view__strikethrough">{{ duty.duration }}m</span>
                  <span class="duties-view__duration-zero">0m</span>
                </span>
                <span v-else class="duties-view__duration">
                  {{ duty.duration }} min
                </span>
              </td>

              <!-- Time -->
              <td class="duties-view__cell-time">
                {{ formatTimeDisplay(duty.startTime) || '—' }}
              </td>

              <!-- Notes -->
              <td class="duties-view__cell-notes">
                <span v-if="duty.notes">{{ duty.notes }}</span>
                <span v-else class="duties-view__cell-empty">—</span>
              </td>

              <!-- Status / Snow Day Toggle -->
              <td style="text-align: center;">
                <button
                  type="button"
                  class="duties-view__status-btn"
                  :class="{ 'duties-view__status-btn--snow': duty.isSnowDay }"
                  @click="onToggleSnowDay(duty.dutyId)"
                  :title="duty.isSnowDay ? 'Click to mark as active' : 'Click to flag as Snow Day / Cancelled'"
                >
                  <CloudSnow v-if="duty.isSnowDay" :size="12" />
                  <Check v-else :size="12" />
                  <span>{{ duty.isSnowDay ? 'Snow Day' : 'Completed' }}</span>
                </button>
              </td>

              <!-- Actions -->
              <td style="text-align: right;">
                <div class="duties-view__action-btns">
                  <button
                    type="button"
                    class="duties-view__action-btn"
                    title="Download .ics calendar file for this duty week"
                    @click="onExportDutyWeek(duty)"
                  >
                    <Calendar :size="14" />
                  </button>

                  <a
                    v-if="getOutlookWebComposeUrl(duty)"
                    :href="getOutlookWebComposeUrl(duty)"
                    target="_blank"
                    rel="noopener"
                    class="duties-view__action-btn"
                    title="Open draft event in Outlook on the web"
                  >
                    <ExternalLink :size="14" />
                  </a>

                  <button
                    type="button"
                    class="duties-view__action-btn"
                    title="Edit duty entry"
                    @click="onEditDuty(duty)"
                  >
                    <Edit3 :size="14" />
                  </button>

                  <button
                    type="button"
                    class="duties-view__action-btn duties-view__action-btn--delete"
                    title="Delete duty entry"
                    @click="onDeleteDuty(duty)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </template>

    <template v-else-if="viewMode === 'calendar'">
      <DutyCalendarView
        :duties="duties"
        :filtered-duties="filteredDuties"
        :active-school-year="activeSchoolYear"
        :filter-duty-type="filterDutyType"
        :search-query="searchQuery"
        @add-duty="onAddDutyWithDate"
        @edit-duty="onEditDuty"
      />
    </template>
    </template>

    <!-- ── Mode 2: Multi-Year Insights & Analytics ─────────────────── -->
    <template v-else-if="activeViewTab === 'analytics'">
      <DutyAnalytics
        :active-school-year="activeSchoolYear"
        :available-school-years="availableSchoolYears"
      />
    </template>

    </div>

    <!-- ── Modals ──────────────────────────────────────────────────── -->
    <AddDutyModal
      :show="isAddModalOpen"
      :initial-date="addModalInitialDate"
      @close="isAddModalOpen = false; addModalInitialDate = ''"
    />

    <EditDutyModal
      :show="isEditModalOpen"
      :duty="editingDuty"
      @close="isEditModalOpen = false"
    />

    <ImportDutiesModal
      :show="isImportModalOpen"
      @close="isImportModalOpen = false"
      @imported="onDutiesImported"
    />

    <ExportDutyCalendarModal
      :show="isExportModalOpen"
      :duties="duties"
      @close="isExportModalOpen = false"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CloudSnow,
  Edit3,
  ExternalLink,
  List,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Upload
} from 'lucide-vue-next'
import { useDutyTracker } from '../composables/useDutyTracker.js'
import { useClassroom } from '../composables/useClassroom.js'
import { useMessage } from '../composables/useMessage.js'
import { getCurrentSchoolYear } from '../utils/dates.js'
import { getSemesterSchedule, getSchoolYearCalendarPace } from '../utils/dutyCalendarUtils.js'
import {
  downloadDutiesIcs,
  getOutlookWebComposeUrl,
  getWeekRangeForDate,
  groupDutiesByWeek,
  getLastEnteredWeek,
  downloadWeekDutiesIcs
} from '../utils/dutyCalendarExport.js'
import AddDutyModal from '../components/duties/AddDutyModal.vue'
import EditDutyModal from '../components/duties/EditDutyModal.vue'
import ImportDutiesModal from '../components/duties/ImportDutiesModal.vue'
import ExportDutyCalendarModal from '../components/duties/ExportDutyCalendarModal.vue'
import DutyAnalytics from '../components/duties/DutyAnalytics.vue'
import DutyCalendarView from '../components/duties/DutyCalendarView.vue'

const emit = defineEmits(['navigate'])

const {
  selectedYear: activeAppYear,
  academicTerms,
  nonSchoolDays
} = useClassroom()

const activeViewTab = ref('log') // 'log' (default) | 'analytics'

const {
  duties,
  activeSchoolYear,
  availableSchoolYears,
  completedMinutes,
  allottedMinutes,
  remainingMinutes,
  completionRatio,
  percentComplete,
  emergencyCount,
  emergencyCap,
  dutyBreakdown,
  refreshAvailableYears,
  loadSettings,
  loadDuties,
  deleteDuty,
  toggleSnowDay
} = useDutyTracker()

// Semester Schedule & Calendar Pace (pulling official board calendar & custom terms)
const semesterSchedule = computed(() => {
  return getSemesterSchedule(activeSchoolYear.value, academicTerms?.value || [])
})

const calendarPace = computed(() => {
  return getSchoolYearCalendarPace(
    activeSchoolYear.value,
    nonSchoolDays?.value || [],
    academicTerms?.value || [],
    { percentComplete: percentComplete.value }
  )
})

const sem1DisplayDate = computed(() => semesterSchedule.value.sem1Display)
const sem2DisplayDate = computed(() => semesterSchedule.value.sem2Display)
const sem2TargetMinutes = computed(() => Math.round(allottedMinutes.value * 0.5))
const sem2MarkerPercent = computed(() => calendarPace.value.sem2MarkerPercent || 50)

const { confirm } = useMessage()

const currentSystemYear = getCurrentSchoolYear()

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isImportModalOpen = ref(false)
const isExportModalOpen = ref(false)
const editingDuty = ref(null)
const addModalInitialDate = ref('')

// View mode: 'table' | 'calendar'
const viewMode = ref(localStorage.getItem('duties_view_mode') || 'table')

watch(viewMode, (newMode) => {
  try {
    localStorage.setItem('duties_view_mode', newMode)
  } catch (e) {
    // ignore
  }
})

function onAddDutyWithDate(dateIso) {
  addModalInitialDate.value = dateIso || ''
  isAddModalOpen.value = true
}

const lastEnteredWeek = computed(() => getLastEnteredWeek(duties.value))

// Consolidated Duty Tools Dropdown State & Click-outside handling
const isDutyToolsOpen = ref(false)
const dutyToolsContainer = ref(null)

function handleClickOutside(e) {
  if (isDutyToolsOpen.value && dutyToolsContainer.value && !dutyToolsContainer.value.contains(e.target)) {
    isDutyToolsOpen.value = false
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && isDutyToolsOpen.value) {
    isDutyToolsOpen.value = false
  }
}

const searchQuery = ref('')
const filterDutyType = ref('')
const sortOrder = ref('desc') // Default: newest duties at the top

function toggleDateSort() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
  await loadSettings()
  await refreshAvailableYears()
  if (activeAppYear?.value && availableSchoolYears.value.includes(activeAppYear.value)) {
    activeSchoolYear.value = activeAppYear.value
  }
  await loadDuties(activeSchoolYear.value)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})

watch(activeSchoolYear, async (newYr) => {
  if (newYr) {
    await loadDuties(newYr)
  }
})

async function onYearChange() {
  await loadDuties(activeSchoolYear.value)
}

function onOpenSettings() {
  emit('navigate', 'Setup', { tab: 'duties' })
}

function onExportLastEnteredWeek() {
  if (!lastEnteredWeek.value) return
  downloadWeekDutiesIcs(lastEnteredWeek.value)
}

function onExportDutyWeek(duty) {
  if (!duty || !duty.date) return
  const range = getWeekRangeForDate(duty.date)
  if (!range) return
  const weekDuties = duties.value.filter(d => !d.isSnowDay && d.date && d.date >= range.mondayIso && d.date <= range.fridayIso)
  if (weekDuties.length === 0) return
  downloadDutiesIcs(weekDuties, `duties_${range.mondayIso}_to_${range.fridayIso}.ics`)
}

async function onDutiesImported(count) {
  await refreshAvailableYears()
  await loadDuties(activeSchoolYear.value)
}

const dutyTypesList = computed(() => {
  const set = new Set()
  duties.value.forEach(d => { if (d.dutyName) set.add(d.dutyName) })
  return Array.from(set).sort()
})

const filteredDuties = computed(() => {
  let list = [...duties.value]

  if (filterDutyType.value) {
    list = list.filter(d => d.dutyName === filterDutyType.value)
  }

  if (searchQuery.value && searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(d => {
      const matchName = (d.dutyName || '').toLowerCase().includes(q)
      const matchNotes = (d.notes || '').toLowerCase().includes(q)
      const matchDate = (d.date || '').toLowerCase().includes(q)
      return matchName || matchNotes || matchDate
    })
  }

  list.sort((a, b) => {
    const cmp = (a.date || '').localeCompare(b.date || '')
    return sortOrder.value === 'desc' ? -cmp : cmp
  })

  return list
})

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDayOfWeek(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString([], { weekday: 'short' })
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

async function onToggleSnowDay(dutyId) {
  await toggleSnowDay(dutyId)
}

function onEditDuty(duty) {
  editingDuty.value = duty
  isEditModalOpen.value = true
}

async function onDeleteDuty(duty) {
  const confirmed = await confirm(
    `Delete duty entry "${duty.dutyName}" on ${duty.date}?`,
    'Delete Duty',
    { danger: true }
  )
  if (confirmed) {
    await deleteDuty(duty.dutyId)
  }
}
</script>

<style scoped>
.duties-view {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}

.duties-view__container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 24px 48px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* ── Header ── */
.duties-view__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.duties-view__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ── Mode Switcher Tabs ── */
.duties-view__mode-tabs {
  display: flex;
  background: var(--bg-secondary, #f2f2f7);
  padding: 3px;
  border-radius: var(--radius-md, 10px);
  gap: 3px;
  border: 1px solid var(--border);
}

.duties-view__mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.84rem;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.duties-view__mode-btn:hover {
  color: var(--text-primary);
}

.duties-view__mode-btn--active {
  background: var(--surface, #ffffff);
  color: var(--primary, #4663ac);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.duties-view__year-selector-wrap {
  display: flex;
  align-items: center;
}

.duties-view__year-select {
  font-weight: 600;
  font-size: 0.88rem;
  padding: 6px 12px;
  color: var(--primary, #4663ac);
  background: var(--bg-secondary, #f2f2f7);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
}

.duties-view__header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.duties-view__header-right .setup__btn-ghost,
.duties-view__header-right .setup__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* ── Duty Tools Dropdown ── */
.duties-dropdown-container {
  position: relative;
  display: inline-block;
}

.duties-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  font-size: 0.86rem;
  font-weight: 500;
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.duties-dropdown-trigger--active {
  background: var(--bg-secondary, #f2f2f7);
  color: var(--primary, #4663ac);
  border-color: var(--primary, #4663ac);
}

.duties-dropdown-chevron {
  transition: transform 0.2s ease;
  color: var(--text-secondary);
}

.duties-dropdown-chevron--expanded {
  transform: rotate(180deg);
}

.duties-dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 12px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  z-index: 100;
  min-width: 220px;
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  animation: dutiesDropdownFadeIn 0.15s ease-out;
}

body.dark-theme .duties-dropdown-menu,
:root[data-theme="dark"] .duties-dropdown-menu {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  border-color: rgba(255, 255, 255, 0.12);
}

@keyframes dutiesDropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.duties-dropdown-header {
  padding: 8px 14px 4px 14px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.duties-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 14px;
  background: transparent;
  border: none;
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--text, #1c1c1e);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.duties-dropdown-item:hover:not(:disabled) {
  background: var(--surface-hover, rgba(0, 0, 0, 0.05));
  color: var(--primary, #4663ac);
}

.duties-dropdown-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.duties-dropdown-item__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.duties-dropdown-item__subtext {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.duties-dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

/* ── Unified Compact Command Center Hero Card ── */
.duty-hero-card {
  display: flex;
  flex-direction: column;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.duty-hero-card__body {
  padding: 16px 20px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 3-Column Equal KPI Row */
.duty-progress-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: flex-end;
}

@media (max-width: 768px) {
  .duty-progress-metrics {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
}

.duty-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.duty-metric__label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.duty-metric__val-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.duty-metric__big {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.duty-metric__big--success {
  color: #16a34a;
}

.duty-metric__big--warn {
  color: #ea580c;
}

.duty-metric__context {
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.duty-metric__pct-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary, #4663ac);
  background: rgba(70, 99, 172, 0.1);
  padding: 2px 7px;
  border-radius: 999px;
  line-height: 1.2;
}

.duty-metric__emergency-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 999px;
  line-height: 1.2;
}

.duty-metric__emergency-badge--ok {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-secondary);
}

.duty-metric__emergency-badge--alert {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

body.dark-theme .duty-metric__pct-badge {
  background: rgba(96, 165, 250, 0.18);
  color: #93c5fd;
}

body.dark-theme .duty-metric__emergency-badge--ok {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

body.dark-theme .duty-metric__emergency-badge--alert {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

/* Horizontal Bar */
.duty-bar-wrap {
  position: relative;
  width: 100%;
  margin: 4px 0 2px 0;
}

.duty-bar-track {
  position: relative;
  width: 100%;
  height: 11px;
  background: var(--bg-secondary, #e2e8f0);
  border-radius: 999px;
  overflow: visible;
}

.duty-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4663ac 0%, #60a5fa 100%);
  border-radius: 999px;
  transition: width 0.4s ease;
}

/* Semester 2 & Calendar Markers */
.duty-bar-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  transform: translateX(-50%);
  pointer-events: auto;
  z-index: 3;
}

.duty-bar-marker--sem2 .duty-bar-marker__line {
  position: absolute;
  top: -5px;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 2.5px;
  background: #d97706;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(217, 119, 6, 0.45);
}

.duty-bar-marker__badge {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  letter-spacing: 0.02em;
  pointer-events: none;
}

.duty-bar-marker--today .duty-bar-marker__today-indicator {
  position: absolute;
  top: -4px;
  left: 50%;
  width: 7px;
  height: 7px;
  background: #2563eb;
  transform: translateX(-50%) rotate(45deg);
  border: 1.5px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

/* Below-Bar Timeline Labels */
.duty-bar-timeline {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 10px;
  font-size: 0.73rem;
  color: var(--text-secondary);
  width: 100%;
  min-height: 18px;
}

.duty-bar-timeline__point {
  font-weight: 500;
  line-height: 1.2;
}

.duty-bar-timeline__point--start {
  text-align: left;
}

.duty-bar-timeline__point--sem2 {
  position: absolute;
  transform: translateX(-50%);
  text-align: center;
  color: #b45309;
  white-space: nowrap;
}

.duty-bar-timeline__point--end {
  text-align: right;
}

.duty-bar-timeline__sem2-label {
  color: #92400e;
  font-weight: 700;
}

.duty-bar-timeline__sub {
  font-size: 0.68rem;
  opacity: 0.85;
  margin-left: 2px;
}

/* Integrated School Year Calendar Pace Row */
.duty-bar-pace {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 7px;
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.duty-bar-pace__calendar {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
}

.duty-bar-pace__calendar strong {
  color: var(--text-primary);
  font-weight: 600;
}

.duty-bar-pace__cal-icon {
  color: var(--text-secondary);
  opacity: 0.8;
  flex-shrink: 0;
}

.duty-bar-pace__sep {
  color: var(--border, #cbd5e1);
  font-size: 0.65rem;
  user-select: none;
}

.duty-bar-pace__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 0.74rem;
  padding: 2px 8px;
  border-radius: 999px;
  line-height: 1.3;
}

.duty-bar-pace__status-icon {
  flex-shrink: 0;
}

.duty-bar-pace__status--on-track {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.duty-bar-pace__status--ahead {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.duty-bar-pace__status--behind {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.duty-bar-pace__status--completed,
.duty-bar-pace__status--upcoming {
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-secondary);
  border: 1px solid rgba(100, 116, 139, 0.2);
}

body.dark-theme .duty-bar-marker__badge {
  background: #78350f;
  color: #fef3c7;
  border-color: #92400e;
}

body.dark-theme .duty-bar-timeline__point--sem2 {
  color: #f59e0b;
}

body.dark-theme .duty-bar-timeline__sem2-label {
  color: #fbbf24;
}

body.dark-theme .duty-bar-pace__status--on-track {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.35);
}

body.dark-theme .duty-bar-pace__status--ahead {
  background: rgba(59, 130, 246, 0.18);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.35);
}

body.dark-theme .duty-bar-pace__status--behind {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.35);
}

.duty-bar-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.duty-bar-footer__ratio strong {
  color: var(--text-primary);
}

.duty-status-complete {
  color: #16a34a;
  font-weight: 600;
}

.duty-status-over {
  color: #0284c7;
  font-weight: 600;
}

/* ── Integrated Breakdown Footer inside Hero Card ── */
.duty-hero-card__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 20px;
  background: var(--bg-secondary, #f8fafc);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

body.dark-theme .duty-hero-card__footer {
  background: rgba(0, 0, 0, 0.2);
}

.duty-hero-card__footer-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.duty-hero-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.duty-hero-card__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  font-size: 0.76rem;
  color: var(--text-primary);
  line-height: 1.2;
}

.duty-hero-card__chip strong {
  color: var(--primary, #4663ac);
  font-weight: 600;
}

/* ── Toolbar ── */
.duties-view__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.duties-view__toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.duties-view__search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.duties-view__search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}

.duties-view__search-input {
  padding-left: 32px;
  width: 320px;
  max-width: 100%;
}

.duties-view__filter-select {
  width: 160px;
}

.duties-view__toolbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.duties-view__count-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.duties-view__view-toggle {
  display: inline-flex;
  align-items: center;
  background: var(--bg-secondary, #f2f2f7);
  padding: 3px;
  border-radius: var(--radius-sm, 8px);
  gap: 2px;
  border: 1px solid var(--border);
}

.duties-view__view-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.82rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.duties-view__view-btn:hover {
  color: var(--text-primary);
}

.duties-view__view-btn--active {
  background: var(--surface, #ffffff);
  color: var(--primary, #4663ac);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* ── Table Card ── */
.duties-view__table-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.duties-view__table-scroll {
  overflow-x: auto;
}

.duties-view__table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.84rem;
}

.duties-view__table th {
  padding: 7px 12px;
  background: var(--bg-secondary, #f2f2f7);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.76rem;
  border-bottom: 1px solid var(--border);
}

.duties-view__table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.05));
  vertical-align: middle;
}

.duties-view__table tr:last-child td {
  border-bottom: none;
}

.duties-view__row--snow-day td {
  background: rgba(2, 132, 199, 0.04);
}

.duties-view__cell-date {
  white-space: nowrap;
}

.duties-view__date-wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.duties-view__date-text {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.84rem;
}

.duties-view__dow-text {
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.duties-view__duty-badge-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.duties-view__duty-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.84rem;
}

.duties-view__tag {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}

.duties-view__tag--emergency {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.duties-view__duration {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.82rem;
}

.duties-view__duration--struck {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.duties-view__strikethrough {
  text-decoration: line-through;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.duties-view__duration-zero {
  color: #0284c7;
  font-weight: 700;
  font-size: 0.82rem;
}

.duties-view__cell-time {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.duties-view__cell-notes {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.duties-view__cell-empty {
  color: var(--border);
}

.duties-view__status-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.2;
}

.duties-view__status-btn:hover {
  filter: brightness(0.95);
}

.duties-view__status-btn--snow {
  border-color: rgba(2, 132, 199, 0.3);
  background: rgba(2, 132, 199, 0.1);
  color: #0284c7;
}

.duties-view__action-btns {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.duties-view__action-btn {
  padding: 4px;
  border-radius: var(--radius-sm, 6px);
  color: var(--text-secondary);
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: all 0.15s ease;
}

.duties-view__action-btn:hover {
  background: var(--bg-secondary, #f2f2f7);
  color: var(--text-primary);
}

.duties-view__action-btn--delete:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* ── Empty State ── */
.duties-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 20px;
  text-align: center;
}

.duties-view__empty-icon {
  color: var(--text-secondary);
  opacity: 0.4;
  margin-bottom: 12px;
}

.duties-view__empty-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px 0;
}

.duties-view__empty-desc {
  font-size: 0.88rem;
  color: var(--text-secondary);
  max-width: 420px;
  margin: 0;
}
</style>
