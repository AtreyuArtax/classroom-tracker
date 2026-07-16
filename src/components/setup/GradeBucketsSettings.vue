<template>
  <div class="grade-buckets">
    <div class="setup__card">
      <div class="setup__card-header-row">
        <h2 class="setup__card-title">Grading Standards (Levels)</h2>
        <button class="setup__pill-btn" @click="resetToOntario">Reset Defaults</button>
      </div>
      <p class="setup__hint">
        Define how percentage ranges map to descriptive levels. These apply globally 
        across all classes.
      </p>

      <div class="setup__gb-list">
        <div 
          v-for="(bucket, idx) in localBuckets" 
          :key="idx" 
          class="setup__gb-item"
        >
          <div class="grade-buckets__swatch" :style="{ backgroundColor: bucket.color }">
            <input type="color" v-model="bucket.color" class="grade-buckets__color-picker" />
          </div>
          
          <input 
            v-model="bucket.label" 
            class="setup__input setup__input--naked" 
            style="flex: 1;"
            placeholder="Level Label" 
          />
          
          <div class="setup__gb-actions">
            <div class="grade-buckets__range-inputs">
              <input v-model.number="bucket.min" type="number" class="setup__input setup__input--weight" />
              <span class="grade-buckets__to">to</span>
              <input v-model.number="bucket.max" type="number" class="setup__input setup__input--weight" />
              <span class="grade-buckets__percent">%</span>
            </div>
            
            <button class="setup__icon-btn" :disabled="idx === 0" @click="moveBucket(idx, -1)"><ChevronUp :size="16" /></button>
            <button class="setup__icon-btn" :disabled="idx === localBuckets.length - 1" @click="moveBucket(idx, 1)"><ChevronDown :size="16" /></button>
            <button class="setup__icon-btn setup__icon-btn--danger" @click="removeBucket(idx)" title="Remove Level">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>

      <button class="setup__btn-ghost setup__btn--full" style="margin-top: 1rem;" @click="addBucket">
        <Plus :size="14" /> Add Level
      </button>

      <div v-if="globalError" class="grade-buckets__error-msg">
        <AlertCircle :size="16" /> {{ globalError }}
      </div>

      <div class="grade-buckets__footer">
        <label class="grade-buckets__cap-toggle">
          <input type="checkbox" v-model="capGradesAt100" />
          <span>Cap overall student grades at 100% (Safety)</span>
        </label>
        <button 
          class="setup__btn-primary" 
          style="margin-left: auto;"
          :disabled="!!globalError || hasFieldErrors" 
          @click="saveBuckets"
        >
          Save Grading Standards
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Trash2, Plus, AlertCircle, ChevronUp, ChevronDown } from 'lucide-vue-next'
import * as settingsService from '../../db/settingsService.js'
import { useMessage } from '../../composables/useMessage.js'

const localBuckets = ref([])
const capGradesAt100 = ref(true)
const validationErrors = ref({})
const globalError = ref('')
const { alert, confirm } = useMessage()

const ONTARIO_DEFAULTS = [
    { label: 'R', min: 0, max: 49, color: '#ff3b30' },
    { label: 'L1', min: 50, max: 59, color: '#ff9500' },
    { label: 'L2', min: 60, max: 69, color: '#ffcc00' },
    { label: 'L3', min: 70, max: 79, color: '#30b0c7' },
    { label: 'L4', min: 80, max: 100, color: '#34c759' }
]

onMounted(async () => {
    const settings = await settingsService.getSettings()
    localBuckets.value = JSON.parse(JSON.stringify(settings.gradeBuckets || ONTARIO_DEFAULTS))
    capGradesAt100.value = settings.capGradesAt100 ?? true
    validate()
})

const hasFieldErrors = computed(() => Object.values(validationErrors.value).some(v => v))

function addBucket() {
    const lastMax = localBuckets.value.length > 0 
        ? localBuckets.value[localBuckets.value.length - 1].max 
        : -1
    localBuckets.value.push({
        label: 'New',
        min: lastMax + 1,
        max: Math.min(100, lastMax + 10),
        color: '#666666'
    })
    validate()
}

async function removeBucket(idx) {
    const bucket = localBuckets.value[idx]
    const label = bucket?.label || 'this grading level'
    if (!await confirm(`Are you sure you want to remove ${label}?`, 'Remove Grading Level', { danger: true })) return
    localBuckets.value.splice(idx, 1)
    validate()
}

function moveBucket(idx, dir) {
    const target = idx + dir
    if (target < 0 || target >= localBuckets.value.length) return
    const temp = localBuckets.value[idx]
    localBuckets.value[idx] = localBuckets.value[target]
    localBuckets.value[target] = temp
}

async function resetToOntario() {
    if (!await confirm('Reset to standard Ontario levels?')) return
    localBuckets.value = JSON.parse(JSON.stringify(ONTARIO_DEFAULTS))
    validate()
}

function validate() {
    validationErrors.value = {}
    globalError.value = ''

    if (localBuckets.value.length === 0) {
        globalError.value = 'At least one level is required.'
        return
    }

    for (let i = 0; i < localBuckets.value.length; i++) {
        const b = localBuckets.value[i]
        if (b.min > b.max) {
            globalError.value = `Level "${b.label}" has an invalid range (min > max).`
            return
        }
    }

    // Check for overlaps
    const sorted = [...localBuckets.value].sort((a, b) => a.min - b.min)
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].max >= sorted[i + 1].min) {
            globalError.value = `Levels "${sorted[i].label}" and "${sorted[i+1].label}" have overlapping ranges.`
            return
        }
    }
}

async function saveBuckets() {
    validate()
    if (globalError.value) return
    const sorted = [...localBuckets.value].sort((a, b) => a.min - b.min)
    
    // Fetch latest settings to avoid overwriting other fields (gridSize, etc)
    const settings = await settingsService.getSettings()
    settings.gradeBuckets = JSON.parse(JSON.stringify(sorted))
    settings.capGradesAt100 = capGradesAt100.value
    
    await settingsService.saveSettings(settings)
    localBuckets.value = JSON.parse(JSON.stringify(sorted))
    await alert('Grading standards saved successfully!')
}
</script>

<style scoped>
.grade-buckets {
  margin-top: 1rem;
}

.grade-buckets__footer {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.grade-buckets__cap-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.grade-buckets__cap-toggle input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* ── Standardized Card Styles (Matched to Setup view) ── */
.setup__card {
  background:    var(--surface);
  padding:       24px;
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-sm);
  border:        1px solid var(--border);
  display:       flex;
  flex-direction: column;
  gap:           16px;
}

.setup__card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.setup__card-title {
  font-size:     1.1rem;
  font-weight:   700;
  color:         var(--text);
  margin-bottom: 4px;
}

.setup__hint {
  font-size: 0.82rem;
  color:     var(--text-secondary);
  line-height: 1.5;
}

.setup__gb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 1rem;
}

.setup__gb-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  min-height: 52px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.setup__gb-item:hover {
  border-color: var(--border);
  background: color-mix(in srgb, var(--bg-secondary) 95%, black);
}

.grade-buckets__swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.grade-buckets__color-picker {
  position: absolute;
  top: -5px;
  left: -5px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  opacity: 0;
}

.setup__gb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.grade-buckets__range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 12px;
}

.grade-buckets__to {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grade-buckets__percent {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.grade-buckets__error-msg {
  margin-top: 1rem;
  color: var(--state-out);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 12px;
  background: color-mix(in srgb, var(--state-out) 10%, white);
  border-radius: var(--radius-md);
}

.grade-buckets__footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  display: flex;
}

.setup__input--weight {
  width: 72px;
  padding-left: 8px !important;
  padding-right: 8px !important;
  text-align: center;
  background: var(--surface) !important;
  font-weight: 600;
  border-color: var(--border) !important;
}

/* Hide spin buttons to maximize typing area */
.setup__input--weight::-webkit-outer-spin-button,
.setup__input--weight::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.setup__input--weight {
  -moz-appearance: textfield;
}

.setup__input--naked {
  border: none !important;
  background: transparent !important;
  font-weight: 700;
  padding-left: 0 !important;
  font-size: 0.95rem;
  color: var(--text);
}

.setup__icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.setup__icon-btn:not(:disabled):hover {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.setup__icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.setup__icon-btn--danger:hover {
  background: #fff5f5 !important;
  color: var(--state-out) !important;
}

.setup__pill-btn {
  font-size: 0.72rem;
  padding: 4px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.setup__pill-btn:hover {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary-light);
}

.setup__btn--full {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>
