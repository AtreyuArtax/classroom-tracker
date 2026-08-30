<template>
  <div class="grades__analytics-panel">
    <!-- Analytics Header Controls -->
    <header class="grades__analytics-header">
      <div class="header-title-group">
        <h2 class="analytics-main-title">Class Analytics &amp; Performance</h2>
        <span class="analytics-subtitle-text">Statistical insights, category weighting &amp; evidence triangulation</span>
      </div>

      <div class="header-controls-group">
        <!-- Sub-Cohort Filter Pills (Split-Grade or Split-Section Classes) -->
        <div v-if="availableSubCohorts.length > 1" class="subcohort-toggle">
          <span class="toggle-label">{{ activeClassRecord?.classType === 'elementary' ? 'Grade:' : 'Section:' }}</span>
          <div class="toggle-pill-group">
            <button 
              v-for="subCohort in availableSubCohorts"
              :key="subCohort"
              class="toggle-pill"
              :class="{ 'toggle-pill--active': activeSubCohortFilter === subCohort }"
              @click="setActiveSubCohortFilter(subCohort)"
            >
              {{ subCohort === 'all' ? (activeClassRecord?.classType === 'elementary' ? 'All Grades' : 'All Sections') : subCohort }}
            </button>
          </div>
        </div>

        <!-- Evidence Scope Filter Control Bar -->
        <div class="evidence-toggle">
          <span class="toggle-label">Evidence:</span>
          <div class="toggle-pill-group">
            <button 
              class="toggle-pill" 
              :class="{ 'toggle-pill--active': analyticsEvidenceScope === 'all' }"
              @click="setAnalyticsEvidenceScope('all')"
              title="Include all graded evidence (Products, Observations, Conversations) — matches Gradebook Grid average"
            >
              All Evidence
            </button>
            <button 
              class="toggle-pill" 
              :class="{ 'toggle-pill--active': analyticsEvidenceScope === 'product' }"
              @click="setAnalyticsEvidenceScope('product')"
              title="Isolate uniform Product assessments (tests, quizzes, assignments) — excludes observational/conversational marks"
            >
              Products Only
            </button>
          </div>
        </div>

        <!-- Exclusion Filter Control Bar -->
        <div class="exclusion-toggle">
          <span class="toggle-label">Exclusions:</span>
          <div class="toggle-pill-group">
            <button 
              class="toggle-pill" 
              :class="{ 'toggle-pill--active': exclusionMode === 'none' }"
              @click="setExclusionMode('none')"
            >
              Include All ({{ sortedRoster.length }})
            </button>
            <button 
              class="toggle-pill" 
              :class="{ 'toggle-pill--active': exclusionMode === 'fixed' }"
              @click="setExclusionMode('fixed')"
            >
              <span v-if="exclusionMode !== 'fixed'">Below {{ fixedExclusionThreshold }}%</span>
              <div v-else class="threshold-editor" @click.stop>
                Below <input 
                  type="number" 
                  v-model.number="fixedExclusionThreshold" 
                  @blur="onThresholdChange"
                  @keyup.enter="onThresholdChange"
                  class="threshold-input"
                  min="0"
                  max="100"
                />%
              </div>
            </button>
            <button 
              class="toggle-pill" 
              :class="{ 'toggle-pill--active': exclusionMode === 'auto' }"
              @click="setExclusionMode('auto')"
            >
              Auto Outliers
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Active Exclusion Notice Banner -->
    <div v-if="exclusionMode !== 'none'" class="grades__outlier-notice" :title="excludedNames">
      <AlertCircle :size="15" />
      <span><strong>Exclusion Active:</strong> {{ classAnalytics?.outlierCount || 0 }} {{ classAnalytics?.outlierCount === 1 ? 'student is' : 'students are' }} excluded from class calculations. ({{ excludedNames }})</span>
    </div>

    <!-- Category Weight Audit Warning -->
    <div v-if="isWeightWarningVisible" 
      class="grades__weight-warning"
      :class="categoryWeightTotal > 100 ? 'grades__weight-warning--over' : 'grades__weight-warning--under'">
      <AlertTriangle :size="15" />
      <span>Audit Note: Category weights sum to {{ categoryWeightTotal }}%. Averages will be scaled, but 100% is recommended for audit clarity.</span>
    </div>

    <!-- Calculating Overlay -->
    <div v-if="isCalculating" class="grades__calculating-overlay">
      <div class="grades__spinner"></div>
      <p>Calculating analytics...</p>
    </div>

    <!-- Empty state -->
    <div v-if="!classAnalytics && !isCalculating" class="grades__empty-analytics">
      <div class="grades__empty-content">
        <BarChart2 :size="56" class="grades__empty-icon" />
        <h3>No analytics available yet.</h3>
        <p>Enter grades in the Grid view to see class performance data.</p>
        <button class="grades__btn-primary" @click="analyticsMode = false">
          <ArrowLeft :size="16" /> Switch to Grid
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="classAnalytics" class="grades__analytics-scrollable">
      <div class="grades__analytics-sections">
        
        <!-- 1. Executive Stat Ribbon (High-Density Metric Strip with Informative Tooltips) -->
        <div class="stat-ribbon">
          <!-- Stat 1: Class Average -->
          <div 
            class="stat-ribbon__item"
            :title="analyticsEvidenceScope === 'product'
              ? 'Class Average (Products Only): The arithmetic mean calculated strictly from uniform Product assessments (tests, quizzes, assignments).'
              : 'Class Average: The arithmetic mean of all included student grades across all graded evidence (matches Gradebook Grid).'"
          >
            <div class="stat-ribbon__label">
              <BarChart3 :size="13" class="stat-icon stat-icon--blue" />
              <span>Class Average</span>
            </div>
            <div class="stat-ribbon__value-row">
              <span class="stat-ribbon__num" :style="{ color: getHeatTextColor(overallClassAvg) }">
                {{ formatGrade(overallClassAvg) }}
              </span>
              <span v-if="analyticsEvidenceScope === 'product'" class="stat-scope-inline-badge">Product Only</span>
            </div>
          </div>

          <!-- Stat 2: Class Median -->
          <div 
            class="stat-ribbon__item"
            :title="`Class Median (50th Percentile): The exact midpoint mark (${analyticsEvidenceScope === 'product' ? 'Products Only' : 'All Evidence'}). Unlike the average, it is immune to extreme high or low grades.`"
          >
            <div class="stat-ribbon__label">
              <CheckCircle2 :size="13" class="stat-icon stat-icon--green" />
              <span>Class Median</span>
            </div>
            <div class="stat-ribbon__value-row">
              <span class="stat-ribbon__num" :style="{ color: getHeatTextColor(overallClassMedian) }">
                {{ formatGrade(overallClassMedian) }}
              </span>
              <span v-if="analyticsEvidenceScope === 'product'" class="stat-scope-inline-badge">Product Only</span>
            </div>
          </div>

          <!-- Stat 3: Spread (Standard Deviation & Range) -->
          <div 
            class="stat-ribbon__item"
            :title="`Spread (Standard Deviation): ±${overallClassSD ? overallClassSD.toFixed(1) + '%' : '0%'} measures score clustering around the average (${analyticsEvidenceScope === 'product' ? 'Products Only' : 'All Evidence'}). Full Score Range: ${formatGrade(scoreRange.lowest)} to ${formatGrade(scoreRange.highest)}.`"
          >
            <div class="stat-ribbon__label">
              <TrendingUp :size="13" class="stat-icon stat-icon--amber" />
              <span>Spread (±SD)</span>
            </div>
            <div class="stat-ribbon__value-row">
              <span class="stat-ribbon__num">
                ±{{ overallClassSD !== null ? overallClassSD.toFixed(1) + '%' : '—' }}
              </span>
            </div>
          </div>

          <!-- Stat 4: At-Risk / Intervention (Clickable to List & Open Profiles) -->
          <div 
            class="stat-ribbon__item stat-ribbon__item--at-risk"
            :class="{ 'stat-ribbon__item--clickable': atRiskStudents.length > 0, 'stat-ribbon__item--open': isAtRiskPopoverOpen }"
            :title="atRiskStudents.length > 0 ? 'Click to view at-risk students and open profiles' : 'All active students are currently above 50%'"
            @click="toggleAtRiskPopover"
          >
            <div class="stat-ribbon__label">
              <AlertCircle :size="13" :class="['stat-icon', atRiskStudents.length > 0 ? 'stat-icon--red' : 'stat-icon--green']" />
              <span>At-Risk (&lt;50%)</span>
              <ChevronDown v-if="atRiskStudents.length > 0" :size="12" class="at-risk-chevron" :style="{ transform: isAtRiskPopoverOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }" />
            </div>
            <div class="stat-ribbon__value-row">
              <span class="stat-ribbon__num" :class="{ 'stat-ribbon__num--danger': atRiskStudents.length > 0 }">
                {{ atRiskStudents.length }}
                <span class="stat-unit">{{ atRiskStudents.length === 1 ? 'student' : 'students' }}</span>
              </span>
            </div>

            <!-- Interactive Floating Popover to Click into Student Profile -->
            <div v-if="isAtRiskPopoverOpen && atRiskStudents.length > 0" class="at-risk-popover" @click.stop>
              <div class="at-risk-popover__header">
                <span>At-Risk (&lt;50%)</span>
                <span class="at-risk-popover__hint">Click to open Profile</span>
              </div>
              <div class="at-risk-popover__list">
                <button 
                  v-for="s in atRiskStudents" 
                  :key="s.studentId"
                  class="at-risk-popover__item"
                  @click="openStudentDossier(s.studentId)"
                >
                  <span class="at-risk-popover__name">{{ s.name }}</span>
                  <span class="at-risk-popover__grade">{{ formatGrade(s.grade) }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Stat 5: Triangulation Ratio -->
          <div 
            class="stat-ribbon__item stat-ribbon__item--evidence"
            title="Evidence Triangulation: Growing Success distribution across Product (tests/projects), Observation, and Conversation evidence."
          >
            <div class="stat-ribbon__label">
              <Layers :size="13" class="stat-icon stat-icon--purple" />
              <span>Triangulation</span>
            </div>
            <!-- Mini Triangulation Segment Bar -->
            <div class="mini-evidence-bar">
              <div 
                class="mini-segment mini-segment--product"
                :style="{ width: classEvidenceBlend.product.percentage + '%' }"
                :title="`Product: ${classEvidenceBlend.product.count} (${classEvidenceBlend.product.percentage}%)`"
              ></div>
              <div 
                class="mini-segment mini-segment--observation"
                :style="{ width: classEvidenceBlend.observation.percentage + '%' }"
                :title="`Observation: ${classEvidenceBlend.observation.count} (${classEvidenceBlend.observation.percentage}%)`"
              ></div>
              <div 
                class="mini-segment mini-segment--conversation"
                :style="{ width: classEvidenceBlend.conversation.percentage + '%' }"
                :title="`Conversation: ${classEvidenceBlend.conversation.count} (${classEvidenceBlend.conversation.percentage}%)`"
              ></div>
            </div>
            <div class="stat-ribbon__sub evidence-sub-chips">
              <span class="chip-p" :title="`${classEvidenceBlend.product.count} Product assessments`">
                {{ classEvidenceBlend.product.count }} Prod ({{ classEvidenceBlend.product.percentage }}%)
              </span>
              <span v-if="classEvidenceBlend.observation.count > 0" class="chip-o" :title="`${classEvidenceBlend.observation.count} Observation assessments`">
                · {{ classEvidenceBlend.observation.count }} Obs
              </span>
              <span v-if="classEvidenceBlend.conversation.count > 0" class="chip-c" :title="`${classEvidenceBlend.conversation.count} Conversation assessments`">
                · {{ classEvidenceBlend.conversation.count }} Conv
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Two-Column Row: Cohort Distribution + Pedagogical Hotspots -->
        <div class="analytics-grid-2col">
          
          <!-- Column 1: Grade Distribution Histogram -->
          <div class="analytics-card">
            <div class="analytics-card__header">
              <div class="card-title-group">
                <BarChart2 :size="15" class="card-header-icon" />
                <h3 class="analytics-card__title">Cohort Performance</h3>
                <span class="card-scope-badge" :class="{ 'card-scope-badge--product': analyticsEvidenceScope === 'product' }">
                  {{ analyticsEvidenceScope === 'product' ? 'Products Only' : 'All Evidence' }}
                </span>
              </div>
              <div class="toggle-pill-group toggle-pill-group--sm">
                <button 
                  class="toggle-pill toggle-pill--sm"
                  :class="{ 'toggle-pill--active': distributionMode === 'levels' }"
                  @click="distributionMode = 'levels'"
                >Levels</button>
                <button 
                  class="toggle-pill toggle-pill--sm"
                  :class="{ 'toggle-pill--active': distributionMode === 'buckets' }"
                  @click="distributionMode = 'buckets'"
                >10% Buckets</button>
              </div>
            </div>

            <!-- Chart Display -->
            <div class="chart-wrapper">
              <Bar :data="bucketChartData" :options="bucketChartOptions" />
            </div>

            <!-- Clean Single Distribution Summary Footer -->
            <div class="distribution-footer-stat">
              <span v-if="distributionMode === 'levels'">
                <strong>Level 3 &amp; 4 Mastery:</strong> {{ levelMasteryCount }} of {{ activeStudentGrades.length }} students ({{ levelMasteryPct }}%)
              </span>
              <span v-else>
                <strong>Dominant Range:</strong> {{ classMostConsistent ? classMostConsistent.label : '—' }} ({{ classMostConsistent?.count || 0 }} students)
              </span>
            </div>
          </div>

          <!-- Column 2: Instructional Highlights & Hotspots -->
          <div class="analytics-card">
            <div class="analytics-card__header">
              <div class="card-title-group">
                <Sparkles :size="15" class="card-header-icon card-header-icon--gold" />
                <h3 class="analytics-card__title">Instructional Highlights &amp; Hotspots</h3>
              </div>
              <span class="card-header-tag">Pedagogical Signals</span>
            </div>

            <div class="hotspots-container">
              <!-- Toughest Assessment -->
              <div 
                v-if="instructionalHotspots.toughest" 
                class="hotspot-item hotspot-item--warning"
                @click="$emit('select-assessment', instructionalHotspots.toughest.assessmentId)"
                title="Click to view assessment details"
              >
                <div class="hotspot-item__icon hotspot-item__icon--warning">
                  <AlertTriangle :size="15" />
                </div>
                <div class="hotspot-item__content">
                  <div class="hotspot-item__top">
                    <span class="hotspot-badge hotspot-badge--warning">Toughest Assessment</span>
                    <span class="hotspot-cat">{{ getCategoryName(instructionalHotspots.toughest.categoryId) }}</span>
                  </div>
                  <div class="hotspot-item__name">{{ instructionalHotspots.toughest.name }}</div>
                  <div class="hotspot-item__stats">
                    <span>Avg: <strong :style="{ color: getHeatTextColor(instructionalHotspots.toughest.stats.mean) }">{{ formatGrade(instructionalHotspots.toughest.stats.mean) }}</strong></span>
                    <span>Median: {{ formatGrade(instructionalHotspots.toughest.stats.median) }}</span>
                    <span v-if="instructionalHotspots.toughest.stats.sd">±{{ instructionalHotspots.toughest.stats.sd.toFixed(1) }}% SD</span>
                  </div>
                </div>
                <ChevronRight :size="15" class="hotspot-chevron" />
              </div>

              <!-- Highest Consistency -->
              <div 
                v-if="instructionalHotspots.consistent" 
                class="hotspot-item hotspot-item--success"
                @click="$emit('select-assessment', instructionalHotspots.consistent.assessmentId)"
                title="Click to view assessment details"
              >
                <div class="hotspot-item__icon hotspot-item__icon--success">
                  <Target :size="15" />
                </div>
                <div class="hotspot-item__content">
                  <div class="hotspot-item__top">
                    <span class="hotspot-badge hotspot-badge--success">Highest Mastery &amp; Consistency</span>
                    <span class="hotspot-cat">{{ getCategoryName(instructionalHotspots.consistent.categoryId) }}</span>
                  </div>
                  <div class="hotspot-item__name">{{ instructionalHotspots.consistent.name }}</div>
                  <div class="hotspot-item__stats">
                    <span>Avg: <strong :style="{ color: getHeatTextColor(instructionalHotspots.consistent.stats.mean) }">{{ formatGrade(instructionalHotspots.consistent.stats.mean) }}</strong></span>
                    <span>Tightly Clustered: <strong>±{{ instructionalHotspots.consistent.stats.sd.toFixed(1) }}% SD</strong></span>
                  </div>
                </div>
                <ChevronRight :size="15" class="hotspot-chevron" />
              </div>

              <!-- Widest Polarization (Highest SD) -->
              <div 
                v-if="instructionalHotspots.polarized && instructionalHotspots.polarized.assessmentId !== instructionalHotspots.toughest?.assessmentId" 
                class="hotspot-item hotspot-item--info"
                @click="$emit('select-assessment', instructionalHotspots.polarized.assessmentId)"
                title="Click to view assessment details"
              >
                <div class="hotspot-item__icon hotspot-item__icon--info">
                  <Activity :size="15" />
                </div>
                <div class="hotspot-item__content">
                  <div class="hotspot-item__top">
                    <span class="hotspot-badge hotspot-badge--info">Widest Score Gap (Polarizing)</span>
                    <span class="hotspot-cat">{{ getCategoryName(instructionalHotspots.polarized.categoryId) }}</span>
                  </div>
                  <div class="hotspot-item__name">{{ instructionalHotspots.polarized.name }}</div>
                  <div class="hotspot-item__stats">
                    <span>Avg: {{ formatGrade(instructionalHotspots.polarized.stats.mean) }}</span>
                    <span>Spread: <strong>±{{ instructionalHotspots.polarized.stats.sd.toFixed(1) }}% SD</strong></span>
                    <span v-if="instructionalHotspots.polarized.stats.lowest != null">Range: {{ formatGrade(instructionalHotspots.polarized.stats.lowest) }}–{{ formatGrade(instructionalHotspots.polarized.stats.highest) }}</span>
                  </div>
                </div>
                <ChevronRight :size="15" class="hotspot-chevron" />
              </div>

              <div v-if="!instructionalHotspots.toughest && !instructionalHotspots.consistent" class="hotspot-empty">
                Enter more graded assessments to generate instructional insight callouts.
              </div>
            </div>
          </div>

        </div>

        <!-- 3. Category Weight & Performance Breakdown Grid -->
        <div v-if="categoryBreakdowns.length > 0" class="analytics-card analytics-card--compact">
          <div class="analytics-card__header">
            <div class="card-title-group">
              <Layers :size="15" class="card-header-icon" />
              <h3 class="analytics-card__title">Curriculum Category Weighting &amp; Performance</h3>
            </div>
            <span class="card-header-tag">{{ categoryWeightTotal }}% Total Weight</span>
          </div>

          <div class="category-grid">
            <div 
              v-for="cat in categoryBreakdowns" 
              :key="cat.categoryId"
              class="category-card"
              :class="{ 'category-card--empty': cat.weight === 0 && cat.assessmentCount === 0 }"
            >
              <div class="category-card__header">
                <span class="category-card__name" :title="cat.name">{{ cat.name }}</span>
                <span class="category-card__weight-badge">{{ cat.weight }}% weight</span>
              </div>
              <div class="category-card__body">
                <div class="category-card__score-row">
                  <span class="category-card__score" :style="{ color: getHeatTextColor(cat.average) }">
                    {{ formatGrade(cat.average) }}
                  </span>
                  <span class="category-card__meta">
                    {{ cat.assessmentCount }} {{ cat.assessmentCount === 1 ? 'task' : 'tasks' }} · {{ cat.studentCount }} eval
                  </span>
                </div>
                <!-- Subtle Progress Meter -->
                <div class="category-card__meter">
                  <div 
                    class="category-card__meter-bar" 
                    :style="{ 
                      width: Math.min(100, cat.average || 0) + '%',
                      backgroundColor: getHeatColorHex(cat.average)
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Unified Assessment Performance Matrix (Compact Scrollable Window) -->
        <div class="analytics-card analytics-card--matrix">
          <div class="analytics-card__header">
            <div class="card-title-group">
              <FileText :size="15" class="card-header-icon" />
              <h3 class="analytics-card__title">Assessment Performance Matrix</h3>
            </div>

            <!-- Tab Filter Pills -->
            <div class="assessment-filter-tabs">
              <button 
                class="tab-btn" 
                :class="{ 'tab-btn--active': activeAssessmentTab === 'all' }"
                @click="activeAssessmentTab = 'all'"
              >
                All ({{ classAnalytics.assessmentBreakdowns?.length || 0 }})
              </button>
              <button 
                class="tab-btn" 
                :class="{ 'tab-btn--active': activeAssessmentTab === 'product' }"
                @click="activeAssessmentTab = 'product'"
              >
                Products ({{ productCount }})
              </button>
              <button 
                class="tab-btn" 
                :class="{ 'tab-btn--active': activeAssessmentTab === 'observation' }"
                @click="activeAssessmentTab = 'observation'"
              >
                Observations ({{ observationCount }})
              </button>
              <button 
                class="tab-btn" 
                :class="{ 'tab-btn--active': activeAssessmentTab === 'conversation' }"
                @click="activeAssessmentTab = 'conversation'"
              >
                Conversations ({{ conversationCount }})
              </button>
            </div>
          </div>

          <!-- Unified Table Area -->
          <div class="table-wrapper">
            <table class="analytics-table">
              <thead>
                <tr>
                  <th @click="toggleSort('name')" class="th-sortable">
                    ASSESSMENT {{ analyticsSortBy === 'name' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                  </th>
                  <th>TYPE / CATEGORY</th>
                  <th @click="toggleSort('date')" class="th-sortable">
                    DATE {{ analyticsSortBy === 'date' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                  </th>
                  <th @click="toggleSort('mean')" class="th-sortable text-right">
                    AVERAGE {{ analyticsSortBy === 'mean' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                  </th>
                  <th @click="toggleSort('median')" class="th-sortable text-right">
                    MEDIAN {{ analyticsSortBy === 'median' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                  </th>
                  <th @click="toggleSort('sd')" class="th-sortable text-right">
                    STD DEV {{ analyticsSortBy === 'sd' ? (analyticsSortOrder === 'asc' ? '↑' : '↓') : '' }}
                  </th>
                  <th>RANGE (LOW–HIGH)</th>
                  <th>CONSISTENCY</th>
                  <th style="min-width: 100px;">DISTRIBUTION</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="a in unifiedFilteredAssessments" 
                  :key="a.assessmentId"
                  class="analytics-table-row"
                  @click="$emit('select-assessment', a.assessmentId)"
                  title="Click to view assessment details"
                >
                  <td class="td-name">
                    {{ a.name }}
                  </td>
                  <td>
                    <div class="type-category-group">
                      <span class="type-pill" :class="'type-pill--' + (a.assessmentType || 'product')">
                        {{ (a.assessmentType || 'product').slice(0, 4) }}
                      </span>
                      <span class="category-chip">{{ getCategoryName(a.categoryId) }}</span>
                    </div>
                  </td>
                  <td class="td-date">
                    {{ a.date || '—' }}
                  </td>
                  <td class="text-right" :style="{ color: getHeatTextColor(a.stats.mean), fontWeight: 'bold' }">
                    {{ formatGrade(a.stats.mean) }}
                  </td>
                  <td class="text-right">
                    {{ formatGrade(a.stats.median) }}
                  </td>
                  <td class="text-right">
                    {{ a.stats.sd !== null ? a.stats.sd.toFixed(1) + '%' : '—' }}
                  </td>
                  <td>
                    <span class="range-text-pill" v-if="a.stats.lowest != null && a.stats.highest != null">
                      {{ formatGrade(a.stats.lowest) }} – {{ formatGrade(a.stats.highest) }}
                    </span>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td>
                    <span 
                      class="consistency-badge"
                      :class="'consistency-badge--' + getConsistencyInfo(a.stats.sd).class"
                    >
                      <AlertTriangle v-if="getConsistencyInfo(a.stats.sd).icon === 'AlertTriangle'" :size="11" style="display: inline-block; vertical-align: -1px; margin-right: 2px;" />
                      <span v-else-if="getConsistencyInfo(a.stats.sd).icon" class="status-dot" :class="'status-dot--' + getConsistencyInfo(a.stats.sd).icon" /> {{ getConsistencyInfo(a.stats.sd).label }}
                    </span>
                  </td>
                  <td>
                    <div class="grades__sparkline" v-if="a.stats.distributionBuckets">
                      <div 
                        v-for="bucket in (distributionMode === 'buckets' ? a.stats.distributionBuckets : a.stats.levelBuckets)" 
                        :key="bucket.label"
                        class="grades__sparkline-bar"
                        :style="{ 
                          height: Math.max(15, (bucket.count / a.stats.totalCount * 100)) + '%',
                          background: bucket.count > 0 ? getHeatColorHex(bucket.range[0]) : 'var(--border)'
                        }"
                        :title="`${bucket.label}: ${bucket.count} students`"
                      ></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!unifiedFilteredAssessments.length" class="empty-table-hint">No assessments found for this filter.</p>
        </div>

        <!-- 5. Individual Student Exclusions (Collapsible Drawer) -->
        <div class="analytics-card analytics-card--collapsible">
          <header class="collapsible-header" @click="isExclusionsOpen = !isExclusionsOpen">
            <div class="collapsible-title-group">
              <Users :size="15" />
              <h3 class="analytics-card__title">Individual Student Exclusions</h3>
              <span class="exclusion-count-tag">{{ classAnalytics?.outlierCount || 0 }} Excluded</span>
            </div>
            <ChevronRight :size="16" :style="{ transform: isExclusionsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }" />
          </header>
          
          <div v-if="isExclusionsOpen" class="exclusion-drawer-body">
            <p class="exclusion-hint">Students checked below are excluded from all class analytics calculations. Their actual student grades remain intact.</p>
            <div class="exclusion-checkbox-grid">
              <div v-for="s in sortedRoster" :key="s.studentId" class="exclusion-checkbox-item">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    :checked="s.excludeFromAnalytics" 
                    @change="toggleStudentFromAnalytics(s.studentId)"
                  />
                  <span>{{ s.lastName }}, {{ s.firstName }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  activeClassRecord,
  classGrades,
  assessments,
  gradeMap,
  exclusionMode,
  fixedExclusionThreshold,
  distributionMode,
  analyticsEvidenceScope,
  setAnalyticsEvidenceScope,
  classAnalytics,
  refreshClassAnalytics,
  selectedCourseFilter,
  activeSubCohortFilter,
  setActiveSubCohortFilter,
  availableSubCohorts,
  isStudentInSubCohort,
  isAssessmentInSubCohort,
  setExclusionMode,
  toggleStudentFromAnalytics,
  analyticsMode
} from '../composables/useGradebook.js'
import {
  getHeatColor,
  getHeatColorHex,
  getHeatTextColor,
  getSDColor,
  formatGrade,
  getSectionColor
} from '../utils/gradeColors.js'
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
import { 
  AlertCircle, 
  AlertTriangle, 
  BarChart2, 
  BarChart3, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  ArrowLeft, 
  ChevronRight, 
  ChevronDown,
  FileText, 
  Eye, 
  MessageSquare, 
  Users,
  Layers,
  Sparkles,
  Activity
} from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const emit = defineEmits(['select-assessment', 'show-dossier'])

const isExclusionsOpen = ref(false)
const isCalculating = ref(false)
const activeAssessmentTab = ref('all')
const isAtRiskPopoverOpen = ref(false)

function toggleAtRiskPopover() {
  if (atRiskStudents.value.length > 0) {
    isAtRiskPopoverOpen.value = !isAtRiskPopoverOpen.value
  }
}

function openStudentDossier(studentId) {
  isAtRiskPopoverOpen.value = false
  emit('show-dossier', studentId)
}

function handleGlobalClick(e) {
  if (isAtRiskPopoverOpen.value && !e.target.closest('.stat-ribbon__item--at-risk')) {
    isAtRiskPopoverOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})

function getConsistencyInfo(sd) {
  if (sd === null || sd === undefined) return { label: '—', class: 'muted', icon: '' }
  if (sd < 10) return { label: 'Consistent', class: 'consistent', icon: 'success' }
  if (sd <= 18) return { label: 'Normal', class: 'normal', icon: 'info' }
  return { label: 'High Spread', class: 'spread', icon: 'AlertTriangle' }
}

// Outliers lists and display helpers
const excludedNames = computed(() => {
  if (!classAnalytics.value?.outlierStudentIds || classAnalytics.value.outlierStudentIds.length === 0) return ""
  if (!activeClassRecord.value?.students) return ""
  const names = classAnalytics.value.outlierStudentIds
    .map(id => {
      const s = activeClassRecord.value.students[id]
      return s ? `${s.firstName} ${s.lastName}` : id
    })
  return "Hidden students: " + names.join(", ")
})

// Trigger calculation when threshold input is updated
async function onThresholdChange() {
  isCalculating.value = true
  try {
    await refreshClassAnalytics()
  } finally {
    isCalculating.value = false
  }
}

// Watchers for calculations
watch(analyticsMode, async (val) => {
  if (val) {
    isCalculating.value = true
    try {
      await refreshClassAnalytics()
    } finally {
      isCalculating.value = false
    }
  }
})

watch(exclusionMode, async () => {
  isCalculating.value = true
  try {
    await refreshClassAnalytics()
  } finally {
    isCalculating.value = false
  }
})

watch(activeSubCohortFilter, async (val) => {
  isCalculating.value = true
  try {
    await refreshClassAnalytics(val)
  } finally {
    isCalculating.value = false
  }
})

// Local breakdown sort states
const analyticsSortBy = ref('date')
const analyticsSortOrder = ref('desc')

function toggleSort(field) {
  if (analyticsSortBy.value === field) {
    analyticsSortOrder.value = analyticsSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    analyticsSortBy.value = field
    analyticsSortOrder.value = 'desc'
  }
}

// Computeds
const activeStudentGrades = computed(() => {
  if (!activeClassRecord.value?.students) return []
  const outliers = new Set(classAnalytics.value?.outlierStudentIds || [])
  
  if (classAnalytics.value?.studentGrades && classAnalytics.value.studentGrades.length > 0) {
    return classAnalytics.value.studentGrades
      .filter(s => !outliers.has(s.studentId))
      .map(s => s.percentage)
  }

  const list = []
  Object.keys(activeClassRecord.value.students).forEach(id => {
    const st = activeClassRecord.value.students[id]
    if (!st || st.archived || st.excludeFromAnalytics || outliers.has(id)) return
    if (!st.firstName?.trim() && !st.lastName?.trim()) return
    if (!isStudentInSubCohort(st)) return
    const g = classGrades.value[id]
    if (g && g.overallGrade !== null && g.overallGrade !== undefined) {
      list.push(g.overallGrade)
    }
  })
  return list
})

const overallClassAvg = computed(() => {
  if (classAnalytics.value?.mean !== undefined && classAnalytics.value?.mean !== null) {
    return classAnalytics.value.mean
  }
  const values = activeStudentGrades.value
  if (values.length === 0) return null
  return values.reduce((sum, val) => sum + val, 0) / values.length
})

const overallClassMedian = computed(() => {
  if (classAnalytics.value?.median !== undefined && classAnalytics.value?.median !== null) {
    return classAnalytics.value.median
  }
  const values = [...activeStudentGrades.value].sort((a, b) => a - b)
  if (values.length === 0) return null
  const mid = Math.floor(values.length / 2)
  return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2
})

const overallClassSD = computed(() => {
  if (classAnalytics.value?.sd !== undefined && classAnalytics.value?.sd !== null) {
    return classAnalytics.value.sd
  }
  const values = activeStudentGrades.value
  if (values.length < 2) return null
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const sqDiffSum = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0)
  return Math.sqrt(sqDiffSum / (values.length - 1))
})

const scoreRange = computed(() => {
  const values = activeStudentGrades.value
  if (values.length === 0) return { lowest: null, highest: null }
  return {
    lowest: Math.min(...values),
    highest: Math.max(...values)
  }
})

const atRiskStudents = computed(() => {
  if (!activeClassRecord.value?.students) return []
  const outliers = new Set(classAnalytics.value?.outlierStudentIds || [])
  const list = []
  
  if (classAnalytics.value?.studentGrades && classAnalytics.value.studentGrades.length > 0) {
    classAnalytics.value.studentGrades.forEach(sg => {
      if (outliers.has(sg.studentId)) return
      const st = activeClassRecord.value.students[sg.studentId]
      if (!st || st.archived || st.excludeFromAnalytics || !isStudentInSubCohort(st)) return
      if (sg.percentage < 50) {
        list.push({ studentId: sg.studentId, name: `${st.firstName} ${st.lastName}`, grade: sg.percentage })
      }
    })
    return list
  }

  Object.keys(activeClassRecord.value.students).forEach(id => {
    const st = activeClassRecord.value.students[id]
    if (!st || st.archived || st.excludeFromAnalytics || outliers.has(id)) return
    if (!st.firstName?.trim() && !st.lastName?.trim()) return
    if (!isStudentInSubCohort(st)) return
    const g = classGrades.value[id]
    if (g && g.overallGrade !== null && g.overallGrade !== undefined && g.overallGrade < 50) {
      list.push({ studentId: id, name: `${st.firstName} ${st.lastName}`, grade: g.overallGrade })
    }
  })
  return list
})

const getCategoryName = (categoryId) => {
  return activeClassRecord.value?.gradebookCategories
    ?.find(c => c.categoryId === categoryId)?.name ?? '—'
}

const isWeightWarningVisible = computed(() => {
  return categoryWeightTotal.value !== 100
})

const categoryWeightTotal = computed(() => {
  if (!activeClassRecord.value?.gradebookCategories) return 0
  return activeClassRecord.value.gradebookCategories.reduce((sum, cat) => sum + (cat.weight || 0), 0)
})

const classMostConsistent = computed(() => {
  if (!classAnalytics.value || !classAnalytics.value.distributionBuckets) return null
  
  const bucketCounts = {}
  const bucketRanges = {}
  
  const dataset = activeStudentGrades.value
    
  if (dataset.length === 0) return null
  
  const buckets = [
    { label: '80-100%', range: [80, 100] },
    { label: '70-79%', range: [70, 79] },
    { label: '60-69%', range: [60, 69] },
    { label: '50-59%', range: [50, 59] },
    { label: '0-49%', range: [0, 49] }
  ]
  
  buckets.forEach(b => {
    bucketCounts[b.label] = 0
    bucketRanges[b.label] = b.range
  })
  
  dataset.forEach(score => {
    if (score >= 80) {
      bucketCounts['80-100%']++
    } else if (score >= 70) {
      bucketCounts['70-79%']++
    } else if (score >= 60) {
      bucketCounts['60-69%']++
    } else if (score >= 50) {
      bucketCounts['50-59%']++
    } else {
      bucketCounts['0-49%']++
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

const levelMasteryCount = computed(() => {
  return activeStudentGrades.value.filter(score => score >= 70).length
})

const levelMasteryPct = computed(() => {
  const total = activeStudentGrades.value.length
  if (!total) return 0
  return Math.round((levelMasteryCount.value / total) * 100)
})

const classEvidenceBlend = computed(() => {
  const isSBAR = activeClassRecord.value?.gradingFramework === 'sbar'
  const activeAssessments = (assessments.value || []).filter(a => {
    if (a.target === 'individual' || a.excluded) return false
    if (!isAssessmentInSubCohort(a)) return false
    const isSBARTask = a.categoryId === 'sbar_general' || (a.expectationIds && a.expectationIds.length > 0) || a.expectationId != null || a.isSbar || a.gradingFramework === 'sbar'
    return isSBAR ? isSBARTask : !isSBARTask
  })
  const total = classAnalytics.value?.totalAssessmentsCount ?? activeAssessments.length
  
  if (total === 0) {
    return {
      product: { count: 0, percentage: 0 },
      observation: { count: 0, percentage: 0 },
      conversation: { count: 0, percentage: 0 }
    }
  }
  
  const pCount = classAnalytics.value?.productCount ?? activeAssessments.filter(a => (a.assessmentType || 'product') === 'product').length
  const oCount = classAnalytics.value?.observationCount ?? activeAssessments.filter(a => a.assessmentType === 'observation').length
  const cCount = classAnalytics.value?.conversationCount ?? activeAssessments.filter(a => a.assessmentType === 'conversation').length

  const pPct = Math.round((pCount / total) * 100)
  const oPct = Math.round((oCount / total) * 100)
  const cPct = total > 0 && (oCount > 0 || cCount > 0) ? Math.max(0, 100 - pPct - oPct) : Math.round((cCount / total) * 100)

  return {
    product: { count: pCount, percentage: pPct },
    observation: { count: oCount, percentage: oPct },
    conversation: { count: cCount, percentage: cPct }
  }
})

// Instructional Highlights & Pedagogical Signals
const instructionalHotspots = computed(() => {
  let list = classAnalytics.value?.assessmentBreakdowns || []
  if (analyticsEvidenceScope.value === 'product') {
    list = list.filter(a => (a.assessmentType || 'product').toLowerCase() === 'product')
  }
  const valid = list.filter(a => a.stats && a.stats.mean !== null && a.stats.totalCount > 0)
  if (!valid.length) return { toughest: null, consistent: null, polarized: null }

  // 1. Toughest assessment (lowest mean)
  const sortedByMean = [...valid].sort((a, b) => a.stats.mean - b.stats.mean)
  const toughest = sortedByMean[0]

  // 2. Highest consistency (lowest SD)
  const sortedBySD = [...valid].filter(a => a.stats.sd !== null).sort((a, b) => a.stats.sd - b.stats.sd)
  const consistent = sortedBySD.length ? sortedBySD[0] : null

  // 3. Widest polarization / highest SD
  const sortedByHighSD = [...valid].filter(a => a.stats.sd !== null).sort((a, b) => b.stats.sd - a.stats.sd)
  const polarized = sortedByHighSD.length ? sortedByHighSD[0] : null

  return { toughest, consistent, polarized }
})

// Category Breakdown Grid
const categoryBreakdowns = computed(() => {
  if (classAnalytics.value?.categoryBreakdowns && classAnalytics.value.categoryBreakdowns.length > 0) {
    return classAnalytics.value.categoryBreakdowns
  }
  const cats = activeClassRecord.value?.gradebookCategories || []
  if (!cats.length) return []
  
  const outliers = new Set(classAnalytics.value?.outlierStudentIds || [])
  const activeStudentIds = Object.keys(activeClassRecord.value?.students || {}).filter(id => {
    const st = activeClassRecord.value.students[id]
    return st && !st.archived && !st.excludeFromAnalytics && !outliers.has(id) && isStudentInSubCohort(st)
  })
  
  const activeAssessmentsList = (assessments.value || []).filter(a => {
    if (a.target === 'individual' || a.excluded) return false
    if (analyticsEvidenceScope.value === 'product' && (a.assessmentType || 'product') !== 'product') return false
    return isAssessmentInSubCohort(a)
  })

  return cats.map(cat => {
    let sum = 0
    let count = 0
    for (const sId of activeStudentIds) {
      const g = classGrades.value?.[sId]
      const catRes = g?.categoryResults?.[cat.categoryId]
      if (catRes && catRes.percentage !== null && catRes.percentage !== undefined) {
        sum += catRes.percentage
        count++
      }
    }
    const catAssessments = activeAssessmentsList.filter(a => a.categoryId === cat.categoryId)
    return {
      categoryId: cat.categoryId,
      name: cat.name,
      weight: cat.weight || 0,
      average: count > 0 ? sum / count : null,
      studentCount: count,
      assessmentCount: catAssessments.length
    }
  })
})

// Assessment type counts
const productCount = computed(() => {
  return (classAnalytics.value?.assessmentBreakdowns || []).filter(a => (a.assessmentType || 'product').toLowerCase() === 'product').length
})
const observationCount = computed(() => {
  return (classAnalytics.value?.assessmentBreakdowns || []).filter(a => (a.assessmentType || 'product').toLowerCase() === 'observation').length
})
const conversationCount = computed(() => {
  return (classAnalytics.value?.assessmentBreakdowns || []).filter(a => (a.assessmentType || 'product').toLowerCase() === 'conversation').length
})

// Unified Filtered Assessments
const unifiedFilteredAssessments = computed(() => {
  if (!classAnalytics.value?.assessmentBreakdowns) return []
  let items = classAnalytics.value.assessmentBreakdowns
  if (activeAssessmentTab.value !== 'all') {
    items = items.filter(a => (a.assessmentType || 'product').toLowerCase() === activeAssessmentTab.value)
  }

  return [...items].sort((a, b) => {
    if (analyticsSortBy.value === 'name') {
      return analyticsSortOrder.value === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name)
    }
    if (analyticsSortBy.value === 'date') {
      const dateA = a.date || ''
      const dateB = b.date || ''
      return analyticsSortOrder.value === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA)
    }
    
    let valA = a.stats?.[analyticsSortBy.value] ?? -1
    let valB = b.stats?.[analyticsSortBy.value] ?? -1
    
    return analyticsSortOrder.value === 'asc' ? valA - valB : valB - valA
  })
})

// Roster for checklist
const sortedRoster = computed(() => {
  if (!activeClassRecord.value?.students) return []
  let list = Object.keys(activeClassRecord.value.students)
    .filter(id => !activeClassRecord.value.students[id].archived)
    .map(id => ({ studentId: id, ...activeClassRecord.value.students[id] }))
    .filter(st => isStudentInSubCohort(st))

  return list.sort((a, b) => a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase()))
})

// Chart.js bindings
const bucketChartData = computed(() => {
  if (!classAnalytics.value) return { labels: [], datasets: [] }
  
  const dataset = classAnalytics.value.distributionBuckets || []
  const levels = classAnalytics.value.levelBuckets || []
  
  const activeSet = distributionMode.value === 'buckets' ? dataset : levels
  const labels = activeSet.map(d => d.label)
  const data = activeSet.map(d => d.count)
  
  return {
    labels,
    datasets: [{
      label: 'Students',
      data,
      backgroundColor: activeSet.map(b => getHeatColorHex(b.range[0])),
      borderRadius: 4,
      borderWidth: 0,
      maxBarThickness: 34
    }]
  }
})

const bucketChartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12, weight: '600' },
        padding: 8,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.parsed.y} ${context.parsed.y === 1 ? 'student' : 'students'} (${activeStudentGrades.value.length > 0 ? Math.round((context.parsed.y / activeStudentGrades.value.length) * 100) : 0}%)`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          stepSize: 1, 
          color: '#64748b', 
          font: { size: 10, weight: '600' } 
        },
        grid: { color: 'rgba(148, 163, 184, 0.12)' }
      },
      x: {
        ticks: { 
          color: '#475569', 
          font: { size: 10, weight: '600' } 
        },
        grid: { display: false }
      }
    }
  }
})
</script>

<style scoped>
.grades__analytics-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg);
  position: relative;
}

/* Header */
.grades__analytics-header {
  padding: 0.65rem 1.25rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.header-title-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.analytics-main-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.analytics-subtitle-text {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.header-controls-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.subcohort-toggle, .exclusion-toggle, .evidence-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-ribbon__badge-tag, .stat-scope-inline-badge {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary, #3b82f6);
  border: 1px solid rgba(59, 130, 246, 0.22);
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.2;
  align-self: center;
}

.card-scope-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  display: inline-flex;
  align-items: center;
}

.card-scope-badge--product {
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary, #3b82f6);
  border-color: rgba(59, 130, 246, 0.3);
}

.toggle-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.toggle-pill-group {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 2px;
  border-radius: var(--radius-md);
  align-items: center;
}

.toggle-pill {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.toggle-pill:hover:not(.toggle-pill--active) {
  color: var(--text);
  background: var(--bg-secondary);
}

.toggle-pill--active {
  background: var(--primary) !important;
  color: #ffffff !important;
  box-shadow: var(--shadow-sm);
}

.toggle-pill-group--sm .toggle-pill--sm {
  font-size: 0.7rem;
  padding: 2px 7px;
}

.threshold-editor {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.threshold-input {
  width: 32px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 0 2px;
  text-align: center;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-weight: bold;
  outline: none;
}

/* Notice Banners */
.grades__outlier-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #856403;
  background: #fff3cd;
  padding: 0.4rem 1.25rem;
  font-size: 0.78rem;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.grades__weight-warning {
  padding: 0.4rem 1.25rem;
  font-size: 0.78rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.grades__weight-warning--over { background: #fdf2f2; color: #9b1c1c; }
.grades__weight-warning--under { background: #fefaf0; color: #b45309; }

/* Main Scrollable Area */
.grades__analytics-scrollable {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.875rem 1.25rem 1.5rem;
}

.grades__analytics-sections {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

/* 1. Executive Stat Ribbon */
.stat-ribbon {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}

.stat-ribbon__item {
  padding: 0.65rem 0.95rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 3px;
  border-right: 1px solid var(--border);
  cursor: help;
  transition: background-color 0.15s ease;
}

.stat-ribbon__item:hover {
  background-color: var(--bg-secondary);
}

.stat-ribbon__item:last-child {
  border-right: none;
}

.stat-ribbon__label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  white-space: nowrap;
}

.stat-icon {
  flex-shrink: 0;
}
.stat-icon--blue { color: #3b82f6; }
.stat-icon--green { color: #22c55e; }
.stat-icon--amber { color: #f59e0b; }
.stat-icon--purple { color: #a855f7; }
.stat-icon--red { color: #ef4444; }

.stat-ribbon__value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-ribbon__num {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.15;
}

.stat-ribbon__num--danger {
  color: #ef4444 !important;
}

.stat-unit {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.stat-ribbon__sub {
  font-size: 0.7rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* At-Risk Popover & Interaction */
.stat-ribbon__item--at-risk {
  position: relative;
}

.stat-ribbon__item--clickable {
  cursor: pointer !important;
}

.stat-ribbon__item--clickable:hover {
  background-color: rgba(239, 68, 68, 0.08) !important;
}

.stat-ribbon__item--open {
  background-color: var(--bg-secondary) !important;
  box-shadow: inset 0 0 0 1px var(--border);
}

.at-risk-chevron {
  color: #ef4444;
  margin-left: auto;
}

.at-risk-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
  animation: popover-fade 0.15s ease-out;
}

@keyframes popover-fade {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.at-risk-popover__header {
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.at-risk-popover__hint {
  font-weight: 600;
  font-size: 0.65rem;
  color: var(--primary);
}

.at-risk-popover__list {
  display: flex;
  flex-direction: column;
  max-height: 200px;
  overflow-y: auto;
}

.at-risk-popover__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background-color 0.15s;
}

.at-risk-popover__item:last-child {
  border-bottom: none;
}

.at-risk-popover__item:hover {
  background-color: var(--bg-secondary);
}

.at-risk-popover__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
}

.at-risk-popover__grade {
  font-size: 0.78rem;
  font-weight: 800;
  color: #ef4444;
}

/* Mini Evidence Segment Bar */
.mini-evidence-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  margin: 3px 0 1px 0;
}

.mini-segment {
  height: 100%;
  transition: width 0.3s ease;
}
.mini-segment--product { background: var(--primary); }
.mini-segment--observation { background: #06b6d4; }
.mini-segment--conversation { background: #ec4899; }

.evidence-sub-chips {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chip-p { color: var(--primary); font-weight: 700; }
.chip-o { color: #0891b2; font-weight: 700; }
.chip-c { color: #db2777; font-weight: 700; }

/* 2. Grid 2-Col */
.analytics-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
}

@media (max-width: 1024px) {
  .stat-ribbon {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-ribbon__item {
    border-bottom: 1px solid var(--border);
  }
  .analytics-grid-2col {
    grid-template-columns: 1fr;
  }
}

/* Card Container */
.analytics-card {
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.analytics-card--compact {
  padding: 0.75rem 1rem;
}

.analytics-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-header-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.card-header-icon--gold {
  color: #f59e0b;
}

.analytics-card__title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.card-header-tag {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 1px 6px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

/* Distribution Chart */
.chart-wrapper {
  height: 140px;
  position: relative;
}

.distribution-footer-stat {
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding-top: 3px;
  border-top: 1px solid var(--border);
}

.distribution-footer-stat strong {
  color: var(--text);
}

/* Hotspots Section */
.hotspots-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.hotspot-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg);
  cursor: pointer;
  transition: all 0.15s ease;
}

.hotspot-item:hover {
  transform: translateX(2px);
  border-color: var(--primary);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.hotspot-item__icon {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hotspot-item__icon--warning { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.hotspot-item__icon--success { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
.hotspot-item__icon--info { background: rgba(59, 130, 246, 0.12); color: #2563eb; }

.hotspot-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.hotspot-item__top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hotspot-badge {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.hotspot-badge--warning { color: #d97706; }
.hotspot-badge--success { color: #16a34a; }
.hotspot-badge--info { color: #2563eb; }

.hotspot-cat {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.hotspot-item__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hotspot-item__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.hotspot-chevron {
  color: var(--text-secondary);
  flex-shrink: 0;
  opacity: 0.6;
}

.hotspot-empty {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

/* 3. Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 6px;
}

.category-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 9px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.category-card--empty {
  opacity: 0.6;
  border-style: dashed;
}

.category-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.category-card__name {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-card__weight-badge {
  font-size: 0.62rem;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  padding: 1px 5px;
  border-radius: 6px;
  white-space: nowrap;
}

.category-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-card__score-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.category-card__score {
  font-size: 1.05rem;
  font-weight: 800;
}

.category-card__meta {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.category-card__meter {
  height: 3px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}

.category-card__meter-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* 4. Assessment Performance Matrix */
.table-wrapper {
  overflow-x: auto;
  margin: 0 -0.25rem;
}

.assessment-filter-tabs {
  display: flex;
  gap: 3px;
  background: var(--bg-secondary);
  padding: 2px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.tab-btn {
  background: transparent;
  border: none;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover:not(.tab-btn--active) {
  color: var(--text);
}

.tab-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.analytics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.analytics-table thead {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  z-index: 2;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.analytics-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 2px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.th-sortable {
  cursor: pointer;
  user-select: none;
}

.th-sortable:hover {
  color: var(--primary);
  background: var(--surface);
}

.analytics-table td {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.analytics-table-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.analytics-table-row:hover {
  background-color: var(--bg-secondary) !important;
}

.td-name {
  font-weight: 600;
  color: var(--primary);
}

.type-category-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.type-pill {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 4px;
  border-radius: 4px;
  border: 1px solid transparent;
}
.type-pill--product { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.type-pill--observation { background: rgba(6, 182, 212, 0.1); color: #0891b2; }
.type-pill--conversation { background: rgba(236, 72, 153, 0.1); color: #db2777; }

.category-chip {
  font-size: 0.68rem;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.td-date {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.text-right {
  text-align: right;
}

.range-text-pill {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text);
  background: var(--bg);
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--border);
  white-space: nowrap;
}

.consistency-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.consistency-badge--consistent {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.25);
}

.consistency-badge--normal {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.25);
}

.consistency-badge--spread {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.25);
}

.grades__sparkline {
  display: flex;
  align-items: flex-end;
  height: 16px;
  gap: 2px;
  width: 90px;
}

.grades__sparkline-bar {
  flex: 1;
  min-width: 3px;
  border-radius: 1px;
}

.empty-table-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding: 1.25rem;
  text-align: center;
}

/* 5. Collapsible Exclusions Drawer */
.analytics-card--collapsible {
  padding: 0;
  overflow: hidden;
}

.collapsible-header {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  background: var(--surface);
  transition: background-color 0.15s ease;
}

.collapsible-header:hover {
  background: var(--bg-secondary);
}

.collapsible-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exclusion-count-tag {
  font-size: 0.68rem;
  font-weight: 700;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 8px;
  color: var(--text-secondary);
}

.exclusion-drawer-body {
  padding: 0.875rem 1rem 1rem;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.exclusion-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.exclusion-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.4rem;
}

.exclusion-checkbox-item {
  font-size: 0.78rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

/* Spinner & Empty State */
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
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: grades-spin 0.8s linear infinite;
}

@keyframes grades-spin {
  to { transform: rotate(360deg); }
}

.grades__empty-analytics {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.grades__empty-content {
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.875rem;
}

.grades__empty-icon {
  color: var(--border);
}

.grades__empty-content h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.grades__empty-content p {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin: 0;
}

.grades__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: background-color 0.2s;
}

.grades__btn-primary:hover {
  background: var(--primary-dark, #3b31c8);
}
</style>
