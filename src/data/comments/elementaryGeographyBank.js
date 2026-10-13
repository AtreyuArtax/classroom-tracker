/**
 * src/data/comments/elementaryGeographyBank.js
 *
 * Grade 8 Geography comment bank based on Ontario Curriculum & SCDSB exemplars.
 * Strands:
 *   A. Global Settlement: Patterns and Sustainability
 *   B. Global Inequalities: Economic Development and Quality of Life
 */

export const GRADE_8_GEOGRAPHY_STRANDS = {
  STRAND_A: {
    code: 'A',
    name: 'Global Settlement: Patterns and Sustainability',
    expectations: {
      'A1.2': 'analyse how processes related to physical environment may affect human settlements in future',
      'A2.1': 'formulate questions to guide investigations into human settlement and sustainability',
      'A3.2': 'identify and describe ways physical environment influences location and patterns of settlement',
      'A3.6': 'describe practices individuals and communities adopted to make human settlements sustainable'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional geographic insight, critically analyzing interrelationships between physical geography, global settlement patterns, and future environmental challenges.',
          '{name} expertly evaluates sustainable community planning models, proposing innovative solutions to address urbanization and resource pressures.'
        ],
        inquiries: [
          'In geographic inquiries, {subjectLower} formulated sophisticated research questions and constructed thematic maps to analyze spatial patterns of population growth.',
          '{name} critically assessed how communities mitigate environmental risks such as sea-level rise and extreme weather events.'
        ],
        nextSteps: [
          '{name} is encouraged to explore how urban densification and renewable energy infrastructure interact in sustainable city design.',
          '{name} should continue examining transboundary environmental challenges from a spatial perspective.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of global settlement patterns, explaining why people settle in particular areas based on physical features and resources.',
          '{name} clearly analyzes how environmental processes affect settlements and describes sustainable practices adopted by communities.'
        ],
        inquiries: [
          '{name} developed focused inquiry questions and communicated research on sustainability through well-structured presentations and maps.',
          '{subject} accurately explained how climate, fertile land, and waterways influence global population density.'
        ],
        nextSteps: [
          '{name} is encouraged to evaluate economic and geographic barriers communities face when adopting green infrastructure.',
          '{name} should continue practicing spatial analysis using digital GIS and satellite mapping tools.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} explains why human settlements develop in particular regions based on physical factors such as climate, waterways, and natural resources.',
          '{name} describes ways that communities and families incorporate sustainable practices (such as public transit and composting) to reduce environmental impacts.'
        ],
        inquiries: [
          'In inquiry projects, {subjectLower} formulated guiding questions to investigate sustainability issues and shared findings using organized slide presentations.',
          '{name} analyzes how environmental processes (such as storms and rising sea levels) affect communities.'
        ],
        nextSteps: [
          '{name} is encouraged to investigate how specific communities are responding to environmental hazards to mitigate damage.',
          '{name} is encouraged to evaluate the cost and accessibility barriers that communities face when adopting sustainable practices.',
          '{name} should continue utilizing geographic vocabulary when describing global settlement trends.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of geography, identifying basic reasons why people settle near resources with guided support.',
          '{name} names simple sustainable practices (such as recycling) with assistance.'
        ],
        inquiries: [
          'With teacher guidance, {subjectLower} gathers geographic facts and creates simple charts about population patterns.',
          '{name} identifies environmental hazards with support.'
        ],
        nextSteps: [
          '{name} is encouraged to explore other physical features that make geographic areas desirable for settlement.',
          '{name} is encouraged to think about how sustainable practices can be applied in daily life.',
          '{name} would benefit from using labeled world maps to identify major population clusters.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging geographic knowledge, identifying simple physical features with direct teacher support.',
          '{name} participates in classroom discussions about communities with assistance.'
        ],
        inquiries: [
          'With ongoing assistance, {subjectLower} locates basic countries on a map.',
          '{name} identifies simple environmental signs with direction.'
        ],
        nextSteps: [
          '{name} is encouraged to use visual diagrams to review factors affecting where people live.',
          '{name} is encouraged to participate in guided mapping activities.'
        ]
      }
    }
  },

  STRAND_B: {
    code: 'B',
    name: 'Global Inequalities: Economic Development and Quality of Life',
    expectations: {
      'B1.1': 'analyse interrelationships among factors that contribute to quality of life in developed and developing countries',
      'B2.1': 'formulate questions to guide investigations into global development and quality of life',
      'B2.3': 'analyse and construct maps focusing on issues related to global development and quality of life',
      'B3.1': 'identify and describe significance of indicators used to measure quality of life globally'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional critical thinking when analyzing global disparities, synthesizing multiple quality of life indicators to evaluate complex socio-economic patterns.',
          '{name} expertly articulates the interrelationships between economic development, access to healthcare, education, and global human rights.'
        ],
        inquiries: [
          '{name} constructed sophisticated population pyramids and scatter plots to analyze demographic trends across developing and developed nations.',
          '{subject} critically evaluated the long-term effectiveness of international non-governmental aid programs.'
        ],
        nextSteps: [
          '{name} is encouraged to investigate how fair trade policies and international economic treaties impact local agricultural economies.',
          '{name} should continue examining how regional disparities exist within wealthy developed nations.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of quality of life indicators (such as life expectancy, literacy rates, and clean water access), comparing developed and developing nations accurately.',
          '{name} clearly explains how economic sectors and resource distribution affect living standards globally.'
        ],
        inquiries: [
          '{name} gathered and analyzed demographic data, creating clear charts and population pyramids to illustrate trends.',
          '{subject} formulated strong inquiry questions regarding international development and communicated conclusions effectively.'
        ],
        nextSteps: [
          '{name} is encouraged to examine the role that local non-governmental organizations play in improving quality of life.',
          '{name} should continue analyzing scatter graphs to identify correlations between income and health outcomes.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} identifies quality of life indicators in developed and developing nations (such as life expectancy, literacy rate, and access to clean water).',
          '{name} selects indicators to compare living standards across different countries and analyzes factors affecting economies around the world.'
        ],
        inquiries: [
          'In research projects, {subjectLower} formulated inquiry questions and used charts, population pyramids, and maps to show demographic trends.',
          '{name} communicates research findings using appropriate geographic vocabulary and clear presentation slides.'
        ],
        nextSteps: [
          '{name} is encouraged to consider how quality of life indicators vary within {possessive} own local and national community.',
          '{name} is encouraged to investigate international organizations dedicated to improving global health and education.',
          '{name} should continue practicing reading population pyramids to infer future demographic trends.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of global inequalities, identifying basic quality of life indicators with guided support.',
          '{name} compares two countries using simple facts with assistance.'
        ],
        inquiries: [
          'With teacher prompting, {subjectLower} collects information on country living standards using guided worksheets.',
          '{name} reads simple demographic charts with support.'
        ],
        nextSteps: [
          '{name} is encouraged to use personal glossaries to reinforce geography terms like literacy rate and life expectancy.',
          '{name} is encouraged to add complete titles and labels to maps and charts to communicate findings clearly.',
          '{name} would benefit from using comparative graphic organizers when examining different countries.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging knowledge of world geography, identifying simple differences between countries with direct assistance.',
          '{name} participates in classroom discussions on global communities with support.'
        ],
        inquiries: [
          'With ongoing guidance, {subjectLower} identifies simple country facts.',
          '{name} participates in guided mapping exercises.'
        ],
        nextSteps: [
          '{name} is encouraged to use visual country cards to build awareness of global communities.',
          '{name} is encouraged to practice identifying basic needs versus wants on a global scale.'
        ]
      }
    }
  }
}

export function resolveGeographyStrand(topicOrCode = '') {
  const s = String(topicOrCode || '').toLowerCase().trim()
  if (s.includes('inequal') || s.includes('develop') || s.includes('quality') || s.includes('life') || s.startsWith('b')) {
    return GRADE_8_GEOGRAPHY_STRANDS.STRAND_B
  }
  return GRADE_8_GEOGRAPHY_STRANDS.STRAND_A
}
