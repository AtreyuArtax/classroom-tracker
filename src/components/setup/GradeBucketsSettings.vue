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
      <div class="gb-spectrum" v-if="spectrumSegments.length > 0">
        <div 
          v-for="(seg, idx) in spectrumSegments" 
          :key="idx" 
          class="gb-spectrum__segment"
          :class="{ 'gb-spectrum__segment--gap': seg.isGap }"
          :style="{ 
            backgroundColor: seg.isGap ? undefined : seg.color, 
            flex: seg.flex
          }"
          :title="seg.isGap ? `${seg.label} (Unassigned)` : `${seg.label}: ${seg.min}% – ${seg.max}%`"
        >
          <span class="gb-spectrum__label">{{ seg.label }}</span>
        </div>
      </div>

      <!-- ── Horizontal Responsive Level Tiles Grid ── -->
      <div class="grade-buckets__grid">
        <div 
          v-for="(bucket, idx) in localBuckets" 
          :key="idx" 
          class="gb-tile"
          :class="{ 'gb-tile--error': validationErrors[idx] }"
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
        <div class="setup__switch-container">
          <label class="setup__switch">
            <input type="checkbox" v-model="capGradesAt100" />
            <span class="setup__switch-slider"></span>
          </label>
          <span class="setup__switch-label">Cap overall student grades at 100% (Safety)</span>
        </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { Trash2, Plus, AlertCircle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-vue-next'
import { useMessage } from '../../composables/useMessage.js'
import { getGradebookSettings, saveGradebookSettings } from '../../composables/useGradebook.js'

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
    const settings = await getGradebookSettings()
    localBuckets.value = JSON.parse(JSON.stringify(settings.gradeBuckets || ONTARIO_DEFAULTS))
    capGradesAt100.value = settings.capGradesAt100 ?? true
    validate()
})

// Reactively revalidate as user types or rearranges tiles
watch(localBuckets, () => {
    validate()
}, { deep: true })

const spectrumSegments = computed(() => {
    if (!localBuckets.value || localBuckets.value.length === 0) return []
    
    const valid = localBuckets.value
        .filter(b => b.min !== null && b.min !== '' && !isNaN(Number(b.min)) && 
                     b.max !== null && b.max !== '' && !isNaN(Number(b.max)) && 
                     Number(b.min) <= Number(b.max))
        .map(b => ({
            label: b.label || 'Level',
            color: b.color || '#6366f1',
            min: Number(b.min),
            max: Number(b.max)
        }))
        .sort((a, b) => a.min - b.min)

    if (valid.length === 0) return []

    const segments = []

    // Gap at start (if lowest bucket starts above 0%)
    if (valid[0].min > 0) {
        segments.push({
            isGap: true,
            min: 0,
            max: valid[0].min - 1,
            label: `Gap: 0%–${valid[0].min - 1}%`,
            flex: valid[0].min
        })
    }

    for (let i = 0; i < valid.length; i++) {
        const curr = valid[i]
        segments.push({
            isGap: false,
            min: curr.min,
            max: curr.max,
            label: curr.label,
            color: curr.color,
            flex: Math.max(1, (curr.max - curr.min) + 1)
        })

        // Gap between adjacent levels
        if (i < valid.length - 1) {
            const next = valid[i + 1]
            if (curr.max + 1 < next.min) {
                segments.push({
                    isGap: true,
                    min: curr.max + 1,
                    max: next.min - 1,
                    label: `Gap: ${curr.max + 1}%–${next.min - 1}%`,
                    flex: Math.max(1, next.min - curr.max - 1)
                })
            }
        }
    }

    // Gap at end (if highest bucket ends below 100%)
    const last = valid[valid.length - 1]
    if (last.max < 100) {
        segments.push({
            isGap: true,
            min: last.max + 1,
            max: 100,
            label: `Gap: ${last.max + 1}%–100%`,
            flex: Math.max(1, 100 - last.max)
        })
    }

    return segments
})

const hasFieldErrors = computed(() => Object.values(validationErrors.value).some(v => v))

function addBucket() {
    const lastMax = localBuckets.value.length > 0 
        ? Number(localBuckets.value[localBuckets.value.length - 1].max) 
        : -1
    const newMin = isNaN(lastMax) ? 0 : lastMax + 1
    const newMax = newMin >= 100 ? newMin + 10 : Math.min(100, newMin + 9)
    localBuckets.value.push({
        label: `L${localBuckets.value.length + 1}`,
        min: newMin,
        max: newMax,
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

    if (!localBuckets.value || localBuckets.value.length === 0) {
        globalError.value = 'At least one level is required.'
        return false
    }

    for (let i = 0; i < localBuckets.value.length; i++) {
        const b = localBuckets.value[i]
        if (!b.label || !String(b.label).trim()) {
            validationErrors.value[i] = true
            globalError.value = `Level #${i + 1} is missing a name/label.`
            return false
        }
        if (b.min === null || b.min === undefined || b.min === '' || isNaN(Number(b.min)) || 
            b.max === null || b.max === undefined || b.max === '' || isNaN(Number(b.max))) {
            validationErrors.value[i] = true
            globalError.value = `Level "${b.label}" must have valid minimum and maximum percentages.`
            return false
        }
        if (Number(b.min) < 0) {
            validationErrors.value[i] = true
            globalError.value = `Level "${b.label}" minimum percentage cannot be negative.`
            return false
        }
        if (Number(b.min) > Number(b.max)) {
            validationErrors.value[i] = true
            globalError.value = `Level "${b.label}" has an invalid range (${b.min}% > ${b.max}%).`
            return false
        }
    }

    // Check coverage, overlaps, and gaps in sorted order
    const indexed = localBuckets.value.map((b, idx) => ({
        ...b,
        origIdx: idx,
        min: Number(b.min),
        max: Number(b.max)
    })).sort((a, b) => a.min - b.min)

    // Check starting coverage: must start at 0%
    if (indexed[0].min > 0) {
        validationErrors.value[indexed[0].origIdx] = true
        globalError.value = `Levels must start at 0% (currently "${indexed[0].label}" starts at ${indexed[0].min}%).`
        return false
    }

    // Check for overlaps and gaps between adjacent levels
    for (let i = 0; i < indexed.length - 1; i++) {
        const curr = indexed[i]
        const next = indexed[i + 1]

        if (curr.max >= next.min) {
            validationErrors.value[curr.origIdx] = true
            validationErrors.value[next.origIdx] = true
            globalError.value = `Levels "${curr.label}" and "${next.label}" have overlapping ranges (${curr.min}–${curr.max}% and ${next.min}–${next.max}%).`
            return false
        }

        if (curr.max + 1 < next.min) {
            validationErrors.value[curr.origIdx] = true
            validationErrors.value[next.origIdx] = true
            const gapStart = curr.max + 1
            const gapEnd = next.min - 1
            globalError.value = `Gap detected between "${curr.label}" and "${next.label}": scores ${gapStart}%–${gapEnd}% are unassigned.`
            return false
        }
    }

    // Check ending coverage: must reach at least 100%
    const last = indexed[indexed.length - 1]
    if (last.max < 100) {
        validationErrors.value[last.origIdx] = true
        globalError.value = `Levels must reach at least 100% (currently "${last.label}" ends at ${last.max}%).`
        return false
    }

    return true
}

const saveSuccess = ref(false)

async function saveBuckets() {
    if (!validate()) return
    const sorted = [...localBuckets.value]
        .map(b => ({
            ...b,
            min: Number(b.min),
            max: Number(b.max)
        }))
        .sort((a, b) => a.min - b.min)
    
    await saveGradebookSettings({
        gradeBuckets: sorted,
        capGradesAt100: capGradesAt100.value
    })
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

.gb-spectrum__segment--gap {
  background: repeating-linear-gradient(
    -45deg,
    rgba(239, 68, 68, 0.45),
    rgba(239, 68, 68, 0.45) 3px,
    rgba(239, 68, 68, 0.85) 3px,
    rgba(239, 68, 68, 0.85) 6px
  ) !important;
  cursor: help;
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

.gb-tile--error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 1px #ef4444;
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

.setup__switch-container {
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
}

.setup__switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.setup__switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.setup__switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border, #334155);
  transition: 0.2s ease;
  border-radius: 20px;
}

.setup__switch-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s ease;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.setup__switch input:checked + .setup__switch-slider {
  background-color: var(--primary, #3b82f6);
}

.setup__switch input:checked + .setup__switch-slider:before {
  transform: translateX(16px);
}

.setup__switch-label {
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.82rem;
  cursor: pointer;
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
