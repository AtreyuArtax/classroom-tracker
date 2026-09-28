#!/usr/bin/env node

/**
 * scripts/check_imports.js
 *
 * Architecture and dependency rule enforcement script.
 * Enforces CLAUDE.md §4:
 * 1. ZERO raw getDB() invocations in src/components/
 * 2. ZERO imports of pure utility/calculation modules from src/db/ (must use src/utils/)
 * 3. ZERO imports of learningSkillsService in src/components/ (must use useLearningSkills composable)
 * 4. Ratcheted burndown enforcement: only approved legacy setup sub-views may import from src/db/
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const componentsDir = path.join(rootDir, 'src', 'components')

// Approved legacy sub-views extracted from Setup.vue / Reports.vue during 1,000-line modularization.
// No other components in src/components/ are permitted to import from src/db/.
const APPROVED_BURNDOWN_ALLOWLIST = new Set([
  'src/components/setup/DatabaseMaintenanceSettings.vue',
  'src/components/setup/AssessmentFrameworkSettings.vue',
  'src/components/setup/BehaviorSettings.vue',
  'src/components/setup/ElementarySubjectManager.vue'
])

function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList)
    } else if (entry.isFile() && (entry.name.endsWith('.vue') || entry.name.endsWith('.js'))) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

console.log('====================================================')
console.log('🔍 Architecture & Import Boundary Check')
console.log('====================================================\n')

const componentFiles = getAllFiles(componentsDir)
let totalViolations = 0
let getDBCallCount = 0
const errors = []
const warnings = []
const activeAllowlistMatches = new Set()

const FORBIDDEN_PURE_IMPORT_REGEX = /from\s+['"][^'"]*\/db\/(gradebook\/)?(gradeCalc|gradeCalcSBAR|timeUtils|exportService|dates)\.js['"]/g
const GETDB_CALL_REGEX = /\bgetDB\s*\(/g
const DB_IMPORT_REGEX = /from\s+['"][^'"]*\/db\/[^'"]*['"]/g
const LEARNING_SKILLS_DB_REGEX = /from\s+['"][^'"]*\/db\/learningSkillsService\.js['"]/g

for (const filePath of componentFiles) {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/')
  const content = fs.readFileSync(filePath, 'utf-8')

  // 1. Raw getDB() invocation check
  const getDBCalls = content.match(GETDB_CALL_REGEX)
  if (getDBCalls) {
    errors.push(`[RAW getDB] ${relativePath} directly calls getDB(). Components must use composables.`)
    totalViolations += getDBCalls.length
    getDBCallCount += getDBCalls.length
  }

  // 2. Pure calculations/utils imported from src/db/ instead of src/utils/
  const pureMatches = content.match(FORBIDDEN_PURE_IMPORT_REGEX)
  if (pureMatches) {
    errors.push(`[PURE UTILS IN DB] ${relativePath} imports pure calculation helpers from src/db/: ${pureMatches.join(', ')}. Use src/utils/ instead.`)
    totalViolations += pureMatches.length
  }

  // 3. Learning skills service direct import
  const lsMatches = content.match(LEARNING_SKILLS_DB_REGEX)
  if (lsMatches) {
    errors.push(`[LEARNING SKILLS SERVICE] ${relativePath} imports db/learningSkillsService.js directly. Use composables/useLearningSkills.js instead.`)
    totalViolations += lsMatches.length
  }

  // 4. Any import from src/db/
  const dbMatches = content.match(DB_IMPORT_REGEX)
  if (dbMatches) {
    if (!APPROVED_BURNDOWN_ALLOWLIST.has(relativePath)) {
      errors.push(`[DISALLOWED DB IMPORT] ${relativePath} imports directly from src/db/: ${dbMatches.join(', ')}.\n   Components must route all database access and mutations through reactive composables.`)
      totalViolations += dbMatches.length
    } else {
      activeAllowlistMatches.add(relativePath)
    }
  }
}

// 5. Ratchet check: verify if any allowlisted file no longer imports from src/db/
for (const allowedFile of APPROVED_BURNDOWN_ALLOWLIST) {
  if (!activeAllowlistMatches.has(allowedFile)) {
    warnings.push(`[BURNDOWN RATCHET] ${allowedFile} has 0 imports from src/db/! It can now be removed from APPROVED_BURNDOWN_ALLOWLIST.`)
  }
}

console.log(`Checked ${componentFiles.length} component files in src/components/`)
console.log(`- Raw getDB() calls: ${getDBCallCount}`)
console.log(`- Approved legacy sub-views on burndown allowlist: ${activeAllowlistMatches.size} / ${APPROVED_BURNDOWN_ALLOWLIST.size}`)

if (warnings.length > 0) {
  console.log('\n💡 Burndown Opportunities:')
  warnings.forEach(w => console.log(`  ${w}`))
}

if (errors.length > 0) {
  console.error('\n❌ Architectural Boundaries Violated:')
  errors.forEach(e => console.error(`  ${e}`))
  console.error(`\nFound ${totalViolations} rule violation(s).`)
  process.exit(1)
} else {
  console.log('\n✅ All architectural import boundaries and rules satisfied!\n')
  process.exit(0)
}
