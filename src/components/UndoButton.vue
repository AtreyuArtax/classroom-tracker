<template>
  <Transition name="fade-undo">
    <button
      v-if="canUndo"
      class="undo-btn"
      aria-label="Undo last action"
      @click="onUndo"
    >
      <span class="undo-btn__icon" aria-hidden="true">↩</span>
      <span class="undo-btn__label">Undo</span>
    </button>
  </Transition>
</template>

<script setup>
/**
 * UndoButton.vue
 *
 * Rendered in the Dashboard header.
 * Conditionally visible only when the undo stack contains reversible actions.
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

.undo-btn:hover {
  background: var(--surface-hover, rgba(0, 0, 0, 0.04));
}

.undo-btn:active {
  transform:  scale(0.95);
  box-shadow: none;
}

.undo-btn__icon {
  font-size: 1.1rem;
}

.fade-undo-enter-active,
.fade-undo-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-undo-enter-from,
.fade-undo-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
