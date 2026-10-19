<template>
  <BaseModal
    :show="show"
    title="Import Past Duties (CSV)"
    maxWidth="680px"
    @close="$emit('close')"
  >
    <div class="import-duties">
      <p class="setup__hint" style="margin-top: 0;">
        Upload your exported Google Sheets or Excel <code>.csv</code> file, or paste rows directly. 
        Classroom Tracker automatically parses your dates, duty names, durations, and snow days, 
        and groups them into their respective school years.
      </p>

      <!-- Input Mode Toggle -->
      <div class="import-duties__mode-toggle">
        <button
          type="button"
          class="import-duties__tab-btn"
          :class="{ 'import-duties__tab-btn--active': inputMode === 'file' }"
          @click="inputMode = 'file'"
        >
          <Upload :size="15" /> Upload .CSV File
        </button>
        <button
          type="button"
          class="import-duties__tab-btn"
          :class="{ 'import-duties__tab-btn--active': inputMode === 'paste' }"
          @click="inputMode = 'paste'"
        >
          <FileText :size="15" /> Paste Spreadsheet Text
        </button>
      </div>

      <!-- File Upload Zone -->
      <div
        v-if="inputMode === 'file'"
        class="import-duties__dropzone"
        :class="{ 'import-duties__dropzone--drag': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onFileDrop"
        @click="$refs.fileInput.click()"
      >
        <UploadCloud :size="36" class="import-duties__drop-icon" />
        <div style="font-weight: 600; color: var(--text-primary); margin-top: 6px;">
          {{ selectedFileName || 'Choose a CSV file or drag and drop here' }}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
          Accepts standard .csv exports from Google Drive or Excel
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,text/csv,text/plain"
          style="display: none;"
          @change="onFileSelected"
        />
      </div>

      <!-- Raw Paste Zone -->
      <div v-else class="import-duties__paste-zone">
        <textarea
          v-model="pastedText"
          class="setup__input import-duties__textarea"
          placeholder="Paste rows directly from your Google Sheet or Excel here...&#10;e.g.&#10;2025-10-20, AM Bus, 15&#10;2025-10-27, Student Commons, 20&#10;2025-11-11, Weight Room, 30, snow day"
          rows="7"
          @input="onPasteInput"
        ></textarea>
      </div>

      <!-- Parse Error Message -->
      <div v-if="parseError" class="import-duties__error">
        {{ parseError }}
      </div>

      <!-- Parsed Preview -->
      <div v-if="parsedResult && parsedResult.totalFound > 0" class="import-duties__preview">
        <div class="import-duties__preview-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <CheckCircle2 :size="18" style="color: #16a34a;" />
            <strong style="color: var(--text-primary);">
              {{ parsedResult.totalFound }} duties detected
            </strong>
          </div>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">
            Previewing first {{ Math.min(6, parsedResult.duties.length) }} entries
          </span>
        </div>

        <!-- School Years Detected -->
        <div class="import-duties__years-list">
          <span class="import-duties__years-label">School Years:</span>
          <span
            v-for="(count, yr) in parsedResult.summaryByYear"
            :key="yr"
            class="import-duties__year-pill"
          >
            {{ yr }} ({{ count }} duties)
          </span>
        </div>

        <!-- Preview Mini Table -->
        <div class="import-duties__preview-table-wrap">
          <table class="import-duties__mini-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Duty</th>
                <th>Min</th>
                <th>Notes / Status</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in previewRows" :key="idx">
                <td style="font-weight: 600;">{{ item.date }}</td>
                <td>{{ item.dutyName }}</td>
                <td>{{ item.duration }}m</td>
                <td>
                  <span v-if="item.isSnowDay" class="duties-view__tag" style="background: rgba(2, 132, 199, 0.15); color: #0284c7;">
                    Snow Day
                  </span>
                  <span v-else-if="item.notes">{{ item.notes }}</span>
                  <span v-else style="color: var(--border);">—</span>
                </td>
                <td style="color: var(--text-secondary); font-size: 0.8rem;">{{ item.schoolYear }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="import-duties__footer">
        <button
          type="button"
          class="setup__btn-ghost"
          @click="$emit('close')"
        >
          Cancel
        </button>

        <button
          type="button"
          class="setup__btn-primary"
          :disabled="!parsedResult || parsedResult.totalFound === 0 || isImporting"
          @click="handleImport"
        >
          {{ isImporting ? 'Importing...' : `Import ${parsedResult ? parsedResult.totalFound : 0} Duties` }}
        </button>
      </div>

    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CheckCircle2, FileText, Upload, UploadCloud } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { parseDutiesCsv } from '../../utils/dutyCsvParser.js'
import { useDutyTracker } from '../../composables/useDutyTracker.js'

defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'imported'])

const { dutySettings, importDutiesBatch } = useDutyTracker()

const inputMode = ref('file')
const isDragging = ref(false)
const selectedFileName = ref('')
const pastedText = ref('')
const parseError = ref('')
const parsedResult = ref(null)
const isImporting = ref(false)

const previewRows = computed(() => {
  if (!parsedResult.value || !parsedResult.value.duties) return []
  return parsedResult.value.duties.slice(0, 6)
})

function onFileSelected(evt) {
  const file = evt.target.files?.[0]
  if (file) processFile(file)
}

function onFileDrop(evt) {
  isDragging.value = false
  const file = evt.dataTransfer.files?.[0]
  if (file) processFile(file)
}

function processFile(file) {
  selectedFileName.value = file.name
  parseError.value = ''
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const text = e.target.result
      const res = parseDutiesCsv(text, dutySettings.value.dutyTypes)
      if (res.totalFound === 0) {
        parseError.value = 'No valid duty rows detected in this file. Please verify it contains Date, Duty, and Duration columns.'
      }
      parsedResult.value = res
    } catch (err) {
      parseError.value = `Error reading file: ${err.message}`
    }
  }
  reader.onerror = () => {
    parseError.value = 'Failed to read file.'
  }
  reader.readAsText(file)
}

function onPasteInput() {
  parseError.value = ''
  if (!pastedText.value || !pastedText.value.trim()) {
    parsedResult.value = null
    return
  }
  try {
    const res = parseDutiesCsv(pastedText.value, dutySettings.value.dutyTypes)
    if (res.totalFound === 0) {
      parseError.value = 'No valid duty rows detected. Ensure rows include Date (YYYY-MM-DD or MM/DD/YYYY) and Duty name.'
    }
    parsedResult.value = res
  } catch (err) {
    parseError.value = `Error parsing text: ${err.message}`
  }
}

async function handleImport() {
  if (!parsedResult.value || parsedResult.value.totalFound === 0) return
  isImporting.value = true

  try {
    await importDutiesBatch(parsedResult.value.duties)
    emit('imported', parsedResult.value.totalFound)
    emit('close')
  } catch (err) {
    parseError.value = `Failed to save imported duties: ${err.message}`
  } finally {
    isImporting.value = false
  }
}
</script>

<style scoped>
.import-duties {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.import-duties__mode-toggle {
  display: flex;
  background: var(--bg-secondary, #f2f2f7);
  padding: 4px;
  border-radius: var(--radius-sm, 8px);
  gap: 4px;
}

.import-duties__tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.import-duties__tab-btn--active {
  background: var(--surface, #ffffff);
  color: var(--primary, #4663ac);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.import-duties__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-md, 12px);
  background: var(--surface, #ffffff);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}

.import-duties__dropzone:hover,
.import-duties__dropzone--drag {
  border-color: var(--primary, #4663ac);
  background: rgba(70, 99, 172, 0.02);
}

.import-duties__drop-icon {
  color: var(--primary, #4663ac);
  opacity: 0.7;
}

.import-duties__textarea {
  font-family: monospace;
  font-size: 0.82rem;
  resize: vertical;
}

.import-duties__error {
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-sm, 8px);
  color: #dc2626;
  font-size: 0.85rem;
}

.import-duties__preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg-secondary, #f2f2f7);
  border-radius: var(--radius-md, 12px);
}

.import-duties__preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
}

.import-duties__years-list {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.import-duties__years-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.import-duties__year-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
}

.import-duties__preview-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  background: var(--surface, #ffffff);
}

.import-duties__mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  text-align: left;
}

.import-duties__mini-table th {
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--border);
}

.import-duties__mini-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.04));
}

.import-duties__mini-table tr:last-child td {
  border-bottom: none;
}

.import-duties__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
</style>
