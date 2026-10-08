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
          <button 
            v-if="unsubmittedStudents.length > 0"
            type="button" 
            class="mindset-unsubmitted-pill"
            :class="{ 'mindset-unsubmitted-pill--active': isUnsubmittedExpanded }"
            @click="isUnsubmittedExpanded = !isUnsubmittedExpanded"
            title="Click to toggle students awaiting survey"
          >
            <UserX :size="11" />
            {{ unsubmittedStudents.length }} awaiting
            <ChevronUp v-if="isUnsubmittedExpanded" :size="10" />
            <ChevronDown v-else :size="10" />
          </button>
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
            
            <!-- Tooltip Popover (Compact Dashboard Size & Zero Bleed) -->
            <div 
              class="mindset-tooltip"
              :class="{
                'mindset-tooltip--anchor-right': s.xPercent > 50,
                'mindset-tooltip--anchor-left': s.xPercent <= 50,
                'mindset-tooltip--anchor-top': s.yPercent > 50,
                'mindset-tooltip--anchor-bottom': s.yPercent <= 50,
                'mindset-tooltip--cluster': s.clusterMembers && s.clusterMembers.length > 1
              }"
            >
              <!-- Single Student Tooltip -->
              <template v-if="!s.clusterMembers || s.clusterMembers.length <= 1">
                <div class="mindset-tt-header">
                  <span class="mindset-tt-name">{{ s.fullName }}</span>
                  <span v-if="s.currentGrade !== null" class="mindset-tt-badge">
                    {{ isSbar && s.sbarBadge ? `${s.sbarBadge.level} (${s.currentGrade}%)` : `${s.currentGrade}%` }}
                  </span>
                </div>
                <div class="mindset-tt-meta">
                  Goal: <strong>{{ s.targetGradeLabel || 'None' }}</strong> · Conf: <strong>{{ s.confidence ? `${s.confidence}/5` : 'N/A' }}</strong>
                  <span 
                    v-if="s.goalDelta !== null" 
                    class="mindset-delta-badge"
                    :class="s.goalDelta >= 0 ? 'mindset-delta-badge--pos' : 'mindset-delta-badge--neg'"
                  >
                    {{ s.goalDelta >= 0 ? `+${s.goalDelta}%` : `${s.goalDelta}%` }}
                  </span>
                </div>
                <div v-if="s.seating" class="mindset-tt-sub">
                  Seating: {{ s.seating }}
                </div>
              </template>

              <!-- Clustered Multi-Student Tooltip -->
              <template v-else>
                <div class="mindset-tt-cluster-title">
                  Cluster ({{ s.clusterMembers.length }} Students)
                </div>
                <div class="mindset-tt-cluster-items">
                  <div 
                    v-for="m in s.clusterMembers" 
                    :key="m.studentId" 
                    class="mindset-tt-cluster-row"
                    @click.stop="$emit('select-student', m.studentId)"
                  >
                    <div class="mindset-cluster-row-top">
                      <span class="mindset-cluster-name">{{ m.fullName }}</span>
                      <span v-if="m.currentGrade !== null" class="mindset-cluster-grade">
                        {{ isSbar && m.sbarBadge ? m.sbarBadge.level : `${m.currentGrade}%` }}
                      </span>
                    </div>
                    <div class="mindset-cluster-row-sub">
                      Goal: {{ m.targetGradeLabel }} · Conf: {{ m.confidence ? `${m.confidence}/5` : 'N/A' }}
                    </div>
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
          <div class="mindset-ribbon-tile mindset-ribbon-tile--green" title="Achieving Ambitions (High Goal ≥75% · High Actual ≥75%)">
            <span class="mindset-ribbon-count">{{ achievingCount }}</span>
            <span class="mindset-ribbon-label">Achieving Ambitions</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--red" title="The Aspiration Gap (High Goal ≥75% · Actual Lagging <75%)">
            <span class="mindset-ribbon-count">{{ aspirationGapCount }}</span>
            <span class="mindset-ribbon-label">Aspiration Gap</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--teal" title="Surprise High Achievers (Modest Goal <75% · High Actual ≥75%)">
            <span class="mindset-ribbon-count">{{ surpriseAchieversCount }}</span>
            <span class="mindset-ribbon-label">Surprise Achievers</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--amber" title="Low-Expectation Trap (Modest Goal <75% · Low Actual <75%)">
            <span class="mindset-ribbon-count">{{ lowTrapCount }}</span>
            <span class="mindset-ribbon-label">Low Expectation</span>
          </div>
        </template>

        <template v-else>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--green" title="Primed Thrivers (High Target Goal · High Confidence)">
            <span class="mindset-ribbon-count">{{ primedThriversCount }}</span>
            <span class="mindset-ribbon-label">Primed Thrivers</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--amber" title="Anxious Strivers (High Target Goal · Low Confidence)">
            <span class="mindset-ribbon-count">{{ anxiousStriversCount }}</span>
            <span class="mindset-ribbon-label">Anxious Strivers</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--purple" title="Coasters / Untapped (Low Target Goal · High Confidence)">
            <span class="mindset-ribbon-count">{{ coastersCount }}</span>
            <span class="mindset-ribbon-label">Coasters / Untapped</span>
          </div>
          <div class="mindset-ribbon-tile mindset-ribbon-tile--red" title="Support Needed (Low Target Goal · Low Confidence)">
            <span class="mindset-ribbon-count">{{ supportNeededCount }}</span>
            <span class="mindset-ribbon-label">Support Needed</span>
          </div>
        </template>

        <!-- Awaiting Survey Ribbon Tile (if any) -->
        <div 
          v-if="unsubmittedStudents.length > 0"
          class="mindset-ribbon-tile mindset-ribbon-tile--unsubmitted"
          :class="{ 'mindset-ribbon-tile--active': isUnsubmittedExpanded }"
          role="button"
          tabindex="0"
          @click="isUnsubmittedExpanded = !isUnsubmittedExpanded"
          title="Click to toggle students awaiting survey"
        >
          <span class="mindset-ribbon-count">{{ unsubmittedStudents.length }}</span>
          <span class="mindset-ribbon-label">
            Awaiting Survey
            <ChevronUp v-if="isUnsubmittedExpanded" :size="10" class="mindset-ribbon-chevron" />
            <ChevronDown v-else :size="10" class="mindset-ribbon-chevron" />
          </span>
        </div>
      </div>

      <!-- Collapsible Unsubmitted Students Drawer (Scatter View) -->
      <div 
        v-if="viewMode === 'scatter' && isUnsubmittedExpanded && unsubmittedStudents.length > 0" 
        class="mindset-unsubmitted-panel"
      >
        <div class="mindset-unsubmitted-panel__header">
          <div class="mindset-unsubmitted-panel__title-group">
            <span class="mindset-unsubmitted-panel__title">
              <UserX :size="14" />
              Awaiting Survey Responses ({{ unsubmittedStudents.length }})
            </span>
            <span class="mindset-unsubmitted-panel__sub">
              Enrolled students without recorded survey data. Click a student to open dossier, or copy emails to send a reminder.
            </span>
          </div>
          <div class="mindset-unsubmitted-panel__actions">
            <button 
              v-if="unsubmittedEmails.length > 0"
              type="button" 
              class="mindset-action-btn"
              @click="copyEmails"
              title="Copy student email addresses separated by semicolons"
            >
              <Check v-if="hasCopiedEmails" :size="12" />
              <Mail v-else :size="12" />
              {{ hasCopiedEmails ? 'Emails Copied!' : 'Copy Emails' }}
            </button>
            <button 
              type="button" 
              class="mindset-action-btn mindset-action-btn--primary"
              @click="showSurveyModal = true"
            >
              <UploadCloud :size="12" /> Import Survey
            </button>
          </div>
        </div>

        <div class="mindset-unsubmitted-chips">
          <div 
            v-for="st in unsubmittedStudents" 
            :key="st.studentId" 
            class="mindset-unsubmitted-chip"
            @click="$emit('select-student', st.studentId)"
            :title="st.email ? `${st.fullName} (${st.email}) — Click to view dossier` : `${st.fullName} — Click to view dossier`"
          >
            <span class="mindset-chip-avatar">{{ st.initials }}</span>
            <span class="mindset-chip-name">{{ st.displayFirstLast }}</span>
            <a 
              v-if="st.email" 
              :href="`mailto:${st.email}`" 
              class="mindset-chip-mail"
              @click.stop
              :title="`Send email to ${st.displayFirstLast}`"
            >
              <Mail :size="11" />
            </a>
          </div>
        </div>
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

        <!-- Dedicated Card: Awaiting Survey Responses (Breakdown View) -->
        <div v-if="unsubmittedStudents.length > 0" class="mindset-unsubmitted-card">
          <div class="mindset-unsubmitted-card__header">
            <div class="mindset-unsubmitted-card__title-group">
              <span class="mindset-unsubmitted-card__title">
                <UserX :size="15" />
                Awaiting Survey Submission
              </span>
              <span class="mindset-unsubmitted-card__sub">
                {{ unsubmittedStudents.length }} student{{ unsubmittedStudents.length === 1 ? '' : 's' }} enrolled without intake survey data — reach out to gather confidence, goals, and seating needs. Click any student to open dossier.
              </span>
            </div>
            <div class="mindset-unsubmitted-card__actions">
              <button 
                v-if="unsubmittedEmails.length > 0"
                type="button" 
                class="mindset-action-btn"
                @click="copyEmails"
                title="Copy student email addresses separated by semicolons"
              >
                <Check v-if="hasCopiedEmails" :size="12" />
                <Mail v-else :size="12" />
                {{ hasCopiedEmails ? 'Emails Copied!' : 'Copy Emails' }}
              </button>
              <button 
                type="button" 
                class="mindset-action-btn mindset-action-btn--primary"
                @click="showSurveyModal = true"
              >
                <UploadCloud :size="12" /> Import Survey
              </button>
              <span class="mindset-quad-card__badge mindset-quad-card__badge--unsubmitted">
                {{ unsubmittedStudents.length }}
              </span>
            </div>
          </div>

          <div class="mindset-unsubmitted-chips">
            <div 
              v-for="st in unsubmittedStudents" 
              :key="st.studentId" 
              class="mindset-unsubmitted-chip"
              @click="$emit('select-student', st.studentId)"
              :title="st.email ? `${st.fullName} (${st.email}) — Click to view dossier` : `${st.fullName} — Click to view dossier`"
            >
              <span class="mindset-chip-avatar">{{ st.initials }}</span>
              <span class="mindset-chip-name">{{ st.displayFirstLast }}</span>
              <span v-if="st.email" class="mindset-chip-email">{{ st.email }}</span>
              <a 
                v-if="st.email" 
                :href="`mailto:${st.email}`" 
                class="mindset-chip-mail"
                @click.stop
                :title="`Send email to ${st.displayFirstLast}`"
              >
                <Mail :size="11" />
              </a>
            </div>
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
      :class-id="classId"
      :roster-students="sidebarStudents"
      @close="showSurveyModal = false" 
      @imported="onSurveyImported"
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
  Armchair,
  UserX,
  ChevronDown,
  ChevronUp,
  Mail,
  Check
} from 'lucide-vue-next'
import { getSBARLevelBadge } from '../../utils/gradeCalcSBAR.js'
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
  isSbar: { type: Boolean, default: false },
  classId: { type: String, default: '' }
})

const emit = defineEmits(['select-student', 'survey-imported'])

const viewMode = ref('scatter') // 'scatter' or 'breakdown'
const lensMode = ref('actualVsGoal') // 'actualVsGoal' (Progress vs Goal) or 'day1Mindset' (Day 1 Mindset)
const showSurveyModal = ref(false)
const isUnsubmittedExpanded = ref(false)
const hasCopiedEmails = ref(false)

function onSurveyImported(payload) {
  emit('survey-imported', payload)
}

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
      return Boolean(
        survey.courseConfidence ||
        survey.targetGrade ||
        survey.completedAt ||
        survey.seatingPreference ||
        survey.extracurricularsHobbies ||
        survey.confidentialNote
      )
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

// Students who have not yet submitted a survey
const unsubmittedStudents = computed(() => {
  const students = props.sidebarStudents || []
  if (students.length === 0) return []

  const submittedIds = new Set(rawStudentsList.value.map(s => String(s.studentId)))
  return students
    .filter(s => !submittedIds.has(String(s.studentId)))
    .map(s => {
      const sId = String(s.studentId)
      const firstName = s.preferredName || s.firstName || ''
      const lastName = s.lastName || ''
      const fullName = (lastName && firstName)
        ? `${lastName}, ${firstName}`
        : (s.name || 'Student')
      const displayFirstLast = firstName
        ? `${firstName} ${lastName}`.trim()
        : (s.name || 'Student')
      const initials = getInitials(s.name, s.preferredName || s.firstName, s.lastName)
      const email = (s.studentEmail || s.email || '').trim()

      return {
        studentId: sId,
        fullName,
        displayFirstLast,
        initials,
        email
      }
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
})

const unansweredCount = computed(() => unsubmittedStudents.value.length)

const unsubmittedEmails = computed(() => {
  return unsubmittedStudents.value
    .map(s => s.email)
    .filter(Boolean)
})

async function copyEmails() {
  if (unsubmittedEmails.value.length === 0) return
  const text = unsubmittedEmails.value.join('; ')
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    hasCopiedEmails.value = true
    setTimeout(() => {
      hasCopiedEmails.value = false
    }, 2500)
  } catch (e) {
    console.error('Failed to copy emails:', e)
  }
}

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
  height: clamp(330px, 46vh, 420px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

/* Quadrants Background Labels */
.mindset-quadrant {
  position: absolute;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 1px;
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

.mindset-quad-label--green  { color: var(--color-success, #10b981); }
.mindset-quad-label--teal   { color: var(--color-teal, #0d9488); }
.mindset-quad-label--amber  { color: var(--color-warn, #f59e0b); }
.mindset-quad-label--purple { color: var(--color-purple, #8b5cf6); }
.mindset-quad-label--red    { color: var(--color-danger, #ef4444); }

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
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, 50%);
  cursor: pointer;
  z-index: 10;
  transition: left 0.45s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease, box-shadow 0.15s ease, z-index 0.1s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.mindset-dot:hover {
  transform: translate(-50%, 50%) scale(1.35);
  z-index: 99999 !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

.mindset-dot-label {
  font-size: 0.65rem;
  font-weight: 800;
  pointer-events: none;
  white-space: nowrap;
}

/* Dot Colors for Lens 2 (Day 1 Mindset Archetypes) - Harmonized with Risk & OOC */
.mindset-dot--green  { background: var(--color-success-bg); border: 2px solid var(--color-success); color: var(--color-success-text); }
.mindset-dot--amber  { background: var(--color-warn-bg);    border: 2px solid var(--color-warn);    color: var(--color-warn-text); }
.mindset-dot--purple { background: var(--color-purple-bg);  border: 2px solid var(--color-purple);  color: var(--color-purple-text); }
.mindset-dot--red    { background: var(--color-danger-bg);  border: 2px solid var(--color-danger);  color: var(--color-danger-text); }

/* Dot Colors for Lens 1 (Confidence Overlays) - Harmonized with Risk & OOC */
.mindset-dot--conf-5 { background: var(--color-success-bg); border: 2px solid var(--color-success); color: var(--color-success-text); } /* 5: High (Green) */
.mindset-dot--conf-4 { background: var(--color-teal-bg);    border: 2px solid var(--color-teal);    color: var(--color-teal-text); }    /* 4: Confident (Teal) */
.mindset-dot--conf-3 { background: var(--color-warn-bg);    border: 2px solid var(--color-warn);    color: var(--color-warn-text); }    /* 3: Neutral (Yellow/Amber) */
.mindset-dot--conf-2 { background: var(--color-orange-bg);  border: 2px solid var(--color-orange);  color: var(--color-orange-text); }  /* 2: Unsure (Orange) */
.mindset-dot--conf-1 { background: var(--color-danger-bg);  border: 2px solid var(--color-danger);  color: var(--color-danger-text); }  /* 1: Anxious (Red) */

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
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.mindset-conf-dot--5 { background: var(--color-success-bg); border: 1.5px solid var(--color-success); }
.mindset-conf-dot--4 { background: var(--color-teal-bg);    border: 1.5px solid var(--color-teal); }
.mindset-conf-dot--3 { background: var(--color-warn-bg);    border: 1.5px solid var(--color-warn); }
.mindset-conf-dot--2 { background: var(--color-orange-bg);  border: 1.5px solid var(--color-orange); }
.mindset-conf-dot--1 { background: var(--color-danger-bg);  border: 1.5px solid var(--color-danger); }

/* Tooltip Popover (Compact Dashboard Size & Zero Bleed) */
.mindset-tooltip {
  display: none;
  position: absolute;
  background: var(--tooltip-bg, #0f172a);
  color: var(--tooltip-text, #f8fafc);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 0.65rem;
  line-height: 1.25;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  z-index: 20000;
  width: max-content;
  max-width: 215px;
  white-space: normal;
  pointer-events: auto;
}

.mindset-dot:hover .mindset-tooltip {
  display: flex;
  flex-direction: column;
  gap: 2.5px;
}

/* 4-Way Boundary Clamping */
.mindset-tooltip--anchor-right  { right: 0; left: auto; transform: none; }
.mindset-tooltip--anchor-left   { left: 0; right: auto; transform: none; }
.mindset-tooltip--anchor-top    { top: calc(100% + 5px); bottom: auto; }
.mindset-tooltip--anchor-bottom { bottom: calc(100% + 5px); top: auto; }

/* Single Student Tooltip Header */
.mindset-tt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mindset-tt-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mindset-tt-badge {
  font-size: 0.64rem;
  font-weight: 800;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.18);
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
}

.mindset-tt-meta {
  font-size: 0.62rem;
  color: #cbd5e1;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 3px;
}

.mindset-tt-meta strong {
  color: #fff;
}

.mindset-tt-sub {
  font-size: 0.58rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mindset-delta-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.5px 3.5px;
  border-radius: 3px;
  margin-left: 2px;
}

.mindset-delta-badge--pos { background: rgba(52, 199, 89, 0.2); color: #4ade80; }
.mindset-delta-badge--neg { background: rgba(255, 59, 48, 0.2); color: #f87171; }

/* Cluster Popover Tooltip */
.mindset-tooltip--cluster {
  min-width: 175px;
  max-width: 215px;
  padding: 5px 6px;
}

.mindset-tt-cluster-title {
  font-weight: 800;
  font-size: 0.65rem;
  color: #38bdf8;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding-bottom: 3px;
  margin-bottom: 2px;
}

.mindset-tt-cluster-items {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 140px;
  overflow-y: auto;
}

.mindset-tt-cluster-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.12s ease;
}

.mindset-tt-cluster-row:hover {
  background: rgba(255, 255, 255, 0.12);
}

.mindset-cluster-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.mindset-cluster-name {
  font-size: 0.66rem;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mindset-cluster-grade {
  font-size: 0.62rem;
  font-weight: 800;
  color: #38bdf8;
}

.mindset-cluster-row-sub {
  font-size: 0.58rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Bottom Ribbon */
/* Bottom Ribbon (Matching Risk Matrix) */
.mindset-summary-ribbon {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.mindset-ribbon-tile {
  flex: 1 1 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 6px;
  display: flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
  min-width: 0;
}

.mindset-ribbon-tile:hover {
  transform: translateY(-1px);
  border-color: var(--primary);
}

.mindset-ribbon-count {
  font-size: 0.95rem;
  font-weight: 800;
  flex-shrink: 0;
  line-height: 1;
}

.mindset-ribbon-label {
  font-size: 0.67rem;
  font-weight: 600;
  color: var(--text-secondary);
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
}

.mindset-ribbon-chevron {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.mindset-ribbon-tile--green  .mindset-ribbon-count { color: var(--color-success, #10b981); }
.mindset-ribbon-tile--teal   .mindset-ribbon-count { color: var(--color-teal, #0d9488); }
.mindset-ribbon-tile--amber  .mindset-ribbon-count { color: var(--color-warn, #f59e0b); }
.mindset-ribbon-tile--purple .mindset-ribbon-count { color: var(--color-purple, #8b5cf6); }
.mindset-ribbon-tile--red    .mindset-ribbon-count { color: var(--color-danger, #ef4444); }
.mindset-ribbon-tile--unsubmitted .mindset-ribbon-count { color: #f97316; }

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

.mindset-quad-card--green  { border-top: 3px solid var(--color-success, #10b981); }
.mindset-quad-card--teal   { border-top: 3px solid var(--color-teal, #0d9488); }
.mindset-quad-card--amber  { border-top: 3px solid var(--color-warn, #f59e0b); }
.mindset-quad-card--purple { border-top: 3px solid var(--color-purple, #8b5cf6); }
.mindset-quad-card--red    { border-top: 3px solid var(--color-danger, #ef4444); }

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
.mindset-tag--conf-1 { background: var(--color-danger-bg);  color: var(--color-danger-text); }
.mindset-tag--conf-2 { background: var(--color-orange-bg);  color: var(--color-orange-text); }
.mindset-tag--conf-3 { background: var(--color-warn-bg);    color: var(--color-warn-text); }
.mindset-tag--conf-4 { background: var(--color-teal-bg);    color: var(--color-teal-text); }
.mindset-tag--conf-5 { background: var(--color-success-bg); color: var(--color-success-text); }

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

.mindset-bar-fill--lvl-1 { background: var(--color-danger, #ef4444) !important; }
.mindset-bar-fill--lvl-2 { background: var(--color-orange, #ea580c) !important; }
.mindset-bar-fill--lvl-3 { background: var(--color-warn, #f59e0b) !important; }
.mindset-bar-fill--lvl-4 { background: var(--color-teal, #0d9488) !important; }
.mindset-bar-fill--lvl-5 { background: var(--color-success, #10b981) !important; }

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

/* ── Unsubmitted Survey Styles ── */
.mindset-unsubmitted-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(255, 149, 0, 0.12);
  color: #ff9500;
  border: 1px solid rgba(255, 149, 0, 0.3);
  cursor: pointer;
  transition: all 0.15s ease;
  vertical-align: middle;
}

.mindset-unsubmitted-pill:hover,
.mindset-unsubmitted-pill--active {
  background: rgba(255, 149, 0, 0.22);
  border-color: #ff9500;
}

.mindset-ribbon-tile--unsubmitted {
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 3px solid #ff9500;
  user-select: none;
}

.mindset-ribbon-tile--unsubmitted:hover {
  background: var(--surface-hover, rgba(255, 255, 255, 0.04));
  border-color: #ff9500;
}

.mindset-ribbon-tile--unsubmitted.mindset-ribbon-tile--active {
  background: rgba(255, 149, 0, 0.08);
  border-color: #ff9500;
}

.mindset-ribbon-tile--unsubmitted .mindset-ribbon-count {
  color: #ff9500;
}

.mindset-ribbon-chevron {
  display: inline-block;
  margin-left: 3px;
  vertical-align: middle;
}

.mindset-unsubmitted-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid #ff9500;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: mindsetPanelSlide 0.2s ease;
}

@keyframes mindsetPanelSlide {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mindset-unsubmitted-panel__header,
.mindset-unsubmitted-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.mindset-unsubmitted-panel__title-group,
.mindset-unsubmitted-card__title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mindset-unsubmitted-panel__title,
.mindset-unsubmitted-card__title {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mindset-unsubmitted-panel__sub,
.mindset-unsubmitted-card__sub {
  font-size: 0.725rem;
  color: var(--text-secondary);
}

.mindset-unsubmitted-panel__actions,
.mindset-unsubmitted-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mindset-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  font-size: 0.74rem;
  font-weight: 600;
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mindset-action-btn:hover {
  border-color: var(--text-secondary);
  background: var(--surface-hover, rgba(255, 255, 255, 0.06));
}

.mindset-action-btn--primary {
  background: rgba(0, 113, 227, 0.12);
  color: #0071e3;
  border-color: rgba(0, 113, 227, 0.3);
}

.mindset-action-btn--primary:hover {
  background: rgba(0, 113, 227, 0.2);
  border-color: #0071e3;
}

.mindset-unsubmitted-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 3px solid #ff9500;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.mindset-quad-card__badge--unsubmitted {
  color: #ff9500;
  border-color: rgba(255, 149, 0, 0.35);
  background: rgba(255, 149, 0, 0.1);
}

.mindset-unsubmitted-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mindset-unsubmitted-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 9px 3px 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.78rem;
  color: var(--text);
  user-select: none;
}

.mindset-unsubmitted-chip:hover {
  border-color: #ff9500;
  background: var(--surface-hover, rgba(255, 255, 255, 0.08));
  transform: translateY(-1px);
}

.mindset-chip-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 149, 0, 0.15);
  color: #ff9500;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -0.02em;
}

.mindset-chip-name {
  font-weight: 500;
  color: var(--text);
}

.mindset-chip-email {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-left: 2px;
}

.mindset-chip-mail {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: var(--text-secondary);
  margin-left: 2px;
  transition: color 0.15s, background 0.15s;
}

.mindset-chip-mail:hover {
  color: #0071e3;
  background: rgba(0, 113, 227, 0.1);
}

@media (max-height: 760px) {
  .mindset-canvas { height: clamp(315px, 45vh, 345px); }
  .mindset-summary-ribbon { gap: 5px; }
  .mindset-ribbon-tile { padding: 3px 5px; gap: 4px; }
  .mindset-ribbon-count { font-size: 0.88rem; }
  .mindset-ribbon-label { font-size: 0.64rem; line-height: 1.1; }
}
</style>
