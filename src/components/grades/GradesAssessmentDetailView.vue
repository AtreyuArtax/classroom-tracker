<template>
  <div class="grades__assessment-view">
    <!-- Compact Top Header Row -->
    <div class="compact-header-card" :style="{ borderLeft: '4px solid ' + unitColor }">
      <div class="compact-header-left">
        <button class="grades__breadcrumb-link" @click="$emit('close')" title="Return to Previous View">
          <ArrowLeft :size="14" /> {{ returnTab === 'analytics' ? 'Analytics View' : 'Class Grid' }}
        </button>
        <span class="grades__breadcrumb-sep">/</span>
        <h1 class="compact-title">{{ currentAssessment.name }}</h1>
        <div class="compact-meta-chips">
          <span class="meta-chip meta-chip--type">{{ currentAssessment.assessmentType }}</span>
          <span class="meta-chip meta-chip--points"><Target :size="11" /> /{{ currentAssessment.totalPoints }}</span>
          <span v-if="currentAssessment.unitId" class="meta-chip meta-chip--unit" :style="{ color: unitColor }">
            <Hash :size="11" /> {{ getUnitName(currentAssessment.unitId) }}
          </span>
          <span class="meta-chip meta-chip--date"><Calendar :size="11" /> {{ formatLocalDisplay(currentAssessment.date) }}</span>
          <span v-if="currentAssessment.weight" class="meta-chip meta-chip--weight">🔥 {{ currentAssessment.weight }}%</span>
        </div>
      </div>

      <!-- Action Buttons Top Right -->
      <div class="assessment-header__actions">
        <button class="btn-secondary-sm" title="Edit Assessment Setup" @click="$emit('start-edit', currentAssessment)">
          <Edit2 :size="13" /> Edit Setup
        </button>
        <button class="btn-secondary-sm" title="View Missing Students" @click="$emit('show-missing-modal')">
          <UserMinus :size="13" /> Missing
        </button>
        <button class="btn-danger-sm" title="Delete Assessment" @click="$emit('confirm-delete', currentAssessment)">
          <Trash2 :size="13" />
        </button>
      </div>
    </div>

    <!-- Compact 1-Row Metrics & Distribution Strip -->
    <div class="compact-metrics-strip">
      <div class="metric-pill">
        <span class="metric-pill__label">CLASS AVG</span>
        <strong class="metric-pill__val" :style="{ color: getHeatTextColor(liveAssessmentStats.mean) }">
          {{ liveAssessmentStats.mean != null ? liveAssessmentStats.mean + '%' : '—' }}
        </strong>
        <span v-if="liveAssessmentStats.average != null" class="metric-pill__sub">({{ liveAssessmentStats.average }}/{{ currentAssessment.totalPoints }} pts)</span>
      </div>

      <div class="metric-divider"></div>

      <div class="metric-pill">
        <span class="metric-pill__label">PROGRESS</span>
        <strong class="metric-pill__val">{{ currentAssessmentSummary?.enteredCount || levelBreakdown.graded }}/{{ currentAssessmentSummary?.totalStudents || sortedRoster.length }}</strong>
      </div>

      <div class="metric-divider"></div>

      <div class="metric-pill" v-if="liveAssessmentStats.median != null">
        <span class="metric-pill__label">MEDIAN</span>
        <strong class="metric-pill__val">{{ liveAssessmentStats.median }}%</strong>
        <span class="metric-pill__sub">(High: {{ liveAssessmentStats.highest }}% · Low: {{ liveAssessmentStats.lowest }}%)</span>
      </div>

      <div class="metric-divider" v-if="levelBreakdown.graded > 0"></div>

      <!-- Self-Contained Mini Stacked Bar Pill -->
      <div class="mini-stacked-bar-container" v-if="levelBreakdown.graded > 0">
        <span class="mini-bar-label">TIERS:</span>
        <div class="mini-stacked-bar" title="Click segment to filter table by performance level">
          <div 
            v-if="levelBreakdown.level4 > 0"
            class="mini-bar-segment mini-bar-segment--l4" 
            :style="{ flex: levelBreakdown.level4 }" 
            :class="{ 'mini-bar-segment--active': activeFilter === 'l4' }"
            :title="'Level 4 (80%+): ' + levelBreakdown.level4 + ' students'"
            @click="activeFilter = activeFilter === 'l4' ? 'all' : 'l4'"
          >
            <span>{{ levelBreakdown.level4 }}</span>
          </div>
          <div 
            v-if="levelBreakdown.level3 > 0"
            class="mini-bar-segment mini-bar-segment--l3" 
            :style="{ flex: levelBreakdown.level3 }" 
            :class="{ 'mini-bar-segment--active': activeFilter === 'l3' }"
            :title="'Level 3 (70-79%): ' + levelBreakdown.level3 + ' students'"
            @click="activeFilter = activeFilter === 'l3' ? 'all' : 'l3'"
          >
            <span>{{ levelBreakdown.level3 }}</span>
          </div>
          <div 
            v-if="levelBreakdown.level2 > 0"
            class="mini-bar-segment mini-bar-segment--l2" 
            :style="{ flex: levelBreakdown.level2 }" 
            :class="{ 'mini-bar-segment--active': activeFilter === 'l2' }"
            :title="'Level 2 (60-69%): ' + levelBreakdown.level2 + ' students'"
            @click="activeFilter = activeFilter === 'l2' ? 'all' : 'l2'"
          >
            <span>{{ levelBreakdown.level2 }}</span>
          </div>
          <div 
            v-if="levelBreakdown.level1 > 0"
            class="mini-bar-segment mini-bar-segment--l1" 
            :style="{ flex: levelBreakdown.level1 }" 
            :class="{ 'mini-bar-segment--active': activeFilter === 'l1' }"
            :title="'Level 1 (<60%): ' + levelBreakdown.level1 + ' students'"
            @click="activeFilter = activeFilter === 'l1' ? 'all' : 'l1'"
          >
            <span>{{ levelBreakdown.level1 }}</span>
          </div>
        </div>
      </div>

      <div class="compact-alerts-group">
        <span v-if="levelBreakdown.missing > 0" class="alert-chip alert-chip--missing" @click="activeFilter = 'missing'">
          ⚠️ {{ levelBreakdown.missing }} Missing
        </span>
        <span v-if="levelBreakdown.level1 > 0" class="alert-chip alert-chip--risk" @click="activeFilter = 'at-risk'">
          🔴 {{ levelBreakdown.level1 }} At-Risk (&lt;50%)
        </span>
      </div>
    </div>

    <!-- Student Scoring Table Card -->
    <div class="grades__focused-view">
      <div class="grades__table-card">
        <!-- Table Toolbar: Search & Filters -->
        <div class="table-toolbar">
          <!-- Search Box -->
          <div class="search-box">
            <Search :size="14" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search student name..." 
              class="search-input"
            />
            <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''"><X :size="12" /></button>
          </div>

          <!-- Filter Chips -->
          <div class="table-filter-chips">
            <button class="chip-btn" :class="{ 'chip-btn--active': activeFilter === 'all' }" @click="activeFilter = 'all'">
              All ({{ sortedRoster.length }})
            </button>
            <button class="chip-btn" :class="{ 'chip-btn--active': activeFilter === 'graded' }" @click="activeFilter = 'graded'">
              Graded ({{ levelBreakdown.graded }})
            </button>
            <button v-if="levelBreakdown.ungraded > 0" class="chip-btn" :class="{ 'chip-btn--active': activeFilter === 'ungraded' }" @click="activeFilter = 'ungraded'">
              Ungraded ({{ levelBreakdown.ungraded }})
            </button>
            <button v-if="levelBreakdown.missing > 0" class="chip-btn chip-btn--danger" :class="{ 'chip-btn--active': activeFilter === 'missing' }" @click="activeFilter = 'missing'">
              ⚠️ Missing ({{ levelBreakdown.missing }})
            </button>
            <button v-if="levelBreakdown.level1 > 0" class="chip-btn chip-btn--warning" :class="{ 'chip-btn--active': activeFilter === 'at-risk' }" @click="activeFilter = 'at-risk'">
              🔴 &lt;50% ({{ levelBreakdown.level1 }})
            </button>
          </div>
        </div>

        <div class="grades__table-scroll-area">
          <table class="grades__assessment-table">
            <thead>
              <tr>
                <th class="grades__ath-student">Student</th>
                <th class="grades__ath-score">Score (/{{ currentAssessment.totalPoints }})</th>
                <th class="grades__ath-percent">% Grade</th>
                <th class="grades__ath-actions"></th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="s in filteredRoster" 
                :key="s.studentId" 
                class="grades__atr-student"
                @contextmenu.prevent="e => $emit('open-context-menu', e, s.studentId, selectedAssessmentId)"
              >
                <!-- Student Cell -->
                <td class="grades__atd-student">
                  <span 
                    class="grades__student-link" 
                    @click="$emit('show-dossier', s.studentId)"
                    title="Open Student 360 Dossier"
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
                  <div 
                    v-else-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.missing" 
                    class="grades__cell-missing-badge"
                    @click="e => $emit('open-context-menu', e, s.studentId, selectedAssessmentId)"
                    @contextmenu.prevent="e => $emit('open-context-menu', e, s.studentId, selectedAssessmentId)"
                    title="Click or right-click to unmark missing / enter grade"
                  >
                    MISSING
                  </div>
                  <div 
                    v-else-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.excluded" 
                    class="grades__cell-excluded-badge"
                    @click="e => $emit('open-context-menu', e, s.studentId, selectedAssessmentId)"
                    @contextmenu.prevent="e => $emit('open-context-menu', e, s.studentId, selectedAssessmentId)"
                    title="Click or right-click to include in grade"
                  >
                    EXCLUDED
                  </div>
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
                      <button 
                        class="smart-badge" 
                        :class="'smart-badge--' + getSmartBadge(s.studentId).type"
                        @click.stop="openAttemptsPopover($event, s.studentId)"
                        :title="getSmartBadge(s.studentId).title"
                      >
                        {{ getSmartBadge(s.studentId).label }}
                      </button>
                    </template>
                  </div>
                </td>

                <!-- Color-Coded Percentage Badge -->
                <td class="grades__atd-percent">
                  <span 
                    v-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.resolvedScore != null" 
                    class="grade-percent-badge"
                    :style="getGradeBadgeStyle((gradeMap[selectedAssessmentId]?.[s.studentId]?.resolvedScore / currentAssessment.totalPoints) * 100)"
                  >
                    {{ Math.round((gradeMap[selectedAssessmentId]?.[s.studentId]?.resolvedScore / currentAssessment.totalPoints) * 100) }}%
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>

                <!-- Actions Column -->
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

    <!-- Attempt History Modal -->
    <GradesAttemptHistoryModal
      :show="!!attemptsPopover"
      :student-name="attemptsPopover?.studentName"
      :assessment-name="currentAssessment.name"
      :total-points="currentAssessment.totalPoints"
      :retest-policy="currentAssessment.retestPolicy || 'highest'"
      :resolved-score="gradeMap[selectedAssessmentId]?.[attemptsPopover?.studentId]?.resolvedScore"
      :attempts="popoverAttempts"
      @close="attemptsPopover = null"
      @delete-attempt="handleDeleteAttempt"
      @update-comment="handleUpdateComment"
      @start-new-attempt="handleAddAttempt"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  ArrowLeft, FileText, Target, Hash, Calendar, Edit2, UserMinus, Trash2, X, 
  AlertCircle, Check, MoreVertical, BarChart3, CheckCircle2, TrendingUp, Search 
} from 'lucide-vue-next'
import { getHeatTextColor } from '../../utils/gradeColors.js'
import { formatLocalDisplay } from '../../utils/dates.js'
import { removeAttempt, updateAttemptComment } from '../../composables/useGradebook.js'
import { useMessage } from '../../composables/useMessage.js'
import GradesAttemptHistoryModal from './GradesAttemptHistoryModal.vue'

const { confirm } = useMessage()

const props = defineProps({
  currentAssessment: { type: Object, required: true },
  currentAssessmentSummary: { type: Object, default: null },
  sortedRoster: { type: Array, default: () => [] },
  gradeMap: { type: Object, default: () => ({}) },
  editingCell: { type: Object, default: null },
  newAttemptForm: { type: Object, default: null },
  selectedAssessmentId: { type: [String, Number], required: true },
  excludedStudentsCount: { type: Number, default: 0 },
  activeClassRecord: { type: Object, default: null },
  returnTab: { type: String, default: 'grid' }
})

const emit = defineEmits([
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

// Local reactive refs
const searchQuery = ref('')
const activeFilter = ref('all')
const attemptsPopover = ref(null)

const popoverStyle = computed(() => {
  if (!attemptsPopover.value) return {}
  return {
    top: `${attemptsPopover.value.y}px`,
    left: `${attemptsPopover.value.x}px`
  }
})

const popoverAttempts = computed(() => {
  if (!attemptsPopover.value) return []
  const g = props.gradeMap[props.selectedAssessmentId]?.[attemptsPopover.value.studentId]
  return g?.attempts || []
})

function openAttemptsPopover(event, studentId) {
  const s = props.sortedRoster?.find(item => item.studentId === studentId)
  if (!s) return

  const rect = event.currentTarget.getBoundingClientRect()
  let x = rect.left + window.scrollX
  let y = rect.bottom + window.scrollY + 6

  if (x + 330 > window.innerWidth) x = window.innerWidth - 340
  if (y + 300 > window.innerHeight) y = rect.top + window.scrollY - 300

  attemptsPopover.value = {
    studentId,
    studentName: `${s.lastName}, ${s.firstName}`,
    x: Math.max(16, x),
    y: Math.max(16, y)
  }
}

async function handleDeleteAttempt(attemptId) {
  if (!attemptsPopover.value) return
  if (await confirm('Delete this attempt score?', 'Delete Attempt', { danger: true })) {
    await removeAttempt(props.selectedAssessmentId, attemptsPopover.value.studentId, attemptId)
  }
}

async function handleUpdateComment(attemptId, comment) {
  if (!attemptsPopover.value) return
  await updateAttemptComment(props.selectedAssessmentId, attemptsPopover.value.studentId, attemptId, comment)
}

function handleAddAttempt() {
  if (!attemptsPopover.value) return
  const studentId = attemptsPopover.value.studentId
  attemptsPopover.value = null
  emit('open-action-menu', null, studentId)
}

function getSmartBadge(studentId) {
  const g = props.gradeMap[props.selectedAssessmentId]?.[studentId]
  const attempts = g?.attempts || []
  const count = attempts.length
  const hasNote = attempts.some(a => a.comment?.trim())

  if (count > 1 && hasNote) {
    return {
      type: 'attempts-note',
      label: `🔵 ${count}x · 📝`,
      title: `${count} attempts & teacher note — click to view history`
    }
  }
  if (count > 1) {
    return {
      type: 'attempts',
      label: `🔵 ${count}x`,
      title: `${count} attempts — click to view history`
    }
  }
  if (hasNote) {
    return {
      type: 'note',
      label: '📝 Note',
      title: 'Teacher note — click to edit'
    }
  }
  return {
    type: 'ghost',
    label: '+ Note',
    title: 'Add teacher note or re-test attempt'
  }
}

const UNIT_COLORS = [
  '#0284c7', '#059669', '#7c3aed', '#d97706', '#db2777', '#0891b2', '#4f46e5'
]

const unitColor = computed(() => {
  if (!props.currentAssessment?.unitId || !props.activeClassRecord?.gradebookUnits) return '#3b82f6'
  const idx = props.activeClassRecord.gradebookUnits.findIndex(u => u.unitId === props.currentAssessment.unitId)
  if (idx < 0) return '#3b82f6'
  return UNIT_COLORS[idx % UNIT_COLORS.length]
})

const entryPercent = computed(() => {
  if (!props.currentAssessmentSummary?.totalStudents) return 0
  return Math.round((props.currentAssessmentSummary.enteredCount / props.currentAssessmentSummary.totalStudents) * 100)
})

function getUnitName(unitId) {
  return props.activeClassRecord?.gradebookUnits?.find(u => u.unitId === unitId)?.name ?? '—'
}

function getInitials(firstName, lastName) {
  const f = firstName?.[0] || ''
  const l = lastName?.[0] || ''
  return (f + l).toUpperCase() || 'S'
}

function getStudentStatus(studentId) {
  const g = props.gradeMap[props.selectedAssessmentId]?.[studentId]
  if (!g) return { label: 'Not Graded', class: 'empty' }
  if (g.excluded) return { label: 'Excluded', class: 'excluded' }
  if (g.missing) return { label: 'Missing', class: 'missing' }
  if (g.resolvedScore !== null) return { label: 'Graded', class: 'graded' }
  return { label: 'Not Graded', class: 'empty' }
}

function getGradeBadgeStyle(percent) {
  if (percent >= 80) return { background: 'rgba(34, 197, 94, 0.12)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.25)' }
  if (percent >= 70) return { background: 'rgba(59, 130, 246, 0.12)', color: '#1d4ed8', border: '1px solid rgba(59, 130, 246, 0.25)' }
  if (percent >= 60) return { background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.25)' }
  return { background: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.25)' }
}

const levelBreakdown = computed(() => {
  const bd = { level4: 0, level3: 0, level2: 0, level1: 0, missing: 0, excluded: 0, ungraded: 0, graded: 0 }
  const total = props.currentAssessment.totalPoints || 100

  props.sortedRoster.forEach(s => {
    const g = props.gradeMap[props.selectedAssessmentId]?.[s.studentId]
    if (!g) {
      bd.ungraded++
      return
    }
    if (g.missing) {
      bd.missing++
      return
    }
    if (g.excluded) {
      bd.excluded++
      return
    }
    if (g.resolvedScore !== null) {
      bd.graded++
      const pct = (g.resolvedScore / total) * 100
      if (pct >= 80) bd.level4++
      else if (pct >= 70) bd.level3++
      else if (pct >= 60) bd.level2++
      else bd.level1++
    } else {
      bd.ungraded++
    }
  })

  return bd
})

const liveAssessmentStats = computed(() => {
  const total = Number(props.currentAssessment?.totalPoints) || 100
  const pointsList = []
  const percentList = []

  props.sortedRoster.forEach(s => {
    const g = props.gradeMap[props.selectedAssessmentId]?.[s.studentId]
    if (g && !g.missing && !g.excluded && g.resolvedScore !== null && g.resolvedScore !== undefined) {
      const num = Number(g.resolvedScore)
      if (!isNaN(num)) {
        pointsList.push(num)
        percentList.push((num / total) * 100)
      }
    }
  })

  if (!pointsList.length) {
    return { mean: null, average: null, highest: null, lowest: null, median: null }
  }

  const sumPoints = pointsList.reduce((a, b) => a + b, 0)
  const averagePoints = Math.round((sumPoints / pointsList.length) * 10) / 10
  const mean = Math.round((averagePoints / total) * 100)

  percentList.sort((a, b) => a - b)
  const lowest = Math.round(percentList[0])
  const highest = Math.round(percentList[percentList.length - 1])
  const mid = Math.floor(percentList.length / 2)
  const median = percentList.length % 2 !== 0 
    ? Math.round(percentList[mid]) 
    : Math.round((percentList[mid - 1] + percentList[mid]) / 2)

  return { mean, average: averagePoints, highest, lowest, median }
})

const filteredRoster = computed(() => {
  let list = props.sortedRoster || []
  const total = props.currentAssessment.totalPoints || 100

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(s => 
      s.firstName?.toLowerCase().includes(q) || 
      s.lastName?.toLowerCase().includes(q)
    )
  }

  // Active chip filter
  if (activeFilter.value === 'graded') {
    list = list.filter(s => {
      const g = props.gradeMap[props.selectedAssessmentId]?.[s.studentId]
      return g && !g.missing && !g.excluded && g.resolvedScore !== null
    })
  } else if (activeFilter.value === 'ungraded') {
    list = list.filter(s => {
      const g = props.gradeMap[props.selectedAssessmentId]?.[s.studentId]
      return !g || (g.resolvedScore === null && !g.missing && !g.excluded)
    })
  } else if (activeFilter.value === 'missing') {
    list = list.filter(s => props.gradeMap[props.selectedAssessmentId]?.[s.studentId]?.missing)
  } else if (activeFilter.value === 'at-risk' || activeFilter.value === 'l1') {
    list = list.filter(s => {
      const g = props.gradeMap[props.selectedAssessmentId]?.[s.studentId]
      if (!g || g.missing || g.excluded || g.resolvedScore === null) return false
      return (g.resolvedScore / total) * 100 < 60
    })
  } else if (activeFilter.value === 'l4') {
    list = list.filter(s => {
      const g = props.gradeMap[props.selectedAssessmentId]?.[s.studentId]
      if (!g || g.missing || g.excluded || g.resolvedScore === null) return false
      return (g.resolvedScore / total) * 100 >= 80
    })
  } else if (activeFilter.value === 'l3') {
    list = list.filter(s => {
      const g = props.gradeMap[props.selectedAssessmentId]?.[s.studentId]
      if (!g || g.missing || g.excluded || g.resolvedScore === null) return false
      const pct = (g.resolvedScore / total) * 100
      return pct >= 70 && pct < 80
    })
  } else if (activeFilter.value === 'l2') {
    list = list.filter(s => {
      const g = props.gradeMap[props.selectedAssessmentId]?.[s.studentId]
      if (!g || g.missing || g.excluded || g.resolvedScore === null) return false
      const pct = (g.resolvedScore / total) * 100
      return pct >= 60 && pct < 70
    })
  }

  return list
})
</script>

<style scoped>
.grades__assessment-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
  padding: 16px 24px;
  background: var(--bg);
  overflow-y: auto;
}

.assessment-view__top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.assessment-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary-sm:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
}

.btn-danger-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  font-size: 0.8rem;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-danger-sm:hover {
  background: #ef4444;
  color: #fff;
}

.header-v-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 4px;
}

.grades__close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}

.grades__close-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

/* Glassmorphic Hero Banner Card */
.assessment-hero-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.hero-identity {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.hero-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.hero-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.hero-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text);
}

.hero-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.meta-chip--type {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.meta-chip--weight {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}

.hero-description {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 4 KPI Summary Cards Grid */
.assessment-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .assessment-kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.kpi-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.03);
}

.kpi-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-card__label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kpi-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

.kpi-card__icon--blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.kpi-card__icon--green { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.kpi-card__icon--purple { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
.kpi-card__icon--amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

.kpi-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-card__value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
}

.kpi-card__value small {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.kpi-card__subtext {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.kpi-progress-bar {
  height: 6px;
  background: var(--bg);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.kpi-progress-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.kpi-card__hero-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.kpi-card__hero-sub {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.kpi-range-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.range-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.range-pill strong {
  font-weight: 800;
}

.range-pill--high {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.2);
}

.range-pill--low {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.2);
}

.kpi-alerts-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.alert-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.alert-tag:hover {
  opacity: 0.85;
}

.alert-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.alert-tag--warning {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

/* Distribution Bar Card */
.distribution-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.distribution-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.distribution-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.distribution-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.legend-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.legend-pill--l4 { background: rgba(34, 197, 94, 0.12); color: #15803d; border-color: rgba(34, 197, 94, 0.25); }
.legend-pill--l3 { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; border-color: rgba(59, 130, 246, 0.25); }
.legend-pill--l2 { background: rgba(245, 158, 11, 0.12); color: #b45309; border-color: rgba(245, 158, 11, 0.25); }
.legend-pill--l1 { background: rgba(239, 68, 68, 0.12); color: #b91c1c; border-color: rgba(239, 68, 68, 0.25); }
.legend-pill--missing { background: rgba(100, 116, 139, 0.12); color: #475569; border-color: rgba(100, 116, 139, 0.25); }

.legend-pill:hover,
.legend-pill--active {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.legend-pill--l4.legend-pill--active { background: #22c55e; color: #fff; }
.legend-pill--l3.legend-pill--active { background: #3b82f6; color: #fff; }
.legend-pill--l2.legend-pill--active { background: #f59e0b; color: #fff; }
.legend-pill--l1.legend-pill--active { background: #ef4444; color: #fff; }
.legend-pill--missing.legend-pill--active { background: #64748b; color: #fff; }

.distribution-bar {
  display: flex;
  height: 16px;
  border-radius: 8px;
  overflow: hidden;
  gap: 3px;
  background: var(--bg);
}

.dist-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.dist-segment:hover {
  opacity: 0.85;
}

.dist-segment--l4 { background: #22c55e; }
.dist-segment--l3 { background: #3b82f6; }
.dist-segment--l2 { background: #f59e0b; }
.dist-segment--l1 { background: #ef4444; }
.dist-segment--missing { background: #64748b; }

/* Table Card & Toolbar */
.grades__focused-view {
  flex: 1;
}

.grades__table-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 4px 10px;
  width: 220px;
}

.search-icon {
  color: var(--text-secondary);
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.8rem;
  width: 100%;
  color: var(--text);
}

.clear-search {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.table-filter-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.chip-btn {
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--border);
  border-radius: 12px;
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

.chip-btn--danger.chip-btn--active {
  background: #ef4444;
  border-color: #ef4444;
}

.chip-btn--warning.chip-btn--active {
  background: #f59e0b;
  border-color: #f59e0b;
}

.grades__score-input-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.smart-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.smart-badge--attempts-note {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.25);
}

.smart-badge--attempts {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border-color: rgba(59, 130, 246, 0.2);
}

.smart-badge--note {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.25);
}

.smart-badge--ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
  opacity: 0;
}

.grades__atr-student:hover .smart-badge--ghost,
.smart-badge:hover {
  opacity: 1;
  background: var(--surface-hover);
  border-color: var(--border);
}

.grade-percent-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
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
  cursor: pointer;
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.grades__cell-missing-badge:hover {
  background: rgba(239, 68, 68, 0.15);
  text-decoration: underline;
}

.grades__cell-excluded-badge {
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.grades__cell-excluded-badge:hover {
  background: var(--surface-hover);
  text-decoration: underline;
}

.grades__icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
}

/* Attempts & Teacher Notes Popover */
.grades__attempts-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
}

.grades__attempts-popover {
  position: fixed;
  width: 320px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10000;
}

.popover-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.popover-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
}

.popover-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.popover-close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
}

.popover-body {
  max-height: 260px;
  overflow-y: auto;
}

.attempts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attempt-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attempt-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.attempt-score-tag {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.attempt-score-tag small {
  color: var(--text-secondary);
  font-weight: 600;
}

.attempt-date-tag {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.attempt-delete-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
}

.attempt-delete-btn:hover {
  color: #ef4444;
}

.attempt-note-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  padding: 6px 8px;
  font-size: 0.8rem;
  resize: vertical;
}

.popover-empty {
  padding: 16px 0;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.popover-footer {
  border-top: 1px solid var(--border);
  padding-top: 10px;
  display: flex;
  justify-content: flex-end;
}

/* Compact Header & Metrics Strip */
.compact-header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin-bottom: 8px;
  gap: 12px;
}

.compact-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.compact-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
}

.compact-meta-chips {
  display: flex;
  align-items: center;
  gap: 6px;
}

.compact-metrics-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: var(--surface-subtle, rgba(241, 245, 249, 0.6));
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  margin-bottom: 10px;
}

.metric-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
}

.metric-pill__label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-tertiary, #94a3b8);
  text-transform: uppercase;
}

.metric-pill__val {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.metric-pill__sub {
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.metric-divider {
  width: 1px;
  height: 18px;
  background: var(--border);
}

.mini-stacked-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-bar-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-tertiary, #94a3b8);
  letter-spacing: 0.04em;
}

.mini-stacked-bar {
  display: flex;
  height: 20px;
  min-width: 140px;
  max-width: 200px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--border);
  cursor: pointer;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.12);
}

.mini-bar-segment {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  transition: all 0.15s ease;
  user-select: none;
}

.mini-bar-segment:hover, .mini-bar-segment--active {
  filter: brightness(1.15);
  box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.6);
}

.mini-bar-segment--l4 { background-color: #34c759; }
.mini-bar-segment--l3 { background-color: #3b82f6; }
.mini-bar-segment--l2 { background-color: #f59e0b; }
.mini-bar-segment--l1 { background-color: #ef4444; }
.tier-chip--l1 { background: rgba(239, 68, 68, 0.12); color: #dc2626; }

.tier-chip:hover, .tier-chip--active {
  transform: translateY(-1px);
  filter: brightness(0.95);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.compact-alerts-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.alert-chip {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.alert-chip--missing { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
.alert-chip--risk { background: rgba(245, 158, 11, 0.12); color: #d97706; }
</style>
