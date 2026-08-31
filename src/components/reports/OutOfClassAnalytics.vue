<template>
  <div class="ooc-panel">
    <!-- ── 1. Unified Clean Toolbar (View Switcher + Metric Filter Pills + Search) ── -->
    <div class="ooc-toolbar">
      <div class="ooc-toolbar__left">
        <!-- View Switcher Tabs -->
        <div class="ooc-view-switcher" role="group" aria-label="View Mode Switcher">
          <button
            type="button"
            class="ooc-view-btn"
            :class="{ 'ooc-view-btn--active': viewMode === 'matrix' }"
            @click="viewMode = 'matrix'"
          >
            <LayoutGrid :size="13" /> Diagnostic Matrix
          </button>
          <button
            type="button"
            class="ooc-view-btn"
            :class="{ 'ooc-view-btn--active': viewMode === 'patterns' }"
            @click="viewMode = 'patterns'"
          >
            <Users :size="13" /> Overlaps &amp; Patterns
          </button>
          <button
            type="button"
            class="ooc-view-btn"
            :class="{ 'ooc-view-btn--active': viewMode === 'rank' }"
            @click="viewMode = 'rank'"
          >
            <List :size="13" /> Stack-Rank
          </button>
        </div>

        <!-- Metric Filter Pills (Active in Stack-Rank mode) -->
        <div v-if="viewMode === 'rank'" class="ooc-filter-pills" role="group" aria-label="Metric Filters">
          <button
            type="button"
            class="ooc-filter-pill"
            :class="{ 'ooc-filter-pill--active': activeMetric === 'trips' }"
            @click="activeMetric = 'trips'"
          >
            Total Trips
          </button>
          <button
            type="button"
            class="ooc-filter-pill"
            :class="{ 'ooc-filter-pill--active': activeMetric === 'duration' }"
            @click="activeMetric = 'duration'"
          >
            Total Time
          </button>
          <button
            type="button"
            class="ooc-filter-pill ooc-filter-pill--ext"
            :class="{ 
              'ooc-filter-pill--active': activeMetric === 'extended',
              'ooc-filter-pill--has-count': summaryStats.extendedTripsCount > 0
            }"
            @click="activeMetric = 'extended'"
            :title="`Filter by extended departures (> ${extendedLimit} minutes)`"
          >
            Extended (&gt;{{ extendedLimit }}m)
            <span v-if="summaryStats.extendedTripsCount > 0" class="ooc-pill-badge ooc-pill-badge--alert">
              {{ summaryStats.extendedTripsCount }}
            </span>
          </button>
          <button
            type="button"
            class="ooc-filter-pill ooc-filter-pill--test"
            :class="{ 
              'ooc-filter-pill--active': activeMetric === 'test_day',
              'ooc-filter-pill--has-count': summaryStats.testDayTripsCount > 0
            }"
            @click="activeMetric = 'test_day'"
            title="Filter by departures during evaluation / test days"
          >
            Test Day
            <span v-if="summaryStats.testDayTripsCount > 0" class="ooc-pill-badge ooc-pill-badge--test">
              {{ summaryStats.testDayTripsCount }}
            </span>
          </button>
        </div>
      </div>

      <div class="ooc-toolbar__right">
        <!-- Search input (visible in Stack-Rank mode) -->
        <div v-if="viewMode === 'rank'" class="ooc-search-wrap">
          <Search :size="12" class="ooc-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="ooc-search-input"
            placeholder="Search..."
          />
        </div>
      </div>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════ -->
    <!-- VIEW 1: STACK-RANK LIST                                           -->
    <!-- ═════════════════════════════════════════════════════════════════ -->
    <template v-if="viewMode === 'rank'">
      <!-- Contextual Meta Bar -->
      <div class="ooc-meta-bar">
        <span class="ooc-meta-text">
          <strong>{{ summaryStats.totalTrips }}</strong> departures ({{ summaryStats.totalMinutesFormatted }}) · 
          Typical trip: <strong>{{ summaryStats.medianMinutes }} min</strong> (median) · 
          <span v-if="summaryStats.extendedTripsCount > 0" class="ooc-meta-alert">
            {{ summaryStats.extendedTripsCount }} extended (&gt;{{ extendedLimit }}m)
          </span>
          <span v-else>No extended trips</span>
          <template v-if="summaryStats.duringTestTripsCount > 0">
            · <span class="ooc-meta-test">{{ summaryStats.duringTestTripsCount }} during active test</span>
          </template>
        </span>
        <span class="ooc-meta-right">
          Showing <strong>{{ activeMetricLabel }}</strong> · {{ rankedStudents.length }} student{{ rankedStudents.length === 1 ? '' : 's' }}
        </span>
      </div>

      <!-- Stack-Ranked Student Matrix / Bars -->
      <div v-if="rankedStudents.length > 0" class="ooc-matrix">
        <div 
          v-for="st in rankedStudents" 
          :key="st.studentId"
          class="ooc-row"
          @click="$emit('select-student', st.studentId)"
          :title="getStudentTooltip(st)"
        >
          <!-- Student Avatar & Name -->
          <div class="ooc-student-info">
            <StudentAvatar 
              :student-id="st.studentId" 
              :first-name="st.firstName" 
              :last-name="st.lastName" 
              size="sm" 
              shape="circle" 
            />
            <div class="ooc-name-group">
              <span class="ooc-student-name">{{ st.lastName }}, {{ st.firstName }}</span>
              <span class="ooc-student-sub">
                <template v-if="activeMetric === 'trips'">
                  {{ Math.round(st.totalDuration) }}m total · avg {{ Math.round(st.avgDuration) }}m
                </template>
                <template v-else-if="activeMetric === 'duration'">
                  {{ st.totalTrips }} trips · avg {{ Math.round(st.avgDuration) }}m
                </template>
                <template v-else-if="activeMetric === 'extended'">
                  {{ st.totalTrips }} total trips · {{ Math.round(st.totalDuration) }}m
                </template>
                <template v-else-if="activeMetric === 'test_day'">
                  <span v-if="st.duringTestTrips > 0" class="ooc-sub-alert">
                    {{ st.duringTestTrips }} during test
                  </span>
                  <span v-if="st.duringTestTrips > 0 && st.postTestTrips > 0"> · </span>
                  <span v-if="st.postTestTrips > 0">
                    {{ st.postTestTrips }} post-test
                  </span>
                </template>
                <template v-else>
                  {{ st.totalTrips }} total trips · {{ Math.round(st.totalDuration) }}m
                </template>
                <span v-if="st.extendedTrips > 0 && activeMetric !== 'extended'" class="ooc-sub-alert">
                  · {{ st.extendedTrips }} ext
                </span>
                <span v-if="st.testDayTrips > 0 && activeMetric !== 'test_day'" class="ooc-sub-test">
                  · {{ st.testDayTrips }} test
                </span>
              </span>
            </div>
          </div>

          <!-- Proportional Bar & Value -->
          <div class="ooc-bar-track-wrap">
            <div class="ooc-bar-track">
              <div 
                class="ooc-bar-fill" 
                :class="'ooc-bar-fill--' + activeMetric"
                :style="{ width: st.barWidthPercent + '%' }"
              ></div>
            </div>
          </div>

          <!-- Primary Value Pill -->
          <div class="ooc-val-badge" :class="'ooc-val-badge--' + activeMetric">
            <span class="ooc-val-badge__num">{{ st.primaryFormattedValue }}</span>
            <span class="ooc-val-badge__unit">{{ st.primaryUnit }}</span>
          </div>
        </div>
      </div>

      <!-- Empty State for Stack-Rank -->
      <div v-else class="ooc-empty">
        <DoorOpen :size="40" class="ooc-empty-icon" />
        <p class="ooc-empty-title">No {{ activeMetricLabel }} Records Found</p>
        <p class="ooc-empty-desc">
          {{ emptyStateMessage }}
        </p>
      </div>

      <!-- ── Extended Incidents Ledger (>15m) ONLY visible when 'Extended (>15m)' is active ── -->
      <div v-if="activeMetric === 'extended' && extendedTripsList.length > 0" class="ooc-extended-section">
        <div class="ooc-extended-header" @click="isExtendedExpanded = !isExtendedExpanded">
          <div class="ooc-extended-title-group">
            <AlertTriangle :size="16" class="ooc-extended-icon" />
            <h4 class="ooc-extended-title">Extended Absence Incident Ledger (&gt; {{ extendedLimit }} min)</h4>
            <span class="ooc-extended-count-badge">{{ extendedTripsList.length }} Incident{{ extendedTripsList.length === 1 ? '' : 's' }}</span>
            <span class="ooc-extended-sort-hint">· Sorted by longest absence</span>
          </div>
          <button type="button" class="ooc-extended-toggle-btn">
            {{ isExtendedExpanded ? 'Show Top 5 Only ↑' : `View All (${extendedTripsList.length}) ↓` }}
          </button>
        </div>

        <div class="ooc-extended-list">
          <div 
            v-for="trip in (isExtendedExpanded ? extendedTripsList : extendedTripsList.slice(0, 5))" 
            :key="trip.key"
            class="ooc-extended-card"
            @click="$emit('select-student', trip.studentId)"
            title="Click to view student dossier"
          >
            <div class="ooc-extended-card__left">
              <StudentAvatar 
                :student-id="trip.studentId" 
                :first-name="trip.firstName" 
                :last-name="trip.lastName" 
                size="sm" 
                shape="circle" 
              />
              <div class="ooc-extended-card__meta">
                <span class="ooc-extended-name">{{ trip.lastName }}, {{ trip.firstName }}</span>
                <span class="ooc-extended-date">{{ trip.formattedDate }}</span>
              </div>
            </div>

            <div class="ooc-extended-card__right">
              <span v-if="trip.testDay" class="ooc-tag-testday" :class="{ 'ooc-tag-testday--during': trip.isDuringTest }">
                <CalendarCheck :size="11" /> {{ trip.isDuringTest ? 'During Test' : 'Post-Test' }}
              </span>
              <span v-if="trip.note" class="ooc-tag-note" :title="trip.note">
                Note: {{ trip.note }}
              </span>
              <span class="ooc-duration-pill" :class="getDurationSeverityClass(trip.duration)">
                {{ Math.round(trip.duration) }} min
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═════════════════════════════════════════════════════════════════ -->
    <!-- VIEW 2: 2D FREQUENCY VS. DURATION DIAGNOSTIC MATRIX              -->
    <!-- ═════════════════════════════════════════════════════════════════ -->
    <template v-else-if="viewMode === 'matrix'">
      <!-- 2D Scatter Canvas -->
      <div v-if="matrixPoints.length > 0" class="ooc-canvas">
        <!-- 4 Quadrant Background Watermarks -->
        <div class="ooc-quadrant ooc-quadrant--top-left">
          <span class="ooc-quad-title">Isolated Extended Breaks</span>
          <span class="ooc-quad-sub">Low Frequency · Long Breaks</span>
        </div>
        <div class="ooc-quadrant ooc-quadrant--top-right">
          <span class="ooc-quad-title">Frequent Extended Breaks</span>
          <span class="ooc-quad-sub">High Frequency · Long Breaks</span>
        </div>
        <div class="ooc-quadrant ooc-quadrant--bottom-left">
          <span class="ooc-quad-title">Typical Use</span>
          <span class="ooc-quad-sub">Low Frequency · Quick Breaks</span>
        </div>
        <div class="ooc-quadrant ooc-quadrant--bottom-right">
          <span class="ooc-quad-title">Frequent Quick Breaks</span>
          <span class="ooc-quad-sub">High Frequency · Short Breaks</span>
        </div>

        <!-- Axis Divider Lines -->
        <div class="ooc-axis-x" :style="{ bottom: matrixAxisYPercent + '%' }">
          <span class="ooc-axis-label ooc-axis-label--y">Avg Duration Cutoff: {{ matrixDurationCutoff }}m</span>
        </div>
        <div class="ooc-axis-y" :style="{ left: matrixAxisXPercent + '%' }">
          <span class="ooc-axis-label ooc-axis-label--x">Trip Count Cutoff: {{ matrixTripsCutoff }} trips</span>
        </div>

        <!-- Student Scatter Dots -->
        <div
          v-for="pt in matrixPoints"
          :key="pt.studentId"
          class="ooc-dot"
          :class="'ooc-dot--' + pt.quadrant"
          :style="{ 
            left: pt.xPercent + '%', 
            bottom: pt.yPercent + '%',
            width: pt.dotSize + 'px',
            height: pt.dotSize + 'px'
          }"
          @click="$emit('select-student', pt.studentId)"
        >
          <span class="ooc-dot-label">{{ pt.initials }}</span>

          <!-- Tooltip on Hover (Single or Cluster) -->
          <div 
            class="ooc-tooltip"
            :class="{
              'ooc-tooltip--left': pt.xPercent > 65,
              'ooc-tooltip--right': pt.xPercent < 35,
              'ooc-tooltip--bottom': pt.yPercent > 55,
              'ooc-tooltip--cluster': pt.clusterMembers && pt.clusterMembers.length > 1
            }"
          >
            <!-- Single Student Tooltip -->
            <template v-if="!pt.clusterMembers || pt.clusterMembers.length <= 1">
              <div class="ooc-tooltip-name">{{ pt.lastName }}, {{ pt.firstName }}</div>
              <div class="ooc-tooltip-badge" :class="'ooc-tooltip-badge--' + pt.quadrant">
                {{ pt.quadrantLabel }}
              </div>
              <div class="ooc-tooltip-row">
                Total Departures: <strong>{{ pt.totalTrips }} trips</strong>
              </div>
              <div class="ooc-tooltip-row">
                Avg Duration: <strong>{{ Math.round(pt.avgDuration) }} min / trip</strong>
              </div>
              <div class="ooc-tooltip-row">
                Total Time Out: <strong>{{ Math.round(pt.totalDuration) }} min</strong>
              </div>
              <div v-if="pt.extendedTrips > 0" class="ooc-tooltip-row ooc-tooltip-row--alert">
                Extended Trips (>{{ extendedLimit }}m): <strong>{{ pt.extendedTrips }}</strong>
              </div>
              <div class="ooc-tooltip-hint">Click to open 360 Dossier →</div>
            </template>

            <!-- Multi-Student Cluster Popover -->
            <template v-else>
              <div class="ooc-cluster-header">
                Cluster ({{ pt.clusterMembers.length }} Students)
              </div>
              <div class="ooc-cluster-list">
                <div 
                  v-for="cSt in pt.clusterMembers" 
                  :key="'cst-'+cSt.studentId" 
                  class="ooc-cluster-item"
                  @click.stop="$emit('select-student', cSt.studentId)"
                  title="Click to view dossier"
                >
                  <span class="ooc-cluster-name">{{ cSt.lastName }}, {{ cSt.firstName }}</span>
                  <span class="ooc-cluster-meta">
                    {{ cSt.totalTrips }} trips · avg {{ Math.round(cSt.avgDuration) }}m
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Bottom 4-Quadrant Summary Cards (Outside Canvas) -->
      <div v-if="matrixPoints.length > 0" class="ooc-matrix-summary">
        <div class="ooc-matrix-summary-card ooc-matrix-summary-card--red">
          <span class="count">{{ matrixQuadrantCounts.chronic }}</span>
          <span class="label">Frequent Extended</span>
        </div>
        <div class="ooc-matrix-summary-card ooc-matrix-summary-card--yellow">
          <span class="count">{{ matrixQuadrantCounts.extended }}</span>
          <span class="label">Isolated Extended</span>
        </div>
        <div class="ooc-matrix-summary-card ooc-matrix-summary-card--blue">
          <span class="count">{{ matrixQuadrantCounts.frequent }}</span>
          <span class="label">Frequent Quick</span>
        </div>
        <div class="ooc-matrix-summary-card ooc-matrix-summary-card--green">
          <span class="count">{{ matrixQuadrantCounts.typical }}</span>
          <span class="label">Typical Use</span>
        </div>
      </div>

      <!-- Empty State for Matrix -->
      <div v-else class="ooc-empty">
        <DoorOpen :size="40" class="ooc-empty-icon" />
        <p class="ooc-empty-title">No Out-of-Class Data for Matrix</p>
        <p class="ooc-empty-desc">No departure events recorded in {{ periodLabel.toLowerCase() }}.</p>
      </div>
    </template>

    <!-- ═════════════════════════════════════════════════════════════════ -->
    <!-- VIEW 3: TEMPORAL PATTERNS & CO-DEPARTURE OVERLAPS                 -->
    <!-- ═════════════════════════════════════════════════════════════════ -->
    <template v-else-if="viewMode === 'patterns'">
      <div class="ooc-patterns-layout">

        <!-- Top Row: 3-Card Balanced Responsive Grid -->
        <div class="ooc-patterns-top-grid">

          <!-- Card 1: 75-Minute Period Departure Histogram & Curve -->
          <div class="ooc-pattern-card">
            <div class="ooc-pattern-header">
              <div class="ooc-pattern-title-group">
                <Clock :size="15" class="ooc-pattern-icon ooc-pattern-icon--rose" />
                <h4 class="ooc-pattern-title">75-Minute Departure Curve</h4>
              </div>
              <p class="ooc-pattern-desc">Concentration of departures across the 75-minute class period.</p>
            </div>

            <!-- 5-Minute Bucket Mini Histogram -->
            <div class="ooc-histogram-wrap">
              <div class="ooc-histogram-chart">
                <div 
                  v-for="b in periodTimelineBuckets" 
                  :key="b.label"
                  class="ooc-hist-bar-col"
                  :title="`${b.label}: ${b.count} trip${b.count === 1 ? '' : 's'}${b.students.length ? ' (' + b.students.slice(0, 3).join(', ') + ')' : ''}`"
                >
                  <div class="ooc-hist-bar-track">
                    <div 
                      class="ooc-hist-bar-fill" 
                      :class="{
                        'ooc-hist-fill--instruction': b.startMin < 20,
                        'ooc-hist-fill--work': b.startMin >= 20 && b.startMin < 60,
                        'ooc-hist-fill--consolidation': b.startMin >= 60
                      }"
                      :style="{ height: b.heightPct + '%' }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Proportional Phase Sections Directly Under Chart -->
              <div class="ooc-hist-phases">
                <div class="ooc-hist-phase ooc-hist-phase--instruction">
                  <span class="ooc-hist-phase-title">0–20m</span>
                  <span class="ooc-hist-phase-stat"><strong>{{ lessonPhases.instruction }}</strong> ({{ lessonPhases.instructionPct }}%)</span>
                  <span class="ooc-hist-phase-sub">Instruction</span>
                </div>
                <div class="ooc-hist-phase ooc-hist-phase--work">
                  <span class="ooc-hist-phase-title">20–60m</span>
                  <span class="ooc-hist-phase-stat"><strong>{{ lessonPhases.work }}</strong> ({{ lessonPhases.workPct }}%)</span>
                  <span class="ooc-hist-phase-sub">Work Time</span>
                </div>
                <div class="ooc-hist-phase ooc-hist-phase--consolidation">
                  <span class="ooc-hist-phase-title">60–75m</span>
                  <span class="ooc-hist-phase-stat"><strong>{{ lessonPhases.consolidation }}</strong> ({{ lessonPhases.consolidationPct }}%)</span>
                  <span class="ooc-hist-phase-sub">Wrap-Up</span>
                </div>
              </div>
            </div>

            <!-- Dynamic Takeaway Insight -->
            <div class="ooc-insight-callout">
              <TrendingUp :size="13" class="ooc-insight-icon" />
              <span class="ooc-insight-text">{{ lessonPhaseInsight }}</span>
            </div>
          </div>

          <!-- Card 2: Day of Week Distribution -->
          <div class="ooc-pattern-card">
            <div class="ooc-pattern-header">
              <div class="ooc-pattern-title-group">
                <Calendar :size="15" class="ooc-pattern-icon ooc-pattern-icon--blue" />
                <h4 class="ooc-pattern-title">Day-of-Week Departure Trends</h4>
              </div>
              <p class="ooc-pattern-desc">Concentration of out-of-class trips across the school week.</p>
            </div>

            <div class="ooc-dow-list">
              <div v-for="d in dayOfWeekStats" :key="d.label" class="ooc-dow-row">
                <span class="ooc-dow-label">{{ d.full }}</span>
                <div class="ooc-dow-bar-track">
                  <div class="ooc-dow-bar-fill" :style="{ width: d.percent + '%' }"></div>
                </div>
                <span class="ooc-dow-count">{{ d.count }} trips ({{ d.avgMins }}m)</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Trip Duration Tiers -->
          <div class="ooc-pattern-card">
            <div class="ooc-pattern-header">
              <div class="ooc-pattern-title-group">
                <PieChart :size="15" class="ooc-pattern-icon ooc-pattern-icon--purple" />
                <h4 class="ooc-pattern-title">Trip Duration Tiers</h4>
              </div>
              <p class="ooc-pattern-desc">Breakdown of short vs. standard vs. extended absences.</p>
            </div>

            <div class="ooc-tier-list">
              <div class="ooc-tier-item ooc-tier-item--quick">
                <div class="ooc-tier-info">
                  <span class="ooc-tier-name">Quick Breaks (&lt; 5m)</span>
                  <span class="ooc-tier-meta">{{ durationTiers.quick }} trips ({{ durationTiers.quickPct }}%)</span>
                </div>
                <div class="ooc-tier-bar-track">
                  <div class="ooc-tier-bar-fill ooc-fill--quick" :style="{ width: durationTiers.quickPct + '%' }"></div>
                </div>
              </div>

              <div class="ooc-tier-item ooc-tier-item--standard">
                <div class="ooc-tier-info">
                  <span class="ooc-tier-name">Standard (5–{{ extendedLimit }}m)</span>
                  <span class="ooc-tier-meta">{{ durationTiers.standard }} trips ({{ durationTiers.standardPct }}%)</span>
                </div>
                <div class="ooc-tier-bar-track">
                  <div class="ooc-tier-bar-fill ooc-fill--standard" :style="{ width: durationTiers.standardPct + '%' }"></div>
                </div>
              </div>

              <div class="ooc-tier-item ooc-tier-item--extended">
                <div class="ooc-tier-info">
                  <span class="ooc-tier-name">Extended (&gt; {{ extendedLimit }}m)</span>
                  <span class="ooc-tier-meta">{{ durationTiers.extended }} trips ({{ durationTiers.extendedPct }}%)</span>
                </div>
                <div class="ooc-tier-bar-track">
                  <div class="ooc-tier-bar-fill ooc-fill--extended" :style="{ width: durationTiers.extendedPct + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 4: Direct Instruction Absences (0–15m) -->
          <div class="ooc-pattern-card">
            <div class="ooc-pattern-header">
              <div class="ooc-pattern-title-group">
                <Presentation :size="15" class="ooc-pattern-icon ooc-pattern-icon--orange" />
                <h4 class="ooc-pattern-title">Direct Instruction Absences</h4>
                <span v-if="lessonPhases.instruction > 0" class="ooc-pattern-badge">
                  {{ lessonPhases.instruction }} Trip{{ lessonPhases.instruction === 1 ? '' : 's' }}
                </span>
              </div>
              <p class="ooc-pattern-desc">Students departing in the first 20m of direct instruction.</p>
            </div>

            <div v-if="directInstructionDeparturesList.length > 0" class="ooc-instruction-list">
              <div 
                v-for="st in directInstructionDeparturesList.slice(0, 4)" 
                :key="st.studentId" 
                class="ooc-instruction-item"
                @click="$emit('select-student', st.studentId)"
                title="Click to view student dossier"
              >
                <StudentAvatar 
                  :student-id="st.studentId" 
                  :first-name="st.firstName" 
                  :last-name="st.lastName" 
                  size="sm" 
                  shape="circle" 
                />
                <div class="ooc-instruction-info">
                  <span class="ooc-instruction-name">{{ st.lastName }}, {{ st.firstName }}</span>
                  <span class="ooc-instruction-meta">{{ st.count }} departure{{ st.count === 1 ? '' : 's' }} · avg {{ st.avgMins }}m</span>
                </div>
                <span class="ooc-instruction-badge">{{ st.count }}×</span>
              </div>
            </div>

            <div v-else class="ooc-instruction-empty">
              <CheckCircle2 :size="20" class="ooc-pattern-ok-icon" />
              <span class="ooc-instruction-ok-text">No direct instruction departures in {{ periodLabel.toLowerCase() }}.</span>
            </div>
          </div>

        </div>

        <!-- Bottom Full Width: Co-Departure & Overlaps -->
        <div class="ooc-pattern-card ooc-pattern-card--full">
          <div class="ooc-pattern-header ooc-pattern-header--split">
            <div>
              <div class="ooc-pattern-title-group">
                <Users :size="15" class="ooc-pattern-icon ooc-pattern-icon--rose" />
                <h4 class="ooc-pattern-title">Co-Departure &amp; "Buddy" Overlap Detector</h4>
                <span class="ooc-pattern-badge">{{ coDeparturesList.length }} Pair{{ coDeparturesList.length === 1 ? '' : 's' }} Flagged</span>
              </div>
              <p class="ooc-pattern-desc">
                Flags student pairs who departed within <strong>±3 minutes of each other</strong> or were outside simultaneously.
              </p>
            </div>
            <button 
              v-if="coDeparturesList.length > 4"
              type="button" 
              class="ooc-expand-btn"
              @click="isCoDeparturesExpanded = !isCoDeparturesExpanded"
            >
              {{ isCoDeparturesExpanded ? 'Show Top 4 Only ↑' : `View All ${coDeparturesList.length} Pairs (${coDeparturesList.length - 4} more) ↓` }}
            </button>
          </div>

          <div 
            v-if="coDeparturesList.length > 0" 
            class="ooc-overlap-list"
            :class="{ 'ooc-overlap-list--scrollable': isCoDeparturesExpanded }"
          >
            <div 
              v-for="pair in (isCoDeparturesExpanded ? coDeparturesList : coDeparturesList.slice(0, 4))" 
              :key="pair.key" 
              class="ooc-overlap-card"
            >
              <div class="ooc-overlap-left">
                <div class="ooc-overlap-avatars">
                  <StudentAvatar :student-id="pair.idA" :first-name="pair.firstNameA" :last-name="pair.lastNameA" size="sm" shape="circle" />
                  <StudentAvatar :student-id="pair.idB" :first-name="pair.firstNameB" :last-name="pair.lastNameB" size="sm" shape="circle" />
                </div>
                <div class="ooc-overlap-names">
                  <span class="ooc-pair-names">
                    <button class="ooc-student-link" @click="$emit('select-student', pair.idA)">{{ pair.nameA }}</button>
                    &amp; 
                    <button class="ooc-student-link" @click="$emit('select-student', pair.idB)">{{ pair.nameB }}</button>
                  </span>
                  <span class="ooc-pair-count">
                    {{ pair.incidents.length }} overlapping departure{{ pair.incidents.length === 1 ? '' : 's' }}
                  </span>
                </div>
              </div>

              <div class="ooc-overlap-incidents">
                <span 
                  v-for="(inc, incIdx) in pair.incidents.slice(0, 3)" 
                  :key="incIdx" 
                  class="ooc-incident-pill"
                >
                  {{ inc.date }} ({{ inc.durA }}m &amp; {{ inc.durB }}m)
                </span>
                <span v-if="pair.incidents.length > 3" class="ooc-incident-more">
                  +{{ pair.incidents.length - 3 }} more
                </span>
              </div>
            </div>
          </div>

          <div v-else class="ooc-pattern-empty">
            <CheckCircle2 :size="24" class="ooc-pattern-ok-icon" />
            <p class="ooc-pattern-ok-text">No synchronized co-departures detected in {{ periodLabel.toLowerCase() }}.</p>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  DoorOpen, 
  Clock, 
  AlertTriangle, 
  CalendarCheck, 
  Search,
  List,
  LayoutGrid,
  Users,
  Calendar,
  PieChart,
  CheckCircle2,
  Presentation,
  FileText,
  LogOut,
  TrendingUp
} from 'lucide-vue-next'
import StudentAvatar from '../photos/StudentAvatar.vue'
import { toMinutes } from '../../db/eventService.js'
import { useClassroom } from '../../composables/useClassroom.js'

const props = defineProps({
  sidebarStudents: { type: Array, default: () => [] },
  allClassEvents: { type: Array, default: () => [] },
  periodEvents: { type: Array, default: () => [] },
  selectedPeriod: { type: String, default: 'week' },
  aggregates: { type: Object, default: () => ({}) },
  reportClass: { type: Object, default: null }
})

defineEmits(['select-student'])

const { behaviorCodes, thresholds } = useClassroom()
const extendedLimit = computed(() => Number(thresholds.value?.washroomDurationLimit ?? 11))

const viewMode = ref('matrix') // 'matrix' | 'patterns' | 'rank'
const activeMetric = ref('trips')
const searchQuery = ref('')
const isExtendedExpanded = ref(false)
const isCoDeparturesExpanded = ref(false)

const METRIC_OPTIONS = computed(() => [
  { id: 'trips', label: 'Total Trips' },
  { id: 'duration', label: 'Total Time' },
  { id: 'extended', label: `Extended Absences (>${extendedLimit.value}m)` },
  { id: 'test_day', label: 'Test Day Departures' }
])

const activeMetricLabel = computed(() => {
  const opt = METRIC_OPTIONS.value.find(m => m.id === activeMetric.value)
  return opt ? opt.label : 'Total Trips'
})

const periodLabel = computed(() => {
  const map = {
    week: 'This Week',
    last_week: 'Last Week',
    month: 'This Month',
    semester: 'This Semester'
  }
  return map[props.selectedPeriod] || 'Selected Period'
})

// Set of behavior codes that represent out-of-class toggle events
const washCodes = computed(() => {
  const customCodes = (behaviorCodes.value || [])
    .filter(c => c.type === 'toggle')
    .map(c => c.codeKey)
  return new Set(['w', ...customCodes])
})

// Use periodEvents (filtered to active period) or fallback to allClassEvents
const eventsSource = computed(() => {
  if (props.periodEvents) return props.periodEvents
  return props.allClassEvents || []
})

// All relevant washroom/hall departure events for active timeframe
const washEvents = computed(() => {
  const events = eventsSource.value || []
  const codes = washCodes.value
  return events.filter(e => {
    if (e.superseded) return false
    if (e.duration == null) return false
    return codes.has(e.code) || e.category === 'washroom' || e.type === 'toggle'
  })
})

function checkIsDuringTest(event, reportClass) {
  if (!event.testDay || !event.timestamp) return false
  const pNum = Number(reportClass?.periodNumber) || 1
  let startTimeStr = reportClass?.periodStartTime
  if (!startTimeStr) {
    const defaultStartTimes = { 1: '08:30', 2: '09:55', 3: '12:00', 4: '13:25' }
    startTimeStr = defaultStartTimes[pNum] || '08:30'
  }
  const [startH, startM] = startTimeStr.split(':').map(Number)
  const periodStartMinOfDay = (startH || 8) * 60 + (startM || 30)
  const d = new Date(event.timestamp)
  const eventMinOfDay = d.getHours() * 60 + d.getMinutes()
  let diff = eventMinOfDay - periodStartMinOfDay
  if (diff < 0 || diff > 75) diff = d.getMinutes() % 75
  return diff < 55
}

// KPI summary statistics
const summaryStats = computed(() => {
  const events = washEvents.value
  const totalTrips = events.length
  const totalMins = events.reduce((acc, e) => acc + toMinutes(e.duration), 0)
  
  // Median trip duration
  const durations = events.map(e => toMinutes(e.duration)).sort((a, b) => a - b)
  let medianMins = 0
  if (durations.length > 0) {
    const mid = Math.floor(durations.length / 2)
    medianMins = durations.length % 2 !== 0 
      ? Math.round(durations[mid]) 
      : Math.round((durations[mid - 1] + durations[mid]) / 2)
  }

  const extendedTrips = events.filter(e => toMinutes(e.duration) > extendedLimit.value)
  const testDayTrips = events.filter(e => !!e.testDay)
  const duringTestTrips = events.filter(e => checkIsDuringTest(e, props.reportClass))

  let totalMinutesFormatted = `${Math.round(totalMins)}m`
  if (totalMins >= 60) {
    const hrs = Math.floor(totalMins / 60)
    const remMins = Math.round(totalMins % 60)
    totalMinutesFormatted = `${hrs}h ${remMins}m`
  }

  return {
    totalTrips,
    totalMinutesRaw: totalMins,
    totalMinutesFormatted,
    medianMinutes: medianMins,
    extendedTripsCount: extendedTrips.length,
    testDayTripsCount: testDayTrips.length,
    duringTestTripsCount: duringTestTrips.length
  }
})

// Map student ID to aggregate data
const studentStatsMap = computed(() => {
  const students = props.sidebarStudents || []
  const events = washEvents.value
  
  const map = {}
  students.forEach(st => {
    const sId = String(st.studentId)
    map[sId] = {
      studentId: st.studentId,
      firstName: st.firstName,
      lastName: st.lastName,
      trips: [],
      totalTrips: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      extendedTrips: 0,
      testDayTrips: 0,
      duringTestTrips: 0,
      postTestTrips: 0
    }
  })

  events.forEach(e => {
    const sId = String(e.studentId)
    if (!map[sId]) {
      map[sId] = {
        studentId: e.studentId,
        firstName: 'Student',
        lastName: e.studentId,
        trips: [],
        totalTrips: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        extendedTrips: 0,
        testDayTrips: 0,
        duringTestTrips: 0,
        postTestTrips: 0
      }
    }
    const mins = toMinutes(e.duration)
    map[sId].trips.push(e)
    map[sId].totalTrips++
    map[sId].totalDuration += mins
    if (mins > map[sId].maxDuration) {
      map[sId].maxDuration = mins
    }
    if (mins > extendedLimit.value) {
      map[sId].extendedTrips++
    }
    if (e.testDay) {
      map[sId].testDayTrips++
      if (checkIsDuringTest(e, props.reportClass)) {
        map[sId].duringTestTrips++
      } else {
        map[sId].postTestTrips++
      }
    }
  })

  Object.values(map).forEach(st => {
    st.avgDuration = st.totalTrips > 0 ? (st.totalDuration / st.totalTrips) : 0
  })

  return map
})

const emptyStateMessage = computed(() => {
  if (searchQuery.value) return `No students matched "${searchQuery.value}".`
  if (activeMetric.value === 'extended') {
    return `No extended departures (>${extendedLimit.value} min) were recorded for ${periodLabel.value.toLowerCase()}.`
  }
  if (activeMetric.value === 'test_day') {
    return `No out-of-class departures occurred during test days for ${periodLabel.value.toLowerCase()}.`
  }
  return `No departures were logged for this class in ${periodLabel.value.toLowerCase()}.`
})

// Stack-ranked students sorted by the chosen metric
const rankedStudents = computed(() => {
  const all = Object.values(studentStatsMap.value)
  const q = searchQuery.value.trim().toLowerCase()
  
  let filtered = all
  if (q) {
    filtered = all.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      `${s.lastName}, ${s.firstName}`.toLowerCase().includes(q)
    )
  }

  // Filter students who have non-zero activity for the active metric
  if (activeMetric.value === 'extended') {
    filtered = filtered.filter(s => s.extendedTrips > 0)
  } else if (activeMetric.value === 'test_day') {
    filtered = filtered.filter(s => s.testDayTrips > 0)
  } else if (activeMetric.value === 'duration') {
    filtered = filtered.filter(s => s.totalDuration > 0)
  } else {
    // 'trips'
    filtered = filtered.filter(s => s.totalTrips > 0)
  }

  // Sort descending by active metric
  filtered.sort((a, b) => {
    let valA = 0
    let valB = 0
    if (activeMetric.value === 'trips') {
      valA = a.totalTrips
      valB = b.totalTrips
    } else if (activeMetric.value === 'duration') {
      valA = a.totalDuration
      valB = b.totalDuration
    } else if (activeMetric.value === 'extended') {
      valA = a.extendedTrips
      valB = b.extendedTrips
    } else if (activeMetric.value === 'test_day') {
      valA = a.duringTestTrips * 10 + a.testDayTrips
      valB = b.duringTestTrips * 10 + b.testDayTrips
    }
    if (valB !== valA) return valB - valA
    return b.totalDuration - a.totalDuration
  })

  // Max value to scale proportional progress bars
  let maxVal = 0
  filtered.forEach(s => {
    let v = 0
    if (activeMetric.value === 'trips') v = s.totalTrips
    else if (activeMetric.value === 'duration') v = s.totalDuration
    else if (activeMetric.value === 'extended') v = s.extendedTrips
    else if (activeMetric.value === 'test_day') v = s.testDayTrips
    if (v > maxVal) maxVal = v
  })

  return filtered.map(s => {
    let primaryVal = 0
    let primaryFormatted = ''
    let primaryUnit = ''

    if (activeMetric.value === 'trips') {
      primaryVal = s.totalTrips
      primaryFormatted = `${s.totalTrips}`
      primaryUnit = s.totalTrips === 1 ? 'trip' : 'trips'
    } else if (activeMetric.value === 'duration') {
      primaryVal = s.totalDuration
      primaryFormatted = `${Math.round(s.totalDuration)}`
      primaryUnit = 'min'
    } else if (activeMetric.value === 'extended') {
      primaryVal = s.extendedTrips
      primaryFormatted = `${s.extendedTrips}`
      primaryUnit = s.extendedTrips === 1 ? 'extended trip' : 'extended trips'
    } else if (activeMetric.value === 'test_day') {
      primaryVal = s.testDayTrips
      primaryFormatted = `${s.testDayTrips}`
      primaryUnit = s.testDayTrips === 1 ? 'test day trip' : 'test day trips'
    }

    const barWidthPercent = (maxVal > 0 && primaryVal > 0) ? Math.max(4, Math.round((primaryVal / maxVal) * 100)) : 0

    return {
      ...s,
      primaryVal,
      primaryFormattedValue: primaryFormatted,
      primaryUnit,
      barWidthPercent
    }
  })
})

function getInitials(firstName, lastName) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  return 'ST'
}

function getStudentTooltip(st) {
  if (!st) return ''
  const lines = [
    `${st.lastName}, ${st.firstName}`,
    `• Total Departures: ${st.totalTrips} trip${st.totalTrips === 1 ? '' : 's'}`,
    `• Total Time Out: ${Math.round(st.totalDuration)} min`,
    `• Avg Duration: ${Math.round(st.avgDuration)} min / trip`,
    `• Longest Absence: ${Math.round(st.maxDuration)} min`
  ]
  if (st.extendedTrips > 0) {
    lines.push(`• Extended Absences (>15m): ${st.extendedTrips}`)
  }
  if (st.duringTestTrips > 0) {
    lines.push(`• Departed During Active Test: ${st.duringTestTrips}`)
  }
  if (st.postTestTrips > 0) {
    lines.push(`• Departed Post-Test Wrap-up: ${st.postTestTrips}`)
  }
  lines.push('\nClick to open Student Dossier')
  return lines.join('\n')
}

// ── 2D Matrix Calculations ───────────────────────────────────────────
const matrixDurationCutoff = ref(10) // 10 minutes average cutoff
const matrixTripsCutoff = computed(() => {
  const studentsWithTrips = Object.values(studentStatsMap.value).filter(s => s.totalTrips > 0)
  if (studentsWithTrips.length === 0) return 4
  const avg = studentsWithTrips.reduce((acc, s) => acc + s.totalTrips, 0) / studentsWithTrips.length
  return Math.max(2, Math.round(avg))
})

const matrixAxisXPercent = 50
const matrixAxisYPercent = 50

const matrixPoints = computed(() => {
  const studentsWithTrips = Object.values(studentStatsMap.value).filter(s => s.totalTrips > 0)
  if (studentsWithTrips.length === 0) return []

  const maxTrips = Math.max(...studentsWithTrips.map(s => s.totalTrips), matrixTripsCutoff.value * 2, 6)
  const maxAvgDur = Math.max(...studentsWithTrips.map(s => s.avgDuration), matrixDurationCutoff.value * 2, 20)
  const maxTotalDur = Math.max(...studentsWithTrips.map(s => s.totalDuration), 1)

  const rawPoints = studentsWithTrips.map(s => {
    // X position: map totalTrips relative to cutoff (50% is cutoff)
    let x = 50
    if (s.totalTrips <= matrixTripsCutoff.value) {
      x = 8 + (s.totalTrips / matrixTripsCutoff.value) * 40
    } else {
      const surplus = s.totalTrips - matrixTripsCutoff.value
      const maxSurplus = Math.max(maxTrips - matrixTripsCutoff.value, 1)
      x = 52 + (surplus / maxSurplus) * 40
    }
    x = Math.max(7, Math.min(93, Math.round(x)))

    // Y position: map avgDuration relative to cutoff (50% is cutoff)
    let y = 50
    if (s.avgDuration <= matrixDurationCutoff.value) {
      y = 8 + (s.avgDuration / matrixDurationCutoff.value) * 40
    } else {
      const surplus = s.avgDuration - matrixDurationCutoff.value
      const maxSurplus = Math.max(maxAvgDur - matrixDurationCutoff.value, 1)
      y = 52 + (surplus / maxSurplus) * 40
    }
    y = Math.max(7, Math.min(93, Math.round(y)))

    // Quadrant determination
    let quadrant = 'typical'
    let quadrantLabel = 'Typical Use'
    if (s.totalTrips > matrixTripsCutoff.value && s.avgDuration > matrixDurationCutoff.value) {
      quadrant = 'chronic'
      quadrantLabel = 'Frequent Extended Breaks'
    } else if (s.totalTrips <= matrixTripsCutoff.value && s.avgDuration > matrixDurationCutoff.value) {
      quadrant = 'extended'
      quadrantLabel = 'Isolated Extended Break'
    } else if (s.totalTrips > matrixTripsCutoff.value && s.avgDuration <= matrixDurationCutoff.value) {
      quadrant = 'frequent'
      quadrantLabel = 'Frequent Quick Breaks'
    }

    // Dot size: 24px to 34px based on totalDuration
    const dotSize = Math.round(24 + (s.totalDuration / maxTotalDur) * 10)

    return {
      ...s,
      initials: getInitials(s.firstName, s.lastName),
      xPercent: x,
      yPercent: y,
      quadrant,
      quadrantLabel,
      dotSize
    }
  })

  // Beeswarm / Circle Relaxation Packing to eliminate all dot overlaps
  const minDistance = 5.0 // Min % distance between dot centers
  const iterations = 20

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < rawPoints.length; i++) {
      for (let j = i + 1; j < rawPoints.length; j++) {
        const p1 = rawPoints[i]
        const p2 = rawPoints[j]
        let dx = p2.xPercent - p1.xPercent
        let dy = p2.yPercent - p1.yPercent
        let dist = Math.hypot(dx, dy)

        if (dist === 0) {
          dx = (i % 2 === 0 ? 1 : -1) * 0.2
          dy = (j % 2 === 0 ? 1 : -1) * 0.2
          dist = Math.hypot(dx, dy)
        }

        if (dist < minDistance) {
          const overlap = (minDistance - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          
          p1.xPercent -= nx * overlap
          p1.yPercent -= ny * overlap
          p2.xPercent += nx * overlap
          p2.yPercent += ny * overlap
        }
      }
    }

    rawPoints.forEach(p => {
      p.xPercent = Math.max(6, Math.min(94, p.xPercent))
      p.yPercent = Math.max(6, Math.min(94, p.yPercent))
    })
  }

  // Attach cluster members for multi-student popovers
  return rawPoints.map(item => {
    const clusterMembers = rawPoints.filter(other => {
      const dist = Math.hypot(other.xPercent - item.xPercent, other.yPercent - item.yPercent)
      return dist <= 6.5
    })
    return {
      ...item,
      xPercent: Number(item.xPercent.toFixed(1)),
      yPercent: Number(item.yPercent.toFixed(1)),
      clusterMembers
    }
  })
})

const matrixQuadrantCounts = computed(() => {
  const pts = matrixPoints.value
  return {
    chronic: pts.filter(p => p.quadrant === 'chronic').length,
    extended: pts.filter(p => p.quadrant === 'extended').length,
    frequent: pts.filter(p => p.quadrant === 'frequent').length,
    typical: pts.filter(p => p.quadrant === 'typical').length
  }
})

// ── 75-Minute Period 5-Minute Bucket Histogram Curve ─────────────────
const periodTimelineBuckets = computed(() => {
  const events = washEvents.value
  const buckets = Array.from({ length: 15 }, (_, i) => ({
    startMin: i * 5,
    endMin: (i + 1) * 5,
    label: `${i * 5}–${(i + 1) * 5}m`,
    count: 0,
    students: []
  }))

  const pNum = Number(props.reportClass?.periodNumber) || 1
  let startTimeStr = props.reportClass?.periodStartTime
  if (!startTimeStr) {
    const defaultStartTimes = { 1: '08:30', 2: '09:55', 3: '12:00', 4: '13:25' }
    startTimeStr = defaultStartTimes[pNum] || '08:30'
  }

  const [startH, startM] = startTimeStr.split(':').map(Number)
  const periodStartMinOfDay = (startH || 8) * 60 + (startM || 30)

  events.forEach(e => {
    if (!e.timestamp) return
    const d = new Date(e.timestamp)
    const eventMinOfDay = d.getHours() * 60 + d.getMinutes()
    let diff = eventMinOfDay - periodStartMinOfDay

    if (diff < 0 || diff > 75) {
      diff = (d.getMinutes() % 75)
    }

    const bucketIdx = Math.min(14, Math.max(0, Math.floor(diff / 5)))
    buckets[bucketIdx].count++
    const s = studentStatsMap.value[String(e.studentId)]
    if (s && !buckets[bucketIdx].students.includes(s.lastName)) {
      buckets[bucketIdx].students.push(s.lastName)
    }
  })

  const maxCount = Math.max(...buckets.map(b => b.count), 1)
  return buckets.map(b => ({
    ...b,
    heightPct: Math.max(10, Math.round((b.count / maxCount) * 100))
  }))
})

// ── Lesson Phases (Time Within Period Summary) ────────────────────────
const lessonPhases = computed(() => {
  const events = washEvents.value
  const total = events.length || 1

  const pNum = Number(props.reportClass?.periodNumber) || 1
  let startTimeStr = props.reportClass?.periodStartTime
  if (!startTimeStr) {
    const defaultStartTimes = { 1: '08:30', 2: '09:55', 3: '12:00', 4: '13:25' }
    startTimeStr = defaultStartTimes[pNum] || '08:30'
  }

  const [startH, startM] = startTimeStr.split(':').map(Number)
  const periodStartMinOfDay = (startH || 8) * 60 + (startM || 30)

  let instructionCount = 0
  let workCount = 0
  let consolidationCount = 0

  const instructionStudentsCountMap = {}

  events.forEach(e => {
    if (!e.timestamp) return
    const d = new Date(e.timestamp)
    const eventMinOfDay = d.getHours() * 60 + d.getMinutes()
    let diff = eventMinOfDay - periodStartMinOfDay

    if (diff < 0 || diff > 75) {
      diff = (d.getMinutes() % 75)
    }

    if (diff < 20) {
      instructionCount++
      const sId = String(e.studentId)
      instructionStudentsCountMap[sId] = (instructionStudentsCountMap[sId] || 0) + 1
    } else if (diff >= 60) {
      consolidationCount++
    } else {
      workCount++
    }
  })

  const topInstruction = Object.entries(instructionStudentsCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sId, count]) => {
      const s = studentStatsMap.value[sId]
      return s ? `${s.lastName} (${count})` : `${sId} (${count})`
    })

  return {
    instruction: instructionCount,
    instructionPct: Math.round((instructionCount / total) * 100),
    work: workCount,
    workPct: Math.round((workCount / total) * 100),
    consolidation: consolidationCount,
    consolidationPct: Math.round((consolidationCount / total) * 100),
    topInstructionStudents: topInstruction
  }
})

// Specific students who left during direct instruction (0-20m)
const directInstructionDeparturesList = computed(() => {
  const events = washEvents.value
  const students = studentStatsMap.value
  const map = {}

  const pNum = Number(props.reportClass?.periodNumber) || 1
  let startTimeStr = props.reportClass?.periodStartTime
  if (!startTimeStr) {
    const defaultStartTimes = { 1: '08:30', 2: '09:55', 3: '12:00', 4: '13:25' }
    startTimeStr = defaultStartTimes[pNum] || '08:30'
  }

  const [startH, startM] = startTimeStr.split(':').map(Number)
  const periodStartMinOfDay = (startH || 8) * 60 + (startM || 30)

  events.forEach(e => {
    if (!e.timestamp || !e.studentId) return
    const d = new Date(e.timestamp)
    const eventMinOfDay = d.getHours() * 60 + d.getMinutes()
    let diff = eventMinOfDay - periodStartMinOfDay

    if (diff < 0 || diff > 75) {
      diff = (d.getMinutes() % 75)
    }

    if (diff < 20) {
      const sId = String(e.studentId)
      if (!map[sId]) {
        const s = students[sId]
        map[sId] = {
          studentId: e.studentId,
          firstName: s?.firstName || 'Student',
          lastName: s?.lastName || e.studentId,
          count: 0,
          totalDuration: 0
        }
      }
      map[sId].count++
      map[sId].totalDuration += toMinutes(e.duration)
    }
  })

  return Object.values(map)
    .map(item => ({
      ...item,
      avgMins: item.count > 0 ? Math.round(item.totalDuration / item.count) : 0
    }))
    .sort((a, b) => b.count - a.count || b.totalDuration - a.totalDuration)
})

const lessonPhaseInsight = computed(() => {
  const p = lessonPhases.value
  if (!p || p.instruction + p.work + p.consolidation === 0) {
    return 'No departures recorded for this period.'
  }
  if (p.consolidationPct >= 35) {
    return `${p.consolidationPct}% of departures occur in the final 15 minutes (end-of-period exit surge).`
  }
  if (p.instructionPct >= 25) {
    return `High disruption: ${p.instructionPct}% of departures occur during the first 20m of direct instruction.`
  }
  return `Normal distribution: ${p.workPct}% of departures occur during independent work time.`
})

// ── Co-Departure & "Buddy" Overlaps Detector ─────────────────────────
const coDeparturesList = computed(() => {
  const events = washEvents.value
  const students = studentStatsMap.value
  const pairsMap = {}

  for (let i = 0; i < events.length; i++) {
    const e1 = events[i]
    if (!e1.timestamp || !e1.studentId) continue
    const t1 = new Date(e1.timestamp).getTime()
    const dur1 = (e1.duration || 0)
    const end1 = t1 + dur1

    for (let j = i + 1; j < events.length; j++) {
      const e2 = events[j]
      if (!e2.timestamp || !e2.studentId) continue
      if (String(e1.studentId) === String(e2.studentId)) continue

      const t2 = new Date(e2.timestamp).getTime()
      const dur2 = (e2.duration || 0)
      const end2 = t2 + dur2

      // Same calendar day check
      const day1 = new Date(e1.timestamp).toISOString().slice(0, 10)
      const day2 = new Date(e2.timestamp).toISOString().slice(0, 10)
      if (day1 !== day2) continue

      // Overlap or departure within ±3 minutes (180,000 ms)
      const isOverlap = (t1 <= end2 && t2 <= end1) || Math.abs(t1 - t2) <= 180000
      if (isOverlap) {
        const idA = String(e1.studentId) < String(e2.studentId) ? String(e1.studentId) : String(e2.studentId)
        const idB = String(e1.studentId) < String(e2.studentId) ? String(e2.studentId) : String(e1.studentId)
        const pairKey = `${idA}_${idB}`

        const sA = students[idA]
        const sB = students[idB]

        if (!pairsMap[pairKey]) {
          pairsMap[pairKey] = {
            key: pairKey,
            idA,
            idB,
            nameA: sA ? `${sA.lastName}, ${sA.firstName}` : idA,
            nameB: sB ? `${sB.lastName}, ${sB.firstName}` : idB,
            firstNameA: sA?.firstName || 'Student',
            lastNameA: sA?.lastName || idA,
            firstNameB: sB?.firstName || 'Student',
            lastNameB: sB?.lastName || idB,
            incidents: []
          }
        }

        pairsMap[pairKey].incidents.push({
          date: formatEventTime(e1.timestamp),
          timestamp: e1.timestamp,
          durA: toMinutes(e1.duration).toFixed(0),
          durB: toMinutes(e2.duration).toFixed(0)
        })
      }
    }
  }

  return Object.values(pairsMap).sort((a, b) => b.incidents.length - a.incidents.length)
})

// ── Day of Week Distribution ─────────────────────────────────────────
const dayOfWeekStats = computed(() => {
  const events = washEvents.value
  const days = [
    { label: 'Mon', full: 'Monday', count: 0, totalMins: 0 },
    { label: 'Tue', full: 'Tuesday', count: 0, totalMins: 0 },
    { label: 'Wed', full: 'Wednesday', count: 0, totalMins: 0 },
    { label: 'Thu', full: 'Thursday', count: 0, totalMins: 0 },
    { label: 'Fri', full: 'Friday', count: 0, totalMins: 0 }
  ]

  events.forEach(e => {
    if (!e.timestamp) return
    const d = new Date(e.timestamp).getDay() // 0 = Sun, 1 = Mon ... 5 = Fri
    const idx = d - 1
    if (idx >= 0 && idx < 5) {
      days[idx].count++
      days[idx].totalMins += toMinutes(e.duration)
    }
  })

  const maxCount = Math.max(...days.map(d => d.count), 1)
  return days.map(d => ({
    ...d,
    percent: Math.round((d.count / maxCount) * 100),
    avgMins: d.count > 0 ? (d.totalMins / d.count).toFixed(1) : '0.0'
  }))
})

// ── Duration Tiers Breakdown ─────────────────────────────────────────
const durationTiers = computed(() => {
  const events = washEvents.value
  const total = events.length || 1

  const quick = events.filter(e => toMinutes(e.duration) < 5).length
  const standard = events.filter(e => {
    const m = toMinutes(e.duration)
    return m >= 5 && m <= extendedLimit.value
  }).length
  const extended = events.filter(e => toMinutes(e.duration) > extendedLimit.value).length

  return {
    quick,
    quickPct: Math.round((quick / total) * 100),
    standard,
    standardPct: Math.round((standard / total) * 100),
    extended,
    extendedPct: Math.round((extended / total) * 100)
  }
})

function formatEventTime(ts) {
  if (!ts) return ''
  const parseStr = ts.includes('Z') || ts.match(/[+-]\d{2}:\d{2}$/) ? ts : ts + 'Z'
  const d = new Date(parseStr)
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }) + ' · ' + d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  }).toLowerCase()
}

// All extended trips list (> 15 min), sorted longest to shortest duration
const extendedTripsList = computed(() => {
  const events = washEvents.value
  const students = studentStatsMap.value

  return events
    .filter(e => toMinutes(e.duration) > extendedLimit.value)
    .map((e, idx) => {
      const s = students[String(e.studentId)]
      return {
        key: `${e.eventId || idx}_${e.timestamp}`,
        studentId: e.studentId,
        firstName: s?.firstName || 'Student',
        lastName: s?.lastName || e.studentId,
        duration: toMinutes(e.duration),
        testDay: !!e.testDay,
        isDuringTest: checkIsDuringTest(e, props.reportClass),
        note: e.note || '',
        formattedDate: formatEventTime(e.timestamp),
        timestamp: e.timestamp
      }
    })
    .sort((a, b) => b.duration - a.duration)
})

function getDurationSeverityClass(mins) {
  if (mins >= 30) return 'ooc-duration-pill--critical'
  if (mins >= 20) return 'ooc-duration-pill--high'
  return 'ooc-duration-pill--warning'
}
</script>

<style scoped>
.ooc-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* ── Unified Toolbar ───────────────────────────── */
.ooc-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.ooc-toolbar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
}

.ooc-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ooc-view-switcher {
  display: inline-flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 2px;
  flex-shrink: 0;
}

.ooc-view-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.74rem;
  font-weight: 600;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.ooc-view-btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.ooc-view-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

/* Metric Filter Pills */
.ooc-filter-pills {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.ooc-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.ooc-filter-pill:hover {
  border-color: var(--primary);
  color: var(--text);
}

.ooc-filter-pill--active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  font-weight: 700;
}

.ooc-pill-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 8px;
  line-height: 1.1;
}

.ooc-pill-badge--alert {
  background: #ef4444;
  color: #ffffff;
}

.ooc-pill-badge--test {
  background: #8b5cf6;
  color: #ffffff;
}

.ooc-filter-pill--active .ooc-pill-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Search input */
.ooc-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ooc-search-icon {
  position: absolute;
  left: 7px;
  color: var(--text-secondary);
  pointer-events: none;
}

.ooc-search-input {
  padding: 4px 8px 4px 24px;
  font-size: 0.76rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  width: 130px;
  transition: width 0.2s ease, border-color 0.15s ease;
}

.ooc-search-input:focus {
  outline: none;
  border-color: var(--primary);
  width: 160px;
}

/* ── Contextual Meta Bar ───────────────────────── */
.ooc-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.ooc-meta-text strong {
  color: var(--text);
}

.ooc-meta-alert {
  color: #ef4444;
  font-weight: 700;
}

.ooc-meta-test {
  color: #8b5cf6;
  font-weight: 700;
}

.ooc-meta-right strong {
  color: var(--text);
}

/* ── Stack-Rank Matrix Rows ────────────────────── */
.ooc-matrix {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.ooc-row {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.ooc-row:hover {
  border-color: var(--primary);
  background: var(--surface-hover);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.ooc-student-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 1 auto;
  min-width: 130px;
  max-width: 280px;
  overflow: hidden;
}

.ooc-name-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
  overflow: hidden;
}

.ooc-student-name {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ooc-student-sub {
  font-size: 0.72rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ooc-sub-alert {
  color: #ef4444;
  font-weight: 600;
}

.ooc-sub-test {
  color: #8b5cf6;
  font-weight: 600;
}

/* Proportional Animated Bars */
.ooc-bar-track-wrap {
  flex: 1 1 50px;
  min-width: 30px;
}

.ooc-bar-track {
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
  position: relative;
}

.ooc-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ooc-bar-fill--trips {
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
}

.ooc-bar-fill--duration {
  background: linear-gradient(90deg, #f59e0b, #f97316);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}

.ooc-bar-fill--extended {
  background: linear-gradient(90deg, #f97316, #ef4444);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
}

.ooc-bar-fill--test_day {
  background: linear-gradient(90deg, #ec4899, #f43f5e);
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.4);
}

/* Value Badges */
.ooc-val-badge {
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  flex-shrink: 0;
  white-space: nowrap;
}

.ooc-val-badge__num {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text);
}

.ooc-val-badge__unit {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.ooc-val-badge--trips .ooc-val-badge__num { color: #3b82f6; }
.ooc-val-badge--duration .ooc-val-badge__num { color: #f59e0b; }
.ooc-val-badge--extended .ooc-val-badge__num { color: #ef4444; }
.ooc-val-badge--test_day .ooc-val-badge__num { color: #ec4899; }

/* ── 2D Diagnostic Matrix Canvas ───────────────── */
.ooc-canvas {
  position: relative;
  width: 100%;
  height: clamp(360px, 48vh, 420px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: visible;
  box-shadow: var(--shadow-sm);
  box-sizing: border-box;
}

.ooc-quadrant {
  position: absolute;
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  pointer-events: none;
  z-index: 1;
}

.ooc-quadrant--top-left    { top: 0; left: 0; }
.ooc-quadrant--top-right   { top: 0; right: 0; align-items: flex-end; text-align: right; }
.ooc-quadrant--bottom-left { bottom: 0; left: 0; }
.ooc-quadrant--bottom-right{ bottom: 0; right: 0; align-items: flex-end; text-align: right; }

.ooc-quad-title {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  opacity: 0.6;
}

.ooc-quad-sub {
  font-size: 0.64rem;
  color: var(--text-secondary);
  opacity: 0.45;
}

.ooc-axis-x {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
  border-top: 1px dashed rgba(255, 255, 255, 0.15);
  z-index: 2;
}

.ooc-axis-y {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  border-left: 1px dashed rgba(255, 255, 255, 0.15);
  z-index: 2;
}

.ooc-axis-label {
  position: absolute;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 5px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.ooc-axis-label--y { right: 6px; top: -16px; }
.ooc-axis-label--x { bottom: 6px; left: 6px; }

/* Student Scatter Dots */
.ooc-dot {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
  transition: transform 0.15s ease, box-shadow 0.15s ease, z-index 0.1s ease;
  z-index: 10;
}

.ooc-dot:hover {
  transform: translate(-50%, 50%) scale(1.35);
  z-index: 99999 !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

.ooc-dot-label {
  font-size: 0.7rem;
  font-weight: 800;
  pointer-events: none;
  white-space: nowrap;
}

.ooc-dot--chronic  { background: var(--color-danger-bg);     border: 2px solid var(--color-danger);    color: var(--color-danger-text); }
.ooc-dot--extended { background: var(--color-warn-bg);       border: 2px solid var(--color-warn);      color: var(--color-warn-text); }
.ooc-dot--frequent { background: var(--color-primary-bg, rgba(59, 130, 246, 0.15)); border: 2px solid #3b82f6; color: #2563eb; }
.ooc-dot--typical  { background: var(--color-success-bg);   border: 2px solid var(--color-success);   color: var(--color-success-text); }

/* Tooltip on Canvas Dot */
.ooc-tooltip {
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  color: var(--text);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 0.775rem;
  white-space: nowrap;
  pointer-events: auto;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--border);
  z-index: 20000;
  min-width: 170px;
}

.ooc-dot:hover .ooc-tooltip {
  opacity: 1;
  visibility: visible;
}

.ooc-tooltip--left   { left: auto; right: 0; transform: none; }
.ooc-tooltip--right  { left: 0; right: auto; transform: none; }
.ooc-tooltip--bottom { bottom: auto; top: 125%; }

.ooc-tooltip-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 2px;
}

.ooc-tooltip-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
}

.ooc-tooltip-badge--chronic  { background: var(--color-danger-bg);     color: var(--color-danger-text); }
.ooc-tooltip-badge--extended { background: var(--color-warn-bg);       color: var(--color-warn-text); }
.ooc-tooltip-badge--frequent { background: var(--primary-light);       color: var(--primary); }
.ooc-tooltip-badge--typical  { background: var(--color-success-bg);   color: var(--color-success-text); }

.ooc-tooltip-row {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 1px;
}

.ooc-tooltip-row strong {
  color: var(--text);
}

.ooc-tooltip-row--alert {
  color: var(--color-danger);
}

.ooc-tooltip-hint {
  margin-top: 6px;
  font-size: 0.725rem;
  color: var(--primary);
  font-weight: 600;
  border-top: 1px solid var(--border);
  padding-top: 4px;
}

/* Cluster Popover Tooltip */
.ooc-tooltip--cluster {
  min-width: 190px;
  padding: 10px 12px;
}

.ooc-cluster-header {
  font-weight: 800;
  font-size: 0.775rem;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
  margin-bottom: 6px;
}

.ooc-cluster-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
}

.ooc-cluster-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: background 0.15s ease;
}

.ooc-cluster-item:hover {
  background: var(--surface-hover);
}

.ooc-cluster-name {
  font-size: 0.775rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}

.ooc-cluster-meta {
  font-size: 0.725rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 4-Quadrant Summary Cards (Matching Risk Matrix) */
.ooc-matrix-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px;
}

.ooc-matrix-summary-card {
  flex: 1 1 140px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: default;
  transition: transform 0.15s ease, border-color 0.15s ease;
  min-width: 0;
}

.ooc-matrix-summary-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
}

.ooc-matrix-summary-card .count {
  font-size: 1.15rem;
  font-weight: 800;
  flex-shrink: 0;
}

.ooc-matrix-summary-card .label {
  font-size: 0.725rem;
  color: var(--text-secondary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ooc-matrix-summary-card--red    .count { color: var(--color-danger); }
.ooc-matrix-summary-card--yellow .count { color: var(--color-warn); }
.ooc-matrix-summary-card--blue   .count { color: #3b82f6; }
.ooc-matrix-summary-card--green  .count { color: var(--color-success); }

/* ── Patterns & Overlaps Layout ────────────────── */
.ooc-patterns-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.ooc-patterns-top-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .ooc-patterns-top-grid {
    grid-template-columns: 1fr;
  }
}

.ooc-pattern-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.ooc-pattern-card--full {
  width: 100%;
}

.ooc-pattern-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ooc-pattern-header--split {
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.ooc-pattern-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ooc-pattern-icon {
  flex-shrink: 0;
}

.ooc-pattern-icon--rose   { color: #ef4444; }
.ooc-pattern-icon--blue   { color: #3b82f6; }
.ooc-pattern-icon--purple { color: #8b5cf6; }

.ooc-pattern-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.ooc-pattern-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  padding: 1px 6px;
  border-radius: 10px;
}

.ooc-pattern-desc {
  font-size: 0.74rem;
  color: var(--text-secondary);
  margin: 0;
}

.ooc-expand-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.ooc-expand-btn:hover {
  background: var(--surface-hover);
  border-color: var(--primary);
}

/* ── 75-Min Period Histogram & Curve ───────────── */
.ooc-histogram-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-sizing: border-box;
}

.ooc-histogram-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 64px;
  gap: 3px;
}

.ooc-hist-bar-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.ooc-hist-bar-track {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.ooc-hist-bar-fill {
  width: 100%;
  border-radius: 2px 2px 0 0;
  min-height: 4px;
  transition: height 0.3s ease, filter 0.15s ease;
}

.ooc-hist-bar-col:hover .ooc-hist-bar-fill {
  filter: brightness(1.3);
}

.ooc-hist-fill--instruction   { background: linear-gradient(180deg, #f97316, #ef4444); }
.ooc-hist-fill--work          { background: linear-gradient(180deg, #6366f1, #3b82f6); }
.ooc-hist-fill--consolidation { background: linear-gradient(180deg, #ec4899, #8b5cf6); }

/* ── Proportional Histogram Phases ─────────────── */
.ooc-hist-phases {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--border);
  padding-top: 6px;
  width: 100%;
  box-sizing: border-box;
}

.ooc-hist-phase {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ooc-hist-phase-title {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.ooc-hist-phase-stat {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.ooc-hist-phase-stat strong {
  font-weight: 800;
}

.ooc-hist-phase-sub {
  font-size: 0.62rem;
  font-weight: 600;
  opacity: 0.85;
}

.ooc-hist-phase--instruction {
  width: 27%;
  color: #f97316;
  text-align: left;
}
.ooc-hist-phase--instruction .ooc-hist-phase-stat { color: #f97316; }

.ooc-hist-phase--work {
  width: 53%;
  color: #3b82f6;
  text-align: center;
}
.ooc-hist-phase--work .ooc-hist-phase-stat { color: #3b82f6; }

.ooc-hist-phase--consolidation {
  width: 20%;
  color: #8b5cf6;
  text-align: right;
}
.ooc-hist-phase--consolidation .ooc-hist-phase-stat { color: #8b5cf6; }

.ooc-insight-callout {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text);
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  box-sizing: border-box;
}

.ooc-insight-icon {
  color: var(--primary);
  flex-shrink: 0;
}

/* Co-Departure List */
.ooc-overlap-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.ooc-overlap-list--scrollable {
  max-height: 340px;
  overflow-y: auto;
  padding-right: 4px;
}

.ooc-overlap-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  box-sizing: border-box;
}

.ooc-overlap-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ooc-overlap-avatars {
  display: flex;
  align-items: center;
  margin-right: -4px;
  flex-shrink: 0;
}

.ooc-overlap-avatars > :last-child {
  margin-left: -8px;
  border: 2px solid var(--surface);
  border-radius: 50%;
}

.ooc-overlap-names {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ooc-pair-names {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ooc-student-link {
  background: none;
  border: none;
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  font-size: 0.82rem;
  white-space: nowrap;
}

.ooc-student-link:hover {
  color: var(--primary);
  text-decoration: underline;
}

.ooc-pair-count {
  font-size: 0.68rem;
  color: #ef4444;
  font-weight: 600;
  white-space: nowrap;
}

.ooc-overlap-incidents {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.ooc-incident-pill {
  font-size: 0.68rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.ooc-incident-more {
  font-size: 0.68rem;
  color: var(--primary);
  font-weight: 600;
}

.ooc-pattern-empty {
  padding: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.ooc-pattern-ok-icon {
  color: #10b981;
}

.ooc-pattern-ok-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Day of Week distribution */
.ooc-dow-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.ooc-dow-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.ooc-dow-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text);
  width: 62px;
  flex-shrink: 0;
}

.ooc-dow-bar-track {
  flex: 1 1 40px;
  min-width: 20px;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.ooc-dow-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.ooc-dow-count {
  font-size: 0.68rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
  text-align: right;
}

/* Duration Tiers */
.ooc-tier-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.ooc-tier-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}

.ooc-tier-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.74rem;
  font-weight: 600;
  gap: 6px;
}

.ooc-tier-name { 
  color: var(--text); 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}

.ooc-tier-meta { 
  color: var(--text-secondary); 
  font-size: 0.68rem; 
  white-space: nowrap; 
  flex-shrink: 0; 
}

.ooc-tier-bar-track {
  width: 100%;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
  position: relative;
}

.ooc-tier-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.ooc-fill--quick         { background: linear-gradient(90deg, #10b981, #3b82f6); }
.ooc-fill--standard      { background: linear-gradient(90deg, #3b82f6, #f59e0b); }
.ooc-fill--extended      { background: linear-gradient(90deg, #f59e0b, #ef4444); }

/* Direct Instruction Absence List */
.ooc-instruction-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.ooc-instruction-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  width: 100%;
  box-sizing: border-box;
}

.ooc-instruction-item:hover {
  background: var(--surface-hover);
  border-color: var(--primary);
}

.ooc-instruction-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
}

.ooc-instruction-name {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ooc-instruction-meta {
  font-size: 0.66rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.ooc-instruction-badge {
  font-size: 0.72rem;
  font-weight: 800;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.ooc-instruction-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.ooc-instruction-ok-text {
  font-size: 0.74rem;
  color: var(--text-secondary);
}

/* ── Extended Trips Section (Incident Ledger) ──── */
.ooc-extended-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-top: 10px;
  width: 100%;
  box-sizing: border-box;
}

.ooc-extended-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.06);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  flex-wrap: wrap;
  gap: 6px;
}

.ooc-extended-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ooc-extended-icon {
  color: #ef4444;
}

.ooc-extended-title {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.ooc-extended-count-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  padding: 1px 6px;
  border-radius: 10px;
}

.ooc-extended-sort-hint {
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.ooc-extended-toggle-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ooc-extended-toggle-btn:hover {
  background: var(--surface-hover);
  border-color: var(--primary);
}

.ooc-extended-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}

.ooc-extended-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s ease;
  width: 100%;
  box-sizing: border-box;
}

.ooc-extended-card:last-child {
  border-bottom: none;
}

.ooc-extended-card:hover {
  background: var(--surface-hover);
}

.ooc-extended-card__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ooc-extended-card__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ooc-extended-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ooc-extended-date {
  font-size: 0.7rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.ooc-extended-card__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ooc-tag-testday {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 600;
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
  padding: 2px 5px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.ooc-tag-testday--during {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.ooc-tag-note {
  font-size: 0.68rem;
  color: var(--text-secondary);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ooc-duration-pill {
  font-size: 0.76rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.ooc-duration-pill--warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.ooc-duration-pill--high {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
}

.ooc-duration-pill--critical {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* ── Empty State ───────────────────────────────── */
.ooc-empty {
  padding: 30px 16px;
  text-align: center;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.ooc-empty-icon {
  color: var(--text-secondary);
  opacity: 0.4;
  margin-bottom: 4px;
}

.ooc-empty-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.ooc-empty-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 768px) {
  .ooc-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .ooc-toolbar__left {
    width: 100%;
    justify-content: space-between;
  }

  .ooc-toolbar__right {
    width: 100%;
  }

  .ooc-search-input {
    width: 100%;
  }

  .ooc-view-switcher {
    overflow-x: auto;
    width: 100%;
  }

  .ooc-phase-strip {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .ooc-row {
    flex-wrap: wrap;
    gap: 6px;
  }

  .ooc-student-info {
    flex: 1 1 auto;
    max-width: 100%;
  }

  .ooc-bar-track-wrap {
    flex: 1 1 100%;
    order: 3;
  }

  .ooc-val-badge {
    margin-left: auto;
  }
}
</style>
