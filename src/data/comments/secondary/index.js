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
    {
      label: 'Scientific Inquiry & Investigation',
      phrase: 'conducting controlled investigations and analyzing experimental data',
      phraseVariants: [
        'conducting controlled investigations and analyzing lab data',
        'designing fair scientific tests and interpreting evidence',
        'evaluating experimental data to support clear conclusions',
        'recording empirical observations and analyzing inquiry trends'
      ],
      shortTopics: [
        'controlled scientific investigations',
        'experimental data analysis',
        'evidence-based lab conclusions',
        'scientific inquiry methodology'
      ],
      tools: [
        'a structured claim-evidence-reasoning lab checklist',
        'a variable-control planning table for investigations',
        'a pre-submission unit and graph verification guide'
      ],
      keywords: ['inquiry', 'lab', 'investigation', 'experiment']
    },
    {
      label: 'Conceptual Understanding & Models',
      phrase: 'interpreting core scientific principles and evaluating theoretical models',
      phraseVariants: [
        'interpreting scientific principles and theoretical models',
        'connecting core course concepts to scientific models',
        'explaining scientific relationships with accurate terms',
        'applying theoretical frameworks to new scenarios'
      ],
      shortTopics: [
        'core scientific models and theory',
        'scientific principles and terminology',
        'conceptual scientific explanations',
        'connecting theory to real-world systems'
      ],
      tools: [
        'annotated concept-map summaries linking key terms',
        'a cause-and-effect science vocabulary reference card',
        'a self-check rubric for clear scientific explanations'
      ],
      keywords: ['theory', 'model', 'concept', 'understanding']
    },
    {
      label: 'Quantitative Problem Solving',
      phrase: 'applying mathematical formulas and scientific conventions to multi-step problems',
      phraseVariants: [
        'applying scientific formulas to multi-step problems',
        'organizing quantitative scientific steps and units',
        'verifying intermediate calculations and SI units',
        'solving multi-step scientific calculation problems'
      ],
      shortTopics: [
        'quantitative scientific problem solving',
        'multi-step formula calculations and units',
        'scientific conventions and calculations',
        'structured quantitative solutions'
      ],
      tools: [
        'a given-unknown-formula table tracking SI units',
        'a step-by-step calculation and rounding checklist',
        'worked exemplar solutions for multi-step problems'
      ],
      keywords: ['problem', 'calculation', 'quantitative', 'formula']
    }
  ],
  math: [
    {
      label: 'Algebraic & Numeric Problem Solving',
      phrase: 'applying algebraic methods and communicating logical steps clearly',
      phraseVariants: [
        'applying algebraic methods with clear logical steps',
        'solving multi-step algebraic and numeric problems',
        'verifying intermediate steps in mathematical solutions',
        'organizing mathematical calculations systematically'
      ],
      shortTopics: [
        'multi-step algebraic problem solving',
        'algebraic methods and logical steps',
        'numeric and algebraic calculations',
        'verifying mathematical solution steps'
      ],
      tools: [
        'a step-by-step algebraic solution and substitution check',
        'a formula reference card with worked sample steps',
        'a sign-and-operation verification checklist'
      ],
      keywords: ['algebra', 'equation', 'solve', 'numeric']
    },
    {
      label: 'Graphical & Relational Analysis',
      phrase: 'interpreting algebraic and graphical models with precision',
      phraseVariants: [
        'interpreting algebraic and graphical mathematical models',
        'connecting tables, graphs, and equations accurately',
        'translating word problems into mathematical models',
        'evaluating graphical features and trends precisely'
      ],
      shortTopics: [
        'algebraic and graphical models',
        'connecting equations, tables, and graphs',
        'modelling mathematical relationships',
        'graphical trend interpretation'
      ],
      tools: [
        'a rule-of-four organizer linking tables, graphs, and equations',
        'annotated coordinate graphs labelling key intercepts and rates',
        'a word-problem-to-equation translation checklist'
      ],
      keywords: ['graph', 'function', 'relation', 'model']
    }
  ],
  general: [
    {
      label: 'Analytical Reading & Critical Thinking',
      phrase: 'analyzing course texts and synthesizing key arguments clearly',
      phraseVariants: [
        'analyzing course texts and synthesizing key arguments',
        'evaluating evidence and developing reasoned interpretations',
        'connecting textual details to broader course themes',
        'interpreting complex sources with critical insight'
      ],
      shortTopics: [
        'critical analysis and textual evidence',
        'synthesizing arguments and course themes',
        'evidence-based interpretation',
        'analytical reading and reasoning'
      ],
      tools: [
        'a claim-evidence-reasoning paragraph organizer',
        'annotated exemplar passages highlighting thesis support',
        'a structured revision checklist for argument clarity'
      ],
      keywords: ['essay', 'rhetorical', 'analysis', 'literary', 'argument', 'thesis', 'text', 'reading']
    },
    {
      label: 'Structured Communication & Revision',
      phrase: 'organizing written responses and supporting claims with evidence',
      phraseVariants: [
        'organizing written responses with supporting evidence',
        'communicating ideas clearly across written evaluations',
        'structuring coherent paragraphs and clear transitions',
        'refining written drafts with targeted textual support'
      ],
      shortTopics: [
        'structured written communication',
        'supporting claims with clear evidence',
        'paragraph organization and revision',
        'clarity and depth in written responses'
      ],
      tools: [
        'a structured outline template before drafting responses',
        'a self-editing rubric checking thesis links and transitions',
        'colour-coded evidence-and-analysis revision guides'
      ],
      keywords: ['writing', 'communication', 'draft', 'response', 'paragraph', 'seminar', 'presentation']
    }
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
