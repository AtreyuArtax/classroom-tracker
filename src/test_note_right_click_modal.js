/**
 * src/test_note_right_click_modal.js
 *
 * Test suite ensuring that right-clicking inside note modals
 * (for spell check / context menu) does not close the modal,
 * and that notes are properly persisted.
 */

import fs from 'node:fs'
import path from 'node:path'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ ${message}`)
  } else {
    failedTests++
    console.error(`  ❌ FAILED: ${message}`)
  }
}

console.log('=================================================================')
console.log('🧪 Note Entry Modal & Right-Click Spellcheck Safety Test Suite')
console.log('=================================================================\n')

// Test Group 1: GradesAttemptHistoryModal Template & Event Handling
console.log('Test Group 1: GradesAttemptHistoryModal Template & Event Handling')
const attemptModalPath = path.resolve('src/components/grades/GradesAttemptHistoryModal.vue')
const attemptModalContent = fs.readFileSync(attemptModalPath, 'utf8')

assert(
  !attemptModalContent.includes('@contextmenu.prevent="handleBackdropClick"'),
  'Backdrop does not intercept or prevent contextmenu events (which would close modal on right-click)'
)

assert(
  attemptModalContent.includes('<div class="attempt-modal-container" @click.stop @contextmenu.stop>'),
  'Modal container stops contextmenu propagation so right-clicks inside do not bubble to backdrop'
)

assert(
  attemptModalContent.includes('@input="handleCommentInput(att.attemptId, $event.target.value)"'),
  'Note textarea listens to input events for immediate/debounced note capture'
)

assert(
  attemptModalContent.includes('flushPendingComments()'),
  'Modal flushes pending comments on close, unmount, and show transitions so edits are never lost'
)

// Test Group 2: GradesExpectationStudentModal Template & Event Handling
console.log('\nTest Group 2: GradesExpectationStudentModal Template & Event Handling')
const expModalPath = path.resolve('src/components/grades/GradesExpectationStudentModal.vue')
const expModalContent = fs.readFileSync(expModalPath, 'utf8')

assert(
  !expModalContent.includes('@contextmenu.prevent="handleClose"'),
  'Expectation modal backdrop does not intercept or prevent contextmenu events'
)

assert(
  expModalContent.includes('<div class="exp-modal-container" @click.stop @contextmenu.stop>'),
  'Expectation modal container stops contextmenu propagation'
)

assert(
  expModalContent.includes('await saveNoteIfOverridden()') && expModalContent.includes('async function handleClose'),
  'Closing expectation modal saves any pending override teacher note'
)

// Test Group 3: StudentAcademicsTab Attempts Popover
console.log('\nTest Group 3: StudentAcademicsTab Attempts Popover')
const academicsTabPath = path.resolve('src/components/dossier/StudentAcademicsTab.vue')
const academicsTabContent = fs.readFileSync(academicsTabPath, 'utf8')

assert(
  !academicsTabContent.includes('@contextmenu.prevent="attemptsPopover = null"'),
  'Academics Tab attempts popover backdrop does not intercept contextmenu events'
)

assert(
  academicsTabContent.includes('class="attempts-popover"') && academicsTabContent.includes('@contextmenu.stop'),
  'Academics Tab attempts popover stops contextmenu propagation'
)

console.log('\n=================================================================')
console.log(`Results: ${passedTests} passed, ${failedTests} failed out of ${totalTests} total tests`)
console.log('=================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL NOTE RIGHT-CLICK MODAL TESTS PASSED!\n')
}
