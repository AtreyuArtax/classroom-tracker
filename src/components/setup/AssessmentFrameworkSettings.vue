<template>
  <div class="setup__framework-container" v-if="activeClass">
    <!-- Assessment Framework -->
    <div class="setup__card">
      <h2 class="setup__card-title">Assessment Framework</h2>
      
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

      <h3 class="setup__card-subtitle" style="margin-top: 1.5rem;">Units</h3>
      <div class="setup__gb-list">
        <div v-for="(unit, idx) in activeClass.gradebookUnits" :key="unit.unitId" class="setup__gb-item">
          <input v-model="unit.name" class="setup__input setup__input--naked" @change="saveGradebookSettings" />
          <div class="setup__gb-actions">
            <button class="setup__icon-btn" :disabled="idx === 0" @click="moveUnit(idx, -1)"><ChevronUp :size="16" /></button>
            <button class="setup__icon-btn" :disabled="idx === activeClass.gradebookUnits.length - 1" @click="moveUnit(idx, 1)"><ChevronDown :size="16" /></button>
            <button class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteUnit(unit.unitId)"><Trash2 :size="14" /></button>
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
import { ChevronUp, ChevronDown, Trash2, Plus, AlertTriangle } from 'lucide-vue-next'

const { activeClass, triggerActiveClass } = useClassroom()
const { alert, confirm } = useMessage()

const templates = ref([])
const newTemplateName = ref('')

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

async function onDeleteCategory(cat) {
  if (!activeClass.value) return
  
  const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  const inUse = assessments.some(a => a.categoryId === cat.categoryId)
  
  if (inUse) {
    await alert(`Cannot delete category "${cat.name}" because it has assessments assigned to it. Remove all assessments in this category first.`)
    return
  }

  if (!await confirm(`Delete category "${cat.name}"?`)) return

  if (activeClass.value.gradebookCategories.length <= 1) {
    await alert('At least one category is required.')
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
  const inUse = assessments.some(a => a.unitId === unitId)
  
  if (inUse) {
    await alert(`Cannot delete unit "${unit?.name || 'this unit'}" because it has assessments assigned to it. Remove all assessments in this unit before deleting.`)
    return
  }

  if (!await confirm(`Delete unit "${unit?.name || 'this unit'}"?`)) return

  activeClass.value.gradebookUnits = activeClass.value.gradebookUnits.filter(u => u.unitId !== unitId)
  await saveGradebookSettings()
}

async function saveTemplate() {
  if (!activeClass.value || !newTemplateName.value.trim()) return
  
  const existing = templates.value.some(t => t.name.toLowerCase() === newTemplateName.value.trim().toLowerCase())
  if (existing) {
    await alert('A template with this name already exists.')
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
    await alert('Cannot apply template: This class already has assessments. Templates can only be applied to empty classes to prevent breaking existing student grades.')
    return
  }
  
  if (!await confirm('This will replace the current categories and milestones. Continue?')) return
  
  const categories = template.categories.map(c => ({ ...c, categoryId: crypto.randomUUID() }))
  const milestones = template.milestones.map(m => ({ ...m, milestoneId: crypto.randomUUID() }))

  activeClassClassCategoriesUpdate(categories, milestones)
}

async function activeClassClassCategoriesUpdate(categories, milestones) {
  activeClass.value.gradebookCategories = categories
  globalMilestones.value = milestones
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
  width: 50px !important;
  text-align: right;
  min-height: 32px !important;
  padding: 4px 8px !important;
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
</style>
