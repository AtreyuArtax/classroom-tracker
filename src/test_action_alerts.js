import assert from 'node:assert'
import {
  buildFollowUpItems,
  buildMissingSummary,
  buildActionItems,
  countEventsSince,
  evaluateActionItems,
  suggestEmailContent,
  buildContactNote
} from './utils/actionAlerts.js'

const students = {
  s1: { firstName: 'Ana', lastName: 'Lee' },
  s2: { firstName: 'Ben', lastName: 'Ng' },
  s3: { firstName: 'Cy', lastName: 'Oh' }
}
const studentList = Object.entries(students).map(([studentId, s]) => ({ ...s, studentId }))

const ev = (studentId, code, timestamp, extra = {}) => ({ studentId, code, timestamp, ...extra })

// ── buildFollowUpItems: absences, low grade, washroom, with kinds ──
{
  const periodEvents = [
    ev('s1', 'a', '2026-09-28T13:00:00Z'),
    ev('s1', 'a', '2026-09-29T13:00:00Z'),
    ev('s1', 'a', '2026-09-30T13:00:00Z'),
    ev('s3', 'w', '2026-09-30T14:00:00Z', { duration: 20 * 60000 }),
    ev('s1', 'a', '2026-09-27T13:00:00Z', { superseded: true })
  ]
  const items = buildFollowUpItems({
    students,
    periodEvents,
    classGrades: { s2: { overallGrade: 55.4 } },
    washCodes: ['w'],
    washLimit: 11
  })
  const s1 = items.find(i => i.studentId === 's1')
  const s2 = items.find(i => i.studentId === 's2')
  const s3 = items.find(i => i.studentId === 's3')
  assert.ok(s1 && s1.kinds.includes('attendance'), 'absences flagged as attendance')
  assert.ok(!/4/.test(s1.reason), 'superseded absence ignored')
  assert.deepStrictEqual(s2.kinds, ['grade'])
  assert.strictEqual(s2.reason, 'Grade at 55%')
  assert.deepStrictEqual(s3.kinds, ['washroom'])
}

// ── buildMissingSummary ──
{
  const assessments = [{ assessmentId: 1, name: 'Quiz' }, { assessmentId: 2, name: 'Lab' }, { assessmentId: 3, name: 'Old', excluded: true }]
  const gradeMap = {
    1: { s1: { missing: true }, s2: { missing: true, excluded: true } },
    2: { s1: { status: 'missing' } },
    3: { s3: { missing: true } }
  }
  const summary = buildMissingSummary({ studentList, assessments, gradeMap, classGrades: { s1: { overallGrade: 61.6 } } })
  assert.strictEqual(summary.length, 1)
  assert.strictEqual(summary[0].studentId, 's1')
  assert.strictEqual(summary[0].tasks.length, 2)
  assert.strictEqual(summary[0].grade, 62)
  assert.deepStrictEqual(buildMissingSummary({ studentList, assessments, gradeMap: null }), [])
}

// ── buildActionItems merges reasons and kinds per student ──
{
  const items = buildActionItems({
    studentList,
    classGrades: { s1: { overallGrade: 42 }, s2: { overallGrade: 80 } },
    followUpItems: [{ studentId: 's1', name: 'Lee, Ana', reason: '3 absences', severity: 'medium', kinds: ['attendance'] }],
    missingSummary: [
      { studentId: 's1', name: 'Ana Lee', grade: 42, tasks: [{}, {}, {}] },
      { studentId: 's2', name: 'Ben Ng', grade: 80, tasks: [{}] },
      { studentId: 'gone', name: 'Archived', grade: null, tasks: [{}] }
    ]
  })
  assert.strictEqual(items.length, 2, 'students not on the roster are dropped')
  const s1 = items.find(i => i.studentId === 's1')
  assert.strictEqual(s1.reason, 'Failing Grade (<50%) · 3 absences · 3 missing tasks')
  assert.deepStrictEqual(s1.kinds.sort(), ['attendance', 'grade', 'missing'])
  assert.strictEqual(s1.severity, 'danger')
  const s2 = items.find(i => i.studentId === 's2')
  assert.strictEqual(s2.reason, '1 missing task overdue')
  assert.strictEqual(s2.severity, 'warning')

  // A failing student is not also told "Grade at 42%"; 50–59% students still are
  const noRepeat = buildActionItems({
    studentList,
    classGrades: { s1: { overallGrade: 42 }, s2: { overallGrade: 55 } },
    followUpItems: [
      { studentId: 's1', name: 'Lee, Ana', reason: 'Grade at 42%', severity: 'high', kinds: ['grade'] },
      { studentId: 's2', name: 'Ng, Ben', reason: 'Grade at 55%', severity: 'high', kinds: ['grade'] }
    ]
  })
  assert.strictEqual(noRepeat.find(i => i.studentId === 's1').reason, 'Failing Grade (<50%)')
  assert.strictEqual(noRepeat.find(i => i.studentId === 's2').reason, 'Grade at 55%')

  const sbar = buildActionItems({ studentList, classGrades: { s1: { overallGrade: 42 } }, isSBAR: true })
  assert.strictEqual(sbar[0].reason, 'Level 1 / Remediation Needed')
}

// ── countEventsSince uses event codes (not a `type` field) ──
{
  const events = [
    ev('s1', 'a', '2026-09-20T13:00:00Z'),
    ev('s1', 'a', '2026-10-01T13:00:00Z'),
    ev('s1', 'l', '2026-10-01T14:00:00Z'),
    ev('s1', 'phone', '2026-10-01T15:00:00Z'),
    ev('s1', 'w', '2026-10-01T16:00:00Z', { duration: 5 * 60000 }),
    ev('s1', 'w', '2026-10-01T17:00:00Z', { duration: 15 * 60000 }),
    ev('s1', 'a', '2026-10-01T18:00:00Z', { superseded: true }),
    ev('s2', 'a', '2026-10-01T13:00:00Z')
  ]
  const counts = countEventsSince(events, 's1', '2026-09-30T00:00:00.000Z', { washCodes: ['w'], washLimit: 11, redirectCodes: ['phone'] })
  assert.deepStrictEqual(counts, { attendance: 2, incidents: 2 })
}

// ── evaluateActionItems: handled vs re-triggered ──
{
  const items = [
    { studentId: 's1', grade: 45, reason: 'Failing Grade (<50%)', kinds: ['grade'] },
    { studentId: 's2', grade: 44, reason: 'Failing Grade (<50%)', kinds: ['grade'] },
    { studentId: 's3', grade: null, reason: '3 absences', kinds: ['attendance'] }
  ]
  const ackAt = '2026-09-30T00:00:00.000Z'
  const acks = {
    s1: { acknowledgedAt: ackAt, gradeAtAck: 45 },
    s2: { acknowledgedAt: ackAt, gradeAtAck: 47 },
    s3: { acknowledgedAt: ackAt, gradeAtAck: null }
  }
  const events = [ev('s3', 'a', '2026-10-01T13:00:00Z'), ev('s3', 'l', '2026-10-01T14:00:00Z')]
  const { active, handled } = evaluateActionItems(items, acks, events, { washCodes: [], washLimit: 11 })
  assert.deepStrictEqual(handled.map(i => i.studentId), ['s1'])
  assert.deepStrictEqual(active.map(i => i.studentId), ['s2', 's3'])
  assert.ok(active[0].reTriggered && /Grade dropped further/.test(active[0].reason))
  assert.ok(/new absences/.test(active[1].reason))

  const unacked = evaluateActionItems(items, {}, [], {})
  assert.strictEqual(unacked.active.length, 3)
}

// ── Email presets and contact note ──
{
  assert.strictEqual(suggestEmailContent([]), null)
  assert.deepStrictEqual(suggestEmailContent(['missing']), { grade: true, assessments: false, missing: true, attendance: false, washroom: false })
  assert.deepStrictEqual(suggestEmailContent(['attendance']), { grade: false, assessments: false, missing: false, attendance: true, washroom: false })

  const note = buildContactNote({
    recipientLabels: ['Jo Lee (parent)', 'student'],
    content: { grade: true, missing: true, attendance: false },
    reason: 'Failing Grade (<50%) · 3 missing tasks'
  })
  assert.strictEqual(note, 'Emailed progress report to Jo Lee (parent), student. Re: Failing Grade (<50%) · 3 missing tasks. Included: grade, missing work.')
  assert.strictEqual(buildContactNote({}), 'Emailed progress report to home.')
}

// ── buildFollowUpItems: 5 and 8 rolling absences & 5 consecutive Alpha VP ──
{
  const schoolDates = [
    '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-08',
    '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-14', '2026-09-15',
    '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22'
  ]
  // s1: 5 non-consecutive absences in window
  // s2: 8 non-consecutive absences in window
  // s3: 5 consecutive absences (Alpha VP)
  const allEvents = [
    // s1 (5 absences)
    ...['2026-09-01', '2026-09-04', '2026-09-10', '2026-09-16', '2026-09-22'].map(d => ev('s1', 'a', `${d}T08:50:00Z`)),
    // s2 (8 absences)
    ...['2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10', '2026-09-14', '2026-09-16', '2026-09-18', '2026-09-22'].map(d => ev('s2', 'a', `${d}T08:50:00Z`)),
    // s3 (5 consecutive absences)
    ...['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22'].map(d => ev('s3', 'a', `${d}T08:50:00Z`))
  ]

  const items = buildFollowUpItems({
    students,
    periodEvents: allEvents,
    allEvents,
    thresholds: {
      absenceWindowDays: 15,
      absenceWindowTier1: 5,
      absenceWindowTier2: 8,
      consecutiveAbsenceTier1: 3,
      consecutiveAbsenceTier2: 5
    }
  })

  const itemS1 = items.find(i => i.studentId === 's1')
  const itemS2 = items.find(i => i.studentId === 's2')
  const itemS3 = items.find(i => i.studentId === 's3')

  assert.ok(itemS1, 's1 flagged for 5 absences in window')
  assert.ok(itemS1.reason.includes('Contact family'), 's1 reason specifies Contact family')

  assert.ok(itemS2, 's2 flagged for 8 absences in window')
  assert.ok(itemS2.reason.includes('Student Success referral'), 's2 reason specifies Student Success referral')

  assert.ok(itemS3, 's3 flagged for 5 consecutive absences')
  assert.ok(itemS3.reason.includes('Notify Alpha VP'), 's3 reason specifies Notify Alpha VP')
}

console.log('✅ action alerts tests passed')
