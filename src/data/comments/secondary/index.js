/**
 * src/data/comments/secondary/index.js
 *
 * Central registry for Ontario High School Curriculum Competencies.
 * Modularized by course for clarity, scalability, and ease of adding new courses.
 */

import { SPH3U_COMPETENCIES } from './sph3u.js'
import { SNC1W_COMPETENCIES } from './snc1w.js'
import { SBI3U_COMPETENCIES } from './sbi3u.js'
import { SCH3U_COMPETENCIES } from './sch3u.js'
import { SPH4U_COMPETENCIES } from './sph4u.js'
import { SNC2D_COMPETENCIES } from './snc2d.js'
import { MTH1W_COMPETENCIES } from './mth1w.js'
import { MPM2D_COMPETENCIES } from './mpm2d.js'

export const COURSE_COMPETENCIES = {
  SPH3U: SPH3U_COMPETENCIES,
  SNC1W: SNC1W_COMPETENCIES,
  SBI3U: SBI3U_COMPETENCIES,
  SCH3U: SCH3U_COMPETENCIES,
  SPH4U: SPH4U_COMPETENCIES,
  SNC2D: SNC2D_COMPETENCIES,
  SNC2P: SNC2D_COMPETENCIES,
  MTH1W: MTH1W_COMPETENCIES,
  MPM2D: MPM2D_COMPETENCIES,
  MFM2P: MPM2D_COMPETENCIES
}

export const DEPARTMENT_FALLBACKS = {
  science: [
    { label: 'Scientific Inquiry & Investigation', phrase: 'conducting controlled investigations and analyzing experimental data', keywords: ['inquiry', 'lab', 'investigation', 'experiment'] },
    { label: 'Conceptual Understanding & Models', phrase: 'interpreting core scientific principles and evaluating theoretical models', keywords: ['theory', 'model', 'concept', 'understanding'] },
    { label: 'Quantitative Problem Solving', phrase: 'applying mathematical formulas and scientific conventions to multi-step problems', keywords: ['problem', 'calculation', 'quantitative', 'formula'] }
  ],
  math: [
    { label: 'Algebraic & Numeric Problem Solving', phrase: 'applying algebraic methods and communicating logical steps clearly', keywords: ['algebra', 'equation', 'solve', 'numeric'] },
    { label: 'Graphical & Relational Analysis', phrase: 'interpreting algebraic and graphical models with precision', keywords: ['graph', 'function', 'relation', 'model'] }
  ]
}

export {
  SPH3U_COMPETENCIES,
  SNC1W_COMPETENCIES,
  SBI3U_COMPETENCIES,
  SCH3U_COMPETENCIES,
  SPH4U_COMPETENCIES,
  SNC2D_COMPETENCIES,
  MTH1W_COMPETENCIES,
  MPM2D_COMPETENCIES
}
