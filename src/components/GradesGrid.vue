<template>
  <div class="grades__grid-container-outer">
    <!-- Unified Single-Row Filter Bar -->
    <div v-if="availableSubCohorts.length > 1 || availableUnits.length > 0 || totalAdminAssessmentsCount > 0" class="grades__filter-bar">
      <!-- Cohort Chips -->
      <div v-if="availableSubCohorts.length > 1" class="grades__filter-group grades__filter-group--cohort">
        <span class="grades__filter-label">{{ activeClassRecord?.classType === 'elementary' ? 'Grade:' : 'Section:' }}</span>
        <div class="grades__filter-chips">
          <button 
            v-for="subCohort in availableSubCohorts" 
            :key="subCohort" 
            type="button"
            class="grid-chip" 
            :class="{ 'grid-chip--active': String(activeSubCohortFilter).toLowerCase() === String(subCohort).toLowerCase() }"
            @click="setSubCohort(subCohort)"
          >
            {{ subCohort === 'all' ? (activeClassRecord?.classType === 'elementary' ? 'All' : 'All Sections') : (activeClassRecord?.classType === 'elementary' ? subCohort.replace('Grade ', 'Gr. ') : subCohort) }}
          </button>
        </div>
      </div>

      <div v-if="availableSubCohorts.length > 1 && (availableUnits.length > 0 || totalAdminAssessmentsCount > 0) && (activeClassRecord?.classType !== 'elementary' || availableSubCohorts.length <= 1 || String(activeSubCohortFilter).toLowerCase() !== 'all')" class="grades__filter-divider" />

      <!-- Unit / Strand Chips -->
      <div v-if="(availableUnits.length > 0 || totalAdminAssessmentsCount > 0) && (activeClassRecord?.classType !== 'elementary' || availableSubCohorts.length <= 1 || String(activeSubCohortFilter).toLowerCase() !== 'all')" class="grades__filter-group grades__filter-group--units">
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
            :title="u.name"
            @click="selectedUnitId = u.unitId"
          >
            <span class="grid-chip__dot" :style="{ background: selectedUnitId === u.unitId ? '#fff' : getUnitColor(u.unitId) }"></span>
            <span>{{ cleanUnitPillName(u.name) }}</span>
            <span class="grid-chip__badge">{{ getUnitAssessmentCount(u.unitId, u.name) }}</span>
          </button>

          <!-- Admin Filter Chip -->
          <button 
            v-if="totalAdminAssessmentsCount > 0"
            class="grid-chip grid-chip--admin"
            :class="{ 'grid-chip--active': selectedUnitId === 'admin' }"
            @click="selectedUnitId = (selectedUnitId === 'admin' ? null : 'admin')"
            title="Filter grid to show only administrative logistics and paperwork"
          >
            <span class="grid-chip__dot" style="background: #10b981;"></span>
            <span>Admin</span>
            <span class="grid-chip__badge">{{ totalAdminAssessmentsCount }}</span>
          </button>
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
            :style="{ borderTop: '3px solid ' + (a.unitId ? getUnitColor(a.unitId) : 'var(--border)') }"
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
                  <template v-if="a.purpose === 'administrative'">
                    <span class="grades__admin-col-pill" :class="a.adminFormat === 'text' ? 'grades__admin-col-pill--text' : 'grades__admin-col-pill--check'">
                      <Check v-if="a.adminFormat !== 'text'" :size="10" :stroke-width="2.5" />
                      <Type v-else :size="10" :stroke-width="2.5" />
                      {{ a.adminFormat === 'text' ? 'Text' : 'Checklist' }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="grades__assessment-pts">{{ a.totalPoints }} pts</span>
                    <span class="grades__assessment-sep">·</span>
                    <span v-if="a.categoryId" class="grades__assessment-cat-tag">
                      {{ getCategoryName(a.categoryId) }}
                    </span>
                    <span v-else-if="a.unitId" class="grades__assessment-unit">{{ cleanUnitPillName(getUnitName(a.unitId)) }}</span>
                    <span 
                      v-if="(a.targetCourseCode || a.gradeLevel) && (a.targetCourseCode !== 'ALL' && a.gradeLevel !== 'ALL') && availableSubCohorts.length > 1 && activeSubCohortFilter === 'all'" 
                      class="grades__assessment-sec-badge"
                      :title="'Section: ' + (a.targetCourseCode || a.gradeLevel)"
                    >
                      {{ a.targetCourseCode || (a.gradeLevel ? a.gradeLevel.replace('Grade ', 'Gr. ') : '') }}
                    </span>
                  </template>
                </div>
              </div>
              <button class="grades__header-menu-btn" @click.stop="onHeaderMenu($event, 'assessment', a)">
                <MoreVertical :size="14" />
              </button>
            </div>
          </th>
        </tr>

      </thead>
      
      <tbody>
        <!-- Class Avg Row (First row of grid body) -->
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
            <div v-if="a.purpose === 'administrative'">
              <span v-if="a.adminFormat === 'text'" class="grades__admin-avg-text" :title="getAdminTextCount(a.assessmentId) + ' entered'">
                {{ getAdminTextCount(a.assessmentId) }}/{{ sortedRoster.length }}
              </span>
              <span v-else class="grades__admin-avg-check" :title="getAdminCheckCount(a.assessmentId) + ' received'">
                {{ getAdminCheckCount(a.assessmentId) }}/{{ sortedRoster.length }} ✓
              </span>
            </div>
            <div v-else-if="getAssessmentAvg(a.assessmentId) !== null">
              {{ formatCellGrade(getAssessmentAvg(a.assessmentId), a.totalPoints) }}
            </div>
            <div v-else class="text-muted">—</div>
          </td>
        </tr>

        <tr v-for="student in sortedRoster" :key="student.studentId">
          <td 
            class="grades__td-student" 
            :class="{ 'grades__td--highlighted': highlightedColumnId === 'name' }"
            @click="$emit('open-dossier', student.studentId)"
          >
            <div class="grades__student-cell">
              <div class="grades__student-name-text">
                <span class="grades__student-lastname">{{ student.lastName }},</span>
                <span class="grades__student-firstname">{{ student.firstName }}</span>
              </div>
              <div class="grades__student-badges">
                <TestDayWarning 
                  v-if="studentAbsenceTotals[student.studentId]?.testDays >= 2" 
                  :count="studentAbsenceTotals[student.studentId].testDays" 
                />
                <span 
                  v-if="(student.gradeLevel || student.courseCode) && availableSubCohorts.length > 1 && (!activeSubCohortFilter || activeSubCohortFilter === 'all')" 
                  class="sbar-student-grade-tag"
                >
                  {{ student.gradeLevel ? student.gradeLevel.replace('Grade ', 'Gr. ') : student.courseCode }}
                </span>
              </div>

              <!-- Sparkline Trend & Absence Hover Preview Tooltip -->
              <div 
                v-if="!props.isPrivacyMode && (studentTrends[student.studentId]?.length > 1 || studentAbsenceTotals[student.studentId]?.testDays >= 2)" 
                class="grades__student-hover-card"
              >
                <div class="grades__hover-card-header">
                  <span class="grades__hover-card-name">{{ student.lastName }}, {{ student.firstName }}</span>
                  <span 
                    class="grades__hover-card-grade"
                    :style="{ color: getGradeColor(classGrades[student.studentId]?.overallGrade) }"
                  >
                    {{ formatGrade(classGrades[student.studentId]?.overallGrade) }}
                  </span>
                </div>
                <div class="grades__hover-card-body">
                  <div v-if="studentTrends[student.studentId]?.length > 1" class="grades__hover-card-trend-section">
                    <div class="grades__hover-card-meta">
                      <span class="grades__hover-card-trend-label">Recent Trend</span>
                      <span class="grades__hover-card-count">{{ studentTrends[student.studentId].length }} items</span>
                    </div>
                    <svg class="grades__hover-card-svg" width="186" height="24" viewBox="0 0 186 24">
                      <path
                        fill="none"
                        :stroke="getGradeColor(classGrades[student.studentId]?.overallGrade)"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        :d="getSparklinePath(studentTrends[student.studentId], 186, 24)"
                      />
                    </svg>
                  </div>
                  <div 
                    v-if="studentAbsenceTotals[student.studentId]?.testDays >= 2"
                    class="grades__hover-card-absence-note"
                  >
                    <span class="grades__hover-card-amber-dot"></span>
                    <span>Missed {{ studentAbsenceTotals[student.studentId].testDays }} test days</span>
                  </div>
                </div>
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
                @wheel.prevent="$event.target.blur()"
              />
            </div>
            <div v-else class="grades__overall-cell-content">
              <span v-if="classGrades[student.studentId]?.isGradeAdjusted" class="grades__overall-spacer" aria-hidden="true"></span>
              <span class="grades__overall-value">{{ formatGrade(classGrades[student.studentId]?.overallGrade) }}</span>
              <span 
                v-if="classGrades[student.studentId]?.isGradeAdjusted" 
                class="grades__adjusted-asterisk"
                :title="'Adjusted (Calculated: ' + formatGrade(classGrades[student.studentId]?.calculatedOverallGrade) + ')'"
              >
                <Asterisk :size="10" :stroke-width="2.5" />
              </span>
            </div>
          </td>
          <td 
            v-for="a in sortedAssessments" 
            :key="a.assessmentId"
            class="grades__td-assessment"
            :class="{ 
              'grades__td-assessment--highlighted': highlightedColumnId === a.assessmentId,
              'grades__td-assessment--admin': a.purpose === 'administrative',
              'grades__td-assessment--admin-check': a.purpose === 'administrative' && a.adminFormat !== 'text'
            }"
            :style="a.purpose === 'administrative' ? {} : getCellStyle(student.studentId, a.assessmentId, a.totalPoints)"
            :tabindex="a.purpose === 'administrative' && a.adminFormat !== 'text' ? 0 : undefined"
            :data-admin-check-cell="a.purpose === 'administrative' && a.adminFormat !== 'text' ? (student.studentId + '_' + a.assessmentId) : undefined"
            @click="handleCellClick(student.studentId, a)"
            @keydown="onChecklistKeyNavigate($event, student, a)"
            @contextmenu.prevent="isCellApplicable(student.studentId, a) && onContextMenu($event, student.studentId, a.assessmentId)"
          >
            <!-- Inline Editor for Admin Text -->
            <div v-if="editingAdminCell?.sId === student.studentId && editingAdminCell?.aId === a.assessmentId" class="grades__cell-edit" @click.stop>
              <input 
                ref="adminEditInput"
                v-model="editingAdminCell.value"
                type="text"
                class="grades__input-inline grades__input-inline--text"
                placeholder="e.g. 104"
                @blur="saveAdminTextEdit"
                @keydown="onAdminKeyNavigate($event, a)"
                @keydown.esc.prevent="editingAdminCell = null"
              />
            </div>

            <!-- Inline Editor for Academic Number Assessment -->
            <div v-else-if="editingCell?.sId === student.studentId && editingCell?.aId === a.assessmentId" class="grades__cell-edit">
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
                @wheel.prevent="$event.target.blur()"
              />
            </div>

            <div v-else-if="!isCellApplicable(student.studentId, a)" class="grades__cell-content">
              <span style="color: #9ca3af; font-size: 0.72rem; font-style: italic;">N/A</span>
            </div>

            <!-- Administrative Column Content -->
            <div v-else-if="a.purpose === 'administrative'" class="grades__cell-content grades__cell-content--admin">
              <template v-if="a.adminFormat !== 'text'">
                <span 
                  v-if="isAdminChecked(student.studentId, a.assessmentId)" 
                  class="grades__admin-check-badge"
                  title="Received (Click to toggle)"
                >
                  <Check :size="13" :stroke-width="3" />
                </span>
                <span v-else class="grades__admin-check-empty" title="Missing (Click to toggle)">—</span>
              </template>

              <template v-else>
                <span 
                  v-if="getAdminTextValue(student.studentId, a.assessmentId)" 
                  class="grades__admin-text-val"
                  :title="getAdminTextValue(student.studentId, a.assessmentId)"
                >
                  {{ getAdminTextValue(student.studentId, a.assessmentId) }}
                </span>
                <span v-else class="grades__cell-placeholder">—</span>
              </template>
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
            <NotebookPen :size="14" /> View Notes
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
      :resolved-score="gradeMap[attemptsPopover?.assessmentId]?.[attemptsPopover?.studentId]?.resolvedScore ?? attemptsPopover?.resolvedScore"
      :attempts="gradeMap[attemptsPopover?.assessmentId]?.[attemptsPopover?.studentId]?.attempts ?? attemptsPopover?.attempts ?? []"
      @close="attemptsPopover = null"
      @delete-attempt="attId => onDeleteAttempt(attId)"
      @update-comment="(attId, val) => onUpdateComment(attId, val)"
      @start-new-attempt="attemptsPopover = null"
      @set-primary="attId => onSetPrimary(attId)"
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
  getAssessmentUsage,
  assessmentStats,
  gridSortBy,
  gridSortOrder,
  selectedCourseFilter,
  activeSubCohortFilter,
  setActiveSubCohortFilter,
  availableSubCohorts,
  isStudentInSubCohort,
  isAssessmentInSubCohort,
  isAssessmentApplicableToStudent,
  getUnitGradeLevel,
  isCohortMatch,
  toggleAdminChecklist,
  saveAdminText
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
import { getAssessmentPercentage } from '../utils/gradeCalc.js'
import { formatLocalDisplay } from '../utils/dates.js'
import { 
  Plus, Pencil, XCircle, AlertCircle, Trash2, X, MoreVertical, 
  ChevronUp, ChevronDown, Copy, Calendar, RotateCcw, BarChart2, NotebookPen,
  Asterisk, Check, Type
} from 'lucide-vue-next'
import TestDayWarning from './TestDayWarning.vue'
import GradesAttemptHistoryModal from './grades/GradesAttemptHistoryModal.vue'
import {
  buildStudentNamesClipboardText,
  buildOverallGradesClipboardText,
  buildAssessmentGradesClipboardText
} from '../utils/gradeGridExport.js'

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

const assessmentByIdMap = computed(() => {
  const map = {}
  const list = assessments.value || []
  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    map[a.assessmentId] = a
  }
  return map
})

function isCellApplicable(studentId, assessment) {
  if (!assessment) return true
  const st = activeClassRecord.value?.students?.[studentId]
  if (!st) return true
  return isAssessmentApplicableToStudent(assessment, st)
}

function getCellStyle(studentId, assessmentId, totalPoints) {
  const assessment = assessmentByIdMap.value[assessmentId]
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
    .filter(val => val !== null && val !== undefined && !isNaN(Number(val)) && isFinite(Number(val)))
    .map(Number)
  if (values.length === 0) return null
  return values.reduce((sum, val) => sum + val, 0) / values.length
})

const selectedUnitId = ref(null)
const selectedCategoryId = ref(null)

const totalAdminAssessmentsCount = computed(() => {
  return assessments.value.filter(a => a.purpose === 'administrative' && isAssessmentInSubCohort(a)).length
})

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
  if (activeClassRecord.value?.students) {
    Object.values(activeClassRecord.value.students).forEach(st => {
      if (st.courseCode && !st.archived && st.courseCode.trim()) codes.add(st.courseCode.trim())
    })
  }
  if (codes.size <= 1) return []
  return ['all', ...Array.from(codes).sort()]
})

function setSubCohort(subCohort) {
  setActiveSubCohortFilter(subCohort)
  selectedUnitId.value = null
}


const availableUnits = computed(() => {
  const eff = getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value, selectedCourseFilter.value)
  let units = eff?.gradebookUnits || []
  if (activeSubCohortFilter.value !== 'all' && availableSubCohorts.value.length > 1) {
    units = units.filter(u => {
      const uGrade = getUnitGradeLevel(u)
      return !uGrade || isCohortMatch(uGrade, activeSubCohortFilter.value)
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
    if (isSBAR.value && a.purpose !== 'administrative' && (!a.expectationIds || a.expectationIds.length === 0)) return false
    return isAssessmentInSubCohort(a)
  })
  if (selectedUnitId.value === 'admin') {
    list = list.filter(a => a.purpose === 'administrative')
  } else if (selectedUnitId.value) {
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
  } else {
    // When "All Units" is selected, show purely academic assessments
    list = list.filter(a => a.purpose !== 'administrative')
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
    if (a.purpose === 'administrative') return false
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

  function tieBreakName(sA, sB) {
    const lA = (sA.lastName || '').toLowerCase()
    const lB = (sB.lastName || '').toLowerCase()
    const lCmp = lA.localeCompare(lB)
    if (lCmp !== 0) return lCmp
    return (sA.firstName || '').toLowerCase().localeCompare((sB.firstName || '').toLowerCase())
  }

  return students.sort((a, b) => {
    if (gridSortBy.value === 'grade') {
      const gA = a.overallGrade
      const gB = b.overallGrade
      if (gA === -1 && gB !== -1) return 1
      if (gA !== -1 && gB === -1) return -1
      if (gA === -1 && gB === -1) return tieBreakName(a, b)
      const diff = gridSortOrder.value === 'asc' ? gA - gB : gB - gA
      if (diff !== 0) return diff
      return tieBreakName(a, b)
    } else if (gridSortBy.value !== 'name') {
      const aId = gridSortBy.value
      const gradeA = gradeMap.value[aId]?.[a.studentId]
      const gradeB = gradeMap.value[aId]?.[b.studentId]

      const targetAssess = (assessments.value || []).find(ast => String(ast.assessmentId) === String(aId))
      const isAdminText = targetAssess?.purpose === 'administrative' && targetAssess?.adminFormat === 'text'

      if (isAdminText) {
        const valA = (gradeA?.textValue || (gradeA?.resolvedScore != null && isNaN(Number(gradeA.resolvedScore)) ? String(gradeA.resolvedScore) : '')).trim()
        const valB = (gradeB?.textValue || (gradeB?.resolvedScore != null && isNaN(Number(gradeB.resolvedScore)) ? String(gradeB.resolvedScore) : '')).trim()
        if (!valA && valB) return 1
        if (valA && !valB) return -1
        if (!valA && !valB) return tieBreakName(a, b)
        const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        const diff = gridSortOrder.value === 'asc' ? cmp : -cmp
        if (diff !== 0) return diff
        return tieBreakName(a, b)
      }

      const getVal = (g) => {
        if (!g) return -1
        if (g.excluded) return -1
        if (g.missing) return 0
        const score = g.resolvedScore ?? g.score ?? g.pointsEarned ?? -1
        const num = Number(score)
        return isNaN(num) ? -1 : num
      }
      
      const valA = getVal(gradeA)
      const valB = getVal(gradeB)
      if (valA === -1 && valB !== -1) return 1
      if (valA !== -1 && valB === -1) return -1
      if (valA === -1 && valB === -1) return tieBreakName(a, b)
      const diff = gridSortOrder.value === 'asc' ? valA - valB : valB - valA
      if (diff !== 0) return diff
      return tieBreakName(a, b)
    }
    
    const nameA = (a.lastName || '').toLowerCase()
    const nameB = (b.lastName || '').toLowerCase()
    const lastCmp = nameA.localeCompare(nameB)
    if (lastCmp !== 0) return gridSortOrder.value === 'asc' ? lastCmp : -lastCmp
    const firstA = (a.firstName || '').toLowerCase()
    const firstB = (b.firstName || '').toLowerCase()
    return gridSortOrder.value === 'asc' ? firstA.localeCompare(firstB) : -firstA.localeCompare(firstB)
  })
})

const studentTrends = computed(() => {
  if (!activeClassRecord.value?.students || !assessments.value || !gradeMap.value) return {}
  
  const productAssessments = [...assessments.value]
    .filter(a => {
      if (a.purpose === 'administrative' || a.assessmentType !== 'product' || a.excluded || a.target === 'individual') return false
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

// Administrative Cell Editing & State
const editingAdminCell = ref(null) // { sId, aId, value }
const adminEditInput = ref(null)
let isNavigatingAdmin = false

function handleCellClick(studentId, a) {
  if (!isCellApplicable(studentId, a)) return
  if (a.purpose === 'administrative') {
    if (a.adminFormat === 'text') {
      startAdminTextEdit(studentId, a.assessmentId)
    } else {
      toggleAdminChecklist(a.assessmentId, studentId)
      focusAdminCheckCell(studentId, a.assessmentId)
    }
  } else {
    startEdit(studentId, a.assessmentId)
  }
}

function startAdminTextEdit(studentId, assessmentId) {
  const currentEntry = gradeMap.value[String(assessmentId)]?.[String(studentId)]
  const currentVal = currentEntry?.textValue || currentEntry?.comment || ''
  editingAdminCell.value = {
    sId: studentId,
    aId: assessmentId,
    value: currentVal
  }
  nextTick(() => {
    const el = adminEditInput.value
    const inputEl = Array.isArray(el) ? el[0] : el
    if (inputEl) {
      inputEl.focus()
      inputEl.select()
    } else {
      const fallback = document.querySelector('.grades__input-inline--text')
      fallback?.focus()
      fallback?.select()
    }
  })
}

function saveAdminTextEdit() {
  if (isNavigatingAdmin) return
  if (!editingAdminCell.value) return
  const { sId, aId, value } = editingAdminCell.value
  saveAdminText(aId, sId, value)
  editingAdminCell.value = null
}

function onAdminKeyNavigate(e, assessment) {
  if (!editingAdminCell.value) return
  const isShift = e.shiftKey
  let direction = null

  if (e.key === 'Enter') {
    direction = isShift ? 'up' : 'down'
  } else if (e.key === 'ArrowDown') {
    direction = 'down'
  } else if (e.key === 'ArrowUp') {
    direction = 'up'
  } else if (e.key === 'Tab') {
    direction = isShift ? 'up' : 'down'
  } else if (e.key === 'Escape') {
    editingAdminCell.value = null
    return
  }

  if (direction) {
    e.preventDefault()
    const { sId, aId, value } = editingAdminCell.value
    saveAdminText(aId, sId, value)

    const studentIdx = sortedRoster.value.findIndex(s => String(s.studentId) === String(sId))
    let targetIdx = direction === 'down' ? studentIdx + 1 : studentIdx - 1

    while (targetIdx >= 0 && targetIdx < sortedRoster.value.length) {
      const targetStudent = sortedRoster.value[targetIdx]
      if (isCellApplicable(targetStudent.studentId, assessment)) {
        break
      }
      targetIdx = direction === 'down' ? targetIdx + 1 : targetIdx - 1
    }

    if (targetIdx >= 0 && targetIdx < sortedRoster.value.length) {
      const targetStudent = sortedRoster.value[targetIdx]
      isNavigatingAdmin = true

      const currentEntry = gradeMap.value[String(aId)]?.[String(targetStudent.studentId)]
      const currentVal = currentEntry?.textValue || currentEntry?.comment || ''

      editingAdminCell.value = {
        sId: targetStudent.studentId,
        aId: aId,
        value: currentVal
      }

      nextTick(() => {
        setTimeout(() => {
          isNavigatingAdmin = false
        }, 50)

        const el = adminEditInput.value
        const inputEl = Array.isArray(el) ? el[0] : el
        if (inputEl) {
          inputEl.focus()
          inputEl.select()
        } else {
          const fallback = document.querySelector('.grades__input-inline--text')
          fallback?.focus()
          fallback?.select()
        }
      })
    } else {
      editingAdminCell.value = null
    }
  }
}

function isAdminChecked(studentId, assessmentId) {
  const entry = gradeMap.value[String(assessmentId)]?.[String(studentId)]
  return Boolean(
    entry && (
      entry.resolvedScore === 1 ||
      entry.score === 1 ||
      entry.pointsEarned === 1 ||
      entry.received === true ||
      entry.attempts?.[0]?.pointsEarned === 1
    )
  )
}

function focusAdminCheckCell(studentId, assessmentId) {
  nextTick(() => {
    const selector = `[data-admin-check-cell="${studentId}_${assessmentId}"]`
    const el = document.querySelector(selector)
    if (el) {
      el.focus()
    }
  })
}

function onChecklistKeyNavigate(e, student, assessment) {
  if (assessment.purpose !== 'administrative' || assessment.adminFormat === 'text') return

  const isShift = e.shiftKey
  const isChecked = isAdminChecked(student.studentId, assessment.assessmentId)

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    advanceChecklistFocus(student.studentId, assessment, 'down')
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    advanceChecklistFocus(student.studentId, assessment, 'up')
  } else if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    toggleAdminChecklist(assessment.assessmentId, student.studentId)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    toggleAdminChecklist(assessment.assessmentId, student.studentId)
    advanceChecklistFocus(student.studentId, assessment, isShift ? 'up' : 'down')
  } else if (e.key === '1' || e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'x') {
    e.preventDefault()
    if (!isChecked) {
      toggleAdminChecklist(assessment.assessmentId, student.studentId)
    }
    advanceChecklistFocus(student.studentId, assessment, 'down')
  } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete' || e.key.toLowerCase() === 'n') {
    e.preventDefault()
    if (isChecked) {
      toggleAdminChecklist(assessment.assessmentId, student.studentId)
    }
    advanceChecklistFocus(student.studentId, assessment, 'down')
  } else if (e.key === 'Tab') {
    e.preventDefault()
    advanceChecklistFocus(student.studentId, assessment, isShift ? 'up' : 'down')
  }
}

function advanceChecklistFocus(currentStudentId, assessment, direction = 'down') {
  const studentIdx = sortedRoster.value.findIndex(s => String(s.studentId) === String(currentStudentId))
  if (studentIdx < 0) return

  let targetIdx = direction === 'down' ? studentIdx + 1 : studentIdx - 1
  while (targetIdx >= 0 && targetIdx < sortedRoster.value.length) {
    const targetStudent = sortedRoster.value[targetIdx]
    if (isCellApplicable(targetStudent.studentId, assessment)) {
      focusAdminCheckCell(targetStudent.studentId, assessment.assessmentId)
      break
    }
    targetIdx = direction === 'down' ? targetIdx + 1 : targetIdx - 1
  }
}

function getAdminTextValue(studentId, assessmentId) {
  const entry = gradeMap.value[String(assessmentId)]?.[String(studentId)]
  return entry?.textValue || entry?.comment || ''
}

function getAdminCheckCount(assessmentId) {
  let count = 0
  const astIdStr = String(assessmentId)
  for (const s of sortedRoster.value) {
    const entry = gradeMap.value[astIdStr]?.[s.studentId]
    if (entry && (entry.resolvedScore === 1 || entry.score === 1 || entry.pointsEarned === 1 || entry.received || entry.attempts?.[0]?.pointsEarned === 1)) {
      count++
    }
  }
  return count
}

function getAdminTextCount(assessmentId) {
  let count = 0
  const astIdStr = String(assessmentId)
  for (const s of sortedRoster.value) {
    const entry = gradeMap.value[astIdStr]?.[s.studentId]
    const txt = entry?.textValue || entry?.comment || entry?.resolvedScore
    if (txt && String(txt).trim() !== '') {
      count++
    }
  }
  return count
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
  const usage = await getAssessmentUsage(assessment.assessmentId)
  const countWarning = usage.studentCount > 0
    ? `Warning: This assessment has marks recorded for ${usage.studentCount} student(s) (${usage.attemptCount || usage.markCount || usage.studentCount} score entries). Deleting it will permanently erase all these records.`
    : 'No student marks are recorded for this assessment.'

  if (!await confirm(`Delete "${assessment.name}"?\n\n${countWarning}\n\nThis cannot be undone.`, 'Delete Assessment', { danger: true })) return
  await deleteAssessment(assessment.assessmentId)
}

// Clipboard operations (highlights visual column briefly after copy)
function copyStudentNames() {
  navigator.clipboard.writeText(buildStudentNamesClipboardText(sortedRoster.value))
  highlightedColumnId.value = 'name'
  setTimeout(() => { highlightedColumnId.value = null }, 1500)
}

function copyOverallGrades() {
  navigator.clipboard.writeText(buildOverallGradesClipboardText(sortedRoster.value, classGrades.value))
  highlightedColumnId.value = 'grade'
  setTimeout(() => { highlightedColumnId.value = null }, 1500)
}

function copyAssessmentGrades(assessment) {
  navigator.clipboard.writeText(buildAssessmentGradesClipboardText(sortedRoster.value, assessment, gradeMap.value))
  highlightedColumnId.value = assessment.assessmentId
  setTimeout(() => { highlightedColumnId.value = null }, 1500)
}
</script>

<style scoped src="./GradesGrid.css"></style>
