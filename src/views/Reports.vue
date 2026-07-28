<template>
  <div class="reports">
    <div class="reports__layout">

      <!-- ══ LEFT SIDEBAR ══════════════════════════════════════════════ -->
      <StudentSidebar 
        :students="sidebarStudents"
        :selected-student-id="dossier.selectedStudentId.value"
        :show-academics="rightMode === 'dossier'"
        :is-privacy-mode="isPrivacyMode"
        :class-grades="classGrades"
        :student-trends="studentTrends"
        :is-collapsed="isSidebarCollapsed"
        @select-student="onSelectStudent"
        @navigate="$emit('navigate', $event)"
        @toggle-privacy="isPrivacyMode = !isPrivacyMode"
        @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      />

      <!-- ══ RIGHT PANEL ════════════════════════════════════════════════ -->
      <main class="reports__main">

        <!-- Pillar Navigation Bar -->
        <div class="reports__pillar-nav" role="tablist" aria-label="Reports Mode">
          <button 
            class="reports__pillar-btn"
            :class="{ 'reports__pillar-btn--active': rightMode === 'overview' }"
            @click="switchPillar('overview')"
          >
            <BarChart2 :size="16" /> Class Analytics
          </button>
          <button 
            class="reports__pillar-btn"
            :class="{ 'reports__pillar-btn--active': rightMode === 'printhub' }"
            @click="switchPillar('printhub')"
          >
            <Printer :size="16" /> Document &amp; Print Hub
          </button>
          <button 
            v-if="dossier.selectedStudentId.value"
            class="reports__pillar-btn"
            :class="{ 'reports__pillar-btn--active': rightMode === 'dossier' }"
            @click="switchPillar('dossier')"
          >
            <User :size="16" /> Student 360
          </button>
        </div>

        <!-- Loading -->
        <div v-if="dossier.loading.value" class="reports__loading" aria-live="polite">Loading…</div>

        <!-- ── PILLAR 3: STUDENT 360 DOSSIER ────────────────────────── -->
        <template v-else-if="rightMode === 'dossier' && dossier.selectedStudentId.value">
          <Student360 
            :student-id="dossier.selectedStudentId.value" 
            :class-id="sidebarClassId"
            @close="switchPillar('overview')"
          />
        </template>

        <!-- ── PILLAR 2: DOCUMENT & PRINT HUB ───────────────────────── -->
        <template v-else-if="rightMode === 'printhub'">
          <ReportsPrintHub
            :report-class="reportClass"
            :sidebar-students="sidebarStudents"
            @open-batch-print="showPrintModal = true"
            @open-print-grid="showPrintGridModal = true"
            @open-print-expectations="showPrintExpectationsModal = true"
            @open-print-classlist="showPrintClassListModal = true"
            @open-print-calendar="showPrintCalendarModal = true"
            @download-csv="handleDownloadCsv"
            @download-comments="handleDownloadComments"
          />
        </template>

        <!-- ── PILLAR 1: CLASS ANALYTICS ────────────────────────────── -->
        <template v-else>
          <!-- Filter Bar -->
          <div class="reports__filter">
            <div class="reports__period-row" role="group" aria-label="Time period">
              <button
                v-for="p in PERIOD_OPTIONS"
                :key="p.value"
                class="reports__period-btn"
                :class="{ 'reports__period-btn--active': selectedPeriod === p.value }"
                @click="selectedPeriod = p.value"
              >{{ p.label }}</button>
            </div>
          </div>

          <!-- Class Overview & Analytics Panel -->
          <ReportsClassOverview
            :loading="loading"
            :attendance-rate="attendanceRate"
            :aggregates="aggregates"
            :chronically-absent-count="chronicallyAbsentCount"
            :trips-per-student-avg="tripsPerStudentAvg"
            :notes-logged-count="notesLoggedCount"
            :follow-up-items="followUpItems"
            :follow-up-visible="followUpVisible"
            :follow-up-expanded="followUpExpanded"
            :washroom-chart-data="washroomChartData"
            :washroom-chart-options="washroomChartOptions"
            :long-trips-visible="longTripsVisible"
            :long-trips-expanded="longTripsExpanded"
            :has-any-notes="hasAnyNotes"
            :recent-notes="recentNotes"
            :show-completed-notes="showCompletedNotes"
            :report-class="reportClass"
            :class-grades="classGrades"
            :assessments="assessmentsList"
            :sidebar-students="sidebarStudents"
            :all-class-events="allClassEvents"
            @select-student="onSelectStudent"
            @toggle-followup-expand="followUpExpanded = !followUpExpanded"
            @toggle-longtrips-expand="longTripsExpanded = !longTripsExpanded"
            @toggle-show-completed="showCompletedNotes = !showCompletedNotes"
            @toggle-note-complete="onToggleNoteComplete"
          />
        </template>

      </main>
    </div>

    <!-- Batch Print Modal Component -->
    <ReportsBatchPrintModal
      :show="showPrintModal"
      :sidebar-students="sidebarStudents"
      :sidebar-class-id="sidebarClassId"
      :report-class="reportClass"
      @close="showPrintModal = false"
    />

    <!-- Print Final Grades Grid Modal -->
    <PrintGradesGridModal
      v-if="showPrintGridModal"
      :class-record="reportClass"
      :class-grades="classGrades"
      :teacher-name="teacherName"
      @close="showPrintGridModal = false"
    />

    <!-- Print Expectation Mastery Audit Modal -->
    <PrintExpectationsModal
      v-if="showPrintExpectationsModal"
      :show="showPrintExpectationsModal"
      :report-class="reportClass"
      :assessments="assessmentsList"
      :class-grades="classGrades"
      :teacher-name="teacherName"
      @close="showPrintExpectationsModal = false"
    />

    <!-- Print Class Roster Modal -->
    <PrintClassListModal
      v-if="showPrintClassListModal"
      :class-record="reportClass"
      @close="showPrintClassListModal = false"
    />

    <!-- Print Semester Calendar Modal -->
    <PrintCalendarModal
      v-if="showPrintCalendarModal"
      :show="showPrintCalendarModal"
      :report-class="reportClass"
      @close="showPrintCalendarModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { BarChart2, Printer, User } from 'lucide-vue-next'

import { useClassroom } from '../composables/useClassroom.js'
import { useStudentDossier } from '../composables/useStudentDossier.js'
import * as classService from '../db/classService.js'
import * as eventService from '../db/eventService.js'
import { toMinutes } from '../db/eventService.js'
import Student360 from '../components/dossier/Student360.vue'
import StudentSidebar from '../components/StudentSidebar.vue'
import PrintGradesGridModal from '../components/PrintGradesGridModal.vue'
import PrintExpectationsModal from '../components/reports/PrintExpectationsModal.vue'
import PrintClassListModal from '../components/PrintClassListModal.vue'
import PrintCalendarModal from '../components/reports/PrintCalendarModal.vue'
import ReportsClassOverview from '../components/reports/ReportsClassOverview.vue'
import ReportsBatchPrintModal from '../components/reports/ReportsBatchPrintModal.vue'
import ReportsPrintHub from '../components/reports/ReportsPrintHub.vue'
import { calculateClassGrades, getAssessmentsByClass, getAssessmentPercentage } from '../db/gradebookService.js'
import { loadGradebook, assessments as gbAssessments, gradeMap } from '../composables/useGradebook.js'

import { 
  Chart as ChartJS, 
  Title, 
  Tooltip, 
  Legend, 
  BarElement, 
  CategoryScale, 
  LinearScale 
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  studentId: String,
  classId: String,
  from: String
})

const {
  activeClass,
  behaviorCodes,
  classList,
  filteredClassList,
  switchClass,
  academicTerms,
  teacherName
} = useClassroom()

const dossier = useStudentDossier()

const sidebarClassId = ref(activeClass.value?.classId || filteredClassList.value[0]?.classId || null)

watch(filteredClassList, (newList) => {
  if (newList.length > 0) {
    const stillExists = newList.find(c => c.classId === sidebarClassId.value)
    if (!stillExists) {
      sidebarClassId.value = newList[0].classId
      runReport()
    }
  } else {
    sidebarClassId.value = null
  }
}, { immediate: true })

watch(sidebarClassId, () => {
  followUpExpanded.value = false
  longTripsExpanded.value = false
  showCompletedNotes.value = false
})

watch(activeClass, async (newClass, oldClass) => {
  if (newClass && (!oldClass || newClass.classId !== oldClass.classId)) {
    sidebarClassId.value = newClass.classId
    dossier.clearStudent()
    dossier.loadSidebarClass(newClass.classId)
    await loadGradebook(newClass)
    rightMode.value = 'overview'
    runReport()
  }
})

const isSidebarCollapsed = ref(false)
const isPrivacyMode = ref(false)

const studentTrends = computed(() => {
  if (!reportClass.value?.students || !gbAssessments.value || !gradeMap.value) return {}
  
  const productAssessments = [...gbAssessments.value]
    .filter(a => a.assessmentType === 'product' && !a.excluded && a.target !== 'individual')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    
  if (productAssessments.length === 0) return {}
  
  const trends = {}
  Object.keys(reportClass.value.students).forEach(studentId => {
    if (reportClass.value.students[studentId].archived) return
    const data = []
    productAssessments.forEach(a => {
      const grade = gradeMap.value[a.assessmentId]?.[studentId]
      const percentage = getAssessmentPercentage ? getAssessmentPercentage(a, grade) : null
      if (percentage !== null) {
        data.push(percentage)
      }
    })
    trends[studentId] = data
  })
  return trends
})

watch(isSidebarCollapsed, () => {
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
  }, 350)
})

const rightMode = ref('overview') // 'overview' | 'printhub' | 'dossier'

function switchPillar(mode) {
  rightMode.value = mode
  if (mode !== 'dossier') {
    dossier.clearStudent()
  }
}

onMounted(() => {
  if (props.classId) {
    sidebarClassId.value = props.classId
    switchClass(props.classId)
  }

  if (sidebarClassId.value) {
    dossier.loadSidebarClass(sidebarClassId.value)
    if (props.studentId) {
      onSelectStudent(props.studentId)
    } else {
      runReport()
    }
  }
})

watch(classList, (list) => {
  if (!sidebarClassId.value && list.length && activeClass.value) {
    sidebarClassId.value = activeClass.value.classId
    dossier.loadSidebarClass(sidebarClassId.value)
    runReport()
  }
}, { immediate: true })

const sidebarStudents = dossier.sidebarStudents

const selectedPeriod = ref('week')
const PERIOD_OPTIONS = [
  { label: 'This Week', value: 'week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Semester', value: 'semester' },
]

watch(selectedPeriod, () => {
  if (rightMode.value === 'overview') runReport()
})

async function onSelectStudent(studentId) {
  rightMode.value = 'dossier'
  await dossier.loadStudent(sidebarClassId.value, studentId)
}

const showPrintModal = ref(false)
const showPrintGridModal = ref(false)
const showPrintExpectationsModal = ref(false)
const showPrintClassListModal = ref(false)
const showPrintCalendarModal = ref(false)

const reportClass = computed(() =>
  classList.value.find(c => c.classId === sidebarClassId.value)
  ?? classList.value[0]
  ?? null
)

const reportStudents = computed(() => {
  const studentsMap = reportClass.value?.students ?? {}
  const active = {}
  for (const [id, s] of Object.entries(studentsMap)) {
    if (!s.archived) active[id] = s
  }
  return active
})

const reportData = ref([])
const allClassEvents = ref([])
const assessmentsList = ref([])
const loading = ref(false)

const aggregates = reactive({
  attendance: {
    totalAbsences: 0,
    testDayAbsences: 0,
    totalLates: 0,
    testDayLates: 0,
    avgAbsences: 0,
    avgAbsencesPerWeek: 0,
    avgLatesPerWeek: 0,
    avgLateDuration: 0,
    topAbsentees: []
  },
  washroom: {
    totalTrips: 0,
    testDayTrips: 0,
    totalDuration: 0,
    avgDuration: 0,
    avgTripsPerWeek: 0,
    studentTrips: [],
    longTrips: []
  },
  behavior: {
    topCode: null,
    totalRedirects: 0,
    testDayRedirects: 0,
    totalParentContacts: 0,
    redirectAlerts: []
  }
})

const classGrades = ref({})
const showCompletedNotes = ref(false)

const recentNotes = computed(() => {
  const studentsMap = reportStudents.value
  let filtered = allClassEvents.value
    .filter(e => e.note && e.code !== 'a' && e.code !== 'ac' && e.code !== 'l' && e.code !== 'w' && e.code !== 'pc' && !e.superseded && !e.note.startsWith('[ob]') && !e.note.startsWith('[cv]'))
  
  if (!showCompletedNotes.value) {
    filtered = filtered.filter(e => !e.completed)
  }

  return filtered
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(e => ({
      ...e,
      studentName: studentsMap[e.studentId] ? `${studentsMap[e.studentId].firstName} ${studentsMap[e.studentId].lastName}` : 'Unknown Student'
    }))
    .slice(0, 12)
})

const hasAnyNotes = computed(() => {
  return allClassEvents.value.some(e => e.note && e.code !== 'a' && e.code !== 'ac' && e.code !== 'l' && e.code !== 'w' && e.code !== 'pc' && !e.superseded && !e.note.startsWith('[ob]') && !e.note.startsWith('[cv]'))
})

async function onToggleNoteComplete(eventId, currentStatus) {
  await eventService.updateEvent(eventId, { completed: !currentStatus })
  await runReport()
}

function handleDownloadCsv(type) {
  // Triggers CSV downloads
  alert(`Preparing CSV export for ${type}...`)
}

function handleDownloadComments(withNames) {
  alert(`Preparing report card comments CSV (${withNames ? 'with names' : 'anonymous'})...`)
}

async function runReport() {
  if (!sidebarClassId.value) return
  loading.value = true
  try {
    const dr = eventService.getDateRangeForClassPeriod(selectedPeriod.value, reportClass.value, academicTerms.value)
    const rawEvents = await eventService.getEventsByClass(sidebarClassId.value, Object.keys(dr).length ? dr : undefined)
    
    const currentClass = await classService.getClass(sidebarClassId.value)
    const activeStudents = {}
    Object.entries(currentClass?.students || {}).forEach(([id, s]) => {
      if (!s.archived) activeStudents[id] = s
    })
    const activeStudentIds = new Set(Object.keys(activeStudents))
    const studentsMap = activeStudents
    const studentCount = activeStudentIds.size

    const events = rawEvents.filter(e => activeStudentIds.has(e.studentId))
    reportData.value = events

    const allEventsRaw = await eventService.getEventsByClass(sidebarClassId.value)
    allClassEvents.value = allEventsRaw.filter(e => activeStudentIds.has(e.studentId))

    // Load gradebook & assessments for academics and expectations
    if (reportClass.value) {
      await loadGradebook(reportClass.value)
      assessmentsList.value = gbAssessments.value || await getAssessmentsByClass(sidebarClassId.value)
    }

    const grades = await calculateClassGrades(reportClass.value, { asOf: dr.to || null })
    classGrades.value = grades

    const attEvents = events.filter(e => (e.code === 'a' || e.code === 'l') && !e.superseded)
    const absenceEvents = attEvents.filter(e => e.code === 'a')
    const lateEvents = attEvents.filter(e => e.code === 'l')
    
    const absences = absenceEvents.length
    const testDayAbsences = absenceEvents.filter(e => e.testDay).length
    const lates = lateEvents.length
    const testDayLates = lateEvents.filter(e => e.testDay).length
    
    let weeks = 1
    if (selectedPeriod.value === 'month') weeks = 4.3
    else if (selectedPeriod.value === 'semester') weeks = 20
    else if (selectedPeriod.value === 'all' && events.length > 0) {
      const first = new Date(events[0].timestamp)
      const last = new Date(events[events.length - 1].timestamp)
      const diffMs = Math.abs(last - first)
      weeks = Math.max(1, diffMs / (1000 * 60 * 60 * 24 * 7))
    }

    const totalLateMins = lateEvents.reduce((acc, e) => acc + toMinutes(e.duration), 0)
    const avgLateDuration = lates.length ? (totalLateMins / lates.length).toFixed(1) : '0.0'
    
    const absCounts = {}
    attEvents.filter(e => e.code === 'a').forEach(e => {
      absCounts[e.studentId] = (absCounts[e.studentId] ?? 0) + 1
    })
    const topAbsentees = Object.entries(absCounts)
      .map(([id, count]) => ({ 
        name: studentsMap[id] ? `${studentsMap[id].lastName}, ${studentsMap[id].firstName}` : id, 
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    aggregates.attendance = {
      totalAbsences: absences,
      testDayAbsences,
      totalLates: lates,
      testDayLates,
      avgAbsences: studentCount ? (absences / studentCount).toFixed(1) : 0,
      avgAbsencesPerWeek: (absences / weeks).toFixed(1),
      avgLatesPerWeek: (lates / weeks).toFixed(1),
      avgLateDuration: avgLateDuration,
      topAbsentees
    }

    const washCodes = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)
    const washEvents = events.filter(e => washCodes.includes(e.code) && e.duration != null && !e.superseded)
    const totalTrips = washEvents.length
    const testDayTrips = washEvents.filter(e => e.testDay).length
    const totalMins = washEvents.reduce((acc, e) => acc + toMinutes(e.duration), 0)
    
    const tripCounts = {}
    washEvents.forEach(e => {
      tripCounts[e.studentId] = (tripCounts[e.studentId] ?? 0) + 1
    })
    const studentTripsData = Object.entries(tripCounts)
      .map(([id, count]) => ({ 
        name: studentsMap[id] ? `${studentsMap[id].firstName} ${studentsMap[id].lastName[0]}.` : id, 
        count 
      }))
      .sort((a, b) => b.count - a.count)

    aggregates.washroom = {
      totalTrips,
      testDayTrips,
      totalDuration: totalMins.toFixed(1),
      avgDuration: totalTrips ? (totalMins / totalTrips).toFixed(1) : '0.0',
      avgTripsPerWeek: (totalTrips / weeks).toFixed(1),
      avgMinsPerWeek: (totalMins / weeks).toFixed(1),
      studentTrips: studentTripsData,
      longTrips: washEvents
        .filter(e => toMinutes(e.duration) > 15)
        .map(e => ({
          name: studentsMap[e.studentId] ? `${studentsMap[e.studentId].lastName}, ${studentsMap[e.studentId].firstName}` : e.studentId,
          date: formatTimestamp(e.timestamp),
          duration: toMinutes(e.duration)
        }))
        .sort((a, b) => b.duration - a.duration)
    }

    const behaviorEvents = events.filter(e => e.category === 'redirect' && !e.superseded)
    const codeCounts = {}
    behaviorEvents.forEach(e => {
      codeCounts[e.code] = (codeCounts[e.code] ?? 0) + 1
    })
    
    let topCodeKey = null
    let maxCount = 0
    Object.entries(codeCounts).forEach(([code, count]) => {
      if (count > maxCount) {
        maxCount = count
        topCodeKey = code
      }
    })

    const topCodeObject = topCodeKey ? {
      ...behaviorCodesMap.value[topCodeKey],
      count: maxCount
    } : null

    const redirects = behaviorEvents.length
    const testDayRedirects = behaviorEvents.filter(e => e.testDay).length
    const parentContacts = events.filter(e => behaviorCodesMap.value[e.code]?.label?.toLowerCase().includes('parent') && !e.superseded).length
    
    const redCounts = {}
    events.filter(e => e.category === 'redirect' && !e.superseded).forEach(e => {
      redCounts[e.studentId] = (redCounts[e.studentId] ?? 0) + 1
    })
    const redirectAlerts = Object.entries(redCounts)
      .filter(([id, count]) => count >= 3)
      .map(([id]) => studentsMap[id] ? `${studentsMap[id].lastName}, ${studentsMap[id].firstName}` : id)

    aggregates.behavior = {
      topCode: topCodeObject,
      totalRedirects: redirects,
      testDayRedirects,
      totalParentContacts: parentContacts,
      redirectAlerts
    }

  } finally {
    loading.value = false
  }
}

function formatTimestamp(ts) {
  if (!ts) return ''
  const parseStr = ts.includes('Z') || ts.match(/[+-]\d{2}:\d{2}$/) ? ts : ts + 'Z'
  return new Date(parseStr).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

const behaviorCodesMap = computed(() =>
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)

const washroomChartData = computed(() => {
  const data = aggregates.washroom.studentTrips.slice(0, 10)
  return {
    labels: data.map(d => d.name),
    datasets: [{
      label: 'Washroom Trips',
      data: data.map(d => d.count),
      backgroundColor: '#4663ac',
      borderRadius: 4
    }]
  }
})

const attendanceRate = computed(() => {
  const studentCount = Object.keys(reportStudents.value).length
  if (studentCount === 0) return null
  const dates = new Set(
    reportData.value.filter(e => !e.superseded).map(e => e.timestamp.slice(0, 10))
  )
  const distinctDays = dates.size
  if (distinctDays === 0) return null
  const possible = studentCount * distinctDays
  const absences = aggregates.attendance.totalAbsences
  return ((possible - absences) / possible * 100).toFixed(1)
})

const chronicallyAbsentCount = computed(() => {
  const map = {}
  reportData.value.forEach(e => {
    if (e.code === 'a' && !e.superseded) {
      map[e.studentId] = (map[e.studentId] ?? 0) + 1
    }
  })
  return Object.values(map).filter(c => c >= 5).length
})

const tripsPerStudentAvg = computed(() => {
  const studentCount = Object.keys(reportStudents.value).length
  if (studentCount === 0) return '0.0'
  return (aggregates.washroom.totalTrips / studentCount).toFixed(1)
})

const notesLoggedCount = computed(() =>
  reportData.value.filter(e => e.note && e.code !== 'a' && e.code !== 'l' && e.code !== 'w' && !e.superseded).length
)

const followUpExpanded = ref(false)
const longTripsExpanded = ref(false)

const followUpItems = computed(() => {
  const items = []
  const students = reportStudents.value
  const washCodes = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)

  const absMap = {}
  const washMap = {}
  reportData.value.forEach(e => {
    if (e.superseded) return
    if (e.code === 'a') {
      absMap[e.studentId] = (absMap[e.studentId] ?? 0) + 1
    }
    if (washCodes.includes(e.code) && e.duration != null) {
      if (!washMap[e.studentId]) washMap[e.studentId] = []
      washMap[e.studentId].push(toMinutes(e.duration))
    }
  })

  const nameFor = id => students[id] ? `${students[id].lastName}, ${students[id].firstName}` : id

  Object.entries(absMap).forEach(([id, count]) => {
    if (count >= 5 && students[id]) {
      items.push({ studentId: id, name: nameFor(id), reason: `${count} absences`, severity: 'high', sortVal: count })
    }
  })

  if (classGrades.value && Object.keys(classGrades.value).length > 0) {
    Object.entries(classGrades.value).forEach(([id, data]) => {
      if (data.overallGrade != null && data.overallGrade < 60 && students[id]) {
        const alreadyHigh = items.some(i => i.studentId === id && i.severity === 'high')
        if (!alreadyHigh) {
          items.push({ studentId: id, name: nameFor(id), reason: `Grade at ${Math.round(data.overallGrade)}%`, severity: 'high', sortVal: 100 - data.overallGrade })
        }
      }
    })
  }

  Object.entries(absMap).forEach(([id, count]) => {
    if (count >= 3 && count < 5 && students[id]) {
      items.push({ studentId: id, name: nameFor(id), reason: `${count} absences`, severity: 'medium', sortVal: count })
    }
  })

  Object.entries(washMap).forEach(([id, durations]) => {
    if (!students[id]) return
    const longest = Math.max(...durations)
    if (longest > 15) {
      items.push({ studentId: id, name: nameFor(id), reason: `${longest.toFixed(0)}min washroom trip`, severity: 'medium', sortVal: longest })
    }
  })

  const order = { high: 0, medium: 1, low: 2 }
  items.sort((a, b) => {
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity]
    return b.sortVal - a.sortVal
  })
  return items
})

const followUpVisible = computed(() =>
  followUpExpanded.value ? followUpItems.value : followUpItems.value.slice(0, 8)
)

const longTripsVisible = computed(() =>
  longTripsExpanded.value ? aggregates.washroom.longTrips : aggregates.washroom.longTrips.slice(0, 5)
)

const washroomChartOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true }
  },
  scales: {
    x: { beginAtZero: true, ticks: { stepSize: 1 } },
    y: { grid: { display: false } }
  }
}
</script>

<style scoped>
.reports {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-secondary);
}

.reports__layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.reports__main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reports__pillar-nav {
  display: flex;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 6px;
  border-radius: var(--radius-lg);
}

.reports__pillar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.reports__pillar-btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.reports__pillar-btn--active {
  background: var(--primary);
  color: white;
}

@media (max-width: 1024px) {
  .reports__main {
    padding: 16px;
  }
}

.reports__loading {
  padding: 40px;
  text-align: center;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__filter {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.reports__period-row {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
}

.reports__period-btn {
  padding: 6px 12px;
  border: none;
  background: none;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.reports__period-btn:hover {
  color: var(--text);
}

.reports__period-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.reports__btn-export {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
  transition: all 0.2s ease;
}

.reports__btn-export:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
}
</style>
