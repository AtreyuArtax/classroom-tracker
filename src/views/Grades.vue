<template>
  <div class="grades">
    <div class="grades__layout">
      
      <!-- Left Sidebar (Dossier Mode only) -->
      <aside v-if="selectedStudentId && !isLoading && !isSidebarCollapsed" class="grades__sidebar">
        <!-- Sidebar Header with Class Selector -->
        <div class="grades__sidebar-header">
          <div class="grades__sidebar-select-wrapper">
            <select v-model="sidebarClassId" class="grades__sidebar-select" @change="onSidebarClassChange">
              <optgroup label="Active Classes">
                <option v-for="c in sortedClassList" :key="c.classId" :value="c.classId">{{ c.name }}</option>
              </optgroup>
            </select>
          </div>
          <div class="grades__sidebar-actions">
            <button 
              class="grades__icon-btn" 
              :title="isPrivacyMode ? 'Show Grades' : 'Privacy Mode'"
              @click="isPrivacyMode = !isPrivacyMode"
            >
              <Eye v-if="!isPrivacyMode" :size="16" />
              <EyeOff v-else :size="16" />
            </button>
            <button 
              class="grades__icon-btn" 
              title="Collapse Sidebar"
              @click="isSidebarCollapsed = true"
            >
              <ChevronLeft :size="16" />
            </button>
          </div>
        </div>

        <!-- Student List -->
        <div class="grades__roster-container">
          <ul class="grades__roster">
            <li 
              v-for="student in sortedRoster" 
              :key="student.studentId"
              class="grades__roster-item"
              :class="{ 'grades__roster-item--active': selectedStudentId === student.studentId }"
              @click="selectedStudentId = student.studentId"
            >
              <div class="grades__roster-info">
                <span class="grades__roster-name">{{ student.lastName }}, {{ student.firstName }}</span>&nbsp;
                <span 
                  v-if="classGrades[student.studentId]" 
                  class="grades__roster-grade"
                  :style="{ color: isPrivacyMode ? 'var(--text-secondary)' : getGradeColor(classGrades[student.studentId].overallGrade) }"
                >
                  <template v-if="isPrivacyMode">**</template>
                  <template v-else>{{ formatGrade(classGrades[student.studentId].overallGrade) }}</template>
                </span>
                <span v-else class="grades__roster-grade grades__roster-grade--empty">
                  —
                </span>
              </div>
            </li>
          </ul>
        </div>

      </aside>

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
          <div class="grades__focused-view">
            <!-- Assessment View Header -->
            <div class="grades__view-header">
              <nav class="grades__breadcrumb">
                <button class="grades__breadcrumb-link" @click="selectedAssessmentId = null">
                  <ArrowLeft :size="14" /> Class Grid
                </button>
                <span class="grades__breadcrumb-sep">/</span>
                <span class="grades__breadcrumb-current">Assessment Details</span>
              </nav>

              <div class="grades__assessment-card">
                <div class="grades__card-main">
                  <div class="grades__card-header-row">
                    <h2 class="grades__card-title">{{ currentAssessment.name }}</h2>
                    <div class="grades__header-actions">
                      <button class="grades__btn-action" title="Edit Assessment" @click="startEditAssessment(currentAssessment)">
                        <Pencil :size="16" />
                      </button>
                      <button class="grades__btn-action grades__btn-action--danger" title="Delete Assessment" @click="confirmDeleteAssessment(currentAssessment)">
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </div>                  <div class="grades__assessment-metadata">
                    <div class="grades__meta-item" title="Assessment Type">
                      <FilePlus :size="14" />
                      <span>{{ currentAssessment.assessmentType }}</span>
                    </div>
                    <div class="grades__meta-item" title="Total Points">
                      <Target :size="14" />
                      <span>/{{ currentAssessment.totalPoints }}</span>
                    </div>
                    <div v-if="currentAssessment.unit" class="grades__meta-item" title="Unit/Category">
                      <Hash :size="14" />
                      <span>{{ currentAssessment.unit }}</span>
                    </div>
                    <div class="grades__meta-item" title="Date">
                      <Calendar :size="14" />
                      <span>{{ new Date(currentAssessment.date).toLocaleDateString() }}</span>
                    </div>
                    
                  </div>
                </div>

                <div v-if="currentAssessmentSummary" class="grades__assessment-stats">
                  <div class="grades__stats-main-row">
                    <div class="grades__stat-card" :style="{ borderLeft: `4px solid ${getHeatColor(currentAssessmentSummary.average || currentAssessmentSummary.mean)}` }">
                      <div class="grades__stat-card-label">Class Average</div>
                      <div class="grades__stat-card-value-row">
                        <span class="grades__stat-card-value">{{ currentAssessmentSummary.average || currentAssessmentSummary.mean || '—' }} <small>/{{ currentAssessment.totalPoints }}</small></span>
                        <span v-if="currentAssessmentSummary.mean" class="grades__stat-card-percent">
                          {{ Math.round((currentAssessmentSummary.mean / 100) * 1000) / 10 }}%
                        </span>
                      </div>
                    </div>

                    <div class="grades__stat-card">
                      <div class="grades__stat-card-label">Entry Progress</div>
                      <div class="grades__stat-card-value-row">
                        <span class="grades__stat-card-value">{{ currentAssessmentSummary.enteredCount }} <small>/{{ currentAssessmentSummary.totalStudents }}</small></span>
                        <div class="grades__mini-progress">
                          <div class="grades__mini-progress-fill" :style="{ width: (currentAssessmentSummary.enteredCount / currentAssessmentSummary.totalStudents * 100) + '%' }"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- New Full-Width Analysis Bar -->
              <div v-if="currentAssessmentSummary" class="grades__analysis-bar">
                <div class="grades__analysis-group">
                  <div class="grades__stat-pill">
                    <span class="grades__stat-pill-label">Median</span>
                    <span class="grades__stat-pill-value">{{ currentAssessmentSummary.median }}%</span>
                  </div>
                  <div class="grades__stat-pill">
                    <span class="grades__stat-pill-label">Std Dev</span>
                    <span class="grades__stat-pill-value" :style="{ color: getSDColor(currentAssessmentSummary.sd) }">±{{ currentAssessmentSummary.sd }}</span>
                  </div>
                  <div class="grades__stat-pill">
                    <span class="grades__stat-pill-label">Range</span>
                    <span class="grades__stat-pill-value">{{ currentAssessmentSummary.lowest }}% – {{ currentAssessmentSummary.highest }}%</span>
                  </div>
                  
                  <!-- Professional Interpretation Flag -->
                  <div :class="['grades__calibration-pill', 'grades__calibration-pill--' + (currentAssessmentSummary.calibrationFlag || 'fair')]">
                    <Award v-if="!currentAssessmentSummary.calibrationFlag" :size="14" />
                    <AlertTriangle v-else :size="14" />
                    <span class="grades__stat-pill-label">Interpretation</span>
                    <span class="grades__stat-pill-value">
                      {{ 
                        currentAssessmentSummary.calibrationFlag === 'too_hard' ? 'Tough Assessment' : 
                        currentAssessmentSummary.calibrationFlag === 'too_easy' ? 'Easy Assessment' : 
                        'Well Calibrated (Fair)' 
                      }}
                    </span>
                  </div>
                </div>

                <!-- Sparkline Distribution -->
                <div v-if="currentAssessmentSummary.distributionBuckets" class="grades__sparkline-card grades__sparkline-card--large">
                  <div class="grades__sparkline grades__sparkline--large">
                    <template v-if="distributionMode === 'buckets'">
                      <div 
                        v-for="(bucket, idx) in currentAssessmentSummary.distributionBuckets" 
                        :key="'bucket-'+idx"
                        class="grades__sparkline-bar"
                        :style="{ 
                          height: bucket.count > 0 ? Math.max(8, (bucket.count / currentAssessmentSummary.totalCount * 100)) + '%' : '0px',
                          backgroundColor: getHeatColorHex(bucket.range[0])
                        }"
                        :title="bucket.label + ': ' + bucket.count + ' students'"
                      ></div>
                    </template>
                    <template v-else>
                      <div 
                        v-for="(bucket, idx) in currentAssessmentSummary.levelBuckets" 
                        :key="'level-'+idx"
                        class="grades__sparkline-bar"
                        :style="{ 
                          height: bucket.count > 0 ? Math.max(8, (bucket.count / currentAssessmentSummary.totalCount * 100)) + '%' : '0px',
                          backgroundColor: getHeatColorHex(bucket.range[0])
                        }"
                        :title="bucket.label + ': ' + bucket.count + ' students'"
                      ></div>
                    </template>
                  </div>
                  <span class="grades__sparkline-label">Grade Distribution ({{ distributionMode === 'buckets' ? '10% Buckets' : 'Levels' }})</span>
                </div>
              </div>
            </div>

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
                        <span class="grades__student-name-text">{{ s.lastName }}, {{ s.firstName }}</span>
                      </td>
                      <td class="grades__atd-score">
                        <div v-if="newAttemptForm?.studentId === s.studentId" class="grades__new-attempt-inline">
                          <div class="grades__attempt-form-row">
                            <input 
                              v-model.number="newAttemptForm.points" 
                              type="number" 
                              min="0" 
                              :max="currentAssessment.totalPoints"
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
                            <button 
                              v-if="gradeMap[selectedAssessmentId]?.[s.studentId]?.attempts?.length > 1" 
                              class="grades__dot-indicator"
                              @click="openAttempts($event, s.studentId, selectedAssessmentId)"
                            >•</button>
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
              
              <div class="grades__toolbar-select-wrapper">
                <select v-model="sidebarClassId" class="grades__toolbar-select" @change="onClassChange">
                  <optgroup label="Active Classes">
                    <option v-for="c in sortedClassList" :key="c.classId" :value="c.classId">{{ c.name }}</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div class="grades__toolbar-center">
              <button v-if="!analyticsMode" class="grades__btn-add" @click="showAddModal = true">
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

              <div v-if="activeClassRecord?.gradebookMilestones?.length" class="grades__milestone-toggle">
                <button 
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': selectedMilestone === null }"
                  @click="selectedMilestone = null"
                >Current</button>
                <button 
                  v-for="m in activeClassRecord.gradebookMilestones"
                  :key="m.milestoneId"
                  class="grades__toggle-btn"
                  :class="{ 'grades__toggle-btn--active': selectedMilestone === m.milestoneId }"
                  @click="selectedMilestone = m.milestoneId"
                >{{ m.name }}</button>
              </div>
            </div>

            <div class="grades__toolbar-right">
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
              <div v-if="excludeOutliers" class="grades__outlier-notice">
                <AlertCircle :size="16" />
                <span>Outlier exclusion active: {{ classAnalytics?.excludedStudentCount || 0 }} students hidden.</span>
              </div>
              <div class="grades__outlier-toggle">
                <!-- Bug 4: Segmented Outlier Toggle -->
                <div class="grades__toggle-group">
                  <button 
                    class="grades__toggle-btn" 
                    :class="{ 'grades__toggle-btn--active': !excludeOutliers }"
                    @click="excludeOutliers = false"
                  >Include All</button>
                  <button 
                    class="grades__toggle-btn" 
                    :class="{ 'grades__toggle-btn--active': excludeOutliers }"
                    @click="excludeOutliers = true"
                  >Exclude Outliers</button>
                </div>
              </div>
            </div>

            <div v-if="isCalculating" class="grades__calculating-overlay">
              <div class="grades__spinner"></div>
              <p>Calculating analytics...</p>
            </div>

            <div v-else-if="!classAnalytics" class="grades__empty-analytics">
              <div class="grades__empty-content">
                <BarChart2 :size="64" class="grades__empty-icon" />
                <h3>No analytics available yet.</h3>
                <p>Enter grades in the Grid view to see class performance data.</p>
                <button class="grades__btn-primary" @click="analyticsMode = false">
                  <ArrowLeft :size="16" /> Switch to Grid
                </button>
              </div>
            </div>

            <div v-else class="grades__analytics-scrollable">
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

                <!-- Triangulation Coverage (Step 4) -->
                <div class="grades__analytics-section">
                  <h3 class="grades__analytics-subtitle">TRIANGULATION COVERAGE</h3>
                  <div class="grades__coverage-grid">
                    <div class="grades__coverage-item">
                      <div class="grades__coverage-labels">
                        <span>Products</span>
                        <span>{{ classAnalytics.totalStudentCount }}/{{ classAnalytics.totalStudentCount }} students (100%)</span>
                      </div>
                      <div class="grades__progress-bg">
                        <div class="grades__progress-bar" style="width: 100%; background: var(--grade-high);"></div>
                      </div>
                    </div>
                    <div class="grades__coverage-item">
                      <div class="grades__coverage-labels">
                        <span>Conversations</span>
                        <span>{{ classAnalytics.conversationCoverage.studentsWithEvidence }}/{{ classAnalytics.totalStudentCount }} students ({{ classAnalytics.conversationCoverage.percentage }}%)</span>
                      </div>
                      <div class="grades__progress-bg">
                        <div class="grades__progress-bar" :style="{ width: classAnalytics.conversationCoverage.percentage + '%', background: getCoverageColor(classAnalytics.conversationCoverage.percentage) }"></div>
                      </div>
                    </div>
                    <div class="grades__coverage-item">
                      <div class="grades__coverage-labels">
                        <span>Observations</span>
                        <span>{{ classAnalytics.observationCoverage.studentsWithEvidence }}/{{ classAnalytics.totalStudentCount }} students ({{ classAnalytics.observationCoverage.percentage }}%)</span>
                      </div>
                      <div class="grades__progress-bg">
                        <div class="grades__progress-bar" :style="{ width: classAnalytics.observationCoverage.percentage + '%', background: getCoverageColor(classAnalytics.observationCoverage.percentage) }"></div>
                      </div>
                    </div>
                  </div>
                  <p class="grades__analytics-hint">Conversations and Observations show % of students with at least one recorded grade.</p>
                </div>

                <!-- Grade Distribution Histogram (Step 5) -->
                <div class="grades__analytics-section">
                  <div class="grades__section-header-row">
                    <h3 class="grades__analytics-subtitle">GRADE DISTRIBUTION</h3>
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
                        ? 'Number of students within each 10% grade bracket.' 
                        : 'Number of students within each Ontario level (Growing Success).' }}
                  </p>
                </div>

                <!-- Per-Assessment Breakdown (Step 6) -->
                <div class="grades__analytics-section">
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
                        <tr v-for="a in sortedAnalyticsAssessments" :key="a.assessmentId">
                          <td class="grades__td-assessment-name" @click="selectedAssessmentId = a.assessmentId">
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
                            <!-- Sparkline (Step 6) -->
                            <div class="grades__sparkline" v-if="a.stats.distributionBuckets">
                              <template v-if="distributionMode === 'buckets'">
                                <div 
                                  v-for="bucket in a.stats.distributionBuckets" 
                                  :key="bucket.label"
                                  class="grades__sparkline-bar"
                                  :style="{ 
                                    height: (bucket.count / a.stats.totalCount * 100) + '%',
                                    background: getHeatColorHex(bucket.range[0])
                                  }"
                                  :title="`${bucket.label}: ${bucket.count} students`"
                                ></div>
                              </template>
                              <template v-else>
                                <div 
                                  v-for="bucket in a.stats.levelBuckets" 
                                  :key="bucket.label"
                                  class="grades__sparkline-bar"
                                  :style="{ 
                                    height: (bucket.count / a.stats.totalCount * 100) + '%',
                                    background: getHeatColorHex(bucket.range[0])
                                  }"
                                  :title="`${bucket.label}: ${bucket.count} students`"
                                ></div>
                              </template>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-if="!sortedAnalyticsAssessments.length" class="grades__analytics-hint">
                    No product assessments yet — add tests, quizzes, or assignments to see breakdown.
                  </p>
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
                  <th class="grades__th-student" @click="toggleGridSort('name')">
                    <div class="grades__sort-header">
                      Student Name
                      <span v-if="gridSortBy === 'name'" class="grades__sort-icon">
                        <ChevronUp v-if="gridSortOrder === 'asc'" :size="14" />
                        <ChevronDown v-else :size="14" />
                      </span>
                    </div>
                  </th>
                  <th class="grades__th-overall" @click="toggleGridSort('grade')">
                    <div class="grades__sort-header">
                      Overall
                      <span v-if="gridSortBy === 'grade'" class="grades__sort-icon">
                        <ChevronUp v-if="gridSortOrder === 'asc'" :size="14" />
                        <ChevronDown v-else :size="14" />
                      </span>
                    </div>
                  </th>
                  <th 
                    v-for="a in sortedAssessments" 
                    :key="a.assessmentId"
                    class="grades__th-assessment"
                  >
                    <div class="grades__assessment-header">
                      <div class="grades__assessment-info" @click="selectedAssessmentId = a.assessmentId">
                        <span class="grades__assessment-name" :title="a.name">{{ a.name }}</span>
                        <div class="grades__assessment-meta">
                          <span class="grades__assessment-points">/{{ a.totalPoints }}</span>
                          <span v-if="a.unit" class="grades__assessment-unit">{{ a.unit }}</span>
                        </div>
                      </div>
                      <button class="grades__header-menu-btn" @click.stop="onHeaderMenu($event, a)">
                        <MoreVertical :size="14" />
                      </button>
                    </div>
                  </th>
                </tr>

                <!-- Class Avg Row (Sticky below headers) -->
                <tr class="grades__tr-avg">
                  <td class="grades__td-student">Class Average</td>
                  <td class="grades__td-overall grades__td-avg">
                    {{ formatGrade(overallClassAvg) }}
                  </td>
                  <td 
                    v-for="a in sortedAssessments" 
                    :key="a.assessmentId"
                    class="grades__td-assessment grades__td-avg"
                  >
                    <div v-if="assessmentStats[a.assessmentId]">
                      {{ formatCellGrade(assessmentStats[a.assessmentId].average, a.totalPoints) }}
                    </div>
                  </td>
                </tr>
              </thead>
              
              <tbody>
                <tr v-for="student in sortedRoster" :key="student.studentId">
                  <td class="grades__td-student" @click="selectedStudentId = student.studentId">
                    <span class="grades__student-link">{{ student.lastName }}, {{ student.firstName }}</span>
                  </td>
                  <td 
                    class="grades__td-overall"
                    :style="{ background: getHeatColor(classGrades[student.studentId]?.overallGrade) }"
                  >
                    {{ formatGrade(classGrades[student.studentId]?.overallGrade) }}
                  </td>
                  <td 
                    v-for="a in sortedAssessments" 
                    :key="a.assessmentId"
                    class="grades__td-assessment"
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
                      
                      <!-- Retest Indicator -->
                      <button 
                        v-if="gradeMap[a.assessmentId][student.studentId].attempts?.length > 1" 
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

        <!-- Student Dossier (Step 1-8) -->
        <div v-else class="grades__student-view">
          <div class="grades__view-header">
            <div class="grades__header-left">
              <button 
                v-if="isSidebarCollapsed" 
                class="grades__expand-btn"
                title="Show Sidebar"
                @click="isSidebarCollapsed = false"
              >
                <ChevronRight :size="16" />
              </button>
              <button class="grades__back-btn" @click="selectedStudentId = null">
                <ArrowLeft :size="16" /> Back to Class Grid
              </button>
            </div>
            <div class="grades__student-header">
              <div class="grades__student-title-block">
                <div class="grades__student-name-row">
                  <h2 class="grades__view-title">{{ selectedStudentName }}</h2>
                  <div v-if="studentOverallGrade !== null" 
                       class="grades__overall-summary-badge" 
                       :style="{ background: getHeatColor(studentOverallGrade) }">
                    <span class="grades__summary-badge-label">Official Grade</span>
                    <span class="grades__summary-badge-value">{{ formatGrade(studentOverallGrade) }}</span>
                  </div>
                </div>
                <div class="grades__view-subtitle">
                  {{ activeClassRecord?.name }} · Period {{ activeClassRecord?.periodNumber }}
                </div>
                
                <div class="grades__stats-summary">
                  <div class="grades__stat-item">
                    <span class="grades__stat-label">
                      Most Consistent:
                      <span class="grades__info-icon" title="Calculated using bucket mode per category, then weighted. Ignores outliers to show your most frequent level of performance.">ⓘ</span>
                    </span>
                    <template v-if="classGrades[selectedStudentId]?.mostConsistent">
                      <span class="grades__stat-badge" :style="{ background: getHeatColor(classGrades[selectedStudentId].mostConsistent.percentage) }">
                        {{ formatGrade(classGrades[selectedStudentId].mostConsistent.percentage) }}
                      </span>
                      <span v-if="classGrades[selectedStudentId].mostConsistent.isFallback" class="grades__stat-hint">
                        (per-category median — insufficient data for bucket mode)
                      </span>
                    </template>
                    <span v-else class="grades__stat-empty">Not enough data</span>
                  </div>

                  <div class="grades__stat-item">
                    <span class="grades__stat-label">
                      Weighted Median:
                      <span class="grades__info-icon" title="Calculated as a weighted average of the median score from each category. More stable than the raw average for reflecting typical performance.">ⓘ</span>
                    </span>
                    <template v-if="classGrades[selectedStudentId]?.median !== null">
                      <span class="grades__stat-badge" :style="{ background: getHeatColor(classGrades[selectedStudentId].median) }">
                        {{ formatGrade(classGrades[selectedStudentId].median) }}
                      </span>
                    </template>
                    <span v-else class="grades__stat-empty">Not enough data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grades__student-content">
            <!-- Category Cards -->
            <div class="grades__category-cards">
              <div 
                v-for="cat in studentCategoryBreakdown" 
                :key="cat.categoryId" 
                class="grades__stat-card"
                :class="{ 'grades__stat-card--active': filterCategory === cat.categoryId }"
                :style="{ borderLeft: `4px solid ${getHeatColor(cat.percent)}` }"
                @click="filterCategory = (filterCategory === cat.categoryId ? null : cat.categoryId)"
              >
                <div class="grades__card-label">{{ cat.name }}</div>
                <div class="grades__card-metrics">
                  <div class="grades__card-metric-row">
                    <span class="grades__card-metric-label">Official:</span>
                    <span class="grades__card-metric-value">{{ formatGrade(cat.percent) }}</span>
                  </div>
                  <div class="grades__card-metric-row">
                    <span class="grades__card-metric-label">Consistent:</span>
                    <span v-if="cat.consistent !== null" class="grades__card-metric-value">
                      {{ Math.round(cat.consistent) }}%
                      <span v-if="!cat.consistentIsFallback" class="grades__card-hint">
                        ({{ cat.consistentLabel }}, {{ cat.consistentCount }} of {{ cat.consistentTotalCount }})
                      </span>
                    </span>
                    <span v-else class="grades__card-metric-value">—</span>
                  </div>
                </div>
                <div v-if="cat.overridden" class="grades__override-badge" title="Manual Override">Override</div>
              </div>
            </div>

            <!-- Evidence Balance (Step 4) -->
            <div v-if="studentEvidenceBalance" class="grades__section">
              <h3 class="grades__section-title">Evidence Balance</h3>
              <div class="grades__evidence-bars">
                <div class="grades__evidence-row">
                  <div class="grades__evidence-label">
                    <span>Product</span>
                    <span>{{ studentEvidenceBalance.product }}%</span>
                  </div>
                  <div class="grades__progress-bg">
                    <div class="grades__progress-bar" :style="{ width: studentEvidenceBalance.product + '%' }"></div>
                  </div>
                </div>
                <div class="grades__evidence-row">
                  <div class="grades__evidence-label">
                    <span>Observation</span>
                    <span>{{ studentEvidenceBalance.observation }}%</span>
                  </div>
                  <div class="grades__progress-bg">
                    <div class="grades__progress-bar grades__progress-bar--observation" :style="{ width: studentEvidenceBalance.observation + '%' }"></div>
                  </div>
                </div>
                <div class="grades__evidence-row">
                  <div class="grades__evidence-label">
                    <span>Conversation</span>
                    <span>{{ studentEvidenceBalance.conversation }}%</span>
                  </div>
                  <div class="grades__progress-bg">
                    <div class="grades__progress-bar grades__progress-bar--conversation" :style="{ width: studentEvidenceBalance.conversation + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Assessment List (Step 3) -->
            <div class="grades__section">
              <div class="grades__section-header">
                <h3 class="grades__section-title">Assessments</h3>
                <div v-if="filterCategory" class="grades__filter-tag">
                  Showing {{ studentCategoryBreakdown.find(c => c.categoryId === filterCategory)?.name }}
                  <button @click="filterCategory = null"><X :size="12" /></button>
                </div>
              </div>
              <div class="grades__table-wrapper">
                <table class="grades__dossier-table">
                  <thead>
                    <tr>
                      <th>Assessment</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>%</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="row in filteredStudentAssessments" 
                      :key="row.assessmentId"
                      :class="{ 'grades__row--dimmed': isPostMilestone(row.date) }"
                    >
                      <td>{{ row.name }}</td>
                      <td><span class="grades__badge">{{ row.type }}</span></td>
                      <td>{{ formatDateShort(row.date) }}</td>
                      <td 
                        class="grades__td-assessment"
                        :style="getCellStyle(selectedStudentId, row.assessmentId, row.totalPoints)"
                        @click="startEdit(selectedStudentId, row.assessmentId)"
                        @contextmenu.prevent="onContextMenu($event, selectedStudentId, row.assessmentId)"
                      >
                        <!-- Inline Editor -->
                        <div v-if="editingCell?.sId === selectedStudentId && editingCell?.aId === row.assessmentId" class="grades__cell-edit">
                          <input 
                            ref="editInput"
                            v-model.number="editingCell.value"
                            type="number"
                            min="0"
                            :max="row.totalPoints"
                            class="grades__input-inline"
                            @blur="saveEdit"
                            @keydown.enter.prevent="onEnterKey"
                            @keydown.tab.prevent="onEnterKey"
                            @keydown.up.prevent="onArrowKey('up')"
                            @keydown.down.prevent="onArrowKey('down')"
                            @keydown.esc.prevent="cancelEdit"
                          />
                        </div>

                        <div v-else-if="gradeMap[row.assessmentId]?.[selectedStudentId]" class="grades__cell-content">
                          <span v-if="row.missing" class="grades__cell-missing">M</span>
                          <span v-else-if="row.excluded" class="grades__cell-excluded">EX</span>
                          <span v-else-if="row.resolvedScore !== null">{{ Math.round(row.resolvedScore * 10) / 10 }} / {{ row.totalPoints }}</span>
                          <span v-else class="grades__cell-placeholder">—</span>
                        </div>
                        <div v-else class="grades__cell-placeholder">—</div>
                      </td>
                      <td>
                        <span v-if="row.resolvedScore !== null">{{ Math.round((row.resolvedScore / row.totalPoints) * 100) }}%</span>
                      </td>
                      <td>
                        <button 
                          v-if="row.attempts > 1" 
                          class="grades__dot-indicator" 
                          @click="openAttempts($event, selectedStudentId, row.assessmentId)"
                        >•</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Individual Assessments (Step 5) -->
            <div v-if="individualStudentAssessments.length" class="grades__section">
              <h3 class="grades__section-title">
                <UserCheck :size="16" /> Individual Assessments
              </h3>
              <div class="grades__table-wrapper">
                <table class="grades__dossier-table">
                  <thead>
                    <tr>
                      <th>Assessment</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>%</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in individualStudentAssessments" :key="row.assessmentId">
                      <td>{{ row.name }}</td>
                      <td><span class="grades__badge">{{ row.assessmentType }}</span></td>
                      <td>{{ formatDateShort(row.date) }}</td>
                      <td 
                        class="grades__td-assessment"
                        :style="getCellStyle(selectedStudentId, row.assessmentId, row.totalPoints)"
                        @click="startEdit(selectedStudentId, row.assessmentId)"
                        @contextmenu.prevent="onContextMenu($event, selectedStudentId, row.assessmentId)"
                      >
                        <!-- Inline Editor -->
                        <div v-if="editingCell?.sId === selectedStudentId && editingCell?.aId === row.assessmentId" class="grades__cell-edit">
                          <input 
                            ref="editInput"
                            v-model.number="editingCell.value"
                            type="number"
                            min="0"
                            :max="row.totalPoints"
                            class="grades__input-inline"
                            @blur="saveEdit"
                            @keydown.enter.prevent="onEnterKey"
                            @keydown.tab.prevent="onEnterKey"
                            @keydown.up.prevent="onArrowKey('up')"
                            @keydown.down.prevent="onArrowKey('down')"
                            @keydown.esc.prevent="cancelEdit"
                          />
                        </div>

                        <div v-else-if="gradeMap[row.assessmentId]?.[selectedStudentId]" class="grades__cell-content">
                          <span v-if="row.missing" class="grades__cell-missing">M</span>
                          <span v-else-if="row.excluded" class="grades__cell-excluded">EX</span>
                          <span v-else-if="row.resolvedScore !== null">{{ Math.round(row.resolvedScore * 10) / 10 }} / {{ row.totalPoints }}</span>
                          <span v-else class="grades__cell-placeholder">—</span>
                        </div>
                        <div v-else class="grades__cell-placeholder">—</div>
                      </td>
                      <td>
                        <span v-if="row.resolvedScore !== null">{{ Math.round((row.resolvedScore / row.totalPoints) * 100) }}%</span>
                      </td>
                      <td>
                        <button 
                          v-if="row.attempts > 1" 
                          class="grades__dot-indicator" 
                          @click="openAttempts($event, selectedStudentId, row.assessmentId)"
                        >•</button>
                        <button class="grades__icon-btn" @click="onEditAssessment(row)">
                          <Pencil :size="14" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="grades__dossier-grid">
              <!-- Trend Graph (Step 4) -->
              <div class="grades__section grades__section--graph">
                <h3 class="grades__section-title">Grade Trend</h3>
                <div class="grades__graph-container">
                  <div v-if="dossierTrendData.length < 3" class="grades__graph-placeholder">
                    <BarChart2 :size="32" />
                    <p>Not enough data for trend</p>
                  </div>
                  <div v-else class="grades__graph-render">
                    <GradeTrendChart :assessments="dossierTrendData" />
                  </div>
                </div>
              </div>

              <div class="grades__side-stats">
                <!-- Attendance Summary (Step 6) -->
                <div class="grades__section">
                  <h3 class="grades__section-title">Attendance Summary</h3>
                  <div class="grades__attendance-summary" @click="$emit('navigate', 'Reports', { studentId: selectedStudentId, classId: activeClassRecord.classId, from: 'Grades' })">
                    <div class="grades__stat-row">
                      <span>Absences:</span>
                      <span class="grades__stat-val">{{ studentAttendance.absences }}</span>
                    </div>
                    <div class="grades__stat-row">
                      <span>Lates:</span>
                      <span class="grades__stat-val">{{ studentAttendance.lates }}</span>
                    </div>
                  </div>
                </div>

                <!-- Overrides (Step 7) -->
                <details class="grades__overrides-disclosure">
                  <summary>Manage Overrides</summary>
                  <div class="grades__overrides-content">
                    <div v-for="cat in activeClassRecord.gradebookCategories" :key="cat.categoryId" class="grades__override-row">
                      <span class="grades__override-name">{{ cat.name }}</span>
                      <div class="grades__override-inputs">
                        <input 
                          type="number" 
                          placeholder="%" 
                          class="grades__input-inline"
                          :value="getOverride(cat.categoryId)"
                          @blur="e => saveOverride(cat.categoryId, e.target.valueAsNumber)"
                        />
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <!-- Conversations (Step 5) -->
            <div v-if="acEvents.length" class="grades__section">
              <h3 class="grades__section-title">
                <GraduationCap :size="16" /> Assessment Conversations
              </h3>
              <div class="grades__events-list">
                <div v-for="evt in acEvents" :key="evt.eventId" class="grades__event-card">
                   <div class="grades__event-header">
                     <span class="grades__event-date">{{ formatDateShort(evt.timestamp) }}</span>
                     <button class="grades__icon-btn grades__icon-btn--danger" @click="onDeleteEvent(evt.eventId)">
                       <Trash2 :size="14" />
                     </button>
                   </div>
                   <div class="grades__event-note">{{ evt.note }}</div>
                </div>
              </div>
            </div>

            <!-- Notes (Step 8) -->
            <div class="grades__section">
              <h3 class="grades__section-title">Gradebook Notes</h3>
              <textarea 
                class="grades__notes-area"
                placeholder="Notes about this student's grades, accommodations, or grading decisions..."
                :value="activeClassRecord.students[selectedStudentId]?.gradebookNote || ''"
                @blur="e => saveGradebookNote(e.target.value)"
              ></textarea>
            </div>
          </div>
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
        <button v-if="gradeMap[selectedAssessmentId]?.[studentActionMenu.studentId]?.attempts?.length > 0" class="grades__context-btn" @click="startEdit(studentActionMenu.studentId, selectedAssessmentId, true); studentActionMenu = null">
          <Pencil :size="14" /> Change Mark
        </button>
      </div>
    </div>

    <div v-if="contextMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="contextMenu = null" @contextmenu.prevent="contextMenu = null">
      <div class="grades__context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <button class="grades__context-btn" @click="startEdit(contextMenu.sId, contextMenu.aId, false); contextMenu = null">
          <Plus :size="14" /> New Attempt
        </button>
        <button v-if="gradeMap[contextMenu.aId]?.[contextMenu.sId]?.attempts?.length > 0" class="grades__context-btn" @click="startEdit(contextMenu.sId, contextMenu.aId, true); contextMenu = null">
          <Pencil :size="14" /> Change Mark
        </button>
        <button class="grades__context-btn" @click="toggleMissing">
          <AlertCircle :size="14" /> {{ isMissing(contextMenu.sId, contextMenu.aId) ? 'Unmark Missing' : 'Mark Missing' }}
        </button>
        <button class="grades__context-btn" @click="toggleExcluded">
          <XCircle :size="14" /> {{ isExcluded(contextMenu.sId, contextMenu.aId) ? 'Include in Grade' : 'Mark Excluded' }}
        </button>
      </div>
    </div>

    <div v-if="assessmentMenu" class="grades__context-backdrop grades__context-backdrop--dim" @click="assessmentMenu = null" @contextmenu.prevent="assessmentMenu = null">
      <div class="grades__context-menu" :style="{ top: assessmentMenu.y + 'px', left: assessmentMenu.x + 'px' }">
        <button class="grades__context-btn" @click="startEditAssessment(assessmentMenu.assessment); assessmentMenu = null">
          <Pencil :size="14" /> Edit Assessment
        </button>
        <button class="grades__context-btn grades__context-btn--danger" @click="confirmDeleteAssessment(assessmentMenu.assessment); assessmentMenu = null">
          <Trash2 :size="14" /> Delete Assessment
        </button>
      </div>
    </div>

    <div v-if="attemptsPopover" class="grades__context-backdrop grades__context-backdrop--dim" @click="attemptsPopover = null" @contextmenu.prevent="attemptsPopover = null">
      <div class="grades__attempts-popover" :style="{ top: attemptsPopover.y + 'px', left: attemptsPopover.x + 'px' }" @click.stop>
        <div class="grades__popover-header">
          <h4 class="grades__popover-title">Attempt History — {{ attemptsPopover.studentName }}</h4>
          <div class="grades__popover-subtitle">{{ attemptsPopover.assessmentName }} (/{{ attemptsPopover.totalPoints }}) · Policy: {{ attemptsPopover.retestPolicy }}</div>
        </div>
        <ul class="grades__attempts-list">
          <li v-for="att in attemptsPopover.attempts" :key="att.attemptId" class="grades__attempt-item">
            <div class="grades__attempt-main">
              <div class="grades__attempt-info">
                <span class="grades__attempt-score">{{ att.pointsEarned }} / {{ attemptsPopover.totalPoints }}</span>
                <span class="grades__attempt-percent">({{ Math.round((att.pointsEarned / attemptsPopover.totalPoints) * 100) }}%)</span>
                <span class="grades__attempt-date">{{ formatDateShort(att.date) }}</span>
              </div>
              <div class="grades__attempt-counting">
                <template v-if="attemptsPopover.retestPolicy === 'Manual'">
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
          </li>
        </ul>
      </div>
    </div>

        <!-- Add Assessment Modal -->
        <div v-if="showAddModal" class="grades__modal-backdrop">
          <div class="grades__modal" role="dialog" aria-modal="true">
            <header class="grades__modal-header">
              <h3 class="grades__modal-title">{{ isEditingAssessment ? 'Edit Assessment' : 'New Assessment' }}</h3>
              <button class="grades__icon-btn" @click="showAddModal = false"><X :size="20" /></button>
            </header>
            
            <form class="grades__modal-form" @submit.prevent="saveAssessment">
              <!-- Target Toggle (Step 2) -->
              <div class="grades__form-group">
                <label class="grades__label">Scope</label>
                <div class="grades__toggle-group grades__toggle-group--large">
                  <button 
                    type="button" 
                    class="grades__toggle-btn" 
                    :class="{ 'grades__toggle-btn--active': newAssessment.target === 'class' }"
                    @click="newAssessment.target = 'class'; onTargetChange()"
                  >Class Assessment</button>
                  <button 
                    type="button" 
                    class="grades__toggle-btn" 
                    :class="{ 'grades__toggle-btn--active': newAssessment.target === 'individual' }"
                    @click="newAssessment.target = 'individual'; onTargetChange()"
                  >Individual Assessment</button>
                </div>
              </div>

              <!-- Student Picker (Individual Only) -->
              <div v-if="newAssessment.target === 'individual'" class="grades__form-group">
                <label class="grades__label">Target Student</label>
                <select v-model="newAssessment.targetStudentId" class="grades__input" required>
                  <option :value="null" disabled>Select student...</option>
                  <option v-for="s in sortedRoster" :key="s.studentId" :value="s.studentId">
                    {{ s.lastName }}, {{ s.firstName }}
                  </option>
                </select>
              </div>

              <div class="grades__form-group">
                <label class="grades__label">Name</label>
                <input v-model="newAssessment.name" class="grades__input" placeholder="e.g. Unit 1 Test" required />
              </div>

              <div class="grades__form-row">
                <div class="grades__form-group">
                  <label class="grades__label">Category</label>
                  <select v-model="newAssessment.categoryId" class="grades__input" required>
                    <option v-for="cat in activeClassRecord.gradebookCategories" :key="cat.categoryId" :value="cat.categoryId">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>
                <div class="grades__form-group">
                  <label class="grades__label">Type</label>
                  <select v-model="newAssessment.assessmentType" class="grades__input" required>
                    <option v-for="type in assessmentTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
                  </select>
                </div>
              </div>

              <div class="grades__form-row">
                <div class="grades__form-group">
                  <label class="grades__label">Date</label>
                  <input v-model="newAssessment.date" type="date" class="grades__input" required />
                </div>
                <div class="grades__form-group">
                  <label class="grades__label">Unit</label>
                  <select 
                    v-model="newAssessment.unit" 
                    class="grades__input"
                    :disabled="!activeClassRecord?.gradebookUnits?.length"
                  >
                    <option :value="null">Unassigned</option>
                    <option v-for="u in sortedUnits" :key="u.unitId" :value="u.name">
                      {{ u.name }}
                    </option>
                    <template v-if="!activeClassRecord?.gradebookUnits?.length">
                      <option disabled value="">No units defined — add units in Setup</option>
                    </template>
                  </select>
                </div>
              </div>

              <div class="grades__form-row">
                <div class="grades__form-group">
                  <label class="grades__label">Total Points</label>
                  <input v-model.number="newAssessment.totalPoints" type="number" min="1" class="grades__input" required />
                </div>
                <div class="grades__form-group">
                  <label class="grades__label">Scaled Total (Optional)</label>
                  <input v-model.number="newAssessment.scaledTotal" type="number" min="1" class="grades__input" placeholder="Raw" />
                </div>
              </div>

              <div class="grades__form-group">
                <label class="grades__label">Retest Policy</label>
                <select v-model="newAssessment.retestPolicy" class="grades__input">
                  <option value="Highest">Highest Attempt</option>
                  <option value="Latest">Latest Attempt</option>
                  <option value="Average">Average of Attempts</option>
                  <option value="Manual">Manual Selection</option>
                </select>
              </div>

              <div class="grades__modal-actions">
                <button type="button" class="grades__btn-ghost" @click="showAddModal = false">Cancel</button>
                <button type="submit" class="grades__btn-primary">{{ isEditingAssessment ? 'Update Assessment' : 'Create Assessment' }}</button>
              </div>
            </form>
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

import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useClassroom } from '../composables/useClassroom.js'
import { 
  activeClassRecord, 
  assessments,
  grades,
  classGrades, 
  selectedStudentId, 
  selectedMilestone,
  gradeMap,
  assessmentStats,
  loadGradebook,
  refreshGrades,
  enterGrade,
  changeGrade,
  clearGrade,
  markMissing,
  markExcluded,
  editAssessment,
  addAssessment,
  deleteAssessment,
  removeAttempt,
  saveStudentOverride,
  saveStudentGradebookNote,
  fetchStudentDossierData,
  deleteGradebookEvent,
  analyticsMode,
  excludeOutliers,
  classAnalytics,
  refreshClassAnalytics,
  toggleOutlierExclusion,
  toggleStudentFromAnalytics,
  resetAnalyticsState,
  distributionMode
} from '../composables/useGradebook.js'
import { Plus, BarChart2, Settings, Pencil, XCircle, AlertCircle, Trash2, X, MoreVertical, ArrowLeft, Check, ArrowUp, ArrowDown, Minus, GraduationCap, Eye, EyeOff, ChevronLeft, ChevronRight, UserCheck, Activity, FilePlus, Target, Hash, Calendar, Award, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-vue-next'
import GradeTrendChart from '../components/GradeTrendChart.vue'
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

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  classId: String,
  studentId: String
})

defineEmits(['navigate'])

const { classList, activeClass, getClass } = useClassroom()

const sidebarClassId = ref(activeClass.value?.classId || '')
const isLoading = ref(false)
const isCalculating = ref(false)
const displayMode = ref('percent') // 'raw' | 'percent'
const showAddModal = ref(false)
const analyticsSortBy = ref('date')
const analyticsSortOrder = ref('asc')
const isExclusionsOpen = ref(false)

const editingCell = ref(null) // { sId, aId, value }
const editInput = ref(null)
const contextMenu = ref(null) // { x, y, sId, aId }
const attemptsPopover = ref(null) // { x, y, sId, aId, studentName, attempts, totalPoints }
const editOriginalValue = ref(null)
const assessmentMenu = ref(null) // { x, y, assessment }
const isEditingAssessment = ref(false)
const currentAssessmentId = ref(null)
const selectedAssessmentId = ref(null)
const studentActionMenu = ref(null) // { x, y, studentId }
const newAttemptForm = ref(null) // { studentId, points, date, comment }
const filterCategory = ref(null)
const acEvents = ref([])
const studentAttendance = ref({ absences: 0, lates: 0 })
const isPrivacyMode = ref(false)
const isSidebarCollapsed = ref(false)
const isChangeMode = ref(false)
const gridSortBy = ref('name') // 'name' | 'grade'
const gridSortOrder = ref('asc') // 'asc' | 'desc'

const assessmentTypes = [
  { value: 'product', label: 'Product' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'observation', label: 'Observation' }
]
const newAssessment = reactive({
  name: '',
  categoryId: '',
  assessmentType: 'product',
  unit: null,
  target: 'class',
  targetStudentId: null,
  date: new Date().toISOString().slice(0, 10),
  totalPoints: 10,
  scaledTotal: null,
  retestPolicy: 'Highest'
})

watch(showAddModal, (val) => {
  if (val) {
    if (!isEditingAssessment.value && activeClassRecord.value?.gradebookCategories?.length) {
      newAssessment.categoryId = activeClassRecord.value.gradebookCategories[0].categoryId
    }
  } else {
    // Reset edit state when closed
    isEditingAssessment.value = false
    currentAssessmentId.value = null
    // Reset form for next 'Add' use
    newAssessment.name = ''
    newAssessment.unit = null
    newAssessment.assessmentType = 'product'
    newAssessment.target = 'class'
    newAssessment.targetStudentId = null
    newAssessment.totalPoints = 10
    newAssessment.scaledTotal = null
    newAssessment.retestPolicy = 'Highest'
  }
})

// --- Sorting ---
const sortedClassList = computed(() => {
  return [...classList.value].sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0))
})

const sortedRoster = computed(() => {
  if (!activeClassRecord.value?.students) return []
  
  const students = Object.keys(activeClassRecord.value.students)
    .map(id => ({ 
      studentId: id, 
      ...activeClassRecord.value.students[id],
      overallGrade: classGrades.value[id]?.overallGrade ?? -1
    }))

  return students.sort((a, b) => {
    let result = 0
    if (gridSortBy.value === 'name') {
      result = a.lastName.localeCompare(b.lastName)
    } else if (gridSortBy.value === 'grade') {
      result = a.overallGrade - b.overallGrade
    }
    
    return gridSortOrder.value === 'asc' ? result : -result
  })
})

const sortedUnits = computed(() => {
  if (!activeClassRecord.value?.gradebookUnits) return []
  return [...activeClassRecord.value.gradebookUnits].sort((a, b) => (a.order || 0) - (b.order || 0))
})

const studentEvidenceBalance = computed(() => {
  if (!selectedStudentId.value || !activeClassRecord.value) return null
  
  const studentGrades = grades.value.filter(g => g.studentId === selectedStudentId.value)
  const counts = { product: 0, conversation: 0, observation: 0 }
  let total = 0
  
  for (const grade of studentGrades) {
    const assessment = assessments.value.find(a => a.assessmentId === grade.assessmentId)
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
    .filter(a => a.target === 'class')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
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

const currentAssessmentSummary = computed(() => {
  if (!selectedAssessmentId.value || !currentAssessment.value) return null
  const stats = assessmentStats.value[selectedAssessmentId.value]
  
  // Calculate progress
  const totalStudents = sortedRoster.value.length
  const enteredCount = sortedRoster.value.filter(s => {
    const grade = gradeMap.value[selectedAssessmentId.value]?.[s.studentId]
    return grade && (grade.attempts.length > 0 || grade.missing || grade.excluded)
  }).length

  return {
    ...stats,
    enteredCount,
    totalStudents,
    percentEntered: totalStudents > 0 ? (enteredCount / totalStudents) * 100 : 0
  }
})

/**
 * Step 6: Sorted Assessment Analytics
 */
const sortedAnalyticsAssessments = computed(() => {
  if (!classAnalytics.value?.assessmentAnalytics) return []
  
  return assessments.value
    .filter(a => classAnalytics.value.assessmentAnalytics[a.assessmentId])
    .map(a => ({
      ...a,
      stats: classAnalytics.value.assessmentAnalytics[a.assessmentId]
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
})

const overallClassAvg = computed(() => {
  if (!classGrades.value) return null
  const gradesValues = Object.values(classGrades.value)
    .filter(g => g && g.overallGrade !== null)
    .map(g => g.overallGrade)
  
  if (gradesValues.length === 0) return null
  const sum = gradesValues.reduce((acc, g) => acc + g, 0)
  return sum / gradesValues.length
})

const overallClassMedian = computed(() => {
  if (!classGrades.value) return null
  const gradesValues = Object.values(classGrades.value)
    .filter(g => g && g.overallGrade !== null)
    .map(g => g.overallGrade)
  
  if (gradesValues.length === 0) return null
  const sorted = [...gradesValues].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
})

const overallClassSD = computed(() => {
  if (!classGrades.value) return null
  const gradesValues = Object.values(classGrades.value)
    .filter(g => g && g.overallGrade !== null)
    .map(g => g.overallGrade)
  
  if (gradesValues.length === 0) return null
  const mean = overallClassAvg.value
  const squareDiffs = gradesValues.map(v => Math.pow(v - mean, 2))
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
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

const studentOverallGrade = computed(() => {
  return classGrades.value[selectedStudentId.value]?.overallGrade ?? null
})

/**
 * Step 3: Rollup of most consistent level across class
 */
const classMostConsistent = computed(() => {
  if (!classGrades.value) return null
  
  const bucketCounts = {} // label -> count
  const bucketRanges = {} // label -> range
  
  Object.values(classGrades.value).forEach(sg => {
    // Bug 1: Aggregate categoryBreakdown across all students
    const cb = sg?.mostConsistent?.categoryBreakdown
    if (cb) {
      Object.values(cb).forEach(cat => {
        if (cat && cat.bucketLabel && !cat.isFallback) {
          bucketCounts[cat.bucketLabel] = (bucketCounts[cat.bucketLabel] || 0) + 1
          if (!bucketRanges[cat.bucketLabel]) {
            bucketRanges[cat.bucketLabel] = cat.bucketRange
          }
        }
      })
    }
  })
  
  const sorted = Object.entries(bucketCounts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null
  
  const [label, count] = sorted[0]
  return {
    label,
    count,
    range: bucketRanges[label],
    total: Object.keys(classGrades.value).length
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

const gradeTrendInfo = computed(() => {
  if (!selectedStudentId.value || !activeClassRecord.value?.gradebookMilestones?.length) return null
  
  const current = studentOverallGrade.value
  if (current === null) return null

  // Find most recent milestone that is in the past
  const now = new Date()
  const milestone = [...activeClassRecord.value.gradebookMilestones]
    .filter(m => new Date(m.date) <= now)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  
  if (!milestone) return null

  // For real trend, we'd need historical grades. For now, since we only have current and milestone context:
  // If a milestone is SELECTED in sidebar, we compare current with THAT milestone.
  const milestoneId = selectedMilestone.value || milestone.milestoneId
  const midtermGrade = classGrades.value[selectedStudentId.value]?.milestoneGrades?.[milestoneId]
  
  if (midtermGrade === undefined || midtermGrade === null) return null

  const diff = current - midtermGrade
  let trend = 'flat'
  let color = 'var(--text-secondary)'
  
  if (diff > 2) {
    trend = 'up'
    color = '#1a6b3a'
  } else if (diff < -2) {
    trend = 'down'
    color = '#c0392b'
  }

  return { midterm: midtermGrade, trend, color }
})

const studentCategoryBreakdown = computed(() => {
  if (!selectedStudentId.value || !activeClassRecord.value) return []
  const studentData = classGrades.value[selectedStudentId.value]
  if (!studentData) return []

  const overrides = activeClassRecord.value.students[selectedStudentId.value]?.categoryOverrides || {}

  return (activeClassRecord.value.gradebookCategories || []).map(cat => {
    let percentage = null
    let isOverridden = false
    const override = overrides[cat.categoryId]

    if (override !== undefined && override !== null) {
      const overrideValue = Number(override.overridePercentage ?? override)
      if (isNaN(overrideValue)) {
        // Fall back to calculated grade if override data is corrupt/NaN
        percentage = studentData.categoryResults[cat.categoryId]?.percentage ?? null
        isOverridden = false // It was an attempt at override, but invalid, so treat as not overridden
      } else {
        percentage = overrideValue
        isOverridden = true
      }
    } else {
      percentage = studentData.categoryResults[cat.categoryId]?.percentage ?? null
    }

    const consistentData = studentData.mostConsistent?.categoryBreakdown?.[cat.categoryId]

    return {
      categoryId: cat.categoryId,
      name: cat.name,
      percent: percentage,
      overridden: isOverridden,
      consistent: consistentData?.percentage ?? null,
      consistentLabel: consistentData?.bucketLabel ?? null,
      consistentCount: consistentData?.count ?? null,
      consistentTotalCount: consistentData?.totalCount ?? null,
      consistentIsFallback: consistentData?.isFallback ?? false
    }
  })
})

const filteredStudentAssessments = computed(() => {
  if (!selectedStudentId.value || !assessments.value) return []
  
  return sortedAssessments.value
    .filter(a => !filterCategory.value || a.categoryId === filterCategory.value)
    .map(a => {
      const g = gradeMap.value[a.assessmentId]?.[selectedStudentId.value]
      return {
        assessmentId: a.assessmentId,
        name: a.name,
        type: a.assessmentType,
        date: a.date,
        totalPoints: a.totalPoints,
        resolvedScore: g?.resolvedScore ?? null,
        missing: g?.missing,
        excluded: g?.excluded,
        attempts: g?.attempts?.length || 0
      }
    })
})

const dossierTrendData = computed(() => {
  // Logic for building the trend line: array of running average after each assessment
  if (!selectedStudentId.value) return []
  // This requires sequential calculation which is complex for a computed.
  // We'll simplify: return assessments that have grades.
  return filteredStudentAssessments.value.filter(a => a.resolvedScore !== null)
})

function toggleGridSort(column) {
  if (gridSortBy.value === column) {
    gridSortOrder.value = gridSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    gridSortBy.value = column
    // Default to descending for grades, ascending for name
    gridSortOrder.value = column === 'grade' ? 'desc' : 'asc'
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
  selectedStudentId.value = null
  await onClassChange()
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

function formatGrade(grade) {
  if (grade === null || grade === undefined) return '—'
  return Math.round(grade * 10) / 10 + '%'
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatCellGrade(value, totalPoints) {
  if (value === null || value === undefined) return '—'
  if (displayMode.value === 'raw') {
    return Math.round(value * 10) / 10
  }
  return Math.round((value / totalPoints) * 100) + '%'
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

async function startEdit(studentId, assessmentId, isChange = false) {
  const current = gradeMap.value[assessmentId]?.[studentId]
  const val = current ? current.resolvedScore : null
  editOriginalValue.value = val
  isChangeMode.value = isChange
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
      alert('Cannot clear: This student has multiple attempts. Use the attempt history menu (•) to manage or delete specific entries.')
      editingCell.value = null
      return
    }

    await clearGrade(aId, sId)
    editingCell.value = null
    return
  }

  const assessment = assessments.value.find(a => a.assessmentId === aId)
  if (!assessment) return

  // Clamp value (Safety guard)
  const points = Math.max(0, normalizedNew)
  
  // Validation: alert user of typos
  if (points > assessment.totalPoints) {
    alert(`Entry error: ${points} exceeds assessment max of ${assessment.totalPoints}. Score not saved.`)
    editingCell.value = null
    return
  }
  
  if (isChangeMode.value) {
    await changeGrade(aId, sId, points)
  } else {
    await enterGrade(aId, sId, points)
  }
  editingCell.value = null
  isChangeMode.value = false
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

function onHeaderMenu(e, assessment) {
  const { x, y } = getAdjustedPosition(e, 160, 100)
  assessmentMenu.value = {
    x, y,
    assessment
  }
}

function startEditAssessment(assessment) {
  isEditingAssessment.value = true
  currentAssessmentId.value = assessment.assessmentId
  
  newAssessment.name = assessment.name
  newAssessment.categoryId = assessment.categoryId
  newAssessment.assessmentType = assessment.assessmentType
  newAssessment.unit = assessment.unit || ''
  newAssessment.date = assessment.date
  newAssessment.totalPoints = assessment.totalPoints
  newAssessment.scaledTotal = assessment.scaledTotal
  newAssessment.retestPolicy = assessment.retestPolicy
  
  showAddModal.value = true
}

async function confirmDeleteAssessment(assessment) {
  if (!window.confirm(`Delete ${assessment.name}? This will permanently remove all grades for this assessment and cannot be undone.`)) return
  
  await deleteAssessment(assessment.assessmentId)
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
    retestPolicy: assessment.retestPolicy,
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
  
  if (!window.confirm('Delete this attempt? This cannot be undone.')) return
  
  await removeAttempt(aId, sId, attemptId)
  
  // Refresh attempts in popover or close if none left
  const updatedGrade = gradeMap.value[aId]?.[sId]
  if (!updatedGrade || updatedGrade.attempts.length === 0) {
    attemptsPopover.value = null
  } else {
    attemptsPopover.value.attempts = updatedGrade.attempts
  }
}

// --- Assessment Modal Helpers ---
function onTargetChange() {
  if (newAssessment.target === 'individual') {
    newAssessment.assessmentType = 'conversation'
  }
}

// --- Assessment Modal ---
async function saveAssessment() {
  if (!newAssessment.name || !newAssessment.categoryId) return
  
  const data = {
    name:           newAssessment.name,
    categoryId:     newAssessment.categoryId,
    assessmentType: newAssessment.assessmentType,
    unit:           newAssessment.unit,
    date:           newAssessment.date,
    target:         newAssessment.target,
    targetStudentId: newAssessment.targetStudentId,
    totalPoints:    newAssessment.totalPoints,
    scaledTotal:    newAssessment.scaledTotal,
    retestPolicy:   newAssessment.retestPolicy
  }

  if (isEditingAssessment.value) {
    await editAssessment(currentAssessmentId.value, data)
  } else {
    await addAssessment(data)
  }

  // Close (Reset is handled by watch)
  showAddModal.value = false
}

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
  if (assessment && newVal > assessment.totalPoints) {
    alert(`Entry error: ${newVal} exceeds assessment max of ${assessment.totalPoints}. Score not saved.`)
    // Optional: could reset the field here if we had a ref to the specific DOM element easily, 
    // but Blur navigation usually handles this by ignoring the change and moving on.
    return
  }

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
  if (assessment && points > assessment.totalPoints) {
    alert(`Entry error: ${points} exceeds assessment max of ${assessment.totalPoints}. Attempt not saved.`)
    return
  }

  await enterGrade(selectedAssessmentId.value, studentId, points, date, comment)
  newAttemptForm.value = null
}

// --- Dossier Methods ---
function isPostMilestone(date) {
  if (!selectedMilestone.value || !activeClassRecord.value) return false
  const m = activeClassRecord.value.gradebookMilestones.find(mil => mil.milestoneId === selectedMilestone.value)
  return m && new Date(date) > new Date(m.date)
}

async function loadDossierData() {
  if (!selectedStudentId.value) return
  const { acEvents: events, summary } = await fetchStudentDossierData(selectedStudentId.value)
  acEvents.value = events
  studentAttendance.value = summary
}

function getOverride(catId) {
  const override = activeClassRecord.value.students[selectedStudentId.value]?.categoryOverrides?.[catId]
  if (override === undefined || override === null) return ''
  return typeof override === 'object' ? (override.overridePercentage ?? '') : override
}

async function saveOverride(catId, value) {
  await saveStudentOverride(selectedStudentId.value, catId, value)
}

async function saveGradebookNote(note) {
  await saveStudentGradebookNote(selectedStudentId.value, note)
}

async function onDeleteEvent(eventId) {
  if (!window.confirm('Delete this assessment conversation record?')) return
  await deleteGradebookEvent(eventId)
  acEvents.value = acEvents.value.filter(e => e.eventId !== eventId)
}

// --- Lifecycle ---
onMounted(async () => {
  if (props.classId) {
    sidebarClassId.value = props.classId
    await onClassChange()
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
    loadDossierData()
    filterCategory.value = null
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

/* ── Sidebar ────────────────────────────────────────────────────────── */
.grades__sidebar {
  width: 280px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}

.grades__sidebar-section {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.grades__sidebar-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grades__sidebar-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.grades__input--sidebar {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  font-size: 0.9rem;
  font-family: inherit;
}

.grades__no-data {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.4;
}

.grades__category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grades__category-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.grades__category-weight {
  font-weight: 600;
}

/* ── Milestones ─────────────────────────────────────────────────────── */
.grades__milestone-row {
  display: flex;
  background: var(--bg-secondary);
  padding: 2px;
  border-radius: var(--radius-sm);
  gap: 2px;
}

.grades__milestone-btn {
  flex: 1;
  padding: 6px 4px;
  border: none;
  background: transparent;
  border-radius: calc(var(--radius-sm) - 2px);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grades__milestone-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
  font-weight: 700;
}

/* ── Student List ───────────────────────────────────────────────────── */
.grades__roster-container {
  flex: 1;
  overflow-y: auto;
}

.grades__roster {
  list-style: none;
  padding: 0;
  margin: 0;
}

.grades__roster-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s ease;
}

.grades__roster-item:hover {
  background: var(--bg-secondary);
}

.grades__roster-item--active {
  background: var(--primary-light);
  border-left: 4px solid var(--primary);
  padding-left: 12px;
}

.grades__roster-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
}

.grades__roster-grade {
  font-size: 0.85rem;
  font-weight: 700;
}

.grades__roster-grade--empty {
  color: var(--text-secondary);
  font-weight: 400;
}

.grades__manage-link {
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  border-top: 1px solid var(--border);
}

.grades__manage-link:hover {
  color: var(--primary);
  background: var(--bg-secondary);
}

/* ── Main Panel ─────────────────────────────────────────────────────── */
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
verall-trend {
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
  gap: 20px;
  z-index: 20;
}

.grades__toolbar-left,
.grades__toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.grades__sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grades__sidebar-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.grades__sidebar-select-wrapper {
  position: relative;
}

.grades__sidebar-select {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 8px 32px 8px 12px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 700;
  appearance: none;
  cursor: pointer;
  color: var(--text);
  transition: all 0.2s;
}

.grades__sidebar-select:hover {
  border-color: var(--primary);
}

.grades__sidebar-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

/* Custom chevron for sidebar select */
.grades__sidebar-select-wrapper::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-chevron-down'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  pointer-events: none;
  opacity: 0.5;
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

.grades__toolbar-select-wrapper {
  position: relative;
}

.grades__toolbar-select {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 6px 32px 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  appearance: none;
  cursor: pointer;
  min-width: 160px;
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
  min-width: 220px;
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
  max-height: 200px;
  overflow-y: auto;
}

.grades__attempt-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grades__attempt-item:last-child {
  border-bottom: none;
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
  padding: 24px 32px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
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

.grades__ath-student { width: 40%; }
.grades__ath-score   { width: 150px; }
.grades__ath-percent { width: 100px; text-align: center; }
.grades__ath-status  { width: 150px; }

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

.grades__dot-indicator {
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 1.4rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
}

.grades__dot-indicator:hover {
  transform: scale(1.2);
  font-weight: 700;
}

.grades__status-tag--entered { color: #1a6b3a; font-weight: 500; }
.grades__status-tag--missing { color: #c0392b; font-weight: 500; }
.grades__status-tag--excluded { color: var(--text-secondary); font-style: italic; }
.grades__status-tag--empty { color: var(--text-secondary); opacity: 0.5; }

/* ── New Assessment View Styles ─────────────────────────── */
.grades__assessment-view {
  background: var(--bg);
  height: 100%;
  overflow-y: auto;
  padding: 32px;
}

.grades__focused-view {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.grades__breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.grades__breadcrumb-link {
  background: transparent;
  border: none;
  padding: 0;
  color: var(--primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.grades__breadcrumb-link:hover {
  opacity: 0.7;
}

.grades__breadcrumb-sep {
  opacity: 0.5;
}

.grades__assessment-card {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;
  background: var(--surface);
  padding: 12px 0;
  align-items: center;
}

.grades__card-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grades__card-header-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.grades__header-actions {
  display: flex;
  gap: 8px;
}

.grades__card-title {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
}

.grades__btn-action {
  width: 36px;
  height: 36px;
  border-radius: 10px;
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
  border-color: var(--state-out);
  color: var(--state-out);
}

.grades__assessment-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.grades__meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.grades__meta-item:hover {
  border-color: var(--border);
  color: var(--text);
}

.grades__assessment-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.grades__stat-card-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.grades__stat-card-value-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.grades__stat-card-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.grades__stat-card-value small {
  font-size: 0.9rem;
  opacity: 0.5;
  font-weight: 500;
}

.grades__stat-card-percent {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.grades__mini-progress {
  width: 60px;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.grades__mini-progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
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
  width: 140px;
}

.grades__score-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Ghost Input Styling */
.grades__input-ghost {
  width: 100%;
  max-width: 60px;
  padding: 6px 8px;
  background: transparent;
  border: 1px solid transparent;
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

.grades__input-ghost--date { font-size: 0.8rem; width: 130px; font-weight: 500; }
.grades__input-ghost--note { font-size: 0.8rem; width: 150px; font-weight: 500; text-align: left; }

.grades__btn-ghost--danger {
  color: var(--state-out);
}

/* Evidence Balance Bars */
.grades__evidence-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
}

.grades__evidence-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grades__evidence-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.grades__progress-bg {
  height: 10px;
  background: var(--bg-secondary);
  border-radius: 5px;
  overflow: hidden;
}

.grades__progress-bar {
  height: 100%;
  background: var(--primary);
  border-radius: 5px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.grades__progress-bar--observation {
  background: #34c759; /* iOS Green */
}

.grades__progress-bar--conversation {
  background: #5856d6; /* iOS Indigo */
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
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.grades__stat-card {
  flex: 0 0 auto;
  width: calc(33.333% - 11px);
  min-width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.grades__stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border-color: var(--primary);
}

.grades__stat-card--active {
  background: var(--bg-secondary);
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(111, 146, 255, 0.1);
}

.grades__card-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.grades__card-metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grades__card-metric-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* Switch to start to allow multi-line values */
  gap: 8px;
  font-size: 13px;
}

.grades__card-metric-label {
  color: var(--text-secondary);
}

.grades__card-metric-value {
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  line-height: 1.2;
}

.grades__card-hint {
  display: block; /* Force hint to its own line if it wraps or just to give it space */
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 400;
  margin-top: 2px;
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
</style>
