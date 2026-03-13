<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="enm-overlay"
      @click.self="onCancel"
      role="dialog"
      aria-modal="true"
      :aria-label="`Add note for ${behaviorCode?.label}`"
    >
      <div class="enm-card" @keydown.esc="onCancel">
        <h2 class="enm-title">
          {{ behaviorCode?.icon }} {{ behaviorCode?.label }}
          <span v-if="studentName" class="enm-title-student">— {{ studentName }}</span>
        </h2>

        <!-- ob/cv Toggle (only for general 'note' code) -->
        <div v-if="isNoteCode" class="enm-toggle-row">
          <span class="enm-toggle-label">Type</span>
          <div class="enm-toggle-group">
            <button
              :class="['enm-toggle-btn', noteType === 'ob' ? 'enm-toggle-btn--active' : '']"
              @click="noteType = 'ob'"
            >Observation</button>
            <button
              :class="['enm-toggle-btn', noteType === 'cv' ? 'enm-toggle-btn--active' : '']"
              @click="noteType = 'cv'"
            >Conversation</button>
          </div>
        </div>

        <!-- Note textarea -->
        <textarea
          ref="textareaRef"
          v-model="noteText"
          class="enm-textarea"
          placeholder="Add a note..."
          rows="4"
          @keydown.esc.prevent="onCancel"
        ></textarea>

        <!-- Actions -->
        <div class="enm-actions">
          <button class="enm-btn enm-btn--primary" @click="onSave">Save</button>
          <button class="enm-btn enm-btn--ghost" @click="onCancel">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * EventNoteModal.vue
 *
 * Captures a note before a requiresNote event is logged.
 * The caller (Dashboard.vue) is responsible for actually calling logEvent
 * after this modal emits 'save'.
 *
 * CLAUDE.md §4: no src/db/ imports.
 */

import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps({
  /** Displayed in the modal title */
  studentName: { type: String, default: '' },
  /** Full code object: { icon, label, category, type, requiresNote } */
  behaviorCode: { type: Object, default: null },
  /** v-model for open/close */
  modelValue: { type: Boolean, required: true },
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const noteText   = ref('')
const noteType   = ref('ob')
const textareaRef = ref(null)

const isNoteCode = computed(() => props.behaviorCode?.key === 'note')

// Autofocus + clear text each time the modal opens
watch(() => props.modelValue, async (open) => {
  if (open) {
    noteText.value = ''
    noteType.value = 'ob'
    await nextTick()
    textareaRef.value?.focus()
  }
})

function onSave() {
  const note = noteText.value.trim()
  if (isNoteCode.value) {
    emit('save', { note, noteType: noteType.value })
  } else {
    emit('save', note)
  }
  emit('update:modelValue', false)
}

function onCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────────────────────────── */
.enm-overlay {
  position:        fixed;
  inset:           0;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index:         1100;
  animation:       enm-fade-in 0.15s ease;
}

@keyframes enm-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Card ─────────────────────────────────────────────────────────── */
.enm-card {
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-md);
  padding:       24px;
  width:         min(480px, 92vw);
  display:       flex;
  flex-direction: column;
  gap:           16px;
  animation:     enm-pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes enm-pop-in {
  from { transform: scale(0.88); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* ── Title ────────────────────────────────────────────────────────── */
.enm-title {
  font-size:   1rem;
  font-weight: 700;
  color:       var(--text);
  margin:      0;
  line-height: 1.3;
}

.enm-title-student {
  font-weight: 500;
  color:       var(--text-secondary);
}

/* ── Textarea ─────────────────────────────────────────────────────── */
.enm-textarea {
  width:         100%;
  min-height:    100px;
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

.enm-textarea:focus {
  outline:      none;
  border-color: var(--primary);
}

/* ── Actions ──────────────────────────────────────────────────────── */
.enm-actions {
  display: flex;
  gap:     10px;
}

.enm-btn {
  flex:          1;
  padding:       12px;
  border-radius: var(--radius-md);
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
  border:        none;
  transition:    opacity 0.15s ease;
}

.enm-btn:active { opacity: 0.8; }

.enm-btn--primary {
  background: var(--primary);
  color:      #fff;
}

.enm-btn--ghost {
  background:   transparent;
  border:       1px solid var(--border);
  color:        var(--text-secondary);
}

/* ── Toggle Row ──────────────────────────────────────────────────── */
.enm-toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: -4px;
}

.enm-toggle-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.enm-toggle-group {
  display: flex;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
  flex: 1;
}

.enm-toggle-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: calc(var(--radius-md) - 2px);
  cursor: pointer;
  transition: all 0.15s ease;
}

.enm-toggle-btn--active {
  background: var(--primary);
  color: #fff;
  box-shadow: var(--shadow-sm);
}
</style>
