<template>
  <div class="grades">
    <div class="grades__layout">
      
      <StudentSidebar 
        v-if="selectedStudentId && !isLoading"
        :students="sortedRoster"
        :selected-student-id="selectedStudentId"
        :show-academics="true"
        :is-privacy-mode="isPrivacyMode"
        :class-grades="classGrades"
        :student-trends="studentTrends"
        :is-collapsed="isSidebarCollapsed"
        @select-student="showStudentDossier"
        @navigate="$emit('navigate', $event)"
        @toggle-privacy="isPrivacyMode = !isPrivacyMode"
        @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      />

      <!-- Main Panel -->
      <main class="grades__main">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="grades__loading">
          <div class="grades__spinner"></div>
          <p>Loading Gradebook...</p>
        </div>

        <!-- Placeholder states -->
        <div v-else-if="!sidebarClassId" class="grades__placeholder">
          <BarChart2 :size="48" class="grades__placeholder-icon" />
          <p>Select a class to view the gradebook</p>
        </div>
        <div v-else-if="selectedAssessmentId && currentAssessment" class="grades__assessment-view">
          <!-- Assessment View Header (Full Width) -->
          <div class="grades__view-header">
            <div class="grades__view-header-top">
              <nav class="grades__breadcrumb">
                <button class="grades__breadcrumb-link" @click="selectedAssessmentId = null">
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
                  <button class="grades__btn-action" title="Edit Assessment" @click="startEditAssessment(currentAssessment)">
                    <Edit2 :size="18" />
                  </button>
                  <button class="grades__btn-action" title="View Missing Students" @click="showMissingModal = true">
                    <UserMinus :size="18" />
                  </button>
                  <button class="grades__btn-action grades__btn-action--danger" title="Delete Assessment" @click="confirmDeleteAssessment(currentAssessment)">
                    <Trash2 :size="18" />
                  </button>
                  <div class="assessment-header__divider"></div>
                  <button class="grades__close-btn" @click="selectedAssessmentId = null" title="Close Assessment View">
                    <X :size="18" />
                  </button>
                </div>
              </div>
            </header>

            <!-- Description & At-Risk Strip -->
            <div v-if="currentAssessment.description || (currentAssessmentSummary && filteredStudents.length > 0)" class="assessment-header__sub-bar">
              <p v-if="currentAssessment.description" class="assessment-header__description">{{ currentAssessment.description }}</p>
              <div v-if="currentAssessmentSummary && filteredStudents.length > 0" class="assessment-header__at-risk">
                <AlertTriangle :size="14" />
                <span>{{ filteredStudents.length }} student{{ filteredStudents.length === 1 ? ' is' : 's are' }} marked for exclusion.</span>
              </div>
            </div>
          </div>

          <div class="grades__focused-view">
            <!-- Student List for Assessment (Premium Table) -->
            <!-- Student List for Assessment (Premium Table) -->
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
                          @click="showStudentDossier(s.studentId)"
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
                              <button class="grades__icon-btn grades__icon-btn--success" @click="saveNewAttempt">
                                <Check :size="16" />
                              </button>
                              <button class="grades__icon-btn" @click="newAttemptForm = null">
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
                              ref="editInput"
                              v-model.number="editingCell.value"
                              type="number"
                              min="0"
                              :max="currentAssessment.totalPoints"
                              class="grades__input-ghost grades__input-ghost--active"
                              @blur="saveEdit"
                              @keydown.enter.prevent="onEnterKey"
                              @keydown.tab.prevent="onEnterKey"
                              @keydown.up.prevent="onArrowKey('up')"
                              @keydown.down.prevent="onArrowKey('down')"
                              @keydown.esc.prevent="cancelEdit"
                            />
                          </div>
                          <template v-else>
                            <input 
                              type="number"
                              min="0"
                              :max="currentAssessment.totalPoints"
                              class="grades__input-ghost"
                              :value="gradeMap[selectedAssessmentId]?.[s.studentId]?.resolvedScore"
                              @blur="e => onAssessmentViewBlur(s.studentId, e.target.value)"
                              @keydown.enter.prevent="e => onAssessmentViewEnter(s.studentId, 'down', e)"
                              @keydown.tab.prevent="e => onAssessmentViewEnter(s.studentId, 'down', e)"
                              @keydown.up.prevent="e => onAssessmentViewEnter(s.studentId, 'up', e)"
                              @keydown.down.prevent="e => onAssessmentViewEnter(s.studentId, 'down', e)"
                              @contextmenu.prevent="onContextMenu($event, s.studentId, selectedAssessmentId)"
                            />
                            <div class="grades__cell-indicators" v-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.attempts?.length >= 1">
                              <div 
                                v-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.attempts?.length > 1"
                                class="grades__attempts-dot"
                                @click.stop="openAttempts($event, s.studentId, selectedAssessmentId)"
                                title="Multiple attempts - click to view history"
                              ></div>
                              <span
                                class="grades__comment-dot"
                                :class="{ 'grades__comment-dot--active': gradeMap[selectedAssessmentId]?.[s.studentId]?.attempts?.some(x => x.comment?.trim()) }"
                                @click.stop="openAttempts($event, s.studentId, selectedAssessmentId)"
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
                        <button class="grades__icon-btn" @click="onStudentActionMenu($event, s.studentId)">
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

        <div v-else-if="!selectedStudentId" class="grades__grid-container">
          <!-- Unified Toolbar -->
          <div v-if="activeClassRecord && !isLoading && !selectedAssessmentId" class="grades__toolbar">
            <div class="grades__toolbar-left">
              <button class="grades__btn-settings" title="Manage Gradebook" @click="$emit('navigate', 'Setup', { from: 'Grades', tab: 'gradebook' })">
                <Settings :size="20" />
              </button>
              
              <ClassSwitcher @navigate="$emit('navigate', $event)" />
            </div>

            <div class="grades__toolbar-center">
              <button v-if="!analyticsMode" class="grades__btn-add" @click="openAddAssessment('class')">
                <Plus :size="16" /> Add Assessment
              </button>
              
              <div class="grades__toggle-group">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': !analyticsMode }"
                  @click="exitAnalyticsMode"
                >Grid</button>
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': analyticsMode }"
                  @click="enterAnalyticsMode"
                >Analytics</button>
              </div>

              <div v-if="filteredMilestones?.length" class="grades__milestone-toggle">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': selectedMilestone === null }"
                  @click="selectedMilestone = null"
                >Current</button>
                <button 
                  v-for="m in filteredMilestones"
                  :key="m.milestoneId"
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': selectedMilestone === m.milestoneId }"
                  @click="selectedMilestone = m.milestoneId"
                >{{ m.name }}</button>
              </div>
            </div>

            <div class="grades__toolbar-right">
              <div v-if="!analyticsMode" class="grades__toggle-group" style="margin-right: 0.5rem;" title="Column Order">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': assessmentSortOrder === 'desc' }"
                  @click="assessmentSortOrder = 'desc'"
                >Newest</button>
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': assessmentSortOrder === 'asc' }"
                  @click="assessmentSortOrder = 'asc'"
                >Oldest</button>
              </div>
              <div v-if="!analyticsMode" class="grades__toggle-group">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': displayMode === 'raw' }"
                  @click="displayMode = 'raw'"
                >Raw</button>
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': displayMode === 'percent' }"
                  @click="displayMode = 'percent'"
                >%</button>
              </div>
              <div class="grades__class-avg-display">
                Class Avg: <span class="grades__avg-value">{{ formatGrade(overallClassAvg) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Analytics Panel (Step 2) -->
          <div v-if="analyticsMode" class="grades__analytics-panel">
            <!-- Outlier Toggle & Notice (Step 7) -->
            <div class="grades__analytics-header">
              <div v-if="exclusionMode !== 'none'" class="grades__outlier-notice" :title="excludedNames">
                <AlertCircle :size="16" />
                <span>Exclusion active: {{ classAnalytics?.outlierCount || 0 }} {{ classAnalytics?.outlierCount === 1 ? 'student' : 'students' }} hidden.</span>
              </div>
              <div class="grades__outlier-toggle">
                <span class="grades__toggle-label">Exclusion Filter:</span>
                <div class="grades__toggle-group">
                  <button 
                    class="grades__toggle-btn" 
                    :class="{ 'grades__toggle-btn--active': exclusionMode === 'none' }"
                    @click="setExclusionMode('none')"
                  >Include All</button>
                  <button 
                    class="grades__toggle-btn" 
                    :class="{ 'grades__toggle-btn--active': exclusionMode === 'fixed' }"
                    @click="setExclusionMode('fixed')"
                  >
                    <span v-if="exclusionMode !== 'fixed'">Below {{ fixedExclusionThreshold }}%</span>
                    <div v-else class="grades__threshold-editor">
                      Below <input 
                        type="number" 
                        v-model.number="fixedExclusionThreshold" 
                        @blur="refreshClassAnalytics"
                        @keyup.enter="refreshClassAnalytics"
                        class="grades__threshold-input"
                      />%
                    </div>
                  </button>
                  <button 
                    class="grades__toggle-btn" 
                    :class="{ 'grades__toggle-btn--active': exclusionMode === 'auto' }"
                    @click="setExclusionMode('auto')"
                  >Auto Outliers</button>
                </div>
              </div>
            </div>

            <!-- Category Weight Audit Warning -->
            <div v-if="isWeightWarningVisible" 
              class="grades__weight-warning"
              :class="categoryWeightTotal > 100 ? 'grades__weight-warning--over' : 'grades__weight-warning--under'">
              <AlertTriangle :size="16" />
              <span>Audit Note: Category weights sum to {{ categoryWeightTotal }}%. Averages will be scaled, but 100% is recommended for audit clarity.</span>
            </div>

            <!-- Overlay sits on top without removing content -->
            <div v-if="isCalculating" class="grades__calculating-overlay">
              <div class="grades__spinner"></div>
              <p>Calculating analytics...</p>
            </div>

            <!-- Empty state only if no data and NOT calculating -->
            <div v-if="!classAnalytics && !isCalculating" class="grades__empty-analytics">
              <div class="grades__empty-content">
                <BarChart2 :size="64" class="grades__empty-icon" />
                <h3>No analytics available yet.</h3>
                <p>Enter grades in the Grid view to see class performance data.</p>
                <button class="grades__btn-primary" @click="analyticsMode = false">
                  <ArrowLeft :size="16" /> Switch to Grid
                </button>
              </div>
            </div>

            <!-- Main content - always stays in DOM if it exists to preserve scroll -->
            <div v-if="classAnalytics" class="grades__analytics-scrollable">
              <div class="grades__analytics-sections">
                <!-- Class Overview Cards (Step 3) -->
                <div class="grades__analytics-row">
                  <div class="grades__analytics-card" :style="{ borderLeft: `4px solid ${getHeatColor(overallClassAvg)}` }">
                    <div class="grades__card-label">CLASS AVERAGE</div>
                    <div class="grades__card-value-group">
                      <div class="grades__card-value">{{ formatGrade(overallClassAvg) }}</div>
                      <div class="grades__card-hint">{{ formatGrade(classAnalytics.mean) }} products only</div>
                    </div>
                  </div>
                  <div class="grades__analytics-card" :style="{ borderLeft: `4px solid ${getHeatColor(overallClassMedian)}` }">
                    <div class="grades__card-label">WEIGHTED MEDIAN</div>
                    <div class="grades__card-value-group">
                      <div class="grades__card-value">{{ formatGrade(overallClassMedian) }}</div>
                      <div class="grades__card-hint">{{ formatGrade(classAnalytics.median) }} products only</div>
                    </div>
                  </div>
                  <div class="grades__analytics-card" :style="{ borderLeft: `4px solid ${getHeatColor(classMostConsistent?.range?.[0])}` }">
                    <div class="grades__card-label">MOST CONSISTENT</div>
                    <div v-if="classMostConsistent" class="grades__card-value-group">
                      <div class="grades__card-value">{{ classMostConsistent.label }}</div>
                      <div class="grades__card-hint">{{ classMostConsistent.count }} of {{ classMostConsistent.total }} students</div>
                    </div>
                    <div v-else class="grades__card-value">—</div>
                  </div>
                  <div class="grades__analytics-card" :style="{ borderLeft: `4px solid ${getSDColor(overallClassSD)}` }">
                    <div class="grades__card-label">STD DEVIATION</div>
                    <div class="grades__card-value-group">
                      <div class="grades__card-value">{{ overallClassSD !== null ? overallClassSD.toFixed(1) + '%' : '—' }}</div>
                      <div class="grades__card-hint">{{ classAnalytics.sd !== null ? classAnalytics.sd.toFixed(1) + '%' : '—' }} products only</div>
                    </div>
                  </div>
                </div>

                <!-- Evidence Blend / Triangulation (Step 4 Upgrade) -->
                <div class="grades__analytics-section">
                  <h3 class="grades__analytics-subtitle">TRIPLE EVIDENCE BLEND</h3>
                  
                  <div v-if="classEvidenceBlend" class="grades__blend-container">
                    <div class="grades__blend-bar">
                      <div 
                        class="grades__blend-segment grades__blend-segment--product" 
                        :style="{ width: classEvidenceBlend.product.percentage + '%' }"
                        :title="`Product: ${classEvidenceBlend.product.count} assessments (${classEvidenceBlend.product.percentage}%)`"
                      ></div>
                      <div 
                        class="grades__blend-segment grades__blend-segment--observation" 
                        :style="{ width: classEvidenceBlend.observation.percentage + '%' }"
                        :title="`Observation: ${classEvidenceBlend.observation.count} assessments (${classEvidenceBlend.observation.percentage}%)`"
                      ></div>
                      <div 
                        class="grades__blend-segment grades__blend-segment--conversation" 
                        :style="{ width: classEvidenceBlend.conversation.percentage + '%' }"
                        :title="`Conversation: ${classEvidenceBlend.conversation.count} assessments (${classEvidenceBlend.conversation.percentage}%)`"
                      ></div>
                    </div>
                    
                    <div class="grades__blend-legend">
                      <div class="grades__legend-item">
                        <span class="grades__legend-dot grades__legend-dot--product"></span>
                        <span class="grades__legend-text">Product: {{ classAnalytics.totalStudentCount }}/{{ classAnalytics.totalStudentCount }} students (100%)</span>
                      </div>
                      <div class="grades__legend-item">
                        <span class="grades__legend-dot grades__legend-dot--observation"></span>
                        <span class="grades__legend-text">Observation Coverage: {{ classAnalytics.observationCoverage.percentage }}%</span>
                      </div>
                      <div class="grades__legend-item">
                        <span class="grades__legend-dot grades__legend-dot--conversation"></span>
                        <span class="grades__legend-text">Conversation Coverage: {{ classAnalytics.conversationCoverage.percentage }}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <p class="grades__analytics-hint">Coverage shows the % of students with at least one entry for that evidence type.</p>
                </div>

                <!-- Grade Distribution Histogram (Step 5) -->
                <div class="grades__analytics-section">
                  <div class="grades__section-header-row">
                    <h3 class="grades__analytics-subtitle">PRODUCT GRADE DISTRIBUTION</h3>
                    <div class="grades__toggle-group">
                      <button 
                        class="grades__toggle-btn"
                        :class="{ 'grades__toggle-btn--active': distributionMode === 'buckets' }"
                        @click="distributionMode = 'buckets'"
                      >10% Buckets</button>
                      <button 
                        class="grades__toggle-btn"
                        :class="{ 'grades__toggle-btn--active': distributionMode === 'levels' }"
                        @click="distributionMode = 'levels'"
                      >Levels</button>
                    </div>
                  </div>
                  <div class="grades__chart-container" style="height: 200px;">
                    <Bar :data="bucketChartData" :options="bucketChartOptions" />
                  </div>
                  <p class="grades__analytics-hint">
                    {{ distributionMode === 'buckets' 
                        ? 'Number of students within each 10% grade bracket (Product assessments only).' 
                        : 'Student count by achievement level (Product assessments only).' }}
                  </p>
                </div>

                <!-- Per-Assessment Breakdowns (Grouped) -->
                <div class="grades__analytics-section">
                  <div class="grades__analytics-groups">
                    
                    <!-- Product Assessments Table -->
                    <div class="grades__analytics-group-box">
                      <h3 class="grades__analytics-subtitle">PRODUCT ASSESSMENTS BREAKDOWN</h3>
                      <div class="grades__analytics-table-wrapper">
                        <table class="grades__analytics-table">
                          <thead>
                            <tr>
                              <th @click="analyticsSortBy = 'name'; analyticsSortOrder = analyticsSortOrder === 'asc' ? 'desc' : 'asc'">
                                Assessment {{ analyticsSortBy === 'name' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                              </th>
                              <th>Category</th>
                              <th @click="analyticsSortBy = 'mean'; analyticsSortOrder = analyticsSortOrder === 'asc' ? 'desc' : 'asc'">
                                Avg {{ analyticsSortBy === 'mean' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                              </th>
                              <th @click="analyticsSortBy = 'median'; analyticsSortOrder = analyticsSortOrder === 'asc' ? 'desc' : 'asc'">
                                Med {{ analyticsSortBy === 'median' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                              </th>
                              <th @click="analyticsSortBy = 'sd'; analyticsSortOrder = analyticsSortOrder === 'asc' ? 'desc' : 'asc'">
                                SD {{ analyticsSortBy === 'sd' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                              </th>
                              <th>High</th>
                              <th>Low</th>
                              <th>Flag</th>
                              <th>Distribution</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="a in sortedProductAssessments" :key="a.assessmentId">
                              <td class="grades__td-assessment-name" :title="a.description || a.name" @click="selectedAssessmentId = a.assessmentId">
                                {{ a.name }}
                              </td>
                              <td>{{ getCategoryName(a.categoryId) }}</td>
                              <td :style="{ color: getHeatTextColor(a.stats.mean), fontWeight: 'bold' }">{{ formatGrade(a.stats.mean) }}</td>
                              <td>{{ formatGrade(a.stats.median) }}</td>
                              <td>{{ a.stats.sd !== null ? a.stats.sd.toFixed(1) + '%' : '—' }}</td>
                              <td>{{ formatGrade(a.stats.highest) }}</td>
                              <td>{{ formatGrade(a.stats.lowest) }}</td>
                              <td>
                                <div class="grades__flag-group">
                                  <span v-if="a.stats.calibrationFlag === 'too_hard'" class="grades__flag grades__flag--red" title="Too Hard / Calibration needed">🔴</span>
                                  <span v-else-if="a.stats.calibrationFlag === 'too_easy'" class="grades__flag grades__flag--amber" title="Too Easy / Calibration needed">🟡</span>
                                  <span v-else class="grades__flag grades__flag--green" title="Well calibrated">✓</span>
                                </div>
                              </td>
                              <td>
                                <div class="grades__sparkline" v-if="a.stats.distributionBuckets">
                                  <div 
                                    v-for="bucket in (distributionMode === 'buckets' ? a.stats.distributionBuckets : a.stats.levelBuckets)" 
                                    :key="bucket.label"
                                    class="grades__sparkline-bar"
                                    :style="{ 
                                      height: (bucket.count / a.stats.totalCount * 100) + '%',
                                      background: getHeatColorHex(bucket.range[0])
                                    }"
                                    :title="`${bucket.label}: ${bucket.count} students`"
                                  ></div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p v-if="!sortedProductAssessments.length" class="grades__analytics-hint">No product assessments found.</p>
                    </div>

                    <!-- Observation Assessments Table -->
                    <div v-if="sortedObservationAssessments.length" class="grades__analytics-group-box">
                      <h3 class="grades__analytics-subtitle">OBSERVATION LABS BREAKDOWN</h3>
                      <div class="grades__analytics-table-wrapper">
                        <table class="grades__analytics-table">
                          <thead>
                            <tr>
                              <th @click="analyticsSortBy = 'name'; analyticsSortOrder = analyticsSortOrder === 'asc' ? 'desc' : 'asc'">Observation Assessment</th>
                              <th>Avg</th>
                              <th>Med</th>
                              <th>SD</th>
                              <th>Distribution</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="a in sortedObservationAssessments" :key="a.assessmentId">
                              <td class="grades__td-assessment-name" @click="selectedAssessmentId = a.assessmentId">{{ a.name }}</td>
                              <td :style="{ color: getHeatTextColor(a.stats.mean), fontWeight: 'bold' }">{{ formatGrade(a.stats.mean) }}</td>
                              <td>{{ formatGrade(a.stats.median) }}</td>
                              <td>{{ a.stats.sd !== null ? a.stats.sd.toFixed(1) + '%' : '—' }}</td>
                              <td>
                                <div class="grades__sparkline" v-if="a.stats.distributionBuckets">
                                  <div 
                                    v-for="bucket in (distributionMode === 'buckets' ? a.stats.distributionBuckets : a.stats.levelBuckets)" 
                                    :key="bucket.label"
                                    class="grades__sparkline-bar"
                                    :style="{ 
                                      height: (bucket.count / a.stats.totalCount * 100) + '%',
                                      background: getHeatColorHex(bucket.range[0])
                                    }"
                                    :title="`${bucket.label}: ${bucket.count} students`"
                                  ></div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <!-- Conversation Assessments Table -->
                    <div v-if="sortedConversationAssessments.length" class="grades__analytics-group-box">
                      <h3 class="grades__analytics-subtitle">CONVERSATION ASSESSMENTS BREAKDOWN</h3>
                      <div class="grades__analytics-table-wrapper">
                        <table class="grades__analytics-table">
                          <thead>
                            <tr>
                              <th @click="analyticsSortBy = 'name'; analyticsSortOrder = analyticsSortOrder === 'asc' ? 'desc' : 'asc'">Conversation Assessment</th>
                              <th>Avg</th>
                              <th>Med</th>
                              <th>Coverage</th>
                              <th>Distribution</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="a in sortedConversationAssessments" :key="a.assessmentId">
                              <td class="grades__td-assessment-name" @click="selectedAssessmentId = a.assessmentId">{{ a.name }}</td>
                              <td :style="{ color: getHeatTextColor(a.stats.mean), fontWeight: 'bold' }">{{ formatGrade(a.stats.mean) }}</td>
                              <td>{{ formatGrade(a.stats.median) }}</td>
                              <td>{{ a.stats.totalCount }} Students</td>
                              <td>
                                <div class="grades__sparkline" v-if="a.stats.distributionBuckets">
                                  <div 
                                    v-for="bucket in (distributionMode === 'buckets' ? a.stats.distributionBuckets : a.stats.levelBuckets)" 
                                    :key="bucket.label"
                                    class="grades__sparkline-bar"
                                    :style="{ 
                                      height: (bucket.count / a.stats.totalCount * 100) + '%',
                                      background: getHeatColorHex(bucket.range[0])
                                    }"
                                    :title="`${bucket.label}: ${bucket.count} students`"
                                  ></div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>

                <!-- Student Exclusion (Step 8) -->
                <div class="grades__analytics-section">
                  <header class="grades__analytics-collapsible-header" @click="isExclusionsOpen = !isExclusionsOpen">
                    <h3 class="grades__analytics-subtitle">STUDENT EXCLUSIONS</h3>
                    <ChevronRight :size="20" :style="{ transform: isExclusionsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }" />
                  </header>
                  
                  <div v-if="isExclusionsOpen" class="grades__exclusion-list">
                    <p class="grades__analytics-hint">Students excluded here are permanently removed from all analytics calculations for this class. Their grades are unaffected.</p>
                    <div class="grades__exclusion-grid">
                      <div v-for="s in sortedRoster" :key="s.studentId" class="grades__exclusion-item">
                        <label class="grades__checkbox-label">
                          <input 
                            type="checkbox" 
                            :checked="s.excludeFromAnalytics" 
                            @change="toggleStudentFromAnalytics(s.studentId)"
                          />
                          {{ s.firstName }} {{ s.lastName }}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- The Scrollable Grid -->
          <div v-else class="grades__grid-wrapper">
            <table class="grades__grid">
              <thead>
                <!-- Top Header -->
                <tr>
                  <th class="grades__th-student">
                    <div class="grades__assessment-header">
                      <div class="grades__sort-header" @click="toggleGridSort('name')">
                        Student Name
                        <span v-if="gridSortBy === 'name'" class="grades__sort-icon">
                          <ChevronUp v-if="gridSortOrder === 'asc'" :size="14" />
                          <ChevronDown v-else :size="14" />
                        </span>
                      </div>
                      <button class="grades__header-menu-btn" @click.stop="onHeaderMenu($event, 'name')">
                        <MoreVertical :size="14" />
                      </button>
                    </div>
                  </th>
                  <th class="grades__th-overall">
                    <div class="grades__assessment-header">
                      <div class="grades__sort-header" @click="toggleGridSort('grade')">
                        Overall
                        <span v-if="gridSortBy === 'grade'" class="grades__sort-icon">
                          <ChevronUp v-if="gridSortOrder === 'asc'" :size="14" />
                          <ChevronDown v-else :size="14" />
                        </span>
                      </div>
                      <button class="grades__header-menu-btn" @click.stop="onHeaderMenu($event, 'grade')">
                        <MoreVertical :size="14" />
                      </button>
                    </div>
                  </th>
                  <th 
                    v-for="a in sortedAssessments" 
                    :key="a.assessmentId"
                    class="grades__th-assessment"
                  >
                    <div class="grades__assessment-header">
                      <div class="grades__assessment-info" @click="selectedAssessmentId = a.assessmentId">
                        <span class="grades__assessment-name" :title="a.description || a.name">
                          {{ a.name }}
                          <span v-if="gridSortBy == a.assessmentId" class="grades__sort-icon">
                            <ChevronUp v-if="gridSortOrder === 'asc'" :size="12" />
                            <ChevronDown v-else :size="12" />
                          </span>
                        </span>
                        <div class="grades__assessment-meta">
                          <span class="grades__assessment-points">/{{ a.totalPoints }}</span>
                          <span v-if="a.unitId" class="grades__assessment-unit">{{ getUnitName(a.unitId) }}</span>
                        </div>
                      </div>
                      <button class="grades__header-menu-btn" @click.stop="onHeaderMenu($event, 'assessment', a)">
                        <MoreVertical :size="14" />
                      </button>
                    </div>
                  </th>
                </tr>

                <!-- Class Avg Row (Sticky below headers) -->
                <tr class="grades__tr-avg">
                  <td class="grades__td-student">Class Average</td>
                  <td 
                    class="grades__td-overall grades__td-avg"
                    @click="toggleGridSort('grade')"
                    title="Sort by overall mark"
                  >
                    {{ formatGrade(overallClassAvg) }}
                  </td>
                  <td 
                    v-for="a in sortedAssessments" 
                    :key="a.assessmentId"
                    class="grades__td-assessment grades__td-avg"
                    @click="toggleGridSort(a.assessmentId)"
                    title="Sort by this assessment"
                  >
                    <div v-if="assessmentStats[a.assessmentId]">
                      {{ formatCellGrade(assessmentStats[a.assessmentId].average, a.totalPoints) }}
                    </div>
                  </td>
                </tr>
              </thead>
              
              <tbody>
                <tr v-for="student in sortedRoster" :key="student.studentId">
                  <td 
                    class="grades__td-student" 
                    :class="{ 'grades__td--highlighted': highlightedColumnId === 'name' }"
                    @click="showStudentDossier(student.studentId)"
                  >
                    <div class="grades__student-name-group">
                      <div class="grades__student-name-container">
                      <div class="grades__student-name">{{ student.lastName }}, {{ student.firstName }}</div>
                      <TestDayWarning 
                        v-if="studentAbsenceTotals[student.studentId]?.testDays >= 2" 
                        :count="studentAbsenceTotals[student.studentId].testDays" 
                      />
                    </div>
                      <div class="grades__sparkline-mini" v-if="studentTrends[student.studentId]?.length > 1 && !isPrivacyMode">
                        <svg width="80" height="14" viewBox="0 0 80 14">
                          <path
                            fill="none"
                            :stroke="getGradeColor(classGrades[student.studentId]?.overallGrade)"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :d="getSparklinePath(studentTrends[student.studentId], 80, 14)"
                          />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td 
                    class="grades__td-overall"
                    :class="{ 'grades__td--highlighted': highlightedColumnId === 'grade' }"
                    :style="{ background: getHeatColor(classGrades[student.studentId]?.overallGrade) }"
                  >
                    {{ formatGrade(classGrades[student.studentId]?.overallGrade) }}
                  </td>
                  <td 
                    v-for="a in sortedAssessments" 
                    :key="a.assessmentId"
                    class="grades__td-assessment"
                    :class="{ 'grades__td-assessment--highlighted': highlightedColumnId === a.assessmentId }"
                    :style="getCellStyle(student.studentId, a.assessmentId, a.totalPoints)"
                    @click="startEdit(student.studentId, a.assessmentId)"
                    @contextmenu.prevent="onContextMenu($event, student.studentId, a.assessmentId)"
                  >
                    <!-- Inline Editor -->
                    <div v-if="editingCell?.sId === student.studentId && editingCell?.aId === a.assessmentId" class="grades__cell-edit">
                      <input 
                        ref="editInput"
                        v-model.number="editingCell.value"
                        type="number"
                        min="0"
                        :max="a.totalPoints"
                        class="grades__input-inline"
                        @blur="saveEdit"
                        @keydown.enter.prevent="onEnterKey"
                        @keydown.tab.prevent="onEnterKey"
                        @keydown.up.prevent="onArrowKey('up')"
                        @keydown.down.prevent="onArrowKey('down')"
                        @keydown.esc.prevent="cancelEdit"
                      />
                    </div>

                    <div v-else-if="gradeMap[a.assessmentId]?.[student.studentId]" class="grades__cell-content">
                      <span v-if="gradeMap[a.assessmentId][student.studentId].missing" class="grades__cell-missing">M</span>
                      <span v-else-if="gradeMap[a.assessmentId][student.studentId].excluded" class="grades__cell-excluded">EX</span>
                      <span v-else-if="gradeMap[a.assessmentId][student.studentId].resolvedScore !== null">
                        {{ formatCellGrade(gradeMap[a.assessmentId][student.studentId].resolvedScore, a.totalPoints) }}
                      </span>
                      <span v-else class="grades__cell-placeholder">—</span>
                      
                      <!-- Absent on Test Day Dot -->
                      <div 
                        v-if="assessmentAbsenceMap[student.studentId]?.[a.assessmentId]" 
                        class="grades__cell-absent-dot" 
                        title="Student was marked absent on the date of this assessment"
                      ></div>
                      
                      <!-- Retest Indicator -->
                      <button 
                        v-if="gradeMap[a.assessmentId]?.[student.studentId]?.attempts?.length > 1" 
                        class="grades__cell-retest-btn"
                        title="View attempts"
                        @click.stop="openAttempts($event, student.studentId, a.assessmentId)"
                      >•</button>
                    </div>
                    <div v-else class="grades__cell-placeholder">—</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div> <!-- End grid-wrapper -->
        </div> <!-- End grid-container -->

        <div v-else class="grades__student-view">
          <Student360 
            :student-id="selectedStudentId" 
            :class-id="activeClass?.classId"
            @close="selectedStudentId = null"
          />
        </div>

        <!-- Shared Popovers & Context Menus -->


      </main>
    </div>

    <!-- Global Popovers & Context Menus (Placed at end of template for absolute layering) -->
    <div v-if="studentActionMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="studentActionMenu = null">
      <div class="grades__context-menu" :style="{ top: studentActionMenu.y + 'px', left: studentActionMenu.x + 'px' }">
        <button class="grades__context-btn" @click="toggleMissingFromView(studentActionMenu.studentId); studentActionMenu = null">
          <AlertCircle :size="14" /> {{ isMissing(studentActionMenu.studentId, selectedAssessmentId) ? 'Unmark Missing' : 'Mark Missing' }}
        </button>
        <button class="grades__context-btn" @click="toggleExcludedFromView(studentActionMenu.studentId); studentActionMenu = null">
          <XCircle :size="14" /> {{ isExcluded(studentActionMenu.studentId, selectedAssessmentId) ? 'Include in Grade' : 'Mark Excluded' }}
        </button>
        <button class="grades__context-btn" @click="openAttempts($event, studentActionMenu.studentId, selectedAssessmentId); studentActionMenu = null">
          <BarChart2 :size="14" /> View Attempt History
        </button>
        <button class="grades__context-btn" @click="startNewAttempt(studentActionMenu.studentId); studentActionMenu = null">
          <Plus :size="14" /> Add New Attempt
        </button>
      </div>
    </div>

    <div v-if="contextMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="contextMenu = null" @contextmenu.prevent="contextMenu = null">
      <div class="grades__context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <button class="grades__context-btn" @click="startEdit(contextMenu.sId, contextMenu.aId); contextMenu = null">
          <Plus :size="14" /> New Attempt
        </button>
        <button 
          v-if="gradeMap[contextMenu.aId]?.[contextMenu.sId]?.attempts?.length >= 1" 
          class="grades__context-btn" 
          @click="openAttemptsFromMenu($event, contextMenu.sId, contextMenu.aId)"
        >
          <Calendar :size="14" /> View Notes
        </button>
        <button class="grades__context-btn" @click="toggleMissing">
          <AlertCircle :size="14" /> {{ isMissing(contextMenu.sId, contextMenu.aId) ? 'Unmark Missing' : 'Mark Missing' }}
        </button>
        <button class="grades__context-btn" @click="toggleExcluded">
          <XCircle :size="14" /> {{ isExcluded(contextMenu.sId, contextMenu.aId) ? 'Include in Grade' : 'Mark Excluded' }}
        </button>
      </div>
    </div>

    <div v-if="headerMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="headerMenu = null" @contextmenu.prevent="headerMenu = null">
      <div class="grades__context-menu" :style="{ top: headerMenu.y + 'px', left: headerMenu.x + 'px' }">
        <template v-if="headerMenu.type === 'name'">
          <button class="grades__context-btn" @click="toggleGridSort('name'); headerMenu = null">
            <BarChart2 :size="14" /> Sort by Name
          </button>
          <button class="grades__context-btn" @click="copyStudentNames(); headerMenu = null">
            <Copy :size="14" /> Copy Names List
          </button>
        </template>

        <template v-if="headerMenu.type === 'grade'">
          <button class="grades__context-btn" @click="toggleGridSort('grade'); headerMenu = null">
            <BarChart2 :size="14" /> Sort by Grade
          </button>
          <button class="grades__context-btn" @click="copyOverallGrades(); headerMenu = null">
            <Copy :size="14" /> Copy Overall Marks
          </button>
        </template>

        <template v-if="headerMenu.type === 'assessment'">
          <button class="grades__context-btn" @click="toggleGridSort(headerMenu.assessment.assessmentId); headerMenu = null">
            <BarChart2 :size="14" /> Sort by Assessment
          </button>
          <button class="grades__context-btn" @click="startEditAssessment(headerMenu.assessment); headerMenu = null">
            <Pencil :size="14" /> Edit Assessment
          </button>
          <button class="grades__context-btn" @click="copyAssessmentGrades(headerMenu.assessment); headerMenu = null">
            <Copy :size="14" /> Copy Column (Scores)
          </button>
          <button class="grades__context-btn grades__context-btn--danger" @click="confirmDeleteAssessment(headerMenu.assessment); headerMenu = null">
            <Trash2 :size="14" /> Delete Assessment
          </button>
        </template>
      </div>
    </div>

    <div v-if="attemptsPopover" class="grades__context-backdrop grades__context-backdrop--dim" @click="attemptsPopover = null" @contextmenu.prevent="attemptsPopover = null">
      <div class="grades__attempts-popover" :style="{ top: attemptsPopover.y + 'px', left: attemptsPopover.x + 'px' }" @click.stop>
        <div class="grades__popover-header">
          <h4 class="grades__popover-title">Attempt History — {{ attemptsPopover.studentName }}</h4>
          <div class="grades__popover-subtitle">{{ attemptsPopover.assessmentName }} (/{{ attemptsPopover.totalPoints }}) · Policy: {{ attemptsPopover.retestPolicy }}</div>
        </div>
        <ul class="grades__attempts-list">
          <li v-for="att in attemptsPopover.attempts" :key="att.attemptId" class="grades__attempt-item" :class="{ 'grades__attempt-item--primary': att.isPrimary }">
            <div class="grades__attempt-main-row">
              <div class="grades__attempt-main">
                <div class="grades__attempt-info">
                  <span class="grades__attempt-score">{{ att.pointsEarned }} / {{ attemptsPopover.totalPoints }}</span>
                  <span class="grades__attempt-percent">({{ Math.round((att.pointsEarned / attemptsPopover.totalPoints) * 100) }}%)</span>
                  <span class="grades__attempt-date">{{ formatDateShort(att.date) }}</span>
                </div>
                <div class="grades__attempt-counting">
                  <template v-if="attemptsPopover.retestPolicy === 'manual'">
                    <input 
                      type="radio" 
                      :name="'primary-' + attemptsPopover.sId" 
                      :checked="att.isPrimary"
                      @change="onSetPrimary(att.attemptId)"
                    /> Primary
                  </template>
                  <template v-else>
                    <span v-if="att.pointsEarned === attemptsPopover.resolvedScore" class="grades__counting-badge">counting ✓</span>
                    <span v-else class="grades__not-counting-badge">not counting</span>
                  </template>
                </div>
              </div>
              <button class="grades__icon-btn grades__icon-btn--danger" @click="onDeleteAttempt(att.attemptId)">
                <Trash2 :size="14" />
              </button>
            </div>
            <textarea
              class="grades__attempt-comment"
              :value="att.comment || ''"
              placeholder="Add a note about this attempt…"
              rows="2"
              @change="onUpdateComment(att.attemptId, $event.target.value)"
            ></textarea>
          </li>
        </ul>
      </div>
    </div>

        <!-- Missing Students Modal -->
        <div v-if="showMissingModal && currentAssessment" class="grades__modal-backdrop">
          <div class="grades__modal" role="dialog" aria-modal="true">
            <header class="grades__modal-header">
              <h3 class="grades__modal-title">Incomplete & Missing: {{ currentAssessment.name }}</h3>
              <button class="grades__icon-btn" @click="showMissingModal = false"><X :size="20" /></button>
            </header>
            
            <div class="grades__modal-content" style="max-height: 400px; overflow-y: auto; padding: 0 1.5rem 1.5rem 1.5rem;">
              <table v-if="missingStudentsList.length > 0" style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                    <th style="padding: 12px 8px; font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Student</th>
                    <th style="padding: 12px 8px; font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                    <th style="padding: 12px 8px; font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="student in missingStudentsList" :key="student.studentId" style="border-bottom: 1px solid var(--border-color-light); transition: background-color 0.2s;">
                    <td style="padding: 12px 8px; font-weight: 500; font-size: 0.95rem;">{{ student.lastName }}, {{ student.firstName }}</td>
                    <td style="padding: 12px 8px;">
                      <span v-if="student.status === 'missing'" class="grades__cell-missing-badge">MISSING</span>
                      <span v-else class="grades__status-badge grades__status-badge--empty">Blank</span>
                    </td>
                    <td style="padding: 12px 8px; text-align: right;">
                       <button class="grades__btn-ghost" style="padding: 6px 12px; font-size: 0.85rem; background: var(--bg-secondary); border: 1px solid var(--border-color);" @click="toggleMissingFromModal(student.studentId)">
                         {{ student.status === 'missing' ? 'Unmark Missing' : 'Mark Missing' }}
                       </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-else style="padding: 3rem 1rem; text-align: center; color: var(--text-secondary); font-size: 1.1rem;">
                All students have a recorded score for this assessment!
              </div>
            </div>
            
            <div class="grades__modal-actions">
              <button type="button" class="grades__btn-ghost" @click="showMissingModal = false">Close</button>
            </div>
          </div>
        </div>

    </div>
</template>

<script setup>
/**
 * src/views/Grades.vue
 *
 * View D: Gradebook Dashboard (V4)
 * Two-column sidebar + main panel layout mirroring Reports.vue
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useClassroom } from '../composables/useClassroom.js'
import { 
  activeClassRecord, 
  assessments,
  grades,
  classGrades, 
  selectedMilestone,
  globalMilestones,
  filteredMilestones,
  gradeMap,
  assessmentStats,
  loadGradebook,
  clearGrade,
  markMissing,
  markExcluded,
  editAssessment,
  addAssessment,
  deleteAssessment,
  removeAttempt,
  setPrimaryAttempt,
  updateAttemptComment,
  refreshGrades,
  saveStudentOverride,
  saveStudentGradebookNote,
  saveStudentDemographics,
  analyticsMode,
  exclusionMode,
  fixedExclusionThreshold,
  classAnalytics,
  refreshClassAnalytics,
  setExclusionMode,
  toggleStudentFromAnalytics,
  resetAnalyticsState,
  distributionMode,
  showAddAssessmentModal,
  isEditingAssessment,
  currentAssessmentId,
  newAssessment,
  openAddAssessment,
  closeAddAssessment,
  onTargetChange,
  saveAssessment,
  assessmentTypes,
  sortedUnits,
  enterGrade
} from '../composables/useGradebook.js'
import { useAttendanceInsights } from '../composables/useAttendanceInsights.js'
import { Plus, BarChart2, Settings, Pencil, XCircle, AlertCircle, Trash2, X, MoreVertical, ArrowLeft, Check, ArrowUp, ArrowDown, Minus, GraduationCap, Eye, ChevronLeft, ChevronRight, UserCheck, Activity, FilePlus, Target, Hash, Calendar, AlertTriangle, ChevronUp, ChevronDown, Copy, Edit2, UserMinus } from 'lucide-vue-next'
import Student360 from '../components/dossier/Student360.vue'
import StudentSidebar from '../components/StudentSidebar.vue'
import GradeTrendChart from '../components/GradeTrendChart.vue'
import TestDayWarning from '../components/TestDayWarning.vue'
import { useMessage } from '../composables/useMessage.js'
import { getAssessmentPercentage } from '../db/gradebookService.js'
import { formatLocalDisplay } from '../utils/dates.js'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import ClassSwitcher from '../components/ClassSwitcher.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  classId: String,
  studentId: String
})

defineEmits(['navigate'])

const { alert, confirm } = useMessage()

const { classList, activeClass, getClass, switchClass } = useClassroom()
const sidebarClassId = ref(activeClass.value?.classId || '')
const { assessmentAbsenceMap, studentAbsenceTotals, attendanceCorrelationStats } = useAttendanceInsights(sidebarClassId, assessments, classGrades)

watch(activeClass, async (newVal, oldVal) => {
  if (newVal && newVal.classId !== oldVal?.classId) {
    sidebarClassId.value = newVal.classId
    selectedStudentId.value = null
    await onClassChange()
  }
})
const isLoading = ref(false)
const isCalculating = ref(false)
const displayMode = ref('percent') // 'raw' | 'percent'
const analyticsSortBy = ref('date')
const analyticsSortOrder = ref('asc')
const isExclusionsOpen = ref(false)

const editingCell = ref(null) // { sId, aId, value }
const editInput = ref(null)
const contextMenu = ref(null) // { x, y, sId, aId }
const attemptsPopover = ref(null) // { x, y, sId, aId, studentName, attempts, totalPoints }
const headerMenu = ref(null) // { x, y, type, assessment? }
const highlightedColumnId = ref(null) // assessmentId or 'name' or 'grade'
const editOriginalValue = ref(null)
const currentAssessmentIdLocal = null // Removed unused local ref
const selectedStudentId = ref(null)
const selectedAssessmentId = ref(null)
const studentActionMenu = ref(null) // { x, y, studentId }

function showStudentDossier(studentId) {
  selectedStudentId.value = studentId
  selectedAssessmentId.value = null
  analyticsMode.value = false
}
const newAttemptForm = ref(null) // { studentId, points, date, comment }
const isPrivacyMode = ref(false)
const isSidebarCollapsed = ref(false)
const gridSortBy = ref('name') // 'name' | 'grade'
const gridSortOrder = ref('asc') // 'asc' | 'desc'
const assessmentSortOrder = ref('desc') // 'desc' = Newest first, 'asc' = Oldest first
const showMissingModal = ref(false)

// Removed local assessmentTypes & newAssessmentLocal

watch(showAddAssessmentModal, (val) => {
  if (val) {
    if (!isEditingAssessment.value && activeClassRecord.value?.gradebookCategories?.length) {
      newAssessment.value.categoryId = activeClassRecord.value.gradebookCategories[0].categoryId
    }
  } else {
    // Reset is handled by closeAddAssessment in composable if needed, 
    // but here we align with old logic if it had specific sidebar resets
  }
})

/**
 * Bug Fix: Watch exclusionMode to ensure analytics are recalculated 
 * immediately when the toggle is flipped.
 */
watch(exclusionMode, async () => {
  if (analyticsMode.value) {
    isCalculating.value = true
    try {
      await refreshClassAnalytics()
    } finally {
      isCalculating.value = false
    }
  }
})

watch(fixedExclusionThreshold, async () => {
  if (analyticsMode.value && exclusionMode.value === 'fixed') {
    isCalculating.value = true
    try {
      await refreshClassAnalytics()
    } finally {
      isCalculating.value = false
    }
  }
})

function openAddIndividualAssessment() {
  openAddAssessment('individual', selectedStudentId.value)
}

// --- Sorting ---
const sortedClassList = computed(() => {
  return [...classList.value].sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0))
})

const filteredStudents = computed(() => {
  if (!activeClassRecord.value?.students) return []
  return Object.keys(activeClassRecord.value.students)
    .filter(id => activeClassRecord.value.students[id].excludeFromAnalytics && !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))
})

const sortedRoster = computed(() => {
  if (!activeClassRecord.value?.students) return []
  
  const students = Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ 
      studentId: id, 
      ...activeClassRecord.value.students[id],
      overallGrade: classGrades.value[id]?.overallGrade ?? -1
    }))

  return students.sort((a, b) => {
    if (gridSortBy.value === 'grade') {
      const gA = a.overallGrade
      const gB = b.overallGrade
      return gridSortOrder.value === 'asc' ? gA - gB : gB - gA
    } else if (gridSortBy.value !== 'name') {
      // Sort by Assessment ID
      const aId = gridSortBy.value
      const gradeA = gradeMap.value[aId]?.[a.studentId]
      const gradeB = gradeMap.value[aId]?.[b.studentId]
      
      // Treat missing as 0, excluded as very low/bottom (-1), non-existent as -1
      const getVal = (g) => {
        if (!g) return -1
        if (g.excluded) return -1
        if (g.missing) return 0
        return g.resolvedScore ?? -1
      }
      
      const valA = getVal(gradeA)
      const valB = getVal(gradeB)
      
      return gridSortOrder.value === 'asc' ? valA - valB : valB - valA
    }
    
    const nameA = a.lastName.toLowerCase()
    const nameB = b.lastName.toLowerCase()
    if (gridSortOrder.value === 'asc') return nameA.localeCompare(nameB)
    return nameB.localeCompare(nameA)
  })
})

const studentTrends = computed(() => {
  if (!activeClassRecord.value?.students || !assessments.value || !gradeMap.value) return {}
  
  const productAssessments = [...assessments.value]
    .filter(a => a.assessmentType === 'product' && !a.excluded && a.target !== 'individual')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    
  if (productAssessments.length === 0) return {}
  
  const trends = {}
  Object.keys(activeClassRecord.value.students).forEach(studentId => {
    if (activeClassRecord.value.students[studentId].archived) return
    const data = []
    productAssessments.forEach(a => {
      const grade = gradeMap.value[a.assessmentId]?.[studentId]
      const percentage = getAssessmentPercentage(a, grade)
      if (percentage !== null) {
        data.push(percentage)
      }
    })
    trends[studentId] = data
  })
  
  return trends
})

const studentCorrelationAlert = computed(() => {
  const studentId = selectedStudentId.value
  const stats = studentAbsenceTotals.value[studentId]
  if (!studentId || !stats) return null

  const grade = classGrades.value[studentId]?.overallGrade

  // Alert if grade < 70% and absences >= 3
  if (grade !== null && grade < 70 && stats.absences >= 3) {
    return {
      type: 'warning',
      title: 'Coaching Insight: Attendance Correlation',
      message: `This student's current mark (${Math.round(grade)}%) may be impacted by their ${stats.absences} absences.`,
      recommendation: 'Recommend a 1-on-1 to discuss missed instruction and catch-up opportunities.'
    }
  }
  return null
})

function getSparklinePath(data, width, height) {
  if (!data || data.length < 2) return ""
  const xStep = width / (data.length - 1)
  const points = data.map((val, i) => {
    const x = i * xStep
    const y = height - (val / 100) * height
    return { x, y }
  })

  // Simple quadratic curve interpolation
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const midX = (p0.x + p1.x) / 2
    d += ` Q ${p0.x} ${p0.y}, ${midX} ${(p0.y + p1.y) / 2}`
    if (i === points.length - 2) {
      d += ` T ${p1.x} ${p1.y}`
    }
  }
  return d
}


const studentEvidenceBalance = computed(() => {
  if (!selectedStudentId.value || !activeClassRecord.value) return null
  
  const studentGrades = grades.value.filter(g => g.studentId === selectedStudentId.value)
  const counts = { product: 0, conversation: 0, observation: 0 }
  let total = 0
  
  for (const grade of studentGrades) {
    const assessment = assessments.value.find(a => Number(a.assessmentId) === Number(grade.assessmentId))
    if (!assessment) continue
    if (assessment.excluded || grade.excluded || grade.missing) continue
    if (!grade.attempts || grade.attempts.length === 0) continue
    
    const type = (assessment.assessmentType || 'product').toLowerCase()
    if (counts[type] !== undefined) {
      counts[type]++
      total++
    }
  }
  
  if (total === 0) return null
  
  return {
    total,
    product: Math.round((counts.product / total) * 100),
    conversation: Math.round((counts.conversation / total) * 100),
    observation: Math.round((counts.observation / total) * 100)
  }
})

const selectedStudentName = computed(() => {
  if (!selectedStudentId.value || !activeClassRecord.value?.students) return ''
  const s = activeClassRecord.value.students[selectedStudentId.value]
  return `${s.firstName} ${s.lastName}`
})

const sortedAssessments = computed(() => {
  return [...assessments.value]
    .filter(a => a.target !== 'individual')
    .sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date)
      return assessmentSortOrder.value === 'asc' ? diff : -diff
    })
})

const individualStudentAssessments = computed(() => {
  if (!selectedStudentId.value || !assessments.value) return []
  return assessments.value
    .filter(a => a.target === 'individual' && a.targetStudentId === selectedStudentId.value)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(a => {
      const g = gradeMap.value[a.assessmentId]?.[selectedStudentId.value]
      return {
        ...a,
        resolvedScore: g?.resolvedScore ?? null,
        missing: g?.missing,
        excluded: g?.excluded
      }
    })
})

const currentAssessment = computed(() => {
  if (!selectedAssessmentId.value) return null
  return assessments.value.find(a => a.assessmentId === selectedAssessmentId.value)
})

const categoryWeightTotal = computed(() => {
  if (!activeClassRecord.value?.gradebookCategories) return 0
  return activeClassRecord.value.gradebookCategories.reduce((sum, cat) => sum + (cat.weight || 0), 0)
})

const isWeightWarningVisible = computed(() => {
  return categoryWeightTotal.value !== 100
})

const missingStudentsList = computed(() => {
  if (!currentAssessment.value || !activeClassRecord.value?.students) return []
  const list = []
  for (const student of sortedRoster.value) {
    const grade = gradeMap.value[currentAssessment.value.assessmentId]?.[student.studentId]
    if (grade?.excluded) continue
    if (!grade || (!grade.missing && (!grade.attempts || grade.attempts.length === 0))) {
      list.push({ ...student, status: 'blank' })
    } else if (grade.missing) {
      list.push({ ...student, status: 'missing' })
    }
  }
  return list
})

async function toggleMissingFromModal(studentId) {
  const current = isMissing(studentId, currentAssessment.value.assessmentId)
  await markMissing(currentAssessment.value.assessmentId, studentId, !current)
}

const currentAssessmentSummary = computed(() => {
  if (!selectedAssessmentId.value || !currentAssessment.value) return null
  const stats = assessmentStats.value[selectedAssessmentId.value]
  
  // Calculate progress
  const totalStudents = sortedRoster.value.length
  const enteredCount = sortedRoster.value.filter(s => {
    const grade = gradeMap.value[selectedAssessmentId.value]?.[s.studentId]
    return grade && (grade.attempts?.length > 0 || grade.missing || grade.excluded)
  }).length

  return {
    ...stats,
    enteredCount,
    totalStudents,
    percentEntered: totalStudents > 0 ? (enteredCount / totalStudents) * 100 : 0
  }
})

/**
 * Step 6: Typed Assessment Analytics (Split by Product, Observation, Conversation)
 */
const sortedProductAssessments = computed(() => {
  if (!classAnalytics.value?.productAnalytics) return []
  return processTypedAssessments(classAnalytics.value.productAnalytics)
})

const sortedObservationAssessments = computed(() => {
  if (!classAnalytics.value?.observationAnalytics) return []
  return processTypedAssessments(classAnalytics.value.observationAnalytics)
})

const sortedConversationAssessments = computed(() => {
  if (!classAnalytics.value?.conversationAnalytics) return []
  return processTypedAssessments(classAnalytics.value.conversationAnalytics)
})

function processTypedAssessments(analyticsMap) {
  return assessments.value
    .filter(a => analyticsMap[a.assessmentId])
    .map(a => ({
      ...a,
      stats: analyticsMap[a.assessmentId]
    }))
    .sort((a, b) => {
      let valA = analyticsSortBy.value === 'name' ? a.name : a.stats[analyticsSortBy.value]
      let valB = analyticsSortBy.value === 'name' ? b.name : b.stats[analyticsSortBy.value]
      
      if (analyticsSortBy.value === 'date') {
        valA = new Date(a.date)
        valB = new Date(b.date)
      }
      
      if (valA < valB) return analyticsSortOrder.value === 'asc' ? -1 : 1
      if (valA > valB) return analyticsSortOrder.value === 'asc' ? 1 : -1
      return 0
    })
}

/**
 * Calculates the class-wide "Evidence Blend" ratio
 */
const classEvidenceBlend = computed(() => {
  if (!classAnalytics.value || !assessments.value) return null
  
  const productCount = Object.keys(classAnalytics.value.productAnalytics || {}).length
  const observationCount = Object.keys(classAnalytics.value.observationAnalytics || {}).length
  const conversationCount = Object.keys(classAnalytics.value.conversationAnalytics || {}).length
  
  const total = productCount + observationCount + conversationCount
  if (total === 0) return null
  
  return {
    total,
    product: { 
      percentage: Math.round((productCount / total) * 100),
      count: productCount
    },
    observation: { 
      percentage: Math.round((observationCount / total) * 100),
      count: observationCount
    },
    conversation: { 
      percentage: Math.round((conversationCount / total) * 100),
      count: conversationCount
    }
  }
})

const filteredClassGrades = computed(() => {
  if (!classGrades.value) return {}
  
  // 1. Manual Exclusions (tracked in classRecord)
  const manualExcludes = new Set(
    Object.keys(activeClassRecord.value?.students ?? {})
      .filter(id => activeClassRecord.value.students[id].excludeFromAnalytics)
  )

  // 2. Filtered IDs from Analytics
  const isToggleActive = exclusionMode.value !== 'none' && classAnalytics.value?.outlierStudentIds
  const outlierIds = isToggleActive ? new Set(classAnalytics.value.outlierStudentIds) : new Set()

  const filtered = {}
  Object.keys(classGrades.value).forEach(studentId => {
    // Skip if in either exclusion list
    if (!manualExcludes.has(studentId) && !outlierIds.has(studentId)) {
      filtered[studentId] = classGrades.value[studentId]
    }
  })
  return filtered
})

const excludedNames = computed(() => {
  if (!classAnalytics.value?.outlierStudentIds?.length) return ''
  const names = classAnalytics.value.outlierStudentIds
    .map(id => {
      const s = activeClassRecord.value?.students[id]
      return s ? `${s.firstName} ${s.lastName}` : 'Unknown Student'
    })
  return 'Hidden students: ' + names.join(', ')
})

const overallClassAvg = computed(() => {
  const grades = Object.values(filteredClassGrades.value)
    .filter(g => g && g.overallGrade !== null)
    .map(g => g.overallGrade)
  
  if (grades.length === 0) return null
  const sum = grades.reduce((acc, g) => acc + g, 0)
  return sum / grades.length
})

const overallClassMedian = computed(() => {
  const grades = Object.values(filteredClassGrades.value)
    .filter(g => g && g.overallGrade !== null)
    .map(g => g.overallGrade)
  
  if (grades.length === 0) return null
  const sorted = [...grades].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
})

const overallClassSD = computed(() => {
  const grades = Object.values(filteredClassGrades.value)
    .filter(g => g && g.overallGrade !== null)
    .map(g => g.overallGrade)
  
  if (grades.length === 0) return null
  const mean = overallClassAvg.value
  const squareDiffs = grades.map(v => Math.pow(v - mean, 2))
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / (grades.length - 1)
  return Math.sqrt(avgSquareDiff)
})

/**
 * Step 5: Grade Distribution Chart Data
 */
const bucketChartData = computed(() => {
  if (!classAnalytics.value) return { labels: [], datasets: [] }
  
  const buckets = distributionMode.value === 'buckets' 
    ? classAnalytics.value.distributionBuckets 
    : classAnalytics.value.levelBuckets

  if (!buckets) return { labels: [], datasets: [] }
  
  return {
    labels: buckets.map(b => b.label),
    datasets: [
      {
        label: 'Students',
        backgroundColor: buckets.map(b => getHeatColorHex(b.range[0])),
        data: buckets.map(b => b.count),
        borderRadius: 4
      }
    ]
  }
})

const bucketChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `${context.parsed.y} students`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 },
      grid: { color: 'rgba(0, 0, 0, 0.05)' }
    },
    x: {
      grid: { display: false }
    }
  }
}


/**
 * Step 3: Rollup of most consistent level across class
 */
const classMostConsistent = computed(() => {
  const dataset = Object.values(filteredClassGrades.value)
  if (dataset.length === 0) return null
  
  const bucketCounts = {} // label -> count
  const bucketRanges = {} // label -> range
  
  dataset.forEach(sg => {
    const mc = sg?.mostConsistent
    if (mc && mc.percentage !== undefined && mc.percentage !== null) {
      const p = mc.percentage
      const idx = p >= 100 ? 9 : Math.floor(p / 10)
      const label = `${idx * 10}-${idx * 10 + 9}%`
      const range = [idx * 10, idx * 10 + 9]

      bucketCounts[label] = (bucketCounts[label] || 0) + 1
      if (!bucketRanges[label]) {
        bucketRanges[label] = range
      }
    }
  })
  
  const sorted = Object.entries(bucketCounts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null
  
  const [label, count] = sorted[0]
  return {
    label,
    count,
    range: bucketRanges[label],
    total: dataset.length
  }
})

function getHeatColorHex(percent) {
  if (percent === null || percent === undefined) return '#6c757d'
  if (percent >= 80) return '#d4edda' // High (Green)
  if (percent >= 70) return '#d0e8f5' // Mid-High (Blue)
  if (percent >= 60) return '#fff3cd' // Mid-Low (Amber)
  return '#f8d7da' // Low (Red)
}

function getSDColor(sd) {
  if (sd === null) return 'var(--text-secondary)'
  if (sd < 5) return '#15803d'   // Dark Green
  if (sd <= 12) return '#1d4ed8' // Dark Blue
  if (sd <= 18) return '#b45309' // Dark Amber
  return '#b91c1c'               // Dark Red
}

function getCoverageColor(percent) {
  if (percent >= 80) return 'var(--grade-high)'
  if (percent >= 50) return 'var(--grade-mid-high)'
  return 'var(--grade-mid-low)'
}




function toggleGridSort(column) {
  if (gridSortBy.value === column) {
    gridSortOrder.value = gridSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    gridSortBy.value = column
    // Default to descending for grades and assessments, ascending for name
    gridSortOrder.value = (column === 'grade' || column !== 'name') ? 'desc' : 'asc'
  }
}

// --- Methods ---
async function onClassChange() {
  if (!sidebarClassId.value) return
  
  isLoading.value = true
  try {
    const cls = await getClass(sidebarClassId.value)
    if (cls) {
      await loadGradebook(cls)
    }
  } finally {
    isLoading.value = false
  }
}

async function onSidebarClassChange() {
  if (sidebarClassId.value) {
    await switchClass(sidebarClassId.value)
  }
}

/**
 * Step 1: Analytics Mode Toggles
 */
async function enterAnalyticsMode() {
  selectedStudentId.value = null // Sidebar logic: hidden when no student
  analyticsMode.value = true
  isCalculating.value = true
  try {
    await refreshClassAnalytics()
  } finally {
    isCalculating.value = false
  }
}

function exitAnalyticsMode() {
  resetAnalyticsState()
}

const getCategoryName = (categoryId) => {
  return activeClassRecord.value?.gradebookCategories
    .find(c => c.categoryId === categoryId)?.name ?? '—'
}

const getUnitName = (unitId) => {
  return activeClassRecord.value?.gradebookUnits
    ?.find(u => u.unitId === unitId)?.name ?? '—'
}

function formatGrade(grade) {
  if (grade === null || grade === undefined) return '—'
  return Math.round(grade * 10) / 10 + '%'
}

function formatDateShort(dateStr) {
  return formatLocalDisplay(dateStr)
}

function formatCellGrade(value, totalPoints) {
  if (value === null || value === undefined) return '—'
  if (displayMode.value === 'raw') {
    return Math.round(value * 10) / 10
  }
  return Math.round((value / totalPoints) * 1000) / 10 + '%'
}

function getCellStyle(studentId, assessmentId, totalPoints) {
  const grade = gradeMap.value[assessmentId]?.[studentId]
  if (!grade) return {}
  
  if (grade.missing) return { background: 'rgba(192, 57, 43, 0.1)', color: '#c0392b' }
  if (grade.excluded) return { background: 'var(--bg-secondary)', opacity: 0.6, textDecoration: 'line-through' }
  
  const score = grade.resolvedScore
  if (score === null || score === undefined) return {}
  
  const percent = (score / totalPoints) * 100
  if (percent >= 80) return { background: 'var(--grade-high)' }
  if (percent >= 70) return { background: 'var(--grade-mid-high)' }
  if (percent >= 60) return { background: 'var(--grade-mid-low)' }
  return { background: 'var(--grade-low)' }
}

function getGradeColor(grade) {
  if (grade === null || grade === undefined) return 'var(--text-secondary)'
  if (grade >= 80) return '#1a6b3a' // muted green
  if (grade >= 70) return '#1a5276' // muted blue
  if (grade >= 60) return '#7d6608' // muted amber
  return '#c0392b' // muted red
}

function getHeatColor(percent) {
  if (percent === null || percent === undefined) return 'var(--bg-secondary)'
  if (percent >= 80) return 'var(--grade-high)'
  if (percent >= 70) return 'var(--grade-mid-high)'
  if (percent >= 60) return 'var(--grade-mid-low)'
  return 'var(--grade-low)'
}

function getHeatTextColor(percent) {
  if (percent === null || percent === undefined) return 'var(--text-secondary)'
  if (percent >= 80) return '#15803d' // Dark Green
  if (percent >= 70) return '#1d4ed8' // Dark Blue
  if (percent >= 60) return '#b45309' // Dark Amber
  return '#b91c1c'               // Dark Red
}

async function startEdit(studentId, assessmentId) {
  const current = gradeMap.value[assessmentId]?.[studentId]
  const val = current ? current.resolvedScore : null
  editOriginalValue.value = val
  editingCell.value = {
    sId: studentId,
    aId: assessmentId,
    value: val
  }
  
  // Focus on next tick
  setTimeout(() => {
    if (editInput.value?.[0]) editInput.value[0].focus()
  }, 0)
}

function cancelEdit() {
  editingCell.value = null
}

async function saveEdit() {
  if (!editingCell.value) return
  const { sId, aId, value } = editingCell.value
  
  // Normalize values
  const normalizedNew = (value === null || value === undefined || value === '') ? null : Number(value)
  const normalizedOld = (editOriginalValue.value === null || editOriginalValue.value === undefined || editOriginalValue.value === '') ? null : Number(editOriginalValue.value)

  if (normalizedNew === normalizedOld) {
    editingCell.value = null
    return
  }

  // If new value is null (cleared), call clearGrade
  if (normalizedNew === null) {
    const grade = gradeMap.value[aId]?.[sId]
    const hasMultipleAttempts = grade?.attempts?.length > 1

    if (hasMultipleAttempts) {
      await alert('Cannot clear: This student has multiple attempts. Use the attempt history menu (•) to manage or delete specific entries.')
      editingCell.value = null
      return
    }

    await clearGrade(aId, sId)
    editingCell.value = null
    return
  }

  const assessment = assessments.value.find(a => a.assessmentId === aId)
  if (!assessment) return

  // Score validation (Safety guard)
  const points = Math.max(0, normalizedNew)
  
  // Note: High scores (> max) are allowed for bonus marks and manual scaling
  
  await enterGrade(aId, sId, points)
  editingCell.value = null
}

async function onEnterKey() {
  await onArrowKey('down')
}

async function onArrowKey(direction) {
  if (!editingCell.value) return
  const { sId, aId } = editingCell.value
  await saveEdit()
  
  if (selectedStudentId.value) {
    // Dossier Mode: Navigate vertical (assessments)
    // We'll combine them for navigation ease, though they are in separate tables
    const combined = [...filteredStudentAssessments.value, ...individualStudentAssessments.value]
    const currentIndex = combined.findIndex(a => a.assessmentId === aId)
    if (direction === 'up' && currentIndex > 0) {
      startEdit(sId, combined[currentIndex - 1].assessmentId)
    } else if (direction === 'down' && currentIndex < combined.length - 1) {
      startEdit(sId, combined[currentIndex + 1].assessmentId)
    }
  } else {
    // Grid Mode: Navigate vertical (students)
    const currentIndex = sortedRoster.value.findIndex(s => s.studentId === sId)
    if (direction === 'up' && currentIndex > 0) {
      const prevStudent = sortedRoster.value[currentIndex - 1]
      startEdit(prevStudent.studentId, aId)
    } else if (direction === 'down' && currentIndex < sortedRoster.value.length - 1) {
      const nextStudent = sortedRoster.value[currentIndex + 1]
      startEdit(nextStudent.studentId, aId)
    }
  }
}

// --- Context Menu ---
function getAdjustedPosition(e, width, height) {
  let x = e.clientX - width / 2
  let y = e.clientY + 10

  if (x < 10) x = 10
  if (x + width > window.innerWidth - 10) x = window.innerWidth - width - 10

  if (y + height > window.innerHeight - 10) {
    y = Math.max(10, e.clientY - height - 10)
  }

  return { x, y }
}

function onContextMenu(e, studentId, assessmentId) {
  const { x, y } = getAdjustedPosition(e, 160, 150)
  contextMenu.value = {
    x, y,
    sId: studentId,
    aId: assessmentId
  }
}

function openAttemptsFromMenu(e, studentId, assessmentId) {
  const x = contextMenu.value?.x || e.clientX
  const y = contextMenu.value?.y || e.clientY
  contextMenu.value = null // Close context menu
  
  const sId = String(studentId)
  const aId = Number(assessmentId)
  const grade = gradeMap.value[aId]?.[sId] || gradeMap.value[String(aId)]?.[sId]
  const student = activeClassRecord.value?.students?.[sId]
  const assessment = assessments.value.find(a => a.assessmentId === aId)
  
  if (grade && student && assessment) {
    attemptsPopover.value = {
      x, y,
      sId, aId,
      studentName: `${student.firstName} ${student.lastName}`,
      assessmentName: assessment.name,
      retestPolicy: assessment.retestPolicy || 'highest',
      attempts: grade.attempts || [],
      totalPoints: assessment.totalPoints,
      resolvedScore: grade.resolvedScore
    }
  }
}

function isMissing(sId, aId) {
  return gradeMap.value[aId]?.[sId]?.missing
}

function isExcluded(sId, aId) {
  return gradeMap.value[aId]?.[sId]?.excluded
}

async function toggleMissing() {
  if (!contextMenu.value) return
  const { sId, aId } = contextMenu.value
  const current = isMissing(sId, aId)
  await markMissing(aId, sId, !current)
  contextMenu.value = null
}

async function toggleExcluded() {
  if (!contextMenu.value) return
  const { sId, aId } = contextMenu.value
  const current = isExcluded(sId, aId)
  await markExcluded(aId, sId, !current)
  contextMenu.value = null
}

function onEditAssessment(assessment) {
  startEditAssessment(assessment)
}

function onHeaderMenu(e, type, assessment = null) {
  const { x, y } = getAdjustedPosition(e, 180, 120)
  headerMenu.value = {
    x, y,
    type,
    assessment
  }
}

function startEditAssessment(assessment) {
  isEditingAssessment.value = true
  currentAssessmentId.value = assessment.assessmentId
  
  newAssessment.value = {
    name: assessment.name,
    description: assessment.description || '',
    categoryId: assessment.categoryId,
    assessmentType: assessment.assessmentType,
    unitId: assessment.unitId || null,
    target: assessment.target || 'class',
    targetStudentId: assessment.targetStudentId || null,
    date: assessment.date,
    totalPoints: assessment.totalPoints,
    scaledTotal: assessment.scaledTotal,
    retestPolicy: assessment.retestPolicy || 'highest'
  }
  
  showAddAssessmentModal.value = true
}

async function confirmDeleteAssessment(assessment) {
  if (!await confirm(`Delete ${assessment.name}? This will permanently remove all grades for this assessment and cannot be undone.`, 'Delete Assessment', { danger: true })) return
  
  await deleteAssessment(assessment.assessmentId)
}

function copyStudentNames() {
  const text = sortedRoster.value.map(s => `${s.lastName}, ${s.firstName}`).join("\n")
  navigator.clipboard.writeText(text).then(() => {
    highlightedColumnId.value = 'name'
    setTimeout(() => { highlightedColumnId.value = null }, 1500)
  })
}

function copyOverallGrades() {
  const text = sortedRoster.value.map(s => {
    const grade = classGrades.value[s.studentId]?.overallGrade
    return grade !== undefined ? formatGrade(grade).replace('%', '') : ""
  }).join("\n")
  
  navigator.clipboard.writeText(text).then(() => {
    highlightedColumnId.value = 'grade'
    setTimeout(() => { highlightedColumnId.value = null }, 1500)
  })
}

function copyAssessmentGrades(assessment) {
  if (!assessment) return
  
  const assessmentId = assessment.assessmentId
  const totalPoints = assessment.totalPoints
  
  const text = sortedRoster.value.map(student => {
    const grade = gradeMap.value[assessmentId]?.[student.studentId]
    if (!grade) return ""
    if (grade.missing) return "Missing"
    if (grade.excluded) return "Excluded"
    if (grade.resolvedScore === null || grade.resolvedScore === undefined) return ""
    
    // Format based on current display mode
    if (displayMode.value === 'raw') {
      return Math.round(grade.resolvedScore * 10) / 10
    }
    return Math.round((grade.resolvedScore / totalPoints) * 100)
  }).join("\n")

  navigator.clipboard.writeText(text).then(() => {
    // Show visual highlight feedback
    highlightedColumnId.value = assessmentId
    setTimeout(() => {
      highlightedColumnId.value = null
    }, 1500)
  }).catch(err => {
    console.error('Failed to copy column:', err)
  })
}

// --- Attempt Management ---
function openAttempts(e, studentId, assessmentId) {
  // Defensive lookups with string conversion to be safe across types
  const sId = String(studentId)
  const aId = Number(assessmentId)

  const grade = gradeMap.value[aId]?.[sId] || gradeMap.value[String(aId)]?.[sId]
  const student = activeClassRecord.value?.students?.[sId]
  const assessment = assessments.value.find(a => a.assessmentId === aId)
  
  if (!grade) {
    console.warn(`[openAttempts] No grade record found for assessment ${aId}, student ${sId}`)
    return
  }
  if (!student) {
    console.warn(`[openAttempts] Student ${sId} not found in class record`)
    return
  }
  if (!assessment) {
    console.warn(`[openAttempts] Assessment ${aId} not found`)
    return
  }
  
  const { x, y } = getAdjustedPosition(e, 280, 250)
  attemptsPopover.value = {
    x, y,
    sId,
    aId,
    studentName: `${student.firstName} ${student.lastName}`,
    assessmentName: assessment.name,
    retestPolicy: assessment.retestPolicy || 'highest',
    attempts: grade.attempts || [],
    totalPoints: assessment.totalPoints,
    resolvedScore: grade.resolvedScore
  }
}

async function onSetPrimary(attemptId) {
  if (!attemptsPopover.value) return
  const { sId, aId } = attemptsPopover.value
  await setPrimaryAttempt(aId, sId, attemptId)
  
  // Refresh attempts in popover
  const updatedGrade = gradeMap.value[aId]?.[sId]
  if (updatedGrade) {
    attemptsPopover.value.attempts = updatedGrade.attempts
    attemptsPopover.value.resolvedScore = updatedGrade.resolvedScore
  }
}

async function onDeleteAttempt(attemptId) {
  if (!attemptsPopover.value) return
  const { sId, aId } = attemptsPopover.value
  
  if (!await confirm('Delete this attempt? This cannot be undone.', 'Delete Attempt', { danger: true })) return
  
  await removeAttempt(aId, sId, attemptId)
  
  // Refresh attempts in popover or close if none left
  const updatedGrade = gradeMap.value[aId]?.[sId]
  if (!updatedGrade || updatedGrade.attempts?.length === 0) {
    attemptsPopover.value = null
  } else {
    attemptsPopover.value.attempts = updatedGrade.attempts
  }
}

async function onUpdateComment(attemptId, comment) {
  if (!attemptsPopover.value) return
  const { sId, aId } = attemptsPopover.value
  await updateAttemptComment(aId, sId, attemptId, comment)
  
  // Refresh local popover snapshot comment field
  const att = attemptsPopover.value.attempts.find(a => a.attemptId === attemptId)
  if (att) {
    att.comment = comment ?? ''
  }
}

// Removed local saveAssessment & onTargetChange

// --- Assessment View Methods ---
function getStudentStatus(studentId) {
  const grade = gradeMap.value[selectedAssessmentId.value]?.[studentId]
  if (!grade) return { label: 'not entered', class: 'empty' }
  if (grade.missing) return { label: 'missing', class: 'missing' }
  if (grade.excluded) return { label: 'excluded', class: 'excluded' }
  if (grade.attempts?.length > 0) {
    const label = grade.attempts.length > 1 ? `✓ ${grade.attempts.length} attempts` : '✓'
    return { label, class: 'entered' }
  }
  return { label: 'not entered', class: 'empty' }
}

async function onAssessmentViewBlur(studentId, value) {
  if (value === '' || value === null) return
  const current = gradeMap.value[selectedAssessmentId.value]?.[studentId]
  const oldVal = current ? current.resolvedScore : null
  const newVal = Number(value)
  
  const assessment = currentAssessment.value
  // Note: High scores are allowed

  if (oldVal !== newVal) {
    await enterGrade(selectedAssessmentId.value, studentId, newVal)
  }
}

async function onAssessmentViewEnter(studentId, direction, e) {
  const val = e.target.value
  await onAssessmentViewBlur(studentId, val)
  
  // Robust Row-based Traversal
  const currentTr = e.target.closest('tr')
  if (!currentTr) return

  let targetTr = direction === 'up' ? currentTr.previousElementSibling : currentTr.nextElementSibling

  // Walk siblings until we find a row with an input in the score column
  while (targetTr) {
    const input = targetTr.querySelector('.grades__atd-score input')
    if (input) {
      input.focus()
      // If it's a numeric input, select text for easier overwriting
      if (input.type === 'number') input.select()
      return
    }
    targetTr = direction === 'up' ? targetTr.previousElementSibling : targetTr.nextElementSibling
  }
}

function onStudentActionMenu(e, studentId) {
  const { x, y } = getAdjustedPosition(e, 180, 200)
  studentActionMenu.value = {
    x, y,
    studentId
  }
}

async function toggleMissingFromView(studentId) {
  const current = isMissing(studentId, selectedAssessmentId.value)
  await markMissing(selectedAssessmentId.value, studentId, !current)
}

async function toggleExcludedFromView(studentId) {
  const current = isExcluded(studentId, selectedAssessmentId.value)
  await markExcluded(selectedAssessmentId.value, studentId, !current)
}

function startNewAttempt(studentId) {
  newAttemptForm.value = {
    studentId,
    points: null,
    date: new Date().toISOString().slice(0, 10),
    comment: ''
  }
}

async function saveNewAttempt() {
  if (!newAttemptForm.value || newAttemptForm.value.points === null) return
  const { studentId, points, date, comment } = newAttemptForm.value
  
  const assessment = currentAssessment.value
  
  await enterGrade(selectedAssessmentId.value, studentId, points, date, comment)
  newAttemptForm.value = null
}

// --- Dossier Methods ---

// --- Lifecycle ---
onMounted(async () => {
  if (props.classId) {
    sidebarClassId.value = props.classId
    await switchClass(props.classId)
  } else if (sidebarClassId.value) {
    await onClassChange()
  }

  if (props.studentId) {
    selectedStudentId.value = props.studentId
  }
})

// Update grades whenever milestone changes
watch(selectedMilestone, () => {
  refreshGrades()
})

watch(selectedStudentId, (val) => {
  if (val) {
    // Reset any student-specific view state if needed
  }
})

// Auto-focus first empty input in Assessment View
watch(selectedAssessmentId, (val) => {
  if (val) {
    setTimeout(() => {
      const container = document.querySelector('.grades__assessment-list-wrapper')
      if (container) {
        // Find first input that doesn't have a value
        const inputs = Array.from(container.querySelectorAll('.grades__atd-score input'))
        const firstEmpty = inputs.find(i => !i.value) || inputs[0]
        if (firstEmpty) firstEmpty.focus()
      }
    }, 100) // Small delay for rendering
  }
})
</script>

<style scoped>
.grades {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-secondary);
}

.grades__layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-width: 0; /* Ensure layout doesn't push beyond parent */
}

/* ── Main Panel ─────────────────────────────────────────────────────── */
.grades__dossier-container {
  height:     100%;
  min-height: 100vh;
  box-shadow: var(--shadow-xl);
  z-index:    20;
  position:   relative;
}

.grades__main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Essential for flexbox to shrink below content size */
}

.grades__placeholder {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  text-align: center;
}

.grades__loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
}

/* ── Assessment Actions ─────────────────────────────────────────── */
.grades__btn-action {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.grades__btn-action:hover {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
}

.grades__btn-action--danger:hover {
  background: #fff1f0;
  border-color: #ffccc7;
  color: #ff3b30;
}

.grades__close-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.grades__close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text);
  border-color: var(--text-secondary);
  transform: translateY(-1px);
}

/* ── Student Dossier View ───────────────────────────────────────────── */
.grades__student-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  position: relative;
  min-width: 0;
}

.grades__student-header {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.grades__student-overall {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grades__overall-badge {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  padding: 8px 16px;
  border-radius: var(--radius-lg);
  color: var(--text);
  display: inline-block;
}

.grades__stats-main-row {
  display: flex;
  gap: 12px;
}

.grades__stats-secondary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.grades__stat-card {
  flex: 1;
  background: var(--surface);
  padding: 16px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grades__stat-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 10px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  min-width: 70px;
}

.grades__stat-pill-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.grades__stat-pill-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.grades__sparkline-container {
  flex: 1;
  height: 32px;
  margin-left: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  padding: 4px 6px;
  display: flex;
  align-items: flex-end;
}

.grades__sparkline {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: 100%;
  height: 100%;
}

.grades__sparkline-bar {
  flex: 1;
  min-width: 4px;
  border-radius: 1px 1px 0 0;
  transition: height 0.3s ease;
}

.grades__calibration-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: auto;
}

.grades__calibration-badge--too_hard {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.grades__calibration-badge--too_easy {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.overall-trend {
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.grades__trend-label {
  color: var(--text-secondary);
}

.grades__trend-icon {
  display: flex;
  align-items: center;
}

.grades__student-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Correlation Alerts ───────────────────────────────────────────── */
.grades__coaching-alert {
  background: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.grades__alert-icon {
  color: #ef4444;
  flex: 0 0 auto;
}

.grades__alert-message {
  font-weight: 700;
  color: #991b1b;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.grades__alert-text {
  font-size: 0.9rem;
  color: #b91c1c;
  margin-bottom: 4px;
}

.grades__alert-recommendation {
  font-size: 0.85rem;
  color: #7f1d1d;
  font-style: italic;
  opacity: 0.9;
}

.grades__category-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.grades__stat-card {
  background: var(--surface);
  padding: 16px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.grades__stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.grades__stat-card--active {
  box-shadow: 0 0 0 2px var(--primary);
}

.grades__card-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.grades__card-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.grades__override-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.6rem;
  background: var(--primary-light);
  color: var(--primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.grades__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grades__section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grades__section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.grades__filter-tag {
  background: var(--primary-light);
  color: var(--primary);
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.grades__filter-tag button {
  background: transparent;
  border: none;
  color: var(--primary);
  cursor: pointer;
  display: flex;
}

.grades__table-wrapper {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.grades__dossier-table {
  width: 100%;
  border-collapse: collapse;
}

.grades__dossier-table th {
  background: var(--bg-secondary);
  padding: 12px;
  font-size: 0.75rem;
  text-align: left;
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
}

.grades__dossier-table td {
  padding: 12px;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border);
}

.grades__row--dimmed {
  opacity: 0.5;
  background: var(--bg-secondary);
}

.grades__dossier-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  width: 100%;
}

.grades__graph-container {
  height: 180px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative; /* Needed for Chart.js responsive behavior */
  overflow: hidden;    /* Prevent canvas from stretching the container */
}

.grades__graph-render {
  width: 100%;
  height: 100%;
  padding: 10px;
  position: relative;
}

.grades__attendance-summary {
  background: var(--surface);
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grades__attendance-summary:hover {
  border-color: var(--primary);
}

.grades__stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.grades__stat-val {
  font-weight: 700;
}

.grades__overrides-disclosure {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.grades__overrides-disclosure summary {
  padding: 10px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.grades__overrides-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.grades__override-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.grades__override-inputs {
  width: 80px;
}

.grades__events-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.grades__event-card {
  background: var(--surface);
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.grades__event-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.grades__event-date {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.grades__event-note {
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.grades__notes-area {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.85rem;
  resize: vertical;
}

.grades__notes-area:focus {
  outline: none;
  border-color: var(--primary);
}

/* ── Grid Container & Actions ────────────────────────────────────────── */
.grades__grid-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

.grades__grid-actions {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.grades__action-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.grades__btn-primary {
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* ── Toolbar ───────────────────────────────────────────────────────── */
.grades__toggle-group--large {
  width: 100%;
}

.grades__toggle-group--large .grades__toggle-btn {
  flex: 1;
  padding: 10px;
}

.grades__toolbar {
  padding: 12px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  z-index: 20;
}

@media (max-width: 1024px) {
  .grades__toolbar {
    padding: 10px 12px;
    gap: 12px;
  }
}
@media (max-width: 850px) {
  .grades__toolbar {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  .grades__toolbar-center {
    order: 3;
    width: 100%;
    margin-top: 8px;
    justify-content: flex-start;
  }
}

.grades__toolbar-left,
.grades__toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}


.grades__toolbar-center {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  justify-content: center;
}

.grades__btn-settings {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.grades__btn-settings:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.grades__btn-add {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.grades__btn-add:hover {
  opacity: 0.9;
}

.grades__milestone-toggle {
  display: flex;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  gap: 2px;
}

.grades__toggle-group {
  display: flex;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  gap: 2px;
}

.grades__toggle-btn {
  padding: 4px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.grades__toggle-btn:hover {
  color: var(--text);
}

.grades__toggle-btn--active {
  background: var(--primary);
  color: white !important;
  box-shadow: var(--shadow-sm);
}

/* Privacy & Restore Actions */
.grades__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grades__expand-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--primary);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}

.grades__expand-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}

/* ── Grid Table Layout ─────────────────────────────────────────────── */
.grades__grid-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
  scrollbar-gutter: stable;
}

.grades__grid-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.grades__grid-wrapper::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.grades__grid-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.grades__grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto; /* Dynamic resizing for assessment columns */
}

/* Sticky Header Row */
.grades__grid thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--border);
  padding: 12px 8px;
  text-align: left;
}

/* Sticky Student Column (Left) */
.grades__th-student,
.grades__td-student {
  position: sticky;
  left: 0;
  z-index: 11;
  background: var(--surface);
  width: 160px;
  min-width: 160px;
  max-width: 220px;
  border-right: 1px solid var(--border);
  box-shadow: 2px 0 5px -2px rgba(0,0,0,0.1);
}

.grades__th-student {
  cursor: pointer;
  user-select: none;
}

.grades__th-student:hover {
  background: var(--bg-secondary) !important;
}

.grades__grid thead .grades__th-student {
  z-index: 15;
  background: var(--bg-secondary);
}

/* Sticky Overall Column (Right of Student Name) */
.grades__th-overall,
.grades__td-overall {
  position: sticky;
  left: 160px; /* Right after student name */
  z-index: 11;
  background: var(--surface);
  width: 90px;
  min-width: 70px;
  max-width: 90px;
  border-right: 2px solid var(--border);
  text-align: center;
  font-weight: 700;
}

.grades__th-overall {
  cursor: pointer;
  user-select: none;
}

.grades__th-overall:hover {
  background: var(--bg-secondary) !important;
}

.grades__sort-header {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;
}

.grades__th-overall .grades__sort-header {
  justify-content: center;
}

.grades__sort-icon {
  display: inline-flex;
  color: var(--primary);
}

.grades__grid thead .grades__th-overall {
  z-index: 15;
  background: var(--bg-secondary);
}

/* Class Average Row */
.grades__tr-avg td {
  position: sticky;
  top: 58px; /* Height of header row */
  z-index: 5;
  background: var(--bg-secondary);
  font-weight: 700;
  color: var(--text);
  border-bottom: 2px solid var(--border);
}

.grades__tr-avg .grades__td-student {
  z-index: 12;
}

.grades__tr-avg .grades__td-overall {
  z-index: 12;
}

/* Assessment Headers */
.grades__th-assessment {
  width: 90px;
  min-width: 65px;
  max-width: 110px;
}

.grades__assessment-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
}

.grades__assessment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.grades__header-menu-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -4px;
  margin-right: -4px;
}

.grades__header-menu-btn:hover {
  background: var(--border);
  color: var(--primary);
}

.grades__context-btn--danger {
  color: #ff3b30;
}

.grades__context-btn--danger:hover {
  background: #fff1f0 !important;
  color: #ff3b30 !important;
}

.grades__assessment-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grades__assessment-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.grades__assessment-unit {
  background: var(--primary-light);
  color: var(--primary);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
}

/* Cells */
.grades__grid td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
  height: 48px;
}

.grades__td-assessment {
  text-align: center;
  background: var(--surface);
  border-right: 1px solid var(--border);
}

.grades__td-student {
  font-weight: 600;
  padding-left: 16px;
  cursor: pointer;
}

.grades__td-overall {
  font-weight: 700;
}

.grades__cell-placeholder {
  color: var(--text-secondary);
  opacity: 0.3;
}

.grades__td-avg {
  color: var(--primary);
}

.grades__cell-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.grades__cell-retest-btn {
  position: absolute;
  top: 0;
  right: -2px;
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 1.4rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
}

.grades__cell-retest-btn:hover {
  transform: scale(1.2);
  font-weight: 700;
}

/* ── Attempts Popover ────────────────────────────────────────────────── */
.grades__attempts-popover {
  position: fixed;
  z-index: 1000;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border);
  min-width: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.grades__popover-header {
  padding: 12px 14px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.grades__popover-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0;
}

.grades__popover-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.grades__attempts-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 250px;
  overflow-y: auto;
}

.grades__attempt-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grades__attempt-item--primary {
  background: var(--primary-light, rgba(79, 70, 229, 0.05));
}

.grades__attempt-item:last-child {
  border-bottom: none;
}

.grades__attempt-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.grades__attempt-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grades__attempt-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grades__attempt-score {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.grades__attempt-date {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.grades__attempt-comment {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  background: var(--bg-secondary);
  color: var(--text);
  resize: vertical;
  line-height: 1.4;
  transition: border-color 0.15s;
  margin-top: 4px;
}

.grades__attempt-comment:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

.grades__attempt-comment::placeholder {
  color: var(--text-secondary);
  font-style: italic;
}

.grades__icon-btn--danger:hover {
  background: #fff1f0;
  color: var(--state-out);
}

.grades__cell-missing {
  font-weight: 700;
  color: #c0392b;
}

.grades__cell-excluded {
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: line-through;
}

.grades__cell-edit {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grades__input-inline {
  width: 100%;
  height: 100%;
  border: 2px solid var(--primary);
  border-radius: 4px;
  background: var(--surface);
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  outline: none;
  padding: 0;
  appearance: textfield;
}

.grades__input-inline::-webkit-outer-spin-button,
.grades__input-inline::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.grades__td-avg {
  cursor: pointer;
  transition: background-color 0.2s;
}

.grades__td-avg:hover {
  background-color: var(--bg-secondary) !important;
  color: var(--primary);
}

.grades__sort-icon {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  vertical-align: middle;
  color: var(--primary);
}

/* ── Context Menu ───────────────────────────────────────────────────── */
.grades__context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border);
  padding: 6px;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grades__context-btn {
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.grades__context-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.grades__context-btn--danger:hover {
  color: var(--state-out);
  background: #fff1f0;
}

.grades__context-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.grades__context-backdrop--dim {
  background: rgba(0, 0, 0, 0.05);
}

/* ── Modals ────────────────────────────────────────────────────────── */
.grades__modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.grades__modal {
  background: var(--surface);
  width: 100%;
  max-width: 500px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 95vh;
  animation: modal-enter 0.3s ease-out;
}

@keyframes modal-enter {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.grades__modal-header {
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grades__modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.grades__modal-form {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  max-height: calc(95vh - 120px); /* adjusted for header/footer */
}

.grades__modal-form::-webkit-scrollbar {
  width: 4px;
}

.grades__modal-form::-webkit-scrollbar-track {
  background: transparent;
}

.grades__modal-form::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.grades__form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.grades__form-row--compact {
  gap: 12px;
}

.grades__form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grades__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.grades__input {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

.grades__input:focus {
  border-color: var(--primary);
}

.grades__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.grades__btn-ghost {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
}

.grades__btn-ghost:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.grades__icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  border-radius: 50%;
}

.grades__icon-btn:hover {
  background: var(--border);
  color: var(--text);
}

.grades__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--primary-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Assessment View ───────────────────────────────────────────────── */
.grades__assessment-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
}

.grades__view-header {
  padding: 20px 32px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.grades__view-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}


.grades__back-btn {
  background: transparent;
  border: none;
  color: var(--primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 16px;
  padding: 0;
}

.grades__assessment-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.grades__assessment-badges {
  display: flex;
  gap: 8px;
}

.grades__badge {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.grades__assessment-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 320px;
}

.grades__stats-main-row {
  display: flex;
  gap: 12px;
}

.grades__student-name-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.grades__student-name-container {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.grades__student-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.grades__cell-absent-dot {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #ff3b30;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
  pointer-events: auto;
}

.grades__analysis-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 16px;
  padding: 12px 20px;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}

.grades__analysis-group {
  display: flex;
  gap: 12px;
}

.grades__stat-card {
  flex: 1;
  background: var(--bg-secondary);
  padding: 14px 16px;
  border-radius: var(--radius-md);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grades__stat-card-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.grades__stat-card-value-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.grades__stat-card-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
}

.grades__stat-card-value small {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.grades__stat-card-percent {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary);
}

.grades__mini-progress {
  width: 60px;
  height: 6px;
  background: rgba(0,0,0,0.05);
  border-radius: 10px;
  overflow: hidden;
}

.grades__mini-progress-fill {
  height: 100%;
  background: var(--primary);
}

.grades__stat-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  min-width: 80px;
}

.grades__stat-pill-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grades__stat-pill-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.grades__sparkline-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  height: 36px;
}

.grades__sparkline-card--large {
  background: transparent !important;
  flex: 1;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  min-width: 150px;
  height: auto;
  padding: 0;
  overflow: hidden;
}

.grades__sparkline-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.8;
}

.grades__sparkline {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: 100px;
  height: 24px;
}

.grades__sparkline--large {
  width: 100%;
  max-width: 320px; /* Constrained to avoid overflow */
  height: 80px;
  gap: 4px;
}

.grades__sparkline-bar {
  flex: 1;
  min-width: 2px;
  border-radius: 2px 2px 0 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: bottom;
}

.grades__sparkline--large .grades__sparkline-bar {
  min-width: 6px;
}

.grades__sparkline-bar:hover {
  filter: brightness(0.85);
  transform: scaleY(1.2);
  z-index: 2;
  cursor: help;
}

.grades__calibration-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  min-width: 150px;
  position: relative;
  border: 1px solid transparent;
}

.grades__calibration-pill svg {
  position: absolute;
  top: 8px;
  right: 10px;
  opacity: 0.6;
}

.grades__calibration-pill--fair {
  background: #f0fdf4;
  color: #15803d;
  border-color: #bcf0da;
}

.grades__calibration-pill--too_hard {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

.grades__calibration-pill--too_easy {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}

/* Assessment Table */
.grades__dossier-table td.grades__td-assessment {
  width: 140px;
  min-width: 120px;
  padding: 4px;
  text-align: center;
}

.grades__assessment-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 0 32px 32px;
}

.grades__assessment-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 24px;
}

.grades__assessment-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border);
}

.grades__atr-student td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 0.95rem;
  color: var(--text);
}

.grades__ath-student { width: auto; }
.grades__ath-score   { width: 110px; text-align: center !important; }
.grades__ath-percent { width: 80px; text-align: center !important; }
.grades__ath-status  { width: 130px; text-align: center !important; }

.grades__atd-student { font-weight: 600; }
.grades__atd-percent { text-align: center; font-weight: 500; }

.grades__attempt-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grades__attempt-counting {
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.grades__counting-badge {
  color: var(--state-success);
  font-weight: 600;
}

.grades__not-counting-badge {
  color: var(--text-secondary);
  opacity: 0.6;
}

.grades__attempt-percent {
  font-weight: 700;
  color: var(--text);
}

.grades__score-input-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.grades__input-inline--score { width: 60px; }
.grades__input-inline--date { width: 120px; }
.grades__input-inline--note { width: 100px; flex: 1; }

.grades__cell-indicators {
  display: flex;
  align-items: center;
  gap: 3px;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.grades__attempts-dot {
  width: 8px;
  height: 8px;
  background: #ff3b30;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 0 1.5px var(--surface);
  flex-shrink: 0;
}

.grades__attempts-dot:hover {
  transform: scale(1.2);
}

.grades__comment-dot {
  font-size: 0.65rem;
  cursor: pointer;
  line-height: 1;
  opacity: 0.2;
  transition: opacity 0.15s, transform 0.15s;
}

.grades__comment-dot:hover {
  opacity: 0.8;
}

.grades__comment-dot--active {
  opacity: 1;
  font-size: 0.7rem;
}

.grades__status-tag--entered { color: #1a6b3a; font-weight: 500; }
.grades__status-tag--missing { color: #c0392b; font-weight: 500; }
.grades__status-tag--excluded { color: var(--text-secondary); font-style: italic; }
.grades__status-tag--empty { color: var(--text-secondary); opacity: 0.5; }

/* ── New Assessment View Styles ─────────────────────────── */
/* ── Assessment View Overhaul ─────────────────────────── */
.grades__assessment-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  overflow: hidden;
}

.grades__view-header {
  padding: 0;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.grades__view-header-top {
  padding: 12px 24px 0;
  display: flex;
  align-items: center;
}

.assessment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 20px;
  gap: 16px;
}

.assessment-header__identity {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.assessment-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--primary-light);
  color: var(--primary);
  flex-shrink: 0;
}

.assessment-header__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.assessment-header__name {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assessment-header__status-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.assessment-header__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.assessment-header__right {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-shrink: 0;
}

.assessment-header__metrics {
  display: flex;
  align-items: center;
  gap: 24px;
}

.assessment-header__metric {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.assessment-header__metric-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.assessment-header__metric-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.assessment-header__metric-value small {
  font-size: 0.85rem;
  opacity: 0.6;
}

.assessment-header__metric-subvalue {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 2px;
  line-height: 1;
}

.assessment-header__metric--secondary {
  border-left: 1px solid var(--border);
  padding-left: 24px;
}

.assessment-header__mini-progress {
  width: 60px;
  height: 5px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.assessment-header__mini-progress-fill {
  height: 100%;
  background: var(--primary);
}

.assessment-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: 1px solid var(--border);
  padding-left: 16px;
  margin-left: 8px;
  height: 40px;
}

.assessment-header__divider {
  width: 1px;
  height: 32px;
  background: var(--border);
  margin: 0 4px;
}

.assessment-header__sub-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  gap: 24px;
  flex-shrink: 0;
}

.assessment-header__description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assessment-header__at-risk {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ff3b30;
  font-size: 0.8rem;
  font-weight: 600;
  background: #fff1f0;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #ffccc7;
  white-space: nowrap;
}

.grades__focused-view {
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 32px;
  flex: 1;
  overflow-y: auto;
}

@media (max-width: 1100px) {
  .assessment-header__metrics { gap: 16px; }
  .assessment-header__metric--secondary { display: none; }
}

@media (max-width: 900px) {
  .assessment-header { flex-direction: column; align-items: flex-start; }
  .assessment-header__right { width: 100%; justify-content: space-between; margin-top: 8px; }
  .grades__focused-view { padding: 16px; }
}
/* ── Premium Table Overhaul ──────────────────────────── */
.grades__table-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  margin-top: 32px;
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.grades__table-scroll-area {
  overflow-x: auto;
}

.grades__assessment-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.grades__assessment-table th {
  text-align: left;
  padding: 16px 24px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--border);
}

.grades__atr-student {
  transition: all 0.2s;
  position: relative;
}

.grades__atr-student:hover {
  background: var(--bg-secondary);
}

.grades__atd-student {
  padding: 14px 24px;
  font-weight: 600;
  color: var(--text);
  position: relative;
  width: auto;
}

.grades__row-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--primary);
  opacity: 0;
  transition: opacity 0.2s;
}

.grades__atr-student:hover .grades__row-indicator {
  opacity: 1;
}

.grades__atd-score {
  padding: 8px 16px;
  width: 110px;
  text-align: center;
}

.grades__score-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-right: 24px;
}

/* Ghost Input Styling */
.grades__input-ghost {
  width: 100%;
  max-width: 60px;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  outline: none;
  transition: all 0.2s;
  text-align: center;
}

.grades__input-ghost::-webkit-inner-spin-button,
.grades__input-ghost::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.grades__atr-student:hover .grades__input-ghost:not(:focus) {
  border-color: var(--border);
  background: var(--bg);
}

.grades__input-ghost:focus,
.grades__input-ghost--active {
  background: var(--bg);
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
  transform: translateY(-1px);
}

/* Status Badges */
.grades__status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.grades__status-badge--entered {
  background: #e6f7ed;
  color: var(--state-success);
}

.grades__status-badge--missing,
.grades__cell-missing-badge {
  background: #fff1f0;
  color: var(--state-out);
}

.grades__status-badge--excluded,
.grades__cell-excluded-badge {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-style: italic;
}

.grades__status-badge--empty {
  background: transparent;
  color: var(--text-secondary);
  opacity: 0.5;
}

.grades__cell-missing-badge,
.grades__cell-excluded-badge {
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 800;
}

.grades__atd-percent {
  padding: 14px 24px;
  width: 100px;
}

.grades__percent-pill {
  font-family: inherit;
  font-weight: 700;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.grades__atd-status {
  padding: 14px 16px;
  width: 140px;
  text-align: center;
}

.grades__atd-actions {
  padding: 14px 24px;
  text-align: right;
  width: 60px;
}

.grades__inline-actions {
  display: flex;
  gap: 4px;
}

.grades__td-assessment--highlighted,
.grades__td--highlighted {
  box-shadow: inset 0 0 0 2px var(--primary) !important;
  transition: box-shadow 0.3s ease;
  background-color: var(--primary-light) !important;
}

.grades__input-ghost--date { font-size: 0.8rem; width: 130px; font-weight: 500; }
.grades__input-ghost--note { font-size: 0.8rem; width: 150px; font-weight: 500; text-align: left; }

.grades__btn-ghost--danger {
  color: var(--state-out);
}

/* Evidence Balance Stacked Bar */
.grades__evidence-stacked {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.grades__stacked-bar {
  height: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.grades__stacked-segment {
  height: 100%;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.grades__stacked-segment--product {
  background: var(--primary);
}

.grades__stacked-segment--observation {
  background: #ff9500;
}

.grades__stacked-segment--conversation {
  background: #34c759;
}

.grades__stacked-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.grades__legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.grades__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.grades__legend-dot--product { background: var(--primary); }
.grades__legend-dot--observation { background: #ff9500; }
.grades__legend-dot--conversation { background: #34c759; }

.grades__legend-label {
  color: var(--text);
  font-weight: 600;
}

.grades__legend-pct {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.grades__btn-icon-sm {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.grades__btn-icon-sm:hover {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
}

.grades__empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
  margin-top: 12px;
}

/* Stats Summary and Dossier Metrics */
.grades__student-header {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.grades__student-name-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.grades__overall-summary-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px;
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.grades__summary-badge-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.grades__summary-badge-value {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
}

.grades__stats-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 4px;
}

.grades__stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.grades__stat-label {
  color: var(--text-secondary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.grades__stat-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 50px;
  text-align: center;
}

.grades__stat-hint {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

.grades__stat-empty {
  color: var(--text-secondary);
  font-style: italic;
}

.grades__info-icon {
  font-size: 12px;
  color: var(--text-secondary);
  cursor: help;
  background: var(--bg-secondary);
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--border-color);
}

.grades__category-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.grades__stat-card {
  min-width: 0; /* Allow grid items to shrink below their content if needed */
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
}

.grades__stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border-color: var(--primary);
}

.grades__stat-card--active {
  background: var(--bg-secondary);
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(111, 146, 255, 0.1);
}

.grades__card-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grades__card-metrics {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.grades__card-metric-row {
  display: flex;
  flex-direction: column; /* Stack vertically for ultimate compactness */
  align-items: flex-start;
  gap: 0px;
  font-size: 11px;
}

.grades__card-metric-label {
  color: var(--text-secondary);
  font-size: 9px;
  text-transform: uppercase;
  opacity: 0.8;
}

.grades__card-metric-value {
  font-weight: 700;
  color: var(--text-primary);
  text-align: left;
  line-height: 1.1;
  font-size: 13px;
}

.grades__card-hint {
  display: block;
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 1px;
}

/* ──────────────────────────────────────────────────────────────────────────
   Analytics UI Styles (Update 17)
   ────────────────────────────────────────────────────────────────────────── */

/* ── Analytics Panel Layout ── */
.grades__analytics-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg);
  position: relative;
}

.grades__analytics-header {
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.grades__outlier-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #856403;
  background: #fff3cd;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  border: 1px solid rgba(0,0,0,0.05);
  white-space: nowrap;
}

.grades__outlier-toggle {
  margin-left: auto;
}

.grades__calculating-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  gap: 1rem;
  backdrop-filter: blur(2px);
}

.grades__spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: grades-spin 1s linear infinite;
}

@keyframes grades-spin {
  to { transform: rotate(360deg); }
}

.grades__analytics-scrollable {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem;
}

.grades__analytics-sections {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.grades__analytics-section {
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.grades__analytics-subtitle {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.grades__section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.grades__analytics-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 1rem;
}

/* ── Class Overview Cards ── */
.grades__analytics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}

.grades__analytics-card {
  background: var(--surface);
  padding: 1.25rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.grades__analytics-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.grades__card-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
}

/* ── Triangulation Coverage ── */
.grades__coverage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.grades__coverage-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.grades__coverage-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 500;
}

/* progress-bg and progress-bar are partly shared with dossier bars */
/* We'll use more specific ones for the new UI */

/* ── Per-Assessment Breakdown Table ── */
.grades__analytics-table-wrapper {
  overflow-x: auto;
  margin: 0 -0.5rem;
}

.grades__analytics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.grades__analytics-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.grades__analytics-table th:hover {
  background: var(--bg-secondary);
}

.grades__analytics-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.grades__td-assessment-name {
  font-weight: 600;
  cursor: pointer;
  color: var(--primary);
}


.grades__flag-group {
  display: flex;
  gap: 0.5rem;
}

.grades__flag {
  font-size: 1.1rem;
  line-height: 1;
}

/* ── Exclusions Drawer ── */
.grades__analytics-collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.grades__exclusion-list {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  animation: slide-down 0.2s ease-out;
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.grades__exclusion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.grades__exclusion-item {
  font-size: 0.875rem;
}

/* ── Empty State ── */
.grades__empty-analytics {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem;
}

.grades__empty-content {
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.grades__empty-icon {
  color: var(--border);
  margin-bottom: 0.5rem;
}

.grades__empty-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.grades__empty-content p {
  color: var(--text-secondary);
}

/* ── Sparklines ──────────────────────────────────────────────────────── */
.grades__student-name-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grades__roster-name-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grades__sparkline-mini {
  display: flex;
  align-items: center;
  opacity: 0.7;
  margin-top: 2px;
}

.grades__sparkline-mini svg {
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.1));
}

.grades__sparkline-dot {
  animation: sparklinePulse 2s infinite;
}

@keyframes sparklinePulse {
  0% { r: 2.5; opacity: 1; }
  50% { r: 3.5; opacity: 0.7; }
  100% { r: 2.5; opacity: 1; }
}

.grades__card-description {
  margin: 4px 0 16px;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
  max-width: 800px;
}

.grades__analytics-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.grades__analytics-group-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.grades__analytics-group-box .grades__analytics-subtitle {
  margin-top: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 8px;
}

/* ── Evidence Blend / Triangulation Styling ── */
.grades__blend-container {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin: 16px 0;
  border: 1px solid var(--border-light);
}

.grades__blend-bar {
  display: flex;
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.grades__blend-segment {
  height: 100%;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.grades__blend-segment--product { 
  background: linear-gradient(90deg, #10b981, #059669); /* Emerald */
}
.grades__blend-segment--observation { 
  background: linear-gradient(90deg, #0ea5e9, #0284c7); /* Ocean */
}
.grades__blend-segment--conversation { 
  background: linear-gradient(90deg, #f59e0b, #d97706); /* Amber */
}

.grades__blend-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: center;
}

.grades__legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grades__legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.grades__legend-dot--product { background: #10b981; }
.grades__legend-dot--observation { background: #0ea5e9; }
.grades__legend-dot--conversation { background: #f59e0b; }

.grades__legend-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.grades__analytics-hint {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-top: 8px;
  font-style: italic;
}

.grades__outlier-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grades__toggle-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grades__threshold-editor {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.grades__threshold-input {
  width: 38px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: inherit;
  border-radius: 4px;
  padding: 0 4px;
  font-size: inherit;
  font-family: inherit;
  font-weight: 700;
  text-align: center;
}

.grades__toggle-btn--active .grades__threshold-input {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: white;
}

.grades__threshold-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.25);
  border-color: var(--primary);
}

/* Remove arrows for chrome/safari */
.grades__threshold-input::-webkit-outer-spin-button,
.grades__threshold-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.grades__weight-warning {
  margin: 0.5rem 1rem 1rem 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: fadeInDown 0.3s ease-out;
}

.grades__weight-warning--under {
  background: #fef3c7; /* Amber 100 */
  border: 1px solid #fde68a;
  color: #b45309; /* Deep Amber */
}

.grades__weight-warning--over {
  background: #fee2e2; /* Red 100 */
  border: 1px solid #fecaca;
  color: #b91c1c; /* Red 700 */
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
