/**
 * src/data/comments/learningSkillsCommentBank.js
 *
 * Full Ontario Growing Success Learning Skills and Work Habits comment bank.
 * Based on authentic Simcoe County District School Board (SCDSB) elementary exemplars.
 *
 * The 6 Ontario Learning Skills:
 *   1. Responsibility
 *   2. Organization
 *   3. Independent Work
 *   4. Collaboration
 *   5. Initiative
 *   6. Self-Regulation
 */

export const LEARNING_SKILLS_BANK = {
  responsibility: {
    key: 'responsibility',
    label: 'Responsibility',
    description: 'Fulfills commitments, submits work on time, takes responsibility for and manages own behaviour.',
    strengths: [
      {
        stem: '{name} follows through with {possessive} responsibilities and commitments in our classroom community.',
        examples: [
          '{name} completes classroom jobs with care and takes pride in organizing the classroom environment.',
          '{name} was a dedicated member of classroom helper teams this term and sets a wonderful example for peers.',
          '{subject} responds quickly when cues are given to the class, setting a consistent positive example for peers to follow.',
          '{name} demonstrates respectful behaviour for peers and takes responsibility for maintaining shared learning materials.'
        ]
      },
      {
        stem: '{name} strives to carefully complete all assignments on time.',
        examples: [
          '{subject} refers to visual timers and success criteria to gauge time and pace work effectively.',
          '{subject} makes good use of agendas and digital reminders to record and meet agreed-upon timelines.',
          '{subject} asks for clarification when help is required to ensure tasks are completed thoroughly before due dates.'
        ]
      },
      {
        stem: '{name} comes to class prepared to learn each day.',
        examples: [
          'This is evidenced by {possessive} efforts to create a positive learning environment and experience for all.',
          '{subject} arrives ready with all required materials and notebooks, demonstrating pride in {possessive} academic work.'
        ]
      },
      {
        stem: '{name} manages {possessive} behaviour by making choices that have positive outcomes for {object} and peers.',
        examples: [
          'This is demonstrated when {name} selects a workspace that enables {object} to focus productively.',
          '{name} resolves conflicts respectfully by talking through challenges restoratively and using constructive words.'
        ]
      }
    ],
    nextSteps: [
      {
        stem: '{name} is learning to accept responsibility for {possessive} behaviour and actions.',
        examples: [
          '{subject} is encouraged to remain on task and begin work promptly when instructions are given.',
          '{subject} is encouraged to make mindful choices when selecting a seating location during independent work.',
          '{name} is encouraged to use self-monitoring checklists daily to track work completion and stay focused.'
        ]
      },
      {
        stem: '{name} is working to become a more self-directed and responsible learner.',
        examples: [
          '{subject} is encouraged to re-read success criteria and check over assignments before submitting them.',
          '{subject} is encouraged to ask clarifying questions when unsure of expectations before starting tasks.'
        ]
      },
      {
        stem: '{name} is continuing to develop {possessive} use of organizational tools to meet agreed-upon timelines.',
        examples: [
          '{subject} is encouraged to record due dates in an agenda or digital calendar and review them regularly.',
          '{name} is encouraged to minimize workspace distractions to ensure assignments are completed in a timely manner.'
        ]
      }
    ]
  },

  organization: {
    key: 'organization',
    label: 'Organization',
    description: 'Devises and follows a plan, establishes priorities, manages time, and gathers needed resources.',
    strengths: [
      {
        stem: '{name} devises and follows clear plans to complete class work and learning tasks.',
        examples: [
          '{subject} pays close attention when instructions are given and refers to written steps to guide task completion.',
          '{subject} selects appropriate graphic organizers to plan out larger projects into manageable milestones.'
        ]
      },
      {
        stem: '{name} manages {possessive} time effectively to complete tasks and achieve learning goals.',
        examples: [
          '{subject} uses daily checklists and class to-do lists to prioritize what needs to be accomplished.',
          '{subject} utilizes {possessive} agenda and digital calendars to keep track of assignments and timelines.'
        ]
      },
      {
        stem: '{name} independently identifies, gathers, and uses classroom resources to support learning.',
        examples: [
          '{subject} knows where materials are located and gathers needed tools promptly to begin work.',
          '{subject} effectively utilizes anchor charts, exemplars, and reference tools to assist in completing assignments.'
        ]
      },
      {
        stem: '{name} self-monitors {possessive} progress through tasks and adjusts plans when necessary.',
        examples: [
          '{subject} checks success criteria frequently to stay on track and ensure work is completed with care.'
        ]
      }
    ],
    nextSteps: [
      {
        stem: '{name} is learning to manage {possessive} time and establish priorities to complete tasks.',
        examples: [
          '{subject} is encouraged to make daily to-do lists and check off tasks as they are finished.',
          '{subject} is encouraged to have all required materials ready before beginning independent work sessions.'
        ]
      },
      {
        stem: '{name} continues to develop {possessive} organizational skills for materials and workspaces.',
        examples: [
          'Putting materials away immediately after use and filing papers into labeled folders will help {name} stay organized.',
          'Breaking larger assignments into smaller steps with specific daily goals will reduce feeling overwhelmed.'
        ]
      },
      {
        stem: '{name} is developing the skills necessary to self-monitor progress using assignment guidelines.',
        examples: [
          '{subject} is encouraged to review success criteria checklists to verify that all required steps are completed.'
        ]
      }
    ]
  },

  independentWork: {
    key: 'independentWork',
    label: 'Independent Work',
    description: 'Independently monitors and revises plans, uses class time appropriately, follows instructions with minimal supervision.',
    strengths: [
      {
        stem: '{name} follows established classroom routines and procedures independently.',
        examples: [
          '{subject} transitions smoothly between activities with minimal adult prompting.',
          '{subject} begins soft-start and independent learning tasks promptly upon entering the classroom.'
        ]
      },
      {
        stem: '{name} is a self-directed learner who uses class time appropriately to complete tasks.',
        examples: [
          '{subject} selects workspaces free from distraction and focuses diligently until assignments are finished.',
          '{subject} demonstrates great attention to detail and avoids rushing through work.'
        ]
      },
      {
        stem: '{name} independently monitors, assesses, and revises plans to meet learning goals.',
        examples: [
          '{subject} divides complex assignments into smaller chunks to maximize class time.',
          '{subject} recognizes when extra time is needed and advocates appropriately for guidance.'
        ]
      }
    ],
    nextSteps: [
      {
        stem: '{name} is encouraged to attempt tasks independently before asking for assistance.',
        examples: [
          '{subject} is reminded to consult classroom resources such as word walls, anchor charts, and reference guides first.',
          'Listening carefully to multi-step instructions will help {name} build confidence in working independently.'
        ]
      },
      {
        stem: '{name} is encouraged to begin assignments promptly when independent work time begins.',
        examples: [
          'Selecting a workspace away from talkative peers will help {name} maintain focus on the task at hand.',
          '{subject} is encouraged to use a personal timer or pacing chart to stay on task from start to finish.'
        ]
      },
      {
        stem: '{name} is developing the skills to self-monitor and sustain effort through independent tasks.',
        examples: [
          'Working in shorter, focused blocks with periodic teacher check-ins will help {name} build stamina.'
        ]
      }
    ]
  },

  collaboration: {
    key: 'collaboration',
    label: 'Collaboration',
    description: 'Accepts various group roles, shares work equitably, responds positively to peers, resolves conflicts peacefully.',
    strengths: [
      {
        stem: '{name} effectively collaborates with peers to complete group tasks and projects.',
        examples: [
          '{subject} works cooperatively with a wide variety of classmates in both self-selected and assigned groups.',
          '{subject} readily accepts various roles within a group (such as recorder, presenter, or facilitator) and completes an equitable share of the work.'
        ]
      },
      {
        stem: '{name} listens respectfully and responds positively to the ideas and perspectives of others.',
        examples: [
          'During classroom discussions, {subjectLower} builds constructively upon ideas shared by peers.',
          '{name} thoughtfully considers alternative viewpoints and uses inclusive, supportive language.'
        ]
      },
      {
        stem: '{name} works constructively with others to resolve conflicts and build group consensus.',
        examples: [
          '{subject} uses "I statements" to express feelings and works towards fair, respectful solutions.'
        ]
      }
    ],
    nextSteps: [
      {
        stem: '{name} is learning to collaborate more effectively within small-group settings.',
        examples: [
          '{subject} is encouraged to accept varied group roles and ensure {subjectLower} contributes an equitable share of the work.',
          '{subject} is encouraged to remain focused on the group learning goal rather than social conversations.'
        ]
      },
      {
        stem: '{name} is developing active listening skills during group discussions.',
        examples: [
          '{subject} is encouraged to allow peers time to speak without interruption and consider their suggestions.',
          '{subject} is encouraged to participate more actively in turn-and-talk discussions to share {possessive} valuable ideas.'
        ]
      },
      {
        stem: '{name} is developing strategies to help peacefully resolve peer disagreements.',
        examples: [
          '{subject} is encouraged to use calm communication and seek consensus when working through shared challenges.'
        ]
      }
    ]
  },

  initiative: {
    key: 'initiative',
    label: 'Initiative',
    description: 'Acts on new ideas and opportunities, demonstrates curiosity and innovation, advocates appropriately for self and others.',
    strengths: [
      {
        stem: '{name} demonstrates curiosity and enthusiasm for learning by exploring new concepts eagerly.',
        examples: [
          '{subject} frequently asks insightful questions that deepen classroom discussions and advance collective learning.',
          '{subject} seeks out additional information and willingly takes on extension challenges beyond the required curriculum.'
        ]
      },
      {
        stem: '{name} demonstrates the capacity for innovation and a willingness to take positive learning risks.',
        examples: [
          '{subject} approaches unfamiliar problem-solving situations with a positive, can-do attitude.',
          '{subject} readily experiments with new tools and creative presentation formats to demonstrate understanding.'
        ]
      },
      {
        stem: '{name} advocates appropriately for {possessive} learning needs and the well-being of others.',
        examples: [
          '{subject} asks for clarification when encountering difficulty and seeks out constructive feedback.'
        ]
      }
    ],
    nextSteps: [
      {
        stem: '{name} is encouraged to approach new learning tasks with greater confidence and willingness to take risks.',
        examples: [
          'Remembering that mistakes are an essential part of the learning process will help {name} explore challenging ideas.',
          '{subject} is encouraged to volunteer thoughts and questions during class discussions more frequently.'
        ]
      },
      {
        stem: '{name} is developing self-advocacy skills when encountering challenging concepts.',
        examples: [
          '{subject} is encouraged to ask for teacher assistance or peer clarification promptly when stuck.'
        ]
      }
    ]
  },

  selfRegulation: {
    key: 'selfRegulation',
    label: 'Self-Regulation',
    description: 'Sets goals and monitors progress, perseveres through challenges, manages emotions, and reflects critically on learning.',
    strengths: [
      {
        stem: '{name} demonstrates strong self-regulation by setting learning goals and monitoring {possessive} progress.',
        examples: [
          '{subject} reflects thoughtfully on teacher and peer feedback, implementing suggestions to improve future work.',
          '{subject} perseveres through challenging tasks with determination and a strong growth mindset.'
        ]
      },
      {
        stem: '{name} manages {possessive} emotions and focus effectively in the learning environment.',
        examples: [
          '{subject} recognizes when a brief break or calming strategy is needed and returns to work focused.',
          '{subject} remains calm and adaptable when routines change or unexpected challenges arise.'
        ]
      }
    ],
    nextSteps: [
      {
        stem: '{name} is learning to persevere when faced with academic challenges and setbacks.',
        examples: [
          '{subject} is encouraged to adopt a growth mindset, remembering that mistakes help our brains grow.',
          '{subject} is encouraged to review teacher feedback and apply suggestions before moving on to new assignments.'
        ]
      },
      {
        stem: '{name} is developing strategies to self-regulate and maintain focus during instructional periods.',
        examples: [
          '{subject} is encouraged to recognize personal distractions and utilize classroom sensory or calming tools appropriately.',
          '{name} is encouraged to take a deep breath and use positive self-talk when encountering frustrating tasks.'
        ]
      }
    ]
  }
}

/**
 * Returns a list of all 6 learning skill keys.
 */
export const LEARNING_SKILL_KEYS = [
  'responsibility',
  'organization',
  'independentWork',
  'collaboration',
  'initiative',
  'selfRegulation'
]
