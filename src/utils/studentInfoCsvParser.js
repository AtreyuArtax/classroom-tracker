/**
 * src/utils/studentInfoCsvParser.js
 *
 * CSV and XLSX parser & normalizer for Microsoft Forms Student Information & Intake surveys.
 * Supports:
 *  - Standard Microsoft Forms Excel (.xlsx) and CSV exports
 *  - Automated question header detection using flexible regex
 *  - Office 365 student login email & username matching
 *  - Student ID and fuzzy name matching against active class roster
 *  - Multi-submission deduplication (keeps newest completion timestamp)
 */

import { parseCsvRows, parseXlsxToRows } from './learningSkillsCsvParser.js'

/**
 * Normalizes course confidence to { rating: number|null, label: string }
 * e.g. "4 - Fairly confident / Ready to learn" -> { rating: 4, label: "4 - Fairly confident / Ready to learn" }
 * @param {string|number|null|undefined} raw
 * @returns {{ rating: number|null, label: string }}
 */
export function normalizeConfidence(raw) {
  if (raw === null || raw === undefined) return { rating: null, label: '' }
  const str = String(raw).trim()
  if (!str) return { rating: null, label: '' }

  // Clean option prefixes like "a. 1 - ..." or "d. 4 - ..."
  const cleanLabel = str.replace(/^[a-z]\.\s*/i, '').trim()
  const match = cleanLabel.match(/^([1-5])\b/)
  const rating = match ? parseInt(match[1], 10) : null
  
  return { rating, label: cleanLabel }
}

/**
 * Sanitizes open text survey input:
 * - Strips unprintable ASCII control characters (preserving newlines and tabs)
 * - Trims whitespace
 * - Clamps to a safe maximum length to prevent storage exhaustion or visual spoofing
 * @param {any} raw
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeTextField(raw, maxLength = 2000) {
  if (raw === null || raw === undefined) return ''
  const cleaned = String(raw).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned
}

/**
 * Strips option prefixes like "a. ", "b. ", "c. " from multiple choice answers.
 * @param {string|null|undefined} raw
 * @param {number} maxLength
 * @returns {string}
 */
export function cleanOptionText(raw, maxLength = 250) {
  if (raw === null || raw === undefined) return ''
  const cleaned = sanitizeTextField(raw, maxLength).replace(/^[a-z]\.\s*/i, '').trim()
  return cleaned
}

/**
 * Core processor for a 2D array of survey response rows (from CSV or XLSX).
 *
 * @param {Array<Array<string>>} rows
 * @param {Array<Object>} rosterStudents - Array of { studentId, firstName, lastName, studentEmail, ... }
 * @returns {Object} { matchedRecords, unmatchedRows, duplicateCount, totalResponses, detectedColumns }
 */
export function parseStudentInfoRows(rows, rosterStudents = []) {
  if (!rows || rows.length < 2) {
    throw new Error('File contains no survey data rows.')
  }

  const headers = rows[0].map(h => String(h || '').trim())
  
  // Find candidate column indices
  const emailColIndices = []
  const nameColIndices = []
  let completionTimeCol = -1

  const fieldCols = {
    preferredName: -1,
    pronouns: -1,
    parentCommunication: -1,
    seatingPreference: -1,
    targetGrade: -1,
    courseConfidence: -1,
    extracurricularsHobbies: -1,
    confidentialNote: -1
  }

  headers.forEach((h, idx) => {
    const headerLower = h.toLowerCase().trim()
    
    // 1. Preferred Name
    if (/prefer.*name|call\s*you|nickname|what\s*name/i.test(headerLower) && fieldCols.preferredName === -1) {
      fieldCols.preferredName = idx
    }
    // 2. Parent Communication (safety boundary for pronouns/name)
    else if (/parent|contacting\s*home|safe\s*to\s*use|communicat.*home/i.test(headerLower) && fieldCols.parentCommunication === -1) {
      fieldCols.parentCommunication = idx
    }
    // 3. Pronouns
    else if (/(^|\b)pronoun/i.test(headerLower) && fieldCols.pronouns === -1) {
      fieldCols.pronouns = idx
    }
    // 4. Seating / Learning Environment
    else if (/seat|classroom.*learn\s*best|where.*learn\s*best|desk/i.test(headerLower) && fieldCols.seatingPreference === -1) {
      fieldCols.seatingPreference = idx
    }
    // 5. Target Grade / Goal
    else if (/target|grade.*aim|goal.*course|expect.*grade|grade.*range|aiming\s*for/i.test(headerLower) && fieldCols.targetGrade === -1) {
      fieldCols.targetGrade = idx
    }
    // 6. Course Confidence
    else if (/confiden|scale\s*of\s*1\s*to\s*5|feel.*course/i.test(headerLower) && fieldCols.courseConfidence === -1) {
      fieldCols.courseConfidence = idx
    }
    // 7. Extracurriculars & Hobbies
    else if (/sport|club|extracurricular|hobbi|arts|outside.*school|enjoy/i.test(headerLower) && fieldCols.extracurricularsHobbies === -1) {
      fieldCols.extracurricularsHobbies = idx
    }
    // 8. Confidential Teacher Note
    else if (/anything\s*else|confidential|help\s*you.*succeed|know\s*about\s*you|teacher.*note/i.test(headerLower) && fieldCols.confidentialNote === -1) {
      fieldCols.confidentialNote = idx
    }
    // Metadata columns
    else if (/email|e-mail|upn|user\s*name|respondent(\s*email)?/i.test(headerLower)) {
      emailColIndices.push(idx)
    } else if (/completion|submission|start\s*time|date|timestamp/i.test(headerLower) && completionTimeCol === -1) {
      completionTimeCol = idx
    } else if (/(^|\b)name(\b|$)|student\s*name|full\s*name|respondent(\s*name)?|display\s*name/i.test(headerLower)) {
      nameColIndices.push(idx)
    }
  })

  // Quick validation check: at least 2 fields detected
  const detectedCount = Object.values(fieldCols).filter(idx => idx !== -1).length
  if (detectedCount === 0) {
    throw new Error('Could not detect any student survey columns (Preferred Name, Pronouns, Seating, Target Grade, Confidence, Hobbies, or Notes) in the file.')
  }

  // Pre-index roster students for high-speed matching
  const emailIndex = new Map()
  const usernameIndex = new Map()
  const fullNameIndex = new Map()
  const idIndex = new Map()
  const firstNameMap = new Map()
  const lastNameMap = new Map()

  for (const s of rosterStudents) {
    const rawEmail = s.studentEmail || s.email || ''
    if (rawEmail) {
      const cleanEmail = rawEmail.toLowerCase().trim()
      emailIndex.set(cleanEmail, s)
      const username = cleanEmail.split('@')[0].trim()
      if (username) usernameIndex.set(username, s)
    }
    if (s.studentId) {
      idIndex.set(String(s.studentId).toLowerCase().trim(), s)
    }
    if (s.studentNumber) {
      idIndex.set(String(s.studentNumber).toLowerCase().trim(), s)
    }
    const fn = (s.firstName || '').toLowerCase().trim()
    const ln = (s.lastName || '').toLowerCase().trim()
    if (fn) {
      const existingFn = firstNameMap.get(fn) || []
      existingFn.push(s)
      firstNameMap.set(fn, existingFn)
    }
    if (ln) {
      const existingLn = lastNameMap.get(ln) || []
      existingLn.push(s)
      lastNameMap.set(ln, existingLn)
    }
    if (fn && ln) {
      fullNameIndex.set(`${fn} ${ln}`, s)
      fullNameIndex.set(`${ln}, ${fn}`, s)
      fullNameIndex.set(`${ln} ${fn}`, s)
      fullNameIndex.set(`${fn}${ln}`, s)
      fullNameIndex.set(`${ln}${fn}`, s)
    }
  }

  const rawResponses = []

  // Process data rows
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    
    // Extract potential emails and names
    const emails = emailColIndices.map(idx => String(row[idx] || '').trim()).filter(Boolean)
    const names = nameColIndices.map(idx => String(row[idx] || '').trim()).filter(Boolean)
    const rawDate = completionTimeCol !== -1 ? String(row[completionTimeCol] || '').trim() : ''

    const confObj = fieldCols.courseConfidence !== -1 ? normalizeConfidence(row[fieldCols.courseConfidence]) : { rating: null, label: '' }

    const surveyData = {
      preferredName: fieldCols.preferredName !== -1 ? sanitizeTextField(row[fieldCols.preferredName], 100) : '',
      pronouns: fieldCols.pronouns !== -1 ? cleanOptionText(row[fieldCols.pronouns], 50) : '',
      parentCommunication: fieldCols.parentCommunication !== -1 ? cleanOptionText(row[fieldCols.parentCommunication], 250) : '',
      seatingPreference: fieldCols.seatingPreference !== -1 ? cleanOptionText(row[fieldCols.seatingPreference], 250) : '',
      targetGrade: fieldCols.targetGrade !== -1 ? cleanOptionText(row[fieldCols.targetGrade], 250) : '',
      courseConfidence: confObj.rating,
      courseConfidenceLabel: confObj.label,
      extracurricularsHobbies: fieldCols.extracurricularsHobbies !== -1 ? sanitizeTextField(row[fieldCols.extracurricularsHobbies], 2000) : '',
      confidentialNote: fieldCols.confidentialNote !== -1 ? sanitizeTextField(row[fieldCols.confidentialNote], 4000) : '',
      completedAt: rawDate || new Date().toISOString()
    }

    // Attempt matching to roster
    let matchedStudent = null
    let matchMethod = null

    // 1. Match by Email
    for (const em of emails) {
      const cleanEm = em.toLowerCase()
      if (emailIndex.has(cleanEm)) {
        matchedStudent = emailIndex.get(cleanEm)
        matchMethod = 'email'
        break
      }
      const uName = cleanEm.split('@')[0].trim()
      if (usernameIndex.has(uName)) {
        matchedStudent = usernameIndex.get(uName)
        matchMethod = 'username'
        break
      }
    }

    // 2. Match by Full Name
    if (!matchedStudent) {
      for (const n of names) {
        const cleanN = n.toLowerCase().replace(/[^a-z0-9\s,]/g, '').trim()
        if (fullNameIndex.has(cleanN)) {
          matchedStudent = fullNameIndex.get(cleanN)
          matchMethod = 'fullname'
          break
        }
        // Try reversing "First Last" -> "Last, First"
        const parts = cleanN.split(/\s+/)
        if (parts.length === 2) {
          const rev = `${parts[1]} ${parts[0]}`
          if (fullNameIndex.has(rev)) {
            matchedStudent = fullNameIndex.get(rev)
            matchMethod = 'reversed_name'
            break
          }
        }
      }
    }

    // 3. Fallback: Unique first name or last name match
    if (!matchedStudent && names.length > 0) {
      for (const n of names) {
        const cleanN = n.toLowerCase().trim()
        const fnMatches = firstNameMap.get(cleanN)
        if (fnMatches && fnMatches.length === 1) {
          matchedStudent = fnMatches[0]
          matchMethod = 'unique_first_name'
          break
        }
        const lnMatches = lastNameMap.get(cleanN)
        if (lnMatches && lnMatches.length === 1) {
          matchedStudent = lnMatches[0]
          matchMethod = 'unique_last_name'
          break
        }
      }
    }

    rawResponses.push({
      rowIndex: r,
      submittedEmails: emails,
      submittedNames: names,
      surveyData,
      matchedStudent,
      matchMethod,
      timestamp: rawDate ? new Date(rawDate).getTime() : 0
    })
  }

  // Deduplication: Group by studentId and keep newest
  const studentMap = new Map()
  const unmatchedRows = []
  let duplicateCount = 0

  for (const resp of rawResponses) {
    if (resp.matchedStudent) {
      const sId = resp.matchedStudent.studentId
      if (studentMap.has(sId)) {
        duplicateCount++
        const existing = studentMap.get(sId)
        // Keep row with later timestamp
        if (resp.timestamp >= existing.timestamp) {
          studentMap.set(sId, resp)
        }
      } else {
        studentMap.set(sId, resp)
      }
    } else {
      unmatchedRows.push({
        rowIndex: resp.rowIndex,
        submittedEmails: resp.submittedEmails,
        submittedNames: resp.submittedNames,
        surveyData: resp.surveyData
      })
    }
  }

  const matchedRecords = Array.from(studentMap.values()).map(r => ({
    studentId: r.matchedStudent.studentId,
    firstName: r.matchedStudent.firstName,
    lastName: r.matchedStudent.lastName,
    studentEmail: r.matchedStudent.studentEmail || (r.submittedEmails[0] || ''),
    surveyData: r.surveyData,
    matchMethod: r.matchMethod
  }))

  return {
    matchedRecords,
    unmatchedRows,
    duplicateCount,
    totalResponses: rawResponses.length,
    detectedColumns: fieldCols
  }
}
