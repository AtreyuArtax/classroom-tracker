/**
 * src/test_duties_import.js
 *
 * Test script for parsing the user's historical APA / duty spreadsheets.
 * Run with: node src/test_duties_import.js
 */

import assert from 'node:assert'
import { parseDutiesCsv } from './utils/dutyCsvParser.js'
import { INITIAL_DUTY_SETTINGS } from './db/dutyService.js'

console.log('🧪 Testing Historical Duty CSV Import...\n')

// Sample 1: 2026 and 2025 data with summary columns on the right
const sampleCsv = `
Date (yy/mm/dd),Duty,Duration,Additional Notes,,,,,,,
2026-10-15,AM Bus,15,,,,,,,,
2026-10-16,AM Bus,15,,,,,,,Total,1
2026-10-17,AM Bus,15,,,,,,,Completed,0.04
2026-10-18,AM Bus,15,,,,,,,Remaining,0.96
2026-10-19,AM Bus,15,,,,,,,,
,,,,,,,,,,
,,,,,Completed Minutes,75,,,,
Date (yy/mm/dd),Duty,Duration,Additional Notes,,,,,,,
2025-10-20,AM Bus,15,,,,,,,,
2025-10-21,AM Bus,15,,,,,,,Total,1
2025-10-22,AM Bus,15,,,,,,,Completed,0.192
2025-10-23,AM Bus,15,,,,,,,Remaining,0.808
2025-10-24,AM Bus,15,,,,,,,,
2025-10-27,Student Commons,20,,,,,,,,
2025-10-28,Student Commons,20,,,,,,,,
2025-10-29,Student Commons,20,,,,,,,,
2025-10-30,Student Commons,20,,,,,,,,
2025-10-31,Student Commons,20,,,Allotted Minutes,1875,,,,
2025-10-27,Emergency,20,,,Completed Minutes,360,,,,
2025-11-11,Weight Room,30,snow day,,Remaining Minutes,1515,,,,
2025-11-12,Weight Room,30,,,,,,,,
2025-11-17,Emergency,30,,,Emergency On-calls,2,,,,
2025-11-24,On-call,75,F. Name,,,,,,,
`

const result = parseDutiesCsv(sampleCsv, INITIAL_DUTY_SETTINGS.dutyTypes)

console.log(`Found ${result.totalFound} duties:`)
console.log('Years summary:', result.summaryByYear)

// Verify total count (5 from 2026 + 15 from 2025 = 20 entries)
assert.strictEqual(result.totalFound, 20, 'Should find exactly 20 valid duty rows')
assert.strictEqual(result.summaryByYear['2026-27'], 5, '2026-27 should have 5 duties')
assert.strictEqual(result.summaryByYear['2025-26'], 15, '2025-26 should have 15 duties')

// Verify snow day detection
const snowDayEntry = result.duties.find(d => d.date === '2025-11-11')
assert.ok(snowDayEntry, 'Snow day entry must exist')
assert.strictEqual(snowDayEntry.isSnowDay, true, '2025-11-11 must be marked as snow day')

// Verify emergency detection
const emergencyEntry = result.duties.find(d => d.date === '2025-11-17')
assert.ok(emergencyEntry, 'Emergency entry must exist')
assert.strictEqual(emergencyEntry.isEmergency, true, 'Emergency entry must have isEmergency: true')

// Verify notes
const onCallEntry = result.duties.find(d => d.date === '2025-11-24')
assert.ok(onCallEntry, 'On-call entry must exist')
assert.strictEqual(onCallEntry.notes, 'F. Name', 'Notes should be extracted')

console.log('\n🎉 CSV IMPORT PARSER TESTS PASSED SUCCESSFULLY!\n')
