<template>
  <BaseModal
    :show="show"
    :title="modalTitle"
    max-width="580px"
    @close="handleClose"
  >
    <div class="photo-capture-content">
      <!-- Tabs: Webcam vs File Upload -->
      <div class="photo-tabs">
        <button 
          type="button" 
          class="photo-tab-btn" 
          :class="{ 'photo-tab-btn--active': activeTab === 'webcam' }"
          @click="switchTab('webcam')"
        >
          <Camera :size="16" /> Webcam Booth
        </button>
        <button 
          type="button" 
          class="photo-tab-btn" 
          :class="{ 'photo-tab-btn--active': activeTab === 'upload' }"
          @click="switchTab('upload')"
        >
          <UploadCloud :size="16" /> Upload File
        </button>
      </div>

      <!-- Rapid Mode Banner / Student Info -->
      <div class="current-student-banner">
        <div class="current-student-info">
          <span class="student-name-tag">{{ currentStudentName }}</span>
          <span v-if="currentStudentId" class="student-id-tag">#{{ currentStudentId }}</span>
        </div>
        <div v-if="isRapidMode" class="rapid-progress-pill">
          Student {{ rapidIndex + 1 }} of {{ studentList.length }}
        </div>
      </div>

      <!-- TAB 1: WEBCAM -->
      <div v-if="activeTab === 'webcam'" class="webcam-pane">
        <!-- Error State -->
        <div v-if="cameraError" class="camera-error-box">
          <AlertCircle :size="24" class="error-icon" />
          <p>{{ cameraError }}</p>
          <button class="setup__btn-ghost setup__btn-sm" @click="startCamera">
            <RefreshCw :size="14" /> Retry Camera
          </button>
        </div>

        <!-- Live Camera Viewport -->
        <div v-else class="webcam-viewport">
          <video 
            ref="videoRef" 
            autoplay 
            playsinline 
            muted 
            class="webcam-video" 
            :class="{ 'webcam-video--captured': !!capturedImage }"
          />

          <!-- SVG Head & Shoulders Alignment Silhouette Overlay -->
          <svg 
            v-if="!capturedImage" 
            class="webcam-silhouette-overlay" 
            viewBox="0 0 300 300"
            preserveAspectRatio="none"
          >
            <!-- Face Oval Guide -->
            <ellipse cx="150" cy="115" rx="55" ry="70" class="guide-oval" />
            <!-- Eye Level Line -->
            <line x1="120" y1="105" x2="180" y2="105" class="guide-line" />
            <!-- Shoulders Arc -->
            <path d="M 60 270 Q 150 200 240 270" class="guide-shoulder" />
          </svg>

          <!-- Captured Image Preview Overlay -->
          <img 
            v-if="capturedImage" 
            :src="capturedImage" 
            alt="Captured Preview" 
            class="captured-preview-img" 
          />

          <canvas ref="canvasRef" style="display: none;" />
        </div>

        <!-- Webcam Controls -->
        <div class="webcam-controls">
          <template v-if="!capturedImage">
            <button 
              type="button" 
              class="setup__btn-primary snap-btn" 
              @click="snapPhoto"
              :disabled="!isCameraReady"
            >
              <Camera :size="18" /> Snap Photo (Space)
            </button>
          </template>
          <template v-else>
            <button type="button" class="setup__btn-ghost" @click="retakePhoto">
              <RefreshCw :size="14" /> Retake
            </button>
            <button type="button" class="setup__btn-primary" @click="saveCapturedPhoto">
              <Check :size="14" /> Save Photo
            </button>
          </template>
        </div>
      </div>

      <!-- TAB 2: FILE UPLOAD -->
      <div v-if="activeTab === 'upload'" class="upload-pane">
        <label 
          class="upload-dropzone" 
          :class="{ 'upload-dropzone--drag': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleFileDrop"
        >
          <input 
            type="file" 
            accept="image/png,image/jpeg,image/webp,image/jpg" 
            class="file-hidden-input"
            @change="handleFileInput" 
          />
          <div v-if="uploadedPreview" class="uploaded-preview-box">
            <img :src="uploadedPreview" alt="Upload Preview" class="upload-preview-img" />
            <span class="setup__hint">Click or drop another image to replace</span>
          </div>
          <div v-else class="upload-prompt">
            <UploadCloud :size="40" class="upload-icon" />
            <span class="upload-title">Drop student photo here or click to browse</span>
            <span class="setup__hint">Supports JPG, PNG, WEBP (auto-cropped to 1:1)</span>
          </div>
        </label>

        <div v-if="uploadedPreview" class="upload-actions">
          <button type="button" class="setup__btn-ghost" @click="uploadedPreview = null; uploadedFile = null;">
            <Trash2 :size="14" /> Clear
          </button>
          <button type="button" class="setup__btn-primary" @click="saveUploadedPhoto">
            <Check :size="14" /> Save Photo
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Footer Actions (Rapid Mode Next/Skip Navigation) -->
    <template #footer>
      <div class="photo-modal-footer">
        <div v-if="isRapidMode" class="rapid-footer-nav">
          <button 
            type="button" 
            class="setup__btn-ghost setup__btn-sm" 
            :disabled="rapidIndex <= 0"
            @click="prevStudent"
          >
            ‹ Previous
          </button>
          <button 
            type="button" 
            class="setup__btn-ghost setup__btn-sm" 
            @click="nextStudent"
          >
            Skip to Next ›
          </button>
        </div>

        <button 
          v-if="!isRapidMode && hasExistingPhoto" 
          type="button" 
          class="setup__btn-ghost setup__btn-danger setup__btn-sm" 
          style="margin-right: auto;"
          @click="removeExistingPhoto"
        >
          <Trash2 :size="14" /> Remove Photo
        </button>

        <button type="button" class="setup__btn-ghost" @click="handleClose">
          {{ isRapidMode ? 'Done / Exit' : 'Cancel' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Camera, UploadCloud, RefreshCw, Check, AlertCircle, Trash2 } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { useStudentPhotos } from '../../composables/useStudentPhotos.js'
import { useMessage } from '../../composables/useMessage.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  // Single student mode
  student: { type: Object, default: null },
  // Rapid walkthrough mode (array of students)
  studentList: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['close', 'saved'])

const { saveStudentPhoto, deleteStudentPhoto, hasPhoto } = useStudentPhotos()
const { confirm } = useMessage()

const activeTab = ref('webcam')
const videoRef = ref(null)
const canvasRef = ref(null)
const stream = ref(null)
const isCameraReady = ref(false)
const cameraError = ref('')
const capturedImage = ref(null)

const isDragging = ref(false)
const uploadedFile = ref(null)
const uploadedPreview = ref(null)

const rapidIndex = ref(0)

const isRapidMode = computed(() => {
  return props.studentList && props.studentList.length > 0
})

const currentStudent = computed(() => {
  if (isRapidMode.value) {
    return props.studentList[rapidIndex.value] || null
  }
  return props.student || null
})

const currentStudentId = computed(() => {
  return currentStudent.value?.studentId || ''
})

const currentStudentName = computed(() => {
  if (!currentStudent.value) return 'Student'
  return `${currentStudent.value.firstName || ''} ${currentStudent.value.lastName || ''}`.trim()
})

const modalTitle = computed(() => {
  if (isRapidMode.value) {
    return 'Rapid Photo Booth'
  }
  return `Student Photo — ${currentStudentName.value}`
})

const hasExistingPhoto = computed(() => {
  return hasPhoto(currentStudentId.value)
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    rapidIndex.value = props.startIndex || 0
    capturedImage.value = null
    uploadedFile.value = null
    uploadedPreview.value = null
    if (activeTab.value === 'webcam') {
      nextTick(() => {
        startCamera()
      })
    }
  } else {
    stopCamera()
  }
}, { immediate: true })

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'webcam') {
    nextTick(() => {
      startCamera()
    })
  } else {
    stopCamera()
  }
}

// ─── WEBCAM CAPTURE LOGIC ───────────────────────────────────────────────────

async function startCamera() {
  stopCamera()
  cameraError.value = ''
  isCameraReady.value = false

  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    })
    stream.value = s

    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = s
      try {
        await videoRef.value.play()
      } catch (playErr) {
        console.warn('video.play() auto-play promise:', playErr)
      }
      isCameraReady.value = true
    }
  } catch (err) {
    console.error('Camera access failed:', err)
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      cameraError.value = 'Camera permission was denied. Please allow camera access in your browser settings (click the lock/camera icon in your browser address bar).'
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      cameraError.value = 'No webcam or camera device was found on this computer.'
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      cameraError.value = 'Webcam is currently in use by another app or browser tab. Please close other apps using the camera and try again.'
    } else {
      cameraError.value = `Unable to start camera stream (${err.message || err.name}). You can still upload photos via the Upload File tab.`
    }
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }
  isCameraReady.value = false
}

function snapPhoto() {
  if (!videoRef.value || !isCameraReady.value) return
  const video = videoRef.value
  const canvas = canvasRef.value || document.createElement('canvas')
  const size = Math.min(video.videoWidth, video.videoHeight)
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Center crop square from video frame
  const sx = (video.videoWidth - size) / 2
  const sy = (video.videoHeight - size) / 2
  ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size)

  capturedImage.value = canvas.toDataURL('image/jpeg', 0.9)
}

function retakePhoto() {
  capturedImage.value = null
}

async function saveCapturedPhoto() {
  if (!capturedImage.value || !currentStudentId.value) return
  try {
    await saveStudentPhoto(currentStudentId.value, capturedImage.value)
    emit('saved', { studentId: currentStudentId.value })
    capturedImage.value = null

    if (isRapidMode.value) {
      if (rapidIndex.value < props.studentList.length - 1) {
        rapidIndex.value++
      } else {
        handleClose()
      }
    } else {
      handleClose()
    }
  } catch (err) {
    console.error('Failed to save photo:', err)
  }
}

// ─── FILE UPLOAD LOGIC ──────────────────────────────────────────────────────

function handleFileInput(event) {
  const file = event.target.files?.[0]
  if (file) processFile(file)
}

function handleFileDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}

function processFile(file) {
  uploadedFile.value = file
  uploadedPreview.value = URL.createObjectURL(file)
}

async function saveUploadedPhoto() {
  if (!uploadedFile.value || !currentStudentId.value) return
  try {
    await saveStudentPhoto(currentStudentId.value, uploadedFile.value)
    emit('saved', { studentId: currentStudentId.value })
    uploadedPreview.value = null
    uploadedFile.value = null

    if (isRapidMode.value) {
      if (rapidIndex.value < props.studentList.length - 1) {
        rapidIndex.value++
      } else {
        handleClose()
      }
    } else {
      handleClose()
    }
  } catch (err) {
    console.error('Failed to save uploaded photo:', err)
  }
}

async function removeExistingPhoto() {
  if (!await confirm(`Remove photo for ${currentStudentName.value}?`, 'Remove Photo', { danger: true })) return
  await deleteStudentPhoto(currentStudentId.value)
  emit('saved', { studentId: currentStudentId.value, removed: true })
  handleClose()
}

function prevStudent() {
  if (rapidIndex.value > 0) {
    rapidIndex.value--
    capturedImage.value = null
  }
}

function nextStudent() {
  if (rapidIndex.value < props.studentList.length - 1) {
    rapidIndex.value++
    capturedImage.value = null
  }
}

function handleKeyDown(e) {
  if (!props.show) return
  if (e.code === 'Space' && activeTab.value === 'webcam' && !capturedImage.value && isCameraReady.value) {
    e.preventDefault()
    snapPhoto()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  stopCamera()
})

function handleClose() {
  stopCamera()
  emit('close')
}
</script>

<style scoped>
.photo-capture-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.photo-tabs {
  display: flex;
  background: var(--bg-secondary, #f1f5f9);
  padding: 4px;
  border-radius: var(--radius-md, 8px);
  gap: 4px;
}

.photo-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: all 0.15s ease;
}

.photo-tab-btn--active {
  background: white;
  color: var(--text, #0f172a);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.current-student-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
}

.current-student-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.student-name-tag {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text, #0f172a);
}

.student-id-tag {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
  font-family: monospace;
}

.rapid-progress-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  background: var(--primary-light, #e0e7ff);
  color: var(--primary, #4f46e5);
  border-radius: 9999px;
}

/* Webcam Container */
.webcam-viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #000;
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.webcam-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror view for natural feel */
}

.webcam-silhouette-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.guide-oval {
  fill: none;
  stroke: rgba(255, 255, 255, 0.7);
  stroke-width: 2.5;
  stroke-dasharray: 6 4;
}

.guide-line {
  stroke: rgba(255, 255, 255, 0.4);
  stroke-width: 1.5;
}

.guide-shoulder {
  fill: none;
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 2.5;
  stroke-dasharray: 6 4;
}

.captured-preview-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-error-box {
  padding: 30px 20px;
  text-align: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md, 8px);
  color: #991b1b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.webcam-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}

.snap-btn {
  padding: 10px 24px;
  font-size: 0.95rem;
  font-weight: 700;
}

/* Upload Dropzone */
.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 20px;
  border: 2px dashed var(--border, #cbd5e1);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  background: var(--bg-secondary, #f8fafc);
  text-align: center;
}

.upload-dropzone--drag {
  border-color: var(--primary, #4f46e5);
  background: rgba(79, 70, 229, 0.05);
}

.file-hidden-input {
  display: none;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  color: var(--text-muted, #94a3b8);
}

.upload-title {
  font-weight: 600;
  color: var(--text, #0f172a);
}

.uploaded-preview-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.upload-preview-img {
  width: 140px;
  height: 140px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.photo-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  gap: 10px;
}

.rapid-footer-nav {
  display: flex;
  gap: 8px;
  margin-right: auto;
}
</style>
