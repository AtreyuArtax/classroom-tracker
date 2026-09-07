<template>
  <div v-if="modelValue" class="csm-overlay" @click.self="onClose">
    <div class="csm-modal" role="dialog" aria-modal="true" :aria-labelledby="modalTitleId">
      
      <!-- Modal Header -->
      <div class="csm-header">
        <div class="csm-header__title-group">
          <div class="csm-header__icon-box" :class="isMasterToClasses ? 'csm-header__icon-box--primary' : 'csm-header__icon-box--emerald'">
            <component :is="isMasterToClasses ? ArrowUpRight : BookmarkCheck" :size="20" />
          </div>
          <div>
            <h3 :id="modalTitleId" class="csm-title">
              {{ isMasterToClasses ? 'Push Master Blueprint to Classes' : 'Push Class Customizations to Master Library' }}
            </h3>
            <p class="csm-subtitle">
              {{ isMasterToClasses 
                ? `Synchronize expectations and weight multipliers from "${presetTitle}" to active classes.`
                : `Update your Master Curriculum Library with the custom expectations and weights from ${className}.`
              }}
            </p>
          </div>
        </div>
        <button type="button" class="csm-close-btn" @click="onClose" title="Close">
          <X :size="18" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="csm-body">
        
        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- MODE 1: MASTER → CLASSES                                     -->
        <!-- ════════════════════════════════════════════════════════════ -->
        <template v-if="isMasterToClasses">
          <div class="csm-banner">
            <ShieldCheck :size="18" class="csm-banner__icon" />
            <div class="csm-banner__text">
              <strong>Assessment Safe:</strong> Student scores and existing assessment records are strictly preserved. Only expectation weight multipliers, descriptions, and new standards are applied.
            </div>
          </div>

          <div v-if="!matchingClasses || matchingClasses.length === 0" class="csm-empty">
            <CheckCircle2 :size="32" class="csm-empty__icon" />
            <p>All active classes teaching this curriculum are already fully up to date!</p>
          </div>

          <div v-else class="csm-classes-section">
            <div class="csm-section-bar">
              <span class="csm-section-label">
                Select Classes to Update ({{ selectedClassIds.size }} of {{ matchingClasses.length }} selected):
              </span>
              <div class="csm-selection-actions">
                <button type="button" class="csm-text-btn" @click="selectAllClasses">Select All</button>
                <span class="csm-dot">·</span>
                <button type="button" class="csm-text-btn" @click="deselectAllClasses">Deselect All</button>
              </div>
            </div>

            <div class="csm-class-list">
              <div 
                v-for="item in matchingClasses" 
                :key="item.classId + (item.sectionKey || '')"
                class="csm-class-card"
                :class="{ 'csm-class-card--selected': selectedClassIds.has(getItemKey(item)) }"
              >
                <div class="csm-class-card__header">
                  <label class="csm-checkbox-label">
                    <input 
                      type="checkbox" 
                      :checked="selectedClassIds.has(getItemKey(item))"
                      @change="toggleSelectClass(item)"
                      class="csm-checkbox" 
                    />
                    <div class="csm-class-info">
                      <span class="csm-class-name">{{ item.subjectName || item.className }}</span>
                      <span class="csm-class-meta">
                        {{ item.classType === 'elementary' ? 'Elementary Subject' : (item.sectionKey ? `Split Section (${item.sectionKey})` : 'Secondary Course') }}
                        &middot; <strong>{{ item.changesCount }} update{{ item.changesCount !== 1 ? 's' : '' }}</strong>
                      </span>
                    </div>
                  </label>

                  <button 
                    type="button" 
                    class="csm-expand-btn" 
                    @click="toggleExpand(getItemKey(item))"
                    :title="expandedKeys.has(getItemKey(item)) ? 'Hide details' : 'Show details'"
                  >
                    <span>{{ expandedKeys.has(getItemKey(item)) ? 'Hide Diffs' : 'View Diffs' }}</span>
                    <ChevronDown v-if="!expandedKeys.has(getItemKey(item))" :size="14" />
                    <ChevronUp v-else :size="14" />
                  </button>
                </div>

                <!-- Expanded Diffs View -->
                <div v-if="expandedKeys.has(getItemKey(item))" class="csm-diffs-container">
                  <div class="csm-diffs-header">Pending Changes for this Class:</div>
                  <div class="csm-diff-rows">
                    <div 
                      v-for="(diff, dIdx) in item.diffs" 
                      :key="dIdx" 
                      class="csm-diff-row"
                      :class="`csm-diff-row--${diff.type}`"
                    >
                      <div class="csm-diff-tag" :class="`csm-diff-tag--${diff.type}`">
                        {{ diff.type === 'weight' ? 'Weight Change' : (diff.type === 'description' ? 'Text Updated' : 'New Standard') }}
                      </div>
                      
                      <div class="csm-diff-content">
                        <div class="csm-diff-main">
                          <strong class="csm-diff-code">{{ diff.code }}</strong>
                          <span class="csm-diff-strand">({{ diff.strandName || 'General' }})</span>
                        </div>
                        
                        <div v-if="diff.type === 'weight'" class="csm-diff-detail">
                          <span class="csm-old-val">{{ diff.oldVal }}x</span>
                          <span class="csm-arrow">&rarr;</span>
                          <ExpectationWeightBadge :weight="diff.newVal" :show-default="true" :compact="true" />
                        </div>

                        <div v-else-if="diff.type === 'description'" class="csm-diff-detail csm-diff-desc">
                          <span>Updated wording to master specification</span>
                        </div>

                        <div v-else-if="diff.type === 'added'" class="csm-diff-detail">
                          <span class="csm-added-label">Adds to class with default</span>
                          <ExpectationWeightBadge :weight="diff.newVal" :show-default="true" :compact="true" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </template>

        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- MODE 2: CLASS → MASTER                                       -->
        <!-- ════════════════════════════════════════════════════════════ -->
        <template v-else>
          <div class="csm-banner csm-banner--emerald">
            <Sparkles :size="18" class="csm-banner__icon" />
            <div class="csm-banner__text">
              <strong>Master Blueprint Sync:</strong> Pushing these customizations will update your master curriculum blueprint for <strong>{{ targetCode || targetTitle }}</strong>. Any future classes created with this curriculum will inherit these expectations and weights.
            </div>
          </div>

          <div v-if="!diffs || diffs.length === 0" class="csm-empty">
            <CheckCircle2 :size="32" class="csm-empty__icon" />
            <p>Class expectations and weights already match the Master Curriculum Library perfectly!</p>
          </div>

          <div v-else class="csm-class-to-master-section">
            <div class="csm-section-bar">
              <span class="csm-section-label">
                {{ diffs.length }} Customization{{ diffs.length !== 1 ? 's' : '' }} Made in this Class:
              </span>
            </div>

            <div class="csm-diff-rows">
              <div 
                v-for="(diff, dIdx) in diffs" 
                :key="dIdx" 
                class="csm-diff-row"
                :class="`csm-diff-row--${diff.type}`"
              >
                <div class="csm-diff-tag" :class="`csm-diff-tag--${diff.type}`">
                  {{ diff.type === 'weight' ? 'Custom Weight' : (diff.type === 'description' ? 'Custom Text' : 'Added Standard') }}
                </div>
                
                <div class="csm-diff-content">
                  <div class="csm-diff-main">
                    <strong class="csm-diff-code">{{ diff.code }}</strong>
                    <span class="csm-diff-strand">({{ diff.strandName || 'General' }})</span>
                  </div>
                  
                  <div v-if="diff.type === 'weight'" class="csm-diff-detail">
                    <span class="csm-master-label">Master: {{ diff.oldVal }}x</span>
                    <span class="csm-arrow">&rarr;</span>
                    <span class="csm-class-val">Class:</span>
                    <ExpectationWeightBadge :weight="diff.newVal" :show-default="true" :compact="true" />
                  </div>

                  <div v-else-if="diff.type === 'description'" class="csm-diff-detail csm-diff-desc">
                    <span :title="diff.newVal">"{{ (diff.newVal || '').slice(0, 90) }}{{ (diff.newVal || '').length > 90 ? '...' : '' }}"</span>
                  </div>

                  <div v-else-if="diff.type === 'added'" class="csm-diff-detail">
                    <span class="csm-added-label">New standard created in class</span>
                    <ExpectationWeightBadge :weight="diff.newVal" :show-default="true" :compact="true" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div>

      <!-- Modal Footer -->
      <div class="csm-footer">
        <button type="button" class="csm-btn-ghost" @click="onClose">
          Cancel
        </button>

        <button 
          v-if="isMasterToClasses"
          type="button" 
          class="csm-btn-primary" 
          :disabled="selectedClassIds.size === 0 || isApplying"
          @click="applyMasterToClasses"
        >
          <RefreshCw :size="15" :class="{ 'csm-spin': isApplying }" />
          <span>{{ isApplying ? 'Updating Classes...' : `Push to ${selectedClassIds.size} Selected Class${selectedClassIds.size !== 1 ? 'es' : ''}` }}</span>
        </button>

        <button 
          v-else
          type="button" 
          class="csm-btn-primary csm-btn-primary--emerald" 
          :disabled="!diffs || diffs.length === 0 || isApplying"
          @click="applyClassToMaster"
        >
          <Save :size="15" :class="{ 'csm-spin': isApplying }" />
          <span>{{ isApplying ? 'Saving to Master...' : 'Update Master Blueprint' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  ArrowUpRight,
  BookmarkCheck,
  X,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Save
} from 'lucide-vue-next'
import ExpectationWeightBadge from './ExpectationWeightBadge.vue'
import { saveClass } from '../../db/classService.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'master-to-classes' }, // 'master-to-classes' | 'class-to-master'
  preset: { type: Object, default: null },
  matchingClasses: { type: Array, default: () => [] },
  className: { type: String, default: '' },
  targetCode: { type: String, default: '' },
  targetTitle: { type: String, default: '' },
  diffs: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'applied', 'pushed-to-master'])

const modalTitleId = 'csm-modal-title-' + Math.floor(Math.random() * 10000)
const isMasterToClasses = computed(() => props.mode !== 'class-to-master')
const isApplying = ref(false)

const presetTitle = computed(() => props.preset?.title || props.targetTitle || 'Course Blueprint')

// Key helper for matchingClasses items
function getItemKey(item) {
  return `${item.classId}_${item.sectionKey || 'default'}`
}

// Checkbox selection state for Master -> Classes
const selectedClassIds = ref(new Set())
const expandedKeys = ref(new Set())

// Initialize selections whenever matchingClasses changes
watch(
  () => props.matchingClasses,
  (newVal) => {
    if (Array.isArray(newVal)) {
      selectedClassIds.value = new Set(newVal.map(getItemKey))
      // Auto-expand first item if only 1 or 2 items
      if (newVal.length <= 2 && newVal.length > 0) {
        expandedKeys.value = new Set(newVal.map(getItemKey))
      }
    } else {
      selectedClassIds.value = new Set()
    }
  },
  { immediate: true }
)

function toggleSelectClass(item) {
  const key = getItemKey(item)
  const copy = new Set(selectedClassIds.value)
  if (copy.has(key)) {
    copy.delete(key)
  } else {
    copy.add(key)
  }
  selectedClassIds.value = copy
}

function selectAllClasses() {
  selectedClassIds.value = new Set((props.matchingClasses || []).map(getItemKey))
}

function deselectAllClasses() {
  selectedClassIds.value = new Set()
}

function toggleExpand(key) {
  const copy = new Set(expandedKeys.value)
  if (copy.has(key)) {
    copy.delete(key)
  } else {
    copy.add(key)
  }
  expandedKeys.value = copy
}

function onClose() {
  emit('update:modelValue', false)
}

async function applyMasterToClasses() {
  if (selectedClassIds.value.size === 0) return
  isApplying.value = true

  try {
    const selectedMatches = (props.matchingClasses || []).filter(item => 
      selectedClassIds.value.has(getItemKey(item))
    )

    for (const item of selectedMatches) {
      if (item.updatedClass) {
        await saveClass(item.updatedClass)
      }
    }

    emit('applied', {
      count: selectedMatches.length,
      classes: selectedMatches
    })
    onClose()
  } catch (err) {
    console.error('[CurriculumSyncModal] Failed to push to classes:', err)
  } finally {
    isApplying.value = false
  }
}

function applyClassToMaster() {
  emit('pushed-to-master')
  onClose()
}
</script>

<style scoped>
.csm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: csmFadeIn 0.15s ease-out;
}

@keyframes csmFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.csm-modal {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.25), 0 10px 15px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 640px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: csmScaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes csmScaleUp {
  from { transform: scale(0.97); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.csm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-secondary, rgba(255, 255, 255, 0.02));
}

.csm-header__title-group {
  display: flex;
  align-items: center;
  gap: 14px;
}

.csm-header__icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.csm-header__icon-box--primary {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.csm-header__icon-box--emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.csm-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.csm-subtitle {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.csm-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.csm-close-btn:hover {
  background: var(--border);
  color: var(--text);
}

.csm-body {
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.csm-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: var(--text);
  font-size: 0.82rem;
  line-height: 1.45;
}

.csm-banner--emerald {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.2);
}

.csm-banner__icon {
  color: #3b82f6;
  flex-shrink: 0;
  margin-top: 1px;
}

.csm-banner--emerald .csm-banner__icon {
  color: #10b981;
}

.csm-section-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.csm-section-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}

.csm-selection-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
}

.csm-text-btn {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 0;
  font-size: 0.78rem;
  font-weight: 600;
}

.csm-text-btn:hover {
  text-decoration: underline;
}

.csm-dot {
  color: var(--text-muted);
}

.csm-class-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.csm-class-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-secondary, rgba(255, 255, 255, 0.02));
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
}

.csm-class-card--selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.02);
}

.csm-class-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
}

.csm-checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
}

.csm-checkbox {
  width: 17px;
  height: 17px;
  accent-color: #3b82f6;
  cursor: pointer;
}

.csm-class-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.csm-class-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
}

.csm-class-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.csm-expand-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.csm-expand-btn:hover {
  background: var(--surface);
  color: var(--text);
  border-color: var(--text-muted);
}

.csm-diffs-container {
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.05);
  font-size: 0.8rem;
}

.csm-diffs-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.csm-diff-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.csm-diff-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.csm-diff-tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.csm-diff-tag--weight {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.csm-diff-tag--description {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.csm-diff-tag--added {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.csm-diff-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 10px;
}

.csm-diff-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.csm-diff-code {
  font-family: monospace;
  font-size: 0.82rem;
  color: var(--text);
}

.csm-diff-strand {
  font-size: 0.74rem;
  color: var(--text-muted);
}

.csm-diff-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
}

.csm-old-val {
  color: var(--text-muted);
  text-decoration: line-through;
}

.csm-arrow {
  color: var(--text-muted);
  font-weight: bold;
}

.csm-master-label {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.csm-class-val {
  font-weight: 600;
  font-size: 0.75rem;
}

.csm-diff-desc {
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.75rem;
}

.csm-added-label {
  color: #10b981;
  font-weight: 600;
  font-size: 0.74rem;
}

.csm-empty {
  text-align: center;
  padding: 30px 20px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.csm-empty__icon {
  color: #10b981;
}

.csm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-secondary, rgba(255, 255, 255, 0.02));
}

.csm-btn-ghost {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s;
}

.csm-btn-ghost:hover {
  background: var(--border);
}

.csm-btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 0.84rem;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
}

.csm-btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.csm-btn-primary--emerald {
  background: #10b981;
}

.csm-btn-primary--emerald:hover:not(:disabled) {
  background: #059669;
}

.csm-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.csm-spin {
  animation: csmSpin 0.9s linear infinite;
}

@keyframes csmSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
