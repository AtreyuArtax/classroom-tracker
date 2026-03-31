<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="scm-overlay"
      @click.self="onCancel"
      role="dialog"
      aria-modal="true"
    >
      <div class="scm-card" @keydown.esc="onCancel">
        <div class="scm-header">
          <AlertTriangle v-if="danger" class="scm-icon scm-icon--danger" :size="24" />
          <Info v-else class="scm-icon scm-icon--info" :size="24" />
          <h2 class="scm-title">{{ title }}</h2>
        </div>

        <p class="scm-message">{{ message }}</p>

        <div v-if="requireText" class="scm-prompt">
          <label class="scm-label">Type <strong>{{ requireText }}</strong> to proceed:</label>
          <input
            ref="inputRef"
            v-model="userInput"
            type="text"
            class="scm-input"
            :placeholder="requireText"
            @keydown.enter="onConfirm"
          />
        </div>

        <div class="scm-actions">
          <button
            class="scm-btn"
            :class="[danger ? 'scm-btn--danger' : 'scm-btn--primary']"
            :disabled="isConfirmDisabled"
            @click="onConfirm"
          >
            {{ confirmLabel }}
          </button>
          <button class="scm-btn scm-btn--ghost" @click="onCancel">
            {{ cancelLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { AlertTriangle, Info } from 'lucide-vue-next'

const props = defineProps({
  modelValue:   { type: Boolean, required: true },
  title:        { type: String,  default: 'Confirm Action' },
  message:      { type: String,  default: 'Are you sure you want to proceed?' },
  requireText:  { type: String,  default: '' },
  confirmLabel: { type: String,  default: 'Confirm' },
  cancelLabel:  { type: String,  default: 'Cancel' },
  danger:       { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const userInput = ref('')
const inputRef  = ref(null)

const isConfirmDisabled = computed(() => {
  if (!props.requireText) return false
  return userInput.value !== props.requireText
})

watch(() => props.modelValue, async (open) => {
  if (open) {
    userInput.value = ''
    await nextTick()
    inputRef.value?.focus()
  }
})

function onConfirm() {
  if (isConfirmDisabled.value) return
  emit('confirm')
  emit('update:modelValue', false)
}

function onCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.scm-overlay {
  position:        fixed;
  inset:           0;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index:         2000;
  animation:       scm-fade-in 0.2s ease;
}

@keyframes scm-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.scm-card {
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-lg);
  border:        1px solid var(--border);
  padding:       28px;
  width:         min(420px, 92vw);
  display:       flex;
  flex-direction: column;
  gap:           20px;
  animation:     scm-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scm-pop-in {
  from { transform: scale(0.9) translateY(10px); opacity: 0; }
  to   { transform: scale(1)   translateY(0);    opacity: 1; }
}

.scm-header {
  display:     flex;
  align-items: center;
  gap:         12px;
}

.scm-title {
  font-size:   1.2rem;
  font-weight: 700;
  color:       var(--text);
  margin:      0;
}

.scm-icon--danger { color: var(--state-out); }
.scm-icon--info { color: var(--primary); }

.scm-message {
  font-size:   0.95rem;
  line-height: 1.5;
  color:       var(--text-secondary);
  margin:      0;
}

.scm-prompt {
  display:       flex;
  flex-direction: column;
  gap:           8px;
}

.scm-label {
  font-size: 0.85rem;
  color:     var(--text-secondary);
}

.scm-input {
  width:         100%;
  padding:       12px;
  background:    var(--bg-secondary);
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  color:         var(--text);
  font-size:     1rem;
  font-family:   monospace;
  letter-spacing: 0.05em;
  box-sizing:    border-box;
}

.scm-input:focus {
  outline:      none;
  border-color: var(--primary);
  box-shadow:   0 0 0 2px rgba(var(--primary-rgb), 0.1);
}

.scm-actions {
  display: flex;
  gap:     12px;
  margin-top: 4px;
}

.scm-btn {
  flex:          1;
  padding:       12px;
  border-radius: var(--radius-md);
  font-size:     0.95rem;
  font-weight:   600;
  cursor:        pointer;
  border:        none;
  transition:    all 0.2s ease;
}

.scm-btn:disabled {
  opacity: 0.4;
  cursor:  not-allowed;
  filter:  grayscale(1);
}

.scm-btn--primary {
  background: var(--primary);
  color:      #fff;
}

.scm-btn--danger {
  background: var(--state-out);
  color:      #fff;
}

.scm-btn--ghost {
  background: transparent;
  border:     1px solid var(--border);
  color:      var(--text-secondary);
}

.scm-btn:not(:disabled):hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}
</style>
