<template>
  <div class="grade-buckets">
    <div class="setup__card">
      <div class="setup__card-header-row">
        <h2 class="setup__card-title">Grading Standards (Levels)</h2>
        <button class="setup__pill-btn" @click="resetToOntario">Reset to Ontario Defaults</button>
      </div>
      <p class="setup__hint">
        Define how percentage ranges map to descriptive levels (e.g., R, L1, L2, L3, L4). 
        These apply globally to analytics and reports across all classes.
      </p>

      <div class="grade-buckets__list">
        <div 
          v-for="(bucket, idx) in localBuckets" 
          :key="idx" 
          class="grade-buckets__item"
          :class="{ 'grade-buckets__item--error': validationErrors[idx] }"
        >
          <div class="grade-buckets__color-swatch" :style="{ backgroundColor: bucket.color }">
            <input type="color" v-model="bucket.color" class="grade-buckets__color-input" title="Choose Label Color" />
          </div>
          
          <input 
            v-model="bucket.label" 
            class="setup__input grade-buckets__input-label" 
            placeholder="Label (e.g. L4)" 
          />
          
          <div class="grade-buckets__range">
            <input 
              v-model.number="bucket.min" 
              type="number" 
              class="setup__input grade-buckets__input-num" 
              placeholder="Min %"
              @input="validate"
            />
            <span>to</span>
            <input 
              v-model.number="bucket.max" 
              type="number" 
              class="setup__input grade-buckets__input-num" 
              placeholder="Max %"
              @input="validate"
            />
            <span>%</span>
          </div>

          <button class="setup__icon-btn setup__icon-btn--danger" @click="removeBucket(idx)" title="Remove Level">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <div v-if="globalError" class="grade-buckets__error-msg">
        <AlertCircle :size="16" /> {{ globalError }}
      </div>

      <div class="grade-buckets__actions">
        <button class="setup__btn-ghost" @click="addBucket">
          <Plus :size="14" /> Add Level
        </button>
        <button 
          class="setup__btn-primary" 
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
import { Trash2, Plus, AlertCircle } from 'lucide-vue-next'
import * as settingsService from '../../db/settingsService.js'

const localBuckets = ref([])
const validationErrors = ref({})
const globalError = ref('')

const ONTARIO_DEFAULTS = [
    { label: 'R', min: 0, max: 49, color: '#ff3b30' },
    { label: 'L1', min: 50, max: 59, color: '#ff9500' },
    { label: 'L2', min: 60, max: 69, color: '#ffcc00' },
    { label: 'L3', min: 70, max: 79, color: '#30b0c7' },
    { label: 'L4', min: 80, max: 100, color: '#34c759' }
]

onMounted(async () => {
    const buckets = await settingsService.getGradeBuckets()
    localBuckets.value = JSON.parse(JSON.stringify(buckets))
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

function removeBucket(idx) {
    localBuckets.value.splice(idx, 1)
    validate()
}

function resetToOntario() {
    localBuckets.value = JSON.parse(JSON.stringify(ONTARIO_DEFAULTS))
    validate()
}

function validate() {
    validationErrors.value = {}
    globalError.value = ''

    if (localBuckets.value.length === 0) {
        globalError.value = 'At least one grade level must be defined.'
        return
    }

    // Sort by min for validation
    const sorted = [...localBuckets.value].sort((a, b) => a.min - b.min)
    
    for (let i = 0; i < sorted.length; i++) {
        const b = sorted[i]
        
        // Basic range check
        if (b.min > b.max) {
            globalError.value = `Level "${b.label}" has an invalid range: Min cannot be greater than Max.`
            return
        }

        // Overlap check
        if (i > 0) {
            const prev = sorted[i-1]
            if (b.min <= prev.max) {
                globalError.value = `Overlap detected between "${prev.label}" and "${b.label}".`
                return
            }
            if (b.min > prev.max + 1) {
                // Gap check (optional, but good for UX)
                // We'll allow gaps but maybe show a warning? 
                // The user specifically asked to "make sure we don't have bucket overlap".
            }
        }
    }

    // Range coverage check
    const lowest = Math.min(...localBuckets.value.map(b => b.min))
    const highest = Math.max(...localBuckets.value.map(b => b.max))
    if (lowest > 0) {
        // globalError.value = 'Grading levels should start at 0%.'
    }
}

async function saveBuckets() {
    validate()
    if (globalError.value) return
    
    await settingsService.saveGradeBuckets(JSON.parse(JSON.stringify(localBuckets.value)))
    
    // Refresh the gradebook state if possible (or just rely on re-navigation)
    // In this app, Setup is a separate view, so re-navigation will reload state.
    alert('Grading standards saved successfully!')
}
</script>

<style scoped>
.grade-buckets__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.grade-buckets__item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-card);
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.grade-buckets__item--error {
  border-color: var(--state-out);
  background: rgba(255, 59, 48, 0.05);
}

.grade-buckets__color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.grade-buckets__color-input {
  position: absolute;
  top: -5px;
  left: -5px;
  width: 50px;
  height: 50px;
  cursor: pointer;
  opacity: 0;
}

.grade-buckets__input-label {
  flex: 1;
  font-weight: 600;
}

.grade-buckets__range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.grade-buckets__input-num {
  width: 70px;
  text-align: center;
}

.grade-buckets__error-msg {
  margin-top: 1rem;
  color: var(--state-out);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.75rem;
  background: rgba(255, 59, 48, 0.1);
  border-radius: 8px;
}

.grade-buckets__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
}

.setup__btn--full {
    width: 100%;
    margin-top: 0.5rem;
}
</style>
