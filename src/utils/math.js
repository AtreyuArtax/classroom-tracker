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
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return null
  const factor = Math.pow(10, decimals)
  // epsilon-adjustment to handle floating-point drift (e.g., 1.005 -> 1.01)
  return Math.round((num + Number.EPSILON) * factor) / factor
}

/**
 * Percent variation helper for analytics.
 */
export function calculatePercentChange(oldVal, newVal) {
  if (oldVal === null || newVal === null || oldVal === '' || newVal === '') return null
  const numOld = Number(oldVal)
  const numNew = Number(newVal)
  if (isNaN(numOld) || isNaN(numNew) || !isFinite(numOld) || !isFinite(numNew)) return null
  if (numOld === 0) return numNew > 0 ? 100 : 0
  return preciseRound(((numNew - numOld) / numOld) * 100)
}
