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
                  <div class="code-title">{{ item.code }}</div>
                  <div v-if="item.description" class="code-desc" :title="item.description">{{ item.description }}</div>
                </td>
                <td class="td-level">
                  <span 
                    class="sbar-level-badge" 
                    :style="{ background: item.badge.color, color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }"
                  >
                    {{ item.badge.level }}
                  </span>
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
                    <div class="evals-pill-list">
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
import { Target, AlertCircle, ChevronDown, TrendingUp, TrendingDown, Minus, Search, Filter } from 'lucide-vue-next'
import { activeClassRecord, assessments, gradeMap } from '../../composables/useGradebook.js'
import { calculateSBARExpectationMastery } from '../../db/gradebook/gradeCalcSBAR.js'
import { cleanUnitName } from '../../composables/useElementary.js'

const props = defineProps({
  studentId: { type: String, required: true }
})

defineEmits(['select-assessment'])

const expandedRow = ref(null)
const searchQuery = ref('')
const selectedUnit = ref('ALL')
const showAll = ref(false)
const DEFAULT_LIMIT = 8

function toggleRow(code) {
  expandedRow.value = expandedRow.value === code ? null : code
}


const expectationList = computed(() => {
  if (!activeClassRecord.value || !props.studentId) return []

  const algorithm = activeClassRecord.value.sbarCalculationAlgorithm || 'decaying_average'
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
      evaluations: data.evaluations || []
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
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
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
  color: var(--text-color, #1e293b);
  letter-spacing: 0.5px;
  margin: 0;
}

.sbar-mastery-subtitle {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  margin: 2px 0 0 0;
}

.sbar-mastery-badge-count {
  font-size: 11px;
  font-weight: 600;
  background: #e0f2fe;
  color: #0369a1;
  padding: 4px 10px;
  border-radius: 12px;
}

.sbar-mastery-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  color: var(--text-secondary, #64748b);
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
  color: var(--text-secondary, #94a3b8);
  pointer-events: none;
}

.sbar-search-input {
  width: 100%;
  padding: 6px 12px 6px 30px;
  font-size: 12px;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 6px;
  background: var(--input-bg, #ffffff);
  color: var(--text-color, #0f172a);
  outline: none;
  transition: border-color 0.15s ease;
}

.sbar-search-input:focus {
  border-color: var(--primary-color, #2563eb);
}

.sbar-strand-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary, #64748b);
}

.filter-icon {
  color: var(--text-secondary, #64748b);
}

.sbar-strand-select {
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 6px;
  background: var(--input-bg, #ffffff);
  color: var(--text-color, #0f172a);
  outline: none;
  cursor: pointer;
}

.sbar-mastery-no-results {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  background: #f8fafc;
  border-radius: 8px;
}

.sbar-mastery-table-wrapper {
  overflow-x: auto;
  max-height: 480px;
  overflow-y: auto;
  border: 1px solid var(--border-color, #f1f5f9);
  border-radius: 8px;
}

.sbar-mastery-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.sbar-mastery-table th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 2;
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  border-bottom: 2px solid var(--border-color, #e2e8f0);
}

.sbar-mastery-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.sbar-mastery-row:hover {
  background: #f8fafc;
}

.sbar-mastery-row td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color, #f1f5f9);
}

.code-title {
  font-weight: 700;
  color: var(--text-color, #0f172a);
}

.code-desc {
  font-size: 11px;
  color: var(--text-secondary, #64748b);
  max-width: 340px;
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
}

.trend-badge--up {
  background: #dcfce7;
  color: #15803d;
}

.trend-badge--down {
  background: #fee2e2;
  color: #b91c1c;
}

.trend-badge--steady {
  background: #f1f5f9;
  color: #475569;
}

.evals-count-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--primary-color, #2563eb);
  font-weight: 600;
  font-size: 12px;
}

.chevron-icon {
  transition: transform 0.2s ease;
}

.chevron-icon--open {
  transform: rotate(180deg);
}

.sbar-mastery-detail-row td {
  background: #f8fafc;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.evals-detail-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evals-detail-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
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
  background: #ffffff;
  border: 1px solid var(--border-color, #cbd5e1);
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eval-item-card:hover {
  border-color: var(--primary-color, #2563eb);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.eval-name {
  font-weight: 600;
  font-size: 12px;
  color: var(--text-color, #1e293b);
}

.eval-date {
  font-size: 11px;
  color: var(--text-secondary, #64748b);
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
  color: var(--primary-color, #2563eb);
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sbar-show-more-btn:hover {
  background: #dbeafe;
}
</style>

