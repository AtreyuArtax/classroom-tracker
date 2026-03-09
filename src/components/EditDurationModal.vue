<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="edm-overlay"
      @click.self="close"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edm-title"
    >
      <div class="edm-card">
        <div class="edm-header">
          <h2 id="edm-title" class="edm-title">Edit Duration</h2>
          <button class="edm-close" aria-label="Close dialog" @click="close"><X :size="18" /></button>
        </div>

        <div class="edm-body">
          <label class="edm-label" for="duration-input">
            Duration (minutes)
          </label>
          <input
            id="duration-input"
            ref="inputRef"
            v-model.number="localMinutes"
            type="number"
            class="edm-input"
            min="0"
            step="1"
            placeholder="e.g. 5"
            @keyup.enter="save"
          />
        </div>

        <div class="edm-footer">
          <button class="edm-btn edm-btn--ghost" @click="close">Cancel</button>
          <button class="edm-btn edm-btn--primary" @click="save" :disabled="!isValid">Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * EditDurationModal.vue
 *
 * Small inline modal to handle editing an event's duration (in minutes).
 * Emits 'save' with the integer minutes, or 'update:modelValue' false to close.
 */
import { ref, watch, computed, nextTick } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  initialMinutes: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'save'])

const localMinutes = ref(0)
const inputRef     = ref(null)

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    localMinutes.value = props.initialMinutes
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  } else {
    localMinutes.value = 0
  }
})

const isValid = computed(() => {
  return typeof localMinutes.value === 'number' && localMinutes.value >= 0
})

function save() {
  if (!isValid.value) return
  emit('save', Math.floor(localMinutes.value))
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.edm-overlay {
  position:        fixed;
  inset:           0;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  z-index:         2000;
  animation:       edm-fade-in 0.18s ease;
}

@keyframes edm-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.edm-card {
  background:     var(--surface);
  border-radius:  var(--radius-lg);
  box-shadow:     var(--shadow-md);
  width:          min(320px, 90vw);
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
  animation:      edm-pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes edm-pop-in {
  from { transform: scale(0.92); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.edm-header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         16px 20px;
  border-bottom:   1px solid var(--border);
}

.edm-title {
  font-size:   1rem;
  font-weight: 700;
  color:       var(--text);
  margin:      0;
}

.edm-close {
  width:         32px;
  height:        32px;
  border:        none;
  background:    var(--bg-secondary);
  border-radius: 50%;
  cursor:        pointer;
  display:       flex;
  align-items:   center;
  justify-content: center;
  color:         var(--text-secondary);
  transition:    background 0.15s ease;
}

.edm-close:hover { background: var(--border); }

.edm-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edm-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.edm-input {
  width:         100%;
  padding:       12px;
  border:        1px solid var(--border);
  border-radius: var(--radius-sm);
  background:    var(--bg-secondary);
  font-size:     1.1rem;
  color:         var(--text);
  box-sizing:    border-box;
  transition:    border-color 0.15s ease;
  text-align:    center;
}

.edm-input:focus {
  outline:      none;
  border-color: var(--primary);
}

.edm-footer {
  display:         flex;
  gap:             10px;
  padding:         16px 20px;
  background:      var(--bg-secondary);
  border-top:      1px solid var(--border);
  justify-content: flex-end;
}

.edm-btn {
  padding:       10px 18px;
  border-radius: var(--radius-sm);
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  border:        none;
  transition:    all 0.15s ease;
}

.edm-btn:disabled {
  opacity: 0.5;
  cursor:  not-allowed;
}

.edm-btn--ghost {
  background: transparent;
  color:      var(--text-secondary);
}

.edm-btn--ghost:not(:disabled):hover {
  background: var(--border);
  color:      var(--text);
}

.edm-btn--primary {
  background: var(--primary);
  color:      #fff;
}

.edm-btn--primary:not(:disabled):hover {
  background: var(--primary-dark);
}
</style>
