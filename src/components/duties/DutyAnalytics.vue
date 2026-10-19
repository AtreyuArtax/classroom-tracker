<template>
  <div class="duty-analytics">

    <!-- ── Scope Bar: School Year (Default) vs All-Time Career ────────── -->
    <div class="duty-analytics__scope-bar">
      <div class="duty-analytics__scope-left">
        <span class="duty-analytics__scope-label">Analytics Scope:</span>
        <div class="duty-analytics__scope-tabs" role="group" aria-label="Duty Analytics Scope">
          <button
            type="button"
            class="duty-analytics__scope-btn"
            :class="{ 'duty-analytics__scope-btn--active': selectedScope === 'year' }"
            @click="selectedScope = 'year'"
          >
            <Calendar :size="14" />
            <span>{{ selectedYear }} {{ selectedYear === currentSystemYear ? '(Current Year)' : 'School Year' }}</span>
          </button>
          <button
            type="button"
            class="duty-analytics__scope-btn"
            :class="{ 'duty-analytics__scope-btn--active': selectedScope === 'career' }"
            @click="selectedScope = 'career'"
          >
            <Layers :size="14" />
            <span>All-Time Career ({{ allSchoolYearsList.length }} Years)</span>
          </button>
        </div>
      </div>

      <!-- Year Selector Dropdown (visible in 'year' scope mode) -->
      <div v-if="selectedScope === 'year'" class="duty-analytics__scope-year-picker">
        <span class="duty-analytics__scope-picker-label">Switch Year:</span>
        <select
          v-model="selectedYear"
          class="setup__input duty-analytics__year-select"
          aria-label="Select school year for analytics"
        >
          <option
            v-for="yr in allSchoolYearsList"
            :key="yr"
            :value="yr"
          >
            {{ yr }} {{ yr === currentSystemYear ? '(Current)' : '' }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="duty-analytics__loading">
      <div class="duty-analytics__spinner"></div>
      <span>Loading duty analytics...</span>
    </div>

    <template v-else>
      <!-- ═════════════════════════════════════════════════════════════════ -->
      <!-- VIEW 1: SPECIFIC SCHOOL YEAR (Default: Current Year 2026-27)    -->
      <!-- ═════════════════════════════════════════════════════════════════ -->
      <template v-if="selectedScope === 'year'">
        
        <!-- ── 1. Year KPI Cards ─────────────────────────────────────── -->
        <div class="duty-analytics__kpi-grid">
          
          <!-- Duty Time Logged This Year -->
          <div class="duty-analytics__kpi-card">
            <div class="duty-analytics__kpi-icon-wrap" style="background: rgba(70, 99, 172, 0.1); color: var(--primary, #4663ac);">
              <Clock :size="22" />
            </div>
            <div class="duty-analytics__kpi-content">
              <span class="duty-analytics__kpi-label">Duty Time Logged ({{ selectedYear }})</span>
              <div class="duty-analytics__kpi-value-row">
                <strong class="duty-analytics__kpi-big">{{ yearMinutes.toLocaleString() }}</strong>
                <span class="duty-analytics__kpi-unit">min</span>
              </div>
              <span class="duty-analytics__kpi-subtext">
                {{ yearPercentComplete }}% of {{ allottedMinutes }} min benchmark ({{ yearDutiesCount }} duties)
              </span>
            </div>
          </div>

          <!-- Remaining Minutes in Bank -->
          <div class="duty-analytics__kpi-card">
            <div
              class="duty-analytics__kpi-icon-wrap"
              :style="yearRemainingMinutes <= 0 ? 'background: rgba(16, 185, 129, 0.1); color: #10b981;' : 'background: rgba(245, 158, 11, 0.1); color: #f59e0b;'"
            >
              <Award :size="22" />
            </div>
            <div class="duty-analytics__kpi-content">
              <span class="duty-analytics__kpi-label">Remaining in Bank</span>
              <div class="duty-analytics__kpi-value-row">
                <strong class="duty-analytics__kpi-big">
                  {{ (yearRemainingMinutes > 0 ? yearRemainingMinutes : 0).toLocaleString() }}
                </strong>
                <span class="duty-analytics__kpi-unit">min left</span>
              </div>
              <span class="duty-analytics__kpi-subtext">
                <template v-if="yearRemainingMinutes > 0">
                  ≈ {{ (yearRemainingMinutes / 75).toFixed(1) }} weekly periods remaining
                </template>
                <template v-else>
                  Annual duty benchmark satisfied!
                </template>
              </span>
            </div>
          </div>

          <!-- Top Duty Post This Year -->
          <div class="duty-analytics__kpi-card">
            <div class="duty-analytics__kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
              <Award :size="22" />
            </div>
            <div class="duty-analytics__kpi-content">
              <span class="duty-analytics__kpi-label">Top Post ({{ selectedYear }})</span>
              <div class="duty-analytics__kpi-value-row">
                <strong class="duty-analytics__kpi-big" style="font-size: 1.15rem;">{{ yearTopPost.name }}</strong>
              </div>
              <span class="duty-analytics__kpi-subtext">
                {{ yearTopPost.minutes }} min across {{ yearTopPost.count }} duties ({{ yearTopPost.pct }}% of year)
              </span>
            </div>
          </div>

          <!-- Emergency On-Calls This Year -->
          <div class="duty-analytics__kpi-card">
            <div class="duty-analytics__kpi-icon-wrap" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">
              <ShieldAlert :size="22" />
            </div>
            <div class="duty-analytics__kpi-content">
              <span class="duty-analytics__kpi-label">Emergency On-Calls</span>
              <div class="duty-analytics__kpi-value-row">
                <strong class="duty-analytics__kpi-big">{{ yearEmergencyCount }}</strong>
                <span class="duty-analytics__kpi-unit">calls</span>
              </div>
              <span class="duty-analytics__kpi-subtext">
                <template v-if="emergencyCap > 0">
                  {{ yearEmergencyCount >= emergencyCap ? 'Annual on-call cap reached' : `${Math.max(0, emergencyCap - yearEmergencyCount)} on-calls remaining before cap` }}
                </template>
                <template v-else>
                  Stepped in when unexpected coverage was needed
                </template>
              </span>
            </div>
          </div>

        </div>

        <!-- ── 2. Charts Row: Pie Graph & Weekday Distribution ───────── -->
        <div class="duty-analytics__charts-grid">
          
          <!-- Duty Distribution Pie Graph -->
          <div class="duty-analytics__card duty-analytics__card--chart">
            <div class="duty-analytics__card-header">
              <div class="duty-analytics__card-title-wrap">
                <PieChart :size="18" class="duty-analytics__title-icon" />
                <h3 class="duty-analytics__card-title">Duty Distribution ({{ selectedYear }})</h3>
              </div>
              <span class="duty-analytics__card-hint">By duty minutes</span>
            </div>

            <div class="duty-analytics__chart-wrapper">
              <Pie
                v-if="chartDataPie.labels.length > 0"
                :data="chartDataPie"
                :options="chartOptionsPie"
              />
              <div v-else class="duty-analytics__empty-chart">
                No duties recorded for {{ selectedYear }} yet.
              </div>
            </div>
          </div>

          <!-- Day of the Week Distribution -->
          <div class="duty-analytics__card duty-analytics__card--chart">
            <div class="duty-analytics__card-header">
              <div class="duty-analytics__card-title-wrap">
                <Calendar :size="18" class="duty-analytics__title-icon" />
                <h3 class="duty-analytics__card-title">Day-of-the-Week Load ({{ selectedYear }})</h3>
              </div>
              <span v-if="yearPeakDay.count > 0" class="duty-analytics__badge-highlight">
                Peak: {{ yearPeakDay.day }} ({{ yearPeakDay.count }})
              </span>
            </div>

            <div class="duty-analytics__chart-wrapper">
              <Bar
                v-if="chartDataDaysYear.labels.length > 0"
                :data="chartDataDaysYear"
                :options="chartOptionsDays"
              />
              <div v-else class="duty-analytics__empty-chart">No weekday duties recorded.</div>
            </div>
          </div>

        </div>

        <!-- ── 3. Bottom Row: Year Breakdown Table & Semester Balance ── -->
        <div class="duty-analytics__bottom-grid">
          
          <!-- Duty Post Breakdown Table for Selected Year -->
          <div class="duty-analytics__card">
            <div class="duty-analytics__card-header">
              <div class="duty-analytics__card-title-wrap">
                <Layers :size="18" class="duty-analytics__title-icon" />
                <h3 class="duty-analytics__card-title">Duty Breakdown Table ({{ selectedYear }})</h3>
              </div>
              <span class="duty-analytics__card-hint">{{ yearDutyBreakdown.length }} duty types</span>
            </div>

            <div class="duty-analytics__table-wrap">
              <table class="duty-analytics__table">
                <thead>
                  <tr>
                    <th>Duty Name</th>
                    <th style="width: 80px; text-align: right;">Count</th>
                    <th style="width: 100px; text-align: right;">Total Min</th>
                    <th style="width: 130px; text-align: right;">% of Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in yearDutyBreakdown" :key="item.name">
                    <td style="font-weight: 600;">
                      <span class="duty-analytics__dot" :style="{ backgroundColor: item.color }"></span>
                      {{ item.name }}
                    </td>
                    <td style="text-align: right; color: var(--text-secondary);">{{ item.count }}×</td>
                    <td style="text-align: right; font-weight: 600;">{{ item.minutes.toLocaleString() }}m</td>
                    <td style="text-align: right;">
                      <div class="duty-analytics__bar-cell">
                        <span class="duty-analytics__pct-text">{{ item.percentage }}%</span>
                        <div class="duty-analytics__mini-bar-bg">
                          <div
                            class="duty-analytics__mini-bar-fill"
                            :style="{ width: `${item.percentage}%`, backgroundColor: item.color }"
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="yearDutyBreakdown.length === 0">
                    <td colspan="4" class="duty-analytics__empty-state">
                      No duty entries logged for {{ selectedYear }} yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Colleague Coverages & Semester Pace -->
          <div class="duty-analytics__card">
            <div class="duty-analytics__card-header">
              <div class="duty-analytics__card-title-wrap">
                <HeartHandshake :size="18" class="duty-analytics__title-icon" style="color: #ec4899;" />
                <h3 class="duty-analytics__card-title">Colleagues Covered ({{ selectedYear }})</h3>
              </div>
              <span class="duty-analytics__card-hint">From on-call notes</span>
            </div>

            <p class="duty-analytics__card-desc">
              Colleagues you stepped in to cover for during prep-period on-calls in {{ selectedYear }}:
            </p>

            <div v-if="yearColleagues.length > 0" class="duty-analytics__colleague-list">
              <div
                v-for="(teacher, idx) in yearColleagues"
                :key="teacher.name"
                class="duty-analytics__colleague-pill"
              >
                <div class="duty-analytics__colleague-rank">#{{ idx + 1 }}</div>
                <div class="duty-analytics__colleague-name">{{ teacher.name }}</div>
                <div class="duty-analytics__colleague-count">{{ teacher.count }}× covered</div>
              </div>
            </div>
            <div v-else class="duty-analytics__empty-state">
              No colleague on-call coverages logged in {{ selectedYear }}.
            </div>

            <!-- Semester Balance Card -->
            <div class="duty-analytics__semester-box">
              <h4 class="duty-analytics__subheading">
                <Sparkles :size="15" /> Semester Balance Pace ({{ selectedYear }})
              </h4>
              <div class="duty-analytics__semester-bars">
                <div class="duty-analytics__sem-row">
                  <span class="duty-analytics__sem-label">{{ yearSemesterPace.sem1Label }}:</span>
                  <strong class="duty-analytics__sem-val">{{ yearSemesterPace.sem1Count }} duties ({{ yearSemesterPace.sem1Pct }}%)</strong>
                </div>
                <div class="duty-analytics__sem-row">
                  <span class="duty-analytics__sem-label">{{ yearSemesterPace.sem2Label }}:</span>
                  <strong class="duty-analytics__sem-val">{{ yearSemesterPace.sem2Count }} duties ({{ yearSemesterPace.sem2Pct }}%)</strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </template>

      <!-- ═════════════════════════════════════════════════════════════════ -->
      <!-- VIEW 2: ALL-TIME CAREER (Multi-Year Historical Comparison)      -->
      <!-- ═════════════════════════════════════════════════════════════════ -->
      <template v-else-if="selectedScope === 'career'">
        
        <!-- Career Lifetime Superlative KPIs -->
        <div class="duty-analytics__kpi-grid">
          
          <!-- Career Time -->
          <div class="duty-analytics__kpi-card">
            <div class="duty-analytics__kpi-icon-wrap" style="background: rgba(70, 99, 172, 0.1); color: var(--primary, #4663ac);">
              <Clock :size="22" />
            </div>
            <div class="duty-analytics__kpi-content">
              <span class="duty-analytics__kpi-label">Lifetime Duty Time</span>
              <div class="duty-analytics__kpi-value-row">
                <strong class="duty-analytics__kpi-big">{{ careerMinutes.toLocaleString() }}</strong>
                <span class="duty-analytics__kpi-unit">min</span>
              </div>
              <span class="duty-analytics__kpi-subtext">
                ≈ {{ careerHours }} hours ({{ careerDays }} full 24h days)
              </span>
            </div>
          </div>

          <!-- Total Duties Logged Career -->
          <div class="duty-analytics__kpi-card">
            <div class="duty-analytics__kpi-icon-wrap" style="background: rgba(13, 148, 136, 0.1); color: #0d9488;">
              <Layers :size="22" />
            </div>
            <div class="duty-analytics__kpi-content">
              <span class="duty-analytics__kpi-label">Total Duties Logged</span>
              <div class="duty-analytics__kpi-value-row">
                <strong class="duty-analytics__kpi-big">{{ totalDutiesCount.toLocaleString() }}</strong>
                <span class="duty-analytics__kpi-unit">duties</span>
              </div>
              <span class="duty-analytics__kpi-subtext">
                Across {{ sortedYears.length }} school years (avg {{ avgDutiesPerYear }} / yr)
              </span>
            </div>
          </div>

          <!-- Top Duty Post Career -->
          <div class="duty-analytics__kpi-card">
            <div class="duty-analytics__kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
              <Award :size="22" />
            </div>
            <div class="duty-analytics__kpi-content">
              <span class="duty-analytics__kpi-label">Most Frequent Post</span>
              <div class="duty-analytics__kpi-value-row">
                <strong class="duty-analytics__kpi-big" style="font-size: 1.15rem;">{{ careerTopPost.name }}</strong>
              </div>
              <span class="duty-analytics__kpi-subtext">
                {{ careerTopPost.count }} duties logged ({{ careerTopPost.pct }}% of career)
              </span>
            </div>
          </div>

          <!-- Emergency Coverages -->
          <div class="duty-analytics__kpi-card">
            <div class="duty-analytics__kpi-icon-wrap" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">
              <ShieldAlert :size="22" />
            </div>
            <div class="duty-analytics__kpi-content">
              <span class="duty-analytics__kpi-label">Emergency On-Calls</span>
              <div class="duty-analytics__kpi-value-row">
                <strong class="duty-analytics__kpi-big">{{ totalEmergencyCount }}</strong>
                <span class="duty-analytics__kpi-unit">calls</span>
              </div>
              <span class="duty-analytics__kpi-subtext">
                {{ careerOnCallMinutes.toLocaleString() }} min of colleague coverage
              </span>
            </div>
          </div>

        </div>

        <!-- Charts Row: Multi-Year Load & Day-of-Week Bias -->
        <div class="duty-analytics__charts-grid">
          
          <!-- Multi-Year Load Chart -->
          <div class="duty-analytics__card duty-analytics__card--chart">
            <div class="duty-analytics__card-header">
              <div class="duty-analytics__card-title-wrap">
                <BarChart2 :size="18" class="duty-analytics__title-icon" />
                <h3 class="duty-analytics__card-title">Annual Duty Minutes (Year-over-Year)</h3>
              </div>
              <span class="duty-analytics__card-hint">Goal: {{ allottedMinutes }} min / yr</span>
            </div>

            <div class="duty-analytics__chart-wrapper">
              <Bar
                v-if="chartDataYears.labels.length > 0"
                :data="chartDataYears"
                :options="chartOptionsYears"
              />
              <div v-else class="duty-analytics__empty-chart">Loading trend data...</div>
            </div>
          </div>

          <!-- Day of the Week Bias Chart -->
          <div class="duty-analytics__card duty-analytics__card--chart">
            <div class="duty-analytics__card-header">
              <div class="duty-analytics__card-title-wrap">
                <Calendar :size="18" class="duty-analytics__title-icon" />
                <h3 class="duty-analytics__card-title">Career Day-of-the-Week Load</h3>
              </div>
              <span class="duty-analytics__badge-highlight">
                Peak: {{ careerPeakDay.day }} ({{ careerPeakDay.count }})
              </span>
            </div>

            <div class="duty-analytics__chart-wrapper">
              <Bar
                v-if="chartDataDaysCareer.labels.length > 0"
                :data="chartDataDaysCareer"
                :options="chartOptionsDays"
              />
              <div v-else class="duty-analytics__empty-chart">Loading day data...</div>
            </div>
          </div>

        </div>

        <!-- Bottom Row: Duty Breakdown & Colleague Lifesaver -->
        <div class="duty-analytics__bottom-grid">
          
          <!-- Career Duty Breakdown by Post -->
          <div class="duty-analytics__card">
            <div class="duty-analytics__card-header">
              <div class="duty-analytics__card-title-wrap">
                <Layers :size="18" class="duty-analytics__title-icon" />
                <h3 class="duty-analytics__card-title">Career Duty Breakdown by Post</h3>
              </div>
              <span class="duty-analytics__card-hint">{{ careerDutyBreakdown.length }} duty types</span>
            </div>

            <div class="duty-analytics__table-wrap">
              <table class="duty-analytics__table">
                <thead>
                  <tr>
                    <th>Duty Name</th>
                    <th style="width: 80px; text-align: right;">Count</th>
                    <th style="width: 100px; text-align: right;">Total Min</th>
                    <th style="width: 130px; text-align: right;">% of Career</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in careerDutyBreakdown" :key="item.name">
                    <td style="font-weight: 600;">{{ item.name }}</td>
                    <td style="text-align: right; color: var(--text-secondary);">{{ item.count }}×</td>
                    <td style="text-align: right; font-weight: 600;">{{ item.minutes.toLocaleString() }}m</td>
                    <td style="text-align: right;">
                      <div class="duty-analytics__bar-cell">
                        <span class="duty-analytics__pct-text">{{ item.percentage }}%</span>
                        <div class="duty-analytics__mini-bar-bg">
                          <div
                            class="duty-analytics__mini-bar-fill"
                            :style="{ width: `${item.percentage}%` }"
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Colleague Lifesaver Hall of Fame -->
          <div class="duty-analytics__card">
            <div class="duty-analytics__card-header">
              <div class="duty-analytics__card-title-wrap">
                <HeartHandshake :size="18" class="duty-analytics__title-icon" style="color: #ec4899;" />
                <h3 class="duty-analytics__card-title">Colleague On-Call Coverages (All-Time)</h3>
              </div>
              <span class="duty-analytics__card-hint">Extracted from on-call notes</span>
            </div>

            <p class="duty-analytics__card-desc">
              Teachers you stepped in to cover for during prep-period on-calls across all years:
            </p>

            <div v-if="careerColleagues.length > 0" class="duty-analytics__colleague-list">
              <div
                v-for="(teacher, idx) in careerColleagues"
                :key="teacher.name"
                class="duty-analytics__colleague-pill"
              >
                <div class="duty-analytics__colleague-rank">#{{ idx + 1 }}</div>
                <div class="duty-analytics__colleague-name">{{ teacher.name }}</div>
                <div class="duty-analytics__colleague-count">{{ teacher.count }}× covered</div>
              </div>
            </div>
            <div v-else class="duty-analytics__empty-state">
              No specific colleague names detected in on-call notes.
            </div>

            <!-- Semester Balance Card -->
            <div class="duty-analytics__semester-box">
              <h4 class="duty-analytics__subheading">
                <Sparkles :size="15" /> Career Semester Balance Pace
              </h4>
              <div class="duty-analytics__semester-bars">
                <div class="duty-analytics__sem-row">
                  <span class="duty-analytics__sem-label">Semester 1 (Fall):</span>
                  <strong class="duty-analytics__sem-val">{{ careerSemesterPace.sem1Count }} duties ({{ careerSemesterPace.sem1Pct }}%)</strong>
                </div>
                <div class="duty-analytics__sem-row">
                  <span class="duty-analytics__sem-label">Semester 2 (Spring):</span>
                  <strong class="duty-analytics__sem-val">{{ careerSemesterPace.sem2Count }} duties ({{ careerSemesterPace.sem2Pct }}%)</strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </template>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js'
import { Bar, Pie } from 'vue-chartjs'
import {
  Award,
  BarChart2,
  Calendar,
  Clock,
  HeartHandshake,
  Layers,
  PieChart,
  ShieldAlert,
  Sparkles
} from 'lucide-vue-next'
import { useDutyTracker } from '../../composables/useDutyTracker.js'
import { useClassroom } from '../../composables/useClassroom.js'
import { getCurrentSchoolYear } from '../../utils/dates.js'
import { getSemesterSchedule } from '../../utils/dutyCalendarUtils.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const props = defineProps({
  activeSchoolYear: {
    type: String,
    default: ''
  },
  availableSchoolYears: {
    type: Array,
    default: () => []
  }
})

const { academicTerms } = useClassroom()
const { dutySettings, getAllDuties } = useDutyTracker()

const currentSystemYear = getCurrentSchoolYear()
const allDuties = ref([])
const isLoading = ref(true)

// Analytics Scope: 'year' (Default, shows Pie Chart for active year) vs 'career' (All-time multi-year)
const selectedScope = ref('year')
const selectedYear = ref(props.activeSchoolYear || currentSystemYear)

watch(() => props.activeSchoolYear, (newYr) => {
  if (newYr && !selectedYear.value) {
    selectedYear.value = newYr
  }
})

onMounted(async () => {
  try {
    const list = await getAllDuties()
    allDuties.value = Array.isArray(list) ? list : []
  } catch (err) {
    console.error('Failed to load duties analytics:', err)
  } finally {
    isLoading.value = false
  }
})

// All unique school years available in the dataset
const allSchoolYearsList = computed(() => {
  const set = new Set(props.availableSchoolYears || [])
  for (const d of allDuties.value) {
    if (d.schoolYear) set.add(d.schoolYear)
  }
  if (props.activeSchoolYear) set.add(props.activeSchoolYear)
  if (currentSystemYear) set.add(currentSystemYear)
  return Array.from(set).filter(Boolean).sort().reverse()
})

const allottedMinutes = computed(() => {
  return Number(dutySettings.value?.allottedMinutes) || 1875
})

// Palette for charts & table dots
const PALETTE = [
  '#4663ac', // Indigo-blue
  '#0d9488', // Teal
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#0284c7', // Sky
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#e11d48', // Rose
  '#14b8a6', // Cyan-teal
  '#84cc16'  // Lime
]

// ═══════════════════════════════════════════════════════════════════════════
// 1. SPECIFIC SCHOOL YEAR COMPUTED METRICS
// ═══════════════════════════════════════════════════════════════════════════

const yearDuties = computed(() => {
  return allDuties.value.filter(d => (d.schoolYear || '') === selectedYear.value)
})

const yearMinutes = computed(() => {
  return yearDuties.value.reduce((acc, d) => d.isSnowDay ? acc : acc + (Number(d.duration) || 0), 0)
})

const yearRemainingMinutes = computed(() => {
  return allottedMinutes.value - yearMinutes.value
})

const yearPercentComplete = computed(() => {
  if (allottedMinutes.value <= 0) return 0
  return Math.round((yearMinutes.value / allottedMinutes.value) * 100)
})

const yearDutiesCount = computed(() => {
  return yearDuties.value.filter(d => !d.isSnowDay).length
})

const yearEmergencyCount = computed(() => {
  return yearDuties.value.filter(d => d.isEmergency && !d.isSnowDay).length
})

const yearTopPost = computed(() => {
  const map = {}
  for (const d of yearDuties.value) {
    if (d.isSnowDay) continue
    const name = d.dutyName || 'Other'
    if (!map[name]) map[name] = { count: 0, minutes: 0 }
    map[name].count++
    map[name].minutes += Number(d.duration) || 0
  }
  const entries = Object.entries(map).sort((a, b) => b[1].minutes - a[1].minutes)
  if (entries.length === 0) return { name: '—', count: 0, minutes: 0, pct: 0 }
  const top = entries[0]
  const totalMin = yearMinutes.value || 1
  return {
    name: top[0],
    count: top[1].count,
    minutes: top[1].minutes,
    pct: Math.round((top[1].minutes / totalMin) * 100)
  }
})

// Year Duty Breakdown (for Table & Pie chart)
const yearDutyBreakdown = computed(() => {
  const map = {}
  for (const d of yearDuties.value) {
    if (d.isSnowDay) continue
    const name = d.dutyName || 'Other'
    if (!map[name]) {
      map[name] = { name, count: 0, minutes: 0 }
    }
    map[name].count++
    map[name].minutes += Number(d.duration) || 0
  }
  const total = yearMinutes.value || 1
  const list = Object.values(map).sort((a, b) => b.minutes - a.minutes)
  return list.map((item, idx) => ({
    ...item,
    percentage: Math.round((item.minutes / total) * 100),
    color: PALETTE[idx % PALETTE.length]
  }))
})

// Pie Chart Data (by Duty Type Minutes)
const chartDataPie = computed(() => {
  const list = yearDutyBreakdown.value
  const labels = list.map(item => item.name)
  const data = list.map(item => item.minutes)
  const backgroundColor = list.map(item => item.color)

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  }
})

const chartOptionsPie = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 12,
        font: { size: 12, weight: '600' }
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1
          const val = ctx.raw
          const pct = Math.round((val / total) * 100)
          return ` ${ctx.label}: ${val} min (${pct}%)`
        }
      }
    }
  }
}

// Weekday Distribution for Selected Year
const yearDayStats = computed(() => {
  const days = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 }
  for (const d of yearDuties.value) {
    if (d.isSnowDay || !d.date) continue
    const [y, m, dayNum] = d.date.split('-').map(Number)
    const dt = new Date(y, m - 1, dayNum)
    const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' })
    if (days[dayName] !== undefined) {
      days[dayName]++
    }
  }
  return days
})

const yearPeakDay = computed(() => {
  const entries = Object.entries(yearDayStats.value)
  let peak = { day: 'Wed', count: 0 }
  for (const [day, count] of entries) {
    if (count > peak.count) peak = { day, count }
  }
  return peak
})

const chartDataDaysYear = computed(() => {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const data = labels.map(day => yearDayStats.value[day] || 0)
  return {
    labels,
    datasets: [
      {
        label: 'Duties Scheduled',
        data,
        backgroundColor: 'rgba(13, 148, 136, 0.85)',
        borderRadius: 6
      }
    ]
  }
})

// Colleagues Covered in Selected Year
const yearColleagues = computed(() => {
  const map = {}
  for (const d of yearDuties.value) {
    if (!d.isEmergency || !d.notes) continue
    const text = d.notes.trim()
    const clean = text.replace(/^(on-?call|coverage|for|sub)\s+/i, '').trim()
    if (clean && clean.length > 2 && !/^\d+$/.test(clean)) {
      map[clean] = (map[clean] || 0) + 1
    }
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})

const yearSemesterSchedule = computed(() => {
  return getSemesterSchedule(selectedYear.value, academicTerms.value || [])
})

// Semester Pace for Selected Year
const yearSemesterPace = computed(() => {
  let sem1Count = 0
  let sem2Count = 0
  const schedule = yearSemesterSchedule.value
  for (const d of yearDuties.value) {
    if (d.isSnowDay || !d.date) continue
    if (d.date < schedule.sem2Start) {
      sem1Count++
    } else {
      sem2Count++
    }
  }
  const total = sem1Count + sem2Count || 1
  return {
    sem1Count,
    sem2Count,
    sem1Pct: Math.round((sem1Count / total) * 100),
    sem2Pct: Math.round((sem2Count / total) * 100),
    sem1Label: `Semester 1 (${schedule.sem1Display})`,
    sem2Label: `Semester 2 (${schedule.sem2Display})`
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. ALL-TIME CAREER METRICS
// ═══════════════════════════════════════════════════════════════════════════

const careerMinutes = computed(() => {
  return allDuties.value.reduce((acc, d) => d.isSnowDay ? acc : acc + (Number(d.duration) || 0), 0)
})

const careerHours = computed(() => {
  return (careerMinutes.value / 60).toFixed(1)
})

const careerDays = computed(() => {
  return (careerMinutes.value / (60 * 24)).toFixed(1)
})

const totalEmergencyCount = computed(() => {
  return allDuties.value.filter(d => d.isEmergency && !d.isSnowDay).length
})

const totalDutiesCount = computed(() => {
  return allDuties.value.filter(d => !d.isSnowDay).length
})

const avgDutiesPerYear = computed(() => {
  const count = sortedYears.value.length || 1
  return (totalDutiesCount.value / count).toFixed(1)
})

const careerOnCallMinutes = computed(() => {
  return allDuties.value
    .filter(d => d.isEmergency && !d.isSnowDay)
    .reduce((sum, d) => sum + (Number(d.duration) || 0), 0)
})

const emergencyCap = computed(() => {
  return Number(dutySettings.value?.emergencyCap) ?? 2
})

const careerTopPost = computed(() => {
  const map = {}
  for (const d of allDuties.value) {
    if (d.isSnowDay) continue
    const name = d.dutyName || 'Other'
    map[name] = (map[name] || 0) + 1
  }
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return { name: '—', count: 0, pct: 0 }
  const top = entries[0]
  const validTotal = allDuties.value.filter(d => !d.isSnowDay).length || 1
  return {
    name: top[0],
    count: top[1],
    pct: Math.round((top[1] / validTotal) * 100)
  }
})

// Multi-Year Duty Load Chart
const yearSummaryMap = computed(() => {
  const map = {}
  for (const d of allDuties.value) {
    if (d.isSnowDay) continue
    const yr = d.schoolYear || 'Unknown'
    map[yr] = (map[yr] || 0) + (Number(d.duration) || 0)
  }
  return map
})

const sortedYears = computed(() => {
  return Object.keys(yearSummaryMap.value).sort()
})

const chartDataYears = computed(() => {
  const labels = sortedYears.value
  const data = labels.map(yr => yearSummaryMap.value[yr] || 0)
  const backgroundColors = labels.map(yr => {
    return yr === currentSystemYear ? 'rgba(96, 165, 250, 0.85)' : 'rgba(70, 99, 172, 0.85)'
  })

  return {
    labels,
    datasets: [
      {
        label: 'Completed Duty Minutes',
        data,
        backgroundColor: backgroundColors,
        borderRadius: 6
      }
    ]
  }
})

const chartOptionsYears = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.raw.toLocaleString()} minutes`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: '600' } }
    },
    y: {
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      ticks: { font: { size: 11 } }
    }
  }
}

// Career Day-of-the-Week Bias
const careerDayStats = computed(() => {
  const days = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 }
  for (const d of allDuties.value) {
    if (d.isSnowDay || !d.date) continue
    const [y, m, dayNum] = d.date.split('-').map(Number)
    const dt = new Date(y, m - 1, dayNum)
    const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' })
    if (days[dayName] !== undefined) {
      days[dayName]++
    }
  }
  return days
})

const careerPeakDay = computed(() => {
  const entries = Object.entries(careerDayStats.value)
  let peak = { day: 'Wed', count: 0 }
  for (const [day, count] of entries) {
    if (count > peak.count) peak = { day, count }
  }
  return peak
})

const chartDataDaysCareer = computed(() => {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const data = labels.map(day => careerDayStats.value[day] || 0)
  return {
    labels,
    datasets: [
      {
        label: 'Duties Scheduled',
        data,
        backgroundColor: 'rgba(70, 99, 172, 0.85)',
        borderRadius: 6
      }
    ]
  }
})

const chartOptionsDays = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.raw} duties logged`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: '600' } }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      ticks: { stepSize: 10, font: { size: 11 } }
    }
  }
}

// Career Duty Breakdown
const careerDutyBreakdown = computed(() => {
  const map = {}
  for (const d of allDuties.value) {
    if (d.isSnowDay) continue
    const name = d.dutyName || 'Other'
    if (!map[name]) {
      map[name] = { name, count: 0, minutes: 0 }
    }
    map[name].count++
    map[name].minutes += Number(d.duration) || 0
  }
  const total = careerMinutes.value || 1
  return Object.values(map)
    .sort((a, b) => b.minutes - a.minutes)
    .map(item => ({
      ...item,
      percentage: Math.round((item.minutes / total) * 100)
    }))
})

// Career Colleagues Covered
const careerColleagues = computed(() => {
  const map = {}
  for (const d of allDuties.value) {
    if (!d.isEmergency || !d.notes) continue
    const text = d.notes.trim()
    const clean = text.replace(/^(on-?call|coverage|for|sub)\s+/i, '').trim()
    if (clean && clean.length > 2 && !/^\d+$/.test(clean)) {
      map[clean] = (map[clean] || 0) + 1
    }
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})

// Career Semester Balance
const careerSemesterPace = computed(() => {
  let sem1Count = 0
  let sem2Count = 0
  for (const d of allDuties.value) {
    if (d.isSnowDay || !d.date) continue
    const [, m] = d.date.split('-').map(Number)
    if (m >= 8 && m <= 12) sem1Count++
    else if (m === 1) sem1Count++
    else sem2Count++
  }
  const total = sem1Count + sem2Count || 1
  return {
    sem1Count,
    sem2Count,
    sem1Pct: Math.round((sem1Count / total) * 100),
    sem2Pct: Math.round((sem2Count / total) * 100)
  }
})
</script>

<style scoped>
.duty-analytics {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

/* ── Scope Bar ── */
.duty-analytics__scope-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  padding: 10px 16px;
  border-radius: var(--radius-md, 12px);
}

.duty-analytics__scope-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.duty-analytics__scope-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.duty-analytics__scope-tabs {
  display: flex;
  background: var(--bg-secondary, #f2f2f7);
  padding: 3px;
  border-radius: var(--radius-sm, 8px);
  gap: 3px;
  border: 1px solid var(--border);
}

.duty-analytics__scope-btn {
  display: flex;
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

.duty-analytics__scope-btn:hover {
  color: var(--text-primary);
}

.duty-analytics__scope-btn--active {
  background: var(--surface, #ffffff);
  color: var(--primary, #4663ac);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.duty-analytics__scope-year-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duty-analytics__scope-picker-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.duty-analytics__year-select {
  font-size: 0.84rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 7px;
  background: var(--bg-secondary, #f2f2f7);
  border: 1px solid var(--border);
  color: var(--primary, #4663ac);
  cursor: pointer;
}

/* ── Loading ── */
.duty-analytics__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
}

.duty-analytics__spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border);
  border-top-color: var(--primary, #4663ac);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 1. KPI Cards Grid ── */
.duty-analytics__kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.duty-analytics__kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 12px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.duty-analytics__kpi-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex-shrink: 0;
}

.duty-analytics__kpi-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.duty-analytics__kpi-label {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.duty-analytics__kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 2px 0;
}

.duty-analytics__kpi-big {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.duty-analytics__kpi-unit {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.duty-analytics__kpi-subtext {
  font-size: 0.74rem;
  color: var(--text-secondary);
  line-height: 1.25;
}

/* ── 2. Charts Grid ── */
.duty-analytics__charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.duty-analytics__card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 14px);
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
}

.duty-analytics__card--chart {
  min-height: 360px;
}

.duty-analytics__card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.duty-analytics__card-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duty-analytics__title-icon {
  color: var(--primary, #4663ac);
}

.duty-analytics__card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.duty-analytics__card-hint {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.duty-analytics__badge-highlight {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary, #4663ac);
  background: rgba(70, 99, 172, 0.1);
  padding: 3px 8px;
  border-radius: 999px;
}

.duty-analytics__chart-wrapper {
  position: relative;
  height: 280px;
  width: 100%;
}

.duty-analytics__empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
}

/* ── 3. Bottom Row Grid ── */
.duty-analytics__bottom-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 18px;
}

.duty-analytics__card-desc {
  margin: 0 0 14px 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Table */
.duty-analytics__table-wrap {
  overflow-x: auto;
}

.duty-analytics__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.duty-analytics__table th {
  text-align: left;
  padding: 8px 10px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
}

.duty-analytics__table td {
  padding: 10px;
  border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.05));
  color: var(--text-primary);
}

.duty-analytics__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

.duty-analytics__bar-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.duty-analytics__pct-text {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 32px;
}

.duty-analytics__mini-bar-bg {
  width: 60px;
  height: 6px;
  background: var(--bg-secondary, #f2f2f7);
  border-radius: 999px;
  overflow: hidden;
}

.duty-analytics__mini-bar-fill {
  height: 100%;
  background: var(--primary, #4663ac);
  border-radius: 999px;
}

/* Colleague Pills */
.duty-analytics__colleague-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.duty-analytics__colleague-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary, #f2f2f7);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.duty-analytics__colleague-rank {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-secondary);
  width: 24px;
}

.duty-analytics__colleague-name {
  flex: 1;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.duty-analytics__colleague-count {
  font-size: 0.78rem;
  color: var(--text-secondary);
  background: var(--surface, #ffffff);
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle, rgba(0,0,0,0.06));
}

.duty-analytics__empty-state {
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: 12px 0;
  text-align: center;
}

/* Semester Pace Box */
.duty-analytics__semester-box {
  margin-top: 20px;
  padding: 14px 16px;
  background: var(--bg-secondary, #f2f2f7);
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--border);
}

.duty-analytics__subheading {
  margin: 0 0 10px 0;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.duty-analytics__semester-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.duty-analytics__sem-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
}

.duty-analytics__sem-label {
  color: var(--text-secondary);
}

.duty-analytics__sem-val {
  color: var(--text-primary);
  font-weight: 700;
}

@media (max-width: 900px) {
  .duty-analytics__charts-grid,
  .duty-analytics__bottom-grid {
    grid-template-columns: 1fr;
  }
}
</style>
