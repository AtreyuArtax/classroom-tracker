<template>
  <div class="cllm-modal__backdrop" @click.self="$emit('close')">
    <div class="cllm-modal__dialog">
      <!-- Header -->
      <div class="cllm-modal__header">
        <div class="cllm-modal__header-info">
          <div class="cllm-modal__header-icon">
            <Sparkles :size="20" />
          </div>
          <div>
            <h3 class="cllm-modal__title">Local AI Comment Rephraser</h3>
            <p class="cllm-modal__subtitle">100% Private & Offline • Zero student data leaves your device</p>
          </div>
        </div>
        <button 
          type="button" 
          class="cllm-modal__close-btn" 
          aria-label="Close dialog"
          @click="$emit('close')"
        >
          <X :size="18" />
        </button>
      </div>

      <!-- Privacy Callout Banner -->
      <div class="cllm-modal__privacy-banner">
        <ShieldCheck :size="18" class="cllm-modal__privacy-icon" />
        <div class="cllm-modal__privacy-text">
          <strong>District-Safe & MFIPPA/FERPA Compliant:</strong>
          These AI models run entirely in your local browser tab using WebGPU. No names, grades, or student records are ever transmitted over the internet. Once downloaded, it works completely offline without Wi-Fi.
        </div>
      </div>

      <!-- Hardware & Driver Capabilities -->
      <div class="cllm-modal__hardware-bar">
        <div class="cllm-modal__hw-item">
          <span class="cllm-modal__hw-label">WebGPU Acceleration:</span>
          <span 
            class="cllm-modal__hw-badge"
            :class="llmState.hasWebGPU ? 'cllm-modal__hw-badge--success' : 'cllm-modal__hw-badge--warn'"
          >
            {{ llmState.hasWebGPU ? (llmState.hasF16 ? 'Enabled (Fast 16-bit)' : 'Enabled (32-bit)') : 'Not Detected' }}
          </span>
        </div>
        <div class="cllm-modal__hw-item">
          <span class="cllm-modal__hw-label">Chrome Built-in AI:</span>
          <span 
            class="cllm-modal__hw-badge"
            :class="llmState.hasChromeNano ? 'cllm-modal__hw-badge--success' : 'cllm-modal__hw-badge--muted'"
          >
            {{ llmState.hasChromeNano ? 'Available' : 'Unavailable (Board Policy)' }}
          </span>
        </div>
      </div>

      <!-- Loading / Progress State -->
      <div v-if="llmState.status === 'loading'" class="cllm-modal__progress-panel">
        <div class="cllm-modal__progress-header">
          <span class="cllm-modal__progress-label">
            Initializing {{ llmState.activeModelName }}...
          </span>
          <span class="cllm-modal__progress-pct">{{ llmState.progress }}%</span>
        </div>
        <div class="cllm-modal__progress-track">
          <div 
            class="cllm-modal__progress-fill" 
            :style="{ width: `${llmState.progress}%` }"
          />
        </div>
        <p class="cllm-modal__progress-subtext">
          {{ llmState.progressText || 'Downloading and compiling WebGPU shaders in browser memory...' }}
        </p>
      </div>

      <!-- Error State Notice -->
      <div v-if="llmState.status === 'error'" class="cllm-modal__error-banner">
        <AlertCircle :size="16" />
        <span>{{ llmState.lastError || 'An error occurred while initializing the model.' }}</span>
      </div>

      <!-- Model Selection Grid -->
      <div class="cllm-modal__models-list">
        <!-- Model 1: Qwen 2.5 (0.5B) -->
        <div 
          class="cllm-card"
          :class="{
            'cllm-card--active': llmState.activeModelKey === 'qwen-0.5b' && llmState.status === 'ready',
            'cllm-card--cached': isCached('qwen-0.5b')
          }"
        >
          <div class="cllm-card__top">
            <div class="cllm-card__title-wrap">
              <span class="cllm-card__name">Qwen 2.5 (0.5B-Instruct)</span>
              <span class="cllm-card__badge cllm-card__badge--green">Ultra-Light (~350 MB)</span>
            </div>
            <span v-if="llmState.activeModelKey === 'qwen-0.5b' && llmState.status === 'ready'" class="cllm-card__status-active">
              ● Active in Memory
            </span>
            <span v-else-if="isCached('qwen-0.5b')" class="cllm-card__status-cached">
              ✓ Cached on Laptop
            </span>
          </div>

          <p class="cllm-card__desc">
            Fastest initialization, minimal memory footprint. Perfect for standard school-issued work laptops and battery life.
          </p>

          <div class="cllm-card__footer">
            <div class="cllm-card__specs">
              <span>RAM: ~500 MB</span>
              <span>•</span>
              <span>Speed: ~1.0s / comment</span>
            </div>

            <div class="cllm-card__actions">
              <button
                v-if="isCached('qwen-0.5b')"
                type="button"
                class="cllm-btn cllm-btn--danger-icon"
                title="Delete model from browser storage to free ~350 MB"
                :disabled="isLoading"
                @click="onPurgeCache('qwen-0.5b')"
              >
                <Trash2 :size="14" />
              </button>

              <button
                type="button"
                class="cllm-btn"
                :class="(llmState.activeModelKey === 'qwen-0.5b' && llmState.status === 'ready') ? 'cllm-btn--success' : 'cllm-btn--primary'"
                :disabled="isLoading || (llmState.activeModelKey === 'qwen-0.5b' && llmState.status === 'ready') || !llmState.hasWebGPU"
                @click="onSelectModel('qwen-0.5b')"
              >
                <span v-if="llmState.activeModelKey === 'qwen-0.5b' && llmState.status === 'ready'">Active</span>
                <span v-else-if="isCached('qwen-0.5b')">Load Model</span>
                <span v-else>Download & Load (~350 MB)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Model 2: Llama 3.2 (1B) -->
        <div 
          class="cllm-card"
          :class="{
            'cllm-card--active': llmState.activeModelKey === 'llama-1b' && llmState.status === 'ready',
            'cllm-card--cached': isCached('llama-1b')
          }"
        >
          <div class="cllm-card__top">
            <div class="cllm-card__title-wrap">
              <span class="cllm-card__name">Llama 3.2 (1B-Instruct)</span>
              <span class="cllm-card__badge cllm-card__badge--blue">High Quality (~750 MB)</span>
            </div>
            <span v-if="llmState.activeModelKey === 'llama-1b' && llmState.status === 'ready'" class="cllm-card__status-active">
              ● Active in Memory
            </span>
            <span v-else-if="isCached('llama-1b')" class="cllm-card__status-cached">
              ✓ Cached on Laptop
            </span>
          </div>

          <p class="cllm-card__desc">
            Meta's edge-optimized instruction model. Highest vocabulary diversity, smoothest phrasing, and strictest length adherence.
          </p>

          <div class="cllm-card__footer">
            <div class="cllm-card__specs">
              <span>RAM: ~1.0 GB</span>
              <span>•</span>
              <span>Speed: ~1.8s / comment</span>
            </div>

            <div class="cllm-card__actions">
              <button
                v-if="isCached('llama-1b')"
                type="button"
                class="cllm-btn cllm-btn--danger-icon"
                title="Delete model from browser storage to free ~750 MB"
                :disabled="isLoading"
                @click="onPurgeCache('llama-1b')"
              >
                <Trash2 :size="14" />
              </button>

              <button
                type="button"
                class="cllm-btn"
                :class="(llmState.activeModelKey === 'llama-1b' && llmState.status === 'ready') ? 'cllm-btn--success' : 'cllm-btn--primary'"
                :disabled="isLoading || (llmState.activeModelKey === 'llama-1b' && llmState.status === 'ready') || !llmState.hasWebGPU"
                @click="onSelectModel('llama-1b')"
              >
                <span v-if="llmState.activeModelKey === 'llama-1b' && llmState.status === 'ready'">Active</span>
                <span v-else-if="isCached('llama-1b')">Load Model</span>
                <span v-else>Download & Load (~750 MB)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Model 3: Chrome Gemini Nano -->
        <div 
          class="cllm-card"
          :class="{
            'cllm-card--active': llmState.activeModelKey === 'chrome-nano' && llmState.status === 'ready',
            'cllm-card--disabled': !llmState.hasChromeNano
          }"
        >
          <div class="cllm-card__top">
            <div class="cllm-card__title-wrap">
              <span class="cllm-card__name">Chrome Built-in AI (Gemini Nano)</span>
              <span class="cllm-card__badge cllm-card__badge--purple">Zero Download (0 MB)</span>
            </div>
            <span v-if="llmState.activeModelKey === 'chrome-nano' && llmState.status === 'ready'" class="cllm-card__status-active">
              ● Active in Memory
            </span>
          </div>

          <p class="cllm-card__desc">
            Direct access to Chrome's native on-device model. Zero download overhead.
            <span v-if="!llmState.hasChromeNano" class="cllm-card__disabled-note">
              (Unavailable on this device or restricted by school board Chrome policy)
            </span>
          </p>

          <div class="cllm-card__footer">
            <div class="cllm-card__specs">
              <span>RAM: Managed by Chrome</span>
              <span>•</span>
              <span>Speed: ~0.8s / comment</span>
            </div>

            <div class="cllm-card__actions">
              <button
                type="button"
                class="cllm-btn"
                :class="(llmState.activeModelKey === 'chrome-nano' && llmState.status === 'ready') ? 'cllm-btn--success' : 'cllm-btn--secondary'"
                :disabled="!llmState.hasChromeNano || isLoading || (llmState.activeModelKey === 'chrome-nano' && llmState.status === 'ready')"
                @click="onSelectModel('chrome-nano')"
              >
                <span v-if="llmState.activeModelKey === 'chrome-nano' && llmState.status === 'ready'">Active</span>
                <span v-else-if="llmState.hasChromeNano">Use Chrome AI</span>
                <span v-else>Not Supported</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dialog Footer -->
      <div class="cllm-modal__footer">
        <button
          v-if="llmState.status === 'ready'"
          type="button"
          class="cllm-btn cllm-btn--outline"
          :disabled="isLoading"
          @click="onUnload"
        >
          Unload from RAM
        </button>
        <div style="flex: 1;" />
        <button
          type="button"
          class="cllm-btn cllm-btn--done"
          @click="$emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import {
  Sparkles,
  ShieldCheck,
  X,
  AlertCircle,
  Trash2
} from 'lucide-vue-next'

import {
  llmState,
  detectHardwareCapabilities,
  loadModel,
  unloadModel,
  purgeModelFromCache
} from '../../utils/localLlmService.js'

defineEmits(['close'])

const isLoading = computed(() => llmState.status === 'loading')

function isCached(key) {
  return llmState.cachedModelKeys.includes(key)
}

onMounted(async () => {
  await detectHardwareCapabilities()
})

async function onSelectModel(key) {
  try {
    await loadModel(key)
  } catch (err) {
    console.error('Model load failed:', err)
  }
}

async function onUnload() {
  await unloadModel()
}

async function onPurgeCache(key) {
  if (confirm(`Remove this model from browser storage to free up disk space? You can redownload it anytime.`)) {
    await purgeModelFromCache(key)
  }
}
</script>

<style scoped>
.cllm-modal__backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.cllm-modal__dialog {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 640px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
}

.cllm-modal__header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cllm-modal__header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cllm-modal__header-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f0fdf4;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cllm-modal__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.cllm-modal__subtitle {
  font-size: 0.8rem;
  color: #64748b;
  margin: 2px 0 0;
}

.cllm-modal__close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
}
.cllm-modal__close-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

/* Privacy Banner */
.cllm-modal__privacy-banner {
  margin: 16px 20px 0;
  padding: 12px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.cllm-modal__privacy-icon {
  color: #16a34a;
  flex-shrink: 0;
  margin-top: 1px;
}

.cllm-modal__privacy-text {
  font-size: 0.78rem;
  line-height: 1.4;
  color: #166534;
}

/* Hardware Bar */
.cllm-modal__hardware-bar {
  margin: 12px 20px 0;
  display: flex;
  gap: 16px;
  font-size: 0.78rem;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
}

.cllm-modal__hw-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cllm-modal__hw-label {
  color: #64748b;
  font-weight: 500;
}

.cllm-modal__hw-badge {
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.cllm-modal__hw-badge--success {
  background: #dcfce7;
  color: #15803d;
}
.cllm-modal__hw-badge--warn {
  background: #fef3c7;
  color: #b45309;
}
.cllm-modal__hw-badge--muted {
  background: #e2e8f0;
  color: #64748b;
}

/* Progress */
.cllm-modal__progress-panel {
  margin: 14px 20px 0;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.cllm-modal__progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 6px;
}

.cllm-modal__progress-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.cllm-modal__progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.2s ease;
}

.cllm-modal__progress-subtext {
  font-size: 0.72rem;
  color: #64748b;
  margin: 6px 0 0;
}

.cllm-modal__error-banner {
  margin: 14px 20px 0;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Models List */
.cllm-modal__models-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cllm-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  background: #ffffff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cllm-card:hover {
  border-color: #cbd5e1;
}
.cllm-card--active {
  border-color: #10b981;
  background: #f0fdf4;
}
.cllm-card--disabled {
  opacity: 0.6;
  background: #f8fafc;
}

.cllm-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.cllm-card__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cllm-card__name {
  font-size: 0.92rem;
  font-weight: 600;
  color: #0f172a;
}

.cllm-card__badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.cllm-card__badge--green {
  background: #dcfce7;
  color: #15803d;
}
.cllm-card__badge--blue {
  background: #dbeafe;
  color: #1d4ed8;
}
.cllm-card__badge--purple {
  background: #f3e8ff;
  color: #7e22ce;
}

.cllm-card__status-active {
  font-size: 0.72rem;
  color: #10b981;
  font-weight: 700;
}
.cllm-card__status-cached {
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}

.cllm-card__desc {
  font-size: 0.78rem;
  color: #475569;
  line-height: 1.4;
  margin: 0 0 10px;
}

.cllm-card__disabled-note {
  color: #94a3b8;
  display: block;
  margin-top: 2px;
}

.cllm-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.cllm-card__specs {
  display: flex;
  gap: 6px;
  font-size: 0.72rem;
  color: #94a3b8;
}

.cllm-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Buttons */
.cllm-btn {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.15s;
}
.cllm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cllm-btn--primary {
  background: #2563eb;
  color: #ffffff;
}
.cllm-btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.cllm-btn--success {
  background: #10b981;
  color: #ffffff;
}

.cllm-btn--secondary {
  background: #f1f5f9;
  color: #334155;
  border-color: #cbd5e1;
}
.cllm-btn--secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.cllm-btn--outline {
  background: transparent;
  border-color: #cbd5e1;
  color: #475569;
}
.cllm-btn--outline:hover:not(:disabled) {
  background: #f8fafc;
}

.cllm-btn--danger-icon {
  background: #fee2e2;
  border-color: #fecaca;
  color: #dc2626;
  padding: 6px;
  display: flex;
}
.cllm-btn--danger-icon:hover:not(:disabled) {
  background: #fca5a5;
}

.cllm-btn--done {
  background: #0f172a;
  color: #ffffff;
}
.cllm-btn--done:hover {
  background: #1e293b;
}

.cllm-modal__footer {
  padding: 12px 20px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}
</style>
