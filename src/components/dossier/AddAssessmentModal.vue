<template>
  <BaseModal
    :show="showAddAssessmentModal"
    @close="closeAddAssessment"
    :title="isEditingAssessment ? 'Edit Assessment' : 'New Assessment'"
    max-width="920px"
    :z-index="3000"
  >
    <form class="modal-form modal-form--wide" @submit.prevent="saveAssessment">
      <div class="modal-body-grid">
        <!-- LEFT COLUMN: Metadata & Setup -->
        <div class="modal-col modal-col--left">
          <!-- Target Scope Toggle -->
          <div class="form-group">
            <label class="form-label">Scope</label>
            <div class="toggle-group toggle-group--large">
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': newAssessment.target === 'class' }"
                @click="newAssessment.target = 'class'; onTargetChange()"
              >Class Assessment</button>
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': newAssessment.target === 'individual' }"
                @click="newAssessment.target = 'individual'; onTargetChange()"
              >Individual Assessment</button>
            </div>
          </div>

          <!-- Target Course Stream / Grade Level (Split Classes) -->
          <div v-if="newAssessment.target === 'class' && availableSubCohorts.length > 1" class="form-group">
            <label class="form-label">
              {{ activeClassRecord?.classType === 'elementary' ? 'Target Grade Level' : 'Target Course Stream' }}
            </label>
            <div class="toggle-group toggle-group--large">
              <button 
                v-for="cFilter in availableSubCohorts"
                :key="cFilter"
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': (newAssessment.targetCourseCode || 'all') === cFilter }"
                @click="onCohortToggle(cFilter)"
              >
                {{ cFilter === 'all' ? (activeClassRecord?.classType === 'elementary' ? 'All Grades' : 'All Sections') : cFilter }}
              </button>
            </div>
          </div>

          <!-- Assessment Purpose (Formative vs Summative vs Administrative) -->
          <div class="form-group">
            <label class="form-label">Assessment Purpose</label>
            <div class="toggle-group toggle-group--large">
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': (newAssessment.purpose || 'summative') === 'summative' }"
                @click="newAssessment.purpose = 'summative'; newAssessment.isFormative = false"
              >
                Summative (Official)
              </button>
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': newAssessment.purpose === 'formative' }"
                @click="newAssessment.purpose = 'formative'; newAssessment.isFormative = true"
              >
                Formative (Practice)
              </button>
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': newAssessment.purpose === 'administrative' }"
                @click="newAssessment.purpose = 'administrative'; newAssessment.isFormative = false"
              >
                Admin (Checklist)
              </button>
            </div>
          </div>

          <!-- Tracking Format Toggle (Administrative Mode Only) -->
          <div v-if="newAssessment.purpose === 'administrative'" class="form-group">
            <label class="form-label">Tracking Format</label>
            <div class="toggle-group toggle-group--large">
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': (newAssessment.adminFormat || 'checklist') === 'checklist' }"
                @click="newAssessment.adminFormat = 'checklist'"
              >
                Checklist (✓ / —)
              </button>
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': newAssessment.adminFormat === 'text' }"
                @click="newAssessment.adminFormat = 'text'"
              >
                Text Box (Textbook #, Note)
              </button>
            </div>
          </div>

          <!-- Student Picker (Individual Only) -->
          <div v-if="newAssessment.target === 'individual'" class="form-group">
            <label class="form-label">Target Student</label>
            <select v-model="newAssessment.targetStudentId" class="form-input" required>
              <option :value="null" disabled>Select student...</option>
              <option v-for="s in sortedRoster" :key="s.studentId" :value="s.studentId">
                {{ s.lastName }}, {{ s.firstName }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Name *</label>
            <input 
              v-model="newAssessment.name" 
              class="form-input" 
              :placeholder="newAssessment.purpose === 'administrative' ? 'e.g. Science Safety Contract, Textbook #...' : 'e.g. Unit 1 Test'" 
              required 
            />
          </div>

          <!-- Date & Evidence Type / Category -->
          <div :class="newAssessment.purpose === 'administrative' ? 'form-group' : 'form-row'">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input v-model="newAssessment.date" type="date" class="form-input" required />
            </div>

            <template v-if="newAssessment.purpose !== 'administrative'">
              <div class="form-group" v-if="activeClassRecord?.gradingFramework === 'sbar'">
                <label class="form-label">Evidence Type</label>
                <select v-model="newAssessment.assessmentType" class="form-input" required>
                  <option value="product">Product (Test/Lab)</option>
                  <option value="observation">Observation (Practical)</option>
                  <option value="conversation">Conversation (Oral)</option>
                </select>
              </div>

              <div class="form-group" v-else>
                <label class="form-label">Category</label>
                <select v-model="newAssessment.categoryId" class="form-input" required>
                  <option v-for="cat in effectiveClass?.gradebookCategories" :key="cat.categoryId" :value="cat.categoryId">
                    {{ cat.name }}
                  </option>
                </select>
              </div>
            </template>
          </div>

          <!-- Unit & Retest Policy (Traditional Mode, Non-Admin) -->
          <template v-if="newAssessment.purpose !== 'administrative'">
            <div class="form-row" v-if="activeClassRecord?.gradingFramework !== 'sbar'">
              <div class="form-group">
                <label class="form-label">Unit</label>
                <select 
                  v-model="newAssessment.unitId" 
                  class="form-input"
                  :disabled="!effectiveUnits.length"
                >
                  <option :value="null">Unassigned</option>
                  <option v-for="u in filteredUnits" :key="u.unitId" :value="u.unitId">
                    {{ (u.courseCode && newAssessment.targetCourseCode === 'all' ? '[' + u.courseCode + '] ' : (selectedGradeFilter === 'all' && u.gradeLevel ? '[' + u.gradeLevel + '] ' : '')) + u.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Retest Policy</label>
                <select v-model="newAssessment.retestPolicy" class="form-input">
                  <option value="highest">Highest Attempt</option>
                  <option value="latest">Latest Attempt</option>
                  <option value="average">Average of Attempts</option>
                  <option value="manual">Manual Selection</option>
                </select>
              </div>
            </div>

            <!-- Unit Field (SBAR Mode: Retest Policy Hidden) -->
            <div class="form-group" v-else>
              <label class="form-label">Strand / Unit</label>
              <select 
                v-model="newAssessment.unitId" 
                class="form-input"
                :disabled="!effectiveUnits.length"
              >
                <option :value="null">All Strands (Multi-Strand)</option>
                <option v-for="u in filteredUnits" :key="u.unitId" :value="u.unitId">
                  {{ (u.courseCode && newAssessment.targetCourseCode === 'all' ? '[' + u.courseCode + '] ' : (selectedGradeFilter === 'all' && u.gradeLevel ? '[' + u.gradeLevel + '] ' : '')) + u.name }}
                </option>
              </select>
            </div>

            <!-- Traditional Points Fields (Non-SBAR Mode Only) -->
            <div v-if="activeClassRecord?.gradingFramework !== 'sbar'" class="form-row">
              <div class="form-group">
                <label class="form-label">Total Points</label>
                <input v-model.number="newAssessment.totalPoints" type="number" min="1" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Scaled Total (Optional)</label>
                <input v-model.number="newAssessment.scaledTotal" type="number" min="1" class="form-input" placeholder="Raw" />
              </div>
            </div>
          </template>
        </div>

        <!-- RIGHT COLUMN: Curriculum Standards Tagging & Description -->
        <div class="modal-col modal-col--right">
          <!-- Administrative Help Callout (Admin Mode) -->
          <div v-if="newAssessment.purpose === 'administrative'" class="admin-help-box">
            <CheckSquare :size="22" class="admin-help-icon" />
            <div>
              <div class="admin-help-title">Administrative Logistics Tracker</div>
              <div class="admin-help-desc">
                This column tracks paperwork or physical equipment (e.g. Science Safety Contracts, textbook numbers). It has <strong>zero weight</strong> and will never affect student averages, GPA, or academic reports.
              </div>
            </div>
          </div>

          <!-- Expectation Tagging (Academic Mode) -->
          <template v-else>
            <div v-if="allAvailableExpectations.length" class="form-group exp-section">
              <div class="exp-section-header">
                <label class="form-label">
                  Tagged Standards (Expectations)
                  <span v-if="isSBAR" class="req-star" title="Required for SBAR assessments">*</span>
                </label>
                <span class="exp-count-badge" v-if="selectedExpCount > 0">{{ selectedExpCount }} selected</span>
              </div>

              <div v-if="isSBAR && selectedExpCount === 0" class="exp-required-hint">
                <Info :size="13" class="exp-hint-icon" />
                <span>Select at least 1 expectation to link this assessment to the gradebook grid.</span>
              </div>

              <!-- Pinned Selected Standards Tray -->
              <div v-if="selectedExpectationsList.length" class="exp-selected-tray">
                <div class="exp-selected-tray-header">
                  <span class="exp-selected-tray-title">Selected Standards ({{ selectedExpectationsList.length }}):</span>
                  <button type="button" class="exp-clear-all-btn" @click="clearAllExpectations">Clear All</button>
                </div>
                <div class="exp-selected-chips">
                  <span 
                    v-for="exp in selectedExpectationsList" 
                    :key="'sel-' + exp.code"
                    class="exp-selected-chip"
                    :title="exp.name"
                  >
                    <span v-if="exp.strandName" class="exp-chip-strand">{{ exp.strandName }}</span>
                    <span class="exp-chip-code">{{ exp.code }}</span>
                    <button 
                      type="button" 
                      class="exp-chip-remove" 
                      @click.stop="toggleExpSelection(exp.code)"
                      title="Remove expectation"
                    >&times;</button>
                  </span>
                </div>
              </div>

              <!-- Strand Filter Pills + Search Bar Controls -->
              <div class="exp-controls-row">
                <!-- Strand Filter Pills -->
                <div v-if="filteredUnits.length > 1" class="exp-strand-pills-bar">
                  <button 
                    type="button"
                    class="exp-strand-pill"
                    :class="{ 'exp-strand-pill--active': selectedStrandFilter === 'all' }"
                    @click="selectedStrandFilter = 'all'"
                  >
                    All Strands
                  </button>
                  <button 
                    v-for="u in filteredUnits"
                    :key="'strand-pill-' + u.unitId"
                    type="button"
                    class="exp-strand-pill"
                    :class="{ 'exp-strand-pill--active': String(selectedStrandFilter) === String(u.unitId) }"
                    @click="selectedStrandFilter = u.unitId"
                  >
                    {{ u.name }}
                  </button>
                </div>

                <!-- Search Input Box -->
                <div class="exp-search-box">
                  <Search :size="14" class="exp-search-icon" />
                  <input 
                    v-model="searchQuery"
                    type="text"
                    class="exp-search-input"
                    placeholder="Search by code or keyword (e.g. B1.2, fractions, area)..."
                  />
                  <button 
                    v-if="searchQuery" 
                    type="button" 
                    class="exp-search-clear" 
                    @click="searchQuery = ''"
                    title="Clear search"
                  >
                    <X :size="13" />
                  </button>
                </div>
              </div>

              <!-- Scrollable Expectation Checklist -->
              <div class="exp-pill-selector">
                <div v-if="filteredAvailableExpectations.length === 0" class="exp-no-results">
                  <span v-if="searchQuery">No expectations match "{{ searchQuery }}"</span>
                  <span v-else>No expectations available for this filter.</span>
                </div>
                <label 
                  v-for="exp in filteredAvailableExpectations" 
                  :key="exp.expectationId || `${exp.gradeLevel || ''}_${exp.code}`"
                  class="exp-checkbox-pill"
                  :class="{ 'exp-checkbox-pill--active': isExpSelected(exp.code) }"
                >
                  <input 
                    type="checkbox" 
                    :value="exp.code"
                    :checked="isExpSelected(exp.code)"
                    @change="toggleExpSelection(exp.code)"
                    style="display: none;"
                  />
                  <span v-if="selectedStrandFilter === 'all' && exp.unitName" class="exp-strand-tag">{{ exp.unitName }}</span>
                  <span v-if="exp.gradeLevel" class="exp-grade-tag">{{ exp.gradeLevel.replace('Grade ', 'Gr ') }}</span>
                  <span class="exp-code-pill">{{ exp.code }}</span>
                  <span class="exp-desc-pill">{{ exp.name || exp.description }}</span>
                </label>
              </div>
            </div>
            <div v-else class="form-group exp-section">
              <label class="form-label">Tagged Standards (Expectations)</label>
              <div class="exp-empty-box">
                <BookOpen :size="20" class="exp-empty-icon" />
                <div>
                  <div>No expectations loaded for <strong>{{ activeClassRecord?.activeSubjectName || 'this subject' }}</strong> yet.</div>
                  <div class="exp-empty-sub">Load expectations under Setup ➔ Class Settings ➔ Subject Expectations.</div>
                </div>
              </div>
            </div>
          </template>

          <!-- Description (Optional) -->
          <div class="form-group">
            <label class="form-label">Description (Optional)</label>
            <textarea 
              v-model="newAssessment.description" 
              class="form-input form-textarea" 
              :placeholder="newAssessment.purpose === 'administrative' ? 'Extra details or instructions about this paperwork...' : 'Extra details about this assessment task...'" 
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Footer Modal Actions -->
      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeAddAssessment">Cancel</button>
        <button 
          type="submit" 
          class="btn-primary"
          :disabled="isSBAR && newAssessment.purpose !== 'administrative' && selectedExpCount === 0"
          :class="{ 'btn-primary--disabled': isSBAR && newAssessment.purpose !== 'administrative' && selectedExpCount === 0 }"
          :title="isSBAR && newAssessment.purpose !== 'administrative' && selectedExpCount === 0 ? 'Please select at least 1 expectation' : ''"
        >
          {{ isEditingAssessment ? 'Update Assessment' : (newAssessment.purpose === 'administrative' ? 'Create Admin Tracker' : 'Create Assessment') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { BookOpen, Info, CheckSquare, Search, X } from 'lucide-vue-next'
import {
  showAddAssessmentModal,
  isEditingAssessment,
  newAssessment,
  assessmentTypes,
  sortedUnits,
  activeClassRecord,
  activeGradeFilter,
  selectedCourseFilter,
  activeSubCohortFilter,
  availableSubCohorts,
  closeAddAssessment,
  onTargetChange,
  saveAssessment
} from '../../composables/useGradebook.js'
import { useClassroom } from '../../composables/useClassroom.js'
import BaseModal from '../BaseModal.vue'

import { getEffectiveClassRecord, getUnitGradeLevel } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { isCohortMatch } from '../../utils/gradeCalc.js'

const { sortedRoster } = useClassroom()

const searchQuery = ref('')
const selectedStrandFilter = ref('all')

const effectiveClass = computed(() => {
  if (!activeClassRecord.value) return null
  if (activeClassRecord.value.classType === 'elementary') {
    return getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
  }
  const targetCourse = (newAssessment.value?.targetCourseCode && newAssessment.value.targetCourseCode !== 'all')
    ? newAssessment.value.targetCourseCode
    : null
  return getEffectiveClassRecord(activeClassRecord.value, null, targetCourse)
})

const effectiveUnits = computed(() => {
  const cls = effectiveClass.value
  if (!cls?.gradebookUnits) return []
  return [...cls.gradebookUnits].map(u => ({
    ...u,
    name: (u.name || 'Strand').replace(/\[Grade \d+\]\s*/g, '')
  })).sort((a, b) => (a.order || 0) - (b.order || 0))
})

const allAvailableExpectations = computed(() => {
  const cls = effectiveClass.value
  if (!cls) return []

  const expMap = {}

  // 1. From gradebookUnits
  if (cls.gradebookUnits && Array.isArray(cls.gradebookUnits)) {
    cls.gradebookUnits.forEach(u => {
      const uGrade = getUnitGradeLevel(u)
      const cleanName = (u.name || 'Strand').replace(/\[Grade \d+\]\s*/g, '')
      ;(u.expectations || []).forEach(e => {
        if (!e.code) return
        const gKey = (e.gradeLevel || uGrade || '').toLowerCase().trim()
        const key = `${u.unitId}::${gKey}::${e.code}`
        expMap[key] = {
          ...e,
          unitId: e.unitId || u.unitId,
          unitName: cleanName,
          gradeLevel: e.gradeLevel || uGrade
        }
      })
    })
  }

  // 2. From flat expectations list
  const flatExps = cls.expectations || cls.curriculumExpectations || []
  if (flatExps.length > 0) {
    flatExps.forEach(e => {
      if (!e.code) return
      const gKey = (e.gradeLevel || '').toLowerCase().trim()
      const key = `${e.unitId || 'flat'}::${gKey}::${e.code}`
      if (!expMap[key]) {
        const matchingUnit = (cls.gradebookUnits || []).find(u => String(u.unitId) === String(e.unitId))
        const cleanName = matchingUnit ? (matchingUnit.name || 'Strand').replace(/\[Grade \d+\]\s*/g, '') : ''
        expMap[key] = { 
          ...e,
          unitName: cleanName || e.strand || ''
        }
      }
    })
  }

  return Object.values(expMap)
})

const selectedGradeFilter = ref('all')

function onCohortToggle(cFilter) {
  newAssessment.value.targetCourseCode = cFilter
  newAssessment.value.gradeLevel = (cFilter === 'all' ? null : cFilter)
  selectedGradeFilter.value = cFilter
}

watch(showAddAssessmentModal, (open) => {
  if (open) {
    searchQuery.value = ''
    const activeVal = activeSubCohortFilter.value
    if (activeVal && activeVal !== 'all' && availableSubCohorts.value.includes(activeVal)) {
      selectedGradeFilter.value = activeVal
      if (!isEditingAssessment.value) {
        newAssessment.value.gradeLevel = activeVal
        newAssessment.value.targetCourseCode = activeVal
      }
    } else {
      selectedGradeFilter.value = 'all'
    }
    const cats = effectiveClass.value?.gradebookCategories || []
    if (!newAssessment.value.categoryId && cats.length > 0) {
      newAssessment.value.categoryId = cats[0].categoryId
    }
    if (newAssessment.value.unitId) {
      selectedStrandFilter.value = newAssessment.value.unitId
    } else {
      selectedStrandFilter.value = 'all'
    }
  }
}, { immediate: true })

const filteredUnits = computed(() => {
  let units = effectiveUnits.value || []
  if (selectedGradeFilter.value !== 'all' && availableSubCohorts.value.length > 1) {
    units = units.filter(u => {
      const uGrade = getUnitGradeLevel(u)
      if (uGrade && isCohortMatch(uGrade, selectedGradeFilter.value)) return true
      if (u.expectations && u.expectations.some(e => e.gradeLevel && isCohortMatch(e.gradeLevel, selectedGradeFilter.value))) return true
      return !uGrade
    })
  }
  return units
})

watch(selectedGradeFilter, () => {
  if (newAssessment.value.unitId) {
    const exists = filteredUnits.value.some(u => String(u.unitId) === String(newAssessment.value.unitId))
    if (!exists) {
      newAssessment.value.unitId = null
    }
  }
  if (selectedStrandFilter.value !== 'all') {
    const exists = filteredUnits.value.some(u => String(u.unitId) === String(selectedStrandFilter.value))
    if (!exists) {
      selectedStrandFilter.value = 'all'
    }
  }
})

watch(() => newAssessment.value?.unitId, (newUid) => {
  if (newUid) {
    const unit = effectiveUnits.value.find(u => String(u.unitId) === String(newUid))
    const uGrade = unit ? getUnitGradeLevel(unit) : ''
    if (uGrade && selectedGradeFilter.value === 'all') {
      newAssessment.value.gradeLevel = uGrade
      if (activeClassRecord.value?.classType === 'elementary') {
        newAssessment.value.targetCourseCode = uGrade
      }
    }
    selectedStrandFilter.value = newUid
  } else {
    selectedStrandFilter.value = 'all'
  }
})

watch(() => newAssessment.value?.targetCourseCode, () => {
  const cats = effectiveClass.value?.gradebookCategories || []
  if (cats.length > 0) {
    const exists = cats.some(c => c.categoryId === newAssessment.value.categoryId)
    if (!exists) {
      newAssessment.value.categoryId = cats[0].categoryId
    }
  }
  if (newAssessment.value?.unitId) {
    const unitExists = filteredUnits.value.some(u => String(u.unitId) === String(newAssessment.value.unitId))
    if (!unitExists) {
      newAssessment.value.unitId = null
    }
  }
})

const filteredAvailableExpectations = computed(() => {
  let list = allAvailableExpectations.value

  // 1. Filter by Grade Pill (if split class)
  if (selectedGradeFilter.value !== 'all' && availableSubCohorts.value.length > 1) {
    list = list.filter(e => e.gradeLevel && isCohortMatch(e.gradeLevel, selectedGradeFilter.value))
  }

  // 2. Filter by Selected Unit / Strand
  const strandFilter = isSBAR.value ? selectedStrandFilter.value : (newAssessment.value.unitId || 'all')
  if (strandFilter && strandFilter !== 'all') {
    const selectedUnitIdStr = String(strandFilter)
    const selectedUnit = effectiveUnits.value.find(u => String(u.unitId) === selectedUnitIdStr)
    const unitGrade = selectedUnit ? getUnitGradeLevel(selectedUnit) : ''

    list = list.filter(e => {
      const idMatch = e.unitId && String(e.unitId) === selectedUnitIdStr
      if (!idMatch) return false
      if (unitGrade && e.gradeLevel) {
        return isCohortMatch(e.gradeLevel, unitGrade)
      }
      return true
    })
  }

  // 3. Filter by Search Query (code, name, description, strandName)
  if (searchQuery.value && searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(e => {
      const code = (e.code || '').toLowerCase()
      const name = (e.name || '').toLowerCase()
      const desc = (e.description || '').toLowerCase()
      const strand = (e.unitName || '').toLowerCase()
      return code.includes(q) || name.includes(q) || desc.includes(q) || strand.includes(q)
    })
  }

  // Prefer specific expectations (e.g. A1.1, A1.2) over overalls if specifics exist
  const specifics = list.filter(e => e.code && e.code.includes('.'))
  return specifics.length > 0 ? specifics : list
})

const isSBAR = computed(() => activeClassRecord.value?.gradingFramework === 'sbar')

const selectedExpCount = computed(() => {
  if (Array.isArray(newAssessment.value.expectationIds)) {
    return newAssessment.value.expectationIds.length
  }
  return newAssessment.value.expectationId ? 1 : 0
})

const selectedExpectationsList = computed(() => {
  const codes = newAssessment.value.expectationIds || (newAssessment.value.expectationId ? [newAssessment.value.expectationId] : [])
  if (!codes.length) return []
  return codes.map(code => {
    const found = allAvailableExpectations.value.find(e => e.code === code || e.expectationId === code)
    return {
      code,
      name: found?.name || found?.description || code,
      strandName: found?.unitName || '',
      gradeLevel: found?.gradeLevel || ''
    }
  })
})

function clearAllExpectations() {
  newAssessment.value.expectationIds = []
  newAssessment.value.expectationId = null
}

function isExpSelected(code) {
  if (Array.isArray(newAssessment.value.expectationIds)) {
    return newAssessment.value.expectationIds.includes(code)
  }
  return newAssessment.value.expectationId === code
}

function toggleExpSelection(code) {
  if (!Array.isArray(newAssessment.value.expectationIds)) {
    newAssessment.value.expectationIds = newAssessment.value.expectationId ? [newAssessment.value.expectationId] : []
  }
  const idx = newAssessment.value.expectationIds.indexOf(code)
  if (idx > -1) {
    newAssessment.value.expectationIds.splice(idx, 1)
  } else {
    newAssessment.value.expectationIds.push(code)
  }
  newAssessment.value.expectationId = newAssessment.value.expectationIds[0] || null
}
</script>

<style scoped>
.modal-form--wide {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-body-grid {
  display: grid;
  grid-template-columns: minmax(320px, 350px) 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 700px) {
  .modal-body-grid {
    grid-template-columns: 1fr;
  }
}

.modal-col {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.form-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  font-size: 0.9rem;
  color: var(--text);
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-textarea {
  resize: vertical;
  min-height: 85px;
}

.toggle-group {
  display: flex;
  background: var(--bg-secondary);
  padding: 3px;
  border-radius: var(--radius-md);
  gap: 3px;
}

.toggle-btn {
  flex: 1;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.toggle-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.exp-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exp-count-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.12);
  padding: 2px 8px;
  border-radius: 12px;
}

.exp-grade-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.exp-grade-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.exp-grade-btn:hover {
  color: var(--text);
  border-color: var(--primary);
}

.exp-grade-btn--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.exp-grade-tag {
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.15);
  color: var(--primary);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.exp-pill-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--bg-secondary);
}

.exp-checkbox-pill {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.82rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.exp-checkbox-pill:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.exp-checkbox-pill--active {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--primary);
  color: var(--primary);
}

.exp-code-pill {
  font-weight: 700;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.exp-empty-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.83rem;
  line-height: 1.4;
}

.exp-empty-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
  opacity: 0.7;
}

.exp-empty-sub {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-top: 2px;
}

.exp-checkbox-pill--active .exp-code-pill {
  background: var(--primary);
  color: white;
}

.exp-desc-pill {
  line-height: 1.35;
  flex: 1;
}

/* Selected Standards Pinned Tray */
.exp-selected-tray {
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 4px;
}

.exp-selected-tray-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exp-selected-tray-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
}

.exp-clear-all-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.72rem;
  cursor: pointer;
  padding: 0 4px;
  text-decoration: underline;
  transition: color 0.15s ease;
}

.exp-clear-all-btn:hover {
  color: var(--danger, #ef4444);
}

.exp-selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.exp-selected-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--surface);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: var(--radius-sm, 6px);
  padding: 2px 6px;
  font-size: 0.75rem;
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.exp-chip-strand {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 1px 4px;
  border-radius: 3px;
}

.exp-chip-code {
  font-weight: 700;
  color: var(--primary);
}

.exp-chip-remove {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1;
  padding: 0 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.15s ease;
}

.exp-chip-remove:hover {
  color: var(--danger, #ef4444);
  background: rgba(239, 68, 68, 0.1);
}

/* Controls: Strand Pills & Search Box */
.exp-controls-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
}

.exp-strand-pills-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.exp-strand-pill {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 12px;
  padding: 3px 9px;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.exp-strand-pill:hover {
  color: var(--text);
  border-color: var(--primary);
}

.exp-strand-pill--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.exp-search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  width: 100%;
}

.exp-search-icon {
  position: absolute;
  left: 9px;
  color: var(--text-secondary);
  pointer-events: none;
}

.exp-search-input {
  width: 100%;
  padding: 6px 28px 6px 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  font-size: 0.82rem;
  color: var(--text);
  transition: border-color 0.2s;
}

.exp-search-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

.exp-search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.exp-search-clear:hover {
  color: var(--text);
}

.exp-strand-tag {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.exp-no-results {
  padding: 18px 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-style: italic;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}

.btn-ghost {
  flex: 1;
  padding: 0.65rem;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  flex: 2;
  padding: 0.65rem;
  border: none;
  background: var(--primary);
  border-radius: var(--radius-md);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-primary--disabled,
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.req-star {
  color: var(--danger, #ef4444);
  margin-left: 2px;
  font-weight: 800;
}

.exp-required-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 500;
  margin-bottom: 8px;
  line-height: 1.3;
}

.exp-hint-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.admin-help-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
}

.admin-help-icon {
  color: #10b981;
  flex-shrink: 0;
  margin-top: 2px;
}

.admin-help-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.admin-help-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.45;
}
</style>
