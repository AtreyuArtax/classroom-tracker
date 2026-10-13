<template>
  <Teleport to="body">
    <div 
      class="cllm-modal__backdrop" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="cllm-modal-title"
      @click.self="$emit('close')"
    >
      <div class="cllm-modal__dialog" @click.stop>
        <!-- Header -->
        <div class="cllm-modal__header">
          <div class="cllm-modal__header-info">
            <div class="cllm-modal__header-icon">
              <Sparkles :size="20" />
            </div>
            <div>
              <h3 id="cllm-modal-title" class="cllm-modal__title">Local AI Comment Assistant</h3>
              <p class="cllm-modal__subtitle">100% Private &amp; Offline • Zero student data leaves your device</p>
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

        <!-- Tab Navigation Bar -->
        <div class="cllm-tabs">
          <button
            type="button"
            class="cllm-tab-btn"
            :class="{ 'cllm-tab-btn--active': activeTab === 'models' }"
            @click="activeTab = 'models'"
          >
            <Cpu :size="15" />
            <span>Models &amp; Storage</span>
          </button>
          <button
            type="button"
            class="cllm-tab-btn"
            :class="{ 'cllm-tab-btn--active': activeTab === 'prompts' }"
            @click="activeTab = 'prompts'"
          >
            <SlidersHorizontal :size="15" />
            <span>Prompt &amp; Temperature</span>
          </button>
        </div>

        <!-- Temporary Feedback Toast -->
        <div v-if="feedbackMessage" class="cllm-feedback-toast" :class="`cllm-feedback-toast--${feedbackType}`">
          <Check v-if="feedbackType === 'success'" :size="15" />
          <Info v-else :size="15" />
          <span>{{ feedbackMessage }}</span>
        </div>

        <!-- ════════════════════════════════════════════════════════════════════ -->
        <!-- TAB 1: MODELS & OFFLINE STORAGE                                    -->
        <!-- ════════════════════════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'models'" class="cllm-tab-content">
          <!-- Privacy Callout Banner -->
          <div class="cllm-modal__privacy-banner">
            <ShieldCheck :size="18" class="cllm-modal__privacy-icon" />
            <div class="cllm-modal__privacy-text">
              <strong>District-Safe &amp; MFIPPA/FERPA Compliant:</strong>
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
                    <span v-else>Download &amp; Load (~350 MB)</span>
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
                    <span v-else>Download &amp; Load (~750 MB)</span>
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
        </div>

        <!-- ════════════════════════════════════════════════════════════════════ -->
        <!-- TAB 2: PROMPT & TEMPERATURE TUNING                                 -->
        <!-- ════════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'prompts'" class="cllm-tab-content">
          <!-- 1. TEMPERATURE CARD -->
          <div class="cllm-config-card">
            <div class="cllm-config-card__header">
              <div class="cllm-config-card__title-row">
                <SlidersHorizontal :size="16" class="cllm-config-card__icon" />
                <h4 class="cllm-config-card__title">Response Temperature (Creativity vs. Precision)</h4>
              </div>
              <span class="cllm-temp-badge">{{ currentTemperature.toFixed(2) }}</span>
            </div>

            <p class="cllm-config-card__subtext">
              Controls randomness in comment phrasing. Lower values ensure strict adherence to character limits and factual evidence; higher values offer varied phrasing.
            </p>

            <div class="cllm-slider-row">
              <input 
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                :value="currentTemperature"
                class="cllm-slider"
                @input="handleTemperatureSlider"
              />
            </div>

            <!-- Temperature Presets -->
            <div class="cllm-temp-pills">
              <button
                type="button"
                class="cllm-temp-pill"
                :class="{ 'cllm-temp-pill--active': Math.abs(currentTemperature - 0.20) < 0.01 }"
                @click="onSetTemp(0.20)"
              >
                Precise (0.20)
              </button>
              <button
                type="button"
                class="cllm-temp-pill"
                :class="{ 'cllm-temp-pill--active': Math.abs(currentTemperature - 0.30) < 0.01 }"
                @click="onSetTemp(0.30)"
              >
                Balanced (0.30) • Default
              </button>
              <button
                type="button"
                class="cllm-temp-pill"
                :class="{ 'cllm-temp-pill--active': Math.abs(currentTemperature - 0.60) < 0.01 }"
                @click="onSetTemp(0.60)"
              >
                Varied (0.60)
              </button>
            </div>

            <!-- Temperature Warning if > 0.70 -->
            <div v-if="currentTemperature > 0.70" class="cllm-temp-warn">
              <AlertCircle :size="15" />
              <span>High temperatures (&gt;0.70) may cause small on-device models to ramble or exceed district character limits.</span>
            </div>
          </div>

          <!-- 2. PRESET SELECTION & ACTION BAR -->
          <div class="cllm-config-card">
            <div class="cllm-config-card__header">
              <div class="cllm-config-card__title-row">
                <FileText :size="16" class="cllm-config-card__icon" />
                <h4 class="cllm-config-card__title">Prompt Presets</h4>
              </div>
              <div class="cllm-preset-actions">
                <button
                  type="button"
                  class="cllm-btn cllm-btn--ghost"
                  title="Share or Export current preset"
                  @click="openShareModal"
                >
                  <Download :size="13" /> Share / Export
                </button>
                <button
                  type="button"
                  class="cllm-btn cllm-btn--ghost"
                  title="Import preset from colleague"
                  @click="showImportModal = true"
                >
                  <Upload :size="13" /> Import
                </button>
                <button
                  type="button"
                  class="cllm-btn cllm-btn--ghost-danger"
                  title="Reset all prompts and temperature to factory default"
                  @click="onResetToFactoryDefault"
                >
                  <RotateCcw :size="13" /> Reset to Default
                </button>
              </div>
            </div>

            <!-- Preset Dropdown -->
            <div class="cllm-preset-selector-row">
              <label class="cllm-field-label">Active Prompt Style:</label>
              <select 
                class="cllm-select"
                :value="activePresetId"
                @change="onPresetChange($event.target.value)"
              >
                <optgroup label="Ontario Standard Presets (Built-in)">
                  <option 
                    v-for="p in builtinPresets" 
                    :key="p.id" 
                    :value="p.id"
                  >
                    {{ p.name }} ({{ p.badge }})
                  </option>
                </optgroup>
                <optgroup v-if="customPresetsList.length > 0" label="Custom Presets">
                  <option 
                    v-for="p in customPresetsList" 
                    :key="p.id" 
                    :value="p.id"
                  >
                    {{ p.name }}
                  </option>
                </optgroup>
              </select>

              <button
                type="button"
                class="cllm-btn cllm-btn--primary"
                @click="startNewPreset"
              >
                <Plus :size="14" />
                <span>New Preset</span>
              </button>
            </div>

            <!-- Current Preset Details & Editor -->
            <div class="cllm-preset-editor">
              <div class="cllm-preset-editor__top">
                <div class="cllm-field-group cllm-field-group--flex">
                  <label class="cllm-field-label">Preset Name:</label>
                  <input
                    v-model="editorPresetName"
                    type="text"
                    class="cllm-input"
                    :disabled="isEditingBuiltin"
                    placeholder="e.g. Inquiry-Driven Science"
                  />
                </div>
                <span v-if="isEditingBuiltin" class="cllm-builtin-badge">
                  Built-in Standard
                </span>
                <span v-else class="cllm-custom-badge">
                  Custom Preset
                </span>
              </div>

              <!-- Layer 1: Custom Teacher Directives (Recommended) -->
              <div class="cllm-field-group">
                <div class="cllm-field-label-row">
                  <label class="cllm-field-label">
                    Teacher Directives &amp; Pedagogical Directives (Injected into Prompt):
                  </label>
                  <span class="cllm-field-hint">Ontario Growing Success guardrails remain active</span>
                </div>
                <textarea
                  v-model="editorDirectives"
                  rows="3"
                  class="cllm-textarea"
                  placeholder="e.g. Frame all next steps around student self-regulation and inquiry skills. Use warm, growth-mindset language."
                />

                <!-- Quick Directive Inspiration Chips -->
                <div class="cllm-directive-chips">
                  <span class="cllm-chips-label">Insert goal:</span>
                  <button
                    type="button"
                    class="cllm-chip-btn"
                    @click="appendDirective('Highlight student initiative, inquiry questions, and laboratory precision.')"
                  >
                    + Scientific Inquiry
                  </button>
                  <button
                    type="button"
                    class="cllm-chip-btn"
                    @click="appendDirective('Use encouraging growth-mindset phrasing highlighting persistence and self-advocacy.')"
                  >
                    + Growth Mindset
                  </button>
                  <button
                    type="button"
                    class="cllm-chip-btn"
                    @click="appendDirective('Focus actionable next steps on consistent daily agenda use and time management.')"
                  >
                    + Time Management
                  </button>
                  <button
                    type="button"
                    class="cllm-chip-btn"
                    @click="appendDirective('Use clear, accessible vocabulary tailored for bilingual or newcomer parents.')"
                  >
                    + ELL / Clear English
                  </button>
                </div>
              </div>

              <!-- Layer 2: Advanced Full System Prompt Accordion -->
              <div class="cllm-accordion">
                <button
                  type="button"
                  class="cllm-accordion-btn"
                  @click="showFullPromptTemplate = !showFullPromptTemplate"
                >
                  <span>Advanced: Customize Full System Prompt Template</span>
                  <ChevronUp v-if="showFullPromptTemplate" :size="16" />
                  <ChevronDown v-else :size="16" />
                </button>

                <div v-if="showFullPromptTemplate" class="cllm-accordion-content">
                  <p class="cllm-accordion-hint">
                    Power users can customize the complete underlying LLM instructions. Supported template variables:
                    <code>&#123;&#123;studentName&#125;&#125;</code>, 
                    <code>&#123;&#123;pronouns&#125;&#125;</code>, 
                    <code>&#123;&#123;charLimit&#125;&#125;</code>, 
                    <code>&#123;&#123;subjectName&#125;&#125;</code>.
                  </p>
                  <textarea
                    v-model="editorCustomTemplate"
                    rows="8"
                    class="cllm-textarea cllm-textarea--code"
                    :placeholder="defaultSystemPromptTemplate"
                  />
                  <div class="cllm-template-actions">
                    <button
                      type="button"
                      class="cllm-btn cllm-btn--ghost"
                      @click="editorCustomTemplate = defaultSystemPromptTemplate"
                    >
                      <RotateCcw :size="12" /> Revert Template to Ontario Standard
                    </button>
                  </div>
                </div>
              </div>

              <!-- Preset Editor Actions -->
              <div class="cllm-editor-actions">
                <button
                  v-if="!isEditingBuiltin"
                  type="button"
                  class="cllm-btn cllm-btn--danger-icon"
                  title="Delete this custom preset"
                  @click="onDeletePreset(activePresetId)"
                >
                  <Trash2 :size="14" />
                </button>

                <button
                  type="button"
                  class="cllm-btn cllm-btn--ghost"
                  title="Restore prompt instructions to Ontario Standard"
                  @click="onResetCurrentPromptToDefault"
                >
                  <RotateCcw :size="13" /> Reset Prompt to Default
                </button>

                <div style="flex: 1;" />

                <button
                  v-if="isEditingBuiltin"
                  type="button"
                  class="cllm-btn cllm-btn--primary"
                  @click="saveAsNewPreset"
                >
                  <span>Save as New Custom Preset</span>
                </button>
                <button
                  v-else
                  type="button"
                  class="cllm-btn cllm-btn--success"
                  @click="saveCurrentPreset"
                >
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Dialog Footer -->
        <div class="cllm-modal__footer">
          <button
            v-if="activeTab === 'models' && llmState.status === 'ready'"
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

        <!-- ════════════════════════════════════════════════════════════════════ -->
        <!-- SUB-MODAL: SHARE / EXPORT PRESET                                   -->
        <!-- ════════════════════════════════════════════════════════════════════ -->
        <div v-if="showShareModal" class="cllm-submodal-backdrop" @click.self="showShareModal = false">
          <div class="cllm-submodal">
            <div class="cllm-submodal__header">
              <h4>Share Prompt Preset</h4>
              <button type="button" class="cllm-modal__close-btn" @click="showShareModal = false">
                <X :size="16" />
              </button>
            </div>
            <p class="cllm-submodal__text">
              Share <strong>{{ activePreset.name }}</strong> with other teachers in your department. They can import it into their own browser in one click.
            </p>

            <div class="cllm-submodal__code-wrap">
              <pre class="cllm-submodal__code">{{ shareJsonString }}</pre>
            </div>

            <div class="cllm-submodal__footer">
              <button type="button" class="cllm-btn cllm-btn--secondary" @click="downloadJsonFile">
                <Download :size="14" /> Download .json File
              </button>
              <button type="button" class="cllm-btn cllm-btn--primary" @click="copyShareCode">
                <Copy :size="14" /> Copy Share Code
              </button>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════════ -->
        <!-- SUB-MODAL: IMPORT PRESET                                           -->
        <!-- ════════════════════════════════════════════════════════════════════ -->
        <div v-if="showImportModal" class="cllm-submodal-backdrop" @click.self="showImportModal = false">
          <div class="cllm-submodal">
            <div class="cllm-submodal__header">
              <h4>Import Prompt Preset</h4>
              <button type="button" class="cllm-modal__close-btn" @click="showImportModal = false">
                <X :size="16" />
              </button>
            </div>
            <p class="cllm-submodal__text">
              Paste the share code JSON string or upload a preset JSON file from a colleague.
            </p>

            <div class="cllm-submodal__file-drop">
              <input
                type="file"
                accept=".json,application/json"
                @change="handleFileUpload"
              />
            </div>

            <textarea
              v-model="importJsonString"
              rows="5"
              class="cllm-textarea cllm-textarea--code"
              placeholder="Or paste preset JSON here..."
            />

            <div class="cllm-submodal__footer">
              <button type="button" class="cllm-btn cllm-btn--outline" @click="showImportModal = false">
                Cancel
              </button>
              <button type="button" class="cllm-btn cllm-btn--primary" :disabled="!importJsonString.trim()" @click="onConfirmImport">
                <Upload :size="14" /> Import Preset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Sparkles,
  ShieldCheck,
  X,
  AlertCircle,
  Trash2,
  Cpu,
  SlidersHorizontal,
  RotateCcw,
  Download,
  Upload,
  Copy,
  Check,
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-vue-next'

import {
  llmState,
  detectHardwareCapabilities,
  loadModel,
  unloadModel,
  purgeModelFromCache,
  getDefaultSecondarySystemPrompt
} from '../../utils/localLlmService.js'

import {
  currentTemperature,
  activePresetId,
  customPresets,
  allPresets,
  activePreset,
  initAiPrompts,
  setTemperature,
  selectPreset,
  saveCustomPreset,
  deleteCustomPreset,
  resetToDefaults,
  exportPresetJson,
  downloadPresetFile,
  importPreset
} from '../../composables/useAiPrompts.js'

const emit = defineEmits(['close'])

const activeTab = ref('models') // 'models' | 'prompts'
const isLoading = computed(() => llmState.status === 'loading')

// Preset editing local draft state
const editorPresetName = ref('')
const editorDirectives = ref('')
const editorCustomTemplate = ref('')
const showFullPromptTemplate = ref(false)

// Modals & Feedback
const showShareModal = ref(false)
const showImportModal = ref(false)
const importJsonString = ref('')
const feedbackMessage = ref('')
const feedbackType = ref('success') // 'success' | 'info'
let feedbackTimer = null

const builtinPresets = computed(() => allPresets.value.filter(p => p.isBuiltin))
const customPresetsList = computed(() => allPresets.value.filter(p => !p.isBuiltin))
const isEditingBuiltin = computed(() => activePreset.value?.isBuiltin === true)

const defaultSystemPromptTemplate = computed(() => {
  return getDefaultSecondarySystemPrompt({
    charLimit: '{{charLimit}}',
    studentName: '{{studentName}}',
    pronounInstruction: '{{pronounInstruction}}'
  })
})

const shareJsonString = computed(() => {
  return exportPresetJson(activePreset.value)
})

function showFeedback(msg, type = 'success') {
  feedbackMessage.value = msg
  feedbackType.value = type
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    feedbackMessage.value = ''
  }, 3500)
}

function syncEditorWithActive() {
  const p = activePreset.value
  if (!p) return
  editorPresetName.value = p.name || ''
  editorDirectives.value = p.customDirectives || ''
  editorCustomTemplate.value = p.customSystemPrompt || ''
}

watch(activePreset, () => {
  syncEditorWithActive()
}, { immediate: true })

function isCached(key) {
  return llmState.cachedModelKeys.includes(key)
}

function handleEsc(e) {
  if (e.key === 'Escape') {
    if (showShareModal.value) {
      showShareModal.value = false
      return
    }
    if (showImportModal.value) {
      showImportModal.value = false
      return
    }
    emit('close')
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleEsc)
  await Promise.all([
    detectHardwareCapabilities(),
    initAiPrompts()
  ])
  syncEditorWithActive()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc)
  clearTimeout(feedbackTimer)
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

// ── Temperature Control ──

async function handleTemperatureSlider(e) {
  const val = parseFloat(e.target.value)
  await setTemperature(val)
}

async function onSetTemp(val) {
  await setTemperature(val)
  showFeedback(`Temperature set to ${val.toFixed(2)}`)
}

// ── Preset Actions ──

async function onPresetChange(id) {
  await selectPreset(id)
  syncEditorWithActive()
}

function startNewPreset() {
  editorPresetName.value = 'My Custom Style'
  editorDirectives.value = ''
  editorCustomTemplate.value = ''
  showFeedback('Enter custom directives and click "Save as New Custom Preset".', 'info')
}

function appendDirective(text) {
  if (editorDirectives.value.includes(text)) return
  if (editorDirectives.value.trim()) {
    editorDirectives.value = `${editorDirectives.value.trim()}\n${text}`
  } else {
    editorDirectives.value = text
  }
}

async function saveCurrentPreset() {
  try {
    await saveCustomPreset({
      id: activePresetId.value,
      name: editorPresetName.value,
      temperature: currentTemperature.value,
      customDirectives: editorDirectives.value,
      customSystemPrompt: editorCustomTemplate.value
    })
    showFeedback('Preset saved successfully!')
  } catch (err) {
    alert(`Could not save preset: ${err.message}`)
  }
}

async function saveAsNewPreset() {
  try {
    const baseName = editorPresetName.value ? `${editorPresetName.value} (Custom)` : 'Custom Preset'
    await saveCustomPreset({
      name: baseName,
      temperature: currentTemperature.value,
      customDirectives: editorDirectives.value,
      customSystemPrompt: editorCustomTemplate.value
    })
    showFeedback('Created new custom preset!')
  } catch (err) {
    alert(`Could not save new preset: ${err.message}`)
  }
}

async function onDeletePreset(id) {
  if (confirm(`Delete the custom preset "${activePreset.value?.name}"?`)) {
    await deleteCustomPreset(id)
    showFeedback('Preset deleted.')
  }
}

async function onResetCurrentPromptToDefault() {
  editorDirectives.value = ''
  editorCustomTemplate.value = ''
  if (!isEditingBuiltin.value) {
    await saveCurrentPreset()
  }
  showFeedback('Prompt reset to standard Ontario default.')
}

async function onResetToFactoryDefault() {
  if (confirm('Reset temperature, prompt styles, and active preset back to default Ontario settings?')) {
    await resetToDefaults()
    syncEditorWithActive()
    showFeedback('All AI settings reset to Ontario factory default.')
  }
}

// ── Sharing / Export / Import ──

function openShareModal() {
  showShareModal.value = true
}

async function copyShareCode() {
  try {
    await navigator.clipboard.writeText(shareJsonString.value)
    showFeedback('Preset share code copied to clipboard!')
    showShareModal.value = false
  } catch (err) {
    alert('Failed to copy to clipboard.')
  }
}

function downloadJsonFile() {
  downloadPresetFile(activePreset.value)
  showFeedback('Preset file downloaded!')
  showShareModal.value = false
}

function handleFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    importJsonString.value = evt.target?.result || ''
  }
  reader.readAsText(file)
}

async function onConfirmImport() {
  try {
    const imported = await importPreset(importJsonString.value)
    showImportModal.value = false
    importJsonString.value = ''
    showFeedback(`Imported "${imported.name}" successfully!`)
  } catch (err) {
    alert(`Import failed: ${err.message}`)
  }
}
</script>

<style scoped>
.cllm-modal__backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: cllm-fade-in 0.2s ease-out;
}

@keyframes cllm-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cllm-modal__dialog {
  background: var(--surface);
  color: var(--text);
  border-radius: var(--radius-lg, 16px);
  width: 100%;
  max-width: 660px;
  box-shadow: var(--shadow-2xl, 0 20px 25px -5px rgba(0, 0, 0, 0.3));
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  border: 1px solid var(--border);
  animation: cllm-pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes cllm-pop-in {
  from { transform: scale(0.96) translateY(8px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.cllm-modal__header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.cllm-modal__header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cllm-modal__header-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm, 8px);
  background: var(--color-success-bg, rgba(50, 215, 75, 0.15));
  color: var(--color-success, #32d74b);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cllm-modal__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.cllm-modal__subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 2px 0 0;
}

.cllm-modal__close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, color 0.15s;
}
.cllm-modal__close-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

/* Tabs */
.cllm-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  padding: 0 16px;
  flex-shrink: 0;
}

.cllm-tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.15s, border-color 0.15s;
}
.cllm-tab-btn:hover {
  color: var(--text);
}
.cllm-tab-btn--active {
  color: var(--color-primary, #3b82f6);
  border-bottom-color: var(--color-primary, #3b82f6);
}

.cllm-tab-content {
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Feedback Toast */
.cllm-feedback-toast {
  padding: 8px 16px;
  margin: 10px 20px -6px;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cllm-feedback-toast--success {
  background: var(--color-success-bg, rgba(50, 215, 75, 0.15));
  color: var(--color-success, #32d74b);
  border: 1px solid rgba(50, 215, 75, 0.3);
}
.cllm-feedback-toast--info {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

/* Privacy Banner */
.cllm-modal__privacy-banner {
  padding: 12px 14px;
  background: var(--color-success-bg, rgba(50, 215, 75, 0.12));
  border: 1px solid rgba(50, 215, 75, 0.3);
  border-radius: var(--radius-sm, 8px);
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.cllm-modal__privacy-icon {
  color: var(--color-success, #32d74b);
  flex-shrink: 0;
  margin-top: 1px;
}
.cllm-modal__privacy-text {
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--text);
}

/* Hardware Bar */
.cllm-modal__hardware-bar {
  display: flex;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
}
.cllm-modal__hw-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}
.cllm-modal__hw-label {
  color: var(--text-secondary);
}
.cllm-modal__hw-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
}
.cllm-modal__hw-badge--success {
  background: rgba(50, 215, 75, 0.15);
  color: var(--color-success, #32d74b);
}
.cllm-modal__hw-badge--warn {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}
.cllm-modal__hw-badge--muted {
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-secondary);
}

/* Progress Panel */
.cllm-modal__progress-panel {
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
}
.cllm-modal__progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 8px;
}
.cllm-modal__progress-track {
  width: 100%;
  height: 6px;
  background: var(--border);
  border-radius: 9999px;
  overflow: hidden;
}
.cllm-modal__progress-fill {
  height: 100%;
  background: var(--color-primary, #3b82f6);
  transition: width 0.2s ease;
}
.cllm-modal__progress-subtext {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 6px 0 0;
}

/* Error Banner */
.cllm-modal__error-banner {
  padding: 10px 14px;
  background: var(--color-danger-bg, rgba(239, 68, 68, 0.12));
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--color-danger, #ef4444);
  border-radius: var(--radius-sm, 8px);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Model Cards List */
.cllm-modal__models-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cllm-card {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 10px);
  background: var(--surface);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cllm-card--active {
  border-color: var(--color-success, #32d74b);
  background: rgba(50, 215, 75, 0.03);
}
.cllm-card--cached {
  border-color: rgba(59, 130, 246, 0.4);
}
.cllm-card--disabled {
  opacity: 0.6;
}
.cllm-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.cllm-card__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cllm-card__name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text);
}
.cllm-card__badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
}
.cllm-card__badge--green {
  background: rgba(50, 215, 75, 0.15);
  color: var(--color-success, #32d74b);
}
.cllm-card__badge--blue {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}
.cllm-card__badge--purple {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}
.cllm-card__status-active {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-success, #32d74b);
}
.cllm-card__status-cached {
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
}
.cllm-card__desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0 0 10px;
}
.cllm-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cllm-card__specs {
  display: flex;
  gap: 6px;
  font-size: 0.74rem;
  color: var(--text-secondary);
}
.cllm-card__actions {
  display: flex;
  gap: 8px;
}

/* Config Cards (Tab 2) */
.cllm-config-card {
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 10px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cllm-config-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cllm-config-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cllm-config-card__icon {
  color: var(--color-primary, #3b82f6);
}
.cllm-config-card__title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text);
}
.cllm-config-card__subtext {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}
.cllm-temp-badge {
  font-size: 0.85rem;
  font-weight: 800;
  padding: 2px 9px;
  border-radius: 9999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--color-primary, #3b82f6);
}
.cllm-slider-row {
  width: 100%;
}
.cllm-slider {
  width: 100%;
  accent-color: var(--color-primary, #3b82f6);
  cursor: pointer;
}
.cllm-temp-pills {
  display: flex;
  gap: 8px;
}
.cllm-temp-pill {
  flex: 1;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.cllm-temp-pill:hover {
  border-color: var(--text-secondary);
  color: var(--text);
}
.cllm-temp-pill--active {
  background: rgba(59, 130, 246, 0.12);
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}
.cllm-temp-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.3);
  color: #ca8a04;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.76rem;
}

/* Preset Controls */
.cllm-preset-actions {
  display: flex;
  gap: 6px;
}
.cllm-preset-selector-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cllm-field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}
.cllm-field-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
}
.cllm-select {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.84rem;
}

/* Preset Editor Box */
.cllm-preset-editor {
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cllm-preset-editor__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cllm-field-group--flex {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.cllm-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.84rem;
}
.cllm-builtin-badge, .cllm-custom-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  white-space: nowrap;
}
.cllm-builtin-badge {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}
.cllm-custom-badge {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

.cllm-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cllm-field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cllm-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.82rem;
  font-family: inherit;
  line-height: 1.45;
  resize: vertical;
}
.cllm-textarea--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.76rem;
}

/* Directive Chips */
.cllm-directive-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}
.cllm-chips-label {
  font-size: 0.72rem;
  color: var(--text-secondary);
}
.cllm-chip-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 9999px;
  font-size: 0.72rem;
  padding: 2px 8px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s;
}
.cllm-chip-btn:hover {
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}

/* Accordion */
.cllm-accordion {
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm, 6px);
  overflow: hidden;
}
.cllm-accordion-btn {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: none;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.cllm-accordion-btn:hover {
  color: var(--text);
}
.cllm-accordion-content {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--surface);
}
.cllm-accordion-hint {
  font-size: 0.74rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}
.cllm-accordion-hint code {
  background: var(--bg-secondary);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.72rem;
}
.cllm-template-actions {
  display: flex;
  justify-content: flex-end;
}

.cllm-editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

/* Submodals */
.cllm-submodal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10000;
}
.cllm-submodal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  width: 100%;
  max-width: 520px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow-xl);
}
.cllm-submodal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cllm-submodal__header h4 {
  margin: 0;
  font-size: 1rem;
}
.cllm-submodal__text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}
.cllm-submodal__code-wrap {
  max-height: 160px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  padding: 8px 10px;
}
.cllm-submodal__code {
  font-size: 0.72rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  margin: 0;
  white-space: pre-wrap;
}
.cllm-submodal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Standard Buttons */
.cllm-btn {
  padding: 7px 12px;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s, background-color 0.15s;
}
.cllm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cllm-btn--primary {
  background: var(--color-primary, #3b82f6);
  color: #ffffff;
}
.cllm-btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.cllm-btn--success {
  background: var(--color-success, #32d74b);
  color: #ffffff;
}

.cllm-btn--secondary {
  background: var(--bg-secondary);
  color: var(--text);
  border-color: var(--border);
}

.cllm-btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  padding: 4px 8px;
}
.cllm-btn--ghost:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.cllm-btn--ghost-danger {
  background: transparent;
  color: var(--color-danger, #ef4444);
  padding: 4px 8px;
}
.cllm-btn--ghost-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.cllm-btn--outline {
  background: transparent;
  border-color: var(--border);
  color: var(--text-secondary);
}
.cllm-btn--outline:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text);
}

.cllm-btn--danger-icon {
  background: var(--color-danger-bg, rgba(239, 68, 68, 0.12));
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--color-danger, #ef4444);
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cllm-btn--danger-icon:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.25);
}

.cllm-btn--done {
  background: var(--text);
  color: var(--surface);
  border: 1px solid transparent;
}
.cllm-btn--done:hover {
  opacity: 0.9;
}

.cllm-modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  flex-shrink: 0;
}
</style>
