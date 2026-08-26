<template>
  <div class="dossier-cat-panel">
    <div class="dossier-cat-panel__header">
      <span class="dossier-cat-panel__title">Category Breakdown</span>
      <button 
        class="mode-toggle-btn"
        @click="cycleMode"
        :title="`Currently showing ${currentMode === 'official' ? 'Official' : 'Consistent'} marks. Click to switch.`"
      >
        <span class="mode-toggle-label">{{ currentMode === 'official' ? 'Official' : 'Consistent' }}</span>
        <ArrowUpDown :size="11" class="mode-toggle-icon" />
      </button>
    </div>

    <div class="dossier-cat-list">
      <div 
        v-for="cat in visibleCategories" 
        :key="cat.categoryId" 
        class="dossier-cat-row"
        :class="{ 
          'dossier-cat-row--overridden': cat.isOverridden,
          'dossier-cat-row--zero-weight': cat.weight === 0
        }"
      >
        <!-- Category Identity & Weight & Progress Bar -->
        <div class="dossier-cat-row__left">
          <div class="dossier-cat-row__info">
            <span 
              class="dossier-cat-row__name" 
              :title="`${cat.name} (${cat.weight}% weight)`"
            >
              {{ cat.name }}
            </span>
            <span v-if="cat.isOverridden" class="dossier-cat-row__override-tag">Override</span>
          </div>

          <!-- Slim Progress Bar -->
          <div class="dossier-cat-row__progress">
            <div 
              class="dossier-cat-row__bar" 
              :style="{ 
                width: `${getDisplayedScore(cat) || 0}%`, 
                backgroundColor: getGradeColor(getDisplayedScore(cat)) 
              }"
            ></div>
          </div>
        </div>

        <!-- Single Score & Actions -->
        <div class="dossier-cat-row__right">
          <!-- Edit Mode Input (always edits official override) -->
          <div v-if="editingCatId === cat.categoryId" class="dossier-cat-row__edit-mode">
            <input 
              ref="editInput"
              v-model="overrideValue"
              type="number"
              class="dossier-cat-row__input"
              @keyup.enter="saveOverride(cat.categoryId)"
              @keyup.esc="cancelEdit"
            />
            <div class="dossier-cat-row__edit-btns">
              <button class="btn-icon btn-save" title="Save" @click="saveOverride(cat.categoryId)"><Check :size="12" /></button>
              <button v-if="cat.isOverridden" class="btn-icon btn-remove" title="Remove Override" @click="removeOverride(cat.categoryId)"><Trash2 :size="12" /></button>
              <button class="btn-icon btn-cancel" title="Cancel" @click="cancelEdit"><X :size="12" /></button>
            </div>
          </div>

          <!-- Normal Display Mode: Single Active Score -->
          <div v-else class="dossier-cat-row__score-cluster">
            <span 
              class="dossier-cat-row__score" 
              :style="{ color: getGradeColor(getDisplayedScore(cat)) }"
              :title="getScoreTooltip(cat)"
            >
              {{ formatScore(getDisplayedScore(cat)) }}
            </span>

            <!-- Action buttons (revealed on hover) -->
            <div class="dossier-cat-row__actions">
              <button 
                v-if="cat.isOverridden"
                class="btn-cat-action btn-cat-action--danger" 
                title="Remove Override"
                @click="removeOverride(cat.categoryId)"
              >
                <Trash2 :size="11" />
              </button>
              <button 
                class="btn-cat-action" 
                title="Override Category Score"
                @click="startEdit(cat)"
              >
                <Pencil :size="11" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { Pencil, Check, X, Trash2, ArrowUpDown } from 'lucide-vue-next'
import { saveStudentOverride } from '../../composables/useGradebook.js'
import { useMessage } from '../../composables/useMessage.js'

const props = defineProps({
  categories: { type: Array, required: true },
  studentId:  { type: String, required: true }
})

const visibleCategories = computed(() => props.categories || [])

// Calculation mode: 'official' | 'consistent'
const currentMode = ref('official')

function cycleMode() {
  currentMode.value = currentMode.value === 'official' ? 'consistent' : 'official'
}

function getDisplayedScore(cat) {
  if (currentMode.value === 'consistent') {
    return cat.consistentScore !== null && cat.consistentScore !== undefined ? cat.consistentScore : cat.score
  }
  return cat.score
}

function getScoreTooltip(cat) {
  const officialStr = `Official: ${formatScore(cat.score)}`
  const hasConsistent = cat.consistentScore !== null && cat.consistentScore !== undefined
  
  if (!hasConsistent) {
    return officialStr
  }

  const consistentDetail = cat.bucketLabel && cat.count && cat.totalCount
    ? `Consistent: ${formatScore(cat.consistentScore)} based on ${cat.bucketLabel} (${cat.count} of ${cat.totalCount})`
    : `Consistent: ${formatScore(cat.consistentScore)}`

  if (currentMode.value === 'official') {
    return `${officialStr} • ${consistentDetail}`
  } else {
    return `${consistentDetail} • ${officialStr}`
  }
}

const { confirm } = useMessage()

const editingCatId = ref(null)
const overrideValue = ref('')
const editInput = ref(null)

function startEdit(cat) {
  editingCatId.value = cat.categoryId
  overrideValue.value = cat.score !== null ? Math.round(cat.score) : ''
  nextTick(() => {
    if (editInput.value?.[0]) editInput.value[0].focus()
  })
}

function cancelEdit() {
  editingCatId.value = null
  overrideValue.value = ''
}

async function saveOverride(catId) {
  await saveStudentOverride(props.studentId, catId, overrideValue.value)
  cancelEdit()
}

async function removeOverride(catId) {
  if (await confirm('Are you sure you want to remove this category override?')) {
    await saveStudentOverride(props.studentId, catId, '')
    cancelEdit()
  }
}

function formatScore(score) {
  if (score === null || score === undefined) return '--'
  return `${Math.round(score)}%`
}

function getGradeColor(score) {
  if (score === null || score === undefined) return 'var(--text-secondary)'
  if (score >= 80) return '#34c759'
  if (score >= 70) return '#30b0c7'
  if (score >= 60) return '#ff9500'
  return '#ff3b30'
}
</script>

<style scoped>
.dossier-cat-panel {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  padding:       10px 12px;
  display:       flex;
  flex-direction: column;
  gap:            8px;
}

.dossier-cat-panel__header {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  border-bottom:   1px solid var(--border);
  padding-bottom:  6px;
}

.dossier-cat-panel__title {
  margin:         0;
  font-size:      0.74rem;
  font-weight:    700;
  color:          var(--text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space:    nowrap;
}

.mode-toggle-btn {
  display:       inline-flex;
  align-items:   center;
  gap:           4px;
  padding:       2px 8px;
  background:    var(--bg-secondary);
  border:        1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor:        pointer;
  transition:    all 0.15s ease;
  color:         var(--text-secondary);
}

.mode-toggle-btn:hover {
  background:    var(--primary-light, rgba(99, 102, 241, 0.1));
  border-color:  var(--primary);
  color:         var(--primary);
}

.mode-toggle-label {
  font-size:      0.65rem;
  font-weight:    700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.mode-toggle-icon {
  opacity: 0.7;
}

.dossier-cat-list {
  display:        flex;
  flex-direction: column;
  gap:            6px;
}

.dossier-cat-row {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  gap:             10px;
  padding:         4px 6px;
  border-radius:   var(--radius-sm);
  transition:      background 0.15s ease;
  position:        relative;
}

.dossier-cat-row:hover {
  background: var(--bg-secondary);
}

.dossier-cat-row--overridden {
  background: var(--primary-light, rgba(99, 102, 241, 0.08));
}

.dossier-cat-row--zero-weight {
  opacity: 0.75;
}

.dossier-cat-row__left {
  display:        flex;
  flex-direction: column;
  gap:            3px;
  flex:           1;
  min-width:      0;
}

.dossier-cat-row__info {
  display:     flex;
  align-items: center;
  gap:         6px;
}

.dossier-cat-row__name {
  font-size:      0.75rem;
  font-weight:    700;
  color:          var(--text);
  white-space:    nowrap;
  overflow:       hidden;
  text-overflow:  ellipsis;
  cursor:         help;
}

.dossier-cat-row__override-tag {
  font-size:      0.58rem;
  font-weight:    700;
  background:     var(--primary);
  color:          white;
  padding:        1px 4px;
  border-radius:  3px;
  text-transform: uppercase;
}

.dossier-cat-row__progress {
  height:        3px;
  background:    var(--bg-secondary);
  border-radius: 2px;
  overflow:      hidden;
  width:         100%;
}

.dossier-cat-row__bar {
  height:     100%;
  transition: width 0.3s ease;
}

.dossier-cat-row__right {
  display:     flex;
  align-items: center;
  flex-shrink: 0;
}

.dossier-cat-row__score-cluster {
  display:     flex;
  align-items: center;
  gap:         6px;
  position:    relative;
}

.dossier-cat-row__score {
  font-size:   0.92rem;
  font-weight: 800;
  min-width:   34px;
  text-align:  right;
  cursor:      help;
}

.dossier-cat-row__actions {
  display:     flex;
  align-items: center;
  gap:         2px;
  opacity:     0;
  transition:  opacity 0.15s ease;
}

.dossier-cat-row:hover .dossier-cat-row__actions {
  opacity: 1;
}

.btn-cat-action {
  background:    transparent;
  border:        none;
  cursor:        pointer;
  padding:       2px;
  border-radius: 3px;
  color:         var(--text-secondary);
  display:       flex;
  align-items:   center;
  justify-content: center;
}

.btn-cat-action:hover {
  background: var(--surface);
  color:      var(--primary);
}

.btn-cat-action--danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color:      var(--danger);
}

/* Edit Mode */
.dossier-cat-row__edit-mode {
  display:     flex;
  align-items: center;
  gap:         4px;
}

.dossier-cat-row__input {
  width:         44px;
  padding:       2px 4px;
  border:        1px solid var(--primary);
  border-radius: 4px;
  font-size:     0.85rem;
  font-weight:   700;
  text-align:    center;
  background:    var(--surface);
  color:         var(--text);
}

.dossier-cat-row__edit-btns {
  display:     flex;
  align-items: center;
  gap:         2px;
}

.btn-icon {
  background:    transparent;
  border:        none;
  cursor:        pointer;
  padding:       2px;
  border-radius: 2px;
  display:       flex;
  align-items:   center;
  justify-content: center;
}

.btn-save   { color: var(--success); }
.btn-remove { color: var(--danger); }
.btn-cancel { color: var(--text-secondary); }
</style>
