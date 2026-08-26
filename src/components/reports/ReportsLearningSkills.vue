<template>
  <div class="learning-skills">
    <!-- Header Banner / Controls -->
    <div class="learning-skills__header">
      <div class="learning-skills__header-left">
        <div class="learning-skills__title-row">
          <h2 class="learning-skills__title">Learning Skills &amp; Work Habits</h2>
          <span v-if="reportClass" class="learning-skills__class-pill">
            <GraduationCap :size="14" />
            {{ reportClass.name }}
          </span>
        </div>
        <p class="learning-skills__subtitle">
          Ontario Growing Success 6-Skill Evaluations. Compare student self-evaluations with teacher ratings for official report cards.
        </p>
      </div>

      <div class="learning-skills__header-right">
        <!-- Term Selector Pills -->
        <div class="learning-skills__term-pills">
          <button
            v-for="t in terms"
            :key="t"
            type="button"
            class="term-pill-btn"
            :class="{ 'term-pill-btn--active': selectedTerm === t }"
            @click="selectedTerm = t"
          >
            {{ t }}
          </button>
        </div>
      </div>
    </div>

    <!-- Action Toolbar (Single Clean Row) -->
    <div class="learning-skills__toolbar">
      <div class="toolbar-group">
        <button 
          type="button" 
          class="ls-btn ls-btn--primary" 
          @click="showImportModal = true"
        >
          <UploadCloud :size="15" /> Import Responses (.xlsx / .csv)
        </button>

        <button 
          type="button" 
          class="ls-btn ls-btn--ghost" 
          title="Setup guide, Microsoft Forms template &amp; Growing Success rubrics"
          @click="showGuideModal = true"
        >
          <HelpCircle :size="14" /> Guide &amp; Rubrics
        </button>
      </div>

      <div class="toolbar-group">
        <button 
          type="button" 
          class="ls-btn ls-btn--ghost" 
          :class="{ 'ls-btn--active': showClassInsights }"
          @click="showClassInsights = !showClassInsights"
        >
          <BarChart2 :size="14" /> {{ showClassInsights ? 'Hide Insights' : 'Class Insights' }}
        </button>

        <button 
          type="button" 
          class="ls-btn ls-btn--ghost" 
          :disabled="sidebarStudents.length === 0"
          title="Copy tab-delimited table to clipboard for Excel / Google Sheets"
          @click="copyTableToClipboard"
        >
          <Clipboard :size="14" /> {{ copyFeedback || 'Copy Matrix' }}
        </button>

        <button 
          type="button" 
          class="ls-btn ls-btn--ghost" 
          :disabled="sidebarStudents.length === 0"
          title="Download CSV spreadsheet of learning skills for this term"
          @click="exportCsv"
        >
          <Download :size="14" /> Export CSV
        </button>
      </div>
    </div>

    <!-- Collapsible Class Distribution Insights Drawer -->
    <Transition name="expand-fade">
      <div v-if="showClassInsights" class="learning-skills__insights-card">
        <div class="insights-header">
          <h4 class="insights-title">Class Evaluation Breakdown ({{ selectedTerm }})</h4>
          <span class="insights-stats">{{ matchedCount }} of {{ sidebarStudents.length }} students evaluated</span>
        </div>

        <div class="insights-grid">
          <div 
            v-for="cat in LEARNING_SKILL_CATEGORIES" 
            :key="cat.key" 
            class="insight-col"
          >
            <div class="insight-skill-name" :title="cat.description">
              <span class="skill-short-badge">{{ cat.short }}</span>
              <span class="skill-full-name">{{ cat.label }}</span>
            </div>

            <!-- Student vs Teacher Distribution Bars -->
            <div class="insight-bars-container">
              <!-- Student Self-Eval Bar -->
              <div class="insight-bar-row">
                <span class="bar-label">Self</span>
                <div class="stacked-bar">
                  <div 
                    v-for="lvl in ['E', 'G', 'S', 'N']" 
                    :key="'s-' + lvl"
                    class="bar-segment"
                    :class="'bar-segment--' + lvl"
                    :style="{ width: getSkillDistribution(cat.key, 'studentEval')[lvl] + '%' }"
                    :title="`Self ${lvl}: ${getSkillDistribution(cat.key, 'studentEval')[lvl]}%`"
                  ></div>
                </div>
              </div>

              <!-- Teacher Eval Bar -->
              <div class="insight-bar-row">
                <span class="bar-label">Teacher</span>
                <div class="stacked-bar">
                  <div 
                    v-for="lvl in ['E', 'G', 'S', 'N']" 
                    :key="'t-' + lvl"
                    class="bar-segment"
                    :class="'bar-segment--' + lvl"
                    :style="{ width: getSkillDistribution(cat.key, 'teacherEval')[lvl] + '%' }"
                    :title="`Teacher ${lvl}: ${getSkillDistribution(cat.key, 'teacherEval')[lvl]}%`"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="insights-legend">
          <span class="legend-item"><span class="legend-dot legend-dot--E"></span> E (Excellent)</span>
          <span class="legend-item"><span class="legend-dot legend-dot--G"></span> G (Good)</span>
          <span class="legend-item"><span class="legend-dot legend-dot--S"></span> S (Satisfactory)</span>
          <span class="legend-item"><span class="legend-dot legend-dot--N"></span> N (Needs Improvement)</span>
        </div>
      </div>
    </Transition>

    <!-- Empty State if No Students in Class -->
    <div v-if="sidebarStudents.length === 0" class="learning-skills__empty-state">
      <Users :size="40" class="empty-icon" />
      <h3>No Students Enrolled</h3>
      <p>Enroll or import students into this class to manage their learning skills.</p>
    </div>

    <!-- Main Learning Skills Matrix Table -->
    <div v-else class="learning-skills__table-container">
      <table class="learning-skills__table">
        <thead>
          <tr>
            <th class="th-student">Student Name</th>
            <th 
              v-for="cat in LEARNING_SKILL_CATEGORIES" 
              :key="cat.key"
              class="th-skill"
              :title="cat.description"
            >
              <div class="th-skill-content">
                <span class="th-skill-short">{{ cat.short }}</span>
                <span class="th-skill-label">{{ cat.label }}</span>
              </div>
            </th>
            <th class="th-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="student in sidebarStudents" 
            :key="student.studentId"
            class="matrix-row"
          >
            <!-- Student Identity Cell -->
            <td class="td-student">
              <div class="student-cell">
                <StudentAvatar 
                  :student-id="student.studentId" 
                  :first-name="student.firstName" 
                  :last-name="student.lastName"
                  size="sm"
                />
                <div class="student-cell__info">
                  <span class="student-cell__name">{{ student.lastName }}, {{ student.firstName }}</span>
                </div>
              </div>
            </td>

            <!-- 6 Skill Cells -->
            <td 
              v-for="cat in LEARNING_SKILL_CATEGORIES" 
              :key="cat.key"
              class="td-skill"
            >
              <div class="skill-cell-box">
                <!-- Top Mini Row: Student Self-Eval Badge -->
                <div class="self-eval-row">
                  <span class="self-eval-tag">Self:</span>
                  <span 
                    v-if="getStudentRecord(student.studentId)?.studentEval?.[cat.key]"
                    class="level-badge"
                    :class="'level-badge--' + getStudentRecord(student.studentId).studentEval[cat.key]"
                    :title="`Student Self-Rating: ${getStudentRecord(student.studentId).studentEval[cat.key]}`"
                  >
                    {{ getStudentRecord(student.studentId).studentEval[cat.key] }}
                  </span>
                  <span v-else class="level-badge-none">—</span>

                  <!-- Discrepancy Indicator Dot -->
                  <span 
                    v-if="hasDiscrepancy(student.studentId, cat.key)" 
                    class="discrepancy-dot"
                    title="Notable difference between student self-rating and teacher evaluation"
                  ></span>
                </div>

                <!-- Bottom Row: Teacher Rating Interactive Pill Selector -->
                <div class="teacher-eval-pills" role="radiogroup">
                  <button
                    v-for="lvl in ['E', 'G', 'S', 'N']"
                    :key="lvl"
                    type="button"
                    class="teacher-pill"
                    :class="[
                      'teacher-pill--' + lvl,
                      { 'teacher-pill--active': getStudentRecord(student.studentId)?.teacherEval?.[cat.key] === lvl }
                    ]"
                    :title="`Teacher Rating: ${lvl}`"
                    @click="setTeacherSkill(student.studentId, cat.key, lvl)"
                  >
                    {{ lvl }}
                  </button>
                </div>
              </div>
            </td>

            <!-- Row Actions -->
            <td class="td-actions">
              <button 
                v-if="getStudentRecord(student.studentId)"
                type="button"
                class="btn-row-clear"
                title="Clear ratings for this student"
                @click="clearStudentRating(student.studentId)"
              >
                <Trash2 :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Import Modal -->
    <LearningSkillsCsvImportModal
      v-if="showImportModal && reportClass"
      :show="showImportModal"
      :class-id="reportClass.classId"
      :roster-students="resolvedRosterStudents"
      :initial-term="selectedTerm"
      @close="showImportModal = false"
      @imported="onSurveyImported"
      @open-guide="showGuideModal = true"
    />

    <!-- Unified Learning Skills & Rubrics Guide Modal -->
    <LearningSkillsGuideModal
      v-if="showGuideModal"
      :show="showGuideModal"
      @close="showGuideModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import StudentAvatar from '../photos/StudentAvatar.vue'
import LearningSkillsCsvImportModal from './LearningSkillsCsvImportModal.vue'
import LearningSkillsGuideModal from './LearningSkillsGuideModal.vue'
import { 
  LEARNING_SKILL_CATEGORIES, 
  LEARNING_SKILL_TERMS,
  getLearningSkillsByClassAndTerm, 
  saveLearningSkillsRecord, 
  saveBatchLearningSkills 
} from '../../db/learningSkillsService.js'
import { saveAs } from 'file-saver'
import { 
  GraduationCap, 
  UploadCloud, 
  BarChart2, 
  Download, 
  Clipboard, 
  Users, 
  Trash2,
  HelpCircle 
} from 'lucide-vue-next'

const props = defineProps({
  reportClass: { type: Object, default: null },
  sidebarStudents: { type: Array, default: () => [] }
})

const terms = LEARNING_SKILL_TERMS
const selectedTerm = ref('Progress Report')
const learningSkillsMap = ref(new Map())
const showImportModal = ref(false)
const showGuideModal = ref(false)
const showClassInsights = ref(false)
const copyFeedback = ref('')

const createEmptySkills = () => ({
  responsibility: null,
  organization: null,
  independentWork: null,
  collaboration: null,
  initiative: null,
  selfRegulation: null
})

const resolvedRosterStudents = computed(() => {
  const classStudents = props.reportClass?.students || {}
  return props.sidebarStudents.map(s => {
    const rawStudent = classStudents[s.studentId] || {}
    return {
      ...s,
      studentEmail: rawStudent.studentEmail || rawStudent.email || s.studentEmail || '',
      studentNumber: rawStudent.studentNumber || rawStudent.id || s.studentNumber || ''
    }
  })
})

async function fetchLearningSkills() {
  if (!props.reportClass?.classId) {
    learningSkillsMap.value = new Map()
    return
  }

  try {
    const list = await getLearningSkillsByClassAndTerm(props.reportClass.classId, selectedTerm.value)
    const map = new Map()
    for (const item of list) {
      if (item.studentId) map.set(item.studentId, item)
    }
    learningSkillsMap.value = map
  } catch (err) {
    console.error('[ReportsLearningSkills] Failed to load learning skills:', err)
  }
}

watch([() => props.reportClass?.classId, selectedTerm], () => {
  fetchLearningSkills()
}, { immediate: true })

function getStudentRecord(studentId) {
  return learningSkillsMap.value.get(studentId) || null
}

const matchedCount = computed(() => {
  return props.sidebarStudents.filter(s => learningSkillsMap.value.has(s.studentId)).length
})

async function setTeacherSkill(studentId, skillKey, level) {
  if (!props.reportClass?.classId) return

  let rec = learningSkillsMap.value.get(studentId)
  if (!rec) {
    rec = {
      classId: props.reportClass.classId,
      studentId,
      term: selectedTerm.value,
      date: new Date().toISOString().slice(0, 10),
      studentEval: createEmptySkills(),
      teacherEval: createEmptySkills()
    }
  }

  const currentVal = rec.teacherEval?.[skillKey]
  const newVal = currentVal === level ? null : level

  const updatedTeacherEval = {
    ...(rec.teacherEval || createEmptySkills()),
    [skillKey]: newVal
  }

  const updatedRecord = {
    ...rec,
    teacherEval: updatedTeacherEval
  }

  learningSkillsMap.value.set(studentId, updatedRecord)
  learningSkillsMap.value = new Map(learningSkillsMap.value)

  try {
    await saveLearningSkillsRecord(updatedRecord)
  } catch (err) {
    console.error('Failed to save teacher evaluation:', err)
  }
}

async function clearStudentRating(studentId) {
  const rec = learningSkillsMap.value.get(studentId)
  if (!rec) return

  const updated = {
    ...rec,
    teacherEval: createEmptySkills()
  }

  learningSkillsMap.value.set(studentId, updated)
  learningSkillsMap.value = new Map(learningSkillsMap.value)
  await saveLearningSkillsRecord(updated)
}

function hasDiscrepancy(studentId, skillKey) {
  const rec = learningSkillsMap.value.get(studentId)
  if (!rec) return false

  const sVal = rec.studentEval?.[skillKey]
  const tVal = rec.teacherEval?.[skillKey]
  if (!sVal || !tVal) return false

  const scoreMap = { E: 4, G: 3, S: 2, N: 1 }
  const diff = Math.abs((scoreMap[sVal] || 0) - (scoreMap[tVal] || 0))
  return diff >= 2
}

function getSkillDistribution(skillKey, evalType) {
  let total = 0
  const counts = { E: 0, G: 0, S: 0, N: 0 }

  for (const student of props.sidebarStudents) {
    const rec = learningSkillsMap.value.get(student.studentId)
    if (!rec) continue
    const val = rec[evalType]?.[skillKey]
    if (val && counts[val] !== undefined) {
      counts[val]++
      total++
    }
  }

  if (total === 0) return { E: 0, G: 0, S: 0, N: 0 }
  return {
    E: Math.round((counts.E / total) * 100),
    G: Math.round((counts.G / total) * 100),
    S: Math.round((counts.S / total) * 100),
    N: Math.round((counts.N / total) * 100)
  }
}

function onSurveyImported(evt) {
  if (evt?.term) {
    selectedTerm.value = evt.term
  }
  fetchLearningSkills()
}

function exportCsv() {
  if (!props.sidebarStudents.length) return

  const rows = [
    ['Student Name', 'Student ID', 'Email', 'Term', 'Responsibility', 'Organization', 'Independent Work', 'Collaboration', 'Initiative', 'Self-Regulation']
  ]

  for (const s of props.sidebarStudents) {
    const rec = learningSkillsMap.value.get(s.studentId)
    const t = rec?.teacherEval || {}
    rows.push([
      `"${s.lastName}, ${s.firstName}"`,
      `"${s.studentId}"`,
      `"${s.studentEmail || ''}"`,
      `"${selectedTerm.value}"`,
      t.responsibility || '',
      t.organization || '',
      t.independentWork || '',
      t.collaboration || '',
      t.initiative || '',
      t.selfRegulation || ''
    ])
  }

  const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const filename = `${props.reportClass?.name || 'Class'}_LearningSkills_${selectedTerm.value.replace(/\s+/g, '_')}.csv`
  saveAs(blob, filename)
}

async function copyTableToClipboard() {
  if (!props.sidebarStudents.length) return

  const lines = [
    ['Student Name', 'R', 'O', 'I', 'C', 'I', 'S'].join('\t')
  ]

  for (const s of props.sidebarStudents) {
    const rec = learningSkillsMap.value.get(s.studentId)
    const t = rec?.teacherEval || {}
    lines.push([
      `${s.lastName}, ${s.firstName}`,
      t.responsibility || '—',
      t.organization || '—',
      t.independentWork || '—',
      t.collaboration || '—',
      t.initiative || '—',
      t.selfRegulation || '—'
    ].join('\t'))
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copyFeedback.value = 'Copied!'
    setTimeout(() => { copyFeedback.value = '' }, 2500)
  } catch (err) {
    console.error('Clipboard copy failed:', err)
  }
}
</script>

<style scoped>
.learning-skills { display: flex; flex-direction: column; gap: 14px; width: 100%; }

/* Header Banner */
.learning-skills__header {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 14px 18px; box-shadow: var(--shadow-sm);
}
.learning-skills__title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.learning-skills__title { margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text); }
.learning-skills__class-pill {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; background: var(--bg-secondary);
  border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.8rem; font-weight: 600; color: var(--primary);
}
.learning-skills__subtitle { margin: 4px 0 0 0; font-size: 0.825rem; color: var(--text-secondary); }

/* Term Selector Pills */
.learning-skills__term-pills {
  display: inline-flex; gap: 3px; background: var(--bg-secondary); padding: 3px;
  border-radius: var(--radius-md); border: 1px solid var(--border);
}
.term-pill-btn {
  padding: 5px 12px; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm);
  color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;
}
.term-pill-btn:hover { background: var(--surface); color: var(--text); }
.term-pill-btn--active { background: var(--primary); color: #ffffff; border-color: var(--primary); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }

/* Action Toolbar */
.learning-skills__toolbar {
  display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
}
.toolbar-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ls-btn {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: var(--radius-sm);
  font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease; border: 1px solid var(--border);
}
.ls-btn--primary { background: var(--primary); border-color: var(--primary); color: #ffffff; }
.ls-btn--primary:hover { opacity: 0.92; }
.ls-btn--ghost { background: var(--surface); border-color: var(--border); color: var(--text); }
.ls-btn--ghost:hover:not(:disabled) { background: var(--bg-secondary); border-color: var(--primary); color: var(--primary); }
.ls-btn--active { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
.ls-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* Insights Card */
.learning-skills__insights-card {
  padding: 14px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
}
.insights-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.insights-title { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text); }
.insights-stats { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
.insights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; }
.insight-col {
  display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; background: var(--bg-secondary);
  border: 1px solid var(--border); border-radius: var(--radius-md);
}
.insight-skill-name { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; font-weight: 700; color: var(--text); }
.skill-short-badge {
  display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px;
  background: var(--primary-light); color: var(--primary); border-radius: 4px; font-size: 0.7rem; font-weight: 800;
}
.skill-full-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.insight-bars-container { display: flex; flex-direction: column; gap: 4px; }
.insight-bar-row { display: flex; align-items: center; gap: 5px; }
.bar-label { font-size: 0.65rem; font-weight: 600; color: var(--text-secondary); width: 36px; }
.stacked-bar { flex: 1; height: 8px; display: flex; background: rgba(0, 0, 0, 0.06); border-radius: 4px; overflow: hidden; }
.bar-segment { height: 100%; transition: width 0.3s ease; }
.bar-segment--E { background: #2563eb; }
.bar-segment--G { background: #16a34a; }
.bar-segment--S { background: #ca8a04; }
.bar-segment--N { background: #dc2626; }
.insights-legend {
  display: flex; gap: 14px; margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border);
  font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); flex-wrap: wrap;
}
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-dot--E { background: #2563eb; }
.legend-dot--G { background: #16a34a; }
.legend-dot--S { background: #ca8a04; }
.legend-dot--N { background: #dc2626; }

/* Table Container */
.learning-skills__table-container {
  overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-lg);
  background: var(--surface); box-shadow: var(--shadow-sm);
}
.learning-skills__table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.learning-skills__table th {
  position: sticky; top: 0; background: var(--bg-secondary); color: var(--text);
  font-weight: 700; padding: 8px 8px; text-align: left; border-bottom: 2px solid var(--border); z-index: 2;
}
.th-student { min-width: 140px; }
.th-skill { min-width: 104px; text-align: center; }
.th-skill-content { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.th-skill-short { font-size: 0.72rem; font-weight: 800; color: var(--primary); }
.th-skill-label { font-size: 0.75rem; color: var(--text); font-weight: 600; }
.th-actions { width: 36px; }
.learning-skills__table td {
  padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: middle; background: var(--surface);
}
.matrix-row:hover td { background: var(--bg-secondary); }
.student-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.student-cell__info { display: flex; flex-direction: column; min-width: 0; }
.student-cell__name {
  font-weight: 600; color: var(--text); font-size: 0.82rem; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; max-width: 140px;
}

/* Skill Box Cell */
.skill-cell-box { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 2px; }
.self-eval-row { display: flex; align-items: center; gap: 4px; }
.self-eval-tag { font-size: 0.65rem; font-weight: 600; color: var(--text-secondary); }
.level-badge {
  display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px;
  border-radius: 4px; font-size: 0.72rem; font-weight: 800;
}
.level-badge--E { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
.level-badge--G { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.level-badge--S { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
.level-badge--N { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
.level-badge-none { font-size: 0.72rem; color: var(--text-secondary); opacity: 0.4; }
.discrepancy-dot { width: 5px; height: 5px; background: #ea580c; border-radius: 50%; box-shadow: 0 0 2px #ea580c; }

/* Teacher Eval Pill Selector */
.teacher-eval-pills {
  display: inline-flex; gap: 1px; background: var(--bg-secondary); padding: 1px; border-radius: 5px; border: 1px solid var(--border);
}
.teacher-pill {
  width: 22px; height: 20px; display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 3px; font-size: 0.72rem; font-weight: 700;
  color: var(--text-secondary); cursor: pointer; transition: all 0.12s ease;
}
.teacher-pill:hover { background: rgba(0, 0, 0, 0.08); color: var(--text); }
.teacher-pill--E.teacher-pill--active { background: #2563eb; color: #ffffff; }
.teacher-pill--G.teacher-pill--active { background: #16a34a; color: #ffffff; }
.teacher-pill--S.teacher-pill--active { background: #ca8a04; color: #ffffff; }
.teacher-pill--N.teacher-pill--active { background: #dc2626; color: #ffffff; }

.td-actions { text-align: center; }
.btn-row-clear {
  background: transparent; border: none; color: var(--text-secondary); opacity: 0.4;
  cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.15s ease;
}
.matrix-row:hover .btn-row-clear { opacity: 0.8; }
.btn-row-clear:hover { color: #dc2626; opacity: 1; background: #fee2e2; }

.learning-skills__empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 20px; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-lg); text-align: center;
}
.empty-icon { color: var(--text-secondary); margin-bottom: 10px; opacity: 0.6; }
.expand-fade-enter-active, .expand-fade-leave-active { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.expand-fade-enter-from, .expand-fade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
