/**
 * src/data/comments/elementaryMathBank.js
 *
 * Grade 8 Mathematics comment bank based on Ontario Curriculum (2020) & SCDSB exemplars.
 * Strands:
 *   B. Number (Fractions, Integers, Proportional Reasoning, Scientific Notation)
 *   C. Algebra (Linear Patterns, Algebraic Expressions, Multi-Term Equations, Inequalities, Coding)
 *   D. Data (Scatter Plots, Infographics, Probability, Misleading Graphs)
 *   E. Spatial Sense (Transformations on Cartesian Plane, Composite Area/Volume, Pythagorean Theorem)
 *   F. Financial Literacy (Financial Planning, Simple/Compound Interest, Incentive Programs, Credit Cards)
 */

export const GRADE_8_MATH_STRANDS = {
  STRAND_B: {
    code: 'B',
    name: 'Number',
    expectations: {
      'B1.1': 'represent and compare very large and very small numbers using scientific notation',
      'B1.2': 'describe, compare, and order rational and irrational numbers',
      'B2.1': 'use order of operations to solve multi-step problems involving rational numbers',
      'B2.4': 'add and subtract integers using appropriate tools and strategies',
      'B2.5': 'add and subtract fractions using appropriate strategies and common denominators',
      'B2.6': 'multiply and divide fractions and mixed numbers using area models and procedures',
      'B2.7': 'multiply and divide integers using mathematical reasoning and number lines',
      'B2.8': 'apply proportional reasoning and rates to solve real-world problems'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional, flexible problem solving across all number operations, seamlessly converting between scientific notation, fractions, and rational numbers.',
          '{name} consistently articulates advanced mathematical reasoning when solving complex multi-step problems involving integers, proportional relationships, and rates.'
        ],
        procedures: [
          'When evaluating multi-step numerical expressions, {subjectLower} independently integrates mental math strategies and structured mathematical justification with high precision.',
          '{subject} expertly utilizes number lines, area models, and algebraic reasoning to represent and verify solutions to challenging proportional problems.'
        ],
        nextSteps: [
          '{name} is encouraged to explore non-routine competition problems and investigate real-world financial and scientific applications of rational numbers.',
          '{name} is encouraged to continue challenging {object} with complex multi-step proportional reasoning scenarios involving compound percentages.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of number concepts, skillfully adding, subtracting, multiplying, and dividing both integers and fractions.',
          '{name} accurately represents and orders rational and irrational numbers, applying proportional reasoning effectively across diverse problem contexts.'
        ],
        procedures: [
          'When working with operations, {subjectLower} utilizes common factors to simplify fraction calculations and uses number lines and zero pairs to verify integer operations.',
          '{subject} uses ratio tables and scaling strategies effectively to solve unit rate and proportional problems.'
        ],
        nextSteps: [
          '{name} is encouraged to identify everyday situations involving rates and percentages, such as comparing unit costs and store discounts.',
          '{name} should continue estimating solutions first to assess the reasonableness of multi-step numerical calculations.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} demonstrates a competent understanding of number operations, adding and subtracting fractions using common denominators and applying integer rules accurately.',
          '{name} compares and orders rational numbers and uses scientific notation to represent large and small numbers.'
        ],
        procedures: [
          'When solving problems involving integers and fractions, {subjectLower} utilizes visual tools, number lines, and multiplication charts to find common multiples.',
          '{name} applies proportional reasoning to determine unknown values using ratio tables and mental math strategies.'
        ],
        nextSteps: [
          '{name} is encouraged to practice estimating solutions before calculating to assess the reasonableness of {possessive} answers.',
          '{name} is encouraged to build greater automaticity with integer multiplication and division using online tools such as Desmos and Khan Academy.',
          '{name} is encouraged to solve proportional reasoning problems that involve multi-step real-world scenarios.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of number operations, calculating with familiar fractions and whole numbers with emerging consistency.',
          '{name} orders whole numbers and basic decimals, and is beginning to apply integer rules with teacher prompting.'
        ],
        procedures: [
          'With guided support and visual fraction tiles, {subjectLower} solves addition and subtraction problems involving fractions.',
          '{name} uses number lines and integer counters with teacher guidance when exploring positive and negative numbers.'
        ],
        nextSteps: [
          '{name} is encouraged to use multiplication charts and ratio tables to help find lowest common multiples when adding fractions.',
          '{name} is encouraged to practice using zero pairs and integer tiles to reinforce rules for adding and subtracting integers.',
          '{name} would benefit from regular practice with basic fraction and integer operations using interactive math games.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging knowledge of number concepts, working with familiar whole numbers and basic fractions with direct teacher assistance.',
          '{name} recognizes basic positive and negative numbers with support.'
        ],
        procedures: [
          'With ongoing guidance, {subjectLower} uses visual models to explore simple fraction and integer addition.',
          '{name} participates in guided math practice using concrete manipulatives.'
        ],
        nextSteps: [
          '{name} is encouraged to practice using number lines, zero pairs, and fraction tiles daily to build required foundational numeracy skills.',
          '{name} is encouraged to attend extra help sessions to reinforce basic fraction operations and integer rules.'
        ]
      }
    }
  },

  STRAND_C: {
    code: 'C',
    name: 'Algebra',
    expectations: {
      'C1.1': 'identify and compare linear growing and shrinking patterns based on constant rates and initial values',
      'C1.2': 'create and translate patterns involving rational numbers using expressions and tables of values',
      'C1.3': 'determine pattern rules and create algebraic expressions to solve for unknown values',
      'C2.1': 'add and subtract monomials and binomials that involve integers using tools and symbols',
      'C2.2': 'evaluate algebraic expressions that involve rational numbers',
      'C2.3': 'solve equations that involve multiple terms, integers, and decimals, and verify solutions',
      'C2.4': 'solve inequalities involving integers and graph the solutions',
      'C3.1': 'solve problems and create computational representations using coding concepts'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional algebraic thinking, effortlessly creating pattern rules, evaluating complex expressions, and solving multi-term equations and inequalities.',
          '{name} displays advanced analytical skill when connecting linear patterns in tables of values, graphs, and algebraic expressions.'
        ],
        procedures: [
          'When solving multi-step equations and inequalities, {subjectLower} applies inverse operations systematically and rigorously verifies solutions by substitution.',
          '{name} wrote and executed sophisticated code in Scratch, utilizing variables, nested loops, and conditional statements to model mathematical relationships.'
        ],
        nextSteps: [
          '{name} is encouraged to explore non-linear patterns and investigate how algebraic modeling is utilized in scientific simulation and coding.',
          '{name} should continue verifying equations by graphing systems of linear equations.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of algebra, accurately determining pattern rules and solving equations involving multiple terms and integers.',
          '{name} consistently collects like terms to add and subtract monomials and binomials, and verifies equation solutions accurately.'
        ],
        procedures: [
          '{name} uses tables of values, graphs, and algebraic expressions effectively to represent linear growing and shrinking patterns.',
          '{subject} writes and executes coding scripts to simulate math problems, explaining how conditional logic controls program outcomes.'
        ],
        nextSteps: [
          '{name} is encouraged to make deeper connections between algebraic rate of change and real-life scenarios like cell phone plans and travel rates.',
          '{name} should continue practicing graphing solutions to inequalities on number lines.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} identifies and compares linear patterns, determining pattern rules and creating algebraic expressions to solve for unknown values.',
          '{name} solves equations involving whole numbers, decimals, and integers using inverse operations and verifies solutions by substitution.'
        ],
        procedures: [
          'During classroom activities, {subjectLower} adds and subtracts monomials using algebra tiles and collects like terms effectively.',
          '{name} creates and executes code in Scratch to model mathematical situations and describes how changes alter the code.'
        ],
        nextSteps: [
          '{name} is encouraged to verify equation solutions by substituting results back into the original equation using inverse operations.',
          '{name} is encouraged to use websites like Desmos, Gizmos, and SolveMe Mobiles to practice solving multi-step equations.',
          '{name} should continue checking pattern rules across at least three consecutive terms in a table of values.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of algebra, identifying growing patterns and solving simple one- and two-step equations with guided support.',
          '{name} evaluates simple expressions with whole numbers and identifies initial values in patterns.'
        ],
        procedures: [
          'With teacher guidance, {subjectLower} uses algebra tiles and balance models to represent basic algebraic equations.',
          '{name} reads and modifies existing coding blocks with support.'
        ],
        nextSteps: [
          '{name} is encouraged to practice using visual balance models and tape diagrams to understand inverse operations when solving equations.',
          '{name} is encouraged to practice adding and subtracting monomials with integers using color-coded algebra tiles.',
          '{name} would benefit from using table of values charts to identify constant rates of change.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging understanding of patterns, extending simple numerical sequences with regular teacher assistance.',
          '{name} recognizes basic algebraic symbols with direct guidance.'
        ],
        procedures: [
          'With direct assistance, {subjectLower} uses concrete manipulatives to model simple one-step equations.',
          '{name} participates in guided coding activities with step-by-step direction.'
        ],
        nextSteps: [
          '{name} is encouraged to use balance scales, algebra tiles, and visual representations to build foundational algebraic understanding.',
          '{name} is encouraged to review basic equation-solving steps during guided extra help sessions.'
        ]
      }
    }
  },

  STRAND_D: {
    code: 'D',
    name: 'Data',
    expectations: {
      'D1.3': 'select graph best suited to represent data, display data with proper sources, titles, and scales',
      'D1.4': 'create an infographic about a data set, representing data in tables and scatter plots',
      'D1.5': 'use mathematical language to describe relationship between two variables for data sets',
      'D1.6': 'analyse different sets of data, identify bias and misleading graphs, and make convincing arguments',
      'D2.1': 'solve probability problems using tree diagrams and Venn diagrams',
      'D2.2': 'determine and compare theoretical and experimental probabilities of independent and dependent events'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional analytical capability when evaluating two-variable data sets, scatter plots, and complex probability scenarios.',
          '{name} critically assesses data displays in media, identifying subtle bias, outliers, and misleading scales with outstanding precision.'
        ],
        procedures: [
          'When constructing infographics and scatter plots, {subjectLower} accurately determines lines of best fit and articulates strong mathematical arguments.',
          '{name} compares experimental and theoretical probabilities of multiple dependent events using sophisticated sample space models.'
        ],
        nextSteps: [
          '{name} is encouraged to explore statistical modeling using real-world public data sets and digital spreadsheets.',
          '{name} should continue examining how statistical data is interpreted across public policy and scientific research.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of data management, selecting appropriate graphs and accurately interpreting relationships between variables.',
          '{name} clearly determines the theoretical and experimental probabilities of independent and dependent events using tree diagrams.'
        ],
        procedures: [
          '{name} creates well-organized infographics, displaying data clearly with appropriate scales, labels, and titles.',
          '{subject} uses terms such as strong, weak, positive, and negative accurately to describe trends in scatter plots.'
        ],
        nextSteps: [
          '{name} is encouraged to think critically about graphs presented in news media to identify how scales and formatting can alter reader perception.',
          '{name} should continue exploring multi-stage probability events connected to games and decision-making.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} demonstrates a solid understanding of data management, creating scatter plots to represent two-variable data and identifying trends.',
          '{name} solves probability problems using tree diagrams and Venn diagrams, comparing experimental and theoretical outcomes.'
        ],
        procedures: [
          'When creating data projects and infographics, {subjectLower} gathers relevant data and displays information using organized tables and charts.',
          '{name} identifies misleading graphs by examining axis scales and question phrasing.'
        ],
        nextSteps: [
          '{name} is encouraged to consider which graph formats have the greatest visual impact when designing data infographics.',
          '{name} is encouraged to practice calculating the probability of dependent events without replacement.',
          '{name} should continue evaluating whether data sources are credible and unbiased.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of data, creating basic bar graphs and scatter plots with teacher assistance.',
          '{name} conducts simple probability experiments and records outcomes with guidance.'
        ],
        procedures: [
          'With guided support, {subjectLower} reads data tables and identifies general trends in graphs.',
          '{name} uses tree diagrams to find outcomes of two independent events with assistance.'
        ],
        nextSteps: [
          '{name} is encouraged to review the difference between categorical and continuous data to choose appropriate graphs.',
          '{name} is encouraged to use graphic organizers when constructing tree diagrams for probability.',
          '{name} would benefit from practicing identifying misleading features in graphs.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging knowledge of data, collecting basic data and creating simple charts with direct teacher support.',
          '{name} participates in simple probability trials with guidance.'
        ],
        procedures: [
          'With ongoing assistance, {subjectLower} identifies simple information from pre-made bar graphs.',
          '{name} records experimental results using tally charts with support.'
        ],
        nextSteps: [
          '{name} is encouraged to practice labeling graph axes, titles, and scales carefully.',
          '{name} is encouraged to participate in guided probability activities using hands-on spinners and dice.'
        ]
      }
    }
  },

  STRAND_E: {
    code: 'E',
    name: 'Spatial Sense',
    expectations: {
      'E1.2': 'make objects and models using appropriate scales given top, front, and side views',
      'E1.3': 'use scale drawings to calculate actual lengths and areas, and reproduce scale drawings',
      'E1.4': 'describe and perform translations, reflections, rotations, and dilations on a Cartesian plane',
      'E2.3': 'solve problems involving perimeter, circumference, area, volume, and surface area of composite shapes',
      'E2.4': 'describe Pythagorean relationship and apply theorem to solve for unknown side lengths'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional spatial visualization, skillfully executing transformations on a Cartesian plane and decomposing complex 3D composite objects.',
          '{name} expertly applies the Pythagorean theorem to solve multi-step problems involving unknown side lengths and irregular shapes.'
        ],
        procedures: [
          'When given multi-perspective views, {subjectLower} builds and draws intricate scale models with high precision.',
          '{name} derives and rearranges geometric formulas flexibly to calculate the surface area and volume of composite structures.'
        ],
        nextSteps: [
          '{name} is encouraged to investigate architectural and engineering applications of 3D geometry and isometric drafting.',
          '{name} should continue exploring non-routine geometric proofs and coordinate geometry problems.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of spatial sense, accurately performing geometric transformations on a Cartesian plane.',
          '{name} consistently applies the Pythagorean theorem to find unknown side lengths and solves composite surface area and volume problems.'
        ],
        procedures: [
          '{name} constructs 3D objects from perspective drawings and calculates actual lengths from scale drawings using proportional reasoning.',
          '{subject} breaks down composite figures into familiar geometric shapes to apply appropriate area and volume formulas.'
        ],
        nextSteps: [
          '{name} is encouraged to apply composite area and volume formulas to real-world design scenarios, such as landscape planning or packaging.',
          '{name} should practice rearranging the Pythagorean formula to solve for side lengths that are not the hypotenuse.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} demonstrates a competent understanding of spatial sense, performing reflections, rotations, and translations on a Cartesian plane.',
          '{name} applies the Pythagorean relationship to find unknown side lengths in right triangles and calculates area and volume of composite shapes.'
        ],
        procedures: [
          'During classroom activities, {subjectLower} builds 3D models using snap cubes given front, top, and side views.',
          '{name} uses scale drawings to calculate actual lengths and areas on maps.'
        ],
        nextSteps: [
          '{name} is encouraged to practice rearranging the Pythagorean formula (a² + b² = c²) to solve for legs other than the hypotenuse.',
          '{name} is encouraged to apply surface area and volume calculations to practical contexts like packaging and swimming pools.',
          '{name} should continue practicing isometric dot paper drawings for three-dimensional perspective.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing spatial sense, performing simple translations and reflections on a coordinate grid with guided support.',
          '{name} identifies right triangles and calculates area of basic 2D shapes with assistance.'
        ],
        procedures: [
          'With teacher guidance, {subjectLower} builds simple 3D shapes from snap cubes and identifies the hypotenuse in right triangles.',
          '{name} decomposes composite shapes into rectangles and triangles with teacher prompts.'
        ],
        nextSteps: [
          '{name} is encouraged to review coordinate plane rules when performing rotations and reflections.',
          '{name} is encouraged to practice squaring numbers and finding square roots when exploring the Pythagorean theorem.',
          '{name} would benefit from using formula reference sheets when calculating perimeter and area.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging spatial understanding, identifying basic geometric shapes and simple coordinates with regular teacher support.',
          '{name} recognizes basic transformations with guidance.'
        ],
        procedures: [
          'With ongoing assistance, {subjectLower} models simple 2D shapes and measures side lengths using rulers.',
          '{name} participates in guided geometry tasks using concrete manipulatives.'
        ],
        nextSteps: [
          '{name} is encouraged to use graph paper and grid coordinates daily to build confidence with spatial relationships.',
          '{name} is encouraged to review basic formulas for perimeter and area during extra help sessions.'
        ]
      }
    }
  },

  STRAND_F: {
    code: 'F',
    name: 'Financial Literacy',
    expectations: {
      'F1.2': 'create a financial plan to reach a long-term goal accounting for income, expenses, and taxes',
      'F1.4': 'determine growth of simple and compound interest at various rates using digital tools',
      'F1.5': 'compare various ways for consumers to get more value for their money, including loyalty programs',
      'F1.6': 'compare interest rates, annual fees, and rewards offered by credit cards to determine best choice'
    },
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional financial acumen, creating comprehensive long-term financial plans that rigorously account for taxes, compounding interest, and variable expenses.',
          '{name} critically evaluates consumer credit agreements and incentive programs, presenting nuanced cost-benefit analyses.'
        ],
        procedures: [
          '{name} utilizes digital spreadsheets and financial calculators to model how compound interest accelerates long-term savings.',
          '{subject} articulates sophisticated comparisons between consumer financing options, identifying hidden fees and interest rate risks.'
        ],
        nextSteps: [
          '{name} is encouraged to investigate macroeconomic concepts such as inflation and global exchange rate fluctuations.',
          '{name} should continue examining how personal financial planning intersects with investment strategies.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of financial literacy, creating realistic budgets and financial plans for long-term goals.',
          '{name} accurately compares simple and compound interest using digital tools, explaining their impact on savings and debt.'
        ],
        procedures: [
          '{name} researches consumer loyalty programs and credit card offers, clearly weighing annual fees against reward incentives.',
          '{subject} explains how taxes and living expenses impact personal financial plans.'
        ],
        nextSteps: [
          '{name} is encouraged to explore how different investment options (like TFSAs and high-interest savings accounts) align with personal goals.',
          '{name} should continue analyzing consumer marketing strategies that encourage impulse spending.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} demonstrates a solid understanding of financial literacy, creating a financial plan for a long-term goal considering income and expenses.',
          '{name} compares simple and compound interest using digital tools and researches customer loyalty programs to determine consumer value.'
        ],
        procedures: [
          'When researching consumer options, {subjectLower} lists advantages and disadvantages of different incentive programs and payment methods.',
          '{name} calculates the cost of savings plans and explains how compound interest grows over time.'
        ],
        nextSteps: [
          '{name} is encouraged to factor in taxes and unexpected expenses when designing long-term budgets.',
          '{name} is encouraged to discuss cost-of-living concepts (such as utilities, groceries, and transportation) with trusted adults.',
          '{name} should continue evaluating whether store loyalty programs genuinely provide cost savings.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing financial understanding, creating simple budgets and identifying basic payment methods with guidance.',
          '{name} calculates simple interest using digital tools with teacher support.'
        ],
        procedures: [
          'With guided support, {subjectLower} compares prices and identifies sales discounts on everyday items.',
          '{name} lists basic features of customer loyalty programs with assistance.'
        ],
        nextSteps: [
          '{name} is encouraged to practice tracking daily expenses to build awareness of budgeting.',
          '{name} is encouraged to explore digital interest calculators to observe how money grows over time.',
          '{name} would benefit from using structured budget templates with pre-set expense categories.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates emerging financial awareness, identifying common currency and simple purchasing decisions with direct support.',
          '{name} participates in classroom financial discussions with assistance.'
        ],
        procedures: [
          'With ongoing assistance, {subjectLower} creates simple lists of income and expenses.',
          '{name} explores basic consumer decisions during guided lessons.'
        ],
        nextSteps: [
          '{name} is encouraged to practice distinguishing between needs and wants when making spending plans.',
          '{name} is encouraged to participate in guided discussions about saving money and budgeting.'
        ]
      }
    }
  }
}

/**
 * Resolves Math strand details given a topic or expectation code.
 * @param {string} topicOrCode
 * @returns {Object} Strand object
 */
export function resolveMathStrand(topicOrCode = '') {
  const s = String(topicOrCode || '').toLowerCase().trim()
  if (s.includes('number') || s.includes('fraction') || s.includes('integer') || s.includes('ratio') || s.startsWith('b')) {
    return GRADE_8_MATH_STRANDS.STRAND_B
  }
  if (s.includes('algebra') || s.includes('pattern') || s.includes('equation') || s.includes('inequal') || s.includes('code') || s.startsWith('c')) {
    return GRADE_8_MATH_STRANDS.STRAND_C
  }
  if (s.includes('data') || s.includes('graph') || s.includes('scatter') || s.includes('infographic') || s.includes('prob') || s.startsWith('d')) {
    return GRADE_8_MATH_STRANDS.STRAND_D
  }
  if (s.includes('spatial') || s.includes('geo') || s.includes('transform') || s.includes('pythag') || s.includes('area') || s.includes('volume') || s.startsWith('e')) {
    return GRADE_8_MATH_STRANDS.STRAND_E
  }
  if (s.includes('finan') || s.includes('money') || s.includes('budget') || s.includes('interest') || s.includes('credit') || s.startsWith('f')) {
    return GRADE_8_MATH_STRANDS.STRAND_F
  }
  return GRADE_8_MATH_STRANDS.STRAND_B // Safe default
}
