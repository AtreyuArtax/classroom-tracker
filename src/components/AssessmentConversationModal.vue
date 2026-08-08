<template>
  <BaseModal
    :show="modelValue"
    @close="onCancel"
    max-width="620px"
  >
    <template #header>
      <h2 class="acm-title">
        <GraduationCap :size="20" class="acm-title-icon" />
        {{ initialData ? 'Edit' : 'Assessment' }} {{ acType === 'observation' ? 'Observation' : 'Conversation' }}
        <span v-if="studentName" class="acm-title-student">— {{ studentName }}</span>
        <span v-if="studentGradeLevel" class="acm-title-grade-badge">{{ studentGradeLevel }}</span>
      </h2>
    </template>

    <div class="acm-content">
      <!-- Optional Strand & Expectation Selection -->
      <div v-if="availableUnits.length" class="acm-field-group">
        <div class="acm-field-row">
          <!-- Strand / Unit Selector -->
          <div class="acm-field">
            <label class="acm-label">Strand / Unit (Optional)</label>
            <select v-model="selectedUnitId" class="acm-select" @change="selectedExpectationId = null">
              <option :value="null">General / No Strand</option>
              <option v-for="unit in availableUnits" :key="unit.unitId" :value="unit.unitId">
                {{ unit.name }}
              </option>
            </select>
          </div>

          <!-- Specific Expectation Selector -->
          <div class="acm-field" v-if="selectedUnitId && unitExpectations.length">
            <label class="acm-label">Specific Expectation (Optional)</label>
            <select v-model="selectedExpectationId" class="acm-select">
              <option :value="null">None / General Strand Comment</option>
              <option 
                v-for="exp in unitExpectations" 
                :key="exp.expectationId || exp.code" 
                :value="exp.expectationId || exp.code"
              >
                {{ exp.code }}: {{ truncateExpectation(exp.description) }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="selectedExpectationObj" class="acm-exp-preview">
          <span class="acm-exp-preview-code">{{ selectedExpectationObj.code }}</span>
          <span class="acm-exp-preview-desc">{{ selectedExpectationObj.description }}</span>
        </div>
      </div>

      <!-- Type Toggle (Observation vs Conversation) -->
      <div class="acm-field">
        <label class="acm-label">Evidence Type</label>
        <div class="acm-toggle-group">
          <button
            :class="['acm-toggle-btn', acType === 'conversation' ? 'acm-toggle-btn--active' : '']"
            @click="acType = 'conversation'"
          >Conversation</button>
          <button
            :class="['acm-toggle-btn', acType === 'observation' ? 'acm-toggle-btn--active' : '']"
            @click="acType = 'observation'"
          >Observation</button>
        </div>
      </div>

      <!-- Context Toggle -->
      <div class="acm-field">
        <label class="acm-label">Context</label>
        <div class="acm-toggle-group">
          <button
            :class="['acm-toggle-btn', context === 'proactive' ? 'acm-toggle-btn--active' : '']"
            @click="context = 'proactive'"
          >Proactive</button>
          <button
            :class="['acm-toggle-btn', context === 'after_assessment' ? 'acm-toggle-btn--active' : '']"
            @click="context = 'after_assessment'"
          >After Assessment</button>
        </div>
      </div>

      <!-- Outcome Toggle -->
      <div class="acm-field">
        <label class="acm-label">Outcome</label>
        <div class="acm-toggle-group">
          <button
            :class="[
              'acm-toggle-btn', 
              outcome === 'demonstrates_understanding' ? 'acm-toggle-btn--success' : ''
            ]"
            @click="outcome = 'demonstrates_understanding'"
          >Mastered</button>
          <button
            :class="[
              'acm-toggle-btn', 
              outcome === 'inconclusive' ? 'acm-toggle-btn--warning' : ''
            ]"
            @click="outcome = 'inconclusive'"
          >Developing</button>
          <button
            :class="[
              'acm-toggle-btn', 
              outcome === 'gap_confirmed' ? 'acm-toggle-btn--danger' : ''
            ]"
            @click="outcome = 'gap_confirmed'"
          >Needs Support</button>
          <button
            :class="[
              'acm-toggle-btn', 
              outcome === 'remediation_required' ? 'acm-toggle-btn--danger-dark' : ''
            ]"
            @click="outcome = 'remediation_required'"
          >Insufficient (R)</button>
        </div>
      </div>

      <!-- Note Textarea -->
      <div class="acm-field">
        <label class="acm-label">{{ acType === 'observation' ? 'Observation' : 'Conversation' }} Details</label>
        <textarea
          ref="textareaRef"
          v-model="noteText"
          class="acm-textarea"
          :placeholder="acType === 'observation' ? 'What was demonstrated?' : 'What did the student say?'"
          rows="3"
          @keydown.esc.prevent="onCancel"
        ></textarea>
      </div>

      <!-- Next Steps Textarea -->
      <div class="acm-field">
        <label class="acm-label">Next Steps (Optional)</label>
        <textarea
          v-model="nextStepsText"
          class="acm-textarea"
          placeholder="What is the plan for this student on this topic?"
          rows="2"
          @keydown.esc.prevent="onCancel"
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="acm-actions">
        <button 
          class="acm-btn acm-btn--primary" 
          :disabled="!isFormValid"
          @click="onSave"
        >Save Evidence</button>
        <button class="acm-btn acm-btn--ghost" @click="onCancel">Cancel</button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
/**
 * AssessmentConversationModal.vue
 *
 * Specialized modal for logging Assessment (ac) events.
 * Captures type (Observation/Conversation), context, outcome, and detailed notes.
 */

import { ref, watch, nextTick, computed } from 'vue'
import { GraduationCap } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { getEffectiveClassRecord } from '../composables/useElementary.js'
import { activeSubjectId } from '../composables/useClassroomState.js'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  studentId: { type: String, default: '' },
  studentName: { type: String, default: '' },
  activeClass: { type: Object, default: () => null },
  initialData: { type: Object, default: () => null }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const acType    = ref('conversation') // 'observation' | 'conversation'
const context   = ref('proactive') // 'after_assessment' | 'proactive'
const outcome   = ref(null) // 'demonstrates_understanding' | 'gap_confirmed' | 'inconclusive'
const noteText  = ref('')
const nextStepsText = ref('')
const textareaRef = ref(null)

const selectedSubjectId = ref(null)
const selectedUnitId = ref(null)
const selectedExpectationId = ref(null)

const targetStudentObj = computed(() => {
  if (!props.activeClass?.students || !props.studentId) return null
  return props.activeClass.students[props.studentId] || null
})

const studentGradeLevel = computed(() => {
  return targetStudentObj.value?.gradeLevel || null
})

const effectiveClass = computed(() => {
  if (!props.activeClass) return null
  if (props.activeClass.classType === 'elementary') {
    return getEffectiveClassRecord(props.activeClass, selectedSubjectId.value)
  }
  return props.activeClass
})

const availableUnits = computed(() => {
  const cls = effectiveClass.value
  if (!cls) return []

  const targetGrade = studentGradeLevel.value ? studentGradeLevel.value.toLowerCase() : null
  const unitMap = {}

  // 1. Gather from gradebookUnits (Strands)
  if (cls.gradebookUnits && Array.isArray(cls.gradebookUnits)) {
    cls.gradebookUnits.forEach(u => {
      const uGrade = u.gradeLevel || (u.name && u.name.includes('Grade 7') ? 'Grade 7' : (u.name && u.name.includes('Grade 8') ? 'Grade 8' : ''))
      
      if (targetGrade && uGrade && uGrade.toLowerCase() !== targetGrade) {
        return
      }

      const validExps = (u.expectations || []).filter(e => {
        if (!e.code) return false
        const eGrade = e.gradeLevel || uGrade
        if (targetGrade && eGrade && eGrade.toLowerCase() !== targetGrade) return false
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

const selectedUnit = computed(() => {
  if (!availableUnits.value?.length || !selectedUnitId.value) return null
  return availableUnits.value.find(u => u.unitId === selectedUnitId.value)
})

const unitExpectations = computed(() => {
  const rawExps = selectedUnit.value?.expectations || []
  const hasSpecifics = rawExps.some(e => e.code && e.code.includes('.'))
  if (hasSpecifics) {
    return rawExps.filter(e => e.code && e.code.includes('.'))
  }
  return rawExps
})

const selectedExpectationObj = computed(() => {
  if (!selectedExpectationId.value || !unitExpectations.value?.length) return null
  return unitExpectations.value.find(e => (e.expectationId || e.code) === selectedExpectationId.value)
})

const isFormValid = computed(() => {
  return context.value && outcome.value && noteText.value.trim().length > 0
})

// Reset + focus on open
watch(() => props.modelValue, async (val) => {
  if (val) {
    if (props.activeClass?.classType === 'elementary') {
      const subs = props.activeClass.subjects || []
      selectedSubjectId.value = props.initialData?.subjectId || activeSubjectId.value || subs[0]?.subjectId || null
    } else {
      selectedSubjectId.value = null
    }

    if (props.initialData) {
      acType.value = props.initialData.acType || 'observation'
      context.value = props.initialData.acContext || null
      outcome.value = props.initialData.acOutcome || null
      noteText.value = props.initialData.note || ''
      nextStepsText.value = props.initialData.nextSteps || ''
      selectedUnitId.value = props.initialData.unitId || null
      selectedExpectationId.value = props.initialData.expectationId || null
    } else {
      acType.value = 'conversation'
      context.value = 'proactive'
      outcome.value = null
      noteText.value = ''
      nextStepsText.value = ''
      selectedUnitId.value = null
      selectedExpectationId.value = null
    }
    await nextTick()
    textareaRef.value?.focus()
  }
}, { immediate: true })

function truncateExpectation(desc, maxLen = 60) {
  if (!desc) return ''
  if (desc.length <= maxLen) return desc
  return desc.slice(0, maxLen) + '...'
}

function onSave() {
  if (!isFormValid.value) return
  
  emit('save', {
    note: noteText.value.trim(),
    acType: acType.value,
    acContext: context.value,
    acOutcome: outcome.value,
    subjectId: selectedSubjectId.value,
    unitId: selectedUnitId.value,
    expectationId: selectedExpectationId.value,
    nextSteps: nextStepsText.value.trim()
  })
  emit('update:modelValue', false)
}

function onCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ── Content ─────────────────────────────────────────────────────────── */
.acm-content {
  display:       flex;
  flex-direction: column;
  gap:           20px;
}

/* ── Title ────────────────────────────────────────────────────────── */
.acm-title {
  display:     flex;
  align-items: center;
  gap:         10px;
  font-size:   1.1rem;
  font-weight: 700;
  color:       var(--text);
  margin:      0;
}

.acm-title-icon {
  color: var(--primary);
}

.acm-title-student {
  font-weight: 500;
  color:       var(--text-secondary);
}

.acm-title-grade-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.3);
  margin-left: 4px;
}

/* ── Form Fields ──────────────────────────────────────────────────── */
.acm-field {
  display:       flex;
  flex-direction: column;
  gap:           8px;
}

.acm-label {
  font-size:      0.75rem;
  font-weight:    700;
  color:          var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Toggles ──────────────────────────────────────────────────────── */
.acm-toggle-group {
  display:    flex;
  background: var(--bg-secondary);
  padding:    4px;
  border-radius: var(--radius-md);
  gap:        4px;
}

.acm-toggle-btn {
  flex:          1;
  padding:       10px 4px;
  border:        none;
  background:    transparent;
  font-size:     0.8rem;
  font-weight:   600;
  color:         var(--text-secondary);
  border-radius: calc(var(--radius-md) - 2px);
  cursor:        pointer;
  transition:    all 0.15s ease;
  line-height:   1.2;
}

.acm-toggle-btn--active {
  background: var(--primary);
  color:      #fff;
  box-shadow: var(--shadow-sm);
}

/* Semantic Toggles */
.acm-toggle-btn--success {
  background: #34c759;
  color:      #fff;
  box-shadow: var(--shadow-sm);
}

.acm-toggle-btn--danger {
  background: #ff3b30;
  color:      #fff;
  box-shadow: var(--shadow-sm);
}

.acm-toggle-btn--danger-dark {
  background: #af1911;
  color:      #fff;
  box-shadow: var(--shadow-sm);
}

.acm-toggle-btn--warning {
  background: #ff9500;
  color:      #fff;
  box-shadow: var(--shadow-sm);
}

/* ── Textarea ─────────────────────────────────────────────────────── */
.acm-textarea {
  width:         100%;
  padding:       12px;
  border:        1px solid var(--border);
  border-radius: var(--radius-sm);
  background:    var(--bg-secondary);
  font-size:     0.9rem;
  color:         var(--text);
  resize:        vertical;
  font-family:   inherit;
  line-height:   1.5;
  box-sizing:    border-box;
  transition:    border-color 0.15s ease;
}

.acm-textarea:focus {
  outline:      none;
  border-color: var(--primary);
}

/* ── Actions ──────────────────────────────────────────────────────── */
.acm-actions {
  display: flex;
  gap:     12px;
  margin-top: 8px;
}

.acm-btn {
  flex:          1;
  padding:       12px;
  border-radius: var(--radius-md);
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
  border:        none;
  transition:    all 0.15s ease;
}

.acm-btn:disabled {
  opacity: 0.5;
  cursor:  not-allowed;
}

.acm-btn:active:not(:disabled) {
  opacity: 0.8;
}

.acm-btn--primary {
  background: var(--primary);
  color:      #fff;
}

.acm-btn--ghost {
  background:   transparent;
  border:       1px solid var(--border);
  color:        var(--text-secondary);
}

/* Select and row layouts */
.acm-field-row {
  display: flex;
  gap: 12px;
}

.acm-field-row > .acm-field {
  flex: 1;
}

.acm-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  font-size: 0.85rem;
  color: var(--text);
  font-weight: 600;
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.acm-select:focus {
  border-color: var(--primary);
}

.acm-exp-preview {
  margin-top: 10px;
  padding: 10px 14px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  line-height: 1.45;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.acm-exp-preview-code {
  font-weight: 700;
  color: var(--primary);
  background: rgba(52, 152, 219, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.acm-exp-preview-desc {
  color: var(--text);
  flex: 1;
}
</style>
