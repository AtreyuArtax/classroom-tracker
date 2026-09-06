<template>
  <div class="elementary-importer">
    <div class="elementary-importer__card">
      <div class="elementary-importer__header">
        <Upload :size="24" class="elementary-importer__icon" />
        <div>
          <h3 class="elementary-importer__title">Elementary SIS CSV Roster Import</h3>
          <p class="elementary-importer__subtitle">
            Upload your elementary school SIS export file to auto-populate your homeroom student roster and subjects.
          </p>
        </div>
      </div>

      <!-- File Upload Zone -->
      <div 
        class="elementary-importer__dropzone"
        :class="{ 'elementary-importer__dropzone--dragging': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept=".csv,.txt" 
          class="elementary-importer__file-input"
          @change="handleFileSelect"
        />
        <FileText :size="36" style="opacity: 0.5; margin-bottom: 8px;" />
        <div v-if="!selectedFile">
          <strong>Click to upload</strong> or drag and drop your CSV file here
        </div>
        <div v-else class="elementary-importer__file-name">
          📄 {{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(1) }} KB)
        </div>
      </div>

      <!-- Error alert -->
      <div v-if="errorMsg" class="elementary-importer__error">
        <AlertTriangle :size="16" /> {{ errorMsg }}
      </div>

      <!-- Parsed Preview -->
      <div v-if="parsedStudents.length > 0" class="elementary-importer__preview">
        <div class="elementary-importer__summary">
          <span>Found <strong>{{ parsedStudents.length }}</strong> students</span>
          <span v-if="detectedSubjects.length > 0">Detected <strong>{{ detectedSubjects.length }}</strong> subjects</span>
        </div>

        <!-- Detected Subjects Pills -->
        <div v-if="detectedSubjects.length > 0" class="elementary-importer__detected-subs">
          <span class="elementary-importer__sub-tag-label">Imported Subjects:</span>
          <span v-for="sub in detectedSubjects" :key="sub.subjectId" class="elementary-importer__sub-tag">
            <SubjectIcon :code="sub.code" :icon="sub.icon" :name="sub.name" :size="13" /> {{ sub.name }}
          </span>
        </div>

        <!-- Students Table Preview -->
        <div class="elementary-importer__table-container">
          <table class="elementary-importer__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Student ID / OEN</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, idx) in parsedStudents.slice(0, 10)" :key="s.studentId || idx">
                <td>{{ idx + 1 }}</td>
                <td><strong>{{ s.lastName }}</strong></td>
                <td>{{ s.firstName }}</td>
                <td><code>{{ s.studentId }}</code></td>
                <td>{{ s.grade || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="parsedStudents.length > 10" class="elementary-importer__more-hint">
            ...and {{ parsedStudents.length - 10 }} more students.
          </div>
        </div>

        <!-- Import Action -->
        <div class="elementary-importer__actions">
          <button type="button" class="elementary-importer__btn-ghost" @click="resetImporter">Cancel</button>
          <button type="button" class="elementary-importer__btn-primary" @click="confirmImport">
            <CheckCircle :size="16" /> Import Roster into Homeroom
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-vue-next'
import SubjectIcon from '../SubjectIcon.vue'
import { DEFAULT_ELEMENTARY_SUBJECTS } from '../../utils/elementarySubjects.js'
import { parseCsvRows } from '../../utils/learningSkillsCsvParser.js'

const emit = defineEmits(['imported'])

const fileInputRef = ref(null)
const isDragging = ref(false)
const selectedFile = ref(null)
const errorMsg = ref('')
const parsedStudents = ref([])
const detectedSubjects = ref([])

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleDrop(e) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

function handleFileSelect(e) {
  const files = e.target.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

function processFile(file) {
  selectedFile.value = file
  errorMsg.value = ''
  parsedStudents.value = []
  detectedSubjects.value = []

  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const text = evt.target.result
      parseCSV(text)
    } catch (err) {
      console.error('[ElementaryCsvImporter] Parse error:', err)
      errorMsg.value = 'Failed to parse CSV file. Please verify formatting.'
    }
  }
  reader.readAsText(file)
}

function parseCSV(csvText) {
  const rows = parseCsvRows(csvText)
  if (!rows || rows.length < 2) {
    errorMsg.value = 'CSV file must contain a header row and at least one student row.'
    return
  }

  // Parse header
  const headers = rows[0].map(h => (h || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))
  
  // Find column indices specifically matching student fields (excluding parent name columns)
  const lastNameIdx = headers.findIndex(h => h === 'lastname' || h === 'surname' || h === 'last_name')
  const firstNameIdx = headers.findIndex(h => h === 'firstname' || h === 'givenname' || h === 'first_name')
  const studentNameIdx = headers.findIndex(h => 
    h === 'studentname' || h === 'fullname' || h === 'name' || (h.includes('student') && h.includes('name'))
  )
  const idIdx = headers.findIndex(h => 
    h === 'studentnumber' || h === 'oen' || h === 'studentid' || h === 'id' || h.includes('number') || h.includes('oen')
  )
  const gradeIdx = headers.findIndex(h => h === 'grade' || h.includes('grade'))
  const emailIdx = headers.findIndex(h => h === 'studentemail' || h === 'email')
  const alertIdx = headers.findIndex(h => h === 'parentalert' || h.includes('alert'))
  const noteIdx = headers.findIndex(h => h === 'parentothernote' || h.includes('note'))

  const studentsList = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    let firstName = ''
    let lastName = ''
    let studentId = ''
    let grade = ''
    let email = ''
    let alertText = ''
    let noteText = ''

    if (lastNameIdx >= 0 && firstNameIdx >= 0 && row[lastNameIdx]) {
      lastName = (row[lastNameIdx] || '').trim()
      firstName = (row[firstNameIdx] || '').trim()
    } else if (studentNameIdx >= 0 && row[studentNameIdx]) {
      const nameVal = (row[studentNameIdx] || '').trim()
      const parts = nameVal.split(',')
      if (parts.length === 2) {
        lastName = parts[0].trim()
        firstName = parts[1].trim()
      } else {
        const spaceParts = nameVal.split(' ')
        firstName = spaceParts[0] || ''
        lastName = spaceParts.slice(1).join(' ') || ''
      }
    }

    if (idIdx >= 0 && row[idIdx]) {
      studentId = String(row[idIdx] || '').trim()
    }
    if (!studentId) {
      studentId = `${Date.now()}_${i}`
    }

    if (gradeIdx >= 0 && row[gradeIdx]) {
      const rawG = String(row[gradeIdx] || '').trim()
      const gNum = parseInt(rawG, 10)
      grade = !isNaN(gNum) ? `Grade ${gNum}` : (rawG.toLowerCase().startsWith('grade') ? rawG : `Grade ${rawG}`)
    }
    if (emailIdx >= 0 && row[emailIdx]) {
      email = String(row[emailIdx] || '').trim()
    }
    if (alertIdx >= 0 && row[alertIdx]) {
      alertText = String(row[alertIdx] || '').trim()
    }
    if (noteIdx >= 0 && row[noteIdx]) {
      noteText = String(row[noteIdx] || '').trim()
    }

    const combinedNotes = [alertText, noteText].filter(Boolean).join(' | ')

    if (firstName || lastName) {
      studentsList.push({
        studentId: studentId,
        firstName: firstName,
        lastName: lastName,
        grade: grade,
        gradeLevel: grade,
        email: email,
        notes: combinedNotes
      })
    }
  }

  if (studentsList.length === 0) {
    errorMsg.value = 'Could not find valid student rows in the CSV file.'
    return
  }

  parsedStudents.value = studentsList

  detectedSubjects.value = JSON.parse(JSON.stringify(DEFAULT_ELEMENTARY_SUBJECTS))
}

function resetImporter() {
  selectedFile.value = null
  parsedStudents.value = []
  detectedSubjects.value = []
  errorMsg.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function confirmImport() {
  emit('imported', {
    students: parsedStudents.value,
    subjects: detectedSubjects.value
  })
  resetImporter()
}
</script>

<style scoped>
.elementary-importer {
  width: 100%;
}

.elementary-importer__card {
  background: var(--bg-card, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.elementary-importer__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.elementary-importer__icon {
  color: #3b82f6;
}

.elementary-importer__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #f8fafc;
}

.elementary-importer__subtitle {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.elementary-importer__dropzone {
  border: 2px dashed #334155;
  border-radius: 10px;
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(15, 23, 42, 0.4);
}

.elementary-importer__dropzone:hover,
.elementary-importer__dropzone--dragging {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.elementary-importer__file-input {
  display: none;
}

.elementary-importer__file-name {
  font-weight: 600;
  color: #60a5fa;
}

.elementary-importer__error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 10px 14px;
  color: #fca5a5;
  font-size: 0.85rem;
}

.elementary-importer__preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #334155;
}

.elementary-importer__summary {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  color: #e2e8f0;
}

.elementary-importer__detected-subs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.elementary-importer__sub-tag-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
}

.elementary-importer__sub-tag {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

.elementary-importer__table-container {
  overflow-x: auto;
}

.elementary-importer__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.elementary-importer__table th,
.elementary-importer__table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #334155;
}

.elementary-importer__table th {
  color: #64748b;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.elementary-importer__table td code {
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

.elementary-importer__more-hint {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 6px;
  text-align: center;
}

.elementary-importer__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.elementary-importer__btn-ghost {
  background: transparent;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.elementary-importer__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #3b82f6;
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
</style>
