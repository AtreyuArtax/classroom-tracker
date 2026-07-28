<template>
  <div class="grades">
    <div class="grades__layout">
      
      <StudentSidebar 
        v-if="selectedStudentId && !isLoading"
        :students="sortedRoster"
        :selected-student-id="selectedStudentId"
        :show-academics="true"
        :is-privacy-mode="isPrivacyMode"
        :class-grades="classGrades"
        :student-trends="studentTrends"
        :is-collapsed="isSidebarCollapsed"
        @select-student="showStudentDossier"
        @navigate="$emit('navigate', $event)"
        @toggle-privacy="isPrivacyMode = !isPrivacyMode"
        @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      />

      <!-- Main Panel -->
      <main class="grades__main">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="grades__loading">
          <div class="grades__spinner"></div>
          <p>Loading Gradebook...</p>
        </div>

        <!-- Placeholder states -->
        <div v-else-if="!sidebarClassId" class="grades__placeholder">
          <BarChart2 :size="48" class="grades__placeholder-icon" />
          <p>Select a class to view the gradebook</p>
        </div>

        <!-- Detailed Assessment View Component -->
        <GradesAssessmentDetailView
          v-else-if="selectedAssessmentId && currentAssessment"
          :current-assessment="currentAssessment"
          :current-assessment-summary="currentAssessmentSummary"
          :sorted-roster="sortedRoster"
          :grade-map="gradeMap"
          :editing-cell="editingCell"
          :new-attempt-form="newAttemptForm"
          :selected-assessment-id="selectedAssessmentId"
          :excluded-students-count="filteredStudents.length"
          :active-class-record="activeClassRecord"
          :return-tab="returnTabMode"
          @close="closeAssessmentView"
          @start-edit="startEditAssessment"
          @show-missing-modal="showMissingModal = true"
          @confirm-delete="confirmDeleteAssessment"
          @show-dossier="showStudentDossier"
          @save-new-attempt="saveNewAttempt"
          @cancel-new-attempt="newAttemptForm = null"
          @save-edit="saveEdit"
          @cancel-edit="cancelEdit"
          @on-blur="onAssessmentViewBlur"
          @on-enter="onAssessmentViewEnter"
          @open-attempts="openAttempts"
          @open-context-menu="onContextMenu"
          @open-action-menu="onStudentActionMenu"
        />

        <div v-else-if="!selectedStudentId" class="grades__grid-container">
          <!-- Unified Toolbar -->
          <div v-if="activeClassRecord && !isLoading && !selectedAssessmentId" class="grades__toolbar">
            <div class="grades__toolbar-left">
              <ClassSwitcher @navigate="$emit('navigate', $event)" />
            </div>

            <div class="grades__toolbar-center">
              <div class="grades__toggle-group">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': !analyticsMode }"
                  @click="exitAnalyticsMode"
                  style="display: flex; align-items: center; gap: 4px;"
                >
                  <LayoutGrid :size="13" /> Grid
                </button>
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': analyticsMode }"
                  @click="enterAnalyticsMode"
                  style="display: flex; align-items: center; gap: 4px;"
                >
                  <BarChart2 :size="13" /> Analytics
                </button>
              </div>

              <div v-if="filteredMilestones?.length" class="grades__milestone-toggle">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': selectedMilestone === null }"
                  @click="selectedMilestone = null"
                >Current</button>
                <button 
                  v-for="m in filteredMilestones"
                  :key="m.milestoneId"
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': selectedMilestone === m.milestoneId }"
                  @click="selectedMilestone = m.milestoneId"
                >{{ m.name }}</button>
              </div>

              <div v-if="!analyticsMode" class="grades__toggle-group" title="Column Order">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': assessmentSortOrder === 'desc' }"
                  @click="assessmentSortOrder = 'desc'"
                >Newest</button>
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': assessmentSortOrder === 'asc' }"
                  @click="assessmentSortOrder = 'asc'"
                >Oldest</button>
              </div>

              <div v-if="!analyticsMode" class="grades__toggle-group">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': displayMode === 'raw' }"
                  @click="displayMode = 'raw'"
                >Raw</button>
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': displayMode === 'percent' }"
                  @click="displayMode = 'percent'"
                >%</button>
              </div>
            </div>

            <div class="grades__toolbar-right">
              <div class="grades__class-avg-display">
                Class Avg: <span class="grades__avg-value">{{ formatGrade(overallClassAvg) }}</span>
              </div>

              <button class="grades__btn-settings" title="Print Final Grades Grid" @click="showPrintGridModal = true">
                <Printer :size="18" />
              </button>

              <button class="grades__btn-settings" title="Manage Gradebook Setup" @click="$emit('navigate', 'Setup', { from: 'Grades', tab: 'gradebook' })">
                <Settings :size="18" />
              </button>

              <button v-if="!analyticsMode" class="grades__btn-add" @click="openAddAssessment('class')">
                <Plus :size="16" /> Add Assessment
              </button>
            </div>
          </div>

          <!-- Analytics Panel -->
          <GradesAnalyticsPanel
            v-if="analyticsMode"
            @select-assessment="openAssessmentView($event, 'analytics')"
          />

          <!-- The Scrollable Grid -->
          <GradesGrid
            v-else
            :is-privacy-mode="isPrivacyMode"
            :student-absence-totals="studentAbsenceTotals"
            :assessment-absence-map="assessmentAbsenceMap"
            @select-assessment="openAssessmentView($event, 'grid')"
            @open-dossier="showStudentDossier"
            @edit-assessment="startEditAssessment"
          />
        </div>

        <div v-else class="grades__student-view">
          <Student360 
            :student-id="selectedStudentId" 
            :class-id="activeClass?.classId"
            @close="closeStudentDossier"
          />
        </div>

      </main>
    </div>

    <!-- Student Action Context Menu Component -->
    <GradesContextMenu
      :student-action-menu="studentActionMenu"
      :selected-assessment-id="selectedAssessmentId"
      :grade-map="gradeMap"
      @close="studentActionMenu = null"
      @toggle-missing="toggleMissingFromView"
      @toggle-excluded="toggleExcludedFromView"
      @open-attempts="openAttempts"
      @start-new-attempt="startNewAttempt"
    />

    <!-- Missing Students Modal Component -->
    <GradesMissingModal
      :show="showMissingModal"
      :current-assessment="currentAssessment"
      :missing-students-list="missingStudentsList"
      @close="showMissingModal = false"
      @toggle-missing="toggleMissingFromModal"
    />

    <!-- Print Final Grades Grid Modal -->
    <PrintGradesGridModal
      v-if="showPrintGridModal"
      :class-record="activeClassRecord"
      :class-grades="classGrades"
      :teacher-name="teacherName"
      @close="showPrintGridModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useClassroom } from '../composables/useClassroom.js'
import { 
  activeClassRecord, 
  assessments,
  grades,
  classGrades, 
  selectedMilestone,
  filteredMilestones,
  gradeMap,
  assessmentStats,
  loadGradebook,
  markMissing,
  markExcluded,
  isEditingAssessment,
  currentAssessmentId,
  newAssessment,
  openAddAssessment,
  enterGrade,
  deleteAssessment,
  removeAttempt,
  setPrimaryAttempt,
  updateAttemptComment,
  analyticsMode,
  exclusionMode,
  fixedExclusionThreshold,
  classAnalytics,
  refreshClassAnalytics,
  resetAnalyticsState,
  showAddAssessmentModal,
  displayMode,
  assessmentSortOrder,
  gridSortBy,
  gridSortOrder
} from '../composables/useGradebook.js'
import { formatGrade } from '../utils/gradeColors.js'
import { useAttendanceInsights } from '../composables/useAttendanceInsights.js'
import { Plus, BarChart2, Settings, Printer, LayoutGrid } from 'lucide-vue-next'
import Student360 from '../components/dossier/Student360.vue'
import GradesGrid from '../components/GradesGrid.vue'
import GradesAnalyticsPanel from '../components/GradesAnalyticsPanel.vue'
import PrintGradesGridModal from '../components/PrintGradesGridModal.vue'
import StudentSidebar from '../components/StudentSidebar.vue'
import GradesAssessmentDetailView from '../components/grades/GradesAssessmentDetailView.vue'
import GradesMissingModal from '../components/grades/GradesMissingModal.vue'
import GradesContextMenu from '../components/grades/GradesContextMenu.vue'
import ClassSwitcher from '../components/ClassSwitcher.vue'
import { useMessage } from '../composables/useMessage.js'
import { getAssessmentPercentage } from '../db/gradebookService.js'

const props = defineProps({
  classId: String,
  studentId: String
})

defineEmits(['navigate'])

const { alert, confirm } = useMessage()
const { classList, activeClass, getClass, switchClass, teacherName } = useClassroom()
const sidebarClassId = ref(activeClass.value?.classId || '')
const { assessmentAbsenceMap, studentAbsenceTotals } = useAttendanceInsights(sidebarClassId, assessments, classGrades)

watch(activeClass, async (newVal, oldVal) => {
  if (newVal && newVal.classId !== oldVal?.classId) {
    sidebarClassId.value = newVal.classId
    selectedStudentId.value = null
    await onClassChange()
  }
})

const isLoading = ref(false)
const isCalculating = ref(false)
const showPrintGridModal = ref(false)

const selectedStudentId = ref(null)
const selectedAssessmentId = ref(null)
const studentActionMenu = ref(null)
const editingCell = ref(null)
const attemptsPopover = ref(null)

const returnTabMode = ref('grid') // 'grid' | 'analytics'
const savedAnalyticsScrollY = ref(0)
const savedGridScrollY = ref(0)
const savedGridScrollX = ref(0)

function openAssessmentView(assessmentId, source = 'grid') {
  returnTabMode.value = source

  if (source === 'analytics') {
    const el = document.querySelector('.grades__analytics-scrollable')
    if (el) savedAnalyticsScrollY.value = el.scrollTop
  } else {
    const el = document.querySelector('.grades__grid-wrapper')
    if (el) {
      savedGridScrollY.value = el.scrollTop
      savedGridScrollX.value = el.scrollLeft
    }
  }

  selectedAssessmentId.value = assessmentId
}

function closeAssessmentView() {
  selectedAssessmentId.value = null
  analyticsMode.value = (returnTabMode.value === 'analytics')

  nextTick(() => {
    requestAnimationFrame(() => {
      if (returnTabMode.value === 'analytics') {
        const el = document.querySelector('.grades__analytics-scrollable')
        if (el) el.scrollTop = savedAnalyticsScrollY.value
      } else {
        const el = document.querySelector('.grades__grid-wrapper')
        if (el) {
          el.scrollTop = savedGridScrollY.value
          el.scrollLeft = savedGridScrollX.value
        }
      }
    })
  })
}

const previousAssessmentId = ref(null)

function showStudentDossier(studentId) {
  if (selectedAssessmentId.value) {
    previousAssessmentId.value = selectedAssessmentId.value
    selectedAssessmentId.value = null
  } else if (!previousAssessmentId.value) {
    returnTabMode.value = analyticsMode.value ? 'analytics' : 'grid'
    if (analyticsMode.value) {
      const el = document.querySelector('.grades__analytics-scrollable')
      if (el) savedAnalyticsScrollY.value = el.scrollTop
    } else {
      const el = document.querySelector('.grades__grid-wrapper')
      if (el) {
        savedGridScrollY.value = el.scrollTop
        savedGridScrollX.value = el.scrollLeft
      }
    }
  }

  selectedStudentId.value = studentId
}

function closeStudentDossier() {
  selectedStudentId.value = null

  if (previousAssessmentId.value) {
    selectedAssessmentId.value = previousAssessmentId.value
    previousAssessmentId.value = null
  } else {
    analyticsMode.value = (returnTabMode.value === 'analytics')

    nextTick(() => {
      requestAnimationFrame(() => {
        if (returnTabMode.value === 'analytics') {
          const el = document.querySelector('.grades__analytics-scrollable')
          if (el) el.scrollTop = savedAnalyticsScrollY.value
        } else {
          const el = document.querySelector('.grades__grid-wrapper')
          if (el) {
            el.scrollTop = savedGridScrollY.value
            el.scrollLeft = savedGridScrollX.value
          }
        }
      })
    })
  }
}

const isSidebarCollapsed = ref(false)
const newAttemptForm = ref(null)
const isPrivacyMode = ref(false)
const showMissingModal = ref(false)

watch(exclusionMode, async () => {
  if (analyticsMode.value) {
    isCalculating.value = true
    try {
      await refreshClassAnalytics()
    } finally {
      isCalculating.value = false
    }
  }
})

watch(fixedExclusionThreshold, async () => {
  if (analyticsMode.value && exclusionMode.value === 'fixed') {
    isCalculating.value = true
    try {
      await refreshClassAnalytics()
    } finally {
      isCalculating.value = false
    }
  }
})

const filteredStudents = computed(() => {
  if (!activeClassRecord.value?.students) return []
  return Object.keys(activeClassRecord.value.students)
    .filter(id => activeClassRecord.value.students[id].excludeFromAnalytics && !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))
})

const sortedRoster = computed(() => {
  if (!activeClassRecord.value?.students) return []
  
  const studentList = Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ 
      studentId: id, 
      ...activeClassRecord.value.students[id],
      overallGrade: classGrades.value[id]?.overallGrade ?? -1
    }))

  return studentList.sort((a, b) => {
    if (gridSortBy.value === 'grade') {
      const gA = a.overallGrade
      const gB = b.overallGrade
      return gridSortOrder.value === 'asc' ? gA - gB : gB - gA
    } else if (gridSortBy.value !== 'name') {
      const aId = gridSortBy.value
      const gradeA = gradeMap.value[aId]?.[a.studentId]
      const gradeB = gradeMap.value[aId]?.[b.studentId]
      
      const getVal = (g) => {
        if (!g) return -1
        if (g.excluded) return -1
        if (g.missing) return 0
        return g.resolvedScore ?? -1
      }
      
      const valA = getVal(gradeA)
      const valB = getVal(gradeB)
      return gridSortOrder.value === 'asc' ? valA - valB : valB - valA
    }
    
    const nameA = a.lastName.toLowerCase()
    const nameB = b.lastName.toLowerCase()
    if (gridSortOrder.value === 'asc') return nameA.localeCompare(nameB)
    return nameB.localeCompare(nameA)
  })
})

const studentTrends = computed(() => {
  if (!activeClassRecord.value?.students || !assessments.value || !gradeMap.value) return {}
  
  const productAssessments = [...assessments.value]
    .filter(a => a.assessmentType === 'product' && !a.excluded && a.target !== 'individual')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    
  if (productAssessments.length === 0) return {}
  
  const trends = {}
  Object.keys(activeClassRecord.value.students).forEach(studentId => {
    if (activeClassRecord.value.students[studentId].archived) return
    const data = []
    productAssessments.forEach(a => {
      const grade = gradeMap.value[a.assessmentId]?.[studentId]
      const percentage = getAssessmentPercentage(a, grade)
      if (percentage !== null) {
        data.push(percentage)
      }
    })
    trends[studentId] = data
  })
  
  return trends
})

const currentAssessment = computed(() => {
  if (!selectedAssessmentId.value) return null
  return assessments.value.find(a => a.assessmentId === selectedAssessmentId.value)
})

const missingStudentsList = computed(() => {
  if (!currentAssessment.value || !activeClassRecord.value?.students) return []
  const list = []
  for (const student of sortedRoster.value) {
    const grade = gradeMap.value[currentAssessment.value.assessmentId]?.[student.studentId]
    if (grade?.excluded) continue
    if (!grade || (!grade.missing && (!grade.attempts || grade.attempts.length === 0))) {
      list.push({ ...student, status: 'blank' })
    } else if (grade.missing) {
      list.push({ ...student, status: 'missing' })
    }
  }
  return list
})

async function toggleMissingFromModal(studentId) {
  const current = isMissing(studentId, currentAssessment.value.assessmentId)
  await markMissing(currentAssessment.value.assessmentId, studentId, !current)
}

function isMissing(studentId, assessmentId) {
  return !!gradeMap.value[assessmentId]?.[studentId]?.missing
}

function isExcluded(studentId, assessmentId) {
  return !!gradeMap.value[assessmentId]?.[studentId]?.excluded
}

const currentAssessmentSummary = computed(() => {
  if (!selectedAssessmentId.value || !currentAssessment.value) return null
  const stats = assessmentStats.value[selectedAssessmentId.value]
  
  const totalStudents = sortedRoster.value.length
  const enteredCount = sortedRoster.value.filter(s => {
    const grade = gradeMap.value[selectedAssessmentId.value]?.[s.studentId]
    return grade && (grade.attempts?.length > 0 || grade.missing || grade.excluded)
  }).length

  return {
    ...stats,
    enteredCount,
    totalStudents,
    percentEntered: totalStudents > 0 ? (enteredCount / totalStudents) * 100 : 0
  }
})

const filteredClassGrades = computed(() => {
  if (!classGrades.value) return {}
  const manualExcludes = new Set(
    Object.keys(activeClassRecord.value?.students ?? {})
      .filter(id => activeClassRecord.value.students[id].excludeFromAnalytics)
  )

  const isToggleActive = exclusionMode.value !== 'none' && classAnalytics.value?.outlierStudentIds
  const outlierIds = isToggleActive ? new Set(classAnalytics.value.outlierStudentIds) : new Set()

  const filtered = {}
  Object.keys(classGrades.value).forEach(studentId => {
    if (!manualExcludes.has(studentId) && !outlierIds.has(studentId)) {
      filtered[studentId] = classGrades.value[studentId]
    }
  })
  return filtered
})

const overallClassAvg = computed(() => {
  const gradeList = Object.values(filteredClassGrades.value)
    .filter(g => g && g.overallGrade !== null)
    .map(g => g.overallGrade)
  
  if (gradeList.length === 0) return null
  const sum = gradeList.reduce((acc, g) => acc + g, 0)
  return sum / gradeList.length
})

async function onClassChange() {
  if (!sidebarClassId.value) return
  isLoading.value = true
  try {
    const cls = await getClass(sidebarClassId.value)
    if (cls) {
      await loadGradebook(cls)
    }
  } finally {
    isLoading.value = false
  }
}

async function enterAnalyticsMode() {
  selectedStudentId.value = null
  analyticsMode.value = true
  isCalculating.value = true
  try {
    await refreshClassAnalytics()
  } finally {
    isCalculating.value = false
  }
}

function exitAnalyticsMode() {
  resetAnalyticsState()
}

function startEditAssessment(assessment) {
  isEditingAssessment.value = true
  currentAssessmentId.value = assessment.assessmentId
  
  newAssessment.value = {
    name: assessment.name,
    description: assessment.description || '',
    categoryId: assessment.categoryId,
    assessmentType: assessment.assessmentType,
    unitId: assessment.unitId || null,
    expectationId: assessment.expectationId || null,
    target: assessment.target || 'class',
    targetStudentId: assessment.targetStudentId || null,
    date: assessment.date,
    totalPoints: assessment.totalPoints,
    scaledTotal: assessment.scaledTotal,
    retestPolicy: assessment.retestPolicy || 'highest'
  }
  
  showAddAssessmentModal.value = true
}

async function confirmDeleteAssessment(assessment) {
  if (!await confirm(`Delete ${assessment.name}? This will permanently remove all grades for this assessment and cannot be undone.`, 'Delete Assessment', { danger: true })) return
  await deleteAssessment(assessment.assessmentId)
  selectedAssessmentId.value = null
}

function onStudentActionMenu(event, studentId) {
  studentActionMenu.value = {
    x: event.clientX,
    y: event.clientY,
    studentId
  }
}

function onContextMenu(event, studentId, assessmentId) {
  studentActionMenu.value = {
    x: event.clientX,
    y: event.clientY,
    studentId
  }
}

async function toggleMissingFromView(studentId) {
  if (!selectedAssessmentId.value) return
  const current = isMissing(studentId, selectedAssessmentId.value)
  await markMissing(selectedAssessmentId.value, studentId, !current)
}

async function toggleExcludedFromView(studentId) {
  if (!selectedAssessmentId.value) return
  const current = isExcluded(studentId, selectedAssessmentId.value)
  await markExcluded(selectedAssessmentId.value, studentId, !current)
}

function openAttempts(event, studentId, assessmentId) {
  // Handled via context menu or inline attempt modals
}

function startNewAttempt(studentId) {
  if (!selectedAssessmentId.value) return
  newAttemptForm.value = {
    studentId,
    points: null,
    date: new Date().toISOString().split('T')[0],
    comment: ''
  }
}

async function saveNewAttempt() {
  if (!newAttemptForm.value || !selectedAssessmentId.value) return
  await enterGrade(selectedAssessmentId.value, newAttemptForm.value.studentId, {
    pointsEarned: Number(newAttemptForm.value.points),
    date: newAttemptForm.value.date,
    comment: newAttemptForm.value.comment
  })
  newAttemptForm.value = null
}

async function onAssessmentViewBlur(studentId, value) {
  if (!selectedAssessmentId.value) return
  const num = value === '' ? null : Number(value)
  await enterGrade(selectedAssessmentId.value, studentId, { pointsEarned: num })
}

async function onAssessmentViewEnter(studentId, direction, event) {
  await onAssessmentViewBlur(studentId, event.target.value)
}

function saveEdit() {
  if (editingCell.value) {
    onAssessmentViewBlur(editingCell.value.sId, editingCell.value.value)
    editingCell.value = null
  }
}

function cancelEdit() {
  editingCell.value = null
}

onMounted(async () => {
  if (props.classId) {
    sidebarClassId.value = props.classId
    await switchClass(props.classId)
  }
  if (sidebarClassId.value) {
    await onClassChange()
  }
})
</script>

<style scoped>
.grades {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-secondary);
}

.grades__layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.grades__main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.grades__loading, .grades__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  font-weight: 600;
}

.grades__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.grades__grid-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.grades__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.grades__toolbar-left, .grades__toolbar-center, .grades__toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.grades__btn-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}

.grades__btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.grades__toggle-group, .grades__milestone-toggle {
  display: flex;
  gap: 2px;
  background: var(--bg-secondary);
  padding: 3px;
  border-radius: var(--radius-md);
}

.grades__toggle-btn {
  padding: 6px 12px;
  border: none;
  background: none;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.grades__toggle-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.grades__class-avg-display {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.grades__avg-value {
  font-weight: 800;
  color: var(--primary);
}

.grades__student-view {
  height: 100%;
}
</style>
