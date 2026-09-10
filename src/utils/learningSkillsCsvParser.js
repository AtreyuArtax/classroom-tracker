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
 * Decodes XML character entities into plain string.
 * @param {string} str
 * @returns {string}
 */
function decodeXmlEntities(str) {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/**
 * Converts spreadsheet column reference (e.g. "A", "Z", "AA") to 0-based index.
 * @param {string} colLetters
 * @returns {number}
 */
function colLettersToIndex(colLetters) {
  let idx = 0
  for (let i = 0; i < colLetters.length; i++) {
    idx = idx * 26 + (colLetters.charCodeAt(i) - 64)
  }
  return idx - 1
}

/**
 * Strips non-standard document properties (docProps/) from XLSX zip buffer.
 * Microsoft Forms and Excel Online often inject non-standard metadata nodes
 * (such as <lastModifiedBy> without namespace prefixes) which cause strict
 * XML parsers like exceljs to throw "Unexpected xml node in parseOpen".
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<ArrayBuffer|null>}
 */
async function stripDocPropsFromXlsx(arrayBuffer) {
  try {
    const JSZip = (await import('jszip')).default || (await import('jszip'))
    const zip = await JSZip.loadAsync(arrayBuffer)
    let removedAny = false
    Object.keys(zip.files).forEach(filename => {
      if (/^(\/)?docprops\//i.test(filename)) {
        zip.remove(filename)
        removedAny = true
      }
    })
    if (!removedAny) return null
    return await zip.generateAsync({ type: 'arraybuffer' })
  } catch (err) {
    console.warn('Could not strip docProps metadata:', err)
    return null
  }
}

/**
 * Extracts 2D array of string rows from an ExcelJS worksheet.
 * @param {Object} worksheet
 * @returns {Array<Array<string>>}
 */
function extractRowsFromWorksheet(worksheet) {
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
 * Normalizes Excel date representations (including serial numbers like 46273.375) to ISO strings.
 * @param {string|number|null|undefined} val
 * @returns {string}
 */
export function formatExcelDateIfSerial(val) {
  if (!val) return ''
  const str = String(val).trim()
  const num = Number(str)
  // Excel serial dates: 25569 = 1970-01-01, 80000 = year 2119
  if (!isNaN(num) && num > 25569 && num < 80000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return str
}

/**
 * Resilient fallback to directly parse spreadsheet rows from XLSX zip
 * in case ExcelJS encounters schema, namespace, or styling errors.
 * Supports Microsoft Forms XML namespaces (e.g. <x:worksheet>, <x:row>, <x:si>).
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<Array<Array<string>>>}
 */
async function parseXlsxDirectlyFromZip(arrayBuffer) {
  try {
    const JSZip = (await import('jszip')).default || (await import('jszip'))
    const zip = await JSZip.loadAsync(arrayBuffer)

    // 1. Shared Strings (handling namespaces like <x:sst>, <x:si>, <x:t>)
    const sharedStrings = []
    const ssFile = zip.file('xl/sharedStrings.xml') || zip.file('/xl/sharedStrings.xml') ||
      Object.values(zip.files).find(f => /xl\/sharedstrings\.xml$/i.test(f.name))

    if (ssFile) {
      const ssXml = await ssFile.async('string')
      const siMatches = ssXml.match(/<(?:[a-zA-Z0-9_-]+:)?si\b[\s\S]*?<\/(?:[a-zA-Z0-9_-]+:)?si>/gi) || []
      for (const si of siMatches) {
        const tMatches = si.match(/<(?:[a-zA-Z0-9_-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?t>/gi) || []
        const text = tMatches.map(t => {
          const inner = t.replace(/^<(?:[a-zA-Z0-9_-]+:)?t\b[^>]*>/i, '').replace(/<\/(?:[a-zA-Z0-9_-]+:)?t>$/i, '')
          return decodeXmlEntities(inner)
        }).join('')
        sharedStrings.push(text)
      }
    }

    // 2. Locate first worksheet
    let sheetFile = zip.file('xl/worksheets/sheet1.xml') || zip.file('/xl/worksheets/sheet1.xml')
    if (!sheetFile) {
      sheetFile = Object.values(zip.files).find(f => /xl\/worksheets\/sheet\d+\.xml$/i.test(f.name))
    }
    if (!sheetFile) return []

    const sheetXml = await sheetFile.async('string')
    const rows = []
    const rowMatches = sheetXml.match(/<(?:[a-zA-Z0-9_-]+:)?row\b[\s\S]*?<\/(?:[a-zA-Z0-9_-]+:)?row>/gi) || []

    for (const rowTag of rowMatches) {
      const cellMatches = rowTag.match(/<(?:[a-zA-Z0-9_-]+:)?c\b[\s\S]*?(?:<\/(?:[a-zA-Z0-9_-]+:)?c>|\/>)/gi) || []
      const rowData = []
      let maxColIdx = -1

      for (const cellTag of cellMatches) {
        const rAttr = cellTag.match(/\br=\"([A-Za-z]+)(\d+)\"/)
        const tAttr = cellTag.match(/\bt=\"([^\"]+)\"/)

        let colIdx = -1
        if (rAttr) {
          colIdx = colLettersToIndex(rAttr[1].toUpperCase())
        } else {
          colIdx = maxColIdx + 1
        }
        maxColIdx = Math.max(maxColIdx, colIdx)

        const type = tAttr ? tAttr[1] : ''
        let cellVal = ''

        if (type === 's') {
          const vMatch = cellTag.match(/<(?:[a-zA-Z0-9_-]+:)?v>(\d+)<\/(?:[a-zA-Z0-9_-]+:)?v>/i)
          if (vMatch) {
            const sIdx = parseInt(vMatch[1], 10)
            cellVal = sharedStrings[sIdx] !== undefined ? sharedStrings[sIdx] : ''
          }
        } else if (type === 'inlineStr') {
          const tMatch = cellTag.match(/<(?:[a-zA-Z0-9_-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?t>/i)
          if (tMatch) {
            cellVal = decodeXmlEntities(tMatch[1])
          }
        } else if (type === 'b') {
          const vMatch = cellTag.match(/<(?:[a-zA-Z0-9_-]+:)?v>([01])<\/(?:[a-zA-Z0-9_-]+:)?v>/i)
          cellVal = vMatch && vMatch[1] === '1' ? 'TRUE' : 'FALSE'
        } else {
          const vMatch = cellTag.match(/<(?:[a-zA-Z0-9_-]+:)?v>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?v>/i)
          if (vMatch) {
            cellVal = decodeXmlEntities(vMatch[1])
          }
        }

        rowData[colIdx] = (cellVal || '').trim()
      }

      for (let i = 0; i < rowData.length; i++) {
        if (rowData[i] === undefined) rowData[i] = ''
      }

      if (rowData.some(c => c && c.length > 0)) {
        rows.push(rowData)
      }
    }

    return rows
  } catch (zipErr) {
    console.error('Direct XLSX extraction failed:', zipErr)
    return []
  }
}

/**
 * Parses an Excel .xlsx ArrayBuffer into a 2D array of row strings.
 * Resilient against non-standard XML metadata and namespaces generated by Microsoft Forms / Excel Online.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<Array<Array<string>>>}
 */
export async function parseXlsxToRows(arrayBuffer) {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))

  // Attempt 1: Standard ExcelJS parse
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)
    const rows = extractRowsFromWorksheet(workbook.worksheets[0])
    if (rows && rows.length > 0) return rows
  } catch (err) {
    console.warn('ExcelJS direct load failed (falling back to direct XML extraction):', err?.message)
  }

  // Attempt 2: Direct ZIP XML extraction (fast, robust against all MS Forms and Excel Online namespaces)
  try {
    const directRows = await parseXlsxDirectlyFromZip(arrayBuffer)
    if (directRows && directRows.length > 0) {
      return directRows
    }
  } catch (directErr) {
    console.warn('Direct XML extraction failed (attempting sanitized ExcelJS load):', directErr?.message)
  }

  // Attempt 3: Sanitized ExcelJS retry as fallback
  try {
    const sanitizedBuffer = await stripDocPropsFromXlsx(arrayBuffer)
    if (sanitizedBuffer) {
      const cleanWb = new ExcelJS.Workbook()
      await cleanWb.xlsx.load(sanitizedBuffer)
      const rows = extractRowsFromWorksheet(cleanWb.worksheets[0])
      if (rows && rows.length > 0) return rows
    }
  } catch (retryErr) {
    console.warn('ExcelJS sanitized retry failed:', retryErr?.message)
  }

  return []
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
    } else if (/completion\s*time|submission\s*time/i.test(headerLower)) {
      completionTimeCol = idx
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
