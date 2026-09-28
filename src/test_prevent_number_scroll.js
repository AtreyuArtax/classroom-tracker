import { strict as assert } from 'node:assert'
import { setupNumberInputScrollPrevention } from './utils/preventNumberScroll.js'

console.log('====================================================')
console.log('🧪 Number Input Scroll Prevention Test Suite')
console.log('====================================================\n')

// Mock DOM Event Target
class MockEventTarget {
  constructor() {
    this.listeners = {}
  }
  addEventListener(type, fn, options) {
    if (!this.listeners[type]) this.listeners[type] = []
    this.listeners[type].push({ fn, options })
  }
  removeEventListener(type, fn) {
    if (!this.listeners[type]) return
    this.listeners[type] = this.listeners[type].filter(l => l.fn !== fn)
  }
  dispatchEvent(event) {
    event.target = event.target || this
    const list = this.listeners[event.type] || []
    for (const item of [...list]) {
      item.fn(event)
    }
  }
}

class MockElement extends MockEventTarget {
  constructor(tagName, type = 'text') {
    super()
    this.tagName = tagName.toUpperCase()
    this.type = type
    this.blurred = false
    this.value = '85'
  }
  blur() {
    this.blurred = true
  }
}

class MockDocument extends MockEventTarget {
  constructor() {
    super()
    this.activeElement = null
  }
}

// Test 1: Focused number input intercepts wheel event, prevents default and blurs
{
  const mockDoc = new MockDocument()
  const mockWin = new MockEventTarget()
  const cleanup = setupNumberInputScrollPrevention(mockWin, mockDoc)

  const numInput = new MockElement('INPUT', 'number')
  mockDoc.activeElement = numInput

  // Simulate focusin
  mockDoc.dispatchEvent({ type: 'focusin', target: numInput })

  let defaultPrevented = false
  const wheelEvt = {
    type: 'wheel',
    target: numInput,
    cancelable: true,
    preventDefault() {
      defaultPrevented = true
    }
  }

  // Dispatch wheel on the number input
  numInput.dispatchEvent(wheelEvt)

  assert.equal(defaultPrevented, true, 'preventDefault must be called on wheel event on number input')
  assert.equal(numInput.blurred, true, 'input.blur() must be called on wheel event on number input')
  console.log('  ✓ Focused number input prevents wheel event default and triggers blur')

  cleanup()
}

// Test 2: Unfocused element / non-number inputs do not get wheel interception
{
  const mockDoc = new MockDocument()
  const mockWin = new MockEventTarget()
  const cleanup = setupNumberInputScrollPrevention(mockWin, mockDoc)

  const textInput = new MockElement('INPUT', 'text')
  mockDoc.dispatchEvent({ type: 'focusin', target: textInput })

  let defaultPrevented = false
  const wheelEvt = {
    type: 'wheel',
    target: textInput,
    cancelable: true,
    preventDefault() {
      defaultPrevented = true
    }
  }

  textInput.dispatchEvent(wheelEvt)
  assert.equal(defaultPrevented, false, 'preventDefault must NOT be called on text input')
  assert.equal(textInput.blurred, false, 'textInput must NOT be blurred on wheel')
  console.log('  ✓ Text inputs are not affected by wheel listener')

  cleanup()
}

// Test 3: Focusout cleans up wheel listener on the input
{
  const mockDoc = new MockDocument()
  const mockWin = new MockEventTarget()
  const cleanup = setupNumberInputScrollPrevention(mockWin, mockDoc)

  const numInput = new MockElement('INPUT', 'number')
  mockDoc.dispatchEvent({ type: 'focusin', target: numInput })
  assert.equal(numInput.listeners['wheel']?.length, 1, 'Wheel listener added on focusin')

  mockDoc.dispatchEvent({ type: 'focusout', target: numInput })
  assert.equal(numInput.listeners['wheel']?.length, 0, 'Wheel listener removed on focusout')
  console.log('  ✓ Focusout properly removes wheel event listener from number input')

  cleanup()
}

// Test 4: Scrolling elsewhere while number input is active triggers blur
{
  const mockDoc = new MockDocument()
  const mockWin = new MockEventTarget()
  const cleanup = setupNumberInputScrollPrevention(mockWin, mockDoc)

  const numInput = new MockElement('INPUT', 'number')
  mockDoc.activeElement = numInput

  // Wheel occurs on window/container while number input is activeElement
  mockWin.dispatchEvent({ type: 'wheel' })
  assert.equal(numInput.blurred, true, 'Active number input is blurred when window wheel event occurs')
  console.log('  ✓ Window wheel event blurs active number input when scrolling off-target')

  cleanup()
}

// Test 5: Scrolling on window when activeElement is not a number input does not blur it
{
  const mockDoc = new MockDocument()
  const mockWin = new MockEventTarget()
  const cleanup = setupNumberInputScrollPrevention(mockWin, mockDoc)

  const textInput = new MockElement('INPUT', 'text')
  mockDoc.activeElement = textInput

  mockWin.dispatchEvent({ type: 'wheel' })
  assert.equal(textInput.blurred, false, 'Non-number activeElement is not blurred by window wheel event')
  console.log('  ✓ Window wheel event preserves focus on non-number inputs')

  cleanup()
}

// Test 6: Cleanup removes all document and window listeners
{
  const mockDoc = new MockDocument()
  const mockWin = new MockEventTarget()
  const cleanup = setupNumberInputScrollPrevention(mockWin, mockDoc)

  assert.equal(mockDoc.listeners['focusin']?.length, 1)
  assert.equal(mockDoc.listeners['focusout']?.length, 1)
  assert.equal(mockWin.listeners['wheel']?.length, 1)

  cleanup()

  assert.equal(mockDoc.listeners['focusin']?.length, 0)
  assert.equal(mockDoc.listeners['focusout']?.length, 0)
  assert.equal(mockWin.listeners['wheel']?.length, 0)
  console.log('  ✓ Teardown function cleans up all document and window event listeners')
}

console.log('\n====================================================')
console.log('🎉 ALL NUMBER INPUT SCROLL PREVENTION TESTS PASSED!')
console.log('====================================================\n')
