/**
 * Automated Verification Suite: Master Curriculum Course Blueprint Import & Class Flow
 */

import assert from 'assert'
import {
  useCurriculumLibrary,
  getCourseBlueprints,
  getMasterPreset,
  deriveOverallPreset,
  deriveSpecificPreset,
  getSuccessCriteriaPreset
} from './composables/useCurriculumLibrary.js'

console.log('--- RUNNING MASTER CURRICULUM IMPORT & FLOW TEST SUITE ---')

const { customPresets } = useCurriculumLibrary()

// 1. Verify custom course blueprint import
const sampleCustomCourse = {
  presetId: 'custom-ics4u-test',
  title: 'Ontario Grade 12 Computer Science (ICS4U)',
  subjectCode: 'ICS4U',
  grade: 'Grade 12',
  panel: 'secondary',
  department: 'Computer Studies',
  strands: [
    {
      id: 'strand-1',
      name: 'Strand A: Programming Concepts and Skills',
      overalls: [
        {
          code: 'A1',
          title: 'Data Types & Software Design',
          description: 'Demonstrate understanding of data types and software design.',
          weight: 2.0, // Custom 2x master weight
          specifics: [
            { code: 'A1.1', description: 'Declare variables with appropriate types.', weight: 2.0 },
            { code: 'A1.2', description: 'Construct complex algorithms.', weight: 1.0 }
          ]
        },
        {
          code: 'A2',
          title: 'Control Structures',
          description: 'Use control structures to direct program flow.',
          weight: 1.0,
          specifics: [
            { code: 'A2.1', description: 'Write nested loop constructs.', weight: 1.0 }
          ]
        }
      ]
    },
    {
      id: 'strand-2',
      name: 'Strand B: Software Development Cycle',
      overalls: [
        {
          code: 'B1',
          title: 'Project Management',
          description: 'Apply project management techniques.',
          weight: 0.5,
          specifics: [
            { code: 'B1.1', description: 'Create user stories and sprint milestones.', weight: 0.5 }
          ]
        }
      ]
    }
  ]
}

// Emulate saving custom master preset in customPresets map
customPresets.value[sampleCustomCourse.presetId] = JSON.parse(JSON.stringify(sampleCustomCourse))

// Test getCourseBlueprints recognizes custom course
const allBlueprints = getCourseBlueprints('secondary')
const icsBlueprint = allBlueprints.find(b => b.presetId === 'custom-ics4u-test')

assert(icsBlueprint, 'getCourseBlueprints should recognize newly imported custom course')
assert.strictEqual(icsBlueprint.courseCode, 'ICS4U')
assert.strictEqual(icsBlueprint.grade, 'Grade 12')
assert.strictEqual(icsBlueprint.strandsCount, 2)
console.log('✓ Custom course blueprint imported and recognized in blueprints list')

// Test variant derivation on custom course
assert(icsBlueprint.variants.specific, 'Has specific variant')
assert(icsBlueprint.variants.overall, 'Has overall variant')
assert.strictEqual(icsBlueprint.variants.specific.count, 4, '4 specific expectations (A1.1, A1.2, A2.1, B1.1)')
assert.strictEqual(icsBlueprint.variants.overall.count, 3, '3 overall expectations (A1, A2, B1)')
console.log(`✓ Custom course variants verified: Specific (${icsBlueprint.variants.specific.count}), Overall (${icsBlueprint.variants.overall.count})`)

// Test dynamic overall derivation
const derivedOveralls = deriveOverallPreset(sampleCustomCourse)
assert(derivedOveralls.isOverallOnly)
assert.strictEqual(derivedOveralls.strands.length, 2)
assert.strictEqual(derivedOveralls.strands[0].expectations.length, 2)
assert.strictEqual(derivedOveralls.strands[0].expectations[0].code, 'A1')
assert.strictEqual(derivedOveralls.strands[0].expectations[0].weight, 2.0, 'Preserves custom 2.0 master weight on overall expectation')
console.log('✓ Overall expectation derivation preserves custom master weights')

// 2. Test Success Criteria companion upload
const sampleCustomSC = {
  presetId: 'custom-ics4u-test-success-criteria',
  title: 'Grade 12 Computer Science (ICS4U) — Success Criteria',
  subjectCode: 'ICS4U',
  grade: 'Grade 12',
  panel: 'secondary',
  isSuccessCriteria: true,
  strands: [
    {
      id: 'strand-sc-1',
      name: 'Strand A: Programming Concepts',
      overalls: [
        {
          code: 'A1',
          description: 'I can demonstrate software design principles.',
          weight: 2.0,
          specifics: [
            { code: 'A1.1', description: 'I can declare constants and types.' },
            { code: 'A1.2', description: 'I can build algorithms.' }
          ]
        }
      ]
    }
  ]
}

customPresets.value[sampleCustomSC.presetId] = JSON.parse(JSON.stringify(sampleCustomSC))

// Check getSuccessCriteriaPreset links to base custom course
const scFound = getSuccessCriteriaPreset(sampleCustomCourse)
assert(scFound, 'Success criteria companion found for custom course')
assert.strictEqual(scFound.presetId, 'custom-ics4u-test-success-criteria')

// Re-fetch blueprints to verify success_criteria variant availability
const updatedBlueprints = getCourseBlueprints('secondary')
const updatedIcs = updatedBlueprints.find(b => b.presetId === 'custom-ics4u-test')
assert(updatedIcs.variants.success_criteria.available, 'Success criteria variant is now available on blueprint')
assert.strictEqual(updatedIcs.variants.success_criteria.count, 2)
console.log('✓ Success Criteria companion links automatically to Course Blueprint')

// Clean up
delete customPresets.value['custom-ics4u-test']
delete customPresets.value['custom-ics4u-test-success-criteria']

console.log('✓ All Master Curriculum Import & Flow tests PASSED!')
