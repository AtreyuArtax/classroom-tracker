<template>
  <div class="academics-tab-content">
    <div class="academics-section">
      <h3 class="academics-section__title">Category Performance</h3>
      <DossierCategoryGrid :categories="academicCategories" :student-id="props.studentId" />
    </div>

    <div class="academics-section">
      <DossierEvidenceMix :mix="evidenceMix" />
    </div>

    <!-- Class Assessments (Priority First) -->
    <div class="academics-section">
      <h3 class="academics-section__title">Class Assessments</h3>
      <div class="academics-table-wrapper">
        <table class="academics-table">
          <thead>
            <tr>
              <th class="th-date">Date</th>
              <th class="th-name">Assessment</th>
              <th class="th-type">Type</th>
              <th class="th-impact">Impact</th>
              <th class="th-score">Points</th>
              <th class="th-percent">%</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in classAssessments" :key="a.assessmentId" @contextmenu.prevent="onContextMenu($event, a.assessmentId)">
              <td class="td-date">{{ formatLocalDisplay(a.date) }}</td>
              <td class="td-name">{{ a.name }}</td>
              <td class="td-type"><span class="badge" :class="'badge--' + a.assessmentType">{{ a.assessmentType }}</span></td>
              <td class="td-impact">
                <span 
                  class="impact-badge" 
                  :class="'impact-badge--' + getImpactLevel(a.weight).id"
                  :title="'Weight: ' + (a.weight || 1)"
                >
                  {{ getImpactLevel(a.weight).label }}
                </span>
              </td>
              <td class="td-score">
                <div class="score-cell-wrapper">
                  <!-- Inline Edit Mode -->
                  <template v-if="editingCell?.assessmentId === a.assessmentId">
                    <input 
                      type="number" 
                      v-model="editInput" 
                      class="cell-edit-input"
                      @blur="saveEdit"
                      @keydown="handleCellKey"
                    />
                  </template>
                  
                  <!-- Visual Display Mode -->
                  <template v-else>
                    <div v-if="a.missing" class="score-missing" @click="startEdit(a.assessmentId)">
                      <span class="text-danger">Missing</span>
                      <span v-if="a.wasAbsent" class="badge-red-a" title="Absent on this date">A</span>
                    </div>
                    <span v-else-if="a.excluded" class="text-muted" @click="startEdit(a.assessmentId)">EX</span>
                    <span v-else class="score-value" @click="startEdit(a.assessmentId)">
                      {{ a.score }} / {{ a.totalPoints }}
                    </span>
                    
                    <!-- Attempts / Comment Indicators -->
                    <div class="cell-indicators" v-if="a.attempts?.length >= 1">
                      <div 
                        v-if="a.attempts?.length > 1"
                        class="attempts-dot"
                        @click.stop="openAttempts($event, a.assessmentId)"
                        title="Multiple attempts - click to view history"
                      ></div>
                      <span
                        class="comment-dot"
                        :class="{ 'comment-dot--active': a.attempts?.some(x => x.comment?.trim()) }"
                        @click.stop="openAttempts($event, a.assessmentId)"
                        :title="a.attempts?.some(x => x.comment?.trim()) ? 'Has note — click to edit' : 'Add a note'"
                      >📝</span>
                    </div>
                  </template>
                </div>
              </td>
              <td class="td-percent" :style="{ color: getGradeColor((a.score / a.totalPoints) * 100) }">
                {{ a.score !== null ? Math.round((a.score / a.totalPoints) * 100) + '%' : 'N/A' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Individual Assessments (Secondary) -->
    <div class="academics-section">
      <div class="academics-section__header">
        <h3 class="academics-section__title">Individual Assessments</h3>
        <button class="btn-add-individual" @click="openAddAssessment('individual', props.studentId)">
          <Plus :size="14" /> Add Task
        </button>
      </div>
      <div class="academics-table-wrapper">
         <table v-if="individualAssessments.length" class="academics-table">
           <thead>
             <tr>
               <th class="th-date">Date</th>
               <th class="th-name">Assessment</th>
               <th class="th-type">Type</th>
               <th class="th-impact">Impact</th>
               <th class="th-score">Points</th>
               <th class="th-percent">%</th>
             </tr>
           </thead>
           <tbody>
             <tr v-for="a in individualAssessments" :key="a.assessmentId" @contextmenu.prevent="onContextMenu($event, a.assessmentId)">
               <td class="td-date">{{ formatLocalDisplay(a.date) }}</td>
               <td class="td-name">{{ a.name }}</td>
               <td class="td-type"><span class="badge" :class="'badge--' + a.assessmentType">{{ a.assessmentType }}</span></td>
               <td class="td-impact">
                 <span 
                   class="impact-badge" 
                   :class="'impact-badge--' + getImpactLevel(a.weight).id"
                   :title="'Weight: ' + (a.weight || 1)"
                 >
                   {{ getImpactLevel(a.weight).label }}
                 </span>
               </td>
               <td class="td-score">
                 <div class="score-cell-wrapper">
                   <!-- Inline Edit Mode -->
                   <template v-if="editingCell?.assessmentId === a.assessmentId">
                     <input 
                       type="number" 
                       v-model="editInput" 
                       class="cell-edit-input"
                       @blur="saveEdit"
                       @keydown="handleCellKey"
                     />
                   </template>
                   
                   <!-- Visual Display Mode -->
                   <template v-else>
                     <div v-if="a.missing" class="score-missing" @click="startEdit(a.assessmentId)">
                       <span class="text-danger">Missing</span>
                     </div>
                     <span v-else-if="a.excluded" class="text-muted" @click="startEdit(a.assessmentId)">EX</span>
                     <span v-else class="score-value" @click="startEdit(a.assessmentId)">
                       {{ a.score }} / {{ a.totalPoints }}
                     </span>
                     
                     <!-- Attempts / Comment Indicators -->
                     <div class="cell-indicators" v-if="a.attempts?.length >= 1">
                       <div 
                         v-if="a.attempts?.length > 1"
                         class="attempts-dot"
                         @click.stop="openAttempts($event, a.assessmentId)"
                         title="Multiple attempts - click to view history"
                       ></div>
                       <span
                         class="comment-dot"
                         :class="{ 'comment-dot--active': a.attempts?.some(x => x.comment?.trim()) }"
                         @click.stop="openAttempts($event, a.assessmentId)"
                         :title="a.attempts?.some(x => x.comment?.trim()) ? 'Has note — click to edit' : 'Add a note'"
                       >📝</span>
                     </div>
                   </template>
                 </div>
               </td>
               <td class="td-percent" :style="{ color: getGradeColor((a.score / a.totalPoints) * 100) }">
                 {{ a.score !== null ? Math.round((a.score / a.totalPoints) * 100) + '%' : 'N/A' }}
               </td>
             </tr>
           </tbody>
         </table>
         <div v-else class="academics-empty-state">
           No student-specific assessments. Click "Add Task" to create one.
         </div>
      </div>
    </div>



    <!-- Internal Gradebook Notes -->
    <div class="student-360__gradebook-note">
      <h3 class="academics-section__title">Internal Gradebook Notes</h3>
      <textarea 
        class="student-360__notes-area"
        v-model="localGradebookNote"
        placeholder="Add private observations about this student's grading context..."
        @blur="updateGradebookNoteLocal"
      ></textarea>
    </div>

    <!-- Dossier Cell Context Menu (Overlay Portal) -->
    <div 
      v-if="contextMenu" 
      class="context-menu-backdrop" 
      @click="contextMenu = null"
      @contextmenu.prevent="contextMenu = null"
    >
      <div 
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click.stop
      >
        <button class="context-menu__item" @click="startNewAttempt(contextMenu.assessmentId)">
          <Plus :size="14" /> New Attempt...
        </button>
        <button 
          v-if="gradeMap[contextMenu.assessmentId]?.[props.studentId]?.attempts?.length >= 1"
          class="context-menu__item" 
          @click="openAttemptsFromMenu($event, contextMenu.assessmentId)"
        >
          <Calendar :size="14" /> View Notes
        </button>
        <div class="context-menu__divider"></div>
        <button class="context-menu__item" @click="toggleMissing(contextMenu.assessmentId)">
          <AlertCircle :size="14" /> {{ gradeMap[contextMenu.assessmentId]?.[props.studentId]?.missing ? 'Unmark Missing' : 'Mark Missing' }}
        </button>
        <button class="context-menu__item" @click="toggleExcluded(contextMenu.assessmentId)">
          <XCircle :size="14" /> {{ gradeMap[contextMenu.assessmentId]?.[props.studentId]?.excluded ? 'Unmark Excluded' : 'Mark Excluded' }}
        </button>
        <div class="context-menu__divider"></div>
        <button 
          v-if="hasGradeValue(contextMenu.assessmentId)"
          class="context-menu__item" 
          @click="clearStudentGrade(contextMenu.assessmentId)"
        >
          <X :size="14" /> Clear Mark
        </button>
        <button 
          v-if="isIndividualAssessment(contextMenu.assessmentId)"
          class="context-menu__item text-danger" 
          @click="doDeleteAssessment(contextMenu.assessmentId)"
        >
          <Trash2 :size="14" /> Delete Assessment
        </button>
      </div>
    </div>

    <!-- Attempts Popover (Overlay Portal) -->
    <div 
      v-if="attemptsPopover" 
      class="context-menu-backdrop" 
      @click="attemptsPopover = null"
      @contextmenu.prevent="attemptsPopover = null"
    >
      <div 
        class="attempts-popover"
        :style="{ top: attemptsPopover.y + 'px', left: attemptsPopover.x + 'px' }"
        @click.stop
      >
        <div class="attempts-popover__header">
          Attempts & Notes
        </div>
        <ul class="attempts-popover__list">
          <li 
            v-for="(att, i) in getAttemptsForPopover()" 
            :key="att.attemptId" 
            class="attempt-item"
            :class="{ 'attempt-item--primary': att.isPrimary }"
          >
            <div class="attempt-item__row">
              <div class="attempt-item__main">
                <span class="attempt-item__score">
                  {{ att.pointsEarned }} pts
                  <template v-if="getRetestPolicy(attemptsPopover.assessmentId) === 'manual'">
                    <span 
                      v-if="att.isPrimary" 
                      class="badge" 
                      style="background: var(--primary); color: #fff; margin-left: 4px;"
                    >Primary</span>
                  </template>
                  <template v-else>
                    <span 
                      v-if="isCountingAttempt(attemptsPopover.assessmentId, att)" 
                      class="badge" 
                      style="background: #10b981; color: #fff; margin-left: 4px;"
                    >Counting</span>
                  </template>
                </span>
                <span class="attempt-item__date">{{ formatLocalDisplay(att.date) }}</span>
              </div>
              
              <div class="attempt-item__actions">
                <template v-if="getRetestPolicy(attemptsPopover.assessmentId) === 'manual'">
                  <button 
                    v-if="!att.isPrimary" 
                    class="btn-icon-xs" 
                    title="Set as Primary attempt"
                    @click="doSetPrimary(attemptsPopover.assessmentId, att.attemptId)"
                  >⭐</button>
                </template>
                <button 
                  class="btn-icon-xs text-danger" 
                  title="Delete this attempt"
                  @click="doDeleteAttempt(attemptsPopover.assessmentId, att.attemptId)"
                >🗑️</button>
              </div>
            </div>
            
            <textarea 
              class="attempt-comment-input"
              :value="att.comment || ''"
              placeholder="Add a note..."
              @change="doUpdateComment(attemptsPopover.assessmentId, att.attemptId, $event.target.value)"
            ></textarea>
          </li>
        </ul>
        <div class="context-menu__divider"></div>
        <button class="context-menu__item" @click="startNewAttempt(attemptsPopover.assessmentId)">
          ➕ Log Another Attempt
        </button>
      </div>
    </div>

    <!-- Log Another Attempt Modal Overlay (Safety Portal) -->
    <div v-if="newAttemptForm" class="context-menu-backdrop" style="background: rgba(0,0,0,0.4);" @click="newAttemptForm = null">
      <div class="new-attempt-modal" @click.stop>
        <div class="new-attempt-modal__header">
          <h3>Log Retest / Score Attempt</h3>
          <button class="btn-close" @click="newAttemptForm = null"><X :size="16" /></button>
        </div>
        <div class="new-attempt-modal__body">
          <div class="form-group">
            <label>Points Earned</label>
            <input 
              type="number" 
              v-model.number="newAttemptForm.points" 
              placeholder="Enter points..." 
              required
              class="form-control"
              v-focus
            />
          </div>
          <div class="form-group">
            <label>Attempt Date</label>
            <input 
              type="date" 
              v-model="newAttemptForm.date" 
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label>Internal Note (Optional)</label>
            <textarea 
              v-model="newAttemptForm.comment" 
              placeholder="Comment on student performance, calibration, retest context..."
              class="form-control text-area"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="new-attempt-modal__footer">
          <button class="btn-cancel" @click="newAttemptForm = null">Cancel</button>
          <button class="btn-submit" :disabled="newAttemptForm.points === null" @click="submitNewAttempt">Save Attempt</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import {
  assessments,
  gradeMap,
  activeClassRecord,
  classGrades,
  openAddAssessment,
  deleteAssessment,
  saveStudentGradebookNote,
  clearGrade
} from '../../composables/useGradebook.js'
import { useGradeEditing } from '../../composables/useGradeEditing.js'
import { getGradeColor } from '../../utils/gradeColors.js'
import { formatLocalDisplay } from '../../utils/dates.js'
import { useMessage } from '../../composables/useMessage.js'
import { Plus, Trash2, X, ChevronRight, Calendar, AlertCircle, XCircle } from 'lucide-vue-next'
import DossierCategoryGrid from './DossierCategoryGrid.vue'
import DossierEvidenceMix from './DossierEvidenceMix.vue'


const props = defineProps({
  studentId: { type: String, required: true },
  student: { type: Object, required: true },
  events: { type: Array, default: () => [] }
})

defineEmits(['delete-event'])

const { alert, confirm } = useMessage()

// Local refs for cell editing, context menu, attempts popovers
const {
  editingCell,
  editOriginalValue,
  editInput,
  contextMenu,
  attemptsPopover,
  newAttemptForm,
  startEdit,
  cancelEdit,
  saveEdit,
  openContextMenu: onContextMenu,
  openAttempts,
  openAttemptsFromMenu,
  toggleMissing,
  toggleExcluded,
  startNewAttempt,
  submitNewAttempt,
  setAttemptPrimary: doSetPrimary,
  deleteAttempt: doDeleteAttempt,
  updateComment: doUpdateComment
} = useGradeEditing(computed(() => props.studentId))
const localGradebookNote = ref('')

watch(() => props.student?.gradebookNote, (v) => {
  localGradebookNote.value = v || ''
}, { immediate: true })

// Computeds
const studentGrades = computed(() => classGrades.value?.[props.studentId] || {})

const academicCategories = computed(() => {
  if (!activeClassRecord.value?.gradebookCategories) return []
  const results = studentGrades.value.categoryResults || {}
  const consistent = studentGrades.value.mostConsistent?.categoryBreakdown || {}
  
  return activeClassRecord.value.gradebookCategories.map(cat => ({
    ...cat,
    score: results[cat.categoryId]?.percentage ?? null,
    isOverridden: results[cat.categoryId]?.isOverridden ?? false,
    consistentScore: consistent[cat.categoryId]?.percentage ?? null,
    bucketLabel: consistent[cat.categoryId]?.bucketLabel ?? null,
    count: consistent[cat.categoryId]?.count ?? 0,
    totalCount: consistent[cat.categoryId]?.totalCount ?? 0
  }))
})

const classAssessments = computed(() => {
  return assessments.value
    .filter(a => a.target !== 'individual')
    .map(a => {
      const g = gradeMap.value[a.assessmentId]?.[props.studentId]
      const score = g?.resolvedScore ?? null
      
      const aDate = a.date.split('T')[0]
      const wasAbsent = props.events.some(ev => 
        ev.code === 'a' && 
        !ev.superseded && 
        ev.timestamp.startsWith(aDate)
      )

      return {
        ...a,
        score,
        attempts: g?.attempts || [],
        missing: g?.missing,
        excluded: g?.excluded,
        wasAbsent
      }
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

const individualAssessments = computed(() => {
  return assessments.value
    .filter(a => a.target === 'individual' && String(a.targetStudentId) === String(props.studentId))
    .map(a => {
      const g = gradeMap.value[a.assessmentId]?.[props.studentId]
      const score = g?.resolvedScore ?? null
      
      return {
        ...a,
        score,
        attempts: g?.attempts || [],
        missing: g?.missing,
        excluded: g?.excluded
      }
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

const allDossierAssessments = computed(() => {
  return [...classAssessments.value, ...individualAssessments.value]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
})

const orderedAssessmentsForNav = computed(() => {
  return [...individualAssessments.value, ...classAssessments.value]
})

const evidenceMix = computed(() => {
  const mix = { product: 0, observation: 0, conversation: 0 }
  const valid = allDossierAssessments.value.filter(a => a.score !== null)
  if (!valid.length) return mix
  
  valid.forEach(a => {
    const type = (a.assessmentType || 'product').toLowerCase()
    if (mix[type] !== undefined) mix[type]++
  })
  
  const total = valid.length
  mix.product = Math.round((mix.product / total) * 100)
  mix.observation = Math.round((mix.observation / total) * 100)
  mix.conversation = Math.round((mix.conversation / total) * 100)
  return mix
})



// Focus directive
const vFocus = {
  mounted: (el) => el.focus()
}

// Methods
function getImpactLevel(weight) {
  const w = weight || 1
  if (w >= 10) return { id: 'high', label: 'High' }
  if (w >= 3)  return { id: 'med',  label: 'Med'  }
  return { id: 'low',  label: 'Low'  }
}



async function doDeleteAssessment(assessmentId) {
  const assessment = assessments.value.find(a => a.assessmentId === assessmentId)
  if (!assessment) {
    contextMenu.value = null
    return
  }
  
  const typeLabel = assessment.target === 'individual' ? 'individual assessment' : 'class-wide assessment'
  const warning = assessment.target === 'class' 
    ? '\n\nWARNING: This is a class-wide assessment. Deleting it will remove it for ALL students in this class.'
    : ''
    
  if (!await confirm(`Are you sure you want to delete this ${typeLabel}?${warning}`, 'Delete Assessment', { danger: true })) {
    contextMenu.value = null
    return
  }
  
  await deleteAssessment(assessmentId)
  contextMenu.value = null
}



function getRetestPolicy(assessmentId) {
  const assessment = assessments.value.find(a => a.assessmentId === assessmentId)
  return assessment?.retestPolicy || 'highest'
}

function getAttemptsForPopover() {
  if (!attemptsPopover.value) return []
  const grade = gradeMap.value[attemptsPopover.value.assessmentId]?.[props.studentId]
  return grade?.attempts || []
}

function isCountingAttempt(assessmentId, attempt) {
  const grade = gradeMap.value[assessmentId]?.[props.studentId]
  return grade?.resolvedScore === attempt.pointsEarned
}

async function onArrowKey(direction) {
  if (!editingCell.value) return
  const { assessmentId } = editingCell.value
  await saveEdit()
  
  const combined = orderedAssessmentsForNav.value
  const currentIndex = combined.findIndex(a => a.assessmentId === assessmentId)
  
  if (direction === 'up' && currentIndex > 0) {
    startEdit(combined[currentIndex - 1].assessmentId)
  } else if (direction === 'down' && currentIndex < combined.length - 1) {
    startEdit(combined[currentIndex + 1].assessmentId)
  }
}

function handleCellKey(e) {
  if (e.key === 'Enter') saveEdit()
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    onArrowKey('up')
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    onArrowKey('down')
  }
  if (e.key === 'Escape') cancelEdit()
}

function isIndividualAssessment(assessmentId) {
  const assessment = assessments.value.find(a => a.assessmentId === assessmentId)
  return assessment?.target === 'individual'
}

function hasGradeValue(assessmentId) {
  const g = gradeMap.value[assessmentId]?.[props.studentId]
  return g && (g.resolvedScore !== null || g.missing || g.excluded)
}

async function clearStudentGrade(assessmentId) {
  const grade = gradeMap.value[assessmentId]?.[props.studentId]
  if (grade?.attempts?.length > 1) {
    await alert('Cannot clear: This student has multiple attempts. Use the attempt history menu to manage specific entries.')
    contextMenu.value = null
    return
  }
  await clearGrade(assessmentId, props.studentId)
  contextMenu.value = null
}

async function updateGradebookNoteLocal() {
  const note = localGradebookNote.value.trim()
  if (props.student.gradebookNote !== note) {
    await saveStudentGradebookNote(props.studentId, note)
  }
}
</script>

<style scoped>
.academics-section {
  margin-bottom: 8px;
}

.academics-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.academics-section__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 16px 0;
}

.btn-add-individual {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-individual:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.academics-empty-state {
  padding: 24px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.academics-table-wrapper {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow:      hidden;
}

.academics-table {
  width:           100%;
  border-collapse: collapse;
}

.academics-table th {
  text-align:     left;
  padding:        12px 16px;
  background:     var(--bg-secondary);
  font-size:      0.75rem;
  font-weight:    700;
  color:          var(--text-secondary);
  text-transform: uppercase;
}

.academics-table td {
  padding:       12px 16px;
  border-bottom: 1px solid var(--border);
  font-size:     0.9rem;
}

.th-date, .td-date     { width: 80px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.td-name                 { font-weight: 600; }
.th-type, .td-type       { width: 90px; }
.th-impact, .td-impact   { width: 90px; }
.th-score, .td-score     { width: 115px; }
.td-score                { font-variant-numeric: tabular-nums; white-space: nowrap; }
.th-percent, .td-percent { width: 70px; text-align: right !important; }
.td-percent              { font-weight: 700; }

.badge {
  padding:       2px 8px;
  background:    var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size:     0.75rem;
  font-weight:   600;
  color:         var(--text-secondary);
}

.score-missing {
  display:     flex;
  align-items: center;
  gap:         6px;
}

.badge-red-a {
  display:         flex;
  align-items:     center;
  justify-content: center;
  width:           18px;
  height:          18px;
  background:      #ff3b30;
  color:           #fff;
  font-size:       0.7rem;
  font-weight:     800;
  border-radius:   4px;
  line-height:     1;
}

.text-danger { color: #ff3b30; font-weight: 600; }
.text-muted  { color: var(--text-secondary); font-style: italic; }

.score-cell-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  padding-right: 24px;
}

.cell-edit-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
  background: var(--bg);
  box-shadow: 0 0 0 3px var(--primary-light);
  outline: none;
}

.score-value {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.score-value:hover {
  background: var(--bg-secondary);
}

.attempts-dot {
  width: 10px;
  height: 10px;
  background: #ff3b30;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 0 2px var(--surface);
  flex-shrink: 0;
}

.attempts-dot:hover {
  transform: scale(1.2);
}

.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: transparent;
}

.context-menu, .attempts-popover {
  position: absolute;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: 8px;
  min-width: 180px;
  z-index: 2001;
}

.attempts-popover {
  min-width: 280px;
}

.context-menu__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
}

.context-menu__item:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.context-menu__divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.attempts-popover__header {
  padding: 8px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.attempts-popover__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.attempt-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

.attempt-item__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.attempt-item--primary {
  background: var(--primary-light);
}

.attempt-item__main {
  display: flex;
  flex-direction: column;
}

.attempt-item__score {
  font-weight: 700;
  font-size: 0.9rem;
}

.attempt-item__date {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.attempt-item__actions {
  display: flex;
  gap: 4px;
}

.attempt-comment-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 0.78rem;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 8px;
  resize: vertical;
  min-height: 42px;
  line-height: 1.4;
  transition: border-color 0.15s;
}

.attempt-comment-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

.attempt-comment-input::placeholder {
  color: var(--text-secondary);
  font-style: italic;
}

.cell-indicators {
  display: flex;
  align-items: center;
  gap: 3px;
  position: absolute;
  top: 2px;
  right: 2px;
}

.comment-dot {
  font-size: 0.65rem;
  cursor: pointer;
  line-height: 1;
  opacity: 0.2;
  transition: opacity 0.15s, transform 0.15s;
}

.comment-dot:hover {
  opacity: 0.8;
}

.comment-dot--active {
  opacity: 1;
  font-size: 0.7rem;
}

.student-360__gradebook-note {
  margin-top: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.student-360__notes-area {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-family: inherit;
  color: var(--text);
  background: var(--bg);
  resize: vertical;
  margin-top: 8px;
  box-sizing: border-box;
}

.student-360__notes-area:focus {
  border-color: var(--primary);
  outline: none;
  background: var(--surface);
}

.badge--product { background: var(--primary-light); color: var(--primary); }
.badge--observation { background: #e0f7fa; color: #00838f; }
.badge--conversation { background: #fce4ec; color: #c2185b; }

.impact-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.impact-badge--high { background: #fee2e2; color: #ef4444; }
.impact-badge--med  { background: #ffedd5; color: #f97316; }
.impact-badge--low  { background: #f0fdf4; color: #22c55e; }

.btn-icon-xs {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
}

.btn-icon-xs:hover {
  background: var(--bg-secondary);
}

/* Modal styling for Logging Attempt */
.new-attempt-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 420px;
  z-index: 2100;
  display: flex;
  flex-direction: column;
}

.new-attempt-modal__header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.new-attempt-modal__header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.btn-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
}

.btn-close:hover {
  background: var(--bg-secondary);
}

.new-attempt-modal__body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--bg);
  color: var(--text);
  box-sizing: border-box;
}

.form-control:focus {
  border-color: var(--primary);
  outline: none;
  background: var(--surface);
}

.form-control.text-area {
  resize: vertical;
}

.new-attempt-modal__footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.btn-cancel:hover {
  background: var(--bg-secondary);
}

.btn-submit {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
