import { ref, onUnmounted } from 'vue'

const activeEnrollmentCount = ref(0)

export function isAnyEnrollmentActive() {
  return activeEnrollmentCount.value > 0
}

/**
 * useKeyboardWedge
 * 
 * A composable that listens for rapid keyboard input (keyboard wedge).
 * Commonly used for RFID or Barcode scanners that act as an HID keyboard.
 * 
 * @param {Function} onComplete Callback when a full scan is detected
 * @param {Object} options 
 * @param {string} options.terminator The key that signals end-of-scan (default: 'Enter')
 * @param {number} options.maxGapMs Maximum time between keystrokes in ms (default: 80)
 * @param {number} options.minLength Minimum characters required for a valid scan (default: 6)
 * @param {boolean} options.isEnrollment Whether this wedge is for card enrollment/linking
 */
export function useKeyboardWedge(onComplete, options = {}) {
  const {
    terminator = 'Enter',
    maxGapMs = 80,
    minLength = 6,
    isEnrollment = false
  } = options

  const isListening = ref(false)
  let buffer = ''
  let lastKeyTime = 0
  let timer = null

  // Snapshot variables for active text fields to prevent character leakage
  let activeEl = null
  let savedValue = ''
  let savedStart = 0
  let savedEnd = 0

  const trySnapshot = () => {
    const el = document.activeElement
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      activeEl = el
      savedValue = el.value
      savedStart = el.selectionStart
      savedEnd = el.selectionEnd
    } else {
      activeEl = null
    }
  }

  const handleKeyDown = (e) => {
    if (!isListening.value) return

    // Ignore modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

    const now = Date.now()
    const gap = now - lastKeyTime
    
    // If this is coming in fast, it's likely a scanner.
    // Prevent default so it doesn't leak into focused input fields.
    // We don't prevent the very first key (buffer.length === 0) because we don't know yet if it's a burst,
    // but we prevent every subsequent fast key.
    if (buffer.length > 0 && gap < maxGapMs) {
      e.preventDefault()
    }

    // Snapshot state when starting a new buffer
    if (buffer.length === 0) {
      trySnapshot()
    }

    // If this is the first char or it came in quickly enough, keep it
    if (buffer.length === 0 || gap < maxGapMs) {
      if (e.key === terminator) {
        // If it's the terminator, we ALWAYS prevent default to avoid "Enter" submitting forms
        e.preventDefault()
        if (buffer.length >= minLength) {
          // Self-Healing Rollback: clean up any leaked first character
          if (activeEl && document.activeElement === activeEl) {
            activeEl.value = savedValue
            activeEl.setSelectionRange(savedStart, savedEnd)
            activeEl.dispatchEvent(new Event('input', { bubbles: true }))
          }
          onComplete(buffer)
        }
        buffer = '' // Clear after terminator regardless of length
        activeEl = null
      } else if (e.key.length === 1) {
        // Only append single characters (printable)
        buffer += e.key
      }
    } else {
      // Gap too large, treat as manual typing. 
      // Start a new buffer with this key if it's printable.
      buffer = e.key.length === 1 ? e.key : ''
      if (buffer.length > 0) {
        trySnapshot()
      }
    }

    lastKeyTime = now

    // Clear buffer automatically if no key for a while
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      buffer = ''
      activeEl = null
    }, maxGapMs * 2)
  }

  const start = () => {
    if (isListening.value) return
    isListening.value = true
    if (isEnrollment) {
      activeEnrollmentCount.value++
    }
    window.addEventListener('keydown', handleKeyDown)
  }

  const stop = () => {
    if (!isListening.value) return
    isListening.value = false
    if (isEnrollment && activeEnrollmentCount.value > 0) {
      activeEnrollmentCount.value--
    }
    window.removeEventListener('keydown', handleKeyDown)
    if (timer) clearTimeout(timer)
    buffer = ''
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isListening,
    start,
    stop
  }
}
