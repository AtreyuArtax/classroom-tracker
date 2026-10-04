import assert from 'assert'
import {
  makeMiniBar,
  fitLine,
  generateMobileSafeEmailBody,
  generateMobileSafeEmail,
  generateRichEmailHtml,
  copyRichEmailToClipboard,
  DIVIDER_DOUBLE,
  DIVIDER_SINGLE
} from './utils/emailFormatter.js'

console.log('=================================================================')
console.log('🧪 RUNNING EMAIL FORMATTER & UNICODE SUITE')
console.log('=================================================================\n')

// ─── TEST 1: makeMiniBar Unit Tests ──────────────────────────────
console.log('TEST 1: makeMiniBar Block Rendering & Boundary Clamping')
assert.strictEqual(makeMiniBar(0), '░░░░░', '0% yields 5 empty blocks')
assert.strictEqual(makeMiniBar(20), '█░░░░', '20% yields 1 filled, 4 empty')
assert.strictEqual(makeMiniBar(40), '██░░░', '40% yields 2 filled, 3 empty')
assert.strictEqual(makeMiniBar(60), '███░░', '60% yields 3 filled, 2 empty')
assert.strictEqual(makeMiniBar(80), '████░', '80% yields 4 filled, 1 empty')
assert.strictEqual(makeMiniBar(100), '█████', '100% yields 5 filled blocks')
assert.strictEqual(makeMiniBar(-10), '░░░░░', 'Negative percentage clamped to 0')
assert.strictEqual(makeMiniBar(150), '█████', 'Over 100% clamped to 5 blocks')
assert.strictEqual(makeMiniBar('85%'), '████░', 'Percentage string parsing works')
assert.strictEqual(makeMiniBar(null), '░░░░░', 'Null safely returns empty blocks')
assert.strictEqual(makeMiniBar(undefined), '░░░░░', 'Undefined safely returns empty blocks')
assert.strictEqual(makeMiniBar(50, 10), '█████░░░░░', 'Custom block count (10) works')
console.log('✓ makeMiniBar passes all block calculation & clamping checks\n')

// ─── TEST 2: Template Structure & Mobile 36-Char Width ───────────
console.log('TEST 2: Mobile-Safe 36-Char Template Structure')
assert.strictEqual(DIVIDER_DOUBLE.length, 36, 'Double divider is exactly 36 chars')
assert.strictEqual(DIVIDER_SINGLE.length, 36, 'Single divider is exactly 36 chars')

const sampleData = {
  name: 'Sarah Connor',
  course: 'Grade 10 Science',
  teacher: 'Ms. Vance',
  department: 'Science Dept',
  reportDate: 'Oct 2, 2026',
  overallGrade: 85,
  recentAssessments: [
    { date: 'Sep 18', name: 'Cell Mitosis Lab', score: 88, category: 'Thinking' },
    { date: 'Sep 25', name: 'Organ Systems Quiz', score: 82, category: 'Knowledge' }
  ],
  missingCount: 0,
  attendance: { rate: 94, absences: 1, lates: 0 },
  outOfClass: { trips: 2, minutes: 14 }
}

const body = generateMobileSafeEmailBody(sampleData)
console.log('--- GENERATED PLAIN-TEXT EMAIL BODY ---')
console.log(body)
console.log('--------------------------------------\n')

// Check sections exist
assert.ok(body.includes('quick progress update for Sarah Connor in Grade 10 Science'), 'Header student name & course included')
assert.ok(body.includes('Current Standing:'), 'Current Standing header included')
assert.ok(body.includes('• Overall Grade: 85%'), 'Overall Grade included')
assert.ok(body.includes('• Missing Work: None currently outstanding'), 'Zero missing work indicator included')
assert.ok(body.includes('Recent Assessments:'), 'Recent Assessments section included')
assert.ok(body.includes('• Sep 18: Cell Mitosis Lab — 88% (Thinking)'), 'First assessment included')
assert.ok(body.includes('Attendance & Engagement:'), 'Attendance section included')
assert.ok(body.includes('• Attendance Rate: 94%'), 'Attendance rate included')
assert.ok(body.includes('• Classes Missed: 1  |  Lates: 0'), 'Classes Missed and late counts included')
assert.ok(body.includes('(Reflects all missed class time; official excused codes are tracked in PowerSchool.)'), 'PowerSchool tracking note included')
assert.ok(body.includes('• Out-of-Class: 2 departures (14 mins missed instruction time)'), 'Washroom departures included')
assert.ok(body.includes('Science Dept'), 'Department included')

// Test with missing assessments
const sampleWithMissing = {
  ...sampleData,
  missingCount: 2
}
const bodyWithMissing = generateMobileSafeEmailBody(sampleWithMissing)
assert.ok(bodyWithMissing.includes('• Missing Work: 2 assessments currently outstanding'), 'Warning indicator when assessments are missing')

console.log('✓ Template structure and sections match clean teacher format\n')

// ─── TEST 3: mailto: URL Encoding & Length Guard ─────────────────
console.log('TEST 3: mailto: URL Encoding & Length Bounds')
const emailResult = generateMobileSafeEmail({
  ...sampleData,
  recipients: ['parent@example.com', 'student@school.ca']
})

assert.ok(emailResult.mailtoUrl.startsWith('mailto:parent@example.com,student@school.ca?subject='), 'Recipients formatted in mailto:')
assert.ok(emailResult.mailtoUrl.includes('subject=Progress%20Report%3A%20Sarah%20Connor'), 'Subject safely encoded')
assert.ok(emailResult.mailtoUrl.includes('body=Hello'), 'Body safely encoded')
assert.ok(emailResult.urlLength > 0, 'URL length reported')
assert.ok(emailResult.isSafeLength, 'URL length is well within standard limits (~1900 chars)')
console.log(`✓ mailto: URL safely encoded (Length: ${emailResult.urlLength} characters, isSafe: ${emailResult.isSafeLength})\n`)

// ─── TEST 4: Rich HTML Email Generation ──────────────────────────
console.log('TEST 4: Rich HTML Email Generation')
const html = generateRichEmailHtml(sampleData)
assert.ok(html.includes('Sarah Connor'), 'HTML contains student name')
assert.ok(html.includes('width="500"'), 'HTML card is constrained in a width="500" table for Outlook')
assert.ok(html.includes('Sep 18</span>&nbsp;<strong>Cell Mitosis Lab</strong>'), 'Explicit gap &nbsp; between date and assessment name')
assert.ok(html.includes('#3b82f6'), 'HTML contains colored progress bar')
assert.ok(html.includes('Attendance &amp; Engagement'), 'HTML contains attendance section')
assert.ok(html.includes('Classes Missed: <strong>1</strong>'), 'HTML contains Classes Missed label')
assert.ok(html.includes('tracked in PowerSchool'), 'HTML contains PowerSchool tracking note')
console.log('✓ Rich HTML email markup generated successfully\n')

// ─── TEST 5: EML File Generation & X-Unsent Draft Header ────────
console.log('TEST 5: RFC 822 .eml File Generation & MIME CID Attachments')
const { generateEmlContent } = await import('./utils/emailFormatter.js')
const emlBasic = generateEmlContent(sampleData)
assert.ok(emlBasic.includes('X-Unsent: 1'), 'EML contains X-Unsent: 1 header for Outlook/Apple Mail compose mode')
assert.ok(emlBasic.includes('MIME-Version: 1.0'), 'EML contains MIME-Version')
assert.ok(emlBasic.includes('Subject: Progress Report: Sarah Connor'), 'EML contains subject')

// Test with embedded CID image
const emlWithCid = generateEmlContent(sampleData, {
  images: [{
    cid: 'attendancePieChart',
    filename: 'attendance.png',
    mimeType: 'image/png',
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }]
})
assert.ok(emlWithCid.includes('Content-Type: multipart/related;'), 'EML uses multipart/related for inline images')
assert.ok(emlWithCid.includes('Content-ID: <attendancePieChart>'), 'EML includes CID header for instant local rendering')
// ─── TEST 6: Admin / Administrative Assessment Filtering ────────
console.log('TEST 6: Administrative Logistics & Paperwork Filtering')
const sampleWithAdmin = {
  ...sampleData,
  recentAssessments: [
    { date: 'Sep 18', name: 'Cell Mitosis Lab', score: 88, category: 'Thinking' },
    { date: 'Sep 20', name: 'Science Safety Contract', score: 100, category: 'Admin', purpose: 'administrative' },
    { date: 'Sep 22', name: 'Textbook # Return', score: null, category: 'administrative' },
    { date: 'Sep 25', name: 'Organ Systems Quiz', score: 82, category: 'Knowledge' }
  ],
  missingAssessments: [
    { name: 'Field Trip Permission Slip', purpose: 'administrative' },
    { name: 'Unit 2 Lab Report', category: 'Thinking' }
  ]
}

const bodyAdminFiltered = generateMobileSafeEmailBody(sampleWithAdmin)
assert.ok(!bodyAdminFiltered.includes('Science Safety Contract'), 'Admin assessment excluded from Recent Assessments')
assert.ok(!bodyAdminFiltered.includes('Textbook # Return'), 'Administrative assessment excluded from Recent Assessments')
assert.ok(bodyAdminFiltered.includes('Cell Mitosis Lab'), 'Academic assessment preserved in Recent Assessments')
assert.ok(bodyAdminFiltered.includes('Organ Systems Quiz'), 'Academic assessment preserved in Recent Assessments')
assert.ok(bodyAdminFiltered.includes('• Missing Work: 1 assessment currently outstanding'), 'Admin paperwork excluded from missing count (1 academic missing)')
assert.ok(bodyAdminFiltered.includes('• Unit 2 Lab Report'), 'Academic missing assessment is explicitly named in plain text email')
assert.ok(!bodyAdminFiltered.includes('Field Trip Permission Slip'), 'Administrative paperwork excluded from missing list')

const htmlAdminFiltered = generateRichEmailHtml(sampleWithAdmin)
assert.ok(!htmlAdminFiltered.includes('Science Safety Contract'), 'Admin assessment excluded from HTML Recent Assessments')
assert.ok(!htmlAdminFiltered.includes('Textbook # Return'), 'Administrative assessment excluded from HTML Recent Assessments')
assert.ok(htmlAdminFiltered.includes('Unit 2 Lab Report'), 'Academic missing assessment is explicitly named in HTML email')
console.log('✓ Administrative tasks and paperwork are strictly excluded from email reports\n')

// ─── TEST 7: Explicit Missing Assessment Names & Options ──────────
console.log('TEST 7: Explicit Missing Assessment Names & Options Toggling')
const multiMissingData = {
  ...sampleData,
  missingAssessments: [
    { name: 'Unit 1 Lab Report', date: 'Sep 28', category: 'Thinking' },
    { name: 'Optics Quiz', date: 'Oct 1', category: 'Knowledge' }
  ]
}

const multiBody = generateMobileSafeEmailBody(multiMissingData)
console.log('--- GENERATED MULTI-MISSING EMAIL BODY ---')
console.log(multiBody)
console.log('------------------------------------------\n')

assert.ok(multiBody.includes('• Missing Work: 2 assessments currently outstanding'), 'Summary count line present')
assert.ok(multiBody.includes('Missing Work:'), 'Missing Work section header present')
assert.ok(multiBody.includes('• Unit 1 Lab Report (Sep 28)'), 'First missing item named with date')
assert.ok(multiBody.includes('• Optics Quiz (Oct 1)'), 'Second missing item named with date')

// Test toggling includeMissing off
const bodyNoMissing = generateMobileSafeEmailBody(multiMissingData, { includeMissing: false })
assert.ok(!bodyNoMissing.includes('Missing Work:'), 'Missing section excluded when includeMissing=false')
assert.ok(!bodyNoMissing.includes('Unit 1 Lab Report'), 'Missing item excluded when includeMissing=false')

// Test rich HTML with multiple missing
const multiHtml = generateRichEmailHtml(multiMissingData)
assert.ok(multiHtml.includes('2 assessments currently missing:'), 'HTML banner displays 2 missing count')
assert.ok(multiHtml.includes('Unit 1 Lab Report'), 'HTML includes first missing item name')
assert.ok(multiHtml.includes('Optics Quiz'), 'HTML includes second missing item name')
assert.ok(multiHtml.includes('(Sep 28)'), 'HTML includes first missing item date')
console.log('✓ Explicit missing assessment names and toggle options work cleanly\n')

// ─── TEST 8: SBAR Plain-Text, Rich HTML, & Clipboard Output ──────
console.log('TEST 8: SBAR Plain-Text, Rich HTML Generation, and Clipboard Output')

const sampleSbarData = {
  name: 'Marcus Brody',
  course: 'Grade 9 Science',
  teacher: 'Dr. Jones',
  department: 'Science Dept',
  reportDate: 'Oct 3, 2026',
  isSbar: true,
  sbarOverallBadge: {
    level: 'L4',
    label: 'Level 4',
    color: '#22c55e',
    levelNum: 4.0
  },
  sbarExpectations: [
    {
      code: 'B1.1',
      description: 'Analyse sustainable ecosystem interactions',
      badge: { level: 'L4', label: 'Level 4', color: '#22c55e' },
      evaluations: [
        { name: 'Quiz 1', date: 'Sep 15', badge: { level: 'L2', color: '#f59e0b' } },
        { name: 'Lab Report', date: 'Sep 22', badge: { level: 'L3', color: '#3b82f6' } },
        { name: 'Unit Project', date: 'Sep 30', badge: { level: 'L4', color: '#22c55e' } }
      ]
    },
    {
      code: 'C2.3',
      description: 'Chemical reactions and conservation of mass',
      badge: { level: 'L3', label: 'Level 3', color: '#3b82f6' },
      evaluations: [
        { name: 'Worksheet', date: 'Sep 18', badge: { level: 'L3', color: '#3b82f6' } }
      ]
    }
  ],
  missingCount: 0,
  attendance: { rate: 96, absences: 1, lates: 0 },
  outOfClass: { trips: 1, minutes: 5 }
}

// 8.1 SBAR Plain-Text Verification
const sbarBody = generateMobileSafeEmailBody(sampleSbarData)
console.log('--- GENERATED SBAR PLAIN-TEXT EMAIL BODY ---')
console.log(sbarBody)
console.log('--------------------------------------------\n')

assert.ok(sbarBody.includes('quick progress update for Marcus Brody in Grade 9 Science'), 'Header student name & course included')
assert.ok(sbarBody.includes('Current Standing:'), 'Current Standing header included')
assert.ok(sbarBody.includes('• Overall Level: Level L4 (Level 4)'), 'SBAR Overall Level badge text included in plain-text')
assert.ok(!sbarBody.includes('• Overall Grade:'), 'Overall Grade line omitted in SBAR plain-text')
assert.ok(sbarBody.includes('Curriculum Expectations:'), 'Curriculum Expectations section header included')
assert.ok(!sbarBody.includes('Recent Assessments:'), 'Recent Assessments header omitted in SBAR mode with expectations')
assert.ok(sbarBody.includes('• B1.1: Level L4 (Progression: L2 ➔ L3 ➔ L4)'), 'Expectation B1.1 with level and evaluation history progression')
assert.ok(sbarBody.includes('• C2.3: Level L3 (Progression: L3)'), 'Expectation C2.3 with level and single evaluation progression')

// Toggle options for SBAR plain-text
const sbarBodyNoGrade = generateMobileSafeEmailBody(sampleSbarData, { includeGrade: false })
assert.ok(!sbarBodyNoGrade.includes('Overall Level:'), 'Overall Level excluded when includeGrade=false')
const sbarBodyNoExp = generateMobileSafeEmailBody(sampleSbarData, { includeAssessments: false })
assert.ok(!sbarBodyNoExp.includes('Curriculum Expectations:'), 'Curriculum Expectations excluded when includeAssessments=false')

// Unassessed badge fallback in plain-text
const sbarBodyUnassessed = generateMobileSafeEmailBody({
  ...sampleSbarData,
  sbarOverallBadge: null,
  sbarExpectations: []
})
assert.ok(sbarBodyUnassessed.includes('• Overall Level: Level — (Not Assessed)'), 'Fallback unassessed badge in plain text')
console.log('✓ SBAR plain-text generation passes all content & option checks\n')

// 8.2 SBAR Rich HTML Verification
const sbarHtml = generateRichEmailHtml(sampleSbarData)
console.log('--- GENERATED SBAR RICH HTML SNIPPET ---')
console.log(sbarHtml.slice(0, 1200))
console.log('...\n-----------------------------------------\n')

assert.ok(sbarHtml.includes('Marcus Brody'), 'HTML contains student name')
assert.ok(sbarHtml.includes('Grade 9 Science'), 'HTML contains course info')
assert.ok(sbarHtml.includes('Current Standing'), 'HTML contains Current Standing section')
assert.ok(sbarHtml.includes('Overall Level:'), 'HTML contains Overall Level: label')
assert.ok(!sbarHtml.includes('Overall Grade:'), 'HTML omits Overall Grade: label')
assert.ok(sbarHtml.includes('Level L4 (Level 4)'), 'HTML renders SBAR overall level badge text')
assert.ok(sbarHtml.includes('background-color:#22c55e'), 'HTML contains overall badge color styling')
assert.ok(!sbarHtml.includes('background-color:#3b82f6; height:8px'), 'HTML strictly omits percentage bar in SBAR mode')

assert.ok(sbarHtml.includes('Curriculum Expectations'), 'HTML contains Curriculum Expectations section header')
assert.ok(!sbarHtml.includes('Recent Assessments</div>'), 'HTML omits Recent Assessments header in SBAR mode')
assert.ok(sbarHtml.includes('<strong>B1.1</strong>'), 'HTML contains expectation code B1.1')
assert.ok(sbarHtml.includes('Level L4'), 'HTML contains expectation level badge')
assert.ok(sbarHtml.includes('<strong>C2.3</strong>'), 'HTML contains expectation code C2.3')
assert.ok(sbarHtml.includes('Level L3'), 'HTML contains expectation C2.3 level badge')

// Verify progression pills in HTML
assert.ok(sbarHtml.includes('Progression:'), 'HTML contains Progression: label')
assert.ok(sbarHtml.includes('➔'), 'HTML contains arrow separator between pills')
assert.ok(sbarHtml.includes('>L2</span>'), 'HTML contains L2 progression pill')
assert.ok(sbarHtml.includes('>L3</span>'), 'HTML contains L3 progression pill')
assert.ok(sbarHtml.includes('>L4</span>'), 'HTML contains L4 progression pill')
assert.ok(sbarHtml.includes('border:1px solid #f59e0b'), 'HTML contains L2 evaluation badge color')

// HTML toggling options
const sbarHtmlNoGrade = generateRichEmailHtml(sampleSbarData, { includeGrade: false })
assert.ok(!sbarHtmlNoGrade.includes('Overall Level:'), 'Current Standing omitted when includeGrade=false')
const sbarHtmlNoExp = generateRichEmailHtml(sampleSbarData, { includeAssessments: false })
assert.ok(!sbarHtmlNoExp.includes('Curriculum Expectations'), 'Curriculum Expectations omitted when includeAssessments=false')

// HTML unassessed fallback
const sbarHtmlUnassessed = generateRichEmailHtml({
  ...sampleSbarData,
  sbarOverallBadge: null,
  sbarExpectations: []
})
assert.ok(sbarHtmlUnassessed.includes('Level — (Not Assessed)'), 'HTML fallback renders unassessed badge text')
assert.ok(sbarHtmlUnassessed.includes('#64748b'), 'HTML fallback uses neutral muted badge color')
console.log('✓ SBAR rich HTML generation passes all markup & badge checks\n')

// 8.3 SBAR Clipboard Output Verification
console.log('Verifying SBAR Clipboard Output (ClipboardItem & writeText)...')
let writtenItems = null
const originalClipboard = globalThis.navigator?.clipboard
const originalClipboardItem = globalThis.ClipboardItem

class MockClipboardItem {
  constructor(data) {
    this.data = data
  }
}
globalThis.ClipboardItem = MockClipboardItem

if (!globalThis.navigator) {
  globalThis.navigator = {}
}

Object.defineProperty(globalThis.navigator, 'clipboard', {
  value: {
    write: async (items) => {
      writtenItems = items
    },
    writeText: async () => {}
  },
  configurable: true,
  writable: true
})

const copied = await copyRichEmailToClipboard(sampleSbarData)
assert.strictEqual(copied, true, 'copyRichEmailToClipboard returns true')
assert.ok(writtenItems && writtenItems.length === 1, 'Single ClipboardItem written')
const clipboardItem = writtenItems[0]
assert.ok(clipboardItem.data['text/plain'] instanceof Blob, 'text/plain Blob present')
assert.ok(clipboardItem.data['text/html'] instanceof Blob, 'text/html Blob present')

const clipboardPlainText = await clipboardItem.data['text/plain'].text()
const clipboardHtml = await clipboardItem.data['text/html'].text()

assert.ok(clipboardPlainText.includes('Overall Level: Level L4 (Level 4)'), 'Clipboard plain-text contains SBAR overall level')
assert.ok(clipboardPlainText.includes('Curriculum Expectations:'), 'Clipboard plain-text contains curriculum expectations')
assert.ok(clipboardPlainText.includes('• B1.1: Level L4 (Progression: L2 ➔ L3 ➔ L4)'), 'Clipboard plain-text contains expectation progression')

assert.ok(clipboardHtml.includes('Overall Level:'), 'Clipboard HTML contains Overall Level')
assert.ok(clipboardHtml.includes('Level L4 (Level 4)'), 'Clipboard HTML contains SBAR badge text')
assert.ok(clipboardHtml.includes('Curriculum Expectations'), 'Clipboard HTML contains Curriculum Expectations')
assert.ok(clipboardHtml.includes('<strong>B1.1</strong>'), 'Clipboard HTML contains expectation B1.1')
assert.ok(clipboardHtml.includes('Progression:'), 'Clipboard HTML contains Progression label')
assert.ok(clipboardHtml.includes('➔'), 'Clipboard HTML contains progression arrows')
assert.ok(!clipboardHtml.includes('background-color:#3b82f6; height:8px'), 'Clipboard HTML omits percentage bar')

// Test fallback writeText path
delete globalThis.ClipboardItem
let fallbackText = null
globalThis.navigator.clipboard.writeText = async (text) => {
  fallbackText = text
}
const copiedFallback = await copyRichEmailToClipboard(sampleSbarData)
assert.strictEqual(copiedFallback, true, 'Fallback writeText returns true')
assert.ok(fallbackText.includes('Overall Level: Level L4 (Level 4)'), 'Fallback clipboard text contains SBAR level')

// Cleanup mocks
if (originalClipboardItem !== undefined) {
  globalThis.ClipboardItem = originalClipboardItem
} else {
  delete globalThis.ClipboardItem
}
if (originalClipboard !== undefined) {
  globalThis.navigator.clipboard = originalClipboard
} else {
  delete globalThis.navigator.clipboard
}

console.log('✓ SBAR clipboard output verification passed successfully\n')

// ─── TEST 9: Teacher Profile Signature & Working Hours Statement ───
console.log('TEST 9: Teacher Profile Signature & Working Hours Statement')
const profileData = {
  name: 'Alex Mercer',
  course: 'Grade 10 Science',
  teacher: 'Jordan Lee',
  teacherTitle: 'Department Head - Science',
  schoolName: 'Maplewood High School',
  teacherEmail: 'jlee@school.org',
  includeWorkingHoursStatement: true,
  overallGrade: 91
}

const profilePlainText = generateMobileSafeEmailBody(profileData)
assert.ok(profilePlainText.includes('Jordan Lee'), 'Plain text contains teacher name')
assert.ok(profilePlainText.includes('Department Head - Science'), 'Plain text contains title')
assert.ok(profilePlainText.includes('Maplewood High School'), 'Plain text contains school name')
assert.ok(profilePlainText.includes('jlee@school.org'), 'Plain text contains email')
assert.ok(profilePlainText.includes('My working hours and your working hours may be different.'), 'Plain text contains working hours disclaimer')

const profileHtml = generateRichEmailHtml(profileData)
assert.ok(profileHtml.includes('Maplewood High School'), 'HTML header or footer contains school name')
assert.ok(profileHtml.includes('Grade 10 Science • Jordan Lee • Maplewood High School'), 'HTML header banner includes school name')
assert.ok(profileHtml.includes('Department Head - Science'), 'HTML footer contains title')
assert.ok(profileHtml.includes('jlee@school.org'), 'HTML footer contains email')
assert.ok(profileHtml.includes('My working hours and your working hours may be different.'), 'HTML footer contains working hours disclaimer')
console.log('✓ Teacher Profile and working hours statement render cleanly in plain-text and HTML\n')

console.log('=================================================================')
console.log('🎉 ALL EMAIL FORMATTER & UNICODE TESTS PASSED!')
console.log('=================================================================')

