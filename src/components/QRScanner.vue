<template>
  <div id="qr-scanner-mount" class="qr-scanner-mount">
    <div id="qr-scanner-container" class="qr-scanner" :class="{ 'qr-scanner--pip': isPiP }">
      <!-- Scanner Header -->
      <div class="qr-scanner__header">
        <div class="qr-scanner__title">
          <QrCode :size="18" />
          <span>Washroom Scanner</span>
        </div>
        <div class="qr-scanner__actions">
          <button 
            v-if="pipSupported" 
            class="qr-scanner__pip-btn" 
            @click="togglePiP"
            :title="isPiP ? 'Return to Dashboard' : 'Pop Out Scanner'"
          >
            <ExternalLink :size="16" v-if="!isPiP" />
            <Minimize2 :size="16" v-else />
          </button>
          <button class="qr-scanner__close-btn" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>
      </div>

      <!-- Scanner Body -->
      <div class="qr-scanner__body">
        <div class="qr-scanner__viewfinder">
          <div id="qr-reader" class="qr-scanner__reader"></div>
          
          <!-- State Overlays -->
          <div v-if="!isScanning" class="qr-scanner__overlay qr-scanner__overlay--idle">
            <CameraOff :size="48" style="opacity: 0.2;" />
            <p>Scanner Offline</p>
            <button class="qr-scanner__start-btn" @click="startScanner">Start Camera</button>
          </div>

          <div v-if="cooldownActive" class="qr-scanner__overlay qr-scanner__overlay--success">
            <div class="qr-scanner__success-icon">
              <Check :size="32" />
            </div>
            <p class="qr-scanner__success-name">{{ lastScannedName }}</p>
            <p class="qr-scanner__success-status">Checked {{ lastScannedStatus }}</p>
          </div>
        </div>

        <!-- Controls -->
        <div class="qr-scanner__footer" v-if="isScanning">
          <div class="qr-scanner__camera-select" v-if="cameras.length > 1">
            <Camera :size="14" />
            <select v-model="selectedCamera" @change="switchCamera">
              <option v-for="cam in cameras" :key="cam.id" :value="cam.id">
                {{ cam.label || 'Camera ' + cam.id }}
              </option>
            </select>
          </div>
          <button class="qr-scanner__stop-btn" @click="stopScanner">Stop Camera</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode, X, ExternalLink, Minimize2, CameraOff, Check, Camera } from 'lucide-vue-next'
import { useClassroom } from '../composables/useClassroom.js'

const emit = defineEmits(['close'])

const { activeClass, students, logToggleEvent } = useClassroom()

const isScanning = ref(false)
const cooldownActive = ref(false)
const lastScannedName = ref('')
const lastScannedStatus = ref('')
const cameras = ref([])
const selectedCamera = ref(null)

// PiP State
const pipSupported = ref('documentPictureInPicture' in window)
const isPiP = ref(false)
let pipWindowObj = null

// Scanner logic
let html5QrCode = null
let lastScanTime = 0
const DEBOUNCE_MS = 5000
let audioCtx = null

const playBeep = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  
  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) 
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
  
  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  
  oscillator.start()
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15)
  oscillator.stop(audioCtx.currentTime + 0.15)
}

const handleScan = async (decodedText) => {
  const now = Date.now()
  if (now - lastScanTime < DEBOUNCE_MS) return

  // Find student in active class
  const student = students.value[decodedText]
  if (!student) {
    console.warn(`Scan ignored: Student ID ${decodedText} not found in this class.`)
    return
  }

  // Success!
  lastScanTime = now
  playBeep()
  
  const isCurrentlyOut = student.activeStates?.isOut
  lastScannedName.value = `${student.firstName} ${student.lastName}`
  lastScannedStatus.value = isCurrentlyOut ? 'In' : 'Out'
  
  // Toggle the washroom state
  await logToggleEvent(decodedText, 'w')
  
  // Visual Feedback
  cooldownActive.value = true
  setTimeout(() => {
    cooldownActive.value = false
  }, DEBOUNCE_MS)
}

const startScanner = async () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()

  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("qr-reader")
  }

  try {
    if (cameras.value.length === 0) {
      const devices = await Html5Qrcode.getCameras()
      if (devices && devices.length > 0) {
        cameras.value = devices
        selectedCamera.value = devices[0].id
      }
    }

    const cameraConfig = selectedCamera.value 
      ? { deviceId: { exact: selectedCamera.value } } 
      : { facingMode: "environment" }

    await html5QrCode.start(
      cameraConfig,
      { 
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      handleScan,
      () => {} // Ignored errors
    )
    isScanning.value = true
  } catch (err) {
    console.error("Failed to start scanner:", err)
    alert("Could not start camera. Please ensure you have given browser permissions.")
  }
}

const stopScanner = async () => {
  if (html5QrCode && isScanning.value) {
    try {
      await html5QrCode.stop()
      isScanning.value = false
    } catch (err) {
      console.error("Failed to stop scanner:", err)
    }
  }
}

const switchCamera = async () => {
  if (isScanning.value) {
    await stopScanner()
    await startScanner()
  }
}

const togglePiP = async () => {
  if (!pipSupported.value) return

  const container = document.getElementById('qr-scanner-container')
  const mount = document.getElementById('qr-scanner-mount')

  if (pipWindowObj) {
    pipWindowObj.close()
    return
  }

  try {
    const pip = await documentPictureInPicture.requestWindow({
      width: 400,
      height: 500
    })
    
    pipWindowObj = pip
    isPiP.value = true

    // Copy styles
    Array.from(document.styleSheets).forEach((styleSheet) => {
      try {
        if (styleSheet.cssRules) {
          const newStyle = pip.document.createElement('style')
          Array.from(styleSheet.cssRules).forEach((rule) => {
            newStyle.appendChild(pip.document.createTextNode(rule.cssText))
          })
          pip.document.head.appendChild(newStyle)
        } else if (styleSheet.href) {
          const newLink = pip.document.createElement('link')
          newLink.rel = 'stylesheet'
          newLink.href = styleSheet.href
          pip.document.head.appendChild(newLink)
        }
      } catch (e) {
        // Cross-origin issues etc.
      }
    })

    // Move container
    pip.document.body.appendChild(container)
    
    pip.addEventListener("pagehide", () => {
      mount.appendChild(container)
      pipWindowObj = null
      isPiP.value = false
    })

  } catch (error) {
    console.error(error)
    alert("Failed to open PiP window.")
  }
}

onMounted(() => {
  // Optional: Auto-start if desired
})

onUnmounted(async () => {
  if (html5QrCode && isScanning.value) {
    await html5QrCode.stop()
  }
  if (pipWindowObj) {
    pipWindowObj.close()
  }
})
</script>

<style scoped>
.qr-scanner-mount {
  position: absolute;
  top: 70px;
  right: 16px;
  z-index: 1000;
}

.qr-scanner {
  width: 320px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.qr-scanner--pip {
  width: 100% !important;
  height: 100vh !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  border: none !important;
}

.qr-scanner__header {
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qr-scanner__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text);
}

.qr-scanner__actions {
  display: flex;
  gap: 8px;
}

.qr-scanner__pip-btn,
.qr-scanner__close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-scanner__pip-btn:hover,
.qr-scanner__close-btn:hover {
  background: var(--border);
  color: var(--text);
}

.qr-scanner__body {
  padding: 16px;
}

.qr-scanner__viewfinder {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #000;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.qr-scanner__reader {
  width: 100%;
  height: 100%;
}

.qr-scanner__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 10;
}

.qr-scanner__overlay--idle {
  background: rgba(0,0,0,0.8);
  color: #fff;
  gap: 12px;
}

.qr-scanner__overlay--success {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  color: var(--text);
  animation: fadeIn 0.2s ease-out;
}

.qr-scanner__success-icon {
  width: 64px;
  height: 64px;
  background: var(--state-success); /* Use green */
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.qr-scanner__success-name {
  font-weight: 700;
  font-size: 1.1rem;
}

.qr-scanner__success-status {
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
}

.qr-scanner__start-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.qr-scanner__footer {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qr-scanner__camera-select {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-secondary);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.qr-scanner__camera-select select {
  background: none;
  border: none;
  font-size: 0.85rem;
  width: 100%;
  color: var(--text);
  outline: none;
}

.qr-scanner__stop-btn {
  background: var(--state-out); /* Use red */
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: var(--radius-md);
  font-weight: 700;
  cursor: pointer;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
