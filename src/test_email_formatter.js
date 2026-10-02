import assert from 'assert'
import {
  makeMiniBar,
  fitLine,
  generateMobileSafeEmailBody,
  generateMobileSafeEmail,
  generateRichEmailHtml,
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

console.log('=================================================================')
console.log('🎉 ALL EMAIL FORMATTER & UNICODE TESTS PASSED!')
console.log('=================================================================')

