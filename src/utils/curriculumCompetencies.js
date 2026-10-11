/**
 * src/utils/curriculumCompetencies.js
 *
 * Authentic Ontario Curriculum & Success Criteria competency mapping.
 * Translates raw gradebook assessment titles (e.g. "Kinematics Unit Test", "Forces Lab")
 * into rich, professional pedagogical skill phrases based on Ministry of Education curriculum strands.
 *
 * Supported Courses:
 *  - SPH3U (Physics 11)
 *  - SNC1W (Destreamed Science 9)
 *  - SBI3U (Biology 11)
 *  - SCH3U (Chemistry 11)
 *  - SPH4U (Physics 12)
 *  - SNC2D / SNC2P (Science 10)
 *  - MTH1W / MPM2D / MFM2P (Math 9 & 10)
 */

/**
 * Normalizes a course string (e.g. "SPH3U-01", "Grade 11 Physics (SPH3U)", "sph3u")
 * to standard 5-character Ontario course code (e.g. "SPH3U").
 */
export function normalizeCourseCode(raw) {
  if (!raw) return ''
  const str = String(raw).toUpperCase().trim()
  const match = str.match(/\b([A-Z]{3}[0-9][A-Z0-9])\b/)
  if (match) return match[1]

  // Friendly aliases for class names without standard 5-char course codes
  if (str.includes('PHYSIC') && (str.includes('11') || str.includes('3U'))) return 'SPH3U'
  if (str.includes('PHYSIC') && (str.includes('12') || str.includes('4U'))) return 'SPH4U'
  if (str.includes('CHEM') && (str.includes('11') || str.includes('3U'))) return 'SCH3U'
  if (str.includes('BIO') && (str.includes('11') || str.includes('3U'))) return 'SBI3U'
  if (str.includes('SCIENCE') && (str.includes('9') || str.includes('1W') || str.includes('1D'))) return 'SNC1W'
  if (str.includes('SCIENCE') && (str.includes('10') || str.includes('2D') || str.includes('2P'))) return 'SNC2D'
  if (str.includes('MATH') && (str.includes('9') || str.includes('1W'))) return 'MTH1W'
  if (str.includes('MATH') && (str.includes('10') || str.includes('2D'))) return 'MPM2D'

  return str.slice(0, 5)
}

/**
 * Competency definition structure:
 *  - label: Crisp label for dropdown display (e.g. "Kinematics: 1D & 2D Motion")
 *  - phrase: Full grammatical verb phrase for comment insertion (e.g. "analyzing 1D and 2D motion and solving projectile kinematics problems")
 *  - keywords: Array of substring tokens matched against assessment titles
 */
export const COURSE_COMPETENCIES = {
  // ── SPH3U: Grade 11 Physics ─────────────────────────────────────────────────
  SPH3U: [
    {
      label: 'Kinematics: 1D & 2D Motion',
      phrase: 'analyzing 1D and 2D motion and solving projectile kinematics problems',
      keywords: ['kinematic', 'projectile', 'uniform motion', 'acceleration', 'motion in 1d', 'motion in 2d', 'free fall', 'kinematics']
    },
    {
      label: 'Kinematics: Graphing & Motion Analysis',
      phrase: 'constructing and interpreting position-time and velocity-time graphs',
      keywords: ['position-time', 'velocity-time', 'p-t', 'v-t', 'motion graph', 'motion lab', 'graphing', 'slope']
    },
    {
      label: 'Forces: Free-Body Diagrams & Newton’s Laws',
      phrase: 'constructing free-body diagrams and applying Newton’s laws to solve net force problems',
      keywords: ['force', 'friction', 'newton', 'free-body', 'free body', 'fbd', 'dynamics', 'gravity', 'normal force', 'net force', 'forces']
    },
    {
      label: 'Forces: Friction & Inclined Planes',
      phrase: 'analyzing static and kinetic friction on horizontal and inclined surfaces',
      keywords: ['inclined plane', 'incline', 'coefficient of friction', 'ramp', 'friction lab']
    },
    {
      label: 'Energy: Work, Power & Conservation',
      phrase: 'applying the law of conservation of mechanical energy and work-energy relationships',
      keywords: ['energy', 'work', 'power', 'conservation of energy', 'kinetic energy', 'potential energy', 'work-energy', 'efficiency']
    },
    {
      label: 'Energy: Thermal Physics & Heat Capacity',
      phrase: 'analyzing thermal energy transfer and calculating specific heat capacity',
      keywords: ['thermal', 'heat', 'calorimetry', 'heat capacity', 'temperature change']
    },
    {
      label: 'Waves & Sound: Frequency & Resonance',
      phrase: 'investigating mechanical wave properties, resonance, and the Doppler effect',
      keywords: ['wave', 'sound', 'frequency', 'resonance', 'doppler', 'wavelength', 'speed of sound', 'acoustics', 'pitch']
    },
    {
      label: 'Waves & Sound: Standing Waves & Air Columns',
      phrase: 'analyzing standing wave boundary conditions in open and closed air columns',
      keywords: ['standing wave', 'air column', 'harmonics', 'node', 'antinode']
    },
    {
      label: 'Electricity & Magnetism: Circuits & Fields',
      phrase: 'analyzing electric circuits using Ohm’s and Kirchhoff’s laws and electromagnetic principles',
      keywords: ['circuit', 'electricity', 'current', 'voltage', 'resistance', 'ohm', 'kirchhoff', 'magnetic', 'electromagnet', 'potential difference', 'motor']
    }
  ],

  // ── SNC1W: Grade 9 Destreamed Science ───────────────────────────────────────
  SNC1W: [
    {
      label: 'Biology: Ecosystems & Climate Sustainability',
      phrase: 'evaluating nutrient cycles, biodiversity, and sustainable ecosystem dynamics',
      keywords: ['ecosystem', 'climate', 'sustainability', 'biodiversity', 'nutrient cycle', 'carbon cycle', 'nitrogen cycle', 'ecology', 'greenhouse', 'invasive']
    },
    {
      label: 'Biology: Photosynthesis & Energy Flow',
      phrase: 'analyzing cellular energy flow and trophic interactions in food webs',
      keywords: ['photosynthesis', 'trophic', 'food web', 'food chain', 'energy flow']
    },
    {
      label: 'Chemistry: Matter & Atomic Structure',
      phrase: 'interpreting atomic structure, periodic table trends, and physical and chemical properties',
      keywords: ['matter', 'atom', 'periodic table', 'element', 'compound', 'physical property', 'chemical property', 'chemical change', 'pure substance', 'mixture', 'density']
    },
    {
      label: 'Chemistry: Bohr-Rutherford Models & Reactivity',
      phrase: 'constructing Bohr-Rutherford diagrams and evaluating valence electron reactivity',
      keywords: ['bohr', 'rutherford', 'bohr-rutherford', 'valence', 'electron shell']
    },
    {
      label: 'Physics: Electrical Circuits & Energy',
      phrase: 'designing and analyzing series and parallel circuits using Ohm’s law',
      keywords: ['circuit', 'electric', 'current', 'voltage', 'resistance', 'ohm', 'static electricity', 'charge', 'series', 'parallel', 'potential difference', 'energy consumption', 'power']
    },
    {
      label: 'Space: Celestial Systems & Technology',
      phrase: 'investigating celestial bodies, astronomical phenomena, and space exploration technologies',
      keywords: ['space', 'astronomy', 'celestial', 'solar system', 'planet', 'star', 'sun', 'moon', 'orbit', 'telescope', 'astronomical', 'universe']
    },
    {
      label: 'Inquiry: Scientific Investigation Skills',
      phrase: 'conducting controlled scientific inquiries and analyzing experimental evidence',
      keywords: ['stem', 'investigation', 'experiment', 'lab skills', 'scientific method', 'variables', 'hypothesis', 'experimental design']
    }
  ],

  // ── SBI3U: Grade 11 Biology ─────────────────────────────────────────────────
  SBI3U: [
    {
      label: 'Genetics: Mendelian Inheritance & Crosses',
      phrase: 'analyzing Mendelian genetics, monohybrid and dihybrid crosses, and DNA inheritance patterns',
      keywords: ['genetic', 'inheritance', 'punnett', 'allele', 'genotype', 'phenotype', 'monohybrid', 'dihybrid', 'mendel', 'pedigree', 'crosses', 'traits']
    },
    {
      label: 'Genetics: Meiosis & Chromosomal Genetics',
      phrase: 'investigating meiosis, chromosomal abnormalities, and DNA inheritance mechanisms',
      keywords: ['dna', 'mitosis', 'meiosis', 'chromosome', 'karyotype', 'mutation', 'non-disjunction', 'replication', 'crossing over', 'chromosomal']
    },
    {
      label: 'Internal Systems: Circulatory & Respiratory Systems',
      phrase: 'analyzing cardiac dynamics, gas exchange, and respiratory system regulation',
      keywords: ['circulatory', 'respiratory', 'heart', 'lung', 'blood', 'cardiac', 'ventilation', 'vessels', 'gas exchange', 'alveoli', 'blood pressure']
    },
    {
      label: 'Internal Systems: Digestion & Enzyme Catalysis',
      phrase: 'explaining the anatomy, function, and regulation of circulatory, respiratory, and digestive systems',
      keywords: ['internal system', 'digestive', 'digestion', 'enzyme', 'stomach', 'absorption', 'homeostasis', 'macromolecule', 'peristalsis', 'catalysis', 'amylase', 'nephron']
    },
    {
      label: 'Evolution: Natural Selection & Adaptation',
      phrase: 'evaluating evolutionary mechanisms, natural selection pressures, and phylogenetic evidence',
      keywords: ['evolution', 'natural selection', 'darwin', 'adaptation', 'speciation', 'selective pressure', 'microevolution', 'macroevolution', 'selection pressure']
    },
    {
      label: 'Evolution: Phylogenetics & Evolutionary Evidence',
      phrase: 'interpreting homologous structures, fossil records, and phylogenetic trees',
      keywords: ['fossil', 'phylogenetic', 'homologous', 'cladogram', 'phylogeny', 'embryology', 'analogous', 'vestigial']
    },
    {
      label: 'Diversity: Taxonomy & Dichotomous Classification',
      phrase: 'classifying living organisms using taxonomy, dichotomous keys, and evolutionary relationships',
      keywords: ['diversity', 'taxonomy', 'classification', 'binomial', 'kingdom', 'domain', 'dichotomous key', 'morphology']
    },
    {
      label: 'Diversity: Bacteria, Viruses & Microorganisms',
      phrase: 'evaluating the structure, reproduction, and ecological roles of microorganisms',
      keywords: ['bacteria', 'virus', 'fungi', 'protist', 'microbiology', 'pathogen', 'microbe', 'antibiotic']
    },
    {
      label: 'Plants: Vascular Transport & Transpiration',
      phrase: 'investigating plant cellular anatomy, vascular transport, and transpiration mechanisms',
      keywords: ['plant', 'leaf', 'root', 'stem', 'vascular', 'xylem', 'phloem', 'transpiration', 'photosynthesis', 'stomata', 'chloroplast', 'angiosperm', 'tissues']
    },
    {
      label: 'Plants: Anatomy & Cellular Tissues',
      phrase: 'examining specialized plant tissues, organ structures, and photosynthetic processes',
      keywords: ['plant anatomy', 'leaf anatomy', 'meristem', 'plant tissue', 'mesophyll']
    }
  ],

  // ── SCH3U: Grade 11 Chemistry ───────────────────────────────────────────────
  SCH3U: [
    {
      label: 'Matter & Bonding: Periodic Trends & Properties',
      phrase: 'analyzing periodic trends, atomic radii, and ionization energies across the periodic table',
      keywords: ['periodic trend', 'periodic table', 'ionization', 'electronegativity', 'atomic radius', 'electron affinity', 'periodic trends']
    },
    {
      label: 'Matter & Bonding: Chemical Bonding & Lewis Structures',
      phrase: 'analyzing periodic trends, ionic and covalent bonding, and chemical nomenclature',
      keywords: ['bonding', 'ionic', 'covalent', 'lewis structure', 'lewis', 'polarity', 'electronegativity difference', 'dipole', 'chemical formula', 'nomenclature', 'compound', 'valence']
    },
    {
      label: 'Chemical Reactions: Synthesis, Decomposition & Combustion',
      phrase: 'predicting reaction products, balancing chemical equations, and classifying reaction types',
      keywords: ['reaction', 'synthesis', 'decomposition', 'combustion', 'reaction types', 'chemical equation', 'balancing equations']
    },
    {
      label: 'Chemical Reactions: Single & Double Displacement',
      phrase: 'analyzing single and double displacement reactions using solubility rules and the activity series',
      keywords: ['single displacement', 'double displacement', 'displacement', 'activity series', 'precipitate reaction', 'neutralization']
    },
    {
      label: 'Stoichiometry: The Mole Concept & Mass Conversions',
      phrase: 'applying the mole concept and stoichiometry to calculate theoretical yield and limiting reactants',
      keywords: ['mole', 'stoichiometry', 'avogadro', 'molar mass', 'percentage yield', 'empirical formula', 'molecular formula', 'limiting reactant', 'limiting reagent', 'mass-to-mole', 'stoich', 'mass conversion']
    },
    {
      label: 'Stoichiometry: Limiting Reactants & Theoretical Yield',
      phrase: 'calculating theoretical yields, identifying limiting reactants, and determining percentage yield',
      keywords: ['theoretical yield', 'limiting reactant', 'limiting reagent', 'excess reagent', 'mass yield', 'yield calculation']
    },
    {
      label: 'Solutions: Concentration & Dilutions',
      phrase: 'calculating solution concentrations and predicting precipitate formation in aqueous systems',
      keywords: ['solution', 'solubility', 'concentration', 'molarity', 'precipitate', 'dilution', 'standard solution', 'molar concentration', 'volumetric flask', 'solute', 'solvent', 'acid', 'base', 'ph', 'titration', 'aqueous']
    },
    {
      label: 'Solutions: Solubility Curves & Net Ionic Equations',
      phrase: 'interpreting solubility curves and formulating net ionic equations for aqueous precipitate reactions',
      keywords: ['solubility curve', 'net ionic', 'spectator ion', 'saturation', 'saturated', 'unsaturated', 'supersaturated']
    },
    {
      label: 'Gases: Gas Laws & Kinetic Molecular Theory',
      phrase: 'applying ideal gas laws and kinetic molecular theory to solve pressure and volume relationships',
      keywords: ['gas', 'boyle', 'charles', 'ideal gas', 'gas law', 'kelvin', 'pressure', 'atmospheric', 'molar volume', 'gas stoichiometry', 'stp', 'satp', 'pvnrt', 'kinetic molecular']
    },
    {
      label: 'Gases: The Ideal Gas Law & Gas Stoichiometry',
      phrase: 'applying the ideal gas law and molar volume to solve multi-step gas stoichiometry problems',
      keywords: ['ideal gas law', 'gas stoichiometry', 'pvnrt calculation', 'gas calculation']
    }
  ],

  // ── SPH4U: Grade 12 Physics ─────────────────────────────────────────────────
  SPH4U: [
    {
      label: 'Dynamics: Circular Motion & Planetary Orbits',
      phrase: 'solving 2D circular motion, centripetal force, and orbital mechanics problems',
      keywords: ['circular motion', 'centripetal', 'friction on curves', 'banked curve', 'inertial frame', 'non-inertial', 'centripetal acceleration', 'universal gravitation', 'kepler', 'orbit', 'orbital']
    },
    {
      label: 'Dynamics: Inclined Planes & Friction Vectors',
      phrase: 'resolving two-dimensional force vectors and friction on horizontal and inclined surfaces',
      keywords: ['inclined plane', 'incline', 'ramp', 'two-dimensional force', 'forces in 2d', 'fbd in 2d', 'friction on incline']
    },
    {
      label: 'Energy & Momentum: Elastic & Inelastic Collisions',
      phrase: 'applying conservation of momentum and analyzing 1D and 2D elastic and inelastic collisions',
      keywords: ['momentum', 'impulse', 'collision', 'elastic collision', 'inelastic collision', 'conservation of momentum', '1d collision', '2d collision', 'centre of mass', 'kinetic energy in collisions']
    },
    {
      label: 'Energy & Momentum: Conservation & Work-Energy',
      phrase: 'applying conservation of energy and analyzing work-energy transformations in closed systems',
      keywords: ['energy conservation', 'work-energy', 'spring', 'elastic potential', 'thermal loss', 'closed system', 'power']
    },
    {
      label: 'Fields: Gravitational, Electric & Magnetic',
      phrase: 'analyzing gravitational, electric, and magnetic field interactions and charged particle paths',
      keywords: ['field', 'coulomb', 'electric field', 'magnetic field', 'lorentz', 'right-hand rule', 'potential energy', 'electric potential', 'millikan', 'equipotential', 'flux']
    },
    {
      label: 'Fields: Magnetic Deflection & Electromagnetic Induction',
      phrase: 'analyzing magnetic forces on moving charges and applying right-hand rules to electromagnetic systems',
      keywords: ['magnetic force', 'deflection', 'charged particle', 'electromagnetism', 'solenoid', 'mass spectrometer', 'induction']
    },
    {
      label: 'Light: Wave Optics & Diffraction',
      phrase: 'interpreting double-slit diffraction, interference patterns, and the wave nature of light',
      keywords: ['diffraction', 'double slit', 'double-slit', 'interference', 'young', 'thin film', 'polarization', 'refraction', 'snell', 'wave optics', 'spectral', 'diffraction grating', 'wavelength of light', 'fringe spacing']
    },
    {
      label: 'Light: Thin-Film Interference & Polarization',
      phrase: 'analyzing thin-film interference, polarization, and electromagnetic wave boundary conditions',
      keywords: ['thin film', 'polarization', 'phase shift', 'boundary condition']
    },
    {
      label: 'Modern Physics: Quantum & Special Relativity',
      phrase: 'analyzing special relativity, time dilation, and the photoelectric effect in quantum theory',
      keywords: ['relativity', 'quantum', 'photoelectric', 'time dilation', 'length contraction', 'einstein', 'photon', 'de broglie', 'bohr model', 'mass-energy', 'speed of light', 'blackbody', 'work function']
    },
    {
      label: 'Modern Physics: Special Relativity & Space-Time',
      phrase: 'analyzing special relativity, time dilation, length contraction, and relativistic momentum',
      keywords: ['special relativity', 'proper time', 'relativistic momentum', 'simultaneity']
    }
  ],

  // ── SNC2D / SNC2P: Grade 10 Science ─────────────────────────────────────────
  SNC2D: [
    {
      label: 'Biology: Cells, Tissues & Organ Systems',
      phrase: 'examining cellular division, organ systems, and animal anatomy during laboratory investigations',
      keywords: ['cell', 'mitosis', 'organ system', 'tissues', 'digestive', 'circulatory', 'respiratory', 'specialized cells', 'cancer', 'microscope']
    },
    {
      label: 'Chemistry: Chemical Reactions & Acids/Bases',
      phrase: 'balancing chemical equations, identifying reaction types, and investigating acids and bases',
      keywords: ['reaction', 'acid', 'base', 'ph', 'indicator', 'neutralization', 'synthesis', 'decomposition', 'combustion', 'polyatomic', 'ionic naming']
    },
    {
      label: 'Optics: Reflection, Refraction & Ray Diagrams',
      phrase: 'constructing ray diagrams and applying geometric optics principles to mirrors and lenses',
      keywords: ['optics', 'light', 'reflection', 'refraction', 'snell', 'mirror', 'lens', 'ray diagram', 'focal point', 'index of refraction', 'magnification']
    },
    {
      label: 'Climate Change: Earth Systems & Greenhouse Effect',
      phrase: 'analyzing climate indicators, heat transfer mechanisms, and human impacts on global climate',
      keywords: ['climate', 'greenhouse', 'global warming', 'albedo', 'heat transfer', 'carbon footprint', 'feedback loop']
    }
  ],

  // ── MTH1W / MPM2D: High School Mathematics ──────────────────────────────────
  MTH1W: [
    {
      label: 'Algebra: Linear Relations & Equations',
      phrase: 'representing linear relations graphically, algebraically, and solving multi-step equations',
      keywords: ['linear', 'slope', 'rate of change', 'equation', 'algebra', 'solve for x', 'intercept', 'table of values']
    },
    {
      label: 'Geometry & Measurement',
      phrase: 'applying geometric properties, angle theorems, and measurement optimization formulas',
      keywords: ['geometry', 'measurement', 'optimization', 'surface area', 'volume', 'pythagorean', 'angle']
    },
    {
      label: 'Data & Financial Literacy',
      phrase: 'analyzing bivariate data distributions and evaluating financial mathematical models',
      keywords: ['data', 'scatter plot', 'correlation', 'financial', 'interest', 'budget', 'statistics']
    }
  ],

  MPM2D: [
    {
      label: 'Quadratics: Factoring & Parabolic Models',
      phrase: 'analyzing quadratic relations, factoring expressions, and solving parabolic models',
      keywords: ['quadratic', 'parabola', 'vertex', 'factoring', 'quadratic formula', 'zeros', 'maximum', 'minimum']
    },
    {
      label: 'Trigonometry: Sine, Cosine & Right Triangles',
      phrase: 'applying primary trigonometric ratios and sine/cosine laws to resolve geometric problems',
      keywords: ['trigonometry', 'trig', 'sohcahtoa', 'sine law', 'cosine law', 'angles', 'triangles']
    },
    {
      label: 'Analytic Geometry & Linear Systems',
      phrase: 'solving linear systems and determining properties of geometric line segments and shapes',
      keywords: ['linear system', 'elimination', 'substitution', 'intersection', 'midpoint', 'distance formula', 'circle equation']
    }
  ]
}

// Alias SNC2P to SNC2D competencies
COURSE_COMPETENCIES.SNC2P = COURSE_COMPETENCIES.SNC2D
// Alias MFM2P to MPM2D competencies
COURSE_COMPETENCIES.MFM2P = COURSE_COMPETENCIES.MPM2D

/**
 * Returns available curated competencies for a given course code.
 * Falls back to generic science/math competencies if course is unlisted.
 */
export function getCourseCompetencies(rawCourseCode) {
  const code = normalizeCourseCode(rawCourseCode)
  if (COURSE_COMPETENCIES[code]) {
    return COURSE_COMPETENCIES[code]
  }

  // Broad departmental fallback
  if (code.startsWith('S')) {
    // Other Science course
    return [
      { label: 'Scientific Inquiry & Investigation', phrase: 'conducting controlled investigations and analyzing experimental data', keywords: ['inquiry', 'lab', 'investigation', 'experiment'] },
      { label: 'Conceptual Understanding & Models', phrase: 'interpreting core scientific principles and evaluating theoretical models', keywords: ['theory', 'model', 'concept', 'understanding'] },
      { label: 'Quantitative Problem Solving', phrase: 'applying mathematical formulas and scientific conventions to multi-step problems', keywords: ['problem', 'calculation', 'quantitative', 'formula'] }
    ]
  }

  if (code.startsWith('M')) {
    // Other Math course
    return [
      { label: 'Algebraic & Numeric Problem Solving', phrase: 'applying algebraic methods and communicating logical steps clearly', keywords: ['algebra', 'equation', 'solve', 'numeric'] },
      { label: 'Graphical & Relational Analysis', phrase: 'interpreting algebraic and graphical models with precision', keywords: ['graph', 'function', 'relation', 'model'] }
    ]
  }

  return []
}

/**
 * Intelligently translates a raw assessment title (e.g. "Kinematics Unit Test")
 * into an authentic curriculum competency phrase based on course code.
 *
 * If the title already matches a known competency phrase, it is returned intact.
 * If no keywords match, falls back to the cleaned task title.
 */
export function mapAssessmentToCompetency(rawTitle, rawCourseCode) {
  if (!rawTitle) return ''
  const trimmed = String(rawTitle).trim()
  if (!trimmed) return ''

  // 1. Direct match check: did the user already pick a competency phrase or label?
  const competencies = getCourseCompetencies(rawCourseCode)
  const existingComp = competencies.find(c => c.phrase === trimmed || c.label === trimmed)
  if (existingComp) return existingComp.phrase

  // Also check if trimmed is already a known competency phrase across all courses
  for (const list of Object.values(COURSE_COMPETENCIES)) {
    const directMatch = list.find(c => c.phrase === trimmed || c.label === trimmed)
    if (directMatch) return directMatch.phrase
  }

  // 2. Keyword match against course competencies
  const lowerTitle = trimmed.toLowerCase()

  // Match against keywords
  for (const comp of competencies) {
    for (const kw of comp.keywords) {
      // Word boundary or substring search
      if (lowerTitle.includes(kw.toLowerCase())) {
        return comp.phrase
      }
    }
  }

  // 3. Fallback: Strip common evaluation wrappers ("Unit 1 - ", "Test", "Quiz", "Lab")
  let fallback = trimmed
    .replace(/^(unit|ch\.|chapter|module|section|strand)\s*\d+[\s:–—-]+/i, '')
    .replace(/\s+(unit\s+test|test|quiz|exam|inquiry\s+lab|lab\s+report|lab|assignment|worksheet|problem\s+set|evaluation|checkpoint)\b/gi, '')
    .trim()

  return fallback || trimmed
}
