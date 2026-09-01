<template>
  <div class="mindset-analytics">
    <!-- Header with Title, Lens Switcher, View Mode & Actions -->
    <div class="mindset-analytics__header">
      <div class="mindset-analytics__header-left">
        <div class="mindset-analytics__title-row">
          <Sparkles :size="16" class="mindset-title-icon" />
          <h4 class="mindset-analytics__title">Student Mindset &amp; Aspirations Matrix</h4>
        </div>
        <p class="mindset-analytics__subtitle">
          <template v-if="lensMode === 'actualVsGoal'">
            Tracking Anticipated Target Goals vs. Actual Live Academic Marks ({{ respondedStudentsCount }} of {{ totalStudentsCount }} students responded)
          </template>
          <template v-else>
            Day 1 Baseline: Course Confidence (1–5) vs. Target Goals ({{ respondedStudentsCount }} of {{ totalStudentsCount }} students responded)
          </template>
        </p>
      </div>

      <!-- Actions and View Switcher -->
      <div class="mindset-analytics__actions">
        <!-- Lens Switcher: Progress vs Goal OR Day 1 Mindset -->
        <div class="mindset-lens-switcher" role="group" aria-label="Matrix Lens">
          <button 
            type="button"
            class="mindset-lens-btn"
            :class="{ 'mindset-lens-btn--active': lensMode === 'actualVsGoal' }"
            @click="lensMode = 'actualVsGoal'"
            title="Compare Anticipated Target Goal vs. Live Current Academic Mark"
          >
            <Target :size="13" /> Progress vs. Goal
          </button>
          <button 
            type="button"
            class="mindset-lens-btn"
            :class="{ 'mindset-lens-btn--active': lensMode === 'day1Mindset' }"
            @click="lensMode = 'day1Mindset'"
            title="Day 1 Baseline: Course Confidence vs. Target Goal"
          >
            <Sparkles :size="13" /> Day 1 Mindset
          </button>
        </div>

        <!-- View Switcher: Scatter vs Breakdown -->
        <div class="mindset-view-switcher">
          <button 
            type="button"
            class="mindset-view-btn"
            :class="{ 'mindset-view-btn--active': viewMode === 'scatter' }"
            @click="viewMode = 'scatter'"
            title="Visual 4-Quadrant Scatter Matrix"
          >
            <ScatterPlotIcon :size="13" /> Scatter Plot
          </button>
          <button 
            type="button"
            class="mindset-view-btn"
            :class="{ 'mindset-view-btn--active': viewMode === 'breakdown' }"
            @click="viewMode = 'breakdown'"
            title="Cohort Breakdown & Lists"
          >
            <List :size="13" /> Breakdown &amp; Lists
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State: No Survey Data -->
    <div v-if="respondedStudentsCount === 0" class="mindset-empty-card">
      <Sparkles :size="24" class="mindset-empty-icon" />
      <h5 class="mindset-empty-title">No Day 1 Survey Data Recorded</h5>
      <p class="mindset-empty-desc">
        Import your Microsoft Forms survey (.xlsx or .csv) or enter student intake responses to see your class confidence profile, target aspirations, and seating needs.
      </p>
      <button class="mindset-empty-btn" @click="showSurveyModal = true">
        <UploadCloud :size="14" /> Setup &amp; Import Student Survey
      </button>
    </div>

    <template v-else>
      <!-- VIEW 1: 4-Quadrant Scatter Canvas -->
      <div v-if="viewMode === 'scatter'" class="mindset-canvas-wrap">
        <div class="mindset-canvas">
          <!-- ── LENS 1: Actual vs Goal (Progress) ── -->
          <template v-if="lensMode === 'actualVsGoal'">
            <!-- Quadrant Background Labels -->
            <div class="mindset-quadrant mindset-quadrant--top-right">
              <span class="mindset-quad-label mindset-quad-label--green">Achieving Ambitions</span>
              <span class="mindset-quad-sub">High Goal (≥75%) · High Actual (≥75%)</span>
            </div>
            <div class="mindset-quadrant mindset-quadrant--top-left">
              <span class="mindset-quad-label mindset-quad-label--teal">Surprise High Achievers</span>
              <span class="mindset-quad-sub">Modest Goal (&lt;75%) · High Actual (≥75%)</span>
            </div>
            <div class="mindset-quadrant mindset-quadrant--bottom-right">
              <span class="mindset-quad-label mindset-quad-label--red">The Aspiration Gap</span>
              <span class="mindset-quad-sub">High Goal (≥75%) · Actual Lagging (&lt;75%)</span>
            </div>
            <div class="mindset-quadrant mindset-quadrant--bottom-left">
              <span class="mindset-quad-label mindset-quad-label--amber">Low-Expectation Trap</span>
              <span class="mindset-quad-sub">Modest Goal (&lt;75%) · Low Actual (&lt;75%)</span>
            </div>

            <!-- Diagonal Parity Line (45 degree: Actual = Goal) -->
            <div class="mindset-parity-track">
              <svg class="mindset-parity-svg" width="100%" height="100%">
                <line x1="10%" y1="90%" x2="90%" y2="10%" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="4,4" />
              </svg>
              <span class="mindset-parity-tag">Target Met (Actual = Goal)</span>
            </div>

            <!-- Axis Divider Lines (Threshold at 75% midpoint) -->
            <div class="mindset-axis-x" style="bottom: 50%;"></div>
            <div class="mindset-axis-y" style="left: 50%;"></div>

            <!-- Axis Corner Guides -->
            <span class="mindset-axis-guide mindset-axis-guide--y-top">Actual: 100%</span>
            <span class="mindset-axis-guide mindset-axis-guide--y-bottom">Actual: 50%</span>
            <span class="mindset-axis-guide mindset-axis-guide--x-left">Goal: 50%</span>
            <span class="mindset-axis-guide mindset-axis-guide--x-right">Goal: 100%</span>
          </template>

          <!-- ── LENS 2: Day 1 Mindset (Confidence vs Goal) ── -->
          <template v-else>
            <!-- Quadrant Background Labels -->
            <div class="mindset-quadrant mindset-quadrant--top-left">
              <span class="mindset-quad-label mindset-quad-label--amber">Anxious Strivers</span>
              <span class="mindset-quad-sub">High Target Goal · Low Confidence</span>
            </div>
            <div class="mindset-quadrant mindset-quadrant--top-right">
              <span class="mindset-quad-label mindset-quad-label--green">Primed Thrivers</span>
              <span class="mindset-quad-sub">High Target Goal · High Confidence</span>
            </div>
            <div class="mindset-quadrant mindset-quadrant--bottom-left">
              <span class="mindset-quad-label mindset-quad-label--red">Support Needed</span>
              <span class="mindset-quad-sub">Low Target Goal · Low Confidence</span>
            </div>
            <div class="mindset-quadrant mindset-quadrant--bottom-right">
              <span class="mindset-quad-label mindset-quad-label--purple">Coasters / Untapped</span>
              <span class="mindset-quad-sub">Low Target Goal · High Confidence</span>
            </div>

            <!-- Axis Divider Lines (Threshold at Goal = 80%, Confidence = 2.5) -->
            <div class="mindset-axis-x" style="bottom: 52%;"></div>
            <div class="mindset-axis-y" style="left: 45%;"></div>

            <!-- Axis Corner Guides -->
            <span class="mindset-axis-guide mindset-axis-guide--y-top">Target: 100%</span>
            <span class="mindset-axis-guide mindset-axis-guide--y-bottom">Target: 50%</span>
            <span class="mindset-axis-guide mindset-axis-guide--x-left">Conf: 1 (Low)</span>
            <span class="mindset-axis-guide mindset-axis-guide--x-right">Conf: 5 (High)</span>
          </template>

          <!-- Student Dots (Smoothly animated positions) -->
          <div 
            v-for="s in activeStudentPoints" 
            :key="s.studentId"
            class="mindset-dot"
            :class="lensMode === 'actualVsGoal' ? `mindset-dot--conf-${s.confidence || 3}` : `mindset-dot--${s.day1Quadrant}`"
            :style="{ left: s.xPercent + '%', bottom: s.yPercent + '%' }"
            @click="$emit('select-student', s.studentId)"
          >
            <span class="mindset-dot-label">{{ s.initials }}</span>
            
            <!-- Tooltip Popover -->
            <div 
              class="mindset-tooltip"
              :class="{
                'mindset-tooltip--left': s.xPercent > 65,
                'mindset-tooltip--right': s.xPercent < 35,
                'mindset-tooltip--bottom': s.yPercent > 55,
                'mindset-tooltip--cluster': s.clusterMembers && s.clusterMembers.length > 1
              }"
            >
              <!-- Single Student Tooltip -->
              <template v-if="!s.clusterMembers || s.clusterMembers.length <= 1">
                <div class="mindset-tooltip-name">{{ s.fullName }}</div>
                <div class="mindset-tooltip-row">
                  Target Goal: <strong>{{ s.targetGradeLabel || 'None' }}</strong>
                </div>
                <div class="mindset-tooltip-row">
                  Confidence: <strong>{{ s.confidence ? `${s.confidence}/5` : 'Not rated' }}</strong>
                  <span v-if="s.confidenceLabel" class="mindset-tooltip-sub">({{ s.confidenceLabel }})</span>
                </div>
                <div v-if="s.seating" class="mindset-tooltip-row">
                  Seating: <strong>{{ s.seating }}</strong>
                </div>
                <div v-if="s.currentGrade !== null" class="mindset-tooltip-row mindset-tooltip-row--grade">
                  Current Mark: <strong>{{ isSbar && s.sbarBadge ? `${s.sbarBadge.level} (${s.currentGrade}%)` : `${s.currentGrade}%` }}</strong>
                  <span 
                    v-if="s.goalDelta !== null" 
                    class="mindset-delta-badge"
                    :class="s.goalDelta >= 0 ? 'mindset-delta-badge--pos' : 'mindset-delta-badge--neg'"
                  >
                    {{ s.goalDelta >= 0 ? `+${s.goalDelta}%` : `${s.goalDelta}%` }} vs Goal
                  </span>
                </div>
                <div class="mindset-tooltip-hint">Click to view Dossier →</div>
              </template>

              <!-- Clustered Multi-Student Tooltip -->
              <template v-else>
                <div class="mindset-tooltip-cluster-title">{{ s.clusterMembers.length }} Students in Cluster:</div>
                <div 
                  v-for="m in s.clusterMembers" 
                  :key="m.studentId" 
                  class="mindset-tooltip-cluster-item"
                  @click.stop="$emit('select-student', m.studentId)"
                >
                  <div class="mindset-cluster-name">{{ m.fullName }}</div>
                  <div class="mindset-cluster-meta">
                    Goal: {{ m.targetGradeLabel }} · Conf: {{ m.confidence }}/5
                    <span v-if="m.currentGrade !== null"> · Live: {{ isSbar && m.sbarBadge ? `${m.sbarBadge.level} (${m.currentGrade}%)` : `${m.currentGrade}%` }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Confidence Legend Bar (Only for Progress vs Goal lens) -->
        <div v-if="lensMode === 'actualVsGoal'" class="mindset-conf-legend">
          <span class="mindset-conf-legend__title">Day 1 Confidence Overlay:</span>
          <span class="mindset-conf-legend__item"><span class="mindset-conf-dot mindset-conf-dot--5"></span> High</span>
          <span class="mindset-conf-legend__item"><span class="mindset-conf-dot mindset-conf-dot--4"></span> Confident</span>
          <span class="mindset-conf-legend__item"><span class="mindset-conf-dot mindset-conf-dot--3"></span> Neutral</span>
          <span class="mindset-conf-legend__item"><span class="mindset-conf-dot mindset-conf-dot--2"></span> Unsure</span>
          <span class="mindset-conf-legend__item"><span class="mindset-conf-dot mindset-conf-dot--1"></span> Anxious</span>
        </div>
      </div>

      <!-- Bottom Metric Summary Ribbon (Scatter View) -->
      <div v-if="viewMode === 'scatter'" class="mindset-summary-ribbon">
        <template v-if="lensMode === 'actualVsGoal'">
          <div class="mindset-ribbon-tile mindset-ribbon-tile--green">
            <span class="mindset-ribbon-count">{{ achievingCount }}</span>
            <span class="mindset-ribbon-label">Achieving Ambitions</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--red">
            <span class="mindset-ribbon-count">{{ aspirationGapCount }}</span>
            <span class="mindset-ribbon-label">The Aspiration Gap</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--teal">
            <span class="mindset-ribbon-count">{{ surpriseAchieversCount }}</span>
            <span class="mindset-ribbon-label">Surprise Achievers</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--amber">
            <span class="mindset-ribbon-count">{{ lowTrapCount }}</span>
            <span class="mindset-ribbon-label">Low Expectation Trap</span>
          </div>
        </template>

        <template v-else>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--green">
            <span class="mindset-ribbon-count">{{ primedThriversCount }}</span>
            <span class="mindset-ribbon-label">Primed Thrivers</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--amber">
            <span class="mindset-ribbon-count">{{ anxiousStriversCount }}</span>
            <span class="mindset-ribbon-label">Anxious Strivers</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--purple">
            <span class="mindset-ribbon-count">{{ coastersCount }}</span>
            <span class="mindset-ribbon-label">Coasters / Untapped</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--red">
            <span class="mindset-ribbon-count">{{ supportNeededCount }}</span>
            <span class="mindset-ribbon-label">Support Needed</span>
          </div>
        </template>
      </div>

      <!-- VIEW 2: Cohort Breakdown & Quadrant Lists -->
      <div v-if="viewMode === 'breakdown'" class="mindset-breakdown">
        <!-- ── LENS 1 Cohort Cards: Progress vs Goal ── -->
        <div v-if="lensMode === 'actualVsGoal'" class="mindset-quadrants-grid">
          <!-- Card 1: Achieving Ambitions -->
          <div class="mindset-quad-card mindset-quad-card--green">
            <div class="mindset-quad-card__header">
              <div class="mindset-quad-card__title-group">
                <span class="mindset-quad-card__title">Achieving Ambitions</span>
                <span class="mindset-quad-card__sub">High Goal (≥75%) · Delivering High Marks (≥75%)</span>
              </div>
              <span class="mindset-quad-card__badge">{{ achievingList.length }}</span>
            </div>
            <ul v-if="achievingList.length > 0" class="mindset-student-list">
              <li 
                v-for="st in achievingList" 
                :key="st.studentId" 
                class="mindset-student-row"
                @click="$emit('select-student', st.studentId)"
              >
                <div class="mindset-student-main">
                  <span class="mindset-student-name">{{ st.fullName }}</span>
                  <span class="mindset-student-tags">
                    <span class="mindset-tag mindset-tag--goal">{{ st.targetGradeLabel }}</span>
                    <span class="mindset-tag mindset-tag--conf" :class="`mindset-tag--conf-${st.confidence}`">{{ st.confidence }}/5</span>
                  </span>
                </div>
                <span v-if="st.currentGrade !== null" class="mindset-live-grade">
                  {{ isSbar && st.sbarBadge ? `${st.sbarBadge.level} (${st.currentGrade}%)` : `${st.currentGrade}%` }}
                </span>
              </li>
            </ul>
            <p v-else class="mindset-empty-quad">No students currently in this category.</p>
          </div>

          <!-- Card 2: The Aspiration Gap -->
          <div class="mindset-quad-card mindset-quad-card--red">
            <div class="mindset-quad-card__header">
              <div class="mindset-quad-card__title-group">
                <span class="mindset-quad-card__title">The Aspiration Gap ⚠️</span>
                <span class="mindset-quad-card__sub">High Goal (≥75%) · Marks Lagging (&lt;75%) — High Priority Check-in</span>
              </div>
              <span class="mindset-quad-card__badge">{{ aspirationGapList.length }}</span>
            </div>
            <ul v-if="aspirationGapList.length > 0" class="mindset-student-list">
              <li 
                v-for="st in aspirationGapList" 
                :key="st.studentId" 
                class="mindset-student-row"
                @click="$emit('select-student', st.studentId)"
              >
                <div class="mindset-student-main">
                  <span class="mindset-student-name">{{ st.fullName }}</span>
                  <span class="mindset-student-tags">
                    <span class="mindset-tag mindset-tag--goal">{{ st.targetGradeLabel }}</span>
                    <span class="mindset-tag mindset-tag--conf" :class="`mindset-tag--conf-${st.confidence}`">{{ st.confidence }}/5</span>
                  </span>
                </div>
                <span v-if="st.currentGrade !== null" class="mindset-live-grade mindset-live-grade--gap">
                  {{ isSbar && st.sbarBadge ? `${st.sbarBadge.level} (${st.currentGrade}%)` : `${st.currentGrade}%` }}
                </span>
              </li>
            </ul>
            <p v-else class="mindset-empty-quad">No students currently in this category.</p>
          </div>

          <!-- Card 3: Surprise High Achievers -->
          <div class="mindset-quad-card mindset-quad-card--teal">
            <div class="mindset-quad-card__header">
              <div class="mindset-quad-card__title-group">
                <span class="mindset-quad-card__title">Surprise High Achievers</span>
                <span class="mindset-quad-card__sub">Modest Goal (&lt;75%) · Outperforming Expectations (≥75%)</span>
              </div>
              <span class="mindset-quad-card__badge">{{ surpriseAchieversList.length }}</span>
            </div>
            <ul v-if="surpriseAchieversList.length > 0" class="mindset-student-list">
              <li 
                v-for="st in surpriseAchieversList" 
                :key="st.studentId" 
                class="mindset-student-row"
                @click="$emit('select-student', st.studentId)"
              >
                <div class="mindset-student-main">
                  <span class="mindset-student-name">{{ st.fullName }}</span>
                  <span class="mindset-student-tags">
                    <span class="mindset-tag mindset-tag--goal">{{ st.targetGradeLabel }}</span>
                    <span class="mindset-tag mindset-tag--conf" :class="`mindset-tag--conf-${st.confidence}`">{{ st.confidence }}/5</span>
                  </span>
                </div>
                <span v-if="st.currentGrade !== null" class="mindset-live-grade">
                  {{ isSbar && st.sbarBadge ? `${st.sbarBadge.level} (${st.currentGrade}%)` : `${st.currentGrade}%` }}
                </span>
              </li>
            </ul>
            <p v-else class="mindset-empty-quad">No students currently in this category.</p>
          </div>

          <!-- Card 4: Low-Expectation Trap -->
          <div class="mindset-quad-card mindset-quad-card--amber">
            <div class="mindset-quad-card__header">
              <div class="mindset-quad-card__title-group">
                <span class="mindset-quad-card__title">Low-Expectation Trap</span>
                <span class="mindset-quad-card__sub">Modest Goal (&lt;75%) · Performing Low (&lt;75%)</span>
              </div>
              <span class="mindset-quad-card__badge">{{ lowTrapList.length }}</span>
            </div>
            <ul v-if="lowTrapList.length > 0" class="mindset-student-list">
              <li 
                v-for="st in lowTrapList" 
                :key="st.studentId" 
                class="mindset-student-row"
                @click="$emit('select-student', st.studentId)"
              >
                <div class="mindset-student-main">
                  <span class="mindset-student-name">{{ st.fullName }}</span>
                  <span class="mindset-student-tags">
                    <span class="mindset-tag mindset-tag--goal">{{ st.targetGradeLabel }}</span>
                    <span class="mindset-tag mindset-tag--conf" :class="`mindset-tag--conf-${st.confidence}`">{{ st.confidence }}/5</span>
                  </span>
                </div>
                <span v-if="st.currentGrade !== null" class="mindset-live-grade">
                  {{ isSbar && st.sbarBadge ? `${st.sbarBadge.level} (${st.currentGrade}%)` : `${st.currentGrade}%` }}
                </span>
              </li>
            </ul>
            <p v-else class="mindset-empty-quad">No students currently in this category.</p>
          </div>
        </div>

        <!-- ── LENS 2 Cohort Cards: Day 1 Mindset ── -->
        <div v-else class="mindset-quadrants-grid">
          <!-- Quadrant 1: Anxious Strivers -->
          <div class="mindset-quad-card mindset-quad-card--amber">
            <div class="mindset-quad-card__header">
              <div class="mindset-quad-card__title-group">
                <span class="mindset-quad-card__title">Anxious Strivers</span>
                <span class="mindset-quad-card__sub">High Goals · Low Confidence (Needs early reassurance)</span>
              </div>
              <span class="mindset-quad-card__badge">{{ anxiousStriversList.length }}</span>
            </div>
            <ul v-if="anxiousStriversList.length > 0" class="mindset-student-list">
              <li 
                v-for="st in anxiousStriversList" 
                :key="st.studentId" 
                class="mindset-student-row"
                @click="$emit('select-student', st.studentId)"
              >
                <div class="mindset-student-main">
                  <span class="mindset-student-name">{{ st.fullName }}</span>
                  <span class="mindset-student-tags">
                    <span class="mindset-tag mindset-tag--goal">{{ st.targetGradeLabel }}</span>
                    <span class="mindset-tag mindset-tag--conf" :class="`mindset-tag--conf-${st.confidence}`">{{ st.confidence }}/5</span>
                  </span>
                </div>
                <span v-if="st.currentGrade !== null" class="mindset-live-grade" :class="{ 'mindset-live-grade--gap': st.goalDelta < -10 }">
                  {{ isSbar && st.sbarBadge ? `${st.sbarBadge.level} (${st.currentGrade}%)` : `${st.currentGrade}%` }}
                </span>
              </li>
            </ul>
            <p v-else class="mindset-empty-quad">No students currently in this quadrant.</p>
          </div>

          <!-- Quadrant 2: Primed Thrivers -->
          <div class="mindset-quad-card mindset-quad-card--green">
            <div class="mindset-quad-card__header">
              <div class="mindset-quad-card__title-group">
                <span class="mindset-quad-card__title">Primed Thrivers</span>
                <span class="mindset-quad-card__sub">High Goals · High Confidence (Peer leaders / Extensions)</span>
              </div>
              <span class="mindset-quad-card__badge">{{ primedThriversList.length }}</span>
            </div>
            <ul v-if="primedThriversList.length > 0" class="mindset-student-list">
              <li 
                v-for="st in primedThriversList" 
                :key="st.studentId" 
                class="mindset-student-row"
                @click="$emit('select-student', st.studentId)"
              >
                <div class="mindset-student-main">
                  <span class="mindset-student-name">{{ st.fullName }}</span>
                  <span class="mindset-student-tags">
                    <span class="mindset-tag mindset-tag--goal">{{ st.targetGradeLabel }}</span>
                    <span class="mindset-tag mindset-tag--conf" :class="`mindset-tag--conf-${st.confidence}`">{{ st.confidence }}/5</span>
                  </span>
                </div>
                <span v-if="st.currentGrade !== null" class="mindset-live-grade">
                  {{ isSbar && st.sbarBadge ? `${st.sbarBadge.level} (${st.currentGrade}%)` : `${st.currentGrade}%` }}
                </span>
              </li>
            </ul>
            <p v-else class="mindset-empty-quad">No students currently in this quadrant.</p>
          </div>

          <!-- Quadrant 3: Support Needed -->
          <div class="mindset-quad-card mindset-quad-card--red">
            <div class="mindset-quad-card__header">
              <div class="mindset-quad-card__title-group">
                <span class="mindset-quad-card__title">Support Needed</span>
                <span class="mindset-quad-card__sub">Low Goals · Low Confidence (Needs early small wins)</span>
              </div>
              <span class="mindset-quad-card__badge">{{ supportNeededList.length }}</span>
            </div>
            <ul v-if="supportNeededList.length > 0" class="mindset-student-list">
              <li 
                v-for="st in supportNeededList" 
                :key="st.studentId" 
                class="mindset-student-row"
                @click="$emit('select-student', st.studentId)"
              >
                <div class="mindset-student-main">
                  <span class="mindset-student-name">{{ st.fullName }}</span>
                  <span class="mindset-student-tags">
                    <span class="mindset-tag mindset-tag--goal">{{ st.targetGradeLabel }}</span>
                    <span class="mindset-tag mindset-tag--conf" :class="`mindset-tag--conf-${st.confidence}`">{{ st.confidence }}/5</span>
                  </span>
                </div>
                <span v-if="st.currentGrade !== null" class="mindset-live-grade">
                  {{ isSbar && st.sbarBadge ? `${st.sbarBadge.level} (${st.currentGrade}%)` : `${st.currentGrade}%` }}
                </span>
              </li>
            </ul>
            <p v-else class="mindset-empty-quad">No students currently in this quadrant.</p>
          </div>

          <!-- Quadrant 4: Coasters / Untapped Potential -->
          <div class="mindset-quad-card mindset-quad-card--purple">
            <div class="mindset-quad-card__header">
              <div class="mindset-quad-card__title-group">
                <span class="mindset-quad-card__title">Coasters / Untapped</span>
                <span class="mindset-quad-card__sub">Low Goals · High Confidence (Challenge with higher bar)</span>
              </div>
              <span class="mindset-quad-card__badge">{{ coastersList.length }}</span>
            </div>
            <ul v-if="coastersList.length > 0" class="mindset-student-list">
              <li 
                v-for="st in coastersList" 
                :key="st.studentId" 
                class="mindset-student-row"
                @click="$emit('select-student', st.studentId)"
              >
                <div class="mindset-student-main">
                  <span class="mindset-student-name">{{ st.fullName }}</span>
                  <span class="mindset-student-tags">
                    <span class="mindset-tag mindset-tag--goal">{{ st.targetGradeLabel }}</span>
                    <span class="mindset-tag mindset-tag--conf" :class="`mindset-tag--conf-${st.confidence}`">{{ st.confidence }}/5</span>
                  </span>
                </div>
                <span v-if="st.currentGrade !== null" class="mindset-live-grade">
                  {{ isSbar && st.sbarBadge ? `${st.sbarBadge.level} (${st.currentGrade}%)` : `${st.currentGrade}%` }}
                </span>
              </li>
            </ul>
            <p v-else class="mindset-empty-quad">No students currently in this quadrant.</p>
          </div>
        </div>

        <!-- 3-Column Demographic & Preferences Breakdown -->
        <div class="mindset-distributions-row">
          <!-- 1. Confidence Histogram -->
          <div class="mindset-dist-card">
            <h6 class="mindset-dist-title"><Activity :size="13" /> Confidence Distribution</h6>
            <div class="mindset-bars-list">
              <div v-for="cf in confidenceHistogram" :key="cf.rating" class="mindset-bar-row">
                <span class="mindset-bar-label">{{ cf.label }}</span>
                <div class="mindset-bar-track">
                  <div class="mindset-bar-fill mindset-bar-fill--conf" :class="`mindset-bar-fill--lvl-${cf.rating}`" :style="{ width: cf.percent + '%' }"></div>
                </div>
                <span class="mindset-bar-val">{{ cf.count }} ({{ cf.percent }}%)</span>
              </div>
            </div>
          </div>

          <!-- 2. Target Goal Breakdown -->
          <div class="mindset-dist-card">
            <h6 class="mindset-dist-title"><Target :size="13" /> Target Goal Breakdown</h6>
            <div class="mindset-bars-list">
              <div v-for="g in targetGoalsHistogram" :key="g.label" class="mindset-bar-row">
                <span class="mindset-bar-label">{{ g.label }}</span>
                <div class="mindset-bar-track">
                  <div class="mindset-bar-fill mindset-bar-fill--goal" :style="{ width: g.percent + '%' }"></div>
                </div>
                <span class="mindset-bar-val">{{ g.count }} ({{ g.percent }}%)</span>
              </div>
            </div>
          </div>

          <!-- 3. Seating Preferences -->
          <div class="mindset-dist-card">
            <h6 class="mindset-dist-title"><Armchair :size="13" /> Seating Needs</h6>
            <div class="mindset-bars-list">
              <div v-for="st in seatingHistogram" :key="st.label" class="mindset-bar-row">
                <span class="mindset-bar-label" :title="st.label">{{ st.label }}</span>
                <div class="mindset-bar-track">
                  <div class="mindset-bar-fill mindset-bar-fill--seat" :style="{ width: st.percent + '%' }"></div>
                </div>
                <span class="mindset-bar-val">{{ st.count }} ({{ st.percent }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Student Survey Modal -->
    <StudentInfoSurveyModal 
      :show="showSurveyModal" 
      @close="showSurveyModal = false" 
    />
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import {
  Sparkles,
  List,
  FileText,
  UploadCloud,
  Activity,
  Target,
  Armchair
} from 'lucide-vue-next'
import { getSBARLevelBadge } from '../../db/gradebookService.js'
import StudentInfoSurveyModal from '../setup/StudentInfoSurveyModal.vue'

const ScatterPlotIcon = {
  render() {
    return h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: '13',
      height: '13',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('circle', { cx: '7.5', cy: '7.5', r: '.5', fill: 'currentColor' }),
      h('circle', { cx: '18.5', cy: '5.5', r: '.5', fill: 'currentColor' }),
      h('circle', { cx: '11.5', cy: '11.5', r: '.5', fill: 'currentColor' }),
      h('circle', { cx: '7.5', cy: '16.5', r: '.5', fill: 'currentColor' }),
      h('circle', { cx: '17.5', cy: '14.5', r: '.5', fill: 'currentColor' }),
      h('line', { x1: '3', y1: '3', x2: '3', y2: '21' }),
      h('line', { x1: '3', y1: '21', x2: '21', y2: '21' })
    ])
  }
}

const props = defineProps({
  sidebarStudents: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  isSbar: { type: Boolean, default: false }
})

const emit = defineEmits(['select-student'])

const viewMode = ref('scatter') // 'scatter' or 'breakdown'
const lensMode = ref('actualVsGoal') // 'actualVsGoal' (Progress vs Goal) or 'day1Mindset' (Day 1 Mindset)
const showSurveyModal = ref(false)

function getInitials(name, first, last) {
  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  }
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return 'ST'
}

// Convert Target Grade string to a normalized 50-100 percentage & midpoint
function parseTargetGoal(raw) {
  if (!raw) return { value: null, label: '', isHighGoal: false }
  const str = String(raw).toLowerCase()
  if (str.includes('90') || str.includes('top marks')) return { value: 95, label: '90–100%', isHighGoal: true }
  if (str.includes('80') || str.includes('level 4')) return { value: 85, label: '80–89%', isHighGoal: true }
  if (str.includes('70') || str.includes('level 3')) return { value: 75, label: '70–79%', isHighGoal: false }
  if (str.includes('60') || str.includes('level 2')) return { value: 65, label: '60–69%', isHighGoal: false }
  if (str.includes('50') || str.includes('level 1') || str.includes('passing')) return { value: 55, label: '50–59%', isHighGoal: false }
  if (str.includes('confidence') || str.includes('improve')) return { value: 65, label: 'Improve / Build Confidence', isHighGoal: false }
  return { value: 75, label: raw, isHighGoal: false }
}

const totalStudentsCount = computed(() => props.sidebarStudents.length)

// Process all student data records
const rawStudentsList = computed(() => {
  const students = props.sidebarStudents || []
  if (students.length === 0) return []

  return students
    .filter(student => {
      const survey = student.intakeSurvey || {}
      return Boolean(survey.courseConfidence || survey.targetGrade || survey.completedAt)
    })
    .map(student => {
      const sId = String(student.studentId)
      const survey = student.intakeSurvey || {}
      const conf = survey.courseConfidence || null
      const rawGoal = survey.targetGrade || ''
      const goalParsed = parseTargetGoal(rawGoal)
      const gradeObj = props.classGrades[sId] || null
      const currentGrade = (gradeObj && gradeObj.overallGrade !== undefined && gradeObj.overallGrade !== null) 
        ? Math.round(gradeObj.overallGrade) 
        : null

      const goalVal = goalParsed.value !== null ? goalParsed.value : 75
      const effectiveActual = currentGrade !== null ? currentGrade : goalVal

      // Coordinates for Lens 1: Actual vs Goal (X = Goal, Y = Actual)
      const actualGoalX = Math.max(8, Math.min(92, 10 + ((goalVal - 50) / 50) * 80))
      const actualGoalY = Math.max(8, Math.min(92, 10 + ((effectiveActual - 50) / 50) * 80))

      // Categorization for Lens 1:
      const isHighGoal = goalVal >= 75
      const isHighActual = effectiveActual >= 75
      let progressQuadrant = 'achieving'
      if (isHighGoal && isHighActual) progressQuadrant = 'achieving'
      else if (isHighGoal && !isHighActual) progressQuadrant = 'aspirationGap'
      else if (!isHighGoal && isHighActual) progressQuadrant = 'surpriseAchievers'
      else progressQuadrant = 'lowTrap'

      // Coordinates for Lens 2: Day 1 Mindset (X = Confidence, Y = Goal)
      let day1X = 50
      if (conf) {
        day1X = 12 + ((conf - 1) / 4) * 76
      }
      const day1Y = 15 + ((goalVal - 50) / 50) * 70

      // Categorization for Lens 2:
      const isHighGoalDay1 = goalParsed.isHighGoal || (goalVal >= 80)
      const isHighConfDay1 = (conf || 3) >= 3
      let day1Quadrant = 'green'
      if (isHighGoalDay1 && isHighConfDay1) day1Quadrant = 'green' // Primed Thrivers
      else if (isHighGoalDay1 && !isHighConfDay1) day1Quadrant = 'amber' // Anxious Strivers
      else if (!isHighGoalDay1 && isHighConfDay1) day1Quadrant = 'purple' // Coasters
      else day1Quadrant = 'red' // Support Needed

      const goalDelta = (currentGrade !== null && goalParsed.value !== null) 
        ? (currentGrade - goalParsed.value) 
        : null

      const sbarBadge = (currentGrade !== null && props.isSbar) ? getSBARLevelBadge(currentGrade) : null

      const initials = getInitials(student.name, student.firstName, student.lastName)
      const fullName = (student.firstName && student.lastName)
        ? `${student.firstName} ${student.lastName}`
        : (student.name || 'Student')

      return {
        studentId: sId,
        fullName,
        initials,
        confidence: conf,
        confidenceLabel: survey.courseConfidenceLabel || '',
        targetGrade: rawGoal,
        targetGradeLabel: goalParsed.label,
        seating: survey.seatingPreference || '',
        currentGrade,
        sbarBadge,
        goalDelta,
        actualGoalX,
        actualGoalY,
        progressQuadrant,
        day1X,
        day1Y,
        day1Quadrant
      }
    })
})

// Calculate relaxed positions dynamically for whichever lens is active
const activeStudentPoints = computed(() => {
  const isActualLens = lensMode.value === 'actualVsGoal'
  const list = rawStudentsList.value

  const points = list.map(item => ({
    ...item,
    xPercent: isActualLens ? item.actualGoalX : item.day1X,
    yPercent: isActualLens ? item.actualGoalY : item.day1Y
  }))

  const minDistance = 4.8
  const iterations = 15

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i]
        const p2 = points[j]
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

    // Keep within boundaries [7%, 93%]
    points.forEach(p => {
      p.xPercent = Math.max(7, Math.min(93, p.xPercent))
      p.yPercent = Math.max(8, Math.min(92, p.yPercent))
    })
  }

  // Attach cluster members for multi-student popovers
  return points.map(item => {
    const clusterMembers = points.filter(other => {
      const dist = Math.hypot(other.xPercent - item.xPercent, other.yPercent - item.yPercent)
      return dist <= 5.5
    })
    return {
      ...item,
      xPercent: Number(item.xPercent.toFixed(1)),
      yPercent: Number(item.yPercent.toFixed(1)),
      clusterMembers
    }
  })
})

const respondedStudentsCount = computed(() => rawStudentsList.value.length)
const unansweredCount = computed(() => Math.max(0, totalStudentsCount.value - respondedStudentsCount.value))

// ── Lens 1 Lists: Progress vs Goal ──
const achievingList = computed(() => rawStudentsList.value.filter(p => p.progressQuadrant === 'achieving'))
const aspirationGapList = computed(() => rawStudentsList.value.filter(p => p.progressQuadrant === 'aspirationGap'))
const surpriseAchieversList = computed(() => rawStudentsList.value.filter(p => p.progressQuadrant === 'surpriseAchievers'))
const lowTrapList = computed(() => rawStudentsList.value.filter(p => p.progressQuadrant === 'lowTrap'))

const achievingCount = computed(() => achievingList.value.length)
const aspirationGapCount = computed(() => aspirationGapList.value.length)
const surpriseAchieversCount = computed(() => surpriseAchieversList.value.length)
const lowTrapCount = computed(() => lowTrapList.value.length)

// ── Lens 2 Lists: Day 1 Mindset ──
const primedThriversList = computed(() => rawStudentsList.value.filter(p => p.day1Quadrant === 'green'))
const anxiousStriversList = computed(() => rawStudentsList.value.filter(p => p.day1Quadrant === 'amber'))
const coastersList = computed(() => rawStudentsList.value.filter(p => p.day1Quadrant === 'purple'))
const supportNeededList = computed(() => rawStudentsList.value.filter(p => p.day1Quadrant === 'red'))

const primedThriversCount = computed(() => primedThriversList.value.length)
const anxiousStriversCount = computed(() => anxiousStriversList.value.length)
const coastersCount = computed(() => coastersList.value.length)
const supportNeededCount = computed(() => supportNeededList.value.length)

// ── Confidence Distribution Histogram ──
const confidenceLabels = {
  5: '5 / 5 (High)',
  4: '4 / 5 (Confident)',
  3: '3 / 5 (Neutral)',
  2: '2 / 5 (Unsure)',
  1: '1 / 5 (Anxious)'
}

const confidenceHistogram = computed(() => {
  const points = rawStudentsList.value.filter(p => p.confidence)
  const total = points.length || 1
  return [5, 4, 3, 2, 1].map(r => {
    const count = points.filter(p => p.confidence === r).length
    return {
      rating: r,
      label: confidenceLabels[r] || `${r}/5`,
      count,
      percent: Math.round((count / total) * 100)
    }
  })
})

// ── Target Goals Distribution ──
const targetGoalsHistogram = computed(() => {
  const points = rawStudentsList.value.filter(p => p.targetGrade)
  const total = points.length || 1
  const categories = [
    { key: '90', label: '90–100%' },
    { key: '80', label: '80–89%' },
    { key: '70', label: '70–79%' },
    { key: '60', label: '60–69%' },
    { key: '50', label: '50–59%' },
    { key: 'conf', label: 'Improve / Build Confidence' }
  ]

  return categories.map(cat => {
    let count = 0
    if (cat.key === 'conf') {
      count = points.filter(p => /confidence|improve/i.test(p.targetGrade)).length
    } else {
      count = points.filter(p => p.targetGrade.includes(cat.key)).length
    }
    return {
      label: cat.label,
      count,
      percent: Math.round((count / total) * 100)
    }
  })
})

// ── Seating Needs Distribution ──
const seatingHistogram = computed(() => {
  const points = rawStudentsList.value.filter(p => p.seating)
  const total = points.length || 1
  const counts = {}

  points.forEach(p => {
    const raw = p.seating.trim()
    let normalized = raw
    if (/front|board|screen/i.test(raw)) normalized = 'Front / Board'
    else if (/middle/i.test(raw)) normalized = 'Middle of room'
    else if (/back/i.test(raw)) normalized = 'Back of room'
    else if (/window/i.test(raw)) normalized = 'Near windows'
    else if (/quiet|corner/i.test(raw)) normalized = 'Quiet area / Corner'
    else if (/door/i.test(raw)) normalized = 'Near door'
    else if (/no pref|any/i.test(raw)) normalized = 'No preference'

    counts[normalized] = (counts[normalized] || 0) + 1
  })

  return Object.entries(counts).map(([label, count]) => ({
    label,
    count,
    percent: Math.round((count / total) * 100)
  })).sort((a, b) => b.count - a.count)
})
</script>

<style scoped>
.mindset-analytics {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  container-type: inline-size;
  container-name: mindset;
}

.mindset-analytics__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.mindset-analytics__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mindset-title-icon {
  color: #6366f1;
}

.mindset-analytics__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.mindset-analytics__subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.mindset-analytics__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Lens Switcher (Progress vs Goal / Day 1) */
.mindset-lens-switcher {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.mindset-lens-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mindset-lens-btn:hover {
  color: var(--text);
}

.mindset-lens-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* View Switcher (Scatter vs Lists) */
.mindset-view-switcher {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px;
}

.mindset-view-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 5px 9px;
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mindset-view-btn:hover {
  color: var(--text);
}

.mindset-view-btn--active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.mindset-btn-survey {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mindset-btn-survey:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
  color: var(--primary);
}

/* Empty Card */
.mindset-empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: 12px;
  text-align: center;
}

.mindset-empty-icon {
  color: #6366f1;
  opacity: 0.7;
  margin-bottom: 12px;
}

.mindset-empty-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px 0;
}

.mindset-empty-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 480px;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.mindset-empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--primary);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.mindset-empty-btn:hover {
  opacity: 0.9;
}

/* ── VIEW 1: Scatter Canvas ── */
.mindset-canvas-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.mindset-canvas {
  position: relative;
  width: 100%;
  height: 380px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

/* Quadrants Background Labels */
.mindset-quadrant {
  position: absolute;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
  z-index: 1;
  max-width: 44%;
  box-sizing: border-box;
}

.mindset-quadrant--top-left     { top: 0; left: 0; }
.mindset-quadrant--top-right    { top: 0; right: 0; text-align: right; }
.mindset-quadrant--bottom-left  { bottom: 0; left: 0; }
.mindset-quadrant--bottom-right { bottom: 0; right: 0; text-align: right; }

.mindset-quad-label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.mindset-quad-label--green  { color: #34c759; }
.mindset-quad-label--teal   { color: #30b0c7; }
.mindset-quad-label--amber  { color: #ff9500; }
.mindset-quad-label--purple { color: #af52de; }
.mindset-quad-label--red    { color: #ff3b30; }

.mindset-quad-sub {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 500;
  line-height: 1.25;
}

/* Diagonal Parity Track & Line */
.mindset-parity-track {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.mindset-parity-svg {
  position: absolute;
  inset: 0;
}

.mindset-parity-tag {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  background: var(--surface);
  border: 1px dashed var(--border);
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

/* Axis Grid Lines */
.mindset-axis-x {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
  opacity: 0.85;
  z-index: 1;
}

.mindset-axis-y {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  opacity: 0.85;
  z-index: 1;
}

/* Axis Guides */
.mindset-axis-guide {
  position: absolute;
  font-size: 0.675rem;
  font-weight: 700;
  color: var(--text-secondary);
  opacity: 0.75;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  z-index: 1;
  pointer-events: none;
}

.mindset-axis-guide--y-top    { top: 8px; left: calc(50% + 6px); }
.mindset-axis-guide--y-bottom { bottom: 8px; left: calc(50% + 6px); }
.mindset-axis-guide--x-left   { bottom: calc(50% + 5px); left: 10px; }
.mindset-axis-guide--x-right  { bottom: calc(50% + 5px); right: 10px; }

/* Student Dots */
.mindset-dot {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, 50%);
  cursor: pointer;
  z-index: 2;
  transition: left 0.45s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.mindset-dot:hover {
  transform: translate(-50%, 50%) scale(1.22);
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
}

.mindset-dot-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: #ffffff;
  pointer-events: none;
}

/* Dot Colors for Lens 2 (Day 1 Mindset Archetypes) */
.mindset-dot--green  { background: #34c759; border: 2px solid #ffffff; }
.mindset-dot--amber  { background: #ff9500; border: 2px solid #ffffff; }
.mindset-dot--purple { background: #af52de; border: 2px solid #ffffff; }
.mindset-dot--red    { background: #ff3b30; border: 2px solid #ffffff; }

/* Dot Colors for Lens 1 (Confidence Overlays) */
.mindset-dot--conf-5 { background: #34c759; border: 2px solid #ffffff; } /* 5: Green */
.mindset-dot--conf-4 { background: #30b0c7; border: 2px solid #ffffff; } /* 4: Cyan */
.mindset-dot--conf-3 { background: #ffd60a; border: 2px solid #ffffff; } /* 3: Yellow */
.mindset-dot--conf-2 { background: #ff9500; border: 2px solid #ffffff; } /* 2: Orange */
.mindset-dot--conf-1 { background: #ff3b30; border: 2px solid #ffffff; } /* 1: Red */

/* Confidence Legend Bar */
.mindset-conf-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-wrap: wrap;
}

.mindset-conf-legend__title {
  font-size: 0.725rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.mindset-conf-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--text);
}

.mindset-conf-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.mindset-conf-dot--5 { background: #34c759; }
.mindset-conf-dot--4 { background: #30b0c7; }
.mindset-conf-dot--3 { background: #ffd60a; }
.mindset-conf-dot--2 { background: #ff9500; }
.mindset-conf-dot--1 { background: #ff3b30; }

/* Tooltip Popover */
.mindset-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  z-index: 20;
  min-width: 170px;
  white-space: nowrap;
  pointer-events: none;
}

.mindset-dot:hover .mindset-tooltip {
  display: block;
}

.mindset-tooltip--left   { left: auto; right: 0; transform: none; }
.mindset-tooltip--right  { left: 0; transform: none; }
.mindset-tooltip--bottom { bottom: auto; top: calc(100% + 10px); }

.mindset-tooltip-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.mindset-tooltip-row {
  font-size: 0.775rem;
  color: var(--text-secondary);
  line-height: 1.35;
}

.mindset-tooltip-row strong {
  color: var(--text);
}

.mindset-tooltip-row--grade {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--border);
}

.mindset-tooltip-sub {
  font-size: 0.7rem;
  opacity: 0.8;
  margin-left: 2px;
}

.mindset-delta-badge {
  display: inline-block;
  font-size: 0.675rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
}

.mindset-delta-badge--pos { background: rgba(52, 199, 89, 0.15); color: #34c759; }
.mindset-delta-badge--neg { background: rgba(255, 59, 48, 0.15); color: #ff3b30; }

.mindset-tooltip-hint {
  font-size: 0.675rem;
  color: var(--primary);
  margin-top: 6px;
  font-weight: 600;
}

/* Cluster Tooltip */
.mindset-tooltip-cluster-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.mindset-tooltip-cluster-item {
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
  pointer-events: auto;
  cursor: pointer;
}

.mindset-tooltip-cluster-item:last-child {
  border-bottom: none;
}

.mindset-cluster-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
}

.mindset-cluster-meta {
  font-size: 0.725rem;
  color: var(--text-secondary);
}

/* Bottom Ribbon */
.mindset-summary-ribbon {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

@media (max-width: 900px) {
  .mindset-summary-ribbon {
    grid-template-columns: repeat(2, 1fr);
  }
}

.mindset-ribbon-tile {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.mindset-ribbon-count {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1;
}

.mindset-ribbon-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mindset-ribbon-tile--green  .mindset-ribbon-count { color: #34c759; }
.mindset-ribbon-tile--teal   .mindset-ribbon-count { color: #30b0c7; }
.mindset-ribbon-tile--amber  .mindset-ribbon-count { color: #ff9500; }
.mindset-ribbon-tile--purple .mindset-ribbon-count { color: #af52de; }
.mindset-ribbon-tile--red    .mindset-ribbon-count { color: #ff3b30; }

/* ── VIEW 2: Breakdown & Lists ── */
.mindset-breakdown {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.mindset-quadrants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  width: 100%;
}

.mindset-quad-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.mindset-quad-card--green  { border-top: 3px solid #34c759; }
.mindset-quad-card--teal   { border-top: 3px solid #30b0c7; }
.mindset-quad-card--amber  { border-top: 3px solid #ff9500; }
.mindset-quad-card--purple { border-top: 3px solid #af52de; }
.mindset-quad-card--red    { border-top: 3px solid #ff3b30; }

.mindset-quad-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.mindset-quad-card__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text);
  display: block;
}

.mindset-quad-card__sub {
  font-size: 0.725rem;
  color: var(--text-secondary);
  display: block;
  margin-top: 1px;
}

.mindset-quad-card__badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text);
  border: 1px solid var(--border);
}

.mindset-student-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mindset-student-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mindset-student-row:hover {
  background: var(--border);
}

.mindset-student-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mindset-student-name {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text);
}

.mindset-student-tags {
  display: inline-flex;
  gap: 4px;
}

.mindset-tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
}

.mindset-tag--goal { background: rgba(99, 102, 241, 0.12); color: #6366f1; }
.mindset-tag--conf-1 { background: rgba(255, 59, 48, 0.12); color: #ff3b30; }
.mindset-tag--conf-2 { background: rgba(255, 149, 0, 0.15); color: #ff9500; }
.mindset-tag--conf-3 { background: rgba(255, 214, 10, 0.15); color: #b28a00; }
.mindset-tag--conf-4 { background: rgba(48, 176, 199, 0.15); color: #30b0c7; }
.mindset-tag--conf-5 { background: rgba(52, 199, 89, 0.15); color: #34c759; }

.mindset-live-grade {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
}

.mindset-live-grade--gap {
  color: #ff3b30;
}

.mindset-empty-quad {
  font-size: 0.775rem;
  color: var(--text-secondary);
  margin: 0;
  font-style: italic;
  padding: 8px 0;
}

/* 3-Column Demographic Distributions */
.mindset-distributions-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  width: 100%;
}

.mindset-dist-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.mindset-dist-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0;
}

.mindset-bars-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mindset-bar-row {
  display: grid;
  grid-template-columns: minmax(70px, max-content) 1fr auto;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  min-width: 0;
}

.mindset-bar-fill--lvl-1 { background: #ff3b30 !important; }
.mindset-bar-fill--lvl-2 { background: #ff9500 !important; }
.mindset-bar-fill--lvl-3 { background: #ffd60a !important; }
.mindset-bar-fill--lvl-4 { background: #30b0c7 !important; }
.mindset-bar-fill--lvl-5 { background: #34c759 !important; }

.mindset-bar-label {
  color: var(--text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.725rem;
}

.mindset-bar-track {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
  min-width: 24px;
  width: 100%;
}

.mindset-bar-fill {
  height: 100%;
  border-radius: 3px;
}

.mindset-bar-fill--conf { background: #ff9500; }
.mindset-bar-fill--goal { background: #6366f1; }
.mindset-bar-fill--seat { background: #007aff; }

.mindset-bar-val {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-align: right;
  white-space: nowrap;
}
</style>
