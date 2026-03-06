/**
 * src/composables/useRadial.js
 *
 * Manages radial menu open/close/selection state.
 *
 * CLAUDE.md §7 rules:
 *  - Radial menu is the ONLY event entry point
 *  - Up to 6 items displayed in a circle; centre button cancels/closes
 *  - When codes exceed 6: show one button per category (category mode)
 *    - Tapping category opens sub-radial for that category
 *    - Centre button returns to category view (NOT close)
 *    - Outermost tap always closes entirely
 *  - Category drill-down must be implemented from day one, not deferred
 *  - Toggle-type codes render with distinct active style when student is out
 *
 * This composable is a singleton — module-level reactive state is shared
 * so only one radial can ever be open at a time.
 */

import { ref, computed } from 'vue'

// ─── constants ────────────────────────────────────────────────────────────────
const MAX_FLAT_ITEMS = 6

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
 *  'flat'     — show all codes directly (≤ MAX_FLAT_ITEMS codes)
 *  'category' — show one button per category (> MAX_FLAT_ITEMS codes)
 *  'sub'      — show codes for the selected category
 */
const viewMode = ref('flat') // 'flat' | 'category' | 'sub'

/** The category key currently drilled into (used when viewMode === 'sub') */
const activeCategory = ref(null)

/**
 * All available behavior codes, set when the radial is opened.
 * Array of { codeKey, icon, label, category, type }
 * @type {import('vue').Ref<Array>}
 */
const allCodes = ref([])

// ─── computed ─────────────────────────────────────────────────────────────────

/**
 * The items to display in the current radial ring, depending on viewMode.
 * Each item: { codeKey, icon, label, category, type }  (flat/sub)
 *         or { categoryKey, label, icon }               (category)
 */
const visibleItems = computed(() => {
    if (viewMode.value === 'flat') {
        return allCodes.value
    }

    if (viewMode.value === 'category') {
        // One entry per unique category, with an aggregated label/icon
        const seen = new Map()
        for (const code of allCodes.value) {
            if (!seen.has(code.category)) {
                seen.set(code.category, {
                    categoryKey: code.category,
                    label: _categoryLabel(code.category),
                    icon: code.icon, // first code's icon as representative
                })
            }
        }
        return [...seen.values()]
    }

    if (viewMode.value === 'sub') {
        return allCodes.value.filter(c => c.category === activeCategory.value)
    }

    return []
})

/** True if the centre button should go-back (sub-mode) vs close (flat/category) */
const centreGoesBack = computed(() => viewMode.value === 'sub')

// ─── actions ──────────────────────────────────────────────────────────────────

/**
 * Open the radial for a given student.
 *
 * @param {{ studentId: string, classId: string, activeStates: Object }} student
 * @param {Array<{ codeKey: string, icon: string, label: string, category: string, type: string }>} codes
 */
function open(student, codes) {
    targetStudent.value = student
    allCodes.value = codes
    activeCategory.value = null

    // Choose initial view mode based on the number of codes
    viewMode.value = codes.length <= MAX_FLAT_ITEMS ? 'flat' : 'category'

    isOpen.value = true
}

/**
 * Close the radial entirely (no event logged).
 */
function close() {
    isOpen.value = false
    targetStudent.value = null
    activeCategory.value = null
    viewMode.value = 'flat'
    allCodes.value = []
}

/**
 * Handle a tap on the centre button.
 *  - If in 'sub' mode → go back to category view
 *  - Otherwise → close entirely
 */
function handleCentre() {
    if (viewMode.value === 'sub') {
        viewMode.value = 'category'
        activeCategory.value = null
    } else {
        close()
    }
}

/**
 * Handle a tap on one of the ring items.
 *
 * @param {Object} item  Either a code object or a category object
 * @returns {{ student: Object, code: Object } | null}
 *   Returns the resolved { student, code } when a leaf code was selected,
 *   null when drilling into a category.
 */
function handleItemTap(item) {
    if (viewMode.value === 'category') {
        // Drill into the selected category
        activeCategory.value = item.categoryKey
        viewMode.value = 'sub'
        return null
    }

    // 'flat' or 'sub' — a concrete code was chosen
    const student = targetStudent.value
    const code = item
    close()
    return { student, code }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function _categoryLabel(category) {
    const map = {
        positive: 'Positive',
        redirect: 'Redirect',
        neutral: 'Neutral',
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
        // actions
        open,
        close,
        handleCentre,
        handleItemTap,
    }
}
