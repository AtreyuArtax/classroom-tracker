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
  if (sd < 5) return '#15803d'   // Dark Green
  if (sd <= 12) return '#1d4ed8' // Dark Blue
  if (sd <= 18) return '#b45309' // Dark Amber
  return '#b91c1c'               // Dark Red
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
  if (grade >= 80) return '#1a6b3a' // muted green
  if (grade >= 70) return '#1a5276' // muted blue
  if (grade >= 60) return '#7d6608' // muted amber
  return '#c0392b' // muted red
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
  if (percent >= 80) return '#15803d' // Dark Green
  if (percent >= 70) return '#1d4ed8' // Dark Blue
  if (percent >= 60) return '#b45309' // Dark Amber
  return '#b91c1c'               // Dark Red
}
