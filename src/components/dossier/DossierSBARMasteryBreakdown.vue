<template>
  <div class="dossier-sbar-panel">
    <!-- Header -->
    <div class="dossier-sbar-panel__header">
      <span class="dossier-sbar-panel__title">Mastery Breakdown</span>
      <span class="algorithm-badge" :title="`Active calculation model: ${algorithmLabel}`">
        {{ algorithmShortLabel }}
      </span>
    </div>

    <!-- Empty State -->
    <div v-if="totalEvaluated === 0" class="dossier-sbar-empty">
      <span>No standards evaluated yet</span>
    </div>

    <!-- Level Distribution & Units List -->
    <div v-else class="dossier-sbar-content">
      <!-- 1. Level Distribution Breakdown -->
      <div class="distribution-section">
        <div class="section-label">Level Distribution ({{ totalEvaluated }} {{ totalEvaluated === 1 ? 'Standard' : 'Standards' }})</div>
        
        <div class="level-bars-list">
          <div 
            v-for="lvl in levelDistribution" 
            :key="lvl.key" 
            class="level-bar-row"
            :class="{ 'level-bar-row--zero': lvl.count === 0 }"
          >
            <div class="level-bar-info">
              <span class="level-badge" :style="{ background: lvl.badgeColor, color: '#ffffff' }">{{ lvl.badgeLabel }}</span>
              <span class="level-name">{{ lvl.name }}</span>
              <span class="level-count">{{ lvl.count }} ({{ lvl.pct }}%)</span>
            </div>

            <div class="level-bar-track">
              <div 
                class="level-bar-fill"
                :style="{ width: `${lvl.pct}%`, backgroundColor: lvl.barColor }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Unit / Strand Mastery (if available) -->
      <div v-if="unitBreakdown.length > 0" class="units-section">
        <div class="section-label">Unit / Strand Mastery</div>
        <div class="unit-mastery-list">
          <div 
            v-for="u in unitBreakdown" 
            :key="u.unitId" 
            class="unit-mastery-row"
          >
            <div class="unit-info">
              <span class="unit-name" :title="u.name">{{ u.name }}</span>
              <span 
                v-if="u.badge" 
                class="unit-level-badge"
                :style="{ background: u.badge.color, color: '#ffffff' }"
              >
                {{ u.badge.level }}
              </span>
              <span v-else class="unit-unassessed">—</span>
            </div>

            <div class="unit-bar-track">
              <div 
                class="unit-bar-fill"
                :style="{ 
                  width: `${u.score != null ? Math.min(100, Math.max(0, u.score)) : 0}%`, 
                  backgroundColor: u.badge?.color || 'var(--border)' 
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { activeClassRecord, assessments, gradeMap } from '../../composables/useGradebook.js'
import { calculateSBARExpectationMastery, getSBARLevelBadge } from '../../db/gradebook/gradeCalcSBAR.js'
import { cleanUnitName } from '../../composables/useElementary.js'

const props = defineProps({
  studentId: { type: String, required: true }
})

const algorithm = computed(() => {
  return activeClassRecord.value?.sbarAlgorithm || activeClassRecord.value?.sbarCalculationAlgorithm || 'decaying_average'
})

const algorithmShortLabel = computed(() => {
  const map = {
    decaying_average: 'Decaying Avg',
    mode: 'Mode / Frequent',
    most_recent: 'Most Recent',
    power_law: 'Power Law',
    highest: 'Highest'
  }
  return map[algorithm.value] || 'Decaying Avg'
})

const algorithmLabel = computed(() => {
  const map = {
    decaying_average: 'Decaying Average (65% newest, 35% historic)',
    mode: 'Mode (Most frequently achieved level)',
    most_recent: 'Most Recent Evaluation',
    power_law: 'Power Law Trajectory (Marzano)',
    highest: 'Highest Score Achieved'
  }
  return map[algorithm.value] || 'Decaying Average'
})

// Mastery calculations for this student
const studentMasteryData = computed(() => {
  if (!activeClassRecord.value || !props.studentId) return {}
  const fullMasteryMap = calculateSBARExpectationMastery(
    activeClassRecord.value,
    assessments.value || [],
    gradeMap.value || {},
    algorithm.value
  )
  return fullMasteryMap[props.studentId] || {}
})

const expectationList = computed(() => {
  return Object.values(studentMasteryData.value || {})
})

const totalEvaluated = computed(() => expectationList.value.length)

// Level Distribution: Level 4, Level 3, Level 2, Level 1, Level R
const levelDistribution = computed(() => {
  const total = totalEvaluated.value
  if (total === 0) return []

  let c4 = 0, c3 = 0, c2 = 0, c1 = 0, cr = 0

  expectationList.value.forEach(item => {
    const s = Number(item.score || 0)
    if (s >= 80) c4++
    else if (s >= 70) c3++
    else if (s >= 60) c2++
    else if (s >= 50) c1++
    else cr++
  })

  return [
    {
      key: 'L4',
      badgeLabel: 'L4',
      badgeColor: '#16a34a',
      barColor: '#22c55e',
      name: 'Level 4 (Mastery)',
      count: c4,
      pct: total ? Math.round((c4 / total) * 100) : 0
    },
    {
      key: 'L3',
      badgeLabel: 'L3',
      badgeColor: '#2563eb',
      barColor: '#3b82f6',
      name: 'Level 3 (Proficient)',
      count: c3,
      pct: total ? Math.round((c3 / total) * 100) : 0
    },
    {
      key: 'L2',
      badgeLabel: 'L2',
      badgeColor: '#d97706',
      barColor: '#f59e0b',
      name: 'Level 2 (Approaching)',
      count: c2,
      pct: total ? Math.round((c2 / total) * 100) : 0
    },
    {
      key: 'L1',
      badgeLabel: 'L1',
      badgeColor: '#dc2626',
      barColor: '#ef4444',
      name: 'Level 1 (Beginning)',
      count: c1,
      pct: total ? Math.round((c1 / total) * 100) : 0
    },
    {
      key: 'R',
      badgeLabel: 'R',
      badgeColor: '#991b1b',
      barColor: '#f87171',
      name: 'Level R / Below',
      count: cr,
      pct: total ? Math.round((cr / total) * 100) : 0
    }
  ]
})

// Unit / Strand Breakdown
const unitBreakdown = computed(() => {
  const cls = activeClassRecord.value
  const units = cls?.gradebookUnits || cls?.units || []
  if (!Array.isArray(units) || units.length === 0) return []

  const rawMastery = studentMasteryData.value || {}

  return units.map(u => {
    const uExps = u.expectations || []
    const scores = []

    uExps.forEach(exp => {
      const code = exp.code || exp.id || exp.expectationId
      if (!code) return

      // Look up in rawMastery
      const entry = rawMastery[code] || rawMastery[String(code).toLowerCase()] || rawMastery[String(code).toUpperCase()]
      if (entry && entry.score != null && entry.score !== '' && !isNaN(Number(entry.score)) && isFinite(Number(entry.score))) {
        scores.push(Number(entry.score))
      }
    })

    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const badge = avgScore != null ? getSBARLevelBadge(avgScore) : null

    return {
      unitId: u.unitId || u.name,
      name: cleanUnitName(u.name) || 'Unit',
      score: avgScore,
      badge,
      evaluatedCount: scores.length,
      totalExpectations: uExps.length
    }
  })
})
</script>

<style scoped>
.dossier-sbar-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dossier-sbar-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
}

.dossier-sbar-panel__title {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.algorithm-badge {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  padding: 2px 8px;
  border-radius: var(--radius-full, 100px);
  cursor: help;
  white-space: nowrap;
}

.dossier-sbar-empty {
  padding: 12px 6px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.dossier-sbar-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 6px;
}

/* Level Distribution */
.level-bars-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.level-bar-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.level-bar-row--zero {
  opacity: 0.45;
}

.level-bar-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
}

.level-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  min-width: 22px;
  text-align: center;
}

.level-name {
  color: var(--text);
  font-weight: 600;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level-count {
  font-weight: 700;
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.level-bar-track {
  height: 5px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
}

.level-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Units Section */
.units-section {
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.unit-mastery-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unit-mastery-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.unit-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.72rem;
}

.unit-name {
  color: var(--text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.unit-level-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
}

.unit-unassessed {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.unit-bar-track {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
}

.unit-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
