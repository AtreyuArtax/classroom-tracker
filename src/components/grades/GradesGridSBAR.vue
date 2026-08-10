<template>
  <div class="grades-grid-sbar">
    <!-- Strand & Unit Filter Pills + Task Selector -->
    <div class="sbar-toolbar">
      <div class="sbar-toolbar-left">
        <!-- Split Class Grade / Section Filter Pills -->
        <div v-if="availableGradeFilters.length > 1" class="sbar-grade-pills">
          <button 
            v-for="gFilter in availableGradeFilters" 
            :key="gFilter" 
            type="button"
            class="grade-pill"
            :class="{ 'grade-pill--active': String(activeGradeFilter).toLowerCase() === String(gFilter).toLowerCase() }"
            @click="setGradeFilter(gFilter)"
          >
            {{ gFilter === 'all' ? (activeClassRecord?.classType === 'elementary' ? 'All Grades' : 'All Sections') : gFilter }}
          </button>
        </div>

        <div v-if="availableStrands.length > 1 && (availableGradeFilters.length <= 1 || activeGradeFilter !== 'all')" class="sbar-strand-pills">
          <button 
            class="strand-pill" 
            :class="{ 'strand-pill--active': activeStrandFilter === 'all' }"
            @click="activeStrandFilter = 'all'"
          >
            All Strands
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
            {{ formatStrandPillLabel(strand.name) }}
          </button>
        </div>
      </div>

      <div class="sbar-toolbar-right">
        <!-- Tier 3: Quick Action Chips (Top 2 Active / Recent Tasks) -->
        <div v-if="quickActionTasks.length" class="sbar-quick-chips">
          <button 
            v-for="ast in quickActionTasks" 
            :key="'chip-' + ast.assessmentId"
            type="button"
            class="sbar-quick-chip"
            :title="`Grade ${ast.name} (${getAssessmentStats(ast.assessmentId).evaluatedCount}/${getAssessmentStats(ast.assessmentId).totalCount} scored)`"
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

        <!-- Tier 1: Searchable Assessment Hub Popover -->
        <div class="sbar-hub-wrapper">
          <button 
            v-if="sortedAssessments.length" 
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
                @click="onSelectAssessmentId(ast.assessmentId)"
              >
                <div class="hub-card-left">
                  <div class="hub-card-title-row">
                    <span class="hub-card-title">{{ ast.name }}</span>
                    <span 
                      class="hub-card-tag" 
                      :class="(ast.isFormative || ast.purpose === 'formative') ? 'hub-card-tag--formative' : 'hub-card-tag--summative'"
                    >
                      {{ (ast.isFormative || ast.purpose === 'formative') ? 'FORMATIVE' : 'SUMMATIVE' }}
                    </span>
                  </div>
                  <div class="hub-card-sub">
                    <span v-if="ast.date" class="hub-card-date"><Calendar :size="11" /> {{ formatLocalDisplay(ast.date) }}</span>
                    <span v-if="getAssessmentExpectationCodes(ast).length" class="hub-card-exps">
                      Standards: {{ getAssessmentExpectationCodes(ast).join(', ') }}
                    </span>
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

    <!-- SBAR Expectation Heatmap Grid Table -->
    <div class="sbar-grid-container">
      <table class="sbar-table">
        <thead>
          <!-- Strand Grouping Row -->
          <tr class="sbar-header-group">
            <th class="sticky-col sticky-col--name" colspan="1">STUDENT</th>
            <th class="sticky-col sticky-col--mastery" colspan="1">OVERALL MASTERY</th>
            <th 
              v-for="(strand, idx) in displayedStrands" 
              :key="'grp-' + (strand.id || strand.code)" 
              :colspan="strand.expectations.length"
              class="strand-group-header"
              :style="{
                borderTop: '3px solid ' + getUnitColorByIdx(idx),
                backgroundColor: getUnitColorByIdx(idx) + '12',
                color: '#1e293b'
              }"
            >
              {{ strand.name }}
            </th>
          </tr>

          <!-- Expectation Codes Row -->
          <tr class="sbar-header-sub">
            <th class="sticky-col sticky-col--name">Student Name</th>
            <th class="sticky-col sticky-col--mastery">Mastery</th>
            <th 
              v-for="exp in displayedExpectations" 
              :key="(exp.gradeLevel || exp.courseCode || 'all') + '-' + exp.code"
              class="exp-code-header exp-code-header--clickable"
              :class="{ 'exp-code-header--active': expectationPopover?.code === exp.code }"
              :title="`Click to view connected assessments for ${exp.code}`"
              @click.stop="toggleExpectationPopover(exp, $event)"
            >
              <div class="exp-code-main">
                <span>{{ exp.code }}</span>
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
              <div class="sbar-student-name-group" :title="`${student.lastName}, ${student.firstName}`">
                <div class="sbar-student-lastname">{{ student.lastName }}</div>
                <div class="sbar-student-firstname-row">
                  <span class="sbar-student-firstname">{{ student.firstName }}</span>
                  <span 
                    v-if="(student.gradeLevel || student.courseCode) && availableGradeFilters.length > 1" 
                    class="sbar-student-grade-tag"
                  >
                    {{ student.gradeLevel ? student.gradeLevel.replace('Grade ', 'Gr. ') : student.courseCode }}
                  </span>
                </div>
              </div>
            </td>

            <!-- Overall Mastery Badge Column -->
            <td class="sticky-col sticky-col--mastery sbar-mastery-cell">
              <span 
                v-if="getOverallStudentMastery(student.studentId)" 
                class="sbar-mastery-badge"
                :style="{ background: getOverallStudentMastery(student.studentId).badge.color + '22', color: getOverallStudentMastery(student.studentId).badge.color, borderColor: getOverallStudentMastery(student.studentId).badge.color + '55' }"
              >
                {{ getOverallStudentMastery(student.studentId).badge.level }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>

            <!-- Expectation Cells -->
            <td 
              v-for="exp in displayedExpectations" 
              :key="student.studentId + '-' + (exp.gradeLevel || 'all') + '-' + exp.code"
              class="sbar-exp-cell"
              @click="openExpectationDetail(student.studentId, exp.code)"
            >
              <div v-if="getStudentExpMastery(student.studentId, exp.code)" class="sbar-cell-content">
                <span 
                  class="sbar-level-pill"
                  :style="{ background: getStudentExpMastery(student.studentId, exp.code).badge.color + '22', color: getStudentExpMastery(student.studentId, exp.code).badge.color, borderColor: getStudentExpMastery(student.studentId, exp.code).badge.color + '44' }"
                >
                  {{ getStudentExpMastery(student.studentId, exp.code).badge.level }}
                </span>

                <!-- Trend Arrow -->
                <span 
                  v-if="getStudentExpMastery(student.studentId, exp.code).trend === 'improving'" 
                  class="sbar-trend sbar-trend--up" 
                  title="Improving trend"
                >↗</span>
                <span 
                  v-else-if="getStudentExpMastery(student.studentId, exp.code).trend === 'declining'" 
                  class="sbar-trend sbar-trend--down" 
                  title="Declining trend"
                >↘</span>
              </div>
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
              <h4 class="exp-popover-code">{{ expectationPopover.code }}</h4>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, ChevronDown, X, Layers, Calendar, FileText, FileEdit } from 'lucide-vue-next'
import { 
  activeClassRecord, 
  assessments, 
  gradeMap,
  activeGradeFilter,
  activeSubCohortFilter,
  availableSubCohorts,
  isStudentInSubCohort
} from '../../composables/useGradebook.js'
import {
  calculateSBARExpectationMastery,
  getSBARLevelBadge
} from '../../db/gradebookService.js'

import { formatLocalDisplay } from '../../utils/dates.js'
import { getEffectiveClassRecord } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { UNIT_COLORS, getSectionColor } from '../../utils/gradeColors.js'

const props = defineProps({
  isPrivacyMode: Boolean
})

const emit = defineEmits(['open-dossier', 'select-expectation', 'select-assessment'])

const activeStrandFilter = ref('all')

const availableGradeFilters = computed(() => availableSubCohorts.value)

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

function getAssessmentTargetRoster(ast) {
  if (!activeClassRecord.value?.students) return []
  const allStudents = Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))

  if (!ast) return allStudents

  const aGrade = getAssessmentGradeLevel(ast)
  if (aGrade) {
    const targetG = aGrade.toLowerCase()
    const matchingStudents = allStudents.filter(s => {
      const sG = (s.gradeLevel || s.courseCode || '').toLowerCase()
      return sG && sG === targetG
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
    unitName: exp.unitName
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
    list = list.filter(ast => ast.isFormative || ast.purpose === 'formative')
  } else if (hubFilterTab.value === 'summative') {
    list = list.filter(ast => !ast.isFormative && ast.purpose !== 'formative')
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
      const g = u.gradeLevel || (u.name && u.name.toLowerCase().includes('grade 7') ? 'grade 7' : (u.name && u.name.toLowerCase().includes('grade 8') ? 'grade 8' : ''))
      if (g) return g.toLowerCase()
    }
  }

  const expIds = a.expectationIds || (a.expectationId ? [a.expectationId] : [])
  if (expIds.length > 0 && cls.gradebookUnits) {
    for (const u of cls.gradebookUnits) {
      const uGrade = u.gradeLevel || (u.name && u.name.toLowerCase().includes('grade 7') ? 'grade 7' : (u.name && u.name.toLowerCase().includes('grade 8') ? 'grade 8' : ''))
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
    .filter(a => a.categoryId === 'sbar_general' || (a.expectationIds && a.expectationIds.length > 0) || a.expectationId)

  if (activeGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    const targetG = activeGradeFilter.value.toLowerCase()

    list = list.filter(a => {
      const aGrade = getAssessmentGradeLevel(a)
      if (aGrade) {
        return aGrade === targetG
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
              courseCode: exp.courseCode || exp.targetCourseCode || ''
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
            courseCode: exp.courseCode || exp.targetCourseCode || ''
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
              courseCode: ast.targetCourseCode || ''
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
      return !eG || eG === targetG
    })
  }
  return list.sort((a, b) => a.code.localeCompare(b.code))
})

function stripGradePrefix(name) {
  if (!name) return ''
  return name.replace(/^\[Grade\s*\d+\]\s*/i, '').trim()
}

function formatStrandPillLabel(fullName) {
  if (!fullName) return ''
  let clean = stripGradePrefix(fullName).replace(/\s*\([^)]*\)/g, '').trim()
  if (clean.includes(':')) {
    clean = clean.split(':')[0].trim()
  }

  const needsCompact = availableStrands.value.length > 4 || availableGradeFilters.value.length > 1
  if (needsCompact && /^strand\s+[a-z0-9]/i.test(clean)) {
    return clean.replace(/^strand\s+/i, 'Str. ')
  }

  if (clean.length > 14) {
    return clean.substring(0, 12) + '…'
  }
  return clean
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
    if (!map[normKey].expectations.some(e => e.code === exp.code)) {
      map[normKey].expectations.push(exp)
    }
  })

  return Object.values(map)
})

const displayedStrands = computed(() => {
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

const masteryMap = computed(() => {
  const algo = activeClassRecord.value?.sbarAlgorithm || 'decaying_average'
  return calculateSBARExpectationMastery(activeClassRecord.value, assessments.value, gradeMap.value, algo)
})

function getStudentExpMastery(studentId, expCode) {
  return masteryMap.value[studentId]?.[expCode] || null
}

function getOverallStudentMastery(studentId) {
  const expData = masteryMap.value[studentId]
  if (!expData) return null
  const scores = Object.values(expData).map(e => e.score).filter(s => s != null)
  if (scores.length === 0) return null
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  return { score: avg, badge: getSBARLevelBadge(avg) }
}

function openExpectationDetail(studentId, expCode) {
  emit('select-expectation', { studentId, expCode })
}
</script>

<style scoped>
.grades-grid-sbar {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.sbar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--surface);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  flex-wrap: nowrap;
  position: relative;
  z-index: 50;
}

.sbar-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.sbar-grade-pills {
  display: flex;
  align-items: center;
  gap: 4px;
  border-right: 1px solid var(--border);
  padding-right: 8px;
  flex-shrink: 0;
}

.sbar-strand-pills {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  white-space: nowrap;
}

.sbar-strand-pills::-webkit-scrollbar {
  display: none;
}

.sbar-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  z-index: 2;
  background: var(--surface);
}

.sbar-task-select {
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--primary);
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.sbar-task-select:hover {
  background: rgba(37, 99, 235, 0.15);
}

.sbar-grade-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  border-right: 1px solid var(--border);
  padding-right: 10px;
}

.grade-pill {
  padding: 5px 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.grade-pill:hover {
  background: var(--bg-hover);
  color: var(--text);
  border-color: var(--primary);
}

.grade-pill--active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.strand-pill-dot {
  font-size: 11px;
  margin-right: 4px;
}

.strand-group--gr7 {
  background: rgba(99, 102, 241, 0.12) !important;
  color: #6366f1 !important;
  border-bottom: 2px solid rgba(99, 102, 241, 0.4) !important;
}

.strand-group--gr8 {
  background: rgba(14, 165, 233, 0.12) !important;
  color: #0ea5e9 !important;
  border-bottom: 2px solid rgba(14, 165, 233, 0.4) !important;
}

.exp-grade-sub-tag,
.sbar-student-grade-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 600;
  color: #2563eb;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 4px;
  line-height: 1.2;
  vertical-align: middle;
}

.strand-pill {
  padding: 5px 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.strand-pill:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.strand-pill--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.sbar-algorithm-badge {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.sbar-algorithm-badge strong {
  color: var(--primary);
  margin-left: 4px;
}

.sbar-grid-container {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.sbar-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.sbar-header-group th {
  background: var(--bg-secondary);
  padding: 8px 12px;
  font-size: 0.775rem;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
  text-align: center;
}

.sbar-header-sub th {
  background: var(--surface);
  padding: 10px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  border-bottom: 2px solid var(--border);
  border-right: 1px solid var(--border);
  text-align: center;
}

.sticky-col {
  position: sticky;
  z-index: 10;
  background-color: var(--surface);
}

thead th.sticky-col {
  z-index: 20;
}

.sbar-header-group th.sticky-col {
  background-color: var(--bg-secondary);
}

.sbar-header-sub th.sticky-col {
  background-color: var(--surface);
}

.sticky-col--name {
  left: 0;
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  box-sizing: border-box;
  text-align: left !important;
  border-right: 1px solid var(--border) !important;
  background-color: var(--surface);
}

.sticky-col--mastery {
  left: 180px;
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  box-sizing: border-box;
  text-align: center !important;
  border-right: 2px solid var(--border) !important;
  background-color: var(--surface);
  box-shadow: 3px 0 6px -2px rgba(0, 0, 0, 0.12);
}

.exp-code-header {
  min-width: 90px;
  cursor: help;
}

.sbar-row:hover td {
  background-color: var(--bg-secondary);
}

.sbar-row:hover td.sticky-col {
  background-color: var(--bg-secondary) !important;
}

.sbar-row td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
  text-align: center;
  font-size: 0.85rem;
}

.sbar-student-cell {
  cursor: pointer;
}

.sbar-student-name-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.2;
}

.sbar-student-lastname {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sbar-student-firstname-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
}

.sbar-student-firstname {
  font-size: 0.78rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
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

.sbar-mastery-cell {
  font-weight: 700;
}

.sbar-mastery-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.8rem;
  border: 1px solid transparent;
}

.sbar-exp-cell {
  cursor: pointer;
}

.sbar-cell-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.sbar-level-pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.75rem;
  border: 1px solid transparent;
}

.sbar-trend {
  font-size: 0.85rem;
  font-weight: 800;
}

.sbar-trend--up {
  color: #16a34a;
}

.sbar-trend--down {
  color: #dc2626;
}

.sbar-empty-cell {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* Quick Action Chips */
.sbar-quick-chips {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sbar-quick-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: var(--radius-full, 20px);
  background: var(--bg-tertiary, #f1f5f9);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sbar-quick-chip:hover {
  background: var(--primary-light, #e0e7ff);
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
}

.chip-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.chip-name {
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-badge {
  font-size: 0.7rem;
  padding: 1px 5px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  font-weight: 700;
}

.chip-badge--complete {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

/* Assessment Hub Wrapper & Button */
.sbar-hub-wrapper {
  position: relative;
}

.sbar-hub-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md, 8px);
  background: var(--primary);
  color: #ffffff;
  border: none;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
}

.sbar-hub-btn:hover,
.sbar-hub-btn--active {
  background: var(--primary-hover, #4338ca);
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}

.sbar-hub-count {
  background: rgba(255, 255, 255, 0.25);
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 800;
}

.sbar-hub-chevron {
  transition: transform 0.2s ease;
}

.sbar-hub-btn--active .sbar-hub-chevron {
  transform: rotate(180deg);
}

/* Floating Hub Popover Window */
.sbar-hub-popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 380px;
  max-height: 480px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: sbarHubFadeIn 0.15s ease-out;
}

@keyframes sbarHubFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.hub-header {
  padding: 12px;
  background: var(--bg-secondary, #f8fafc);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hub-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hub-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.hub-close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.hub-close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text);
}

.hub-search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 9px;
  color: var(--text-secondary);
  pointer-events: none;
}

.hub-search-input {
  width: 100%;
  padding: 6px 28px 6px 28px;
  font-size: 0.8rem;
  border-radius: var(--radius-md, 6px);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.hub-search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
}

.hub-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
}

.hub-tab {
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.hub-tab:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text);
}

.hub-tab--active {
  background: var(--primary);
  color: #ffffff !important;
}

.hub-body {
  padding: 8px;
  overflow-y: auto;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hub-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.hub-ast-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.15s ease;
}

.hub-ast-card:hover {
  border-color: var(--primary);
  background: var(--primary-light, rgba(99, 102, 241, 0.04));
  transform: translateX(2px);
}

.hub-card-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.hub-card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hub-card-title {
  font-weight: 700;
  font-size: 0.83rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hub-card-tag {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.hub-card-tag--formative {
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
}

.hub-card-tag--summative {
  background: rgba(168, 85, 247, 0.12);
  color: #9333ea;
}

.hub-card-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.hub-card-date {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.hub-card-exps {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.hub-progress-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  white-space: nowrap;
}

.hub-progress-pill--done {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

/* Clickable Expectation Column Header */
.exp-code-header--clickable {
  cursor: pointer;
  transition: background 0.15s ease;
}

.exp-code-header--clickable:hover {
  background: rgba(99, 102, 241, 0.08) !important;
}

.exp-code-header--active {
  background: rgba(99, 102, 241, 0.15) !important;
}

.exp-code-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.exp-ast-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 8px;
  background: var(--primary);
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 800;
}

/* Expectation Contextual Popover Modal */
.exp-popover-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(2px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.exp-popover {
  width: 420px;
  max-width: 90vw;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  animation: expPopoverPop 0.18s ease-out;
}

@keyframes expPopoverPop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.exp-popover-header {
  padding: 14px 16px;
  background: var(--bg-secondary, #f8fafc);
  border-bottom: 1px solid var(--border);
}

.exp-popover-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.exp-popover-code {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--primary);
}

.exp-popover-desc {
  margin: 2px 0 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.exp-popover-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
}

.exp-popover-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text);
}

.exp-popover-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.exp-meta-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--primary);
}

.exp-meta-unit {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.exp-popover-body {
  padding: 10px 14px;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exp-popover-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.exp-ast-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.15s ease;
}

.exp-ast-item:hover {
  border-color: var(--primary);
  background: var(--primary-light, rgba(99, 102, 241, 0.04));
  transform: translateX(2px);
}

.exp-ast-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.exp-ast-title {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text);
}

.exp-ast-date {
  font-size: 0.72rem;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
</style>
