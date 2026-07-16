<template>
  <div v-if="show" class="setup__dialog setup__dialog--qr" role="dialog" aria-modal="true">
    <div class="setup__dialog-box setup__dialog-box--large">
      <div class="setup__dialog-header">
        <h3 class="setup__dialog-title">Student QR Codes</h3>
        <div class="setup__dialog-actions">
          <button class="setup__btn-primary" @click="printQRs" :disabled="isGenerating">
            <Printer :size="18" /> Print
          </button>
          <button class="setup__btn-ghost" @click="$emit('close')">
            <X :size="18" /> Close
          </button>
        </div>
      </div>
      
      <p class="setup__dialog-body print:hidden">
        These QR codes are tied to student ID numbers. Print this page to create student cards.
      </p>

      <div class="setup__qr-grid" :class="{ 'setup__qr-grid--loading': isGenerating }">
        <div v-if="isGenerating" class="setup__qr-loading">
          <QrCodeIcon :size="48" class="setup__qr-pulse" />
          <p>Generating codes...</p>
        </div>
        <div v-else-if="qrCodes.length === 0" class="setup__qr-empty">
          No students in class.
        </div>
        <div v-else v-for="qr in qrCodes" :key="qr.studentId" class="setup__qr-card">
          <img :src="qr.qrUrl" :alt="qr.name" class="setup__qr-img" />
          <div class="setup__qr-info">
            <span class="setup__qr-name">{{ qr.name }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="setup__dialog-backdrop" @click="$emit('close')" />

    <!-- ── Hidden Batch Print Container ─── -->
    <Teleport to="body">
      <div class="qr-print-only" :class="{ 'print-only-container--active': isSystemPrinting }">
        <div class="setup__qr-print-grid">
          <div v-for="qr in qrCodes" :key="qr.studentId" class="setup__qr-print-card">
            <div class="setup__qr-print-header">
              <span class="setup__qr-print-class">{{ activeClass?.name }}</span>
            </div>
            <img :src="qr.qrUrl" :alt="qr.name" class="setup__qr-print-img" />
            <div class="setup__qr-print-info">
              <span class="setup__qr-print-name">{{ qr.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import QRCode from 'qrcode'
import { Printer, X, QrCode as QrCodeIcon } from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, required: true },
  activeClass: { type: Object, required: true }
})

const emit = defineEmits(['close'])

const qrCodes = ref([])
const isGenerating = ref(false)
const isSystemPrinting = ref(false)

// Watch for changes in isSystemPrinting to apply/remove print styles to document body
watch(isSystemPrinting, (newValue) => {
  if (newValue) {
    document.body.classList.add('is-printing')
  } else {
    document.body.classList.remove('is-printing')
  }
})

// Generate QR codes on mount or when activeClass changes
watch(
  () => [props.show, props.activeClass],
  async ([newShow, newClass]) => {
    if (newShow && newClass) {
      await generateQRs()
    }
  },
  { immediate: true, deep: true }
)

async function generateQRs() {
  if (!props.activeClass) {
    qrCodes.value = []
    return
  }

  // Extract and sort roster from target class
  const roster = props.activeClass.students 
    ? Object.entries(props.activeClass.students)
        .map(([studentId, s]) => ({ studentId, ...s }))
        .filter(s => !s.archived)
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
    : []

  if (roster.length === 0) {
    qrCodes.value = []
    return
  }

  isGenerating.value = true
  const codes = []

  for (const student of roster) {
    try {
      const url = await QRCode.toDataURL(student.studentId, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1c1c1e',
          light: '#ffffff'
        }
      })
      codes.push({
        studentId: student.studentId,
        name: `${student.firstName} ${student.lastName}`,
        qrUrl: url
      })
    } catch (err) {
      console.error(`Failed to generate QR for ${student.studentId}`, err)
    }
  }

  qrCodes.value = codes
  isGenerating.value = false
}

async function printQRs() {
  isSystemPrinting.value = true
  await nextTick()
  // Wait for QR codes to render and layout to settle
  await new Promise(resolve => setTimeout(resolve, 1000))
  window.print()
  isSystemPrinting.value = false
}
</script>

<style scoped>
/* ── Dialog Layout ── */
.setup__dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.setup__dialog-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1;
}

.setup__dialog-box {
  background: var(--surface, #1b1d2a);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-lg, 0 10px 30px rgba(0, 0, 0, 0.3));
  padding: 24px;
  width: 100%;
  max-width: 600px;
  z-index: 2;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup__dialog-box--large {
  max-width: 800px;
}

.setup__dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.setup__dialog-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text, #ffffff);
  margin: 0;
}

.setup__dialog-actions {
  display: flex;
  gap: 8px;
}

.setup__dialog-body {
  font-size: 0.9rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
}

/* ── UI Buttons ── */
.setup__btn-primary {
  min-height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background: var(--primary, #6366f1);
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s ease;
}

.setup__btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.setup__btn-ghost {
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 8px);
  background: transparent;
  color: var(--text, #ffffff);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s ease;
}

.setup__btn-ghost:hover {
  background: rgba(255, 255, 255, 0.04);
}

/* ── QR Codes Grid ── */
.setup__qr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px;
}

.setup__qr-grid--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.setup__qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary, #94a3b8);
}

.setup__qr-pulse {
  animation: setupPulse 1.5s infinite ease-in-out;
  color: var(--primary, #6366f1);
}

@keyframes setupPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
}

.setup__qr-card {
  background: white;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 8px);
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.setup__qr-img {
  width: 100%;
  aspect-ratio: 1;
  image-rendering: pixelated;
}

.setup__qr-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setup__qr-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.setup__qr-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
}

/* ── Hidden Print Layouts ── */
.qr-print-only {
  display: none;
}

/* Print Overrides */
@media print {
  body.is-printing .app-shell, 
  body.is-printing .app-nav, 
  body.is-printing .print\:hidden,
  body.is-printing .setup__dialog-backdrop,
  body.is-printing .setup__dialog-header {
    display: none !important;
  }
  
  body.is-printing .setup__dialog {
    position: static !important;
    background: white !important;
    padding: 0 !important;
  }
  
  body.is-printing .setup__dialog-box {
    box-shadow: none !important;
    border: none !important;
    width: 100% !important;
    max-width: none !important;
    padding: 0 !important;
    background: white !important;
  }

  body.is-printing .qr-print-only {
    display: block !important;
  }

  /* ── QR Print Grid (Credit Card Size) ── */
  .setup__qr-print-grid {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10mm !important;
    padding: 10mm !important;
    width: 100% !important;
  }
  
  .setup__qr-print-card {
    width: 85.6mm !important;
    height: 54mm !important;
    border: 1px solid #000 !important;
    border-radius: 4mm !important;
    padding: 4mm !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 4mm !important;
    background: white !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    box-sizing: border-box !important;
  }
  
  .setup__qr-print-img {
    height: 100% !important;
    aspect-ratio: 1 !important;
    image-rendering: pixelated !important;
  }
  
  .setup__qr-print-info {
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    flex: 1 !important;
    min-width: 0 !important;
  }
  
  .setup__qr-print-name {
    font-size: 14pt !important;
    font-weight: 700 !important;
    color: #000 !important;
    line-height: 1.2 !important;
  }
  
  .setup__qr-print-header {
    display: none !important;
  }
  
  .setup__qr-print-class {
    font-size: 8pt !important;
    color: #666 !important;
    margin-bottom: 2mm !important;
    display: block !important;
  }
}
</style>
