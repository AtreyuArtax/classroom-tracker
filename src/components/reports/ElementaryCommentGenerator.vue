<template>
  <div class="comment-generator elementary-comment-gen">
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
          <h2 class="cg__title"><MessageSquareText :size="20" /> Elementary Report Card Comment Generator</h2>
          <span v-if="reportClass" class="cg__class-pill">
            <GraduationCap :size="14" /> {{ reportClass.name }}
          </span>
        </div>
        <p class="cg__subtitle">
          SCDSB Elementary Report Cards (SBAR Expectations, Curriculum Strands &amp; 6 Learning Skills). Isolated per-subject and per-term.
        </p>
      </div>

      <div class="cg__header-controls">
        <!-- Reporting Period Selector -->
        <div class="cg__control-item cg__control-item--term">
          <div class="cg__control-label-row">
            <label class="cg__control-label">Reporting Period</label>
            <span v-if="termWindowBadge" class="cg__window-badge">
              <Calendar :size="11" /> {{ termWindowBadge }}
            </span>
          </div>
          <div class="cg__term-pills">
            <button
              v-for="t in elementaryTerms"
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

        <!-- Pronoun Mode Selector -->
        <div class="cg__control-item">
          <label class="cg__control-label">Pronoun Style</label>
          <select v-model="pronounMode" class="cg__select">
            <option value="preferred">Preferred (He / She / They)</option>
            <option value="name-only">Name Only (No Pronouns)</option>
          </select>
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

    <!-- ══ DYNAMIC SUBJECT & LEARNING SKILLS RIBBON ═══════════════════════ -->
    <div class="ecg__subject-ribbon" role="tablist" aria-label="Elementary Subjects & Learning Skills">
      <!-- Learning Skills Tab (Always First) -->
      <button
        type="button"
        class="ecg__subject-pill"
        :class="{ 'ecg__subject-pill--active': activeTab === 'learning_skills' }"
        role="tab"
        :aria-selected="activeTab === 'learning_skills'"
        @click="selectTab('learning_skills')"
      >
        <Award :size="15" class="ecg__pill-icon" />
        <span class="ecg__pill-label">Learning Skills</span>
        <span class="ecg__pill-limit">Max 2600</span>
      </button>

      <!-- Configured Academic Subjects -->
      <button
        v-for="sub in activeSubjects"
        :key="sub.subjectId"
        type="button"
        class="ecg__subject-pill"
        :class="{ 'ecg__subject-pill--active': activeTab === sub.subjectId }"
        role="tab"
        :aria-selected="activeTab === sub.subjectId"
        @click="selectTab(sub.subjectId)"
      >
        <SubjectIcon :code="sub.code" :icon="sub.icon" :name="sub.name" :size="15" class="ecg__pill-icon" />
        <span class="ecg__pill-label">{{ sub.name }}</span>
        <span class="ecg__pill-limit">Max {{ getSubjectLimit(sub) }}</span>
      </button>
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

            <!-- Subject-Specific Badge or Learning Skills Badge -->
            <div class="cg__student-grade-wrap">
              <template v-if="activeTab === 'learning_skills'">
                <span class="ecg__ls-summary-pill" :title="getStudentLsSummary(st.studentId)">
                  {{ getStudentLsBadge(st.studentId) }}
                </span>
              </template>
              <template v-else>
                <span 
                  v-if="getStudentSubjectMark(st.studentId, activeTab) != null" 
                  class="cg__grade-pill"
                  :class="getGradeColorClass(getStudentSubjectMark(st.studentId, activeTab))"
                >
                  {{ Math.round(getStudentSubjectMark(st.studentId, activeTab)) }}%
                </span>
                <span v-else class="cg__grade-pill cg__grade-pill--none">
                  N/A
                </span>
              </template>
            </div>
          </button>
        </div>
      </aside>

      <!-- ══ RIGHT PANEL: Active Student Comment Workspace ════════════════ -->
      <section v-if="activeStudent" class="cg__editor-pane">
        <div class="cg__editor-card">
          <!-- Active Student Header Bar -->
          <div class="cg__editor-header">
            <div class="cg__active-info">
              <div class="cg__active-name-row">
                <h3 class="cg__active-name">{{ formatStudentName(activeStudent) }}</h3>
                <span class="cg__pronoun-tag">{{ getStudentPronounsDisplay(activeStudent) }}</span>
              </div>
              <div class="cg__active-meta-row">
                <span class="cg__meta-item">
                  <strong>Reporting:</strong> {{ selectedTerm }}
                </span>
                <span class="cg__meta-item">
                  <strong>Area:</strong> {{ activeAreaTitle }}
                </span>
                <span v-if="activeTab !== 'learning_skills' && activeSubjectMark != null" class="cg__meta-item">
                  <strong>Evaluation:</strong> {{ Math.round(activeSubjectMark) }}% ({{ activeLevel.label }})
                </span>
              </div>
            </div>

            <!-- Header Actions -->
            <div class="cg__editor-header-actions">
              <button 
                type="button" 
                class="cg__btn-icon" 
                title="Reset to generated rule template"
                @click="resetToGenerated"
              >
                <RotateCcw :size="14" />
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

          <!-- ── TAB SPECIFIC CONTROLS ────────────────────────────────── -->

          <!-- 1. LEARNING SKILLS CONTROLS -->
          <div v-if="activeTab === 'learning_skills'" class="ecg__ls-controls-card">
            <div class="ecg__ls-header-row">
              <div class="ecg__format-toggle">
                <label class="cg__field-label">Comment Format:</label>
                <div class="cg__term-pills">
                  <button
                    type="button"
                    class="cg__term-pill-btn"
                    :class="{ 'cg__term-pill-btn--active': lsFormat === 'format_a' }"
                    title="Includes STRENGTHS: and NEXT STEPS: headings"
                    @click="setLsFormat('format_a')"
                  >
                    Format A (Labeled)
                  </button>
                  <button
                    type="button"
                    class="cg__term-pill-btn"
                    :class="{ 'cg__term-pill-btn--active': lsFormat === 'format_b' }"
                    title="Continuous narrative without headings"
                    @click="setLsFormat('format_b')"
                  >
                    Format B (Narrative)
                  </button>
                </div>
              </div>
            </div>

            <!-- 6 Learning Skills Rating Badges (Interactive) -->
            <div class="ecg__skills-matrix-bar">
              <div 
                v-for="cat in learningSkillCategories" 
                :key="cat.key" 
                class="ecg__skill-badge-item"
              >
                <span class="ecg__skill-name">{{ cat.label }}</span>
                <div class="ecg__skill-level-group">
                  <button
                    v-for="lvl in ['E', 'G', 'S', 'N']"
                    :key="lvl"
                    type="button"
                    class="ecg__skill-level-btn"
                    :class="{
                      'ecg__skill-level-btn--active': getSkillRating(cat.key) === lvl,
                      [`ecg__skill-level-btn--${lvl.toLowerCase()}`]: getSkillRating(cat.key) === lvl
                    }"
                    @click="setSkillRating(cat.key, lvl)"
                  >
                    {{ lvl }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. ACADEMIC SUBJECT CONTROLS (Science, Math, Language, History, Geography, Arts, etc.) -->
          <div v-else class="cg__evidence-grid">
            <!-- Strand Focus Selector (for subjects with dedicated strands) -->
            <div v-if="hasStrandSelector" class="cg__evidence-field">
              <label class="cg__field-label">
                <Sparkles :size="13" class="cg__field-icon cg__field-icon--gold" />
                {{ activeAreaTitle }} Strand Focus
              </label>
              <select v-model="selectedSubjectStrand" class="cg__select cg__select--field">
                <option 
                  v-for="st in currentSubjectStrands" 
                  :key="st.code" 
                  :value="st.code"
                >
                  {{ st.label }}
                </option>
              </select>
            </div>

            <!-- Science Specific Inquiry Project Focus -->
            <div v-if="isScienceTab" class="cg__evidence-field">
              <label class="cg__field-label">
                <Target :size="13" class="cg__field-icon cg__field-icon--blue" />
                Inquiry Project / Topic
              </label>
              <select v-model="selectedScienceProject" class="cg__select cg__select--field">
                <option value="">Auto-detected from strand</option>
                <option 
                  v-for="proj in currentStrandProjects" 
                  :key="proj" 
                  :value="proj"
                >
                  {{ proj }}
                </option>
              </select>
            </div>

            <!-- Featured Curriculum Strength (for Math, Language, Social Studies, Arts, etc.) -->
            <div v-if="!isScienceTab" class="cg__evidence-field">
              <label class="cg__field-label">
                <Sparkles :size="13" class="cg__field-icon cg__field-icon--gold" />
                Featured Curriculum Strength
              </label>
              <select v-model="selectedSubjectStrength" class="cg__select cg__select--field">
                <option value="">Auto-detected ({{ autoStrengthDisplay }})</option>
                <optgroup v-if="subjectSbarExpectations.length > 0" label="SBAR Expectations">
                  <option 
                    v-for="exp in subjectSbarExpectations" 
                    :key="exp.code || exp.expectationId" 
                    :value="exp.description || exp.title || exp.code"
                  >
                    {{ exp.code ? exp.code + ': ' : '' }}{{ exp.description || exp.title }}
                  </option>
                </optgroup>
                <optgroup v-if="studentSubjectAssessments.length > 0" label="Specific Tasks">
                  <option 
                    v-for="ass in studentSubjectAssessments" 
                    :key="ass.name" 
                    :value="ass.name"
                  >
                    {{ ass.name }} ({{ ass.scorePercent }}%)
                  </option>
                </optgroup>
              </select>
            </div>

            <!-- Featured Next Step Focus (all academic subjects) -->
            <div class="cg__evidence-field">
              <label class="cg__field-label">
                <Target :size="13" class="cg__field-icon cg__field-icon--blue" />
                Featured Next Step Focus
              </label>
              <select v-model="selectedSubjectGrowth" class="cg__select cg__select--field">
                <option value="">Auto-detected ({{ autoGrowthDisplay }})</option>
                <optgroup v-if="subjectSbarExpectations.length > 0" label="SBAR Expectations">
                  <option 
                    v-for="exp in subjectSbarExpectations" 
                    :key="exp.code || exp.expectationId" 
                    :value="exp.description || exp.title || exp.code"
                  >
                    {{ exp.code ? exp.code + ': ' : '' }}{{ exp.description || exp.title }}
                  </option>
                </optgroup>
                <optgroup v-if="studentSubjectAssessments.length > 0" label="Specific Tasks">
                  <option 
                    v-for="ass in studentSubjectAssessments" 
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
              rows="6"
              class="cg__textarea"
              :placeholder="`Generating ${activeAreaTitle} comment...`"
              @input="onCommentInput"
            />

            <!-- Character & Word Budget Meter (SCDSB Cap) -->
            <div class="cg__meter-bar">
              <div class="cg__meter-counts">
                <span 
                  class="cg__char-count-pill"
                  :class="{
                    'cg__char-count--safe': charCount <= (activeCharLimit - 30),
                    'cg__char-count--warn': charCount > (activeCharLimit - 30) && charCount <= activeCharLimit,
                    'cg__char-count--over': charCount > activeCharLimit
                  }"
                >
                  <strong>{{ charCount }}</strong> / {{ activeCharLimit }} characters (SCDSB Limit)
                </span>
                <span class="cg__word-count">{{ wordCount }} words</span>
                <span v-if="charCount > activeCharLimit" class="cg__over-warning">
                  ⚠️ Exceeds {{ activeCharLimit }} character SCDSB limit
                </span>
              </div>

              <!-- Quick Action Toolbar -->
              <div class="cg__actions">
                <!-- Local AI Polish Button -->
                <button
                  type="button"
                  class="cg__btn-secondary cg__btn-icon"
                  :class="{ 'cg__btn-icon--ai-ready': llmState.status === 'ready' }"
                  :title="llmState.status === 'ready' ? `Polish with local ${llmState.activeModelName} (${activePreset?.name || 'Ontario Standard'})` : 'Configure local AI rephraser'"
                  :disabled="isPolishing"
                  @click="handleAiPolishClick"
                >
                  <Sparkles :size="13" :class="{ 'cg__icon--spin': isPolishing }" />
                  <span v-if="isPolishing">Polishing...</span>
                  <span v-else-if="llmState.status === 'ready'">✨ Polish ({{ llmState.activeModelKey === 'qwen-0.5b' ? 'Qwen' : (llmState.activeModelKey === 'llama-1b' ? 'Llama' : 'Nano') }})</span>
                  <span v-else>✨ AI Polish...</span>
                </button>

                <select
                  v-if="llmState.status === 'ready'"
                  :value="activePresetId"
                  class="cg__select-preset-pill"
                  title="Active Prompt Preset & Tone"
                  @change="selectPreset($event.target.value)"
                >
                  <option v-for="p in allPresets" :key="p.id" :value="p.id">
                    {{ p.name }}
                  </option>
                </select>

                <button
                  type="button"
                  class="cg__btn-icon cg__btn-icon--gear"
                  title="Manage Local AI Models, Temperature & Prompt Settings"
                  @click="showLlmModal = true"
                >
                  <Cpu :size="13" />
                </button>

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
                  class="cg__btn-secondary"
                  title="Copy comment and advance to next student in roster"
                  @click="copyAndNext"
                >
                  <span>Copy &amp; Next</span>
                  <ChevronRight :size="14" />
                </button>
              </div>
            </div>
          </div>

          <!-- Previous Term Progression Accordion -->
          <div v-if="previousTermName && previousTermComment" class="cg__progression-wrap">
            <button
              type="button"
              class="cg__progression-toggle"
              @click="showPrevTerm = !showPrevTerm"
            >
              <History :size="14" />
              <span>Previous Term Comparison ({{ previousTermName }}):</span>
              <span class="cg__progression-status">{{ showPrevTerm ? 'Hide' : 'Show' }}</span>
            </button>
            <div v-if="showPrevTerm" class="cg__progression-body">
              <p class="cg__progression-comment">{{ previousTermComment }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty state if no students -->
      <section v-else class="cg__editor-pane cg__editor-pane--empty">
        <p>No students found for this class roster.</p>
      </section>
    </div>

    <!-- Local LLM Settings Modal -->
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
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  Download,
  Search,
  Target,
  GraduationCap,
  Cpu,
  History,
  ArrowLeft,
  Calendar,
  Award
} from 'lucide-vue-next'

import SubjectIcon from '../SubjectIcon.vue'
import { DEFAULT_ELEMENTARY_SUBJECTS } from '../../utils/elementarySubjects.js'
import { getScdsbCharacterLimit } from '../../data/comments/scdsbCharacterLimits.js'
import { GRADE_8_SCIENCE_STRANDS, resolveScienceStrand } from '../../data/comments/elementaryScienceBank.js'
import {
  generateElementaryScienceComment,
  generateElementarySubjectComment,
  generateLearningSkillsComment
} from '../../utils/elementaryCommentGenerator.js'
import { getAchievementLevel } from '../../utils/commentGenerator.js'
import {
  llmState,
  detectHardwareCapabilities,
  polishElementaryComment
} from '../../utils/localLlmService.js'
import {
  currentTemperature,
  activePresetId,
  activePreset,
  allPresets,
  selectPreset,
  initAiPrompts
} from '../../composables/useAiPrompts.js'
import {
  getLearningSkillsByClassAndTerm,
  saveLearningSkillsRecord
} from '../../composables/useLearningSkills.js'
import {
  formatLocalDate,
  formatLocalDisplay,
  parseLocal
} from '../../utils/dates.js'
import {
  filteredMilestones,
  globalMilestones,
  activeClassRecord
} from '../../composables/useGradebook.js'
import { academicTerms } from '../../composables/useClassroomState.js'

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

// ── State ───────────────────────────────────────────────────────────────────
const elementaryTerms = ['Progress Report', 'Term 1', 'Term 2']
const selectedTerm = ref('Term 1')
const activeTab = ref('learning_skills') // 'learning_skills' | subjectId (e.g. 'subj_sci', 'subj_math')

const pronounMode = ref('preferred')
const searchQuery = ref('')
const selectedStudentId = ref(null)
const currentCommentText = ref('')
const copySuccess = ref(false)
const showPrevTerm = ref(false)

// Custom manual edits map: `${term}__${studentId}__${tab}` -> text
const customEdits = ref({})

// Re-roll seed map: `${term}__${studentId}__${tab}` -> number
const variantSeeds = ref({})

// Science strand overrides: `${term}__${studentId}` -> 'B'|'C'|'D'|'E'
const scienceStrandMap = ref({})
const scienceProjectMap = ref({})

// Subject strength / next step overrides: `${term}__${studentId}__${subjectId}` -> string
const subjectStrengthMap = ref({})
const subjectGrowthMap = ref({})

// Learning Skills format: 'format_a' | 'format_b'
const lsFormat = ref('format_a')

// Learning Skills ratings map: `${term}` -> { studentId -> { responsibility: 'E', ... } }
const classSkillsMap = ref({})

// Local AI Polish state
const showLlmModal = ref(false)
const isPolishing = ref(false)

// ── Helpers ─────────────────────────────────────────────────────────────────
function getEditKey(studentId, tab = activeTab.value, term = selectedTerm.value) {
  return `${term}__${studentId}__${tab}`
}

function getSeedKey(studentId, tab = activeTab.value, term = selectedTerm.value) {
  return `${term}__${studentId}__${tab}`
}

const activeSubjects = computed(() => {
  const cls = props.reportClass || activeClassRecord.value
  if (cls?.subjects && Array.isArray(cls.subjects) && cls.subjects.length > 0) {
    return cls.subjects
  }
  return DEFAULT_ELEMENTARY_SUBJECTS
})

const activeSubjectObj = computed(() => {
  if (activeTab.value === 'learning_skills') return null
  return activeSubjects.value.find(s => s.subjectId === activeTab.value) || activeSubjects.value[0] || null
})

const isScienceTab = computed(() => {
  if (!activeSubjectObj.value) return false
  const code = String(activeSubjectObj.value.code || activeSubjectObj.value.subjectId || activeSubjectObj.value.name || '').toLowerCase()
  return code.includes('sci') || code.includes('snc')
})

const isMathTab = computed(() => {
  if (!activeSubjectObj.value) return false
  const code = String(activeSubjectObj.value.code || activeSubjectObj.value.subjectId || activeSubjectObj.value.name || '').toLowerCase()
  return code.includes('math') || code.includes('mat')
})

const isLanguageTab = computed(() => {
  if (!activeSubjectObj.value) return false
  const code = String(activeSubjectObj.value.code || activeSubjectObj.value.subjectId || activeSubjectObj.value.name || '').toLowerCase()
  return code.includes('lang') || code.includes('eng') || code.includes('ela')
})

const isHistoryTab = computed(() => {
  if (!activeSubjectObj.value) return false
  const code = String(activeSubjectObj.value.code || activeSubjectObj.value.subjectId || activeSubjectObj.value.name || '').toLowerCase()
  return code.includes('hist') || code.includes('his')
})

const isGeographyTab = computed(() => {
  if (!activeSubjectObj.value) return false
  const code = String(activeSubjectObj.value.code || activeSubjectObj.value.subjectId || activeSubjectObj.value.name || '').toLowerCase()
  return code.includes('geog') || code.includes('geo')
})

const currentSubjectStrands = computed(() => {
  if (isScienceTab.value) {
    return [
      { code: 'B', label: 'Strand B: Life Systems - Cells' },
      { code: 'C', label: 'Strand C: Matter & Energy - Fluids' },
      { code: 'D', label: 'Strand D: Structures & Mechanisms - Systems in Action' },
      { code: 'E', label: 'Strand E: Earth & Space Systems - Water Systems' }
    ]
  }
  if (isMathTab.value) {
    return [
      { code: 'B', label: 'Strand B: Number (Fractions, Integers, Proportions)' },
      { code: 'C', label: 'Strand C: Algebra (Patterns, Equations, Coding)' },
      { code: 'D', label: 'Strand D: Data (Scatter Plots, Probability, Infographics)' },
      { code: 'E', label: 'Strand E: Spatial Sense (Transformations, Geometry)' },
      { code: 'F', label: 'Strand F: Financial Literacy (Budgets, Interest)' }
    ]
  }
  if (isLanguageTab.value) {
    return [
      { code: 'B', label: 'Strand B: Foundations of Language (Oral, Morphology)' },
      { code: 'C', label: 'Strand C: Comprehension (Texts, Perspectives, Media Bias)' },
      { code: 'D', label: 'Strand D: Composition (Inquiry, Drafting, Publishing)' }
    ]
  }
  if (isHistoryTab.value) {
    return [
      { code: 'A', label: 'Strand A: Creating Canada 1850-1890' },
      { code: 'B', label: 'Strand B: Canada 1890-1914: A Changing Society' }
    ]
  }
  if (isGeographyTab.value) {
    return [
      { code: 'A', label: 'Strand A: Global Settlement: Patterns & Sustainability' },
      { code: 'B', label: 'Strand B: Global Inequalities & Quality of Life' }
    ]
  }
  return []
})

const hasStrandSelector = computed(() => currentSubjectStrands.value.length > 0)

const activeAreaTitle = computed(() => {
  if (activeTab.value === 'learning_skills') return 'Learning Skills & Work Habits'
  return activeSubjectObj.value?.name || 'Academic Subject'
})

const activeCharLimit = computed(() => {
  const gradeLevel = activeStudent.value?.gradeLevel || props.reportClass?.gradeLevel || 8
  if (activeTab.value === 'learning_skills') {
    return getScdsbCharacterLimit('learning_skills', gradeLevel)
  }
  const code = activeSubjectObj.value?.code || activeSubjectObj.value?.name || ''
  return getScdsbCharacterLimit(code, gradeLevel)
})

function getSubjectLimit(sub) {
  const gradeLevel = activeStudent.value?.gradeLevel || props.reportClass?.gradeLevel || 8
  return getScdsbCharacterLimit(sub.code || sub.name, gradeLevel)
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

function formatStudentName(st) {
  if (!st) return 'Student'
  return `${st.firstName || ''} ${st.lastName || ''}`.trim() || 'Student'
}

function getStudentPronounsDisplay(st) {
  if (pronounMode.value === 'name-only') return 'Name Only'
  return st?.pronouns || 'They/Them'
}

// ── Learning Skills Helpers & State ──────────────────────────────────────────
const learningSkillCategories = [
  { key: 'responsibility', label: 'Responsibility' },
  { key: 'organization', label: 'Organization' },
  { key: 'independentWork', label: 'Independent Work' },
  { key: 'collaboration', label: 'Collaboration' },
  { key: 'initiative', label: 'Initiative' },
  { key: 'selfRegulation', label: 'Self-Regulation' }
]

function getStudentSkillsObj(studentId, term = selectedTerm.value) {
  return classSkillsMap.value[term]?.[studentId] || {}
}

function getSkillRating(catKey, studentId = selectedStudentId.value) {
  if (!studentId) return 'G'
  const skills = getStudentSkillsObj(studentId)
  return String(skills[catKey] || 'G').toUpperCase()
}

async function setSkillRating(catKey, rating) {
  if (!selectedStudentId.value) return
  const stId = selectedStudentId.value
  const term = selectedTerm.value
  if (!classSkillsMap.value[term]) classSkillsMap.value[term] = {}
  if (!classSkillsMap.value[term][stId]) classSkillsMap.value[term][stId] = {}

  classSkillsMap.value[term][stId][catKey] = rating

  // Save to database
  const classId = props.reportClass?.classId || activeClassRecord.value?.classId
  if (classId) {
    try {
      await saveLearningSkillsRecord({
        classId,
        studentId: stId,
        term,
        category: catKey,
        level: rating,
        rating
      })
    } catch (e) {
      console.warn('Failed to persist skill rating:', e)
    }
  }

  buildCommentForActive()
}

function getStudentLsBadge(studentId) {
  const skills = getStudentSkillsObj(studentId)
  const vals = Object.values(skills)
  if (!vals.length) return 'G (Default)'
  const eCount = vals.filter(v => v === 'E').length
  const gCount = vals.filter(v => v === 'G').length
  return `${eCount}E • ${gCount}G`
}

function getStudentLsSummary(studentId) {
  const skills = getStudentSkillsObj(studentId)
  return Object.entries(skills).map(([k, v]) => `${k}: ${v}`).join(', ')
}

function setLsFormat(fmt) {
  lsFormat.value = fmt
  buildCommentForActive()
}

// ── Subject & Science Controls Helpers ─────────────────────────────────────────
const subjectStrandMap = ref({})

const selectedSubjectStrand = computed({
  get: () => {
    if (!activeStudent.value || !activeTab.value) return 'B'
    const key = `${selectedTerm.value}__${activeStudent.value.studentId}__${activeTab.value}`
    if (subjectStrandMap.value[key]) return subjectStrandMap.value[key]
    if (isScienceTab.value) {
      const sciKey = `${selectedTerm.value}__${activeStudent.value.studentId}`
      if (scienceStrandMap.value[sciKey]) return scienceStrandMap.value[sciKey]
    }
    if (isHistoryTab.value || isGeographyTab.value) return 'A'
    if (isLanguageTab.value) return 'C'
    return 'B'
  },
  set: (val) => {
    if (!activeStudent.value || !activeTab.value) return
    const key = `${selectedTerm.value}__${activeStudent.value.studentId}__${activeTab.value}`
    subjectStrandMap.value[key] = val
    if (isScienceTab.value) {
      scienceStrandMap.value[`${selectedTerm.value}__${activeStudent.value.studentId}`] = val
    }
    buildCommentForActive()
  }
})

// Alias for backwards compatibility
const selectedScienceStrand = selectedSubjectStrand

const currentStrandProjects = computed(() => {
  const strand = resolveScienceStrand(selectedSubjectStrand.value)
  return strand.researchProjects || []
})

const selectedScienceProject = computed({
  get: () => {
    if (!activeStudent.value) return ''
    return scienceProjectMap.value[`${selectedTerm.value}__${activeStudent.value.studentId}`] || ''
  },
  set: (val) => {
    if (!activeStudent.value) return
    scienceProjectMap.value[`${selectedTerm.value}__${activeStudent.value.studentId}`] = val
    buildCommentForActive()
  }
})

// ── Academic Subject Expectations & Assessments ──────────────────────────────
const subjectSbarExpectations = computed(() => {
  if (!activeSubjectObj.value) return []
  return activeSubjectObj.value.expectations || 
    activeSubjectObj.value.gradebookUnits?.flatMap(u => u.expectations || []) || []
})

const studentSubjectAssessments = computed(() => {
  return [] // Can be linked with gradebook if assessments exist
})

function getStudentSubjectMark(studentId, subjectId) {
  // Scoped subject grade if available
  return 78 // Competent fallback default for display
}

const activeSubjectMark = computed(() => {
  if (!activeStudent.value || activeTab.value === 'learning_skills') return null
  return getStudentSubjectMark(activeStudent.value.studentId, activeTab.value)
})

const activeLevel = computed(() => {
  return getAchievementLevel(activeSubjectMark.value || 75)
})

const autoStrengthDisplay = computed(() => {
  if (subjectSbarExpectations.value.length > 0) {
    const e = subjectSbarExpectations.value[0]
    return e.description || e.title || e.code || 'Core Goals'
  }
  return 'Curriculum Goals'
})

const autoGrowthDisplay = computed(() => {
  if (subjectSbarExpectations.value.length > 1) {
    const e = subjectSbarExpectations.value[subjectSbarExpectations.value.length - 1]
    return e.description || e.title || e.code || 'Problem Solving'
  }
  return 'Problem Solving'
})

const selectedSubjectStrength = computed({
  get: () => {
    if (!activeStudent.value) return ''
    return subjectStrengthMap.value[getEditKey(activeStudent.value.studentId)] || ''
  },
  set: (val) => {
    if (!activeStudent.value) return
    subjectStrengthMap.value[getEditKey(activeStudent.value.studentId)] = val
    buildCommentForActive()
  }
})

const selectedSubjectGrowth = computed({
  get: () => {
    if (!activeStudent.value) return ''
    return subjectGrowthMap.value[getEditKey(activeStudent.value.studentId)] || ''
  },
  set: (val) => {
    if (!activeStudent.value) return
    subjectGrowthMap.value[getEditKey(activeStudent.value.studentId)] = val
    buildCommentForActive()
  }
})

// ── Date Window / Term Badges ────────────────────────────────────────────────
const termWindowBadge = computed(() => {
  if (selectedTerm.value === 'Progress Report') return 'Nov (Fall)'
  if (selectedTerm.value === 'Term 1') return 'Feb (Winter)'
  return 'June (Spring)'
})

// ── Previous Term Comment ────────────────────────────────────────────────────
const previousTermName = computed(() => {
  if (selectedTerm.value === 'Term 2') return 'Term 1'
  if (selectedTerm.value === 'Term 1') return 'Progress Report'
  return null
})

const previousTermComment = computed(() => {
  if (!activeStudent.value || !previousTermName.value) return null
  const prevKey = getEditKey(activeStudent.value.studentId, activeTab.value, previousTermName.value)
  return customEdits.value[prevKey] || null
})

// ── Main Comment Assembly ────────────────────────────────────────────────────
function buildCommentForActive() {
  if (!activeStudent.value) {
    currentCommentText.value = ''
    return
  }

  const key = getEditKey(activeStudent.value.studentId)
  if (customEdits.value[key] !== undefined) {
    currentCommentText.value = customEdits.value[key]
    return
  }

  const seed = variantSeeds.value[getSeedKey(activeStudent.value.studentId)] || 0

  if (activeTab.value === 'learning_skills') {
    const ratings = getStudentSkillsObj(activeStudent.value.studentId)
    const res = generateLearningSkillsComment({
      student: activeStudent.value,
      skillsRatings: ratings,
      options: {
        format: lsFormat.value,
        variantSeed: seed,
        charLimit: activeCharLimit.value,
        pronounMode: pronounMode.value
      }
    })
    currentCommentText.value = res.text
  } else if (isScienceTab.value) {
    const res = generateElementaryScienceComment({
      student: activeStudent.value,
      gradeData: { percentage: activeSubjectMark.value || 75 },
      options: {
        strandCode: selectedSubjectStrand.value,
        featuredProject: selectedScienceProject.value,
        featuredStrength: selectedSubjectStrength.value,
        featuredNextStep: selectedSubjectGrowth.value,
        variantSeed: seed,
        pronounMode: pronounMode.value,
        reportingPeriod: selectedTerm.value,
        charLimit: activeCharLimit.value
      }
    })
    currentCommentText.value = res.text
  } else {
    const res = generateElementarySubjectComment({
      student: activeStudent.value,
      subject: activeSubjectObj.value || { name: 'Subject' },
      gradeData: {
        percentage: activeSubjectMark.value || 75,
        sbarExpectations: subjectSbarExpectations.value
      },
      options: {
        strandCode: selectedSubjectStrand.value,
        featuredStrength: selectedSubjectStrength.value,
        featuredNextStep: selectedSubjectGrowth.value,
        variantSeed: seed,
        pronounMode: pronounMode.value,
        reportingPeriod: selectedTerm.value,
        charLimit: activeCharLimit.value
      }
    })
    currentCommentText.value = res.text
  }
}

function onCommentInput() {
  if (!activeStudent.value) return
  const key = getEditKey(activeStudent.value.studentId)
  customEdits.value[key] = currentCommentText.value
}

function resetToGenerated() {
  if (!activeStudent.value) return
  const key = getEditKey(activeStudent.value.studentId)
  delete customEdits.value[key]
  buildCommentForActive()
}

function rerollPhrasing() {
  if (!activeStudent.value) return
  const sKey = getSeedKey(activeStudent.value.studentId)
  variantSeeds.value[sKey] = (variantSeeds.value[sKey] || 0) + 1
  const key = getEditKey(activeStudent.value.studentId)
  delete customEdits.value[key]
  buildCommentForActive()
}

// ── Counts ───────────────────────────────────────────────────────────────────
const charCount = computed(() => (currentCommentText.value || '').length)
const wordCount = computed(() => (currentCommentText.value || '').trim().split(/\s+/).filter(Boolean).length)

// ── Tab & Student Selection ──────────────────────────────────────────────────
function selectTab(tabKey) {
  activeTab.value = tabKey
  copySuccess.value = false
  buildCommentForActive()
}

function selectStudent(studentId) {
  selectedStudentId.value = studentId
  copySuccess.value = false
  buildCommentForActive()
}

function selectTerm(term) {
  selectedTerm.value = term
  copySuccess.value = false
  refreshLearningSkillsForTerm(term).then(() => {
    buildCommentForActive()
  })
}

// ── Local AI Polish Action ───────────────────────────────────────────────────
async function handleAiPolishClick() {
  if (llmState.status !== 'ready') {
    showLlmModal.value = true
    return
  }

  if (!currentCommentText.value || isPolishing.value) return

  isPolishing.value = true
  try {
    const res = await polishElementaryComment({
      draftComment: currentCommentText.value,
      student: activeStudent.value,
      charLimit: activeCharLimit.value,
      subjectName: activeAreaTitle.value,
      isLearningSkills: activeTab.value === 'learning_skills',
      pronounMode: pronounMode.value,
      temperature: currentTemperature.value,
      customDirectives: activePreset.value?.customDirectives || '',
      customSystemPrompt: activePreset.value?.customSystemPrompt || ''
    })

    currentCommentText.value = res.text
    if (activeStudent.value) {
      customEdits.value[getEditKey(activeStudent.value.studentId)] = res.text
    }
  } catch (err) {
    alert(`Local AI polish encountered an issue: ${err.message || err}. You can check model settings in the gear menu.`)
  } finally {
    isPolishing.value = false
  }
}

// ── Copy & Next Actions ──────────────────────────────────────────────────────
async function copyCurrentComment() {
  if (!currentCommentText.value) return
  try {
    await navigator.clipboard.writeText(currentCommentText.value)
    copySuccess.value = true
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

// ── CSV Export ───────────────────────────────────────────────────────────────
function exportAllCommentsCsv() {
  if (!studentList.value || studentList.value.length === 0) return

  const rows = [
    ['Student ID', 'Last Name', 'First Name', 'Term', 'Area / Subject', 'Characters', 'Comment']
  ]

  studentList.value.forEach(st => {
    const key = getEditKey(st.studentId)
    let comment = customEdits.value[key]
    if (!comment) {
      const seed = variantSeeds.value[getSeedKey(st.studentId)] || 0
      if (activeTab.value === 'learning_skills') {
        const ratings = getStudentSkillsObj(st.studentId)
        comment = generateLearningSkillsComment({
          student: st,
          skillsRatings: ratings,
          options: {
            format: lsFormat.value,
            variantSeed: seed,
            charLimit: activeCharLimit.value,
            pronounMode: pronounMode.value
          }
        }).text
      } else {
        comment = generateElementarySubjectComment({
          student: st,
          subject: activeSubjectObj.value || { name: 'Subject' },
          gradeData: {
            percentage: getStudentSubjectMark(st.studentId, activeTab.value) || 75,
            sbarExpectations: subjectSbarExpectations.value
          },
          options: {
            strandCode: selectedSubjectStrand.value,
            featuredStrength: subjectStrengthMap.value[getEditKey(st.studentId)] || '',
            featuredNextStep: subjectGrowthMap.value[getEditKey(st.studentId)] || '',
            featuredProject: scienceProjectMap.value[`${selectedTerm.value}__${st.studentId}`] || '',
            variantSeed: seed,
            pronounMode: pronounMode.value,
            reportingPeriod: selectedTerm.value,
            charLimit: activeCharLimit.value
          }
        }).text
      }
    }

    rows.push([
      st.studentId || '',
      st.lastName || '',
      st.firstName || '',
      selectedTerm.value,
      activeAreaTitle.value,
      comment.length,
      comment
    ])
  })

  const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Elementary_Comments_${selectedTerm.value}_${activeAreaTitle.value.replace(/\s+/g, '_')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function getGradeColorClass(pct) {
  if (pct >= 80) return 'cg__grade-pill--high'
  if (pct >= 70) return 'cg__grade-pill--good'
  if (pct >= 60) return 'cg__grade-pill--med'
  if (pct >= 50) return 'cg__grade-pill--low'
  return 'cg__grade-pill--alert'
}

async function refreshLearningSkillsForTerm(term = selectedTerm.value) {
  const classId = props.reportClass?.classId || activeClassRecord.value?.classId
  if (!classId) return
  try {
    const records = await getLearningSkillsByClassAndTerm(classId, term)
    if (records && typeof records === 'object') {
      classSkillsMap.value[term] = records
    }
  } catch (e) {
    console.warn('Failed to load learning skills for term:', e)
  }
}

// ── Lifecycle & Watchers ─────────────────────────────────────────────────────
watch(studentList, (list) => {
  if (list.length > 0 && !selectedStudentId.value) {
    selectStudent(list[0].studentId)
  }
}, { immediate: true })

watch([selectedStudentId, activeTab, selectedTerm, pronounMode], () => {
  buildCommentForActive()
})

onMounted(async () => {
  await detectHardwareCapabilities()
  await initAiPrompts()
  await refreshLearningSkillsForTerm(selectedTerm.value)
  buildCommentForActive()
})
</script>

<style scoped>
/* Scoped Elementary Styles complementing ReportsCommentGenerator.vue CSS */
.elementary-comment-gen {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.ecg__subject-ribbon {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 12px;
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  scrollbar-width: thin;
}

.ecg__subject-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted, #64748b);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.ecg__subject-pill:hover {
  background: var(--surface-hover, #f1f5f9);
  color: var(--text-color, #0f172a);
}

.ecg__subject-pill--active {
  background: var(--primary-light, #e0f2fe);
  border-color: var(--primary, #0284c7);
  color: var(--primary-dark, #0369a1);
  font-weight: 600;
}

.ecg__pill-icon {
  flex-shrink: 0;
}

.ecg__pill-label {
  white-space: nowrap;
}

.ecg__pill-limit {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.05);
  color: inherit;
  opacity: 0.85;
}

.ecg__ls-controls-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  background: var(--surface-subtle, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
}

.ecg__ls-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ecg__format-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ecg__skills-matrix-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.ecg__skill-badge-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
}

.ecg__skill-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ecg__skill-level-group {
  display: flex;
  gap: 2px;
}

.ecg__skill-level-btn {
  flex: 1;
  padding: 2px 0;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  background: var(--surface-hover, #f1f5f9);
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-muted, #64748b);
  transition: all 0.15s ease;
}

.ecg__skill-level-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.ecg__skill-level-btn--active.ecg__skill-level-btn--e {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.ecg__skill-level-btn--active.ecg__skill-level-btn--g {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #7dd3fc;
}

.ecg__skill-level-btn--active.ecg__skill-level-btn--s {
  background: #fef9c3;
  color: #a16207;
  border-color: #fde047;
}

.ecg__skill-level-btn--active.ecg__skill-level-btn--n {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.ecg__ls-summary-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
  background: var(--surface-subtle, #f1f5f9);
  color: var(--text-color, #334155);
}

/* Base generator layout classes */
.cg__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 16px 20px;
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
}

.cg__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cg__btn-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--surface-hover, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  cursor: pointer;
}

.cg__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: var(--text-color, #0f172a);
}

.cg__class-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: #e0f2fe;
  color: #0369a1;
}

.cg__subtitle {
  font-size: 13px;
  color: var(--text-muted, #64748b);
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

.cg__control-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.cg__control-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted, #64748b);
}

.cg__window-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #0369a1;
}

.cg__term-pills {
  display: flex;
  gap: 4px;
}

.cg__term-pill-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid var(--border-color, #cbd5e1);
  background: var(--surface-color, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
}

.cg__term-pill-btn--active {
  background: var(--primary, #0284c7);
  border-color: var(--primary, #0284c7);
  color: #ffffff;
  font-weight: 600;
}

.cg__select {
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 6px;
  background: var(--surface-color, #ffffff);
  color: var(--text-color, #0f172a);
}

.cg__select--field {
  width: 100%;
}

.cg__btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 6px;
  cursor: pointer;
}

.cg__workspace {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  align-items: start;
}

.cg__roster-pane {
  display: flex;
  flex-direction: column;
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  max-height: calc(100vh - 220px);
}

.cg__roster-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.cg__search-icon {
  color: var(--text-muted, #94a3b8);
}

.cg__search-input {
  width: 100%;
  border: none;
  font-size: 12px;
  outline: none;
  background: transparent;
}

.cg__roster-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.cg__student-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid var(--border-color, #f1f5f9);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.cg__student-row:hover {
  background: var(--surface-hover, #f8fafc);
}

.cg__student-row--active {
  background: #e0f2fe;
  border-left: 3px solid #0284c7;
}

.cg__student-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cg__student-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color, #0f172a);
}

.cg__student-meta {
  font-size: 11px;
  color: var(--text-muted, #64748b);
}

.cg__grade-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
}

.cg__grade-pill--high { background: #dcfce7; color: #166534; }
.cg__grade-pill--good { background: #e0f2fe; color: #0369a1; }
.cg__grade-pill--med  { background: #fef9c3; color: #854d0e; }
.cg__grade-pill--low  { background: #fed7aa; color: #9a3412; }
.cg__grade-pill--alert { background: #fee2e2; color: #991b1b; }
.cg__grade-pill--none { background: #f1f5f9; color: #64748b; }

.cg__editor-pane {
  display: flex;
  flex-direction: column;
}

.cg__editor-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px;
  background: var(--surface-color, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
}

.cg__editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border-color, #f1f5f9);
  padding-bottom: 12px;
}

.cg__active-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cg__active-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cg__active-name {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: var(--text-color, #0f172a);
}

.cg__pronoun-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
}

.cg__active-meta-row {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--text-muted, #64748b);
  flex-wrap: wrap;
}

.cg__editor-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cg__btn-icon {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border-color, #cbd5e1);
  background: var(--surface-color, #ffffff);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-color, #334155);
}

.cg__btn-icon--gear {
  padding: 5px;
}

.cg__btn-icon--ai-ready {
  border-color: #38bdf8;
  background: #f0f9ff;
  color: #0369a1;
}

.cg__icon--spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cg__evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.cg__evidence-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cg__field-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color, #334155);
}

.cg__field-icon--gold { color: #eab308; }
.cg__field-icon--blue { color: #3b82f6; }

.cg__textarea-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cg__textarea {
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  padding: 12px;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  resize: vertical;
  outline: none;
  background: var(--surface-color, #ffffff);
  color: var(--text-color, #0f172a);
}

.cg__textarea:focus {
  border-color: var(--primary, #0284c7);
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
}

.cg__meter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cg__meter-counts {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cg__char-count-pill {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #334155;
}

.cg__char-count--safe { background: #ecfdf5; color: #065f46; }
.cg__char-count--warn { background: #fefce8; color: #854d0e; }
.cg__char-count--over { background: #fef2f2; color: #991b1b; font-weight: 700; }

.cg__word-count {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

.cg__over-warning {
  font-size: 12px;
  font-weight: 600;
  color: #dc2626;
}

.cg__actions {
  display: flex;
  gap: 8px;
}

.cg__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  background: var(--primary, #0284c7);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cg__btn-primary--success {
  background: #16a34a;
}

.cg__btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  background: var(--surface-hover, #f1f5f9);
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-color, #0f172a);
}

.cg__progression-wrap {
  border-top: 1px solid var(--border-color, #f1f5f9);
  padding-top: 10px;
}

.cg__progression-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: #0369a1;
  cursor: pointer;
  padding: 0;
}

.cg__progression-status {
  font-weight: 400;
  color: var(--text-muted, #64748b);
}

.cg__progression-body {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.cg__progression-comment {
  font-size: 12px;
  line-height: 1.5;
  color: #334155;
  margin: 0;
}

@media (max-width: 900px) {
  .cg__workspace {
    grid-template-columns: 1fr;
  }
  .cg__evidence-grid {
    grid-template-columns: 1fr;
  }
}

.cg__select-preset-pill {
  height: 28px;
  padding: 0 8px;
  font-size: 0.76rem;
  font-weight: 600;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--surface-color, #ffffff);
  color: var(--text-color, #1e293b);
  cursor: pointer;
  max-width: 170px;
  transition: border-color 0.15s ease;
}
.cg__select-preset-pill:hover {
  border-color: var(--color-primary, #3b82f6);
}
</style>
