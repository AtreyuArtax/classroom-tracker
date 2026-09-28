<template>
  <div class="grades-grid-sbar">
    <!-- Strand & Unit Filter Pills + Task Selector -->
    <!-- Tier 1: SBAR Task & Assessment Hub Bar (Dedicated Row) -->
    <div v-if="sortedAssessments.length" class="sbar-task-bar">
      <div class="sbar-task-bar-left">
        <!-- Quick Action Chips (Top 2 Active / Recent Tasks) -->
        <div v-if="quickActionTasks.length" class="sbar-quick-chips">
          <span class="sbar-bar-label">Recent Tasks:</span>
          <button 
            v-for="ast in quickActionTasks" 
            :key="'chip-' + ast.assessmentId"
            type="button"
            class="sbar-quick-chip"
            :title="getAssessmentTooltip(ast)"
            @click="onSelectAssessmentId(ast.assessmentId)"
          >
            <FileEdit :size="12" class="chip-icon" />
            <span class="chip-name">{{ ast.name }}</span>
            <span 
              class="chip-badge" 
              :class="{ 'chip-badge--complete': getAssessmentStats(ast.assessmentId).isComplete }"
            >
              {{ getAssessmentStats(ast.assessmentId).evaluatedCount }}/{{ getAssessmentStats(ast.assessmentId).totalCount }}
            </span>
          </button>
        </div>
      </div>

      <div class="sbar-task-bar-right">
        <!-- Searchable Assessment Hub Popover -->
        <div class="sbar-hub-wrapper">
          <button 
            type="button"
            class="sbar-hub-btn"
            :class="{ 'sbar-hub-btn--active': showHubPopover }"
            @click.stop="toggleHubPopover"
          >
            <Layers :size="14" />
            <span>Assessment Hub</span>
            <span class="sbar-hub-count">{{ sortedAssessments.length }}</span>
            <ChevronDown :size="13" class="sbar-hub-chevron" />
          </button>

          <!-- Assessment Hub Floating Popover Menu -->
          <div v-if="showHubPopover" class="sbar-hub-popover" @click.stop>
            <div class="hub-header">
              <div class="hub-title-row">
                <h4 class="hub-title"><Layers :size="15" /> Assessment Hub</h4>
                <button class="hub-close-btn" @click="showHubPopover = false"><X :size="14" /></button>
              </div>
              <div class="hub-search-box">
                <Search :size="14" class="search-icon" />
                <input 
                  v-model="hubSearchQuery" 
                  type="text" 
                  placeholder="Search tasks, dates, standards..." 
                  class="hub-search-input"
                />
                <button v-if="hubSearchQuery" class="search-clear" @click="hubSearchQuery = ''"><X :size="12" /></button>
              </div>
              <div class="hub-tabs">
                <button 
                  class="hub-tab" 
                  :class="{ 'hub-tab--active': hubFilterTab === 'all' }"
                  @click="hubFilterTab = 'all'"
                >
                  All ({{ sortedAssessments.length }})
                </button>
                <button 
                  class="hub-tab" 
                  :class="{ 'hub-tab--active': hubFilterTab === 'needs_grading' }"
                  @click="hubFilterTab = 'needs_grading'"
                >
                  Needs Grading ({{ needsGradingCount }})
                </button>
                <button 
                  class="hub-tab" 
                  :class="{ 'hub-tab--active': hubFilterTab === 'formative' }"
                  @click="hubFilterTab = 'formative'"
                >
                  Formative
                </button>
                <button 
                  class="hub-tab" 
                  :class="{ 'hub-tab--active': hubFilterTab === 'summative' }"
                  @click="hubFilterTab = 'summative'"
                >
                  Summative
                </button>
                <button 
                  class="hub-tab" 
                  :class="{ 'hub-tab--active': hubFilterTab === 'admin' }"
                  @click="hubFilterTab = 'admin'"
                >
                  Admin
                </button>
                <button 
                  v-if="isWeightedSBAR"
                  class="hub-tab" 
                  :class="{ 'hub-tab--active': hubFilterTab === 'final' }"
                  @click="hubFilterTab = 'final'"
                >
                  Final Evaluations
                </button>
              </div>
            </div>

            <div class="hub-body">
              <div v-if="!filteredHubAssessments.length" class="hub-empty">
                <FileText :size="24" />
                <p>No assessments match your filter.</p>
              </div>
              <div 
                v-for="ast in filteredHubAssessments" 
                :key="'hub-ast-' + ast.assessmentId" 
                class="hub-ast-card"
                :title="getAssessmentTooltip(ast)"
                @click="onSelectAssessmentId(ast.assessmentId)"
              >
                <div class="hub-card-left">
                  <div class="hub-card-title-row">
                    <span class="hub-card-title">{{ ast.name }}</span>
                    <span 
                      class="hub-card-tag" 
                      :class="{ 
                        'hub-card-tag--admin': ast.purpose === 'administrative',
                        'hub-card-tag--formative': ast.purpose !== 'administrative' && (ast.purpose === 'formative' || ast.isFormative)
                      }"
                    >
                      {{ ast.purpose === 'administrative' ? 'Admin' : ((ast.purpose === 'formative' || ast.isFormative) ? 'Formative' : 'Summative') }}
                    </span>
                  </div>
                  <div class="hub-card-meta">
                    <span>{{ formatDate(ast.date) }}</span>
                    <span class="hub-card-dot">•</span>
                    <span>{{ getAssessmentTypeLabel(ast.assessmentType) }}</span>
                    <span v-if="getAssessmentGrade(ast)" class="hub-card-dot">•</span>
                    <span v-if="getAssessmentGrade(ast)" class="hub-card-grade">{{ getAssessmentGrade(ast) }}</span>
                  </div>
                </div>
                <div class="hub-card-right">
                  <span 
                    class="hub-progress-pill"
                    :class="{ 'hub-progress-pill--done': getAssessmentStats(ast.assessmentId).isComplete }"
                  >
                    {{ getAssessmentStats(ast.assessmentId).evaluatedCount }}/{{ getAssessmentStats(ast.assessmentId).totalCount }} graded
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tier 2: Curriculum Strands & Grade Filter Bar (Dedicated Row) -->
    <div v-if="availableGradeFilters.length > 1 || availableStrands.length > 1 || totalAdminAssessmentsCount > 0" class="sbar-filter-bar">
      <!-- Grade / Sub-cohort Filter Pills -->
      <div v-if="availableGradeFilters.length > 1" class="sbar-grade-pills">
        <span class="sbar-bar-label">{{ activeClassRecord?.classType === 'elementary' ? 'Grade:' : 'Section:' }}</span>
        <button 
          v-for="gFilter in availableGradeFilters" 
          :key="gFilter" 
          type="button"
          class="grade-pill" 
          :class="{ 'grade-pill--active': String(activeGradeFilter).toLowerCase() === String(gFilter).toLowerCase() }"
          @click="setGradeFilter(gFilter)"
        >
          {{ gFilter === 'all' ? (activeClassRecord?.classType === 'elementary' ? 'All' : 'All Sections') : (activeClassRecord?.classType === 'elementary' ? gFilter.replace('Grade ', 'Gr. ') : gFilter) }}
        </button>
      </div>

      <div v-if="availableGradeFilters.length > 1 && (availableStrands.length > 1 || totalAdminAssessmentsCount > 0)" class="sbar-toolbar-divider" />

      <!-- Strand Filter Pills -->
      <div v-if="availableStrands.length > 1 || totalAdminAssessmentsCount > 0" class="sbar-strand-pills">
        <span class="sbar-bar-label">Strand:</span>
        <button 
          class="strand-pill" 
          :class="{ 'strand-pill--active': activeStrandFilter === 'all' }"
          @click="activeStrandFilter = 'all'"
        >
          All Strands
          <span class="strand-pill-badge">{{ academicAssessmentsCount }}</span>
        </button>
        <button 
          v-for="(strand, idx) in availableStrands" 
          :key="strand.id || strand.code" 
          class="strand-pill"
          :class="{ 'strand-pill--active': activeStrandFilter === (strand.id || strand.code) }"
          :title="strand.name"
          @click="activeStrandFilter = (strand.id || strand.code)"
        >
          <span class="strand-pill-dot" :style="{ color: getUnitColorByIdx(idx) }">●</span>
          <span>{{ formatStrandPillLabel(strand.name) }}</span>
          <span class="strand-pill-badge">{{ getStrandAssessmentCount(strand) }}</span>
        </button>

        <!-- Admin Filter Pill -->
        <button 
          v-if="totalAdminAssessmentsCount > 0"
          class="strand-pill strand-pill--admin"
          :class="{ 'strand-pill--active': activeStrandFilter === 'admin' }"
          @click="activeStrandFilter = (activeStrandFilter === 'admin' ? 'all' : 'admin')"
          title="Filter grid to show only administrative paperwork and logistics"
        >
          <span class="strand-pill-dot" style="color: #10b981;">●</span>
          <span>Admin</span>
          <span class="strand-pill-badge">{{ totalAdminAssessmentsCount }}</span>
        </button>
      </div>
    </div>

    <!-- SBAR Expectation Heatmap Grid Table -->
    <div class="sbar-grid-container">
      <table class="sbar-table">
        <thead>
          <!-- Strand Grouping Row -->
          <tr class="sbar-header-group">
            <th class="sticky-col sticky-col--name" colspan="1">STUDENT</th>
            <th class="sticky-col sticky-col--mastery" colspan="1">{{ isWeightedSBAR ? 'COURSE GRADE' : 'OVERALL MASTERY' }}</th>
            
            <!-- Administrative Column Header Group -->
            <th 
              v-if="sbarAdminAssessments.length" 
              :colspan="sbarAdminAssessments.length"
              class="strand-group-header strand-group-header--admin"
              style="border-top: 3px solid #10b981; background: rgba(16, 185, 129, 0.08); color: var(--text);"
            >
              <div class="strand-group-title">ADMINISTRATIVE LOGISTICS</div>
            </th>

            <th 
              v-for="(strand, idx) in displayedStrands" 
              :key="'grp-' + (strand.id || strand.code)" 
              :colspan="strand.expectations.length"
              class="strand-group-header"
              :title="strand.name"
              :style="{
                borderTop: '3px solid ' + getUnitColorByIdx(idx),
                backgroundColor: getUnitColorByIdx(idx) + '12',
                color: 'var(--text)'
              }"
            >
              <div class="strand-group-title">{{ formatStrandHeaderName(strand.name) }}</div>
            </th>
          </tr>

          <!-- Expectation Codes Row -->
          <tr class="sbar-header-sub">
            <th class="sticky-col sticky-col--name">Student Name</th>
            <th class="sticky-col sticky-col--mastery">{{ isWeightedSBAR ? 'Final Mark' : 'Mastery' }}</th>

            <!-- Administrative Task Columns Subheaders -->
            <th 
              v-for="a in sbarAdminAssessments" 
              :key="'sbar-admin-th-' + a.assessmentId"
              class="exp-code-header exp-code-header--admin exp-code-header--clickable"
              :title="a.name + ' (' + (a.adminFormat === 'text' ? 'Text Note' : 'Checklist') + ') — Click to view details'"
              @click.stop="emit('select-assessment', a.assessmentId)"
            >
              <div class="exp-code-main">
                <span class="admin-col-name">{{ a.name }}</span>
                <span 
                  class="grades__admin-col-pill" 
                  :class="a.adminFormat === 'text' ? 'grades__admin-col-pill--text' : 'grades__admin-col-pill--check'"
                >
                  {{ a.adminFormat === 'text' ? 'Text' : 'Checklist' }}
                </span>
                <span class="exp-ast-badge exp-ast-badge--admin" :title="`${getAdminCompletionCount(a.assessmentId)}/${sortedRoster.length} completed`">
                  {{ getAdminCompletionCount(a.assessmentId) }}/{{ sortedRoster.length }}
                </span>
              </div>
            </th>

            <th 
              v-for="exp in displayedExpectations" 
              :key="(exp.gradeLevel || exp.courseCode || 'all') + '-' + exp.code"
              class="exp-code-header exp-code-header--clickable"
              :class="{ 'exp-code-header--active': expectationPopover?.code === exp.code }"
              :title="`Click to view connected assessments for ${exp.code}`"
              @click.stop="toggleExpectationPopover(exp, $event)"
            >     >
              <div class="exp-code-main">
                <span>{{ exp.code }}</span>
                <ExpectationWeightBadge v-if="exp.weight != null && exp.weight !== 1" :weight="exp.weight" />
                <span 
                  v-if="getExpAssessmentCount(exp.code)" 
                  class="exp-ast-badge" 
                  :title="`${getExpAssessmentCount(exp.code)} tasks evaluating ${exp.code}`"
                >
                  {{ getExpAssessmentCount(exp.code) }}
                </span>
              </div>
              <div 
                v-if="(exp.gradeLevel || exp.courseCode) && availableGradeFilters.length > 1 && activeGradeFilter === 'all'" 
                class="exp-grade-sub-tag"
              >
                {{ exp.gradeLevel ? exp.gradeLevel.replace('Grade ', 'Gr. ') : exp.courseCode }}
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="student in sortedRoster" :key="student.studentId" class="sbar-row">
            <!-- Student Name Column -->
            <td class="sticky-col sticky-col--name sbar-student-cell" @click="$emit('open-dossier', student.studentId)">
              <div class="sbar-student-cell-inner">
                <div class="sbar-student-name-text">
                  <span class="sbar-student-lastname">{{ student.lastName }},</span>
                  <span class="sbar-student-firstname">{{ student.firstName }}</span>
                </div>
                <div class="grades__student-badges">
                  <TestDayWarning 
                    v-if="studentAbsenceTotals && studentAbsenceTotals[student.studentId]?.testDays >= 2" 
                    :count="studentAbsenceTotals[student.studentId].testDays" 
                  />
                  <span 
                    v-if="(student.gradeLevel || student.courseCode) && availableGradeFilters.length > 1 && (!activeSubCohortFilter || activeSubCohortFilter === 'all')" 
                    class="sbar-student-grade-tag"
                  >
                    {{ getStudentDisplayCohort(student) }}
                  </span>
                </div>
              </div>
            </td>

            <!-- Overall Mastery Badge Column -->
            <td class="sticky-col sticky-col--mastery sbar-mastery-cell">
              <div v-if="isWeightedSBAR && classGrades[student.studentId]?.overallGrade !== null && classGrades[student.studentId]?.overallGrade !== undefined" class="sbar-composite-cell" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;">
                <span 
                  class="sbar-mastery-badge"
                  :style="{ 
                    background: getStudentCompositeBadge(student.studentId).color + '22', 
                    color: getStudentCompositeBadge(student.studentId).color, 
                    borderColor: getStudentCompositeBadge(student.studentId).color + '55',
                    fontWeight: '700'
                  }"
                  :title="`Final Course Grade: ${classGrades[student.studentId].overallGrade}% (${getStudentCompositeBadge(student.studentId).level})`"
                >
                  {{ Math.round(classGrades[student.studentId].overallGrade) }}%
                  <span style="font-size: 0.72rem; opacity: 0.9; margin-left: 2px;">{{ getStudentCompositeBadge(student.studentId).level }}</span>
                </span>
                <span 
                  v-if="overallMasteryMap[student.studentId]"
                  class="sbar-sub-term-badge"
                  :title="`Term SBAR Mastery: ${overallMasteryMap[student.studentId].score}% (${overallMasteryMap[student.studentId].badge.level})`"
                  style="font-size: 0.68rem; color: var(--text-secondary); line-height: 1;"
                >
                  Term: {{ overallMasteryMap[student.studentId].badge.level }}
                </span>
              </div>
              <span 
                v-else-if="overallMasteryMap[student.studentId]" 
                class="sbar-mastery-badge"
                :style="{ background: overallMasteryMap[student.studentId].badge.color + '22', color: overallMasteryMap[student.studentId].badge.color, borderColor: overallMasteryMap[student.studentId].badge.color + '55' }"
              >
                {{ overallMasteryMap[student.studentId].badge.level }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>

            <!-- Administrative Task Cells -->
            <td 
              v-for="a in sbarAdminAssessments" 
              :key="'sbar-admin-cell-' + student.studentId + '-' + a.assessmentId"
              class="sbar-exp-cell sbar-exp-cell--admin"
              :class="{ 'sbar-cell-na': !isAssessmentApplicableToStudent(a, student) }"
            >
              <div v-if="isAssessmentApplicableToStudent(a, student)" class="sbar-admin-cell-content">
                <button 
                  v-if="a.adminFormat !== 'text'"
                  type="button"
                  :data-sbar-admin-check="student.studentId + '_' + a.assessmentId"
                  class="grades__admin-check-badge"
                  :class="{ 'grades__admin-check-badge--checked': isAdminChecked(student.studentId, a.assessmentId) }"
                  :title="isAdminChecked(student.studentId, a.assessmentId) ? 'Received (Click to toggle)' : 'Missing (Click to toggle)'"
                  @click.stop="toggleAdminChecklist(a.assessmentId, student.studentId)"
                  @keydown="onAdminSBARChecklistKeyNavigate($event, student, a)"
                >
                  <Check v-if="isAdminChecked(student.studentId, a.assessmentId)" :size="13" :stroke-width="3" />
                  <span v-else class="grades__admin-check-empty">—</span>
                </button>
                <input 
                  v-else
                  type="text"
                  :data-sbar-admin-input="student.studentId + '_' + a.assessmentId"
                  class="grades__input-inline grades__input-inline--text"
                  :value="getAdminTextValue(student.studentId, a.assessmentId)"
                  placeholder="—"
                  @blur="e => saveAdminText(a.assessmentId, student.studentId, e.target.value)"
                  @keydown="e => onAdminSBARKeyNavigate(e, student, a)"
                />
              </div>
              <div v-else class="sbar-cell-na" title="Not applicable to student cohort">—</div>
            </td>

            <!-- Expectation Cells -->
            <td 
              v-for="exp in displayedExpectations" 
              :key="student.studentId + '-' + (exp.gradeLevel || exp.courseCode || 'all') + '-' + exp.code"
              class="sbar-exp-cell"
              :class="{ 'sbar-exp-cell--na': !isExpectationApplicableToStudent(exp, student) }"
              @click="isExpectationApplicableToStudent(exp, student) && openExpectationDetail(student.studentId, exp.code)"
            >
              <div v-if="isExpectationApplicableToStudent(exp, student) && studentExpCellMap[student.studentId]?.[exp.code]" class="sbar-cell-content">
                <span 
                  class="sbar-level-pill"
                  :class="{ 'sbar-level-pill--overridden': studentExpCellMap[student.studentId][exp.code].isOverridden }"
                  :style="{ 
                    background: studentExpCellMap[student.studentId][exp.code].badge.color + '22', 
                    color: studentExpCellMap[student.studentId][exp.code].badge.color, 
                    borderColor: studentExpCellMap[student.studentId][exp.code].isOverridden ? '#a855f7' : studentExpCellMap[student.studentId][exp.code].badge.color + '44' 
                  }"
                  :title="getExpCellTooltip(student, exp, studentExpCellMap[student.studentId][exp.code])"
                >
                  {{ studentExpCellMap[student.studentId][exp.code].badge.level }}
                  <span 
                    v-if="studentExpCellMap[student.studentId][exp.code].isOverridden" 
                    class="sbar-override-indicator"
                    title="Professional Judgment Override"
                  >⚡</span>
                </span>

                <!-- Trend Arrow -->
                <span 
                  v-if="studentExpCellMap[student.studentId][exp.code].trend === 'improving'" 
                  class="sbar-trend sbar-trend--up" 
                  title="Improving trend"
                >↗</span>
                <span 
                  v-else-if="studentExpCellMap[student.studentId][exp.code].trend === 'declining'" 
                  class="sbar-trend sbar-trend--down" 
                  title="Declining trend"
                >↘</span>
              </div>
              <div v-else-if="!isExpectationApplicableToStudent(exp, student)" class="sbar-cell-na" title="Not applicable to student cohort">—</div>
              <div v-else class="sbar-cell-empty">—</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tier 2: Expectation Column Contextual Popover Backdrop & Window -->
    <div 
      v-if="expectationPopover" 
      class="exp-popover-backdrop"
      @click="expectationPopover = null"
    >
      <div class="exp-popover" @click.stop>
        <div class="exp-popover-header">
          <div class="exp-popover-title-row">
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <h4 class="exp-popover-code">{{ expectationPopover.code }}</h4>
                <ExpectationWeightBadge :weight="expectationPopover.weight" />
              </div>
              <p class="exp-popover-desc">{{ expectationPopover.name || expectationPopover.description }}</p>
            </div>
            <button class="exp-popover-close" @click="expectationPopover = null"><X :size="14" /></button>
          </div>
          <div class="exp-popover-meta">
            <span class="exp-meta-badge">{{ popoverConnectedAssessments.length }} Connected Tasks</span>
            <span v-if="expectationPopover.unitName" class="exp-meta-unit">{{ expectationPopover.unitName }}</span>
          </div>
        </div>

        <div class="exp-popover-body">
          <div v-if="!popoverConnectedAssessments.length" class="exp-popover-empty">
            <FileText :size="24" />
            <p>No assessments currently evaluate standard <strong>{{ expectationPopover.code }}</strong>.</p>
          </div>
          <div 
            v-for="ast in popoverConnectedAssessments" 
            :key="'exp-ast-' + ast.assessmentId" 
            class="exp-ast-item"
            @click="onSelectAssessmentId(ast.assessmentId)"
          >
            <div class="exp-ast-info">
              <span class="exp-ast-title">{{ ast.name }}</span>
              <span class="exp-ast-date"><Calendar :size="11" /> {{ formatLocalDisplay(ast.date) }}</span>
            </div>
            <div class="exp-ast-status">
              <span 
                class="hub-progress-pill"
                :class="{ 'hub-progress-pill--done': getAssessmentStats(ast.assessmentId).isComplete }"
              >
                {{ getAssessmentStats(ast.assessmentId).evaluatedCount }}/{{ getAssessmentStats(ast.assessmentId).totalCount }} graded
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Student Expectation Detail & Override Modal -->
    <GradesExpectationStudentModal
      v-if="selectedStudentExpModal"
      :show="!!selectedStudentExpModal"
      :student-id="selectedStudentExpModal.studentId"
      :student-name="selectedStudentExpModal.studentName"
      :expectation-code="selectedStudentExpModal.expectationCode"
      :expectation-title="selectedStudentExpModal.expectationTitle"
      :expectation-description="selectedStudentExpModal.expectationDescription"
      :expectation-weight="selectedStudentExpModal.weight"
      :unit-name="selectedStudentExpModal.unitName"
      :mastery-data="studentExpCellMap[selectedStudentExpModal.studentId]?.[selectedStudentExpModal.expectationCode] || {}"
      @close="selectedStudentExpModal = null"
      @open-dossier="$emit('open-dossier', $event); selectedStudentExpModal = null"
      @select-assessment="onSelectAssessmentId"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, ChevronDown, X, Layers, Calendar, FileText, FileEdit, Check } from 'lucide-vue-next'
import ExpectationWeightBadge from '../setup/ExpectationWeightBadge.vue'
import GradesExpectationStudentModal from './GradesExpectationStudentModal.vue'
import { 
  activeClassRecord, 
  assessments, 
  gradeMap,
  classGrades,
  activeGradeFilter,
  activeSubCohortFilter,
  availableSubCohorts,
  isStudentInSubCohort,
  isAssessmentInSubCohort,
  isAssessmentApplicableToStudent,
  toggleAdminChecklist,
  saveAdminText
} from '../../composables/useGradebook.js'
import {
  calculateSBARExpectationMastery,
  getSBARLevelBadge
} from '../../utils/gradeCalcSBAR.js'

import { formatLocalDisplay } from '../../utils/dates.js'
import { getEffectiveClassRecord, getUnitGradeLevel, cleanUnitName, getStudentEffectiveGrade } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { UNIT_COLORS, getSectionColor } from '../../utils/gradeColors.js'
import { isCohortMatch } from '../../utils/gradeCalc.js'
import TestDayWarning from '../TestDayWarning.vue'

const props = defineProps({
  isPrivacyMode: Boolean,
  studentAbsenceTotals: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['open-dossier', 'select-expectation', 'select-assessment'])

const activeStrandFilter = ref('all')

const availableGradeFilters = computed(() => availableSubCohorts.value)

const isWeightedSBAR = computed(() => !!activeClassRecord.value?.sbarWeighting?.enabled)

function getStudentCompositeBadge(studentId) {
  const g = classGrades.value?.[studentId]?.overallGrade
  if (g === null || g === undefined) return { level: '—', color: 'var(--text-secondary)' }
  return getSBARLevelBadge(g)
}

function formatDate(dStr) {
  if (!dStr) return '—'
  return formatLocalDisplay(dStr)
}

function getAssessmentTypeLabel(type) {
  if (!type) return 'Assignment'
  const labels = {
    assignment: 'Assignment',
    quiz: 'Quiz',
    test: 'Test',
    exam: 'Exam',
    project: 'Project',
    observation: 'Observation',
    conversation: 'Conversation',
    product: 'Product'
  }
  return labels[type.toLowerCase()] || (type.charAt(0).toUpperCase() + type.slice(1))
}

function getAssessmentGrade(ast) {
  const g = getAssessmentGradeLevel(ast)
  if (!g) return ''
  return g.toUpperCase()
}

// Assessment Hub & Contextual Popover State
const showHubPopover = ref(false)
const hubSearchQuery = ref('')
const hubFilterTab = ref('all') // 'all' | 'needs_grading' | 'formative' | 'summative'
const expectationPopover = ref(null)

function toggleHubPopover() {
  showHubPopover.value = !showHubPopover.value
  if (showHubPopover.value) {
    expectationPopover.value = null
  }
}

function onSelectAssessmentId(astId) {
  if (astId) {
    showHubPopover.value = false
    expectationPopover.value = null
    emit('select-assessment', astId)
  }
}

function getStudentDisplayCohort(student) {
  if (!student) return ''
  const isElem = activeClassRecord.value?.classType === 'elementary'
  if (isElem) {
    const curSubId = activeSubjectId.value
    const eff = getStudentEffectiveGrade(student, curSubId)
    if (student.accommodations?.modifiedSubjectGrades?.[curSubId]) {
      return `${(eff || '').replace(/^Grade\s+/i, 'Gr. ')} (IEP)`
    }
    return (eff || student.gradeLevel || '').replace(/^Grade\s+/i, 'Gr. ')
  }
  return student.courseCode || (student.gradeLevel || '').replace(/^Grade\s+/i, 'Gr. ')
}

function isExpectationApplicableToStudent(exp, student) {
  if (!exp || !student) return true
  const expCohort = exp.gradeLevel || exp.courseCode
  if (!expCohort || String(expCohort).toLowerCase() === 'all') return true
  const isElem = activeClassRecord.value?.classType === 'elementary'
  const studentCohort = isElem 
    ? (getStudentEffectiveGrade(student, activeSubjectId.value) || student.gradeLevel)
    : (student.courseCode || student.gradeLevel)
  if (!studentCohort) return true
  return isCohortMatch(expCohort, studentCohort)
}

function getAssessmentTargetRoster(ast) {
  if (!activeClassRecord.value?.students) return []
  const allStudents = Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))

  if (!ast) return allStudents

  const aGrade = getAssessmentGradeLevel(ast)
  if (aGrade) {
    const isElem = activeClassRecord.value?.classType === 'elementary'
    const matchingStudents = allStudents.filter(s => {
      const sCohort = isElem 
        ? (getStudentEffectiveGrade(s, activeSubjectId.value) || s.gradeLevel)
        : (s.courseCode || s.gradeLevel)
      return !sCohort || isCohortMatch(aGrade, sCohort)
    })
    if (matchingStudents.length > 0) {
      return matchingStudents
    }
  }

  return allStudents
}

function getAssessmentStats(astId) {
  const ast = assessments.value?.find(a => String(a.assessmentId) === String(astId))
  const targetRoster = getAssessmentTargetRoster(ast)
  const rosterLen = targetRoster.length

  if (!astId || !rosterLen) return { evaluatedCount: 0, totalCount: 0, isComplete: false }

  const astGrades = gradeMap.value[astId] || gradeMap.value[Number(astId)] || gradeMap.value[String(astId)] || {}
  const targetStudentIds = new Set(targetRoster.map(s => String(s.studentId)))

  const evalCount = Object.entries(astGrades).filter(([sId, g]) => {
    return targetStudentIds.has(String(sId)) && g && (
      (g.expectationScores && Object.keys(g.expectationScores).length > 0) || 
      g.masteryLevel != null || 
      g.resolvedScore != null ||
      g.missing ||
      g.excluded
    )
  }).length

  return {
    evaluatedCount: evalCount,
    totalCount: rosterLen,
    isComplete: rosterLen > 0 && evalCount >= rosterLen
  }
}

function getAssessmentExpectationCodes(ast) {
  if (!ast) return []
  const ids = ast.expectationIds || (ast.expectationId ? [ast.expectationId] : [])
  return ids.map(code => {
    let realCode = code
    const found = activeClassRecord.value?.gradebookUnits?.flatMap(u => u.expectations || [])
      .concat(activeClassRecord.value?.expectations || [])
      .find(e => e.expectationId === code || e.code === code)
    if (found && found.code) realCode = found.code
    return realCode
  }).filter(c => c && !c.includes('-'))
}

function getAssessmentTooltip(ast) {
  if (!ast) return ''
  const stats = getAssessmentStats(ast.assessmentId)
  const targetRoster = getAssessmentTargetRoster(ast)
  const rosterLen = targetRoster.length
  const astGrades = gradeMap.value[ast.assessmentId] || gradeMap.value[Number(ast.assessmentId)] || gradeMap.value[String(ast.assessmentId)] || {}
  const expCodes = getAssessmentExpectationCodes(ast)
  const targetIds = new Set(targetRoster.map(s => String(s.studentId)))

  if (expCodes.length > 1) {
    const fullyGraded = Object.entries(astGrades).filter(([sId, g]) => {
      if (!targetIds.has(String(sId)) || !g) return false
      if (g.missing || g.excluded) return true
      return expCodes.every(code => g.expectationScores && g.expectationScores[code] != null)
    }).length

    const expBreakdown = expCodes.map(code => {
      const count = Object.entries(astGrades).filter(([sId, g]) => {
        return targetIds.has(String(sId)) && g && (
          (g.expectationScores && g.expectationScores[code] != null) ||
          g.missing ||
          g.excluded
        )
      }).length
      return `${code}: ${count}/${rosterLen}`
    }).join(' • ')

    return `${ast.name}\n${stats.evaluatedCount}/${rosterLen} Students Evaluated (${fullyGraded} fully complete)\n${expBreakdown}`
  }

  return `${ast.name} (${stats.evaluatedCount}/${rosterLen} students evaluated)`
}

function getStrandAssessmentCount(strand) {
  if (!strand) return academicAssessmentsCount.value
  const strandCode = (strand.code || strand.strandCode || strand.id || '').toLowerCase()
  return sortedAssessments.value.filter(ast => {
    const ids = ast.expectationIds || (ast.expectationId ? [ast.expectationId] : [])
    if (ids.length === 0) return false
    return ids.some(code => {
      const cLower = String(code).toLowerCase()
      return cLower.startsWith(strandCode) || cLower.includes(strandCode)
    })
  }).length
}

function getExpAssessmentCount(expCode) {
  if (!expCode || !assessments.value) return 0
  return assessments.value.filter(a => {
    const ids = a.expectationIds || (a.expectationId ? [a.expectationId] : [])
    return ids.some(code => {
      let realCode = code
      const found = activeClassRecord.value?.gradebookUnits?.flatMap(u => u.expectations || [])
        .concat(activeClassRecord.value?.expectations || [])
        .find(e => e.expectationId === code || e.code === code)
      if (found && found.code) realCode = found.code
      return realCode === expCode
    })
  }).length
}

function toggleExpectationPopover(exp, event) {
  if (expectationPopover.value && expectationPopover.value.code === exp.code) {
    expectationPopover.value = null
    return
  }

  showHubPopover.value = false

  expectationPopover.value = {
    code: exp.code,
    name: exp.name,
    description: exp.description,
    unitName: exp.unitName,
    weight: exp.weight != null ? exp.weight : 1.0
  }
}

const quickActionTasks = computed(() => {
  const all = sortedAssessments.value
  const incomplete = all.filter(a => !getAssessmentStats(a.assessmentId).isComplete)
  const complete = all.filter(a => getAssessmentStats(a.assessmentId).isComplete)

  const result = [...incomplete]
  if (result.length < 2) {
    for (const cAst of complete) {
      if (result.length >= 2) break
      result.push(cAst)
    }
  }
  return result.slice(0, 2)
})

const needsGradingCount = computed(() => {
  return sortedAssessments.value.filter(a => !getAssessmentStats(a.assessmentId).isComplete).length
})

const filteredHubAssessments = computed(() => {
  let list = sortedAssessments.value

  if (hubSearchQuery.value.trim()) {
    const q = hubSearchQuery.value.toLowerCase().trim()
    list = list.filter(ast => {
      const nameMatch = ast.name && ast.name.toLowerCase().includes(q)
      const dateMatch = ast.date && String(ast.date).toLowerCase().includes(q)
      const expCodes = getAssessmentExpectationCodes(ast).join(' ').toLowerCase()
      return nameMatch || dateMatch || expCodes.includes(q)
    })
  }

  if (hubFilterTab.value === 'needs_grading') {
    list = list.filter(ast => !getAssessmentStats(ast.assessmentId).isComplete)
  } else if (hubFilterTab.value === 'formative') {
    list = list.filter(ast => (ast.isFormative || ast.purpose === 'formative') && ast.purpose !== 'administrative')
  } else if (hubFilterTab.value === 'summative') {
    list = list.filter(ast => !ast.isFormative && ast.purpose !== 'formative' && ast.purpose !== 'administrative' && !ast.isNumericComponent && ast.categoryId !== 'sbar_final_component')
  } else if (hubFilterTab.value === 'admin') {
    list = list.filter(ast => ast.purpose === 'administrative')
  } else if (hubFilterTab.value === 'final') {
    list = list.filter(ast => ast.isNumericComponent || ast.categoryId === 'sbar_final_component')
  }

  return list
})

const popoverConnectedAssessments = computed(() => {
  if (!expectationPopover.value) return []
  const expCode = expectationPopover.value.code
  return [...assessments.value].filter(a => {
    const ids = a.expectationIds || (a.expectationId ? [a.expectationId] : [])
    return ids.some(code => {
      let realCode = code
      const found = activeClassRecord.value?.gradebookUnits?.flatMap(u => u.expectations || [])
        .concat(activeClassRecord.value?.expectations || [])
        .find(e => e.expectationId === code || e.code === code)
      if (found && found.code) realCode = found.code
      return realCode === expCode
    })
  }).sort((a, b) => new Date(b.date) - new Date(a.date))
})

function handleGlobalClick(e) {
  if (showHubPopover.value) {
    const hubEl = document.querySelector('.sbar-hub-wrapper')
    if (hubEl && !hubEl.contains(e.target)) {
      showHubPopover.value = false
    }
  }
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})

const effectiveClass = computed(() => {
  if (!activeClassRecord.value) return null
  if (activeClassRecord.value.classType === 'elementary') {
    return getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
  }
  return activeClassRecord.value
})

function setGradeFilter(gFilter) {
  activeGradeFilter.value = gFilter
  activeStrandFilter.value = 'all'
}

function getUnitColorByIdx(idx) {
  return UNIT_COLORS[idx % UNIT_COLORS.length]
}

function getAssessmentGradeLevel(a) {
  if (a.gradeLevel) return a.gradeLevel.toLowerCase()
  if (a.targetCourseCode) return a.targetCourseCode.toLowerCase()
  
  const cls = effectiveClass.value
  if (!cls) return null

  if (a.unitId && cls.gradebookUnits) {
    const u = cls.gradebookUnits.find(unit => String(unit.unitId) === String(a.unitId))
    if (u) {
      const g = getUnitGradeLevel(u)
      if (g) return g.toLowerCase()
    }
  }

  const expIds = a.expectationIds || (a.expectationId ? [a.expectationId] : [])
  if (expIds.length > 0 && cls.gradebookUnits) {
    for (const u of cls.gradebookUnits) {
      const uGrade = getUnitGradeLevel(u)
      for (const e of (u.expectations || [])) {
        if (expIds.includes(e.code) || expIds.includes(e.expectationId)) {
          const g = e.gradeLevel || uGrade
          if (g) return g.toLowerCase()
        }
      }
    }
  }

  if (a.targetStudentId && activeClassRecord.value?.students?.[a.targetStudentId]?.gradeLevel) {
    return activeClassRecord.value.students[a.targetStudentId].gradeLevel.toLowerCase()
  }

  return null
}

const sortedAssessments = computed(() => {
  if (!assessments.value) return []
  let list = [...assessments.value]
    .filter(a => a.purpose === 'administrative' || a.categoryId === 'sbar_general' || (a.expectationIds && a.expectationIds.length > 0) || a.expectationId || a.isNumericComponent || a.categoryId === 'sbar_final_component')

  if (activeGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    const targetG = activeGradeFilter.value.toLowerCase()

    list = list.filter(a => {
      if (a.purpose === 'administrative') {
        return isAssessmentInSubCohort(a, activeGradeFilter.value)
      }
      const aGrade = getAssessmentGradeLevel(a)
      if (aGrade) {
        return isCohortMatch(aGrade, targetG)
      }
      return true
    })
  }

  return list.sort((a, b) => {
    const timeA = new Date(a.date || a.createdAt || 0).getTime()
    const timeB = new Date(b.date || b.createdAt || 0).getTime()
    if (timeB !== timeA) return timeB - timeA

    const createdA = new Date(a.createdAt || 0).getTime()
    const createdB = new Date(b.createdAt || 0).getTime()
    if (createdB !== createdA) return createdB - createdA

    return String(b.assessmentId).localeCompare(String(a.assessmentId))
  })
})

function onSelectTaskToGrade(e) {
  const astId = e.target?.value
  if (astId) {
    emit('select-assessment', astId)
    e.target.value = ''
  }
}

const algorithmLabel = computed(() => {
  const algo = activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
  if (algo === 'power_law') return 'Power Law (Marzano)'
  if (algo === 'mode') return 'Mode (Most Consistent)'
  if (algo === 'most_recent') return 'Most Recent (3)'
  if (algo === 'highest') return 'Highest Score'
  return 'Decaying Avg (65/35)'
})

const sortedRoster = computed(() => {
  if (!activeClassRecord.value?.students) return []
  let list = Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName))

  if (activeSubCohortFilter.value !== 'all' && availableSubCohorts.value.length > 1) {
    list = list.filter(st => isStudentInSubCohort(st))
  }
  return list
})

const allExpectations = computed(() => {
  const map = {}

  // 1. Gather expectations from gradebookUnits
  if (activeClassRecord.value?.gradebookUnits) {
    activeClassRecord.value.gradebookUnits.forEach(u => {
      if (u.expectations && Array.isArray(u.expectations)) {
        u.expectations.forEach(exp => {
          if (exp.code) {
            const cleanCode = exp.code.replace(/^SC\./i, '')
            const strandCode = exp.strand || cleanCode.charAt(0).toUpperCase()
            const gLevel = exp.gradeLevel || u.gradeLevel || exp.courseCode || ''
            const key = gLevel ? `${gLevel}_${exp.code}` : exp.code
            map[key] = {
              code: exp.code,
              name: exp.name || exp.description || `Expectation ${exp.code}`,
              strand: strandCode,
              unitId: u.unitId,
              unitName: u.name,
              description: exp.description || exp.name || '',
              gradeLevel: gLevel,
              courseCode: exp.courseCode || exp.targetCourseCode || '',
              weight: (exp.weight !== undefined && exp.weight !== null && !isNaN(exp.weight)) ? Number(exp.weight) : 1.0
            }
          }
        })
      }
    })
  }

  // 2. Gather expectations from expectations or curriculumExpectations
  const classExps = activeClassRecord.value?.expectations || activeClassRecord.value?.curriculumExpectations
  if (classExps && Array.isArray(classExps)) {
    classExps.forEach(exp => {
      if (exp.code) {
        const cleanCode = exp.code.replace(/^SC\./i, '')
        const strandCode = exp.strand || cleanCode.charAt(0).toUpperCase()
        const gLevel = exp.gradeLevel || exp.courseCode || ''
        const key = gLevel ? `${gLevel}_${exp.code}` : exp.code
        if (!map[key]) {
          map[key] = {
            code: exp.code,
            name: exp.name || exp.description || `Expectation ${exp.code}`,
            strand: strandCode,
            unitId: exp.unitId,
            description: exp.description || '',
            gradeLevel: gLevel,
            courseCode: exp.courseCode || exp.targetCourseCode || '',
            weight: (exp.weight !== undefined && exp.weight !== null && !isNaN(exp.weight)) ? Number(exp.weight) : 1.0
          }
        }
      }
    })
  }

  // 3. Gather expectations tagged on assessments (resolving UUIDs if needed)
  if (assessments.value) {
    assessments.value.forEach(ast => {
      const expCodes = ast.expectationIds || (ast.expectationId ? [ast.expectationId] : [])
      expCodes.forEach(rawCode => {
        if (rawCode) {
          let realCode = rawCode
          const found = activeClassRecord.value?.gradebookUnits?.flatMap(u => u.expectations || [])
            .concat(activeClassRecord.value?.expectations || [])
            .find(e => e.expectationId === rawCode || e.code === rawCode)
          if (found && found.code) realCode = found.code

          // Ignore raw UUIDs if no code matches
          if (realCode.includes('-') && realCode.length > 20) return

          const gLevel = found?.gradeLevel || ast.targetCourseCode || ast.gradeLevel || ''
          const key = gLevel ? `${gLevel}_${realCode}` : realCode

          if (!map[key]) {
            const cleanCode = realCode.replace(/^SC\./i, '')
            const strandCode = cleanCode.charAt(0).toUpperCase()
            map[key] = {
              code: realCode,
              name: `Expectation ${realCode}`,
              strand: strandCode,
              description: `Evaluated in ${ast.name}`,
              gradeLevel: gLevel,
              courseCode: ast.targetCourseCode || '',
              weight: (found?.weight !== undefined && found?.weight !== null && !isNaN(found?.weight)) ? Number(found.weight) : 1.0
            }
          }
        }
      })
    })
  }

  let list = Object.values(map)
  if (activeGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    list = list.filter(e => {
      const targetG = activeGradeFilter.value.toLowerCase()
      const eG = (e.gradeLevel || e.courseCode || '').toLowerCase()
      return !eG || isCohortMatch(eG, targetG)
    })
  }
  return list.sort((a, b) => a.code.localeCompare(b.code))
})

function stripGradePrefix(name) {
  if (!name) return ''
  return name.replace(/^\[Grade\s*\d+\]\s*/i, '').trim()
}

function formatStrandPillLabel(fullName) {
  return cleanUnitName(fullName)
}

function formatStrandHeaderName(fullName) {
  return cleanUnitName(fullName)
}

const availableStrands = computed(() => {
  const map = {}
  const units = activeClassRecord.value?.gradebookUnits || activeClassRecord.value?.units || []

  allExpectations.value.forEach(exp => {
    const cleanCode = (exp.code || '').replace(/^SC\./i, '')
    const sCode = exp.strand || cleanCode.charAt(0).toUpperCase() || 'General'
    const matchingUnit = units.find(u => 
      (u.unitId && exp.unitId && String(u.unitId) === String(exp.unitId)) ||
      (u.name && exp.unitName && String(u.name).trim().toLowerCase() === String(exp.unitName).trim().toLowerCase()) ||
      (u.expectations && Array.isArray(u.expectations) && u.expectations.some(e => e.code === exp.code || e.expectationId === exp.expectationId))
    )
    
    const unitName = matchingUnit ? stripGradePrefix(matchingUnit.name).trim() : (exp.unitName ? stripGradePrefix(exp.unitName).trim() : (sCode.length === 1 ? `Strand ${sCode}` : sCode))
    const normKey = unitName.toLowerCase()
    
    if (!map[normKey]) {
      map[normKey] = { id: normKey, code: sCode, gradeLevel: exp.gradeLevel, name: unitName, expectations: [] }
    }
    if (!map[normKey].expectations.some(e => e.code === exp.code && (e.gradeLevel || '') === (exp.gradeLevel || '') && (e.courseCode || '') === (exp.courseCode || ''))) {
      map[normKey].expectations.push(exp)
    }
  })

  return Object.values(map)
})

const academicAssessmentsCount = computed(() => {
  return (sortedAssessments.value || []).filter(a => a.purpose !== 'administrative').length
})

const totalAdminAssessmentsCount = computed(() => {
  return (assessments.value || []).filter(a => a.purpose === 'administrative' && isAssessmentInSubCohort(a)).length
})

const sbarAdminAssessments = computed(() => {
  if (activeStrandFilter.value === 'admin') {
    return sortedAssessments.value.filter(a => a.purpose === 'administrative')
  }
  if (activeStrandFilter.value === 'all' && availableStrands.value.length === 0) {
    return sortedAssessments.value.filter(a => a.purpose === 'administrative')
  }
  return []
})

const displayedStrands = computed(() => {
  if (activeStrandFilter.value === 'admin') return []
  if (activeStrandFilter.value === 'all') return availableStrands.value
  return availableStrands.value.filter(s => (s.id || s.code) === activeStrandFilter.value)
})

const displayedExpectations = computed(() => {
  const list = []
  displayedStrands.value.forEach(s => {
    list.push(...s.expectations)
  })
  return list
})

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

function onAdminSBARKeyNavigate(e, student, assessment) {
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
  }

  if (direction) {
    e.preventDefault()
    saveAdminText(assessment.assessmentId, student.studentId, e.target.value)

    const studentIdx = sortedRoster.value.findIndex(s => String(s.studentId) === String(student.studentId))
    let targetIdx = direction === 'down' ? studentIdx + 1 : studentIdx - 1

    while (targetIdx >= 0 && targetIdx < sortedRoster.value.length) {
      const targetStudent = sortedRoster.value[targetIdx]
      if (isAssessmentApplicableToStudent(assessment, targetStudent)) {
        break
      }
      targetIdx = direction === 'down' ? targetIdx + 1 : targetIdx - 1
    }

    if (targetIdx >= 0 && targetIdx < sortedRoster.value.length) {
      const targetStudent = sortedRoster.value[targetIdx]
      nextTick(() => {
        const selector = `[data-sbar-admin-input="${targetStudent.studentId}_${assessment.assessmentId}"]`
        const targetInput = document.querySelector(selector)
        if (targetInput) {
          targetInput.focus()
          targetInput.select()
        }
      })
    }
  }
}

function onAdminSBARChecklistKeyNavigate(e, student, assessment) {
  const isShift = e.shiftKey
  const isChecked = isAdminChecked(student.studentId, assessment.assessmentId)

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    advanceSBARChecklistFocus(student.studentId, assessment, 'down')
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    advanceSBARChecklistFocus(student.studentId, assessment, 'up')
  } else if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    toggleAdminChecklist(assessment.assessmentId, student.studentId)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    toggleAdminChecklist(assessment.assessmentId, student.studentId)
    advanceSBARChecklistFocus(student.studentId, assessment, isShift ? 'up' : 'down')
  } else if (e.key === '1' || e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'x') {
    e.preventDefault()
    if (!isChecked) {
      toggleAdminChecklist(assessment.assessmentId, student.studentId)
    }
    advanceSBARChecklistFocus(student.studentId, assessment, 'down')
  } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete' || e.key.toLowerCase() === 'n') {
    e.preventDefault()
    if (isChecked) {
      toggleAdminChecklist(assessment.assessmentId, student.studentId)
    }
    advanceSBARChecklistFocus(student.studentId, assessment, 'down')
  } else if (e.key === 'Tab') {
    e.preventDefault()
    advanceSBARChecklistFocus(student.studentId, assessment, isShift ? 'up' : 'down')
  }
}

function advanceSBARChecklistFocus(currentStudentId, assessment, direction = 'down') {
  const studentIdx = sortedRoster.value.findIndex(s => String(s.studentId) === String(currentStudentId))
  if (studentIdx < 0) return

  let targetIdx = direction === 'down' ? studentIdx + 1 : studentIdx - 1
  while (targetIdx >= 0 && targetIdx < sortedRoster.value.length) {
    const targetStudent = sortedRoster.value[targetIdx]
    if (isAssessmentApplicableToStudent(assessment, targetStudent)) {
      nextTick(() => {
        const selector = `[data-sbar-admin-check="${targetStudent.studentId}_${assessment.assessmentId}"]`
        const targetBtn = document.querySelector(selector)
        if (targetBtn) {
          targetBtn.focus()
        }
      })
      break
    }
    targetIdx = direction === 'down' ? targetIdx + 1 : targetIdx - 1
  }
}

function getAdminTextValue(studentId, assessmentId) {
  const entry = gradeMap.value[String(assessmentId)]?.[String(studentId)]
  return entry?.textValue || entry?.comment || ''
}

function getAdminCompletionCount(assessmentId) {
  let count = 0
  const astIdStr = String(assessmentId)
  const ast = (assessments.value || []).find(a => String(a.assessmentId) === astIdStr)
  const isText = ast?.adminFormat === 'text'
  for (const s of (sortedRoster.value || [])) {
    const entry = gradeMap.value[astIdStr]?.[s.studentId]
    if (!entry) continue
    if (isText) {
      const txt = entry.textValue || entry.comment || entry.resolvedScore
      if (txt && String(txt).trim() !== '') count++
    } else {
      if (entry.resolvedScore === 1 || entry.score === 1 || entry.pointsEarned === 1 || entry.received || entry.attempts?.[0]?.pointsEarned === 1) {
        count++
      }
    }
  }
  return count
}

const masteryMap = computed(() => {
  const algo = activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
  return calculateSBARExpectationMastery(effectiveClass.value || activeClassRecord.value, assessments.value, gradeMap.value, algo)
})

/** Precomputed dictionary: studentId -> { score, badge } */
const overallMasteryMap = computed(() => {
  const map = {}
  const m = masteryMap.value || {}
  for (const sId in m) {
    const expData = m[sId]
    if (!expData) continue
    const scores = Object.values(expData)
      .map(e => Number(e.score))
      .filter(s => !isNaN(s) && isFinite(s))
    if (scores.length > 0) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      map[sId] = { score: avg, badge: getSBARLevelBadge(avg) }
    }
  }
  return map
})

/** Precomputed dictionary: studentId -> { [expCode]: { badge, trend, score } } */
const studentExpCellMap = computed(() => {
  return masteryMap.value || {}
})

function getStudentExpMastery(studentId, expCode) {
  return masteryMap.value[studentId]?.[expCode] || null
}

function getOverallStudentMastery(studentId) {
  return overallMasteryMap.value[studentId] || null
}

const selectedStudentExpModal = ref(null)

function openExpectationDetail(studentId, expCode) {
  const st = sortedRoster.value.find(s => s.studentId === studentId)
  const exp = displayedExpectations.value.find(e => e.code === expCode)
  selectedStudentExpModal.value = {
    studentId,
    studentName: st ? `${st.firstName} ${st.lastName}` : 'Student',
    expectationCode: expCode,
    expectationTitle: exp?.name || exp?.title || expCode,
    expectationDescription: exp?.description || exp?.text || '',
    unitName: exp?.unitName || '',
    weight: exp?.weight != null ? exp.weight : 1.0
  }
}

function getExpCellTooltip(student, exp, cellData) {
  if (!cellData) return ''
  const weightSuffix = (exp?.weight != null && exp.weight !== 1) ? ` [${exp.weight}×]` : ''
  if (cellData.isOverridden) {
    const calcText = cellData.calculatedBadge?.level 
      ? ` (Calculated: ${cellData.calculatedBadge.level})` 
      : ''
    return `Professional Judgment Override: ${cellData.badge.level}${calcText}${weightSuffix} • Click to view tasks & adjust`
  }
  const evCount = cellData.evaluations?.length || 0
  return `${exp?.code || ''}${weightSuffix} • ${cellData.badge.level} (${cellData.score}%) • ${evCount} assessment${evCount !== 1 ? 's' : ''} • Click to view tasks & override`
}
</script>

<style scoped src="./GradesGridSBAR.css"></style>
