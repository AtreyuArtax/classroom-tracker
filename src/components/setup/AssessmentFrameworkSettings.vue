<template>
  <div class="setup__framework-container" v-if="activeClass">
    <!-- Assessment Framework -->
    <div class="setup__card">
      <h2 class="setup__card-title">Assessment Framework</h2>
      
      <div v-if="frameworkWarning" class="setup__inline-banner setup__inline-banner--warning">
        <AlertTriangle :size="16" />
        <span>{{ frameworkWarning }}</span>
        <button type="button" class="setup__inline-banner-close" @click="frameworkWarning = ''">&times;</button>
      </div>
      
      <h3 class="setup__card-subtitle">Categories (Weights)</h3>
      <div class="setup__gb-list">
        <div v-for="(cat, idx) in activeClass.gradebookCategories" :key="cat.categoryId" class="setup__gb-item">
          <input v-model="cat.name" class="setup__input setup__input--naked" @change="saveGradebookSettings" />
          <div class="setup__gb-actions">
            <input v-model.number="cat.weight" type="number" class="setup__input setup__input--weight" @change="saveGradebookSettings" /><span>%</span>
            <button class="setup__icon-btn" :disabled="idx === 0" @click="moveCategory(idx, -1)"><ChevronUp :size="16" /></button>
            <button class="setup__icon-btn" :disabled="idx === activeClass.gradebookCategories.length - 1" @click="moveCategory(idx, 1)"><ChevronDown :size="16" /></button>
            <button class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteCategory(cat)"><Trash2 :size="14" /></button>
          </div>
        </div>
      </div>
      
      <div class="setup__category-footer">
        <button class="setup__btn-ghost setup__btn--full" @click="addCategory">
          <Plus :size="14" /> Add Category
        </button>
        <div class="setup__weight-total" :class="{ 
          'setup__weight-total--under': totalWeight < 100 && totalWeight > 0,
          'setup__weight-total--over': totalWeight > 100 
        }">
          Total: <strong>{{ totalWeight }}%</strong>
          <AlertTriangle v-if="totalWeight !== 100" :size="14" />
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1.5rem;">
        <h3 class="setup__card-subtitle" style="margin: 0;">Units & Expectations</h3>
        <button 
          type="button" 
          class="setup__btn-ghost setup__btn--small" 
          @click="showImportModal = true"
        >
          <BookOpen :size="14" /> Import Expectations
        </button>
      </div>

      <div v-if="frameworkWarning" class="setup__inline-banner setup__inline-banner--warning" style="margin-top: 10px;">
        <AlertTriangle :size="16" />
        <span>{{ frameworkWarning }}</span>
        <button type="button" class="setup__inline-banner-close" @click="frameworkWarning = ''">&times;</button>
      </div>

      <div class="setup__gb-list">
        <div v-for="(unit, idx) in activeClass.gradebookUnits" :key="unit.unitId" class="setup__unit-container">
          <div class="setup__gb-item">
            <div class="setup__unit-title-group">
              <button 
                type="button"
                class="setup__icon-btn setup__expand-btn"
                @click="toggleUnitExpand(unit.unitId)"
              >
                <component :is="expandedUnitId === unit.unitId ? ChevronDown : ChevronRight" :size="16" />
              </button>
              <input v-model="unit.name" class="setup__input setup__input--naked" @change="saveGradebookSettings" />
            </div>
            <div class="setup__gb-actions">
              <button type="button" class="setup__icon-btn" :disabled="idx === 0" @click="moveUnit(idx, -1)"><ChevronUp :size="16" /></button>
              <button type="button" class="setup__icon-btn" :disabled="idx === activeClass.gradebookUnits.length - 1" @click="moveUnit(idx, 1)"><ChevronDown :size="16" /></button>
              <button type="button" class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteUnit(unit.unitId)"><Trash2 :size="14" /></button>
            </div>
          </div>

          <!-- Expectations Panel (Expandable) -->
          <div v-if="expandedUnitId === unit.unitId" class="setup__expectations-panel">
            <h4 class="setup__expectations-title">Curriculum Expectations</h4>
            
            <div class="setup__expectations-list" v-if="unit.expectations?.length">
              <div v-for="exp in unit.expectations" :key="exp.expectationId" class="setup__expectation-item">
                <span class="setup__expectation-code">{{ exp.code }}</span>
                <span class="setup__expectation-desc">{{ exp.description }}</span>
                <button 
                  type="button" 
                  class="setup__icon-btn setup__icon-btn--danger" 
                  @click="deleteExpectation(unit, exp.expectationId)"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
            <div v-else class="setup__expectations-empty">
              No expectations defined for this unit.
            </div>

            <!-- Add Expectation Form -->
            <div class="setup__expectation-form">
              <input 
                v-model="newExpectationCode" 
                class="setup__input setup__input--exp-code" 
                placeholder="Code (e.g. B1.2)" 
                @keydown.enter.prevent="addExpectation(unit)"
              />
              <input 
                v-model="newExpectationDesc" 
                class="setup__input setup__input--exp-desc" 
                placeholder="Description" 
                @keydown.enter.prevent="addExpectation(unit)"
              />
              <button 
                type="button"
                class="setup__btn-ghost setup__btn--small" 
                @click="addExpectation(unit)"
                :disabled="!newExpectationCode.trim()"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
      <button class="setup__btn-ghost setup__btn--full" @click="addUnit"><Plus :size="14" /> Add Unit</button>
    </div>

    <!-- Gradebook Notes -->
    <div class="setup__card">
      <h2 class="setup__card-title">Gradebook Notes</h2>
      <textarea 
        v-model="activeClass.gradebookNotes" 
        class="setup__textarea" 
        placeholder="Notes about grading decisions for this specific class..."
        @blur="saveGradebookSettings"
      ></textarea>
    </div>

    <!-- Template Management -->
    <div class="setup__card">
      <h2 class="setup__card-title">Template Management</h2>
      <p class="setup__hint">Save your categories and milestones as a template to reuse in other classes.</p>
      <div class="setup__template-save">
        <input v-model="newTemplateName" class="setup__input" placeholder="Template Name" />
        <button class="setup__btn-primary" :disabled="!newTemplateName.trim()" @click="saveTemplate">
          Save as Template
        </button>
      </div>

      <div v-if="templates.length > 0" class="setup__template-apply" style="margin-top: 1rem;">
        <h3 class="setup__card-subtitle">Saved Templates</h3>
        <div class="setup__gb-list">
          <div v-for="tmpl in templates" :key="tmpl.templateId" class="setup__gb-item">
            <span class="setup__tmpl-name">{{ tmpl.name }}</span>
            <div class="setup__gb-actions">
              <button class="setup__pill-btn" @click="onApplyTemplate(tmpl)">Apply</button>
              <button class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteTemplate(tmpl.templateId)">
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Expectation Importer Modal -->
    <ExpectationImportModal
      v-model="showImportModal"
      :existing-units="activeClass.gradebookUnits || []"
      @import="onExpectationImport"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { globalMilestones } from '../../composables/useGradebook.js'
import { useMessage } from '../../composables/useMessage.js'
import * as gradebookService from '../../db/gradebookService.js'
import * as classService from '../../db/classService.js'
import * as settingsService from '../../db/settingsService.js'
import * as eventService from '../../db/eventService.js'
import { ChevronUp, ChevronDown, Trash2, Plus, AlertTriangle, ChevronRight, BookOpen } from 'lucide-vue-next'
import ExpectationImportModal from './ExpectationImportModal.vue'

const { activeClass, triggerActiveClass } = useClassroom()
const { alert, confirm } = useMessage()

const templates = ref([])
const newTemplateName = ref('')
const showImportModal = ref(false)

const expandedUnitId = ref(null)
const newExpectationCode = ref('')
const newExpectationDesc = ref('')

function toggleUnitExpand(unitId) {
  expandedUnitId.value = expandedUnitId.value === unitId ? null : unitId
  newExpectationCode.value = ''
  newExpectationDesc.value = ''
}

function onExpectationImport(payload) {
  if (!activeClass.value) return
  if (!activeClass.value.gradebookUnits) {
    activeClass.value.gradebookUnits = []
  }

  if (payload.mode === 'auto-units') {
    // Mode A: Auto-Create Units from preset strands
    payload.preset.strands.forEach(strand => {
      const expList = []
      if (strand.overalls) {
        strand.overalls.forEach(ov => {
          expList.push({ code: ov.code, description: ov.description })
          if (payload.granularity === 'all' && ov.specifics) {
            ov.specifics.forEach(sp => {
              expList.push({ code: sp.code, description: sp.description })
            })
          }
        })
      } else if (strand.expectations) {
        strand.expectations.forEach(e => expList.push(e))
      }

      activeClass.value.gradebookUnits.push({
        unitId: crypto.randomUUID(),
        name: strand.name,
        expectations: expList.map(e => ({
          expectationId: crypto.randomUUID(),
          code: e.code,
          description: e.description
        }))
      })
    })
  } else if (payload.mode === 'attach-expectations') {
    // Mode B: Attach expectations to a target unit (or new unit)
    let targetUnit = null
    if (payload.targetUnitChoice === 'new') {
      targetUnit = {
        unitId: crypto.randomUUID(),
        name: payload.newUnitName || 'Imported Unit',
        expectations: []
      }
      activeClass.value.gradebookUnits.push(targetUnit)
    } else {
      targetUnit = activeClass.value.gradebookUnits.find(u => u.unitId === payload.targetUnitChoice)
    }

    if (targetUnit) {
      if (!targetUnit.expectations) targetUnit.expectations = []
      payload.expectations.forEach(e => {
        targetUnit.expectations.push({
          expectationId: crypto.randomUUID(),
          code: e.code,
          description: e.description
        })
      })
    }
  }

  saveGradebookSettings()
}

async function addExpectation(unit) {
  if (!newExpectationCode.value.trim()) return
  if (!unit.expectations) {
    unit.expectations = []
  }
  unit.expectations.push({
    expectationId: crypto.randomUUID(),
    code: newExpectationCode.value.trim().toUpperCase(),
    description: newExpectationDesc.value.trim()
  })
  newExpectationCode.value = ''
  newExpectationDesc.value = ''
  await saveGradebookSettings()
}

async function deleteExpectation(unit, expectationId) {
  if (!activeClass.value) return
  const classEvents = await eventService.getEventsByClass(activeClass.value.classId)
  const count = classEvents.filter(e => e.expectationId === expectationId).length

  let confirmMsg = 'Delete this expectation?'
  if (count > 0) {
    confirmMsg = `Delete this expectation? Warning: There are ${count} logged student observations/conversations associated with it. Deleting it will convert these comments into general observations.`
  }

  if (!await confirm(confirmMsg)) return

  if (count > 0) {
    await eventService.detachEventsForDeletedExpectation(activeClass.value.classId, expectationId)
  }

  unit.expectations = unit.expectations.filter(e => e.expectationId !== expectationId)
  await saveGradebookSettings()
}

const totalWeight = computed(() => {
  if (!activeClass.value?.gradebookCategories) return 0
  return activeClass.value.gradebookCategories.reduce((sum, c) => sum + (c.weight || 0), 0)
})

let saveTimer = null
function debouncedSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveGradebookSettings(), 300)
}

watch(
  () => activeClass.value?.gradebookCategories,
  () => debouncedSave(),
  { deep: true }
)

watch(
  () => activeClass.value?.gradebookUnits,
  () => debouncedSave(),
  { deep: true }
)

async function saveGradebookSettings() {
  if (!activeClass.value) return
  await classService.updateClass(activeClass.value.classId, {
    gradebookCategories: activeClass.value.gradebookCategories,
    gradebookUnits: activeClass.value.gradebookUnits,
    gradebookNotes: activeClass.value.gradebookNotes
  })
  triggerActiveClass()
  // Milestones are now global and saved to settings independently
  await settingsService.saveGlobalMilestones(JSON.parse(JSON.stringify(globalMilestones.value)))
}

async function addCategory() {
  if (!activeClass.value) return
  const newCat = {
    categoryId: crypto.randomUUID(),
    name: 'New Category',
    weight: 0
  }
  if (!activeClass.value.gradebookCategories) {
    activeClass.value.gradebookCategories = []
  }
  activeClass.value.gradebookCategories.push(newCat)
  await saveGradebookSettings()
}

async function moveCategory(index, direction) {
  if (!activeClass.value) return
  const cats = activeClass.value.gradebookCategories
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= cats.length) return

  const temp = cats[index]
  cats[index] = cats[newIndex]
  cats[newIndex] = temp

  await saveGradebookSettings()
}

async function moveUnit(index, direction) {
  if (!activeClass.value) return
  const units = activeClass.value.gradebookUnits
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= units.length) return

  const temp = units[index]
  units[index] = units[newIndex]
  units[newIndex] = temp

  await saveGradebookSettings()
}

const frameworkWarning = ref('')

function showWarning(msg) {
  frameworkWarning.value = msg
  setTimeout(() => {
    if (frameworkWarning.value === msg) frameworkWarning.value = ''
  }, 6000)
}

async function onDeleteCategory(cat) {
  if (!activeClass.value) return
  
  const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  const inUse = assessments.some(a => a.categoryId === cat.categoryId)
  
  if (inUse) {
    showWarning(`Cannot delete category "${cat.name}" because it has assessments assigned to it. Remove all assessments in this category first.`)
    return
  }

  if (!await confirm(`Delete category "${cat.name}"?`)) return

  if (activeClass.value.gradebookCategories.length <= 1) {
    showWarning('At least one category is required.')
    return
  }

  activeClass.value.gradebookCategories = activeClass.value.gradebookCategories.filter(c => c.categoryId !== cat.categoryId)
  await saveGradebookSettings()
}

async function addUnit() {
  if (!activeClass.value) return
  const newUnit = {
    unitId: crypto.randomUUID(),
    name: 'New Unit'
  }
  if (!activeClass.value.gradebookUnits) {
    activeClass.value.gradebookUnits = []
  }
  activeClass.value.gradebookUnits.push(newUnit)
  await saveGradebookSettings()
}

async function onDeleteUnit(unitId) {
  if (!activeClass.value) return
  
  const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  const unit = activeClass.value.gradebookUnits.find(u => u.unitId === unitId)
  const inUse = assessments.some(a => a.unitId === unitId || (unit && a.unitId === unit.name))
  
  if (inUse) {
    showWarning(`Cannot delete unit "${unit?.name || 'this unit'}" because it has assessments assigned to it. Remove or reassign all assessments in this unit before deleting.`)
    return
  }

  const classEvents = await eventService.getEventsByClass(activeClass.value.classId)
  const count = classEvents.filter(e => e.unitId === unitId).length

  let confirmMsg = `Delete unit "${unit?.name || 'this unit'}"?`
  if (count > 0) {
    confirmMsg = `Delete unit "${unit?.name || 'this unit'}"? Warning: There are ${count} logged student observations/conversations associated with it. Deleting it will convert these comments into general observations.`
  }

  if (!await confirm(confirmMsg)) return

  if (count > 0) {
    await eventService.detachEventsForDeletedUnit(activeClass.value.classId, unitId)
  }

  activeClass.value.gradebookUnits = activeClass.value.gradebookUnits.filter(u => u.unitId !== unitId)
  await saveGradebookSettings()
}

async function saveTemplate() {
  if (!activeClass.value || !newTemplateName.value.trim()) return
  
  const existing = templates.value.some(t => t.name.toLowerCase() === newTemplateName.value.trim().toLowerCase())
  if (existing) {
    showWarning('A template with this name already exists.')
    return
  }

  const template = await gradebookService.saveGradebookTemplate(newTemplateName.value.trim(), activeClass.value, globalMilestones.value)
  templates.value.push(template)
  newTemplateName.value = ''
}

async function onApplyTemplate(template) {
  if (!activeClass.value) return
  
  // Check if assessments exist for this class to avoid orphaning grades
  const classAssessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  if (classAssessments && classAssessments.length > 0) {
    showWarning('Cannot apply template: This class already has assessments. Templates can only be applied to empty classes to prevent breaking existing student grades.')
    return
  }
  
  if (!await confirm('This will replace the current categories and milestones. Continue?')) return
  
  const categories = template.categories.map(c => ({ ...c, categoryId: crypto.randomUUID() }))
  const milestones = template.milestones.map(m => ({ ...m, milestoneId: crypto.randomUUID() }))
  const gradebookUnits = (template.gradebookUnits || []).map(u => ({
    ...u,
    unitId: crypto.randomUUID(),
    expectations: (u.expectations || []).map(e => ({
      ...e,
      expectationId: crypto.randomUUID()
    }))
  }))

  activeClassClassCategoriesUpdate(categories, milestones, gradebookUnits)
}

async function activeClassClassCategoriesUpdate(categories, milestones, gradebookUnits = []) {
  activeClass.value.gradebookCategories = categories
  globalMilestones.value = milestones
  activeClass.value.gradebookUnits = gradebookUnits
  await saveGradebookSettings()
}

async function onDeleteTemplate(templateId) {
  if (!await confirm('Delete this template?')) return
  await gradebookService.deleteGradebookTemplate(templateId)
  templates.value = templates.value.filter(t => t.templateId !== templateId)
}

onMounted(async () => {
  templates.value = await gradebookService.getGradebookTemplates()
})
</script>

<style scoped>
.setup__gb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup__gb-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  gap: 12px;
}

.setup__gb-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ── Inherited parent layout classes ─────────────────────────────── */
.setup__card {
  background:    var(--surface);
  padding:       24px;
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-sm);
  border:        1px solid var(--border);
  display:       flex;
  flex-direction: column;
  gap:           16px;
  margin-bottom: 24px;
}

.setup__card-title {
  font-size:     1.1rem;
  font-weight:   700;
  color:         var(--text);
  margin-bottom: 4px;
  display:       flex;
  align-items:   center;
  gap:           10px;
}

.setup__hint {
  font-size: 0.82rem;
  color:     var(--text-secondary);
  line-height: 1.5;
}

.setup__input {
  width:           100%;
  min-height:      44px;
  padding:         10px 14px;
  border:          1px solid var(--border);
  border-radius:   var(--radius-md);
  background:      var(--bg-input, rgba(255,255,255,0.04));
  color:           var(--text);
  font-size:       0.9rem;
  font-weight:     600;
  transition:      border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing:      border-box;
}

.setup__input:focus {
  outline:      none;
  border-color: var(--primary);
}

.setup__btn-primary {
  min-height:      44px;
  padding:         0 20px;
  border:          none;
  border-radius:   var(--radius-md);
  background:      var(--primary);
  color:           #ffffff;
  font-size:       0.9rem;
  font-weight:     600;
  cursor:          pointer;
  transition:      background 0.15s ease, transform 0.1s ease;
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  gap:             8px;
}

.setup__btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.setup__btn-primary:disabled {
  opacity: 0.5;
  cursor:  not-allowed;
}

.setup__btn-ghost {
  min-height:      44px;
  padding:         0 20px;
  border:          1px solid var(--border);
  border-radius:   var(--radius-md);
  background:      transparent;
  color:           var(--text);
  font-size:       0.9rem;
  font-weight:     600;
  cursor:          pointer;
  transition:      background 0.15s ease;
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  gap:             8px;
}

.setup__btn-ghost:hover:not(:disabled) {
  background: var(--bg-hover);
}

.setup__pill-btn {
  padding:       6px 12px;
  border-radius: 100px;
  border:        1px solid var(--border);
  background:    transparent;
  color:         var(--text-secondary);
  font-size:     0.78rem;
  font-weight:   600;
  cursor:        pointer;
  transition:    all 0.15s ease;
}

.setup__pill-btn:hover {
  border-color: var(--primary);
  color:        var(--primary);
}

.setup__icon-btn {
  background: transparent;
  border:     none;
  color:      var(--text-secondary);
  cursor:     pointer;
  padding:    6px;
  border-radius: 50%;
  display:    flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.setup__icon-btn:hover {
  background: var(--bg-hover);
  color:      var(--text);
}

.setup__icon-btn--danger:hover {
  background: #fee2e2 !important;
  color:      #dc2626 !important;
}

.setup__input--naked {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  min-height: auto !important;
  font-weight: 600 !important;
  flex-grow: 1;
  color: var(--text);
}

.setup__input--weight {
  width: 65px !important;
  text-align: center;
  min-height: 32px !important;
  padding: 4px 6px !important;
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

.setup__textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}

.setup__textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.setup__template-save {
  display: flex;
  gap: 8px;
}

.setup__template-save .setup__input {
  flex: 1;
}

.setup__template-apply {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup__card-subtitle {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.setup__tmpl-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.setup__btn--full {
  width: 100%;
}

.setup__category-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}

.setup__weight-total {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.setup__weight-total--under {
  color: #b45309;
}

.setup__weight-total--over {
  color: #b91c1c;
}

/* ── Expectations styles ─────────────────────────────────────────── */
.setup__unit-container {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  overflow: hidden;
}

.setup__unit-container .setup__gb-item {
  border-radius: 0;
  background: transparent;
  border: none;
}

.setup__unit-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.setup__expand-btn {
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.setup__expectations-panel {
  padding: 12px 16px 16px 16px;
  background: rgba(0, 0, 0, 0.15);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setup__expectations-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  margin: 0;
}

.setup__expectations-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setup__expectation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  font-size: 0.85rem;
}

.setup__expectation-code {
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}

.setup__expectation-desc {
  flex: 1;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setup__expectations-empty {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

.setup__expectation-form {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.setup__input--exp-code {
  width: 120px !important;
  min-height: 36px !important;
  padding: 6px 10px !important;
  font-size: 0.8rem !important;
}

.setup__input--exp-desc {
  flex: 1;
  min-height: 36px !important;
  padding: 6px 10px !important;
  font-size: 0.8rem !important;
}

.setup__btn--small {
  min-height: 36px !important;
  padding: 0 12px !important;
  font-size: 0.8rem !important;
}

.setup__inline-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.3;
}

.setup__inline-banner--warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.setup__inline-banner--success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.setup__inline-banner-close {
  margin-left: auto;
  background: none;
  border: none;
  color: currentColor;
  font-size: 1.1rem;
  cursor: pointer;
  opacity: 0.7;
  padding: 0 4px;
}
.setup__inline-banner-close:hover {
  opacity: 1;
}
</style>

