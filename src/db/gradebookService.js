/**
 * src/db/gradebookService.js
 *
 * Public API for the `assessments` and `grades` object stores.
 * Re-export barrel maintaining 100% backward compatibility.
 * Sub-modules reside under `src/db/gradebook/`.
 */

export * from './gradebook/assessmentService.js'
export * from './gradebook/gradeService.js'
export * from './gradebook/gradeCalc.js'
export * from './gradebook/gradeAnalytics.js'
