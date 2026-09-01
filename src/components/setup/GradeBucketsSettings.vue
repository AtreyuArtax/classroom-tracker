<template>
  <div class="grade-buckets">
    <div class="setup__card" id="sec-app-buckets">
      <!-- Header Row -->
      <div class="setup__card-header-row">
        <div>
          <h2 class="setup__card-title">Grading Standards (Levels)</h2>
          <p class="setup__hint">
            Define percentage ranges mapping to descriptive levels across all classes.
          </p>
        </div>
        <div class="setup__header-actions">
          <button class="setup__btn-ghost setup__btn-xs" @click="addBucket">
            <Plus :size="13" /> Add Level
          </button>
          <button class="setup__pill-btn setup__btn-xs" @click="resetToOntario">
            <RotateCcw :size="12" /> Reset Defaults
          </button>
        </div>
      </div>

      <!-- ── Visual Range Spectrum Progress Bar ── -->
      <div class="gb-spectrum" v-if="localBuckets.length > 0">
        <div 
          v-for="(bucket, idx) in sortedBuckets" 
          :key="idx" 
          class="gb-spectrum__segment"
          :style="{ 
            backgroundColor: bucket.color, 
            flex: Math.max(1, (bucket.max - bucket.min) + 1)
          }"
          :title="`${bucket.label}: ${bucket.min}% – ${bucket.max}%`"
        >
          <span class="gb-spectrum__label">{{ bucket.label }}</span>
        </div>
      </div>

      <!-- ── Horizontal Responsive Level Tiles Grid ── -->
      <div class="grade-buckets__grid">
        <div 
          v-for="(bucket, idx) in localBuckets" 
          :key="idx" 
          class="gb-tile"
          :style="{ borderTopColor: bucket.color }"
        >
          <!-- Top Row: Swatch + Label Input + Delete -->
          <div class="gb-tile__top">
            <div class="grade-buckets__swatch" :style="{ backgroundColor: bucket.color }" title="Change Color">
              <input type="color" v-model="bucket.color" class="grade-buckets__color-picker" />
            </div>
            <input 
              v-model="bucket.label" 
              class="setup__input gb-tile__label-input" 
              placeholder="Label" 
              title="Level Label"
            />
            <button 
              class="setup__icon-btn setup__icon-btn--danger gb-tile__del-btn" 
              @click="removeBucket(idx)" 
              title="Remove Level"
            >
              <Trash2 :size="12" />
            </button>
          </div>

          <!-- Middle: Range Inputs -->
          <div class="gb-tile__range">
            <input 
              v-model.number="bucket.min" 
              type="number" 
              min="0"
              max="150"
              class="setup__input gb-tile__num-input" 
              placeholder="0"
            />
            <span class="gb-tile__sep">% &ndash;</span>
            <input 
              v-model.number="bucket.max" 
              type="number" 
              min="0"
              max="150"
              class="setup__input gb-tile__num-input" 
              placeholder="100"
            />
            <span class="gb-tile__percent">%</span>
          </div>

          <!-- Bottom: Order Controls -->
          <div class="gb-tile__footer">
            <button 
              class="gb-tile__order-btn" 
              :disabled="idx === 0" 
              @click="moveBucket(idx, -1)" 
              title="Move Left"
            >
              <ChevronLeft :size="12" />
            </button>
            <span class="gb-tile__order-badge">#{{ idx + 1 }}</span>
            <button 
              class="gb-tile__order-btn" 
              :disabled="idx === localBuckets.length - 1" 
              @click="moveBucket(idx, 1)" 
              title="Move Right"
            >
              <ChevronRight :size="12" />
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="globalError" class="grade-buckets__error-msg">
        <AlertCircle :size="14" /> <span>{{ globalError }}</span>
      </div>

      <!-- Compact Footer -->
      <div class="grade-buckets__footer">
        <label class="grade-buckets__cap-toggle">
          <input type="checkbox" v-model="capGradesAt100" />
          <span>Cap overall student grades at 100% (Safety)</span>
        </label>
        <div class="grade-buckets__footer-right">
          <span v-if="saveSuccess" class="grade-buckets__save-success">Saved ✓</span>
          <button 
            class="setup__btn-primary setup__btn-sm" 
            :disabled="!!globalError || hasFieldErrors" 
            @click="saveBuckets"
          >
            Save Grading Standards
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Trash2, Plus, AlertCircle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-vue-next'
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

const sortedBuckets = computed(() => {
    return [...localBuckets.value].sort((a, b) => a.min - b.min)
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
        color: '#6366f1'
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

const saveSuccess = ref(false)

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
    
    saveSuccess.value = true
    setTimeout(() => {
        saveSuccess.value = false
    }, 2500)
}
</script>

<style scoped>
.grade-buckets {
  margin-top: 0;
}

/* ── Standardized Card ── */
.setup__card {
  background:    var(--surface, #1e2030);
  padding:       18px 22px;
  border-radius: var(--radius-lg, 12px);
  box-shadow:    var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.15));
  border:        1px solid var(--border, rgba(255, 255, 255, 0.08));
  display:       flex;
  flex-direction: column;
  gap:           10px;
}

.setup__card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.setup__card-title {
  font-size:     1.05rem;
  font-weight:   700;
  color:         var(--text, #ffffff);
  margin: 0 0 2px;
}

.setup__hint {
  font-size: 0.8rem;
  color:     var(--text-secondary, #94a3b8);
  margin: 0;
  line-height: 1.4;
}

.setup__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Range Spectrum Progress Strip ── */
.gb-spectrum {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin: 2px 0;
  background: var(--border);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
}

.gb-spectrum__segment {
  height: 100%;
  position: relative;
  transition: all 0.2s ease;
}

.gb-spectrum__segment:hover {
  filter: brightness(1.2);
}

.gb-spectrum__label {
  display: none;
}

/* ── Horizontal Grid of Level Tiles ── */
.grade-buckets__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.gb-tile {
  background: var(--bg);
  border: 1px solid var(--border);
  border-top: 3px solid var(--primary);
  border-radius: var(--radius-md, 8px);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.15s ease;
}

.gb-tile:hover {
  border-color: var(--primary-light, #818cf8);
  box-shadow: var(--shadow-sm);
}

.gb-tile__top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grade-buckets__swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.grade-buckets__swatch:hover {
  transform: scale(1.1);
}

.grade-buckets__color-picker {
  position: absolute;
  top: -6px;
  left: -6px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  opacity: 0;
}

.gb-tile__label-input {
  flex: 1;
  min-width: 40px;
  padding: 2px 6px !important;
  font-weight: 700;
  font-size: 0.82rem;
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 4px !important;
  color: var(--text) !important;
  text-align: left;
}

.gb-tile__del-btn {
  padding: 3px !important;
  opacity: 0.6;
}

.gb-tile__del-btn:hover {
  opacity: 1;
}

/* Range Inputs */
.gb-tile__range {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.gb-tile__num-input {
  width: 38px;
  padding: 2px 2px !important;
  text-align: center;
  font-weight: 700;
  font-size: 0.78rem;
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 3px !important;
  color: var(--text) !important;
  -moz-appearance: textfield;
}

.gb-tile__num-input::-webkit-outer-spin-button,
.gb-tile__num-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.gb-tile__sep {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.gb-tile__percent {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 600;
}

/* Order Footer in Tile */
.gb-tile__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1px;
}

.gb-tile__order-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  opacity: 0.7;
}

.gb-tile__order-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.gb-tile__order-btn:hover:not(:disabled) {
  background: var(--surface);
  color: var(--text);
}

.gb-tile__order-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

/* Button Variants */
.setup__btn-xs {
  font-size: 0.75rem;
  padding: 4px 10px;
}

.setup__btn-sm {
  font-size: 0.8rem;
  padding: 6px 14px;
}

.setup__pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-full, 9999px);
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.setup__pill-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
  border-color: var(--primary-light);
}

.setup__btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.setup__btn-ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.setup__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.setup__btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.setup__btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  transition: all 0.15s ease;
}

.setup__icon-btn--danger:hover:not(:disabled) {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}

/* ── Footer ── */
.grade-buckets__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.grade-buckets__cap-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.grade-buckets__cap-toggle input {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--primary);
}

.grade-buckets__footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.grade-buckets__save-success {
  font-size: 0.8rem;
  font-weight: 700;
  color: #10b981;
}

.grade-buckets__error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  padding: 6px 10px;
  border-radius: var(--radius-md);
}
</style>
