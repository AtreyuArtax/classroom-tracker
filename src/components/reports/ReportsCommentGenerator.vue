<template>
  <div class="comment-generator">
    <!-- Header / Global Preferences -->
    <div class="cg__header">
      <div class="cg__header-left">
        <div class="cg__title-row">
          <button
            type="button"
            class="cg__btn-back"
            title="Return to Reports Overview"
            @click="$emit('back')"
          >
            <ArrowLeft :size="14" />
            <span>Back to Reports</span>
          </button>
          <h2 class="cg__title"><MessageSquareText :size="20" /> Report Card Comment Generator</h2>
          <span v-if="reportClass" class="cg__class-pill">
            <GraduationCap :size="14" /> {{ reportClass.name }}
          </span>
        </div>
        <p class="cg__subtitle">
          Ontario Growing Success Comments (Curriculum Strength + Thinking &amp; Application + Next Steps). Grounded in real classroom assessments.
        </p>
      </div>

      <div class="cg__header-controls">
        <!-- Reporting Period Selector -->
        <div class="cg__control-item">
          <label class="cg__control-label">Reporting Period</label>
          <div class="cg__term-pills">
            <button
              v-for="t in terms"
              :key="t"
              type="button"
              class="cg__term-pill-btn"
              :class="{ 'cg__term-pill-btn--active': selectedTerm === t }"
              @click="selectTerm(t)"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <!-- Target Preset Selector -->
        <div class="cg__control-item">
          <label class="cg__control-label">Target Mode</label>
          <select v-model="targetMode" class="cg__select">
            <option value="secondary">Secondary (Strict &le; 400 chars)</option>
            <option value="elementary">Elementary (Narrative 2-Para)</option>
          </select>
        </div>

        <!-- Pronoun Mode Selector -->
        <div class="cg__control-item">
          <label class="cg__control-label">Pronoun Style</label>
          <select v-model="pronounMode" class="cg__select">
            <option value="preferred">Preferred (He / She / They)</option>
            <option value="name-only">Name Only (No Pronouns)</option>
          </select>
        </div>

        <!-- Character Budget (Secondary) -->
        <div v-if="targetMode === 'secondary'" class="cg__control-item">
          <label class="cg__control-label">Char Budget</label>
          <input 
            v-model.number="charLimit" 
            type="number" 
            min="200" 
            max="1000" 
            step="10" 
            class="cg__number-input"
          />
        </div>

        <!-- Batch Export Action -->
        <div class="cg__control-item cg__control-item--export">
          <label class="cg__control-label">&nbsp;</label>
          <button 
            type="button" 
            class="cg__btn-ghost" 
            title="Download CSV of all comments for this class"
            @click="exportAllCommentsCsv"
          >
            <Download :size="14" /> Export All (CSV)
          </button>
        </div>
      </div>
    </div>

    <!-- Main Workspace Split -->
    <div class="cg__workspace">
      <!-- ══ LEFT PANEL: Student Roster Queue ═════════════════════════════ -->
      <aside class="cg__roster-pane">
        <div class="cg__roster-search">
          <Search :size="14" class="cg__search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Filter students..." 
            class="cg__search-input"
          />
        </div>

        <div class="cg__roster-list" role="listbox" aria-label="Student roster">
          <button
            v-for="st in filteredStudentList"
            :key="st.studentId"
            type="button"
            class="cg__student-row"
            :class="{ 'cg__student-row--active': selectedStudentId === st.studentId }"
            @click="selectStudent(st.studentId)"
          >
            <div class="cg__student-info">
              <span class="cg__student-name">{{ formatStudentName(st) }}</span>
              <span class="cg__student-meta">
                {{ getStudentPronounsDisplay(st) }}
              </span>
            </div>

            <div class="cg__student-grade-wrap">
              <span 
                v-if="getStudentMark(st.studentId) != null" 
                class="cg__grade-pill"
                :class="getGradeColorClass(getStudentMark(st.studentId))"
              >
                {{ Math.round(getStudentMark(st.studentId)) }}%
              </span>
              <span v-else class="cg__grade-pill cg__grade-pill--none">
                --
              </span>
              <Check v-if="copiedStudents.has(st.studentId)" :size="13" class="cg__copied-check" title="Copied" />
            </div>
          </button>
        </div>
      </aside>

      <!-- ══ RIGHT PANEL: Comment Construction & Editing ═════════════════ -->
      <main class="cg__editor-pane">
        <template v-if="activeStudent">
          <!-- Active Student Summary Bar -->
          <div class="cg__student-bar">
            <div class="cg__sb-left">
              <h3 class="cg__sb-name">{{ activeStudent.firstName }} {{ activeStudent.lastName }}</h3>
              <div class="cg__sb-badges">
                <span v-if="activeStudentMark != null" class="cg__badge cg__badge--grade">
                  Mark: <strong>{{ Math.round(activeStudentMark) }}%</strong>
                </span>
                <span class="cg__badge cg__badge--level">
                  {{ activeLevel.label }}
                </span>
                <span v-if="activeStudent.pronouns" class="cg__badge cg__badge--pronoun">
                  {{ activeStudent.pronouns }}
                </span>
              </div>
            </div>

            <div class="cg__sb-right" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button 
                v-if="isCommentCustomized"
                type="button" 
                class="cg__btn-icon" 
                title="Discard manual edits and restore generated text"
                @click="resetToGenerated"
              >
                <RotateCcw :size="13" />
                <span>Reset to Generated</span>
              </button>
              <button 
                type="button" 
                class="cg__btn-icon" 
                title="Reroll phrasing variations"
                @click="rerollPhrasing"
              >
                <Sparkles :size="14" />
                <span>🎲 Reroll Phrasing</span>
              </button>

              <!-- Local AI Polish Button -->
              <button
                type="button"
                class="cg__btn-icon"
                :class="{ 'cg__btn-icon--ai-ready': llmState.status === 'ready' }"
                :title="llmState.status === 'ready' ? `Polish with local ${llmState.activeModelName}` : 'Configure local AI rephraser'"
                :disabled="isPolishing"
                @click="handleAiPolishClick"
              >
                <Sparkles :size="13" :class="{ 'cg__icon--spin': isPolishing }" />
                <span v-if="isPolishing">Polishing (Local AI)...</span>
                <span v-else-if="llmState.status === 'ready'">✨ Polish ({{ llmState.activeModelKey === 'qwen-0.5b' ? 'Qwen' : (llmState.activeModelKey === 'llama-1b' ? 'Llama' : 'Nano') }})</span>
                <span v-else>✨ AI Polish (Offline)...</span>
              </button>

              <button
                type="button"
                class="cg__btn-icon cg__btn-icon--gear"
                title="Manage Local AI Models & WebGPU Settings"
                @click="showLlmModal = true"
              >
                <Cpu :size="13" />
              </button>
            </div>
          </div>

          <!-- Specific Task Evidence Selectors -->
          <div class="cg__evidence-grid">
            <div class="cg__evidence-field">
              <label class="cg__field-label">
                <Sparkles :size="13" class="cg__field-icon cg__field-icon--gold" />
                Featured Strength Task
              </label>
              <select v-model="selectedStrengthTask" class="cg__select cg__select--field">
                <option value="">Auto-detected ({{ autoStrengthTask || 'General' }})</option>
                <optgroup v-if="studentAssessments.length > 0" label="Specific Assessments">
                  <option 
                    v-for="ass in studentAssessments" 
                    :key="ass.name" 
                    :value="ass.name"
                  >
                    {{ ass.name }} ({{ ass.scorePercent }}%)
                  </option>
                </optgroup>
              </select>
            </div>

            <div class="cg__evidence-field">
              <label class="cg__field-label">
                <Target :size="13" class="cg__field-icon cg__field-icon--blue" />
                Featured Next Step Focus
              </label>
              <select v-model="selectedGrowthTask" class="cg__select cg__select--field">
                <option value="">Auto-detected ({{ autoGrowthTask || 'General' }})</option>
                <optgroup v-if="studentAssessments.length > 0" label="Specific Assessments">
                  <option 
                    v-for="ass in studentAssessments" 
                    :key="ass.name" 
                    :value="ass.name"
                  >
                    {{ ass.name }} ({{ ass.scorePercent }}%)
                  </option>
                </optgroup>
              </select>
            </div>
          </div>

          <!-- Live Comment Textarea Workspace -->
          <div class="cg__textarea-wrap">
            <textarea
              v-model="currentCommentText"
              rows="5"
              class="cg__textarea"
              placeholder="Generating report card comment..."
              @input="onCommentInput"
            />

            <!-- Character & Word Budget Meter -->
            <div class="cg__meter-bar">
              <div class="cg__meter-counts">
                <span 
                  class="cg__char-count-pill"
                  :class="{
                    'cg__char-count--safe': charCount <= (charLimit - 20),
                    'cg__char-count--warn': charCount > (charLimit - 20) && charCount <= charLimit,
                    'cg__char-count--over': charCount > charLimit
                  }"
                >
                  <strong>{{ charCount }}</strong> / {{ charLimit }} characters
                </span>
                <span class="cg__word-count">{{ wordCount }} words</span>
                <span v-if="charCount > charLimit" class="cg__over-warning">
                  ⚠️ Exceeds {{ charLimit }} character SIS limit
                </span>
              </div>

              <!-- Quick Action Toolbar -->
              <div class="cg__actions">
                <button
                  type="button"
                  class="cg__btn-primary"
                  :class="{ 'cg__btn-primary--success': copySuccess }"
                  @click="copyCurrentComment"
                >
                  <Check v-if="copySuccess" :size="15" />
                  <Copy v-else :size="15" />
                  {{ copySuccess ? 'Copied to Clipboard!' : 'Copy Comment' }}
                </button>

                <button
                  type="button"
                  class="cg__btn-next"
                  title="Copy and move to next student"
                  @click="copyAndNext"
                >
                  <span>Next Student</span>
                  <ChevronRight :size="15" />
                </button>
              </div>
            </div>
          </div>

          <!-- Context Breakdown Footer -->
          <div class="cg__footer-guide">
            <div class="cg__guide-chip">
              <span class="cg__guide-dot cg__guide-dot--strength" />
              <strong>Strength:</strong> {{ activeStrengthDisplay }}
            </div>
            <div class="cg__guide-chip">
              <span class="cg__guide-dot cg__guide-dot--habit" />
              <strong>{{ targetMode === 'secondary' ? 'Application:' : 'Habits:' }}</strong> {{ activeHabitDisplay }}
            </div>
            <div class="cg__guide-chip">
              <span class="cg__guide-dot cg__guide-dot--next" />
              <strong>Next Step:</strong> {{ activeGrowthDisplay }}
            </div>
          </div>

          <!-- Previous Term Reference (Midterm vs Final progression tracking) -->
          <div v-if="previousTermComment" class="cg__prev-term-card">
            <div class="cg__prev-term-header" @click="showPrevTerm = !showPrevTerm">
              <div class="cg__prev-term-title">
                <History :size="13" class="cg__prev-icon" />
                <span>Previous Comment ({{ previousTermName }})</span>
              </div>
              <button type="button" class="cg__prev-toggle-btn">
                {{ showPrevTerm ? 'Hide Previous' : 'View Previous' }}
              </button>
            </div>
            <div v-if="showPrevTerm" class="cg__prev-term-body">
              <p class="cg__prev-term-text">"{{ previousTermComment }}"</p>
              <div class="cg__prev-term-hint">
                💡 Progression Tip: Ensure {{ selectedTerm }} next steps target new growth areas rather than repeating the {{ previousTermName }} focus.
              </div>
            </div>
          </div>
        </template>

        <div v-else class="cg__empty-editor">
          <MessageSquareText :size="40" class="cg__empty-icon" />
          <p>Select a student from the roster to construct their report card comment.</p>
        </div>
      </main>
    </div>

    <!-- Local AI Settings & Model Manager Modal -->
    <CommentLlmSettingsModal
      v-if="showLlmModal"
      @close="showLlmModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import {
  MessageSquareText,
  GraduationCap,
  Search,
  Check,
  Copy,
  RotateCcw,
  Download,
  Sparkles,
  Target,
  ChevronRight,
  Cpu,
  History,
  ArrowLeft
} from 'lucide-vue-next'

import { classGrades } from '../../composables/useGradebook.js'
import {
  LEARNING_SKILL_TERMS,
  getLearningSkillsByClass
} from '../../composables/useLearningSkills.js'
import {
  generateReportComment,
  getAchievementLevel,
  extractEvidenceFromGrades
} from '../../utils/commentGenerator.js'
import {
  llmState,
  detectHardwareCapabilities,
  polishReportComment
} from '../../utils/localLlmService.js'

const CommentLlmSettingsModal = defineAsyncComponent(() => import('./CommentLlmSettingsModal.vue'))

const emit = defineEmits(['back'])

const props = defineProps({
  reportClass: {
    type: Object,
    default: null
  },
  sidebarStudents: {
    type: Array,
    default: () => []
  }
})

// ── Preferences State ────────────────────────────────────────────────────────
const targetMode = ref('secondary') // 'secondary' | 'elementary'
const pronounMode = ref('preferred') // 'preferred' | 'name-only'
const charLimit = ref(400)
const searchQuery = ref('')
const selectedStudentId = ref(null)

// ── Reporting Period / Term State ───────────────────────────────────────────
const terms = LEARNING_SKILL_TERMS // ['Progress Report', 'Midterm', 'Final']
const selectedTerm = ref('Midterm')
const showPrevTerm = ref(false)
const allTermsSkillsMap = ref({}) // term -> { studentId -> skillsRecord }

// Per-student active state
const variantSeed = ref(0)
const selectedStrengthTask = ref('')
const selectedGrowthTask = ref('')
const currentCommentText = ref('')
const copySuccess = ref(false)
const copiedStudents = ref(new Set())
const customEdits = ref({}) // `${term}__${studentId}` -> manually edited comment text
const learningSkillsMap = ref({}) // studentId -> { responsibility, ... }

// Local LLM State
const showLlmModal = ref(false)
const isPolishing = ref(false)

function getEditKey(studentId, term = selectedTerm.value) {
  return `${term}__${studentId}`
}

// ── Students List ────────────────────────────────────────────────────────────
const studentList = computed(() => {
  if (props.sidebarStudents && props.sidebarStudents.length > 0) {
    return props.sidebarStudents
  }
  if (props.reportClass?.students) {
    return Object.values(props.reportClass.students).sort((a, b) =>
      (a.lastName || '').localeCompare(b.lastName || '')
    )
  }
  return []
})

const filteredStudentList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return studentList.value
  return studentList.value.filter(st => {
    const full = `${st.firstName || ''} ${st.lastName || ''} ${st.preferredName || ''}`.toLowerCase()
    return full.includes(q)
  })
})

const activeStudent = computed(() => {
  if (!selectedStudentId.value) return null
  return studentList.value.find(s => s.studentId === selectedStudentId.value) || null
})

// ── Grade Data for Active Student ────────────────────────────────────────────
function getStudentMark(studentId) {
  const gradeObj = classGrades.value?.[studentId]
  if (gradeObj && typeof gradeObj.overallGrade === 'number') {
    return gradeObj.overallGrade
  }
  return null
}

const activeStudentMark = computed(() => {
  if (!activeStudent.value) return null
  return getStudentMark(activeStudent.value.studentId)
})

const activeLevel = computed(() => {
  return getAchievementLevel(activeStudentMark.value)
})

const studentAssessments = computed(() => {
  if (!activeStudent.value) return []
  const gradeObj = classGrades.value?.[activeStudent.value.studentId]
  if (gradeObj?.assessments && Array.isArray(gradeObj.assessments)) {
    return gradeObj.assessments.filter(a => typeof a.scorePercent === 'number')
  }
  return []
})

const autoEvidence = computed(() => {
  const gradeObj = classGrades.value?.[activeStudent.value?.studentId]
  return extractEvidenceFromGrades(gradeObj || {})
})

const autoStrengthTask = computed(() => autoEvidence.value.strengthTask || '')
const autoGrowthTask = computed(() => autoEvidence.value.growthTask || '')

const activeStrengthDisplay = computed(() => selectedStrengthTask.value || autoStrengthTask.value || 'General Achievement')
const activeGrowthDisplay = computed(() => selectedGrowthTask.value || autoGrowthTask.value || 'Independent Review')
const activeHabitDisplay = computed(() => {
  if (targetMode.value === 'secondary') {
    return 'Inquiry & Problem Solving'
  }
  const skills = learningSkillsMap.value[activeStudent.value?.studentId] || {}
  const items = Object.entries(skills).filter(([_, v]) => v === 'E' || v === 'G').map(([k]) => k)
  return items.length > 0 ? items.join(', ') : 'Consistent Participation'
})

// ── Previous Term Progression Tracking ───────────────────────────────────────
const previousTermName = computed(() => {
  if (selectedTerm.value === 'Final') return 'Midterm'
  if (selectedTerm.value === 'Midterm') return 'Progress Report'
  return null
})

const previousTermComment = computed(() => {
  if (!activeStudent.value || !previousTermName.value) return null
  const prevKey = getEditKey(activeStudent.value.studentId, previousTermName.value)
  if (customEdits.value[prevKey]) {
    return customEdits.value[prevKey]
  }

  // Fallback: check if we have previous term skills loaded to construct previous draft
  const prevSkills = allTermsSkillsMap.value[previousTermName.value]?.[activeStudent.value.studentId] || {}
  const studentGradeObj = classGrades.value?.[activeStudent.value.studentId] || {}
  const res = generateReportComment({
    student: activeStudent.value,
    gradeData: {
      percentage: activeStudentMark.value,
      level: activeLevel.value?.key,
      assessments: studentAssessments.value,
      ...studentGradeObj
    },
    learningSkills: prevSkills,
    options: {
      mode: targetMode.value,
      charLimit: charLimit.value,
      pronounMode: pronounMode.value
    }
  })
  return res.text
})

// ── Character & Word Counting ────────────────────────────────────────────────
const charCount = computed(() => currentCommentText.value.length)
const wordCount = computed(() => currentCommentText.value.trim().split(/\s+/).filter(Boolean).length)
const isCommentCustomized = computed(() => {
  if (!activeStudent.value) return false
  return customEdits.value[getEditKey(activeStudent.value.studentId)] !== undefined
})

function onCommentInput() {
  if (activeStudent.value) {
    customEdits.value[getEditKey(activeStudent.value.studentId)] = currentCommentText.value
  }
}

function resetToGenerated() {
  if (activeStudent.value) {
    delete customEdits.value[getEditKey(activeStudent.value.studentId)]
    buildCommentForActive()
  }
}

function selectTerm(term) {
  selectedTerm.value = term
  learningSkillsMap.value = allTermsSkillsMap.value[term] || {}
  buildCommentForActive()
}

// ── Regeneration ─────────────────────────────────────────────────────────────
function buildCommentForActive() {
  if (!activeStudent.value) {
    currentCommentText.value = ''
    return
  }

  // Preserve manual edits for this student and reporting term
  const key = getEditKey(activeStudent.value.studentId)
  const savedEdit = customEdits.value[key]
  if (savedEdit !== undefined) {
    currentCommentText.value = savedEdit
    return
  }

  const studentGradeObj = classGrades.value?.[activeStudent.value.studentId] || {}
  const studentSkills = learningSkillsMap.value[activeStudent.value.studentId] || {}

  const result = generateReportComment({
    student: activeStudent.value,
    gradeData: {
      percentage: activeStudentMark.value,
      level: activeLevel.value.key,
      assessments: studentAssessments.value,
      ...studentGradeObj
    },
    learningSkills: studentSkills,
    options: {
      mode: targetMode.value,
      charLimit: charLimit.value,
      pronounMode: pronounMode.value,
      featuredStrength: selectedStrengthTask.value,
      featuredNextStep: selectedGrowthTask.value,
      variantSeed: variantSeed.value
    }
  })

  currentCommentText.value = result.text
}

// Re-generate when inputs change
watch([
  selectedStudentId,
  selectedTerm,
  targetMode,
  pronounMode,
  charLimit,
  selectedStrengthTask,
  selectedGrowthTask,
  variantSeed
], () => {
  buildCommentForActive()
})

// Auto-select first student on mount
watch(studentList, (list) => {
  if (list.length > 0 && !selectedStudentId.value) {
    selectStudent(list[0].studentId)
  }
}, { immediate: true })

function selectStudent(studentId) {
  selectedStudentId.value = studentId
  variantSeed.value = 0
  selectedStrengthTask.value = ''
  selectedGrowthTask.value = ''
  copySuccess.value = false
  buildCommentForActive()
}

function rerollPhrasing() {
  if (activeStudent.value) {
    delete customEdits.value[getEditKey(activeStudent.value.studentId)]
  }
  variantSeed.value = (variantSeed.value + 1) % 8
}

// ── Local AI Polish Action ───────────────────────────────────────────────────
async function handleAiPolishClick() {
  if (llmState.status !== 'ready') {
    // If no model is active, open the model settings modal
    showLlmModal.value = true
    return
  }

  if (!currentCommentText.value || isPolishing.value) return

  isPolishing.value = true
  try {
    const res = await polishReportComment({
      draftComment: currentCommentText.value,
      student: activeStudent.value,
      charLimit: charLimit.value,
      pronounMode: pronounMode.value
    })

    currentCommentText.value = res.text
    if (activeStudent.value) {
      customEdits.value[getEditKey(activeStudent.value.studentId)] = res.text
    }
  } catch (err) {
    alert(`Local AI polish encountered an issue: ${err.message || err}. You can re-open AI settings to switch models.`)
  } finally {
    isPolishing.value = false
  }
}

// ── Copy Actions ─────────────────────────────────────────────────────────────
async function copyCurrentComment() {
  if (!currentCommentText.value) return
  try {
    await navigator.clipboard.writeText(currentCommentText.value)
    copySuccess.value = true
    if (activeStudent.value) {
      copiedStudents.value.add(activeStudent.value.studentId)
    }
    setTimeout(() => { copySuccess.value = false }, 2500)
  } catch (err) {
    console.warn('Failed to copy to clipboard:', err)
  }
}

async function copyAndNext() {
  await copyCurrentComment()
  const currentIndex = filteredStudentList.value.findIndex(s => s.studentId === selectedStudentId.value)
  if (currentIndex !== -1 && currentIndex < filteredStudentList.value.length - 1) {
    selectStudent(filteredStudentList.value[currentIndex + 1].studentId)
  }
}

// ── Batch Export CSV ─────────────────────────────────────────────────────────
function exportAllCommentsCsv() {
  if (!studentList.value || studentList.value.length === 0) return

  const rows = [
    ['Student ID', 'Last Name', 'First Name', 'Term', 'Grade %', 'Level', 'Characters', 'Report Card Comment']
  ]

  studentList.value.forEach(st => {
    const mark = getStudentMark(st.studentId)
    const key = getEditKey(st.studentId)
    const savedEdit = customEdits.value[key]

    if (savedEdit !== undefined) {
      const level = getAchievementLevel(mark)
      rows.push([
        st.studentId || '',
        st.lastName || '',
        st.firstName || '',
        selectedTerm.value,
        mark != null ? Math.round(mark) : '',
        level?.key || '',
        savedEdit.length,
        savedEdit
      ])
      return
    }

    const gradeObj = classGrades.value?.[st.studentId] || {}
    const skills = learningSkillsMap.value[st.studentId] || {}
    const res = generateReportComment({
      student: st,
      gradeData: { percentage: mark, ...gradeObj },
      learningSkills: skills,
      options: {
        mode: targetMode.value,
        charLimit: charLimit.value,
        pronounMode: pronounMode.value
      }
    })

    rows.push([
      st.studentId || '',
      st.lastName || '',
      st.firstName || '',
      selectedTerm.value,
      mark != null ? Math.round(mark) : '',
      res.achievementLevel?.key || '',
      res.charCount,
      res.text
    ])
  })

  const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.reportClass?.name || 'Class'}-${selectedTerm.value}-Comments-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Name & Pronoun Formatting ────────────────────────────────────────────────
function formatStudentName(st) {
  if (!st) return ''
  const first = st.preferredName || st.firstName || ''
  const last = st.lastName || ''
  return last ? `${last}, ${first}` : first
}

function getStudentPronounsDisplay(st) {
  return st?.pronouns ? `(${st.pronouns})` : ''
}

function getGradeColorClass(mark) {
  if (mark == null) return 'cg__grade-pill--none'
  if (mark >= 80) return 'cg__grade-pill--l4'
  if (mark >= 70) return 'cg__grade-pill--l3'
  if (mark >= 60) return 'cg__grade-pill--l2'
  if (mark >= 50) return 'cg__grade-pill--l1'
  return 'cg__grade-pill--r'
}

async function loadLearningSkillsForClass() {
  if (!props.reportClass?.classId) return
  try {
    const records = await getLearningSkillsByClass(props.reportClass.classId)
    const map = {
      'Progress Report': {},
      'Midterm': {},
      'Final': {}
    }
    if (Array.isArray(records)) {
      records.forEach(r => {
        const t = r.term || 'Midterm'
        if (!map[t]) map[t] = {}
        if (r.studentId) map[t][r.studentId] = r
      })
    }
    allTermsSkillsMap.value = map
    learningSkillsMap.value = map[selectedTerm.value] || {}
  } catch (e) {
    console.warn('Could not load learning skills for comments:', e)
  }
}

// Load Learning Skills & scan local AI capabilities on mount
onMounted(async () => {
  // Proactively check local hardware capabilities & cached models
  try {
    await detectHardwareCapabilities()
  } catch {
    // Non-fatal background check
  }

  await loadLearningSkillsForClass()
})

watch(() => props.reportClass?.classId, () => {
  loadLearningSkillsForClass()
})
</script>

<style scoped>
.comment-generator {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.cg__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.cg__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cg__btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.cg__btn-back:hover {
  background: var(--surface-hover);
  color: var(--text);
  border-color: var(--primary);
}

.cg__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cg__class-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.76rem;
  font-weight: 600;
  background: var(--primary-light);
  color: var(--primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.cg__subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.cg__header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cg__control-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cg__control-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.cg__select,
.cg__number-input {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: 0.84rem;
}

.cg__number-input {
  width: 90px;
}

.cg__btn-ghost {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s ease;
}

.cg__btn-ghost:hover {
  background: var(--bg-secondary);
}

/* ── Term Selector Pills ──────────────────────────────────────────────────── */
.cg__term-pills {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 2px;
  height: 36px;
  align-items: center;
}

.cg__term-pill-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.cg__term-pill-btn:hover {
  color: var(--text);
  background: rgba(0, 0, 0, 0.04);
}

.cg__term-pill-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* ── Previous Term Reference Card ─────────────────────────────────────────── */
.cg__prev-term-card {
  margin-top: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.cg__prev-term-header {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: var(--bg-secondary);
}

.cg__prev-term-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text);
}

.cg__prev-icon {
  color: var(--primary);
}

.cg__prev-toggle-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.cg__prev-term-body {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

.cg__prev-term-text {
  font-size: 0.8rem;
  color: var(--text);
  line-height: 1.45;
  margin: 0 0 6px;
  font-style: italic;
}

.cg__prev-term-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

/* ── Workspace Split ──────────────────────────────────────────────────────── */
.cg__workspace {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  min-height: 520px;
}

@media (max-width: 900px) {
  .cg__workspace {
    grid-template-columns: 1fr;
  }
}

/* ── Left Pane: Student Queue ─────────────────────────────────────────────── */
.cg__roster-pane {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cg__roster-search {
  position: relative;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.cg__search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.cg__search-input {
  width: 100%;
  height: 32px;
  padding-left: 28px;
  padding-right: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  background: var(--bg-secondary);
  color: var(--text);
}

.cg__roster-list {
  flex: 1;
  overflow-y: auto;
  max-height: 580px;
}

.cg__student-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: none;
  background: transparent;
  border-bottom: 1px solid var(--border);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.cg__student-row:hover {
  background: var(--bg-secondary);
}

.cg__student-row--active {
  background: var(--primary-light);
}

.cg__student-name {
  display: block;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text);
}

.cg__student-meta {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.cg__student-grade-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cg__grade-pill {
  font-size: 0.76rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 12px;
}

.cg__grade-pill--l4 { background: rgba(52, 199, 89, 0.18); color: #248a3d; }
.cg__grade-pill--l3 { background: rgba(0, 122, 255, 0.18); color: #007aff; }
.cg__grade-pill--l2 { background: rgba(255, 149, 0, 0.18); color: #d97706; }
.cg__grade-pill--l1 { background: rgba(255, 59, 48, 0.18); color: #dc2626; }
.cg__grade-pill--r  { background: rgba(142, 142, 147, 0.18); color: #6b7280; }
.cg__grade-pill--none { background: var(--bg-secondary); color: var(--text-secondary); }

.cg__copied-check {
  color: #248a3d;
}

/* ── Right Pane: Comment Editor ───────────────────────────────────────────── */
.cg__editor-pane {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cg__student-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.cg__sb-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px 0;
}

.cg__sb-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cg__badge {
  font-size: 0.74rem;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.cg__badge--grade {
  color: var(--text);
}

.cg__badge--level {
  background: var(--primary-light);
  color: var(--primary);
  border-color: transparent;
  font-weight: 600;
}

.cg__btn-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease;
}

.cg__btn-icon:hover {
  background: var(--border);
}

.cg__btn-icon--ai-ready {
  background: #f0fdf4;
  border-color: #86efac;
  color: #15803d;
}
.cg__btn-icon--ai-ready:hover {
  background: #dcfce7;
}

.cg__btn-icon--gear {
  padding: 6px 8px;
}

.cg__icon--spin {
  animation: cg-spin 1.2s linear infinite;
}

@keyframes cg-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Evidence Selector Row ────────────────────────────────────────────────── */
.cg__evidence-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 700px) {
  .cg__evidence-grid {
    grid-template-columns: 1fr;
  }
}

.cg__evidence-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cg__field-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 5px;
}

.cg__field-icon--gold { color: #f59e0b; }
.cg__field-icon--blue { color: #3b82f6; }

.cg__select--field {
  width: 100%;
}

/* ── Textarea & Meter ─────────────────────────────────────────────────────── */
.cg__textarea-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cg__textarea {
  width: 100%;
  min-height: 140px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-size: 0.94rem;
  line-height: 1.5;
  font-family: inherit;
  resize: vertical;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
}

.cg__textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.cg__meter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.cg__meter-counts {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.cg__char-count-pill {
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.cg__char-count--safe { background: rgba(52, 199, 89, 0.16); color: #248a3d; }
.cg__char-count--warn { background: rgba(255, 149, 0, 0.18); color: #d97706; }
.cg__char-count--over { background: rgba(255, 59, 48, 0.18); color: #dc2626; }

.cg__over-warning {
  color: #dc2626;
  font-weight: 600;
  font-size: 0.78rem;
}

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.cg__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cg__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
  min-height: 38px;
}

.cg__btn-primary:hover {
  opacity: 0.92;
}

.cg__btn-primary--success {
  background: #248a3d;
}

.cg__btn-next {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  min-height: 38px;
  transition: background 0.15s ease;
}

.cg__btn-next:hover {
  background: var(--border);
}

/* ── Guide Breakdown ──────────────────────────────────────────────────────── */
.cg__footer-guide {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.cg__guide-chip {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cg__guide-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cg__guide-dot--strength { background: #f59e0b; }
.cg__guide-dot--habit    { background: #3b82f6; }
.cg__guide-dot--next     { background: #10b981; }

.cg__empty-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-secondary);
  text-align: center;
  gap: 12px;
}

.cg__empty-icon {
  opacity: 0.4;
}
</style>
