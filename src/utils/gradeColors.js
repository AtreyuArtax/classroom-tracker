/**
 * src/utils/gradeColors.js
 *
 * Centralized formatting and color helper functions for grades.
 */

export function getHeatColorHex(percent) {
  if (percent === null || percent === undefined) return '#6c757d'
  if (percent >= 80) return '#d4edda' // High (Green)
  if (percent >= 70) return '#d0e8f5' // Mid-High (Blue)
  if (percent >= 60) return '#fff3cd' // Mid-Low (Amber)
  return '#f8d7da' // Low (Red)
}

export function getSDColor(sd) {
  if (sd === null) return 'var(--text-secondary)'
  if (sd < 5) return 'var(--color-success-text, #10b981)'
  if (sd <= 12) return 'var(--color-attention-text, #3b82f6)'
  if (sd <= 18) return 'var(--color-warn-text, #f59e0b)'
  return 'var(--color-danger-text, #ef4444)'
}

export function getCoverageColor(percent) {
  if (percent >= 80) return 'var(--grade-high)'
  if (percent >= 50) return 'var(--grade-mid-high)'
  return 'var(--grade-mid-low)'
}

export function formatGrade(grade) {
  if (grade === null || grade === undefined) return '—'
  return Math.round(grade) + '%'
}

export function getGradeColor(score) {
  if (score === null || score === undefined) return 'var(--text-secondary)'
  if (score >= 80) return '#34c759'
  if (score >= 70) return '#30b0c7'
  if (score >= 60) return '#ff9500'
  return '#ff3b30'
}

export function getGradeColorMuted(grade) {
  if (grade === null || grade === undefined) return 'var(--text-secondary)'
  if (grade >= 80) return 'var(--color-success-text, #10b981)'
  if (grade >= 70) return 'var(--color-attention-text, #3b82f6)'
  if (grade >= 60) return 'var(--color-warn-text, #f59e0b)'
  return 'var(--color-danger-text, #ef4444)'
}

export function getHeatColor(percent) {
  if (percent === null || percent === undefined) return 'var(--bg-secondary)'
  if (percent >= 80) return 'var(--grade-high)'
  if (percent >= 70) return 'var(--grade-mid-high)'
  if (percent >= 60) return 'var(--grade-mid-low)'
  return 'var(--grade-low)'
}

export function getHeatTextColor(percent) {
  if (percent === null || percent === undefined) return 'var(--text-secondary)'
  if (percent >= 80) return 'var(--color-success-text, #10b981)'
  if (percent >= 70) return 'var(--color-attention-text, #3b82f6)'
  if (percent >= 60) return 'var(--color-warn-text, #f59e0b)'
  return 'var(--color-danger-text, #ef4444)'
}

export const UNIT_COLORS = [
  '#2563eb', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1'  // indigo
]

export const SECTION_BADGE_STYLE = {
  bg: 'rgba(59, 130, 246, 0.08)',
  border: 'rgba(59, 130, 246, 0.25)',
  text: '#2563eb',
  badgeBg: 'rgba(59, 130, 246, 0.12)',
  dot: '#2563eb'
}

export const SECTION_PALETTES = [SECTION_BADGE_STYLE]

export function getSectionColor() {
  return SECTION_BADGE_STYLE
}

