<template>
  <div class="academics-tab-content">
    <!-- Elementary Homeroom Subjects Overview -->
    <div v-if="activeClassRecord?.classType === 'elementary' && homeroomSubjects.length > 0" class="elementary-summary-section">
      <h3 class="academics-section__title">Homeroom Subjects Overview</h3>
      <div class="elementary-summary-grid">
        <div 
          v-for="sub in homeroomSubjects" 
          :key="sub.subjectId"
          class="elementary-summary-card"
          :class="{ 'elementary-summary-card--active': sub.subjectId === activeSubjectId }"
          @click="setActiveSubject(sub.subjectId)"
        >
          <div class="elementary-summary-card__top">
            <div class="elementary-summary-card__icon-wrap">
              <SubjectIcon 
                :code="sub.code" 
                :icon="sub.icon" 
                :name="sub.name" 
                :size="18" 
              />
            </div>
            
            <div class="elementary-summary-card__top-badges">
              <!-- Live Student Subject Mastery Badge -->
              <span 
                v-if="getSubjectStudentMastery(sub.subjectId)" 
                class="elementary-summary-card__mastery-badge"
                :style="getSubjectStudentMastery(sub.subjectId).type === 'sbar'
                  ? {
                      background: getSubjectStudentMastery(sub.subjectId).badge.color + '22',
                      color: getSubjectStudentMastery(sub.subjectId).badge.color,
                      borderColor: getSubjectStudentMastery(sub.subjectId).badge.color + '55'
                    }
                  : {
                      background: getSubjectStudentMastery(sub.subjectId).color + '22',
                      color: getSubjectStudentMastery(sub.subjectId).color,
                      borderColor: getSubjectStudentMastery(sub.subjectId).color + '55'
                    }"
              >
                {{ getSubjectStudentMastery(sub.subjectId).type === 'sbar' ? getSubjectStudentMastery(sub.subjectId).badge.level : getSubjectStudentMastery(sub.subjectId).value }}
              </span>
            </div>
          </div>
          <div class="elementary-summary-card__body">
            <div class="elementary-summary-card__name">
              {{ sub.name }}
              <span v-if="getStudentSubjectGradeLevel(sub.subjectId)" class="elementary-summary-card__iep-tag">
                IEP: {{ getStudentSubjectGradeLevel(sub.subjectId) }}
              </span>
            </div>
            <div class="elementary-summary-card__framework">
              {{ sub.gradingFramework === 'sbar' ? 'SBAR (Levels 1–4)' : 'Traditional (%)' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SBAR Mode Layout (Split-View Layout: Evidence & Tasks on Left, SBAR Analytics Rail on Right) -->
    <template v-if="isSBARMode">
      <div class="academics-split-layout">
        <!-- Main Column: Expectation Mastery + Assessment Tasks -->
        <div class="academics-split-main">
          <SBARExpectationMasteryGrid 
            :student-id="props.studentId" 
            @select-assessment="onSelectAssessment" 
          />

          <!-- Master Unified Assessment Table (SBAR) -->
          <div class="academics-section academics-section--table">
            <div class="academics-section__header">
              <h3 class="academics-section__title" style="margin:0;">Assessments &amp; Tasks</h3>
              
              <div class="academics-header-actions">
                <!-- Filter Chips -->
                <div class="assessment-filter-chips">
                  <button 
                    class="chip-btn" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'all' }"
                    @click="activeAssessmentFilter = 'all'"
                  >
                    All ({{ combinedAssessments.length }})
                  </button>

                  <button 
                    class="chip-btn" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'class' }"
                    @click="activeAssessmentFilter = 'class'"
                  >
                    Classwide ({{ classCount }})
                  </button>

                  <button 
                    v-if="individualCount > 0"
                    class="chip-btn chip-btn--purple" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'individual' }"
                    @click="activeAssessmentFilter = 'individual'"
                  >
                    👤 Student Tasks ({{ individualCount }})
                  </button>

                  <button 
                    v-if="missingCount > 0"
                    class="chip-btn chip-btn--danger" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'missing' }"
                    @click="activeAssessmentFilter = 'missing'"
                  >
                    <AlertTriangle :size="12" style="display: inline-block; vertical-align: -1px; margin-right: 2px;" /> Missing ({{ missingCount }})
                  </button>

                  <button 
                    v-if="failingCount > 0"
                    class="chip-btn chip-btn--warning" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'failing' }"
                    @click="activeAssessmentFilter = 'failing'"
                  >
                    <span class="status-dot status-dot--danger" /> Level 1- / R ({{ failingCount }})
                  </button>
                </div>

                <!-- + Add Task Button -->
                <button class="btn-add-individual" @click="openAddAssessment('individual', props.studentId)">
                  <Plus :size="13" /> Add Task
                </button>
              </div>
            </div>

            <div class="academics-table-wrapper">
              <table class="academics-table">
                <thead>
                  <tr>
                    <th class="th-date">Date</th>
                    <th class="th-name">Assessment</th>
                    <th class="th-type">Type</th>
                    <th class="th-score">Level</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in filteredMasterAssessments" :key="a.assessmentId" @contextmenu.prevent="onContextMenu($event, a.assessmentId)">
                    <td class="td-date">{{ formatLocalDisplay(a.date) }}</td>
                    <td class="td-name">
                      <span 
                        class="clickable-sbar-name" 
                        @click="onSelectAssessment(a.assessmentId)"
                        title="Click to open SBAR evaluation matrix"
                      >{{ a.name }}</span>
                      <span v-if="a.target === 'individual' || a.isIndividual" class="badge-student-task" title="Individual student task"><User :size="11" style="display: inline-block; vertical-align: -1px; margin-right: 2px;" /> Student Task</span>
                      <span v-else-if="getImpactLevel(a.weight).id === 'high'" class="badge-high-weight" title="High grade weight item"><Flame :size="11" style="display: inline-block; vertical-align: -1px; margin-right: 2px;" /> High Weight</span>
                    </td>
                    <td class="td-type"><span class="badge" :class="'badge--' + a.assessmentType">{{ a.assessmentType }}</span></td>
                    <td class="td-score">
                      <div class="score-cell-wrapper">
                        <div v-if="a.missing" class="score-missing" @click="onSelectAssessment(a.assessmentId)">
                          <span class="text-danger">Missing</span>
                          <span v-if="a.wasAbsent" class="badge-red-a" title="Absent on this date">A</span>
                        </div>
                        <span v-else-if="a.excluded" class="text-muted" @click="onSelectAssessment(a.assessmentId)">EX</span>
                        <span v-else class="score-value" @click="onSelectAssessment(a.assessmentId)">
                          <span 
                            v-if="a.score !== null" 
                            class="sbar-level-badge sbar-level-badge--clickable" 
                            :style="{ background: getSBARLevelBadge(a.score).color, color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }"
                            title="Click to open SBAR evaluation matrix"
                          >
                            {{ getSBARLevelBadge(a.score).level }}
                          </span>
                          <span v-else class="text-muted" style="cursor: pointer;" title="Click to open SBAR evaluation matrix">—</span>
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
                          ><NotebookPen :size="12" /></span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Rail Column: SBAR Mastery Breakdown & Triangulation -->
        <aside class="academics-split-rail">
          <DossierSBARMasteryBreakdown :student-id="props.studentId" />
          <DossierEvidenceMix :mix="evidenceMix" />
        </aside>
      </div>
    </template>

    <!-- Traditional / Percentage Mode (Split-View Layout: Table on Left, Analytics Rail on Right) -->
    <template v-else>
      <div class="academics-split-layout">
        <!-- Main Column: Assessment Table -->
        <div class="academics-split-main">
          <div class="academics-section academics-section--table">
            <div class="academics-section__header">
              <h3 class="academics-section__title" style="margin:0;">Assessments &amp; Tasks</h3>
              
              <div class="academics-header-actions">
                <!-- Filter Chips -->
                <div class="assessment-filter-chips">
                  <button 
                    class="chip-btn" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'all' }"
                    @click="activeAssessmentFilter = 'all'"
                  >
                    All ({{ combinedAssessments.length }})
                  </button>

                  <button 
                    class="chip-btn" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'class' }"
                    @click="activeAssessmentFilter = 'class'"
                  >
                    Classwide ({{ classCount }})
                  </button>

                  <button 
                    v-if="individualCount > 0"
                    class="chip-btn chip-btn--purple" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'individual' }"
                    @click="activeAssessmentFilter = 'individual'"
                  >
                    👤 Student Tasks ({{ individualCount }})
                  </button>

                  <button 
                    v-if="missingCount > 0"
                    class="chip-btn chip-btn--danger" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'missing' }"
                    @click="activeAssessmentFilter = 'missing'"
                  >
                    <AlertTriangle :size="12" style="display: inline-block; vertical-align: -1px; margin-right: 2px;" /> Missing ({{ missingCount }})
                  </button>

                  <button 
                    v-if="failingCount > 0"
                    class="chip-btn chip-btn--warning" 
                    :class="{ 'chip-btn--active': activeAssessmentFilter === 'failing' }"
                    @click="activeAssessmentFilter = 'failing'"
                  >
                    <span class="status-dot status-dot--danger" /> &lt;50% ({{ failingCount }})
                  </button>
                </div>

                <!-- + Add Task Button -->
                <button class="btn-add-individual" @click="openAddAssessment('individual', props.studentId)">
                  <Plus :size="13" /> Add Task
                </button>
              </div>
            </div>

            <div class="academics-table-wrapper">
              <table class="academics-table">
                <thead>
                  <tr>
                    <th class="th-date">Date</th>
                    <th class="th-name">Assessment</th>
                    <th class="th-type">Type</th>
                    <th class="th-score">Points</th>
                    <th class="th-percent">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in filteredMasterAssessments" :key="a.assessmentId" @contextmenu.prevent="onContextMenu($event, a.assessmentId)">
                    <td class="td-date">{{ formatLocalDisplay(a.date) }}</td>
                    <td class="td-name">
                      <span 
                        :class="{ 'clickable-sbar-name': isSBARTask(a) }" 
                        @click="isSBARTask(a) && onSelectAssessment(a.assessmentId)"
                        :title="isSBARTask(a) ? 'Click to open SBAR evaluation matrix' : ''"
                      >{{ a.name }}</span>
                      <span v-if="a.target === 'individual' || a.isIndividual" class="badge-student-task" title="Individual student task"><User :size="11" style="display: inline-block; vertical-align: -1px; margin-right: 2px;" /> Student Task</span>
                      <span v-else-if="getImpactLevel(a.weight).id === 'high'" class="badge-high-weight" title="High grade weight item"><Flame :size="11" style="display: inline-block; vertical-align: -1px; margin-right: 2px;" /> High Weight</span>
                    </td>
                    <td class="td-type"><span class="badge" :class="'badge--' + a.assessmentType">{{ a.assessmentType }}</span></td>
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
                          <div v-if="a.missing" class="score-missing" @click="isSBARTask(a) ? onSelectAssessment(a.assessmentId) : startEdit(a.assessmentId)">
                            <span class="text-danger">Missing</span>
                            <span v-if="a.wasAbsent" class="badge-red-a" title="Absent on this date">A</span>
                          </div>
                          <span v-else-if="a.excluded" class="text-muted" @click="isSBARTask(a) ? onSelectAssessment(a.assessmentId) : startEdit(a.assessmentId)">EX</span>
                          <span v-else class="score-value" @click="isSBARTask(a) ? onSelectAssessment(a.assessmentId) : startEdit(a.assessmentId)">
                            {{ a.score !== null ? a.score : '—' }} / {{ a.totalPoints }}
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
                            ><NotebookPen :size="12" /></span>
                          </div>
                        </template>
                      </div>
                    </td>
                    <td class="td-percent" :style="{ color: getGradeColor(a.score !== null ? (isSBARTask(a) ? a.score : (a.score / (a.totalPoints || 1)) * 100) : null) }">
                      {{ a.score !== null ? (isSBARTask(a) ? Math.round(a.score) + '%' : Math.round((a.score / (a.totalPoints || 1)) * 100) + '%') : 'N/A' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Rail Column: Category Performance & Triangulation -->
        <aside class="academics-split-rail">
          <DossierCategoryGrid :categories="academicCategories" :student-id="props.studentId" />
          <DossierEvidenceMix :mix="evidenceMix" />
        </aside>
      </div>
    </template>

    <!-- Compact Internal Gradebook Notes Card (Full Width) -->
    <div class="student-360__gradebook-note-card">
      <h3 class="academics-section__title" style="margin:0;">Internal Gradebook Notes</h3>
      <textarea 
        class="student-360__notes-area"
        v-model="localGradebookNote"
        placeholder="Add private observations about this student's grading context..."
        rows="2"
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
          <NotebookPen :size="14" /> View Notes
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
                ><Trash2 :size="13" /></button>
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
  getAssessmentUsage,
  saveStudentGradebookNote,
  clearGrade,
  initialDossierTab,
  setActiveSubject,
  isAssessmentInSubCohort
} from '../../composables/useGradebook.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { useClassroom } from '../../composables/useClassroom.js'
import { useGradeEditing } from '../../composables/useGradeEditing.js'
import { getGradeColor } from '../../utils/gradeColors.js'
import { formatLocalDisplay } from '../../utils/dates.js'
import { useMessage } from '../../composables/useMessage.js'
import { getSBARLevelBadge } from '../../db/gradebook/gradeCalcSBAR.js'
import { getEffectiveClassRecord, getStudentEffectiveGrade } from '../../composables/useElementary.js'
import { calculateSBARExpectationMastery } from '../../db/gradebookService.js'
import { Plus, Trash2, X, ChevronRight, Calendar, AlertCircle, AlertTriangle, XCircle, NotebookPen, Flame, User } from 'lucide-vue-next'
import SubjectIcon from '../SubjectIcon.vue'
import DossierCategoryGrid from './DossierCategoryGrid.vue'
import DossierEvidenceMix from './DossierEvidenceMix.vue'
import SBARExpectationMasteryGrid from './SBARExpectationMasteryGrid.vue'
import DossierSBARMasteryBreakdown from './DossierSBARMasteryBreakdown.vue'

const homeroomSubjects = computed(() => {
  if (!activeClassRecord.value || activeClassRecord.value.classType !== 'elementary') return []
  const cls = activeClassRecord.value
  return cls.subjects && cls.subjects.length > 0 ? cls.subjects : []
})

function getStudentSubjectGradeLevel(subjectId) {
  if (!activeClassRecord.value || !props.studentId) return null
  const student = activeClassRecord.value.students?.[props.studentId]
  if (!student?.accommodations?.modifiedSubjectGrades?.[subjectId]) return null
  return student.accommodations.modifiedSubjectGrades[subjectId]
}

function getSubjectStudentMastery(subjectId) {
  if (!activeClassRecord.value || !props.studentId) return null
  const effClass = getEffectiveClassRecord(activeClassRecord.value, subjectId)
  if (!effClass) return null

  // Collect unit IDs and expectation codes/IDs belonging to THIS subject
  const subjectUnitIds = new Set((effClass.gradebookUnits || []).map(u => String(u.unitId)))
  const subjectExpCodes = new Set()
  if (effClass.gradebookUnits) {
    effClass.gradebookUnits.forEach(u => {
      (u.expectations || []).forEach(e => {
        if (e.code) subjectExpCodes.add(e.code)
        if (e.expectationId) subjectExpCodes.add(e.expectationId)
      })
    })
  }

  const subAssessments = (assessments.value || []).filter(a => {
    if (!isAssessmentInSubCohort(a, studentSubCohort.value)) return false
    if (a.subjectId) return a.subjectId === subjectId

    if (a.unitId && subjectUnitIds.has(String(a.unitId))) return true

    const expIds = a.expectationIds || (a.expectationId ? [a.expectationId] : [])
    if (expIds.length > 0) {
      return expIds.some(code => subjectExpCodes.has(code))
    }

    return false
  })

  if (subAssessments.length === 0) return null

  if (effClass.gradingFramework === 'sbar') {
    const algo = effClass.sbarAlgorithm || 'decaying_average'
    const masteryMap = calculateSBARExpectationMastery(effClass, subAssessments, gradeMap.value, algo)
    const studentMap = masteryMap[props.studentId]
    if (!studentMap) return null
    
    const validScores = Object.values(studentMap)
      .map(m => m?.score)
      .filter(s => s !== null && s !== undefined && !isNaN(Number(s)) && isFinite(Number(s)))
      .map(Number)
    
    if (validScores.length === 0) return null
    const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length
    return {
      type: 'sbar',
      badge: getSBARLevelBadge(avg)
    }
  } else {
    const studentGradeObj = classGrades.value?.[props.studentId]
    if (subjectId === activeSubjectId.value && studentGradeObj?.overallGrade !== undefined && studentGradeObj?.overallGrade !== null) {
      return {
        type: 'percent',
        value: `${Math.round(studentGradeObj.overallGrade)}%`,
        color: getGradeColor(studentGradeObj.overallGrade)
      }
    }
  }
  return null
}

const isSBARMode = computed(() => activeClassRecord.value?.gradingFramework === 'sbar')


function isSBARTask(a) {
  return isSBARMode.value
}

function onSelectAssessment(astId) {
  initialDossierTab.value = 'academics'
  emit('select-assessment', astId)
}


const props = defineProps({
  studentId: { type: String, required: true },
  student: { type: Object, required: true },
  events: { type: Array, default: () => [] }
})

const emit = defineEmits(['delete-event', 'select-assessment'])

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
  if (activeClassRecord.value?.gradingFramework === 'sbar') {
    if (!activeClassRecord.value?.sbarWeighting?.enabled) return []
    const breakdown = studentGrades.value?.sbarBreakdown
    if (!breakdown) return []
    const list = [
      {
        categoryId: 'sbar_term',
        name: 'Coursework (Expectations)',
        weight: breakdown.termWeight,
        score: breakdown.sbarMasteryPct
      }
    ]
    Object.entries(breakdown.components || {}).forEach(([cId, c]) => {
      list.push({
        categoryId: cId,
        name: c.name,
        weight: c.weight,
        score: c.percentage
      })
    })
    return list
  }

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

const studentSubCohort = computed(() => {
  const isElem = activeClassRecord.value?.classType === 'elementary'
  return isElem 
    ? (getStudentEffectiveGrade(props.student, activeSubjectId.value) || props.student?.gradeLevel)
    : props.student?.courseCode
})

const classAssessments = computed(() => {
  const isSBAR = activeClassRecord.value?.gradingFramework === 'sbar'
  return assessments.value
    .filter(a => {
      if (a.target === 'individual') return false
      if (!isAssessmentInSubCohort(a, studentSubCohort.value)) return false
      const isSBARTask = a.categoryId === 'sbar_general' || (a.expectationIds && a.expectationIds.length > 0) || a.expectationId != null || a.isSbar || a.gradingFramework === 'sbar'
      if (isSBAR) {
        return isSBARTask || a.isNumericComponent || a.categoryId === 'sbar_final_component'
      } else {
        return !isSBARTask
      }
    })
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

const activeAssessmentFilter = ref('all')

const combinedAssessments = computed(() => {
  const cList = classAssessments.value || []
  const iList = (individualAssessments.value || []).map(item => ({ ...item, isIndividual: true }))
  return [...cList, ...iList].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

const classCount = computed(() => classAssessments.value.length)
const individualCount = computed(() => individualAssessments.value.length)
const missingCount = computed(() => combinedAssessments.value.filter(a => a.missing).length)

const failingCount = computed(() => combinedAssessments.value.filter(a => {
  if (a.missing || a.excluded || a.score === null) return false
  const total = a.scaledTotal || a.totalPoints || 100
  return (a.score / total) < 0.5
}).length)

const filteredMasterAssessments = computed(() => {
  const list = combinedAssessments.value || []
  if (activeAssessmentFilter.value === 'class') {
    return list.filter(a => !a.isIndividual && a.target !== 'individual')
  }
  if (activeAssessmentFilter.value === 'individual') {
    return list.filter(a => a.isIndividual || a.target === 'individual')
  }
  if (activeAssessmentFilter.value === 'missing') {
    return list.filter(a => a.missing)
  }
  if (activeAssessmentFilter.value === 'failing') {
    return list.filter(a => {
      if (a.missing || a.excluded || a.score === null) return false
      const total = a.scaledTotal || a.totalPoints || 100
      return (a.score / total) < 0.5
    })
  }
  return list
})

const individualAssessments = computed(() => {
  const isSBAR = activeClassRecord.value?.gradingFramework === 'sbar'
  return assessments.value
    .filter(a => {
      if (a.target !== 'individual' || String(a.targetStudentId) !== String(props.studentId)) return false
      const isSBARTask = a.categoryId === 'sbar_general' || (a.expectationIds && a.expectationIds.length > 0) || a.expectationId != null || a.isSbar || a.gradingFramework === 'sbar'
      return isSBAR ? isSBARTask : !isSBARTask
    })
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
  const usage = await getAssessmentUsage(assessmentId)
  const countWarning = usage.studentCount > 0
    ? `\n\nWarning: This assessment has marks recorded for ${usage.studentCount} student(s) (${usage.attemptCount || usage.markCount || usage.studentCount} score entries). Deleting it will permanently erase all these records.`
    : '\n\nNo student marks are recorded for this assessment.'

  const warning = assessment.target === 'class' 
    ? '\n\nWARNING: This is a class-wide assessment. Deleting it will remove it for ALL students in this class.'
    : ''
    
  if (!await confirm(`Are you sure you want to delete this ${typeLabel} "${assessment.name}"?${countWarning}${warning}\n\nThis cannot be undone.`, 'Delete Assessment', { danger: true })) {
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
  margin-bottom: 6px;
}

.academics-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.academics-section__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.btn-add-individual {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-individual:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.academics-empty-state {
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.academics-table-wrapper {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  overflow:      hidden;
}

.academics-table {
  width:           100%;
  border-collapse: collapse;
}

.academics-table th {
  text-align:     left;
  padding:        8px 12px;
  background:     var(--bg-secondary);
  font-size:      0.7rem;
  font-weight:    700;
  color:          var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.academics-table td {
  padding:       8px 12px;
  border-bottom: 1px solid var(--border);
  font-size:     0.85rem;
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

/* ── Split Layout: Table on Left, Sticky Analytics Rail on Right ── */
.academics-split-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 14px;
  align-items: start;
  width: 100%;
}

.academics-split-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.academics-split-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  position: sticky;
  top: 0;
}

@media (max-width: 1080px) {
  .academics-split-layout {
    grid-template-columns: 1fr;
  }
  .academics-split-rail {
    position: static;
  }
}

.badge-high-weight {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  margin-left: 6px;
  vertical-align: middle;
}

.badge-student-task {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(147, 51, 234, 0.1);
  color: #9333ea;
  margin-left: 6px;
  vertical-align: middle;
}

.academics-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assessment-filter-chips {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.chip-btn {
  padding: 3px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.chip-btn--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.chip-btn--purple.chip-btn--active {
  background: #9333ea;
  border-color: #9333ea;
}

.chip-btn--danger.chip-btn--active {
  background: #ef4444;
  border-color: #ef4444;
}

.chip-btn--warning.chip-btn--active {
  background: #f59e0b;
  border-color: #f59e0b;
}

.student-360__gradebook-note-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

/* Elementary Homeroom Summary Section */
.elementary-summary-section {
  margin-bottom: 20px;
}

.elementary-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.elementary-summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.elementary-summary-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.elementary-summary-card--active {
  border-color: var(--primary);
  background: var(--primary-light, rgba(99, 102, 241, 0.08));
  box-shadow: 0 0 0 1px var(--primary), var(--shadow-sm);
}

.elementary-summary-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.elementary-summary-card__icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.elementary-summary-card--active .elementary-summary-card__icon-wrap {
  background: var(--primary);
  color: white;
}

.elementary-summary-card__top-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.elementary-summary-card__mastery-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 800;
  border: 1px solid transparent;
}

.elementary-summary-card__badge {
  background: var(--primary);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.elementary-summary-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.elementary-summary-card__name {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text);
}

.elementary-summary-card__framework {
  font-size: 0.76rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.elementary-summary-card__iep-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  background: rgba(59, 130, 246, 0.15);
  color: var(--primary);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 10px;
  font-size: 0.68rem;
  font-weight: 700;
  vertical-align: middle;
}
</style>

