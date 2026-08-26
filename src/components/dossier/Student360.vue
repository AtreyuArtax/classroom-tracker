<template>
  <div class="student-360">
    <Student360Header 
      :student="student" 
      :overall-grade="overallGrade"
      :most-consistent="overallMostConsistent"
      :consistent-is-fallback="consistentIsFallback"
      :weighted-median="overallWeightedMedian"
      :attendance-stats="overallStats"
      :attendance-rate="overallStats.attendanceRate"
    >
      <template #actions>
        <button class="student-360__action-btn" title="Email Progress Report" @click="showEmailModal = true">
          <Mail :size="18" />
        </button>
        <button class="student-360__action-btn" title="Print Progress Report" @click="showPrintModal = true">
          <Printer :size="18" />
        </button>
        <button class="student-360__close-btn" @click="handleClose">
          <X :size="18" />
        </button>
      </template>
    </Student360Header>

    <nav class="student-360__tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        v-memo="[tab.id, activeTab === tab.id]"
        class="student-360__tab-btn"
        :class="{ 'student-360__tab-btn--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="18" />
        {{ tab.label }}
      </button>
    </nav>

    <main class="student-360__content">
      <!-- Summary Tab -->
      <section v-if="activeTab === 'summary'" class="student-360__pane student-360__pane--summary">
        <!-- Period Toggle -->
        <div class="student-360__period-toggle">
          <button 
            v-for="p in ['week', 'last_week', 'month', 'semester']" 
            :key="p"
            class="period-btn"
            :class="{ 'period-btn--active': selectedPeriod === p }"
            @click="selectedPeriod = p"
          >
            {{ p === 'last_week' ? 'Last Week' : p === 'semester' ? 'This Semester' : p.charAt(0).toUpperCase() + p.slice(1) }}
          </button>
        </div>

        <div class="student-360__stats-grid">
          <StudentStatCard 
            label="Absences" 
            :value="stats.absences" 
            :sub-value="attendanceAverages.absencesAvg + '/wk avg'"
            :sub-value2="stats.testDayAbsences > 0 ? `${stats.testDayAbsences} Test Day${stats.testDayAbsences !== 1 ? 's' : ''}` : null"
            :icon="UserMinus"
            :alert-icon="testDayAlert ? AlertTriangle : null"
            :color="testDayAlert ? 'danger' : (stats.absences > 0 ? 'warning' : 'success')"
          />
          <StudentStatCard 
            :label="behaviorCodesMap['l']?.label || 'Lates'" 
            :value="stats.lates" 
            :sub-value="attendanceAverages.latesAvg + '/wk'"
            :value2="attendanceAverages.latesTotal + 'm'"
            :sub-value2="attendanceAverages.latesAvgDuration + 'm avg'"
            :icon="resolveIcon(behaviorCodesMap['l']?.icon) || Clock"
            :color="stats.lates > 4 ? 'warning' : 'neutral'"
          />
          <StudentStatCard 
            :label="behaviorCodesMap['w']?.label || 'Washroom'" 
            :value="washroomCount" 
            :sub-value="attendanceAverages.washroomAvg + '/wk'"
            :value2="attendanceAverages.washroomTotal + 'm'"
            :sub-value2="attendanceAverages.washroomAvgPerVisit + 'm avg'"
            :icon="resolveIcon(behaviorCodesMap['w']?.icon) || Toilet"
            :color="washroomCount > 3 ? 'warning' : 'neutral'"
          />
          <StudentStatCard 
            label="Redirect" 
            :value="redirectCount"
            :icon="AlertTriangle"
            :color="redirectCount >= 3 ? 'danger' : redirectCount >= 1 ? 'warning' : 'neutral'"
          />
        </div>

        <!-- Trends Section -->
        <div class="student-360__trends-row">
          <div class="trend-item">
            <StudentGradeTrend 
              :assessments="allDossierAssessments" 
              :grade-map="gradeMap" 
              :student-id="props.studentId" 
            />
          </div>
          <div class="trend-item">
            <StudentTrendGraph 
              title="Attendance &amp; Habits Trend"
              :weekly-trend="behaviorWeeklyTrend"
              :categories="['washroom', 'absence', 'late']"
              :period="selectedPeriod"
            />
          </div>
        </div>

        <!-- Learning Skills & Work Habits Card (Ontario Growing Success) -->
        <div v-if="learningSkillsRecords.length > 0" class="student-360__learning-skills-card">
          <div class="learning-skills-card__header">
            <div class="learning-skills-card__title-group">
              <Award :size="16" class="learning-skills-card__icon" />
              <h4 class="learning-skills-card__title">Learning Skills &amp; Work Habits</h4>
            </div>
            
            <div v-if="learningSkillsRecords.length > 1" class="learning-skills-card__term-pills">
              <button 
                v-for="rec in learningSkillsRecords"
                :key="rec.term"
                type="button"
                class="ls-dossier-pill"
                :class="{ 'ls-dossier-pill--active': activeDossierLsTerm === rec.term }"
                @click="activeDossierLsTerm = rec.term"
              >
                {{ rec.term }}
              </button>
            </div>
            <span v-else-if="currentDossierLsRecord" class="learning-skills-card__term-badge">
              {{ currentDossierLsRecord.term }}
            </span>
          </div>

          <div v-if="currentDossierLsRecord" class="learning-skills-card__grid">
            <div 
              v-for="cat in LEARNING_SKILL_CATEGORIES" 
              :key="cat.key" 
              class="ls-grid-col"
            >
              <div class="ls-col-label" :title="cat.description">{{ cat.label }}</div>
              <div class="ls-col-ratings">
                <div class="ls-rating-row">
                  <span class="ls-type">Self:</span>
                  <span 
                    v-if="currentDossierLsRecord.studentEval?.[cat.key]"
                    class="ls-badge"
                    :class="'ls-badge--' + currentDossierLsRecord.studentEval[cat.key]"
                  >
                    {{ currentDossierLsRecord.studentEval[cat.key] }}
                  </span>
                  <span v-else class="ls-badge-none">—</span>
                </div>
                <div class="ls-rating-row">
                  <span class="ls-type">Teacher:</span>
                  <span 
                    v-if="currentDossierLsRecord.teacherEval?.[cat.key]"
                    class="ls-badge"
                    :class="'ls-badge--' + currentDossierLsRecord.teacherEval[cat.key]"
                  >
                    {{ currentDossierLsRecord.teacherEval[cat.key] }}
                  </span>
                  <span v-else class="ls-badge-none">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Coaching Insight Alert -->
        <div v-if="coachingInsight" class="student-360__insight-card">
          <div class="insight-icon" :class="'insight-icon--' + coachingInsight.type">
            <AlertTriangle v-if="coachingInsight.type === 'warning'" :size="20" />
            <TrendingDown v-else :size="20" />
          </div>
          <div class="insight-content">
            <h4 class="insight-title">{{ coachingInsight.title }}</h4>
            <p class="insight-message">{{ coachingInsight.message }}</p>
            <p class="insight-recommendation"><strong>Recommendation:</strong> {{ coachingInsight.recommendation }}</p>
          </div>
        </div>

        <!-- Recent Activity & Assessment Feed -->
        <div v-if="recentActivityFeed && recentActivityFeed.length > 0" class="student-360__recent-activity">
          <div class="recent-activity__header">
            <h4 class="recent-activity__title">
              <Clock :size="16" /> RECENT ACTIVITY &amp; MARKS
            </h4>
          </div>
          <div class="recent-activity__grid">
            <div 
              v-for="item in recentActivityFeed" 
              :key="item.id" 
              class="recent-activity__card"
              :class="{ 'recent-activity__card--failing': item.isFailing }"
            >
              <div class="activity-date">{{ formatDateShort(item.date) }}</div>
              <div class="activity-main">
                <span class="activity-badge" :class="'activity-badge--' + item.type">{{ item.category }}</span>
                <span class="activity-name" :title="item.title">{{ item.title }}</span>
              </div>
              <div v-if="item.value" class="activity-score" :class="{ 'activity-score--failing': item.isFailing }">
                <span v-if="item.levelColor" class="sbar-level-badge" :style="{ background: item.levelColor, color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }">
                  {{ item.value }}
                </span>
                <strong v-else>{{ item.value }}</strong>
                <span v-if="item.subText" class="activity-sub">({{ item.subText }})</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Academics Tab -->
      <section v-if="activeTab === 'academics'" class="student-360__pane student-360__pane--academics">
        <StudentAcademicsTab
          :student-id="props.studentId"
          :student="student"
          :events="events"
          @delete-event="handleDeleteHistoryItem"
          @select-assessment="handleSelectAssessment"
        />
      </section>

      <!-- Qualitative Evidence Tab -->
      <section v-if="activeTab === 'qualitative'" class="student-360__pane student-360__pane--qualitative">
        <DossierQualitativeEvidence 
          :events="qualitativeEvents" 
          :active-class="activeClassRecord"
          :assessments="allDossierAssessments"
          :student-id="props.studentId"
          :student-grade-level="student?.gradeLevel"
          @delete="handleDeleteHistoryItem"
        />
      </section>

      <!-- Communication Log Tab -->
      <section v-if="activeTab === 'communication'" class="student-360__pane">
        <DossierCommunicationLog 
          :events="communicationEvents" 
          @delete="handleDeleteHistoryItem"
        />
      </section>

      <!-- Timeline Tab -->
      <section v-if="activeTab === 'timeline'" class="student-360__pane">
        <div class="timeline-header">
           <button class="btn-log-absence" @click="showAbsenceForm = true">
             <PlusCircle :size="16" /> Log Past Absence
           </button>
        </div>

         <BaseModal
           :show="showAbsenceForm"
           title="Log Past Absence"
           @close="showAbsenceForm = false"
           maxWidth="400px"
           :z-index="3000"
         >
           <div class="absence-modal-content">
             <div class="form-group">
               <label>Absence Date</label>
               <input type="date" v-model="absenceDate" class="absence-input" />
             </div>
             
             <label class="absence-checkbox-container">
               <input type="checkbox" v-model="absenceIsTestDay" />
               <div class="checkbox-custom"></div>
               <span class="checkbox-label">Mark as Assessment Day</span>
             </label>

             <div class="modal-footer">
               <button class="btn-ghost" @click="showAbsenceForm = false">Cancel</button>
               <button class="btn-primary" @click="logAbsence">Save Record</button>
             </div>
           </div>
         </BaseModal>

        <StudentTimeline 
          :student-id="studentId" 
          :events="events"
          :assessments="assessments"
          :behavior-codes-map="behaviorCodesMap"
        />
      </section>

      <!-- Profile Tab -->
      <Student360ProfileTab
        v-if="activeTab === 'profile'"
        :student="student"
        :stats="stats"
        :all-dossier-assessments="allDossierAssessments"
        :active-class="activeClass"
        :active-class-record="activeClassRecord"
        :filtered-milestones="filteredMilestones"
        :global-milestones="globalMilestones"
        :active-student-events="activeStudentEvents"
        :academic-categories="academicCategories"
        :formatted-grade="formattedGrade"
        @update-note="saveGeneralNote"
        @update-iep="saveStudentIEP"
        @update-accommodations="saveStudentAccommodations"
        @update-contacts="saveParentContacts"
      />

      <!-- History Tab -->
      <Student360HistoryTab
        v-if="activeTab === 'history'"
        :all-time-history="allTimeHistory"
      />
    </main>

    <!-- Context Menu & Attempts Dialogs -->
    <Student360AttemptsModal
      :context-menu="contextMenu"
      :attempts-popover="attemptsPopover"
      :new-attempt-form="newAttemptForm"
      :grade-map="gradeMap"
      :student-id="studentId"
      @close-context-menu="contextMenu = null"
      @close-attempts-popover="attemptsPopover = null"
      @close-new-attempt="newAttemptForm = null"
      @start-new-attempt="startNewAttempt"
      @open-attempts="openAttemptsFromMenu"
      @toggle-missing="toggleMissing"
      @toggle-excluded="toggleExcluded"
      @delete-assessment="doDeleteAssessment"
      @set-primary="doSetPrimary"
      @delete-attempt="doDeleteAttempt"
      @update-comment="doUpdateComment"
      @submit-new-attempt="submitNewAttempt"
    />

    <!-- Email Progress Report Modal -->
    <Student360EmailModal
      :show="showEmailModal"
      :student-id="props.studentId"
      :student="student"
      :formatted-grade="formattedGrade"
      :all-dossier-assessments="allDossierAssessments"
      :class-assessments="classAssessments"
      :individual-assessments="individualAssessments"
      :stats="stats"
      :washroom-count="washroomCount"
      :teacher-name="teacherName"
      @close="showEmailModal = false"
    />

    <!-- Print Report Modal -->
    <Student360PrintModal
      :show="showPrintModal"
      :student-id="props.studentId"
      :class-id="props.classId"
      @close="showPrintModal = false"
    />

    <!-- SBAR Matrix Modal Overlay -->
    <BaseModal
      :show="Boolean(selectedSbarAssessmentId && currentSbarAssessment)"
      title="SBAR Evaluation Matrix"
      max-width="1150px"
      @close="selectedSbarAssessmentId = null"
    >
      <GradesAssessmentDetailSBAR
        v-if="selectedSbarAssessmentId && currentSbarAssessment"
        :current-assessment="currentSbarAssessment"
        :sorted-roster="sortedRoster"
        :focused-student-id="props.studentId"
        return-tab-mode="dossier"
        @close="selectedSbarAssessmentId = null"
      />
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, toRef } from 'vue'

defineOptions({ inheritAttrs: false })

import { initialDossierTab } from '../../composables/useGradebook.js'

// Shared session state
const activeTab = ref(initialDossierTab.value || 'summary')
const selectedPeriod = ref('semester')
let resetTimer = null

import { 
  LayoutDashboard, 
  GraduationCap, 
  AlertTriangle,
  TrendingDown,
  ClipboardList, 
  History, 
  UserCircle,
  UserMinus,
  Clock,
  Toilet,
  X,
  PlusCircle,
  Mail,
  Printer,
  Activity, 
  MessageSquare,
  Award
} from 'lucide-vue-next'
import { LEARNING_SKILL_CATEGORIES, getLearningSkillsByStudent } from '../../db/learningSkillsService.js'
import { useMessage } from '../../composables/useMessage.js'
import Student360Header from './Student360Header.vue'
import StudentStatCard from './StudentStatCard.vue'
import StudentTimeline from './StudentTimeline.vue'
import DossierCommunicationLog from './DossierCommunicationLog.vue'
import DossierQualitativeEvidence from './DossierQualitativeEvidence.vue'
import StudentTrendGraph from '../StudentTrendGraph.vue'
import StudentGradeTrend from './StudentGradeTrend.vue'
import StudentAcademicsTab from './StudentAcademicsTab.vue'
import Student360ProfileTab from './Student360ProfileTab.vue'
import Student360HistoryTab from './Student360HistoryTab.vue'
import Student360EmailModal from './Student360EmailModal.vue'
import Student360PrintModal from './Student360PrintModal.vue'
import Student360AttemptsModal from './Student360AttemptsModal.vue'
import BaseModal from '../BaseModal.vue'
import GradesAssessmentDetailSBAR from '../grades/GradesAssessmentDetailSBAR.vue'
import { getSBARLevelBadge } from '../../db/gradebook/gradeCalcSBAR.js'

import { useClassroom } from '../../composables/useClassroom.js'
import { toMinutes } from '../../db/eventService.js'
import { resolveIcon } from '../../utils/icons.js'
import { formatLocalDate } from '../../utils/dates.js'
import { 
  classGrades, 
  assessments, 
  loadGradebook, 
  activeClassRecord, 
  gradeMap,
  enterGrade,
  removeAttempt,
  setPrimaryAttempt,
  updateAttemptComment,
  deleteAssessment,
  filteredMilestones,
  globalMilestones,
  isAssessmentInSubCohort
} from '../../composables/useGradebook.js'
import { useStudentDossier } from '../../composables/useStudentDossier.js'

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true }
})

const emit = defineEmits(['close', 'select-assessment'])

const contextMenu = ref(null)
const attemptsPopover = ref(null)
const newAttemptForm = ref(null)
const selectedSbarAssessmentId = ref(null)

const currentSbarAssessment = computed(() => {
  if (!selectedSbarAssessmentId.value || !assessments.value) return null
  return assessments.value.find(a => String(a.assessmentId) === String(selectedSbarAssessmentId.value)) || null
})

function handleSelectAssessment(astId) {
  emit('select-assessment', astId)
  selectedSbarAssessmentId.value = astId
}

function handleClose() {
  selectedPeriod.value = 'semester'
  emit('close')
}

const { alert, confirm } = useMessage()
const { 
  classList,
  students,
  sortedRoster,
  behaviorCodes,
  activeClass,
  activeStudentEvents,
  getStudentEventHistory,
  logStandardEvent,
  removeEvent,
  getClass,
  updateStudentNote,
  updateStudentParentContacts,
  updateStudentIEP,
  updateStudentAccommodations,
  teacherName
} = useClassroom()

const { allTimeHistory, fetchAllTimeHistory, stats, filteredEvents } = useStudentDossier(selectedPeriod, toRef(props, 'classId'))
const semesterPeriod = ref('semester')
const { stats: overallStats } = useStudentDossier(semesterPeriod, toRef(props, 'classId'))

// Email & Print Modal states
const showEmailModal = ref(false)
const showPrintModal = ref(false)

// Past Absence Form State
const showAbsenceForm = ref(false)
const absenceDate = ref(formatLocalDate(new Date()))
const absenceIsTestDay = ref(false)

async function logAbsence() {
  if (!absenceDate.value) return
  const isDuplicate = events.value.some(ev => 
    ev.code === 'a' && !ev.superseded && formatLocalDate(ev.timestamp) === absenceDate.value
  )

  if (isDuplicate) {
    await alert(`An absence is already recorded for ${absenceDate.value}.`)
    return
  }

  try {
    await logStandardEvent(props.studentId, 'a', 'Past Absence Logged', { 
      timestamp: new Date(absenceDate.value + 'T12:00:00Z').toISOString(),
      testDay: absenceIsTestDay.value
    })
    showAbsenceForm.value = false
    absenceDate.value = formatLocalDate(new Date())
    absenceIsTestDay.value = false
  } catch (err) {
    console.error('Failed to log absence:', err)
    await alert('Failed to log absence. Please try again.')
  }
}

const hasHistory = computed(() => {
  return allTimeHistory.value.length > 1 || allTimeHistory.value.some(h => h.classId !== props.classId)
})

const tabs = computed(() => {
  const list = [
    { id: 'summary',       label: 'Summary',       icon: LayoutDashboard },
    { id: 'academics',     label: 'Academics',     icon: GraduationCap },
    { id: 'qualitative',   label: 'Qualitative Evidence', icon: ClipboardList },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'timeline',      label: 'Timeline',      icon: Activity }
  ]

  if (hasHistory.value) {
    list.push({ id: 'history', label: 'History', icon: History })
  }

  list.push({ id: 'profile', label: 'Profile', icon: UserCircle })
  return list
})

watch(hasHistory, (valid) => {
  if (!valid && activeTab.value === 'history') {
    activeTab.value = 'summary'
  }
})

const events = activeStudentEvents
const behaviorCodesMap = computed(() => 
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)

const student = computed(() => {
  const s = students.value[props.studentId] || activeClassRecord.value?.students?.[props.studentId] || {}
  // Ensure studentId is explicitly present on the object
  return {
    studentId: props.studentId,
    ...s
  }
})

const qualitativeEvents = computed(() =>
  [...events.value]
    .filter(e => e.code === 'ac')
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
)

const communicationEvents = computed(() =>
  [...events.value]
    .filter(e => e.code === 'pc' || e.category === 'communication')
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
)

const loading = ref(false)

const studentGrades = computed(() => classGrades.value?.[props.studentId] || {})
const overallGrade  = computed(() => studentGrades.value.overallGrade ?? null)
const formattedGrade = computed(() => overallGrade.value !== null ? `${Math.round(overallGrade.value)}%` : 'N/A')

const overallMostConsistent = computed(() => studentGrades.value.mostConsistent?.percentage ?? null)
const overallWeightedMedian = computed(() => studentGrades.value.median ?? null)
const consistentIsFallback = computed(() => studentGrades.value.mostConsistent?.isFallback ?? false)

// ── Learning Skills (Ontario Growing Success) ──
const learningSkillsRecords = ref([])
const activeDossierLsTerm = ref(null)

async function loadStudentLearningSkills() {
  if (!props.classId || !props.studentId) {
    learningSkillsRecords.value = []
    activeDossierLsTerm.value = null
    return
  }
  try {
    const list = await getLearningSkillsByStudent(props.classId, props.studentId)
    learningSkillsRecords.value = list || []
    if (list.length > 0 && (!activeDossierLsTerm.value || !list.some(r => r.term === activeDossierLsTerm.value))) {
      activeDossierLsTerm.value = list[0].term
    }
  } catch (err) {
    console.error('Failed to load student learning skills:', err)
  }
}

watch([() => props.classId, () => props.studentId], () => {
  loadStudentLearningSkills()
}, { immediate: true })

const currentDossierLsRecord = computed(() => {
  if (!learningSkillsRecords.value.length) return null
  if (activeDossierLsTerm.value) {
    return learningSkillsRecords.value.find(r => r.term === activeDossierLsTerm.value) || learningSkillsRecords.value[0]
  }
  return learningSkillsRecords.value[0]
})

const academicCategories = computed(() => {
  if (!activeClassRecord.value?.gradebookCategories) return []
  const results = studentGrades.value.categoryResults || {}
  const consistent = studentGrades.value.mostConsistent?.categoryBreakdown || {}
  
  return activeClassRecord.value.gradebookCategories.map(cat => ({
    ...cat,
    score: results[cat.categoryId]?.percentage ?? null,
    isOverridden: results[cat.categoryId]?.isOverridden ?? false,
    consistentScore: consistent[cat.categoryId]?.percentage ?? null,
    bucketLabel: consistent[cat.categoryId]?.bucketLabel ?? null,
    count: consistent[cat.categoryId]?.count ?? 0,
    totalCount: consistent[cat.categoryId]?.totalCount ?? 0
  }))
})

const currentStudentObj = computed(() => {
  return activeClassRecord.value?.students?.[props.studentId]
})

const studentSubCohort = computed(() => {
  const isElem = activeClassRecord.value?.classType === 'elementary'
  return isElem ? currentStudentObj.value?.gradeLevel : currentStudentObj.value?.courseCode
})

const classAssessments = computed(() => {
  const assList = Array.isArray(assessments.value) ? assessments.value : []
  return assList
    .filter(a => a && a.target !== 'individual' && isAssessmentInSubCohort(a, studentSubCohort.value))
    .map(a => {
      const g = gradeMap.value?.[a.assessmentId]?.[props.studentId]
      const score = g?.resolvedScore ?? null
      const aDate = (a.date || '').split('T')[0]
      const wasAbsent = (events.value || []).some(ev => 
        ev.code === 'a' && !ev.superseded && (ev.timestamp || '').startsWith(aDate)
      )

      return {
        ...a,
        score,
        attempts: g?.attempts || [],
        missing: g?.missing,
        excluded: g?.excluded,
        wasAbsent
      }
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

const individualAssessments = computed(() => {
  const assList = Array.isArray(assessments.value) ? assessments.value : []
  return assList
    .filter(a => a && a.target === 'individual' && String(a.targetStudentId) === String(props.studentId))
    .map(a => {
      const g = gradeMap.value?.[a.assessmentId]?.[props.studentId]
      const score = g?.resolvedScore ?? null
      return {
        ...a,
        score,
        attempts: g?.attempts || [],
        missing: g?.missing,
        excluded: g?.excluded
      }
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

const allDossierAssessments = computed(() => {
  const cList = Array.isArray(classAssessments.value) ? classAssessments.value : []
  const iList = Array.isArray(individualAssessments.value) ? individualAssessments.value : []
  return [...cList, ...iList].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
})

const testDayAlert = computed(() => stats.value.testDayAbsences > 1)

const washroomCount = computed(() => {
  return (filteredEvents.value || []).filter(e => {
    const config = behaviorCodesMap.value?.[e.code]
    return config?.type === 'toggle' && !e.superseded
  }).length
})

const redirectCount = computed(() => {
  return (filteredEvents.value || []).filter(e => e.category === 'redirect' && !e.superseded).length
})

const coachingInsight = computed(() => {
  const grade = overallGrade.value
  const absences = stats.value.absences

  if (grade !== null && grade < 70 && absences >= 3) {
    return {
      type: 'warning',
      title: 'Coaching Insight: Attendance Correlation',
      message: `Overall progress (${Math.round(grade)}%) appears to be impacted by ${absences} absences.`,
      recommendation: 'Recommend a 1-on-1 to discuss missed instruction and catch-up opportunities.'
    }
  }
  return null
})

const recentActivityFeed = computed(() => {
  const items = []
  const isSBARMode = activeClassRecord.value?.gradingFramework === 'sbar'

  // 1. Graded assessments for this student
  const assList = Array.isArray(allDossierAssessments.value) ? allDossierAssessments.value : []
  assList.forEach(ass => {
    if (!ass || ass.score === null || ass.score === undefined) return

    const isSBAR = ass.categoryId === 'sbar_general' || (ass.expectationIds && ass.expectationIds.length > 0)
    
    // Strict isolation based on active mode
    if (isSBARMode && !isSBAR) return
    if (!isSBARMode && isSBAR) return

    if (isSBAR) {
      const pct = Math.round(Number(ass.score))
      const badge = getSBARLevelBadge(pct)
      const expCount = ass.expectationIds?.length || 1
      items.push({
        id: 'ass-' + ass.assessmentId,
        date: ass.date || '',
        title: ass.name,
        type: 'grade',
        category: 'SBAR EVALUATION',
        value: badge.level,
        levelColor: badge.color,
        subText: `${expCount} Standard${expCount !== 1 ? 's' : ''}`,
        isFailing: pct < 50
      })
    } else {
      const total = ass.scaledTotal || ass.totalPoints || 100
      const pct = Math.round((ass.score / total) * 100)
      items.push({
        id: 'ass-' + ass.assessmentId,
        date: ass.date || '',
        title: ass.name,
        type: 'grade',
        category: ass.category || 'Assessment',
        value: `${pct}%`,
        subText: `${ass.score}/${total}`,
        isFailing: pct < 50
      })
    }
  })

  // 2. Logged student events (Notes, parent contact, lates, absences, redirects, washroom)
  const evtList = Array.isArray(events.value) ? events.value : []
  evtList.forEach(evt => {
    if (!evt || evt.superseded) return
    const evtType = evt.code || evt.type || ''
    if (['a', 'l', 'w', 'pc', 'ac', 'redirect', 'note'].includes(evtType) || evt.category === 'communication') {
      let cat = 'EVENT'
      if (evtType === 'a') cat = 'ABSENCE'
      else if (evtType === 'l') cat = 'LATE'
      else if (evtType === 'w') cat = `WASHROOM (${evt.durationMinutes || toMinutes(evt.duration) || 0}m)`
      else if (evtType === 'pc') cat = 'PARENT CONTACT'
      else if (evtType === 'ac') cat = 'NOTE'
      else if (evtType === 'redirect' || evt.category === 'redirect') cat = 'REDIRECT'

      items.push({
        id: 'evt-' + (evt.eventId || evt.id || Math.random()),
        date: evt.timestamp || evt.date || '',
        title: evt.note || evt.details || evt.label || cat,
        type: 'event',
        category: cat,
        value: null,
        subText: null,
        isFailing: false
      })
    }
  })

  return items
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 4)
})

function formatDateShort(dStr) {
  if (!dStr) return ''
  try {
    return new Date(dStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch (e) {
    return dStr
  }
}

const behaviorWeeklyTrend = computed(() => {
  if (!filteredEvents.value.length) return []
  const weeks = {}
  
  filteredEvents.value.forEach(e => {
    const d = new Date(e.timestamp)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mondayDate = new Date(d.setDate(diff))
    const monday = formatLocalDate(mondayDate)
    
    if (!weeks[monday]) {
      weeks[monday] = { week: monday, washroom: 0, absence: 0, late: 0 }
    }
    
    const config = behaviorCodesMap.value[e.code]
    if (config?.type === 'toggle' && !e.superseded) weeks[monday].washroom++
    else if (e.code === 'a' && !e.superseded) weeks[monday].absence++
    else if (e.code === 'l' && !e.superseded) weeks[monday].late++
  })
  
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
})

const attendanceAverages = computed(() => {
  const trend = behaviorWeeklyTrend.value
  let weekCount = 1
  if (selectedPeriod.value === 'month') weekCount = 4.3
  else if (selectedPeriod.value === 'semester') weekCount = Math.max(1, trend.length)
  
  const totalAbs = stats.value.absences
  const totalLates = stats.value.lates
  const totalWash = washroomCount.value
  
  const totalLateMins = filteredEvents.value
    .filter(e => e.code === 'l' && !e.superseded)
    .reduce((acc, e) => acc + toMinutes(e.duration), 0)
    
  const totalWashMins = filteredEvents.value
    .filter(e => {
      const config = behaviorCodesMap.value[e.code]
      return config?.type === 'toggle' && !e.superseded
    })
    .reduce((acc, e) => acc + toMinutes(e.duration), 0)

  return {
    absencesAvg: (totalAbs / weekCount).toFixed(1),
    latesAvg: (totalLates / weekCount).toFixed(1),
    washroomAvg: (totalWash / weekCount).toFixed(1),
    latesTotal: totalLateMins,
    washroomTotal: totalWashMins,
    washroomMinsAvg: Math.round((totalWashMins / weekCount) * 2) / 2,
    washroomAvgPerVisit: totalWash ? Math.round((totalWashMins / totalWash) * 2) / 2 : 0,
    latesAvgDuration: totalLates ? Math.round((totalLateMins / totalLates) * 2) / 2 : 0
  }
})

async function handleDeleteHistoryItem(eventId) {
  if (await confirm('Are you sure you want to delete this entry? This will also update student statistics.', 'Delete Entry', { danger: true })) {
    await removeEvent(eventId)
  }
}

async function saveGeneralNote(note) {
  if (student.value.generalNote !== note) {
    await updateStudentNote(props.studentId, note)
  }
}

async function saveStudentIEP(hasIEP) {
  if (Boolean(student.value.hasIEP) !== hasIEP) {
    await updateStudentIEP(props.studentId, hasIEP)
  }
}

async function saveStudentAccommodations(accommodations) {
  await updateStudentAccommodations(props.studentId, accommodations)
}

async function saveParentContacts(contacts) {
  await updateStudentParentContacts(props.studentId, contacts)
}

// Attempt Management Handlers
function startNewAttempt(assessmentId) {
  contextMenu.value = null
  newAttemptForm.value = {
    assessmentId,
    points: null,
    date: formatLocalDate(new Date()),
    comment: ''
  }
}

function openAttemptsFromMenu(event, assessmentId) {
  contextMenu.value = null
  attemptsPopover.value = {
    assessmentId,
    x: event.clientX,
    y: event.clientY
  }
}

async function toggleMissing(assessmentId) {
  const current = gradeMap.value[assessmentId]?.[props.studentId]?.missing
  await markMissing(assessmentId, props.studentId, !current)
  contextMenu.value = null
}

async function toggleExcluded(assessmentId) {
  const current = gradeMap.value[assessmentId]?.[props.studentId]?.excluded
  await markExcluded(assessmentId, props.studentId, !current)
  contextMenu.value = null
}

async function doDeleteAssessment(assessmentId) {
  contextMenu.value = null
  if (await confirm('Delete this assessment? This will remove all student scores for it.', 'Delete Assessment', { danger: true })) {
    await deleteAssessment(assessmentId)
  }
}

async function doSetPrimary(assessmentId, attemptId) {
  await setPrimaryAttempt(assessmentId, props.studentId, attemptId)
}

async function doDeleteAttempt(assessmentId, attemptId) {
  if (await confirm('Delete this attempt?', 'Delete Attempt', { danger: true })) {
    await removeAttempt(assessmentId, props.studentId, attemptId)
  }
}

async function doUpdateComment(assessmentId, attemptId, comment) {
  await updateAttemptComment(assessmentId, props.studentId, attemptId, comment)
}

async function submitNewAttempt() {
  if (!newAttemptForm.value || newAttemptForm.value.points === null) return
  await enterGrade(
    newAttemptForm.value.assessmentId,
    props.studentId,
    Number(newAttemptForm.value.points),
    newAttemptForm.value.date,
    newAttemptForm.value.comment
  )
  newAttemptForm.value = null
}

async function loadData() {
  loading.value = true
  if (!activeClassRecord.value || activeClassRecord.value.classId !== props.classId) {
    const cls = classList.value.find(c => c.classId === props.classId) || await getClass(props.classId)
    if (cls) await loadGradebook(cls)
  }
  events.value = await getStudentEventHistory(props.studentId)
  await fetchAllTimeHistory(props.studentId)
  loading.value = false
}

watch(() => props.studentId, loadData)
watch(() => props.classId, loadData)

onMounted(() => {
  if (resetTimer) clearTimeout(resetTimer)
  loadData()
})

onUnmounted(() => {
  resetTimer = setTimeout(() => {
    activeTab.value = 'summary'
    selectedPeriod.value = 'semester'
  }, 100)
})
</script>

<style scoped>
.student-360 {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-width: 0;
  background: var(--bg-secondary);
  overflow: hidden;
  position: relative;
}

.student-360__close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.student-360__close-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  transform: rotate(90deg);
}

.student-360__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.student-360__action-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.student-360__tabs {
  display: flex;
  gap: 8px;
  padding: 0 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}
.student-360__tabs::-webkit-scrollbar {
  display: none;
}

.student-360__tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.student-360__tab-btn:hover {
  color: var(--text);
}

.student-360__tab-btn--active {
  color: var(--primary);
  border-bottom: 2px solid var(--primary);
}

@media (max-width: 1100px) {
  .student-360__tab-btn {
    padding: 12px 10px;
    gap: 4px;
    font-size: 0.85rem;
  }
}

.student-360__content {
  flex: 1;
  min-width: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
}

@media (max-width: 1024px) {
  .student-360__content {
    padding: 16px;
  }
}

.student-360__pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  width: 100%;
}

.student-360__stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.student-360__period-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
  width: fit-content;
  margin-bottom: 8px;
}

.period-btn {
  padding: 6px 12px;
  border: none;
  background: none;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-btn:hover {
  color: var(--text);
}

.period-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.student-360__trends-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  min-width: 0;
  width: 100%;
}

@media (max-width: 1000px) {
  .student-360__trends-row {
    flex-direction: column;
  }
}

.trend-item {
  flex: 1 1 0px;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.trend-item__title {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.student-360__insight-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--warning);
}

.insight-icon {
  color: var(--warning);
}

.insight-title {
  margin: 0 0 4px 0;
  font-size: 0.9rem;
  font-weight: 700;
}

.insight-message {
  margin: 0 0 4px 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.insight-recommendation {
  margin: 0;
  font-size: 0.85rem;
}

.timeline-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.btn-log-absence {
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
}

.absence-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.absence-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.absence-checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.85rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.btn-ghost {
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.btn-primary {
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
}

/* ── Recent Activity & Assessment Feed Styles ── */
.student-360__recent-activity {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-activity__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recent-activity__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  margin: 0;
}

.recent-activity__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.recent-activity__card {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-activity__card--failing {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.04);
}

.activity-date {
  font-size: 0.725rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.activity-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.activity-badge {
  display: inline-block;
  width: fit-content;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  text-transform: uppercase;
}

.activity-badge--event {
  background: rgba(107, 114, 128, 0.1);
  color: var(--text-secondary);
}

.activity-name {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-score {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 2px;
  font-size: 0.9rem;
  color: var(--primary);
}

.activity-score--failing {
  color: #ef4444;
}

.activity-sub {
  font-size: 0.725rem;
  color: var(--text-secondary);
  font-weight: normal;
}

/* Learning Skills Card Styles */
.student-360__learning-skills-card {
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow-sm);
}

.learning-skills-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.learning-skills-card__title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.learning-skills-card__icon {
  color: var(--primary);
}

.learning-skills-card__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.learning-skills-card__term-pills {
  display: inline-flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 3px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.ls-dossier-pill {
  padding: 3px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ls-dossier-pill:hover {
  background: var(--surface);
  color: var(--text);
}

.ls-dossier-pill--active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  font-weight: 600;
}

.learning-skills-card__term-badge {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 700;
}

.learning-skills-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.ls-grid-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.ls-col-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ls-col-ratings {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ls-rating-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.ls-type {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.ls-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 800;
}

.ls-badge--E { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
.ls-badge--G { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.ls-badge--S { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
.ls-badge--N { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

.ls-badge-none {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.4;
}
</style>
