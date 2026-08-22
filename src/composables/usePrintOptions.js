import { ref, computed } from 'vue'
import { isCohortMatch } from '../db/gradebook/gradeCalc.js'
import { getStudentEffectiveGrade } from './useElementary.js'

/**
 * Composable for standardized print options, sub-cohort (split class/section) extraction,
 * student list filtering, and header metadata formatting.
 *
 * @param {import('vue').Ref<Object> | Object} classRecordRef - The active class record object
 * @param {import('vue').Ref<string> | string} initialCohortRef - Optional initial cohort selection (e.g. 'all', 'Grade 7', 'SCH3U-01')
 */
export function usePrintOptions(classRecordRef, initialCohortRef = 'all') {
  const selectedCohort = ref(typeof initialCohortRef === 'string' ? initialCohortRef : initialCohortRef?.value || 'all')

  const getClassRecord = () => {
    return classRecordRef && typeof classRecordRef === 'object' && 'value' in classRecordRef
      ? classRecordRef.value
      : classRecordRef
  }

  const isElementary = computed(() => {
    const cls = getClassRecord()
    return cls?.classType === 'elementary'
  })

  const cohortTypeLabel = computed(() => {
    return isElementary.value ? 'Grade' : 'Section'
  })

  /**
   * List of available sub-cohort tags e.g. ['all', 'Grade 7', 'Grade 8'] or ['all', 'SCH3U', 'SPH4U']
   */
  const availableSubCohorts = computed(() => {
    const cls = getClassRecord()
    if (!cls || !cls.students) return ['all']

    const cohorts = new Set()
    const isElem = isElementary.value

    Object.values(cls.students).forEach(st => {
      if (st.archived) return
      const tag = isElem 
        ? (getStudentEffectiveGrade(st, cls.activeSubjectId) || st.gradeLevel)
        : st.courseCode
      if (tag && tag.trim()) cohorts.add(tag.trim())
    })

    if (cohorts.size <= 1) return ['all']

    return ['all', ...Array.from(cohorts).sort()]
  })

  const isSplitClass = computed(() => {
    return availableSubCohorts.value.length > 1
  })

  /**
   * Filter active students by the selected cohort option.
   *
   * @param {Array<Object>} studentsList - List of student objects (with studentId, lastName, gradeLevel, courseCode, archived)
   * @param {string} cohortFilter - Selected cohort tag ('all', 'Grade 7', 'SCH3U', etc.)
   * @returns {Array<Object>} Filtered and sorted student list
   */
  const filterStudents = (studentsList, cohortFilter = selectedCohort.value) => {
    if (!Array.isArray(studentsList)) return []
    const isElem = isElementary.value
    const cls = getClassRecord()

    return studentsList
      .filter(s => !s.archived)
      .filter(s => {
        if (!cohortFilter || cohortFilter === 'all') return true
        const tag = isElem 
          ? (getStudentEffectiveGrade(s, cls?.activeSubjectId) || s.gradeLevel)
          : s.courseCode
        return isCohortMatch(tag, cohortFilter)
      })
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
  }

  /**
   * Build unified subheader string for print header
   *
   * @param {string} [titlePrefix] - Optional prefix
   * @returns {string} Formatted subheader string
   */
  const getSubheader = (titlePrefix = '') => {
    const cls = getClassRecord()
    if (!cls) return ''
    const parts = []

    if (cls.name) parts.push(cls.name)
    if (cls.courseCode && (!cls.courseSections || cls.courseSections.length <= 1)) {
      parts.push(cls.courseCode)
    }
    if (cls.periodNumber) parts.push(`Period ${cls.periodNumber}`)

    if (selectedCohort.value && selectedCohort.value !== 'all') {
      parts.push(`${cohortTypeLabel.value}: ${selectedCohort.value}`)
    } else if (isSplitClass.value) {
      parts.push(`All ${cohortTypeLabel.value}s`)
    }

    if (titlePrefix) {
      return `${titlePrefix} | ${parts.join(' - ')}`
    }
    return parts.join(' - ')
  }

  return {
    selectedCohort,
    isElementary,
    cohortTypeLabel,
    availableSubCohorts,
    isSplitClass,
    filterStudents,
    getSubheader
  }
}

/**
 * Safely trigger browser printing with targeted @page orientation and automatic cleanup.
 * Prevents global CSS cross-contamination across modal dialogs.
 *
 * @param {Object} options
 * @param {'portrait' | 'landscape' | 'auto'} [options.orientation='portrait'] - Print orientation
 * @param {string} [options.margin='10mm'] - Page margins
 * @param {Function} [options.onDone] - Callback after print dialog finishes/closes
 */
export function executePrint({ orientation = 'portrait', margin = '10mm', onDone } = {}) {
  const existing = document.getElementById('dynamic-print-orientation-style')
  if (existing) existing.remove()

  const styleEl = document.createElement('style')
  styleEl.id = 'dynamic-print-orientation-style'
  styleEl.innerHTML = `@page { size: ${orientation}; margin: ${margin}; }`
  document.head.appendChild(styleEl)

  let cleanedUp = false
  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    const el = document.getElementById('dynamic-print-orientation-style')
    if (el) el.remove()
    window.removeEventListener('afterprint', cleanup)
    if (typeof onDone === 'function') onDone()
  }

  window.addEventListener('afterprint', cleanup, { once: true })

  window.print()

  // Safety fallback cleanup in case afterprint does not fire in certain webviews
  setTimeout(cleanup, 1000)
}
