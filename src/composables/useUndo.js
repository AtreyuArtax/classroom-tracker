/**
 * src/composables/useUndo.js
 *
 * In-memory undo stack. Never persisted to IndexedDB.
 * CLAUDE.md §9 rules:
 *  - Stack depth: 10. Drop oldest when full.
 *  - Cleared on page refresh — intentional.
 *  - Lives here, not distributed across components.
 *
 * Each stack entry is a plain async function (the inverse operation closure).
 * The composable is a singleton — exported as a module-level instance so
 * every component that imports it shares the same stack.
 *
 * Stack operations by action (CLAUDE.md §9):
 *  | Action                | Push to stack                                              |
 *  |-----------------------|------------------------------------------------------------|
 *  | Log standard event    | () => deleteEvent(eventId)                                 |
 *  | Toggle washroom OUT   | () => clearStudentActiveState(classId, studentId)          |
 *  | Toggle washroom IN    | () => setStudentActiveState(..., previousState)            |
 *  |                       |     + deleteEvent(eventId)   (compound closure)            |
 *  |                       |     NOTE: previousState must include original outTime      |
 *  | Assign to seat        | () => updateStudentSeat(classId, studentId, null)          |
 *  | Move between seats    | () => updateStudentSeat(classId, studentId, previousSeat)  |
 */

import { ref, computed } from 'vue'

const STACK_DEPTH = 10

// ─── module-level singleton ────────────────────────────────────────────────────
/** @type {import('vue').Ref<Array<() => Promise<void>>>} */
const _stack = ref([])

/**
 * Push a new inverse-operation closure onto the undo stack.
 * Drops the oldest entry when the stack is full.
 *
 * @param {() => Promise<void>} inverseFn
 */
function push(inverseFn) {
    if (_stack.value.length >= STACK_DEPTH) {
        _stack.value.shift() // drop oldest
    }
    _stack.value.push(inverseFn)
}

/**
 * Execute and remove the most-recent inverse operation.
 * No-ops if the stack is empty.
 *
 * @returns {Promise<void>}
 */
async function undo() {
    if (_stack.value.length === 0) return
    const inverseFn = _stack.value.pop()
    await inverseFn()
}

/**
 * Clear the entire stack (called after class switch, etc.).
 */
function clear() {
    _stack.value = []
}

/** Whether there is anything to undo. */
const canUndo = computed(() => _stack.value.length > 0)

// ─── export ────────────────────────────────────────────────────────────────────
export function useUndo() {
    return { push, undo, clear, canUndo }
}
