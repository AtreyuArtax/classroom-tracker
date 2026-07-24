<template>
  <div class="grades__assessment-view">
    <!-- Assessment View Header (Full Width) -->
    <div class="grades__view-header">
      <div class="grades__view-header-top">
        <nav class="grades__breadcrumb">
          <button class="grades__breadcrumb-link" @click="$emit('close')">
            <ArrowLeft :size="14" /> Class Grid
          </button>
          <span class="grades__breadcrumb-sep">/</span>
          <span class="grades__breadcrumb-current">Assessment Details</span>
        </nav>
      </div>

      <header class="assessment-header">
        <div class="assessment-header__identity">
          <div class="assessment-header__icon">
            <FilePlus :size="24" />
          </div>
          <div class="assessment-header__info">
            <h1 class="assessment-header__name">{{ currentAssessment.name }}</h1>
            <div class="assessment-header__status-badges">
              <span class="assessment-header__badge assessment-header__badge--type">
                {{ currentAssessment.assessmentType }}
              </span>
              <span class="assessment-header__badge assessment-header__badge--points">
                <Target :size="12" /> /{{ currentAssessment.totalPoints }}
              </span>
              <span v-if="currentAssessment.unitId" class="assessment-header__badge assessment-header__badge--unit">
                <Hash :size="12" /> {{ getUnitName(currentAssessment.unitId) }}
              </span>
              <span class="assessment-header__badge assessment-header__badge--date">
                <Calendar :size="12" /> {{ formatLocalDisplay(currentAssessment.date) }}
              </span>
            </div>
          </div>
        </div>

        <div class="assessment-header__right">
          <div v-if="currentAssessmentSummary" class="assessment-header__metrics">
            <div class="assessment-header__metric">
              <span class="assessment-header__metric-label">Class Average</span>
              <span class="assessment-header__metric-value" :style="{ color: getHeatTextColor(currentAssessmentSummary.mean) }">
                {{ Math.round(currentAssessmentSummary.mean) }}%
              </span>
              <span v-if="currentAssessmentSummary.average !== null" class="assessment-header__metric-subvalue">
                {{ Math.round(currentAssessmentSummary.average * 10) / 10 }} <small>/{{ currentAssessment.totalPoints }}</small>
              </span>
            </div>
            
            <div class="assessment-header__metric assessment-header__metric--secondary">
              <span class="assessment-header__metric-label">Entry Progress</span>
              <span class="assessment-header__metric-value">
                {{ currentAssessmentSummary.enteredCount }}<small>/{{ currentAssessmentSummary.totalStudents }}</small>
              </span>
              <div class="assessment-header__mini-progress">
                <div class="assessment-header__mini-progress-fill" :style="{ width: (currentAssessmentSummary.enteredCount / currentAssessmentSummary.totalStudents * 100) + '%' }"></div>
              </div>
            </div>
          </div>
          
          <div class="assessment-header__actions">
            <button class="grades__btn-action" title="Edit Assessment" @click="$emit('start-edit', currentAssessment)">
              <Edit2 :size="18" />
            </button>
            <button class="grades__btn-action" title="View Missing Students" @click="$emit('show-missing-modal')">
              <UserMinus :size="18" />
            </button>
            <button class="grades__btn-action grades__btn-action--danger" title="Delete Assessment" @click="$emit('confirm-delete', currentAssessment)">
              <Trash2 :size="18" />
            </button>
            <div class="assessment-header__divider"></div>
            <button class="grades__close-btn" @click="$emit('close')" title="Close Assessment View">
              <X :size="18" />
            </button>
          </div>
        </div>
      </header>

      <!-- Description & At-Risk Strip -->
      <div v-if="currentAssessment.description || (currentAssessmentSummary && excludedStudentsCount > 0)" class="assessment-header__sub-bar">
        <p v-if="currentAssessment.description" class="assessment-header__description">{{ currentAssessment.description }}</p>
        <div v-if="currentAssessmentSummary && excludedStudentsCount > 0" class="assessment-header__at-risk">
          <AlertTriangle :size="14" />
          <span>{{ excludedStudentsCount }} student{{ excludedStudentsCount === 1 ? ' is' : 's are' }} marked for exclusion.</span>
        </div>
      </div>
    </div>

    <div class="grades__focused-view">
      <!-- Student List for Assessment (Table) -->
      <div class="grades__table-card">
        <div class="grades__table-scroll-area">
          <table class="grades__assessment-table">
            <thead>
              <tr>
                <th class="grades__ath-student">Student</th>
                <th class="grades__ath-score">Score</th>
                <th class="grades__ath-percent">%</th>
                <th class="grades__ath-status">Status</th>
                <th class="grades__ath-actions"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sortedRoster" :key="s.studentId" class="grades__atr-student">
                <td class="grades__atd-student">
                  <div class="grades__row-indicator"></div>
                  <span 
                    class="grades__student-link" 
                    @click="$emit('show-dossier', s.studentId)"
                  >
                    {{ s.lastName }}, {{ s.firstName }}
                  </span>
                </td>
                <td class="grades__atd-score">
                  <div v-if="newAttemptForm?.studentId === s.studentId" class="grades__new-attempt-inline">
                    <div class="grades__attempt-form-row">
                      <input 
                        v-model.number="newAttemptForm.points" 
                        type="number" 
                        min="0" 
                        class="grades__input-ghost grades__input-ghost--score"
                        placeholder="Score"
                      />
                      <input 
                        v-model="newAttemptForm.date" 
                        type="date" 
                        class="grades__input-ghost grades__input-ghost--date"
                      />
                      <input 
                        v-model="newAttemptForm.comment" 
                        class="grades__input-ghost grades__input-ghost--note"
                        placeholder="Note"
                      />
                      <div class="grades__inline-actions">
                        <button class="grades__icon-btn grades__icon-btn--success" @click="$emit('save-new-attempt')">
                          <Check :size="16" />
                        </button>
                        <button class="grades__icon-btn" @click="$emit('cancel-new-attempt')">
                          <X :size="16" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.missing" class="grades__cell-missing-badge">MISSING</div>
                  <div v-else-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.excluded" class="grades__cell-excluded-badge">EXCLUDED</div>
                  <div v-else class="grades__score-input-wrapper">
                    <!-- Change Overlay -->
                    <div v-if="editingCell?.sId === s.studentId && editingCell?.aId === selectedAssessmentId" class="grades__cell-edit">
                      <input 
                        v-model.number="editingCell.value"
                        type="number"
                        min="0"
                        :max="currentAssessment.totalPoints"
                        class="grades__input-ghost grades__input-ghost--active"
                        @blur="$emit('save-edit')"
                        @keydown.enter.prevent="$emit('save-edit')"
                        @keydown.esc.prevent="$emit('cancel-edit')"
                      />
                    </div>
                    <template v-else>
                      <input 
                        type="number"
                        min="0"
                        :max="currentAssessment.totalPoints"
                        class="grades__input-ghost"
                        :value="gradeMap[selectedAssessmentId]?.[s.studentId]?.resolvedScore"
                        @blur="e => $emit('on-blur', s.studentId, e.target.value)"
                        @keydown.enter.prevent="e => $emit('on-enter', s.studentId, 'down', e)"
                        @keydown.tab.prevent="e => $emit('on-enter', s.studentId, 'down', e)"
                        @keydown.up.prevent="e => $emit('on-enter', s.studentId, 'up', e)"
                        @keydown.down.prevent="e => $emit('on-enter', s.studentId, 'down', e)"
                        @contextmenu.prevent="e => $emit('open-context-menu', e, s.studentId, selectedAssessmentId)"
                      />
                      <div class="grades__cell-indicators" v-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.attempts?.length >= 1">
                        <div 
                          v-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.attempts?.length > 1"
                          class="grades__attempts-dot"
                          @click.stop="$emit('open-attempts', $event, s.studentId, selectedAssessmentId)"
                          title="Multiple attempts - click to view history"
                        ></div>
                        <span
                          class="grades__comment-dot"
                          :class="{ 'grades__comment-dot--active': gradeMap[selectedAssessmentId]?.[s.studentId]?.attempts?.some(x => x.comment?.trim()) }"
                          @click.stop="$emit('open-attempts', $event, s.studentId, selectedAssessmentId)"
                          :title="gradeMap[selectedAssessmentId]?.[s.studentId]?.attempts?.some(x => x.comment?.trim()) ? 'Has note — click to edit' : 'Add a note'"
                        >📝</span>
                      </div>
                    </template>
                  </div>
                </td>
                <td class="grades__atd-percent">
                  <span v-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.resolvedScore != null" class="grades__percent-pill">
                    {{ Math.round((gradeMap[selectedAssessmentId]?.[s.studentId]?.resolvedScore / currentAssessment.totalPoints) * 1000) / 10 }}%
                  </span>
                </td>
                <td class="grades__atd-status">
                  <span :class="['grades__status-badge', 'grades__status-badge--' + getStudentStatus(s.studentId).class]">
                    {{ getStudentStatus(s.studentId).label }}
                  </span>
                </td>
                <td class="grades__atd-actions">
                  <button class="grades__icon-btn" @click="$emit('open-action-menu', $event, s.studentId)">
                    <MoreVertical :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  ArrowLeft, FilePlus, Target, Hash, Calendar, Edit2, UserMinus, Trash2, X, AlertTriangle, Check, MoreVertical 
} from 'lucide-vue-next'
import { getHeatTextColor } from '../../utils/gradeColors.js'
import { formatLocalDisplay } from '../../utils/dates.js'

const props = defineProps({
  currentAssessment: { type: Object, required: true },
  currentAssessmentSummary: { type: Object, default: null },
  sortedRoster: { type: Array, default: () => [] },
  gradeMap: { type: Object, default: () => ({}) },
  editingCell: { type: Object, default: null },
  newAttemptForm: { type: Object, default: null },
  selectedAssessmentId: { type: [String, Number], required: true },
  excludedStudentsCount: { type: Number, default: 0 },
  activeClassRecord: { type: Object, default: null }
})

defineEmits([
  'close',
  'start-edit',
  'show-missing-modal',
  'confirm-delete',
  'show-dossier',
  'save-new-attempt',
  'cancel-new-attempt',
  'save-edit',
  'cancel-edit',
  'on-blur',
  'on-enter',
  'open-attempts',
  'open-context-menu',
  'open-action-menu'
])

function getUnitName(unitId) {
  return props.activeClassRecord?.gradebookUnits?.find(u => u.unitId === unitId)?.name ?? '—'
}

function getStudentStatus(studentId) {
  const g = props.gradeMap[props.selectedAssessmentId]?.[studentId]
  if (!g) return { label: 'Not Graded', class: 'empty' }
  if (g.excluded) return { label: 'Excluded', class: 'excluded' }
  if (g.missing) return { label: 'Missing', class: 'missing' }
  if (g.resolvedScore !== null) return { label: 'Graded', class: 'graded' }
  return { label: 'Not Graded', class: 'empty' }
}
</script>

<style scoped>
.grades__assessment-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.grades__view-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
}

.grades__view-header-top {
  margin-bottom: 12px;
}

.grades__breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.grades__breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
}

.grades__breadcrumb-sep {
  color: var(--text-secondary);
}

.grades__breadcrumb-current {
  color: var(--text-secondary);
}

.assessment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assessment-header__identity {
  display: flex;
  align-items: center;
  gap: 16px;
}

.assessment-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--bg-secondary);
  color: var(--primary);
  border-radius: var(--radius-md);
}

.assessment-header__name {
  margin: 0 0 6px 0;
  font-size: 1.3rem;
  font-weight: 700;
}

.assessment-header__status-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assessment-header__badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.assessment-header__right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.assessment-header__metrics {
  display: flex;
  gap: 16px;
}

.assessment-header__metric {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.assessment-header__metric-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.assessment-header__metric-value {
  font-size: 1.2rem;
  font-weight: 800;
}

.assessment-header__metric-subvalue {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.assessment-header__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grades__btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.grades__btn-action:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.grades__btn-action--danger:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.grades__close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
}

.assessment-header__sub-bar {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assessment-header__description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.assessment-header__at-risk {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--warning);
}

.grades__focused-view {
  flex: 1;
  padding: 24px;
  overflow: auto;
}

.grades__table-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.grades__table-scroll-area {
  overflow-x: auto;
}

.grades__assessment-table {
  width: 100%;
  border-collapse: collapse;
}

.grades__assessment-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.grades__assessment-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.grades__student-link {
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
}

.grades__student-link:hover {
  color: var(--primary);
  text-decoration: underline;
}

.grades__input-ghost {
  width: 90px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  font-weight: 700;
}

.grades__cell-missing-badge {
  color: var(--danger);
  font-weight: 800;
  font-size: 0.8rem;
}

.grades__cell-excluded-badge {
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.8rem;
}

.grades__percent-pill {
  padding: 4px 8px;
  border-radius: 12px;
  background: var(--bg-secondary);
  font-weight: 700;
  font-size: 0.8rem;
}

.grades__status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.grades__status-badge--graded {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.grades__status-badge--missing {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.grades__status-badge--excluded {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.grades__status-badge--empty {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.grades__icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
}
</style>
