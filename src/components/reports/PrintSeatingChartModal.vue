<template>
  <div v-if="show">
    <!-- BaseModal for Screen Preview and Print Configuration -->
    <BaseModal
      :show="show"
      :show-x="false"
      max-width="1150px"
      title="Print Seating Plan & Dashboard"
      @close="$emit('close')"
    >
      <template #header>
        <div class="seating-modal__header">
          <div class="seating-modal__header-title-group">
            <Armchair class="seating-modal__header-icon" :size="22" />
            <div>
              <h3 class="seating-modal__title">Print Classroom Seating Plan</h3>
              <p class="seating-modal__subtitle">
                <span v-if="scopeMode === 'single'">{{ currentPreviewClass?.name || 'Class' }} · {{ getClassSubheader(currentPreviewClass) }}</span>
                <span v-else>Batch Printing <strong>{{ targetClasses.length }} Classes</strong> (1 Page Each)</span>
              </p>
            </div>
          </div>
          <div class="seating-modal__header-actions">
            <button class="setup__btn-primary seating-modal__btn-print" @click="handlePrint" :disabled="isPrinting || targetClasses.length === 0">
              <Printer :size="16" /> {{ scopeMode === 'all' ? `Print All (${targetClasses.length} Classes)` : 'Print Seating Plan' }}
            </button>
            <button class="setup__btn-ghost" @click="$emit('close')">
              <X :size="16" /> Close
            </button>
          </div>
        </div>
      </template>

      <div class="seating-modal__body">
        <!-- Configuration Controls Sidebar -->
        <aside class="seating-modal__controls">
          <h4 class="seating-modal__section-title">Class Scope &amp; Options</h4>

          <!-- Scope: Active Class vs All Term/Year Classes vs Custom Selection -->
          <label class="setup__label">
            Classes to Print
            <select v-model="scopeMode" class="setup__input">
              <option value="active">Active Class ({{ activeReportClass?.name || 'Current Class' }})</option>
              <option value="semester" v-if="availableClasses.length > 1">
                {{ termLabel }} ({{ availableClasses.length }} Classes)
              </option>
              <option value="custom" v-if="availableClasses.length > 1">
                Custom Selection... ({{ selectedClassIds.length }} Selected)
              </option>
            </select>
          </label>

          <!-- If Custom Selection: Checkbox list of classes -->
          <div v-if="scopeMode === 'custom'" class="seating-modal__custom-classes">
            <div class="custom-classes-header">
              <span class="custom-classes-title">Select Classes:</span>
              <div class="custom-classes-actions">
                <button type="button" class="setup__btn-ghost setup__btn--micro" @click="selectAllClasses">All</button>
                <button type="button" class="setup__btn-ghost setup__btn--micro" @click="selectedClassIds = []">None</button>
              </div>
            </div>
            <div class="custom-classes-list">
              <label 
                v-for="c in availableClasses" 
                :key="c.classId" 
                class="setup__label--checkbox custom-class-item"
              >
                <input 
                  type="checkbox" 
                  :value="c.classId" 
                  v-model="selectedClassIds" 
                  class="setup__checkbox" 
                />
                <span class="custom-class-name">{{ c.name }}</span>
                <span class="custom-class-tag" v-if="c.periodNumber || c.semester">
                  {{ c.periodNumber ? 'P' + c.periodNumber : '' }}{{ c.periodNumber && c.semester ? ' · ' : '' }}{{ c.semester ? 'S' + c.semester : '' }}
                </span>
              </label>
            </div>
          </div>

          <label class="setup__label">
            Document Title (Optional Override)
            <input v-model="form.title" class="setup__input" placeholder="Defaults to Class Name (e.g. Period 1 - Physics)" />
          </label>

          <label class="setup__label">
            Orientation
            <select v-model="form.orientation" class="setup__input">
              <option value="landscape">Landscape (Recommended)</option>
              <option value="portrait">Portrait</option>
            </select>
          </label>

          <label class="setup__label">
            Font Scale
            <select v-model="form.fontSize" class="setup__input">
              <option value="auto">Auto Scale (Responsive)</option>
              <option value="tiny">Tiny (Dense 9-12 Col Grids)</option>
              <option value="compact">Compact (Smaller)</option>
              <option value="normal">Normal (Standard)</option>
              <option value="large">Large (Bold)</option>
            </select>
          </label>

          <label class="setup__label">
            Name Format
            <select v-model="form.nameFormat" class="setup__input">
              <option value="full">First & Full Last Name</option>
              <option value="initial">First & Last Initial (e.g. Temi A.)</option>
              <option value="firstOnly">First Name Only</option>
              <option value="lastFirst">Last, First</option>
            </select>
          </label>

          <div class="seating-modal__checkboxes">
            <label class="setup__label--checkbox">
              <input type="checkbox" v-model="form.showPhotos" class="setup__checkbox" />
              Include Student Photos
            </label>
            <label class="setup__label--checkbox">
              <input type="checkbox" v-model="form.showPods" class="setup__checkbox" />
              Show Table / Pod Color Groups
            </label>
            <label class="setup__label--checkbox">
              <input type="checkbox" v-model="form.showFrontIndicator" class="setup__checkbox" />
              Show "Front of Room / Board" (Bottom)
            </label>
            <label class="setup__label--checkbox">
              <input type="checkbox" v-model="form.showIepDot" class="setup__checkbox" />
              Show Accommodations (IEP) Indicator
            </label>
            <label class="setup__label--checkbox">
              <input type="checkbox" v-model="form.showLegend" class="setup__checkbox" />
              Show Footer Legend
            </label>
          </div>

          <div class="seating-modal__stat-box">
            <div class="stat-item">
              <span class="stat-label">Classes to Print:</span>
              <span class="stat-val">{{ targetClasses.length }} {{ targetClasses.length === 1 ? 'Class' : 'Classes' }}</span>
            </div>
            <div class="stat-item" v-if="currentPreviewClass">
              <span class="stat-label">Previewing:</span>
              <span class="stat-val">{{ currentPreviewClass?.name }}</span>
            </div>
            <div class="stat-item" v-if="currentPreviewClass">
              <span class="stat-label">Layout:</span>
              <span class="stat-val">{{ getGridRows(currentPreviewClass) }} × {{ getGridCols(currentPreviewClass) }} Grid</span>
            </div>
            <div v-if="currentPreviewClass && getIepCount(currentPreviewClass) > 0" class="stat-item">
              <span class="stat-label">IEP Accommodations:</span>
              <span class="stat-val stat-val--iep">{{ getIepCount(currentPreviewClass) }} students</span>
            </div>
          </div>
        </aside>

        <!-- Live Preview Area -->
        <main class="seating-modal__preview-area">
          <div class="preview-header-bar">
            <span class="preview-card-title">LIVE PRINT PREVIEW ({{ form.orientation.toUpperCase() }})</span>

            <!-- Class pagination if batch mode -->
            <div v-if="targetClasses.length > 1" class="preview-pagination">
              <button 
                class="preview-page-btn" 
                :disabled="previewIndex <= 0" 
                @click="previewIndex--"
              >‹ Prev</button>
              <span class="preview-page-label">
                Class {{ previewIndex + 1 }} of {{ targetClasses.length }} ({{ currentPreviewClass?.name }})
              </span>
              <button 
                class="preview-page-btn" 
                :disabled="previewIndex >= targetClasses.length - 1" 
                @click="previewIndex++"
              >Next ›</button>
            </div>
          </div>

          <div 
            v-if="currentPreviewClass"
            class="seating-preview__sheet"
            :class="[
              `seating-preview__sheet--${form.orientation}`,
              `font-scale--${form.fontSize}`
            ]"
            :style="getDynamicClassStyles(currentPreviewClass)"
          >
            <!-- Document Header -->
            <header class="sheet-doc-header">
              <div class="sheet-title-group">
                <h1 class="sheet-main-title">{{ getDisplayTitle(currentPreviewClass) }}</h1>
              </div>
              <div v-if="form.showPods && getActivePods(currentPreviewClass).length > 0" class="sheet-pods-legend">
                <span 
                  v-for="pod in getActivePods(currentPreviewClass)" 
                  :key="pod.id" 
                  class="sheet-pod-pill"
                  :style="{ borderColor: pod.color, color: pod.color }"
                >
                  <span class="sheet-pod-dot" :style="{ backgroundColor: pod.color }" />
                  {{ pod.name }}
                </span>
              </div>
            </header>

            <!-- Seating Chart Grid Container -->
            <div class="sheet-grid-container" :style="getGridContainerStyle(currentPreviewClass)">
              <template v-for="r in getGridRows(currentPreviewClass)" :key="r">
                <template v-for="c in getGridCols(currentPreviewClass)" :key="`${r}-${c}`">
                  <!-- Aisle Cell -->
                  <div 
                    v-if="isAisle(currentPreviewClass, r, c)" 
                    class="sheet-cell sheet-cell--aisle"
                    aria-hidden="true"
                  />

                  <!-- Desk Cell -->
                  <div 
                    v-else 
                    class="sheet-cell sheet-cell--desk"
                    :class="{ 
                      'sheet-cell--occupied': getStudent(currentPreviewClass, r, c),
                      'sheet-cell--empty': !getStudent(currentPreviewClass, r, c)
                    }"
                    :style="getDeskPodStyle(currentPreviewClass, r, c)"
                  >
                    <!-- Pod Badge -->
                    <span 
                      v-if="form.showPods && getPod(currentPreviewClass, r, c)" 
                      class="sheet-desk__pod-badge" 
                      :style="{ backgroundColor: getPod(currentPreviewClass, r, c).color }"
                    >
                      {{ getPod(currentPreviewClass, r, c).name }}
                    </span>

                    <!-- ONLY the IEP Dot Indicator (Bottom Left) -->
                    <span 
                      v-if="form.showIepDot && getStudent(currentPreviewClass, r, c)?.hasIEP" 
                      class="sheet-desk__iep-dot" 
                      title="IEP / Accommodations Plan"
                    />

                    <!-- Desk Content / Name -->
                    <div class="sheet-desk__content" :class="{ 'sheet-desk__content--with-photo': form.showPhotos && hasPhoto(getStudent(currentPreviewClass, r, c)?.studentId) }">
                      <template v-if="getStudent(currentPreviewClass, r, c)">
                        <StudentAvatar 
                          v-if="form.showPhotos && hasPhoto(getStudent(currentPreviewClass, r, c).studentId)"
                          :student-id="getStudent(currentPreviewClass, r, c).studentId"
                          :first-name="getStudent(currentPreviewClass, r, c).firstName"
                          :last-name="getStudent(currentPreviewClass, r, c).lastName"
                          size="desk"
                          shape="rounded"
                          class="sheet-desk__avatar"
                        />
                        <div class="sheet-desk__name-box">
                          <template v-if="form.showPhotos && hasPhoto(getStudent(currentPreviewClass, r, c).studentId)">
                            <span class="sheet-desk__first">{{ getStudent(currentPreviewClass, r, c).firstName }}</span>
                            <span class="sheet-desk__last">{{ (getStudent(currentPreviewClass, r, c).lastName || '')[0] ? (getStudent(currentPreviewClass, r, c).lastName)[0] + '.' : '' }}</span>
                          </template>
                          <template v-else-if="form.nameFormat === 'initial'">
                            <span class="sheet-desk__last">
                              {{ getStudent(currentPreviewClass, r, c).firstName }} {{ (getStudent(currentPreviewClass, r, c).lastName || '')[0] ? (getStudent(currentPreviewClass, r, c).lastName)[0] + '.' : '' }}
                            </span>
                          </template>
                          <template v-else-if="form.nameFormat === 'firstOnly'">
                            <span class="sheet-desk__last">{{ getStudent(currentPreviewClass, r, c).firstName }}</span>
                          </template>
                          <template v-else-if="form.nameFormat === 'lastFirst'">
                            <span class="sheet-desk__last">{{ getStudent(currentPreviewClass, r, c).lastName }}</span>
                            <span class="sheet-desk__first">{{ getStudent(currentPreviewClass, r, c).firstName }}</span>
                          </template>
                          <template v-else>
                            <span class="sheet-desk__first">{{ getStudent(currentPreviewClass, r, c).firstName }}</span>
                            <span class="sheet-desk__last">{{ getStudent(currentPreviewClass, r, c).lastName }}</span>
                          </template>
                        </div>
                      </template>
                    </div>
                  </div>
                </template>
              </template>
            </div>

            <!-- Front of Classroom Indicator (Placed at BOTTOM) -->
            <div v-if="form.showFrontIndicator" class="sheet-front-banner">
              ▼ FRONT OF CLASSROOM / WHITEBOARD ▼
            </div>

            <!-- Footer -->
            <footer class="sheet-doc-footer">
              <div v-if="form.showLegend && form.showIepDot" class="sheet-legend-item">
                <span class="sheet-desk__iep-dot sheet-legend-dot" />
                <span class="sheet-legend-text"><strong>Accommodations</strong></span>
              </div>
              <div class="sheet-footer-info">
                <span v-if="getClassSubheader(currentPreviewClass)">{{ getClassSubheader(currentPreviewClass) }}</span>
                <span class="sheet-meta-sep" v-if="getClassSubheader(currentPreviewClass)">·</span>
                <span>Print Date: {{ formattedDate }}</span>
              </div>
            </footer>
          </div>
          <div v-else class="preview-empty-state">
            <p>No classes selected for printing. Choose at least one class from the options on the left.</p>
          </div>
        </main>
      </div>
    </BaseModal>

    <!-- Teleported Standalone Print-Only Container (Native Browser Print, Iterates All Target Classes) -->
    <Teleport to="body" v-if="mounted">
      <div 
        class="seating-print-only" 
        :class="{ 
          'print-only-container--active': isPrinting,
          'seating-print-only--landscape': form.orientation === 'landscape',
          'seating-print-only--portrait': form.orientation === 'portrait',
          [`font-scale--${form.fontSize}`]: true
        }"
      >
        <div 
          v-for="cls in targetClasses" 
          :key="cls.classId" 
          class="print-page-wrapper"
          :style="getDynamicClassStyles(cls)"
        >
          <!-- Document Header -->
          <header class="sheet-doc-header">
            <div class="sheet-title-group">
              <h1 class="sheet-main-title">{{ getDisplayTitle(cls) }}</h1>
            </div>
            <div v-if="form.showPods && getActivePods(cls).length > 0" class="sheet-pods-legend">
              <span 
                v-for="pod in getActivePods(cls)" 
                :key="pod.id" 
                class="sheet-pod-pill"
                :style="{ borderColor: pod.color, color: pod.color }"
              >
                <span class="sheet-pod-dot" :style="{ backgroundColor: pod.color }" />
                {{ pod.name }}
              </span>
            </div>
          </header>

          <!-- Seating Chart Grid Container -->
          <div class="sheet-grid-container" :style="getGridContainerStyle(cls)">
            <template v-for="r in getGridRows(cls)" :key="r">
              <template v-for="c in getGridCols(cls)" :key="`${r}-${c}`">
                <!-- Aisle Cell -->
                <div 
                  v-if="isAisle(cls, r, c)" 
                  class="sheet-cell sheet-cell--aisle"
                  aria-hidden="true"
                />

                <!-- Desk Cell -->
                <div 
                  v-else 
                  class="sheet-cell sheet-cell--desk"
                  :class="{ 
                    'sheet-cell--occupied': getStudent(cls, r, c),
                    'sheet-cell--empty': !getStudent(cls, r, c)
                  }"
                  :style="getDeskPodStyle(cls, r, c)"
                >
                  <!-- Pod Badge -->
                  <span 
                    v-if="form.showPods && getPod(cls, r, c)" 
                    class="sheet-desk__pod-badge" 
                    :style="{ backgroundColor: getPod(cls, r, c).color }"
                  >
                    {{ getPod(cls, r, c).name }}
                  </span>

                  <!-- ONLY the IEP Dot Indicator (Bottom Left) -->
                  <span 
                    v-if="form.showIepDot && getStudent(cls, r, c)?.hasIEP" 
                    class="sheet-desk__iep-dot" 
                  />

                  <!-- Desk Content / Name -->
                  <div class="sheet-desk__content" :class="{ 'sheet-desk__content--with-photo': form.showPhotos && hasPhoto(getStudent(cls, r, c)?.studentId) }">
                    <template v-if="getStudent(cls, r, c)">
                      <StudentAvatar 
                        v-if="form.showPhotos && hasPhoto(getStudent(cls, r, c).studentId)"
                        :student-id="getStudent(cls, r, c).studentId"
                        :first-name="getStudent(cls, r, c).firstName"
                        :last-name="getStudent(cls, r, c).lastName"
                        size="desk"
                        shape="rounded"
                        class="sheet-desk__avatar"
                      />
                      <div class="sheet-desk__name-box">
                        <template v-if="form.showPhotos && hasPhoto(getStudent(cls, r, c).studentId)">
                          <span class="sheet-desk__first">{{ getStudent(cls, r, c).firstName }}</span>
                          <span class="sheet-desk__last">{{ (getStudent(cls, r, c).lastName || '')[0] ? (getStudent(cls, r, c).lastName)[0] + '.' : '' }}</span>
                        </template>
                        <template v-else-if="form.nameFormat === 'initial'">
                          <span class="sheet-desk__last">
                            {{ getStudent(cls, r, c).firstName }} {{ (getStudent(cls, r, c).lastName || '')[0] ? (getStudent(cls, r, c).lastName)[0] + '.' : '' }}
                          </span>
                        </template>
                        <template v-else-if="form.nameFormat === 'firstOnly'">
                          <span class="sheet-desk__last">{{ getStudent(cls, r, c).firstName }}</span>
                        </template>
                        <template v-else-if="form.nameFormat === 'lastFirst'">
                          <span class="sheet-desk__last">{{ getStudent(cls, r, c).lastName }}</span>
                          <span class="sheet-desk__first">{{ getStudent(cls, r, c).firstName }}</span>
                        </template>
                        <template v-else>
                          <span class="sheet-desk__first">{{ getStudent(cls, r, c).firstName }}</span>
                          <span class="sheet-desk__last">{{ getStudent(cls, r, c).lastName }}</span>
                        </template>
                      </div>
                    </template>
                  </div>
                </div>
              </template>
            </template>
          </div>

          <!-- Front of Classroom Indicator (Placed at BOTTOM) -->
          <div v-if="form.showFrontIndicator" class="sheet-front-banner">
            ▼ FRONT OF CLASSROOM / WHITEBOARD ▼
          </div>

          <!-- Footer -->
          <footer class="sheet-doc-footer">
            <div v-if="form.showLegend && form.showIepDot" class="sheet-legend-item">
              <span class="sheet-desk__iep-dot sheet-legend-dot" />
              <span class="sheet-legend-text"><strong>Accommodations</strong></span>
            </div>
            <div class="sheet-footer-info">
              <span v-if="getClassSubheader(cls)">{{ getClassSubheader(cls) }}</span>
              <span class="sheet-meta-sep" v-if="getClassSubheader(cls)">·</span>
              <span>Print Date: {{ formattedDate }}</span>
            </div>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { Armchair, Printer, X } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { 
  activeClass as stateActiveClass, 
  students as stateStudents, 
  classList as stateClassList 
} from '../../composables/useClassroomState.js'
import { useStudentPhotos } from '../../composables/useStudentPhotos.js'
import StudentAvatar from '../photos/StudentAvatar.vue'

const { hasPhoto } = useStudentPhotos()

const props = defineProps({
  show: { type: Boolean, default: false },
  reportClass: { type: Object, default: null },
  classList: { type: Array, default: () => [] },
  teacherName: { type: String, default: '' }
})

defineEmits(['close'])

const mounted = ref(false)
const isPrinting = ref(false)
const scopeMode = ref('active') // 'active' | 'single' | 'semester' | 'custom' | 'all'
const selectedSingleClassId = ref('')
const selectedClassIds = ref([])
const previewIndex = ref(0)

const form = reactive({
  title: '', // Empty by default -> uses class name dynamically per page
  orientation: 'landscape', // Defaults to landscape
  fontSize: 'auto', // Smart auto-scaling based on grid dimensions
  nameFormat: 'full', // 'full' | 'initial' | 'firstOnly' | 'lastFirst'
  showPhotos: false,
  showPods: true,
  showFrontIndicator: true,
  showIepDot: true,
  showLegend: false
})

// Active class determination
const activeReportClass = computed(() => {
  return stateActiveClass.value?.classId === props.reportClass?.classId
    ? stateActiveClass.value
    : (props.reportClass || stateActiveClass.value)
})

// Use the passed classList (which reflects user year/semester/mode filters)
const availableClasses = computed(() => {
  if (props.classList && props.classList.length > 0) return props.classList
  if (stateClassList.value && stateClassList.value.length > 0) {
    const activeYear = stateActiveClass.value?.year || props.reportClass?.year
    const activeSem = stateActiveClass.value?.semester || props.reportClass?.semester
    if (activeYear) {
      return stateClassList.value.filter(c => {
        const yearMatch = c.year === activeYear
        const semMatch = !activeSem || c.semester === activeSem
        return yearMatch && semMatch
      })
    }
    return stateClassList.value
  }
  if (props.reportClass) return [props.reportClass]
  return []
})

// Classes in the active semester / term of the active class
const semesterClasses = computed(() => {
  const activeSem = activeReportClass.value?.semester
  const activeYear = activeReportClass.value?.year
  if (!activeSem) return availableClasses.value
  return availableClasses.value.filter(c => {
    const semMatch = String(c.semester) === String(activeSem)
    const yearMatch = activeYear ? String(c.year) === String(activeYear) : true
    return semMatch && yearMatch
  })
})

// Label for term batch print (Elementary friendly)
const termLabel = computed(() => {
  if (activeReportClass.value?.semester) {
    return `All Classes this Semester`
  }
  return `All Classes`
})

function selectAllClasses() {
  selectedClassIds.value = availableClasses.value.map(c => c.classId)
}

onMounted(() => {
  mounted.value = true
  if (props.reportClass?.classId && availableClasses.value.some(c => c.classId === props.reportClass.classId)) {
    selectedSingleClassId.value = props.reportClass.classId
  } else if (availableClasses.value.length > 0) {
    selectedSingleClassId.value = availableClasses.value[0].classId
  }
  // Initialize custom selection with available classes
  selectAllClasses()
})

watch(() => props.reportClass, (newVal) => {
  if (newVal?.classId && availableClasses.value.some(c => c.classId === newVal.classId)) {
    selectedSingleClassId.value = newVal.classId
  } else if (availableClasses.value.length > 0 && !availableClasses.value.some(c => c.classId === selectedSingleClassId.value)) {
    selectedSingleClassId.value = availableClasses.value[0].classId
  }
})

watch(availableClasses, (newList) => {
  if (newList.length > 0 && !newList.some(c => c.classId === selectedSingleClassId.value)) {
    selectedSingleClassId.value = newList[0].classId
  }
})

const targetClasses = computed(() => {
  if (scopeMode.value === 'semester') {
    return availableClasses.value
  }
  if (scopeMode.value === 'custom') {
    return availableClasses.value.filter(c => selectedClassIds.value.includes(c.classId))
  }
  // 'active' default
  return activeReportClass.value ? [activeReportClass.value] : (availableClasses.value[0] ? [availableClasses.value[0]] : [])
})

watch(targetClasses, () => {
  if (previewIndex.value >= targetClasses.value.length) {
    previewIndex.value = Math.max(0, targetClasses.value.length - 1)
  }
})

const currentPreviewClass = computed(() => {
  return targetClasses.value[previewIndex.value] || targetClasses.value[0] || activeReportClass.value || null
})

// Helper methods per class
function getGridRows(cls) {
  if (cls?.classId === stateActiveClass.value?.classId && stateActiveClass.value?.gridSize?.rows) {
    return Number(stateActiveClass.value.gridSize.rows)
  }
  return Number(cls?.gridSize?.rows || 6)
}

function getGridCols(cls) {
  if (cls?.classId === stateActiveClass.value?.classId && stateActiveClass.value?.gridSize?.cols) {
    return Number(stateActiveClass.value.gridSize.cols)
  }
  return Number(cls?.gridSize?.cols || 6)
}

function getLayoutConfig(cls) {
  if (cls?.classId === stateActiveClass.value?.classId && stateActiveClass.value?.layoutConfig) {
    return stateActiveClass.value.layoutConfig
  }
  return cls?.layoutConfig || {}
}

function isAisle(cls, r, c) {
  const layout = getLayoutConfig(cls)
  return layout.cellTypes?.[`${r}-${c}`] === 'aisle'
}

function getPod(cls, r, c) {
  const key = `${r}-${c}`
  const layout = getLayoutConfig(cls)
  return layout.pods?.find(p => p.cells?.includes(key)) || null
}

function getActivePods(cls) {
  const layout = getLayoutConfig(cls)
  if (!layout.pods) return []
  return layout.pods.filter(p => p.cells && p.cells.length > 0)
}

function getDeskPodStyle(cls, r, c) {
  if (!form.showPods) return {}
  const pod = getPod(cls, r, c)
  if (!pod) return {}
  return {
    borderColor: pod.color,
    boxShadow: `0 0 0 1px ${pod.color}`
  }
}

/**
 * Highly reactive student map resolution:
 * Checks stateStudents for live activeClass updates, falling back to class record.
 */
function getStudentsMap(cls) {
  const map = {}
  if (!cls) return map

  // If this class is the currently active class in the app, use reactive stateStudents
  if (cls.classId === stateActiveClass.value?.classId && stateStudents.value) {
    for (const [studentId, s] of Object.entries(stateStudents.value)) {
      if (s.seat && !s.archived && s.seat.row && s.seat.col) {
        map[`${s.seat.row}-${s.seat.col}`] = { studentId, ...s }
      }
    }
    return map
  }

  // Otherwise read from the class record
  if (cls.students) {
    for (const [studentId, s] of Object.entries(cls.students)) {
      if (s.seat && !s.archived && s.seat.row && s.seat.col) {
        map[`${s.seat.row}-${s.seat.col}`] = { studentId, ...s }
      }
    }
  }
  return map
}

function getStudent(cls, r, c) {
  const map = getStudentsMap(cls)
  return map[`${r}-${c}`] || null
}

function getIepCount(cls) {
  const map = getStudentsMap(cls)
  return Object.values(map).filter(s => s.hasIEP).length
}

/**
 * Smart Dynamic Font Scaling based on column count and grid density
 */
function getDynamicClassStyles(cls) {
  const cols = getGridCols(cls)
  const rows = getGridRows(cls)
  
  if (form.fontSize === 'tiny') {
    return {
      '--desk-first-size': '0.52rem',
      '--desk-last-size': '0.62rem',
      '--desk-padding': '2px 3px',
      '--desk-min-height': '38px'
    }
  }
  if (form.fontSize === 'compact') {
    return {
      '--desk-first-size': '0.60rem',
      '--desk-last-size': '0.70rem',
      '--desk-padding': '2px 4px',
      '--desk-min-height': '44px'
    }
  }
  if (form.fontSize === 'normal') {
    return {
      '--desk-first-size': '0.72rem',
      '--desk-last-size': '0.85rem',
      '--desk-padding': '4px 6px',
      '--desk-min-height': '52px'
    }
  }
  if (form.fontSize === 'large') {
    return {
      '--desk-first-size': '0.80rem',
      '--desk-last-size': '0.98rem',
      '--desk-padding': '6px 8px',
      '--desk-min-height': '60px'
    }
  }

  // AUTO scaling: compute dynamically based on column count
  if (cols >= 10 || rows >= 8) {
    return {
      '--desk-first-size': '0.50rem',
      '--desk-last-size': '0.60rem',
      '--desk-padding': '2px 3px',
      '--desk-min-height': '36px'
    }
  } else if (cols >= 8 || rows >= 6) {
    return {
      '--desk-first-size': '0.58rem',
      '--desk-last-size': '0.68rem',
      '--desk-padding': '2px 4px',
      '--desk-min-height': '42px'
    }
  } else if (cols >= 6) {
    return {
      '--desk-first-size': '0.65rem',
      '--desk-last-size': '0.78rem',
      '--desk-padding': '3px 5px',
      '--desk-min-height': '48px'
    }
  } else {
    return {
      '--desk-first-size': '0.75rem',
      '--desk-last-size': '0.88rem',
      '--desk-padding': '4px 6px',
      '--desk-min-height': '54px'
    }
  }
}

function getGridContainerStyle(cls) {
  const cols = getGridCols(cls)
  const rows = getGridRows(cls)
  const layout = getLayoutConfig(cls)
  const cellTypes = layout.cellTypes || {}

  const colTracks = []
  for (let c = 1; c <= cols; c++) {
    let isFullAisleCol = true
    for (let r = 1; r <= rows; r++) {
      if (cellTypes[`${r}-${c}`] !== 'aisle') {
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
}

function getDisplayTitle(cls) {
  if (form.title && form.title.trim()) {
    return form.title.trim()
  }
  return cls?.name || 'Classroom Seating Plan'
}

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
})

function getClassSubheader(cls) {
  const parts = []
  if (cls?.year) parts.push(cls.year)
  if (cls?.semester) parts.push(`Sem ${cls.semester}`)
  if (cls?.periodNumber) parts.push(`Period ${cls.periodNumber}`)
  if (cls?.gradeLevel) parts.push(`Grade ${cls.gradeLevel}`)
  return parts.join(' · ')
}

function handlePrint() {
  isPrinting.value = true
  nextTick(() => {
    window.print()
    setTimeout(() => {
      isPrinting.value = false
    }, 600)
  })
}
</script>


<style scoped>
.seating-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.seating-modal__header-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.seating-modal__header-icon {
  color: var(--primary);
}

.seating-modal__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.seating-modal__subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.seating-modal__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.seating-modal__btn-print {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
}

.seating-modal__body {
  display: grid;
  grid-template-columns: 290px 1fr;
  gap: 20px;
  padding: 16px 0 8px 0;
  height: calc(85vh - 100px);
  max-height: 750px;
  min-height: 500px;
  overflow: hidden;
  box-sizing: border-box;
}

.seating-modal__controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--surface-hover);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  height: 100%;
  max-height: 100%;
  box-sizing: border-box;
  overflow-y: auto !important;
  overflow-x: hidden;
  scrollbar-width: thin;
}

.seating-modal__controls::-webkit-scrollbar {
  width: 6px;
}

.seating-modal__controls::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.seating-modal__controls > * {
  flex-shrink: 0;
}

.seating-modal__section-title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin: 0;
}

.seating-modal__custom-classes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  max-height: 200px;
  min-height: 120px;
  overflow-y: auto;
  flex-shrink: 0;
}

.custom-classes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
}

.custom-classes-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.custom-classes-actions {
  display: flex;
  gap: 4px;
}

.setup__btn--micro {
  padding: 2px 6px;
  font-size: 0.7rem;
  line-height: 1;
}

.custom-classes-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-class-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 4px;
}

.custom-class-item:hover {
  background: var(--surface-hover);
}

.custom-class-name {
  font-weight: 600;
  color: var(--text);
  flex: 1;
}

.custom-class-tag {
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--surface-hover);
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid var(--border);
}

.preview-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #94a3b8;
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
}

.seating-modal__checkboxes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.seating-modal__stat-box {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-val {
  font-weight: 600;
  color: var(--text);
}

.stat-val--iep {
  color: #8b5cf6;
}

/* ── Live Preview Area ──────────────────────────────────────────────────── */
.seating-modal__preview-area {
  display: flex;
  flex-direction: column;
  background: #262626;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  align-items: center;
  min-width: 0;
}

.preview-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 12px;
}

.preview-card-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #a3a3a3;
  letter-spacing: 0.05em;
}

.preview-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e1e1e;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-page-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: none;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.preview-page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.preview-page-btn:not(:disabled):hover {
  background: var(--primary);
}

.preview-page-label {
  font-size: 0.75rem;
  color: #e2e8f0;
  font-weight: 500;
}

/* The simulated printed page */
.seating-preview__sheet {
  background: #ffffff;
  color: #0f172a;
  border-radius: 4px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.seating-preview__sheet--landscape {
  width: 100%;
  min-height: 480px;
}

.seating-preview__sheet--portrait {
  width: 100%;
  max-width: 580px;
  min-height: 680px;
}

/* Document Header in Sheet */
.sheet-doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 8px;
}

.sheet-main-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.sheet-meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #475569;
  margin-top: 2px;
  font-weight: 500;
}

.sheet-meta-sep {
  color: #94a3b8;
}

.sheet-pods-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 45%;
  justify-content: flex-end;
}

.sheet-pod-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid;
  background: #f8fafc;
}

.sheet-pod-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.sheet-front-banner {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #475569;
  background: #f1f5f9;
  border: 1px dashed #cbd5e1;
  padding: 4px;
  border-radius: 4px;
}

/* Seating Chart Grid Container */
.sheet-grid-container {
  display: grid;
  gap: 6px;
  width: 100%;
  flex: 1;
  min-height: 280px;
}

.sheet-cell--aisle {
  background: transparent;
  border: none;
  min-width: 0;
}

.sheet-cell--desk {
  position: relative;
  border: 1.5px solid #cbd5e1;
  border-radius: 5px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--desk-min-height, 46px);
  padding: var(--desk-padding, 3px 4px);
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.sheet-cell--empty {
  background: #ffffff;
  border: 1.5px dashed #cbd5e1;
}

.sheet-desk__pod-badge {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 0.50rem;
  font-weight: 800;
  color: #ffffff;
  padding: 0 3px;
  border-radius: 3px;
  line-height: 1.1;
  z-index: 2;
}

/* STRICTLY ONLY THE IEP DOT INDICATOR */
.sheet-desk__iep-dot {
  position: absolute;
  bottom: 3px;
  left: 3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8b5cf6;
  border: 1px solid rgba(255, 255, 255, 0.9);
  z-index: 2;
}

.sheet-desk__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
  line-height: 1.1;
  min-width: 0;
  overflow: hidden;
}

.sheet-desk__content--with-photo {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 0 3px;
}

.sheet-desk__avatar {
  width: 32px !important;
  height: 32px !important;
  border-radius: 4px !important;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  border: 1px solid rgba(0,0,0,0.1);
}

.sheet-desk__name-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.sheet-desk__content--with-photo .sheet-desk__name-box {
  align-items: flex-start;
  text-align: left;
}

.sheet-desk__first {
  font-size: var(--desk-first-size, 0.65rem);
  color: #475569;
  text-align: center;
  max-width: 100%;
  line-height: 1.1;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.sheet-desk__content--with-photo .sheet-desk__first {
  text-align: left;
}

.sheet-desk__last {
  font-size: var(--desk-last-size, 0.78rem);
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  max-width: 100%;
  line-height: 1.15;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.sheet-desk__content--with-photo .sheet-desk__last {
  text-align: left;
  font-size: 0.74rem;
}

.sheet-desk__empty-text {
  font-size: 0.58rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}

/* Document Footer */
.sheet-doc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #cbd5e1;
  padding-top: 6px;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: auto;
}

.sheet-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sheet-legend-dot {
  position: static;
  display: inline-block;
}

.sheet-footer-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>

<style>
/* Global Print Styles (Unscoped for Teleport) */
.seating-print-only {
  display: none;
  font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #000000;
  background: #ffffff;
  width: 100%;
}

.seating-print-only.print-only-container--active {
  display: block;
}

@media print {
  @page {
    margin: 8mm;
  }

  .seating-print-only--landscape {
    page-orientation: landscape;
  }

  @page {
    size: landscape;
  }

  #app, .bm-overlay, .setup__dialog, .reports__modal-overlay {
    display: none !important;
  }

  .seating-print-only {
    display: block !important;
    position: relative !important;
    width: 100% !important;
    height: 100vh !important;
    box-sizing: border-box !important;
    background: #ffffff !important;
    color: #000000 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .seating-print-only .print-page-wrapper {
    display: flex;
    flex-direction: column;
    height: 96vh;
    justify-content: space-between;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
  }

  .seating-print-only .print-page-wrapper:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .seating-print-only .sheet-doc-header {
    border-bottom: 2px solid #000000;
    padding-bottom: 6px;
    margin-bottom: 6px;
  }

  .seating-print-only .sheet-main-title {
    font-size: 15pt;
    font-weight: 800;
    color: #000000;
  }

  .seating-print-only .sheet-meta-line {
    font-size: 9.5pt;
    color: #333333;
  }

  .seating-print-only .sheet-front-banner {
    background: #f0f0f0 !important;
    border: 1px dashed #666666 !important;
    color: #000000 !important;
    font-size: 8.5pt;
    font-weight: bold;
    padding: 3px;
    margin-top: 6px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .seating-print-only .sheet-grid-container {
    display: grid;
    gap: 6px;
    width: 100%;
    flex: 1;
    min-height: 0;
  }

  .seating-print-only .sheet-cell--desk {
    border: 1.5px solid #000000 !important;
    border-radius: 4px;
    background: #ffffff !important;
    min-height: var(--desk-min-height, 40px);
    padding: var(--desk-padding, 2px 4px);
    min-width: 0;
    box-sizing: border-box;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .seating-print-only .sheet-cell--empty {
    border: 1.5px dashed #999999 !important;
    background: #ffffff !important;
  }

  .seating-print-only .sheet-desk__pod-badge {
    color: #ffffff !important;
    font-size: 6pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .seating-print-only .sheet-desk__iep-dot {
    background: #8b5cf6 !important;
    border: 1px solid #000000 !important;
    width: 7px;
    height: 7px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .seating-print-only .sheet-desk__first {
    font-size: var(--desk-first-size, 7pt) !important;
    color: #444444 !important;
  }

  .seating-print-only .sheet-desk__last {
    font-size: var(--desk-last-size, 8.5pt) !important;
    font-weight: bold !important;
    color: #000000 !important;
  }

  .seating-print-only .sheet-doc-footer {
    border-top: 1px solid #888888;
    padding-top: 4px;
    font-size: 7.5pt;
    color: #555555;
    margin-top: 6px;
  }
}
</style>
