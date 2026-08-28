import assert from 'assert'

console.log('=================================================================')
console.log('🧪 GUARDIAN COMMUNICATION LOG & SMART PARSER TESTS')
console.log('=================================================================')

function parseCommunicationEvents(events) {
  return events.map(evt => {
    const rawNote = evt.note || ''
    let channel = 'phone'
    let channelLabel = 'Phone Call'
    let outcome = null
    let cleanNote = rawNote

    // 1. Structured bracket prefix: [Channel | Outcome] Note
    const tagMatch = rawNote.match(/^\[(.*?)\]\s*(.*)$/)
    if (tagMatch) {
      const tagContent = tagMatch[1]
      cleanNote = tagMatch[2] || ''
      const parts = tagContent.split('|').map(s => s.trim())
      
      const chStr = parts[0]?.toLowerCase() || ''
      if (chStr.includes('phone') || chStr.includes('call')) {
        channel = 'phone'
        channelLabel = 'Phone Call'
      } else if (chStr.includes('email') || chStr.includes('mail')) {
        channel = 'email'
        channelLabel = 'Email'
      } else if (chStr.includes('meet') || chStr.includes('in-person')) {
        channel = 'meeting'
        channelLabel = 'Meeting'
      } else if (chStr.includes('sms') || chStr.includes('portal') || chStr.includes('text')) {
        channel = 'sms'
        channelLabel = 'SMS / Portal'
      } else {
        channel = 'other'
        channelLabel = parts[0] || 'Contact'
      }

      if (parts.length > 1) {
        outcome = parts.slice(1).join(' | ')
      }
    } else {
      // 2. Comprehensive Word Boundary Regular Expression Fallback
      const text = rawNote.trim()
      
      const phoneRegex = /\b(calls?|called|calling|phones?|phoned|voicemails?|vmails?|vms?|left\s+(?:vm|msg|message)|spoke|spoken|talked|rang|mobile|cells?|dialed)\b/i
      const emailRegex = /\b(e-?mails?|emailed|emailing|sent\s+mail|inbox|forwarded|sent\s+report|replied\s+to\s+email)\b/i
      const meetingRegex = /\b(meets?|meeting|met(?:\s+with)?|interview|conferences?|in-person|parent\s+night|iep\s+meeting|office\s+visit|case\s+conf)\b/i
      const smsRegex = /\b(sms|texts?|texted|portal|app\s+message|remind|messenger)\b/i

      if (phoneRegex.test(text)) {
        channel = 'phone'
        channelLabel = 'Phone Call'
      } else if (emailRegex.test(text)) {
        channel = 'email'
        channelLabel = 'Email'
      } else if (meetingRegex.test(text)) {
        channel = 'meeting'
        channelLabel = 'Meeting'
      } else if (smsRegex.test(text)) {
        channel = 'sms'
        channelLabel = 'SMS / Portal'
      } else {
        channel = 'phone'
        channelLabel = 'Parent Contact'
      }

      // Check common outcomes in note (objective action statuses only)
      if (/\b(voicemails?|vmails?|vms?|left\s+(?:vm|msg|message))\b/i.test(text)) {
        outcome = 'Left Voicemail'
      } else if (/\b(no\s+answer|unanswered|busy|did\s+not\s+answer)\b/i.test(text)) {
        outcome = 'No Answer'
      } else if (/\b(follow-?up|will\s+retry|try\s+mobile|touch\s+base|check\s+back)\b/i.test(text)) {
        outcome = 'Follow-up'
      } else if (/\b(attendance|absent|lates?)\b/i.test(text)) {
        outcome = 'Attendance'
      }
    }

    return {
      ...evt,
      channel,
      channelLabel,
      outcome,
      cleanNote: cleanNote || rawNote
    }
  })
}

// Test sample matching the user's screenshot + extra edge cases
const sampleEvents = [
  { eventId: 'e1', timestamp: '2026-08-28T05:35:00.000Z', note: 'rceived email, happy with results.' },
  { eventId: 'e2', timestamp: '2026-08-28T05:34:30.000Z', note: 'called back, no answer. will try mobile.' },
  { eventId: 'e3', timestamp: '2026-08-28T05:34:10.000Z', note: 'phone call. will touch base.' },
  { eventId: 'e4', timestamp: '2026-08-28T05:34:00.000Z', note: 'emailed. good conversation.' },
  { eventId: 'e5', timestamp: '2026-08-20T14:00:00.000Z', note: '[In-Person Meeting | Discussed IEP] Met at parent night to discuss IEP.' },
  { eventId: 'e6', timestamp: '2026-07-15T10:00:00.000Z', note: '[Phone Call | Left Voicemail] Left message regarding course selection.' },
  { eventId: 'e7', timestamp: '2026-07-10T10:00:00.000Z', note: 'left vm with dad regarding attendance' },
  { eventId: 'e8', timestamp: '2026-07-05T10:00:00.000Z', note: 'met with mom for IEP meeting' },
  { eventId: 'e9', timestamp: '2026-07-01T10:00:00.000Z', note: 'sent text on portal to remind about permission slip' }
]

const parsed = parseCommunicationEvents(sampleEvents)

// Assertions on legacy notes from screenshot
assert.strictEqual(parsed[0].channel, 'email')
console.log('✓ Legacy note 1 parsed: Email (no sentiment tag)')

assert.strictEqual(parsed[1].channel, 'phone')
assert.strictEqual(parsed[1].outcome, 'No Answer')
console.log('✓ Legacy note 2 parsed: Phone Call | No Answer')

assert.strictEqual(parsed[2].channel, 'phone')
assert.strictEqual(parsed[2].outcome, 'Follow-up')
console.log('✓ Legacy note 3 parsed: Phone Call | Follow-up')

assert.strictEqual(parsed[3].channel, 'email')
console.log('✓ Legacy note 4 parsed: Email (no sentiment tag)')

// Assertions on structured tag notes
assert.strictEqual(parsed[4].channel, 'meeting')
assert.strictEqual(parsed[4].outcome, 'Discussed IEP')
assert.strictEqual(parsed[4].cleanNote, 'Met at parent night to discuss IEP.')
console.log('✓ Structured note 5 parsed: Meeting | Discussed IEP')

assert.strictEqual(parsed[5].channel, 'phone')
assert.strictEqual(parsed[5].outcome, 'Left Voicemail')
assert.strictEqual(parsed[5].cleanNote, 'Left message regarding course selection.')
console.log('✓ Structured note 6 parsed: Phone Call | Left Voicemail')

// Assertions on edge cases: vm, met with, portal
assert.strictEqual(parsed[6].channel, 'phone')
assert.strictEqual(parsed[6].outcome, 'Left Voicemail')
console.log('✓ Edge case note 7 parsed: Phone Call | Left Voicemail')

assert.strictEqual(parsed[7].channel, 'meeting')
console.log('✓ Edge case note 8 parsed: Meeting')

assert.strictEqual(parsed[8].channel, 'sms')
console.log('✓ Edge case note 9 parsed: SMS / Portal')

// KPI metrics
const phoneCount = parsed.filter(e => e.channel === 'phone').length
const emailCount = parsed.filter(e => e.channel === 'email').length
const meetingCount = parsed.filter(e => e.channel === 'meeting').length
const smsCount = parsed.filter(e => e.channel === 'sms').length

assert.strictEqual(phoneCount, 4)
assert.strictEqual(emailCount, 2)
assert.strictEqual(meetingCount, 2)
assert.strictEqual(smsCount, 1)
console.log(`✓ KPI metrics computed: Total=9, Phone=4, Email=2, Meeting=2, SMS=1`)

console.log('=================================================================')
console.log('🎉 ALL COMMUNICATION LOG TESTS PASSED!')
console.log('=================================================================')
