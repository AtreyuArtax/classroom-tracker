<template>
  <div v-if="!activeClass" class="setup__panel-content setup__empty">
    <Zap :size="48" style="opacity: 0.2; margin-bottom: 1rem;" />
    <p>Select a class in the header or manager to configure it.</p>
  </div>
  <div v-else class="setup__layout">
    <SetupQuickJumpNav activeTab="active" />
    <div class="setup__main-content">
      <!-- Class Metadata -->
    <div class="setup__card">
      <h2 class="setup__card-title">General Info</h2>
      <form class="setup__form">
        <div class="setup__form-grid">
          <label class="setup__label">
            Class Name
            <input
              type="text"
              v-model="localClassName"
              class="setup__input"
              @blur="saveClassName"
              @keydown.enter="saveClassName"
            />
          </label>

          <label v-if="activeClass.classType === 'elementary'" class="setup__label">
            Grade Level
            <select
              :value="activeClass.gradeLevel || detectedGradeLevel"
              class="setup__input"
              @change="e => updateActiveClass({ gradeLevel: e.target.value })"
            >
              <optgroup label="Single Grade">
                <option value="Kindergarten">Kindergarten</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
              </optgroup>
              <optgroup label="Split / Multi-Grade">
                <option value="Grade 1/2">Grade 1/2 Split</option>
                <option value="Grade 2/3">Grade 2/3 Split</option>
                <option value="Grade 3/4">Grade 3/4 Split</option>
                <option value="Grade 4/5">Grade 4/5 Split</option>
                <option value="Grade 5/6">Grade 5/6 Split</option>
                <option value="Grade 6/7">Grade 6/7 Split</option>
                <option value="Grade 7/8">Grade 7/8 Split</option>
                <option v-if="detectedGradeLevel && !['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 1/2','Grade 2/3','Grade 3/4','Grade 4/5','Grade 5/6','Grade 6/7','Grade 7/8'].includes(detectedGradeLevel)" :value="detectedGradeLevel">{{ detectedGradeLevel }} (Roster Detected)</option>
              </optgroup>
            </select>
          </label>

          <label v-if="activeClass.classType !== 'elementary'" class="setup__label">
            Course Code
            <input
              type="text"
              v-model="localCourseCode"
              class="setup__input"
              placeholder="Optional"
              @blur="saveCourseCode"
              @keydown.enter="saveCourseCode"
            />
          </label>
          <label class="setup__label">
            {{ activeClass.classType === 'elementary' ? 'School Year' : 'School Year and Semester' }}
            <select
              v-if="activeClass.classType === 'elementary'"
              :value="activeClass.year"
              class="setup__input"
              @change="e => updateActiveClass({ year: e.target.value })"
            >
              <option v-for="y in yearOptions" :key="y" :value="y">
                {{ y }}
              </option>
            </select>
            <select
              v-else
              :value="activeClass.year + '|' + activeClass.semester"
              class="setup__input"
              @change="e => {
                const [y, s] = e.target.value.split('|');
                updateActiveClass({ year: y, semester: s });
              }"
            >
              <option v-for="t in termOptions" :key="t.year + t.semester" :value="t.year + '|' + t.semester">
                {{ t.year }} Sem {{ t.semester }}
              </option>
            </select>
          </label>

          <label v-if="activeClass.classType !== 'elementary'" class="setup__label">
            Period
            <select
              :value="activeClass.periodNumber"
              class="setup__input"
              @change="e => {
                const p = parseInt(e.target.value);
                const time = periodStartTimes[p] || activeClass.periodStartTime;
                updateActiveClass({ periodNumber: p, periodStartTime: time });
              }"
            >
              <option v-for="opt in periodOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </label>
          <label v-if="activeClass.classType !== 'elementary'" class="setup__label">
            Start Time
            <input
              type="time"
              :value="activeClass.periodStartTime || '08:00'"
              class="setup__input"
              @change="e => updateActiveClass({ periodStartTime: e.target.value })"
            />
          </label>
        </div>

        <!-- Sub-Cohort / Section Tag Editor (Secondary Mode Only) -->
        <div v-if="activeClass.classType !== 'elementary' && availableClassSections.length > 0" class="setup__section-editor-container" style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--border);">
          <label class="setup__label" style="margin-bottom: 6px;">
            Section / Sub-Cohort Badges
            <span class="setup__hint" style="display: block; font-weight: 400; margin-top: 2px;">
              Rename section tags (e.g. change "SNC2D1" to "2D") to shorten badges across all gradebook views.
            </span>
          </label>
          <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
            <div v-for="sec in availableClassSections" :key="sec" style="display: flex; align-items: center; gap: 6px;">
              <span class="sbar-student-grade-tag">{{ sec }}</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">→</span>
              <input 
                type="text"
                v-model="sectionTagInputs[sec]"
                class="setup__input"
                style="width: 90px; padding: 2px 6px; font-size: 0.78rem; font-weight: 600;"
                placeholder="New tag"
                @blur="saveSectionTagRename(sec)"
                @keydown.enter.prevent="saveSectionTagRename(sec)"
              />
            </div>
          </div>
        </div>
      </form>
    </div>

    <!-- Elementary Subjects Manager (Only shown when Elementary Mode is active) -->
    <ElementarySubjectManager v-if="activeClass.classType === 'elementary'" style="margin-top: 1rem;" />


    <!-- Grading Framework & Assessment Model (Secondary only) -->
    <div v-if="activeClass.classType !== 'elementary'" class="setup__card">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <h2 class="setup__card-title" style="margin: 0; display: flex; align-items: center; gap: 8px;">
          <span>Grading System &amp; Framework</span>
          <button 
            type="button" 
            class="setup__info-trigger-btn" 
            @click="isGradingInfoModalOpen = true" 
            title="Learn how grading systems and SBAR engines work"
          >
            <Info :size="15" />
          </button>
        </h2>
      </div>
      <p class="setup__hint">Choose how student performance is evaluated and displayed for this class.</p>
      
      <div class="setup__form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
        <label class="setup__label">
          Grading Framework
          <select
            :value="activeClass.gradingFramework || 'traditional'"
            class="setup__input"
            @change="e => updateActiveClass({ gradingFramework: e.target.value })"
          >
            <option value="traditional">Traditional Secondary (% / Points / Weighted Categories)</option>
            <option value="sbar">Standards-Based (SBAR / Levels 1–4 Heatmap)</option>
          </select>
        </label>

        <label v-if="activeClass.gradingFramework === 'sbar'" class="setup__label">
          SBAR Mastery Engine
          <select
            :value="activeClass.sbarAlgorithm || 'decaying_average'"
            class="setup__input"
            @change="e => updateActiveClass({ sbarAlgorithm: e.target.value })"
          >
            <option value="decaying_average">Decaying Average (65% Newest / 35% Historical)</option>
            <option value="power_law">Power Law (Marzano Logarithmic Trajectory)</option>
            <option value="mode">Mode / Most Consistent (Most Frequent Level)</option>
            <option value="most_recent">Most Recent (Last 3 Evaluations Average)</option>
            <option value="highest">Highest Level Score</option>
          </select>
        </label>

        <label v-if="activeClass.gradingFramework === 'sbar'" class="setup__label">
          Default SBAR Input Mode
          <select
            :value="activeClass.sbarInputMode || 'fine'"
            class="setup__input"
            @change="e => updateActiveClass({ sbarInputMode: e.target.value })"
          >
            <option value="fine">Granular Levels (L1- to L4+)</option>
            <option value="simple">Simple Levels (L1 to L4)</option>
            <option value="numeric">Exact % / Math Precision Mode</option>
          </select>
        </label>

        <label v-if="activeClass.gradingFramework === 'sbar'" class="setup__label">
          Include Radial Desk Check-ins in Overall SBAR Grades
          <select
            :value="activeClass.includeRadialInSbar !== false ? 'true' : 'false'"
            class="setup__input"
            @change="e => updateActiveClass({ includeRadialInSbar: e.target.value === 'true' })"
          >
            <option value="true">Yes — Include Radial Check-ins in Overall SBAR Level</option>
            <option value="false">No — Formal Assessment Grades Only</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Seating Plan -->
    <div class="setup__card">
      <h2 class="setup__card-title">Seating Plan</h2>
      <p class="setup__hint">Adjust rows and columns for this specific classroom layout.</p>
      <form class="setup__form" @submit.prevent="requestResize">
        <div class="setup__form-grid">
          <label class="setup__label">
            Rows
            <input v-model.number="newGrid.rows" type="number" min="1" max="10" class="setup__input" required />
          </label>
          <label class="setup__label">
            Columns
            <input v-model.number="newGrid.cols" type="number" min="1" max="10" class="setup__input" required />
          </label>
        </div>
        <div class="setup__grid-actions" style="margin-top: 1rem; display: flex; gap: 8px;">
          <button type="submit" class="setup__btn-primary">Apply Grid Size</button>
          <button type="button" class="setup__btn-ghost" @click="setGlobalDefaultGrid">Save as Global Default</button>
        </div>
      </form>
      <!-- Resize conflict dialog -->
      <div v-if="resizeConflict.length > 0" class="setup__dialog" role="dialog" aria-modal="true">
        <div class="setup__dialog-box">
          <h3 class="setup__dialog-title">⚠️ Students will be moved</h3>
          <p class="setup__dialog-body">The following students fall outside the new grid and will be moved to the pool:</p>
          <ul class="setup__dialog-list">
            <li v-for="s in resizeConflict" :key="s.studentId">{{ s.firstName }} {{ s.lastName }} ({{ s.seat.row }},{{ s.seat.col }})</li>
          </ul>
          <div class="setup__dialog-actions">
            <button class="setup__btn-danger" @click="applyResize">Move to pool & resize</button>
            <button class="setup__btn-ghost" @click="resizeConflict = []">Cancel</button>
          </div>
        </div>
        <div class="setup__dialog-backdrop" @click="resizeConflict = []" />
      </div>
    </div>

    <!-- Roster -->
    <div class="setup__card">
      <div class="setup__card-header-row" style="display: flex; justify-content: space-between; align-items: center; wrap: wrap; gap: 12px;">
        <h2 class="setup__card-title">Roster — {{ sortedRoster.length }} Students</h2>
        <div class="setup__card-actions" style="display: flex; gap: 8px;">
          <button class="setup__btn-ghost" @click="isElementaryImporterOpen = true">
            <Upload :size="16" /> Import CSV
          </button>
          <button class="setup__btn-ghost" @click="openRapidRFID">
            <Zap :size="16" /> Rapid RFID
          </button>
          <button class="setup__btn-primary setup__btn-add-student" @click="openAddStudentModal">
            <PlusCircle :size="16" /> Add Student
          </button>
        </div>
      </div>


      <!-- Roster List -->
      <ul class="setup__roster-list" style="margin-top: 1rem;">
        <li v-for="s in sortedRoster" :key="s.studentId" class="setup__roster-item">
          <div class="setup__roster-info">
            <span class="setup__roster-name">{{ s.lastName }}, {{ s.firstName }}</span>
            <span class="setup__roster-id">{{ s.studentId }}</span>
            <span v-if="activeClass?.classType === 'elementary' && s.gradeLevel && availableSubCohorts.length > 1" class="setup__chip" style="margin-left: 8px;">
              {{ s.gradeLevel }}
            </span>
            <span v-if="s.courseCode && availableSubCohorts.length > 1" class="setup__chip setup__chip--blue" style="margin-left: 8px;">
              {{ s.courseCode }}
            </span>
          </div>
          <div class="setup__roster-actions">
            <button class="setup__icon-btn" @click="onEditStudent(s)" title="Edit"><Pencil :size="14" /></button>
            <button class="setup__icon-btn setup__icon-btn--warn" @click="onArchiveStudent(s)" title="Archive (Unenroll)"><UserMinus :size="14" /></button>
          </div>
        </li>
      </ul>

      <!-- Unenrolled Panel -->
      <div v-if="archivedRoster.length > 0" class="setup__archived-roster" style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
        <button class="setup__archived-toggle" @click="isArchivedPanelVisible = !isArchivedPanelVisible">
          <span class="setup__archived-label">
            <UserMinus :size="16" style="opacity: 0.6" /> Unenrolled ({{ archivedRoster.length }})
          </span>
          <span class="setup__archived-chevron"><component :is="isArchivedPanelVisible ? ChevronUp : ChevronDown" :size="16" /></span>
        </button>
        <ul v-if="isArchivedPanelVisible" class="setup__roster-list" style="margin-top: 0.5rem; opacity: 0.7;">
          <li v-for="s in archivedRoster" :key="s.studentId" class="setup__roster-item">
            <div class="setup__roster-info">
              <span class="setup__roster-name">{{ s.lastName }}, {{ s.firstName }}</span>
              <span class="setup__roster-id">{{ s.studentId }}</span>
            </div>
            <div class="setup__roster-actions">
              <button class="setup__icon-btn" @click="onUnarchiveStudent(s)" title="Re-enrol"><UserCheck :size="14" /></button>
              <button class="setup__icon-btn setup__icon-btn--danger" @click="onPermanentDeleteStudent(s)" title="Permanently delete all records in this class"><Trash2 :size="14" /></button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Section: Grading & Assessments (Secondary only) -->
    <template v-if="activeClass.classType !== 'elementary'">
      <div class="setup__section-header" style="margin-top: 1rem;">
        <GraduationCap :size="18" />
        <span>Grading &amp; Assessments</span>
      </div>

      <!-- Assessment Framework -->
      <AssessmentFrameworkSettings />
    </template>

    <!-- ── Student Entry Modal ─── -->
    <BaseModal
      :show="isStudentModalOpen"
      @close="cancelEditStudent"
      max-width="500px"
      :title="isEditingStudent ? 'Edit Student' : 'Add New Student'"
    >
      <div class="student-modal-content">
        <form class="setup__form" @submit.prevent="addSingleStudent">
          <label class="setup__label">
            Student ID
            <input 
              v-model="newStudent.studentId" 
              class="setup__input" 
              :placeholder="isEditingStudent ? '' : 'e.g. 123456789'" 
              :disabled="isEditingStudent"
              required 
            />
            <span v-if="isEditingStudent" class="setup__hint" style="margin-top: 4px;">Student ID cannot be changed.</span>
          </label>
          
          <div class="setup__form-grid">
            <label class="setup__label">
              First Name
              <input v-model="newStudent.firstName" class="setup__input" placeholder="First Name" required />
            </label>
            <label class="setup__label">
              Last Name
              <input v-model="newStudent.lastName" class="setup__input" placeholder="Last Name" required />
            </label>
            <label v-if="activeClass.classType === 'elementary'" class="setup__label">
              Student Grade Level
              <select v-model="newStudent.gradeLevel" class="setup__input">
                <option value="">Auto (Homeroom Grade)</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
              </select>
            </label>
            <label v-else class="setup__label">
              Course / Section Code
              <input v-model="newStudent.courseCode" class="setup__input" placeholder="e.g. SNC2D1" />
            </label>
          </div>

          <!-- RFID Tag Section -->
          <div class="setup__label" style="margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span>RFID Card Mapping</span>
              <button 
                v-if="newStudent.rfidTag" 
                type="button" 
                class="setup__btn-text setup__btn-text--danger" 
                @click="clearRFID"
              >
                Unlink Card
              </button>
            </div>
            
            <div class="setup__rfid-enroll-box" :class="{ 'setup__rfid-enroll-box--active': isEnrollingRFID }">
              <template v-if="!isEnrollingRFID">
                <div class="setup__rfid-display">
                  <Rss :size="16" />
                  <span v-if="newStudent.rfidTag" class="setup__rfid-hex">{{ newStudent.rfidTag }}</span>
                  <span v-else class="setup__rfid-empty">No card linked</span>
                </div>
                <button type="button" class="setup__pill-btn" @click="startEnrollment">
                  {{ newStudent.rfidTag ? 'Replace Card' : 'Scan to Link' }}
                </button>
              </template>
              <template v-else>
                <div class="setup__rfid-listening">
                  <span class="setup__rfid-pulse">Waiting for scan...</span>
                </div>
                <button type="button" class="setup__pill-btn" @click="stopEnrollment">Cancel</button>
              </template>
            </div>
          </div>

          <div v-if="singleAddError" class="setup__error" style="margin-top: 10px;">
            <AlertTriangle :size="14" /> {{ singleAddError }}
          </div>

          <div class="modal-footer" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="setup__btn-ghost" @click="cancelEditStudent">Cancel</button>
            <button type="submit" class="setup__btn-primary">
              {{ isEditingStudent ? 'Save Changes' : 'Add Student' }}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>

    <!-- ── Rapid RFID Enrollment Modal ─── -->
    <BaseModal
      :show="isRapidRFIDOpen"
      @close="stopRapidRFID"
      max-width="600px"
      title="Rapid RFID Linker"
    >
      <div class="rapid-rfid-linker">
        <div class="rapid-rfid-active" v-if="currentRapidStudent" style="text-align: center; margin-bottom: 20px; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border);">
          <div class="rapid-rfid-label" style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">Currently Linking</div>
          <div class="rapid-rfid-name" style="font-size: 1.4rem; font-weight: 700;">{{ currentRapidStudent.firstName }} {{ currentRapidStudent.lastName }}</div>
          <div class="rapid-rfid-id" style="font-family: monospace; color: var(--text-secondary);">{{ currentRapidStudent.studentId }}</div>
          
          <div class="rapid-rfid-status" style="margin-top: 12px; font-weight: 600;" :style="{ color: rapidRFIError ? 'var(--state-out)' : rapidRFIDSuccess ? 'var(--state-success)' : 'var(--primary)' }">
            <template v-if="rapidRFIError">
              <AlertTriangle :size="18" /> {{ rapidRFIError }}
            </template>
            <template v-else-if="rapidRFIDSuccess">
              <UserCheck :size="18" /> {{ rapidRFIDSuccess }}
            </template>
            <template v-else>
              <span class="setup__rfid-pulse">Ready for scan...</span>
            </template>
          </div>
        </div>

        <div class="rapid-rfid-list-container">
          <div class="rapid-rfid-list-header" style="font-weight: 700; margin-bottom: 8px;">Class Roster ({{ rapidRFIDList.length }})</div>
          <div class="rapid-rfid-list" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px;">
            <div 
              v-for="(s, idx) in rapidRFIDList" 
              :key="s.studentId" 
              class="rapid-rfid-item"
              :class="{ 'rapid-rfid-item--active': idx === rapidRFIDIndex, 'rapid-rfid-item--linked': s.rfidTag }"
              style="padding: 10px 14px; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); cursor: pointer;"
              :style="idx === rapidRFIDIndex ? 'background: rgba(99, 102, 241, 0.08); border-left: 3px solid var(--primary);' : ''"
              @click="rapidRFIDIndex = idx; rapidRFIError = ''; rapidRFIDSuccess = ''"
            >
              <div class="rapid-rfid-item-info">
                <span class="rapid-rfid-item-name" :style="s.rfidTag ? 'opacity: 0.6;' : 'font-weight: 600;'">{{ s.lastName }}, {{ s.firstName }}</span>
                <span v-if="s.rfidTag" class="rapid-rfid-tag-hex" style="font-family: monospace; font-size: 0.8rem; margin-left: 8px; color: var(--primary);">{{ s.rfidTag }}</span>
              </div>
              <div class="rapid-rfid-item-status">
                <UserCheck v-if="s.rfidTag" :size="14" style="color: var(--state-success);" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- ── Elementary / Roster CSV Importer Modal ─── -->
    <BaseModal
      :show="isElementaryImporterOpen"
      @close="isElementaryImporterOpen = false"
      max-width="700px"
      title="Import Roster from CSV"
    >
      <ElementaryCsvImporter @imported="handleElementaryImport" />
    </BaseModal>

    <!-- ── Grading System & SBAR Mastery Guide Modal ─── -->
    <BaseModal
      :show="isGradingInfoModalOpen"
      @close="isGradingInfoModalOpen = false"
      max-width="680px"
      title="Grading System & SBAR Mastery Guide"
      close-on-backdrop
    >
      <div class="grading-info-guide">
        <!-- Frameworks Comparison -->
        <div class="grading-info-section">
          <h4 class="grading-info-subtitle">
            <GraduationCap :size="18" style="color: var(--primary, #6366f1);" /> Framework Comparison
          </h4>
          <div class="grading-info-grid">
            <div class="grading-info-card">
              <div class="grading-info-card-header">
                <strong>Traditional Secondary</strong>
                <span class="setup__chip setup__chip--blue">% / Points</span>
              </div>
              <p>
                Uses percentage grades and weighted categories (e.g. Assessments 50%, Class Activities 20%, Culminating Tasks 30%). 
                Evaluations yield point totals that accumulate into a traditional percentage average.
              </p>
            </div>

            <div class="grading-info-card grading-info-card--sbar">
              <div class="grading-info-card-header">
                <strong>Standards-Based (SBAR)</strong>
                <span class="setup__chip setup__chip--purple">Levels 1–4 Heatmap</span>
              </div>
              <p>
                Evaluates student growth against specific curriculum expectations using Ontario Levels (L1- to L4+). 
                Replaces cumulative point averages with ongoing mastery trajectory algorithms.
              </p>
            </div>
          </div>
        </div>

        <!-- SBAR Mastery Engines -->
        <div class="grading-info-section" style="margin-top: 16px;">
          <h4 class="grading-info-subtitle">
            <Zap :size="18" style="color: #f59e0b;" /> SBAR Mastery Calculation Engines
          </h4>
          <p class="setup__hint" style="margin-bottom: 6px;">
            SBAR calculates an overall level for each expectation by weighting student evaluation history:
          </p>
          <div class="grading-info-engine-list">
            <div class="grading-info-engine-item">
              <div class="grading-info-engine-badge">Decaying Average</div>
              <div class="grading-info-engine-desc">
                <strong>65% Newest / 35% Historical</strong> (Default) — Prioritizes the most recent demonstration of learning while retaining evidence from earlier attempts.
              </div>
            </div>

            <div class="grading-info-engine-item">
              <div class="grading-info-engine-badge">Power Law</div>
              <div class="grading-info-engine-desc">
                <strong>Marzano Logarithmic Trajectory</strong> — Fits scores to a mathematical learning curve to project true current mastery. Rewards student growth over time without penalizing initial mistakes made while first acquiring a skill.
              </div>
            </div>

            <div class="grading-info-engine-item">
              <div class="grading-info-engine-badge">Mode / Consistency</div>
              <div class="grading-info-engine-desc">
                <strong>Most Frequent Level</strong> — Identifies the level most consistently achieved. Rewards steady, repeatable performance across evaluations.
              </div>
            </div>

            <div class="grading-info-engine-item">
              <div class="grading-info-engine-badge">Most Recent</div>
              <div class="grading-info-engine-desc">
                <strong>Average of Last 3 Evaluations</strong> — Focuses exclusively on current performance, ignoring early learning struggles.
              </div>
            </div>

            <div class="grading-info-engine-item">
              <div class="grading-info-engine-badge">Highest Level</div>
              <div class="grading-info-engine-desc">
                <strong>Peak Performance</strong> — Uses the single highest level achieved for each expectation. Best for summative portfolio or showcase grading.
              </div>
            </div>
          </div>

          <div class="grading-info-tip-banner" style="margin-top: 10px;">
            <Zap :size="15" style="color: #f59e0b; flex-shrink: 0; margin-top: 2px;" />
            <span>
              <strong>Flexible Recalculation:</strong> You can switch calculation engines at any time. Changing your engine instantly recalculates overall levels across heatmaps and reports without altering or deleting raw evaluation data.
            </span>
          </div>
        </div>

        <!-- Input Modes & Desk Check-ins -->
        <div class="grading-info-section" style="margin-top: 16px;">
          <h4 class="grading-info-subtitle">
            <Settings2 :size="18" style="color: #10b981;" /> Input Modes & Desk Check-ins
          </h4>
          <div class="grading-info-grid">
            <div class="grading-info-card">
              <strong style="color: var(--text);">Default SBAR Input Mode:</strong>
              <p style="margin-top: 4px;">
                Choose between <strong>Granular Levels</strong> (12-step scale from L1- to L4+), <strong>Simple Levels</strong> (4-step scale L1 to L4), or <strong>Exact % Mode</strong> for math precision.
              </p>
            </div>
            <div class="grading-info-card">
              <strong style="color: var(--text);">Radial Desk Check-ins:</strong>
              <p style="margin-top: 4px;">
                When enabled, quick formative check-ins recorded via seating plan radial menus are factored directly into overall SBAR expectation grades alongside formal assessments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>


    <!-- Cross-Class Conflicts Dialog -->
    <div v-if="crossClassConflicts.length > 0" class="setup__dialog" role="dialog" aria-modal="true">
      <div class="setup__dialog-box setup__dialog-box--large">
        <h3 class="setup__dialog-title">⚠️ Student Conflict Detected</h3>
        <p class="setup__dialog-body">The following students are currently registered in another class this semester. Moving them will unenroll them from their current class.</p>
        <ul class="setup__dialog-list">
          <li v-for="c in crossClassConflicts" :key="c.student.studentId">
            <strong>{{ c.student.firstName }} {{ c.student.lastName }}</strong> (ID: {{ c.student.studentId }}) is in <em>{{ c.existingClassName }}</em>
          </li>
        </ul>
        <div class="setup__dialog-actions">
          <button class="setup__btn-danger" @click="resolveConflicts('move')">Move students to this class</button>
          <button class="setup__btn-ghost" @click="resolveConflicts('skip')">Skip / Cancel Import</button>
        </div>
      </div>
      <div class="setup__dialog-backdrop" @click="resolveConflicts('skip')" />
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { availableSubCohorts } from '../../composables/useGradebook.js'
import { useKeyboardWedge } from '../../composables/useKeyboardWedge.js'
import { useMessage } from '../../composables/useMessage.js'
import * as classService from '../../db/classService.js'
import BaseModal from '../BaseModal.vue'
import AssessmentFrameworkSettings from './AssessmentFrameworkSettings.vue'
import ElementarySubjectManager from './ElementarySubjectManager.vue'
import ElementaryCsvImporter from './ElementaryCsvImporter.vue'
import SetupQuickJumpNav from './SetupQuickJumpNav.vue'

import { 
  Settings2, 
  Zap, 
  PlusCircle, 
  Upload,
  Pencil, 
  UserMinus, 
  UserCheck, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Rss, 
  AlertTriangle, 
  GraduationCap,
  Info
} from 'lucide-vue-next'
import { getEffectiveGradeLevel } from '../../composables/useElementary.js'


const {
  activeClass,
  classList,
  sortedRoster,
  archivedRoster,
  termOptions,
  yearOptions,
  periodOptions,
  gridSize,
  thresholds: classroomThresholds,
  updateActiveClass,
  triggerActiveClass,
  archiveStudent,
  unarchiveStudent,
  permanentlyDeleteStudent,
  moveStudentFromClass,
  importRoster,
  checkResize,
  confirmResize
} = useClassroom()

const { confirm, alert } = useMessage()

const detectedGradeLevel = computed(() => getEffectiveGradeLevel(activeClass.value))

const availableClassSections = computed(() => {
  if (!activeClass.value) return []
  if (activeClass.value.courseSections && activeClass.value.courseSections.length > 0) {
    return activeClass.value.courseSections
  }
  if (activeClass.value.students) {
    const set = new Set()
    for (const s of Object.values(activeClass.value.students)) {
      if (s.courseCode) set.add(s.courseCode)
    }
    return Array.from(set).filter(Boolean)
  }
  return []
})

const sectionTagInputs = reactive({})

watch(availableClassSections, (secs) => {
  if (!secs) return
  secs.forEach(s => {
    if (sectionTagInputs[s] === undefined) {
      sectionTagInputs[s] = s
    }
  })
}, { immediate: true })

async function saveSectionTagRename(oldTag) {
  if (!activeClass.value || !oldTag) return
  const newTag = sectionTagInputs[oldTag]
  if (!newTag || !newTag.trim() || newTag.trim() === oldTag) return
  const cleanNew = newTag.trim()

  const updatedStudents = { ...activeClass.value.students }
  for (const sId in updatedStudents) {
    if (updatedStudents[sId].courseCode === oldTag) {
      updatedStudents[sId] = {
        ...updatedStudents[sId],
        courseCode: cleanNew
      }
    }
  }

  const currentSections = activeClass.value.courseSections && activeClass.value.courseSections.length > 0
    ? activeClass.value.courseSections
    : availableClassSections.value

  const updatedSections = currentSections.map(sec => sec === oldTag ? cleanNew : sec)
  const uniqueSections = [...new Set(updatedSections.filter(Boolean))]

  delete sectionTagInputs[oldTag]
  sectionTagInputs[cleanNew] = cleanNew

  await updateActiveClass({
    students: updatedStudents,
    courseSections: uniqueSections,
    courseCode: uniqueSections.join('/')
  })
}

const isElementaryImporterOpen = ref(false)
const isGradingInfoModalOpen = ref(false)

async function handleElementaryImport({ students: importedStudents, subjects: importedSubjects }) {
  if (!activeClass.value) return
  await importRoster(importedStudents)
  if (activeClass.value.classType === 'elementary' && importedSubjects && importedSubjects.length > 0) {
    await updateActiveClass({ subjects: importedSubjects })
  }
  isElementaryImporterOpen.value = false
  await alert(`Successfully imported ${importedStudents.length} students into ${activeClass.value.name}!`)
}

// Local copy of class name to prevent resetting mid-type
const localClassName = ref('')

watch(() => activeClass.value?.name, (v) => { localClassName.value = v || '' }, { immediate: true })
async function saveClassName() {
  if (!activeClass.value) return
  const val = localClassName.value.trim() || activeClass.value.name
  if (val !== activeClass.value.name) {
    await updateActiveClass({ name: val })
  }
}

// Local copy of course code
const localCourseCode = ref('')
watch(() => activeClass.value?.courseCode, (v) => { localCourseCode.value = v || '' }, { immediate: true })
async function saveCourseCode() {
  if (!activeClass.value) return
  const val = localCourseCode.value.trim()
  if (val !== (activeClass.value.courseCode || '')) {
    await updateActiveClass({ courseCode: val })
  }
}

// --- Seating Plan Resize Grid ---
const newGrid = reactive({ rows: 6, cols: 6 })
watch([() => activeClass.value?.gridSize, gridSize], ([classGrid, globalGrid]) => {
  const effective = classGrid || globalGrid
  if (effective) {
    newGrid.rows = effective.rows
    newGrid.cols = effective.cols
  }
}, { immediate: true, deep: true })

const resizeConflict = ref([])
let pendingGridSize = null

function requestResize() {
  pendingGridSize = { rows: newGrid.rows, cols: newGrid.cols }
  const { affected } = checkResize(pendingGridSize)
  if (affected.length > 0) {
    resizeConflict.value = affected
  } else {
    applyResize()
  }
}

async function applyResize() {
  await confirmResize(pendingGridSize)
  resizeConflict.value = []
}

async function setGlobalDefaultGrid() {
  localStorage.setItem('defaultRows', newGrid.rows.toString())
  localStorage.setItem('defaultCols', newGrid.cols.toString())
  await alert(`Global default grid size set to ${newGrid.rows}x${newGrid.cols}.`)
}

// --- Roster Management & Modals ---
const isArchivedPanelVisible = ref(false)
const isStudentModalOpen = ref(false)
const isEditingStudent = ref(false)
const newStudent = reactive({ studentId: '', firstName: '', lastName: '', rfidTag: '', gradeLevel: '', courseCode: '' })
const singleAddError = ref('')
const singleAddSuccess = ref('')

function openAddStudentModal() {
  isEditingStudent.value = false
  newStudent.studentId = ''
  newStudent.firstName = ''
  newStudent.lastName = ''
  newStudent.rfidTag = ''
  newStudent.gradeLevel = ''
  newStudent.courseCode = ''
  singleAddError.value = ''
  singleAddSuccess.value = ''
  isStudentModalOpen.value = true
}

function onEditStudent(student) {
  isEditingStudent.value = true
  newStudent.studentId = student.studentId
  newStudent.firstName = student.firstName
  newStudent.lastName = student.lastName
  newStudent.rfidTag = student.rfidTag || ''
  newStudent.gradeLevel = student.gradeLevel || ''
  newStudent.courseCode = student.courseCode || ''
  singleAddError.value = ''
  singleAddSuccess.value = ''
  isStudentModalOpen.value = true
}

function cancelEditStudent() {
  isEditingStudent.value = false
  isStudentModalOpen.value = false
  newStudent.studentId = ''
  newStudent.firstName = ''
  newStudent.lastName = ''
  newStudent.rfidTag = ''
  newStudent.gradeLevel = ''
  newStudent.courseCode = ''
  singleAddError.value = ''
  singleAddSuccess.value = ''
}

async function onArchiveStudent(student) {
  if (await confirm(`Are you sure you want to unenroll ${student.firstName} ${student.lastName}?`)) {
    await archiveStudent(student.studentId)
  }
}

async function onUnarchiveStudent(student) {
  await unarchiveStudent(student.studentId)
}

async function onPermanentDeleteStudent(student) {
  if (await confirm(`PERMANENTLY delete ${student.firstName} ${student.lastName} and all their event history in this class? This cannot be undone.`, 'Danger Zone', { danger: true })) {
    await permanentlyDeleteStudent(student.studentId)
  }
}

// --- RFID Scanning wedge ---
const isEnrollingRFID = ref(false)
const enrollTimer = ref(null)

const onRFIDEnroll = (hex) => {
  const duplicate = classList.value
    .flatMap(c => Object.entries(c.students || {}).map(([sid, s]) => ({ ...s, studentId: sid, className: c.name })))
    .find(s => s.rfidTag?.toLowerCase() === hex.toLowerCase() && s.studentId !== newStudent.studentId)
  if (duplicate) {
    singleAddError.value = `This card is already linked to ${duplicate.firstName} ${duplicate.lastName}${duplicate.className !== activeClass.value?.name ? ` in ${duplicate.className}` : ''}.`
    stopEnrollment()
    return
  }

  newStudent.rfidTag = hex.toUpperCase()
  singleAddSuccess.value = 'Card detected!'
  stopEnrollment()
  setTimeout(() => { if (singleAddSuccess.value === 'Card detected!') singleAddSuccess.value = '' }, 3000)
}

const rfidWedge = useKeyboardWedge(onRFIDEnroll)

function startEnrollment() {
  isEnrollingRFID.value = true
  singleAddError.value = ''
  rfidWedge.start()
  
  if (enrollTimer.value) clearTimeout(enrollTimer.value)
  enrollTimer.value = setTimeout(() => {
    if (isEnrollingRFID.value) {
      stopEnrollment()
      singleAddError.value = 'Enrollment timed out. Please try again.'
    }
  }, 15000)
}

function stopEnrollment() {
  isEnrollingRFID.value = false
  rfidWedge.stop()
  if (enrollTimer.value) clearTimeout(enrollTimer.value)
}

function clearRFID() {
  newStudent.rfidTag = ''
  singleAddSuccess.value = 'Card unlinked.'
  setTimeout(() => { if (singleAddSuccess.value === 'Card unlinked.') singleAddSuccess.value = '' }, 3000)
}

// --- Rapid RFID wedge ---
const isRapidRFIDOpen = ref(false)
const rapidRFIDIndex = ref(0)
const rapidRFIError = ref('')
const rapidRFIDSuccess = ref('')

const rapidRFIDList = computed(() => sortedRoster.value)
const currentRapidStudent = computed(() => rapidRFIDList.value[rapidRFIDIndex.value])

const onRapidRFIDScan = async (hex) => {
  if (!isRapidRFIDOpen.value || !currentRapidStudent.value) return

  const duplicate = classList.value
    .flatMap(c => Object.entries(c.students || {}).map(([sid, s]) => ({ ...s, studentId: sid, className: c.name })))
    .find(s => s.rfidTag?.toLowerCase() === hex.toLowerCase() && s.studentId !== currentRapidStudent.value.studentId)
  if (duplicate) {
    rapidRFIError.value = `Already linked to ${duplicate.firstName} ${duplicate.lastName}${duplicate.className !== activeClass.value?.name ? ` (${duplicate.className})` : ''}`
    playRapidBeep(true)
    return
  }

  try {
    await classService.patchStudent(activeClass.value.classId, currentRapidStudent.value.studentId, { rfidTag: hex.toUpperCase() })
    triggerActiveClass()
    
    rapidRFIDSuccess.value = `Linked to ${currentRapidStudent.value.firstName}!`
    playRapidBeep(false)
    
    setTimeout(async () => {
      rapidRFIDSuccess.value = ''
      rapidRFIError.value = ''
      
      let next = rapidRFIDIndex.value + 1
      if (next < rapidRFIDList.value.length) {
        rapidRFIDIndex.value = next
      } else {
        stopRapidRFID()
        await alert('Rapid enrollment complete!')
      }
    }, 1000)
  } catch (err) {
    rapidRFIError.value = err.message
  }
}

const rapidRFIDWedge = useKeyboardWedge(onRapidRFIDScan)

function openRapidRFID() {
  if (!activeClass.value) return
  isRapidRFIDOpen.value = true
  rapidRFIError.value = ''
  rapidRFIDSuccess.value = ''
  
  const firstEmpty = rapidRFIDList.value.findIndex(s => !s.rfidTag)
  rapidRFIDIndex.value = firstEmpty !== -1 ? firstEmpty : 0
  
  rapidRFIDWedge.start()
}

function stopRapidRFID() {
  isRapidRFIDOpen.value = false
  rapidRFIDWedge.stop()
}

function playRapidBeep(isErr = false) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(isErr ? 220 : 880, audioCtx.currentTime)
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start()
  gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + (isErr ? 0.35 : 0.15))
  osc.stop(audioCtx.currentTime + (isErr ? 0.35 : 0.15))
}

// --- Add Single Student / Conflict Handling ---
const crossClassConflicts = ref([])
let _pendingConflicts = []

async function addSingleStudent() {
  singleAddError.value = ''
  singleAddSuccess.value = ''
  if (!activeClass.value) return
  if (!newStudent.studentId.trim() || !newStudent.firstName.trim() || !newStudent.lastName.trim()) {
    singleAddError.value = 'All fields are required.'
    return
  }

  const row = {
    studentId: newStudent.studentId.trim(),
    firstName: newStudent.firstName.trim(),
    lastName: newStudent.lastName.trim(),
    gradeLevel: newStudent.gradeLevel || '',
    courseCode: newStudent.courseCode ? newStudent.courseCode.trim() : '',
    rfidTag: newStudent.rfidTag.trim(),
    parentContacts: []
  }

  try {
    const result = await importRoster([row])
    
    if (result.crossClassConflicts.length > 0) {
      _pendingConflicts = result.crossClassConflicts
      crossClassConflicts.value = result.crossClassConflicts
    } else {
      singleAddSuccess.value = isEditingStudent.value ? 'Student updated!' : 'Student added to roster!'
      isEditingStudent.value = false
      isStudentModalOpen.value = false
      newStudent.studentId = ''
      newStudent.firstName = ''
      newStudent.lastName = ''
      newStudent.rfidTag = ''
      setTimeout(() => singleAddSuccess.value = '', 3000)
    }
  } catch (err) {
    singleAddError.value = err.message
  }
}

async function resolveConflicts(action) {
  if (action === 'move') {
    for (const conflict of _pendingConflicts) {
      await moveStudentFromClass(conflict.existingClassId, conflict.student)
    }
  }
  crossClassConflicts.value = []
  _pendingConflicts = []
  isStudentModalOpen.value = false
}
</script>

<style scoped>
.setup__info-trigger-btn {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: var(--primary, #6366f1);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.setup__info-trigger-btn:hover {
  background: var(--primary, #6366f1);
  color: #ffffff;
  border-color: var(--primary, #6366f1);
  transform: scale(1.08);
}

.grading-info-guide {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grading-info-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.grading-info-subtitle {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text, #ffffff);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.grading-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 600px) {
  .grading-info-grid {
    grid-template-columns: 1fr;
  }
}

.grading-info-card {
  background: var(--bg-secondary, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 8px);
  padding: 12px 14px;
  font-size: 0.83rem;
  line-height: 1.45;
  color: var(--text-secondary, #94a3b8);
}

.grading-info-card--sbar {
  border-color: rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.03);
}

.grading-info-card p {
  margin: 6px 0 0 0;
}

.grading-info-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--text, #ffffff);
  font-weight: 600;
}

.setup__chip--purple {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.grading-info-engine-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grading-info-engine-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--bg-secondary, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
  border-radius: var(--radius-md, 8px);
  padding: 10px 12px;
}

.grading-info-engine-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary, #818cf8);
  white-space: nowrap;
  flex-shrink: 0;
}

.grading-info-engine-desc {
  font-size: 0.83rem;
  line-height: 1.4;
  color: var(--text-secondary, #94a3b8);
}

.grading-info-engine-desc strong {
  color: var(--text, #ffffff);
}

.grading-info-tip-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-md, 8px);
  padding: 10px 12px;
  font-size: 0.81rem;
  line-height: 1.45;
  color: var(--text-secondary, #94a3b8);
}

.grading-info-tip-banner strong {
  color: #f59e0b;
}
</style>
