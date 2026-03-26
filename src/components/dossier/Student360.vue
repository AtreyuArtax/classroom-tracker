<template>
  <div class="student-360">
    <Student360Header 
      :student="student" 
      :overall-grade="overallGrade"
      :most-consistent="overallMostConsistent"
      :consistent-is-fallback="consistentIsFallback"
      :weighted-median="overallWeightedMedian"
      :attendance-stats="attendanceStats"
    >
      <template #actions>
        <button class="student-360__action-btn" title="Email Progress Report" @click="showEmailModal = true">
          <Mail :size="20" />
        </button>
        <button class="student-360__action-btn" title="Print Progress Report" @click="showPrintModal = true">
          <Printer :size="20" />
        </button>
        <button class="student-360__close-btn" @click="$emit('close')">
          <X :size="20" />
        </button>
      </template>
    </Student360Header>

    <nav class="student-360__tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="student-360__tab-btn"
        :class="{ 'student-360__tab-btn--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="18" />
        {{ tab.label }}
      </button>
    </nav>

    <main class="student-360__content">
      <!-- Summary Tab -->
      <section v-if="activeTab === 'summary'" class="student-360__pane student-360__pane--summary">
        <!-- Period Toggle -->
        <div class="student-360__period-toggle">
          <button 
            v-for="p in ['week', 'month', 'all']" 
            :key="p"
            class="period-btn"
            :class="{ 'period-btn--active': selectedPeriod === p }"
            @click="selectedPeriod = p"
          >
            {{ p.charAt(0).toUpperCase() + p.slice(1) }}
          </button>
        </div>

        <div class="student-360__stats-grid">
          <StudentStatCard 
            label="Overall Grade" 
            :value="formattedGrade" 
            :icon="GraduationCap"
            color="primary"
          />
          <StudentStatCard 
            label="Absences" 
            :value="attendanceStats.absences" 
            :sub-value="attendanceAverages.absencesAvg + '/wk avg'"
            :icon="UserMinus"
            :color="attendanceStats.absences > 0 ? 'danger' : 'success'"
          />
          <StudentStatCard 
            label="Lates" 
            :value="attendanceStats.lates" 
            :sub-value="attendanceAverages.latesAvg + ' total min'"
            :icon="Clock"
            :color="attendanceStats.lates > 4 ? 'warning' : 'neutral'"
          />
          <StudentStatCard 
            label="Washroom" 
            :value="washroomCount" 
            :sub-value="attendanceAverages.washroomAvg + '/wk avg'"
            :icon="Toilet"
            :color="washroomCount > 3 ? 'warning' : 'neutral'"
          />
        </div>

        <!-- Trends Section (Side-by-Side) -->
        <div class="student-360__trends-row">
          <div class="trend-item">
            <h4 class="trend-item__title">Grade Performance</h4>
            <StudentGradeTrend 
              :assessments="allDossierAssessments" 
              :grade-map="gradeMap" 
              :student-id="props.studentId" 
            />
          </div>
          <div class="trend-item">
            <h4 class="trend-item__title">Behavior Trend</h4>
            <StudentTrendGraph 
              :weekly-trend="behaviorWeeklyTrend"
              :categories="['washroom', 'absence', 'late']"
              :period="selectedPeriod"
            />
          </div>
        </div>

        <!-- Coaching Insight Alert -->
        <div v-if="coachingInsight" class="student-360__insight-card">
          <div class="insight-icon" :class="'insight-icon--' + coachingInsight.type">
            <AlertTriangle v-if="coachingInsight.type === 'warning'" :size="20" />
            <TrendingDown v-else :size="20" />
          </div>
          <div class="insight-content">
            <h4 class="insight-title">{{ coachingInsight.title }}</h4>
            <p class="insight-message">{{ coachingInsight.message }}</p>
            <p class="insight-recommendation"><strong>Recommendation:</strong> {{ coachingInsight.recommendation }}</p>
          </div>
        </div>
      </section>

      <!-- Academics Tab -->
      <section v-if="activeTab === 'academics'" class="student-360__pane student-360__pane--academics">
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
                  <th>Date</th>
                  <th>Assessment</th>
                  <th>Type</th>
                  <th>Impact</th>
                  <th>Points</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in classAssessments" :key="a.assessmentId" @contextmenu.prevent="onContextMenu($event, a.assessmentId)">
                  <td class="td-date">{{ new Date(a.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}</td>
                  <td class="td-name">{{ a.name }}</td>
                  <td><span class="badge" :class="'badge--' + a.assessmentType">{{ a.assessmentType }}</span></td>
                  <td>
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
                          
                          <!-- Multiple Attempts Indicator -->
                          <div 
                            v-if="gradeMap[a.assessmentId]?.[props.studentId]?.attempts?.length > 1"
                            class="attempts-dot"
                            @click.stop="openAttempts($event, a.assessmentId)"
                            title="Multiple attempts - click to view history"
                          ></div>
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
                   <th>Date</th>
                   <th>Assessment</th>
                   <th>Type</th>
                   <th>Impact</th>
                   <th>Points</th>
                   <th>%</th>
                 </tr>
               </thead>
               <tbody>
                 <tr v-for="a in individualAssessments" :key="a.assessmentId" @contextmenu.prevent="onContextMenu($event, a.assessmentId)">
                   <td class="td-date">{{ new Date(a.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}</td>
                   <td class="td-name">{{ a.name }}</td>
                   <td><span class="badge" :class="'badge--' + a.assessmentType">{{ a.assessmentType }}</span></td>
                   <td>
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
                          
                          <!-- Multiple Attempts Indicator -->
                          <div 
                            v-if="gradeMap[a.assessmentId]?.[props.studentId]?.attempts?.length > 1"
                            class="attempts-dot"
                            @click.stop="openAttempts($event, a.assessmentId)"
                            title="Multiple attempts - click to view history"
                          ></div>
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
      </section>

      <!-- Timeline Tab -->
      <section v-if="activeTab === 'timeline'" class="student-360__pane">
        <div class="timeline-header">
           <button class="btn-log-absence" @click="showAbsenceForm = !showAbsenceForm">
             <PlusCircle :size="16" /> Log Past Absence
           </button>
        </div>

        <div v-if="showAbsenceForm" class="absence-form">
          <input type="date" v-model="absenceDate" class="absence-input" />
          <div class="absence-actions">
            <button class="btn-primary" @click="logAbsence">Save</button>
            <button class="btn-ghost" @click="showAbsenceForm = false">Cancel</button>
          </div>
        </div>

        <StudentTimeline 
          :student-id="studentId" 
          :events="events"
          :assessments="assessments"
          :behavior-codes-map="behaviorCodesMap"
        />
      </section>

      <!-- Profile Tab -->
      <section v-if="activeTab === 'profile'" class="student-360__pane student-360__pane--profile">
        <div class="profile-section">
          <h3 class="profile-section__title">Demographics</h3>
          <div class="profile-grid">
            <div class="profile-item">
              <span class="profile-item__label">Age / DOB</span>
              <span class="profile-item__value">
                {{ student.birthDate ? `${computeAge(student.birthDate)} (${student.birthDate})` : '—' }}
              </span>
            </div>
            <div class="profile-item">
              <span class="profile-item__label">Student Email</span>
              <span class="profile-item__value">
                <a :href="'mailto:' + student.studentEmail" v-if="student.studentEmail">{{ student.studentEmail }}</a>
                <span v-else>—</span>
              </span>
            </div>
            <div class="profile-item">
              <span class="profile-item__label">Living With</span>
              <span class="profile-item__value">{{ student.livingWith || '—' }}</span>
            </div>
            <div class="profile-item">
              <span class="profile-item__label">Custody</span>
              <span class="profile-item__value">{{ student.custody || '—' }}</span>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h3 class="profile-section__title">Parent / Guardian Contacts</h3>
          <div v-if="!student.parentContacts?.length" class="text-muted">No contacts on file.</div>
          <div v-else class="contacts-list">
            <div v-for="(c, i) in student.parentContacts" :key="i" class="contact-card">
              <div class="contact-card__name">{{ c.name }}</div>
              <div class="contact-card__meta">
                <a :href="'mailto:' + c.email" v-if="c.email">{{ c.email }}</a>
                <span v-if="c.phone">{{ c.phone }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h3 class="profile-section__title">General Notes</h3>
          <textarea 
            class="student-360__notes-area"
            placeholder="Seating needs, accommodations, etc..."
            :value="student.generalNote || ''"
            @blur="e => saveGeneralNote(e.target.value)"
          ></textarea>
        </div>

        <div class="profile-actions">
          <button class="btn-copy-report" @click="copyForReportCard">
            <ClipboardList :size="16" />
            {{ isCopied ? 'Copied to Clipboard!' : 'Copy for Report Card' }}
          </button>
        </div>
      </section>
    </main>

    <!-- Context Menu -->
    <div v-if="contextMenu" class="context-menu-backdrop" @click="contextMenu = null">
      <div 
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click.stop
      >
        <button class="context-menu__item" @click="startNewAttempt(contextMenu.assessmentId)">
          <Plus :size="14" /> New Attempt...
        </button>
        <button v-if="gradeMap[contextMenu.assessmentId]?.[studentId]?.attempts?.length > 0" class="context-menu__item" @click="startEdit(contextMenu.assessmentId, true)">
          <Pencil :size="14" /> Change Mark
        </button>
        <div class="context-menu__divider"></div>
        <button class="context-menu__item" @click="toggleMissing(contextMenu.assessmentId)">
          <AlertCircle :size="14" /> {{ gradeMap[contextMenu.assessmentId]?.[studentId]?.missing ? 'Unmark Missing' : 'Mark Missing' }}
        </button>
        <button class="context-menu__item" @click="toggleExcluded(contextMenu.assessmentId)">
          <XCircle :size="14" /> {{ gradeMap[contextMenu.assessmentId]?.[studentId]?.excluded ? 'Unmark Excluded' : 'Mark Excluded' }}
        </button>
        <div class="context-menu__divider"></div>
        <button class="context-menu__item text-danger" @click="doDeleteAssessment(contextMenu.assessmentId)">
          <Trash2 :size="14" /> Delete Assessment
        </button>
      </div>
    </div>

    <!-- Attempts Popover -->
    <div v-if="attemptsPopover" class="context-menu-backdrop" @click="attemptsPopover = null">
      <div 
        class="attempts-popover"
        :style="{ top: attemptsPopover.y + 'px', left: attemptsPopover.x + 'px' }"
        @click.stop
      >
        <div class="attempts-popover__header">Attempt History</div>
        <div class="attempts-popover__list">
          <div 
            v-for="att in gradeMap[attemptsPopover.assessmentId]?.[studentId]?.attempts" 
            :key="att.attemptId"
            class="attempt-item"
            :class="{ 'attempt-item--primary': att.isPrimary }"
          >
            <div class="attempt-item__main">
              <span class="attempt-item__score">{{ att.pointsEarned }}</span>
              <span class="attempt-item__date">{{ new Date(att.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}</span>
            </div>
            <div class="attempt-item__actions">
              <button 
                v-if="!att.isPrimary" 
                class="btn-icon-sm" 
                title="Set as Primary"
                @click="doSetPrimary(attemptsPopover.assessmentId, att.attemptId)"
              >
                <Check :size="12" />
              </button>
              <button 
                class="btn-icon-sm btn-icon-sm--danger" 
                title="Delete Attempt"
                @click="doDeleteAttempt(attemptsPopover.assessmentId, att.attemptId)"
              >
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Attempt Modal -->
    <div v-if="newAttemptForm" class="modal-overlay" @click="newAttemptForm = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Record New Attempt</h3>
          <button class="modal-close" @click="newAttemptForm = null"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Points Earned</label>
            <input type="number" v-model="newAttemptForm.points" autofocus />
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" v-model="newAttemptForm.date" />
          </div>
          <div class="form-group">
            <label>Comment (Optional)</label>
            <textarea v-model="newAttemptForm.comment" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="newAttemptForm = null">Cancel</button>
          <button class="btn-primary" @click="submitNewAttempt">Save Attempt</button>
        </div>
      </div>
    </div>

    <!-- Email Progress Report Modal -->
    <div v-if="showEmailModal" class="student-360__modal-overlay" @click.self="showEmailModal = false">
      <div class="email-config-modal">
        <header class="email-config-modal__header">
          <div class="header-content">
            <Mail class="header-icon" :size="24" />
            <div>
              <h3 class="header-title">Configure Email Report</h3>
              <p class="header-subtitle">Select recipients and data points to include.</p>
            </div>
          </div>
          <button class="header-close" @click="showEmailModal = false">
            <X :size="20" />
          </button>
        </header>

        <div class="email-config-modal__body">
          <!-- Recipients Selection -->
          <div class="config-section">
            <h4 class="config-section-title">Recipients</h4>
            <div class="recipient-list">
              <div 
                v-for="r in emailRecipients" 
                :key="r.email" 
                class="recipient-item"
                :class="{ 'recipient-item--active': selectedRecipientEmails.has(r.email) }"
                @click="toggleRecipient(r.email)"
              >
                <div class="recipient-info">
                  <span class="recipient-label">{{ r.label }}</span>
                  <span class="recipient-email">{{ r.email }}</span>
                </div>
                <div class="recipient-checkbox">
                  <CheckCircle2 v-if="selectedRecipientEmails.has(r.email)" :size="20" class="icon-checked" />
                  <div v-else class="checkbox-placeholder"></div>
                </div>
              </div>
              <div v-if="emailRecipients.length === 0" class="recipient-empty">
                No email addresses found for this student or their parents.
              </div>
            </div>
          </div>

          <!-- Content Options -->
          <div class="config-section">
            <h4 class="config-section-title">Include in Report</h4>
            <div class="options-grid">
              <label class="option-item">
                <input type="checkbox" v-model="emailConfig.content.grade" />
                <span class="option-label">Current Overall Grade</span>
              </label>
              <label class="option-item">
                <input type="checkbox" v-model="emailConfig.content.missing" />
                <span class="option-label">Missing Assessments List</span>
              </label>
              <label class="option-item">
                <input type="checkbox" v-model="emailConfig.content.attendance" />
                <span class="option-label">Attendance Summary</span>
              </label>
              <label class="option-item">
                <input type="checkbox" v-model="emailConfig.content.washroom" />
                <span class="option-label">Washroom & Out-of-Class Logs</span>
              </label>
            </div>
          </div>
        </div>

        <footer class="email-config-modal__footer">
          <button class="btn-cancel" @click="showEmailModal = false">Cancel</button>
          <button 
            class="btn-generate" 
            :disabled="selectedRecipientEmails.size === 0"
            @click="generateEmailLink"
          >
            Generate Draft & Open Mail
            <ChevronRight :size="18" />
          </button>
        </footer>
      </div>
    </div>

    <!-- Print Report Configuration Modal -->
    <div v-if="showPrintModal" class="student-360__modal-overlay" @click.self="showPrintModal = false">
      <div class="email-config-modal email-config-modal--wide">
        <header class="email-config-modal__header">
          <div class="header-content">
            <Printer class="header-icon" :size="24" />
            <div>
              <h3 class="header-title">Print Progress Report</h3>
              <p class="header-subtitle">Format a professional document for this student.</p>
            </div>
          </div>
          <button class="header-close" @click="showPrintModal = false">
            <X :size="20" />
          </button>
        </header>

        <div class="email-config-modal__body">
          <div class="config-section">
            <div class="config-section-header">
              <h4 class="config-section-title">Include in Document</h4>
              <button class="reports__btn-preview" @click="showPrintPreview = !showPrintPreview">
                {{ showPrintPreview ? 'Hide Preview' : 'Show Preview' }}
              </button>
            </div>
            <div class="print-modal__options">
              <div class="print-modal__section-title">Report Content</div>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeOverallGrade" />
                Overall Grade Badge
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeMedians" />
                Weighted Median & Consistent Grade
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeGradeTrend" />
                Performance Trend Graph
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeTriangulation" />
                Evidence Triangulation (Pie)
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeCategorySummary" />
                Category Performance Summary
              </label>
              <div class="print-modal__divider"></div>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeAttendance" />
                Attendance Summary
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeBehavior" />
                Behavior Observations
              </label>
            </div>
          </div>

          <!-- Live Preview Section -->
          <div v-if="showPrintPreview" class="reports__print-preview-area">
            <header class="preview-banner">
              <Activity :size="14" /> LIVE PREVIEW
            </header>
            <div class="preview-content">
              <ProgressReport 
                :student-id="studentId" 
                :class-id="classId" 
                :config="printConfig" 
                :is-batch="false"
              />
            </div>
          </div>

          <div v-else class="report-preview-mini">
            <p>This will generate a formal PDF/Print document containing overall grades, performance trends, and assessment history.</p>
          </div>
        </div>

        <footer class="email-config-modal__footer">
          <button class="btn-cancel" @click="showPrintModal = false">Cancel</button>
          <button class="btn-generate" @click="triggerPrint">
            Open Print Dialog
            <Printer :size="18" />
          </button>
        </footer>
      </div>
    </div>

    <!-- Hidden/Active Print Container -->
    <div class="print-only-container" :class="{ 'print-only-container--active': isSystemPrinting }">
      <ProgressReport 
        v-if="isSystemPrinting || showPrintModal"
        :student-id="props.studentId" 
        :class-id="props.classId" 
        :config="printConfig" 
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, reactive } from 'vue'
import { 
  LayoutDashboard, 
  GraduationCap, 
  AlertTriangle,
  TrendingDown,
  ClipboardList, 
  History, 
  UserCircle,
  UserMinus,
  Clock,
  Toilet,
  HelpCircle,
  X,
  PlusCircle,
  TrendingUp,
  Plus,
  MoreVertical,
  AlertCircle,
  Trash2,
  Check,
  Pencil, // Added Pencil icon
  XCircle, // Added XCircle icon
  Mail,
  CheckCircle2,
  ChevronRight,
  Printer,
  Activity // Added Activity icon for preview
} from 'lucide-vue-next'
import DossierCategoryGrid from './DossierCategoryGrid.vue'
import DossierEvidenceMix  from './DossierEvidenceMix.vue'
import Student360Header    from './Student360Header.vue'
import StudentStatCard     from './StudentStatCard.vue'
import StudentTimeline     from './StudentTimeline.vue'
import StudentTrendGraph    from '../StudentTrendGraph.vue'
import StudentGradeTrend    from './StudentGradeTrend.vue'
import ProgressReport       from './ProgressReport.vue'
import { useClassroom }  from '../../composables/useClassroom.js'
import { 
  classGrades, 
  assessments, 
  grades, 
  loadGradebook, 
  activeClassRecord, 
  gradeMap, 
  openAddAssessment,
  enterGrade,
  changeGrade,
  markMissing,
  markExcluded,
  clearGrade,
  removeAttempt,
  setPrimaryAttempt,
  deleteAssessment
} from '../../composables/useGradebook.js'
import { getDateBoundary } from '../../db/eventService.js'

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true }
})

const { 
  students, 
  behaviorCodes,
  activeClass,
  getStudentEventHistory,
  logStandardEvent,
} = useClassroom()

// --- Email Progress Report State ---
const showEmailModal = ref(false)
const emailConfig = ref({
  recipients: { student: true, parents: true },
  content: { grade: true, missing: true, attendance: true, washroom: false }
})

const emailRecipients = computed(() => {
  const list = []
  if (student.value.studentEmail) {
    list.push({ id: 'student', label: 'Student', email: student.value.studentEmail })
  }
  if (student.value.parentContacts) {
    student.value.parentContacts.forEach((pc, idx) => {
      if (pc.email) {
        list.push({ id: `parent_${idx}`, label: pc.name || `Parent ${idx + 1}`, email: pc.email })
      }
    })
  }
  return list
})

const selectedRecipientEmails = ref(new Set())

// Initialize selected emails when modal opens
watch(showEmailModal, (open) => {
  if (open) {
    selectedRecipientEmails.value = new Set(emailRecipients.value.map(r => r.email))
  }
})

function toggleRecipient(email) {
  if (selectedRecipientEmails.value.has(email)) {
    selectedRecipientEmails.value.delete(email)
  } else {
    selectedRecipientEmails.value.add(email)
  }
}

function generateEmailLink() {
  const emails = Array.from(selectedRecipientEmails.value).join(',')
  const subject = `Progress Report Update: ${student.value.firstName} ${student.value.lastName}`
  
  let body = `Hello,\n\nI am sharing a progress update for ${student.value.firstName}.\n\n`
  
  if (emailConfig.value.content.grade) {
    body += `Current Overall Grade: ${formattedGrade.value}\n`
  }
  
  if (emailConfig.value.content.missing) {
    const missing = [
      ...classAssessments.value.filter(a => a.missing),
      ...individualAssessments.value.filter(a => a.missing)
    ]
    if (missing.length > 0) {
      body += `\nMissing Assessments:\n`
      missing.forEach(m => body += `- ${m.name}\n`)
    } else {
      body += `\nNo missing assessments at this time.\n`
    }
  }
  
  if (emailConfig.value.content.attendance) {
    body += `\nAttendance Summary:\n`
    body += `- Absences: ${attendanceStats.value.absences}\n`
    body += `- Lates: ${attendanceStats.value.lates}\n`
  }
  
  if (emailConfig.value.content.washroom) {
    body += `\nOut of Class Logs:\n`
    body += `- Washroom/Water trips in period: ${washroomCount.value}\n`
  }
  
  body += `\nPlease let me know if you have any questions.\n\nBest regards,\n${activeClass.value?.teacherName || 'Teacher'}`
  
  const mailto = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = mailto
  showEmailModal.value = false
}

// --- Print Progress Report Logic ---
const showPrintModal = ref(false)
const showPrintPreview = ref(false)
const isSystemPrinting = ref(false)
const printConfig    = reactive({
  includeAttendance: true,
  includeBehavior: false,
  includeOverallGrade: true,
  includeMedians: false,
  includeGradeTrend: true,
  includeTriangulation: false,
  includeCategorySummary: false
})

async function triggerPrint() {
  showPrintModal.value = false
  isSystemPrinting.value = true
  
  nextTick(async () => {
    // Give charts 1500ms to render properly on the now-visible canvas
    await new Promise(resolve => setTimeout(resolve, 1500))
    window.print()
    isSystemPrinting.value = false
  })
}

const activeTab = ref('summary')
const selectedPeriod = ref('month')

// Filtered data based on period
const filteredEvents = computed(() => {
  const boundary = getDateBoundary(selectedPeriod.value)
  if (!boundary) return events.value
  return events.value.filter(e => e.timestamp >= boundary)
})

// Past Absence Logic
const showAbsenceForm = ref(false)
const absenceDate = ref(new Date().toISOString().split('T')[0])

async function logAbsence() {
  if (!absenceDate.value) return
  try {
    // Call existing logStandardEvent from useClassroom
    await logStandardEvent(props.studentId, 'a', 'Past Absence Logged', { 
      timestamp: new Date(absenceDate.value + 'T12:00:00Z').toISOString() 
    })
    showAbsenceForm.value = false
    // Refresh timeline if needed (StudentTimeline should handle it via watcher)
  } catch (err) {
    console.error('Failed to log absence:', err)
  }
}

const tabs = [
  { id: 'summary',   label: 'Summary',   icon: LayoutDashboard },
  { id: 'academics', label: 'Academics', icon: GraduationCap },
  { id: 'timeline',  label: 'Timeline',  icon: History },
  { id: 'profile',   label: 'Profile',   icon: UserCircle }
]

// Data Fetching
const events = ref([])
const behaviorCodesMap = computed(() => 
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)

const student = computed(() => students.value[props.studentId] || {})
const loading = ref(false)

// Academic Data from useGradebook
const studentGrades = computed(() => classGrades.value?.[props.studentId] || {})
const overallGrade  = computed(() => studentGrades.value.overallGrade ?? null)
const formattedGrade = computed(() => overallGrade.value !== null ? `${Math.round(overallGrade.value)}%` : 'N/A')

const overallMostConsistent = computed(() => studentGrades.value.mostConsistent?.percentage ?? null)
const overallWeightedMedian = computed(() => studentGrades.value.median ?? null)
const consistentIsFallback = computed(() => studentGrades.value.mostConsistent?.isFallback ?? false)

function getGradeColor(score) {
  if (score === null || score === undefined) return 'var(--text-secondary)'
  if (score >= 80) return '#34c759'
  if (score >= 70) return '#30b0c7'
  if (score >= 60) return '#ff9500'
  return '#ff3b30'
}

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

// Class assessments for this student
const classAssessments = computed(() => {
  return assessments.value
    .filter(a => a.target !== 'individual')
    .map(a => {
      const g = gradeMap.value[a.assessmentId]?.[props.studentId]
      const score = g?.resolvedScore ?? null
      
      const aDate = a.date.split('T')[0]
      const wasAbsent = events.value.some(ev => 
        ev.code === 'a' && 
        !ev.superseded && 
        ev.timestamp.startsWith(aDate)
      )

      return {
        ...a,
        score,
        missing: g?.missing,
        excluded: g?.excluded,
        wasAbsent
      }
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

// Individual assessments for this student
const individualAssessments = computed(() => {
  return assessments.value
    .filter(a => a.target === 'individual' && String(a.targetStudentId) === String(props.studentId))
    .map(a => {
      const g = gradeMap.value[a.assessmentId]?.[props.studentId]
      const score = g?.resolvedScore ?? null
      
      return {
        ...a,
        score,
        missing: g?.missing,
        excluded: g?.excluded
      }
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

// Combined assessments for trend graph
const allDossierAssessments = computed(() => {
  return [...classAssessments.value, ...individualAssessments.value]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
})

const orderedAssessmentsForNav = computed(() => {
  // Matches the UI layout: Individual table first, then Class table
  return [...individualAssessments.value, ...classAssessments.value]
})

const evidenceMix = computed(() => {
  const mix = { product: 0, observation: 0, conversation: 0 }
  const valid = allDossierAssessments.value.filter(a => a.score !== null)
  if (!valid.length) return mix
  
  valid.forEach(a => {
    const type = a.assessmentType?.toLowerCase() || 'product'
    if (type.includes('prod')) mix.product++
    else if (type.includes('obs')) mix.observation++
    else if (type.includes('conv')) mix.conversation++
  })

  // Convert to percentages
  const total = valid.length
  return {
    product:      (mix.product      / total) * 100,
    observation:  (mix.observation  / total) * 100,
    conversation: (mix.conversation / total) * 100
  }
})

const attendanceStats = computed(() => {
  const absences = filteredEvents.value.filter(e => e.code === 'a' && !e.superseded).length
  const lates = filteredEvents.value.filter(e => e.code === 'l').length
  return { absences, lates }
})

const washroomCount = computed(() => {
  return filteredEvents.value.filter(e => e.code === 'w').length
})

const coachingInsight = computed(() => {
  const grade = overallGrade.value
  const absences = attendanceStats.value.absences

  // Alert if grade < 70% and absences >= 3
  if (grade !== null && grade < 70 && absences >= 3) {
    return {
      type: 'warning',
      title: 'Coaching Insight: Attendance Correlation',
      message: `Overall progress (${Math.round(grade)}%) appears to be impacted by ${absences} absences.`,
      recommendation: 'Recommend a 1-on-1 to discuss missed instruction and catch-up opportunities.'
    }
  }
  return null
})

function computeAge(dob) {
  if (!dob) return ''
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

const behaviorWeeklyTrend = computed(() => {
  if (!filteredEvents.value.length) return []
  const weeks = {}
  
  filteredEvents.value.forEach(e => {
    // Determine the week starting Monday
    const d = new Date(e.timestamp)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mondayDate = new Date(d.setDate(diff))
    const monday = mondayDate.toISOString().split('T')[0]
    
    if (!weeks[monday]) {
      weeks[monday] = { week: monday, washroom: 0, absence: 0, late: 0 }
    }
    
    if (e.code === 'w') weeks[monday].washroom++
    else if (e.code === 'a' && !e.superseded) weeks[monday].absence++
    else if (e.code === 'l') weeks[monday].late++
  })
  
  // Sort by date
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
})

const attendanceAverages = computed(() => {
  const trend = behaviorWeeklyTrend.value
  
  // Determine actual divisor based on period
  let weekCount = 1
  if (selectedPeriod.value === 'month') weekCount = 4
  else if (selectedPeriod.value === 'all') weekCount = Math.max(1, trend.length)
  
  const totalAbs = attendanceStats.value.absences
  const totalWash = washroomCount.value
  const totalLateMins = filteredEvents.value
    .filter(e => e.code === 'l')
    .reduce((acc, e) => acc + (e.duration || 0), 0)

  return {
    absencesAvg: (totalAbs / weekCount).toFixed(1),
    washroomAvg: (totalWash / weekCount).toFixed(1),
    latesAvg: Math.round(totalLateMins)
  }
})

async function saveGeneralNote(note) {
  // We'll use the classroom composable's method if available, or classService
  // For now, let's assume we update the student object in the store
  student.value.generalNote = note
  // In a real app, this would call an API/DB update
}

const isCopied = ref(false)
async function copyForReportCard() {
  const s = student.value
  const absences = attendanceStats.value.absences
  const lates = attendanceStats.value.lates
  
  const text = [
    `${s.firstName} ${s.lastName} — Progress Summary`,
    `Current Grade: ${formattedGrade.value}`,
    `Attendance: ${absences} Absences, ${lates} Lates`,
    '',
    'Academic Performance:',
    ...academicCategories.value.map(c => `- ${c.name}: ${c.score !== null ? Math.round(c.score) + '%' : 'N/A'}`),
    '',
    'General Notes:',
    s.generalNote || 'None recorded.'
  ].join('\n')
  
  await navigator.clipboard.writeText(text)
  isCopied.value = true
  setTimeout(() => isCopied.value = false, 2000)
}

// ─── High-Fidelity Editing State ──────────────────────────────────────────────
const editingCell = ref(null) // { assessmentId }
const editInput = ref(null)
const editOriginalValue = ref(null)
const contextMenu = ref(null) // { x, y, assessmentId }
const attemptsPopover = ref(null) // { x, y, assessmentId }
const isChangeMode = ref(false)
const newAttemptForm = ref(null)

// ─── High-Fidelity Methods ────────────────────────────────────────────────────
function startEdit(assessmentId, changeMode = false) {
  const g = gradeMap.value[assessmentId]?.[props.studentId]
  const val = g?.resolvedScore ?? null
  editingCell.value = { assessmentId }
  editOriginalValue.value = val
  editInput.value = val
  isChangeMode.value = changeMode
  
  // Focus the input in the next tick
  setTimeout(() => {
    const input = document.querySelector('.cell-edit-input')
    if (input) {
      input.focus()
      input.select()
    }
  }, 10)
}

async function saveEdit() {
  if (!editingCell.value) return
  const { assessmentId } = editingCell.value
  
  // Normalize values
  const normalizedNew = (editInput.value === null || editInput.value === undefined || editInput.value === '') ? null : Number(editInput.value)
  const normalizedOld = (editOriginalValue.value === null || editOriginalValue.value === undefined || editOriginalValue.value === '') ? null : Number(editOriginalValue.value)

  // 1. Change Detection
  if (normalizedNew === normalizedOld) {
    editingCell.value = null
    return
  }

  // 2. Clear Handling
  if (normalizedNew === null) {
    const grade = gradeMap.value[assessmentId]?.[props.studentId]
    if (grade?.attempts?.length > 1) {
      alert('Cannot clear: This student has multiple attempts. Use the attempt history menu to manage specific entries.')
      editingCell.value = null
      return
    }

    await clearGrade(assessmentId, props.studentId)
    editingCell.value = null
    return
  }

  // 3. Validation
  const assessment = classAssessments.value.find(a => a.assessmentId === assessmentId) || 
                     individualAssessments.value.find(a => a.assessmentId === assessmentId)
  if (!assessment) {
    editingCell.value = null
    return
  }

  // Clamp value
  const points = Math.max(0, normalizedNew)
  
  if (points > assessment.totalPoints) {
    alert(`Entry error: ${points} exceeds assessment max of ${assessment.totalPoints}. Score not saved.`)
    editingCell.value = null
    return
  }

  if (isChangeMode.value) {
    await changeGrade(assessmentId, props.studentId, points)
  } else {
    await enterGrade(assessmentId, props.studentId, points)
  }
  
  editingCell.value = null
  editOriginalValue.value = null
  editInput.value = null
}

function cancelEdit() {
  editingCell.value = null
  editInput.value = null
}

function onContextMenu(e, assessmentId) {
  const menuWidth  = 200
  const menuHeight = 280
  
  let x = e.clientX
  let y = e.clientY
  
  // Viewport-aware positioning
  if (x + menuWidth > window.innerWidth)   x = Math.max(10, window.innerWidth - menuWidth - 20)
  if (y + menuHeight > window.innerHeight) y = Math.max(10, window.innerHeight - menuHeight - 20)
  
  contextMenu.value = { x, y, assessmentId }
}

function openAttempts(e, assessmentId) {
  const popoverWidth  = 200
  const popoverHeight = 300
  
  let x = e.clientX
  let y = e.clientY
  
  if (x + popoverWidth > window.innerWidth)   x = Math.max(10, window.innerWidth - popoverWidth - 20)
  if (y + popoverHeight > window.innerHeight) y = Math.max(10, window.innerHeight - popoverHeight - 20)
  
  attemptsPopover.value = { x, y, assessmentId }
}

async function toggleMissing(assessmentId) {
  const g = gradeMap.value[assessmentId]?.[props.studentId]
  await markMissing(assessmentId, props.studentId, !g?.missing)
  contextMenu.value = null
}

async function toggleExcluded(assessmentId) {
  const g = gradeMap.value[assessmentId]?.[props.studentId]
  await markExcluded(assessmentId, props.studentId, !g?.excluded)
  contextMenu.value = null
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
    
  if (!confirm(`Are you sure you want to delete this ${typeLabel}?${warning}`)) {
    contextMenu.value = null
    return
  }
  
  await deleteAssessment(assessmentId)
  contextMenu.value = null
}

async function startNewAttempt(assessmentId) {
  newAttemptForm.value = {
    assessmentId,
    points: null,
    date: new Date().toISOString().slice(0, 10),
    comment: ''
  }
  contextMenu.value = null
}

async function submitNewAttempt() {
  if (!newAttemptForm.value || newAttemptForm.value.points === null) return
  const { assessmentId, points, date, comment } = newAttemptForm.value
  await enterGrade(assessmentId, props.studentId, points, date, comment)
  newAttemptForm.value = null
}

async function doDeleteAttempt(assessmentId, attemptId) {
  if (!confirm('Are you sure you want to delete this attempt?')) return
  await removeAttempt(assessmentId, props.studentId, attemptId)
}

async function doSetPrimary(assessmentId, attemptId) {
  await setPrimaryAttempt(assessmentId, props.studentId, attemptId)
}

function getImpactLevel(weight) {
  const w = weight || 1
  if (w >= 10) return { id: 'high', label: 'High' }
  if (w >= 3)  return { id: 'med',  label: 'Med'  }
  return { id: 'low',  label: 'Low'  }
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

async function loadData() {
  loading.value = true
  if (activeClassRecord.value) {
    // If we're already locked into a class, ensure grades are refreshed for student
    // assessments.value should be pre-loaded by Grades.vue
  } else if (activeClass.value) {
    await loadGradebook(activeClass.value)
  }
  
  events.value = await getStudentEventHistory(props.studentId)
  loading.value = false
}

watch(() => props.studentId, loadData)

onMounted(loadData)
</script>

<style scoped>
.student-360 {
  display:        flex;
  flex-direction: column;
  height:         100%;
  background:     var(--bg-secondary);
  overflow:       hidden;
  position:       relative;
}

.student-360__loading-overlay {
  position:        absolute;
  inset:           0;
  background:      rgba(255, 255, 255, 0.8);
  display:         flex;
  align-items:     center;
  justify-content: center;
  z-index:         100;
  font-weight:     600;
  color:           var(--primary);
}

.student-360__close-btn {
  display:         flex;
  align-items:     center;
  justify-content: center;
  width:           40px;
  height:          40px;
  border-radius:   50%;
  border:          none;
  background:      var(--bg-secondary);
  color:           var(--text-secondary);
  cursor:          pointer;
  transition:      all 0.2s ease;
}

.student-360__close-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color:      #ff3b30;
  transform:  rotate(90deg);
}

.student-360__tabs {
  display:       flex;
  gap:           8px;
  padding:       0 24px;
  background:    var(--surface);
  border-bottom: 1px solid var(--border);
}

.student-360__tab-btn {
  display:         flex;
  align-items:     center;
  gap:             8px;
  padding:         12px 16px;
  background:      none;
  border:          none;
  border-bottom:   2px solid transparent;
  font-size:       0.9rem;
  font-weight:     600;
  color:           var(--text-secondary);
  cursor:          pointer;
  transition:      all 0.2s ease;
}

.student-360__tab-btn:hover {
  color: var(--text);
}

.student-360__tab-btn--active {
  color:         var(--primary);
  border-bottom: 2px solid var(--primary);
}

.student-360__content {
  flex:     1;
  overflow: auto;
  padding:  24px;
}

.student-360__pane {
  display:        flex;
  flex-direction: column;
  gap:            16px;
}

.student-360__stats-grid {
  display:               grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap:                   16px;
}

.student-360__period-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
  width: fit-content;
  margin-bottom: 8px;
}

.period-btn {
  padding: 6px 12px;
  border: none;
  background: none;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-btn:hover {
  color: var(--text);
}

.period-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

/* ── Trends Row ─────────────────────────────────────────────────────────── */
.student-360__trends-row {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.trend-item {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.trend-item__title {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.student-360__trends-row :deep(.grade-trend) {
  margin-top: 0;
  border: none;
  padding: 0;
}

.student-360__trends-row :deep(.student-trend-graph) {
  border: none;
  padding: 0;
  background: transparent;
}

/* ── Impact Badges ──────────────────────────────────────────────────────── */
.impact-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  white-space: nowrap;
}

.impact-badge--high {
  background: #fff0f0;
  color: #d70015;
}

.impact-badge--med {
  background: #fdf8f0;
  color: #9f6600;
}

.impact-badge--low {
  background: #f0f7ff;
  color: #0056b3;
}

@media (max-width: 1024px) {
  .student-360__trends-row {
    flex-direction: column;
  }
}

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
  margin: 0;
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

.td-date     { color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.td-name     { font-weight: 600; }
.td-score    { font-variant-numeric: tabular-nums; }
.td-percent  { font-weight: 700; text-align: right; }

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

.profile-section {
  background:    var(--surface);
  border:        1px solid var(--border);
  border-radius: var(--radius-lg);
  padding:       20px;
}

.profile-section__title {
  margin:        0 0 16px 0;
  font-size:     1rem;
  font-weight:   700;
  color:         var(--text);
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.profile-grid {
  display:               grid;
  grid-template-columns: 1fr 1fr;
  gap:                   20px;
}

.profile-item {
  display:        flex;
  flex-direction: column;
  gap:            4px;
}

.profile-item__label {
  font-size:   0.75rem;
  font-weight: 600;
  color:       var(--text-secondary);
  text-transform: uppercase;
}

.profile-item__value {
  font-size: 0.9rem;
  color:     var(--text);
}

.contacts-list {
  display:        flex;
  flex-direction: column;
  gap:            12px;
}

.contact-card {
  padding:       12px;
  background:    var(--bg-secondary);
  border-radius: var(--radius-md);
  border:        1px solid var(--border);
}

.contact-card__name {
  font-weight: 700;
  font-size:   0.9rem;
  color:       var(--text);
  margin-bottom: 4px;
}

.contact-card__meta {
  display:     flex;
  gap:         16px;
  font-size:   0.8rem;
  color:       var(--text-secondary);
}

.contact-card__meta a {
  color:           var(--primary);
  text-decoration: none;
}

.student-360__notes-area {
  width:         100%;
  min-height:    120px;
  padding:       12px;
  background:    var(--bg-secondary);
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  font-family:   inherit;
  font-size:     0.9rem;
  resize:        vertical;
  color:         var(--text);
}

.profile-actions {
  margin-top: 12px;
}

.timeline-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.btn-log-absence {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-log-absence:hover {
  background: var(--border);
}

.absence-form {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--primary-light);
}

.absence-input {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
}

.absence-actions {
  display: flex;
  gap: 8px;
}

.btn-primary {
  padding: 8px 16px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
}

.btn-ghost {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.btn-copy-report {
  display:         flex;
  align-items:     center;
  justify-content: center;
  gap:             8px;
  width:           100%;
  padding:         14px;
  background:      var(--primary);
  color:           #fff;
  border:          none;
  border-radius:   var(--radius-lg);
  font-weight:     700;
  cursor:          pointer;
  transition:      all 0.2s ease;
}

.btn-copy-report:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.student-360__trend-section {
  background:    var(--surface);
  padding:       24px;
  border-radius: var(--radius-lg);
  border:        1px solid var(--border);
  box-shadow:    var(--shadow-sm);
  margin-top:    8px;
}

.student-360__insight-card {
  display:       flex;
  gap:           16px;
  padding:       20px;
  background:    rgba(255, 149, 0, 0.05);
  border:        1px solid rgba(255, 149, 0, 0.2);
  border-radius: var(--radius-lg);
  margin-top:    8px;
}

.insight-icon {
  display:         flex;
  align-items:     center;
  justify-content: center;
  width:           40px;
  height:          40px;
  border-radius:   50%;
  flex-shrink:     0;
}

.insight-icon--warning {
  background: rgba(255, 149, 0, 0.1);
  color:      #ff9500;
}

.insight-content {
  flex: 1;
}

.insight-title {
  margin:      0 0 4px 0;
  font-size:   0.95rem;
  font-weight: 700;
  color:       #8e44ad; /* Use a distinct "coaching" color */
}

.insight-message {
  margin:    0 0 8px 0;
  font-size: 0.9rem;
  color:     var(--text);
}

.insight-recommendation {
  margin:    0;
  font-size: 0.85rem;
  color:     var(--text-secondary);
  font-style: italic;
}

/* ── Interactive Grading ─────────────────────────────────────────────── */
.score-cell-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
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

.score-missing {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
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

/* Context Menu & Popovers */
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

/* Attempts Popover */
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
}

.attempt-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
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

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--surface);
  border-radius: var(--radius-lg);
  width: 400px;
  max-width: 90vw;
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 { margin: 0; font-size: 1.1rem; }

.modal-close {
  background: none; border: none; cursor: pointer; color: var(--text-secondary);
}

.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }

.form-group input, .form-group textarea {
  padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-md); font-family: inherit; background: var(--bg);
}

.modal-footer {
  padding: 16px 20px; background: var(--bg-secondary); display: flex; justify-content: flex-end; gap: 12px;
}

.btn-icon-sm {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; transition: all 0.2s;
}

.btn-icon-sm:hover { border-color: var(--primary); color: var(--primary); }

.btn-icon-sm--danger:hover { background: #fff1f0; border-color: #ff3b30; color: #ff3b30; }

/* --- Email Modal Styles --- */
.student-360__modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.email-config-modal {
  background: var(--surface);
  width: 95%;
  max-width: 500px;
  max-height: calc(100vh - 40px);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  animation: modalEnter 0.3s ease-out;
  transition: max-width 0.3s ease;
}

.email-config-modal--wide {
  max-width: 700px;
}

@keyframes modalEnter {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.email-config-modal__header {
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  gap: 16px;
  align-items: center;
}

.header-icon {
  color: var(--primary);
  background: var(--primary-light);
  padding: 8px;
  border-radius: var(--radius-md);
  box-sizing: content-box;
}

.header-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.print-modal__options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 24px;
  background: var(--bg-hover);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.print-modal__section-title {
  grid-column: 1 / -1;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 4px;
  letter-spacing: 0.05em;
}

.print-modal__divider {
  grid-column: 1 / -1;
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

.header-subtitle {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.header-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.header-close:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.email-config-modal__body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.config-section-title {
  margin: 0 0 12px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.recipient-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipient-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.recipient-item:hover {
  border-color: var(--primary-light);
  transform: translateX(4px);
}

.recipient-item--active {
  background: var(--surface);
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.recipient-info {
  display: flex;
  flex-direction: column;
}

.recipient-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
}

.recipient-email {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.icon-checked {
  color: var(--primary);
}

.checkbox-placeholder {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-radius: 50%;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s;
}

.option-item:hover {
  background: var(--bg-secondary);
}

.option-item input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
}

.option-label {
  font-size: 0.9rem;
  color: var(--text);
}

.email-config-modal__footer {
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: var(--bg-hover);
}

.btn-generate {
  padding: 10px 24px;
  background: var(--primary);
  color: white;
  border: none;
  font-weight: 600;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-generate:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.student-360__action-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.student-360__action-btn:hover {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary-light);
}

.recipient-empty {
  padding: 12px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
}

/* --- Print Styles --- */
.print-only-container {
  display: none;
}

@media print {
  /* Hide UI children but keep .student-360 root visible */
  .student-360__header,
  .student-360__tabs,
  .student-360__content,
  .student-360__modal-overlay,
  :global(.app-nav), 
  :global(.student-sidebar) {
    display: none !important;
  }

  .print-only-container {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    background: white;
    z-index: 9999;
  }

  body {
    background: white !important;
    overflow: visible !important;
  }
}

.print-only-container {
  display: none;
}

/* This is the secret sauce: keep it visible on screen but covering the app briefly 
   so Chart.js can draw on a visible canvas before print is called */
.print-only-container--active {
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
  background: white;
  overflow-y: auto;
}

/* These helpers were missing in Student360.vue but used in the new modal UI */
.reports__btn-preview {
  background: none;
  border: 1px solid var(--primary-light);
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.config-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.reports__print-preview-area {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #eee;
  margin-top: 8px;
}

.preview-banner {
  background: #333;
  color: white;
  padding: 6px 12px;
  font-size: 0.70rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-content {
  height: 450px;
  overflow-y: auto;
  background: #f1f5f9;
  padding: 30px;
  display: flex;
  justify-content: center;
}

.preview-content :deep(.progress-report) {
  transform: scale(0.65);
  transform-origin: top center;
  margin-bottom: -150px; /* Offset the scale-down space */
  box-shadow: var(--shadow-lg);
}

.report-preview-mini {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  line-height: 1.4;
}
</style>
