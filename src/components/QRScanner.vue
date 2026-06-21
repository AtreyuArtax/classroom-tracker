<template>
  <div
    id="qr-scanner-mount"
    class="qr-scanner-mount"
    :style="mountStyle"
    @pointermove="onDrag"
    @pointerup="endDrag"
  >
    <div id="qr-scanner-container" class="qr-scanner" :class="{ 'qr-scanner--pip': isPiP, 'qr-scanner--rfid': scannerMode === 'rfid', 'qr-scanner--minimized': isMinimized }">

      <!-- ── Header / Drag Handle ───────────────────────────────────── -->
      <div class="qr-scanner__header" @pointerdown="startDrag">
        <div class="qr-scanner__title">
          <div class="qr-scanner__mode-toggle">
            <button 
              class="qr-scanner__mode-btn" 
              :class="{ 'qr-scanner__mode-btn--active': scannerMode === 'qr' }"
              @click="scannerMode = 'qr'"
              title="Camera Scan"
            >
              <QrCode :size="14" />
              <span>QR</span>
            </button>
            <button 
              class="qr-scanner__mode-btn" 
              :class="{ 'qr-scanner__mode-btn--active': scannerMode === 'rfid' }"
              @click="scannerMode = 'rfid'"
              title="RFID Scan"
            >
              <Rss :size="14" />
              <span>RFID</span>
            </button>
          </div>
        </div>
        <div class="qr-scanner__actions">
          <!-- Minimize: only when camera is running and NOT in PiP -->
          <button
            v-if="(isScanning || scannerMode === 'rfid') && !isPiP"
            class="qr-scanner__icon-btn"
            @click.stop="isMinimized = !isMinimized"
            :title="isMinimized ? 'Expand' : 'Minimize'"
          >
            <ChevronDown :size="15" v-if="!isMinimized" />
            <ChevronUp  :size="15" v-else />
          </button>
          <button
            v-if="pipSupported"
            class="qr-scanner__icon-btn"
            @click.stop="togglePiP"
            :title="isPiP ? 'Return to Page' : 'Pop Out'"
          >
            <ExternalLink :size="15" v-if="!isPiP" />
            <Minimize2   :size="15" v-else />
          </button>
          <button class="qr-scanner__icon-btn" @click.stop="$emit('close')">
            <X :size="16" />
          </button>
        </div>
      </div>

      <!-- ── Status Bar (always visible) ───────────────────────────── -->
      <div
        class="qr-scanner__status-bar"
        :class="{ 'qr-scanner__status-bar--clickable': isMinimized && !isPiP }"
        @pointerdown="isMinimized && !isPiP ? startDrag($event) : undefined"
        @click="isMinimized && !isPiP && !hasDragged ? (isMinimized = false) : undefined"
        :title="minimizedTitle"
      >
        <div class="qr-scanner__count" :class="{ 'qr-scanner__count--full': maxStudentsOut > 0 && globalStudentsOut.length >= maxStudentsOut }">
          <span class="qr-scanner__count-num">{{ globalStudentsOut.length }}</span>
          <span class="qr-scanner__count-sep" v-if="maxStudentsOut > 0 && (!isMinimized || scannerMode === 'qr')"> / {{ maxStudentsOut }}</span>
          <span class="qr-scanner__count-label" v-if="!isMinimized || scannerMode === 'qr'"> OUT</span>
          
          <!-- Micro-Pill indicator -->
          <div v-if="isMinimized && scannerMode === 'rfid'" class="qr-scanner__pill-dot"></div>
        </div>
        <div class="qr-scanner__limits" v-if="!isMinimized || scannerMode === 'qr'">
          <span class="qr-scanner__limit-label">LIMIT</span>
          <div class="qr-scanner__limit-btns">
            <button
              v-for="val in [1, 2, 3, 0]"
              :key="val"
              class="qr-scanner__limit-btn"
              :class="{ 'qr-scanner__limit-btn--active': maxStudentsOut === val }"
              @click.stop="maxStudentsOut = val"
            >
              {{ val === 0 ? '∞' : val }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Body (hidden when minimized) ──────────────────────────── -->
      <div class="qr-scanner__body" v-show="!isMinimized || isPiP">
        
        <!-- Connection warning banner -->
        <div v-if="isConnectionBroken" class="qr-scanner__connection-warning">
          <AlertTriangle :size="16" />
          <span>Connection Lost! Move scanner / use Local Mode.</span>
        </div>

        <!-- Currently Out Students List -->
        <div v-if="globalStudentsOut.length > 0" class="qr-scanner__out-list">
          <div class="qr-scanner__out-title">
            <span>Currently Out</span>
          </div>
          <div class="qr-scanner__out-items">
            <div v-for="student in globalStudentsOut" :key="student.studentId" class="qr-scanner__out-item">
              <div class="qr-scanner__out-info">
                <span class="qr-scanner__out-name">{{ student.firstName }} {{ student.lastName }} <span class="qr-scanner__out-classname" style="font-size: 10px; opacity: 0.6; font-weight: normal;">({{ student.className }})</span></span>
                <span class="qr-scanner__out-time" v-if="student.activeStates?.outTime">
                  out since {{ formatTime(student.activeStates.outTime) }}
                </span>
              </div>
              <button 
                class="qr-scanner__out-signin-btn" 
                @click.stop="manualSignIn(student.studentId, student.classId)"
                title="Sign back in"
              >
                <Check :size="12" />
                <span>Return</span>
              </button>
            </div>
          </div>
        </div>

        <div class="qr-scanner__viewfinder">
          <!-- QR Camera View (Hidden in RFID) -->
          <div v-show="scannerMode === 'qr'" id="qr-reader" class="qr-scanner__reader"></div>

          <!-- RFID Compact Listening View -->
          <div v-if="scannerMode === 'rfid' && !cooldownActive" class="qr-scanner__rfid-status">
            <div
              class="qr-scanner__rfid-listening"
              :class="{
                'qr-scanner__rfid-listening--cloud': cloudModeEnabled,
                'qr-scanner__rfid-listening--companion': localCompanionEnabled && !cloudModeEnabled
              }"
            >
              <div class="qr-scanner__rfid-dot"></div>
              <span>
                {{ cloudModeEnabled ? 'Cloud RFID Listening...' : localCompanionEnabled ? 'Local Companion...' : 'RFID Listening...' }}
              </span>
            </div>
            <!-- Local Companion toggle + status badge -->
            <div v-if="!cloudModeEnabled" class="qr-scanner__companion-row">
              <button
                id="rfid-companion-toggle"
                class="qr-scanner__companion-toggle"
                :class="{ 'qr-scanner__companion-toggle--active': localCompanionEnabled }"
                @click.stop="toggleLocalCompanion"
                :title="localCompanionEnabled ? 'Disable Local Companion (use keyboard wedge)' : 'Enable Local Companion app on this machine'"
              >
                <span class="qr-scanner__companion-dot" :class="'qr-scanner__companion-dot--' + companionStatus"></span>
                {{ localCompanionEnabled ? 'Local' : 'Local OFF' }}
              </button>
            </div>
          </div>

          <!-- QR Idle Overlay -->
          <div v-if="!isScanning && !isPiPStarting && scannerMode === 'qr'" class="qr-scanner__overlay qr-scanner__overlay--idle">
            <CameraOff :size="40" style="opacity: 0.2;" />
            <p>Scanner Offline</p>
            <button class="qr-scanner__start-btn" @click.stop="startScanner">Start Camera</button>
          </div>

          <!-- QR PiP Reinit Overlay -->
          <div v-if="isPiPStarting && scannerMode === 'qr'" class="qr-scanner__overlay qr-scanner__overlay--idle">
            <QrCode :size="40" style="opacity: 0.2;" />
            <p>Starting scanner…</p>
          </div>

          <!-- Scan Feedback Overlay (Unified for both modes) -->
          <div
            v-if="cooldownActive"
            class="qr-scanner__overlay"
            :class="isError ? 'qr-scanner__overlay--error' : 'qr-scanner__overlay--success'"
          >
            <div class="qr-scanner__status-row">
              <div class="qr-scanner__status-icon-mini">
                <Check :size="16" v-if="!isError" />
                <AlertTriangle :size="16" v-else />
              </div>
              <div class="qr-scanner__status-text">
                <span class="qr-scanner__status-name">{{ lastScannedName }}</span>
                <span class="qr-scanner__status-msg">{{ lastScannedStatus }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Camera Controls -->
        <div class="qr-scanner__footer" v-if="isScanning">
          <div class="qr-scanner__camera-select" v-if="cameras.length > 1">
            <Camera :size="13" />
            <select v-model="selectedCamera" @change="switchCamera">
              <option v-for="cam in cameras" :key="cam.id" :value="cam.id">
                {{ cam.label || 'Camera ' + cam.id }}
              </option>
            </select>
          </div>
          <button class="qr-scanner__stop-btn" @click.stop="stopScanner">Stop Camera</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode, X, ExternalLink, Minimize2, CameraOff, Check, Camera, AlertTriangle, ChevronDown, ChevronUp, Rss } from 'lucide-vue-next'
import { useClassroom } from '../composables/useClassroom.js'
import { useKeyboardWedge } from '../composables/useKeyboardWedge.js'
import { useMessage } from '../composables/useMessage.js'
import { supabase } from '../utils/supabase.js'
import { isSyncActive } from '../db/eventService.js'

const emit = defineEmits(['close'])

const { students, logToggleEvent, studentsOut, globalStudentsOut, maxStudentsOut, filteredClassList, activeClass, periodStartTimes, reconcileStaleTrips, attendanceMode, handleRfidAttendanceScan, initializeRfidAttendance, cloudModeEnabled, userCode } = useClassroom()
const { alert } = useMessage()

// ── UI State ──────────────────────────────────────────────────────────────────
const isScanning    = ref(false)
const isMinimized   = ref(false)
const isPiPStarting = ref(false)
const cooldownActive = ref(false)
const isError        = ref(false)
const lastScannedName   = ref('')
const lastScannedStatus = ref('')
const cameras        = ref([])
const selectedCamera = ref(null)

// ── Local Companion (loopback polling) ───────────────────────────────────────
const localCompanionEnabled = ref(localStorage.getItem('local-rfid-companion') === 'true')
// 'idle' | 'connected' | 'error'
const companionStatus = ref('idle')
let _companionPollTimer = null
const COMPANION_URL = 'http://127.0.0.1:5000/scan'
const COMPANION_POLL_MS = 500

const startLocalPolling = () => {
  if (_companionPollTimer) return
  companionStatus.value = 'idle'
  const poll = async () => {
    if (!localCompanionEnabled.value) return
    try {
      const res = await fetch(COMPANION_URL, { signal: AbortSignal.timeout(400) })
      if (!res.ok) throw new Error('Non-200')
      const data = await res.json()
      companionStatus.value = 'connected'
      if (data.status === 'scanned' && data.tag) {
        handleScan(data.tag, true)
      }
    } catch {
      companionStatus.value = 'error'
    }
    if (localCompanionEnabled.value) {
      _companionPollTimer = setTimeout(poll, COMPANION_POLL_MS)
    }
  }
  _companionPollTimer = setTimeout(poll, 0)
}

const stopLocalPolling = () => {
  if (_companionPollTimer) {
    clearTimeout(_companionPollTimer)
    _companionPollTimer = null
  }
  companionStatus.value = 'idle'
}

const toggleLocalCompanion = () => {
  localCompanionEnabled.value = !localCompanionEnabled.value
  localStorage.setItem('local-rfid-companion', String(localCompanionEnabled.value))
  if (scannerMode.value !== 'rfid') return
  if (localCompanionEnabled.value) {
    rfidWedge.stop()
    stopSupabaseListener()
    startLocalPolling()
  } else {
    stopLocalPolling()
    rfidWedge.start()
  }
}

// ── Supabase Realtime & Network Status ─────────────────────────────────────────
const supabaseStatus = ref('connecting')
const isOffline = ref(!navigator.onLine)
const updateNetworkStatus = () => { isOffline.value = !navigator.onLine }
const isConnectionBroken = computed(() => isOffline.value || (cloudModeEnabled.value && supabaseStatus.value === 'offline'))

watch(isConnectionBroken, (broken) => {
  if (broken && cloudModeEnabled.value) {
    alert('Cloud Connection Lost. Please check your network/wifi connection or verify your Supabase service hosting.', 'Connection Warning')
  }
})

// ── Scanner Mode ─────────────────────────────────────────────────────────────
const scannerMode = ref(localStorage.getItem('scanner-mode') || 'qr')
watch(scannerMode, (newMode) => {
  localStorage.setItem('scanner-mode', newMode)
  if (newMode === 'rfid') {
    stopScanner()
    if (cloudModeEnabled.value) {
      rfidWedge.stop()
      stopLocalPolling()
      startSupabaseListener()
    } else if (localCompanionEnabled.value) {
      rfidWedge.stop()
      stopSupabaseListener()
      startLocalPolling()
    } else {
      stopSupabaseListener()
      stopLocalPolling()
      rfidWedge.start()
    }
  } else {
    rfidWedge.stop()
    stopSupabaseListener()
    stopLocalPolling()
  }
})

// ── RFID / QR Time-Based Resolution & Routing ────────────────────────────────
// Issue 5 fix: single source of truth for the transition window — used in both getScheduledClass and resolveScan
const TRANSITION_WINDOW_MINS = 5

const getScheduledClass = () => {
  const startTimes = periodStartTimes.value || {}
  
  // Filter and sort active classes that have start times
  const sortedClasses = filteredClassList.value
    .filter(c => !c.archived && c.periodStartTime)
    .sort((a, b) => {
      const timeA = a.periodStartTime.split(':').map(Number)
      const timeB = b.periodStartTime.split(':').map(Number)
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1])
    })

  if (sortedClasses.length === 0) {
    return activeClass.value // Fallback to active class if no schedules configured
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // 1. Check if scan falls within transition window before any upcoming class
  for (const cls of sortedClasses) {
    const [h, m] = cls.periodStartTime.split(':').map(Number)
    const classMinutes = h * 60 + m
    if (currentMinutes >= classMinutes - TRANSITION_WINDOW_MINS && currentMinutes < classMinutes) {
      return cls
    }
  }

  // 2. Otherwise, find the class that has most recently started
  let bestClass = null
  for (let i = sortedClasses.length - 1; i >= 0; i--) {
    const cls = sortedClasses[i]
    const [h, m] = cls.periodStartTime.split(':').map(Number)
    const classMinutes = h * 60 + m

    if (classMinutes <= currentMinutes) {
      bestClass = cls
      break
    }
  }

  // If before the first class of the day, default to first class
  return bestClass || sortedClasses[0]
}

const resolveScan = (scannedText, isRFID) => {
  const searchKey = scannedText.toLowerCase()

  // 1. Check for existing "OUT" status first (Return / Sign-In)
  for (const cls of filteredClassList.value) {
    for (const [studentId, student] of Object.entries(cls.students || {})) {
      const isMatch = isRFID 
        ? (student.rfidTag && student.rfidTag.toLowerCase() === searchKey)
        : (studentId.toLowerCase() === searchKey)
      
      if (isMatch && student.activeStates?.isOut) {
        return { studentId, classId: cls.classId, type: 'signin', class: cls }
      }
    }
  }

  // 2. If no one is currently OUT, resolve by schedule (New Sign-Out)
  const targetClass = getScheduledClass()
  if (!targetClass) {
    return { error: 'no_class' }
  }

  // Look up student in targetClass
  let foundStudentId = null
  if (isRFID) {
    for (const [studentId, student] of Object.entries(targetClass.students || {})) {
      if (student.rfidTag && student.rfidTag.toLowerCase() === searchKey) {
        foundStudentId = studentId
        break
      }
    }
  } else {
    // QR code: check if key exists directly
    if (targetClass.students && targetClass.students[scannedText]) {
      foundStudentId = scannedText
    }
  }

  if (!foundStudentId) {
    return { error: 'student_not_in_class', className: targetClass.name }
  }

  const student = targetClass.students[foundStudentId]

  // Check if period has ended/not started (only if schedules are configured)
  const startTimes = periodStartTimes.value || {}
  const sortedPeriods = Object.keys(startTimes).map(Number).sort((a, b) => a - b)
  
  const classPeriod = Number(targetClass.periodNumber)
  const timeStr = startTimes[classPeriod]

  if (targetClass.periodStartTime && timeStr) {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    const [startH, startM] = targetClass.periodStartTime.split(':').map(Number)
    const classStartMins = startH * 60 + startM

    let classEndMins = classStartMins + 75 // Default 75 minutes fallback
    const nextPeriodNum = sortedPeriods.find(p => p > classPeriod)
    if (nextPeriodNum && startTimes[nextPeriodNum]) {
      const [endH, endM] = startTimes[nextPeriodNum].split(':').map(Number)
      classEndMins = endH * 60 + endM
    }

    if (currentMinutes < classStartMins) {
      if (attendanceMode.value === 'rfid' && student?.activeStates?.isAbsent === true) {
        // Issue 5 fix: use the shared TRANSITION_WINDOW_MINS constant
        if (currentMinutes >= classStartMins - TRANSITION_WINDOW_MINS) {
          return { studentId: foundStudentId, classId: targetClass.classId, type: 'attendance_checkin', class: targetClass }
        }
      }
      return { studentId: foundStudentId, classId: targetClass.classId, type: 'signout_blocked_not_started', class: targetClass }
    }
    if (currentMinutes >= classEndMins) {
      return { studentId: foundStudentId, classId: targetClass.classId, type: 'signout_blocked_over', class: targetClass }
    }
  }

  if (attendanceMode.value === 'rfid' && student?.activeStates?.isAbsent === true) {
    return { studentId: foundStudentId, classId: targetClass.classId, type: 'attendance_checkin', class: targetClass }
  }

  return { studentId: foundStudentId, classId: targetClass.classId, type: 'signout', class: targetClass }
}

const onRFIDScan = (hex) => {
  handleScan(hex, true)
}

const rfidWedge = useKeyboardWedge(onRFIDScan)

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  try {
    const d = new Date(timeStr)
    return d.toLocaleString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch (e) {
    return ''
  }
}

const manualSignIn = async (studentId, classId) => {
  if (!classId) return
  await logToggleEvent(studentId, 'w', classId)
}

const minimizedTitle = computed(() => {
  if (!isMinimized.value) return ''
  const base = 'Drag to move • Click to expand'
  if (globalStudentsOut.value.length > 0) {
    const names = globalStudentsOut.value.map(s => `${s.firstName} ${s.lastName} (${s.className || 'Unknown Class'})`).join(', ')
    return `${base}\nCurrently Out: ${names}`
  }
  return base
})

// ── PiP ───────────────────────────────────────────────────────────────────────
const pipSupported = ref('documentPictureInPicture' in window)
const isPiP        = ref(false)
let pipWindowObj   = null

// ── Drag & Dock ─────────────────────────────────────────────────────────────
const dragPos = ref({ x: null, y: null })
const expandedPos = ref({ x: null, y: null })
const minimizedPos = ref({ x: 165, y: 8 }) // Default 'Dock' near title
const hasCustomMinimizedPos = ref(false)

const checkSyncOffset = async () => {
  const isSyncLinked = await isSyncActive()
  const targetX = isSyncLinked ? 205 : 165
  if (!hasCustomMinimizedPos.value) {
    minimizedPos.value.x = targetX
    if (isMinimized.value) {
      dragPos.value.x = targetX
    }
  }
}

let isDragging    = false
let hasDragged    = false // To distinguish click from drag
let dragStartX    = 0
let dragStartY    = 0
let dragStartPosX = 0
let dragStartPosY = 0

// Auto-Docking logic
watch(isMinimized, (minimized) => {
  if (scannerMode.value !== 'rfid' || isPiP.value) return

  if (minimized) {
    // Save current pos as expanded
    expandedPos.value = dragPos.value.x !== null ? { ...dragPos.value } : null
    // Move to dock
    dragPos.value = { ...minimizedPos.value }
  } else {
    // If they were in pill mode and moved it, save that as the new minimizedPos
    if (dragPos.value.x !== null && dragPos.value.x !== minimizedPos.value.x) {
      minimizedPos.value = { ...dragPos.value }
    }
    // Restore expanded pos
    if (expandedPos.value) {
      dragPos.value = { ...expandedPos.value }
    } else {
      dragPos.value = { x: null, y: null } // Reset to default
    }
  }
})

const mountStyle = computed(() => {
  if (isPiP.value || dragPos.value.x === null) return {}
  return { left: `${dragPos.value.x}px`, top: `${dragPos.value.y}px`, right: 'auto' }
})

function startDrag(e) {
  if (isPiP.value) return
  if (e.target.closest('button, select')) return

  isDragging = true
  hasDragged = false

  const mount = document.getElementById('qr-scanner-mount')
  const rect  = mount.getBoundingClientRect()

  if (dragPos.value.x === null) {
    dragPos.value = { x: rect.left, y: rect.top }
  }

  dragStartX    = e.clientX
  dragStartY    = e.clientY
  dragStartPosX = dragPos.value.x
  dragStartPosY = dragPos.value.y

  e.preventDefault()
}

function onDrag(e) {
  if (!isDragging) return
  
  // Movement threshold to count as a 'drag' (3 pixels)
  if (!hasDragged && (Math.abs(e.clientX - dragStartX) > 3 || Math.abs(e.clientY - dragStartY) > 3)) {
    hasDragged = true
    if (isMinimized.value) {
      hasCustomMinimizedPos.value = true
    }
  }

  const mount = document.getElementById('qr-scanner-mount')
  if (!mount) return
  const rect = mount.getBoundingClientRect()

  const x = Math.max(0, Math.min(window.innerWidth  - rect.width,  dragStartPosX + (e.clientX - dragStartX)))
  const y = Math.max(0, Math.min(window.innerHeight - rect.height, dragStartPosY + (e.clientY - dragStartY)))
  dragPos.value = { x, y }
}

function endDrag() { 
  isDragging = false 
  // We keep hasDragged true briefly so the @click handler can check it,
  // but it needs to be reset for the next interaction.
  setTimeout(() => { hasDragged = false }, 50)
}

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx = null

function playBeep(isErr = false) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()

  const osc  = audioCtx.createOscillator()
  const gain = audioCtx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(isErr ? 220 : 880, audioCtx.currentTime)
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime)

  osc.connect(gain)
  gain.connect(audioCtx.destination)

  const dur = isErr ? 0.35 : 0.15
  osc.start()
  gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + dur)
  osc.stop(audioCtx.currentTime + dur)
}

// ── Supabase Realtime Listener ────────────────────────────────────────────────
let scanSubscription = null

const startSupabaseListener = () => {
  if (scanSubscription || !supabase) return
  
  supabaseStatus.value = 'connecting'
  scanSubscription = supabase
    .channel('dashboard-scans')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'incoming_scans',
        filter: `user_code=eq.${userCode.value}`
      },
      async (payload) => {
        if (payload.new && payload.new.rfid_string) {
          const result = await handleScan(payload.new.rfid_string, true)
          if (result) {
            await supabase
              .from('incoming_scans')
              .update({
                status: result.success ? 'success' : 'error',
                scan_action: result.action,
                message: result.message,
                processed_at: new Date().toISOString()
              })
              .eq('id', payload.new.id)
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        supabaseStatus.value = 'connected'
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        supabaseStatus.value = 'offline'
      }
    })
}

const stopSupabaseListener = () => {
  if (scanSubscription && supabase) {
    supabase.removeChannel(scanSubscription)
    scanSubscription = null
  }
}

// ── Scan Handling ─────────────────────────────────────────────────────────────
const studentCooldowns = new Map()
const MIN_TRIP_MS = 15000 // 15 seconds minimum out time
const RECENT_TAP_LOCKOUT_MS = 2000 // 2 seconds to prevent rapid double-bounce

const handleScan = async (scannedText, isRFID = false) => {
  const now = Date.now()
  
  // Reconcile same-day stale trips first so the scan lookup is up-to-date
  await reconcileStaleTrips()
  
  // 1. Resolve scan to target class and student
  const resolved = resolveScan(scannedText, isRFID)

  // Lazy RFID initialization: if this scan targets a class that hasn't been
  // activated today yet (e.g. teacher scanned P2 without ever visiting P2's
  // dashboard), initialize its absence states now before checking isAbsent.
  // initializeRfidAttendance is idempotent — it no-ops if already initialized.
  if (attendanceMode.value === 'rfid' && resolved.classId) {
    await initializeRfidAttendance(resolved.classId)
  }
  
  if (resolved.error) {
    lastScannedName.value = resolved.error === 'student_not_in_class'
      ? 'Not in class'
      : 'Unknown Card'
    lastScannedStatus.value = resolved.error === 'student_not_in_class'
      ? resolved.className
      : (isRFID ? scannedText.toUpperCase() : 'Unknown ID')
    isError.value = true
    playBeep(true)
    
    cooldownActive.value = true
    setTimeout(() => {
      if (lastScannedName.value === 'Not in class' || lastScannedName.value === 'Unknown Card') {
        cooldownActive.value = false
        isError.value = false
      }
    }, 2000)
    return { success: false, action: 'error', message: resolved.error === 'student_not_in_class' ? 'Not in class' : 'Unknown Card' }
  }

  const { studentId, classId, type, class: targetClass } = resolved
  const lastTime = studentCooldowns.get(studentId) || 0
  
  // 2. Prevent "Rapid Double-Tap" (Bounce)
  if (now - lastTime < RECENT_TAP_LOCKOUT_MS) return null

  const student = targetClass.students[studentId]
  lastScannedName.value = `${student.firstName} ${student.lastName}`

  // 3. Enforce Period bounds (Block sign-out after school ends or before class starts)
  if (type === 'signout_blocked_not_started' || type === 'signout_blocked_over') {
    isError.value = true
    lastScannedStatus.value = type === 'signout_blocked_over' ? 'Class is Over' : 'Class not started'
    playBeep(true)
    
    cooldownActive.value = true
    setTimeout(() => {
      if (lastScannedName.value === `${student.firstName} ${student.lastName}`) {
        cooldownActive.value = false
        isError.value = false
      }
    }, 2000)
    return { success: false, action: 'error', message: type === 'signout_blocked_over' ? 'Class is Over' : 'Class not started' }
  }

  // ── RFID Attendance Integration: First scan checks student in (Present/Late) ──
  // Bug 1 fix: also explicitly handle 'attendance_checkin' type returned by resolveScan
  const isCurrentlyAbsent = student.activeStates?.isAbsent === true
  if (attendanceMode.value === 'rfid' && (isCurrentlyAbsent || type === 'attendance_checkin')) {
    isError.value = false
    playBeep(false)
    const result = await handleRfidAttendanceScan(studentId, classId)
    // Bug 2 fix: guard against error result returned from handleRfidAttendanceScan
    if (!result || result.type === 'error') {
      isError.value = true
      lastScannedStatus.value = result?.statusText || 'Attendance Error'
      playBeep(true)
      cooldownActive.value = true
      setTimeout(() => { cooldownActive.value = false; isError.value = false }, 2000)
      return { success: false, action: 'error', message: result?.statusText || 'Attendance Error' }
    }
    lastScannedStatus.value = `${result.statusText} (${targetClass.name})`
    
    studentCooldowns.set(studentId, now)
    cooldownActive.value = true
    setTimeout(() => {
      if (lastScannedName.value === `${student.firstName} ${student.lastName}`) {
        cooldownActive.value = false
        isError.value = false
      }
    }, 3000)
    return { success: true, action: 'checkin', message: result.statusText || 'Marked Present' }
  }

  const isCurrentlyOut = student.activeStates?.isOut

  // 4. Enforce "Minimum Out Time" (Prevent accidental immediate Sign-In)
  if (isCurrentlyOut) {
    const outTime = new Date(student.activeStates.outTime).getTime()
    if (now - outTime < MIN_TRIP_MS) {
      isError.value = true
      lastScannedStatus.value = 'Too Soon!'
      playBeep(true)
      
      cooldownActive.value = true
      setTimeout(() => {
        if (lastScannedName.value === `${student.firstName} ${student.lastName}`) {
          cooldownActive.value = false
          isError.value = false
        }
      }, 2000)
      return { success: false, action: 'error', message: 'Too Soon!' }
    }
  }

  // 5. Occupancy Limit Check (Specifically against the target class)
  const targetClassStudentsOut = Object.values(targetClass.students)
    .filter(s => s.activeStates?.isOut === true)

  let success = false
  let action = 'error'
  let message = ''

  if (!isCurrentlyOut && maxStudentsOut.value > 0 && targetClassStudentsOut.length >= maxStudentsOut.value) {
    isError.value = true
    lastScannedStatus.value = `Limit Reached (${targetClass.name})`
    playBeep(true)
    message = 'Limit Reached'
  } else {
    isError.value = false
    lastScannedStatus.value = isCurrentlyOut ? `IN (${targetClass.name})` : `OUT (${targetClass.name})`
    playBeep(false)
    await logToggleEvent(studentId, 'w', classId)
    success = true
    action = isCurrentlyOut ? 'washroom_in' : 'washroom_out'
    message = isCurrentlyOut ? 'Returned' : 'Washroom Out'
  }

  studentCooldowns.set(studentId, now)
  cooldownActive.value = true
  setTimeout(() => {
    if (lastScannedName.value === `${student.firstName} ${student.lastName}`) {
      cooldownActive.value = false
      isError.value = false
    }
  }, 3000) // General feedback duration
  return { success, action, message }
}

const handleStartByMode = async () => {
  if (scannerMode.value === 'qr') {
    await startScanner()
  } else {
    rfidWedge.start()
  }
}

// ── Scanner Lifecycle ─────────────────────────────────────────────────────────
let html5QrCode = null

/**
 * qrbox as a function: always a square at 80% of the smaller dimension.
 * This ensures proportional framing in any window size, including PiP.
 */
const qrboxFn = (viewfinderWidth, viewfinderHeight) => {
  const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.8
  return { width: size, height: size }
}

async function _ensureCameras() {
  if (cameras.value.length === 0) {
    const devices = await Html5Qrcode.getCameras()
    if (devices?.length) {
      cameras.value = devices
      selectedCamera.value = devices[0].id
    }
  }
}

async function _startInstance(elementId) {
  html5QrCode = new Html5Qrcode(elementId)

  await _ensureCameras()

  const camConfig = selectedCamera.value
    ? { deviceId: { exact: selectedCamera.value } }
    : { facingMode: 'environment' }

  await html5QrCode.start(
    camConfig,
    { fps: 15, qrbox: qrboxFn, aspectRatio: 1.0 },
    handleScan,
    () => {}   // Suppress per-frame not-found errors
  )
  isScanning.value = true
}

const startScanner = async () => {
  if (scannerMode.value !== 'qr') return
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()

  try {
    await _startInstance('qr-reader')
  } catch (err) {
    console.error('Scanner start failed:', err)
    await alert('Could not start camera. Please check browser permissions.')
  }
}

const stopScanner = async () => {
  if (html5QrCode) {
    try { if (isScanning.value) await html5QrCode.stop() } catch {}
    try { html5QrCode.clear() } catch {}
    html5QrCode = null
  }
  isScanning.value = false
}

const switchCamera = async () => {
  if (isScanning.value) {
    await stopScanner()
    await startScanner()
  }
}

// ── PiP ───────────────────────────────────────────────────────────────────────
const togglePiP = async () => {
  if (!pipSupported.value) return

  const container = document.getElementById('qr-scanner-container')
  const mount     = document.getElementById('qr-scanner-mount')

  // Close existing PiP
  if (pipWindowObj) {
    pipWindowObj.close()
    return
  }

  const wasScanning = isScanning.value
  if (wasScanning) await stopScanner()

  isPiPStarting.value = true

  try {
    const pip = await documentPictureInPicture.requestWindow({ width: 340, height: 520 })
    pipWindowObj = pip
    isPiP.value  = true

    // ── Copy ALL stylesheets into PiP document ────────────────────
    Array.from(document.styleSheets).forEach((ss) => {
      try {
        if (ss.cssRules) {
          const style = pip.document.createElement('style')
          Array.from(ss.cssRules).forEach(r => style.appendChild(pip.document.createTextNode(r.cssText)))
          pip.document.head.appendChild(style)
        } else if (ss.href) {
          const link = pip.document.createElement('link')
          link.rel = 'stylesheet'
          link.href = ss.href
          pip.document.head.appendChild(link)
        }
      } catch { /* cross-origin, skip */ }
    })

    pip.document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:#000;'
    pip.document.body.appendChild(container)

    // Wait for DOM to settle in new window
    await new Promise(r => setTimeout(r, 150))

    // ── Re-initialize scanner in PiP document context ─────────────
    // html5-qrcode uses document.getElementById internally.
    // Temporarily redirect it to pip.document so it finds the moved element.
    if (wasScanning) {
      const origGet = document.getElementById.bind(document)
      document.getElementById = (id) => pip.document.getElementById(id) ?? origGet(id)
      try {
        await _startInstance('qr-reader')
      } catch (err) {
        console.error('PiP scanner reinit failed:', err)
      } finally {
        document.getElementById = origGet   // Always restore
      }
    }

    isPiPStarting.value = false

    pip.addEventListener('pagehide', async () => {
      mount.appendChild(container)
      await stopScanner()
      pipWindowObj        = null
      isPiP.value         = false
      isPiPStarting.value = false
    })

  } catch (err) {
    console.error('PiP failed:', err)
    isPiP.value         = false
    isPiPStarting.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
const handleExtensionScan = (e) => {
  const code = e.detail
  handleScan(code, true)
}

onMounted(async () => {
  window.addEventListener('pointermove', onDrag, { passive: true })
  window.addEventListener('pointerup',   endDrag)
  window.addEventListener('classroom-tracker-scan', handleExtensionScan)
  window.addEventListener('online', updateNetworkStatus)
  window.addEventListener('offline', updateNetworkStatus)
  window.addEventListener('backup-linked', checkSyncOffset)

  await checkSyncOffset()
  
  if (scannerMode.value === 'rfid') {
    if (cloudModeEnabled.value) {
      startSupabaseListener()
    } else if (localCompanionEnabled.value) {
      startLocalPolling()
    } else {
      rfidWedge.start()
    }
  }
})

onUnmounted(async () => {
  await stopScanner()
  rfidWedge.stop()
  stopSupabaseListener()
  stopLocalPolling()
  if (pipWindowObj) pipWindowObj.close()
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup',   endDrag)
  window.removeEventListener('classroom-tracker-scan', handleExtensionScan)
  window.removeEventListener('online', updateNetworkStatus)
  window.removeEventListener('offline', updateNetworkStatus)
  window.removeEventListener('backup-linked', checkSyncOffset)
})
</script>

<style scoped>
/* ── Mount ─────────────────────────────────────────────────── */
.qr-scanner-mount {
  position:   fixed;
  top:        70px;
  right:      16px;
  z-index:    1000;
  user-select: none;
}

/* ── Widget Shell ──────────────────────────────────────────── */
.qr-scanner {
  width:         300px;
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-md);
  display:       flex;
  flex-direction: column;
  overflow:      hidden;
  transition:    width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                 height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                 transform 0.2s ease;
}

.qr-scanner--minimized.qr-scanner--rfid {
  width: 72px;
  border-radius: 40px;
}

.qr-scanner--minimized.qr-scanner--rfid:hover {
  transform: scale(1.05);
}

.qr-scanner--pip {
  width:         100% !important;
  height:        100vh !important;
  border-radius: 0 !important;
  box-shadow:    none !important;
  border:        none !important;
}

/* ── Header (Drag Handle) ──────────────────────────────────── */
.qr-scanner__header {
  padding:    10px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display:    flex;
  justify-content: space-between;
  align-items: center;
  cursor:     grab;
}
.qr-scanner--minimized.qr-scanner--rfid .qr-scanner__header {
  display: none;
}

.qr-scanner__header:active { cursor: grabbing; }

.qr-scanner__title {
  display:     flex;
  align-items: center;
  gap:         7px;
  font-weight: 700;
  font-size:   0.85rem;
  color:       var(--text);
}

.qr-scanner__mode-toggle {
  display: flex;
  background: var(--bg);
  padding: 2px;
  border-radius: 20px;
  border: 1px solid var(--border);
}

.qr-scanner__mode-btn {
  border: none;
  background: none;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 15px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.qr-scanner__mode-btn:hover {
  color: var(--text);
}

.qr-scanner__mode-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.qr-scanner__actions {
  display: flex;
  gap:     4px;
}

.qr-scanner__icon-btn {
  background: none;
  border:     none;
  color:      var(--text-secondary);
  cursor:     pointer;
  padding:    5px;
  border-radius: var(--radius-sm);
  display:    flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, color 0.1s;
}

.qr-scanner__icon-btn:hover {
  background: var(--border);
  color:      var(--text);
}

/* ── Status Bar ────────────────────────────────────────────── */
.qr-scanner__status-bar {
  padding:    7px 12px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  display:    flex;
  justify-content: space-between;
  align-items: center;
  gap:        12px;
}
.qr-scanner--minimized.qr-scanner--rfid .qr-scanner__status-bar {
  padding: 6px 10px;
  border-bottom: none;
  justify-content: center;
}

.qr-scanner__status-bar--clickable {
  cursor:  pointer;
  background: var(--bg-secondary);
}
.qr-scanner__status-bar--clickable:hover {
  background: var(--primary-light);
}

.qr-scanner__count {
  display:     flex;
  align-items: baseline;
  gap:         3px;
  color:       var(--text-secondary);
}
.qr-scanner__count--full { color: var(--state-out); }

.qr-scanner__count-num {
  font-size:   1rem;
  font-weight: 800;
  color:       var(--text);
}
.qr-scanner__count--full .qr-scanner__count-num { color: var(--state-out); }

.qr-scanner__count-sep,
.qr-scanner__count-label {
  font-size:   0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.qr-scanner__out-list {
  margin-bottom: 12px;
  background:    var(--bg-secondary);
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  padding:       8px 10px;
}

.qr-scanner__out-title {
  font-size:      0.72rem;
  font-weight:    800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color:          var(--text-secondary);
  margin-bottom:  6px;
  display:        flex;
  align-items:    center;
  justify-content: space-between;
}

.qr-scanner__out-items {
  display:        flex;
  flex-direction: column;
  gap:            6px;
  max-height:     110px;
  overflow-y:     auto;
  scrollbar-width: thin;
}

.qr-scanner__out-item {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  background:      var(--surface);
  border:          1px solid var(--border);
  border-radius:   var(--radius-sm);
  padding:         6px 8px;
  gap:             8px;
  transition:      border-color 0.15s ease;
}

.qr-scanner__out-item:hover {
  border-color:    var(--primary-light);
}

.qr-scanner__out-info {
  display:        flex;
  flex-direction: column;
  min-width:      0;
}

.qr-scanner__out-name {
  font-size:      0.82rem;
  font-weight:    700;
  color:          var(--text);
  white-space:    nowrap;
  overflow:       hidden;
  text-overflow:  ellipsis;
}

.qr-scanner__out-time {
  font-size:      0.68rem;
  color:          var(--text-secondary);
  font-weight:    500;
}

.qr-scanner__out-signin-btn {
  display:         flex;
  align-items:     center;
  gap:             4px;
  background:      var(--primary-light);
  border:          1px solid transparent;
  color:           var(--primary);
  font-size:       0.7rem;
  font-weight:     700;
  padding:         3px 8px;
  border-radius:   var(--radius-sm);
  cursor:          pointer;
  transition:      all 0.12s ease;
  line-height:     1;
  flex-shrink:     0;
}

.qr-scanner__out-signin-btn:hover {
  background:      var(--primary);
  color:           #fff;
}

.qr-scanner__pill-dot {
  width: 6px;
  height: 6px;
  background: var(--primary);
  border-radius: 50%;
  margin-left: 4px;
  box-shadow: 0 0 5px var(--primary);
  animation: rfid-glow 2s infinite ease-in-out;
}

.qr-scanner__limits {
  display:     flex;
  align-items: center;
  gap:         7px;
}

.qr-scanner__limit-label {
  font-size:   0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color:       var(--text-secondary);
}

.qr-scanner__limit-btns {
  display:    flex;
  background: var(--bg-secondary);
  padding:    2px;
  border-radius: var(--radius-sm);
  border:     1px solid var(--border);
}

.qr-scanner__limit-btn {
  border:     none;
  background: none;
  font-size:  0.75rem;
  font-weight: 700;
  padding:    3px 9px;
  border-radius: 6px;
  cursor:     pointer;
  color:      var(--text-secondary);
  transition: all 0.12s ease;
  line-height: 1;
}
.qr-scanner__limit-btn:hover  { color: var(--text); }
.qr-scanner__limit-btn--active {
  background: var(--surface);
  color:      var(--primary);
  box-shadow: var(--shadow-sm);
}

/* ── Body ──────────────────────────────────────────────────── */
.qr-scanner__body { padding: 12px; }

/* In PiP: center the square viewfinder in the full window */
.qr-scanner--pip .qr-scanner__body {
  flex:    1;
  display: flex;
  flex-direction: column;
  align-items:    center;
  justify-content: center;
  padding: 8px;
  overflow: hidden;
}

.qr-scanner__viewfinder {
  position:      relative;
  width:         100%;
  aspect-ratio:  1;
  background:    #000;
  border-radius: var(--radius-md);
  overflow:      hidden;
  transition:    all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.qr-scanner--rfid .qr-scanner__viewfinder {
  aspect-ratio: auto;
  height:       48px;
}

/* In PiP: constrain to a centered square within the available space */
.qr-scanner--pip .qr-scanner__viewfinder {
  width:     min(calc(100vh - 140px), 100%);
  max-width: 100%;
}

.qr-scanner__reader { width: 100%; height: 100%; }

.qr-scanner__rfid-status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.qr-scanner__rfid-listening {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  color: var(--primary);
}

.qr-scanner__rfid-dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--primary);
  animation: rfid-glow 1.5s infinite ease-in-out;
}

@keyframes rfid-glow {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* ── Overlays ──────────────────────────────────────────────── */
.qr-scanner__overlay {
  position:        absolute;
  inset:           0;
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  justify-content: center;
  text-align:      center;
  z-index:         10;
}

.qr-scanner__overlay--idle {
  background: rgba(0, 0, 0, 0.82);
  color:      #fff;
  gap:        12px;
}

.qr-scanner__overlay--success {
  background:      rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  color:           var(--text);
  animation:       fadeIn 0.15s ease-out;
}

.qr-scanner__overlay--error {
  background:      rgba(255, 235, 235, 0.95);
  backdrop-filter: blur(4px);
  color:           var(--state-out);
  animation:       shake 0.35s ease-in-out;
}

.qr-scanner__status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 15px;
  width: 100%;
}

.qr-scanner__status-icon-mini {
  width: 28px;
  height: 28px;
  background: var(--state-success);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qr-scanner__overlay--error .qr-scanner__status-icon-mini { background: var(--state-out); }

.qr-scanner__status-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.qr-scanner__status-name {
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: left;
}

.qr-scanner__status-msg {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.5px;
  opacity: 0.8;
}

.qr-scanner__start-btn {
  background:    var(--primary);
  color:         #fff;
  border:        none;
  padding:       9px 22px;
  border-radius: var(--radius-md);
  font-weight:   700;
  cursor:        pointer;
  font-size:     0.9rem;
}
.qr-scanner__start-btn:hover { opacity: 0.9; }

/* ── Footer / Camera Controls ──────────────────────────────── */
.qr-scanner__footer {
  margin-top:     10px;
  display:        flex;
  flex-direction: column;
  gap:            8px;
}

.qr-scanner__camera-select {
  display:       flex;
  align-items:   center;
  gap:           8px;
  background:    var(--bg-secondary);
  padding:       5px 10px;
  border-radius: var(--radius-md);
  border:        1px solid var(--border);
}
.qr-scanner__camera-select select {
  background: none;
  border:     none;
  font-size:  0.82rem;
  width:      100%;
  color:      var(--text);
  outline:    none;
}

.qr-scanner__stop-btn {
  background:    var(--state-out);
  color:         #fff;
  border:        none;
  padding:       8px;
  border-radius: var(--radius-md);
  font-weight:   700;
  cursor:        pointer;
  font-size:     0.85rem;
}
.qr-scanner__stop-btn:hover { opacity: 0.88; }

.qr-scanner__connection-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 59, 48, 0.1);
  color: var(--state-out);
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 12px;
}
.qr-scanner__rfid-listening--cloud {
  color: var(--state-success) !important;
}
.qr-scanner__rfid-listening--cloud .qr-scanner__rfid-dot {
  background: var(--state-success) !important;
  box-shadow: 0 0 10px var(--state-success) !important;
}

/* Companion mode — distinct amber colour */
.qr-scanner__rfid-listening--companion {
  color: #f59e0b !important;
}
.qr-scanner__rfid-listening--companion .qr-scanner__rfid-dot {
  background: #f59e0b !important;
  box-shadow: 0 0 10px #f59e0b !important;
}

/* Companion row (toggle + status) */
.qr-scanner__companion-row {
  display:        flex;
  align-items:    center;
  justify-content: center;
  margin-top:     6px;
}

.qr-scanner__companion-toggle {
  display:        flex;
  align-items:    center;
  gap:            5px;
  background:     var(--bg-secondary);
  border:         1px solid var(--border);
  border-radius:  var(--radius-sm);
  padding:        3px 10px;
  font-size:      0.68rem;
  font-weight:    700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color:          var(--text-secondary);
  cursor:         pointer;
  transition:     all 0.15s ease;
}
.qr-scanner__companion-toggle:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.qr-scanner__companion-toggle--active {
  background:   color-mix(in srgb, #f59e0b 12%, white);
  border-color: #f59e0b;
  color:        #b45309;
}

/* Status dot on the companion toggle button */
.qr-scanner__companion-dot {
  width:         6px;
  height:        6px;
  border-radius: 50%;
  flex-shrink:   0;
}
.qr-scanner__companion-dot--idle      { background: var(--text-secondary); }
.qr-scanner__companion-dot--connected { background: var(--state-success); box-shadow: 0 0 5px var(--state-success); }
.qr-scanner__companion-dot--error     { background: var(--state-out); box-shadow: 0 0 5px var(--state-out); }

/* ── Animations ────────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-7px); }
  75%       { transform: translateX(7px); }
}
</style>
