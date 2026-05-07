<template>
  <BaseModal
    :show="state.show"
    :max-width="'420px'"
    :show-x="false"
    @close="handleAction(false)"
  >
    <div class="msg-content" @keydown.enter="onEnter" @keydown.esc="handleAction(false)">
      <div class="msg-header">
        <div 
          class="msg-icon-box" 
          :class="{ 
            'msg-icon-box--danger': state.danger,
            'msg-icon-box--info': !state.danger && state.type !== 'prompt',
            'msg-icon-box--prompt': state.type === 'prompt'
          }"
        >
          <AlertTriangle v-if="state.danger" :size="24" />
          <Info v-else-if="state.type === 'alert'" :size="24" />
          <HelpCircle v-else-if="state.type === 'confirm'" :size="24" />
          <Edit3 v-else-if="state.type === 'prompt'" :size="24" />
        </div>
        <h2 class="msg-title">{{ state.title }}</h2>
      </div>

      <div class="msg-body">
        <p class="msg-message">{{ state.message }}</p>

        <!-- Prompt or RequireText Input -->
        <div v-if="state.type === 'prompt' || state.requireText" class="msg-input-area">
          <label v-if="state.requireText" class="msg-label">
            Type <strong>{{ state.requireText }}</strong> to confirm:
          </label>
          <input
            ref="inputRef"
            v-model="state.userInput"
            type="text"
            class="msg-input"
            :placeholder="state.type === 'prompt' ? state.defaultValue : state.requireText"
            @keydown.enter="onEnter"
          />
        </div>
      </div>

      <div class="msg-footer">
        <button 
          v-if="state.type !== 'alert'"
          class="msg-btn msg-btn--ghost" 
          @click="handleAction(false)"
        >
          {{ state.cancelLabel }}
        </button>
        <button 
          class="msg-btn" 
          :class="state.danger ? 'msg-btn--danger' : 'msg-btn--primary'"
          :disabled="isConfirmDisabled"
          @click="handleAction(true)"
        >
          {{ state.confirmLabel }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { AlertTriangle, Info, HelpCircle, Edit3 } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { useMessage } from '../composables/useMessage.js'

const { state, handleAction } = useMessage()
const inputRef = ref(null)

const isConfirmDisabled = computed(() => {
  if (!state.requireText) return false
  return state.userInput !== state.requireText
})

function onEnter() {
  if (!isConfirmDisabled.value) {
    handleAction(true)
  }
}

watch(() => state.show, async (show) => {
  if (show && (state.type === 'prompt' || state.requireText)) {
    await nextTick()
    inputRef.value?.focus()
    if (state.type === 'prompt') {
      inputRef.value?.select()
    }
  }
})
</script>

<style scoped>
.msg-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: msg-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes msg-pop {
  from { transform: scale(0.9) translateY(10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.msg-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.msg-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.msg-icon-box--danger {
  background: color-mix(in srgb, var(--state-out) 15%, white);
  color: var(--state-out);
}

.msg-icon-box--info {
  background: color-mix(in srgb, var(--primary) 15%, white);
  color: var(--primary);
}

.msg-icon-box--prompt {
  background: color-mix(in srgb, #f59e0b 15%, white);
  color: #f59e0b;
}

.msg-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
}

.msg-body {
  text-align: center;
}

.msg-message {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 0;
}

.msg-input-area {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.msg-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.msg-input {
  width: 100%;
  padding: 14px;
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  background: var(--bg-secondary);
  color: var(--text);
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.msg-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--bg);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.msg-footer {
  display: flex;
  gap: 12px;
}

.msg-btn {
  flex: 1;
  padding: 14px;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.msg-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  filter: grayscale(1);
}

.msg-btn--primary {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
}

.msg-btn--danger {
  background: var(--state-out);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
}

.msg-btn--ghost {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.msg-btn:not(:disabled):hover {
  transform: translateY(-2px);
  filter: brightness(1.05);
}

.msg-btn:not(:disabled):active {
  transform: translateY(0);
  filter: brightness(0.95);
}

.msg-btn--ghost:hover {
  background: var(--border);
  color: var(--text);
}
</style>
