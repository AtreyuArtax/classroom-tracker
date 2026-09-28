/**
 * src/utils/preventNumberScroll.js
 *
 * Prevents mouse-wheel and trackpad gestures from altering number inputs
 * (specifically marks and scores across Gradebook and the entire app).
 *
 * Browsers natively increment/decrement focused <input type="number">
 * when scrolled over with a mouse wheel or trackpad. In a gradebook,
 * a teacher entering a mark and scrolling before clicking out would
 * accidentally alter the mark.
 *
 * This utility:
 * 1. Attaches a non-passive wheel listener on focused number inputs to preventDefault()
 *    (blocking the browser's number step) and immediately blurs the input
 *    (committing the teacher's exact typed mark and closing the inline editor).
 * 2. Listens to window wheel events so that if a number input is focused and the user
 *    scrolls anywhere else on the screen, the input is immediately blurred and committed.
 */

export function setupNumberInputScrollPrevention(targetWindow = (typeof window !== 'undefined' ? window : null), targetDoc = (typeof document !== 'undefined' ? document : null)) {
  if (!targetWindow || !targetDoc) return () => {}

  function onInputWheel(e) {
    if (e.cancelable) {
      e.preventDefault()
    }
    if (typeof e.target?.blur === 'function') {
      e.target.blur()
    }
  }

  function onFocusIn(e) {
    const el = e.target
    if (el && el.tagName === 'INPUT' && el.type === 'number') {
      el.addEventListener('wheel', onInputWheel, { passive: false })
    }
  }

  function onFocusOut(e) {
    const el = e.target
    if (el && el.tagName === 'INPUT' && el.type === 'number') {
      el.removeEventListener('wheel', onInputWheel)
    }
  }

  function onWindowWheel() {
    const active = targetDoc.activeElement
    if (active && active.tagName === 'INPUT' && active.type === 'number') {
      if (typeof active.blur === 'function') {
        active.blur()
      }
    }
  }

  targetDoc.addEventListener('focusin', onFocusIn)
  targetDoc.addEventListener('focusout', onFocusOut)
  targetWindow.addEventListener('wheel', onWindowWheel, { passive: true })

  return () => {
    targetDoc.removeEventListener('focusin', onFocusIn)
    targetDoc.removeEventListener('focusout', onFocusOut)
    targetWindow.removeEventListener('wheel', onWindowWheel)
  }
}
