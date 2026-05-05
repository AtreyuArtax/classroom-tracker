import { ref, onUnmounted } from 'vue'

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
 */
export function useKeyboardWedge(onComplete, options = {}) {
  const {
    terminator = 'Enter',
    maxGapMs = 80,
    minLength = 6
  } = options

  const isListening = ref(false)
  let buffer = ''
  let lastKeyTime = 0
  let timer = null

  const handleKeyDown = (e) => {
    if (!isListening.value) return

    // Ignore modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

    const now = Date.now()
    
    // If this is the first char or it came in quickly enough, keep it
    if (buffer.length === 0 || (now - lastKeyTime) < maxGapMs) {
      if (e.key === terminator) {
        if (buffer.length >= minLength) {
          onComplete(buffer)
        }
        buffer = '' // Clear after terminator regardless of length
      } else if (e.key.length === 1) {
        // Only append single characters (printable)
        buffer += e.key
      }
    } else {
      // Gap too large, treat as manual typing. 
      // Start a new buffer with this key if it's printable.
      buffer = e.key.length === 1 ? e.key : ''
    }

    lastKeyTime = now

    // Clear buffer automatically if no key for a while
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      buffer = ''
    }, maxGapMs * 2)
  }

  const start = () => {
    if (isListening.value) return
    isListening.value = true
    window.addEventListener('keydown', handleKeyDown)
  }

  const stop = () => {
    isListening.value = false
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
