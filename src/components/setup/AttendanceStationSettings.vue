<template>
  <!-- Attendance & Door Station Settings -->
  <div class="setup__card" id="sec-attendance-cloud">
    <h2 class="setup__card-title">
      <GraduationCap :size="18" /> Attendance & Door Station Settings
    </h2>
    <p class="setup__hint">Configure how daily student attendance is registered and set up a secondary scanning station at your door.</p>
    
    <div class="setup__settings-grid">
      
      <!-- Left Column: Attendance Mode -->
      <div class="setup__settings-col setup__settings-col--left">
        <h3 class="setup__card-subtitle" style="margin-top: 0; margin-bottom: 4px;">Attendance Tracking Mode</h3>
        <div :key="radioGroupKey" class="setup__attendance-modes" style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
          <label class="setup__label setup__label--radio" style="display: flex; flex-direction: row; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; margin: 0;">
            <input type="radio" name="attendanceMode" :checked="localAttendanceMode === 'natural'" value="natural" @change="onAttendanceModeChange('natural')" style="margin: 0; cursor: pointer;" />
            <span>Natural Mode (Present by default)</span>
          </label>
          <label class="setup__label setup__label--radio" style="display: flex; flex-direction: row; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; margin: 0;">
            <input type="radio" name="attendanceMode" :checked="localAttendanceMode === 'rfid'" value="rfid" @change="onAttendanceModeChange('rfid')" style="margin: 0; cursor: pointer;" />
            <span>RFID/QR Sign-In Mode (All start absent)</span>
          </label>
        </div>
        
        <div v-if="localAttendanceMode === 'rfid'" class="setup__grace-period" style="margin-top: 8px;">
          <label class="setup__label" style="display: flex; flex-direction: column; gap: 6px; margin: 0;">
            Lateness Grace Period: <strong>{{ localGracePeriod }} minutes</strong>
            <input type="range" v-model.number="localGracePeriod" min="0" max="15" step="1" @change="saveAttendanceConfig" style="width: 100%; cursor: pointer; margin: 0;" />
          </label>
        </div>

        <!-- Show/Hide Kiosk Scanner Toggle -->
        <div class="setup__switch-container" style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border);">
          <label class="setup__switch">
            <input type="checkbox" v-model="localShowScannerButton" @change="saveScannerConfig" />
            <span class="setup__switch-slider"></span>
          </label>
          <span class="setup__switch-label">Show Kiosk Scanner on Dashboard</span>
        </div>

        <!-- Manual Override Reset -->
        <div v-if="activeClass" class="setup__attendance-actions" style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Emergency Override</span>
          <button class="setup__btn-ghost" style="height: 36px; padding: 0 16px; font-size: 0.85rem; min-height: unset; width: 100%; margin: 0;" @click="onMarkAllPresent">
            Mark All Present in {{ activeClass.name }}
          </button>
        </div>
      </div>
      
      <!-- Right Column: Dedicated Door Station -->
      <div class="setup__settings-col">
        <h3 class="setup__card-subtitle" style="margin-top: 0; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          Dedicated Door Station (Two-Device Sync)
          <span class="setup__tooltip-container" aria-label="Database Inactivity Warning">
            <Info :size="14" class="setup__info-icon" />
            <span class="setup__tooltip-text">
              <strong>Inactivity Note:</strong> Supabase pauses free databases after 7 days of idle time (like Summer/Winter breaks). If it stops working, simply log into your Supabase Dashboard and click "Restore Project" to wake it up!
            </span>
          </span>
        </h3>
        <p class="setup__hint" style="margin: 0; font-size: 0.8rem; line-height: 1.4;">
          Enable Cloud Mode to run a dedicated scanner at your classroom door (on a Chromebook, tablet, or second computer) for automated check-ins and out-of-class passes.
        </p>
        
        <div class="setup__switch-container" style="margin: 8px 0 0 0;">
          <label class="setup__switch">
            <input type="checkbox" v-model="localCloudMode" @change="saveCloudConfig" />
            <span class="setup__switch-slider"></span>
          </label>
          <span class="setup__switch-label">Enable Cloud Door Station</span>
        </div>
        
        <label class="setup__label" v-if="localCloudMode" style="display: flex; flex-direction: column; gap: 6px; margin: 4px 0 0 0;">
          User Code (Room PIN / Teacher ID)
          <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
            <input type="text" v-model="localUserCode" readonly class="setup__input" style="margin: 0; flex-grow: 1; cursor: default;" />
            <button type="button" class="setup__btn-ghost" @click="regenerateUserCode" style="min-height: 44px; padding: 0 16px; margin: 0; white-space: nowrap; display: flex; align-items: center; gap: 6px;" title="Generate random unique code">
              <RefreshCcw :size="14" /> Generate
            </button>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal; margin-top: 2px; line-height: 1.3;">
            We recommend using a unique auto-generated code (e.g. <strong>B7F-K9X</strong>) to prevent conflicts with other classrooms.
          </span>
        </label>

        <div v-if="localCloudMode" class="setup__link-box">
          <span class="setup__link-title">
            <ExternalLink :size="14" /> Door Scanner URL
          </span>
          <span class="setup__link-text">
            Open this link on your dedicated door machine and enter your User Code:
          </span>
          <div class="setup__link-input-group">
            <input type="text" :value="scanStationUrl" readonly class="setup__input" style="margin: 0; flex-grow: 1; cursor: text; font-family: monospace; font-size: 0.8rem;" @click="$event.target.select()" />
            <button type="button" class="setup__btn-ghost" @click="copyScanStationUrl" style="min-height: 44px; padding: 0 16px; margin: 0; white-space: nowrap; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;" :title="urlCopied ? 'Copied' : 'Copy URL'">
              <Check v-if="urlCopied" :size="14" style="color: var(--state-success);" />
              <Copy v-else :size="14" />
              {{ urlCopied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>

        <div class="setup__switch-container" style="margin: 16px 0 0 0;">
          <label class="setup__switch">
            <input type="checkbox" v-model="autoStartRFID" />
            <span class="setup__switch-slider"></span>
          </label>
          <span class="setup__switch-label">Auto-Start RFID on Load</span>
        </div>
      </div>
      
    </div>
  </div>

  <!-- Attendance Mode Change Confirmation Modal -->
  <div v-if="isAttendanceModeModalOpen" class="setup__dialog" role="dialog" aria-modal="true" aria-labelledby="att-modal-title">
    <div class="setup__dialog-backdrop" @click="cancelAttendanceModeChange" />
    <div class="setup__dialog-box" style="max-width: 420px;">
      <h3 id="att-modal-title" class="setup__dialog-title" style="display: flex; align-items: center; gap: 8px;">
        <AlertTriangle :size="20" style="color: #f59e0b;" />
        Change Attendance Mode?
      </h3>

      <div class="setup__dialog-body" style="display: flex; flex-direction: column; gap: 10px;">
        <p v-if="pendingAttendanceMode === 'rfid'">
          <strong>Switching to RFID/QR Sign-In Mode</strong> requires students to scan their card or QR code when class begins to be marked present. During active class periods, students start absent until they scan in at the door.
        </p>
        <p v-else>
          <strong>Switching to Natural Mode</strong> restores standard presence-by-default tracking without requiring door scans.
        </p>
        <div v-if="pendingAttendanceMode === 'rfid'" style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.83rem; color: var(--text-secondary); border-left: 3px solid var(--primary);">
          <strong style="color: var(--text);">Schedule-Safe:</strong> Past classes and morning prep are protected. Only active class periods within their scheduled time window will initialize check-in.
        </div>
        <div v-else style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.83rem; color: var(--text-secondary); border-left: 3px solid var(--primary);">
          <strong style="color: var(--text);">Preserve Records:</strong> Any attendance records already logged earlier today will remain intact.
        </div>
        <p style="font-size: 0.82rem; color: var(--text-secondary);">Are you sure you want to switch?</p>
      </div>

      <div class="setup__dialog-actions">
        <button class="setup__btn-primary" @click="confirmAttendanceModeChange">Yes, switch mode</button>
        <button class="setup__btn-ghost" @click="cancelAttendanceModeChange">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { AlertTriangle, Check, Copy, ExternalLink, GraduationCap, Info, RefreshCcw } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'

const {
  activeClass,
  attendanceMode,
  latenessGracePeriod,
  showScannerButton,
  updateShowScannerButton,
  updateAttendanceConfig,
  markAllPresentToday,
  cloudModeEnabled,
  userCode,
  updateCloudConfig,
  generateUniqueUserCode,
  autoStartRFID
} = useClassroom()
const { confirm } = useMessage()

// --- Attendance configuration ---
const localAttendanceMode = ref(attendanceMode.value)
const localGracePeriod = ref(latenessGracePeriod.value)
const localShowScannerButton = ref(showScannerButton.value)

watch(attendanceMode, (v) => { localAttendanceMode.value = v }, { immediate: true })
watch(latenessGracePeriod, (v) => { localGracePeriod.value = v }, { immediate: true })
watch(showScannerButton, (v) => { localShowScannerButton.value = v }, { immediate: true })

async function saveScannerConfig() {
  await updateShowScannerButton(localShowScannerButton.value)
}

const isAttendanceModeModalOpen = ref(false)
const pendingAttendanceMode = ref(null)
const radioGroupKey = ref(0)

function onAttendanceModeChange(newMode) {
  if (newMode === localAttendanceMode.value) return
  pendingAttendanceMode.value = newMode
  isAttendanceModeModalOpen.value = true
}

async function confirmAttendanceModeChange() {
  localAttendanceMode.value = pendingAttendanceMode.value
  await updateAttendanceConfig(localAttendanceMode.value, localGracePeriod.value)
  isAttendanceModeModalOpen.value = false
  pendingAttendanceMode.value = null
}

function cancelAttendanceModeChange() {
  isAttendanceModeModalOpen.value = false
  pendingAttendanceMode.value = null
  localAttendanceMode.value = attendanceMode.value
  // Re-render the radio group so the browser's checked state matches the unchanged mode
  radioGroupKey.value++
}

async function saveAttendanceConfig() {
  await updateAttendanceConfig(localAttendanceMode.value, localGracePeriod.value)
}

async function onMarkAllPresent() {
  if (!activeClass.value) return
  const confirmed = await confirm(`Are you sure you want to mark all students present in ${activeClass.value.name} for today? This will clear all absences and late markers logged today.`)
  if (confirmed) {
    await markAllPresentToday(activeClass.value.classId)
  }
}

// --- Cloud door station ---
const localCloudMode = ref(cloudModeEnabled.value)
const localUserCode = ref(userCode.value)
watch(cloudModeEnabled, (v) => { localCloudMode.value = v }, { immediate: true })
watch(userCode, (v) => { localUserCode.value = v }, { immediate: true })

async function saveCloudConfig() {
  if (localCloudMode.value && !localUserCode.value.trim()) {
    localUserCode.value = await generateUniqueUserCode()
  }
  await updateCloudConfig(localCloudMode.value, localUserCode.value.trim().toUpperCase())
}

async function regenerateUserCode() {
  localUserCode.value = await generateUniqueUserCode()
  await saveCloudConfig()
}

const scanStationUrl = computed(() => `${window.location.origin}/scan`)
const urlCopied = ref(false)
async function copyScanStationUrl() {
  try {
    await navigator.clipboard.writeText(scanStationUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}
</script>
