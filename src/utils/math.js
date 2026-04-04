/**
 * src/utils/math.js
 *
 * Centralized Mathematical utilities for precise grading.
 */

/**
 * Ontario-Standard Precision Rounding.
 * Rounds to 1 decimal place safely using epsilon to avoid floating point errors.
 * 
 * @param {number|null} value 
 * @param {number} decimals 
 * @returns {number|null}
 */
export function preciseRound(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return null
  const factor = Math.pow(10, decimals)
  // epsilon-adjustment to handle floating-point drift (e.g., 1.005 -> 1.01)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Percent variation helper for analytics.
 */
export function calculatePercentChange(oldVal, newVal) {
  if (oldVal === null || newVal === null || isNaN(oldVal) || isNaN(newVal)) return null
  if (oldVal === 0) return newVal > 0 ? 100 : 0
  return preciseRound(((newVal - oldVal) / oldVal) * 100)
}
