<template>
  <div class="behavior-settings">
    <!-- Behavior Thresholds Strategy Card -->
    <div class="setup__card" id="sec-app-behavior">
      <h2 class="setup__card-title">Behavior Strategy Warnings</h2>
      <p class="setup__hint">
        Define weekly limits for student washroom trips and mobile devices. 
        Exceeding these limits will trigger warning flags in room grids and student dossier logs.
      </p>
      <div class="setup__form-grid behavior-thresholds__grid">
        <label class="setup__label">
          <span class="setup__label-text">Washroom Limit</span>
          <span class="setup__label-subtext">Trips / Week</span>
          <input 
            v-model.number="editThresholds.washroomTripsPerWeek" 
            type="number" 
            min="1"
            max="20"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
        <label class="setup__label">
          <span class="setup__label-text">Device Limit</span>
          <span class="setup__label-subtext">Incidents / Week</span>
          <input 
            v-model.number="editThresholds.deviceIncidentsPerWeek" 
            type="number" 
            min="1"
            max="20"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
        <label class="setup__label">
          <span class="setup__label-text">Academic Warning</span>
          <span class="setup__label-subtext">At-Risk Mark (%)</span>
          <input 
            v-model.number="editThresholds.atRiskThreshold" 
            type="number" 
            min="30"
            max="95"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
        <label class="setup__label">
          <span class="setup__label-text">Attendance Warning</span>
          <span class="setup__label-subtext">At-Risk Rate (%)</span>
          <input 
            v-model.number="editThresholds.attendanceThreshold" 
            type="number" 
            min="50"
            max="98"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
      </div>
      <div v-if="thresholdsSuccess" class="setup__success-banner">
        {{ thresholdsSuccess }}
      </div>
    </div>

    <!-- Behavior Codes Editor Card -->
    <div class="setup__card">
      <h2 class="setup__card-title">Behavior Codes & Radial Actions</h2>
      <p class="setup__hint">
        Manage standard behavior actions shown in the Student radial overlay menu.
        Pins let you specify up to 6 quick-actions that appear directly on the main overlay.
      </p>

      <ul class="setup__code-list">
        <li v-for="code in behaviorCodes" :key="code.codeKey" class="setup__code-item">
          <div class="setup__code-info">
            <span class="setup__code-icon-badge">
              <component :is="resolveIcon(code.icon)" :size="16" />
            </span>
            <div class="setup__code-details">
              <div class="setup__code-title-row">
                <strong>{{ code.label }}</strong> 
                <span class="setup__code-key">({{ code.codeKey }})</span>
              </div>
              <div class="setup__code-tags">
                <span class="setup__tag-badge setup__tag-badge--cat">{{ code.category }}</span>
                <span v-if="code.isTopLevel" class="setup__tag-badge setup__tag-badge--pin">📌 Pinned</span>
                <span v-if="code.requiresNote" class="setup__tag-badge setup__tag-badge--note"><NotebookPen :size="11" /> Notes Req.</span>
              </div>
            </div>
          </div>
          <div class="setup__code-actions">
            <button class="setup__icon-btn" @click="editCode(code)" title="Edit behavior code">
              <Pencil :size="14" />
            </button>
            <button 
              class="setup__icon-btn setup__icon-btn--danger" 
              :disabled="isSystemCode(code.codeKey)" 
              @click="deleteCode(code.codeKey)" 
              title="Delete behavior code"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </li>
      </ul>

      <button class="setup__btn-ghost setup__btn--full" @click="openAddModal">
        <Plus :size="14" /> Add Behavior Code
      </button>
    </div>

    <!-- ── Behavior Code Form Modal ─── -->
    <BaseModal
      :show="isModalOpen"
      @close="closeModal"
      max-width="500px"
      :title="isEditing ? 'Edit Behavior Code' : 'Add Behavior Code'"
    >
      <form class="setup__form" @submit.prevent="saveCode">
        <div v-if="modalError" class="setup__inline-banner setup__inline-banner--warning" style="margin-bottom: 12px;">
          <AlertTriangle :size="16" />
          <span>{{ modalError }}</span>
        </div>
        <div class="setup__form-grid">
          <label class="setup__label">
            Code (Unique Key)
            <input 
              v-model="formCode.codeKey" 
              class="setup__input" 
              placeholder="e.g. PART"
              maxlength="4"
              :disabled="isEditing"
              required 
            />
            <span class="setup__hint">Max 4 characters. Uppercase recommended.</span>
          </label>
          
          <label class="setup__label">
            Label Name
            <input 
              v-model="formCode.label" 
              class="setup__input" 
              placeholder="e.g. Participation" 
              required 
            />
          </label>
        </div>

        <div class="setup__form-grid" style="margin-top: 12px;">
          <label class="setup__label">
            Category
            <select v-model="formCode.category" class="setup__input" required>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="redirect">Redirect / Warning</option>
              <option value="communication">Communication</option>
              <option value="academic">Academic</option>
            </select>
          </label>

          <label class="setup__label">
            Event Type
            <select v-model="formCode.type" class="setup__input" required>
              <option value="standard">Standard Record</option>
              <option value="attendance" :disabled="isEditing && formCode.type === 'standard'">Attendance Flag</option>
            </select>
          </label>
        </div>

        <!-- Toggle Flags -->
        <div class="setup__switches-group">
          <div class="setup__switch-container">
            <label class="setup__switch">
              <input type="checkbox" v-model="formCode.isTopLevel" />
              <span class="setup__switch-slider"></span>
            </label>
            <span class="setup__switch-label">Pin to Radial Menu (Max 6 total)</span>
          </div>

          <div class="setup__switch-container">
            <label class="setup__switch">
              <input type="checkbox" v-model="formCode.requiresNote" />
              <span class="setup__switch-slider"></span>
            </label>
            <span class="setup__switch-label">Require Teacher Notes when logging</span>
          </div>
        </div>

        <!-- Icon Picker Grid -->
        <div class="setup__label" style="margin-top: 16px;">
          <span style="display: block; margin-bottom: 8px;">Select Icon</span>
          <div class="setup__icon-picker-grid">
            <button 
              v-for="iconName in availableIcons" 
              :key="iconName" 
              type="button"
              class="setup__icon-picker-btn"
              :class="{ 'setup__icon-picker-btn--active': formCode.icon === iconName }"
              @click="formCode.icon = iconName"
            >
              <component :is="resolveIcon(iconName)" :size="20" />
            </button>
          </div>
        </div>

        <div class="modal-footer" style="margin-top: 24px;">
          <button type="button" class="setup__btn-ghost" @click="closeModal">Cancel</button>
          <button type="submit" class="setup__btn-primary">
            {{ isEditing ? 'Save Changes' : 'Add Code' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'
import { resolveIcon } from '../../utils/icons.js'
import * as settingsService from '../../db/settingsService.js'
import BaseModal from '../BaseModal.vue'
import { Pencil, Trash2, Plus, AlertTriangle, NotebookPen } from 'lucide-vue-next'

const { thresholds: classroomThresholds, behaviorCodes, reloadBehaviorCodes } = useClassroom()
const { alert, confirm } = useMessage()

// Thresholds Form State
const editThresholds = reactive({ washroomTripsPerWeek: 4, deviceIncidentsPerWeek: 3, atRiskThreshold: 70, attendanceThreshold: 85 })
const thresholdsSuccess = ref('')

// Modal / Edit Form State
const isModalOpen = ref(false)
const isEditing = ref(false)
const formCode = reactive({ 
  codeKey: '', 
  icon: 'Activity', 
  label: '', 
  category: 'neutral', 
  type: 'standard', 
  requiresNote: false, 
  isTopLevel: false 
})

const availableIcons = [
  'Smartphone', 'Toilet', 'Hand', 'Eye', 'MessageSquare', 'Phone', 
  'NotebookPen', 'GraduationCap', 'Smile', 'AlertTriangle', 'XCircle', 
  'BookOpen', 'Shield', 'Zap', 'Award', 'Activity', 'Flame', 'HelpCircle'
]

onMounted(async () => {
  const current = await settingsService.getThresholds()
  if (current) {
    editThresholds.washroomTripsPerWeek = current.washroomTripsPerWeek
    editThresholds.deviceIncidentsPerWeek = current.deviceIncidentsPerWeek
    editThresholds.atRiskThreshold = current.atRiskThreshold ?? 70
    editThresholds.attendanceThreshold = current.attendanceThreshold ?? 85
  }
})

// Check if a code is a built-in attendance/system key that should not be deleted
function isSystemCode(codeKey) {
  return ['a', 'l', 'note', 'ac', 'pc'].includes(codeKey.toLowerCase())
}

async function saveThresholds() {
  await settingsService.saveThresholds({
    washroomTripsPerWeek: editThresholds.washroomTripsPerWeek,
    deviceIncidentsPerWeek: editThresholds.deviceIncidentsPerWeek,
    atRiskThreshold: editThresholds.atRiskThreshold,
    attendanceThreshold: editThresholds.attendanceThreshold
  })
  
  // Sync composable states
  classroomThresholds.value.washroomTripsPerWeek = editThresholds.washroomTripsPerWeek
  classroomThresholds.value.deviceIncidentsPerWeek = editThresholds.deviceIncidentsPerWeek
  classroomThresholds.value.atRiskThreshold = editThresholds.atRiskThreshold
  classroomThresholds.value.attendanceThreshold = editThresholds.attendanceThreshold
  
  thresholdsSuccess.value = 'Saved!'
  setTimeout(() => { thresholdsSuccess.value = '' }, 1500)
}

function openAddModal() {
  isEditing.value = false
  Object.assign(formCode, { 
    codeKey: '', 
    icon: 'Activity', 
    label: '', 
    category: 'neutral', 
    type: 'standard', 
    requiresNote: false, 
    isTopLevel: false 
  })
  isModalOpen.value = true
}

function editCode(code) {
  isEditing.value = true
  Object.assign(formCode, { 
    codeKey: code.codeKey, 
    icon: code.icon, 
    label: code.label, 
    category: code.category, 
    type: code.type, 
    requiresNote: !!code.requiresNote,
    isTopLevel: !!code.isTopLevel 
  })
  modalError.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  modalError.value = ''
}

async function saveCode() {
  modalError.value = ''
  const codeKeyFormatted = formCode.codeKey.trim().toUpperCase()
  if (!codeKeyFormatted) return

  if (formCode.isTopLevel) {
    const pinnedCount = behaviorCodes.value.filter(
      c => c.codeKey.toUpperCase() !== codeKeyFormatted && c.isTopLevel
    ).length
    if (pinnedCount >= 6) {
      modalError.value = 'The radial menu is full (Max 6 pinned items). Please unpin an existing action first.'
      return
    }
  }

  const payload = {
    ...formCode,
    codeKey: codeKeyFormatted,
    label: formCode.label.trim()
  }

  await settingsService.saveBehaviorCode(payload)
  await reloadBehaviorCodes()
  isModalOpen.value = false
}

async function deleteCode(codeKey) {
  behaviorWarning.value = ''
  const codeToDelete = behaviorCodes.value.find(c => c.codeKey === codeKey)
  const name = codeToDelete?.label ?? codeKey
  
  if (isSystemCode(codeKey)) {
    behaviorWarning.value = `"${name}" is a core system code and cannot be deleted.`
    setTimeout(() => { behaviorWarning.value = '' }, 5000)
    return
  }

  const msg = `Delete behavior code "${name}"? This will not affect past logged events, but will remove it from the radial overlays.`
  if (!await confirm(msg)) return

  await settingsService.deleteBehaviorCode(codeKey)
  await reloadBehaviorCodes()
}
</script>

<script>
export default {
  name: 'BehaviorSettings'
}
</script>

<style scoped>
.setup__success-banner {
  background: rgba(34, 197, 94, 0.12);
  color: var(--state-success, #4ade80);
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}

.setup__card {
  background:    var(--surface, #1e2030);
  padding:       24px;
  border-radius: var(--radius-lg, 12px);
  box-shadow:    var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.15));
  border:        1px solid var(--border, rgba(255, 255, 255, 0.08));
  display:       flex;
  flex-direction: column;
  gap:           16px;
  margin-bottom: 24px;
}

.setup__card-title {
  font-size:     1.1rem;
  font-weight:   700;
  color:         var(--text, #ffffff);
  margin:        0 0 4px;
  display:       flex;
  align-items:   center;
  gap:           10px;
}

.setup__card-subtitle {
  font-size:     0.85rem;
  font-weight:   700;
  color:         var(--text-secondary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin:        8px 0 4px;
}

.setup__hint {
  font-size: 0.82rem;
  color:     var(--text-secondary, #94a3b8);
  line-height: 1.5;
  margin: 0;
}

.setup__form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.behavior-thresholds__grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1024px) {
  .behavior-thresholds__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .behavior-thresholds__grid {
    grid-template-columns: 1fr;
  }
}

.setup__label-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text, #ffffff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setup__label-subtext {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary, #94a3b8);
  margin-top: -3px;
  margin-bottom: 2px;
  white-space: nowrap;
}

.setup__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text, #ffffff);
  min-width: 0;
}

.setup__input {
  width:           100%;
  min-height:      44px;
  padding:         10px 14px;
  border:          1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius:   var(--radius-md, 8px);
  background:      var(--bg-input, rgba(255, 255, 255, 0.04));
  color:           var(--text, #ffffff);
  font-size:       0.9rem;
  font-weight:     600;
  transition:      border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing:      border-box;
}

.setup__input:focus {
  outline:      none;
  border-color: var(--primary, #6366f1);
}

.setup__btn-primary {
  min-height:      44px;
  padding:         0 20px;
  border:          none;
  border-radius:   var(--radius-md, 8px);
  background:      var(--primary, #6366f1);
  color:           #ffffff;
  font-size:       0.9rem;
  font-weight:     600;
  cursor:          pointer;
  transition:      opacity 0.15s ease;
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  gap:             8px;
}

.setup__btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.setup__btn-ghost {
  min-height:      44px;
  padding:         0 20px;
  border:          1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius:   var(--radius-md, 8px);
  background:      transparent;
  color:           var(--text, #ffffff);
  font-size:       0.9rem;
  font-weight:     600;
  cursor:          pointer;
  transition:      background 0.15s ease;
  display:         inline-flex;
  align-items:     center;
  justify-content: center;
  gap:             8px;
}

.setup__btn-ghost:hover {
  background: rgba(255, 255, 255, 0.04);
}

.setup__btn--full {
  width: 100%;
}

.setup__pill-btn {
  padding:       6px 12px;
  border-radius: 100px;
  border:        1px solid var(--border, rgba(255, 255, 255, 0.08));
  background:    transparent;
  color:         var(--text-secondary, #94a3b8);
  font-size:     0.78rem;
  font-weight:   600;
  cursor:        pointer;
  transition:    all 0.15s ease;
}

.setup__pill-btn:hover {
  border-color: var(--primary, #6366f1);
  color:        var(--primary, #6366f1);
}

.setup__icon-btn {
  background: transparent;
  border:     none;
  color:      var(--text-secondary, #94a3b8);
  cursor:     pointer;
  padding:    6px;
  border-radius: 50%;
  display:    flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.setup__icon-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color:      var(--text, #ffffff);
}

.setup__icon-btn--danger:hover {
  background: #fee2e2 !important;
  color:      #dc2626 !important;
}

/* ── Code lists ── */
.setup__code-list {
  list-style: none;
  display:    flex;
  flex-direction: column;
  gap:        8px;
  padding:    0;
  margin:     0;
}

.setup__code-item {
  display:     flex;
  align-items: center;
  justify-content: space-between;
  gap:         12px;
  padding:     10px 12px;
  background:  var(--bg-secondary, rgba(255, 255, 255, 0.02));
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
}

.setup__code-info {
  display:     flex !important;
  flex-direction: row !important;
  align-items: center;
  gap:         12px;
}

.setup__code-icon-badge {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.setup__code-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setup__code-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup__code-key {
  font-size:   0.8rem;
  font-weight: 700;
  color:       var(--primary, #6366f1);
  font-family: monospace;
}

.setup__code-tags {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.setup__tag-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.setup__tag-badge--cat {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary, #94a3b8);
}

.setup__tag-badge--pin {
  background: rgba(99, 102, 241, 0.12);
  color: var(--primary, #6366f1);
}

.setup__tag-badge--note {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.setup__code-actions {
  display: flex;
  gap: 4px;
}

/* Switches Grid */
.setup__switches-group {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setup__switch-container {
  display: flex;
  align-items: center;
  gap: 12px;
  user-select: none;
}

.setup__switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.setup__switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.setup__switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border, rgba(255, 255, 255, 0.15));
  transition: .2s ease;
  border-radius: 24px;
}

.setup__switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .2s ease;
  border-radius: 50%;
}

.setup__switch input:checked + .setup__switch-slider {
  background-color: var(--primary, #6366f1);
}

.setup__switch input:checked + .setup__switch-slider:before {
  transform: translateX(20px);
}

.setup__switch-label {
  font-weight: 600;
  color: var(--text, #ffffff);
  font-size: 0.88rem;
}

/* ── Icon Picker Grid ── */
.setup__icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  background: var(--bg-input, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 8px);
  padding: 12px;
}

.setup__icon-picker-btn {
  aspect-ratio: 1;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary, #94a3b8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.setup__icon-picker-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text, #ffffff);
}

.setup__icon-picker-btn--active {
  background: rgba(99, 102, 241, 0.12) !important;
  border-color: var(--primary, #6366f1) !important;
  color: var(--primary, #6366f1) !important;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
