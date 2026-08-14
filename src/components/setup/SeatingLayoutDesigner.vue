<template>
  <div class="seating-designer">
    <!-- Presets & Saved Templates Bar (Single Top Control Row) -->
    <div class="seating-designer__top-bar">
      <div class="seating-designer__preset-group">
        <span class="seating-designer__preset-label">Layout Presets:</span>
        <div class="setup__segmented-toggle">
          <button 
            type="button" 
            class="setup__segmented-btn"
            @click="applyPreset('rows')"
            title="Standard uniform rows & columns"
          >
            Rows
          </button>
          <button 
            type="button" 
            class="setup__segmented-btn"
            @click="applyPreset('pods4')"
            title="Groups of 4 desks with center aisles"
          >
            Pods of 4
          </button>
          <button 
            type="button" 
            class="setup__segmented-btn"
            @click="applyPreset('horseshoe')"
            title="Perimeter U-shape layout with center aisle"
          >
            Horseshoe
          </button>
          <button 
            type="button" 
            class="setup__segmented-btn"
            @click="applyPreset('pairs')"
            title="Paired desks with aisles"
          >
            Pairs
          </button>
        </div>
      </div>

      <div class="seating-designer__saved-select-group">
        <select 
          v-model="selectedSavedPresetId" 
          class="setup__input seating-designer__saved-select"
          @change="onLoadSavedPreset"
        >
          <option value="">-- Load Saved Custom Template --</option>
          <option v-for="tmpl in savedTemplates" :key="tmpl.id" :value="tmpl.id">
            {{ tmpl.name }} ({{ tmpl.rows }}x{{ tmpl.cols }})
          </option>
        </select>
        <button 
          type="button"
          class="setup__btn-ghost"
          style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600;"
          @click="saveCurrentAsTemplate"
          title="Save active layout as a reusable template"
        >
          <Save :size="14" /> Save Template
        </button>
      </div>
    </div>

    <!-- Designer Tools Toolbar -->
    <div class="seating-designer__toolbar">
      <!-- Grid Dimensions -->
      <div class="seating-designer__dimensions">
        <span class="seating-designer__dim-text">Grid:</span>
        <input 
          type="number" 
          min="2" 
          max="20" 
          v-model.number="localRows" 
          class="setup__input seating-designer__dim-input" 
          @change="updateGridDimensions"
          title="Number of rows"
        />
        <span class="seating-designer__dim-sep">×</span>
        <input 
          type="number" 
          min="2" 
          max="20" 
          v-model.number="localCols" 
          class="setup__input seating-designer__dim-input" 
          @change="updateGridDimensions"
          title="Number of columns"
        />
      </div>

      <!-- Mode Selector Segmented Group -->
      <div class="setup__segmented-toggle" style="margin: 0;">
        <button 
          type="button" 
          class="setup__segmented-btn"
          :class="{ 'setup__segmented-btn--active': activeTool === 'seat' }"
          @click="activeTool = 'seat'"
        >
          <Armchair :size="14" />
          <span>Student Seat</span>
        </button>
        <button 
          type="button" 
          class="setup__segmented-btn"
          :class="{ 'setup__segmented-btn--active': activeTool === 'aisle' }"
          @click="activeTool = 'aisle'"
        >
          <Footprints :size="14" />
          <span>Aisle / Walkway</span>
        </button>
        <button 
          type="button" 
          class="setup__segmented-btn"
          :class="{ 'setup__segmented-btn--active': activeTool === 'group' }"
          @click="activeTool = 'group'"
        >
          <Users :size="14" />
          <span>Table / Pod</span>
        </button>
      </div>

      <!-- Active Table Pod Selector (When tool = group) -->
      <div v-if="activeTool === 'group'" class="seating-designer__pod-config">
        <select v-model="selectedPodId" class="setup__input seating-designer__pod-select">
          <option v-for="pod in pods" :key="pod.id" :value="pod.id">
            {{ pod.name }}
          </option>
        </select>
        <button type="button" class="setup__btn-ghost" style="padding: 4px 8px; font-size: 0.75rem;" @click="createNewPod">
          + New Pod
        </button>
        <button v-if="pods.length > 1" type="button" class="setup__icon-btn setup__icon-btn--danger" style="padding: 4px;" @click="deleteActivePod" title="Delete Pod">
          <Trash2 :size="14" />
        </button>
      </div>

      <!-- Clear All Seats Action -->
      <button 
        type="button" 
        class="setup__btn-ghost" 
        style="padding: 6px 12px; font-size: 0.8rem; color: #dc2626; display: flex; align-items: center; gap: 6px; margin-left: auto;"
        @click="clearAllSeats"
        title="Unassign all students from the seating chart and move them to unassigned pool"
      >
        <Trash2 :size="14" /> Clear All Seats
      </button>
    </div>

    <!-- Visual Interactive Grid Editor -->
    <div class="seating-designer__canvas-container">
      <div 
        class="seating-designer__grid-canvas"
        :style="canvasGridStyle"
      >
        <template v-for="r in localRows" :key="r">
          <div 
            v-for="c in localCols" 
            :key="`${r}-${c}`"
            class="seating-designer__cell"
            :class="{
              'seating-designer__cell--aisle': isCellAisle(r, c),
              'seating-designer__cell--seat': !isCellAisle(r, c),
              'seating-designer__cell--occupied': isCellOccupied(r, c)
            }"
            :style="getCellPodStyle(r, c)"
            @click="onCellClick(r, c)"
          >
            <!-- Pod label badge in top-left if cell belongs to a pod -->
            <span v-if="getCellPod(r, c)" class="seating-designer__pod-badge" :style="{ backgroundColor: getCellPod(r, c).color }">
              {{ getCellPod(r, c).name }}
            </span>

            <div class="seating-designer__cell-content">
              <template v-if="isCellAisle(r, c)">
                <span class="seating-designer__aisle-tag">Aisle</span>
              </template>
              <template v-else>
                <Armchair :size="16" class="seating-designer__seat-icon" />
                <span class="seating-designer__cell-coord">R{{ r }}-C{{ c }}</span>
                <span v-if="isCellOccupied(r, c)" class="seating-designer__occupant-name">
                  {{ getOccupantName(r, c) }}
                </span>
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { LayoutGrid, Footprints, Armchair, Users, Save, Trash2 } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'
import * as settingsService from '../../db/settingsService.js'

const { activeClass, gridSize, checkResize, updateActiveClass, students, assignSeat } = useClassroom()
const { prompt, confirm, alert } = useMessage()

const localRows = ref(gridSize.value.rows || 6)
const localCols = ref(gridSize.value.cols || 6)
const activeTool = ref('seat') // 'seat' | 'aisle' | 'group'

const cellTypes = ref({})
const pods = ref([
  { id: 'pod-1', name: 'Table 1', color: 'var(--accent-blue, #3b82f6)', cells: [] },
  { id: 'pod-2', name: 'Table 2', color: 'var(--accent-green, #10b981)', cells: [] },
  { id: 'pod-3', name: 'Table 3', color: 'var(--accent-amber, #f59e0b)', cells: [] },
  { id: 'pod-4', name: 'Table 4', color: 'var(--accent-purple, #8b5cf6)', cells: [] },
])
const selectedPodId = ref('pod-1')
const savedTemplates = ref([])
const selectedSavedPresetId = ref('')

const podColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

onMounted(async () => {
  await loadSavedTemplates()
  initFromActiveClass()
})

watch(() => activeClass.value, () => {
  initFromActiveClass()
})

function initFromActiveClass() {
  if (!activeClass.value) return
  localRows.value = activeClass.value.gridSize?.rows || 6
  localCols.value = activeClass.value.gridSize?.cols || 6
  
  const layout = activeClass.value.layoutConfig || {}
  cellTypes.value = { ...(layout.cellTypes || {}) }
  if (layout.pods && layout.pods.length > 0) {
    pods.value = JSON.parse(JSON.stringify(layout.pods))
    selectedPodId.value = pods.value[0]?.id || ''
  }
}

async function loadSavedTemplates() {
  try {
    savedTemplates.value = await settingsService.getSavedLayoutPresets()
  } catch (err) {
    console.error('Failed to load layout templates:', err)
  }
}

function getCellKey(r, c) {
  return `${r}-${c}`
}

const canvasGridStyle = computed(() => {
  const cols = localCols.value
  const rows = localRows.value

  const colTracks = []
  for (let c = 1; c <= cols; c++) {
    let isFullAisleCol = true
    for (let r = 1; r <= rows; r++) {
      if (!isCellAisle(r, c)) {
        isFullAisleCol = false
        break
      }
    }
    colTracks.push(isFullAisleCol ? '0.35fr' : '1fr')
  }

  return {
    gridTemplateColumns: colTracks.join(' '),
    gridTemplateRows: `repeat(${rows}, 1fr)`
  }
})

function isCellAisle(r, c) {
  return cellTypes.value[getCellKey(r, c)] === 'aisle'
}

function getCellPod(r, c) {
  const key = getCellKey(r, c)
  return pods.value.find(p => p.cells.includes(key)) || null
}

function getCellPodStyle(r, c) {
  const pod = getCellPod(r, c)
  if (!pod || isCellAisle(r, c)) return {}
  return {
    borderColor: pod.color,
    boxShadow: `inset 0 0 0 1px ${pod.color}`
  }
}

function isCellOccupied(r, c) {
  return Object.values(students.value).some(s => s.seat?.row === r && s.seat?.col === c)
}

function getOccupantName(r, c) {
  const s = Object.values(students.value).find(s => s.seat?.row === r && s.seat?.col === c)
  return s ? `${s.firstName} ${s.lastName.charAt(0)}.` : ''
}

async function onCellClick(r, c) {
  const key = getCellKey(r, c)
  
  if (activeTool.value === 'aisle') {
    // If a student is currently seated in this cell, move them to the unassigned pool
    const s = Object.entries(students.value).find(([_, st]) => st.seat?.row === r && st.seat?.col === c)
    if (s) {
      await assignSeat(s[0], null)
    }

    cellTypes.value[key] = 'aisle'
    removeFromAllPods(key)
    saveLayoutToClass()
  } else if (activeTool.value === 'seat') {
    delete cellTypes.value[key]
    removeFromAllPods(key)
    saveLayoutToClass()
  } else if (activeTool.value === 'group') {
    delete cellTypes.value[key]
    removeFromAllPods(key)
    const pod = pods.value.find(p => p.id === selectedPodId.value)
    if (pod && !pod.cells.includes(key)) {
      pod.cells.push(key)
    }
    saveLayoutToClass()
  }
}

async function clearAllSeats() {
  const ok = await confirm('Unassign all students from the seating chart and move them to the unassigned roster pool?')
  if (!ok) return
  for (const [studentId, s] of Object.entries(students.value)) {
    if (s.seat) {
      await assignSeat(studentId, null)
    }
  }
}

function removeFromAllPods(key) {
  pods.value.forEach(p => {
    p.cells = p.cells.filter(c => c !== key)
  })
}

function createNewPod() {
  const num = pods.value.length + 1
  const newPod = {
    id: `pod-${Date.now()}`,
    name: `Table ${num}`,
    color: podColors[(num - 1) % podColors.length],
    cells: []
  }
  pods.value.push(newPod)
  selectedPodId.value = newPod.id
  saveLayoutToClass()
}

async function deleteActivePod() {
  if (pods.value.length <= 1) return
  const pod = pods.value.find(p => p.id === selectedPodId.value)
  if (!pod) return
  
  const ok = await confirm(`Delete ${pod.name}? Desks in this group will revert to unassigned seats.`)
  if (!ok) return
  
  pods.value = pods.value.filter(p => p.id !== selectedPodId.value)
  selectedPodId.value = pods.value[0]?.id || ''
  saveLayoutToClass()
}

async function updateGridDimensions() {
  const ok = await checkResize(localRows.value, localCols.value)
  if (ok) {
    saveLayoutToClass()
  } else {
    localRows.value = gridSize.value.rows
    localCols.value = gridSize.value.cols
  }
}

function saveLayoutToClass() {
  const layoutConfig = {
    cellTypes: { ...cellTypes.value },
    pods: JSON.parse(JSON.stringify(pods.value))
  }
  updateActiveClass({
    gridSize: { rows: localRows.value, cols: localCols.value },
    layoutConfig
  })
}

function applyPreset(presetType) {
  cellTypes.value = {}
  const rows = localRows.value
  const cols = localCols.value

  if (presetType === 'rows') {
    pods.value = []
  } else if (presetType === 'pods4') {
    const newPods = []
    let podCount = 1
    cellTypes.value = {}

    if (cols >= 5) {
      const midCol = Math.ceil(cols / 2)
      for (let r = 1; r <= rows; r++) cellTypes.value[`${r}-${midCol}`] = 'aisle'
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
    for (let rGroup = 0; rGroup < 2; rGroup++) {
      for (let cGroup = 0; cGroup < 2; cGroup++) {
        const podId = `pod-${podCount}`
        const pod = {
          id: podId,
          name: `Group ${podCount}`,
          color: colors[(podCount - 1) % colors.length],
          cells: []
        }
        const startR = rGroup === 0 ? 1 : Math.ceil(rows / 2) + 1
        const endR = rGroup === 0 ? Math.floor(rows / 2) : rows
        const startC = cGroup === 0 ? 1 : Math.ceil(cols / 2) + 1
        const endC = cGroup === 0 ? Math.floor(cols / 2) : cols

        for (let r = startR; r <= endR; r++) {
          for (let c = startC; c <= endC; c++) {
            const key = `${r}-${c}`
            if (!isCellAisle(r, c)) pod.cells.push(key)
          }
        }
        newPods.push(pod)
        podCount++
      }
    }
    pods.value = newPods
  } else if (presetType === 'horseshoe') {
    cellTypes.value = {}
    for (let r = 2; r <= rows; r++) {
      for (let c = 2; c < cols; c++) {
        cellTypes.value[`${r}-${c}`] = 'aisle'
      }
    }
    pods.value = [
      { id: 'pod-1', name: 'Horseshoe U', color: '#3b82f6', cells: [] }
    ]
  } else if (presetType === 'pairs') {
    cellTypes.value = {}
    for (let r = 1; r <= rows; r++) {
      for (let c = 3; c <= cols; c += 3) {
        cellTypes.value[`${r}-${c}`] = 'aisle'
      }
    }
    pods.value = []
  }

  saveLayoutToClass()
}

async function saveCurrentAsTemplate() {
  const name = await prompt('Enter a name for this custom layout template:', 'My Lab Setup')
  if (!name || !name.trim()) return

  const presetObj = {
    id: `template-${Date.now()}`,
    name: name.trim(),
    rows: localRows.value,
    cols: localCols.value,
    layoutConfig: {
      cellTypes: { ...cellTypes.value },
      pods: JSON.parse(JSON.stringify(pods.value))
    }
  }

  await settingsService.saveLayoutPreset(presetObj)
  await loadSavedTemplates()
  await alert(`Layout template "${name.trim()}" saved successfully!`)
}

function onLoadSavedPreset() {
  if (!selectedSavedPresetId.value) return
  const tmpl = savedTemplates.value.find(t => t.id === selectedSavedPresetId.value)
  if (!tmpl) return

  localRows.value = tmpl.rows
  localCols.value = tmpl.cols
  cellTypes.value = { ...(tmpl.layoutConfig?.cellTypes || {}) }
  pods.value = JSON.parse(JSON.stringify(tmpl.layoutConfig?.pods || []))
  
  saveLayoutToClass()
  selectedSavedPresetId.value = ''
}
</script>

<style scoped>
.seating-designer {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.seating-designer__top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.seating-designer__preset-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.seating-designer__preset-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.seating-designer__saved-select-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seating-designer__saved-select {
  padding: 6px 12px;
  font-size: 0.82rem;
  width: 270px;
  max-width: 320px;
}

.seating-designer__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.seating-designer__dimensions {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  background: var(--surface);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.seating-designer__dim-text {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.seating-designer__dim-sep {
  color: var(--text-secondary);
  font-weight: 800;
}

.seating-designer__dim-input {
  width: 44px;
  min-height: 28px !important;
  padding: 2px 4px !important;
  text-align: center;
  font-weight: 700;
  font-size: 0.85rem !important;
}

.seating-designer__pod-config {
  display: flex;
  align-items: center;
  gap: 6px;
}

.seating-designer__pod-select {
  padding: 4px 8px;
  font-size: 0.78rem;
  width: 120px;
  min-height: 30px !important;
}

.seating-designer__canvas-container {
  overflow-x: auto;
  padding: 4px;
}

.seating-designer__grid-canvas {
  display: grid;
  gap: 4px;
  min-height: 240px;
  width: 100%;
}

.seating-designer__cell {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 2px;
  min-height: 48px;
  min-width: 0;
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: transform 0.1s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.seating-designer__cell:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.seating-designer__cell--aisle {
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  opacity: 0.6;
}

.seating-designer__cell--seat {
  background: var(--surface);
}

.seating-designer__pod-badge {
  position: absolute;
  top: 3px;
  left: 3px;
  font-size: 0.62rem;
  font-weight: 700;
  color: #fff;
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1;
}

.seating-designer__cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.seating-designer__aisle-tag {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.seating-designer__seat-icon {
  color: var(--text-secondary);
  opacity: 0.7;
}

.seating-designer__cell-coord {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.seating-designer__occupant-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
}
</style>
