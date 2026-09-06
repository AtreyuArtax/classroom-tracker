<template>
  <div class="sbar-expectation-mastery">
    <div class="sbar-mastery-header">
      <div class="sbar-mastery-title-group">
        <h3 class="sbar-mastery-title">
          <Target :size="18" /> CURRICULUM EXPECTATION MASTERY
        </h3>
        <p class="sbar-mastery-subtitle">
          Individual mastery standards evaluated across SBAR assessments
        </p>
      </div>
      <div class="sbar-mastery-badge-count" v-if="expectationList.length > 0">
        {{ expectationList.length }} Evaluated Expectation{{ expectationList.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="expectationList.length === 0" class="sbar-mastery-empty">
      <AlertCircle :size="24" />
      <span>No curriculum expectations evaluated yet for this student.</span>
    </div>

    <!-- Content Area -->
    <div v-else>
      <!-- Search & Filter Controls -->
      <div v-if="expectationList.length > 3" class="sbar-mastery-controls">
        <div class="sbar-search-box">
          <Search :size="14" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search expectation or code..." 
            class="sbar-search-input"
          />
        </div>
        <div v-if="availableUnits.length > 1" class="sbar-strand-filter">
          <Filter :size="13" class="filter-icon" />
          <select v-model="selectedUnit" class="sbar-strand-select">
            <option value="ALL">All Units</option>
            <option v-for="u in availableUnits" :key="u.unitId" :value="u.unitId">
              {{ u.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- No Filter Results Empty State -->
      <div v-if="visibleExpectations.length === 0" class="sbar-mastery-no-results">
        No expectations matching search or filter criteria
      </div>

      <!-- Expectations Table Wrapper -->
      <div v-else class="sbar-mastery-table-wrapper">
        <table class="sbar-mastery-table">
          <thead>
            <tr>
              <th class="th-code">EXPECTATION</th>
              <th class="th-level">MASTERY LEVEL</th>
              <th class="th-trend">TREND</th>
              <th class="th-evals">EVALUATED TASKS</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in visibleExpectations" :key="item.code">
              <tr 
                class="sbar-mastery-row"
                :class="{ 'sbar-mastery-row--expanded': expandedRow === item.code }"
                @click="toggleRow(item.code)"
              >
                <td class="td-code">
                  <div class="code-title-row">
                    <span class="code-title">{{ item.code }}</span>
                    <ExpectationWeightBadge :weight="item.weight" />
                  </div>
                  <div v-if="item.description" class="code-desc" :title="item.description">{{ item.description }}</div>
                </td>
                <td class="td-level">
                  <div class="sbar-level-display">
                    <span 
                      class="sbar-level-badge" 
                      :class="{ 'sbar-level-badge--overridden': item.isOverridden }"
                      :style="{ background: item.badge.color, color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }"
                      :title="item.isOverridden ? `Overridden to ${item.badge.level} (Calculated: ${item.calculatedBadge?.level || '—'})` : `Calculated level: ${item.badge.level}`"
                    >
                      <Zap v-if="item.isOverridden" :size="11" class="override-pill-icon" />
                      {{ item.badge.level }}
                    </span>
                    <span v-if="item.isOverridden" class="overridden-tag-mini" title="Teacher Professional Judgment Override">
                      was {{ item.calculatedBadge?.level || '—' }}
                    </span>
                  </div>
                </td>
                <td class="td-trend">
                  <span v-if="item.trend === 'improving'" class="trend-badge trend-badge--up" title="Improving trend">
                    <TrendingUp :size="14" /> Improving
                  </span>
                  <span v-else-if="item.trend === 'declining'" class="trend-badge trend-badge--down" title="Declining trend">
                    <TrendingDown :size="14" /> Declining
                  </span>
                  <span v-else class="trend-badge trend-badge--steady" title="Steady performance">
                    <Minus :size="14" /> Steady
                  </span>
                </td>
                <td class="td-evals">
                  <div class="evals-count-tag">
                    {{ item.evaluations.length }} Evaluation{{ item.evaluations.length !== 1 ? 's' : '' }}
                    <ChevronDown :size="14" class="chevron-icon" :class="{ 'chevron-icon--open': expandedRow === item.code }" />
                  </div>
                </td>
              </tr>

              <!-- Expanded Evaluations Detail Row -->
              <tr v-if="expandedRow === item.code" :key="item.code + '-exp'" class="sbar-mastery-detail-row">
                <td colspan="4">
                  <div class="evals-detail-container">
                    <div class="evals-detail-title">Evaluations contributing to {{ item.code }}:</div>
                    <div v-if="item.evaluations.length > 0" class="evals-pill-list">
                      <div 
                        v-for="ev in item.evaluations" 
                        :key="ev.assessmentId" 
                        class="eval-item-card"
                        @click.stop="$emit('select-assessment', ev.assessmentId)"
                        title="Click to view assessment matrix"
                      >
                        <span class="eval-name">{{ ev.name }}</span>
                        <span 
                          class="sbar-level-badge" 
                          :style="{ background: ev.badge.color, color: 'white', padding: '1px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }"
                        >
                          {{ ev.badge.level }}
                        </span>
                        <span class="eval-date" v-if="ev.date">({{ ev.date }})</span>
                      </div>
                    </div>
                    <div v-else class="evals-empty-note">
                      No contributing assessment evaluations recorded yet for this expectation.
                    </div>

                    <!-- Teacher Professional Judgment Override Controls -->
                    <div class="override-panel">
                      <div class="override-panel-header">
                        <div class="override-panel-title">
                          <Zap :size="13" class="override-icon" />
                          <span>Professional Judgment Override:</span>
                        </div>
                        <div v-if="item.isOverridden" class="override-active-pill">
                          <span class="override-active-tag">Active Override</span>
                          <span class="override-active-details">
                            Held at <strong>{{ item.overrideLevel }}</strong>
                            (Calculated: {{ item.calculatedBadge?.level || '—' }})
                          </span>
                          <button 
                            type="button" 
                            class="revert-override-btn"
                            title="Revert to calculated algorithmic level"
                            @click.stop="handleRevertOverride(item.code)"
                          >
                            <RotateCcw :size="11" /> Revert to {{ item.calculatedBadge?.level || 'Calculated' }}
                          </button>
                        </div>
                        <div v-else class="override-inactive-hint">
                          Calculated: <strong>{{ item.badge.level }}</strong>. Select level below to override permanently:
                        </div>
                      </div>

                      <div class="override-buttons-bar">
                        <button
                          v-for="lvl in SBAR_LEVEL_OPTIONS"
                          :key="lvl.code"
                          type="button"
                          class="override-lvl-btn"
                          :class="{ 
                            'override-lvl-btn--active': item.isOverridden && (item.overrideLevel === lvl.code || item.overrideLevel === lvl.shortLabel),
                            'override-lvl-btn--calc': !item.isOverridden && (item.badge.level === lvl.code || item.badge.level === lvl.shortLabel)
                          }"
                          :style="item.isOverridden && (item.overrideLevel === lvl.code || item.overrideLevel === lvl.shortLabel) ? { background: lvl.color, borderColor: lvl.color, color: 'white' } : {}"
                          :title="`Override ${item.code} to ${lvl.code} (${lvl.pct}%)`"
                          @click.stop="handleSetOverride(item.code, lvl)"
                        >
                          {{ lvl.shortLabel || lvl.code }}
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Expand/Collapse Footer Toggle -->
      <div 
        v-if="filteredExpectations.length > DEFAULT_LIMIT && !searchQuery.trim() && selectedUnit === 'ALL'" 
        class="sbar-mastery-footer"
      >
        <button class="sbar-show-more-btn" @click="showAll = !showAll">
          <span>{{ showAll ? 'Show Fewer Expectations' : `Show All Evaluated Expectations (${filteredExpectations.length})` }}</span>
          <ChevronDown :size="14" class="chevron-icon" :class="{ 'chevron-icon--open': showAll }" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Target, AlertCircle, ChevronDown, TrendingUp, TrendingDown, Minus, Search, Filter, Zap, RotateCcw } from 'lucide-vue-next'
import { activeClassRecord, assessments, gradeMap, saveStudentExpectationOverride } from '../../composables/useGradebook.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { calculateSBARExpectationMastery, SBAR_LEVELS } from '../../db/gradebook/gradeCalcSBAR.js'
import { cleanUnitName } from '../../composables/useElementary.js'
import ExpectationWeightBadge from '../setup/ExpectationWeightBadge.vue'

const props = defineProps({
  studentId: { type: String, required: true }
})

defineEmits(['select-assessment'])

const expandedRow = ref(null)
const searchQuery = ref('')
const selectedUnit = ref('ALL')
const showAll = ref(false)
const DEFAULT_LIMIT = 8

const SBAR_LEVEL_OPTIONS = SBAR_LEVELS || []

function toggleRow(code) {
  expandedRow.value = expandedRow.value === code ? null : code
}

async function handleSetOverride(code, lvl) {
  if (!props.studentId) return
  await saveStudentExpectationOverride(
    props.studentId,
    code,
    {
      level: lvl.code,
      score: lvl.pct,
      note: 'Teacher professional judgment override'
    },
    activeSubjectId?.value || null
  )
}

async function handleRevertOverride(code) {
  if (!props.studentId) return
  await saveStudentExpectationOverride(
    props.studentId,
    code,
    null,
    activeSubjectId?.value || null
  )
}

const expectationList = computed(() => {
  if (!activeClassRecord.value || !props.studentId) return []

  const algorithm = activeClassRecord.value.sbarAlgorithm || activeClassRecord.value.sbarCalculationAlgorithm || 'decaying_average'
  const fullMasteryMap = calculateSBARExpectationMastery(
    activeClassRecord.value,
    assessments.value || [],
    gradeMap.value || {},
    algorithm
  )

  const studentMastery = fullMasteryMap[props.studentId] || {}
  
  // Map class curriculum expectations for descriptions
  const curriculumMap = {}
  const cls = activeClassRecord.value
  
  const flatExps = [
    ...(cls?.expectations || []),
    ...(cls?.curriculumExpectations || [])
  ]
  const units = cls?.gradebookUnits || cls?.units || []
  units.forEach(u => {
    if (Array.isArray(u.expectations)) {
      flatExps.push(...u.expectations)
    }
  })

  const idToCodeMap = {}
  flatExps.forEach(exp => {
    if (!exp) return
    const code = exp.code
    const id = exp.expectationId || exp.id
    if (id && code) {
      idToCodeMap[String(id)] = code
      idToCodeMap[String(id).toLowerCase()] = code
    }
    const desc = exp.description || exp.text || exp.name || exp.title || exp.summary
    if (desc) {
      if (code) {
        const codeStr = String(code).trim()
        curriculumMap[codeStr] = desc
        curriculumMap[codeStr.toUpperCase()] = desc
        curriculumMap[codeStr.toLowerCase()] = desc
      }
      if (id) {
        const idStr = String(id).trim()
        curriculumMap[idStr] = desc
        curriculumMap[idStr.toLowerCase()] = desc
      }
    }
  })

  const weightMap = {}
  flatExps.forEach(exp => {
    if (!exp) return
    const w = exp.weight != null ? Number(exp.weight) : 1.0
    if (exp.code) weightMap[String(exp.code).trim()] = w
    if (exp.expectationId || exp.id) weightMap[String(exp.expectationId || exp.id).trim()] = w
  })

  return Object.keys(studentMastery).map(rawKey => {
    const data = studentMastery[rawKey]
    const rawStr = String(rawKey).trim()
    const friendlyCode = idToCodeMap[rawStr] || idToCodeMap[rawStr.toLowerCase()] || rawKey
    const description = curriculumMap[friendlyCode] || curriculumMap[rawStr] || curriculumMap[rawStr.toLowerCase()] || ''
    return {
      code: friendlyCode,
      rawKey,
      description,
      score: data.score,
      badge: data.badge,
      trend: data.trend,
      weight: data.weight != null ? Number(data.weight) : (weightMap[friendlyCode] ?? weightMap[rawStr] ?? 1.0),
      evaluations: data.evaluations || [],
      isOverridden: !!data.isOverridden,
      overrideLevel: data.overrideLevel || null,
      calculatedScore: data.calculatedScore ?? data.score,
      calculatedBadge: data.calculatedBadge || data.badge,
      overrideNote: data.overrideNote || '',
      overrideUpdatedAt: data.overrideUpdatedAt || null
    }
  }).sort((a, b) => a.code.localeCompare(b.code))
})

const availableUnits = computed(() => {
  const cls = activeClassRecord.value
  const units = cls?.gradebookUnits || cls?.units || []

  if (Array.isArray(units) && units.length > 0) {
    return units.map(u => ({
      unitId: u.unitId || `unit-${u.name}`,
      name: cleanUnitName(u.name) || 'Unit',
      expectations: u.expectations || [],
      codePrefix: u.codePrefix || u.strandCode
    }))
  }

  const set = new Set()
  expectationList.value.forEach(item => {
    const match = item.code.match(/^([A-Za-z]+)/)
    if (match) {
      set.add(match[1].toUpperCase())
    }
  })
  return Array.from(set).sort().map(s => ({
    unitId: `strand-${s}`,
    name: `Strand ${s}`,
    strandCode: s
  }))
})

const filteredExpectations = computed(() => {
  let list = expectationList.value

  if (selectedUnit.value !== 'ALL') {
    const targetUnit = availableUnits.value.find(u => String(u.unitId) === String(selectedUnit.value))
    if (targetUnit) {
      const clsExps = activeClassRecord.value?.expectations || activeClassRecord.value?.curriculumExpectations || []
      
      list = list.filter(item => {
        // 1. Check unit's expectations array
        if (Array.isArray(targetUnit.expectations) && targetUnit.expectations.length > 0) {
          const match = targetUnit.expectations.some(e => {
            const code = typeof e === 'string' ? e : e.code
            return code && code.toLowerCase() === item.code.toLowerCase()
          })
          if (match) return true
        }

        // 2. Check class expectations array association
        const clsExpObj = clsExps.find(e => e.code && e.code.toLowerCase() === item.code.toLowerCase())
        if (clsExpObj && (clsExpObj.unitId === targetUnit.unitId || (clsExpObj.unitName && cleanUnitName(clsExpObj.unitName) === targetUnit.name))) {
          return true
        }

        // 3. Fallback to codePrefix or strandCode matching
        const codePrefix = targetUnit.codePrefix || targetUnit.strandCode
        if (codePrefix && item.code.toUpperCase().startsWith(codePrefix.toUpperCase())) {
          return true
        }

        return false
      })
    }
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(item => 
      item.code.toLowerCase().includes(q) || 
      item.description.toLowerCase().includes(q)
    )
  }

  return list
})

const visibleExpectations = computed(() => {
  if (showAll.value || searchQuery.value.trim() || selectedUnit.value !== 'ALL') {
    return filteredExpectations.value
  }
  return filteredExpectations.value.slice(0, DEFAULT_LIMIT)
})
</script>

<style scoped>
.sbar-expectation-mastery {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  margin-bottom: 0;
}

.sbar-mastery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.sbar-mastery-title-group {
  display: flex;
  flex-direction: column;
}

.sbar-mastery-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.5px;
  margin: 0;
}

.sbar-mastery-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.sbar-mastery-badge-count {
  font-size: 11px;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.12);
  color: var(--primary);
  border: 1px solid rgba(59, 130, 246, 0.25);
  padding: 4px 10px;
  border-radius: var(--radius-full, 12px);
}

.sbar-mastery-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  color: var(--text-secondary);
  font-size: 13px;
}

.sbar-mastery-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.sbar-search-box {
  position: relative;
  flex: 1;
  max-width: 320px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}

.sbar-search-input {
  width: 100%;
  padding: 6px 12px 6px 30px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s ease;
}

.sbar-search-input:focus {
  border-color: var(--primary);
}

.sbar-strand-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.filter-icon {
  color: var(--text-secondary);
}

.sbar-strand-select {
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary);
  color: var(--text);
  outline: none;
  cursor: pointer;
}

.sbar-mastery-no-results {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
}

.sbar-mastery-table-wrapper {
  overflow-x: auto;
  max-height: 480px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
}

.sbar-mastery-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.sbar-mastery-table th {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  z-index: 2;
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}

.th-code, .td-code {
  text-align: left;
}

.th-level, .td-level {
  width: 90px;
  text-align: center;
  white-space: nowrap;
}

.th-trend, .td-trend {
  width: 100px;
  text-align: center;
  white-space: nowrap;
}

.th-evals, .td-evals {
  width: 130px;
  text-align: right;
  white-space: nowrap;
}

.sbar-mastery-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.sbar-mastery-row:hover {
  background: var(--bg-hover);
}

.sbar-mastery-row td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.code-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.code-title {
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}

.code-desc {
  font-size: 11px;
  color: var(--text-secondary);
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trend-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.trend-badge--up {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.trend-badge--down {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.trend-badge--steady {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.evals-count-tag {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  color: var(--primary);
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
}

.chevron-icon {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.chevron-icon--open {
  transform: rotate(180deg);
}

.sbar-mastery-detail-row td {
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.evals-detail-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evals-detail-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.evals-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.eval-item-card {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: all 0.15s ease;
}

.eval-item-card:hover {
  border-color: var(--primary);
  background: var(--bg-hover);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.eval-name {
  font-weight: 600;
  font-size: 12px;
  color: var(--text);
}

.eval-date {
  font-size: 11px;
  color: var(--text-secondary);
}

.sbar-mastery-footer {
  display: flex;
  justify-content: center;
  padding-top: 12px;
}

.sbar-show-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: all 0.15s ease;
}

.sbar-show-more-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
}

.sbar-level-display {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.sbar-level-badge--overridden {
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.45), 0 2px 5px rgba(0, 0, 0, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.override-pill-icon {
  color: #fbbf24;
}

.overridden-tag-mini {
  font-size: 10px;
  font-weight: 600;
  color: #f59e0b;
  letter-spacing: 0.2px;
}

.evals-empty-note {
  font-size: 12px;
  font-style: italic;
  color: var(--text-secondary);
  padding: 4px 0;
}

.override-panel {
  margin-top: 8px;
  padding: 10px 12px;
  background: var(--surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.override-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.override-panel-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.override-icon {
  color: #f59e0b;
}

.override-active-pill {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 3px 8px;
  border-radius: 6px;
}

.override-active-tag {
  font-weight: 700;
  color: #f59e0b;
}

.override-active-details {
  color: var(--text);
}

.revert-override-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.revert-override-btn:hover {
  background: var(--bg-hover);
  border-color: #ef4444;
  color: #ef4444;
}

.override-inactive-hint {
  font-size: 11px;
  color: var(--text-secondary);
}

.override-buttons-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.override-lvl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.override-lvl-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
  color: var(--text);
  transform: translateY(-1px);
}

.override-lvl-btn--calc {
  border-color: rgba(255, 255, 255, 0.25);
  color: var(--text);
}

.override-lvl-btn--active {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
</style>

