<template>
  <div class="dossier-cat-grid">
    <div 
      v-for="cat in categories" 
      :key="cat.categoryId" 
      class="dossier-cat-card"
      :class="{ 'dossier-cat-card--overridden': cat.isOverridden }"
    >
      <div class="dossier-cat-card__header">
        <span class="dossier-cat-card__name">{{ cat.name }}</span>
        <div class="dossier-cat-card__header-right">
          <span v-if="cat.isOverridden" class="dossier-cat-card__override-badge">Overridden</span>
          <span class="dossier-cat-card__weight">{{ cat.weight }}%</span>
          <button 
            v-if="editingCatId !== cat.categoryId"
            class="dossier-cat-card__edit-btn" 
            title="Override Category"
            @click="startEdit(cat)"
          >
            <Pencil :size="12" />
          </button>
        </div>
      </div>

      <div class="dossier-cat-card__main-metrics">
        <div class="dossier-cat-card__metric">
          <span class="dossier-cat-card__metric-label">OFFICIAL</span>
          
          <div v-if="editingCatId === cat.categoryId" class="dossier-cat-card__edit-mode">
            <input 
              ref="editInput"
              v-model="overrideValue"
              type="number"
              class="dossier-cat-card__input"
              @keyup.enter="saveOverride(cat.categoryId)"
              @keyup.esc="cancelEdit"
            />
            <div class="dossier-cat-card__edit-actions">
              <button class="btn-save" @click="saveOverride(cat.categoryId)"><Check :size="14" /></button>
              <button class="btn-cancel" @click="cancelEdit"><X :size="14" /></button>
            </div>
          </div>
          
          <div v-else class="dossier-cat-card__score" :style="{ color: getGradeColor(cat.score) }">
            {{ formatScore(cat.score) }}
          </div>
        </div>

        <div v-if="cat.consistentScore !== null && editingCatId !== cat.categoryId" class="dossier-cat-card__metric dossier-cat-card__metric--secondary">
          <span class="dossier-cat-card__metric-label">CONSISTENT</span>
          <div class="dossier-cat-card__score dossier-cat-card__score--smaller">
            {{ formatScore(cat.consistentScore) }}
          </div>
          <div v-if="cat.bucketLabel" class="dossier-cat-card__bucket-info">
            ({{ cat.bucketLabel }}, {{ cat.count }} of {{ cat.totalCount }})
          </div>
        </div>
      </div>

      <div class="dossier-cat-card__progress">
        <div 
          class="dossier-cat-card__bar" 
          :style="{ width: `${cat.score || 0}%`, backgroundColor: getGradeColor(cat.score) }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { Pencil, Check, X } from 'lucide-vue-next'
import { saveStudentOverride } from '../../composables/useGradebook.js'

const props = defineProps({
  categories: { type: Array, required: true },
  studentId:  { type: String, required: true }
})

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
.dossier-cat-grid {
  display:               grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap:                   10px;
}

.dossier-cat-card {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  padding:       10px;
  display:       flex;
  flex-direction: column;
  gap:            8px;
  position:       relative;
  transition:     all 0.2s ease;
}

.dossier-cat-card--overridden {
  border-color: var(--primary-light);
  background: var(--bg-hover);
}

.dossier-cat-card__header {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
}

.dossier-cat-card__header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dossier-cat-card__name {
  font-size:   0.75rem;
  font-weight: 700;
  color:       var(--text-secondary);
  text-transform: uppercase;
}

.dossier-cat-card__weight {
  font-size: 0.7rem;
  color:     var(--text-secondary);
  opacity:   0.6;
}

.dossier-cat-card__override-badge {
  font-size: 0.6rem;
  font-weight: 700;
  background: var(--primary-light);
  color: var(--primary);
  padding: 1px 4px;
  border-radius: 4px;
  text-transform: uppercase;
}

.dossier-cat-card__edit-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s ease;
}

.dossier-cat-card:hover .dossier-cat-card__edit-btn {
  opacity: 1;
}

.dossier-cat-card__edit-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.dossier-cat-card__main-metrics {
  display: flex;
  gap: 16px;
  min-height: 48px;
  align-items: center;
}

.dossier-cat-card__metric {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.dossier-cat-card__metric--secondary {
  border-left: 1px solid var(--border);
  padding-left: 16px;
}

.dossier-cat-card__metric-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.dossier-cat-card__score {
  font-size:   1.6rem;
  font-weight: 800;
  line-height: 1;
}

.dossier-cat-card__score--smaller {
  font-size: 1.2rem;
  color: var(--text-primary);
}

.dossier-cat-card__edit-mode {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dossier-cat-card__input {
  width: 50px;
  padding: 4px;
  border: 1px solid var(--primary);
  border-radius: 4px;
  font-size: 1.2rem;
  font-weight: 800;
  background: var(--surface);
  color: var(--text);
  text-align: center;
}

.dossier-cat-card__edit-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dossier-cat-card__edit-actions button {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-save { color: var(--success); }
.btn-save:hover { background: rgba(52, 199, 89, 0.1); }
.btn-cancel { color: var(--danger); }
.btn-cancel:hover { background: rgba(255, 59, 48, 0.1); }

.dossier-cat-card__bucket-info {
  font-size: 0.65rem;
  color: var(--text-secondary);
  margin-top: 4px;
  font-style: italic;
}

.dossier-cat-card__progress {
  height:     4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow:      hidden;
  margin-top:    auto;
}

.dossier-cat-card__bar {
  height:     100%;
  transition: width 0.3s ease;
}
</style>
