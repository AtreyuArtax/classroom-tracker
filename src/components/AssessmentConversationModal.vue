<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="acm-overlay"
      @click.self="onCancel"
      role="dialog"
      aria-modal="true"
      aria-label="Assessment Conversation Modal"
    >
      <div class="acm-card" @keydown.esc="onCancel">
        <!-- Title -->
        <h2 class="acm-title">
          <GraduationCap :size="20" class="acm-title-icon" />
          Assessment Conversation
          <span v-if="studentName" class="acm-title-student">— {{ studentName }}</span>
        </h2>

        <!-- Context Toggle -->
        <div class="acm-field">
          <label class="acm-label">Context</label>
          <div class="acm-toggle-group">
            <button
              :class="['acm-toggle-btn', context === 'after_assessment' ? 'acm-toggle-btn--active' : '']"
              @click="context = 'after_assessment'"
            >After Assessment</button>
            <button
              :class="['acm-toggle-btn', context === 'proactive' ? 'acm-toggle-btn--active' : '']"
              @click="context = 'proactive'"
            >Proactive</button>
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
            >Demonstrates Understanding</button>
            <button
              :class="[
                'acm-toggle-btn', 
                outcome === 'gap_confirmed' ? 'acm-toggle-btn--danger' : ''
              ]"
              @click="outcome = 'gap_confirmed'"
            >Gap Confirmed</button>
            <button
              :class="[
                'acm-toggle-btn', 
                outcome === 'inconclusive' ? 'acm-toggle-btn--warning' : ''
              ]"
              @click="outcome = 'inconclusive'"
            >Inconclusive</button>
          </div>
        </div>

        <!-- Note Textarea -->
        <div class="acm-field">
          <label class="acm-label">Observation Details</label>
          <textarea
            ref="textareaRef"
            v-model="noteText"
            class="acm-textarea"
            placeholder="What did the student say or demonstrate?"
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
          >Save Assessment</button>
          <button class="acm-btn acm-btn--ghost" @click="onCancel">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * AssessmentConversationModal.vue
 *
 * Specialized modal for logging Assessment Conversation (ac) events.
 * Captures context, outcome, and detailed notes.
 */

import { ref, watch, nextTick, computed } from 'vue'
import { GraduationCap } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  studentName: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const context   = ref(null) // 'after_assessment' | 'proactive'
const outcome   = ref(null) // 'demonstrates_understanding' | 'gap_confirmed' | 'inconclusive'
const noteText  = ref('')
const textareaRef = ref(null)

const isFormValid = computed(() => {
  return context.value && outcome.value && noteText.value.trim().length > 0
})

// Reset + focus on open
watch(() => props.modelValue, async (val) => {
  if (val) {
    context.value = null
    outcome.value = null
    noteText.value = ''
    await nextTick()
    textareaRef.value?.focus()
  }
})

function onSave() {
  if (!isFormValid.value) return
  
  emit('save', {
    note: noteText.value.trim(),
    acContext: context.value,
    acOutcome: outcome.value
  })
  emit('update:modelValue', false)
}

function onCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────────────────────────── */
.acm-overlay {
  position:        fixed;
  inset:           0;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index:         1100;
  animation:       acm-fade-in 0.15s ease;
}

@keyframes acm-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Card ─────────────────────────────────────────────────────────── */
.acm-card {
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-md);
  padding:       24px;
  width:         min(520px, 94vw);
  display:       flex;
  flex-direction: column;
  gap:           20px;
  animation:     acm-pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes acm-pop-in {
  from { transform: scale(0.88); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
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
</style>
