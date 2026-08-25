<template>
  <div class="expectation-heatmap">
    <div class="expectation-heatmap__header">
      <div>
        <h4 class="expectation-heatmap__title">Curriculum Expectation Mastery</h4>
        <p class="expectation-heatmap__subtitle">Overview of student performance per curriculum expectation and strand.</p>
      </div>
      <div 
        v-if="strugglingCount > 0" 
        class="expectation-heatmap__alert-chip"
        :class="{ 'expectation-heatmap__alert-chip--active': selectedUnitFilter === 'needs_reteaching' }"
        @click="selectedUnitFilter = selectedUnitFilter === 'needs_reteaching' ? 'all' : 'needs_reteaching'"
        title="Click to filter struggling standards"
      >
        <AlertCircle :size="14" />
        <span>{{ strugglingCount }} expectation{{ strugglingCount !== 1 ? 's' : '' }} need re-teaching (&lt;65%)</span>
      </div>
    </div>

    <!-- Filter Pills Bar & Quick Toggles -->
    <div v-if="unitsWithExpectations.length" class="expectation-heatmap__filter-bar">
      <div class="filter-pills">
        <button 
          class="filter-pill"
          :class="{ 'filter-pill--active': selectedUnitFilter === 'all' }"
          @click="selectedUnitFilter = 'all'"
        >
          All Units ({{ totalExpectationsInFilter }} exps)
        </button>
        <button 
          v-for="u in unitsWithExpectations" 
          :key="u.unitId"
          class="filter-pill"
          :class="{ 'filter-pill--active': selectedUnitFilter === u.unitId }"
          @click="selectedUnitFilter = u.unitId"
        >
          {{ u.name }}
        </button>
        <button 
          v-if="strugglingCount > 0"
          class="filter-pill filter-pill--danger"
          :class="{ 'filter-pill--active': selectedUnitFilter === 'needs_reteaching' }"
          @click="selectedUnitFilter = 'needs_reteaching'"
        >
          <AlertTriangle :size="13" style="display: inline-block; vertical-align: -1px; margin-right: 4px;" /> Needs Re-Teaching ({{ strugglingCount }})
        </button>
      </div>

      <div class="expand-toggles">
        <button class="btn-toggle-all" @click="expandAllUnits">Expand All</button>
        <span class="divider">·</span>
        <button class="btn-toggle-all" @click="collapseAllUnits">Collapse All</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!filteredUnitsWithExpectations.length" class="expectation-heatmap__empty">
      <BookOpen :size="36" class="expectation-heatmap__empty-icon" />
      <template v-if="!unitsWithExpectations.length">
        <p class="expectation-heatmap__empty-text">No curriculum expectations configured for this class.</p>
        <p class="expectation-heatmap__empty-sub">Import or add expectations in <strong>Setup → Framework</strong> to unlock standards-based tracking.</p>
      </template>
      <template v-else>
        <p class="expectation-heatmap__empty-text">No expectations match the selected filter.</p>
        <button class="btn-reset-filter" @click="selectedUnitFilter = 'all'">Show All Units</button>
      </template>
    </div>

    <!-- Units & Expectations List -->
    <div v-else class="expectation-heatmap__content">
      <div 
        v-for="unit in filteredUnitsWithExpectations" 
        :key="unit.unitId"
        class="expectation-heatmap__unit-card"
      >
        <div 
          class="expectation-heatmap__unit-header"
          @click="toggleUnitCollapse(unit.unitId)"
        >
          <div class="unit-header-left">
            <span class="expectation-heatmap__unit-name">{{ unit.name }}</span>
            <span v-if="isSBAR && unit.unitSbarBadge" class="unit-mastery-badge" :style="{ backgroundColor: getHeatColor(unit.unitAvg) }">
              Unit {{ unit.unitSbarBadge.level }}
            </span>
            <span v-else-if="unit.unitAvg !== null" class="unit-mastery-badge" :style="{ backgroundColor: getHeatColor(unit.unitAvg) }">
              {{ unit.unitAvg.toFixed(1) }}%
            </span>
          </div>

          <div class="unit-header-right">
            <span class="expectation-heatmap__unit-badge">{{ unit.expectations.length }} Expectations</span>
            <ChevronUp v-if="!collapsedUnits.has(unit.unitId)" :size="16" class="chevron-icon" />
            <ChevronDown v-else :size="16" class="chevron-icon" />
          </div>
        </div>

        <div v-if="!collapsedUnits.has(unit.unitId)" class="expectation-heatmap__grid">
          <div 
            v-for="exp in unit.expectations" 
            :key="exp.expectationId || exp.code"
            class="expectation-heatmap__row"
          >
            <div class="expectation-heatmap__code-col">
              <span class="expectation-heatmap__code">{{ exp.code }}</span>
              <span class="expectation-heatmap__desc" :title="exp.description">{{ exp.description }}</span>
            </div>

            <div class="expectation-heatmap__stat-col">
              <span class="expectation-heatmap__count-tag" title="Assessments linked">
                {{ exp.assessmentCount }} {{ exp.assessmentCount === 1 ? 'assessment' : 'assessments' }}
              </span>
            </div>

            <div class="expectation-heatmap__bar-col">
              <div 
                v-if="exp.distribution && exp.distribution.total > 0" 
                class="expectation-heatmap__stacked-track"
                :title="`L4: ${exp.distribution.L4} | L3: ${exp.distribution.L3} | L2: ${exp.distribution.L2} | L1: ${exp.distribution.L1}`"
              >
                <div 
                  v-if="exp.distribution.L4 > 0" 
                  class="expectation-heatmap__stacked-seg seg--l4" 
                  :style="{ width: (exp.distribution.L4 / exp.distribution.total * 100) + '%' }"
                ></div>
                <div 
                  v-if="exp.distribution.L3 > 0" 
                  class="expectation-heatmap__stacked-seg seg--l3" 
                  :style="{ width: (exp.distribution.L3 / exp.distribution.total * 100) + '%' }"
                ></div>
                <div 
                  v-if="exp.distribution.L2 > 0" 
                  class="expectation-heatmap__stacked-seg seg--l2" 
                  :style="{ width: (exp.distribution.L2 / exp.distribution.total * 100) + '%' }"
                ></div>
                <div 
                  v-if="exp.distribution.L1 > 0" 
                  class="expectation-heatmap__stacked-seg seg--l1" 
                  :style="{ width: (exp.distribution.L1 / exp.distribution.total * 100) + '%' }"
                ></div>
              </div>
              <div v-else class="expectation-heatmap__empty-track"></div>
            </div>

            <div class="expectation-heatmap__score-col">
              <template v-if="isSBAR && exp.sbarBadge">
                <span 
                  class="sbar-level-pill"
                  :style="{ backgroundColor: getHeatColor(exp.average) }"
                >
                  {{ exp.sbarBadge.level }}
                </span>
              </template>
              <template v-else>
                <span 
                  class="expectation-heatmap__score-val"
                  :style="{ color: getHeatColor(exp.average) }"
                >
                  {{ exp.average !== null ? exp.average.toFixed(1) + '%' : '—' }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BookOpen, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { calculateSBARExpectationMastery, getSBARLevelBadge } from '../../db/gradebookService.js'
import { gradeMap } from '../../composables/useGradebook.js'
import { getEffectiveClassRecord, getUnitGradeLevel } from '../../composables/useElementary.js'
import { isCohortMatch } from '../../db/gradebook/gradeCalc.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'

const props = defineProps({
  activeClass: { type: Object, default: null },
  assessments: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  activeGradeFilter: { type: String, default: 'all' },
  events: { type: Array, default: () => [] },
  sidebarStudents: { type: Array, default: () => [] }
})

const effectiveClass = computed(() => {
  if (!props.activeClass) return null
  if (props.activeClass.classType === 'elementary') {
    return getEffectiveClassRecord(props.activeClass, activeSubjectId.value)
  }
  return props.activeClass
})

const isSBAR = computed(() => effectiveClass.value?.gradingFramework === 'sbar')
const selectedUnitFilter = ref('all') // 'all' | 'needs_reteaching' | unitId
const collapsedUnits = ref(new Set()) // set of unitIds that are collapsed

const rawUnits = computed(() => {
  const cls = effectiveClass.value
  if (!cls) return []

  const targetGrade = props.activeGradeFilter && props.activeGradeFilter !== 'all' ? props.activeGradeFilter.toLowerCase() : null
  const unitMap = {}

  // 1. Gather from gradebookUnits and courseFrameworks (Strands/Units)
  const candidateUnits = []
  if (cls.gradebookUnits && Array.isArray(cls.gradebookUnits)) {
    candidateUnits.push(...cls.gradebookUnits)
  }
  if (cls.courseFrameworks && typeof cls.courseFrameworks === 'object') {
    Object.entries(cls.courseFrameworks).forEach(([sectionKey, fw]) => {
      if (props.activeGradeFilter && props.activeGradeFilter !== 'all' && sectionKey.toLowerCase() !== targetGrade) {
        return
      }
      if (fw.gradebookUnits && Array.isArray(fw.gradebookUnits)) {
        fw.gradebookUnits.forEach(u => {
          if (!candidateUnits.some(existing => existing.unitId === u.unitId)) {
            candidateUnits.push(u)
          }
        })
      }
    })
  }

  if (candidateUnits.length > 0) {
    candidateUnits.forEach(u => {
      const uGrade = getUnitGradeLevel(u)

      if (props.activeGradeFilter && props.activeGradeFilter !== 'all' && uGrade && !isCohortMatch(uGrade, props.activeGradeFilter)) {
        return
      }

      const validExps = (u.expectations || []).filter(e => {
        if (!e.code) return false
        const eGrade = e.gradeLevel || uGrade
        if (props.activeGradeFilter && props.activeGradeFilter !== 'all' && eGrade && !isCohortMatch(eGrade, props.activeGradeFilter)) return false
        return true
      })

      if (!unitMap[u.unitId]) {
        unitMap[u.unitId] = {
          unitId: u.unitId,
          name: (u.name || 'Strand').replace(/\[Grade \d+\]\s*/g, ''),
          expectations: [...validExps]
        }
      }
    })
  }

  // 2. Gather from flat expectations list if gradebookUnits empty or incomplete
  const flatExps = cls.expectations || cls.curriculumExpectations || []
  if (flatExps.length > 0) {
    flatExps.forEach(exp => {
      if (!exp.code) return
      const eGrade = exp.gradeLevel || ''
      if (targetGrade && eGrade && eGrade.toLowerCase() !== targetGrade) return

      const strandCode = exp.strand || exp.code.charAt(0).toUpperCase()
      const uId = exp.unitId || `strand-${strandCode}`
      const uName = exp.strandName || `Strand ${strandCode}`

      if (!unitMap[uId]) {
        unitMap[uId] = {
          unitId: uId,
          name: uName,
          expectations: []
        }
      }

      if (!unitMap[uId].expectations.some(e => e.code === exp.code)) {
        unitMap[uId].expectations.push(exp)
      }
    })
  }

  return Object.values(unitMap).filter(u => u.expectations.length > 0)
})

const unitsWithExpectations = computed(() => {
  const unitsList = rawUnits.value
  if (!unitsList.length) return []

  const expScores = {}
  const expAssessmentCounts = {}

  // Count assessments linking expectations (supports expectationIds array & expectationId)
  props.assessments.forEach(ass => {
    if (ass.excluded) return
    const ids = ass.expectationIds && Array.isArray(ass.expectationIds) ? ass.expectationIds : (ass.expectationId ? [ass.expectationId] : [])
    ids.forEach(id => {
      const sId = String(id)
      expAssessmentCounts[sId] = (expAssessmentCounts[sId] || 0) + 1
    })
  })

  const validStudentIds = props.sidebarStudents && props.sidebarStudents.length > 0
    ? new Set(props.sidebarStudents.map(s => String(s.studentId)))
    : null

  if (isSBAR.value) {
    const algo = effectiveClass.value?.sbarAlgorithm || 'decaying_average'
    const sbarMasteryMap = calculateSBARExpectationMastery(effectiveClass.value, props.assessments, gradeMap.value, algo, props.events)
    
    Object.entries(sbarMasteryMap).forEach(([studentId, studentExpMap]) => {
      if (!studentExpMap) return
      if (validStudentIds && !validStudentIds.has(String(studentId))) return
      Object.entries(studentExpMap).forEach(([expCode, mObj]) => {
        if (mObj && mObj.score !== null && mObj.score !== undefined) {
          if (!expScores[expCode]) expScores[expCode] = []
          expScores[expCode].push(mObj.score)
        }
      })
    })
  } else {
    // Traditional Mode: Read directly from gradeMap.value (supports assessment scores & qualitative radial entries)
    if (gradeMap.value) {
      Object.entries(gradeMap.value).forEach(([assId, studentMap]) => {
        if (!studentMap) return
        const ass = props.assessments.find(a => String(a.assessmentId) === String(assId))
        const ids = ass ? (ass.expectationIds && Array.isArray(ass.expectationIds) ? ass.expectationIds : (ass.expectationId ? [ass.expectationId] : [])) : []
        const total = ass ? (ass.scaledTotal || ass.totalPoints || 100) : 100

        Object.entries(studentMap).forEach(([studentId, gRecord]) => {
          if (!gRecord || gRecord.excluded || gRecord.missing) return
          if (validStudentIds && !validStudentIds.has(String(gRecord.studentId || studentId))) return

          // 1. Qualitative expectationScores inside grade record (takes precedence)
          let hasPerExpScores = false
          if (gRecord.expectationScores && typeof gRecord.expectationScores === 'object' && Object.keys(gRecord.expectationScores).length > 0) {
            Object.entries(gRecord.expectationScores).forEach(([expCode, val]) => {
              if (val != null && val !== '' && !isNaN(Number(val))) {
                if (!expScores[expCode]) expScores[expCode] = []
                expScores[expCode].push(Number(val))
                hasPerExpScores = true
              }
            })
          }

          // 2. Assessment score mapped to expectationIds (fallback when individual expectationScores not provided)
          if (!hasPerExpScores && ids.length > 0 && gRecord.resolvedScore != null && gRecord.resolvedScore !== '' && !isNaN(Number(gRecord.resolvedScore))) {
            const pct = (Number(gRecord.resolvedScore) / total) * 100
            ids.forEach(id => {
              const sId = String(id)
              if (!expScores[sId]) expScores[sId] = []
              expScores[sId].push(pct)
            })
          }
        })
      })
    }
  }

  return unitsList
    .filter(u => u.expectations && u.expectations.length > 0)
    .map(unit => {
      const expectations = unit.expectations.map(exp => {
        const expId = exp.expectationId ? String(exp.expectationId) : null
        const expCode = exp.code ? String(exp.code) : null

        const countId = expId ? (expAssessmentCounts[expId] || 0) : 0
        const countCode = (expCode && expCode !== expId) ? (expAssessmentCounts[expCode] || 0) : 0
        const count = countId + countCode

        const scores = (expCode && expScores[expCode]) ? expScores[expCode] : ((expId && expScores[expId]) ? expScores[expId] : [])

        const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null
        const sbarBadge = avg !== null ? getSBARLevelBadge(avg) : null

        const distribution = { L4: 0, L3: 0, L2: 0, L1: 0, total: scores.length }
        scores.forEach(s => {
          if (s >= 80) distribution.L4++
          else if (s >= 70) distribution.L3++
          else if (s >= 60) distribution.L2++
          else distribution.L1++
        })

        return {
          ...exp,
          assessmentCount: count,
          average: avg,
          sbarBadge,
          distribution
        }
      })

      const unitAvgs = expectations.map(e => e.average).filter(a => a !== null)
      const unitAvg = unitAvgs.length ? (unitAvgs.reduce((a, b) => a + b, 0) / unitAvgs.length) : null
      const unitSbarBadge = unitAvg !== null ? getSBARLevelBadge(unitAvg) : null

      return {
        ...unit,
        expectations,
        unitAvg,
        unitSbarBadge
      }
    })
})

const totalExpectationsInFilter = computed(() => {
  return unitsWithExpectations.value.reduce((acc, u) => acc + u.expectations.length, 0)
})

const filteredUnitsWithExpectations = computed(() => {
  const units = unitsWithExpectations.value

  if (selectedUnitFilter.value === 'needs_reteaching') {
    return units.map(u => ({
      ...u,
      expectations: u.expectations.filter(e => e.average !== null && e.average < 65)
    })).filter(u => u.expectations.length > 0)
  }

  if (selectedUnitFilter.value !== 'all') {
    return units.filter(u => String(u.unitId) === String(selectedUnitFilter.value))
  }

  return units
})

const strugglingCount = computed(() => {
  let count = 0
  unitsWithExpectations.value.forEach(unit => {
    unit.expectations.forEach(exp => {
      if (exp.average !== null && exp.average < 65) count++
    })
  })
  return count
})

function toggleUnitCollapse(unitId) {
  const s = new Set(collapsedUnits.value)
  if (s.has(unitId)) s.delete(unitId)
  else s.add(unitId)
  collapsedUnits.value = s
}

function expandAllUnits() {
  collapsedUnits.value = new Set()
}

function collapseAllUnits() {
  const s = new Set()
  unitsWithExpectations.value.forEach(u => s.add(u.unitId))
  collapsedUnits.value = s
}

function getHeatColor(avg) {
  if (avg === null || avg === undefined) return 'var(--text-secondary)'
  if (avg >= 80) return '#10b981' // Green (Level 4)
  if (avg >= 70) return '#3b82f6' // Blue (Level 3)
  if (avg >= 60) return '#f59e0b' // Yellow (Level 2)
  return '#ef4444' // Red (Level 1 / failing)
}
</script>

<style scoped>
.expectation-heatmap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.expectation-heatmap__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.expectation-heatmap__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2px 0;
}

.expectation-heatmap__subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.expectation-heatmap__alert-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.expectation-heatmap__alert-chip:hover,
.expectation-heatmap__alert-chip--active {
  background: #ef4444;
  color: #fff;
}

.expectation-heatmap__filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-pill {
  font-size: 0.775rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-pill:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.filter-pill--active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.filter-pill--danger {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.3);
}

.filter-pill--danger.filter-pill--active {
  background: #dc2626;
  color: #fff;
}

.expand-toggles {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.775rem;
  color: var(--text-secondary);
}

.btn-toggle-all {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 4px;
}

.btn-toggle-all:hover {
  text-decoration: underline;
}

.btn-reset-filter {
  margin-top: 10px;
  padding: 6px 14px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.expectation-heatmap__empty {
  text-align: center;
  padding: 32px 16px;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
}

.expectation-heatmap__empty-icon {
  margin-bottom: 8px;
  opacity: 0.5;
}

.expectation-heatmap__empty-text {
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0 0 4px 0;
}

.expectation-heatmap__empty-sub {
  font-size: 0.8rem;
  margin: 0;
}

.expectation-heatmap__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.expectation-heatmap__unit-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.expectation-heatmap__unit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--surface);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.expectation-heatmap__unit-header:hover {
  background: var(--bg-secondary);
}

.unit-header-left, .unit-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.expectation-heatmap__unit-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text);
}

.unit-mastery-badge {
  font-size: 0.725rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
}

.expectation-heatmap__unit-badge {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 2px 8px;
  border-radius: 12px;
}

.chevron-icon {
  color: var(--text-secondary);
}

.expectation-heatmap__grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px 16px;
  border-top: 1px solid var(--border);
}

.expectation-heatmap__row {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) 110px 140px 70px;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 0.825rem;
}

.expectation-heatmap__code-col {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.expectation-heatmap__code {
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.775rem;
  flex-shrink: 0;
}

.expectation-heatmap__desc {
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expectation-heatmap__stat-col {
  text-align: left;
}

.expectation-heatmap__count-tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.expectation-heatmap__stacked-track {
  height: 8px;
  width: 100%;
  max-width: 140px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}

.expectation-heatmap__empty-track {
  height: 8px;
  width: 100%;
  max-width: 140px;
  background: var(--bg-secondary);
  border-radius: 4px;
  opacity: 0.4;
}

.expectation-heatmap__stacked-seg {
  height: 100%;
  transition: width 0.3s ease;
}

.seg--l4 { background: #10b981; } /* Green */
.seg--l3 { background: #3b82f6; } /* Blue */
.seg--l2 { background: #f59e0b; } /* Yellow */
.seg--l1 { background: #ef4444; } /* Red */

.expectation-heatmap__score-col {
  text-align: right;
  font-weight: 700;
  font-size: 0.875rem;
}

.sbar-level-pill {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 4px;
  color: #fff;
  display: inline-block;
}
</style>
