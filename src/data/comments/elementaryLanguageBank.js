/**
 * src/data/comments/elementaryLanguageBank.js
 *
 * Grade 8 Language comment bank based on Ontario Curriculum (2023) & SCDSB exemplars.
 * Strands:
 *   B. Foundations of Language (Oral Communication, Morphology, Vocabulary, Conventions)
 *   C. Comprehension: Understanding and Responding to Texts (Point of View, Text Elements, Critical Thinking & Bias)
 *   D. Composition: Expressing Ideas and Creating Texts (Research, Drafting, Revising, Editing, Publishing)
 */

export const GRADE_8_LANGUAGE_STRANDS = {
  STRAND_B: {
    code: 'B',
    name: 'Foundations of Language',
    expectations: {
      'B1.2': 'select and use a variety of listening strategies to analyze information and support responses',
      'B1.5': 'use precise and descriptive word choice, including domain-specific vocabulary, to support comprehension',
      'B2.1': 'use morphological knowledge of bases, prefixes, and suffixes to read and spell complex words',
      'B2.3': 'read complex texts fluently with accuracy, pacing, and expressive intonation',
      'B3.2': 'use knowledge of parts of speech, grammar, and complex sentence structures to communicate clearly',
      'B3.3': 'use punctuation and capitalization to communicate meaning clearly and coherently'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional command of foundational language skills, articulating nuanced arguments using rich, domain-specific vocabulary and sophisticated syntax.',
          '{name} reads complex literary and informational texts with outstanding fluency, adapting expressive inflection and pacing seamlessly to communicate subtle emotional tones.'
        ],
        applications: [
          'During formal classroom seminars and presentations, {subjectLower} independently integrates advanced morphological knowledge to interpret and apply academic terminology with high precision.',
          'In written communication, {subject} crafts complex sentences combining dependent clauses and varied rhetorical structures to elevate clarity.'
        ],
        nextSteps: [
          '{name} is encouraged to explore advanced etymology and rhetorical devices to enrich {possessive} formal debating and writing.',
          '{name} is encouraged to continue reading diverse classical and contemporary texts across complex genres to expand stylistic repertoire.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of foundational language skills, using descriptive vocabulary and coherent sentences to communicate clearly.',
          '{name} reads complex texts fluently with appropriate pacing and expression, and applies morphological knowledge accurately to spell and decode multisyllabic words.'
        ],
        applications: [
          'During discussions, {subjectLower} articulates ideas effectively, using precise vocabulary and appropriate listening strategies to respond to peers.',
          'In written work, {subject} varies sentence structures and applies punctuation conventions accurately to guide the reader.'
        ],
        nextSteps: [
          '{name} is encouraged to read across a wider variety of genres to continue enhancing domain-specific vocabulary.',
          '{name} should continue refining the use of complex punctuation (such as semicolons and dashes) to enhance sentence variety.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} demonstrates a solid understanding of language foundations, reading grade-level texts with phrased fluency and expressive intonation.',
          '{name} uses descriptive vocabulary in coherent sentences and applies morphological knowledge (prefixes and suffixes) to understand new words.'
        ],
        applications: [
          'While participating in classroom read-alouds and discussions, {subjectLower} asks clarifying questions and identifies relevant supporting evidence.',
          'In written responses, {subject} incorporates compound and complex sentences and applies capitalization and quotation marks accurately.'
        ],
        nextSteps: [
          '{name} is encouraged to use active note-taking strategies during listening activities to capture key details.',
          '{name} is encouraged to use knowledge of morphemes and root words to unlock unfamiliar vocabulary in science and social studies.',
          '{name} should continue referring to grammar and punctuation guides to refine sentence structure.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of language foundations, reading familiar texts with emerging fluency and phrasing.',
          '{name} uses basic descriptive vocabulary and is beginning to apply knowledge of prefixes and suffixes with guided support.'
        ],
        applications: [
          'With teacher prompting during discussions, {subjectLower} shares ideas in complete sentences and asks clarifying questions.',
          'In written tasks, {subject} writes complete sentences and applies basic punctuation with assistance.'
        ],
        nextSteps: [
          '{name} is encouraged to use personal glossaries and word walls to expand descriptive vocabulary.',
          '{name} is encouraged to use proofreading checklists to check for proper capitalization and end punctuation.',
          '{name} would benefit from practicing reading aloud regularly to build confidence and pacing.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging knowledge of language foundations, reading pre-selected texts with direct teacher guidance.',
          '{name} participates in classroom conversations and uses basic vocabulary with support.'
        ],
        applications: [
          'With ongoing assistance, {subjectLower} reads simple sentences and identifies basic punctuation marks.',
          '{subject} shares ideas during small-group discussions with guided sentence frames.'
        ],
        nextSteps: [
          '{name} is encouraged to practice reading aloud daily with a partner to build fluency and sight word recognition.',
          '{name} is encouraged to use guided graphic organizers to support sentence construction.'
        ]
      }
    }
  },

  STRAND_C: {
    code: 'C',
    name: 'Comprehension: Understanding and Responding to Texts',
    expectations: {
      'C1.5': 'identify elements of style in texts including symbolism, voice, and word choice',
      'C1.6': 'analyze point of view in texts, explain how it is communicated, and identify missing perspectives',
      'C2.4': 'select suitable strategies to monitor and confirm understanding of complex texts',
      'C2.6': 'summarize and synthesize important ideas and supporting details in complex texts',
      'C3.5': 'analyze explicit and implicit perspectives in texts and evaluate evidence for bias'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional, perceptive comprehension of complex texts, analyzing literary devices, symbolism, and implicit perspectives with sophisticated critical insight.',
          '{name} expertly synthesizes multi-layered themes across diverse literary and media texts, critically assessing author bias and whose voices are absent.'
        ],
        applications: [
          'When evaluating persuasive and informational texts, {subjectLower} rigorously dissects rhetorical arguments and provides deeply reasoned justifications for alternative viewpoints.',
          'In reader\'s notebook reflections, {name} demonstrates high-level critical thinking, seamlessly connecting textual themes to societal issues.'
        ],
        nextSteps: [
          '{name} is encouraged to explore literary criticism and examine how historical socio-political contexts shape narrative techniques.',
          '{name} should continue analyzing subtle forms of media bias across international journalism.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of texts, skillfully analyzing how elements of style like foreshadowing, symbolism, and point of view create meaning.',
          '{name} consistently synthesizes central ideas and supporting evidence from complex articles and novels, evaluating arguments for potential bias.'
        ],
        applications: [
          'While researching environmental and social topics, {subjectLower} selects credible sources, identifies overt and implied perspectives, and draws sound conclusions.',
          '{name} actively monitors comprehension, utilizing titles, subtitles, and context clues to deepen understanding.'
        ],
        nextSteps: [
          '{name} is encouraged to examine how authors utilize irony, metaphor, and satire to influence audience perspective.',
          '{name} should continue practicing quoting concise, impactful textual evidence to justify inferences.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} demonstrates a competent understanding of texts, identifying the author\'s point of view and explaining how elements of style (such as symbolism and word choice) contribute to meaning.',
          '{name} summarizes important ideas from informational articles and evaluates whether arguments are well-supported.'
        ],
        applications: [
          'When reading novels and articles, {subjectLower} uses jot notes and graphic organizers to synthesize important details and draw effective conclusions.',
          '{name} identifies whose perspective is represented in a text and considers whose voices might be missing.'
        ],
        nextSteps: [
          '{name} is encouraged to incorporate direct quotes and specific text evidence to substantiate interpretations.',
          '{name} is encouraged to consider how the author\'s background might introduce bias into persuasive articles.',
          '{name} should continue practicing summarizing complex texts by identifying the primary thesis before detailing supporting points.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing comprehension skills, identifying the main idea and narrator\'s point of view in familiar texts with guided support.',
          '{name} summarizes short informational texts with teacher prompting.'
        ],
        applications: [
          'With guided questioning, {subjectLower} recognizes basic literary devices such as foreshadowing and identifies supporting details in articles.',
          '{name} uses headings and graphic features to help understand informational texts.'
        ],
        nextSteps: [
          '{name} is encouraged to use structured graphic organizers (such as cause-and-effect charts) when summarizing readings.',
          '{name} is encouraged to re-read sections when meaning breaks down and check unfamiliar words in glossaries.',
          '{name} would benefit from practicing identifying the difference between facts and opinions in persuasive texts.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging comprehension, identifying basic events in stories and simple information from articles with direct teacher guidance.',
          '{name} retells familiar texts with support.'
        ],
        applications: [
          'With ongoing assistance, {subjectLower} answers literal comprehension questions and identifies the main character.',
          '{name} participates in guided reading groups with structured support.'
        ],
        nextSteps: [
          '{name} is encouraged to practice tracking reading with guiding questions to monitor comprehension.',
          '{name} is encouraged to identify keywords in questions to locate answers directly in the text.'
        ]
      }
    }
  },

  STRAND_D: {
    code: 'D',
    name: 'Composition: Expressing Ideas and Creating Texts',
    expectations: {
      'D1.2': 'generate and develop ideas about challenging topics using diverse resources',
      'D1.4': 'classify and sequence ideas and collected information using effective tools',
      'D2.1': 'draft complex texts of various forms and genres (narrative, persuasive, informational)',
      'D2.5': 'make revisions to content, style, and organization to improve clarity and coherence',
      'D2.6': 'edit draft texts to improve accuracy, checking spelling, grammar, and punctuation',
      'D3.1': 'produce final texts using appropriate techniques and digital production tools'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional writing capability, producing compelling, highly polished texts with a strong, authentic voice and purposeful organization.',
          '{name} expertly crafts persuasive, narrative, and expository works, synthesizing complex research and integrating powerful rhetorical techniques.'
        ],
        applications: [
          'Throughout the writing process, {subjectLower} meticulously reorganizes drafts for maximum impact, seeking out and implementing constructive feedback with great sophistication.',
          '{name} effectively leverages digital design tools to publish professional multi-modal reports featuring citations, infographics, and clear headings.'
        ],
        nextSteps: [
          '{name} is encouraged to experiment with advanced narrative structures and submit writing to student publications or writing contests.',
          '{name} should continue refining {possessive} personal voice across diverse formal registers.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough command of the writing process, generating detailed ideas and organizing information logically across diverse writing forms.',
          '{name} writes with a distinct, engaging voice, producing well-structured biographies, reports, and persuasive essays.'
        ],
        applications: [
          '{name} revises drafts with care, reordering paragraphs to enhance flow and choosing precise vocabulary to clarify arguments.',
          '{subject} independently utilizes digital word-processing tools to edit for spelling, punctuation, and grammatical conventions.'
        ],
        nextSteps: [
          '{name} is encouraged to experiment with engaging introductory hooks and impactful concluding statements.',
          '{name} should continue expanding {possessive} use of varied transitions between paragraphs.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} demonstrates a solid ability to write for various purposes, producing organized paragraphs with clear main ideas and supporting details.',
          '{name} drafts narratives, research reports, and persuasive arguments using digital tools, citing sources appropriately.'
        ],
        applications: [
          'During the writing process, {subjectLower} revises drafts to improve clarity and uses digital spell- and grammar-checkers to edit work.',
          'In published reports, {name} organizes content effectively using headings, diagrams, and informative paragraphs.'
        ],
        nextSteps: [
          '{name} is encouraged to consider the order of ideas to ensure arguments build logically toward a strong conclusion.',
          '{name} is encouraged to use varied punctuation (such as commas to separate clauses) to enhance sentence variety and readability.',
          '{name} should continue referring to assignment success criteria throughout the drafting and revision stages.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing writing skills, generating basic ideas on a topic and writing simple paragraphs with guided support.',
          '{name} writes short narratives and informational pieces using structured templates.'
        ],
        applications: [
          'With teacher conferencing, {subjectLower} organizes ideas using graphic organizers before drafting.',
          '{name} makes basic revisions to add missing details and uses spell-check tools with assistance.'
        ],
        nextSteps: [
          '{name} is encouraged to gather information from at least two reliable sources when preparing research reports.',
          '{name} is encouraged to use paragraph planning templates to ensure each paragraph contains a clear topic sentence and details.',
          '{name} would benefit from reviewing drafts aloud to catch missing words and punctuation errors.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging composition skills, writing simple sentences on familiar topics with regular teacher assistance.',
          '{name} participates in shared writing tasks with direct support.'
        ],
        applications: [
          'With ongoing guidance, {subjectLower} brainstorms ideas and completes guided sentence frames.',
          '{name} edits writing for basic capitalization with teacher direction.'
        ],
        nextSteps: [
          '{name} is encouraged to use writing checklists and word processing tools daily to build sentence-writing stamina.',
          '{name} is encouraged to practice expanding simple sentences by adding descriptive adjectives and detail.'
        ]
      }
    }
  }
}

/**
 * Resolves Language strand given topic or code.
 */
export function resolveLanguageStrand(topicOrCode = '') {
  const s = String(topicOrCode || '').toLowerCase().trim()
  if (s.includes('found') || s.includes('oral') || s.includes('speak') || s.includes('listen') || s.includes('spell') || s.includes('morph') || s.startsWith('b')) {
    return GRADE_8_LANGUAGE_STRANDS.STRAND_B
  }
  if (s.includes('comp') || s.includes('read') || s.includes('perspect') || s.includes('bias') || s.includes('view') || s.startsWith('c')) {
    return GRADE_8_LANGUAGE_STRANDS.STRAND_C
  }
  if (s.includes('writ') || s.includes('draft') || s.includes('edit') || s.includes('publish') || s.includes('revis') || s.includes('essay') || s.startsWith('d')) {
    return GRADE_8_LANGUAGE_STRANDS.STRAND_D
  }
  return GRADE_8_LANGUAGE_STRANDS.STRAND_C // Safe default
}
