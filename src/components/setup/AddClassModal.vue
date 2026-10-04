<template>
  <div class="setup__dialog" role="dialog" aria-modal="true" aria-labelledby="add-class-modal-title">
    <div class="setup__dialog-backdrop" @click="emit('close')" />
    <div class="setup__dialog-box setup__dialog-box--add-class">
      <!-- Pinned Header -->
      <div class="setup__dialog-header-sticky">
        <div>
          <h3 id="add-class-modal-title" class="setup__dialog-title" style="margin-bottom: 4px;">
            Import or Update Classes
          </h3>
          <p class="setup__dialog-body" style="margin: 0; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.4;">
            Import new classes for a semester, reconcile roster changes from a fresh SIS / PowerSchool export, or manually create a single class.
          </p>
        </div>
        <button 
          type="button" 
          class="setup__icon-btn" 
          @click="emit('close')"
          style="margin-left: 8px; flex-shrink: 0;"
          title="Close"
        >
          <X :size="18" />
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="setup__dialog-content-scroll">
        <!-- Segmented Mode Toggle -->
        <div class="setup__segmented-toggle" style="margin-bottom: 1.25rem;">
          <button
            type="button"
            class="setup__segmented-btn"
            :class="{ 'setup__segmented-btn--active': addClassMode === 'csv' }"
            @click="addClassMode = 'csv'"
          >
            <FolderOpen :size="15" class="setup__segmented-icon" />
            <span>CSV Roster Import & Update</span>
          </button>
          <button
            type="button"
            class="setup__segmented-btn"
            :class="{ 'setup__segmented-btn--active': addClassMode === 'manual' }"
            @click="addClassMode = 'manual'"
          >
            <Plus :size="15" class="setup__segmented-icon" />
            <span>Create Single Class</span>
          </button>
        </div>

        <!-- CSV Option -->
        <div v-if="addClassMode === 'csv'">
          <div class="setup__card setup__card--accent" style="margin-bottom: 0;">
            <div style="margin-bottom: 14px;">
              <p class="setup__hint" style="margin: 0 0 10px 0; font-size: 0.9rem; line-height: 1.5; color: var(--text);">
                Drop your official board or PowerSchool CSV export here to <strong>create new classes</strong> or <strong>update rosters</strong> for existing classes.
              </p>
              
              <div style="display: flex; flex-direction: column; gap: 8px; background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.82rem; color: var(--text-secondary); border-left: 3px solid var(--primary); line-height: 1.45;">
                <div>
                  <strong style="color: var(--text);">New Term Setup:</strong> Automatically detects periods, sections, and homerooms across all courses to build your classes in seconds.
                </div>
                <div>
                  <strong style="color: var(--text);">Roster Changes & Updates:</strong> Drop a fresh CSV anytime to sync schedule changes. The app will automatically <strong>add new students</strong>, <strong>offer to archive removed students</strong>, and <strong>preserve all existing</strong> grades, attendance, student notes, IEP accommodations, and seating plans.
                </div>
              </div>
            </div>
            <label 
              class="setup__file-label" 
              for="roster-file-modal"
              :class="{ 'setup__file-label--drag': isDraggingRoster }"
              @dragover.prevent="isDraggingRoster = true"
              @dragleave.prevent="isDraggingRoster = false"
              @drop.prevent="isDraggingRoster = false; onFileSelected($event)"
            >
              <FolderOpen :size="18" /> {{ isDraggingRoster ? 'Drop CSV here...' : 'Choose CSV file or drag & drop here' }}
              <input
                id="roster-file-modal"
                type="file"
                accept=".csv,text/csv"
                class="setup__file-input"
                @change="onFileSelected"
              />
            </label>
            
            <div class="setup__csv-help-container" style="margin-top: 12px;">
              <button 
                type="button" 
                class="setup__csv-help-toggle" 
                @click="isCsvHelpOpen = !isCsvHelpOpen"
              >
                <Info :size="14" />
                <span>{{ isCsvHelpOpen ? 'Hide CSV Format Guide' : 'Show Roster Format & PowerSchool CSV Help' }}</span>
                <ChevronDown :size="14" class="setup__accordion-chevron" :class="{ 'setup__accordion-chevron--expanded': isCsvHelpOpen }" />
              </button>
              <Transition name="csv-fade">
                <CsvHelpGuide v-if="isCsvHelpOpen" />
              </Transition>
            </div>
          </div>
        </div>

        <!-- Manual Option -->
        <div v-else-if="addClassMode === 'manual'">
          <form class="setup__form" @submit.prevent="createNewClass">
            <label class="setup__label">
              Class name
              <input v-model="newClass.name" class="setup__input" :placeholder="teachingMode === 'elementary' ? 'e.g. Grade 4 Homeroom' : 'e.g. Period 1 — Science'" required autofocus />
            </label>
            <label v-if="teachingMode !== 'elementary'" class="setup__label">
              Course Code (Optional)
              <input v-model="newClass.courseCode" class="setup__input" placeholder="e.g. SNC2D1" />
            </label>
            <div class="setup__form-grid">
              <label class="setup__label">
                {{ teachingMode === 'elementary' ? 'School Year' : 'School Year and Semester' }}
                <select v-if="teachingMode === 'elementary'" v-model="newClassYear" class="setup__input" required>
                  <option v-for="y in yearOptions" :key="y" :value="y">
                    {{ y }}
                  </option>
                </select>
                <select v-else v-model="newClassTermKey" class="setup__input" required>
                  <option v-for="t in termOptions" :key="t.year + t.semester" :value="t.year + '|' + t.semester">
                    {{ t.year }} Sem {{ t.semester }}
                  </option>
                </select>
              </label>

              <label v-if="teachingMode === 'elementary'" class="setup__label">
                Grade Level
                <select v-model="newClassGradeLevel" class="setup__input" required>
                  <optgroup label="Single Grade">
                    <option value="Kindergarten">Kindergarten</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                  </optgroup>
                  <optgroup label="Split / Multi-Grade">
                    <option value="Grade 1/2">Grade 1/2 Split</option>
                    <option value="Grade 2/3">Grade 2/3 Split</option>
                    <option value="Grade 3/4">Grade 3/4 Split</option>
                    <option value="Grade 4/5">Grade 4/5 Split</option>
                    <option value="Grade 5/6">Grade 5/6 Split</option>
                    <option value="Grade 6/7">Grade 6/7 Split</option>
                    <option value="Grade 7/8">Grade 7/8 Split</option>
                  </optgroup>
                </select>
              </label>

              <label v-if="teachingMode !== 'elementary'" class="setup__label">
                Period
                <select v-model="newClass.periodNumber" class="setup__input" required>
                  <option v-for="opt in periodOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </label>
              <label v-if="teachingMode !== 'elementary'" class="setup__label">
                Start time
                <input v-model="newClass.periodStartTime" type="time" class="setup__input" required />
              </label>
            </div>
            <p v-if="classError" class="setup__error" style="margin-top: 8px;">{{ classError }}</p>
            <div class="setup__dialog-actions" style="margin-top: 1.25rem;">
              <button type="submit" class="setup__btn-primary">Create Class</button>
              <button type="button" class="setup__btn-ghost" @click="emit('close')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ChevronDown, FolderOpen, Info, Plus, X } from 'lucide-vue-next'
import CsvHelpGuide from './CsvHelpGuide.vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { getCurrentSchoolYear } from '../../utils/dates.js'

const emit = defineEmits(['close', 'csv-file', 'created'])

const {
  teachingMode,
  termOptions,
  yearOptions,
  periodOptions,
  periodStartTimes,
  selectedYear,
  selectedSemester,
  createClass
} = useClassroom()

const addClassMode = ref('csv')
const isCsvHelpOpen = ref(false)
const isDraggingRoster = ref(false)

function onFileSelected(evt) {
  const file = evt.dataTransfer?.files?.[0] || evt.target?.files?.[0]
  if (evt.target && evt.target.value !== undefined) evt.target.value = ''
  if (file) emit('csv-file', file)
}

// --- Manual class creation ---
const newClass = reactive({
  name: '',
  courseCode: '',
  periodNumber: 1,
  periodStartTime: '08:00',
  year: '',
  semester: ''
})
const newClassTermKey = ref('')
const newClassYear = ref('')
const newClassGradeLevel = ref('Grade 7')
const classError = ref('')

watch(newClassTermKey, (val) => {
  if (val && val.includes('|')) {
    const [y, s] = val.split('|')
    newClass.year = y
    newClass.semester = s
  }
})

watch(() => newClass.periodNumber, (newVal) => {
  if (periodStartTimes.value[newVal]) {
    newClass.periodStartTime = periodStartTimes.value[newVal]
  }
})

onMounted(() => {
  newClassYear.value = selectedYear.value || getCurrentSchoolYear()
  if (selectedYear.value && selectedSemester.value) {
    newClassTermKey.value = `${selectedYear.value}|${selectedSemester.value}`
  } else if (termOptions.value.length > 0) {
    newClassTermKey.value = `${termOptions.value[0].year}|${termOptions.value[0].semester}`
  }
  if (periodStartTimes.value[newClass.periodNumber]) {
    newClass.periodStartTime = periodStartTimes.value[newClass.periodNumber]
  }
})

async function createNewClass() {
  classError.value = ''
  if (!newClass.name.trim()) { classError.value = 'Name is required.'; return }

  const isElem = teachingMode.value === 'elementary'
  const yearToUse = isElem ? (newClassYear.value || getCurrentSchoolYear()) : newClass.year
  const semToUse = isElem ? '1' : newClass.semester

  if (!yearToUse || !semToUse) { classError.value = 'Academic term required.'; return }

  const classId = `class_${Date.now()}`
  await createClass({
    classId,
    classType: isElem ? 'elementary' : 'secondary',
    name: newClass.name.trim(),
    courseCode: newClass.courseCode.trim(),
    gradeLevel: isElem ? (newClassGradeLevel.value || 'Grade 7') : undefined,
    periodNumber: newClass.periodNumber,
    periodStartTime: newClass.periodStartTime,
    year: yearToUse,
    semester: semToUse
  })
  emit('created', classId)
}
</script>
