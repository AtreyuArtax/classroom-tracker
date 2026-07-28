/**
 * src/composables/useUndo.js
 *
 * View-scoped, in-memory Undo & Redo stacks (LIFO depth: 10).
 * Cleared on page refresh or view switching — intentional.
 */

import { ref, computed } from 'vue'
import { useMessage } from './useMessage.js'

const STACK_DEPTH = 10

// ─── module-level singleton stacks ──────────────────────────────────────────────
/** @type {import('vue').Ref<Array<{undo: () => Promise<void>, redo: (() => Promise<void>)|null}>>} */
const _undoStack = ref([])
/** @type {import('vue').Ref<Array<{undo: () => Promise<void>, redo: (() => Promise<void>)|null}>>} */
const _redoStack = ref([])

/**
 * Push an undo/redo operation onto the stack.
 *
 * @param {() => Promise<void>} inverseFn Function that reverts the action
 * @param {(() => Promise<void>)|null} redoFn Optional function that re-applies the action
 */
function push(inverseFn, redoFn = null) {
    if (_undoStack.value.length >= STACK_DEPTH) {
        _undoStack.value.shift() // drop oldest
    }
    _undoStack.value.push({ undo: inverseFn, redo: redoFn })
    _redoStack.value = [] // New action invalidates redo history
}

/**
 * Execute and remove the most-recent inverse operation.
 */
async function undo() {
    if (_undoStack.value.length === 0) return
    const entry = _undoStack.value.pop()
    try {
        await entry.undo()
        _redoStack.value.push(entry)
    } catch (err) {
        console.error('Undo operation failed:', err)
        const { alert } = useMessage()
        await alert('Failed to undo the last action.')
        _undoStack.value.push(entry)
    }
}

/**
 * Re-apply the most-recently undone operation.
 */
async function redo() {
    if (_redoStack.value.length === 0) return
    const entry = _redoStack.value.pop()
    try {
        if (entry.redo) {
            await entry.redo()
        }
        _undoStack.value.push(entry)
    } catch (err) {
        console.error('Redo operation failed:', err)
        const { alert } = useMessage()
        await alert('Failed to redo the action.')
        _redoStack.value.push(entry)
    }
}

/**
 * Clear undo and redo stacks (called on view switch, class change, etc.).
 */
function clear() {
    _undoStack.value = []
    _redoStack.value = []
}

/** Whether there is anything to undo. */
const canUndo = computed(() => _undoStack.value.length > 0)
/** Whether there is anything to redo. */
const canRedo = computed(() => _redoStack.value.length > 0)

// ─── global shortcut listener (Cmd+Z / Ctrl+Z & Cmd+Shift+Z / Ctrl+Y) ─────────
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
        const isCmdOrCtrl = e.metaKey || e.ctrlKey
        if (!isCmdOrCtrl) return

        const key = e.key.toLowerCase()
        const isShift = e.shiftKey

        // Check if user is typing inside an active text input/textarea vs inline grade grid cell
        const target = e.target
        const isInlineGridInput = target && target.classList && (
            target.classList.contains('grades__input-inline') ||
            target.classList.contains('cell-edit-input')
        )
        const isEditingText = target && !isInlineGridInput && (
            target.tagName === 'INPUT' || 
            target.tagName === 'TEXTAREA' || 
            target.isContentEditable
        )
        if (isEditingText) return

        if (isInlineGridInput && target.blur) {
            target.blur()
        }

        if (key === 'z' && isShift) {
            // Cmd+Shift+Z => Redo
            if (canRedo.value) {
                e.preventDefault()
                redo()
            }
        } else if (key === 'y' && !isShift) {
            // Cmd+Y / Ctrl+Y => Redo
            if (canRedo.value) {
                e.preventDefault()
                redo()
            }
        } else if (key === 'z' && !isShift) {
            // Cmd+Z / Ctrl+Z => Undo
            if (canUndo.value) {
                e.preventDefault()
                undo()
            }
        }
    })
}

// ─── export ────────────────────────────────────────────────────────────────────
export function useUndo() {
    return { push, undo, redo, clear, canUndo, canRedo }
}
