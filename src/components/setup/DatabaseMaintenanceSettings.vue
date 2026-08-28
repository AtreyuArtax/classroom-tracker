<template>
  <div class="database-maintenance" style="display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Quick Sync (Local Folder) -->
    <div class="setup__card" id="sec-sync">
      <h2 class="setup__card-title"><RefreshCcw :size="20" /> Local Folder Sync</h2>
      <p class="setup__hint">
        Automate backups by linking a local folder (e.g., your OneDrive or Google Drive folder). 
        The app saves rolling timestamped snapshots (<code>auto_*.json</code>) after changes and daily archive files (<code>daily_*.json</code>).
      </p>
      
      <div class="setup__sync-status" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <span v-if="isSyncLinked && !isLegacyFileSync" class="setup__badge setup__badge--new" style="display: flex; align-items: center; gap: 4px;">
          <FolderCheck :size="14" /> Folder Linked
        </span>
        <span v-else-if="isSyncLinked && isLegacyFileSync" class="setup__badge" style="background: rgba(251, 191, 36, 0.15); color: #f59e0b; display: flex; align-items: center; gap: 4px;">
          <AlertTriangle :size="14" /> Legacy File Sync — Upgrade to Folder
        </span>
        <span v-else class="setup__badge" style="background: rgba(255,255,255,0.06); color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
          <X :size="14" /> No Folder Linked
        </span>
      </div>

      <div class="setup__grid-actions" style="margin-top: 0; display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="setup__btn-primary" @click="linkBackupDirectory">
          {{ isSyncLinked && !isLegacyFileSync ? 'Change Sync Folder' : 'Setup Sync Folder' }}
        </button>
        <button 
          class="setup__btn-ghost" 
          :disabled="!isSyncLinked" 
          @click="onQuickSyncNow"
        >
          Sync Now
        </button>
        <button 
          v-if="isSyncLinked && !isLegacyFileSync"
          class="setup__btn-ghost" 
          :disabled="isLoadingBackups" 
          @click="loadDirectoryBackups"
          title="Scan folder for latest revisions"
        >
          <RotateCcw :size="14" /> {{ isLoadingBackups ? 'Scanning...' : 'Refresh List' }}
        </button>
      </div>
      <p v-if="syncMsg" class="setup__result-ok" style="margin-top: 8px;">{{ syncMsg }}</p>

      <!-- Linked Directory Snapshots List -->
      <div v-if="isSyncLinked && !isLegacyFileSync" style="margin-top: 16px; border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); padding-top: 16px;">
        <h3 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
          <Folder :size="16" /> Directory Snapshots (Revision History)
        </h3>
        
        <div v-if="isLoadingBackups" style="padding: 12px; font-size: 0.88rem; color: var(--text-secondary);">
          Scanning folder for snapshots...
        </div>
        
        <div v-else-if="directoryBackups.length === 0" style="padding: 14px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1)); border-radius: 8px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          No snapshots found in this folder yet. Click <strong>Sync Now</strong> or edit classroom data to create your first snapshot.
        </div>
        
        <div v-else style="display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 4px;">
          <div 
            v-for="backup in directoryBackups" 
            :key="backup.name"
            style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); border-radius: 6px; flex-wrap: wrap; gap: 8px;"
          >
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span 
                  class="setup__badge" 
                  :style="backup.type === 'daily' 
                    ? 'background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.72rem; padding: 2px 6px;' 
                    : (backup.type === 'auto' 
                      ? 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; font-size: 0.72rem; padding: 2px 6px;'
                      : 'background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); font-size: 0.72rem; padding: 2px 6px;')"
                >
                  {{ backup.type === 'daily' ? 'Daily Archive' : (backup.type === 'auto' ? 'Auto Snapshot' : 'Legacy Live') }}
                </span>
                <span style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">
                  {{ new Date(backup.lastModified).toLocaleString() }}
                </span>
              </div>
              <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 2px; font-family: monospace;">
                {{ backup.name }} • {{ formatFileSize(backup.size) }}
              </div>
            </div>
            <div>
              <button 
                class="setup__pill-btn" 
                @click="onRestoreDirectoryBackup(backup.name)"
                style="background: var(--surface-secondary, rgba(255,255,255,0.08)); color: var(--text-primary); border: 1px solid var(--border);"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Emergency Safety Snapshots -->
    <div class="setup__card" id="sec-snapshots">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
        <h2 class="setup__card-title" style="margin-bottom: 0;"><History :size="20" /> Emergency Safety Snapshots</h2>
        <button class="setup__pill-btn" @click="onTakeSafetySnapshot" style="display: flex; align-items: center; gap: 4px;">
          <Save :size="14" /> Create Snapshot Now
        </button>
      </div>
      <p class="setup__hint">
        Classroom Tracker automatically saves recovery snapshots to your local browser storage before any class deletion, database reset, or file restore.
      </p>

      <div v-if="snapshotMsg" class="setup__msg" :class="{ 'setup__error': snapshotMsg.startsWith('❌') }" style="margin-bottom: 12px; font-weight: 600;">
        {{ snapshotMsg }}
      </div>

      <div v-if="safetySnapshots.length === 0" style="padding: 16px; background: rgba(255,255,255,0.03); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1)); border-radius: 8px; text-align: center; color: var(--text-secondary); font-size: 0.88rem;">
        No emergency snapshots yet. Snapshots are created automatically before major deletions or resets.
      </div>

      <div v-else style="display: flex; flex-direction: column; gap: 10px;">
        <div 
          v-for="snap in safetySnapshots" 
          :key="snap.id" 
          style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 8px; flex-wrap: wrap; gap: 8px;"
        >
          <div>
            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">
              {{ snap.triggerReason }}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
              {{ new Date(snap.timestamp).toLocaleString() }} • {{ snap.classCount }} {{ snap.classCount === 1 ? 'class' : 'classes' }}, {{ snap.eventCount }} events, {{ snap.gradeCount || 0 }} marks
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="setup__pill-btn" @click="onRestoreSafetySnapshot(snap.id)" style="background: var(--accent, #3b82f6); color: #fff;">
              Restore
            </button>
            <button class="setup__btn-text" @click="onDeleteSafetySnapshot(snap.id)" title="Delete Snapshot" style="color: var(--text-secondary); padding: 4px;">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Manual Backup & Restore -->
    <div class="setup__card" id="sec-backup">
      <h2 class="setup__card-title"><DatabaseIcon :size="20" /> Manual Backup & Restore</h2>
      <p class="setup__hint">
        Download a full snapshot of your database (all classes, students, and events) as a JSON file.
      </p>
      <div class="setup__grid-actions" style="margin-top: 0; display: flex; gap: 8px;">
        <button class="setup__btn-primary" @click="doExport">Download JSON Backup</button>
        <button class="setup__btn-ghost" @click="$refs.backupFileInput.click()">Restore from File</button>
      </div>
      <input ref="backupFileInput" type="file" accept=".json" class="setup__file-input" style="display: none;" @change="onBackupFileSelected" />
      
      <div v-if="restoreMsg" class="setup__msg" :class="{ 'setup__error': restoreMsg.startsWith('❌') }" style="margin-top: 1rem; text-align: center; font-weight: 600;">
        {{ restoreMsg }}
      </div>
    </div>

    <!-- 4. Data Health Audit -->
    <div class="setup__card" id="sec-health">
      <h2 class="setup__card-title"><ShieldCheck :size="20" /> Data Health Scanner</h2>
      <p class="setup__hint">
        Scan your internal database for "orphaned" records (e.g. marks from a deleted quiz) or legacy data issues.
      </p>
      
      <div v-if="auditReport" class="setup__audit-results" style="margin-bottom: 16px;">
        <div class="setup__audit-item" :class="{ 'setup__audit-item--warn': auditReport.orphanedGrades.length > 0 }">
          <div class="setup__audit-label">Orphaned Marks:</div>
          <div class="setup__audit-value">{{ auditReport.orphanedGrades.length }}</div>
          <button v-if="auditReport.orphanedGrades.length > 0" class="setup__pill-btn setup__pill-btn--danger" @click="fixOrphans">Delete Orphans</button>
          <button v-if="auditReport.orphanedGrades.length > 0" class="setup__btn-text" @click="toggleAuditDetails('orphans')">
            {{ showAuditDetails.orphans ? 'Hide' : 'Details' }}
          </button>
        </div>
        <ul v-if="showAuditDetails.orphans && auditReport.orphanedGrades.length > 0" class="setup__audit-detail-list">
          <li v-for="item in auditReport.orphanedGrades" :key="item.id">{{ item.context }}</li>
        </ul>
        
        <div class="setup__audit-item" :class="{ 'setup__audit-item--warn': auditReport.missingClassIds.length > 0 }">
          <div class="setup__audit-label">Incomplete Records:</div>
          <div class="setup__audit-value">{{ auditReport.missingClassIds.length }}</div>
          <button v-if="auditReport.missingClassIds.length > 0" class="setup__pill-btn" @click="fixMissingIds">Heal Records</button>
          <button v-if="auditReport.missingClassIds.length > 0" class="setup__btn-text" @click="toggleAuditDetails('incomplete')">
            {{ showAuditDetails.incomplete ? 'Hide' : 'Details' }}
          </button>
        </div>
        <ul v-if="showAuditDetails.incomplete && auditReport.missingClassIds.length > 0" class="setup__audit-detail-list">
          <li v-for="item in auditReport.missingClassIds" :key="item.id">{{ item.context }}</li>
        </ul>

        <div class="setup__audit-item" :class="{ 'setup__audit-item--warn': auditReport.invalidCategories.length > 0 }">
          <div class="setup__audit-label">Category Mismatches:</div>
          <div class="setup__audit-value">{{ auditReport.invalidCategories.length }}</div>
          <button v-if="auditReport.invalidCategories.length > 0" class="setup__pill-btn" @click="fixInvalidCategories">Repair Categories</button>
          <button v-if="auditReport.invalidCategories.length > 0" class="setup__btn-text" @click="toggleAuditDetails('categories')">
            {{ showAuditDetails.categories ? 'Hide' : 'Details' }}
          </button>
        </div>
        <ul v-if="showAuditDetails.categories && auditReport.invalidCategories.length > 0" class="setup__audit-detail-list">
          <li v-for="item in auditReport.invalidCategories" :key="item.id">{{ item.context }}</li>
        </ul>

        <!-- Unlinked SBAR Tasks -->
        <div class="setup__audit-item" :class="{ 'setup__audit-item--warn': auditReport.unlinkedSBARAssessments?.length > 0 }">
          <div class="setup__audit-label">Unlinked SBAR Tasks:</div>
          <div class="setup__audit-value">{{ auditReport.unlinkedSBARAssessments?.length || 0 }}</div>
          <button v-if="auditReport.unlinkedSBARAssessments?.length > 0" class="setup__pill-btn" @click="fixUnlinkedSBARAssessments">Delete Unlinked</button>
          <button v-if="auditReport.unlinkedSBARAssessments?.length > 0" class="setup__btn-text" @click="toggleAuditDetails('unlinked')">
            {{ showAuditDetails.unlinked ? 'Hide' : 'Details' }}
          </button>
        </div>
        <ul v-if="showAuditDetails.unlinked && auditReport.unlinkedSBARAssessments?.length > 0" class="setup__audit-detail-list">
          <li v-for="item in auditReport.unlinkedSBARAssessments" :key="item.id">{{ item.context }}</li>
        </ul>

        <!-- Settings Integrity -->
        <div v-if="auditReport.settingsIssues && auditReport.settingsIssues.length > 0" class="setup__audit-item setup__audit-item--ok">
          <div class="setup__audit-label">System Settings Healed:</div>
          <div class="setup__audit-value">{{ auditReport.settingsFixed }}</div>
          <button class="setup__btn-text" @click="showAuditDetails.settings = !showAuditDetails.settings">
            {{ showAuditDetails.settings ? 'Hide' : 'Details' }}
          </button>
        </div>
        <ul v-if="showAuditDetails.settings && auditReport.settingsIssues.length > 0" class="setup__audit-detail-list">
          <li v-for="issue in auditReport.settingsIssues" :key="issue">✅ {{ issue }}</li>
        </ul>

        <div v-if="auditReport.orphanedGrades.length === 0 && auditReport.missingClassIds.length === 0 && auditReport.invalidCategories.length === 0 && (!auditReport.unlinkedSBARAssessments || auditReport.unlinkedSBARAssessments.length === 0)" class="setup__result-ok">
          ✨ Database is clean and perfectly consistent.
        </div>
      </div>

      <button class="setup__btn-ghost setup__btn--full" :disabled="isAuditing" @click="runDataAudit">
        <Search :size="16" /> {{ isAuditing ? 'Scanning...' : 'Scan Database for Integrity Issues' }}
      </button>
      <p v-if="auditMsg" class="setup__result-ok" style="margin-top: 8px;">{{ auditMsg }}</p>
    </div>

    <!-- 5. Maintenance / Danger Zone -->
    <div class="setup__card setup__card--danger" id="sec-danger">
      <h2 class="setup__card-title"><AlertTriangle :size="20" /> Danger Zone</h2>
      <p class="setup__hint">Actions that can permanently delete data.</p>
      <button class="setup__btn-danger" @click="onClearAllData">
        Clear All Application Data
      </button>
    </div>

    <!-- ── Restore Confirmation Modal ─── -->
    <div v-if="importPreview" class="setup__dialog" role="dialog" aria-modal="true">
      <div class="setup__dialog-box" style="max-width: 400px;">
        <h3 class="setup__dialog-title">Confirm Restore</h3>
        <div class="setup__dialog-body">
          <p>This will <strong>permanently overwrite</strong> all current data with the backup from <em>{{ new Date(importPreview.exportedAt).toLocaleDateString() }}</em>.</p>
          <ul class="setup__list" style="margin-top: 1rem; padding-left: 20px;">
            <li>{{ importPreview.classes.length }} Classes</li>
            <li>{{ importPreview.events.length }} Events</li>
            <li>Schema Version: {{ importPreview.schemaVersion }}</li>
          </ul>
          <p style="margin-top: 1rem; color: var(--state-out); font-weight: 600;">This action cannot be undone.</p>
        </div>
        <div class="setup__dialog-actions">
          <button class="setup__btn-danger" @click="doImport">Confirm & Restore</button>
          <button class="setup__btn-ghost" @click="importPreview = null">Cancel</button>
        </div>
      </div>
      <div class="setup__dialog-backdrop" @click="importPreview = null" />
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'
import * as classService from '../../db/classService.js'
import * as eventService from '../../db/eventService.js'
import * as settingsService from '../../db/settingsService.js'
import * as gradebookService from '../../db/gradebookService.js'
import { formatLocalDate } from '../../utils/dates.js'

import { 
  RefreshCcw, 
  Cloud, 
  X, 
  DatabaseIcon, 
  ShieldCheck, 
  AlertTriangle, 
  Search,
  History,
  Save,
  Trash2,
  Folder,
  FolderCheck,
  RotateCcw
} from 'lucide-vue-next'

const { activeClass, teacherName, init } = useClassroom()
const { confirm, alert } = useMessage()

const backupMsg = ref('')
const restoreMsg = ref('')
const syncMsg = ref('')
const snapshotMsg = ref('')
const importPreview = ref(null)
const isSyncLinked = ref(false)
const isLegacyFileSync = ref(false)
const directoryBackups = ref([])
const isLoadingBackups = ref(false)
const safetySnapshots = ref([])

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function loadSafetySnapshots() {
  safetySnapshots.value = eventService.getSafetySnapshots()
}

async function loadDirectoryBackups() {
  if (!isSyncLinked.value || isLegacyFileSync.value) return
  isLoadingBackups.value = true
  try {
    directoryBackups.value = await eventService.listDirectoryBackups()
  } catch (e) {
    console.warn('Could not load directory backups:', e)
  } finally {
    isLoadingBackups.value = false
  }
}

onMounted(async () => {
  const settings = await settingsService.getSettings()
  isSyncLinked.value = !!(settings.backupDirHandle || settings.backupFileHandle)
  isLegacyFileSync.value = !settings.backupDirHandle && !!settings.backupFileHandle
  loadSafetySnapshots()
  if (settings.backupDirHandle) {
    await loadDirectoryBackups()
  }
})

async function onTakeSafetySnapshot() {
  snapshotMsg.value = ''
  try {
    const snap = await eventService.createSafetySnapshot('Manual Snapshot by Teacher')
    if (snap) {
      loadSafetySnapshots()
      snapshotMsg.value = '✅ Safety snapshot created successfully!'
      setTimeout(() => { if (snapshotMsg.value.startsWith('✅')) snapshotMsg.value = '' }, 3000)
    }
  } catch (err) {
    snapshotMsg.value = `❌ Failed to create snapshot: ${err.message}`
  }
}

async function onRestoreSafetySnapshot(snapshotId) {
  snapshotMsg.value = ''
  const snap = safetySnapshots.value.find(s => s.id === snapshotId)
  if (!snap) return

  if (!await confirm(
    `Restore data to this snapshot from ${new Date(snap.timestamp).toLocaleString()} (${snap.triggerReason})? Current unsynced data will be replaced.`,
    'Restore Safety Snapshot',
    { danger: true }
  )) return

  try {
    const result = await eventService.restoreSafetySnapshot(snapshotId)
    await settingsService.auditSettingsIntegrity()
    await init()
    loadSafetySnapshots()
    await loadDirectoryBackups()
    snapshotMsg.value = `✅ Successfully restored snapshot — ${result.classCount} classes, ${result.eventCount} events!`
    setTimeout(() => { if (snapshotMsg.value.startsWith('✅')) snapshotMsg.value = '' }, 4000)
  } catch (err) {
    snapshotMsg.value = `❌ Failed to restore snapshot: ${err.message}`
  }
}

function onDeleteSafetySnapshot(snapshotId) {
  eventService.deleteSafetySnapshot(snapshotId)
  loadSafetySnapshots()
}

async function linkBackupDirectory() {
  if (!window.showDirectoryPicker) {
    syncMsg.value = '❌ Local Folder Sync is not supported on this device/browser.'
    return
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    const settings = await settingsService.getSettings()
    await settingsService.saveSettings({ ...settings, backupDirHandle: handle, backupFileHandle: null })
    isSyncLinked.value = true
    isLegacyFileSync.value = false
    syncMsg.value = '✅ Folder linked successfully! You are now using rolling folder backups.'
    window.dispatchEvent(new Event('backup-linked'))
    await loadDirectoryBackups()
  } catch (err) {
    if (err.name !== 'AbortError') syncMsg.value = `❌ Failed to link folder: ${err.message}`
  }
}

async function onQuickSyncNow() {
  syncMsg.value = 'Syncing...'
  const success = await eventService.quickSyncBackup()
  if (success) {
    syncMsg.value = `✅ Synced to linked folder at ${new Date().toLocaleTimeString()}`
    await loadDirectoryBackups()
    setTimeout(() => { if (syncMsg.value.startsWith('✅')) syncMsg.value = '' }, 3000)
  } else {
    syncMsg.value = '❌ Sync failed. Permissions may have been denied or folder moved.'
  }
}

async function onRestoreDirectoryBackup(fileName) {
  restoreMsg.value = ''
  try {
    const preview = await eventService.previewDirectoryBackup(fileName)
    if (!preview || typeof preview.schemaVersion !== 'number' || !preview.classes || !preview.events) {
      throw new Error('Invalid backup file format.')
    }
    importPreview.value = preview
  } catch (err) {
    restoreMsg.value = `❌ Failed to read backup: ${err.message}`
  }
}

async function doExport() {
  backupMsg.value = ''
  try {
    const data = await eventService.exportAllData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `class-tracker-backup-${formatLocalDate(new Date())}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    backupMsg.value = '✅ Backup file downloaded.'
    setTimeout(() => backupMsg.value = '', 3000)
  } catch (err) {
    backupMsg.value = '❌ Export failed: ' + err.message
  }
}

function onBackupFileSelected(evt) {
  const file = evt.dataTransfer?.files?.[0] || evt.target?.files?.[0]
  if (!file) return
  restoreMsg.value = ''
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result)
      if (typeof data.schemaVersion !== 'number' || !data.classes || !data.events) {
        throw new Error('Invalid backup file format.')
      }
      importPreview.value = data
    } catch (err) {
      restoreMsg.value = '❌ Invalid backup file: ' + err.message
    }
  }
  reader.onerror = () => { restoreMsg.value = '❌ Failed to read file.' }
  reader.readAsText(file)
  if (evt.target && evt.target.value !== undefined) {
    evt.target.value = ''
  }
}

async function doImport() {
  if (!importPreview.value) return
  restoreMsg.value = ''
  try {
    const result = await eventService.importAllData(JSON.parse(JSON.stringify(importPreview.value)))
    await settingsService.auditSettingsIntegrity()
    await init()
    loadSafetySnapshots()
    await loadDirectoryBackups()
    
    importPreview.value = null
    restoreMsg.value = `✅ Restore complete — ${result.classCount} classes, ${result.eventCount} events. Data restored and loaded!`
  } catch (err) {
    importPreview.value = null
    restoreMsg.value = `❌ Restore failed: ${err.message}`
  }
}

// --- Data Health Scanner / Integrity check ---
const isAuditing = ref(false)
const auditReport = ref(null)
const auditMsg = ref('')
const showAuditDetails = reactive({
  orphans: false,
  incomplete: false,
  categories: false,
  settings: false,
  unlinked: false
})

function toggleAuditDetails(key) {
  showAuditDetails[key] = !showAuditDetails[key]
}

async function runDataAudit() {
  isAuditing.value = true
  auditReport.value = null
  try {
    const report = await gradebookService.auditGradebookData()
    const settingsAudit = await settingsService.auditSettingsIntegrity()
    
    report.settingsIssues = settingsAudit.issues
    report.settingsFixed = settingsAudit.fixedCount
    
    auditReport.value = report
  } catch (err) {
    auditMsg.value = `Audit failed: ${err.message}`
  } finally {
    isAuditing.value = false
  }
}

async function fixOrphans() {
  if (!auditReport.value?.orphanedGrades.length) return
  if (!await confirm(`Permanently delete ${auditReport.value.orphanedGrades.length} orphaned mark records?`)) return
  
  const ids = auditReport.value.orphanedGrades.map(g => g.id)
  await gradebookService.repairGradebookOrphans(ids)
  auditMsg.value = 'Orphans cleared!'
  await runDataAudit()
  setTimeout(() => auditMsg.value = '', 3000)
}

async function fixMissingIds() {
  await gradebookService.repairMissingClassIds()
  auditMsg.value = 'Data healing complete!'
  await runDataAudit()
  setTimeout(() => auditMsg.value = '', 3000)
}

async function fixInvalidCategories() {
  if (!auditReport.value?.invalidCategories.length) return
  if (!await confirm(`Repair ${auditReport.value.invalidCategories.length} assessment category mismatches? assessments will be re-assigned to the first valid category in their class.`)) return
  
  const ids = auditReport.value.invalidCategories.map(a => a.id)
  await gradebookService.repairInvalidCategories(ids)
  auditMsg.value = 'Categories repaired!'
  await runDataAudit()
  setTimeout(() => auditMsg.value = '', 3000)
}

async function fixUnlinkedSBARAssessments() {
  if (!auditReport.value?.unlinkedSBARAssessments?.length) return
  if (!await confirm(`Permanently delete ${auditReport.value.unlinkedSBARAssessments.length} unlinked SBAR assessments with no curriculum expectations?`)) return
  
  const ids = auditReport.value.unlinkedSBARAssessments.map(a => a.id)
  await gradebookService.deleteAssessments(ids)
  auditMsg.value = 'Unlinked assessments deleted!'
  await runDataAudit()
  setTimeout(() => auditMsg.value = '', 3000)
}

async function onClearAllData() {
  if (!await confirm(
    'This will permanently delete ALL classes, students, and events from this device. THIS ACTION IS IRREVERSIBLE.',
    'Clear All Application Data',
    { danger: true, requireText: 'ERASE' }
  )) return

  try {
    await classService.clearAllData()
    window.location.reload()
  } catch (err) {
    await alert('Failed to clear data: ' + err.message)
  }
}
</script>
