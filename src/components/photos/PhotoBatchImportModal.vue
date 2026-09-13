<template>
  <BaseModal
    :show="show"
    title="Batch Import Student Photos"
    max-width="720px"
    @close="emit('close')"
  >
    <div class="batch-import-content">
      <p class="setup__hint">
        Select or drag photos into the importer. Photos should be named by <strong>Student ID</strong> (e.g. <code>104829.jpg</code>) or <strong>LastName_FirstName</strong> (e.g. <code>Smith_John.jpg</code>).
      </p>

      <!-- Unified Upload & Dropzone Area -->
      <div 
        v-if="!scannedResults" 
        class="photo-dropzone"
        :class="{ 'photo-dropzone--active': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="photo-dropzone__icon-wrap">
          <UploadCloud :size="36" class="photo-dropzone__icon" />
        </div>

        <div class="photo-dropzone__text">
          <span class="photo-dropzone__title">Drag & drop photos or a folder here</span>
          <span class="photo-dropzone__subtitle">Supports JPG, PNG, WEBP · Auto-matched & compressed</span>
        </div>

        <!-- Hidden Native File & Folder Inputs -->
        <input 
          ref="filesInputRef"
          type="file" 
          multiple 
          accept="image/jpeg,image/png,image/webp,image/jpg"
          class="hidden-input" 
          @change="handleFilesSelected" 
        />
        <input 
          ref="folderInputRef"
          type="file" 
          webkitdirectory 
          directory 
          multiple 
          accept="image/*"
          class="hidden-input" 
          @change="handleFolderSelected" 
        />

        <div class="photo-dropzone__divider">
          <span>or choose an option</span>
        </div>

        <div class="photo-dropzone__actions">
          <button 
            type="button" 
            class="photo-dropzone__btn photo-dropzone__btn--primary"
            @click.stop="triggerFilesInput"
            title="Select multiple photo files directly (No browser prompt)"
          >
            <Images :size="16" />
            <span>Select Photos</span>
          </button>

          <button 
            type="button" 
            class="photo-dropzone__btn photo-dropzone__btn--secondary"
            @click.stop="triggerFolderInput"
            title="Select an entire folder using your system folder picker"
          >
            <FolderOpen :size="16" />
            <span>Select Folder</span>
          </button>
        </div>
      </div>

      <!-- Scanning Progress / Spinner -->
      <div v-if="isScanning" class="scanning-state">
        <Loader2 :size="32" class="spin-icon" />
        <span>Scanning folder and matching students... ({{ scannedCount }} / {{ totalFiles }})</span>
      </div>

      <!-- Match Reconciliation Summary & Preview Table -->
      <div v-if="scannedResults && !isScanning" class="results-container">
        <!-- Summary Stats Pills -->
        <div class="stats-row">
          <div class="stat-pill stat-pill--matched">
            <CheckCircle :size="16" />
            <span><strong>{{ matchedList.length }}</strong> Matched</span>
          </div>
          <div class="stat-pill stat-pill--unmatched" v-if="unmatchedFiles.length > 0">
            <AlertCircle :size="16" />
            <span><strong>{{ unmatchedFiles.length }}</strong> Unmatched Files</span>
          </div>
          <div class="stat-pill stat-pill--missing" v-if="missingStudents.length > 0">
            <HelpCircle :size="16" />
            <span><strong>{{ missingStudents.length }}</strong> Missing Photos</span>
          </div>
        </div>

        <!-- Segmented Filter for Preview -->
        <div class="filter-bar">
          <button 
            type="button" 
            class="filter-tab" 
            :class="{ 'filter-tab--active': activeFilter === 'matched' }"
            @click="activeFilter = 'matched'"
          >
            Matched ({{ matchedList.length }})
          </button>
          <button 
            v-if="unmatchedFiles.length > 0"
            type="button" 
            class="filter-tab" 
            :class="{ 'filter-tab--active': activeFilter === 'unmatched' }"
            @click="activeFilter = 'unmatched'"
          >
            Unmatched Files ({{ unmatchedFiles.length }})
          </button>
          <button 
            v-if="missingStudents.length > 0"
            type="button" 
            class="filter-tab" 
            :class="{ 'filter-tab--active': activeFilter === 'missing' }"
            @click="activeFilter = 'missing'"
          >
            Missing Students ({{ missingStudents.length }})
          </button>
        </div>

        <!-- Matched Table -->
        <div v-if="activeFilter === 'matched'" class="preview-scroll-area">
          <div v-if="matchedList.length === 0" class="empty-filter-state">
            No student photos matched automatically. Ensure image files are named with student IDs.
          </div>
          <table v-else class="match-table">
            <thead>
              <tr>
                <th style="width: 50px;">Photo</th>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>File Matched</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in matchedList" :key="item.student.studentId">
                <td>
                  <img :src="item.previewUrl" alt="Thumbnail" class="mini-thumb" />
                </td>
                <td class="font-bold">{{ item.student.lastName }}, {{ item.student.firstName }}</td>
                <td><code class="id-tag">#{{ item.student.studentId }}</code></td>
                <td class="file-tag">{{ item.file.name }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Unmatched Files List -->
        <div v-if="activeFilter === 'unmatched'" class="preview-scroll-area">
          <div class="unmatched-list">
            <div v-for="file in unmatchedFiles" :key="file.name" class="unmatched-item">
              <FileImage :size="16" class="text-muted" />
              <span class="file-name">{{ file.name }}</span>
              <span class="setup__hint" style="margin-left: auto;">No matching student ID found</span>
            </div>
          </div>
        </div>

        <!-- Missing Students List -->
        <div v-if="activeFilter === 'missing'" class="preview-scroll-area">
          <div class="missing-list">
            <div v-for="st in missingStudents" :key="st.studentId" class="missing-item">
              <UserX :size="16" class="text-muted" />
              <span class="student-name">{{ st.lastName }}, {{ st.firstName }}</span>
              <code class="id-tag">#{{ st.studentId }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="batch-footer">
        <button 
          v-if="scannedResults" 
          type="button" 
          class="setup__btn-ghost setup__btn-sm" 
          @click="resetScan"
        >
          Choose Different Photos
        </button>

        <div class="batch-footer-actions">
          <button type="button" class="setup__btn-ghost" @click="emit('close')">Cancel</button>
          <button 
            v-if="scannedResults && matchedList.length > 0"
            type="button" 
            class="setup__btn-primary"
            :disabled="isImporting"
            @click="commitImport"
          >
            <Check :size="16" v-if="!isImporting" />
            <Loader2 :size="16" class="spin-icon" v-else />
            {{ isImporting ? 'Saving Photos...' : `Import ${matchedList.length} Photos` }}
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { FolderOpen, UploadCloud, Images, CheckCircle, AlertCircle, HelpCircle, Check, Loader2, FileImage, UserX } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { useStudentPhotos } from '../../composables/useStudentPhotos.js'
import { useClassroom } from '../../composables/useClassroom.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  // Target class or roster of students to match against
  studentList: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'imported'])

const { batchImport, compressAndCropImage } = useStudentPhotos()
const { classList } = useClassroom()

const isScanning = ref(false)
const isImporting = ref(false)
const scannedCount = ref(0)
const totalFiles = ref(0)
const scannedResults = ref(null)
const activeFilter = ref('matched')

const allStudents = computed(() => {
  if (props.studentList && props.studentList.length > 0) {
    return props.studentList
  }
  // Aggregate all enrolled students across all active classes
  const map = new Map()
  for (const cls of classList.value || []) {
    for (const [id, s] of Object.entries(cls.students || {})) {
      if (!s.archived && !map.has(id)) {
        map.set(id, { studentId: id, ...s })
      }
    }
  }
  return Array.from(map.values())
})

const matchedList = computed(() => scannedResults.value?.matched || [])
const unmatchedFiles = computed(() => scannedResults.value?.unmatched || [])
const missingStudents = computed(() => scannedResults.value?.missing || [])

const isDragging = ref(false)
const filesInputRef = ref(null)
const folderInputRef = ref(null)

function triggerFilesInput() {
  if (filesInputRef.value) {
    filesInputRef.value.value = ''
    filesInputRef.value.click()
  }
}

function triggerFolderInput() {
  if (folderInputRef.value) {
    folderInputRef.value.value = ''
    folderInputRef.value.click()
  }
}

async function handleFilesSelected(event) {
  const files = Array.from(event.target.files || [])
  if (files.length > 0) {
    await processFiles(files)
  }
}

async function handleFolderSelected(event) {
  const files = Array.from(event.target.files || [])
  if (files.length > 0) {
    await processFiles(files)
  }
}

async function handleDrop(event) {
  isDragging.value = false
  const items = event.dataTransfer?.items
  const collectedFiles = []

  if (items && items.length > 0) {
    for (const item of items) {
      if (typeof item.webkitGetAsEntry === 'function') {
        const entry = item.webkitGetAsEntry()
        if (entry) {
          await traverseEntry(entry, collectedFiles)
          continue
        }
      }
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) collectedFiles.push(file)
      }
    }
  } else if (event.dataTransfer?.files?.length) {
    collectedFiles.push(...Array.from(event.dataTransfer.files))
  }

  if (collectedFiles.length > 0) {
    await processFiles(collectedFiles)
  }
}

async function traverseEntry(entry, list) {
  if (entry.isFile) {
    const file = await new Promise((resolve) => entry.file(resolve, () => resolve(null)))
    if (file) list.push(file)
  } else if (entry.isDirectory) {
    const reader = entry.createReader()
    const readBatch = () => new Promise((resolve) => {
      reader.readEntries((batch) => resolve(batch || []), () => resolve([]))
    })
    let batch = await readBatch()
    while (batch.length > 0) {
      for (const child of batch) {
        await traverseEntry(child, list)
      }
      batch = await readBatch()
    }
  }
}

async function processFiles(files) {
  const imageFiles = files.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name))
  if (imageFiles.length === 0) {
    alert('No image files found. Please ensure photos are JPG, PNG, or WEBP.')
    return
  }

  isScanning.value = true
  totalFiles.value = imageFiles.length
  scannedCount.value = 0

  const studentMapById = new Map()
  const studentMapByName = new Map()

  for (const s of allStudents.value) {
    if (s.studentId) studentMapById.set(String(s.studentId).toLowerCase().trim(), s)
    if (s.studentNumber) studentMapById.set(String(s.studentNumber).toLowerCase().trim(), s)

    const nameKey = `${(s.lastName || '').trim()}_${(s.firstName || '').trim()}`.toLowerCase()
    studentMapByName.set(nameKey, s)
    const reverseNameKey = `${(s.firstName || '').trim()}_${(s.lastName || '').trim()}`.toLowerCase()
    if (!studentMapByName.has(reverseNameKey)) {
      studentMapByName.set(reverseNameKey, s)
    }
  }

  const matched = []
  const unmatched = []
  const matchedStudentIds = new Set()

  for (const file of imageFiles) {
    scannedCount.value++
    const baseName = file.name.replace(/\.[^/.]+$/, '').trim().toLowerCase()

    let matchedStudent = studentMapById.get(baseName)
    if (!matchedStudent) {
      matchedStudent = studentMapByName.get(baseName)
    }

    if (matchedStudent && !matchedStudentIds.has(matchedStudent.studentId)) {
      matchedStudentIds.add(matchedStudent.studentId)
      matched.push({
        student: matchedStudent,
        file,
        previewUrl: URL.createObjectURL(file)
      })
    } else {
      unmatched.push(file)
    }
  }

  const missing = allStudents.value.filter(s => !matchedStudentIds.has(s.studentId))

  scannedResults.value = {
    matched,
    unmatched,
    missing
  }

  isScanning.value = false
}

function resetScan() {
  if (scannedResults.value?.matched) {
    scannedResults.value.matched.forEach(m => {
      if (m.previewUrl) URL.revokeObjectURL(m.previewUrl)
    })
  }
  scannedResults.value = null
  activeFilter.value = 'matched'
}

async function commitImport() {
  if (!matchedList.value || matchedList.value.length === 0) return
  isImporting.value = true

  try {
    const compressedItems = []
    for (const item of matchedList.value) {
      const blob = await compressAndCropImage(item.file, 240, 0.85)
      compressedItems.push({
        studentId: item.student.studentId,
        blob
      })
    }

    const savedCount = await batchImport(compressedItems)
    emit('imported', { count: savedCount })
    emit('close')
  } catch (err) {
    console.error('Failed to batch import photos:', err)
    alert('An error occurred during photo import.')
  } finally {
    isImporting.value = false
  }
}
</script>

<style scoped>
.batch-import-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.photo-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg, 12px);
  background: var(--bg-secondary);
  transition: all 0.2s ease;
  text-align: center;
  gap: 12px;
}

.photo-dropzone:hover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.03);
}

.photo-dropzone--active {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.08);
  transform: scale(1.01);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.photo-dropzone__icon-wrap {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}

.photo-dropzone__icon {
  color: var(--primary);
}

.photo-dropzone__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.photo-dropzone__title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text);
}

.photo-dropzone__subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.photo-dropzone__divider {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 260px;
  margin: 2px 0;
  color: var(--text-secondary);
  font-size: 0.74rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

.photo-dropzone__divider::before,
.photo-dropzone__divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border);
}

.photo-dropzone__divider span {
  padding: 0 10px;
}

.photo-dropzone__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.photo-dropzone__btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.photo-dropzone__btn--primary {
  background: var(--primary);
  color: #ffffff;
  border: 1px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.photo-dropzone__btn--primary:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.photo-dropzone__btn--secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.photo-dropzone__btn--secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
}

.hidden-input {
  display: none;
}

.scanning-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 30px;
  color: var(--text-secondary, #64748b);
  font-weight: 600;
}

.spin-icon {
  animation: spin 1s linear infinite;
  color: var(--primary, #4f46e5);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.stats-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 0.8rem;
}

.stat-pill--matched {
  background: #dcfce7;
  color: #166534;
}

.stat-pill--unmatched {
  background: #fef3c7;
  color: #92400e;
}

.stat-pill--missing {
  background: #f1f5f9;
  color: #475569;
}

.filter-bar {
  display: flex;
  border-bottom: 1px solid var(--border, #e2e8f0);
  gap: 4px;
}

.filter-tab {
  padding: 8px 14px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
}

.filter-tab--active {
  border-bottom-color: var(--primary, #4f46e5);
  color: var(--primary, #4f46e5);
}

.preview-scroll-area {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
}

.match-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.match-table th {
  background: var(--bg-secondary, #f8fafc);
  padding: 8px 12px;
  text-align: left;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.match-table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  vertical-align: middle;
}

.mini-thumb {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
}

.id-tag {
  font-family: monospace;
  font-size: 0.8rem;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.file-tag {
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
  font-family: monospace;
}

.unmatched-list, .missing-list {
  display: flex;
  flex-direction: column;
}

.unmatched-item, .missing-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border, #f1f5f9);
  font-size: 0.85rem;
}

.empty-filter-state {
  padding: 24px;
  text-align: center;
  color: var(--text-muted, #94a3b8);
  font-style: italic;
  font-size: 0.85rem;
}

.batch-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.batch-footer-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
</style>
