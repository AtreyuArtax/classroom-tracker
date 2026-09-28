/**
 * src/composables/useLearningSkills.js
 *
 * Composable for managing Ontario Growing Success Learning Skills & Work Habits.
 * Encapsulates learningSkillsService operations and re-exports constants and utilities
 * so UI components never touch db/ directly.
 */

import {
  LEARNING_SKILL_CATEGORIES,
  LEARNING_SKILL_LEVELS,
  LEARNING_SKILL_TERMS,
  LEVEL_MAP,
  hasLearningSkillsData,
  formatLearningSkillKey,
  getLearningSkillsByClassAndTerm as dbGetSkillsByClassAndTerm,
  getLearningSkillsByClass as dbGetSkillsByClass,
  getLearningSkillsByStudent as dbGetSkillsByStudent,
  saveLearningSkillsRecord as dbSaveSkillRecord,
  saveBatchLearningSkills as dbSaveBatchSkills,
  deleteLearningSkillsRecord as dbDeleteSkillRecord,
  deleteLearningSkillsByTerm as dbDeleteSkillsByTerm,
  exportLearningSkillsCsv,
  exportAllLearningSkillsCsv
} from '../db/learningSkillsService.js'

export {
  LEARNING_SKILL_CATEGORIES,
  LEARNING_SKILL_LEVELS,
  LEARNING_SKILL_TERMS,
  LEVEL_MAP,
  hasLearningSkillsData,
  formatLearningSkillKey,
  exportLearningSkillsCsv,
  exportAllLearningSkillsCsv
}

export async function getLearningSkillsByClassAndTerm(classId, term) {
  return dbGetSkillsByClassAndTerm(classId, term)
}

export async function getLearningSkillsByClass(classId) {
  return dbGetSkillsByClass(classId)
}

export async function getLearningSkillsByStudent(classId, studentId) {
  return dbGetSkillsByStudent(classId, studentId)
}

export async function saveLearningSkillsRecord(record) {
  return dbSaveSkillRecord(record)
}

export async function saveBatchLearningSkills(records) {
  return dbSaveBatchSkills(records)
}

export async function deleteLearningSkillsRecord(id) {
  return dbDeleteSkillRecord(id)
}

export async function deleteLearningSkillsByTerm(classId, term) {
  return dbDeleteSkillsByTerm(classId, term)
}

export function useLearningSkills() {
  return {
    LEARNING_SKILL_CATEGORIES,
    LEARNING_SKILL_LEVELS,
    LEARNING_SKILL_TERMS,
    LEVEL_MAP,
    hasLearningSkillsData,
    formatLearningSkillKey,
    getLearningSkillsByClassAndTerm,
    getLearningSkillsByClass,
    getLearningSkillsByStudent,
    saveLearningSkillsRecord,
    saveBatchLearningSkills,
    deleteLearningSkillsRecord,
    deleteLearningSkillsByTerm,
    exportLearningSkillsCsv,
    exportAllLearningSkillsCsv
  }
}
