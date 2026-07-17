<template>
  <BaseModal
    :show="modelValue"
    @close="onCancel"
    max-width="520px"
  >
    <template #header>
      <h2 class="acm-title">
        <GraduationCap :size="20" class="acm-title-icon" />
        {{ initialData ? 'Edit' : 'Assessment' }} {{ acType === 'observation' ? 'Observation' : 'Conversation' }}
        <span v-if="studentName" class="acm-title-student">— {{ studentName }}</span>
      </h2>
    </template>

    <div class="acm-content">
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
        </div>
      </div>

      <!-- Optional Unit & Expectation Selection -->
      <div v-if="activeClass?.gradebookUnits?.length" class="acm-field-row">
        <div class="acm-field">
          <label class="acm-label">Unit (Optional)</label>
          <select v-model="selectedUnitId" class="acm-select" @change="selectedExpectationId = null">
            <option :value="null">General / No Unit</option>
            <option v-for="unit in activeClass.gradebookUnits" :key="unit.unitId" :value="unit.unitId">
              {{ unit.name }}
            </option>
          </select>
        </div>

        <div class="acm-field" v-if="selectedUnitId && unitExpectations.length">
          <label class="acm-label">Expectation (Optional)</label>
          <select v-model="selectedExpectationId" class="acm-select">
            <option :value="null">None / General Unit Comment</option>
            <option v-for="exp in unitExpectations" :key="exp.expectationId" :value="exp.expectationId">
              {{ exp.code }}: {{ exp.description }}
            </option>
          </select>
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

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  studentName: { type: String, default: '' },
  activeClass: { type: Object, default: () => null },
  initialData: { type: Object, default: () => null }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const acType    = ref('conversation') // 'observation' | 'conversation'
const context   = ref('proactive') // 'after_assessment' | 'proactive'
const outcome   = ref(null) // 'demonstrates_understanding' | 'gap_confirmed' | 'inconclusive'
const noteText  = ref('')
const textareaRef = ref(null)

const selectedUnitId = ref(null)
const selectedExpectationId = ref(null)

const selectedUnit = computed(() => {
  if (!props.activeClass?.gradebookUnits || !selectedUnitId.value) return null
  return props.activeClass.gradebookUnits.find(u => u.unitId === selectedUnitId.value)
})

const unitExpectations = computed(() => {
  return selectedUnit.value?.expectations || []
})

const isFormValid = computed(() => {
  return context.value && outcome.value && noteText.value.trim().length > 0
})

// Reset + focus on open
watch(() => props.modelValue, async (val) => {
  if (val) {
    if (props.initialData) {
      acType.value = props.initialData.acType || 'observation'
      context.value = props.initialData.acContext || null
      outcome.value = props.initialData.acOutcome || null
      noteText.value = props.initialData.note || ''
      selectedUnitId.value = props.initialData.unitId || null
      selectedExpectationId.value = props.initialData.expectationId || null
    } else {
      acType.value = 'conversation'
      context.value = 'proactive'
      outcome.value = null
      noteText.value = ''
      selectedUnitId.value = null
      selectedExpectationId.value = null
    }
    await nextTick()
    textareaRef.value?.focus()
  }
}, { immediate: true })

function onSave() {
  if (!isFormValid.value) return
  
  emit('save', {
    note: noteText.value.trim(),
    acType: acType.value,
    acContext: context.value,
    acOutcome: outcome.value,
    unitId: selectedUnitId.value,
    expectationId: selectedExpectationId.value
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
</style>
