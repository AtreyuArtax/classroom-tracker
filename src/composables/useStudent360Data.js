/**
 * src/composables/useStudent360Data.js
 *
 * The unified data bridge for the Student 360 feature. 
 * Combines behavior (useStudentDossier) and academics (useGradebook).
 */

import { ref, computed, watch } from 'vue'
import { useStudentDossier } from './useStudentDossier.js'
import * as gradebookService from '../db/gradebookService.js'

export function useStudent360Data(studentId, classId) {
  const dossier = useStudentDossier()
  
  // Selection State
  const loading = ref(true)

  // 1. Behavior & Attendance (Delegated)
  onMounted(async () => {
    loading.value = true
    await dossier.loadStudent(classId, studentId)
    // Here we could also fetch academic-specific details if needed
    loading.value = false
  })

  // 2. Academic Logic (Extracted from Grades.vue)
  
  /**
   * Calculates the category-specific grades for the student.
   * Expects the gradebook system (useGradebook) to be already loaded/refreshed.
   */
  const categoryStats = (activeClassRecord, assessments, grades) => {
    if (!activeClassRecord || !studentId) return []
    
    return activeClassRecord.gradebookCategories?.map(cat => {
      // Logic for calculating category performance...
      // This is often pre-calculated in classGrades[studentId].categories
      return {
        categoryId: cat.categoryId,
        name: cat.name,
        weight: cat.weight,
        // We'll pull these from the pre-calculated classGrades in the component
      }
    })
  }

  return {
    ...dossier,
    loading,
    categoryStats
  }
}
