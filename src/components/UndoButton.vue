<template>
  <button
    class="undo-btn"
    :class="{ 'undo-btn--disabled': !canUndo }"
    :disabled="!canUndo"
    aria-label="Undo last action"
    @click="onUndo"
  >
    <span class="undo-btn__icon" aria-hidden="true">↩</span>
    <span class="undo-btn__label">Undo</span>
  </button>
</template>

<script setup>
/**
 * UndoButton.vue
 *
 * Always rendered in the Dashboard header.
 * Visually disabled (not hidden) when the undo stack is empty.
 *
 * CLAUDE.md §9:
 *  - Undo button always visible during View A (Dashboard)
 *  - Stack is in-memory only — composable handles all logic
 *  - No direct imports from src/db/
 */

import { useUndo } from '../composables/useUndo.js'

const { undo, canUndo } = useUndo()

async function onUndo() {
  if (!canUndo.value) return
  await undo()
}
</script>

<style scoped>
.undo-btn {
  display:         flex;
  align-items:     center;
  gap:             5px;
  padding:         8px 14px;
  border:          none;
  border-radius:   var(--radius-md);
  background:      var(--surface);
  box-shadow:      var(--shadow-sm);
  cursor:          pointer;
  min-height:      44px;
  min-width:       44px;

  color:           var(--primary);
  font-size:       0.9rem;
  font-weight:     600;

  transition: opacity 0.2s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.undo-btn:active:not(:disabled) {
  transform:  scale(0.95);
  box-shadow: none;
}

.undo-btn--disabled {
  opacity: 0.35;
  cursor:  default;
}

.undo-btn__icon {
  font-size: 1.1rem;
  line-height: 1;
}

.undo-btn__label {
  font-size: 0.85rem;
}
</style>
