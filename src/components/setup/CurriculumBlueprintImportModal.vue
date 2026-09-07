<template>
  <div v-if="modelValue" class="cbim-overlay" @click.self="onClose">
    <div class="cbim-modal" role="dialog" aria-modal="true" aria-labelledby="cbim-title">
      
      <!-- Header -->
      <div class="cbim-header">
        <div class="cbim-header__title-group">
          <div class="cbim-header__icon-wrapper">
            <BookPlus :size="20" class="cbim-header__icon" />
          </div>
          <div>
            <h3 id="cbim-title" class="cbim-title">Import Course Blueprint into Master Library</h3>
            <p class="cbim-subtitle">
              Add new course templates to your Master Library using AI prompts, JSON preset files, or spreadsheet CSVs.
            </p>
          </div>
        </div>
        <button type="button" class="cbim-close-btn" @click="onClose" title="Close">
          <X :size="18" />
        </button>
      </div>

      <!-- Tabs Navigation -->
      <div class="cbim-tabs" role="tablist">
        <button 
          type="button" 
          role="tab"
          class="cbim-tab" 
          :class="{ 'cbim-tab--active': activeTab === 'upload' }" 
          @click="activeTab = 'upload'"
        >
          <FileText :size="15" /> Upload or Paste Course
        </button>
        <button 
          type="button" 
          role="tab"
          class="cbim-tab" 
          :class="{ 'cbim-tab--active': activeTab === 'ai' }" 
          @click="activeTab = 'ai'"
        >
          <Sparkles :size="15" class="cbim-ai-icon" /> AI Prompts &amp; Boilerplates
        </button>
      </div>

      <!-- Modal Body -->
      <div class="cbim-body">
        
        <!-- ══════════════════════════════════════════════════════════ -->
        <!-- TAB 1: UPLOAD OR PASTE                                     -->
        <!-- ══════════════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'upload'" class="cbim-section">
          
          <!-- Drop Zone & File Selector -->
          <div 
            class="cbim-dropzone"
            :class="{ 'cbim-dropzone--dragover': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleFileDrop"
            @click="triggerFileInput"
          >
            <input 
              ref="fileInputRef" 
              type="file" 
              accept=".json,.csv,.txt" 
              class="cbim-file-hidden" 
              @change="handleFileSelect" 
            />
            <div class="cbim-dropzone-icon">
              <UploadCloud :size="32" />
            </div>
            <div class="cbim-dropzone-text">
              <strong>Drop your Course Preset (.json) or CSV file here</strong>
              <span>or click to browse from your device</span>
            </div>
            <span class="cbim-dropzone-hint">Supports full Course Preset JSON, Success Criteria JSON, or 3-column CSV</span>
          </div>

          <!-- Divider -->
          <div class="cbim-divider">
            <span>OR PASTE CONTENT DIRECTLY</span>
          </div>

          <!-- Paste Raw Input -->
          <div class="cbim-field">
            <div class="cbim-field-header">
              <label class="cbim-label">Paste JSON, CSV, or Syllabus Text</label>
              <button 
                v-if="rawInputText" 
                type="button" 
                class="cbim-link-btn" 
                @click="clearInput"
              >
                Clear Input
              </button>
            </div>
            <textarea 
              v-model="rawInputText" 
              rows="6" 
              class="cbim-textarea" 
              placeholder='Paste complete Course Preset JSON or lines of text (e.g. "Strand A: Life Systems | A1.1 | Description...")'
            ></textarea>
          </div>

          <!-- Error Alert -->
          <div v-if="parseError" class="cbim-alert cbim-alert--error">
            <AlertCircle :size="16" />
            <span>{{ parseError }}</span>
          </div>

          <!-- Success Preview Card -->
          <div v-if="parsedCourse" class="cbim-preview-card">
            <div class="cbim-preview-header">
              <div class="cbim-preview-badge">
                <CheckCircle2 :size="14" /> Ready to Import
              </div>
              <span class="cbim-preview-format">{{ detectedFormatLabel }}</span>
            </div>

            <!-- Metadata Customization Inputs -->
            <div class="cbim-meta-grid">
              <div class="cbim-field">
                <label class="cbim-label">Course Title</label>
                <input v-model="parsedCourse.title" type="text" class="cbim-input" placeholder="e.g. Grade 12 Computer Science" />
              </div>
              <div class="cbim-field">
                <label class="cbim-label">Course / Subject Code</label>
                <input v-model="parsedCourse.subjectCode" type="text" class="cbim-input" placeholder="e.g. ICS4U" />
              </div>
              <div class="cbim-field">
                <label class="cbim-label">Grade</label>
                <input v-model="parsedCourse.grade" type="text" class="cbim-input" placeholder="e.g. Grade 12" />
              </div>
              <div class="cbim-field">
                <label class="cbim-label">Panel</label>
                <select v-model="parsedCourse.panel" class="cbim-select">
                  <option value="secondary">Secondary (9–12)</option>
                  <option value="elementary">Elementary (K–8)</option>
                </select>
              </div>
            </div>

            <!-- Strands Summary Pills -->
            <div class="cbim-strands-summary">
              <span class="cbim-strands-title">
                <strong>{{ parsedCourse.strands.length }} Strands</strong> &middot; {{ totalExpectationsCount }} Expectations
              </span>
              <div class="cbim-strands-tags">
                <span 
                  v-for="(s, idx) in parsedCourse.strands" 
                  :key="idx" 
                  class="cbim-strand-tag"
                >
                  {{ s.name }}: <strong>{{ getStrandExpCount(s) }}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════ -->
        <!-- TAB 2: AI PROMPTS & STARTER TEMPLATES                      -->
        <!-- ══════════════════════════════════════════════════════════ -->
        <div v-else class="cbim-section">
          
          <!-- 3-Step AI Workflow -->
          <div class="cbim-workflow-card">
            <h4 class="cbim-workflow-title">3-Step AI Course Blueprint Generation</h4>
            <div class="cbim-workflow-steps">
              <div class="cbim-step">
                <div class="cbim-step-num">1</div>
                <div class="cbim-step-content">
                  <strong>Copy AI Prompt</strong>
                  <span>Select a prompt below tailored for Ontario curriculum schemas</span>
                </div>
              </div>
              <div class="cbim-step-arrow">&rarr;</div>
              <div class="cbim-step">
                <div class="cbim-step-num">2</div>
                <div class="cbim-step-content">
                  <strong>Paste into AI</strong>
                  <span>Feed prompt + syllabus/PDF to ChatGPT, Claude, or Gemini</span>
                </div>
              </div>
              <div class="cbim-step-arrow">&rarr;</div>
              <div class="cbim-step">
                <div class="cbim-step-num">3</div>
                <div class="cbim-step-content">
                  <strong>Upload or Paste JSON</strong>
                  <span>Drop the AI-generated JSON into Tab 1 to save to Master Library</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Starter Boilerplate Downloads -->
          <div class="cbim-downloads-card">
            <div class="cbim-downloads-header">
              <div>
                <h5 class="cbim-downloads-title">Starter Boilerplate Templates</h5>
                <p class="cbim-downloads-subtitle">Download clean JSON schemas or CSV templates to inspect, fill out, or edit directly</p>
              </div>
            </div>
            <div class="cbim-downloads-btns">
              <button 
                type="button" 
                class="cbim-download-btn" 
                @click="downloadCourseJsonTemplate"
              >
                <Download :size="14" /> Download Course Preset (.json)
              </button>
              <button 
                type="button" 
                class="cbim-download-btn" 
                @click="downloadSuccessCriteriaJsonTemplate"
              >
                <Download :size="14" /> Download Success Criteria (.json)
              </button>
              <button 
                type="button" 
                class="cbim-download-btn" 
                @click="downloadSampleCsv"
              >
                <Download :size="14" /> Download Sample CSV (.csv)
              </button>
            </div>
          </div>

          <!-- Ready-to-Use AI Prompts -->
          <div class="cbim-prompts-stack">
            <h5 class="cbim-prompts-heading">Ready-to-Use AI Prompts (Click to Copy)</h5>

            <!-- PROMPT 1: Complete Course Preset JSON -->
            <div class="cbim-prompt-card">
              <div class="cbim-prompt-card__header">
                <div class="cbim-prompt-card__title">
                  <span class="cbim-tag cbim-tag--json">Full Course JSON</span>
                  <h6>1. Complete Course Blueprint Generator</h6>
                </div>
                <button 
                  type="button" 
                  class="cbim-copy-btn" 
                  :class="{ 'cbim-copy-btn--copied': copiedPromptKey === 'preset_json' }"
                  @click="copyPrompt('preset_json', aiPresetJsonPrompt)"
                >
                  <component :is="copiedPromptKey === 'preset_json' ? Check : Copy" :size="13" />
                  {{ copiedPromptKey === 'preset_json' ? 'Copied Prompt!' : 'Copy AI Prompt' }}
                </button>
              </div>
              <p class="cbim-prompt-desc">
                Converts an entire curriculum document or course syllabus into structured strands, overall expectations, and specific expectations with clean IDs.
              </p>
              <div class="cbim-prompt-preview">
                <code>{{ aiPresetJsonPrompt.slice(0, 260) }}...</code>
              </div>
            </div>

            <!-- PROMPT 2: Success Criteria Generator -->
            <div class="cbim-prompt-card">
              <div class="cbim-prompt-card__header">
                <div class="cbim-prompt-card__title">
                  <span class="cbim-tag cbim-tag--sc">Success Criteria</span>
                  <h6>2. Student-Friendly "I Can..." Statements Generator</h6>
                </div>
                <button 
                  type="button" 
                  class="cbim-copy-btn" 
                  :class="{ 'cbim-copy-btn--copied': copiedPromptKey === 'sc_json' }"
                  @click="copyPrompt('sc_json', aiSuccessCriteriaPrompt)"
                >
                  <component :is="copiedPromptKey === 'sc_json' ? Check : Copy" :size="13" />
                  {{ copiedPromptKey === 'sc_json' ? 'Copied Prompt!' : 'Copy AI Prompt' }}
                </button>
              </div>
              <p class="cbim-prompt-desc">
                Transforms traditional bureaucratic curriculum text into student-facing "I Can..." statements ideal for student portfolios and self-assessment.
              </p>
              <div class="cbim-prompt-preview">
                <code>{{ aiSuccessCriteriaPrompt.slice(0, 260) }}...</code>
              </div>
            </div>

            <!-- PROMPT 3: Spreadsheet / CSV Table -->
            <div class="cbim-prompt-card">
              <div class="cbim-prompt-card__header">
                <div class="cbim-prompt-card__title">
                  <span class="cbim-tag cbim-tag--csv">3-Column Table</span>
                  <h6>3. Clean Spreadsheet Table Converter</h6>
                </div>
                <button 
                  type="button" 
                  class="cbim-copy-btn" 
                  :class="{ 'cbim-copy-btn--copied': copiedPromptKey === 'csv_prompt' }"
                  @click="copyPrompt('csv_prompt', aiTablePrompt)"
                >
                  <component :is="copiedPromptKey === 'csv_prompt' ? Check : Copy" :size="13" />
                  {{ copiedPromptKey === 'csv_prompt' ? 'Copied Prompt!' : 'Copy AI Prompt' }}
                </button>
              </div>
              <p class="cbim-prompt-desc">
                Prompts AI to structure any standard syllabus text into <code>Strand Name | Code | Description</code> format for instant pasting.
              </p>
              <div class="cbim-prompt-preview">
                <code>{{ aiTablePrompt.slice(0, 260) }}...</code>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer Actions -->
      <div class="cbim-footer">
        <button type="button" class="cbim-btn-ghost" @click="onClose">
          Cancel
        </button>
        <button 
          v-if="activeTab === 'upload'"
          type="button" 
          class="cbim-btn-primary" 
          :disabled="!parsedCourse || isSaving"
          @click="handleSaveToMaster"
        >
          <Save :size="15" />
          {{ isSaving ? 'Saving...' : 'Save to Master Library' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  BookPlus,
  X,
  FileText,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Check,
  Save
} from 'lucide-vue-next'
import { useCurriculumLibrary } from '../../composables/useCurriculumLibrary.js'
import { cleanExpectationText } from '../../utils/textUtils.js'
import { useMessage } from '../../composables/useMessage.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { saveMasterPreset } = useCurriculumLibrary()
const { alert: showAlert } = useMessage()

const activeTab = ref('upload')
const isDragOver = ref(false)
const rawInputText = ref('')
const parseError = ref('')
const parsedCourse = ref(null)
const isSaving = ref(false)
const copiedPromptKey = ref('')
const fileInputRef = ref(null)

function onClose() {
  emit('update:modelValue', false)
}

function clearInput() {
  rawInputText.value = ''
  parsedCourse.value = null
  parseError.value = ''
}

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  readFile(file)
  e.target.value = ''
}

function handleFileDrop(e) {
  isDragOver.value = false
  const file = e.dataTransfer.files?.[0]
  if (!file) return
  readFile(file)
}

function readFile(file) {
  parseError.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    rawInputText.value = e.target?.result || ''
    parseContent(rawInputText.value, file.name)
  }
  reader.onerror = () => {
    parseError.value = 'Failed to read file from disk.'
  }
  reader.readAsText(file)
}

watch(rawInputText, (val) => {
  if (!val.trim()) {
    parsedCourse.value = null
    parseError.value = ''
    return
  }
  parseContent(val)
})

function parseContent(text, filename = '') {
  parseError.value = ''
  parsedCourse.value = null
  const trimmed = text.trim()
  if (!trimmed) return

  // 1. Try parsing as JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed)
      const obj = Array.isArray(json) ? json[0] : json
      if (obj && (obj.strands || obj.expectations)) {
        parsedCourse.value = normalizeJsonPreset(obj, filename)
        return
      }
    } catch {
      // Not valid JSON, fall through to text/CSV parser
    }
  }

  // 2. Parse as delimited text / CSV
  const parsed = parseDelimitedText(trimmed, filename)
  if (parsed && parsed.strands.length > 0) {
    parsedCourse.value = parsed
  } else {
    parseError.value = 'Could not detect valid Course Preset JSON or structured text/CSV. Please check format or copy an AI Prompt.'
  }
}

function normalizeJsonPreset(obj, filename) {
  const code = (obj.subjectCode || obj.courseCode || obj.code || filename.replace(/\.[^/.]+$/, '')).toUpperCase().trim()
  const title = obj.title || `${code} Course Blueprint`
  
  let detectedGrade = obj.grade
  if (!detectedGrade) {
    const titleMatch = title.match(/\b(?:Grade|Gr\.?)\s*(\d+)\b/i) || title.match(/\b([1-9]|1[0-2])\b/)
    if (titleMatch) {
      detectedGrade = `Grade ${titleMatch[1]}`
    } else if (code && code.length >= 4) {
      const codeDigit = code.charAt(3)
      if (codeDigit === '1') detectedGrade = 'Grade 9'
      else if (codeDigit === '2') detectedGrade = 'Grade 10'
      else if (codeDigit === '3') detectedGrade = 'Grade 11'
      else if (codeDigit === '4') detectedGrade = 'Grade 12'
    }
  }
  const grade = detectedGrade || 'Grade 9'
  const isElem = /grade\s*([1-8])\b/i.test(grade) || obj.panel === 'elementary'
  const presetId = obj.presetId || `ontario-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`

  const strands = (obj.strands || []).map((s, sIdx) => {
    const sName = cleanExpectationText(s.name || `Strand ${sIdx + 1}`)
    if (s.overalls && Array.isArray(s.overalls)) {
      return {
        id: s.id || `strand-${sIdx + 1}`,
        name: sName,
        overalls: s.overalls.map((ov, ovIdx) => ({
          code: ov.code || `O${ovIdx + 1}`,
          title: ov.title || ov.name || ov.code,
          description: ov.description || '',
          weight: ov.weight != null ? Number(ov.weight) : 1.0,
          specifics: (ov.specifics || []).map(sp => ({
            code: sp.code || '',
            description: sp.description || '',
            weight: sp.weight != null ? Number(sp.weight) : 1.0
          }))
        }))
      }
    } else if (s.expectations && Array.isArray(s.expectations)) {
      // Map flat expectations into overall container
      return {
        id: s.id || `strand-${sIdx + 1}`,
        name: sName,
        overalls: [
          {
            code: `S${sIdx + 1}`,
            description: sName,
            weight: 1.0,
            specifics: s.expectations.map(e => ({
              code: e.code || '',
              description: e.description || '',
              weight: e.weight != null ? Number(e.weight) : 1.0
            }))
          }
        ]
      }
    }
    return { id: `strand-${sIdx + 1}`, name: sName, overalls: [] }
  })

  return {
    presetId,
    title,
    subjectCode: code,
    grade,
    panel: isElem ? 'elementary' : 'secondary',
    department: obj.department || '',
    isSuccessCriteria: !!obj.isSuccessCriteria,
    strands
  }
}

function parseDelimitedText(text, filename) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const strandsMap = {}
  let currentStrandName = 'Strand A: Foundations'

  for (const line of lines) {
    // Check if line is a strand header (e.g. "Strand A: Life Systems" or "Unit 1: Dynamics")
    if (/^(strand|unit)\s+[a-z0-9]/i.test(line) && !line.includes('|') && !line.includes('\t')) {
      currentStrandName = cleanExpectationText(line)
      if (!strandsMap[currentStrandName]) strandsMap[currentStrandName] = []
      continue
    }

    let code = ''
    let desc = ''
    let strandName = currentStrandName

    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length >= 3) {
        strandName = cleanExpectationText(parts[0]) || currentStrandName
        code = cleanExpectationText(parts[1])
        desc = cleanExpectationText(parts.slice(2).join(' '))
      } else if (parts.length === 2) {
        code = cleanExpectationText(parts[0])
        desc = cleanExpectationText(parts[1])
      }
    } else if (line.includes('\t')) {
      const parts = line.split('\t').map(p => p.trim())
      if (parts.length >= 3) {
        strandName = cleanExpectationText(parts[0]) || currentStrandName
        code = cleanExpectationText(parts[1])
        desc = cleanExpectationText(parts.slice(2).join(' '))
      } else if (parts.length === 2) {
        code = cleanExpectationText(parts[0])
        desc = cleanExpectationText(parts[1])
      }
    } else {
      const matchColon = line.match(/^([A-Za-z0-9\.-]{1,12})\s*:\s*(.+)$/)
      if (matchColon) {
        code = cleanExpectationText(matchColon[1])
        desc = cleanExpectationText(matchColon[2])
      } else {
        const matchSpace = line.match(/^([A-Za-z0-9\.-]{2,8})\s+(.+)$/)
        if (matchSpace) {
          code = cleanExpectationText(matchSpace[1])
          desc = cleanExpectationText(matchSpace[2])
        }
      }
    }

    if (code && desc) {
      if (!strandsMap[strandName]) strandsMap[strandName] = []
      strandsMap[strandName].push({ code: code.toUpperCase(), description: desc, weight: 1.0 })
    }
  }

  const strandEntries = Object.entries(strandsMap)
  if (strandEntries.length === 0) return null

  const codeGuess = (filename || 'CUSTOM').replace(/\.[^/.]+$/, '').toUpperCase()
  const strands = strandEntries.map(([sName, exps], idx) => ({
    id: `strand-${idx + 1}`,
    name: sName,
    overalls: [
      {
        code: `O${idx + 1}`,
        description: sName,
        weight: 1.0,
        specifics: exps
      }
    ]
  }))

  let detectedGrade = 'Grade 9'
  const gradeMatch = (filename || '').match(/\b(?:Grade|Gr\.?)\s*(\d+)\b/i)
  if (gradeMatch) {
    detectedGrade = `Grade ${gradeMatch[1]}`
  } else if (codeGuess && codeGuess.length >= 4) {
    const d = codeGuess.charAt(3)
    if (d === '1') detectedGrade = 'Grade 9'
    else if (d === '2') detectedGrade = 'Grade 10'
    else if (d === '3') detectedGrade = 'Grade 11'
    else if (d === '4') detectedGrade = 'Grade 12'
  }
  const isElem = /grade\s*([1-8])\b/i.test(detectedGrade)

  return {
    presetId: `custom-${codeGuess.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
    title: `${codeGuess} Course Blueprint`,
    subjectCode: codeGuess,
    grade: detectedGrade,
    panel: isElem ? 'elementary' : 'secondary',
    department: 'Custom',
    isSuccessCriteria: false,
    strands
  }
}

const totalExpectationsCount = computed(() => {
  if (!parsedCourse.value) return 0
  return parsedCourse.value.strands.reduce((acc, s) => acc + getStrandExpCount(s), 0)
})

function getStrandExpCount(strand) {
  if (!strand) return 0
  if (strand.expectations) return strand.expectations.length
  if (strand.overalls) {
    return strand.overalls.reduce((acc, ov) => acc + (ov.specifics ? ov.specifics.length : 1), 0)
  }
  return 0
}

const detectedFormatLabel = computed(() => {
  if (!parsedCourse.value) return ''
  if (parsedCourse.value.isSuccessCriteria) return 'Success Criteria Companion (.json)'
  return 'Full Course Preset Blueprint'
})

async function handleSaveToMaster() {
  if (!parsedCourse.value) return
  isSaving.value = true
  try {
    const course = parsedCourse.value
    // Clean course code and presetId
    const cleanCode = (course.subjectCode || 'COURSE').toUpperCase().trim()
    let finalPresetId = course.presetId
    if (course.isSuccessCriteria && !finalPresetId.endsWith('-success-criteria')) {
      finalPresetId = `${finalPresetId}-success-criteria`
    }
    course.presetId = finalPresetId
    course.subjectCode = cleanCode

    await saveMasterPreset(course)
    emit('saved', course.presetId)
    onClose()
  } catch (err) {
    console.error('Failed to save master course preset:', err)
    await showAlert('Failed to save course blueprint to Master Library: ' + err.message)
  } finally {
    isSaving.value = false
  }
}

// --- Boilerplate Downloads ---
function downloadCourseJsonTemplate() {
  const tpl = {
    presetId: "ontario-ics4u",
    title: "Ontario Grade 12 Computer Science (ICS4U)",
    panel: "secondary",
    region: "Ontario",
    grade: "Grade 12",
    subjectCode: "ICS4U",
    department: "Computer Studies",
    strands: [
      {
        name: "Strand A: Programming Concepts and Skills",
        overalls: [
          {
            code: "A1",
            title: "Data Types & Software Design",
            description: "Demonstrate the ability to use different data types and expressions in computer programs.",
            specifics: [
              { code: "A1.1", description: "use constants, variables, and appropriate data types in programs." },
              { code: "A1.2", description: "write expressions using arithmetic, relational, and logical operators." }
            ]
          }
        ]
      }
    ]
  }
  downloadJson(tpl, 'curriculum_preset_template.json')
}

function downloadSuccessCriteriaJsonTemplate() {
  const tpl = {
    presetId: "ontario-ics4u-success-criteria",
    title: "Grade 12 Computer Science (ICS4U) — Success Criteria",
    panel: "secondary",
    region: "Ontario",
    grade: "Grade 12",
    subjectCode: "ICS4U",
    department: "Computer Studies",
    isSuccessCriteria: true,
    strands: [
      {
        name: "Strand A: Programming Concepts and Skills",
        overalls: [
          {
            code: "A1",
            title: "Data Types & Software Design",
            description: "I can demonstrate data management and software design principles.",
            specifics: [
              { code: "A1.1", description: "I can declare constants and choose appropriate data types for variables." },
              { code: "A1.2", description: "I can construct complex conditional logic using relational and boolean operators." }
            ]
          }
        ]
      }
    ]
  }
  downloadJson(tpl, 'success_criteria_template.json')
}

function downloadSampleCsv() {
  const csvContent = `Strand Name,Expectation Code,Expectation Description
Strand A: STEM Skills,A1.1,Apply scientific investigation and engineering design processes
Strand A: STEM Skills,A1.2,Gather and analyze quantitative and qualitative data safely
Strand B: Life Systems,B1.1,Analyze ecosystem interactions and biodiversity impacts
Strand B: Life Systems,B1.2,Evaluate sustainable practices in community ecological stewardship`
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'expectations_sample.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// --- AI Prompts ---
const aiPresetJsonPrompt = `You are a curriculum specialist for Ontario schools. Convert the attached curriculum/syllabus into a structured JSON Course Preset Blueprint for Classroom Tracker.

Rules:
1. Output ONLY valid JSON matching the schema below.
2. Group all outcomes into official Ministry Strands, Overalls (e.g. A1, A2), and Specifics (e.g. A1.1, A1.2).
3. Ensure IDs and Codes are uppercase and clean plain text (no HTML entities).

Schema:
{
  "presetId": "ontario-[subjectcode]",
  "title": "Ontario [Grade] [Course Name] ([CODE])",
  "panel": "secondary",
  "region": "Ontario",
  "grade": "Grade 11",
  "subjectCode": "COURSE",
  "department": "Department",
  "strands": [
    {
      "name": "Strand A: [Title]",
      "overalls": [
        {
          "code": "A1",
          "title": "[Topic]",
          "description": "[Overall outcome description]",
          "specifics": [
            { "code": "A1.1", "description": "[Specific expectation description]" }
          ]
        }
      ]
    }
  ]
}

Here is the curriculum text:
[PASTE SYLLABUS HERE]`

const aiSuccessCriteriaPrompt = `You are an expert Ontario educator. Convert the following curriculum expectations into student-friendly Success Criteria ("I Can..." statements) for Classroom Tracker.

Rules:
1. Output ONLY valid JSON matching the schema below.
2. Formulate specific expectations as clear, student-accessible statements starting with "I can...".
3. Mark "isSuccessCriteria": true.

Schema:
{
  "presetId": "ontario-[subjectcode]-success-criteria",
  "title": "[Course Name] ([CODE]) — Success Criteria",
  "panel": "secondary",
  "region": "Ontario",
  "grade": "Grade 10",
  "subjectCode": "CODE",
  "isSuccessCriteria": true,
  "strands": [
    {
      "name": "Strand Name",
      "overalls": [
        {
          "code": "A1",
          "description": "I can demonstrate understanding of key concepts in this strand.",
          "specifics": [
            { "code": "A1.1", "description": "I can explain and apply [concept] using appropriate terminology." }
          ]
        }
      ]
    }
  ]
}

Here are the expectations to convert:
[PASTE CURRICULUM HERE]`

const aiTablePrompt = `Convert the following curriculum text into a clean 3-column table format for Classroom Tracker:

Format:
Strand Name | Expectation Code | Expectation Description

Example:
Strand A: STEM Skills | A1.1 | Apply scientific investigation and engineering design processes
Strand A: STEM Skills | A1.2 | Gather and analyze quantitative data safely
Strand B: Matter | B1.1 | Analyze chemical properties and bonding structures

Formatting rules:
- One expectation per line.
- Separate columns with vertical pipe " | ".
- Plain text only.

Here is the curriculum text:
[PASTE CURRICULUM HERE]`

function copyPrompt(key, text) {
  navigator.clipboard.writeText(text)
  copiedPromptKey.value = key
  setTimeout(() => {
    if (copiedPromptKey.value === key) copiedPromptKey.value = ''
  }, 2500)
}
</script>

<style scoped>
.cbim-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.cbim-modal {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 16px;
  width: 100%;
  max-width: 780px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: cbim-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cbim-in {
  from { opacity: 0; transform: scale(0.97) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.cbim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  background: var(--surface, #ffffff);
}

.cbim-header__title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cbim-header__icon-wrapper {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cbim-title {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 700;
  color: var(--text, #0f172a);
}

.cbim-subtitle {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary, #64748b);
}

.cbim-close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.cbim-close-btn:hover {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text, #0f172a);
}

.cbim-tabs {
  display: flex;
  gap: 8px;
  padding: 8px 22px;
  background: var(--bg-secondary, #f8fafc);
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.cbim-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #64748b);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cbim-tab:hover {
  color: var(--text, #0f172a);
  background: rgba(0, 0, 0, 0.04);
}

.cbim-tab--active {
  background: var(--surface, #ffffff);
  color: var(--primary, #2563eb);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.cbim-ai-icon {
  color: #9333ea;
}

.cbim-body {
  padding: 20px 22px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cbim-dropzone {
  border: 2px dashed var(--border, #cbd5e1);
  border-radius: 12px;
  padding: 24px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--bg-secondary, #f8fafc);
}

.cbim-dropzone:hover,
.cbim-dropzone--dragover {
  border-color: var(--primary, #2563eb);
  background: rgba(37, 99, 235, 0.04);
}

.cbim-file-hidden {
  display: none;
}

.cbim-dropzone-icon {
  color: var(--primary, #2563eb);
  margin-bottom: 8px;
}

.cbim-dropzone-text {
  font-size: 0.92rem;
  color: var(--text, #0f172a);
  margin-bottom: 4px;
}

.cbim-dropzone-text strong {
  display: block;
}

.cbim-dropzone-hint {
  font-size: 0.76rem;
  color: var(--text-secondary, #64748b);
}

.cbim-divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.cbim-divider::before,
.cbim-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.cbim-divider span {
  padding: 0 12px;
}

.cbim-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cbim-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cbim-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text, #1e293b);
}

.cbim-link-btn {
  background: transparent;
  border: none;
  color: var(--primary, #2563eb);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.cbim-link-btn:hover {
  text-decoration: underline;
}

.cbim-textarea,
.cbim-input,
.cbim-select {
  border: 1px solid var(--border, #cbd5e1);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.86rem;
  background: var(--surface, #ffffff);
  color: var(--text, #0f172a);
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.cbim-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.45;
}

.cbim-textarea:focus,
.cbim-input:focus,
.cbim-select:focus {
  outline: none;
  border-color: var(--primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.cbim-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
}

.cbim-alert--error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #dc2626;
}

.cbim-preview-card {
  background: rgba(37, 99, 235, 0.03);
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cbim-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cbim-preview-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.12);
  padding: 4px 10px;
  border-radius: 20px;
}

.cbim-preview-format {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary, #2563eb);
}

.cbim-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.cbim-strands-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(37, 99, 235, 0.12);
}

.cbim-strands-title {
  font-size: 0.82rem;
  color: var(--text, #0f172a);
}

.cbim-strands-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cbim-strand-tag {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.74rem;
  color: var(--text-secondary, #475569);
}

/* AI Workflow & Prompts */
.cbim-workflow-card {
  background: rgba(147, 51, 234, 0.04);
  border: 1px solid rgba(147, 51, 234, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.cbim-workflow-title {
  margin: 0 0 12px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #7e22ce;
}

.cbim-workflow-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cbim-step {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 140px;
}

.cbim-step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #7e22ce;
  color: #ffffff;
  font-size: 0.74rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cbim-step-content {
  display: flex;
  flex-direction: column;
}

.cbim-step-content strong {
  font-size: 0.8rem;
  color: var(--text, #0f172a);
}

.cbim-step-content span {
  font-size: 0.7rem;
  color: var(--text-secondary, #64748b);
}

.cbim-step-arrow {
  color: var(--text-secondary, #94a3b8);
  font-size: 1.1rem;
}

.cbim-downloads-card {
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 12px;
  padding: 16px;
}

.cbim-downloads-title {
  margin: 0 0 2px;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text, #0f172a);
}

.cbim-downloads-subtitle {
  margin: 0 0 12px;
  font-size: 0.76rem;
  color: var(--text-secondary, #64748b);
}

.cbim-downloads-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cbim-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--border, #cbd5e1);
  background: var(--surface, #ffffff);
  color: var(--text, #1e293b);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cbim-download-btn:hover {
  background: var(--bg-secondary, #f1f5f9);
  border-color: var(--text-secondary, #94a3b8);
}

.cbim-prompts-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cbim-prompts-heading {
  margin: 4px 0 0;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text, #0f172a);
}

.cbim-prompt-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cbim-prompt-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.cbim-prompt-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cbim-prompt-card__title h6 {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text, #0f172a);
}

.cbim-tag {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cbim-tag--json {
  background: rgba(37, 99, 235, 0.12);
  color: var(--primary, #2563eb);
}

.cbim-tag--sc {
  background: rgba(147, 51, 234, 0.12);
  color: #7e22ce;
}

.cbim-tag--csv {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.cbim-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--border, #cbd5e1);
  background: var(--surface, #ffffff);
  color: var(--text, #1e293b);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cbim-copy-btn:hover {
  background: var(--bg-secondary, #f1f5f9);
}

.cbim-copy-btn--copied {
  background: #16a34a !important;
  color: #ffffff !important;
  border-color: #16a34a !important;
}

.cbim-prompt-desc {
  margin: 0;
  font-size: 0.76rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}

.cbim-prompt-preview {
  background: var(--bg-secondary, #f8fafc);
  border-radius: 6px;
  padding: 8px 10px;
  border: 1px solid var(--border, #e2e8f0);
}

.cbim-prompt-preview code {
  font-size: 0.72rem;
  color: var(--text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-all;
}

.cbim-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--border, #e2e8f0);
  background: var(--bg-secondary, #f8fafc);
}

.cbim-btn-ghost {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border, #cbd5e1);
  background: var(--surface, #ffffff);
  color: var(--text, #1e293b);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cbim-btn-ghost:hover {
  background: var(--bg-secondary, #f1f5f9);
}

.cbim-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: var(--primary, #2563eb);
  color: #ffffff;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cbim-btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.cbim-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
