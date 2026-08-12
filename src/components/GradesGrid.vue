<template>
  <div class="grades__grid-container-outer">
    <!-- Unit & Sub-Cohort Filter Bar (Fixed above table) -->
    <div v-if="availableSubCohorts.length > 1 || availableUnits.length > 0" class="grades__filter-bar">
      <!-- Row 1: Sub-Cohort Filter Pills (Split-Grade or Split-Section Classes) -->
      <div v-if="availableSubCohorts.length > 1" class="grades__filter-row grades__filter-row--top">
        <div class="grades__filter-group">
          <span class="grades__filter-label">{{ activeClassRecord?.classType === 'elementary' ? 'Grade:' : 'Section:' }}</span>
          <div class="grades__filter-chips">
            <button 
              v-for="subCohort in availableSubCohorts" 
              :key="subCohort" 
              type="button"
              class="grid-chip"
              :class="{ 'grid-chip--active': String(activeSubCohortFilter).toLowerCase() === String(subCohort).toLowerCase() }"
              @click="activeSubCohortFilter = subCohort; selectedUnitId = null"
            >
              {{ subCohort === 'all' ? (activeClassRecord?.classType === 'elementary' ? 'All Grades' : 'All Sections') : subCohort }}
            </button>
          </div>
        </div>
      </div>

      <!-- Row 2: Unit / Strand Filter Pills -->
      <div v-if="availableUnits.length > 0 && (activeClassRecord?.classType !== 'elementary' || availableSubCohorts.length <= 1 || String(activeSubCohortFilter).toLowerCase() !== 'all')" class="grades__filter-row grades__filter-row--bottom">
        <div class="grades__filter-group">
          <span class="grades__filter-label">{{ activeClassRecord?.classType === 'elementary' ? 'Strand:' : 'Unit:' }}</span>
          <div class="grades__filter-chips">
            <button 
              class="grid-chip" 
              :class="{ 'grid-chip--active': selectedUnitId === null }"
              @click="selectedUnitId = null"
            >
              {{ activeClassRecord?.classType === 'elementary' ? 'All Strands' : 'All Units' }}
              <span class="grid-chip__badge">{{ totalAssessmentCount }}</span>
            </button>
            <button 
              v-for="u in availableUnits" 
              :key="u.unitId"
              class="grid-chip"
              :class="{ 'grid-chip--active': selectedUnitId === u.unitId }"
              :style="selectedUnitId === u.unitId ? { background: getUnitColor(u.unitId), borderColor: getUnitColor(u.unitId), color: '#fff' } : {}"
              @click="selectedUnitId = u.unitId"
            >
              <span class="grid-chip__dot" :style="{ background: selectedUnitId === u.unitId ? '#fff' : getUnitColor(u.unitId) }"></span>
              <span>{{ cleanUnitPillName(u.name) }}</span>
              <span class="grid-chip__badge">{{ getUnitAssessmentCount(u.unitId, u.name) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Scrollable Table Wrapper -->
    <div class="grades__grid-wrapper">
      <table class="grades__grid">
      <thead>
        <!-- Top Header -->
        <tr>
          <th class="grades__th-student">
            <div class="grades__assessment-header">
              <div class="grades__sort-header" @click="toggleGridSort('name')">
                Student Name
                <span v-if="gridSortBy === 'name'" class="grades__sort-icon">
                  <ChevronUp v-if="gridSortOrder === 'asc'" :size="14" />
                  <ChevronDown v-else :size="14" />
                </span>
              </div>
              <button class="grades__header-menu-btn" @click.stop="onHeaderMenu($event, 'name')">
                <MoreVertical :size="14" />
              </button>
            </div>
          </th>
          <th class="grades__th-overall">
            <div class="grades__assessment-header">
              <div class="grades__sort-header" @click="toggleGridSort('grade')">
                Overall
                <span v-if="gridSortBy === 'grade'" class="grades__sort-icon">
                  <ChevronUp v-if="gridSortOrder === 'asc'" :size="14" />
                  <ChevronDown v-else :size="14" />
                </span>
              </div>
              <button class="grades__header-menu-btn" @click.stop="onHeaderMenu($event, 'grade')">
                <MoreVertical :size="14" />
              </button>
            </div>
          </th>
          <th 
            v-for="a in sortedAssessments" 
            :key="a.assessmentId"
            class="grades__th-assessment"
            :style="{ borderTop: '3px solid ' + (getUnitColor(a.unitId) !== '#64748b' ? getUnitColor(a.unitId) : getCategoryColor(a.categoryId)) }"
          >
            <div class="grades__assessment-header">
              <div class="grades__assessment-info" @click="$emit('select-assessment', a.assessmentId)">
                <span class="grades__assessment-name" :title="a.description || a.name">
                  {{ a.name }}
                  <span v-if="gridSortBy == a.assessmentId" class="grades__sort-icon">
                    <ChevronUp v-if="gridSortOrder === 'asc'" :size="12" />
                    <ChevronDown v-else :size="12" />
                  </span>
                </span>
                <div class="grades__assessment-meta">
                  <span class="grades__assessment-points">/{{ a.totalPoints }}</span>
                  <span v-if="a.categoryId" class="grades__assessment-cat-tag" :style="{ color: getCategoryColor(a.categoryId) }">
                    {{ getCategoryName(a.categoryId) }}
                  </span>
                  <span v-else-if="a.unitId" class="grades__assessment-unit">{{ getUnitName(a.unitId) }}</span>
                  <span 
                    v-if="(a.targetCourseCode || a.gradeLevel) && (a.targetCourseCode !== 'ALL' && a.gradeLevel !== 'ALL') && availableSubCohorts.length > 1 && activeSubCohortFilter === 'all'" 
                    class="grades__assessment-sec-badge"
                  >
                    {{ a.targetCourseCode || (a.gradeLevel ? a.gradeLevel.replace('Grade ', 'Gr. ') : '') }}
                  </span>
                </div>
              </div>
              <button class="grades__header-menu-btn" @click.stop="onHeaderMenu($event, 'assessment', a)">
                <MoreVertical :size="14" />
              </button>
            </div>
          </th>
        </tr>

        <!-- Class Avg Row (Sticky below headers) -->
        <tr class="grades__tr-avg">
          <td class="grades__td-student">Class Average</td>
          <td 
            class="grades__td-overall grades__td-avg"
            @click="toggleGridSort('grade')"
            title="Sort by overall mark"
          >
            {{ formatGrade(overallClassAvg) }}
          </td>
          <td 
            v-for="a in sortedAssessments" 
            :key="a.assessmentId"
            class="grades__td-assessment grades__td-avg"
            @click="toggleGridSort(a.assessmentId)"
            title="Sort by this assessment"
          >
            <div v-if="getAssessmentAvg(a.assessmentId) !== null">
              {{ formatCellGrade(getAssessmentAvg(a.assessmentId), a.totalPoints) }}
            </div>
            <div v-else class="text-muted">—</div>
          </td>
        </tr>
      </thead>
      
      <tbody>
        <tr v-for="student in sortedRoster" :key="student.studentId">
          <td 
            class="grades__td-student" 
            :class="{ 'grades__td--highlighted': highlightedColumnId === 'name' }"
            @click="$emit('open-dossier', student.studentId)"
          >
            <div class="grades__student-name-group" :title="`${student.lastName}, ${student.firstName}`">
              <div class="grades__student-name-container">
                <div class="grades__student-lastname">{{ student.lastName }}</div>
                <TestDayWarning 
                  v-if="studentAbsenceTotals[student.studentId]?.testDays >= 2" 
                  :count="studentAbsenceTotals[student.studentId].testDays" 
                />
              </div>
              <div class="grades__student-firstname-row">
                <span class="grades__student-firstname">{{ student.firstName }}</span>
                <span 
                  v-if="(student.gradeLevel || student.courseCode) && availableSubCohorts.length > 1" 
                  class="sbar-student-grade-tag"
                >
                  {{ student.gradeLevel ? student.gradeLevel.replace('Grade ', 'Gr. ') : student.courseCode }}
                </span>
              </div>
              <div class="grades__sparkline-mini" v-if="studentTrends[student.studentId]?.length > 1 && !props.isPrivacyMode">
                <svg width="80" height="14" viewBox="0 0 80 14">
                  <path
                    fill="none"
                    :stroke="getGradeColor(classGrades[student.studentId]?.overallGrade)"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :d="getSparklinePath(studentTrends[student.studentId], 80, 14)"
                  />
                </svg>
              </div>
            </div>
          </td>
          <td 
            class="grades__td-overall grades__td-overall--editable"
            :class="{ 
              'grades__td--highlighted': highlightedColumnId === 'grade',
              'grades__td-overall--adjusted': classGrades[student.studentId]?.isGradeAdjusted
            }"
            :style="{ background: getHeatColor(classGrades[student.studentId]?.overallGrade) }"
            @click="startEdit(student.studentId, 'overall')"
            @contextmenu.prevent="onContextMenu($event, student.studentId, 'overall')"
          >
            <!-- Inline Editor -->
            <div v-if="editingCell?.sId === student.studentId && editingCell?.aId === 'overall'" class="grades__cell-edit">
              <input 
                ref="editInput"
                v-model.number="editingCell.value"
                type="number"
                min="0"
                max="100"
                class="grades__input-inline"
                @blur="saveEdit"
                @keydown="onKeyNavigate"
                @keydown.esc.prevent="cancelEdit"
              />
            </div>
            <div v-else class="grades__overall-cell-content">
              <span>{{ formatGrade(classGrades[student.studentId]?.overallGrade) }}</span>
              <span 
                v-if="classGrades[student.studentId]?.isGradeAdjusted" 
                class="grades__adjusted-asterisk"
                :title="'Adjusted (Calculated: ' + formatGrade(classGrades[student.studentId]?.calculatedOverallGrade) + ')'"
              >
                *
              </span>
            </div>
          </td>
          <td 
            v-for="a in sortedAssessments" 
            :key="a.assessmentId"
            class="grades__td-assessment"
            :class="{ 'grades__td-assessment--highlighted': highlightedColumnId === a.assessmentId }"
            :style="getCellStyle(student.studentId, a.assessmentId, a.totalPoints)"
            @click="isCellApplicable(student.studentId, a) && startEdit(student.studentId, a.assessmentId)"
            @contextmenu.prevent="isCellApplicable(student.studentId, a) && onContextMenu($event, student.studentId, a.assessmentId)"
          >
            <!-- Inline Editor -->
            <div v-if="editingCell?.sId === student.studentId && editingCell?.aId === a.assessmentId" class="grades__cell-edit">
              <input 
                ref="editInput"
                v-model.number="editingCell.value"
                type="number"
                min="0"
                :max="a.totalPoints"
                class="grades__input-inline"
                @blur="saveEdit"
                @keydown="onKeyNavigate"
                @keydown.esc.prevent="cancelEdit"
              />
            </div>

            <div v-else-if="!isCellApplicable(student.studentId, a)" class="grades__cell-content">
              <span style="color: #9ca3af; font-size: 0.72rem; font-style: italic;">N/A</span>
            </div>

            <div v-else-if="gradeMap[a.assessmentId]?.[student.studentId]" class="grades__cell-content">
              <span v-if="gradeMap[a.assessmentId][student.studentId].missing" class="grades__cell-missing">M</span>
              <span v-else-if="gradeMap[a.assessmentId][student.studentId].excluded" class="grades__cell-excluded">EX</span>
              <span v-else-if="gradeMap[a.assessmentId][student.studentId].resolvedScore !== null">
                {{ formatCellGrade(gradeMap[a.assessmentId][student.studentId].resolvedScore, a.totalPoints) }}
              </span>
              <span v-else class="grades__cell-placeholder">—</span>
              
              <!-- Absent on Test Day Dot -->
              <div 
                v-if="assessmentAbsenceMap[student.studentId]?.[a.assessmentId]" 
                class="grades__cell-absent-dot" 
                title="Student was marked absent on the date of this assessment"
              ></div>
              
              <!-- Retest Indicator -->
              <button 
                v-if="gradeMap[a.assessmentId]?.[student.studentId]?.attempts?.length > 1" 
                class="grades__cell-retest-btn"
                title="View attempts"
                @click.stop="openAttempts($event, student.studentId, a.assessmentId)"
              >•</button>
            </div>
            <div v-else class="grades__cell-placeholder">—</div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Context Menus & Attempts Popover (Moved inside the grid wrapper for self-containment) -->
    <div v-if="contextMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="contextMenu = null" @contextmenu.prevent="contextMenu = null">
      <div class="grades__context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <template v-if="contextMenu.aId === 'overall'">
          <button class="grades__context-btn" @click="startEdit(contextMenu.sId, 'overall'); contextMenu = null">
            <Pencil :size="14" /> Adjust Grade
          </button>
          <button 
            v-if="classGrades[contextMenu.sId]?.isGradeAdjusted" 
            class="grades__context-btn" 
            @click="undoStudentGradeAdjustment(contextMenu.sId); contextMenu = null"
          >
            <RotateCcw :size="14" /> Reset to Calculated
          </button>
        </template>
        <template v-else>
          <button class="grades__context-btn" @click="startEdit(contextMenu.sId, contextMenu.aId); contextMenu = null">
            <Plus :size="14" /> New Attempt
          </button>
          <button 
            v-if="gradeMap[contextMenu.aId]?.[contextMenu.sId]?.attempts?.length >= 1" 
            class="grades__context-btn" 
            @click="openAttemptsFromMenu($event, contextMenu.sId, contextMenu.aId)"
          >
            <Calendar :size="14" /> View Notes
          </button>
          <button class="grades__context-btn" @click="toggleMissing">
            <AlertCircle :size="14" /> {{ isMissing(contextMenu.sId, contextMenu.aId) ? 'Unmark Missing' : 'Mark Missing' }}
          </button>
          <button class="grades__context-btn" @click="toggleExcluded">
            <XCircle :size="14" /> {{ isExcluded(contextMenu.sId, contextMenu.aId) ? 'Include in Grade' : 'Mark Excluded' }}
          </button>
        </template>
      </div>
    </div>

    <div v-if="headerMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="headerMenu = null" @contextmenu.prevent="headerMenu = null">
      <div class="grades__context-menu" :style="{ top: headerMenu.y + 'px', left: headerMenu.x + 'px' }">
        <template v-if="headerMenu.type === 'name'">
          <button class="grades__context-btn" @click="toggleGridSort('name'); headerMenu = null">
            <BarChart2 :size="14" /> Sort by Name
          </button>
          <button class="grades__context-btn" @click="copyStudentNames(); headerMenu = null">
            <Copy :size="14" /> Copy Names List
          </button>
        </template>

        <template v-if="headerMenu.type === 'grade'">
          <button class="grades__context-btn" @click="toggleGridSort('grade'); headerMenu = null">
            <BarChart2 :size="14" /> Sort by Grade
          </button>
          <button class="grades__context-btn" @click="copyOverallGrades(); headerMenu = null">
            <Copy :size="14" /> Copy Overall Marks
          </button>
        </template>

        <template v-if="headerMenu.type === 'assessment'">
          <button class="grades__context-btn" @click="toggleGridSort(headerMenu.assessment.assessmentId); headerMenu = null">
            <BarChart2 :size="14" /> Sort by Assessment
          </button>
          <button class="grades__context-btn" @click="onEditAssessment(headerMenu.assessment); headerMenu = null">
            <Pencil :size="14" /> Edit Assessment
          </button>
          <button class="grades__context-btn" @click="copyAssessmentGrades(headerMenu.assessment); headerMenu = null">
            <Copy :size="14" /> Copy Column (Scores)
          </button>
          <button class="grades__context-btn grades__context-btn--danger" @click="confirmDeleteAssessment(headerMenu.assessment); headerMenu = null">
            <Trash2 :size="14" /> Delete Assessment
          </button>
        </template>
      </div>
    </div>

    <!-- Unified Attempt History Modal -->
    <GradesAttemptHistoryModal
      :show="!!attemptsPopover"
      :student-name="attemptsPopover?.studentName"
      :assessment-name="attemptsPopover?.assessmentName"
      :total-points="attemptsPopover?.totalPoints"
      :retest-policy="attemptsPopover?.retestPolicy"
      :resolved-score="attemptsPopover?.resolvedScore"
      :attempts="attemptsPopover?.attempts || []"
      @close="attemptsPopover = null"
      @delete-attempt="attId => onDeleteAttempt(attId)"
      @update-comment="(attId, val) => onUpdateComment(attId, val)"
      @start-new-attempt="attemptsPopover = null"
    />
  </div>
</div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { getEffectiveClassRecord } from '../composables/useElementary.js'
import { activeSubjectId } from '../composables/useClassroomState.js'
import { 
  activeClassRecord, 
  assessments, 
  classGrades, 
  gradeMap,
  displayMode,
  assessmentSortOrder,
  adjustStudentGrade,
  undoStudentGradeAdjustment,
  deleteAssessment,
  assessmentStats,
  gridSortBy,
  gridSortOrder,
  selectedCourseFilter,
  activeSubCohortFilter,
  availableSubCohorts,
  isStudentInSubCohort,
  isAssessmentInSubCohort,
  isAssessmentApplicableToStudent,
  getUnitGradeLevel
} from '../composables/useGradebook.js'
import { useGradeEditing } from '../composables/useGradeEditing.js'
import {
  getHeatColor,
  getHeatColorHex,
  getHeatTextColor,
  getGradeColorMuted as getGradeColor,
  getSDColor,
  getCoverageColor,
  formatGrade,
  UNIT_COLORS,
  getSectionColor
} from '../utils/gradeColors.js'
import { useMessage } from '../composables/useMessage.js'
import { cleanUnitName } from '../composables/useElementary.js'
import { getAssessmentPercentage } from '../db/gradebookService.js'
import { formatLocalDisplay } from '../utils/dates.js'
import { 
  Plus, Pencil, XCircle, AlertCircle, Trash2, X, MoreVertical, 
  ChevronUp, ChevronDown, Copy, Calendar, RotateCcw, BarChart2 
} from 'lucide-vue-next'
import TestDayWarning from './TestDayWarning.vue'
import GradesAttemptHistoryModal from './grades/GradesAttemptHistoryModal.vue'

const props = defineProps({
  isPrivacyMode: Boolean,
  studentAbsenceTotals: { type: Object, default: () => ({}) },
  assessmentAbsenceMap: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'select-assessment',
  'open-dossier',
  'edit-assessment'
])

const { alert, confirm } = useMessage()

// Local refs for grid interactions
const {
  editingCell,
  editOriginalValue,
  editInput,
  contextMenu,
  attemptsPopover,
  startEdit,
  cancelEdit,
  saveEdit,
  openContextMenu: onContextMenu,
  openAttempts,
  openAttemptsFromMenu,
  isMissing,
  isExcluded,
  toggleMissing,
  toggleExcluded,
  setAttemptPrimary: onSetPrimary,
  deleteAttempt: onDeleteAttempt,
  updateComment: onUpdateComment,
  getAdjustedPosition
} = useGradeEditing()

const headerMenu = ref(null) // { x, y, type, assessment? }
const highlightedColumnId = ref(null) // assessmentId or 'name' or 'grade'

// Helpers
const getUnitName = (unitId) => {
  return activeClassRecord.value?.gradebookUnits
    ?.find(u => u.unitId === unitId)?.name ?? '—'
}

function formatDateShort(dateStr) {
  return formatLocalDisplay(dateStr)
}

function formatCellGrade(value, totalPoints) {
  if (value === null || value === undefined) return '—'
  if (displayMode.value === 'raw') {
    return Math.round(value * 10) / 10
  }
  return Math.round((value / totalPoints) * 1000) / 10 + '%'
}

function getAssessmentAvg(assessmentId) {
  let sum = 0
  let count = 0

  sortedRoster.value.forEach(s => {
    const g = gradeMap.value[assessmentId]?.[s.studentId]
    if (g && !g.missing && !g.excluded && g.resolvedScore !== null && g.resolvedScore !== undefined) {
      const num = Number(g.resolvedScore)
      if (!isNaN(num)) {
        sum += num
        count++
      }
    }
  })

  if (count === 0) return null
  return sum / count
}

function isCellApplicable(studentId, assessment) {
  if (!assessment) return true
  const st = activeClassRecord.value?.students?.[studentId]
  if (!st) return true
  return isAssessmentApplicableToStudent(assessment, st)
}

function getCellStyle(studentId, assessmentId, totalPoints) {
  const assessment = assessments.value.find(a => String(a.assessmentId) === String(assessmentId))
  if (assessment && !isCellApplicable(studentId, assessment)) {
    return { background: 'rgba(0,0,0,0.03)', color: '#9ca3af', cursor: 'not-allowed' }
  }

  const grade = gradeMap.value[assessmentId]?.[studentId]
  if (!grade) return {}
  
  if (grade.missing) return { background: 'rgba(192, 57, 43, 0.1)', color: '#c0392b' }
  if (grade.excluded) return { background: 'var(--bg-secondary)', opacity: 0.6, textDecoration: 'line-through' }
  
  const score = grade.resolvedScore
  if (score === null || score === undefined) return {}
  
  const percent = (score / totalPoints) * 100
  if (percent >= 80) return { background: 'var(--grade-high)' }
  if (percent >= 70) return { background: 'var(--grade-mid-high)' }
  if (percent >= 60) return { background: 'var(--grade-mid-low)' }
  return { background: 'var(--grade-low)' }
}

// Sparklines path helper
function getSparklinePath(data, width, height) {
  if (!data || data.length < 2) return ""
  const xStep = width / (data.length - 1)
  const points = data.map((val, i) => {
    const x = i * xStep
    const y = height - (val / 100) * height
    return { x, y }
  })

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const midX = (p0.x + p1.x) / 2
    d += ` Q ${p0.x} ${p0.y}, ${midX} ${(p0.y + p1.y) / 2}`
    if (i === points.length - 2) {
      d += ` T ${p1.x} ${p1.y}`
    }
  }
  return d
}

// Computed grid properties
const overallClassAvg = computed(() => {
  const visibleStudentIds = new Set(sortedRoster.value.map(s => s.studentId))
  const values = Object.entries(classGrades.value || {})
    .filter(([id]) => visibleStudentIds.has(id))
    .map(([, g]) => g?.overallGrade)
    .filter(val => val !== null && val !== undefined)
  if (values.length === 0) return null
  return values.reduce((sum, val) => sum + val, 0) / values.length
})

const selectedUnitId = ref(null)
const selectedCategoryId = ref(null)

const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1'  // indigo
]

function getUnitColor(unitId) {
  if (!unitId || !activeClassRecord.value?.gradebookUnits) return '#64748b'
  const idx = activeClassRecord.value.gradebookUnits.findIndex(u => u.unitId === unitId)
  if (idx < 0) return '#64748b'
  return UNIT_COLORS[idx % UNIT_COLORS.length]
}

function getCategoryColor(categoryId) {
  const eff = getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value, selectedCourseFilter.value)
  const cats = eff?.gradebookCategories || activeClassRecord.value?.gradebookCategories
  if (!categoryId || !cats) return '#64748b'
  const idx = cats.findIndex(c => c.categoryId === categoryId)
  if (idx < 0) return '#64748b'
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
}

function getCategoryName(categoryId) {
  const eff = getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value, selectedCourseFilter.value)
  const cats = eff?.gradebookCategories || activeClassRecord.value?.gradebookCategories
  if (!categoryId || !cats) return ''
  return cats.find(c => c.categoryId === categoryId)?.name ?? ''
}

const cleanUnitPillName = cleanUnitName


const availableCourseFilters = computed(() => {
  const codes = new Set()
  if (activeClassRecord.value?.courseSections) {
    activeClassRecord.value.courseSections.forEach(c => codes.add(c))
  }
  if (activeClassRecord.value?.students) {
    Object.values(activeClassRecord.value.students).forEach(st => {
      if (st.courseCode && !st.archived) codes.add(st.courseCode)
    })
  }
  if (codes.size <= 1) return []
  return ['all', ...Array.from(codes).sort()]
})

const selectedGradeFilter = ref('all')

const availableGradeFilters = computed(() => {
  if (activeClassRecord.value?.classType !== 'elementary') return []
  const grades = new Set()
  if (activeClassRecord.value?.students) {
    Object.values(activeClassRecord.value.students).forEach(st => {
      if (st.gradeLevel && !st.archived) grades.add(st.gradeLevel)
    })
  }
  const units = activeClassRecord.value?.gradebookUnits || []
  units.forEach(u => {
    const uGrade = getUnitGradeLevel(u)
    if (uGrade) grades.add(uGrade)
    if (u.expectations) {
      u.expectations.forEach(e => { if (e.gradeLevel) grades.add(e.gradeLevel) })
    }
  })
  if (grades.size <= 1) return []
  return ['all', ...Array.from(grades).sort()]
})

const availableUnits = computed(() => {
  const eff = getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value, selectedCourseFilter.value)
  let units = eff?.gradebookUnits || []
  if (selectedGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    units = units.filter(u => {
      const uGrade = getUnitGradeLevel(u)
      return isCohortMatch(uGrade, selectedGradeFilter.value)
    })
  }

  const seenNames = new Set()
  const uniqueUnits = []
  for (const u of units) {
    const cleanName = cleanUnitPillName(u.name).toLowerCase()
    if (!seenNames.has(cleanName)) {
      seenNames.add(cleanName)
      uniqueUnits.push(u)
    }
  }

  return uniqueUnits
})

const availableCategories = computed(() => {
  const eff = getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value, selectedCourseFilter.value)
  return eff?.gradebookCategories || activeClassRecord.value?.gradebookCategories || []
})

const isSBAR = computed(() => {
  const eff = getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
  return eff?.gradingFramework === 'sbar'
})

const sortedAssessments = computed(() => {
  let list = [...assessments.value].filter(a => {
    if (a.target === 'individual') return false
    if (a.categoryId === 'sbar_general') return false
    if (isSBAR.value && (!a.expectationIds || a.expectationIds.length === 0)) return false
    return isAssessmentInSubCohort(a)
  })
  if (selectedUnitId.value) {
    const eff = getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value, selectedCourseFilter.value)
    const targetUnit = (eff?.gradebookUnits || []).find(u => u.unitId === selectedUnitId.value)
    if (targetUnit) {
      const targetCleanName = cleanUnitPillName(targetUnit.name).toLowerCase()
      const matchingUnitIds = new Set(
        (eff?.gradebookUnits || [])
          .filter(u => cleanUnitPillName(u.name).toLowerCase() === targetCleanName)
          .map(u => u.unitId)
      )
      list = list.filter(a => a.unitId && matchingUnitIds.has(a.unitId))
    } else {
      list = list.filter(a => a.unitId === selectedUnitId.value)
    }
  }
  if (selectedCategoryId.value) {
    list = list.filter(a => a.categoryId === selectedCategoryId.value)
  }
  return list.sort((a, b) => {
    const diff = new Date(a.date) - new Date(b.date)
    return assessmentSortOrder.value === 'asc' ? diff : -diff
  })
})
const totalAssessmentCount = computed(() => {
  return assessments.value.filter(a => {
    if (a.target === 'individual' || a.categoryId === 'sbar_general') return false
    return isAssessmentInSubCohort(a)
  }).length
})

function getUnitAssessmentCount(unitId, unitName) {
  const eff = getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value, selectedCourseFilter.value)
  const allUnits = eff?.gradebookUnits || []
  const targetCleanName = cleanUnitPillName(unitName).toLowerCase()
  const matchingUnitIds = new Set(
    allUnits
      .filter(u => cleanUnitPillName(u.name).toLowerCase() === targetCleanName)
      .map(u => u.unitId)
  )
  if (unitId) matchingUnitIds.add(unitId)

  const unFilteredList = assessments.value.filter(a => {
    if (a.target === 'individual' || a.categoryId === 'sbar_general') return false
    return isAssessmentInSubCohort(a)
  })

  return unFilteredList.filter(a => a.unitId && matchingUnitIds.has(a.unitId)).length
}

const sortedRoster = computed(() => {
  if (!activeClassRecord.value?.students) return []
  
  let students = Object.keys(activeClassRecord.value.students)
    .filter(id => {
      const st = activeClassRecord.value.students[id]
      if (!st || st.archived) return false
      if (!st.firstName?.trim() && !st.lastName?.trim()) return false
      return true
    })
    .map(id => ({ 
      studentId: id, 
      ...activeClassRecord.value.students[id],
      overallGrade: classGrades.value[id]?.overallGrade ?? -1
    }))
    .filter(st => isStudentInSubCohort(st))

  return students.sort((a, b) => {
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
    .filter(a => {
      if (a.assessmentType !== 'product' || a.excluded || a.target === 'individual') return false
      if (isSBAR.value) {
        return a.categoryId === 'sbar_general' || (a.expectationIds && a.expectationIds.length > 0)
      } else {
        return a.categoryId !== 'sbar_general'
      }
    })
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

// Grid sorting toggle
function toggleGridSort(column) {
  if (gridSortBy.value === column) {
    gridSortOrder.value = gridSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    gridSortBy.value = column
    gridSortOrder.value = (column === 'grade' || column !== 'name') ? 'desc' : 'asc'
  }
}

async function onKeyNavigate(e) {
  if (!editingCell.value) return

  const isShift = e.shiftKey
  let direction = null

  if (e.key === 'Enter') {
    direction = isShift ? 'up' : 'down'
  } else if (e.key === 'Tab') {
    direction = isShift ? 'left' : 'right'
  } else if (e.key === 'ArrowUp') {
    direction = 'up'
  } else if (e.key === 'ArrowDown') {
    direction = 'down'
  }

  if (direction) {
    e.preventDefault()
    await onNavigate(direction)
  }
}

async function onNavigate(direction) {
  if (!editingCell.value) return
  const { sId, aId } = editingCell.value
  await saveEdit()
  
  const studentIdx = sortedRoster.value.findIndex(s => String(s.studentId) === String(sId))
  const assessIdx = sortedAssessments.value.findIndex(a => Number(a.assessmentId) === Number(aId))

  if (direction === 'down') {
    let nextIdx = studentIdx + 1
    while (nextIdx < sortedRoster.value.length) {
      const targetStudent = sortedRoster.value[nextIdx]
      const targetAssess = aId === 'overall' ? null : sortedAssessments.value.find(a => Number(a.assessmentId) === Number(aId))
      if (aId === 'overall' || isCellApplicable(targetStudent.studentId, targetAssess)) {
        startEdit(targetStudent.studentId, aId)
        break
      }
      nextIdx++
    }
  } else if (direction === 'up') {
    let prevIdx = studentIdx - 1
    while (prevIdx >= 0) {
      const targetStudent = sortedRoster.value[prevIdx]
      const targetAssess = aId === 'overall' ? null : sortedAssessments.value.find(a => Number(a.assessmentId) === Number(aId))
      if (aId === 'overall' || isCellApplicable(targetStudent.studentId, targetAssess)) {
        startEdit(targetStudent.studentId, aId)
        break
      }
      prevIdx--
    }
  } else if (direction === 'right') {
    if (aId === 'overall') {
      let idx = 0
      while (idx < sortedAssessments.value.length) {
        const targetAssess = sortedAssessments.value[idx]
        if (isCellApplicable(sId, targetAssess)) {
          startEdit(sId, targetAssess.assessmentId)
          break
        }
        idx++
      }
    } else if (assessIdx >= 0) {
      let idx = assessIdx + 1
      while (idx < sortedAssessments.value.length) {
        const targetAssess = sortedAssessments.value[idx]
        if (isCellApplicable(sId, targetAssess)) {
          startEdit(sId, targetAssess.assessmentId)
          break
        }
        idx++
      }
    }
  } else if (direction === 'left') {
    if (assessIdx >= 0) {
      let idx = assessIdx - 1
      let found = false
      while (idx >= 0) {
        const targetAssess = sortedAssessments.value[idx]
        if (isCellApplicable(sId, targetAssess)) {
          startEdit(sId, targetAssess.assessmentId)
          found = true
          break
        }
        idx--
      }
      if (!found) {
        startEdit(sId, 'overall')
      }
    }
  }
}

function onEditAssessment(assessment) {
  emit('edit-assessment', assessment)
}

function onHeaderMenu(e, type, assessment = null) {
  const { x, y } = getAdjustedPosition(e, 180, 120)
  headerMenu.value = {
    x, y,
    type,
    assessment
  }
}

async function confirmDeleteAssessment(assessment) {
  if (!await confirm(`Delete ${assessment.name}? This will permanently remove all grades for this assessment and cannot be undone.`, 'Delete Assessment', { danger: true })) return
  await deleteAssessment(assessment.assessmentId)
}

// Clipboard operations (highlights visual column briefly after copy)
function copyStudentNames() {
  const text = sortedRoster.value.map(s => `${s.lastName}, ${s.firstName}`).join("\n")
  navigator.clipboard.writeText(text)
  highlightedColumnId.value = 'name'
  setTimeout(() => { highlightedColumnId.value = null }, 1500)
}

function copyOverallGrades() {
  const text = sortedRoster.value.map(s => {
    const g = classGrades.value[s.studentId]?.overallGrade
    return g !== null && g !== undefined ? Math.round(g) : ""
  }).join("\n")
  navigator.clipboard.writeText(text)
  highlightedColumnId.value = 'grade'
  setTimeout(() => { highlightedColumnId.value = null }, 1500)
}

function copyAssessmentGrades(assessment) {
  const text = sortedRoster.value.map(student => {
    const grade = gradeMap.value[assessment.assessmentId]?.[student.studentId]
    if (!grade) return ""
    if (grade.missing) return "M"
    if (grade.excluded) return "EX"
    return grade.resolvedScore !== null ? grade.resolvedScore : ""
  }).join("\n")
  navigator.clipboard.writeText(text)
  highlightedColumnId.value = assessment.assessmentId
  setTimeout(() => { highlightedColumnId.value = null }, 1500)
}
</script>

<style scoped>
/* Scoped overrides to target grid components and layout */
.grades__filter-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.grades__filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.grades__filter-row--bottom {
  border-top: 1px dashed var(--border);
  padding-top: 5px;
}

.sbar-student-grade-tag {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  flex-shrink: 0;
}

.sbar-student-grade-tag--gr7 {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.sbar-student-grade-tag--gr8 {
  background: rgba(14, 165, 233, 0.12);
  color: #0ea5e9;
  border: 1px solid rgba(14, 165, 233, 0.3);
}

.grades__filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grades__filter-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grades__filter-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.grid-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-chip:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.grid-chip--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.grid-chip__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.grid-chip__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-secondary);
  margin-left: 3px;
  flex-shrink: 0;
}

.grid-chip--active .grid-chip__badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.grades__assessment-cat-tag {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.grades__grid-container-outer {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.grades__grid-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
  scrollbar-gutter: stable;
}

.grades__grid-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.grades__grid-wrapper::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.grades__grid-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.grades__grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
}

.grades__grid thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--border);
  padding: 12px 8px;
  text-align: left;
}

.grades__th-student,
.grades__td-student {
  position: sticky;
  left: 0;
  z-index: 11;
  background: var(--surface);
  width: 160px;
  min-width: 160px;
  max-width: 220px;
  border-right: 1px solid var(--border);
  box-shadow: 2px 0 5px -2px rgba(0,0,0,0.1);
}

.grades__th-student {
  cursor: pointer;
  user-select: none;
}

.grades__th-student:hover {
  background: var(--bg-secondary) !important;
}

.grades__grid thead .grades__th-student {
  z-index: 15;
  background: var(--bg-secondary);
}

.grades__th-overall,
.grades__td-overall {
  position: sticky;
  left: 160px;
  z-index: 11;
  background: var(--surface);
  width: 100px;
  min-width: 100px;
  max-width: 100px;
  border-right: 2px solid var(--border);
  text-align: center;
  font-weight: 700;
  box-shadow: 4px 0 8px -2px rgba(0, 0, 0, 0.08);
}

.grades__th-overall {
  cursor: pointer;
  user-select: none;
}

.grades__th-overall:hover {
  background: var(--bg-secondary) !important;
}

.grades__sort-header {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;
  white-space: nowrap;
}

.grades__th-overall .grades__sort-header {
  justify-content: center;
}

.grades__sort-icon {
  display: inline-flex;
  color: var(--primary);
}

.grades__grid thead .grades__th-overall {
  z-index: 15;
  background: var(--bg-secondary);
}

.grades__tr-avg td {
  position: sticky;
  top: 58px;
  z-index: 5;
  background: var(--bg-secondary);
  font-weight: 700;
  color: var(--text);
  border-bottom: 2px solid var(--border);
}

.grades__tr-avg .grades__td-student {
  z-index: 12;
}

.grades__tr-avg .grades__td-overall {
  z-index: 12;
}

.grades__th-assessment {
  width: 90px;
  min-width: 65px;
  max-width: 110px;
}

.grades__assessment-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
}

.grades__assessment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.grades__header-menu-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -4px;
  margin-right: -4px;
}

.grades__header-menu-btn:hover {
  background: var(--border);
  color: var(--primary);
}

.grades__assessment-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grades__assessment-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.grades__assessment-unit {
  background: var(--primary-light);
  color: var(--primary);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
}

.grades__grid td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
  height: 48px;
}

.grades__td-assessment {
  text-align: center;
  background: var(--surface);
  border-right: 1px solid var(--border);
}

.grades__td-student {
  font-weight: 600;
  padding-left: 16px;
  cursor: pointer;
}

.grades__td-overall {
  font-weight: 700;
}

.grades__td-overall--editable {
  cursor: pointer;
}

.grades__overall-cell-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  position: relative;
}

.grades__adjusted-asterisk {
  color: var(--primary);
  font-weight: 900;
  font-size: 1.15rem;
  line-height: 0;
  margin-top: -6px;
  margin-left: 1px;
}

.grades__cell-placeholder {
  color: var(--text-secondary);
  opacity: 0.3;
}

.grades__td-avg {
  color: var(--primary);
}

.grades__cell-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.grades__cell-retest-btn {
  position: absolute;
  top: 0;
  right: -2px;
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 1.4rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
}

.grades__cell-retest-btn:hover {
  transform: scale(1.2);
  font-weight: 700;
}

.grades__attempts-popover {
  position: fixed;
  z-index: 1000;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border);
  min-width: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.grades__popover-header {
  padding: 12px 14px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.grades__popover-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0;
}

.grades__popover-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.grades__attempts-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 250px;
  overflow-y: auto;
}

.grades__attempt-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grades__attempt-item--primary {
  background: var(--primary-light, rgba(79, 70, 229, 0.05));
}

.grades__student-firstname-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
}

.grades__student-firstname {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  min-width: 0;
  flex: 1;
}

.sbar-student-grade-tag,
.grades__assessment-sec-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 600;
  color: #2563eb;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1px 6px;
  border-radius: 4px;
  line-height: 1.2;
  flex-shrink: 0;
  margin-left: auto;
}

.grades__attempt-item:last-child {
  border-bottom: none;
}

.grades__attempt-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.grades__attempt-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grades__attempt-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grades__attempt-score {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.grades__attempt-date {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.grades__attempt-comment {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  background: var(--bg-secondary);
  color: var(--text);
  resize: vertical;
  line-height: 1.4;
  transition: border-color 0.15s;
  margin-top: 4px;
}

.grades__attempt-comment:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

.grades__attempt-comment::placeholder {
  color: var(--text-secondary);
  font-style: italic;
  font-weight: normal;
}

.grades__icon-btn--danger:hover {
  background: #fff1f0;
  color: var(--state-out);
}

.grades__cell-missing {
  font-weight: 700;
  color: #c0392b;
}

.grades__cell-excluded {
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: line-through;
}

.grades__cell-edit {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grades__input-inline {
  width: 100%;
  height: 100%;
  border: 2px solid var(--primary);
  border-radius: 4px;
  background: var(--surface);
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  outline: none;
  padding: 0;
  appearance: textfield;
}

.grades__input-inline::-webkit-outer-spin-button,
.grades__input-inline::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.grades__td-avg {
  cursor: pointer;
  transition: background-color 0.2s;
}

.grades__td-avg:hover {
  background-color: var(--bg-secondary) !important;
  color: var(--primary);
}

/* ── Context Menu ───────────────────────────────────────────────────── */
.grades__context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border);
  padding: 6px;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grades__context-btn {
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.grades__context-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.grades__context-btn--danger {
  color: #ff3b30;
}

.grades__context-btn--danger:hover {
  color: #ff3b30 !important;
  background: #fff1f0 !important;
}

.grades__context-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.grades__context-backdrop--dim {
  background: rgba(0, 0, 0, 0.05);
}

.grades__counting-badge {
  background: var(--primary-light);
  color: var(--primary);
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.grades__not-counting-badge {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.grades__student-name-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
}

.grades__student-name-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}

.grades__student-lastname {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.86rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.grades__student-firstname {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grades__sparkline-mini svg {
  display: block;
}

.grades__icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.grades__icon-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.grades__icon-btn--danger {
  color: var(--state-out);
}
</style>
