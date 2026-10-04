import assert from 'assert'
import { formatCategoryShortCode } from './utils/categoryUtils.js'

console.log('🧪 Testing formatCategoryShortCode...')

// Standard categories from prompt and user image
assert.strictEqual(formatCategoryShortCode('Culminating'), 'Culm')
assert.strictEqual(formatCategoryShortCode('Culminating Activity'), 'Culm')
assert.strictEqual(formatCategoryShortCode('Culminating Task'), 'Culm')
assert.strictEqual(formatCategoryShortCode('Activities'), 'Act')
assert.strictEqual(formatCategoryShortCode('Activity'), 'Act')
assert.strictEqual(formatCategoryShortCode('Class Activities'), 'Act')
assert.strictEqual(formatCategoryShortCode('Exam'), 'Exam')
assert.strictEqual(formatCategoryShortCode('Final Exam'), 'Exam')
assert.strictEqual(formatCategoryShortCode('Test'), 'Test')
assert.strictEqual(formatCategoryShortCode('Unit Test'), 'Test')
assert.strictEqual(formatCategoryShortCode('Tests & Quizzes'), 'Test')
assert.strictEqual(formatCategoryShortCode('Quiz'), 'Quiz')
assert.strictEqual(formatCategoryShortCode('Quizzes'), 'Quiz')

// Assignments and Projects
assert.strictEqual(formatCategoryShortCode('Assignments'), 'Asmt')
assert.strictEqual(formatCategoryShortCode('Assignment'), 'Asmt')
assert.strictEqual(formatCategoryShortCode('Projects'), 'Proj')
assert.strictEqual(formatCategoryShortCode('Project'), 'Proj')
assert.strictEqual(formatCategoryShortCode('Labs'), 'Lab')
assert.strictEqual(formatCategoryShortCode('Laboratory'), 'Lab')
assert.strictEqual(formatCategoryShortCode('Homework'), 'HW')

// Ontario Achievement Chart
assert.strictEqual(formatCategoryShortCode('Knowledge & Understanding'), 'K&U')
assert.strictEqual(formatCategoryShortCode('Knowledge'), 'K&U')
assert.strictEqual(formatCategoryShortCode('Thinking & Investigation'), 'T&I')
assert.strictEqual(formatCategoryShortCode('Communication'), 'Comm')
assert.strictEqual(formatCategoryShortCode('Application'), 'App')

// Short strings (<= 4 chars)
assert.strictEqual(formatCategoryShortCode('Oral'), 'Oral')
assert.strictEqual(formatCategoryShortCode('Task'), 'Task')
assert.strictEqual(formatCategoryShortCode('Work'), 'Work')

// Specialized / Evidence Categories
assert.strictEqual(formatCategoryShortCode('Portfolio'), 'Port')
assert.strictEqual(formatCategoryShortCode('Journal'), 'Jour')
assert.strictEqual(formatCategoryShortCode('Investigation'), 'Inv')
assert.strictEqual(formatCategoryShortCode('Midterm'), 'Mid')
assert.strictEqual(formatCategoryShortCode('Summative Task'), 'Summ')
assert.strictEqual(formatCategoryShortCode('Observations'), 'Obs')
assert.strictEqual(formatCategoryShortCode('Conversations'), 'Conv')
assert.strictEqual(formatCategoryShortCode('Products'), 'Prod')

// Multi-word and single-word fallback
assert.strictEqual(formatCategoryShortCode('Class Work'), 'CW')
assert.strictEqual(formatCategoryShortCode('General Biology'), 'GB')
assert.strictEqual(formatCategoryShortCode('Seminar'), 'Semi')

// Objects with explicit code / shortCode or name
assert.strictEqual(formatCategoryShortCode({ name: 'Culminating' }), 'Culm')
assert.strictEqual(formatCategoryShortCode({ shortCode: 'CUL', name: 'Culminating' }), 'CUL')
assert.strictEqual(formatCategoryShortCode({ code: 'ACT', name: 'Activities' }), 'ACT')

// Edge cases
assert.strictEqual(formatCategoryShortCode(''), 'Misc')
assert.strictEqual(formatCategoryShortCode(null), 'Misc')
assert.strictEqual(formatCategoryShortCode(undefined), 'Misc')

console.log('✅ ALL formatCategoryShortCode tests passed successfully!')
