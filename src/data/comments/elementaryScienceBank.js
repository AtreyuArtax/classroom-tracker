/**
 * src/data/comments/elementaryScienceBank.js
 *
 * Grade 8 Science comment bank based on Ontario Curriculum (2022) & authentic SCDSB classroom exemplars.
 * Strands:
 *   B. Life Systems - Cells
 *   C. Matter and Energy - Fluids
 *   D. Structures and Mechanisms - Systems in Action
 *   E. Earth and Space Systems - Water Systems
 */

export const GRADE_8_SCIENCE_STRANDS = {
  STRAND_B: {
    code: 'B',
    name: 'Life Systems - Cells',
    overallExpectations: [
      'B1. Relating Science and Technology to Our Changing World (Cell Biology & Society)',
      'B2. Exploring and Understanding Concepts (Cell Structures, Functions, and Processes)',
      'A1. STEM Investigation and Communication Skills'
    ],
    specificExpectations: {
      'B1.1': 'assess how technologies enhanced understanding of cells and cellular processes',
      'B1.2': 'analyse effects of developments in cell biology on human health and environment',
      'B2.1': 'demonstrate understanding of cells using cell theory',
      'B2.2': 'identify organelles and functions (nucleus, membrane, cell wall, chloroplasts, vacuole, mitochondria, cytoplasm)',
      'B2.3': 'compare structure and function of plant and animal cells',
      'B2.4': 'explain processes of diffusion and osmosis within a cell',
      'B2.5': 'describe unicellular and multicellular organisms and how they meet basic needs',
      'B2.6': 'describe organization of cells into tissues, organs, and systems',
      'A1.4': 'follow health and safety procedures in science investigations',
      'A1.5': 'communicate findings using science vocabulary and appropriate visual formats'
    },
    inClassInvestigations: [
      'preparing and viewing dry- and wet-mount slides of plant and animal specimens under a microscope',
      'using a compound light microscope correctly to observe cell specimens',
      'investigating the cellular structure of onion skin and cheek cells under magnification',
      'designing and building a 3D model representing plant and animal cell organelles'
    ],
    researchProjects: [
      'how modern cellular technologies enhance medical care and disease treatment',
      'the beneficial and harmful societal impacts of developments in cell biology',
      'cellular processes and emerging biotechnology applications'
    ],
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates exceptional, insightful understanding of cell structures and organelles, articulating nuanced comparisons between plant and animal cells.',
          '{name} articulates an advanced and thorough understanding of cellular organization, organelles, and processes such as osmosis and diffusion.'
        ],
        investigationStems: [
          'During in-class investigations, {subjectLower} demonstrated outstanding laboratory technique when independently preparing dry- and wet-mount slides and operating the compound microscope with high precision.',
          'In laboratory investigations, {subjectLower} skillfully prepared and examined specimen slides under high magnification, communicating detailed observations through accurate, labeled scientific diagrams.'
        ],
        communicationStems: [
          '{name} thoroughly analyzed {project} and communicated findings with sophisticated scientific terminology and compelling visual presentations.',
          '{name} critically evaluated {project}, presenting comprehensive conclusions supported by relevant evidence and detailed visuals.'
        ],
        nextSteps: [
          '{name} is encouraged to explore advanced extension inquiries into how molecular biology and cellular research influence medical breakthroughs.',
          '{name} is encouraged to continue challenging {object} by investigating how cellular mutations and specialized tissues adapt to environmental factors.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of structures and organelles in plant and animal cells, accurately comparing their specialized functions.',
          '{name} consistently explains the function of major cell components, including the nucleus, cell membrane, vacuole, and mitochondria.'
        ],
        investigationStems: [
          'During in-class investigations, {subjectLower} safely and competently prepared dry- and wet-mount slides and used the microscope effectively to view cellular specimens.',
          '{name} followed all laboratory safety procedures while preparing specimen slides, recording clear and detailed scientific drawings with accurate labels.'
        ],
        communicationStems: [
          '{name} analyzed {project} and clearly communicated findings using appropriate science vocabulary and structured visual slide decks.',
          '{subjectLower} communicated research findings effectively using technical science vocabulary and clear scientific illustrations.'
        ],
        nextSteps: [
          '{name} is encouraged to consider how deeper knowledge of cellular functions can be applied to address modern healthcare and environmental challenges.',
          '{name} should continue adding detailed annotations and colour-coding to scientific drawings to illustrate organelle structures with maximum clarity.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} identifies structures and organelles in cells (such as the nucleus, cell membrane, and vacuoles), and compares the structure and function of plant and animal cells.',
          '{name} demonstrates a solid understanding of cell biology concepts, identifying key organelles and explaining their basic roles.'
        ],
        investigationStems: [
          'During in-class investigations, {subjectLower} used a microscope correctly and prepared and viewed dry- and wet-mount slides of specimen cells.',
          '{name} followed laboratory safety guidelines and viewed prepared slides of specimen cells under the microscope.'
        ],
        communicationStems: [
          '{name} analyzed {project} and communicated findings using appropriate vocabulary and visuals such as scientific drawings and slide decks.',
          '{subjectLower} shared research findings on {project} using organized notes and visual presentations.'
        ],
        nextSteps: [
          '{name} is encouraged to consider how knowledge of cells can improve the quality of medical care.',
          '{name} is encouraged to use colour, texture, and clear labels to enhance {possessive} scientific drawings.',
          '{name} should continue practicing the use of unit vocabulary (e.g., organelle, diffusion, cytoplasm) during class discussions.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of cell organelles, identifying some basic structures such as the nucleus and cell membrane.',
          '{name} identifies basic similarities and differences between plant and animal cells with guided support.'
        ],
        investigationStems: [
          'With assistance during in-class investigations, {subjectLower} viewed prepared slides using a microscope and observed cellular shapes.',
          '{name} participated in laboratory activities and viewed prepared cell slides under teacher guidance.'
        ],
        communicationStems: [
          '{name} shared basic details about {project} using found images, oral discussion, and simple slides.',
          '{subjectLower} communicated introductory research findings with teacher prompting.'
        ],
        nextSteps: [
          '{name} is encouraged to refer to classroom anchor charts and personal vocabulary glossaries to reinforce the names and functions of cell organelles.',
          '{name} is encouraged to add complete titles and labels to scientific drawings to communicate observations clearly.',
          '{name} would benefit from reviewing the differences between plant and animal cells using structured graphic organizers.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} recognizes basic structures in cells (such as the nucleus and cell wall) and identifies one similarity and difference between plant and animal cells.',
          '{name} demonstrates emerging knowledge of cells with regular teacher support.'
        ],
        investigationStems: [
          'During laboratory activities, {subjectLower} viewed prepared slides under the microscope with direct guidance.',
          '{name} participated in classroom investigations by viewing prepared microscope slides with support.'
        ],
        communicationStems: [
          '{name} explored {project} and shared some details through conversational discussions and simple images.',
          '{subjectLower} presented basic information about {project} using guided templates.'
        ],
        nextSteps: [
          '{name} is encouraged to use the science word wall and personal glossary to communicate findings with greater precision.',
          '{name} is encouraged to add appropriate labels and titles to scientific drawings in order to communicate observations clearly.'
        ]
      }
    }
  },

  STRAND_C: {
    code: 'C',
    name: 'Matter and Energy - Fluids',
    overallExpectations: [
      'C1. Relating Science and Technology to Our Changing World (Properties of Fluids & Society)',
      'C2. Exploring and Understanding Concepts (Fluid Mechanics, Density, Buoyancy & Viscosity)',
      'A1. STEM Investigation and Communication Skills'
    ],
    specificExpectations: {
      'C1.1': 'assess social, economic, and environmental impacts of technologies based on properties of fluids',
      'C1.2': 'assess impact of fluid spills on society and environment including cleanup costs',
      'C3.1': 'demonstrate understanding of viscosity and compare viscosity and flow rates of various liquids',
      'C3.2': 'describe relationship between mass, volume, and density as a property of matter',
      'C3.3': 'explain difference between solids, liquids, and gases in density using particle theory',
      'C3.4': 'explain compressibility of liquids and gases and how compressibility affects usage',
      'C3.5': 'determine buoyancy of an object given density in a variety of fluids',
      'C3.6': 'explain relationship between pressure, volume, and temperature',
      'C3.7': 'explain how forces are transferred in all directions in fluids (Pascal’s law)',
      'A2.3': 'investigate and compare the density of a variety of liquids',
      'A2.5': 'use scientific inquiry skills to identify factors affecting flow rates of fluids'
    },
    inClassInvestigations: [
      'investigating liquids with different densities and experimenting with the buoyancy of an egg in fresh vs salt water',
      'conducting timed flow rate trials to compare the viscosity of everyday liquids such as water, oil, and honey',
      'calculating mass-to-volume ratios to determine the density of regular and irregular solids',
      'designing and testing a hydraulic or pneumatic system using syringes and tubing'
    ],
    researchProjects: [
      'the environmental and economic impacts of oil spills and modern cleanup technologies',
      'how pneumatic and hydraulic technologies are utilized in industrial machinery',
      'the applications of buoyancy and fluid displacement in maritime vessel design'
    ],
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates a sophisticated understanding of fluid dynamics, explaining relationships between viscosity, temperature, density, and buoyancy with exceptional clarity.',
          '{name} articulates an advanced grasp of particle theory, explaining how compressibility and pressure variations govern fluid systems in engineering.'
        ],
        investigationStems: [
          'In laboratory investigations, {subjectLower} rigorously measured flow rates and derived density values with high precision, applying mathematical principles to buoyancy trials.',
          'During hands-on trials, {name} independently formulated inquiry questions regarding fluid density and designed reliable experimental tests.'
        ],
        communicationStems: [
          '{name} thoroughly evaluated {project}, presenting compelling arguments regarding environmental remediation and technological efficiency.',
          '{subjectLower} communicated experimental conclusions with professional scientific terminology and detailed quantitative graphs.'
        ],
        nextSteps: [
          '{name} is encouraged to investigate how pneumatic and hydraulic principles are applied in automated robotics and aerospace systems.',
          '{name} should continue extending {possessive} inquiries into non-Newtonian fluids and advanced thermodynamic relationships.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of viscosity, density, and buoyancy, accurately explaining how particle arrangement affects fluid flow.',
          '{name} consistently explains the principles of fluid mechanics and how forces are transmitted through liquids and gases.'
        ],
        investigationStems: [
          'During in-class investigations, {subjectLower} systematically compared fluid flow rates and conducted accurate density calculations.',
          '{subject} followed all safety protocols while investigating liquid densities and experimenting with the buoyancy of objects in different fluids.'
        ],
        communicationStems: [
          '{name} analyzed {project} and presented clear, structured conclusions supported by visual evidence and precise vocabulary.',
          '{subjectLower} effectively communicated experimental findings using charts, graphs, and accurate science terminology.'
        ],
        nextSteps: [
          '{name} is encouraged to explore how fluid properties are harnessed in everyday household appliances and municipal water networks.',
          '{name} should continue refining data tables to show units of measurement and margin of error during quantitative labs.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} demonstrates an understanding of viscosity and compares how viscosity affects flow rates of various liquids, such as water, oil, and honey.',
          '{name} explains core concepts of fluid mechanics, including how density differences determine whether an object will sink or float.'
        ],
        investigationStems: [
          'During in-class investigations, {subjectLower} investigated liquids with different densities and experimented with the buoyancy of an object in various fluids (e.g., an egg in fresh water and salt water).',
          '{name} participated in hands-on trials to measure the flow rates and densities of everyday liquids.'
        ],
        communicationStems: [
          '{name} analyzed {project} and communicated findings using appropriate vocabulary and visuals (e.g., scientific drawings, oral presentations, slide deck).',
          '{subjectLower} shared research findings clearly using organized presentation slides and diagrams.'
        ],
        nextSteps: [
          '{name} is encouraged to consider how properties of fluids can be applied to daily tasks, such as cooking and heating.',
          '{name} is encouraged to experiment with how temperature affects the viscosity and state of different liquids.',
          '{name} should continue practicing formulas for density (mass divided by volume) to reinforce quantitative calculations.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates a developing understanding of viscosity and buoyancy, observing that thicker liquids flow more slowly.',
          '{name} identifies that some objects float while others sink, beginning to connect this to density differences.'
        ],
        investigationStems: [
          'With support during in-class investigations, {subjectLower} observed flow rates of liquids and tested buoyant objects in fresh and salt water.',
          '{name} participated in hands-on buoyancy investigations with teacher guidance.'
        ],
        communicationStems: [
          '{name} shared basic details about {project} through conversation, oral sharing, and simple slides.',
          '{subjectLower} communicated introductory ideas about fluid properties with guided sentence frames.'
        ],
        nextSteps: [
          '{name} is encouraged to use graphic organizers to review the relationship between mass, volume, and density.',
          '{name} is encouraged to utilize unit word walls to reinforce terms like viscosity, buoyancy, and compressibility.',
          '{name} would benefit from observing how everyday liquids behave when poured at room temperature versus heated.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} demonstrates an emerging understanding of viscosity and observes how viscosity affects flow rates of liquids such as water, ketchup, and honey.',
          '{name} recognizes basic properties of liquids with frequent teacher assistance.'
        ],
        investigationStems: [
          'During in-class activities, {subjectLower} participated in investigations comparing two liquids and observed whether objects float in fresh versus salt water.',
          '{name} took part in simple fluid trials under direct supervision.'
        ],
        communicationStems: [
          '{name} explored {project} and shared some details through conversations and found images.',
          '{subjectLower} presented simple observations with teacher prompting.'
        ],
        nextSteps: [
          '{name} is encouraged to use the science vocabulary glossary for the unit in order to communicate findings effectively.',
          '{name} is encouraged to investigate properties of buoyancy with various solids and liquids at home during daily routines.'
        ]
      }
    }
  },

  STRAND_D: {
    code: 'D',
    name: 'Structures and Mechanisms - Systems in Action',
    overallExpectations: [
      'D1. Relating Science and Technology to Our Changing World (Systems Automation & Society)',
      'D2. Exploring and Understanding Concepts (Mechanical Advantage, Efficiency & Work)',
      'A1. STEM Investigation and Communication Skills'
    ],
    specificExpectations: {
      'D1.1': 'assess social, economic, and environmental impacts of automating systems',
      'D1.2': 'assess impact of alternative ways of meeting needs currently met by existing systems',
      'D2.1': 'identify various types of systems (mechanical, bodily, social, food-processing)',
      'D2.2': 'describe purpose, inputs, and outputs of various systems',
      'D2.3': 'identify components of a system that allow it to perform function efficiently and safely',
      'D2.4': 'use scientific terms displacement, force, work, energy, and efficiency',
      'D2.6': 'explain relationship between input/output forces and mechanical advantage of simple machines',
      'D2.7': 'identify ways energy dissipates from mechanical systems (heat, sound, friction)',
      'A1.1': 'use a scientific research process and associated skills to conduct investigations'
    },
    inClassInvestigations: [
      'investigating mechanical advantage in simple machines by adjusting the arm lengths of levers and gear ratios',
      'measuring input and output forces using spring scales across inclined planes and pulley systems',
      'analyzing inputs, processes, and outputs in food-processing and agricultural distribution systems',
      'designing and assembling a multi-component system that performs a specific task efficiently'
    ],
    researchProjects: [
      'the social, economic, and environmental impacts of automating industrial systems',
      'how artificial intelligence and automation alter skilled trades and manufacturing',
      'improvements in energy efficiency and friction reduction in transportation systems'
    ],
    levels: {
      '4+': {
        conceptStems: [
          '{name} articulates an exceptional understanding of complex systems, analyzing mechanical advantage, work, and energy dissipation with outstanding critical insight.',
          '{name} expertly evaluates inputs, processes, and outputs across mechanical and industrial systems, linking energy efficiency to sustainable design.'
        ],
        investigationStems: [
          'During laboratory challenges, {subjectLower} calculated mechanical advantage with precision and optimized the design of simple machine mechanisms.',
          '{name} independently designed innovative mechanical systems, testing how modifying lever arm lengths and gear trains increased efficiency.'
        ],
        communicationStems: [
          '{name} comprehensively analyzed the multifaceted impacts of automating systems, presenting balanced ethical, economic, and environmental perspectives.',
          '{subjectLower} communicated technical evaluations using precise engineering terminology and clear mechanical schematics.'
        ],
        nextSteps: [
          '{name} is encouraged to explore how automated feedback loops and sensors are integrated into sustainable smart systems.',
          '{name} is encouraged to design complex compound machines that address real-world community accessibility needs.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of systems, explaining how components interact to achieve safe and efficient operation.',
          '{name} consistently explains the relationship between force, distance, work, and mechanical advantage in mechanical systems.'
        ],
        investigationStems: [
          'During in-class investigations, {subjectLower} experimented with mechanical advantage in levers and pulley systems, recording clear data.',
          '{name} constructed and tested simple machines, accurately comparing input forces to output forces.'
        ],
        communicationStems: [
          '{name} analyzed {project} and communicated findings effectively using appropriate vocabulary and visual slide decks.',
          '{subjectLower} clearly articulated the benefits and drawbacks of system automation on workers and the environment.'
        ],
        nextSteps: [
          '{name} is encouraged to design and model a compound system that incorporates multiple simple machines working together.',
          '{name} should continue examining how friction and energy loss can be mitigated in mechanical designs.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} identifies various types of systems (such as mechanical systems, body systems, and food-processing systems) and describes components that allow them to work efficiently.',
          '{name} explains the basic concepts of force, work, and mechanical advantage using simple machines.'
        ],
        investigationStems: [
          'During in-class activities, {subjectLower} investigated mechanical advantage in simple machines, noting changes in force when the arm length of a lever was adjusted.',
          '{name} participated in classroom investigations by measuring forces on inclined planes and levers.'
        ],
        communicationStems: [
          '{name} analyzed {project} and communicated research using appropriate vocabulary and visuals (e.g., scientific drawings, oral presentations, slide deck).',
          '{subjectLower} presented research on automation using structured notes and presentation slides.'
        ],
        nextSteps: [
          '{name} is encouraged to consider how knowledge of mechanical advantage can make daily physical tasks more efficient.',
          '{name} is encouraged to design a simple machine that meets a real need (e.g., transporting an object from one location to another).',
          '{name} should continue practicing formulas for work and mechanical advantage to solidify quantitative calculations.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of systems, identifying simple inputs and outputs with guided support.',
          '{name} identifies common simple machines (such as levers and pulleys) and recognizes that they make work easier.'
        ],
        investigationStems: [
          'With guidance during classroom activities, {subjectLower} tested mechanical advantage using simple machines such as levers.',
          '{name} participated in hands-on building tasks with teacher direction.'
        ],
        communicationStems: [
          '{name} shared basic details about {project} using simple slide decks and oral discussions.',
          '{subjectLower} presented introductory ideas regarding automation with guided prompts.'
        ],
        nextSteps: [
          '{name} is encouraged to use structured organizers to review the differences between force, work, and mechanical advantage.',
          '{name} is encouraged to use unit vocabulary charts to clearly describe system inputs and outputs.',
          '{name} would benefit from observing how changing lever arm lengths impacts the effort needed to lift an object.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} identifies various types of systems with teacher assistance and recognizes that machines help humans perform tasks.',
          '{name} demonstrates emerging knowledge of mechanical systems and simple machines.'
        ],
        investigationStems: [
          'During in-class activities, {subjectLower} experimented with simple machines under direct supervision.',
          '{name} observed simple machine demonstrations with support.'
        ],
        communicationStems: [
          '{name} explored {project} and shared some details through conversations and scientific drawings.',
          '{subjectLower} communicated simple ideas with teacher assistance.'
        ],
        nextSteps: [
          '{name} is encouraged to use the science vocabulary glossary for the unit in order to communicate findings effectively.',
          '{name} is encouraged to consider how the automation of parts of a system can make everyday tasks easier.'
        ]
      }
    }
  },

  STRAND_E: {
    code: 'E',
    name: 'Earth and Space Systems - Water Systems',
    overallExpectations: [
      'E1. Relating Science and Technology to Our Changing World (Water Sustainability & Climate)',
      'E2. Exploring and Understanding Concepts (Earth Water Systems, Watersheds & Water Table)',
      'A2. Coding and Emerging Technologies (Modeling Systems in Science)'
    ],
    specificExpectations: {
      'E1.1': 'assess social and environmental impact of fresh water scarcity and propose sustainability plan',
      'E1.2': 'demonstrate understanding of First Nations, Métis, and Inuit knowledges and values about water',
      'E1.3': 'assess impact of scientific discoveries and technological innovations on water systems',
      'E2.1': 'identify states of water on Earth, distribution, circulation, and conditions of existence',
      'E2.2': 'demonstrate understanding of a watershed and its importance to water planning',
      'E2.3': 'explain how human activity and natural phenomena cause changes in the water table',
      'E2.4': 'identify factors contributing to melting of glaciers and effects on water systems',
      'E2.6': 'describe indicators of water quality and human impacts',
      'E2.7': 'explain how municipalities process water and manage usage',
      'A2.1': 'write and execute code in investigations and when modelling concepts'
    },
    inClassInvestigations: [
      'investigating factors affecting local watersheds and modelling changes in the groundwater table',
      'testing water quality indicators (pH, turbidity, dissolved oxygen) using testing kits',
      'writing and executing code in Scratch or micro:bit to simulate the water cycle and municipal water treatment',
      'mapping local watershed boundaries and analyzing runoff patterns from agricultural and urban areas'
    ],
    researchProjects: [
      'fresh water scarcity and proposing community action plans for sustainable water conservation',
      'First Nations, Métis, and Inuit knowledges and stewardship practices regarding water protection',
      'the impact of climate change on glacial retreat and global sea levels'
    ],
    levels: {
      '4+': {
        conceptStems: [
          '{name} demonstrates insightful, comprehensive understanding of global water systems, watersheds, and factors impacting water table stability.',
          '{name} articulates an advanced understanding of water stewardship, thoughtfully integrating Indigenous knowledge systems with scientific sustainability models.'
        ],
        investigationStems: [
          'In STEM investigations, {subjectLower} wrote and executed sophisticated code to model water filtration processes, incorporating multi-variable conditional logic.',
          '{name} accurately analyzed water quality data and modelled how watershed runoff impacts municipal reservoirs.'
        ],
        communicationStems: [
          '{name} thoroughly evaluated {project}, presenting compelling community sustainability proposals backed by empirical data.',
          '{subjectLower} communicated findings with rich environmental terminology and detailed infographics.'
        ],
        nextSteps: [
          '{name} is encouraged to extend {possessive} coding simulations to account for extreme weather events such as floods and droughts.',
          '{name} is encouraged to examine international water treaties and transboundary watershed management.'
        ]
      },
      '4': {
        conceptStems: [
          '{name} demonstrates a thorough understanding of water systems, accurately explaining the water cycle, watershed dynamics, and water table depletion.',
          '{name} consistently explains how human activities and climate change impact glacial melt and fresh water availability.'
        ],
        investigationStems: [
          'During in-class investigations, {subjectLower} created code to model water cycle processes and conducted accurate water quality tests.',
          '{name} wrote and executed code to simulate water treatment systems, explaining the inputs and outputs effectively.'
        ],
        communicationStems: [
          '{name} analyzed {project} and presented actionable conservation plans using clear visuals and structured slides.',
          '{subjectLower} communicated research on water sustainability with appropriate environmental science vocabulary.'
        ],
        nextSteps: [
          '{name} is encouraged to investigate how municipal water treatment facilities can integrate renewable energy to reduce environmental footprints.',
          '{name} should continue adding interactive variables into coding models to simulate changing environmental conditions.'
        ]
      },
      '3': {
        conceptStems: [
          '{name} identifies the various states of water on Earth\'s surface and explains how human activity and natural phenomena cause changes in the water table.',
          '{name} demonstrates understanding of watershed dynamics and describes how municipal water systems treat and distribute safe drinking water.'
        ],
        investigationStems: [
          'During in-class investigations, {subjectLower} investigated water sustainability and used code to model components of water systems studied in science.',
          '{name} executed code to model how groundwater is treated to become safe to drink.'
        ],
        communicationStems: [
          '{name} analyzed {project} and communicated findings using appropriate vocabulary and visuals (e.g., scientific drawings, oral presentations, Google slide deck).',
          '{subjectLower} shared research on water conservation using structured presentation slides and visuals.'
        ],
        nextSteps: [
          '{name} is encouraged to consider how Indigenous knowledge and values about water influence water responsibility and stewardship.',
          '{name} is encouraged to consider additional strategies to reduce household water consumption and share these with the school community.',
          '{name} is encouraged to consider how environmental changes (such as drought or heavy rainfall) can be represented in {possessive} coding models.'
        ]
      },
      '2': {
        conceptStems: [
          '{name} demonstrates developing understanding of water systems, identifying the states of water and basic features of the water table.',
          '{name} recognizes that humans impact fresh water supplies and identifies simple water conservation practices.'
        ],
        investigationStems: [
          'With guided support, {subjectLower} identified inputs and outputs in coding models representing the water cycle.',
          '{name} participated in classroom water testing trials with teacher assistance.'
        ],
        communicationStems: [
          '{name} shared basic details about {project} through conversation, oral sharing, and simple slides.',
          '{subjectLower} presented introductory ideas on water usage using guided graphic organizers.'
        ],
        nextSteps: [
          '{name} is encouraged to use classroom visual diagrams to review how water moves through watersheds.',
          '{name} is encouraged to identify the different states of water on Earth and use personal glossaries for unit vocabulary.',
          '{name} would benefit from identifying key components in coding programs before attempting to run simulations.'
        ]
      },
      '1': {
        conceptStems: [
          '{name} identifies water in its liquid state on Earth\'s surface and identifies one way that human activity affects the water table with teacher guidance.',
          '{name} demonstrates emerging knowledge of water resources and water conservation.'
        ],
        investigationStems: [
          'When reviewing coding models, {subjectLower} identifies simple inputs that start the program with support.',
          '{name} participated in water cycle demonstrations with direct assistance.'
        ],
        communicationStems: [
          '{name} explored {project} and shared basic observations through conversational discussions.',
          '{subjectLower} presented simple ideas with teacher prompting.'
        ],
        nextSteps: [
          '{name} is encouraged to use the science vocabulary glossary for the unit in order to communicate findings effectively.',
          '{name} is encouraged to identify how water is used in daily routines at home and discuss ways to conserve water.'
        ]
      }
    }
  }
}

/**
 * Returns science strand details given a topic or expectation code.
 * @param {string} topicOrCode
 * @returns {Object} Strand object
 */
export function resolveScienceStrand(topicOrCode = '') {
  const s = String(topicOrCode || '').toLowerCase().trim()
  if (s.includes('cell') || s.startsWith('b') || s.includes('life')) {
    return GRADE_8_SCIENCE_STRANDS.STRAND_B
  }
  if (s.includes('fluid') || s.includes('viscos') || s.includes('dens') || s.includes('buoy') || s.startsWith('c') || s.includes('matter')) {
    return GRADE_8_SCIENCE_STRANDS.STRAND_C
  }
  if (s.includes('system') || s.includes('lever') || s.includes('machine') || s.includes('mechanic') || s.startsWith('d') || s.includes('action')) {
    return GRADE_8_SCIENCE_STRANDS.STRAND_D
  }
  if (s.includes('water') || s.includes('table') || s.includes('shed') || s.startsWith('e') || s.includes('earth')) {
    return GRADE_8_SCIENCE_STRANDS.STRAND_E
  }
  return GRADE_8_SCIENCE_STRANDS.STRAND_B // Safe default
}
