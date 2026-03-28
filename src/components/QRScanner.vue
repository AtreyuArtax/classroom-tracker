<template>
  <div
    id="qr-scanner-mount"
    class="qr-scanner-mount"
    :style="mountStyle"
    @pointermove="onDrag"
    @pointerup="endDrag"
  >
    <div id="qr-scanner-container" class="qr-scanner" :class="{ 'qr-scanner--pip': isPiP }">

      <!-- ── Header / Drag Handle ───────────────────────────────────── -->
      <div class="qr-scanner__header" @pointerdown="startDrag">
        <div class="qr-scanner__title">
          <QrCode :size="16" />
          <span>Washroom Scanner</span>
        </div>
        <div class="qr-scanner__actions">
          <!-- Minimize: only when camera is running and NOT in PiP -->
          <button
            v-if="isScanning && !isPiP"
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
        @click="isMinimized && !isPiP ? (isMinimized = false) : undefined"
        :title="isMinimized ? 'Click to expand' : ''"
      >
        <div class="qr-scanner__count" :class="{ 'qr-scanner__count--full': maxStudentsOut > 0 && studentsOut.length >= maxStudentsOut }">
          <span class="qr-scanner__count-num">{{ studentsOut.length }}</span>
          <span class="qr-scanner__count-sep" v-if="maxStudentsOut > 0"> / {{ maxStudentsOut }}</span>
          <span class="qr-scanner__count-label"> OUT</span>
        </div>
        <div class="qr-scanner__limits">
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
        <div class="qr-scanner__viewfinder">
          <div id="qr-reader" class="qr-scanner__reader"></div>

          <!-- Idle Overlay -->
          <div v-if="!isScanning && !isPiPStarting" class="qr-scanner__overlay qr-scanner__overlay--idle">
            <CameraOff :size="40" style="opacity: 0.2;" />
            <p>Scanner Offline</p>
            <button class="qr-scanner__start-btn" @click.stop="startScanner">Start Camera</button>
          </div>

          <!-- PiP Reinit Overlay -->
          <div v-if="isPiPStarting" class="qr-scanner__overlay qr-scanner__overlay--idle">
            <QrCode :size="40" style="opacity: 0.2;" />
            <p>Starting scanner…</p>
          </div>

          <!-- Scan Feedback Overlay -->
          <div
            v-if="cooldownActive"
            class="qr-scanner__overlay"
            :class="isError ? 'qr-scanner__overlay--error' : 'qr-scanner__overlay--success'"
          >
            <div class="qr-scanner__status-icon">
              <Check :size="28" v-if="!isError" />
              <AlertTriangle :size="28" v-else />
            </div>
            <p class="qr-scanner__status-name">{{ lastScannedName }}</p>
            <p class="qr-scanner__status-msg">{{ lastScannedStatus }}</p>
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode, X, ExternalLink, Minimize2, CameraOff, Check, Camera, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useClassroom } from '../composables/useClassroom.js'

const emit = defineEmits(['close'])

const { students, logToggleEvent, studentsOut, maxStudentsOut } = useClassroom()

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

// ── PiP ───────────────────────────────────────────────────────────────────────
const pipSupported = ref('documentPictureInPicture' in window)
const isPiP        = ref(false)
let pipWindowObj   = null

// ── Drag ──────────────────────────────────────────────────────────────────────
const dragPos = ref({ x: null, y: null })   // null = use CSS default
let isDragging    = false
let dragStartX    = 0
let dragStartY    = 0
let dragStartPosX = 0
let dragStartPosY = 0

const mountStyle = computed(() => {
  if (isPiP.value || dragPos.value.x === null) return {}
  return { left: `${dragPos.value.x}px`, top: `${dragPos.value.y}px`, right: 'auto' }
})

function startDrag(e) {
  if (isPiP.value) return
  if (e.target.closest('button, select')) return   // let controls work normally

  isDragging = true

  const mount = document.getElementById('qr-scanner-mount')
  const rect  = mount.getBoundingClientRect()

  // Latch current painted position on first drag
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
  const mount = document.getElementById('qr-scanner-mount')
  if (!mount) return
  const rect = mount.getBoundingClientRect()

  const x = Math.max(0, Math.min(window.innerWidth  - rect.width,  dragStartPosX + (e.clientX - dragStartX)))
  const y = Math.max(0, Math.min(window.innerHeight - rect.height, dragStartPosY + (e.clientY - dragStartY)))
  dragPos.value = { x, y }
}

function endDrag() { isDragging = false }

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

// ── Scan Handling ─────────────────────────────────────────────────────────────
let lastScanTime = 0
const DEBOUNCE_MS = 5000

const handleScan = async (decodedText) => {
  const now = Date.now()
  if (now - lastScanTime < DEBOUNCE_MS) return

  const student = students.value[decodedText]
  if (!student) {
    console.warn(`Scan ignored: Student ID "${decodedText}" not in active class.`)
    return
  }

  const isCurrentlyOut = student.activeStates?.isOut
  lastScannedName.value = `${student.firstName} ${student.lastName}`

  if (!isCurrentlyOut && maxStudentsOut.value > 0 && studentsOut.value.length >= maxStudentsOut.value) {
    isError.value = true
    lastScannedStatus.value = 'Limit Reached'
    playBeep(true)
  } else {
    isError.value = false
    lastScannedStatus.value = isCurrentlyOut ? 'IN' : 'OUT'
    playBeep(false)
    await logToggleEvent(decodedText, 'w')
  }

  lastScanTime = now
  cooldownActive.value = true
  setTimeout(() => {
    cooldownActive.value = false
    isError.value = false
  }, DEBOUNCE_MS)
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
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()

  try {
    await _startInstance('qr-reader')
  } catch (err) {
    console.error('Scanner start failed:', err)
    alert('Could not start camera. Please check browser permissions.')
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
onMounted(() => {
  window.addEventListener('pointermove', onDrag, { passive: true })
  window.addEventListener('pointerup',   endDrag)
})

onUnmounted(async () => {
  await stopScanner()
  if (pipWindowObj) pipWindowObj.close()
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup',   endDrag)
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

.qr-scanner__header:active { cursor: grabbing; }

.qr-scanner__title {
  display:     flex;
  align-items: center;
  gap:         7px;
  font-weight: 700;
  font-size:   0.85rem;
  color:       var(--text);
  pointer-events: none;   /* let drag bubble to header */
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
  aspect-ratio:  1;  /* Always square — no wide/narrow stretch */
  background:    #000;
  border-radius: var(--radius-md);
  overflow:      hidden;
}

/* In PiP: constrain to a centered square within the available space */
.qr-scanner--pip .qr-scanner__viewfinder {
  width:     min(calc(100vh - 140px), 100%);
  max-width: 100%;
}

.qr-scanner__reader { width: 100%; height: 100%; }

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

.qr-scanner__status-icon {
  width:         56px;
  height:        56px;
  background:    var(--state-success);
  color:         #fff;
  border-radius: 50%;
  display:       flex;
  align-items:   center;
  justify-content: center;
  margin-bottom: 10px;
  box-shadow:    0 3px 10px rgba(0,0,0,.12);
}
.qr-scanner__overlay--error .qr-scanner__status-icon { background: var(--state-out); }

.qr-scanner__status-name {
  font-weight: 700;
  font-size:   1rem;
}
.qr-scanner__status-msg {
  font-weight:    700;
  text-transform: uppercase;
  font-size:      0.8rem;
  letter-spacing: 1px;
  opacity:        0.75;
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
