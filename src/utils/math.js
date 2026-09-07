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

/**
 * Validates and converts input to a finite number, or returns fallback.
 * Prevents NaN or Infinity from propagating into calculations.
 *
 * @param {any} value
 * @param {number|null} [fallback=null]
 * @returns {number|null}
 */
export function ensureFiniteNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return fallback
  return num
}

/**
 * Sums an array or iterable of values safely.
 * Coerces elements with Number(v) to strictly prevent string concatenation (e.g. "80" + "90" -> "8090").
 * Filters out null, undefined, NaN, and non-finite values.
 *
 * @param {Array<any>} values
 * @returns {number}
 */
export function safeSum(values) {
  if (!values || !Array.isArray(values) || values.length === 0) return 0
  return values.reduce((accum, val) => {
    if (val === null || val === undefined || val === '') return accum
    const num = Number(val)
    if (isNaN(num) || !isFinite(num)) return accum
    return accum + num
  }, 0)
}

/**
 * Calculates the arithmetic mean of an array safely.
 * Returns null if no valid finite numbers exist, guarding against division by zero.
 *
 * @param {Array<any>} values
 * @param {number} [decimals=1]
 * @returns {number|null}
 */
export function safeMean(values, decimals = 1) {
  if (!values || !Array.isArray(values) || values.length === 0) return null
  const valid = values
    .map(v => ensureFiniteNumber(v))
    .filter(v => v !== null)
  if (valid.length === 0) return null
  const sum = valid.reduce((a, b) => a + b, 0)
  return preciseRound(sum / valid.length, decimals)
}

/**
 * Performs division safely, guarding against 0, NaN, and Infinity in numerator or denominator.
 *
 * @param {any} numerator
 * @param {any} denominator
 * @param {number|null} [decimals=null]
 * @returns {number|null}
 */
export function safeDivide(numerator, denominator, decimals = null) {
  const num = ensureFiniteNumber(numerator)
  const den = ensureFiniteNumber(denominator)
  if (num === null || den === null || den === 0) return null
  const result = num / den
  if (!isFinite(result)) return null
  return decimals !== null ? preciseRound(result, decimals) : result
}
