<template>
  <div class="sbar-detail-view">
    <!-- Compact Header Bar (120px height) -->
    <header class="sbar-detail-header">
      <div class="sbar-header-top-row">
        <div class="sbar-header-left">
          <button class="app-back-btn" @click="$emit('close')">
            <ArrowLeft :size="15" /> {{ returnTabMode === 'dossier' ? 'Back to Student Dossier' : 'Back to Grid' }}
          </button>
          <h2 class="sbar-detail-title">{{ currentAssessment.name }}</h2>
          <div class="sbar-header-tags">
            <span 
              class="sbar-tag" 
              :class="(currentAssessment.isFormative || currentAssessment.purpose === 'formative') ? 'sbar-tag--formative' : 'sbar-tag--summative'"
            >
              {{ (currentAssessment.isFormative || currentAssessment.purpose === 'formative') ? 'FORMATIVE' : 'SUMMATIVE' }}
            </span>
            <span class="sbar-tag sbar-tag--type">SBAR TASK</span>
            <span class="sbar-tag sbar-tag--date" v-if="currentAssessment.date">{{ currentAssessment.date }}</span>
          </div>
        </div>

        <div class="sbar-header-actions">
          <button class="sbar-btn sbar-btn--secondary" @click="$emit('start-edit', currentAssessment)">
            <Edit2 :size="14" /> Edit Setup
          </button>
          <button class="sbar-btn sbar-btn--danger" @click="$emit('confirm-delete', currentAssessment)">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <!-- Metrics Strip -->
      <div class="sbar-metrics-strip">
        <div class="sbar-metric-item">
          <span class="sbar-metric-label">TAGGED STANDARDS:</span>
          <span class="sbar-metric-value">{{ taggedExpectations.length }} Expectations</span>
        </div>
        <div class="sbar-metric-item">
          <span class="sbar-metric-label">EVALUATED:</span>
          <span class="sbar-metric-value">{{ evaluatedCount }} / {{ displayedRoster.length }} Students</span>
          <span v-if="fullyGradedCount > 0 && taggedExpectations.length > 1" class="sbar-metric-sub">
            ({{ fullyGradedCount }} complete)
          </span>
        </div>
        <div class="sbar-metric-item" v-if="focusedStudentId">
          <span class="sbar-metric-label">VIEW MODE:</span>
          <div class="sbar-mode-toggle">
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': isSingleStudentMode }"
              @click="isSingleStudentMode = true"
            >Focused Student</button>
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': !isSingleStudentMode }"
              @click="isSingleStudentMode = false"
            >All Class</button>
          </div>
        </div>
        <div class="sbar-metric-item">
          <span class="sbar-metric-label">INPUT MODE:</span>
          <div class="sbar-mode-toggle">
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': inputMode === 'grid' }"
              @click="inputMode = 'grid'"
              title="Fast keyboard spreadsheet mode with auto-advance"
            >
              <Keyboard :size="12" style="margin-right: 4px; vertical-align: middle;" /> ⌨ Grid (Fast)
            </button>
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': inputMode === 'fine' }"
              @click="inputMode = 'fine'"
            >L1- to L4+</button>
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': inputMode === 'simple' }"
              @click="inputMode = 'simple'"
            >L1–L4</button>
            <button 
              class="mode-btn" 
              :class="{ 'mode-btn--active': inputMode === 'numeric' }"
              @click="inputMode = 'numeric'"
            >Exact %</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Inline Multi-Rubric Batch Matrix Table -->
    <div class="sbar-matrix-container">
      <table class="sbar-matrix-table">
        <thead>
          <tr>
            <th class="sticky-col sticky-col--name">STUDENT</th>
            <th 
              v-for="(exp, eIdx) in taggedExpectations" 
              :key="exp.code"
              class="matrix-exp-header"
            >
              <div class="exp-header-inner">
                <div class="exp-header-text">
                  <div class="exp-code-row">
                    <span class="exp-code">{{ exp.code }}</span>
                    <span 
                      class="exp-progress-badge"
                      :class="{ 
                        'exp-progress-badge--complete': getExpProgress(exp.code).count === getExpProgress(exp.code).total && getExpProgress(exp.code).total > 0,
                        'exp-progress-badge--partial': getExpProgress(exp.code).count > 0 && getExpProgress(exp.code).count < getExpProgress(exp.code).total
                      }"
                      :title="`${getExpProgress(exp.code).count} of ${getExpProgress(exp.code).total} students evaluated for ${exp.code}`"
                    >
                      {{ getExpProgress(exp.code).count }}/{{ getExpProgress(exp.code).total }}
                    </span>
                  </div>
                  <div class="exp-name">{{ exp.name }}</div>
                </div>

                <!-- ⚡ Bulk Fill Popover Trigger -->
                <div class="bulk-fill-wrapper">
                  <button 
                    class="bulk-fill-trigger-btn"
                    :class="{ 'bulk-fill-trigger-btn--active': activeBulkExp === exp.code }"
                    title="Bulk set level for all students"
                    @click.stop="toggleBulkMenu(exp.code)"
                  >
                    <Zap :size="11" /> Bulk
                  </button>

                  <!-- Bulk Action Dropdown Menu -->
                  <div v-if="activeBulkExp === exp.code" class="bulk-fill-menu" @click.stop>
                    <div class="bulk-fill-title">
                      <span><Zap :size="12" style="display: inline-block; vertical-align: -1px; margin-right: 2px;" /> Bulk Fill: <strong>{{ exp.code }}</strong></span>
                      <button class="bulk-close-btn" @click="activeBulkExp = null">&times;</button>
                    </div>

                    <div class="bulk-fill-body">
                      <label class="bulk-fill-label">Select level to apply to class:</label>
                      <div class="bulk-pill-grid">
                        <button 
                          v-for="lvl in fineLevels" 
                          :key="lvl.code"
                          class="bulk-level-pill"
                          :style="{ background: lvl.color, color: 'white' }"
                          @click="applyBulkFill(exp.code, lvl.pct)"
                        >
                          {{ lvl.label }}
                        </button>
                      </div>

                      <div class="bulk-fill-check-row">
                        <label class="bulk-fill-checkbox-label">
                          <input type="checkbox" v-model="bulkOnlyUnset" />
                          Only fill unassigned students
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(student, sIdx) in displayedRoster" :key="student.studentId" class="matrix-row">
            <td class="sticky-col sticky-col--name student-name-cell" @click="$emit('show-dossier', student.studentId)">
              <span class="student-name">{{ student.lastName }}, {{ student.firstName }}</span>
            </td>

            <!-- Level Selector Pills or Numeric Input per Expectation -->
            <td 
              v-for="(exp, eIdx) in taggedExpectations" 
              :key="exp.code" 
              class="rubric-pill-cell"
              @contextmenu.prevent="openContextMenu($event, student.studentId, exp.code)"
            >
              <!-- Method 1: Spreadsheet Keyboard Grid Input Mode -->
              <div v-if="inputMode === 'grid'" class="grid-cell-wrapper">
                <input 
                  :id="`grid-cell-${sIdx}-${eIdx}`"
                  type="text"
                  class="sbar-grid-input"
                  :class="{ 'sbar-grid-input--has-value': getStudentPercentage(student.studentId, exp.code) != null }"
                  :value="getGridDisplayValue(student.studentId, exp.code, sIdx, eIdx)"
                  placeholder="3+, 4, 2-"
                  @focus="handleGridFocus($event)"
                  @keydown="handleGridKeydown($event, student.studentId, exp.code, sIdx, eIdx)"
                  @blur="handleGridBlur($event, student.studentId, exp.code)"
                />
                <span 
                  v-if="getStudentPercentage(student.studentId, exp.code) != null" 
                  class="grid-cell-badge" 
                  :style="{ background: getStudentLevelBadge(student.studentId, exp.code).color }"
                >
                  {{ getStudentLevelBadge(student.studentId, exp.code).level }}
                </span>
              </div>

              <!-- Exact Numeric Input Mode -->
              <div v-else-if="inputMode === 'numeric'" class="numeric-input-wrapper">
                <input 
                  :id="`numeric-cell-${sIdx}-${eIdx}`"
                  type="text"
                  inputmode="decimal"
                  class="sbar-numeric-input"
                  :value="getStudentPercentage(student.studentId, exp.code)"
                  placeholder="%"
                  @focus="handleGridFocus($event)"
                  @keydown="handleNumericKeydown($event, student.studentId, exp.code, sIdx, eIdx)"
                  @blur="handleNumericBlur($event, student.studentId, exp.code)"
                />
                <span v-if="getStudentPercentage(student.studentId, exp.code) != null" class="numeric-level-badge">
                  {{ getStudentLevelBadge(student.studentId, exp.code).level }}
                </span>
              </div>

              <!-- Granular Levels Mode (1-Click Compact Pills) -->
              <div v-else-if="inputMode === 'fine'" class="level-pill-group level-pill-group--fine">
                <button 
                  v-for="lvl in fineLevels" 
                  :key="lvl.code"
                  class="level-select-pill level-select-pill--fine"
                  :class="{ 
                    'level-select-pill--active': getStudentLevelCode(student.studentId, exp.code) === lvl.code
                  }"
                  :style="getStudentLevelCode(student.studentId, exp.code) === lvl.code ? { background: lvl.color, color: 'white', borderColor: lvl.color } : {}"
                  :title="lvl.code + ' (' + lvl.pct + '%)'"
                  @click="assignLevel(student.studentId, exp.code, lvl.pct)"
                >
                  {{ lvl.label }}
                </button>
              </div>

              <!-- Simple Level Pills Mode (L1-L4) -->
              <div v-else class="level-pill-group">
                <button 
                  v-for="lvl in simpleLevels" 
                  :key="lvl.code"
                  class="level-select-pill"
                  :class="{ 
                    'level-select-pill--active': getStudentLevelCode(student.studentId, exp.code) === lvl.code
                  }"
                  :style="getStudentLevelCode(student.studentId, exp.code) === lvl.code ? { background: lvl.color, color: 'white', borderColor: lvl.color } : {}"
                  @click="assignLevel(student.studentId, exp.code, lvl.pct)"
                >
                  {{ lvl.code }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Floating Right-Click Context Menu for Cell Actions -->
    <div 
      v-if="contextMenu.visible" 
      class="grades__context-backdrop" 
      @click="contextMenu.visible = false"
      @contextmenu.prevent="contextMenu.visible = false"
    >
      <div 
        class="grades__context-menu sbar-context-menu" 
        :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
        @click.stop
      >
        <div class="sbar-context-header">
          <strong class="sbar-context-name">{{ contextMenu.studentName }}</strong>
          <span class="sbar-context-code">{{ contextMenu.expCode }}</span>
        </div>

        <button class="grades__context-btn grades__context-btn--danger" @click="contextMenuClearGrade">
          <Trash2 :size="14" /> Clear Grade
        </button>

        <div class="sbar-context-divider"></div>

        <div class="sbar-context-label">Set Level:</div>
        <div class="sbar-context-level-grid">
          <button 
            v-for="lvl in fineLevels" 
            :key="lvl.code" 
            class="sbar-context-level-pill"
            :style="{ background: lvl.color, color: 'white' }"
            @click="contextMenuSelectLevel(lvl.pct)"
          >
            {{ lvl.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, Edit2, Trash2, Zap, Keyboard } from 'lucide-vue-next'
import { enterGradeSBAR, gradeMap, activeClassRecord } from '../../composables/useGradebook.js'
import { getSBARLevelBadge } from '../../db/gradebookService.js'
import { getEffectiveClassRecord, getUnitGradeLevel } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'

const props = defineProps({
  currentAssessment: { type: Object, required: true },
  sortedRoster: { type: Array, default: () => [] },
  focusedStudentId: { type: String, default: null },
  returnTabMode: { type: String, default: 'grid' }
})

const emit = defineEmits(['close', 'start-edit', 'confirm-delete', 'show-dossier'])

const isSingleStudentMode = ref(Boolean(props.focusedStudentId))

watch(() => props.focusedStudentId, (newVal) => {
  isSingleStudentMode.value = Boolean(newVal)
}, { immediate: true })

const effectiveClass = computed(() => {
  if (!activeClassRecord.value) return null
  if (activeClassRecord.value.classType === 'elementary') {
    return getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
  }
  return activeClassRecord.value
})

const displayedRoster = computed(() => {
  let roster = props.sortedRoster
  if (isSingleStudentMode.value && props.focusedStudentId) {
    const found = roster.filter(s => String(s.studentId) === String(props.focusedStudentId))
    if (found.length > 0) return found
  }

  const cls = effectiveClass.value
  const astGrade = props.currentAssessment.gradeLevel
  const taggedGrades = new Set()

  if (props.currentAssessment.unitId && cls?.gradebookUnits) {
    const u = cls.gradebookUnits.find(unit => String(unit.unitId) === String(props.currentAssessment.unitId))
    if (u) {
      const g = getUnitGradeLevel(u)
      if (g) taggedGrades.add(g.toLowerCase())
    }
  }

  const expCodes = props.currentAssessment.expectationIds || (props.currentAssessment.expectationId ? [props.currentAssessment.expectationId] : [])
  if (cls?.gradebookUnits) {
    cls.gradebookUnits.forEach(u => {
      const uGrade = getUnitGradeLevel(u)
      ;(u.expectations || []).forEach(e => {
        if (expCodes.includes(e.code) || expCodes.includes(e.expectationId)) {
          const g = e.gradeLevel || uGrade
          if (g) taggedGrades.add(g.toLowerCase())
        }
      })
    })
  }

  const targetGrade = astGrade ? astGrade.toLowerCase() : (taggedGrades.size === 1 ? Array.from(taggedGrades)[0] : null)

  if (targetGrade) {
    const filtered = roster.filter(s => s.gradeLevel && s.gradeLevel.toLowerCase() === targetGrade)
    if (filtered.length > 0) return filtered
  }

  return roster
})

const inputMode = ref(activeClassRecord.value?.sbarInputMode || 'grid') // 'grid' | 'fine' | 'simple' | 'numeric'

const simpleLevels = [
  { code: 'L1', pct: 55, color: '#ef4444' },
  { code: 'L2', pct: 65, color: '#f59e0b' },
  { code: 'L3', pct: 75, color: '#3b82f6' },
  { code: 'L4', pct: 88, color: '#22c55e' }
]

const fineLevels = [
  { code: 'R',   label: 'R',   pct: 45, color: '#991b1b' },
  { code: 'L1-', label: '1-',  pct: 51, color: '#f87171' },
  { code: 'L1',  label: '1',   pct: 55, color: '#ef4444' },
  { code: 'L1+', label: '1+',  pct: 58, color: '#dc2626' },
  { code: 'L2-', label: '2-',  pct: 61, color: '#fbbf24' },
  { code: 'L2',  label: '2',   pct: 65, color: '#f59e0b' },
  { code: 'L2+', label: '2+',  pct: 68, color: '#d97706' },
  { code: 'L3-', label: '3-',  pct: 71, color: '#60a5fa' },
  { code: 'L3',  label: '3',   pct: 75, color: '#3b82f6' },
  { code: 'L3+', label: '3+',  pct: 78, color: '#2563eb' },
  { code: 'L4-', label: '4-',  pct: 82, color: '#4ade80' },
  { code: 'L4',  label: '4',   pct: 88, color: '#22c55e' },
  { code: 'L4+', label: '4+',  pct: 96, color: '#16a34a' }
]

const activeLevelOptions = computed(() => {
  return inputMode.value === 'simple' ? simpleLevels : fineLevels
})

const taggedExpectations = computed(() => {
  const ids = props.currentAssessment.expectationIds || (props.currentAssessment.expectationId ? [props.currentAssessment.expectationId] : [])
  if (ids.length === 0) {
    return [{ 
      id: 'general',
      code: props.currentAssessment.name || 'General', 
      name: props.currentAssessment.description || 'General Inquiry & Assessment' 
    }]
  }

  const allClassExps = (effectiveClass.value?.gradebookUnits || [])
    .flatMap(u => (u.expectations || []).map(e => ({ ...e, unitName: u.name })))
    .concat(effectiveClass.value?.expectations || [])

  return ids.map(idOrCode => {
    const s = String(idOrCode)
    const found = allClassExps.find(e => 
      (e.expectationId && String(e.expectationId) === s) || 
      (e.code && String(e.code).toLowerCase() === s.toLowerCase())
    )
    if (found) {
      return {
        id: found.expectationId || s,
        code: found.code || s,
        name: found.description || found.code || `Expectation ${s}`
      }
    }
    return {
      id: s,
      code: s,
      name: `Expectation ${s}`
    }
  })
})

const evaluatedCount = computed(() => {
  if (!props.currentAssessment?.assessmentId || !displayedRoster.value) return 0
  const astId = props.currentAssessment.assessmentId
  const astGrades = gradeMap.value[astId] || gradeMap.value[Number(astId)] || gradeMap.value[String(astId)] || {}
  const targetIds = new Set(displayedRoster.value.map(s => String(s.studentId)))

  return Object.entries(astGrades).filter(([sId, g]) => {
    return targetIds.has(String(sId)) && g && (
      (g.expectationScores && Object.keys(g.expectationScores).length > 0) || 
      g.masteryLevel != null || 
      g.resolvedScore != null ||
      g.missing ||
      g.excluded
    )
  }).length
})

const fullyGradedCount = computed(() => {
  if (!props.currentAssessment?.assessmentId || !displayedRoster.value) return 0
  const astId = props.currentAssessment.assessmentId
  const astGrades = gradeMap.value[astId] || gradeMap.value[Number(astId)] || gradeMap.value[String(astId)] || {}
  const expCodes = taggedExpectations.value.map(e => e.code)
  if (expCodes.length === 0) return 0
  const targetIds = new Set(displayedRoster.value.map(s => String(s.studentId)))

  return Object.entries(astGrades).filter(([sId, g]) => {
    if (!targetIds.has(String(sId)) || !g) return false
    if (g.missing || g.excluded) return true
    return expCodes.every(code => {
      if (!g.expectationScores) return false
      if (g.expectationScores[code] != null) return true
      const expObj = taggedExpectations.value.find(e => e.code === code)
      return expObj && expObj.id && g.expectationScores[expObj.id] != null
    })
  }).length
})

function getExpProgress(expCode) {
  if (!props.currentAssessment?.assessmentId || !displayedRoster.value) return { count: 0, total: 0 }
  const astId = props.currentAssessment.assessmentId
  const astGrades = gradeMap.value[astId] || gradeMap.value[Number(astId)] || gradeMap.value[String(astId)] || {}
  const targetIds = new Set(displayedRoster.value.map(s => String(s.studentId)))
  const total = displayedRoster.value.length

  const count = Object.entries(astGrades).filter(([sId, g]) => {
    return targetIds.has(String(sId)) && g && (
      (g.expectationScores && (g.expectationScores[expCode] != null || (taggedExpectations.value.find(e => e.code === expCode)?.id && g.expectationScores[taggedExpectations.value.find(e => e.code === expCode).id] != null))) ||
      g.missing ||
      g.excluded
    )
  }).length

  return { count, total }
}

function getStudentPercentage(studentId, expCode) {
  const astId = props.currentAssessment?.assessmentId
  if (!astId) return null
  const astGrades = gradeMap.value[astId] || gradeMap.value[Number(astId)] || gradeMap.value[String(astId)]
  const g = astGrades?.[studentId]
  if (!g) return null
  if (g.expectationScores && typeof g.expectationScores === 'object') {
    if (g.expectationScores[expCode] != null) {
      return Number(g.expectationScores[expCode])
    }
    const expObj = taggedExpectations.value.find(e => e.code === expCode || e.id === expCode)
    if (expObj) {
      if (expObj.id && g.expectationScores[expObj.id] != null) {
        return Number(g.expectationScores[expObj.id])
      }
      if (expObj.code && g.expectationScores[expObj.code] != null) {
        return Number(g.expectationScores[expObj.code])
      }
    }
    return null
  }
  if (g.masteryLevel != null) return Number(g.masteryLevel)
  if (g.resolvedScore != null) return Number(g.resolvedScore)
  return null
}

function getStudentLevelBadge(studentId, expCode) {
  const pct = getStudentPercentage(studentId, expCode)
  return getSBARLevelBadge(pct)
}

function getStudentLevelCode(studentId, expCode) {
  const badge = getStudentLevelBadge(studentId, expCode)
  if (badge.level === '—') return null
  if (inputMode.value === 'simple') {
    if (badge.level.startsWith('L4')) return 'L4'
    if (badge.level.startsWith('L3')) return 'L3'
    if (badge.level.startsWith('L2')) return 'L2'
    if (badge.level.startsWith('L1')) return 'L1'
  }
  return badge.level
}

async function assignLevel(studentId, expCode, percentage) {
  await enterGradeSBAR(props.currentAssessment.assessmentId, studentId, expCode, percentage)
}

async function assignLevelByCode(studentId, expCode, code) {
  const item = fineLevels.find(l => l.code === code)
  if (item) {
    await assignLevel(studentId, expCode, item.pct)
  }
}

async function assignNumericPercentage(studentId, expCode, val) {
  const num = parseFloat(val)
  if (isNaN(num)) return
  await enterGradeSBAR(props.currentAssessment.assessmentId, studentId, expCode, Math.max(0, Math.min(100, num)))
}

/* ==========================================================================
   Method 1: Spreadsheet Keyboard Grid Entry & Auto-Advance Logic
   ========================================================================== */
const gridInputDrafts = ref({}) // key: `${studentId}-${expCode}` -> text draft

function getGridDisplayValue(studentId, expCode, sIdx, eIdx) {
  const key = `${studentId}-${expCode}`
  if (gridInputDrafts.value[key] !== undefined) {
    return gridInputDrafts.value[key]
  }
  const badge = getStudentLevelBadge(studentId, expCode)
  if (badge.level !== '—') return badge.level
  const pct = getStudentPercentage(studentId, expCode)
  if (pct != null) return `${pct}%`
  return ''
}

function parseLevelInput(str) {
  if (str == null || str === '') return null
  const clean = String(str).trim().toUpperCase()

  // Level Code Map only — Grid mode does not accept raw percentages
  const levelLookup = {
    'R': 45, '0': 45,
    '1-': 51, 'L1-': 51, '-1': 51,
    '1': 55, 'L1': 55,
    '1+': 58, 'L1+': 58, '+1': 58,
    '2-': 61, 'L2-': 61, '-2': 61,
    '2': 65, 'L2': 65,
    '2+': 68, 'L2+': 68, '+2': 68,
    '3-': 71, 'L3-': 71, '-3': 71,
    '3': 75, 'L3': 75,
    '3+': 78, 'L3+': 78, '+3': 78,
    '4-': 82, 'L4-': 82, '-4': 82,
    '4': 88, 'L4': 88,
    '4+': 96, 'L4+': 96, '+4': 96
  }

  if (levelLookup[clean] !== undefined) {
    const pct = levelLookup[clean]
    return { pct, levelCode: getSBARLevelBadge(pct).level }
  }

  return null
}

function handleGridFocus(event) {
  event.target.select()
}

async function processGridSubmit(studentId, expCode, val) {
  const key = `${studentId}-${expCode}`
  delete gridInputDrafts.value[key]

  // Empty input = clear grade for this expectation
  if (val == null || String(val).trim() === '') {
    const existing = getStudentPercentage(studentId, expCode)
    if (existing != null) {
      await enterGradeSBAR(props.currentAssessment.assessmentId, studentId, expCode, null)
    }
    return
  }
  const parsed = parseLevelInput(val)
  if (parsed) {
    await assignLevel(studentId, expCode, parsed.pct)
  }
}

async function handleGridBlur(event, studentId, expCode) {
  await processGridSubmit(studentId, expCode, event.target.value)
}

async function handleGridKeydown(event, studentId, expCode, sIdx, eIdx) {
  gridInputDrafts.value[`${studentId}-${expCode}`] = event.target.value

  const totalRows = displayedRoster.value.length
  const totalCols = taggedExpectations.value.length

  if (event.key === 'Enter' || event.key === 'ArrowDown') {
    event.preventDefault()
    await processGridSubmit(studentId, expCode, event.target.value)
    const nextSIdx = event.shiftKey ? sIdx - 1 : sIdx + 1
    if (nextSIdx >= 0 && nextSIdx < totalRows) {
      focusGridCell(nextSIdx, eIdx)
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    await processGridSubmit(studentId, expCode, event.target.value)
    if (sIdx - 1 >= 0) {
      focusGridCell(sIdx - 1, eIdx)
    }
  } else if (event.key === 'Tab') {
    event.preventDefault()
    await processGridSubmit(studentId, expCode, event.target.value)
    if (event.shiftKey) {
      if (eIdx - 1 >= 0) {
        focusGridCell(sIdx, eIdx - 1)
      } else if (sIdx - 1 >= 0) {
        focusGridCell(sIdx - 1, totalCols - 1)
      }
    } else {
      if (eIdx + 1 < totalCols) {
        focusGridCell(sIdx, eIdx + 1)
      } else if (sIdx + 1 < totalRows) {
        focusGridCell(sIdx + 1, 0)
      }
    }
  }
}

function focusCell(sIdx, eIdx) {
  setTimeout(() => {
    const prefix = inputMode.value === 'numeric' ? 'numeric-cell' : 'grid-cell'
    const el = document.getElementById(`${prefix}-${sIdx}-${eIdx}`)
    if (el) {
      el.focus()
      el.select()
    }
  }, 10)
}

// Keep old name as alias for any internal callers
function focusGridCell(sIdx, eIdx) {
  focusCell(sIdx, eIdx)
}

/* ==========================================================================
   Exact % Numeric Mode Keyboard Navigation
   ========================================================================== */
async function handleNumericBlur(event, studentId, expCode) {
  await assignNumericPercentage(studentId, expCode, event.target.value)
}

async function handleNumericKeydown(event, studentId, expCode, sIdx, eIdx) {
  const totalRows = displayedRoster.value.length
  const totalCols = taggedExpectations.value.length

  if (event.key === 'Enter' || event.key === 'ArrowDown') {
    event.preventDefault()
    await assignNumericPercentage(studentId, expCode, event.target.value)
    const nextSIdx = event.shiftKey ? sIdx - 1 : sIdx + 1
    if (nextSIdx >= 0 && nextSIdx < totalRows) {
      focusCell(nextSIdx, eIdx)
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    await assignNumericPercentage(studentId, expCode, event.target.value)
    if (sIdx - 1 >= 0) {
      focusCell(sIdx - 1, eIdx)
    }
  } else if (event.key === 'Tab') {
    event.preventDefault()
    await assignNumericPercentage(studentId, expCode, event.target.value)
    if (event.shiftKey) {
      if (eIdx - 1 >= 0) {
        focusCell(sIdx, eIdx - 1)
      } else if (sIdx - 1 >= 0) {
        focusCell(sIdx - 1, totalCols - 1)
      }
    } else {
      if (eIdx + 1 < totalCols) {
        focusCell(sIdx, eIdx + 1)
      } else if (sIdx + 1 < totalRows) {
        focusCell(sIdx + 1, 0)
      }
    }
  }
}

/* ==========================================================================
   Method 2: Expectation Column Bulk Fill Logic
   ========================================================================== */
const activeBulkExp = ref(null)
const bulkOnlyUnset = ref(false)

function toggleBulkMenu(expCode) {
  activeBulkExp.value = activeBulkExp.value === expCode ? null : expCode
}

async function applyBulkFill(expCode, pct) {
  for (const student of displayedRoster.value) {
    if (bulkOnlyUnset.value) {
      const existing = getStudentPercentage(student.studentId, expCode)
      if (existing != null) continue
    }
    await enterGradeSBAR(props.currentAssessment.assessmentId, student.studentId, expCode, pct)
  }
  activeBulkExp.value = null
}

function handleGlobalClick() {
  activeBulkExp.value = null
  contextMenu.value.visible = false
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})

/* ==========================================================================
   Right-Click Context Menu for Clear Grade / Quick Level Set
   ========================================================================== */
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  studentId: null,
  expCode: null,
  studentName: ''
})

function openContextMenu(event, studentId, expCode) {
  const student = displayedRoster.value.find(s => String(s.studentId) === String(studentId))
  const name = student ? `${student.lastName}, ${student.firstName}` : studentId
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    studentId,
    expCode,
    studentName: name
  }
}

async function contextMenuClearGrade() {
  const { studentId, expCode } = contextMenu.value
  if (studentId && expCode) {
    await enterGradeSBAR(props.currentAssessment.assessmentId, studentId, expCode, null)
  }
  contextMenu.value.visible = false
}

async function contextMenuSelectLevel(pct) {
  const { studentId, expCode } = contextMenu.value
  if (studentId && expCode) {
    await assignLevel(studentId, expCode, pct)
  }
  contextMenu.value.visible = false
}
</script>

<style scoped>
.sbar-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.sbar-detail-header {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sbar-header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sbar-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sbar-back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.sbar-back-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.sbar-detail-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.sbar-header-tags {
  display: flex;
  gap: 6px;
}

.sbar-tag {
  font-size: 0.725rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.sbar-tag--type {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.sbar-tag--date {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.sbar-header-actions {
  display: flex;
  gap: 8px;
}

.sbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sbar-btn--secondary {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.sbar-btn--danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.sbar-metrics-strip {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.sbar-metric-item {
  font-size: 0.775rem;
}

.sbar-metric-label {
  color: var(--text-secondary);
  font-weight: 700;
  margin-right: 6px;
}

.sbar-metric-value {
  font-weight: 700;
  color: var(--text);
}

.sbar-metric-value--highlight {
  color: var(--primary);
}

.sbar-metric-sub {
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-left: 4px;
}

.sbar-matrix-container {
  flex: 1;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.sbar-matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.sbar-matrix-table th {
  background: var(--bg-secondary);
  padding: 10px 14px;
  border-bottom: 2px solid var(--border);
  border-right: 1px solid var(--border);
  text-align: left;
}

.sticky-col--name {
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--surface);
  min-width: 200px;
  border-right: 2px solid var(--border) !important;
}

.matrix-exp-header {
  min-width: 220px;
}

.exp-code-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exp-code {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
}

.exp-progress-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  line-height: 1.2;
}

.exp-progress-badge--complete {
  background: rgba(22, 163, 74, 0.15);
  color: #16a34a;
  border-color: rgba(22, 163, 74, 0.35);
}

.exp-progress-badge--partial {
  background: rgba(217, 119, 6, 0.15);
  color: #d97706;
  border-color: rgba(217, 119, 6, 0.35);
}

.exp-header-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: normal;
}

.matrix-row td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.student-name-cell {
  cursor: pointer;
  font-weight: 600;
}

.level-pill-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.level-select-pill {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.level-select-pill:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.level-select-pill--active {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px currentColor;
}

.level-select-pill--l4 {
  background: #22c55e !important;
  color: white !important;
  border-color: #16a34a !important;
}

.level-select-pill--l3 {
  background: #3b82f6 !important;
  color: white !important;
  border-color: #2563eb !important;
}

.level-select-pill--l2 {
  background: #f59e0b !important;
  color: white !important;
  border-color: #d97706 !important;
}

.level-select-pill--l1 {
  background: #ef4444 !important;
  color: white !important;
  border-color: #dc2626 !important;
}

.sbar-mode-toggle {
  display: inline-flex;
  background: var(--bg-secondary);
  padding: 2px;
  border-radius: var(--radius-sm);
  gap: 2px;
  border: 1px solid var(--border);
}

.mode-btn {
  padding: 3px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.725rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  color: var(--text);
}

.mode-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.level-pill-group--fine {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 3px 4px;
}

.level-select-pill--fine {
  padding: 4px 6px;
  font-size: 0.725rem;
  font-weight: 700;
  min-width: 28px;
  border-radius: 4px;
}

.numeric-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.sbar-numeric-input {
  width: 70px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text);
  font-weight: 700;
  font-size: 0.85rem;
  text-align: center;
}

.numeric-level-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
}

.sbar-fine-select {
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  width: 130px;
  text-align: center;
}

.sbar-tag--formative {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.35);
  font-weight: 700;
}

.sbar-tag--summative {
  background: rgba(22, 163, 74, 0.15);
  color: #16a34a;
  border: 1px solid rgba(22, 163, 74, 0.35);
  font-weight: 700;
}

/* ==========================================================================
   Header Bulk Fill & Spreadsheet Keyboard Grid Input Styles
   ========================================================================== */
.exp-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.exp-header-text {
  flex: 1;
}

.bulk-fill-wrapper {
  position: relative;
}

.bulk-fill-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.bulk-fill-trigger-btn:hover,
.bulk-fill-trigger-btn--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.bulk-fill-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  z-index: 50;
  width: 240px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bulk-fill-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
}

.bulk-close-btn {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--text-secondary);
  cursor: pointer;
}

.bulk-close-btn:hover {
  color: var(--text);
}

.bulk-fill-label {
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 6px;
}

.bulk-pill-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.bulk-level-pill {
  padding: 5px;
  border-radius: 4px;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.bulk-level-pill:hover {
  transform: scale(1.05);
}

.bulk-fill-check-row {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed var(--border);
}

.bulk-fill-checkbox-label {
  font-size: 0.725rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

/* Method 1: Spreadsheet Keyboard Cell Input */
.grid-cell-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
}

.sbar-grid-input {
  width: 90px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text);
  font-weight: 700;
  font-size: 0.85rem;
  text-align: center;
  transition: all 0.2s ease;
}

.sbar-grid-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.sbar-grid-input--has-value {
  border-color: var(--primary);
}

.grid-cell-badge {
  font-size: 0.725rem;
  font-weight: 700;
  color: white;
  padding: 3px 7px;
  border-radius: 4px;
  min-width: 28px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Right-Click Context Menu (App Design System Standard) */
.grades__context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: rgba(0, 0, 0, 0.08);
}

.sbar-context-menu {
  position: fixed;
  z-index: 2501;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg, 0 10px 30px rgba(0, 0, 0, 0.15));
  padding: 6px;
  min-width: 210px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sbar-context-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.sbar-context-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
}

.sbar-context-code {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.grades__context-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.grades__context-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.grades__context-btn--danger {
  color: #ef4444;
}

.grades__context-btn--danger:hover {
  color: #dc2626 !important;
  background: rgba(239, 68, 68, 0.1) !important;
}

.sbar-context-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.sbar-context-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 2px 8px 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sbar-context-level-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 0 4px 4px;
}

.sbar-context-level-pill {
  padding: 5px;
  border-radius: 4px;
  border: none;
  font-size: 0.725rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.sbar-context-level-pill:hover {
  transform: scale(1.06);
  opacity: 0.9;
}
</style>
