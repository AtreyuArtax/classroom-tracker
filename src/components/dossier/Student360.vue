<template>
  <div class="student-360">
    <Student360Header 
      :student="student" 
      :overall-grade="overallGrade"
      :most-consistent="overallMostConsistent"
      :consistent-is-fallback="consistentIsFallback"
      :weighted-median="overallWeightedMedian"
      :attendance-stats="stats"
      :attendance-rate="stats.attendanceRate"
    >
      <template #actions>
        <button class="student-360__action-btn" title="Email Progress Report" @click="showEmailModal = true">
          <Mail :size="18" />
        </button>
        <button class="student-360__action-btn" title="Print Progress Report" @click="showPrintModal = true">
          <Printer :size="18" />
        </button>
        <button class="student-360__close-btn" @click="handleClose">
          <X :size="18" />
        </button>
      </template>
    </Student360Header>

    <nav class="student-360__tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        v-memo="[tab.id, activeTab === tab.id]"
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
            v-for="p in ['week', 'last_week', 'month', 'all']" 
            :key="p"
            class="period-btn"
            :class="{ 'period-btn--active': selectedPeriod === p }"
            @click="selectedPeriod = p"
          >
            {{ p === 'last_week' ? 'Last Week' : p.charAt(0).toUpperCase() + p.slice(1) }}
          </button>
        </div>

        <div class="student-360__stats-grid">
          <StudentStatCard 
            label="Absences" 
            :value="stats.absences" 
            :sub-value="`${attendanceAverages.absencesAvg}/wk avg • ${stats.testDayAbsences} Test Day${stats.testDayAbsences !== 1 ? 's' : ''}`"
            :icon="UserMinus"
            :alert-icon="testDayAlert ? AlertTriangle : null"
            :color="testDayAlert ? 'danger' : (stats.absences > 0 ? 'warning' : 'success')"
          />
          <StudentStatCard 
            :label="behaviorCodesMap['l']?.label || 'Lates'" 
            :value="stats.lates" 
            :sub-value="attendanceAverages.latesAvg + '/wk'"
            :value2="attendanceAverages.latesTotal + 'm'"
            :sub-value2="attendanceAverages.latesAvgDuration + 'm avg'"
            :icon="resolveIcon(behaviorCodesMap['l']?.icon) || Clock"
            :color="stats.lates > 4 ? 'warning' : 'neutral'"
          />
          <StudentStatCard 
            :label="behaviorCodesMap['w']?.label || 'Washroom'" 
            :value="washroomCount" 
            :sub-value="attendanceAverages.washroomAvg + '/wk'"
            :value2="attendanceAverages.washroomTotal + 'm'"
            :sub-value2="attendanceAverages.washroomAvgPerVisit + 'm avg'"
            :icon="resolveIcon(behaviorCodesMap['w']?.icon) || Toilet"
            :color="washroomCount > 3 ? 'warning' : 'neutral'"
          />
          <StudentStatCard 
            label="Redirect" 
            :value="redirectCount"
            :icon="AlertTriangle"
            :color="redirectCount >= 3 ? 'danger' : redirectCount >= 1 ? 'warning' : 'neutral'"
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
                <tr v-for="a in classAssessments" :key="a.assessmentId" v-memo="[a.assessmentId, a.score, a.missing, a.excluded, a.attempts?.length, editingCell?.assessmentId === a.assessmentId]" @contextmenu.prevent="onContextMenu($event, a.assessmentId)">
                   <td class="td-date">{{ formatLocalDisplay(a.date) }}</td>
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
                            v-if="a.attempts?.length > 1"
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
                 <tr v-for="a in individualAssessments" :key="a.assessmentId" v-memo="[a.assessmentId, a.score, a.missing, a.excluded, a.attempts?.length, editingCell?.assessmentId === a.assessmentId]" @contextmenu.prevent="onContextMenu($event, a.assessmentId)">
                   <td class="td-date">{{ formatLocalDisplay(a.date) }}</td>
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
                            v-if="a.attempts?.length > 1"
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

        <!-- Qualitative Evidence (Observations/Conversations) -->
        <DossierQualitativeEvidence 
          :events="qualitativeEvents" 
          @delete="handleDeleteHistoryItem"
        />

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
      </section>

      <section v-if="activeTab === 'communication'" class="student-360__pane">
        <DossierCommunicationLog 
          :events="communicationEvents" 
          @delete="handleDeleteHistoryItem"
        />
      </section>

      <!-- Timeline Tab -->
      <section v-if="activeTab === 'timeline'" class="student-360__pane">
        <div class="timeline-header">
           <button class="btn-log-absence" @click="showAbsenceForm = true">
             <PlusCircle :size="16" /> Log Past Absence
           </button>
        </div>

         <BaseModal
           :show="showAbsenceForm"
           title="Log Past Absence"
           @close="showAbsenceForm = false"
           maxWidth="400px"
         >
           <div class="absence-modal-content">
             <div class="form-group">
               <label>Absence Date</label>
               <input type="date" v-model="absenceDate" class="absence-input" />
             </div>
             
             <label class="absence-checkbox-container">
               <input type="checkbox" v-model="absenceIsTestDay" />
               <div class="checkbox-custom"></div>
               <span class="checkbox-label">Mark as Assessment Day</span>
             </label>

             <div class="modal-footer">
               <button class="btn-ghost" @click="showAbsenceForm = false">Cancel</button>
               <button class="btn-primary" @click="logAbsence">Save Record</button>
             </div>
           </div>
         </BaseModal>

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
              <span class="profile-item__value" :class="{ 'profile-item__value--adult': isAdult }">
                <ShieldCheck v-if="isAdult" :size="14" class="adult-icon" />
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
            <div v-for="(c, i) in student.parentContacts" :key="i" v-memo="[c.name, c.email, c.phone]" class="contact-card">
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
            v-model="localGeneralNote"
            @blur="updateGeneralNoteLocal"
          ></textarea>
        </div>

        <div class="profile-actions">
          <div class="profile-actions__label">
            <ClipboardList :size="14" />
            Copy for Report Card Comment
          </div>
          <div class="profile-actions__buttons">
            <button class="btn-copy-report btn-copy-report--anon" @click="copyForReportCard(false)">
              <ShieldCheck :size="15" />
              {{ isCopiedAnon ? '✓ Copied!' : 'Without Name' }}
            </button>
            <button class="btn-copy-report btn-copy-report--named" @click="copyForReportCard(true)">
              <ClipboardList :size="15" />
              {{ isCopiedNamed ? '✓ Copied!' : 'With Name' }}
            </button>
          </div>
        </div>
      </section>

      <!-- History Tab -->
      <section v-if="activeTab === 'history'" class="student-360__pane student-360__pane--history">
        <div class="history-container">
          <h3 class="history-title">Academic Journey</h3>
          <p class="history-subtitle">Historical records across all semesters and years.</p>
          
          <div v-if="allTimeHistory.length === 0" class="history-empty">
            <History :size="48" class="history-empty-icon" />
            <p>No historical records found for this student.</p>
          </div>
          
          <div v-else class="history-list">
            <div v-for="h in allTimeHistory" :key="h.classId" v-memo="[h.classId, h.overallGrade]" class="history-item">
              <div class="history-item__left">
                <div class="history-term-badge">{{ h.year }} • {{ h.semester }}</div>
                <div class="history-class-name">{{ h.name }}</div>
                <div class="history-period" v-if="h.period">Period {{ h.period }}</div>
              </div>
              <div class="history-item__right">
                <div class="history-grade-pill" :style="{ backgroundColor: getGradeColor(h.overallGrade) }">
                  {{ h.overallGrade != null ? Math.round(h.overallGrade) + '%' : '—' }}
                </div>
              </div>
            </div>
          </div>
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
    <BaseModal
      :show="!!newAttemptForm"
      title="Record New Attempt"
      @close="newAttemptForm = null"
    >
      <div class="modal-body-content">
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
      <template #footer>
        <button class="btn-ghost" @click="newAttemptForm = null">Cancel</button>
        <button class="btn-primary" @click="submitNewAttempt">Save Attempt</button>
      </template>
    </BaseModal>

    <!-- Email Progress Report Modal -->
    <BaseModal
      :show="showEmailModal"
      title="Configure Email Report"
      @close="showEmailModal = false"
    >
      <template #header>
        <div class="header-content">
          <Mail class="header-icon" :size="24" />
          <div>
            <h3 class="header-title">Configure Email Report</h3>
            <p class="header-subtitle">Select recipients and data points to include.</p>
          </div>
        </div>
      </template>

      <div class="email-config-modal-body">
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
              <input type="checkbox" v-model="emailConfig.content.washroom" />
              <span class="option-label">Washroom & Out-of-Class Logs</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="emailConfig.content.assessments" />
              <span class="option-label">Detailed Assessment List & Attempts</span>
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-cancel" @click="showEmailModal = false">Cancel</button>
        <button 
          class="btn-generate" 
          :disabled="selectedRecipientEmails.size === 0"
          @click="generateEmailLink"
        >
          Generate Draft & Open Mail
          <ChevronRight :size="18" />
        </button>
      </template>
    </BaseModal>

    <!-- Print Report Configuration Modal -->
    <BaseModal
      :show="showPrintModal"
      title="Print Report"
      max-width="700px"
      @close="showPrintModal = false"
    >
      <template #header>
        <div class="header-content">
          <Printer class="header-icon" :size="24" />
          <div>
            <h3 class="header-title">Print Report</h3>
            <p class="header-subtitle">Format a professional document for this student.</p>
          </div>
        </div>
      </template>

      <div class="email-config-modal-body">
        <div class="config-section">
          <div class="config-section-header">
            <h4 class="config-section-title">Report Type</h4>
            <div class="report-type-toggle">
              <button 
                class="reports__toggle-btn" 
                :class="{ 'reports__toggle-btn--active': printConfig.reportType === 'progress' }"
                @click="printConfig.reportType = 'progress'"
              >Progress</button>
              <button 
                class="reports__toggle-btn" 
                :class="{ 'reports__toggle-btn--active': printConfig.reportType === 'attendance' }"
                @click="printConfig.reportType = 'attendance'"
              >Attendance</button>
            </div>
          </div>

          <div v-if="printConfig.reportType === 'progress'" class="print-modal__options" style="margin-top: 1rem;">
            <div class="print-modal__section-title">Include in Document</div>
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
              Out-of-Class Summary
            </label>
          </div>

          <div v-else class="print-modal__options" style="margin-top: 1rem;">
             <div class="print-modal__section-title">Report Content</div>
             <p class="setup__hint">The Attendance & Activity report generates a visual 5-month grid for the current semester based on your School Calendar settings.</p>
          </div>

          <div class="config-section-header" style="margin-top: 1.5rem;">
            <h4 class="config-section-title">Preview</h4>
            <button class="reports__btn-preview" @click="showPrintPreview = !showPrintPreview">
              {{ showPrintPreview ? 'Hide Preview' : 'Show Preview' }}
            </button>
          </div>
        </div>

        <!-- Live Preview Section -->
        <div v-if="showPrintPreview" class="reports__print-preview-area">
          <header class="preview-banner">
            <Activity :size="14" /> LIVE PREVIEW ({{ printConfig.reportType === 'progress' ? 'Progress' : 'Attendance' }})
          </header>
          <div class="preview-content">
            <ProgressReport 
              v-if="printConfig.reportType === 'progress'"
              :student-id="studentId" 
              :class-id="classId" 
              :config="printConfig" 
              :is-batch="false"
            />
            <AttendanceActivityReport
              v-else
              :student-id="studentId"
              :class-id="classId"
              :is-batch="false"
            />
          </div>
        </div>

        <div v-else class="report-preview-mini">
          <p v-if="printConfig.reportType === 'progress'">This will generate a formal PDF/Print document containing overall grades, performance trends, and assessment history.</p>
          <p v-else>This will generate a visual 5-month attendance calendar with behavioral metrics and totals.</p>
        </div>
      </div>

      <template #footer>
        <button class="btn-cancel" @click="showPrintModal = false">Cancel</button>
        <button class="btn-generate" @click="triggerPrint">
          Open Print Dialog
          <Printer :size="18" />
        </button>
      </template>
    </BaseModal>

    <!-- Hidden/Active Print Container -->
    <Teleport to="body">
      <div class="print-only-container" :class="{ 'print-only-container--active': isSystemPrinting }">
        <ProgressReport 
          v-if="printConfig.reportType === 'progress'"
          :student-id="props.studentId" 
          :class-id="props.classId" 
          :config="printConfig" 
        />
        <AttendanceActivityReport
          v-else
          :student-id="props.studentId"
          :class-id="props.classId"
        />
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref } from 'vue'

// Shared session state
const activeTab = ref('summary')
const selectedPeriod = ref('month')
let resetTimer = null

export default {
  inheritAttrs: false
}
</script>

<script setup>
import { ref, computed, watch, onMounted, nextTick, reactive, onUnmounted } from 'vue'
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
  Activity, 
  ExternalLink,
  ShieldCheck,
  MessageSquare
} from 'lucide-vue-next'
import { useMessage } from '../../composables/useMessage.js'
import DossierCategoryGrid from './DossierCategoryGrid.vue'
import DossierEvidenceMix  from './DossierEvidenceMix.vue'
import Student360Header    from './Student360Header.vue'
import StudentStatCard     from './StudentStatCard.vue'
import StudentTimeline     from './StudentTimeline.vue'
import DossierCommunicationLog from './DossierCommunicationLog.vue'
import DossierQualitativeEvidence from './DossierQualitativeEvidence.vue'
import StudentTrendGraph    from '../StudentTrendGraph.vue'
import StudentGradeTrend    from './StudentGradeTrend.vue'
import AttendanceActivityReport from './AttendanceActivityReport.vue'
import ProgressReport       from './ProgressReport.vue'
import BaseModal            from '../BaseModal.vue'
import { useClassroom }  from '../../composables/useClassroom.js'
import { toMinutes }     from '../../db/eventService.js'
import { resolveIcon }   from '../../utils/icons.js'
import { 
  classGrades, 
  assessments, 
  grades, 
  loadGradebook, 
  activeClassRecord, 
  gradeMap, 
  openAddAssessment,
  enterGrade,
  clearGrade,
  removeAttempt,
  setPrimaryAttempt,
  deleteAssessment,
  saveStudentGradebookNote
} from '../../composables/useGradebook.js'
// getDateRangeForPeriod is now used internally by useStudentDossier — no direct import needed here.

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true }
})

const emit = defineEmits(['close'])

function handleClose() {
  activeTab.value = 'summary'
  selectedPeriod.value = 'month'
  emit('close')
}

const { alert, confirm } = useMessage()
const { 
  classList,
  students,
  behaviorCodes,
  activeClass,
  activeStudentEvents,
  getStudentEventHistory,
  logStandardEvent,
  removeEvent,
  getClass,
  updateStudentNote,
  teacherName,
  thresholds
} = useClassroom()

import { useStudentDossier } from '../../composables/useStudentDossier.js'
import { parseLocal, formatLocalDisplay } from '../../utils/dates.js'

import { toRef } from 'vue'
const { allTimeHistory, fetchAllTimeHistory, stats, filteredEvents } = useStudentDossier(selectedPeriod, toRef(props, 'classId'))


// --- Email Progress Report State ---
const showEmailModal = ref(false)
const emailConfig = ref({
  recipients: { student: true, parents: true },
  content: { grade: true, missing: true, attendance: true, washroom: false, assessments: true }
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
  
  if (emailConfig.value.content.assessments) {
    const list = [...allDossierAssessments.value]
      .filter(a => a.score !== null && !a.excluded)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
    
    if (list.length > 0) {
      body += `\nAcademic Record & Recent Progress:\n`
      list.forEach(a => {
        const date = new Date(a.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
        let line = `${date} - ${a.name}: ${Math.round((a.score / a.totalPoints) * 100)}%`
        if (a.attempts?.length > 1) {
          const history = a.attempts
            .map(att => Math.round((att.pointsEarned / a.totalPoints) * 100) + '%')
            .join(', ')
          line += ` (Attempts history: ${history})`
        }
        body += `- ${line}\n`
      })
    }
  }

  if (emailConfig.value.content.missing) {
    const missing = [
      ...classAssessments.value.filter(a => (a.missing || a.score === null) && !a.excluded),
      ...individualAssessments.value.filter(a => (a.missing || a.score === null) && !a.excluded)
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
    body += `- Absences: ${stats.value.absences}\n`
    body += `- Lates: ${stats.value.lates}\n`
  }
  
  if (emailConfig.value.content.washroom) {
    body += `\nOut of Class Logs:\n`
    body += `- Washroom/Water trips in period: ${washroomCount.value}\n`
  }
  
  body += `\nPlease let me know if you have any questions.\n\nBest regards,\n${teacherName.value || 'Teacher'}`
  
  const mailto = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = mailto
  showEmailModal.value = false
}

// --- Print Progress Report Logic ---
const showPrintModal = ref(false)
const showPrintPreview = ref(false)
const isSystemPrinting = ref(false)

// Watch for changes in isSystemPrinting to apply/remove print styles
watch(isSystemPrinting, (newValue) => {
  if (newValue) {
    document.body.classList.add('is-printing')
  } else {
    document.body.classList.remove('is-printing')
  }
})

const printConfig    = reactive({
  reportType: 'progress', // 'progress' or 'attendance'
  includeAttendance: true,
  includeBehavior: false,
  includeOverallGrade: true,
  includeMedians: false,
  includeGradeTrend: true,
  includeTriangulation: false,
  includeCategorySummary: true
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


// Shared state is now handled in the <script> block above



// Past Absence Logic
const showAbsenceForm = ref(false)
const absenceDate = ref(new Date().toISOString().split('T')[0])
const absenceIsTestDay = ref(false)

async function logAbsence() {
  if (!absenceDate.value) return
  
  // Duplicate check: see if an absence ('a' code) already exists for this date
  const isDuplicate = events.value.some(ev => 
    ev.code === 'a' && 
    !ev.superseded && 
    ev.timestamp.startsWith(absenceDate.value)
  )

  if (isDuplicate) {
    await alert(`An absence is already recorded for ${absenceDate.value}.`)
    return
  }

  try {
    // Call updated logStandardEvent with timestamp option
    await logStandardEvent(props.studentId, 'a', 'Past Absence Logged', { 
      timestamp: new Date(absenceDate.value + 'T12:00:00Z').toISOString(),
      testDay: absenceIsTestDay.value
    })
    showAbsenceForm.value = false
    absenceDate.value = new Date().toISOString().split('T')[0] // Reset to today
    absenceIsTestDay.value = false // Reset checkbox
  } catch (err) {
    console.error('Failed to log absence:', err)
    await alert('Failed to log absence. Please try again.')
  }
}

const tabs = [
  { id: 'summary',       label: 'Summary',       icon: LayoutDashboard },
  { id: 'academics',     label: 'Academics',     icon: GraduationCap },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'timeline',      label: 'Timeline',      icon: Activity },
  { id: 'history',       label: 'History',       icon: History },
  { id: 'profile',       label: 'Profile',       icon: UserCircle }
]

// Data Fetching
const events = activeStudentEvents
const behaviorCodesMap = computed(() => 
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)

const student = computed(() => students.value[props.studentId] || {})

/** Qualitative evidence — 'ac' events derived from history */
const qualitativeEvents = computed(() =>
  [...events.value]
    .filter(e => e.code === 'ac')
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
)

/** Communication log — 'pc' events derived from history */
const communicationEvents = computed(() =>
  [...events.value]
    .filter(e => e.code === 'pc' || e.category === 'communication')
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
)

const isAdult = computed(() => {
  if (!student.value.birthDate) return false
  return computeAge(student.value.birthDate) >= 18
})
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
        attempts: g?.attempts || [],
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
        attempts: g?.attempts || [],
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

const testDayAlert = computed(() => stats.value.testDayAbsences > 1)

const washroomCount = computed(() => {
  return filteredEvents.value.filter(e => {
    const config = behaviorCodesMap.value[e.code]
    return config?.type === 'toggle' && !e.superseded
  }).length
})

const redirectCount = computed(() => {
  return filteredEvents.value.filter(e => e.category === 'redirect' && !e.superseded).length
})

const coachingInsight = computed(() => {
  const grade = overallGrade.value
  const absences = stats.value.absences

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
    
    const config = behaviorCodesMap.value[e.code]
    if (config?.type === 'toggle' && !e.superseded) weeks[monday].washroom++
    else if (e.code === 'a' && !e.superseded) weeks[monday].absence++
    else if (e.code === 'l' && !e.superseded) weeks[monday].late++
  })
  
  // Sort by date
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
})

const attendanceAverages = computed(() => {
  const trend = behaviorWeeklyTrend.value
  
  // Determine actual divisor based on period
  let weekCount = 1
  if (selectedPeriod.value === 'month') weekCount = 4.3
  else if (selectedPeriod.value === 'all') weekCount = Math.max(1, trend.length)
  
  const totalAbs = stats.value.absences
  const totalLates = stats.value.lates
  const totalWash = washroomCount.value
  
  const totalLateMins = filteredEvents.value
    .filter(e => e.code === 'l' && !e.superseded)
    .reduce((acc, e) => acc + toMinutes(e.duration), 0)
    
  const totalWashMins = filteredEvents.value
    .filter(e => {
      const config = behaviorCodesMap.value[e.code]
      return config?.type === 'toggle' && !e.superseded
    })
    .reduce((acc, e) => acc + toMinutes(e.duration), 0)

  return {
    absencesAvg: (totalAbs / weekCount).toFixed(1),
    latesAvg: (totalLates / weekCount).toFixed(1),
    washroomAvg: (totalWash / weekCount).toFixed(1),
    latesTotal: totalLateMins,
    washroomTotal: totalWashMins,
    washroomMinsAvg: Math.round((totalWashMins / weekCount) * 2) / 2,
    washroomAvgPerVisit: totalWash ? Math.round((totalWashMins / totalWash) * 2) / 2 : 0,
    latesAvgDuration: totalLates ? Math.round((totalLateMins / totalLates) * 2) / 2 : 0
  }
})

async function handleDeleteHistoryItem(eventId) {
  if (await confirm('Are you sure you want to delete this entry? This will also update student statistics.', 'Delete Entry', { danger: true })) {
    await removeEvent(eventId)
  }
}

async function saveGeneralNote(note) {
  if (student.value.generalNote !== note) {
    await updateStudentNote(props.studentId, note)
  }
}

const localGeneralNote = ref('')
const localGradebookNote = ref('')

watch(() => student.value?.generalNote, (v) => { localGeneralNote.value = v || '' }, { immediate: true })
watch(() => student.value?.gradebookNote, (v) => { localGradebookNote.value = v || '' }, { immediate: true })

async function updateGeneralNoteLocal() {
  await saveGeneralNote(localGeneralNote.value.trim())
}
async function updateGradebookNoteLocal() {
  const note = localGradebookNote.value.trim()
  if (student.value.gradebookNote !== note) {
    await saveStudentGradebookNote(props.studentId, note)
  }
}

const isCopiedAnon = ref(false)
const isCopiedNamed = ref(false)

async function copyForReportCard(includeName = false) {
  const s = student.value
  const absences = stats.value.absences
  const lates = stats.value.lates
  
  const academicList = [...allDossierAssessments.value]
    .filter(a => a.score !== null && !a.excluded)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const classCode = activeClass.value?.courseCode ? ` (${activeClass.value.courseCode})` : ''
  const header = includeName
    ? `${s.firstName} ${s.lastName}${classCode} — Progress Summary`
    : `Student${classCode} — Progress Summary`

  const text = [
    header,
    `Current Grade: ${formattedGrade.value}`,
    `Attendance: ${absences} Absences, ${lates} Lates`,
    '',
    'Academic Record & Recent Progress:',
    ...academicList.map(a => {
      const date = new Date(a.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
      let line = `- ${date} - ${a.name}: ${Math.round((a.score / a.totalPoints) * 100)}%`
      if (a.attempts?.length > 1) {
        const history = a.attempts
          .map(att => Math.round((att.pointsEarned / a.totalPoints) * 100) + '%')
          .join(', ')
        line += ` (Attempts history: ${history})`
      }
      return line
    }),
    '',
    'Category Averages:',
    ...academicCategories.value.map(c => `- ${c.name}: ${c.score !== null ? Math.round(c.score) + '%' : 'N/A'}`),
    '',
    'Professional Judgment (Observations & Conversations):',
    ...(activeStudentEvents.value
      .filter(e => e.code === 'ac')
      .sort((a, b) => (b.ts || b.timestamp) - (a.ts || a.timestamp))
      .slice(0, 5)
      .map(e => {
        const date = new Date(e.ts || e.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
        const type = e.acType === 'observation' ? 'Obs' : 'Conv'
        const outcome = e.acOutcome ? ` [${e.acOutcome.replace(/_/g, ' ')}]` : ''
        return `- ${date} (${type}): ${e.note}${outcome}`
      })),
    activeStudentEvents.value.filter(e => e.code === 'ac').length === 0 ? '- No specific entries recorded.' : '',
    '',
    'Teacher Working Notes (Comment Ideas):',
    student.value.gradebookNote || 'None recorded.'
  ].join('\n')
  
  await navigator.clipboard.writeText(text)

  if (includeName) {
    isCopiedNamed.value = true
    setTimeout(() => isCopiedNamed.value = false, 2000)
  } else {
    isCopiedAnon.value = true
    setTimeout(() => isCopiedAnon.value = false, 2000)
  }
}

// ─── High-Fidelity Editing State ──────────────────────────────────────────────
const editingCell = ref(null) // { assessmentId }
const editInput = ref(null)
const editOriginalValue = ref(null)
const contextMenu = ref(null) // { x, y, assessmentId }
const attemptsPopover = ref(null) // { x, y, assessmentId }
const newAttemptForm = ref(null)

// ─── High-Fidelity Methods ────────────────────────────────────────────────────
function startEdit(assessmentId) {
  const g = gradeMap.value[assessmentId]?.[props.studentId]
  const val = g?.resolvedScore ?? null
  editingCell.value = { assessmentId }
  editOriginalValue.value = val
  editInput.value = val
  
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
      await alert('Cannot clear: This student has multiple attempts. Use the attempt history menu to manage specific entries.')
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
  
  // Note: High scores are allowed for bonus/scaling

  await enterGrade(assessmentId, props.studentId, points)
  
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
    
  if (!await confirm(`Are you sure you want to delete this ${typeLabel}?${warning}`, 'Delete Assessment', { danger: true })) {
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
  if (!await confirm('Are you sure you want to delete this attempt?', 'Delete Attempt', { danger: true })) return
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
  
  // Ensure the gradebook is loaded for the correct class context
  if (!activeClassRecord.value || activeClassRecord.value.classId !== props.classId) {
    const cls = classList.value.find(c => c.classId === props.classId) || await getClass(props.classId)
    if (cls) await loadGradebook(cls)
  }
  
  events.value = await getStudentEventHistory(props.studentId)
  await fetchAllTimeHistory(props.studentId)
  loading.value = false
}

watch(() => props.studentId, loadData)
watch(() => props.classId, loadData)

onMounted(() => {
  if (resetTimer) clearTimeout(resetTimer)
  loadData()
})

onUnmounted(() => {
  // If we unmount, start a timer to reset the tab.
  // If we remount quickly (switching students), the timer is cleared.
  resetTimer = setTimeout(() => {
    activeTab.value = 'summary'
    selectedPeriod.value = 'month'
  }, 100)
})
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
  overflow-x:    auto;
  scrollbar-width: none; /* Hide scrollbar Firefox */
}
.student-360__tabs::-webkit-scrollbar {
  display: none; /* Hide scrollbar Chrome/Safari */
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

@media (max-width: 1100px) {
  .student-360__tab-btn {
    padding: 12px 10px;
    gap: 4px;
    font-size: 0.85rem;
  }
}

.student-360__content {
  flex:     1;
  overflow: auto;
  padding:  24px;
}

@media (max-width: 1024px) {
  .student-360__content {
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .student-360__content {
    padding: 12px;
  }
}

.student-360__pane {
  display:        flex;
  flex-direction: column;
  gap:            16px;
}

.student-360__stats-grid {
  display:               grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap:                   12px;
}

@media (max-width: 800px) {
  .student-360__stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
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
  display:   flex;
  align-items: center;
  gap:       6px;
}

.profile-item__value--adult {
  color: #b45309; /* Amber/Dark Orange */
  font-weight: 700;
}

.adult-icon {
  color: #f59e0b; /* Bright Amber */
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

.student-360__gradebook-note {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid var(--border-color-light);
}

.profile-actions {
  margin-top: 12px;
}

.profile-actions__label {
  display:     flex;
  align-items: center;
  gap:         6px;
  font-size:   0.75rem;
  font-weight: 700;
  color:       var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.profile-actions__buttons {
  display: flex;
  gap: 10px;
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
  max-width: 220px;
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
  flex:            1;
  padding:         12px 16px;
  border:          none;
  border-radius:   var(--radius-lg);
  font-size:       0.875rem;
  font-weight:     700;
  cursor:          pointer;
  transition:      all 0.2s ease;
}

.btn-copy-report:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

/* Anonymous (no name) — subdued, privacy-forward */
.btn-copy-report--anon {
  background: var(--bg-secondary);
  color:      var(--text);
  border:     1.5px solid var(--border);
}

.btn-copy-report--anon:hover {
  background: var(--surface);
  border-color: var(--primary);
  color: var(--primary);
}

/* Named — primary CTA */
.btn-copy-report--named {
  background: var(--primary);
  color:      #fff;
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
.modal-body-content { padding: 0; display: flex; flex-direction: column; gap: 16px; }

.email-config-modal-body {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.absence-modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.absence-checkbox-container {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  transition: background 0.2s;
}

.absence-checkbox-container:hover {
  background: var(--bg-hover);
}

.absence-checkbox-container input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.checkbox-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
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

.student-360__action-btn,
.student-360__close-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.student-360__action-btn:hover,
.student-360__close-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
  border-color: var(--text-secondary);
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
/* (Replaced by global rules in main.css) */

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
  max-height: 500px; /* Cap overall preview container */
  display: flex;
  flex-direction: column;
}

@media (max-height: 800px) {
  .reports__print-preview-area { max-height: 350px; }
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
  height: auto; /* Allow dynamic height based on container */
  min-height: 300px;
  max-height: 450px;
  overflow-y: auto;
  background: #f1f5f9;
  padding: 30px;
  display: flex;
  justify-content: center;
}

@media (max-height: 800px) {
  .preview-content { 
    max-height: 300px;
    padding: 15px;
  }
}

.preview-content :deep(.progress-report),
.preview-content :deep(.attendance-report) {
  transform: scale(0.65);
  transform-origin: top center;
  margin-bottom: -150px; /* Offset the scale-down space */
  box-shadow: var(--shadow-lg);
}

.report-type-toggle {
  display: flex;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border);
  gap: 4px;
}

.reports__toggle-btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.reports__toggle-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.reports__toggle-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
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
/* History Tab Styles */
.student-360__pane--history {
  padding: 24px;
  overflow-y: auto;
}

.history-container {
  max-width: 800px;
  margin: 0 auto;
}

.history-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.history-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: var(--bg-hover);
  border-radius: var(--radius-xl);
  border: 2px dashed var(--border);
  color: var(--text-secondary);
  gap: 16px;
}

.history-empty-icon {
  opacity: 0.3;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: transform 0.2s ease;
}

.history-item:hover {
  transform: translateX(4px);
  border-color: var(--primary);
}

.history-item__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-term-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: 100px;
  width: fit-content;
}

.history-class-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.history-period {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.history-grade-pill {
  font-size: 1.25rem;
  font-weight: 800;
  color: white;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  min-width: 80px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.absence-form-inputs {
  display: flex;
  align-items: center;
  gap: 16px;
}

.absence-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
}

.absence-checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
}
</style>
