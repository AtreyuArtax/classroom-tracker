<template>
  <button
    class="undo-btn"
    :class="{ 
      'undo-btn--dashboard': variant === 'dashboard',
      'undo-btn--disabled': !canUndo
    }"
    :disabled="!canUndo"
    :title="canUndo ? 'Undo last action (⌘Z / Ctrl+Z)' : 'Nothing to undo (⌘Z / Ctrl+Z)'"
    aria-label="Undo last action"
    @click="onUndo"
  >
    <Undo2 :size="variant === 'dashboard' ? 18 : 16" class="undo-btn__icon" />
  </button>
</template>

<script setup>
/**
 * UndoButton.vue
 *
 * Permanent, compact icon button.
 * Always present in fixed slot; disabled/muted when stack is empty to prevent layout shifts.
 */

import { Undo2 } from 'lucide-vue-next'
import { useUndo } from '../composables/useUndo.js'

defineProps({
  variant: {
    type: String,
    default: 'toolbar' // 'toolbar' | 'dashboard'
  }
})

const { undo, canUndo } = useUndo()

async function onUndo() {
  if (!canUndo.value) return
  await undo()
}
</script>

<style scoped>
.undo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: all 0.15s ease;
}

.undo-btn:hover:not(:disabled) {
  background: var(--surface-hover, rgba(0, 0, 0, 0.04));
  border-color: var(--primary-light, rgba(37, 99, 235, 0.35));
  color: var(--primary-dark, var(--primary));
  transform: scale(1.04);
}

.undo-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.undo-btn--disabled,
.undo-btn:disabled {
  opacity: 0.35;
  cursor: default;
  color: var(--text-secondary);
  border-color: var(--border);
  background: var(--surface);
}

.undo-btn--dashboard {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
}

.undo-btn--dashboard:hover:not(:disabled) {
  background: var(--surface-hover, var(--surface));
  color: var(--primary);
  border-color: var(--primary-light, rgba(37, 99, 235, 0.35));
}

.undo-btn--dashboard.undo-btn--disabled {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  opacity: 0.35;
}
</style>
