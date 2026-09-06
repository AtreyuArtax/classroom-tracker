<template>
  <Teleport to="body">
    <div v-if="show" class="exp-modal-backdrop" @click="handleClose" @contextmenu.prevent="handleClose">
      <div class="exp-modal-container" @click.stop>
        <!-- Modal Header -->
        <header class="exp-modal-header">
          <div class="exp-modal-header-left">
            <div class="exp-modal-badges-row">
              <span class="exp-code-pill">{{ expectationCode }}</span>
              <ExpectationWeightBadge :weight="resolvedWeight" />
              <span v-if="unitName" class="exp-unit-pill">{{ unitName }}</span>
              <span v-if="isOverridden" class="exp-override-pill">
                <Sparkles :size="12" /> Professional Judgment Override
              </span>
            </div>
            <h3 class="exp-modal-title">{{ expectationTitle || expectationCode }}</h3>
            <p v-if="expectationDescription && expectationDescription !== expectationTitle" class="exp-modal-desc">
              {{ expectationDescription }}
            </p>
            <div class="exp-student-name-row">
              <span class="student-label">Student:</span>
              <strong class="student-name">{{ studentName }}</strong>
            </div>
          </div>

          <button class="exp-modal-close-btn" @click="handleClose" title="Close">
            <X :size="18" />
          </button>
        </header>

        <!-- Current Status & Algorithmic Summary Banner -->
        <div class="exp-status-banner" :class="{ 'exp-status-banner--overridden': isOverridden }">
          <div class="status-badge-area">
            <span 
              class="status-level-badge" 
              :style="{ background: activeBadge.color, color: '#ffffff' }"
            >
              {{ activeBadge.level }}
            </span>
          </div>

          <div class="status-info-area">
            <div class="status-headline">
              <span v-if="isOverridden" class="status-active-label">
                Official Grade: <strong>{{ activeBadge.level }}</strong> ({{ activeScore }}%)
              </span>
              <span v-else class="status-active-label">
                Mastery Level: <strong>{{ activeBadge.level }}</strong> ({{ activeScore != null ? activeScore + '%' : '—' }})
              </span>
            </div>

            <div class="status-calc-detail">
              <span v-if="isOverridden">
                Calculated from {{ evaluations.length }} task{{ evaluations.length !== 1 ? 's' : '' }}:
                <strong class="calc-highlight">{{ calculatedBadge?.level || '—' }} ({{ calculatedScore != null ? Math.round(calculatedScore) + '%' : '—' }})</strong>
                via {{ algorithmLabel }}
                <span v-if="resolvedWeight === 0" class="weight-note-text"> (0× Diagnostic - excluded from overall)</span>
                <span v-else-if="resolvedWeight !== 1" class="weight-note-text"> (Weight: {{ resolvedWeight }}×)</span>
              </span>
              <span v-else-if="evaluations.length > 0">
                Calculated via <strong>{{ algorithmLabel }}</strong>
                ({{ evaluations.length }} contributing task{{ evaluations.length !== 1 ? 's' : '' }})
                <span v-if="resolvedWeight === 0" class="weight-note-text"> (0× Diagnostic - excluded from overall)</span>
                <span v-else-if="resolvedWeight !== 1" class="weight-note-text"> (Weight: {{ resolvedWeight }}×)</span>
              </span>
              <span v-else class="text-muted">
                No formal assessments recorded yet for this standard.
                <span v-if="resolvedWeight === 0" class="weight-note-text"> (0× Diagnostic standard)</span>
                <span v-else-if="resolvedWeight !== 1" class="weight-note-text"> (Weight: {{ resolvedWeight }}×)</span>
              </span>
            </div>
          </div>

          <!-- Revert to Calculated Button (if currently overridden) -->
          <div v-if="isOverridden" class="status-actions-area">
            <button 
              type="button" 
              class="revert-btn"
              title="Remove override and restore calculated algorithm grade"
              @click="revertOverride"
            >
              <RotateCcw :size="13" />
              <span>Revert to Calculated ({{ calculatedBadge?.level || '—' }})</span>
            </button>
          </div>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="exp-modal-body">
          <!-- 1. Override Level Selection (Professional Judgment) -->
          <section class="override-section">
            <div class="section-title-row">
              <h4 class="section-title">
                <Award :size="15" /> Set Override Mark (Professional Judgment)
              </h4>
              <span class="section-hint">Permanent override that holds across future assessments</span>
            </div>

            <div class="level-tiers-grid">
              <!-- Tier 4 -->
              <div class="tier-group tier-group--l4">
                <span class="tier-label">Level 4</span>
                <div class="tier-buttons">
                  <button 
                    v-for="lvl in levelTiers.l4" 
                    :key="lvl.code"
                    type="button"
                    class="level-select-btn"
                    :class="{ 'level-select-btn--active': activeLevelCode === lvl.code }"
                    :style="{ '--lvl-color': lvl.color }"
                    @click="applyOverride(lvl)"
                  >
                    <span class="lvl-code">{{ lvl.code }}</span>
                    <span class="lvl-pct">{{ lvl.pct }}%</span>
                    <Check v-if="activeLevelCode === lvl.code" :size="12" class="lvl-check" />
                  </button>
                </div>
              </div>

              <!-- Tier 3 -->
              <div class="tier-group tier-group--l3">
                <span class="tier-label">Level 3</span>
                <div class="tier-buttons">
                  <button 
                    v-for="lvl in levelTiers.l3" 
                    :key="lvl.code"
                    type="button"
                    class="level-select-btn"
                    :class="{ 'level-select-btn--active': activeLevelCode === lvl.code }"
                    :style="{ '--lvl-color': lvl.color }"
                    @click="applyOverride(lvl)"
                  >
                    <span class="lvl-code">{{ lvl.code }}</span>
                    <span class="lvl-pct">{{ lvl.pct }}%</span>
                    <Check v-if="activeLevelCode === lvl.code" :size="12" class="lvl-check" />
                  </button>
                </div>
              </div>

              <!-- Tier 2 -->
              <div class="tier-group tier-group--l2">
                <span class="tier-label">Level 2</span>
                <div class="tier-buttons">
                  <button 
                    v-for="lvl in levelTiers.l2" 
                    :key="lvl.code"
                    type="button"
                    class="level-select-btn"
                    :class="{ 'level-select-btn--active': activeLevelCode === lvl.code }"
                    :style="{ '--lvl-color': lvl.color }"
                    @click="applyOverride(lvl)"
                  >
                    <span class="lvl-code">{{ lvl.code }}</span>
                    <span class="lvl-pct">{{ lvl.pct }}%</span>
                    <Check v-if="activeLevelCode === lvl.code" :size="12" class="lvl-check" />
                  </button>
                </div>
              </div>

              <!-- Tier 1 & R -->
              <div class="tier-group tier-group--l1">
                <span class="tier-label">Level 1 &amp; R</span>
                <div class="tier-buttons">
                  <button 
                    v-for="lvl in levelTiers.l1" 
                    :key="lvl.code"
                    type="button"
                    class="level-select-btn"
                    :class="{ 'level-select-btn--active': activeLevelCode === lvl.code }"
                    :style="{ '--lvl-color': lvl.color }"
                    @click="applyOverride(lvl)"
                  >
                    <span class="lvl-code">{{ lvl.code }}</span>
                    <span class="lvl-pct">{{ lvl.pct }}%</span>
                    <Check v-if="activeLevelCode === lvl.code" :size="12" class="lvl-check" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Optional Note -->
            <div class="override-note-wrap">
              <input 
                v-model="teacherNote" 
                type="text" 
                placeholder="Reason / observation for professional judgment override (optional)..."
                class="override-note-input"
                @blur="saveNoteIfOverridden"
                @keyup.enter="saveNoteIfOverridden"
              />
            </div>
          </section>

          <!-- 2. Contributing Evaluations Section -->
          <section class="evals-section">
            <div class="section-title-row">
              <h4 class="section-title">
                <FileText :size="15" /> Contributing Assessments ({{ evaluations.length }})
              </h4>
              <span class="section-hint">Tasks used to generate the algorithmic grade</span>
            </div>

            <div v-if="evaluations.length === 0" class="evals-empty">
              <p>No assessment evidence recorded for <strong>{{ expectationCode }}</strong> yet.</p>
            </div>

            <div v-else class="evals-list">
              <div 
                v-for="ev in evaluations" 
                :key="ev.assessmentId" 
                class="eval-card"
                :class="{ 'eval-card--formative': ev.type === 'formative' }"
                @click="onSelectAssessment(ev.assessmentId)"
                title="Click to view assessment details"
              >
                <div class="eval-card-left">
                  <div class="eval-card-name-row">
                    <span class="eval-card-name">{{ ev.name }}</span>
                    <span 
                      class="eval-type-tag" 
                      :class="ev.type === 'formative' ? 'eval-type-tag--formative' : 'eval-type-tag--summative'"
                    >
                      {{ ev.type === 'formative' ? 'Formative' : 'Summative' }}
                    </span>
                    <span v-if="ev.isRadial" class="eval-type-tag eval-type-tag--radial">Check-in</span>
                  </div>
                  <div class="eval-card-meta">
                    <Calendar :size="12" />
                    <span>{{ formatDate(ev.date) }}</span>
                  </div>
                </div>

                <div class="eval-card-right">
                  <span 
                    class="eval-level-badge" 
                    :style="{ background: ev.badge?.color || '#3b82f6', color: '#ffffff' }"
                  >
                    {{ ev.badge?.level || '—' }}
                  </span>
                  <span class="eval-score-pct">{{ Math.round(ev.score) }}%</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Modal Footer -->
        <footer class="exp-modal-footer">
          <div class="footer-left">
            <button 
              type="button" 
              class="btn-link-dossier" 
              @click="$emit('open-dossier', studentId)"
            >
              <ExternalLink :size="14" /> Open Student Dossier
            </button>
          </div>
          <div class="footer-right">
            <button type="button" class="btn-done" @click="handleClose">Done</button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X, RotateCcw, Check, Award, FileText, Calendar, ExternalLink, Sparkles } from 'lucide-vue-next'
import { SBAR_LEVELS, getSBARLevelBadge } from '../../db/gradebookService.js'
import { saveStudentExpectationOverride, activeClassRecord } from '../../composables/useGradebook.js'
import { formatLocalDisplay } from '../../utils/dates.js'
import ExpectationWeightBadge from '../setup/ExpectationWeightBadge.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  studentId: { type: String, required: true },
  studentName: { type: String, default: '' },
  expectationCode: { type: String, required: true },
  expectationTitle: { type: String, default: '' },
  expectationDescription: { type: String, default: '' },
  expectationWeight: { type: Number, default: 1.0 },
  unitName: { type: String, default: '' },
  masteryData: { type: Object, default: () => ({}) }
})

const resolvedWeight = computed(() => {
  if (props.masteryData?.weight != null) return Number(props.masteryData.weight)
  if (props.expectationWeight != null) return Number(props.expectationWeight)
  return 1.0
})

const emit = defineEmits(['close', 'open-dossier', 'select-assessment'])

const teacherNote = ref('')

// Initialize teacher note from override when opening
watch(() => props.masteryData, (newVal) => {
  if (newVal?.isOverridden) {
    teacherNote.value = newVal.overrideNote || ''
  } else {
    teacherNote.value = ''
  }
}, { immediate: true, deep: true })

const evaluations = computed(() => {
  return props.masteryData?.evaluations || []
})

const isOverridden = computed(() => {
  return !!props.masteryData?.isOverridden
})

const activeScore = computed(() => {
  return props.masteryData?.score != null ? Math.round(props.masteryData.score) : null
})

const activeBadge = computed(() => {
  return props.masteryData?.badge || getSBARLevelBadge(props.masteryData?.score)
})

const activeLevelCode = computed(() => {
  return isOverridden.value ? props.masteryData?.overrideLevel : null
})

const calculatedScore = computed(() => {
  return props.masteryData?.calculatedScore != null 
    ? props.masteryData.calculatedScore 
    : (isOverridden.value ? null : props.masteryData?.score)
})

const calculatedBadge = computed(() => {
  return props.masteryData?.calculatedBadge || (calculatedScore.value != null ? getSBARLevelBadge(calculatedScore.value) : null)
})

const algorithm = computed(() => {
  return activeClassRecord.value?.sbarAlgorithm || activeClassRecord.value?.sbarCalculationAlgorithm || 'decaying_average'
})

const algorithmLabel = computed(() => {
  const map = {
    decaying_average: 'Decaying Average',
    mode: 'Mode (Most Frequent)',
    most_recent: 'Most Recent Attempts',
    power_law: 'Power Law (Marzano)',
    highest: 'Highest Score'
  }
  return map[algorithm.value] || 'Decaying Average'
})

// Organized Level Tiers
const levelTiers = computed(() => {
  return {
    l4: SBAR_LEVELS.filter(l => l.code.startsWith('L4')),
    l3: SBAR_LEVELS.filter(l => l.code.startsWith('L3')),
    l2: SBAR_LEVELS.filter(l => l.code.startsWith('L2')),
    l1: SBAR_LEVELS.filter(l => l.code.startsWith('L1') || l.code === 'R')
  }
})

function formatDate(dStr) {
  if (!dStr) return '—'
  return formatLocalDisplay(dStr)
}

function handleClose() {
  emit('close')
}

function onSelectAssessment(assessmentId) {
  if (assessmentId && !String(assessmentId).startsWith('radial-')) {
    emit('select-assessment', assessmentId)
    emit('close')
  }
}

async function applyOverride(lvl) {
  await saveStudentExpectationOverride(props.studentId, props.expectationCode, {
    level: lvl.code,
    score: lvl.pct,
    note: teacherNote.value
  })
}

async function revertOverride() {
  await saveStudentExpectationOverride(props.studentId, props.expectationCode, null)
  teacherNote.value = ''
}

async function saveNoteIfOverridden() {
  if (isOverridden.value && activeLevelCode.value) {
    await saveStudentExpectationOverride(props.studentId, props.expectationCode, {
      level: activeLevelCode.value,
      score: activeScore.value,
      note: teacherNote.value
    })
  }
}
</script>

<style scoped>
.exp-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  padding: 16px;
}

.exp-modal-container {
  background: var(--surface);
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--border);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 620px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  0% { transform: scale(0.96); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* Header */
.exp-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 22px 14px 22px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.exp-modal-header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.exp-modal-badges-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.exp-code-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--primary, #3b82f6);
  color: #ffffff;
  padding: 2px 8px;
  border-radius: var(--radius-sm, 6px);
  letter-spacing: 0.02em;
}

.exp-unit-pill {
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary, #64748b);
  padding: 2px 8px;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--border);
}

.exp-override-pill {
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
  padding: 2px 8px;
  border-radius: var(--radius-sm, 6px);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.exp-modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.exp-modal-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.exp-student-name-row {
  font-size: 0.88rem;
  color: var(--text);
  margin-top: 2px;
}

.student-label {
  color: var(--text-secondary);
  margin-right: 4px;
}

.student-name {
  color: var(--text);
  font-weight: 700;
}

.exp-modal-close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm, 4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.exp-modal-close-btn:hover {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text);
}

/* Status Banner */
.exp-status-banner {
  background: var(--bg-secondary, #f8fafc);
  padding: 14px 22px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  position: relative;
}

.exp-status-banner--overridden {
  background: rgba(168, 85, 247, 0.08);
  border-bottom-color: rgba(168, 85, 247, 0.25);
}

.status-level-badge {
  font-size: 1.4rem;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: var(--radius-md, 8px);
  letter-spacing: -0.02em;
  display: inline-block;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-info-area {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-headline {
  font-size: 0.95rem;
  color: var(--text);
}

.status-active-label strong {
  font-weight: 800;
}

.status-calc-detail {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.calc-highlight {
  color: var(--text);
  font-weight: 700;
}

.status-actions-area {
  flex-shrink: 0;
}

.revert-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 6px);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.revert-btn:hover {
  background: var(--bg-secondary);
  color: var(--danger, #ef4444);
  border-color: var(--danger, #ef4444);
}

/* Body */
.exp-modal-body {
  padding: 18px 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 4px;
}

.section-title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.section-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Level Tiers Grid */
.level-tiers-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (max-width: 520px) {
  .level-tiers-grid {
    grid-template-columns: 1fr;
  }
}

.tier-group {
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tier-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.tier-buttons {
  display: flex;
  gap: 6px;
}

.level-select-btn {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  min-height: 44px;
}

.level-select-btn:hover {
  border-color: var(--lvl-color);
  background: rgba(0, 0, 0, 0.02);
  transform: translateY(-1px);
}

.level-select-btn--active {
  background: var(--lvl-color) !important;
  border-color: var(--lvl-color) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.level-select-btn--active .lvl-code,
.level-select-btn--active .lvl-pct {
  color: #ffffff !important;
}

.lvl-code {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
}

.lvl-pct {
  font-size: 0.68rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.lvl-check {
  position: absolute;
  top: 3px;
  right: 3px;
}

.override-note-wrap {
  margin-top: 10px;
}

.override-note-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 0.82rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 6px);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}

.override-note-input:focus {
  border-color: var(--primary, #3b82f6);
}

/* Contributing Evaluations */
.evals-empty {
  padding: 16px;
  text-align: center;
  background: var(--bg-secondary, #f8fafc);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.evals-empty p {
  margin: 0;
}

.evals-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}

.eval-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all 0.15s ease;
  gap: 12px;
}

.eval-card:hover {
  border-color: var(--primary, #3b82f6);
  background: var(--bg-secondary, #f8fafc);
  transform: translateX(2px);
}

.eval-card-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.eval-card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.eval-card-name {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text);
}

.eval-type-tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 4px;
}

.eval-type-tag--summative {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.eval-type-tag--formative {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.eval-type-tag--radial {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

.eval-card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.eval-card-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.eval-level-badge {
  font-size: 0.82rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
}

.eval-score-pct {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 34px;
  text-align: right;
}

/* Footer */
.exp-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 22px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary, #f8fafc);
}

.btn-link-dossier {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--primary, #3b82f6);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: var(--radius-sm, 4px);
}

.btn-link-dossier:hover {
  text-decoration: underline;
  background: rgba(59, 130, 246, 0.08);
}

.btn-done {
  padding: 8px 20px;
  background: var(--primary, #3b82f6);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md, 6px);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-done:hover {
  opacity: 0.9;
}

.weight-note-text {
  color: var(--primary, #3b82f6);
  font-weight: 600;
  font-size: 0.78rem;
}
</style>
