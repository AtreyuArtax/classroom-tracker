#!/usr/bin/env node

/**
 * scripts/validate_curriculum.js
 *
 * Validates, lints, and optionally auto-formats all curriculum preset JSON files
 * in src/data/curriculum/ against the Classroom Tracker schema.
 *
 * Usage:
 *   node scripts/validate_curriculum.js          # Validate only
 *   node scripts/validate_curriculum.js --fix    # Auto-sanitize entities, spacing, and formatting
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { cleanExpectationText, cleanCurriculumObject } from '../src/utils/textUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const CURRICULUM_DIR = path.join(ROOT_DIR, 'src', 'data', 'curriculum')
const INDEX_FILE = path.join(CURRICULUM_DIR, 'index.js')

const shouldFix = process.argv.includes('--fix')

const indexContent = fs.existsSync(INDEX_FILE) ? fs.readFileSync(INDEX_FILE, 'utf8') : ''

let totalFiles = 0
let errorsCount = 0
let warningsCount = 0
let fixedFilesCount = 0

function walkDir(dir, callback) {
  const list = fs.readdirSync(dir)
  for (const item of list) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      walkDir(fullPath, callback)
    } else if (item.endsWith('.json') && item !== 'schema.json' && item !== 'template.json') {
      callback(fullPath)
    }
  }
}

console.log('=================================================================')
console.log(`🔍 CURRICULUM PRESET VALIDATION & LINTING ${shouldFix ? '(AUTO-FIX MODE)' : ''}`)
console.log('=================================================================\n')

walkDir(CURRICULUM_DIR, (filePath) => {
  totalFiles++
  const relPath = path.relative(ROOT_DIR, filePath)
  const baseName = path.basename(filePath)
  const fileErrors = []
  const fileWarnings = []

  let raw = fs.readFileSync(filePath, 'utf8')
  let data

  try {
    data = JSON.parse(raw)
  } catch (err) {
    console.error(`❌ [JSON Syntax Error] ${relPath}: ${err.message}`)
    errorsCount++
    return
  }

  // 1. Required Top-Level Fields
  const requiredFields = ['presetId', 'title', 'panel', 'region', 'grade', 'subjectCode', 'strands']
  for (const field of requiredFields) {
    if (!data[field]) {
      fileErrors.push(`Missing required top-level property: "${field}"`)
    }
  }

  if (data.panel && !['elementary', 'secondary'].includes(data.panel)) {
    fileErrors.push(`Invalid panel "${data.panel}". Must be "elementary" or "secondary".`)
  }

  // 2. Validate Strands & Expectations Structure
  const seenCodes = new Set()

  if (Array.isArray(data.strands)) {
    if (data.strands.length === 0) {
      fileErrors.push('Strands array is empty.')
    }

    data.strands.forEach((strand, sIdx) => {
      if (!strand.name || typeof strand.name !== 'string') {
        fileErrors.push(`Strand #${sIdx + 1} is missing a valid "name".`)
      }

      const overalls = strand.overalls || []
      if (!Array.isArray(overalls) || overalls.length === 0) {
        fileWarnings.push(`Strand "${strand.name || sIdx}" has no "overalls" expectations defined.`)
      }

      overalls.forEach((ov, oIdx) => {
        if (!ov.code) {
          fileErrors.push(`Overall expectation #${oIdx + 1} in strand "${strand.name}" is missing "code".`)
        } else {
          const upperCode = ov.code.toUpperCase().trim()
          if (seenCodes.has(upperCode)) {
            fileWarnings.push(`Duplicate expectation code "${upperCode}" in preset.`)
          }
          seenCodes.add(upperCode)
        }

        if (!ov.description || typeof ov.description !== 'string') {
          fileErrors.push(`Overall expectation "${ov.code || oIdx}" is missing "description".`)
        }

        const specifics = ov.specifics || []
        specifics.forEach((sp, spIdx) => {
          if (!sp.code) {
            fileErrors.push(`Specific expectation #${spIdx + 1} under "${ov.code}" is missing "code".`)
          } else {
            const upperSpCode = sp.code.toUpperCase().trim()
            if (seenCodes.has(upperSpCode)) {
              fileWarnings.push(`Duplicate expectation code "${upperSpCode}" in preset.`)
            }
            seenCodes.add(upperSpCode)
          }

          if (!sp.description || typeof sp.description !== 'string') {
            fileErrors.push(`Specific expectation "${sp.code || spIdx}" is missing "description".`)
          }
        })
      })
    })
  } else {
    fileErrors.push('Missing "strands" array.')
  }

  // 3. Check for HTML Entities / Whitespace Issues
  const entityMatch = raw.match(/&(?:nbsp|#160|#xa0|amp|quot|apos|ndash|mdash|hellip|lt|gt);?/gi)
  const unicodeNbspMatch = raw.match(/\u00a0/g)
  if (entityMatch || unicodeNbspMatch) {
    const count = (entityMatch ? entityMatch.length : 0) + (unicodeNbspMatch ? unicodeNbspMatch.length : 0)
    if (shouldFix) {
      // Auto-fix
    } else {
      fileErrors.push(`Found ${count} unescaped HTML entity / non-breaking space instances. Run with --fix to clean.`)
    }
  }

  // 4. Check if registered in index.js
  if (!indexContent.includes(baseName)) {
    fileWarnings.push(`File is not imported in src/data/curriculum/index.js`)
  }

  // 5. Auto-Fix Handling
  if (shouldFix) {
    const cleaned = cleanCurriculumObject(data)
    const formatted = JSON.stringify(cleaned, null, 2) + '\n'
    if (formatted !== raw) {
      fs.writeFileSync(filePath, formatted, 'utf8')
      fixedFilesCount++
    }
  }

  // Output Status for File
  if (fileErrors.length > 0) {
    console.log(`❌ ${relPath}`)
    fileErrors.forEach(e => console.log(`   └─ ERROR: ${e}`))
    errorsCount += fileErrors.length
  } else if (fileWarnings.length > 0) {
    console.log(`⚠️  ${relPath}`)
    fileWarnings.forEach(w => console.log(`   └─ WARN:  ${w}`))
    warningsCount += fileWarnings.length
  } else {
    console.log(`✓  ${relPath}`)
  }
})

console.log('\n=================================================================')
if (errorsCount === 0) {
  console.log(`🎉 ALL ${totalFiles} CURRICULUM PRESET FILES ARE 100% VALID & CLEAN!`)
  if (warningsCount > 0) console.log(`ℹ️  ${warningsCount} minor warning(s) found.`)
  if (shouldFix) console.log(`✨ ${fixedFilesCount} file(s) formatted & sanitized.`)
  console.log('=================================================================')
  process.exit(0)
} else {
  console.error(`🚨 VALIDATION FAILED: ${errorsCount} error(s), ${warningsCount} warning(s) across ${totalFiles} files.`)
  console.log('=================================================================')
  process.exit(1)
}
