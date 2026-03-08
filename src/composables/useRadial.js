/**
 * src/composables/useRadial.js
 *
 * Manages radial menu open/close/selection state.
 *
 * CLAUDE.md §7 rules:
 *  - Radial menu is the ONLY event entry point
 *  - Centre button: cancel in first-level mode, go-back in sub mode
 *  - Toggle-type codes render with distinct active style when student is out
 *  - Tap-outside closes without logging
 *
 * Layout (Update 01):
 *  The first level is a HYBRID list:
 *    - Codes in DIRECT_CATEGORIES appear directly (no sub-menu required)
 *    - Codes in DRILLDOWN_CATEGORIES appear as a single category button
 *      whose tap opens a sub-radial for that category
 *  The 👤 Profile button is always visible on the first level ONLY —
 *  it is hidden in sub mode (handled in RadialMenu.vue).
 *
 * Current category assignments:
 *  Direct (first level):   neutral (Washroom), redirect (On Device), communication (Parent Contact)
 *  Drill-down (sub-menu):  positive (Participation), note (Observation, Conversation), attendance (Absent, Late)
 *
 * viewMode:
 *  'first' — hybrid first level
 *  'sub'   — codes filtered to activeCategory
 */

import { ref, computed } from 'vue'

// ─── layout configuration ──────────────────────────────────────────────────────


// ─── module-level singleton state ─────────────────────────────────────────────

/** Whether the radial overlay is currently visible */
const isOpen = ref(false)

/**
 * The student for whom the radial is currently open.
 * @type {import('vue').Ref<{ studentId: string, classId: string, activeStates: Object } | null>}
 */
const targetStudent = ref(null)

/**
 * Current view mode:
 *  'first' — hybrid first level (direct codes + category buttons)
 *  'sub'   — codes filtered to the selected category
 */
const viewMode = ref('first')

/** The category key currently drilled into (used when viewMode === 'sub') */
const activeCategory = ref(null)

/**
 * All available behavior codes, set when the radial is opened.
 * Array of { codeKey, icon, label, category, type, requiresNote }
 * @type {import('vue').Ref<Array>}
 */
const allCodes = ref([])

// ─── pending note + profile state (Update 01) ─────────────────────────────────

/**
 * When a requiresNote code is tapped, this is set to the code object.
 * Dashboard watches this to open EventNoteModal.
 * Reset to null after the event is logged or cancelled.
 */
const pendingNoteCode = ref(null)

/**
 * The student for a pending note event. Paired with pendingNoteCode.
 */
const pendingNoteStudent = ref(null)

/**
 * Set when the 👤 Profile button is tapped.
 * Dashboard watches this to open StudentProfileModal.
 * Reset to null after Dashboard opens the modal.
 */
const profileStudent = ref(null)

// ─── computed ─────────────────────────────────────────────────────────────────

/**
 * Items to display in the current radial ring.
 *
 * 'first' mode — hybrid list:
 *   Each item is either:
 *     { isCategory: false, codeKey, icon, label, category, type, requiresNote }
 *     { isCategory: true,  categoryKey, icon, label }
 *
 * 'sub' mode — flat list of code objects for activeCategory only.
 */
const visibleItems = computed(() => {
    if (viewMode.value === 'sub') {
        return allCodes.value.filter(c => c.category === activeCategory.value)
    }

    // 'first' mode: build the hybrid list
    const firstLevel = []
    const categoryButtonsSeen = new Set()

    for (const code of allCodes.value) {
        if (code.isTopLevel === true) {
            // Direct code — show on first level as-is
            firstLevel.push({ ...code, isCategory: false })
        } else {
            // Category drill-down — show one button per category
            if (!categoryButtonsSeen.has(code.category)) {
                categoryButtonsSeen.add(code.category)
                firstLevel.push({
                    isCategory: true,
                    categoryKey: code.category,
                    label: _categoryLabel(code.category),
                    icon: code.icon,
                })
            }
        }
    }

    return firstLevel
})

/** True if the centre button should go-back (sub mode) vs close (first level) */
const centreGoesBack = computed(() => viewMode.value === 'sub')

/** True if the 👤 Profile button should be rendered (first level only) */
const showProfile = computed(() => viewMode.value === 'first')

// ─── actions ──────────────────────────────────────────────────────────────────

/**
 * Open the radial for a given student.
 *
 * @param {{ studentId: string, classId: string, activeStates: Object }} student
 * @param {Array<{ codeKey: string, icon: string, label: string, category: string, type: string, requiresNote: boolean }>} codes
 */
function open(student, codes) {
    targetStudent.value = student
    allCodes.value = codes
    activeCategory.value = null
    viewMode.value = 'first'
    isOpen.value = true
}

/**
 * Close the radial entirely (no event logged).
 */
function close() {
    isOpen.value = false
    targetStudent.value = null
    activeCategory.value = null
    viewMode.value = 'first'
    allCodes.value = []
}

/**
 * Handle a tap on the centre button.
 *  - If in 'sub' mode → go back to first level
 *  - Otherwise → close entirely
 */
function handleCentre() {
    if (viewMode.value === 'sub') {
        viewMode.value = 'first'
        activeCategory.value = null
    } else {
        close()
    }
}

/**
 * Handle a tap on one of the ring items.
 *
 * Category items drill into sub mode (return null).
 * Direct codes with requiresNote set pendingNote refs and close (return null).
 * Direct codes without requiresNote return { student, code } for immediate logging.
 *
 * @param {Object} item
 * @returns {{ student: Object, code: Object } | null}
 */
function handleItemTap(item) {
    if (item.isCategory) {
        // Drill into the selected category
        activeCategory.value = item.categoryKey
        viewMode.value = 'sub'
        return null
    }

    // Concrete code tapped (either from first level or sub level)
    const student = targetStudent.value
    const code = item

    if (code.requiresNote) {
        close()
        pendingNoteCode.value = code
        pendingNoteStudent.value = student
        return null
    }

    close()
    return { student, code }
}

/**
 * Handle a tap on the permanent 👤 Profile button.
 * Closes the radial and sets profileStudent so Dashboard can open the modal.
 */
function handleProfileTap() {
    const student = targetStudent.value
    close()
    profileStudent.value = student
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function _categoryLabel(category) {
    const map = {
        positive: 'Positive',
        redirect: 'Redirect',
        neutral: 'Neutral',
        note: 'Notes',
        communication: 'Contact',
        attendance: 'Attendance',
    }
    return map[category] ?? category
}

// ─── export ───────────────────────────────────────────────────────────────────
export function useRadial() {
    return {
        // state
        isOpen,
        targetStudent,
        viewMode,
        activeCategory,
        visibleItems,
        centreGoesBack,
        showProfile,
        // update 01: pending note + profile
        pendingNoteCode,
        pendingNoteStudent,
        profileStudent,
        // actions
        open,
        close,
        handleCentre,
        handleItemTap,
        handleProfileTap,
    }
}
