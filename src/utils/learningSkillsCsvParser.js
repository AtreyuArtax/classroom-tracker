/**
 * src/utils/learningSkillsCsvParser.js
 *
 * Robust CSV and XLSX parser & normalizer for Microsoft Forms Learning Skills surveys.
 * Supports:
 *  - Standard Microsoft Forms CSV & Excel (.xlsx) exports
 *  - Multi-column name/email detection (e.g. "Email", "Name", "1. Full Name", "Student Name", etc.)
 *  - Office 365 student login email & username matching
 *  - Unique first-name & last-name matching (e.g. "Eshall" matches "Ali, Eshall")
 *  - E / G / S / N rating normalization (e.g. "a. Excellent", "Excellent", "4", "G - Good", etc.)
 *  - Multi-submission deduplication (keeps newest completion timestamp)
 */

/**
 * Normalizes a raw rating string or number to 'E', 'G', 'S', 'N', or null.
 * @param {string|number|null|undefined} raw
 * @returns {'E'|'G'|'S'|'N'|null}
 */
export function normalizeLearningSkillLevel(raw) {
  if (raw === null || raw === undefined) return null
  const str = String(raw).trim().toLowerCase()
  if (!str) return null

  // Check prefix or exact matches (including a. Excellent, b. Good, c. Satisfactory, d. Needs Improvement, 1-4, etc.)
  if (/^e(\b|\s|-|_)|excellent|^4$|^a(\b|\.|\s)|a\.\s*excellent/i.test(str)) return 'E'
  if (/^g(\b|\s|-|_)|good|^3$|^b(\b|\.|\s)|b\.\s*good/i.test(str)) return 'G'
  if (/^s(\b|\s|-|_)|satisfactory|^2$|^c(\b|\.|\s)|c\.\s*satisfactory/i.test(str)) return 'S'
  if (/^n(\b|\s|-|_)|needs\s*improvement|needs|^ni$|^1$|^d(\b|\.|\s)|d\.\s*needs/i.test(str)) return 'N'

  return null
}

/**
 * Parses a raw CSV string into a 2D array of cells. Handles quotes, commas, and multiline cells.
 * @param {string} text
 * @returns {Array<Array<string>>}
 */
export function parseCsvRows(text) {
  if (!text) return []
  // Strip BOM if present
  let cleanText = text.replace(/^\uFEFF/, '')
  
  const rows = []
  let currentRow = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        currentCell += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if (char === '\r') {
        if (nextChar === '\n') i++
        currentRow.push(currentCell.trim())
        rows.push(currentRow)
        currentRow = []
        currentCell = ''
      } else if (char === '\n') {
        currentRow.push(currentCell.trim())
        rows.push(currentRow)
        currentRow = []
        currentCell = ''
      } else {
        currentCell += char
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    rows.push(currentRow)
  }

  return rows.filter(r => r.some(cell => cell.length > 0))
}

/**
 * Parses an Excel .xlsx ArrayBuffer into a 2D array of row strings.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<Array<Array<string>>>}
 */
export async function parseXlsxToRows(arrayBuffer) {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const rows = []
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const rowData = []
    const rawValues = Array.isArray(row.values) ? row.values.slice(1) : []
    for (const val of rawValues) {
      if (val === null || val === undefined) {
        rowData.push('')
      } else if (typeof val === 'object') {
        if (val.text !== undefined) rowData.push(String(val.text).trim())
        else if (val.result !== undefined) rowData.push(String(val.result).trim())
        else if (val instanceof Date) rowData.push(val.toISOString())
        else rowData.push(String(val).trim())
      } else {
        rowData.push(String(val).trim())
      }
    }
    if (rowData.some(c => c.length > 0)) {
      rows.push(rowData)
    }
  })
  return rows
}

/**
 * Core processor for a 2D array of survey response rows (from CSV or XLSX).
 *
 * @param {Array<Array<string>>} rows
 * @param {Array<Object>} rosterStudents - Array of { studentId, firstName, lastName, studentEmail, ... }
 * @returns {Object} { matchedRecords, unmatchedRows, duplicateCount, totalResponses, detectedColumns }
 */
export function parseLearningSkillsRows(rows, rosterStudents = []) {
  if (!rows || rows.length < 2) {
    throw new Error('File contains no survey data rows.')
  }

  const headers = rows[0].map(h => String(h || '').trim())
  
  // Find all candidate column indices
  const emailColIndices = []
  const nameColIndices = []
  let completionTimeCol = -1

  const skillCols = {
    responsibility: -1,
    organization: -1,
    independentWork: -1,
    collaboration: -1,
    initiative: -1,
    selfRegulation: -1
  }

  headers.forEach((h, idx) => {
    const headerLower = h.toLowerCase().trim()
    
    // Skill columns
    if (/responsib/i.test(headerLower) && skillCols.responsibility === -1) {
      skillCols.responsibility = idx
    } else if (/organi[zs]/i.test(headerLower) && skillCols.organization === -1) {
      skillCols.organization = idx
    } else if (/independent/i.test(headerLower) && skillCols.independentWork === -1) {
      skillCols.independentWork = idx
    } else if (/collaborat|teamwork/i.test(headerLower) && skillCols.collaboration === -1) {
      skillCols.collaboration = idx
    } else if (/initiat/i.test(headerLower) && skillCols.initiative === -1) {
      skillCols.initiative = idx
    } else if (/self[- ]?regulat/i.test(headerLower) && skillCols.selfRegulation === -1) {
      skillCols.selfRegulation = idx
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

  // Quick validation check
  const detectedSkills = Object.values(skillCols).filter(idx => idx !== -1).length
  if (detectedSkills === 0) {
    throw new Error('Could not detect any learning skills columns (Responsibility, Organization, Independent Work, Collaboration, Initiative, Self-Regulation) in the file.')
  }

  // Pre-index roster students for high-speed matching
  const emailIndex = new Map()
  const usernameIndex = new Map()
  const fullNameIndex = new Map()
  const idIndex = new Map()
  const firstNameMap = new Map() // fn -> Array<student>
  const lastNameMap = new Map()  // ln -> Array<student>

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

    const studentEval = {
      responsibility: skillCols.responsibility !== -1 ? normalizeLearningSkillLevel(row[skillCols.responsibility]) : null,
      organization: skillCols.organization !== -1 ? normalizeLearningSkillLevel(row[skillCols.organization]) : null,
      independentWork: skillCols.independentWork !== -1 ? normalizeLearningSkillLevel(row[skillCols.independentWork]) : null,
      collaboration: skillCols.collaboration !== -1 ? normalizeLearningSkillLevel(row[skillCols.collaboration]) : null,
      initiative: skillCols.initiative !== -1 ? normalizeLearningSkillLevel(row[skillCols.initiative]) : null,
      selfRegulation: skillCols.selfRegulation !== -1 ? normalizeLearningSkillLevel(row[skillCols.selfRegulation]) : null
    }

    // Matching waterfall
    let matchedStudent = null
    let matchType = null

    // 1. Try Emails & Usernames
    for (const em of emails) {
      const cleanEm = em.toLowerCase().trim()
      if (!cleanEm || cleanEm === 'anonymous') continue
      const username = cleanEm.split('@')[0].trim()

      if (emailIndex.has(cleanEm)) {
        matchedStudent = emailIndex.get(cleanEm)
        matchType = 'email'
        break
      } else if (username && usernameIndex.has(username)) {
        matchedStudent = usernameIndex.get(username)
        matchType = 'email-username'
        break
      } else if (idIndex.has(cleanEm) || (username && idIndex.has(username))) {
        matchedStudent = idIndex.get(cleanEm) || idIndex.get(username)
        matchType = 'id'
        break
      }
    }

    // 2. If not matched, try Names
    if (!matchedStudent) {
      for (const nm of names) {
        const cleanNm = nm.toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim()
        if (!cleanNm || cleanNm === 'anonymous') continue
        const noSpaceNm = cleanNm.replace(/\s+/g, '')

        // Exact full name match
        if (fullNameIndex.has(cleanNm)) {
          matchedStudent = fullNameIndex.get(cleanNm)
          matchType = 'full-name'
          break
        } else if (fullNameIndex.has(noSpaceNm)) {
          matchedStudent = fullNameIndex.get(noSpaceNm)
          matchType = 'full-name'
          break
        } else if (idIndex.has(cleanNm)) {
          matchedStudent = idIndex.get(cleanNm)
          matchType = 'id'
          break
        }

        // Single word / First name match (e.g. "Eshall")
        const words = cleanNm.split(' ').filter(Boolean)
        if (words.length === 1) {
          const singleWord = words[0]
          const matchingByFn = firstNameMap.get(singleWord) || []
          if (matchingByFn.length === 1) {
            matchedStudent = matchingByFn[0]
            matchType = 'unique-first-name'
            break
          }
          const matchingByLn = lastNameMap.get(singleWord) || []
          if (matchingByLn.length === 1) {
            matchedStudent = matchingByLn[0]
            matchType = 'unique-last-name'
            break
          }
        }
      }
    }

    // Try parsing completion date
    let dateStr = new Date().toISOString().slice(0, 10)
    let parsedTime = Date.now()
    if (rawDate) {
      const d = new Date(rawDate)
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().slice(0, 10)
        parsedTime = d.getTime()
      }
    }

    const primaryEmail = emails[0] || ''
    const primaryName = names.find(n => n.toLowerCase() !== 'anonymous') || names[0] || ''

    rawResponses.push({
      rowIndex: r,
      rawEmail: primaryEmail,
      rawName: primaryName,
      dateStr,
      timestamp: parsedTime,
      matchedStudent,
      matchType,
      studentEval
    })
  }

  // Deduplicate responses per student (keep newest timestamp)
  const studentMap = new Map()
  const unmatchedRows = []
  let duplicateCount = 0

  for (const resp of rawResponses) {
    if (resp.matchedStudent) {
      const studentId = resp.matchedStudent.studentId
      if (studentMap.has(studentId)) {
        duplicateCount++
        const existing = studentMap.get(studentId)
        if (resp.timestamp >= existing.timestamp) {
          studentMap.set(studentId, resp)
        }
      } else {
        studentMap.set(studentId, resp)
      }
    } else {
      unmatchedRows.push({
        rowIndex: resp.rowIndex,
        rawEmail: resp.rawEmail,
        rawName: resp.rawName,
        dateStr: resp.dateStr,
        timestamp: resp.timestamp,
        studentEval: resp.studentEval
      })
    }
  }

  const matchedRecords = Array.from(studentMap.values()).map(item => ({
    studentId: item.matchedStudent.studentId,
    firstName: item.matchedStudent.firstName || '',
    lastName: item.matchedStudent.lastName || '',
    studentEmail: item.matchedStudent.studentEmail || item.rawEmail,
    matchType: item.matchType,
    date: item.dateStr,
    studentEval: item.studentEval
  }))

  return {
    matchedRecords,
    unmatchedRows,
    duplicateCount,
    totalResponses: rawResponses.length,
    detectedColumns: {
      hasResponsibility: skillCols.responsibility !== -1,
      hasOrganization: skillCols.organization !== -1,
      hasIndependentWork: skillCols.independentWork !== -1,
      hasCollaboration: skillCols.collaboration !== -1,
      hasInitiative: skillCols.initiative !== -1,
      hasSelfRegulation: skillCols.selfRegulation !== -1
    }
  }
}

/**
 * Parses a CSV string and matches against roster students.
 */
export function parseLearningSkillsCsv(csvText, rosterStudents = []) {
  const rows = parseCsvRows(csvText)
  return parseLearningSkillsRows(rows, rosterStudents)
}

/**
 * Parses an Excel (.xlsx) file ArrayBuffer and matches against roster students.
 */
export async function parseLearningSkillsWorkbook(arrayBuffer, rosterStudents = []) {
  const rows = await parseXlsxToRows(arrayBuffer)
  return parseLearningSkillsRows(rows, rosterStudents)
}
