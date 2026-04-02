<template>
  <Teleport to="body">
    <Transition name="bm-fade">
      <div 
        v-if="show" 
        class="bm-overlay"
        :class="{ 'bm-overlay--clickable': closeOnBackdrop }"
        @click="onBackdropClick"
        role="dialog" 
        aria-modal="true"
      >
        <!-- Unstyled mode for custom shapes like Radial Menu -->
        <template v-if="unstyled">
          <slot></slot>
        </template>

        <!-- Standard Card mode -->
        <div 
          v-else
          class="bm-card" 
          :style="{ maxWidth }"
          @keydown.esc="emit('close')"
          @click.stop
        >
          <!-- Optional Header -->
          <header v-if="title || $slots.header" class="bm-header">
            <slot name="header">
              <h3 class="bm-title">{{ title }}</h3>
            </slot>
            <button 
              v-if="showX" 
              class="bm-x-btn" 
              @click="emit('close')"
              aria-label="Close modal"
            >
              <X :size="20" />
            </button>
          </header>

          <!-- Main Content -->
          <div class="bm-body">
            <slot></slot>
          </div>

          <!-- Optional Footer -->
          <footer v-if="$slots.footer" class="bm-footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, required: true },
  title: { type: String, default: '' },
  showX: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: false },
  unstyled: { type: Boolean, default: false },
  maxWidth: { type: String, default: '500px' },
})

const emit = defineEmits(['close'])

function onBackdropClick() {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}

function handleEsc(e) {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc)
})
</script>

<style scoped>
.bm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
}

.bm-overlay--clickable {
  cursor: pointer;
}

.bm-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  width: min(100%, 95vw);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: default;
  animation: bm-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes bm-pop-in {
  from { transform: scale(0.95) translateY(10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.bm-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bm-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.bm-x-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s, color 0.2s;
}

.bm-x-btn:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.bm-body {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: 85vh;
}

.bm-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 1rem;
}

/* Transitions */
.bm-fade-enter-active,
.bm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.bm-fade-enter-from,
.bm-fade-leave-to {
  opacity: 0;
}
</style>
