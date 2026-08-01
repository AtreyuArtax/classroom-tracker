<template>
  <div class="grades-grid-sbar">
    <!-- Strand & Unit Filter Pills + Task Selector -->
    <div class="sbar-toolbar">
      <!-- Split Class Grade Filter Pills -->
      <div v-if="availableGradeFilters.length > 1" class="sbar-grade-pills">
        <button 
          v-for="gFilter in availableGradeFilters" 
          :key="gFilter" 
          class="grade-pill"
          :class="{ 'grade-pill--active': activeGradeFilter === gFilter }"
          @click="activeGradeFilter = gFilter"
        >
          {{ gFilter === 'all' ? 'All Grades' : gFilter }}
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
          v-for="strand in availableStrands" 
          :key="strand.id || strand.code" 
          class="strand-pill"
          :class="{ 'strand-pill--active': activeStrandFilter === (strand.id || strand.code) }"
          :title="strand.name"
          @click="activeStrandFilter = (strand.id || strand.code)"
        >
          {{ formatStrandPillLabel(strand.name) }}
        </button>
      </div>

      <div class="sbar-toolbar-right">
        <select v-if="sortedAssessments.length" class="sbar-task-select" @change="onSelectTaskToGrade($event)">
          <option value="" disabled selected>📝 Select Task to Grade...</option>
          <option v-for="ast in sortedAssessments" :key="ast.assessmentId" :value="ast.assessmentId">
            {{ ast.name }} ({{ formatLocalDisplay(ast.date) }})
          </option>
        </select>

        <div class="sbar-algorithm-badge">
          <span>Engine:</span> 
          <strong>{{ algorithmLabel }}</strong>
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
              v-for="strand in displayedStrands" 
              :key="'grp-' + (strand.id || strand.code)" 
              :colspan="strand.expectations.length"
              class="strand-group-header"
              :class="{
                'strand-group--gr7': strand.gradeLevel === 'Grade 7',
                'strand-group--gr8': strand.gradeLevel === 'Grade 8'
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
              :key="exp.code"
              class="exp-code-header"
              :title="exp.code + ': ' + exp.description"
            >
              <div>{{ exp.code }}</div>
              <div v-if="exp.gradeLevel && availableGradeFilters.length > 1" class="exp-grade-sub-tag">
                {{ exp.gradeLevel.replace('Grade ', 'Gr ') }}
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
                    v-if="student.gradeLevel && availableGradeFilters.length > 1" 
                    class="sbar-student-grade-tag"
                    :class="{
                      'sbar-student-grade-tag--gr7': student.gradeLevel === 'Grade 7',
                      'sbar-student-grade-tag--gr8': student.gradeLevel === 'Grade 8'
                    }"
                  >
                    {{ student.gradeLevel.replace('Grade ', 'Gr ') }}
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
              :key="student.studentId + '-' + exp.code"
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
              <span v-else class="sbar-empty-cell">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  activeClassRecord, 
  assessments, 
  gradeMap
} from '../../composables/useGradebook.js'
import {
  calculateSBARExpectationMastery,
  getSBARLevelBadge
} from '../../db/gradebookService.js'

import { formatLocalDisplay } from '../../utils/dates.js'

const props = defineProps({
  isPrivacyMode: Boolean
})

const emit = defineEmits(['open-dossier', 'select-expectation', 'select-assessment'])

const activeStrandFilter = ref('all')
const activeGradeFilter = ref('all')

const availableGradeFilters = computed(() => {
  const grades = new Set()
  if (activeClassRecord.value?.students) {
    Object.values(activeClassRecord.value.students).forEach(st => {
      if (st.gradeLevel && !st.archived) grades.add(st.gradeLevel)
    })
  }
  const classExps = activeClassRecord.value?.expectations || activeClassRecord.value?.curriculumExpectations || []
  classExps.forEach(e => {
    if (e.gradeLevel) grades.add(e.gradeLevel)
  })
  if (grades.size <= 1) return []
  return ['all', ...Array.from(grades).sort()]
})

const sortedAssessments = computed(() => {
  if (!assessments.value) return []
  return [...assessments.value]
    .filter(a => a.categoryId === 'sbar_general' || (a.expectationIds && a.expectationIds.length > 0))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
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

  if (activeGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    list = list.filter(st => (st.gradeLevel || '').toLowerCase() === activeGradeFilter.value.toLowerCase())
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
            const strandCode = exp.strand || exp.code.charAt(0).toUpperCase()
            const gLevel = exp.gradeLevel || u.gradeLevel || ''
            const key = gLevel ? `${gLevel}_${exp.code}` : exp.code
            map[key] = {
              code: exp.code,
              name: exp.name || exp.description || `Expectation ${exp.code}`,
              strand: strandCode,
              unitId: u.unitId,
              unitName: u.name,
              description: exp.description || exp.name || '',
              gradeLevel: gLevel
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
        const strandCode = exp.strand || exp.code.charAt(0).toUpperCase()
        const gLevel = exp.gradeLevel || ''
        const key = gLevel ? `${gLevel}_${exp.code}` : exp.code
        if (!map[key]) {
          map[key] = {
            code: exp.code,
            name: exp.name || exp.description || `Expectation ${exp.code}`,
            strand: strandCode,
            unitId: exp.unitId,
            description: exp.description || '',
            gradeLevel: gLevel
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

          const gLevel = found?.gradeLevel || ''
          const key = gLevel ? `${gLevel}_${realCode}` : realCode

          if (!map[key]) {
            const strandCode = realCode.charAt(0).toUpperCase()
            map[key] = {
              code: realCode,
              name: `Expectation ${realCode}`,
              strand: strandCode,
              description: `Evaluated in ${ast.name}`,
              gradeLevel: gLevel
            }
          }
        }
      })
    })
  }

  let list = Object.values(map)
  if (activeGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    list = list.filter(e => !e.gradeLevel || e.gradeLevel.toLowerCase() === activeGradeFilter.value.toLowerCase())
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
    const [codePart, descPart] = clean.split(':')
    const shortDesc = descPart.split('&')[0].trim()
    return `${codePart.trim()}: ${shortDesc}`
  }
  return clean
}

const availableStrands = computed(() => {
  const map = {}
  const units = activeClassRecord.value?.gradebookUnits || []

  allExpectations.value.forEach(exp => {
    const sCode = exp.strand || exp.code?.charAt(0).toUpperCase() || 'General'
    const key = exp.gradeLevel ? `${exp.gradeLevel}_${sCode}` : sCode
    if (!map[key]) {
      const matchingUnit = units.find(u => 
        u.unitId === exp.unitId ||
        ((!u.gradeLevel || !exp.gradeLevel || u.gradeLevel === exp.gradeLevel) && u.name && (u.name.startsWith(`Strand ${sCode}`) || u.name.startsWith(sCode) || u.name.toLowerCase().includes(`strand ${sCode.toLowerCase()}`)))
      )
      const rawName = matchingUnit?.name || exp.unitName || (sCode.length === 1 ? `Strand ${sCode}` : sCode)
      const strandName = stripGradePrefix(rawName)
      map[key] = { id: key, code: sCode, gradeLevel: exp.gradeLevel, name: strandName, expectations: [] }
    }
    map[key].expectations.push(exp)
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
}

.sbar-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
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

.sbar-grade-pills .grade-pill:nth-child(2) {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.3);
  color: #6366f1;
}

.sbar-grade-pills .grade-pill:nth-child(2).grade-pill--active {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

.sbar-grade-pills .grade-pill:nth-child(3) {
  background: rgba(14, 165, 233, 0.08);
  border-color: rgba(14, 165, 233, 0.3);
  color: #0ea5e9;
}

.sbar-grade-pills .grade-pill:nth-child(3).grade-pill--active {
  background: #0ea5e9;
  color: #fff;
  border-color: #0ea5e9;
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

.exp-grade-sub-tag {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--primary);
  opacity: 0.85;
  margin-top: 1px;
}

.sbar-student-grade-tag {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.12);
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
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
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.sbar-student-firstname {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
</style>
