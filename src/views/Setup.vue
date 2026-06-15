<template>
  <div class="setup">
    <!-- ── Page Header & Class Selector ───────────────────────────── -->
    <div class="setup__header">
      <div class="setup__header-left">
        <button v-if="props.from === 'Grades'" class="setup__back-btn" @click="$emit('navigate', 'Grades')">
          <ArrowLeft :size="18" /> Back to Gradebook
        </button>
        <div class="setup__header-class">
          <label for="setup-class-selector" class="setup__header-label">Configuring:</label>
          <select 
            id="setup-class-selector" 
            class="setup__class-selector"
            :value="activeClass?.classId"
            @change="e => switchToClass(e.target.value)"
          >
            <option v-if="filteredClassList.length === 0" value="">No Classes</option>
            <option v-for="cls in filteredClassList" :key="cls.classId" :value="cls.classId">
              {{ cls.name }} (P{{ cls.periodNumber }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── Page tabs ─────────────────────────────────────────────── -->
    <div class="setup__tabs" role="tablist">
      <button
        v-for="tab in setupTabs"
        :key="tab.id"
        class="setup__tab"
        :class="{ 'setup__tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="16" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 0: Calendar Manager (Modular)                      -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="activeTab === 'calendar'" class="setup__panel">
      <div class="setup__panel-content">
        <CalendarSettings />
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 1: Class Manager                                  -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="activeTab === 'manage'" class="setup__panel">
      <div class="setup__panel-content">
        <!-- Bulk Setup Wizard (Smart CSV Interceptor) -->
        <div class="setup__card setup__card--accent">
          <h2 class="setup__card-title">Bulk Setup / New Semester</h2>
          <p class="setup__hint">
            Drop your board-provided CSV here to automatically detect, create, and update classes for the new term.
          </p>
          <label 
            class="setup__file-label" 
            for="roster-file"
            :class="{ 'setup__file-label--drag': isDraggingRoster }"
            @dragover.prevent="isDraggingRoster = true"
            @dragleave.prevent="isDraggingRoster = false"
            @drop.prevent="isDraggingRoster = false; onFileSelected($event)"
          >
            <FolderOpen :size="16" /> {{ isDraggingRoster ? 'Drop CSV here...' : 'Choose CSV file or drag & drop here' }}
            <input
              id="roster-file"
              type="file"
              accept=".csv,text/csv"
              class="setup__file-input"
              @change="onFileSelected"
            />
          </label>
        </div>

        <!-- Current Classes List -->
        <div class="setup__card">
          <div class="setup__card-header-row">
            <h2 class="setup__card-title">All Classes</h2>
            <label class="setup__label setup__label--checkbox setup__show-all">
              <input type="checkbox" v-model="showAllSessions" />
              Show All Sessions
            </label>
          </div>
          <div v-if="(showAllSessions ? classList : filteredClassList).length === 0" class="setup__empty">
            No active classes for this session.
          </div>
          <ul class="setup__class-list">
            <li
                v-for="cls in (showAllSessions ? classList : filteredClassList)"
                :key="cls.classId"
                class="setup__class-item"
                :class="{ 'setup__class-item--active': cls.classId === activeClass?.classId }"
            >
              <div>
                <div class="setup__class-name">{{ cls.name }}</div>
                <div class="setup__class-meta">
                  Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }} · {{ studentCount(cls) }} students
                </div>
              </div>
              <div class="setup__class-actions">
                <button class="setup__pill-btn" @click="switchToClass(cls.classId)">
                  {{ cls.classId === activeClass?.classId ? 'Active' : 'Configure' }}
                </button>
                <button class="setup__pill-btn" @click.stop="openQRGenerator(cls)">
                  <QrCode :size="14" /> QR
                </button>
                <button class="setup__pill-btn" @click.stop="openPrintList(cls)">
                  <Printer :size="14" /> List
                </button>
                <button class="setup__pill-btn" @click="onArchiveClass(cls.classId)">Archive</button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Archived Classes -->
        <div v-if="(showAllSessions ? archivedClasses : filteredArchivedClasses).length > 0" class="setup__card setup__card--archived">
          <button class="setup__archived-toggle" @click="isArchivedPanelVisible = !isArchivedPanelVisible">
            <span class="setup__archived-label">
              <Archive :size="16" /> Archived ({{ (showAllSessions ? archivedClasses : filteredArchivedClasses).length }})
            </span>
            <span class="setup__archived-chevron"><component :is="isArchivedPanelVisible ? ChevronUp : ChevronDown" :size="16" /></span>
          </button>
          <ul v-if="isArchivedPanelVisible" class="setup__class-list setup__archived-list">
            <li v-for="cls in (showAllSessions ? archivedClasses : filteredArchivedClasses)" :key="cls.classId" class="setup__class-item setup__class-item--archived">
              <div>
                <div class="setup__class-name">{{ cls.name }}</div>
                <div class="setup__class-meta">Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }} · {{ studentCount(cls) }} students</div>
              </div>
              <div class="setup__class-actions">
                <button class="setup__pill-btn" @click="onRestoreClass(cls.classId)">Restore</button>
                <button class="setup__pill-btn setup__pill-btn--danger" @click="onDeleteClass(cls.classId)">Delete</button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Create individual class -->
        <div class="setup__card">
          <h2 class="setup__card-title">Create Single Class</h2>
          <form class="setup__form" @submit.prevent="createNewClass">
            <label class="setup__label">
              Class name
              <input v-model="newClass.name" class="setup__input" placeholder="e.g. Period 1 — Science" required />
            </label>
            <label class="setup__label">
              Course Code (Optional)
              <input v-model="newClass.courseCode" class="setup__input" placeholder="e.g. SNC2D1" />
            </label>
            <div class="setup__form-grid">
              <label class="setup__label">
                School Year and Semester
                <select v-model="newClassTermKey" class="setup__input" required>
                  <option v-for="t in termOptions" :key="t.year + t.semester" :value="t.year + '|' + t.semester">
                    {{ t.year }} Sem {{ t.semester }}
                  </option>
                </select>
              </label>
              <label class="setup__label">
                Period
                <select v-model="newClass.periodNumber" class="setup__input" required>
                  <option v-for="opt in periodOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </label>
              <label class="setup__label">
                Start time
                <input v-model="newClass.periodStartTime" type="time" class="setup__input" required />
              </label>
            </div>
            <button type="submit" class="setup__btn-primary">Create Class</button>
          </form>
          <p v-if="classError" class="setup__error">{{ classError }}</p>
        </div>

        <!-- Bulk dialogs (maintained for cross-context safety) -->
        <div v-if="bulkImportGroups" class="setup__dialog" role="dialog" aria-modal="true">
          <div class="setup__dialog-box setup__dialog-box--large">
            <h3 class="setup__dialog-title">Multi-Class Import Detected</h3>
            <p class="setup__dialog-body">This CSV contains students for multiple classes. Select the ones you want to create or update.</p>
            <div class="setup__bulk-header">
              <div class="setup__bulk-header-left">
                <label class="setup__label setup__label--checkbox setup__bulk-select-all">
                  <input type="checkbox" :checked="isAllSelected" @change="toggleAllBulk" />
                  Select All
                </label>
                <button
                  v-for="sem in bulkAvailableSemesters"
                  :key="sem"
                  class="setup__bulk-sem-btn"
                  :class="{ 'setup__bulk-sem-btn--active': isSemesterAllSelected(sem) }"
                  @click="selectSemesterBulk(sem)"
                >Sem {{ sem }}</button>
              </div>
              <span class="setup__bulk-summary">{{ selectedBulkCount }} of {{ Object.keys(bulkImportGroups).length }} selected</span>
            </div>

            <!-- New Periods Advisory -->
            <div v-if="newPeriodsDetected.length > 0" class="setup__advisory">
              <AlertTriangle :size="16" />
              <div>
                <strong>New Periods Detected ({{ newPeriodsDetected.join(', ') }})</strong>
                <p>These periods were added to your settings. Please review their start times after importing.</p>
              </div>
            </div>
            <div class="setup__bulk-list">
              <template v-for="section in bulkImportSemesters" :key="section.label">
                <div class="setup__bulk-section-heading">{{ section.label }}</div>
                <div v-for="{ key, group } in section.groups" :key="key" class="setup__bulk-item">
                  <div class="setup__bulk-item-main">
                    <input type="checkbox" v-model="group.selected" class="setup__checkbox" />
                    <div class="setup__bulk-info">
                      <strong>{{ group.name }}</strong>
                      <div style="display: flex; gap: 4px; align-items: center;">
                        <span class="setup__chip">{{ group.year }} · Sem {{ group.semester }} · P{{ group.periodNumber }}</span>
                        <span v-if="group.courseCode" class="setup__chip setup__chip--blue">{{ group.courseCode }}</span>
                        <span v-if="isExistingClass(group)" class="setup__badge setup__badge--update">Update Existing</span>
                        <span v-else class="setup__badge setup__badge--new">New Class</span>
                      </div>
                    </div>
                  </div>
                  <div class="setup__bulk-count">{{ group.students.length }} students</div>
                </div>
              </template>
            </div>
            <div class="setup__dialog-actions">
              <button class="setup__btn-primary" @click="confirmBulkImport" :disabled="selectedBulkCount === 0">
                Import {{ selectedBulkCount }} Classes
              </button>
              <button class="setup__btn-ghost" @click="bulkImportGroups = null">Cancel</button>
            </div>
          </div>
          <div class="setup__dialog-backdrop" @click="bulkImportGroups = null" />
        </div>

        <!-- Conflict dialog (maintained) -->
        <div v-if="crossClassConflicts.length > 0" class="setup__dialog" role="dialog" aria-modal="true">
          <div class="setup__dialog-box">
            <h3 class="setup__dialog-title">Student ID Conflict</h3>
            <p class="setup__dialog-body">The following Student IDs already exist in another class. What would you like to do?</p>
            <ul class="setup__dialog-list">
              <li v-for="c in crossClassConflicts" :key="c.studentId">
                <strong>{{ c.student.firstName }} {{ c.student.lastName }}</strong>
                ({{ c.studentId }}) — currently in <em>{{ classNameById(c.existingClassId) }}</em>
              </li>
            </ul>
            <div class="setup__dialog-actions">
              <button class="setup__btn-primary" @click="resolveConflicts('move')">Move to this class</button>
              <button class="setup__btn-ghost"   @click="resolveConflicts('skip')">Skip these students</button>
            </div>
          </div>
          <div class="setup__dialog-backdrop" />
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 2: Active Class Configuration                     -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'active'" class="setup__panel">
      <div v-if="!activeClass" class="setup__panel-content setup__empty">
        <Zap :size="48" style="opacity: 0.2; margin-bottom: 1rem;" />
        <p>Select a class in the header or manager to configure it.</p>
        <button class="setup__btn-primary" @click="activeTab = 'manage'">Go to Class Manager</button>
      </div>
      <div v-else class="setup__panel-content">
        <!-- Section: Class Logistics -->
        <div class="setup__section-header">
          <Settings2 :size="18" />
          <span>Class Logistics</span>
        </div>
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
              <label class="setup__label">
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
                School Year and Semester
                <select
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
              <label class="setup__label">
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
              <label class="setup__label">
                Start Time
                <input
                  type="time"
                  :value="activeClass.periodStartTime || '08:00'"
                  class="setup__input"
                  @change="e => updateActiveClass({ periodStartTime: e.target.value })"
                />
              </label>
            </div>
          </form>
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
            <div class="setup__grid-actions">
              <button type="submit" class="setup__btn-primary">Apply Grid Size</button>
              <button type="button" class="setup__btn-ghost" @click="setGlobalDefaultGrid">Save as Global Default</button>
            </div>
          </form>
          <!-- Resize conflict dialog (re-wrapped) -->
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
          <div class="setup__card-header-row">
            <h2 class="setup__card-title">Roster — {{ sortedRoster.length }} Students</h2>
            <div class="setup__card-actions">
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
              </div>
              <div class="setup__roster-actions">
                <button class="setup__icon-btn" @click="onEditStudent(s)" title="Edit"><Pencil :size="14" /></button>
                <button class="setup__icon-btn setup__icon-btn--warn" @click="onArchiveStudent(s)" title="Archive (Unenroll)"><UserMinus :size="14" /></button>
              </div>
            </li>
          </ul>

          <!-- Unenrolled Panel -->
          <div v-if="archivedRoster.length > 0" class="setup__archived-roster" style="margin-top: 1rem; border-top: 1px solid var(--border-light); padding-top: 1rem;">
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

        <!-- Section: Grading & Assessments -->
        <div class="setup__section-header" style="margin-top: 1rem;">
          <GraduationCap :size="18" />
          <span>Grading & Assessments</span>
        </div>

        <!-- Assessment Framework -->
        <div class="setup__card">
          <h2 class="setup__card-title">Assessment Framework</h2>
          
          <h3 class="setup__card-subtitle">Categories (Weights)</h3>
          <div class="setup__gb-list">
            <div v-for="(cat, idx) in activeClass.gradebookCategories" :key="cat.categoryId" class="setup__gb-item">
              <input v-model="cat.name" class="setup__input setup__input--naked" @change="saveGradebookSettings" />
              <div class="setup__gb-actions">
                <input v-model.number="cat.weight" type="number" class="setup__input setup__input--weight" @change="saveGradebookSettings" /><span>%</span>
                <button class="setup__icon-btn" :disabled="idx === 0" @click="moveCategory(idx, -1)"><ChevronUp :size="16" /></button>
                <button class="setup__icon-btn" :disabled="idx === activeClass.gradebookCategories.length - 1" @click="moveCategory(idx, 1)"><ChevronDown :size="16" /></button>
                <button class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteCategory(cat)"><Trash2 :size="14" /></button>
              </div>
            </div>
          </div>
          
          <div class="setup__category-footer">
            <button class="setup__btn-ghost setup__btn--full" @click="addCategory">
              <Plus :size="14" /> Add Category
            </button>
            <div class="setup__weight-total" :class="{ 
              'setup__weight-total--under': totalWeight < 100 && totalWeight > 0,
              'setup__weight-total--over': totalWeight > 100 
            }">
              Total: <strong>{{ totalWeight }}%</strong>
              <AlertTriangle v-if="totalWeight !== 100" :size="14" />
            </div>
          </div>

          <h3 class="setup__card-subtitle" style="margin-top: 1.5rem;">Units</h3>
          <div class="setup__gb-list">
            <div v-for="(unit, idx) in activeClass.gradebookUnits" :key="unit.unitId" class="setup__gb-item">
              <input v-model="unit.name" class="setup__input setup__input--naked" />
              <div class="setup__gb-actions">
                <button class="setup__icon-btn" :disabled="idx === 0" @click="moveUnit(idx, -1)"><ChevronUp :size="16" /></button>
                <button class="setup__icon-btn" :disabled="idx === activeClass.gradebookUnits.length - 1" @click="moveUnit(idx, 1)"><ChevronDown :size="16" /></button>
                <button class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteUnit(unit.unitId)"><Trash2 :size="14" /></button>
              </div>
            </div>
          </div>
          <button class="setup__btn-ghost setup__btn--full" @click="addUnit"><Plus :size="14" /> Add Unit</button>
        </div>

        <!-- Gradebook Notes -->
        <div class="setup__card">
          <h2 class="setup__card-title">Gradebook Notes</h2>
          <textarea 
            v-model="activeClass.gradebookNotes" 
            class="setup__textarea" 
            placeholder="Notes about grading decisions for this specific class..."
            @blur="saveGradebookSettings"
          ></textarea>
        </div>

        <!-- Template Management -->
        <div class="setup__card">
          <h2 class="setup__card-title">Template Management</h2>
          <p class="setup__hint">Save your categories and milestones as a template to reuse in other classes.</p>
          <div class="setup__template-save">
            <input v-model="newTemplateName" class="setup__input" placeholder="Template Name" />
            <button class="setup__btn-primary" :disabled="!newTemplateName.trim()" @click="saveTemplate">
              Save as Template
            </button>
          </div>

          <div v-if="templates.length > 0" class="setup__template-apply" style="margin-top: 1rem;">
            <h3 class="setup__card-subtitle">Saved Templates</h3>
            <div class="setup__gb-list">
              <div v-for="tmpl in templates" :key="tmpl.templateId" class="setup__gb-item">
                <span class="setup__tmpl-name">{{ tmpl.name }}</span>
                <div class="setup__gb-actions">
                  <button class="setup__pill-btn" @click="onApplyTemplate(tmpl)">Apply</button>
                  <button class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteTemplate(tmpl.templateId)">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 3: Global App Settings                            -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'app'" class="setup__panel">
      <div class="setup__panel-content">
        <!-- Profile -->
        <div class="setup__card">
          <h2 class="setup__card-title">General Settings</h2>
          <label class="setup__label">
            Teacher Name (for Reports)
            <input v-model="localTeacherName" class="setup__input" placeholder="" @blur="saveTeacherName" />
          </label>
        </div>

        <!-- Attendance & Cloud Mode Settings -->
        <div class="setup__card">
          <h2 class="setup__card-title">
            <GraduationCap :size="18" /> Attendance & Cloud Settings
          </h2>
          <p class="setup__hint">Configure how daily student attendance is registered and set up two-device scanning sync.</p>
          
          <div class="setup__settings-grid">
            
            <!-- Left Column: Attendance Mode -->
            <div class="setup__settings-col setup__settings-col--left">
              <h3 class="setup__card-subtitle" style="margin-top: 0; margin-bottom: 4px;">Attendance Mode</h3>
              <div :key="radioGroupKey" class="setup__attendance-modes" style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
                <label class="setup__label setup__label--radio" style="display: flex; flex-direction: row; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; margin: 0;">
                  <input type="radio" name="attendanceMode" :checked="localAttendanceMode === 'natural'" value="natural" @change="onAttendanceModeChange('natural')" style="margin: 0; cursor: pointer;" />
                  <span>Natural Mode (Present by default)</span>
                </label>
                <label class="setup__label setup__label--radio" style="display: flex; flex-direction: row; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; margin: 0;">
                  <input type="radio" name="attendanceMode" :checked="localAttendanceMode === 'rfid'" value="rfid" @change="onAttendanceModeChange('rfid')" style="margin: 0; cursor: pointer;" />
                  <span>RFID/QR Sign-In Mode (All start absent)</span>
                </label>
              </div>
              
              <div v-if="localAttendanceMode === 'rfid'" class="setup__grace-period" style="margin-top: 8px;">
                <label class="setup__label" style="display: flex; flex-direction: column; gap: 6px; margin: 0;">
                  Lateness Grace Period: <strong>{{ localGracePeriod }} minutes</strong>
                  <input type="range" v-model.number="localGracePeriod" min="0" max="15" step="1" @change="saveAttendanceConfig" style="width: 100%; cursor: pointer; margin: 0;" />
                </label>
              </div>

              <!-- Manual Override Reset -->
              <div v-if="activeClass" class="setup__attendance-actions" style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;">
                <button class="setup__btn-ghost" style="height: 36px; padding: 0 16px; font-size: 0.85rem; min-height: unset; width: 100%; margin: 0;" @click="onMarkAllPresent">
                  Mark All Present in {{ activeClass.name }}
                </button>
              </div>
            </div>
            
            <!-- Right Column: Cloud Settings -->
            <div class="setup__settings-col">
              <h3 class="setup__card-subtitle" style="margin-top: 0; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                Supabase Two-Device Sync
                <span class="setup__tooltip-container" aria-label="Database Inactivity Warning">
                  <Info :size="14" class="setup__info-icon" />
                  <span class="setup__tooltip-text">
                    <strong>Inactivity Note:</strong> Supabase pauses free databases after 7 days of idle time (like Summer/Winter breaks). If it stops working, simply log into your Supabase Dashboard and click "Restore Project" to wake it up!
                  </span>
                </span>
              </h3>
              <p class="setup__hint" style="margin: 0; font-size: 0.8rem; line-height: 1.4;">Enable Cloud Mode to scan cards on a door device and receive updates here.</p>
              
              <div class="setup__switch-container" style="margin: 8px 0 0 0;">
                <label class="setup__switch">
                  <input type="checkbox" v-model="localCloudMode" @change="saveCloudConfig" />
                  <span class="setup__switch-slider"></span>
                </label>
                <span class="setup__switch-label">Enable Cloud Mode</span>
              </div>
              
              <label class="setup__label" v-if="localCloudMode" style="display: flex; flex-direction: column; gap: 6px; margin: 4px 0 0 0;">
                User Code (Room PIN / Teacher ID)
                <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
                  <input type="text" v-model="localUserCode" readonly class="setup__input" style="margin: 0; flex-grow: 1; cursor: default;" />
                  <button type="button" class="setup__btn-ghost" @click="regenerateUserCode" style="min-height: 44px; padding: 0 16px; margin: 0; white-space: nowrap; display: flex; align-items: center; gap: 6px;" title="Generate random unique code">
                    <RefreshCcw :size="14" /> Generate
                  </button>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal; margin-top: 2px; line-height: 1.3;">
                  We recommend using a unique auto-generated code (e.g. <strong>B7F-K9X</strong>) to prevent conflicts with other classrooms.
                </span>
              </label>

              <div v-if="localCloudMode" class="setup__link-box">
                <span class="setup__link-title">
                  <ExternalLink :size="14" /> Door Scanner URL
                </span>
                <span class="setup__link-text">
                  Open this link on your dedicated scanning machine and enter your User Code:
                </span>
                <div class="setup__link-input-group">
                  <input type="text" :value="scanStationUrl" readonly class="setup__input" style="margin: 0; flex-grow: 1; cursor: text; font-family: monospace; font-size: 0.8rem;" @click="$event.target.select()" />
                  <button type="button" class="setup__btn-ghost" @click="copyScanStationUrl" style="min-height: 44px; padding: 0 16px; margin: 0; white-space: nowrap; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;" :title="urlCopied ? 'Copied' : 'Copy URL'">
                    <Check v-if="urlCopied" :size="14" style="color: var(--state-success);" />
                    <Copy v-else :size="14" />
                    {{ urlCopied ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </div>

              <div class="setup__switch-container" style="margin: 16px 0 0 0;">
                <label class="setup__switch">
                  <input type="checkbox" v-model="autoStartRFID" />
                  <span class="setup__switch-slider"></span>
                </label>
                <span class="setup__switch-label">Auto-Start RFID on Load</span>
              </div>
            </div>
            
          </div>
        </div>

        <!-- Attendance Mode Change Confirmation Modal -->
        <div v-if="isAttendanceModeModalOpen" class="setup__dialog" role="dialog" aria-modal="true" aria-labelledby="att-modal-title">
          <div class="setup__dialog-backdrop" @click="cancelAttendanceModeChange" />
          <div class="setup__dialog-box" style="max-width: 420px;">
            <h3 id="att-modal-title" class="setup__dialog-title" style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">⚠️</span>
              Change Attendance Mode?
            </h3>

            <div class="setup__dialog-body" style="display: flex; flex-direction: column; gap: 10px;">
              <p v-if="pendingAttendanceMode === 'rfid'">
                <strong>Switching to RFID/QR Sign-In Mode</strong> will immediately mark <strong>every student absent</strong> in all classes for today. Students must scan their card or QR code to be marked present.
              </p>
              <p v-else>
                <strong>Switching to Natural Mode</strong> will stop requiring scan-based check-in. Any students still marked absent from today's RFID session will remain absent until they scan in or you manually clear them.
              </p>
              <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.83rem; color: var(--text-secondary); border-left: 3px solid var(--primary);">
                <strong style="color: var(--text);">Self-healing:</strong> Any attendance state set today will automatically reset tonight at midnight. Changing this setting again tomorrow starts fresh — no permanent damage.
              </div>
              <p style="font-size: 0.82rem; color: var(--text-secondary);">Are you sure you want to switch?</p>
            </div>

            <div class="setup__dialog-actions">
              <button class="setup__btn-primary" @click="confirmAttendanceModeChange">Yes, switch mode</button>
              <button class="setup__btn-ghost" @click="cancelAttendanceModeChange">Cancel</button>
            </div>
          </div>
        </div>


        <!-- Grade Buckets (Grading Levels) -->
        <GradeBucketsSettings />


      <!-- Behavior Strategy -->
      <div class="setup__card">
        <h2 class="setup__card-title">Behavior Strategy</h2>
        <div class="setup__form-grid">
          <label class="setup__label">
            Washroom Limit (Warning)
            <input v-model.number="editThresholds.washroomTripsPerWeek" type="number" class="setup__input" @change="saveThresholds" />
          </label>
          <label class="setup__label">
            Device Limit (Warning)
            <input v-model.number="editThresholds.deviceIncidentsPerWeek" type="number" class="setup__input" @change="saveThresholds" />
          </label>
        </div>
        
        <h3 class="setup__card-subtitle" style="margin-top: 1.5rem;">Behavior Codes</h3>
        <ul class="setup__code-list">
          <li v-for="code in behaviorCodes" :key="code.codeKey" class="setup__code-item">
            <div class="setup__code-info">
              <span class="setup__code-icon"><component :is="resolveIcon(code.icon)" :size="18" /></span>
              <strong>{{ code.label }}</strong> ({{ code.codeKey }})
            </div>
            <div class="setup__code-actions">
              <button class="setup__icon-btn" @click="editCode(code)"><Pencil :size="14" /></button>
              <button class="setup__icon-btn setup__icon-btn--danger" @click="deleteCode(code.codeKey)"><Trash2 :size="14" /></button>
            </div>
          </li>
        </ul>
        <button class="setup__btn-ghost setup__btn--full" @click="resetNewCode(); /* trigger modal or form scroll */">
          <Plus :size="14" /> Add New Code
        </button>
      </div>

      <!-- Period Defaults -->
      <div class="setup__card">
        <h2 class="setup__card-title">Period Start Times</h2>
        <p class="setup__hint">Define the default start time for each period. These will autopopulate when creating or editing a class.</p>
        <div class="setup__period-grid">
          <div v-for="p in periodOptions" :key="p" class="setup__period-row">
            <div class="setup__period-header">
              <span class="setup__period-label">Period {{ p }}</span>
              <button v-if="p !== 1" class="setup__icon-btn setup__icon-btn--danger" @click="onRemovePeriod(p)">
                <Trash2 :size="14" />
              </button>
            </div>
            <input 
              :value="periodStartTimes[p]" 
              type="time" 
              class="setup__input" 
              @change="e => {
                const updated = { ...periodStartTimes, [p]: e.target.value };
                updatePeriodStartTimes(updated);
              }" 
            />
          </div>
        </div>
        <button class="setup__btn-ghost setup__btn--full" style="margin-top: 1rem" @click="onAddPeriod">
          <Plus :size="14" /> Add Period
        </button>
      </div>
    </div>
  </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 4: Data Management                                 -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'data'" class="setup__panel">
      <div class="setup__panel-content">
        
        <!-- Excel Export -->
        <div class="setup__card">
          <h2 class="setup__card-title"><FileSpreadsheet :size="20" /> Excel Export</h2>
          <p class="setup__hint">
            Generate a professional Gradebook export for <strong>{{ activeClass?.name || 'the selected class' }}</strong>.
          </p>
          <button 
            class="setup__btn-primary" 
            :disabled="!activeClass"
            @click="handleExportExcel"
            style="display: flex; align-items: center; justify-content: center; gap: 8px;"
          >
            <Download :size="18" /> Export {{ activeClass?.name }} to Excel (.xlsx)
          </button>
        </div>

        <!-- Quick Sync (Local Folder) -->
        <div class="setup__card">
          <h2 class="setup__card-title"><RefreshCcw :size="20" /> Local Folder Sync</h2>
          <p class="setup__hint">
            Automate backups by linking a local folder (e.g., your OneDrive or Google Drive folder). 
            The app will attempt to save a <code>quick-sync-backup.json</code> file after every major change.
          </p>
          
          <div class="setup__sync-status">
            <div v-if="isSyncLinked" class="setup__status-badge setup__status-badge--success">
              <Cloud :size="14" /> Folder Linked
            </div>
            <div v-else class="setup__status-badge">
              <X :size="14" /> No Folder Linked
            </div>
          </div>

          <div class="setup__grid-actions" style="margin-top: 0;">
            <button class="setup__btn-primary" @click="linkBackupFile">
              {{ isSyncLinked ? 'Change Sync Folder' : 'Setup Sync Folder' }}
            </button>
            <button 
              class="setup__btn-ghost" 
              :disabled="!isSyncLinked" 
              @click="onQuickSyncNow"
            >
              Sync Now
            </button>
          </div>
        </div>

        <!-- Manual Backup & Restore -->
        <div class="setup__card">
          <h2 class="setup__card-title"><DatabaseIcon :size="20" /> Manual Backup & Restore</h2>
          <p class="setup__hint">
            Download a full snapshot of your database (all classes, students, and events) as a JSON file.
          </p>
          <div class="setup__grid-actions" style="margin-top: 0;">
            <button class="setup__btn-primary" @click="doExport">Download JSON Backup</button>
            <button class="setup__btn-ghost" @click="$refs.backupFileInput.click()">Restore from File</button>
          </div>
          <input ref="backupFileInput" type="file" accept=".json" class="setup__file-input" @change="onBackupFileSelected" />
          
          <div v-if="restoreMsg" class="setup__msg" :class="{ 'setup__msg--error': restoreMsg.startsWith('❌') }" style="margin-top: 1rem; text-align: center;">
            {{ restoreMsg }}
          </div>
        </div>

        <!-- Data Health Audit -->
        <div class="setup__card">
          <h2 class="setup__card-title"><ShieldCheck :size="20" /> Data Health Scanner</h2>
          <p class="setup__hint">
            Scan your internal database for "orphaned" records (e.g. marks from a deleted quiz) or legacy data issues.
          </p>
          
          <div v-if="auditReport" class="setup__audit-results">
            <div class="setup__audit-item" :class="{ 'setup__audit-item--warn': auditReport.orphanedGrades.length > 0 }">
              <div class="setup__audit-label">Orphaned Marks:</div>
              <div class="setup__audit-value">{{ auditReport.orphanedGrades.length }}</div>
              <button v-if="auditReport.orphanedGrades.length > 0" class="setup__pill-btn setup__pill-btn--danger" @click="fixOrphans">Delete Orphans</button>
              <button v-if="auditReport.orphanedGrades.length > 0" class="setup__btn-text" @click="toggleAuditDetails('orphans')">
                {{ showAuditDetails.orphans ? 'Hide' : 'Details' }}
              </button>
            </div>
            <ul v-if="showAuditDetails.orphans && auditReport.orphanedGrades.length > 0" class="setup__audit-detail-list">
              <li v-for="item in auditReport.orphanedGrades" :key="item.id">{{ item.context }}</li>
            </ul>
            
            <div class="setup__audit-item" :class="{ 'setup__audit-item--warn': auditReport.missingClassIds.length > 0 }">
              <div class="setup__audit-label">Incomplete Records:</div>
              <div class="setup__audit-value">{{ auditReport.missingClassIds.length }}</div>
              <button v-if="auditReport.missingClassIds.length > 0" class="setup__pill-btn" @click="fixMissingIds">Heal Records</button>
              <button v-if="auditReport.missingClassIds.length > 0" class="setup__btn-text" @click="toggleAuditDetails('incomplete')">
                {{ showAuditDetails.incomplete ? 'Hide' : 'Details' }}
              </button>
            </div>
            <ul v-if="showAuditDetails.incomplete && auditReport.missingClassIds.length > 0" class="setup__audit-detail-list">
              <li v-for="item in auditReport.missingClassIds" :key="item.id">{{ item.context }}</li>
            </ul>

            <div class="setup__audit-item" :class="{ 'setup__audit-item--warn': auditReport.invalidCategories.length > 0 }">
              <div class="setup__audit-label">Category Mismatches:</div>
              <div class="setup__audit-value">{{ auditReport.invalidCategories.length }}</div>
              <button v-if="auditReport.invalidCategories.length > 0" class="setup__pill-btn" @click="fixInvalidCategories">Repair Categories</button>
              <button v-if="auditReport.invalidCategories.length > 0" class="setup__btn-text" @click="toggleAuditDetails('categories')">
                {{ showAuditDetails.categories ? 'Hide' : 'Details' }}
              </button>
            </div>
            <ul v-if="showAuditDetails.categories && auditReport.invalidCategories.length > 0" class="setup__audit-detail-list">
              <li v-for="item in auditReport.invalidCategories" :key="item.id">{{ item.context }}</li>
            </ul>

            <!-- Settings Integrity -->
            <div v-if="auditReport.settingsIssues && auditReport.settingsIssues.length > 0" class="setup__audit-item setup__audit-item--ok">
              <div class="setup__audit-label">System Settings Healed:</div>
              <div class="setup__audit-value">{{ auditReport.settingsFixed }}</div>
              <button class="setup__btn-text" @click="showAuditDetails.settings = !showAuditDetails.settings">
                {{ showAuditDetails.settings ? 'Hide' : 'Details' }}
              </button>
            </div>
            <ul v-if="showAuditDetails.settings && auditReport.settingsIssues.length > 0" class="setup__audit-detail-list">
              <li v-for="issue in auditReport.settingsIssues" :key="issue">✅ {{ issue }}</li>
            </ul>

            <div v-if="auditReport.orphanedGrades.length === 0 && auditReport.missingClassIds.length === 0 && auditReport.invalidCategories.length === 0" class="setup__result-ok">
              ✨ Database is clean and perfectly consistent.
            </div>
          </div>

          <button class="setup__btn-ghost setup__btn--full" :disabled="isAuditing" @click="runDataAudit">
            <Search :size="16" /> {{ isAuditing ? 'Scanning...' : 'Scan Database for Integrity Issues' }}
          </button>
          <p v-if="auditMsg" class="setup__result-ok" style="margin-top: 8px;">{{ auditMsg }}</p>
        </div>

        <!-- Maintenance / Danger Zone -->
        <div class="setup__card setup__card--danger">
          <h2 class="setup__card-title"><AlertTriangle :size="20" /> Danger Zone</h2>
          <p class="setup__hint">Actions that can permanently delete data.</p>
          <button class="setup__btn-danger" @click="onClearAllData">
            Clear All Application Data
          </button>
        </div>

      </div>
    </section>

    <!-- ── Restore Confirmation Modal ─── -->
    <div v-if="importPreview" class="setup__dialog" role="dialog" aria-modal="true">
      <div class="setup__dialog-box" style="max-width: 400px;">
        <h3 class="setup__dialog-title">Confirm Restore</h3>
        <div class="setup__dialog-body">
          <p>This will <strong>permanently overwrite</strong> all current data with the backup from <em>{{ new Date(importPreview.exportedAt).toLocaleDateString() }}</em>.</p>
          <ul class="setup__list" style="margin-top: 1rem;">
            <li>{{ importPreview.classes.length }} Classes</li>
            <li>{{ importPreview.events.length }} Events</li>
            <li>Schema Version: {{ importPreview.schemaVersion }}</li>
          </ul>
          <p style="margin-top: 1rem; color: var(--state-out); font-weight: 600;">This action cannot be undone.</p>
        </div>
        <div class="setup__dialog-actions">
          <button class="setup__btn-danger" @click="doImport">Confirm & Restore</button>
          <button class="setup__btn-ghost" @click="importPreview = null">Cancel</button>
        </div>
      </div>
    </div>

    <!-- ── QR Generation Modal ─── -->
    <div v-if="isQRModalOpen" class="setup__dialog setup__dialog--qr" role="dialog" aria-modal="true">
      <div class="setup__dialog-box setup__dialog-box--large">
        <div class="setup__dialog-header">
          <h3 class="setup__dialog-title">Student QR Codes</h3>
          <div class="setup__dialog-actions">
            <button class="setup__btn-primary" @click="printQRs" :disabled="isGeneratingQRs">
              <Printer :size="18" /> Print
            </button>
            <button class="setup__btn-ghost" @click="isQRModalOpen = false">
              <X :size="18" /> Close
            </button>
          </div>
        </div>
        
        <p class="setup__dialog-body print:hidden">
          These QR codes are tied to student ID numbers. Print this page to create student cards.
        </p>

        <div class="setup__qr-grid" :class="{ 'setup__qr-grid--loading': isGeneratingQRs }">
          <div v-if="isGeneratingQRs" class="setup__qr-loading">
            <QrCode :size="48" class="setup__qr-pulse" />
            <p>Generating codes...</p>
          </div>
          <div v-for="qr in qrCodes" :key="qr.studentId" class="setup__qr-card">
            <img :src="qr.qrUrl" :alt="qr.name" class="setup__qr-img" />
            <div class="setup__qr-info">
              <span class="setup__qr-name">{{ qr.name }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="setup__dialog-backdrop" @click="isQRModalOpen = false" />
    </div>

    <!-- ── Hidden Batch Print Container ─── -->
    <Teleport to="body">
      <div class="qr-print-only" :class="{ 'print-only-container--active': isSystemPrinting }">
        <div class="setup__qr-print-grid">
          <div v-for="qr in qrCodes" :key="qr.studentId" class="setup__qr-print-card">
            <div class="setup__qr-print-header">
              <span class="setup__qr-print-class">{{ activeClass?.name }}</span>
            </div>
            <img :src="qr.qrUrl" :alt="qr.name" class="setup__qr-print-img" />
            <div class="setup__qr-print-info">
              <span class="setup__qr-print-name">{{ qr.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- ── Print List Modal ─── -->
    <PrintClassListModal
      v-if="isPrintListModalOpen"
      :classRecord="classToPrint"
      :teacherName="teacherName"
      @close="isPrintListModalOpen = false"
    />


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
                  <div class="setup__rfid-spinner"></div>
                  <span>Waiting for scan...</span>
                </div>
                <button type="button" class="setup__pill-btn" @click="stopEnrollment">Cancel</button>
              </template>
            </div>
          </div>

          <div v-if="singleAddError" class="setup__error" style="margin-top: 10px;">
            <AlertTriangle :size="14" /> {{ singleAddError }}
          </div>

          <div class="modal-footer" style="margin-top: 20px;">
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
        <div class="rapid-rfid-active" v-if="currentRapidStudent">
          <div class="rapid-rfid-label">Currently Linking</div>
          <div class="rapid-rfid-name">{{ currentRapidStudent.firstName }} {{ currentRapidStudent.lastName }}</div>
          <div class="rapid-rfid-id">{{ currentRapidStudent.studentId }}</div>
          
          <div class="rapid-rfid-status" :class="{ 'rapid-rfid-status--error': rapidRFIError, 'rapid-rfid-status--success': rapidRFIDSuccess }">
            <template v-if="rapidRFIError">
              <AlertTriangle :size="18" /> {{ rapidRFIError }}
            </template>
            <template v-else-if="rapidRFIDSuccess">
              <UserCheck :size="18" /> {{ rapidRFIDSuccess }}
            </template>
            <template v-else>
              <div class="rapid-rfid-pulse"></div>
              <span>Ready for scan...</span>
            </template>
          </div>
        </div>

        <div class="rapid-rfid-list-container">
          <div class="rapid-rfid-list-header">Class Roster ({{ rapidRFIDList.length }})</div>
          <div class="rapid-rfid-list">
            <div 
              v-for="(s, idx) in rapidRFIDList" 
              :key="s.studentId" 
              class="rapid-rfid-item"
              :class="{ 'rapid-rfid-item--active': idx === rapidRFIDIndex, 'rapid-rfid-item--linked': s.rfidTag }"
              @click="rapidRFIDIndex = idx; rapidRFIError = ''; rapidRFIDSuccess = ''"
            >
              <div class="rapid-rfid-item-info">
                <span class="rapid-rfid-item-name">{{ s.lastName }}, {{ s.firstName }}</span>
                <span v-if="s.rfidTag" class="rapid-rfid-tag-hex">{{ s.rfidTag }}</span>
              </div>
              <div class="rapid-rfid-item-status">
                <UserCheck v-if="s.rfidTag" :size="14" />
                <div v-else-if="idx === rapidRFIDIndex" class="rapid-rfid-mini-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="rapid-rfid-footer">
          <button type="button" class="setup__btn-ghost" @click="stopRapidRFID">Close Linker</button>
          <button 
            type="button" 
            class="setup__btn-primary" 
            style="min-width: 120px;"
            @click="rapidRFIDIndex = (rapidRFIDIndex + 1) % rapidRFIDList.length"
          >
            Skip Student
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
/**
 * Setup.vue — View B: Seat Assignment + Behavior Code Editor
 *
 * CLAUDE.md §6  — papaparse for ALL CSV parsing (no split)
 * CLAUDE.md §11 — grid resize with conflict guard
 * CLAUDE.md §4  — no src/db/ imports; all via composables + settingsService
 *                 (settingsService is the ONE allowed import for code CRUD)
 *
 * NOTE: settingsService is imported here only for saveBehaviorCode /
 * deleteBehaviorCode — these write settings directly and then call
 * reloadBehaviorCodes() to keep the reactive ref in sync.
 */

import { ref, reactive, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import Papa from 'papaparse'
import { Archive, ChevronDown, ChevronUp, FolderOpen, Trash2, FileText, Pencil, Download, Database, Cloud, Settings2, Plus, PlusCircle, X, Save, FileUp, FileDown, GraduationCap, ArrowLeft, Zap, LayoutDashboard, Settings, QrCode, Printer, RefreshCcw, FileSpreadsheet, DatabaseIcon, AlertTriangle, ShieldCheck, Search, CalendarDays, UserMinus, UserCheck, Rss, Info, ExternalLink, Copy, Check } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { exportGradebookToExcel } from '../db/exportService.js'
import { resolveIcon } from '../utils/icons.js'
import { useClassroom } from '../composables/useClassroom.js'
import { useMessage }   from '../composables/useMessage.js'
import { hasUnsyncedChanges, isSyncActive, getLastSyncedAt } from '../db/eventService.js'
import * as eventService from '../db/eventService.js'
import * as settingsService from '../db/settingsService.js'
import * as classService from '../db/classService.js'
import * as gradebookService from '../db/gradebookService.js'
import { globalMilestones, refreshGrades } from '../composables/useGradebook.js'
import PrintClassListModal from '../components/PrintClassListModal.vue'
import BaseModal from '../components/BaseModal.vue'
import GradeBucketsSettings from '../components/setup/GradeBucketsSettings.vue'
import CalendarSettings from '../components/setup/CalendarSettings.vue'
import { useKeyboardWedge } from '../composables/useKeyboardWedge.js'

const { alert, confirm } = useMessage()

const {
  classList,
  archivedClasses,
  activeClass,
  students,
  thresholds: classroomThresholds,
  behaviorCodes,
  gridSize,
  isTestDay,
  sortedRoster,
  unseatedStudents,
  filteredClassList,
  filteredArchivedClasses,
  selectedYear,
  selectedSemester,
  teacherName,
  attendanceMode,
  latenessGracePeriod,
  periodStartTimes,
  switchClass,
  createClass,
  updateActiveClass,
  importRoster,
  archiveClass,
  restoreClass,
  deleteClass,
  moveStudentFromClass,
  removeStudent,
  archiveStudent,
  unarchiveStudent,
  permanentlyDeleteStudent,
  archivedRoster,
  checkResize,
  confirmResize,
  updateTeacherName,
  updatePeriodStartTimes,
  updateAttendanceConfig,
  markAllPresentToday,
  bulkImportClasses,
  triggerActiveClass,
  academicTerms,
  termOptions,
  periodOptions,
  nonSchoolDays,
  cloudModeEnabled,
  userCode,
  updateCloudConfig,
  generateUniqueUserCode,
  autoStartRFID
} = useClassroom()

const localCloudMode = ref(cloudModeEnabled.value)
const localUserCode = ref(userCode.value)
watch(cloudModeEnabled, (v) => { localCloudMode.value = v }, { immediate: true })
watch(userCode, (v) => { localUserCode.value = v }, { immediate: true })

async function saveCloudConfig() {
  if (localCloudMode.value && !localUserCode.value.trim()) {
    localUserCode.value = await generateUniqueUserCode()
  }
  await updateCloudConfig(localCloudMode.value, localUserCode.value.trim().toUpperCase())
}

async function regenerateUserCode() {
  localUserCode.value = await generateUniqueUserCode()
  await saveCloudConfig()
}

const scanStationUrl = computed(() => {
  return `${window.location.origin}/scan`
})
const urlCopied = ref(false)
async function copyScanStationUrl() {
  try {
    await navigator.clipboard.writeText(scanStationUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

const isUnsynced = eventService.hasUnsyncedChanges
const isArchivedPanelVisible = ref(false)
const showAllSessions = ref(false)

// Local copy of teacher name to prevent singleton re-renders from resetting the input mid-type
const localTeacherName = ref(teacherName.value)
watch(teacherName, (v) => { localTeacherName.value = v }, { immediate: true })
async function saveTeacherName() { await updateTeacherName(localTeacherName.value) }

// Local copy of attendance configuration
const localAttendanceMode = ref(attendanceMode.value)
const localGracePeriod = ref(latenessGracePeriod.value)

watch(attendanceMode, (v) => { localAttendanceMode.value = v }, { immediate: true })
watch(latenessGracePeriod, (v) => { localGracePeriod.value = v }, { immediate: true })

// Attendance mode confirmation modal state
const isAttendanceModeModalOpen = ref(false)
const pendingAttendanceMode = ref(null)
const radioGroupKey = ref(0) // incremented on cancel to force radio DOM reset

/**
 * Intercept mode changes — show a confirmation modal before persisting.
 * If the user is clicking the already-active mode, do nothing.
 */
function onAttendanceModeChange(newMode) {
  if (newMode === localAttendanceMode.value) return  // no-op if already selected
  pendingAttendanceMode.value = newMode
  isAttendanceModeModalOpen.value = true
}

/** User confirmed — persist the change and close the modal. */
async function confirmAttendanceModeChange() {
  localAttendanceMode.value = pendingAttendanceMode.value
  await updateAttendanceConfig(localAttendanceMode.value, localGracePeriod.value)
  isAttendanceModeModalOpen.value = false
  pendingAttendanceMode.value = null
}

/** User cancelled — snap the radio back to the current saved value and close. */
function cancelAttendanceModeChange() {
  isAttendanceModeModalOpen.value = false
  pendingAttendanceMode.value = null
  // Force the radio to reflect the persisted value (not the clicked-but-unsaved one).
  // We must also bump radioGroupKey so Vue recreates the inputs — without this,
  // Vue skips the DOM update because localAttendanceMode hasn't changed from its
  // perspective (it was already the saved value), leaving the browser's native
  // checked state pointing at the wrong radio.
  localAttendanceMode.value = attendanceMode.value
  radioGroupKey.value++
}

async function saveAttendanceConfig() {
  await updateAttendanceConfig(localAttendanceMode.value, localGracePeriod.value)
}

async function onMarkAllPresent() {
  if (!activeClass.value) return
  const confirmed = await confirm(`Are you sure you want to mark all students present in ${activeClass.value.name} for today? This will clear all absences and late markers logged today.`)
  if (confirmed) {
    await markAllPresentToday(activeClass.value.classId)
  }
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

// --- QR Generation State ---
const isQRModalOpen = ref(false)
const qrCodes = ref([]) // Array of { studentId, name, qrUrl }
const isGeneratingQRs = ref(false)
const isSystemPrinting = ref(false)

// --- Print List State ---
const isPrintListModalOpen = ref(false)
const classToPrint = ref(null)

// --- Super Confirm State ---
const isSuperConfirmOpen = ref(false)
const superConfirmConfig = reactive({
  title: '',
  message: '',
  requireText: '',
  danger: false,
  onConfirm: null
})

// Watch for changes in isSystemPrinting to apply/remove print styles
watch(isSystemPrinting, (newValue) => {
  if (newValue) {
    document.body.classList.add('is-printing')
  } else {
    document.body.classList.remove('is-printing')
  }
})

async function openQRGenerator(clsRecord = null) {
  const targetClass = clsRecord || activeClass.value
  if (!targetClass) return
  
  // Extract and sort roster from target class
  const roster = targetClass.students 
    ? Object.entries(targetClass.students)
        .map(([studentId, s]) => ({ studentId, ...s }))
        .filter(s => !s.archived)
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
    : []
    
  if (roster.length === 0) return
  
  isGeneratingQRs.value = true
  isQRModalOpen.value = true
  
  const codes = []
  for (const student of roster) {
    try {
      const url = await QRCode.toDataURL(student.studentId, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1c1c1e',
          light: '#ffffff'
        }
      })
      codes.push({
        studentId: student.studentId,
        name: `${student.firstName} ${student.lastName}`,
        qrUrl: url
      })
    } catch (err) {
      console.error(`Failed to generate QR for ${student.studentId}`, err)
    }
  }
  
  qrCodes.value = codes
  isGeneratingQRs.value = false
}

function openPrintList(cls) {
  classToPrint.value = cls
  isPrintListModalOpen.value = true
}

async function printQRs() {
  isSystemPrinting.value = true
  
  await nextTick()
  // Wait for QR codes to render and layout to settle
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  window.print()
  isSystemPrinting.value = false
}

onMounted(async () => {
    const [tpls, settings] = await Promise.all([
      gradebookService.getGradebookTemplates(),
      settingsService.getSettings()
    ])
    
    templates.value = tpls
    isSyncLinked.value = await isSyncActive()

    // Set smart defaults for the term dropdown based on active header session
    if (selectedYear.value && selectedSemester.value) {
      newClassTermKey.value = `${selectedYear.value}|${selectedSemester.value}`
    } else if (termOptions.value.length > 0) {
      newClassTermKey.value = `${termOptions.value[0].year}|${termOptions.value[0].semester}`
    }

    // Set smart default for start time based on period 1 settings
    if (periodStartTimes.value[newClass.periodNumber]) {
      newClass.periodStartTime = periodStartTimes.value[newClass.periodNumber]
    }

    // Ensure a class is selected if any exist
    if (!activeClass.value && classList.value.length > 0) {
      await switchToClass(classList.value[0].classId)
    }
})

// --- Standardized Options ---
const semesterOptions = ['1', '2']

const currentSchoolYear = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  // If Sept-Dec (8-11), it's the start of year-year+1
  if (month >= 8) return `${year}-${(year + 1).toString().slice(-2)}`
  // If Jan-Aug (0-7), it's the end of year-1-year
  return `${year - 1}-${year.toString().slice(-2)}`
})

const yearOptions = computed(() => {
  const years = new Set()
  
  // 1. From defined academic terms
  academicTerms.value.forEach(t => { if (t.year) years.add(t.year) })
  
  // 2. From existing classes
  classList.value.forEach(c => { if (c.year) years.add(c.year) })
  
  // 3. Current, Previous, and Next as defaults
  const cur = currentSchoolYear.value
  const curYear = parseInt(cur.split('-')[0])
  years.add(`${curYear - 1}-${curYear.toString().slice(-2)}`)
  years.add(cur)
  years.add(`${curYear + 1}-${(curYear + 2).toString().slice(-2)}`)
  
  return Array.from(years).sort().reverse()
})

// ─── Data Health / Audit ───────────────────────────────────────────────────────
const isAuditing = ref(false)
const auditReport = ref(null)
const auditMsg = ref('')
const showAuditDetails = reactive({
  orphans: false,
  incomplete: false,
  categories: false,
  settings: false
})

const totalWeight = computed(() => {
  if (!activeClass.value?.gradebookCategories) return 0
  return activeClass.value.gradebookCategories.reduce((sum, cat) => sum + (Number(cat.weight) || 0), 0)
})

function toggleAuditDetails(key) {
  showAuditDetails[key] = !showAuditDetails[key]
}

async function runDataAudit() {
  isAuditing.value = true
  auditReport.value = null
  try {
    const report = await gradebookService.auditGradebookData()
    const settingsAudit = await settingsService.auditSettingsIntegrity()
    
    // Merge settings audit into report for display
    report.settingsIssues = settingsAudit.issues
    report.settingsFixed = settingsAudit.fixedCount
    
    auditReport.value = report
  } catch (err) {
    auditMsg.value = `Audit failed: ${err.message}`
  } finally {
    isAuditing.value = false
  }
}

async function fixOrphans() {
  if (!auditReport.value?.orphanedGrades.length) return
  if (!await confirm(`Permanently delete ${auditReport.value.orphanedGrades.length} orphaned mark records?`)) return
  
  const ids = auditReport.value.orphanedGrades.map(g => g.id)
  await gradebookService.repairGradebookOrphans(ids)
  auditMsg.value = 'Orphans cleared!'
  await runDataAudit()
  setTimeout(() => auditMsg.value = '', 3000)
}

async function fixMissingIds() {
  await gradebookService.repairMissingClassIds()
  auditMsg.value = 'Data healing complete!'
  await runDataAudit()
  setTimeout(() => auditMsg.value = '', 3000)
}

async function fixInvalidCategories() {
  if (!auditReport.value?.invalidCategories.length) return
  if (!await confirm(`Repair ${auditReport.value.invalidCategories.length} assessment category mismatches? assessments will be re-assigned to the first valid category in their class.`)) return
  
  const ids = auditReport.value.invalidCategories.map(a => a.id)
  await gradebookService.repairInvalidCategories(ids)
  auditMsg.value = 'Categories repaired!'
  await runDataAudit()
  setTimeout(() => auditMsg.value = '', 3000)
}

// --- Smart CSV Cleaning Helpers ---
function cleanPeriod(raw) {
  if (!raw) return '1'
  // Detect pattern "2(Y25)" -> extract "2"
  const match = raw.toString().match(/^(\d+)/)
  return match ? match[1] : raw.toString()
}

function extractCourseCode(raw) {
  if (!raw) return ''
  // 1. Split by hyphen to remove section suffix (e.g. "SPH3U1-2" -> "SPH3U1")
  const base = raw.toString().split('-')[0].trim()
  
  // 2. Ontario curriculum codes are 5 chars (e.g. "SPH3U"). 
  // Often there is a 6th char for school use (e.g. "SPH3U1").
  // We keep only the first 5 chars to get the standard course identifier.
  return base.length > 5 ? base.slice(0, 5) : base
}

function extractYearFromPeriod(raw) {
  if (!raw) return null
  // Detect pattern "2(Y25)" -> extract "25"
  const match = raw.toString().match(/\(Y(\d+)\)/i)
  if (match) {
    const yy = match[1]
    const fullYear = 2000 + parseInt(yy)
    // Board convention (user says Y25 is start): Y25 -> 2025-26
    return `${fullYear}-${(fullYear + 1).toString().slice(-2)}`
  }
  return null
}

function normalizeSemester(raw) {
  if (!raw) return '1'
  const str = raw.toString().toLowerCase()
  if (str.includes('2')) return '2'
  return '1'
}

async function onArchiveClass(classId) {
  await archiveClass(classId)
}

async function onRestoreClass(classId) {
  await restoreClass(classId)
}

async function onDeleteClass(classId) {
  const cls = archivedClasses.value.find(c => c.classId === classId)
  const name = cls?.name ?? 'this class'
  
  // Combined Multi-Level Confirm
  if (!await confirm(
    `You are about to PERMANENTLY wipe "${name}" and all its historical data. This action is irreversible. Please type the name of the class below to confirm.`, 
    'Final Security Check', 
    { danger: true, requireText: name }
  )) return

  await deleteClass(classId)
}

const props = defineProps({
  tab: { type: String, default: 'classes' },
  from: { type: String, default: '' }
})
const emit = defineEmits(['navigate'])

// ─── tabs ─────────────────────────────────────────────────────────────────────

// ─── setup pillars (reorganized Stage 10) ──────────────────────────────────
const setupTabs = [
  { id: 'manage',   label: 'Class Manager',  icon: LayoutDashboard },
  { id: 'active',   label: 'Class Settings', icon: Zap },
  { id: 'calendar', label: 'Calendar',       icon: CalendarDays },
  { id: 'app',      label: 'App Settings',   icon: Settings },
  { id: 'data',     label: 'Data',           icon: Database },
]

// Fallback for props.tab mapping if coming from old links
const tabMap = { 
  'classes': 'manage', 
  'roster': 'active', 
  'gradebook': 'active', 
  'codes': 'app', 
  'backup': 'app' 
}
const activeTab = ref(tabMap[props.tab] || 'manage')

watch(() => props.tab, (newTab) => {
  if (newTab) activeTab.value = newTab
})

// ─── class management ─────────────────────────────────────────────────────────

const newClass  = reactive({ 
  name: '', 
  courseCode: '',
  periodNumber: 1, 
  periodStartTime: '08:00',
  year: '',
  semester: ''
})
const newClassTermKey = ref('') // Format: "year|semester"

// Watch term key to update newClass object
watch(newClassTermKey, (val) => {
  if (val && val.includes('|')) {
    const [y, s] = val.split('|')
    newClass.year = y
    newClass.semester = s
  }
})

// Watch period number to autopopulate start time
watch(() => newClass.periodNumber, (newVal) => {
  if (periodStartTimes.value[newVal]) {
    newClass.periodStartTime = periodStartTimes.value[newVal]
  }
})

// --- Dynamic Period Management ---
async function onAddPeriod() {
  const next = Math.max(...periodOptions.value, 0) + 1
  const lastTime = periodStartTimes.value[next - 1] || '08:00'
  const [h, m] = lastTime.split(':').map(Number)
  const nextTime = new Date(0, 0, 0, h, m + 80).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  
  const updated = { ...periodStartTimes.value, [next]: nextTime }
  await updatePeriodStartTimes(updated)
}

async function onRemovePeriod(p) {
  if (p === 1) return // Keep P1 for safety
  if (await confirm(`Are you sure you want to remove Period ${p}? This will remove it from your settings, but existing classes will not be affected.`)) {
    const updated = { ...periodStartTimes.value }
    delete updated[p]
    await updatePeriodStartTimes(updated)
  }
}
const classError = ref('')

function studentCount(cls) {
  return Object.keys(cls?.students ?? {}).length
}

async function switchToClass(classId) {
  await switchClass(classId)
}

async function createNewClass() {
  classError.value = ''
  if (!newClass.name.trim()) { classError.value = 'Name is required.'; return }
  if (!newClass.year || !newClass.semester) { classError.value = 'Academic term required.'; return }

  const classId = `class_${Date.now()}`
  await createClass({
    classId: classId,
    name: newClass.name.trim(),
    courseCode: newClass.courseCode.trim(),
    periodNumber: newClass.periodNumber,
    periodStartTime: newClass.periodStartTime,
    year: newClass.year,
    semester: newClass.semester
  })
  
  // Reset
  newClass.name = ''
  newClass.courseCode = ''
  newClass.periodNumber = 1
  newClass.periodStartTime = periodStartTimes.value[1] || '08:00'
  // Keep the same term selection for convenience
}

// ─── grid resize (§11) ────────────────────────────────────────────────────────

const newGrid        = reactive({ rows: 6, cols: 6 })

// Watch for active class changes to sync the resize form
watch(() => activeClass.value?.gridSize, (val) => {
  if (val) {
    newGrid.rows = val.rows
    newGrid.cols = val.cols
  }
}, { immediate: true })

const resizeConflict = ref([])
let   pendingGridSize = null

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

// ─── roster import — papaparse (§6) ──────────────────────────────────────────

const importResult        = ref(null)
const crossClassConflicts = ref([])
const bulkImportGroups    = ref(null)
let   _pendingConflicts   = []
const isDraggingRoster    = ref(false)
const newPeriodsDetected  = ref([]) // List of period numbers added during this import

function onFileSelected(evt) {
  const file = evt.dataTransfer?.files?.[0] || evt.target?.files?.[0]
  if (!file) return

  // NOTE: Do NOT guard on activeClass.value here — bulk import creates classes
  // from scratch and doesn't need one pre-selected. The guard lives inside the
  // single-class branch below where importRoster() requires an active class.

  // CLAUDE.md §6: Use papaparse — never split(',')
  Papa.parse(file, {
    header:         true,
    skipEmptyLines: true,
    complete: async (results) => {
      // Map header columns flexibly
      const rows = results.data.map(row => {
        // Support common header variants
        const studentId = row['Student ID'] ?? row['Student Number'] ?? row['StudentID'] ?? row['student_id'] ?? ''
        let firstName = row['First Name'] ?? row['FirstName'] ?? row['first_name'] ?? ''
        let lastName  = row['Last Name']  ?? row['LastName']  ?? row['last_name']  ?? ''
        
        // Handle combined "Student Name" columns (e.g., "Last,First" or "Last, First")
        const studentName = row['Student Name'] ?? row['StudentName'] ?? row['student_name'] ?? ''
        if (!firstName && !lastName && studentName) {
          const parts = studentName.split(',')
          if (parts.length >= 2) {
            lastName  = parts[0]
            firstName = parts.slice(1).join(',')
          } else {
            // Fallback if there is no comma
            lastName = studentName
          }
        }
        // Extract Demographic Data based on exact CSV headers
        const studentEmail = row['Student eMail'] ?? row['Student Email'] ?? ''
        const custody = row['Custody'] ?? ''
        const livingWith = row['Living With'] ?? ''
        const birthDate = row['Birth'] ?? ''

        const parentContacts = []
        // The CSV provides up to 4 parents (Par1 to Par4)
        for (let i = 1; i <= 4; i++) {
          const pName = row[`Par${i} Name`] ?? ''
          const pEmail = row[`Par${i} eMail`] ?? ''
          // Prefer Mobile over Home for the primary phone number
          const pPhone = row[`Par${i} Mobile`] || row[`Par${i} Home`] || ''
          
          if (pName || pEmail || pPhone) {
            parentContacts.push({ name: pName.trim(), email: pEmail.trim(), phone: pPhone.trim() })
          }
        }

        // Extract Academic/Schedule Scoping
        const rawSem = row['Semester'] ?? row['Sem'] ?? row['Schedule'] ?? ''
        const rawPeriod = row['Period'] ?? ''
        const rawSection = row['Section'] ?? row['Sec Section'] ?? ''
        
        // Smart detected year from Period/Section column pattern "2(Y25)"
        const detectedYear = extractYearFromPeriod(rawPeriod || rawSection)
        const year = row['Year'] ?? detectedYear ?? (activeClass.value?.year || currentSchoolYear.value)
        
        const periodNumber = (rawPeriod || rawSection) ? cleanPeriod(rawPeriod || rawSection) : (activeClass.value?.periodNumber || '1')
        const courseCode = row['Course Code'] ?? row['CourseCode'] ?? (rawSection ? extractCourseCode(rawSection) : '')
        const semester = normalizeSemester(rawSem || (activeClass.value?.semester || '1'))

        return { 
          studentId: studentId.trim(), 
          firstName: firstName.trim(), 
          lastName: lastName.trim(),
          parentContacts,
          studentEmail: studentEmail.trim(),
          custody: custody.trim(),
          livingWith: livingWith.trim(),
          birthDate: birthDate.trim(),
          semester,
          periodNumber,
          year,
          courseCode
        }
      })

      // Group students by class identifier
      const groups = {}
      for (const row of rows) {
          const key = `${row.year}-${row.semester}-P${row.periodNumber}`
          if (!groups[key]) {
              groups[key] = {
                  name: `Period ${row.periodNumber} — ${row.year}`,
                  year: row.year,
                  semester: row.semester,
                  periodNumber: row.periodNumber,
                  courseCode: row.courseCode,
                  students: [],
                  selected: true
              }
          }
          groups[key].students.push(row)
      }

      // --- Smart Heal: Detect and add new periods found in CSV ---
      const detectedPeriods = [...new Set(rows.map(r => Number(r.periodNumber)))].filter(p => !isNaN(p))
      const missingPeriods = detectedPeriods.filter(p => !periodOptions.value.includes(p))
      
      if (missingPeriods.length > 0) {
        const updated = { ...periodStartTimes.value }
        missingPeriods.forEach(p => {
          // Simple guess: 90 mins after previous or fallback
          const prev = p - 1
          const lastTime = updated[prev] || '08:00'
          const [h, m] = lastTime.split(':').map(Number)
          updated[p] = new Date(0, 0, 0, h, m + 80).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        })
        await updatePeriodStartTimes(updated)
        newPeriodsDetected.value = missingPeriods.sort((a, b) => a - b)
      } else {
        newPeriodsDetected.value = []
      }

      const groupKeys = Object.keys(groups)

      if (groupKeys.length > 1) {
          // Multiple classes detected, show bulk import dialog
          bulkImportGroups.value = groups
      } else {
          // Single class — requires an active class to import into
          if (!activeClass.value) {
            await alert('This CSV contains only one class group. Please select or create a class first, then re-import. Alternatively, make sure your CSV contains a "Period" or "Semester" column so the bulk importer can detect multiple classes.')
            return
          }
          const result = await importRoster(rows)
          importResult.value = result

          if (result.crossClassConflicts.length > 0) {
            _pendingConflicts       = result.crossClassConflicts
            crossClassConflicts.value = result.crossClassConflicts
          }
      }
    },
    error: (err) => {
      importResult.value = { error: err.message, inserted: 0, updated: 0, skipped: [], crossClassConflicts: [] }
    },
  })

  // Reset file input so the same file can be re-selected
  if (evt.target && evt.target.value !== undefined) {
    evt.target.value = ''
  }
}

// --- Bulk Import Selection Helpers ---

/**
 * Returns the bulk groups sorted and sectioned by semester then period,
 * ready for the template to render with headings.
 */
const bulkImportSemesters = computed(() => {
  if (!bulkImportGroups.value) return []
  
  // Keep REFERENCES to the original group objects (not copies) so that
  // v-model mutations on group.selected are visible to selectedBulkCount.
  // We attach the map key as a non-spread sibling property on a wrapper.
  const entries = Object.entries(bulkImportGroups.value).map(([key, group]) => ({ key, group }))
  
  // Collect unique semesters, sorted: 1 before 2 before Full
  const semOrder = (s) => s === 'Full' ? 99 : Number(s)
  const sems = [...new Set(entries.map(e => e.group.semester))].sort((a, b) => semOrder(a) - semOrder(b))
  
  return sems.map(sem => ({
    label: sem === 'Full' ? 'Full Year' : `Semester ${sem}`,
    groups: entries
      .filter(e => e.group.semester === sem)
      .sort((a, b) => Number(a.group.periodNumber) - Number(b.group.periodNumber))
  }))
})

const isAllSelected = computed(() => {
  if (!bulkImportGroups.value) return false
  const keys = Object.keys(bulkImportGroups.value)
  return keys.every(k => bulkImportGroups.value[k].selected)
})

const selectedBulkCount = computed(() => {
  if (!bulkImportGroups.value) return 0
  return Object.values(bulkImportGroups.value).filter(g => g.selected).length
})

function toggleAllBulk() {
  const target = !isAllSelected.value
  for (const k in bulkImportGroups.value) {
    bulkImportGroups.value[k].selected = target
  }
}

/** Unique semesters present in the current import, sorted. */
const bulkAvailableSemesters = computed(() => {
  if (!bulkImportGroups.value) return []
  const sems = new Set(Object.values(bulkImportGroups.value).map(g => g.semester))
  return [...sems].filter(s => s !== 'Full').sort((a, b) => Number(a) - Number(b))
})

/** True if every class in the given semester is currently selected. */
function isSemesterAllSelected(sem) {
  if (!bulkImportGroups.value) return false
  return Object.values(bulkImportGroups.value)
    .filter(g => g.semester === sem)
    .every(g => g.selected)
}

/** Toggle-select all classes for a specific semester, leaving others untouched. */
function selectSemesterBulk(sem) {
  const target = !isSemesterAllSelected(sem)
  for (const k in bulkImportGroups.value) {
    if (bulkImportGroups.value[k].semester === sem) {
      bulkImportGroups.value[k].selected = target
    }
  }
}

function isExistingClass(group) {
  return classList.value.some(c => 
    c.year === group.year && 
    c.semester === group.semester && 
    Number(c.periodNumber) === Number(group.periodNumber)
  )
}

async function confirmBulkImport() {
  const selectedGroups = Object.values(bulkImportGroups.value).filter(g => g.selected)
  if (selectedGroups.length === 0) return
  
  await bulkImportClasses(selectedGroups)
  bulkImportGroups.value = null
  importResult.value = { inserted: 'Multiple', updated: 'Classes', skipped: [] }
  await alert('Bulk import complete!')
}

const newStudent = reactive({ studentId: '', firstName: '', lastName: '', rfidTag: '' })
const singleAddError = ref('')
const singleAddSuccess = ref('')
const isEditingStudent = ref(false)
const isStudentModalOpen = ref(false)
const singleStudentCardRef = ref(null)

function openAddStudentModal() {
  isEditingStudent.value = false
  newStudent.studentId = ''
  newStudent.firstName = ''
  newStudent.lastName = ''
  newStudent.rfidTag = ''
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
  singleAddError.value = ''
  singleAddSuccess.value = ''
}

// --- Rapid RFID Enrollment ---
const isRapidRFIDOpen = ref(false)
const rapidRFIDIndex = ref(0)
const rapidRFIError = ref('')
const rapidRFIDSuccess = ref('')

const rapidRFIDList = computed(() => {
  return sortedRoster.value
})

const currentRapidStudent = computed(() => rapidRFIDList.value[rapidRFIDIndex.value])

const onRapidRFIDScan = async (hex) => {
  if (!isRapidRFIDOpen.value || !currentRapidStudent.value) return

  // Issue 9 fix: check duplicate across ALL classes, not just the current one
  const duplicate = classList.value
    .flatMap(c => Object.entries(c.students || {}).map(([sid, s]) => ({ ...s, studentId: sid, className: c.name })))
    .find(s => s.rfidTag?.toLowerCase() === hex.toLowerCase() && s.studentId !== currentRapidStudent.value.studentId)
  if (duplicate) {
    rapidRFIError.value = `Already linked to ${duplicate.firstName} ${duplicate.lastName}${duplicate.className !== activeClass.value?.name ? ` (${duplicate.className})` : ''}`
    playRapidBeep(true)
    return
  }

  // Update student
  try {
    await classService.patchStudent(activeClass.value.classId, currentRapidStudent.value.studentId, { rfidTag: hex.toUpperCase() })
    triggerActiveClass() // Refresh roster
    
    rapidRFIDSuccess.value = `Linked to ${currentRapidStudent.value.firstName}!`
    playRapidBeep(false)
    
    // Auto-advance
    setTimeout(async () => {
      rapidRFIDSuccess.value = ''
      rapidRFIError.value = ''
      
      let next = rapidRFIDIndex.value + 1
      if (next < rapidRFIDList.value.length) {
        rapidRFIDIndex.value = next
      } else {
        // End of list
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
  
  // Find first student without a tag
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

// --- RFID Enrollment logic ---
const isEnrollingRFID = ref(false)
const enrollTimer = ref(null)

const onRFIDEnroll = (hex) => {
  // Issue 9 fix: check duplicate across ALL classes, not just the active roster
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
  
  // Auto-timeout if no scan
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
    rfidTag: newStudent.rfidTag.trim(),
    parentContacts: []
  }

  try {
    const result = await importRoster([row])
    
    if (result.crossClassConflicts.length > 0) {
      // Defer to the existing conflict dialog
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
}

async function setGlobalDefaultGrid() {
  const settings = await settingsService.getSettings()
  await settingsService.saveSettings({ 
    ...settings, 
    gridSize: { rows: newGrid.rows, cols: newGrid.cols } 
  })
  await alert(`Saved ${newGrid.rows}x${newGrid.cols} as the default for future classes.`)
}

async function onArchiveStudent(student) {
  if (await confirm(`Are you sure you want to archive ${student.firstName} ${student.lastName}? They will be moved to the Unenrolled list.`)) {
    await archiveStudent(student.studentId)
  }
}

async function onUnarchiveStudent(student) {
  await unarchiveStudent(student.studentId)
}

async function onPermanentDeleteStudent(student) {
  if (!await confirm(
    `This will permanently delete ALL events, attendance, and grades for ${student.firstName} ${student.lastName} in this specific class (${activeClass.value?.name}). This cannot be undone.`,
    'Permanently Delete Student',
    { danger: true, requireText: student.studentId }
  )) return
  
  await permanentlyDeleteStudent(student.studentId)
}

function classNameById(classId) {
  return classList.value.find(c => c.classId === classId)?.name ?? classId
}

// ─── behavior code CRUD ───────────────────────────────────────────────────────

const editThresholds     = reactive({ washroomTripsPerWeek: 4, deviceIncidentsPerWeek: 3 })
const thresholdsSuccess  = ref('')

onMounted(async () => {
  const current = await settingsService.getThresholds()
  if (current) {
    editThresholds.washroomTripsPerWeek = current.washroomTripsPerWeek
    editThresholds.deviceIncidentsPerWeek = current.deviceIncidentsPerWeek
  }
})

async function saveThresholds() {
  await settingsService.saveThresholds({
    washroomTripsPerWeek: editThresholds.washroomTripsPerWeek,
    deviceIncidentsPerWeek: editThresholds.deviceIncidentsPerWeek
  })
  // Sync the reactive ref in useClassroom so UI updates immediately
  classroomThresholds.value.washroomTripsPerWeek = editThresholds.washroomTripsPerWeek
  classroomThresholds.value.deviceIncidentsPerWeek = editThresholds.deviceIncidentsPerWeek
  
  thresholdsSuccess.value = 'Saved!'
  setTimeout(() => { thresholdsSuccess.value = '' }, 1500)
}

const existingCategories = computed(() => {
  const cats = new Set(behaviorCodes.value.map(c => c.category))
  return Array.from(cats).sort()
})

const newCode = reactive({ codeKey: '', icon: '', label: '', category: '', type: 'standard', requiresNote: false, isTopLevel: false })

async function saveCode() {
  if (newCode.isTopLevel) {
    let pinnedCount = 0
    for (const code of behaviorCodes.value) {
      if (code.codeKey !== newCode.codeKey && code.isTopLevel) {
        pinnedCount++
      }
    }
    if (pinnedCount >= 6) {
      await alert('The main menu is full (Max 6 custom items). Please unpin an existing behavior first by editing it.')
      return
    }
  }

  await settingsService.saveBehaviorCode({ ...newCode })
  await reloadBehaviorCodes()
  Object.assign(newCode, { codeKey: '', icon: '', label: '', category: '', type: 'standard', requiresNote: false, isTopLevel: false })
}

function editCode(code) {
  Object.assign(newCode, { 
    codeKey: code.codeKey, 
    icon: code.icon, 
    label: code.label, 
    category: code.category, 
    type: code.type, 
    requiresNote: code.requiresNote,
    isTopLevel: code.isTopLevel || false
  })
}

async function deleteCode(codeKey) {
  const codeToDelete = behaviorCodes.value.find(c => c.codeKey === codeKey)
  const name = codeToDelete?.label ?? codeKey
  if (!await confirm(`Delete behavior code "${name}"? This will not affect past events, but will remove it from the radial menu.`)) return
  await settingsService.deleteBehaviorCode(codeKey)
  await reloadBehaviorCodes()
}

// ─── Gradebook logic ─────────────────────────────────────────────────────────

const categoryWeightTotal = computed(() => {
  if (!activeClass.value?.gradebookCategories) return 0
  return activeClass.value.gradebookCategories.reduce((sum, cat) => sum + (Number(cat.weight) || 0), 0)
})

const templates = ref([])
const newTemplateName = ref('')

let saveTimer = null
function debouncedSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveGradebookSettings(), 300)
}

watch(
  () => activeClass.value?.gradebookCategories,
  () => debouncedSave(),
  { deep: true }
)

watch(
  () => globalMilestones.value,
  () => debouncedSave(),
  { deep: true }
)

watch(
  () => activeClass.value?.gradebookUnits,
  () => debouncedSave(),
  { deep: true }
)

async function saveGradebookSettings() {
  if (!activeClass.value) return
  await classService.updateClass(activeClass.value.classId, {
    gradebookCategories: activeClass.value.gradebookCategories,
    gradebookUnits: activeClass.value.gradebookUnits,
    gradebookNotes: activeClass.value.gradebookNotes
  })
  triggerActiveClass()
  // Milestones are now global and saved to settings independently
  await settingsService.saveGlobalMilestones(JSON.parse(JSON.stringify(globalMilestones.value)))
}

async function addCategory() {
  if (!activeClass.value) return
  const newCat = {
    categoryId: crypto.randomUUID(),
    name: 'New Category',
    weight: 0
  }
  if (!activeClass.value.gradebookCategories) {
    activeClass.value.gradebookCategories = []
  }
  activeClass.value.gradebookCategories.push(newCat)
  await saveGradebookSettings()
}

async function moveCategory(index, direction) {
  if (!activeClass.value) return
  const cats = activeClass.value.gradebookCategories
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= cats.length) return

  // Swap elements
  const temp = cats[index]
  cats[index] = cats[newIndex]
  cats[newIndex] = temp

  await saveGradebookSettings()
}

async function moveUnit(index, direction) {
  if (!activeClass.value) return
  const units = activeClass.value.gradebookUnits
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= units.length) return

  // Swap elements
  const temp = units[index]
  units[index] = units[newIndex]
  units[newIndex] = temp

  await saveGradebookSettings()
}

async function onDeleteCategory(cat) {
  if (!activeClass.value) return
  
  // Check if assessment exist for this category
  const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  const inUse = assessments.some(a => a.categoryId === cat.categoryId)
  
  if (inUse) {
    await alert(`Cannot delete category "${cat.name}" because it has assessments assigned to it. Remove all assessments in this category first.`)
    return
  }

  if (!await confirm(`Delete category "${cat.name}"?`)) return

  if (activeClass.value.gradebookCategories.length <= 1) {
    await alert('At least one category is required.')
    return
  }

  activeClass.value.gradebookCategories = activeClass.value.gradebookCategories.filter(c => c.categoryId !== cat.categoryId)
  await saveGradebookSettings()
}

async function addUnit() {
  if (!activeClass.value) return
  const newUnit = {
    unitId: crypto.randomUUID(),
    name: 'New Unit'
  }
  if (!activeClass.value.gradebookUnits) {
    activeClass.value.gradebookUnits = []
  }
  activeClass.value.gradebookUnits.push(newUnit)
  await saveGradebookSettings()
}

async function onDeleteUnit(unitId) {
  if (!activeClass.value) return
  
  // Check if assessment exist for this unit
  const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  const unit = activeClass.value.gradebookUnits.find(u => u.unitId === unitId)
  const inUse = assessments.some(a => a.unitId === unitId)
  
  if (inUse) {
    await alert(`Cannot delete unit "${unit?.name || 'this unit'}" because it has assessments assigned to it. Remove all assessments in this unit before deleting.`)
    return
  }

  if (!await confirm(`Delete unit "${unit?.name || 'this unit'}"?`)) return

  activeClass.value.gradebookUnits = activeClass.value.gradebookUnits.filter(u => u.unitId !== unitId)
  await saveGradebookSettings()
}

const filteredMilestones = computed(() => {
  return globalMilestones.value.filter(m => !m.year || m.year === selectedYear.value)
})

async function addMilestone() {
  const newMs = {
    milestoneId: crypto.randomUUID(),
    name: 'New Milestone',
    date: new Date().toISOString().slice(0, 10),
    year: selectedYear.value
  }
  globalMilestones.value.push(newMs)
  await settingsService.saveGlobalMilestones(JSON.parse(JSON.stringify(globalMilestones.value)))
}

async function onDeleteMilestone(milestoneId) {
  const ms = globalMilestones.value.find(m => m.milestoneId === milestoneId)
  if (!await confirm(`Delete milestone "${ms?.name || 'this milestone'}"?`)) return
  globalMilestones.value = globalMilestones.value.filter(m => m.milestoneId !== milestoneId)
  await settingsService.saveGlobalMilestones(JSON.parse(JSON.stringify(globalMilestones.value)))
}

async function saveTemplate() {
  if (!activeClass.value || !newTemplateName.value.trim()) return
  
  // Check for uniqueness
  const existing = templates.value.some(t => t.name.toLowerCase() === newTemplateName.value.trim().toLowerCase())
  if (existing) {
    await alert('A template with this name already exists.')
    return
  }

  const template = await gradebookService.saveGradebookTemplate(newTemplateName.value.trim(), activeClass.value, globalMilestones.value)
  templates.value.push(template)
  newTemplateName.value = ''
}

async function onApplyTemplate(template) {
  if (!activeClass.value) return
  if (!await confirm('This will replace the current categories and milestones. Continue?')) return
  
  // Copy categories and milestones with new UUIDs (as per service implementation)
  // Actually, applying a template usually means we just overwrite the class record.
  // The service implementation for saveGradebookTemplate already generates new UUIDs for the template items.
  // When applying, we should probably do similar or just use what's in the template.
  
  const categories = template.categories.map(c => ({ ...c, categoryId: crypto.randomUUID() }))
  const milestones = template.milestones.map(m => ({ ...m, milestoneId: crypto.randomUUID() }))

  activeClass.value.gradebookCategories = categories
  globalMilestones.value = milestones
  
  await saveGradebookSettings()
}

async function onDeleteTemplate(templateId) {
  if (!await confirm('Delete this template?')) return
  await gradebookService.deleteGradebookTemplate(templateId)
  templates.value = templates.value.filter(t => t.templateId !== templateId)
}
// ─── Backup logic ─────────────────────────────────────────────────────────────

const backupMsg     = ref('')
const restoreMsg    = ref('')
const syncMsg       = ref('')
const importPreview = ref(null)
const isSyncLinked  = ref(false)
const isDraggingBackup = ref(false)

onMounted(async () => {
  const settings = await settingsService.getSettings()
  isSyncLinked.value = !!settings.backupFileHandle
  const ms = await settingsService.getGlobalMilestones()
  globalMilestones.value = ms
  templates.value = await gradebookService.getGradebookTemplates()

  // Ensure a class is selected if any exist
  if (!activeClass.value && classList.value.length > 0) {
    await switchToClass(classList.value[0].classId)
  }
})

async function linkBackupFile() {
  if (!window.showSaveFilePicker) {
    syncMsg.value = '❌ Quick Sync is not supported on this device/browser.'
    return
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'classroom-tracker-live-backup.json',
      types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }],
    })
    const settings = await settingsService.getSettings()
    await settingsService.saveSettings({ ...settings, backupFileHandle: handle })
    isSyncLinked.value = true
    syncMsg.value = '✅ Sync file linked successfully! You can now use Quick Sync.'
    window.dispatchEvent(new Event('backup-linked'))
  } catch (err) {
    if (err.name !== 'AbortError') syncMsg.value = `❌ Failed to link: ${err.message}`
  }
}

async function manualQuickSync() {
  syncMsg.value = 'Syncing...'
  const success = await eventService.quickSyncBackup()
  if (success) {
    syncMsg.value = `✅ Synced to linked file at ${new Date().toLocaleTimeString()}`
    setTimeout(() => { if (syncMsg.value.startsWith('✅')) syncMsg.value = '' }, 3000)
  } else {
    syncMsg.value = '❌ Sync failed. Permissions may have been denied or file moved.'
  }
}

async function doExport() {
  backupMsg.value = ''
  try {
    const data = await eventService.exportAllData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `class-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    backupMsg.value = '✅ Backup file downloaded.'
    setTimeout(() => backupMsg.value = '', 3000)
  } catch (err) {
    backupMsg.value = '❌ Export failed: ' + err.message
  }
}

function onBackupFileSelected(evt) {
  const file = evt.dataTransfer?.files?.[0] || evt.target?.files?.[0]
  if (!file) return
  restoreMsg.value = ''
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result)
      if (typeof data.schemaVersion !== 'number' || !data.classes || !data.events) {
        throw new Error('Invalid backup file format.')
      }
      importPreview.value = data
    } catch (err) {
      restoreMsg.value = '❌ Invalid backup file: ' + err.message
    }
  }
  reader.onerror = () => { restoreMsg.value = '❌ Failed to read file.' }
  reader.readAsText(file)
  if (evt.target && evt.target.value !== undefined) {
    evt.target.value = ''
  }
}

async function doImport() {
  if (!importPreview.value) return
  restoreMsg.value = ''
  try {
    const result = await eventService.importAllData(JSON.parse(JSON.stringify(importPreview.value)))
    
    // Auto-heal settings after import (e.g. add missing instructionalDays from older backups)
    await settingsService.auditSettingsIntegrity()
    
    importPreview.value = null
    restoreMsg.value = `✅ Restore complete — ${result.classCount} classes, ${result.eventCount} events. Data healed. Refreshing…`
    setTimeout(() => window.location.reload(), 1500)
  } catch (err) {
    importPreview.value = null
    restoreMsg.value = `❌ Restore failed: ${err.message}`
  }
}

async function onLinkSyncFolder() {
  await linkBackupFile()
}

async function onQuickSyncNow() {
  await manualQuickSync()
}

async function onClearAllData() {
  if (!await confirm(
    'This will permanently delete ALL classes, students, and events from this device. THIS ACTION IS IRREVERSIBLE.',
    'Clear All Application Data',
    { danger: true, requireText: 'ERASE' }
  )) return

  try {
    await classService.clearAllData()
    window.location.reload()
  } catch (err) {
    await alert('Failed to clear data: ' + err.message)
  }
}

async function handleExportExcel() {
  if (!activeClass.value) return
  
  try {
    // 1. Ensure we have the gradebook loaded for this class
    const record = await classService.getClass(activeClass.value.classId)
    if (!record) throw new Error('No class data found for this class.')
    
    // 2. Fetch all events for this class (no date filter for the "Master Export")
    const events = await eventService.getEventsByClass(activeClass.value.classId)
    
    // 3. Calculate grades (the aggregate data)
    const classGrades = await gradebookService.calculateClassGrades(activeClass.value)
    
    // 4. Get the student list (sorted) — include studentId since it is the map key, not a property
    const roster = Object.entries(record.students || {})
      .filter(([_, s]) => !s.archived)
      .map(([studentId, s]) => ({ studentId, ...s }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))

    // 5. Get assessments & grade map from DB
    const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
    const rawGrades = await gradebookService.getGradesByClass(activeClass.value.classId)
    
    // 6. Format gradeMap as { [assessmentId]: { [studentId]: score } } for exportService
    const gradeMap = {}
    rawGrades.forEach(g => {
      if (!gradeMap[g.assessmentId]) gradeMap[g.assessmentId] = {}
      
      // Calculate a flat score for the excel grid sheet (Step 11 refinement)
      const earned = gradebookService.resolveAttemptScore(g.attempts, 'highest') 
      gradeMap[g.assessmentId][g.studentId] = {
        ...g,
        score: earned
      }
    })

    // 7. Transform classGrades into the summary array required by exportService
    // Force summaryArray to only include our active roster
    const summaryArray = roster.map(student => {
      const studentId = student.studentId
      const summary = classGrades[studentId] || {}
      const studentEvents = events.filter(e => e.studentId === studentId && !e.superseded)
      const absences = studentEvents.filter(e => e.code === 'a').length
      const lates = studentEvents.filter(e => e.code === 'l').length

      return {
        ...summary,
        studentId,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        absences,
        lates
      }
    })

    // 8. Run the export
    await exportGradebookToExcel({
      className: activeClass.value.name,
      teacherName: teacherName.value,
      students: roster,
      assessments,
      gradeMap,
      summaryData: summaryArray,
      categories: record.gradebookCategories || []
    })
  } catch (err) {
    console.error('Excel Export Error:', err)
    await alert('Failed to export Excel: ' + err.message)
  }
}

function formatDate(iso) {
  if (!iso) return 'unknown date'
  return new Date(iso).toLocaleString()
}
</script>

<style scoped>
.setup {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
}

/* ── Tab strip ───────────────────────────────────────────────────── */
.setup__tabs {
  display:          flex;
  background:       var(--surface);
  box-shadow:       var(--shadow-sm);
  border-bottom:    1px solid var(--border);
  flex-shrink:      0;
}

.setup__tab {
  flex:           1;
  display:         flex;
  align-items:     center;
  justify-content: center;
  gap:             8px;
  padding:         12px 18px;
  border:          none;
  background:      transparent;
  color:           var(--text-secondary);
  font-size:       0.9rem;
  font-weight:     600;
  cursor:          pointer;
  border-bottom:   3px solid transparent;
  transition:      all 0.2s ease;
  white-space:     nowrap;
}

.setup__tab:hover {
  color:      var(--primary);
  background: var(--primary-light);
}

.setup__tab--active {
  color:         var(--primary);
  border-bottom: 3px solid var(--primary);
}

/* ── Panel ───────────────────────────────────────────────────────── */
.setup__panel {
  flex:           1;
  width:          100%;
  overflow-y:     auto; /* Scrollbar is here, at the edge */
  display:        flex;
  flex-direction: column;
}

.setup__panel-content {
  max-width:      1000px;
  margin:         0 auto;
  width:          100%;
  padding:        24px;
  display:        flex;
  flex-direction: column;
  gap:            24px;
}

.setup__section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: -8px;
}

/* ── Cards ───────────────────────────────────────────────────────── */
.setup__card {
  background:    var(--surface);
  padding:       24px;
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-sm);
  border:        1px solid var(--border);
  display:       flex;
  flex-direction: column;
  gap:           16px;
}

.setup__settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 8px;
}

@media (min-width: 768px) {
  .setup__settings-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.setup__settings-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .setup__settings-col--left {
    border-right: 1px solid var(--border);
    padding-right: 24px;
  }
}

/* ── Custom Switch Toggle ────────────────────────────────────────── */
.setup__switch-container {
  display: flex;
  align-items: center;
  gap: 12px;
  user-select: none;
}

.setup__switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.setup__switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.setup__switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: .2s ease;
  border-radius: 24px;
}

.setup__switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .2s ease;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.setup__switch input:checked + .setup__switch-slider {
  background-color: var(--primary);
}

.setup__switch input:checked + .setup__switch-slider:before {
  transform: translateX(20px);
}

.setup__switch-label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
}

/* ── Tooltip ────────────────────────────────────────────────────── */
.setup__tooltip-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
  color: var(--text-secondary);
}

.setup__tooltip-container:hover {
  color: var(--primary);
}

.setup__tooltip-text {
  visibility: hidden;
  width: 260px;
  background-color: #1c1c1e;
  color: #ffffff;
  text-align: left;
  border-radius: var(--radius-md);
  padding: 12px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  font-size: 0.78rem;
  line-height: 1.4;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
  
  /* Positioning */
  position: absolute;
  z-index: 100;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  
  /* Fade-in */
  opacity: 0;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.setup__tooltip-container:hover .setup__tooltip-text {
  visibility: visible;
  opacity: 1;
}

.setup__tooltip-text::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: var(--border) transparent transparent transparent;
}

.setup__card--accent {
  background:    var(--primary-light);
  border:        1px solid var(--primary);
  border-left:   6px solid var(--primary);
}

.setup__card-title {
  font-size:     1.1rem;
  font-weight:   700;
  color:         var(--text);
  margin-bottom: 4px;
  display:       flex;
  align-items:   center;
  gap:           10px;
}

.setup__card-subtitle {
  font-size:     0.85rem;
  font-weight:   700;
  color:         var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top:    8px;
}

.setup__hint {
  font-size: 0.82rem;
  color:     var(--text-secondary);
  line-height: 1.5;
}

.setup__hint code {
  background:    var(--bg-secondary);
  padding:       1px 5px;
  border-radius: var(--radius-sm);
  font-size:     0.8rem;
}

.setup__link-box {
  margin-top: 16px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setup__link-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.setup__link-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.setup__link-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.setup__empty {
  color:     var(--text-secondary);
  font-size: 0.9rem;
}

/* ── Class list ──────────────────────────────────────────────────── */
.setup__class-list {
  list-style: none;
  display:    flex;
  flex-direction: column;
  gap:        8px;
}

.setup__class-item {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         12px;
  border-radius:   var(--radius-md);
  background:      var(--bg-secondary);
  gap:             12px;
  min-height:      52px;
}

.setup__class-item--active {
  background: var(--primary-light);
}

.setup__class-name {
  font-size:   0.9rem;
  font-weight: 600;
  color:       var(--text);
}

/* Inline rename input — looks like text, gains border on focus */
.setup__class-name--edit {
  font-size:    0.9rem;
  font-weight:  600;
  color:        var(--text);
  background:   transparent;
  border:       none;
  border-bottom: 1px dashed var(--border);
  border-radius: 0;
  padding:      0;
  width:        100%;
  min-height:   auto;
  outline:      none;
  cursor:       text;
}

.setup__class-name--edit:hover {
  border-bottom-color: var(--primary);
}

.setup__class-name--edit:focus {
  border-bottom: 2px solid var(--primary);
}

.setup__class-meta {
  font-size: 0.75rem;
  color:     var(--text-secondary);
}

/* Actions group holding Switch + Archive buttons side by side */
.setup__class-actions {
  display:    flex;
  gap:        6px;
  flex-shrink: 0;
}

/* Danger (red) variant for Archive / Delete buttons */
.setup__pill-btn--danger {
  background:   rgba(255, 59, 48, 0.08);
  border-color: rgba(255, 59, 48, 0.3);
  color:        #ff3b30;
}

.setup__pill-btn--danger:hover:not(:disabled) {
  background:   rgba(255, 59, 48, 0.18);
  border-color: #ff3b30;
}

.setup__pill-btn--danger:disabled {
  opacity: 0.4;
  cursor:  not-allowed;
}

/* Archived section card */
.setup__card--archived {
  opacity: 0.9;
  border:  1px dashed var(--border);
}

.setup__archived-toggle {
  width:           100%;
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  background:      transparent;
  border:          none;
  font-size:       0.85rem;
  font-weight:     600;
  color:           var(--text-secondary);
  cursor:          pointer;
  padding:         4px 0;
}

.setup__archived-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.setup__archived-list {
  margin-top: 10px;
  opacity:    0.75;
}

.setup__class-item--archived {
  background: var(--bg-secondary);
  border:     1px dashed var(--border);
}

.setup__class-meta-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setup__class-settings {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup__label--inline {
  flex-direction: row !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 0.75rem !important;
}

.setup__card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.setup__card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.setup__card-header-row .setup__card-title {
  margin-bottom: 0;
}

.setup__btn-add-student {
  padding: 8px 16px !important;
  font-size: 0.85rem !important;
  height: 36px !important;
}

.student-modal-content {
  padding: 4px 0;
}

.student-modal-content .modal-footer {
  display: flex !important;
  flex-direction: row !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  margin-top: 24px !important;
}

.setup__input:disabled {
  background-color: var(--bg-hover) !important;
  color: var(--text-secondary) !important;
  cursor: not-allowed;
  opacity: 0.7;
  border-color: var(--border) !important;
}

.setup__show-all {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.setup__show-all:hover {
  background: var(--bg-hover);
}

.setup__input--sm {
  min-height: 32px !important;
  padding: 4px 8px !important;
  font-size: 0.8rem !important;
  width: auto !important;
}

/* ── Forms ───────────────────────────────────────────────────────── */
.setup__form--inline {
  display: grid;
  grid-template-columns: 1fr 2.5fr 2.5fr auto;
  align-items: center;
  gap: 8px;
}

.setup__form--inline .setup__input {
  width: 100% !important;
}

.setup__icon-btn {
  border:     none;
  background: transparent;
  color:      var(--text-secondary);
  cursor:     pointer;
  padding:    6px;
  border-radius: 50%;
  display:    flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.setup__icon-btn:hover {
  background: var(--bg-hover);
  color:      var(--text);
}
.setup__icon-btn--danger:hover {
  background: #fee2e2 !important; /* Red 100 */
  color:      #dc2626 !important; /* Red 600 */
}
.setup__icon-btn--warn {
  color: var(--accent-amber, hsl(38 95% 55%));
}
.setup__icon-btn--warn:hover {
  background: hsl(38 95% 55% / 0.12) !important;
  color: hsl(38 90% 45%) !important;
}

.setup__code-actions {
  display: flex;
  gap: 4px;
}

/* ── Error ───────────────────────────────────────────────────────── */
.setup__error {
  color:     var(--state-out);
  font-size: 0.82rem;
}

/* ── File upload ─────────────────────────────────────────────────── */
.setup__file-label {
  display:         flex;
  align-items:     center;
  gap:             8px;
  padding:         14px;
  border:          2px dashed var(--border);
  border-radius:   var(--radius-md);
  cursor:          pointer;
  font-size:       0.9rem;
  color:           var(--primary);
  font-weight:     600;
  min-height:      52px;
  transition:      border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.setup__file-label:not(.setup__file-label--disabled):hover {
  background:    var(--primary-light);
  border-color:  var(--primary);
}

.setup__file-label--drag {
  background:    var(--primary-light);
  border-color:  var(--primary);
  transform:     scale(1.02);
}

.setup__file-input {
  position: absolute;
  opacity:  0;
  width:    0;
  height:   0;
}

/* ── Import result ───────────────────────────────────────────────── */
.setup__import-result {
  padding:       12px;
  border-radius: var(--radius-md);
  background:    var(--bg-secondary);
  font-size:     0.85rem;
  display:       flex;
  flex-direction: column;
  gap:           6px;
}

.setup__result-ok   { color: var(--state-success); font-weight: 600; }
.setup__result-warn { color: var(--text-secondary); }

/* ── Roster list ─────────────────────────────────────────────────── */
.setup__roster-list {
  list-style: none;
  display:    flex;
  flex-direction: column;
  gap:        6px;
}

.setup__roster-item {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         6px 12px;
  border-radius:   var(--radius-sm);
  background:      var(--bg-secondary);
  gap:             12px;
}

.setup__roster-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.setup__roster-name {
  font-size:   0.88rem;
  font-weight: 600;
  color:       var(--text);
}

.setup__roster-id {
  font-size:  0.75rem;
  color:      var(--text-secondary);
  font-family: monospace;
}

.setup__roster-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.setup__seat-badge {
  padding:       3px 9px;
  border-radius: var(--radius-sm);
  font-size:     0.72rem;
  font-weight:   600;
  flex-shrink:   0;
}

.setup__seat-badge--seated {
  background: var(--primary-light);
  color:      var(--primary);
}

.setup__seat-badge--pool {
  background: var(--bg-secondary);
  color:      var(--state-neutral);
}

/* ── Code list ───────────────────────────────────────────────────── */
.setup__code-list {
  list-style: none;
  display:    flex;
  flex-direction: column;
  gap:        8px;
}

.setup__code-item {
  display:     flex;
  align-items: center;
  gap:         12px;
  padding:     10px 12px;
  background:  var(--bg-secondary);
  border-radius: var(--radius-md);
  min-height:  52px;
}

.setup__code-icon {
  font-size:  1.5rem;
  flex-shrink: 0;
}

.setup__code-info {
  display:        flex;
  flex-direction: column;
  flex:           1;
  gap:            2px;
}

.setup__code-key {
  font-size:   0.78rem;
  font-weight: 700;
  color:       var(--primary);
  font-family: monospace;
}

.setup__code-label {
  font-size:   0.9rem;
  font-weight: 600;
  color:       var(--text);
}

.setup__code-meta {
  font-size: 0.72rem;
  color:     var(--text-secondary);
}

.setup__code-note-badge {
  font-size:     0.68rem;
  font-weight:   600;
  color:         var(--primary);
  background:    var(--primary-light);
  border-radius: var(--radius-sm);
  padding:       2px 6px;
  width:         fit-content;
}


/* ── Dialog ──────────────────────────────────────────────────────── */
/* ── Header ─────────────────────────────────────────────────────── */
.setup__header {
  padding: 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.setup__header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.setup__back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary-light);
  color: var(--primary);
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.setup__back-btn:hover {
  background: var(--primary);
  color: white;
}

.setup__header-class {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setup__header-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.setup__class-selector {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 200px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.setup__class-selector:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.setup__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border);
  gap: 12px;
}

.setup__empty p {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
}

.setup__chip {
  background: var(--primary-light);
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.setup__total-weight {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--state-success);
}

.setup__total-weight--error {
  color: var(--state-danger);
}

.setup__error-msg {
  font-size: 0.75rem;
  color: var(--state-danger);
  margin-top: -8px;
}

.setup__gb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup__gb-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  gap: 12px;
}

.setup__gb-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setup__reorder-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  border-right: 1px solid var(--border);
  padding-right: 8px;
  margin-right: 4px;
}

.setup__weight-input {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.setup__input--naked {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  min-height: auto !important;
  font-weight: 600 !important;
}

.setup__input--weight {
  width: 50px !important;
  text-align: right;
  min-height: 32px !important;
  padding: 4px 8px !important;
}

.setup__input--date {
  min-height: 32px !important;
  padding: 4px 8px !important;
  font-size: 0.8rem !important;
}

.setup__textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.9rem;
  resize: vertical;
}

.setup__textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.setup__template-save {
  display: flex;
  gap: 8px;
}

.setup__template-save .setup__input {
  flex: 1;
}

.setup__template-apply {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup__card-subtitle {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.setup__tmpl-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.setup__btn--full {
  width: 100%;
}

.setup__gb-item--term {
  padding: 12px !important;
}

.setup__term-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.setup__term-row span {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.setup__input--xs {
  width: 90px !important;
  min-height: 32px !important;
  padding: 4px 8px !important;
  font-size: 0.8rem !important;
  text-align: center;
}

.setup__input--date {
  flex: 1;
}
.setup__dialog-box--large {
  max-width: 540px !important;
  max-height: calc(100vh - 48px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.setup__bulk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
}

.setup__bulk-section-heading {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  padding: 6px 4px 2px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
  margin-top: 4px;
  flex-shrink: 0;
}

.setup__bulk-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.setup__bulk-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setup__bulk-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-light);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
.setup__settings-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.setup__form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.setup__grid-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}
.setup__grid-actions .setup__btn-ghost {
  font-size: 0.85rem;
  padding: 8px 12px;
  color: var(--text-secondary);
}
.setup__grid-actions .setup__btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--primary);
}

.setup__period-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.setup__period-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setup__period-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.setup__period-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 28px;
}
.setup__bulk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.setup__bulk-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.setup__bulk-select-all {
  margin: 0 !important;
  font-weight: 700;
  color: var(--text);
}

.setup__bulk-sem-btn {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.setup__bulk-sem-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.setup__bulk-sem-btn--active {
  border-color: var(--primary);
  background: var(--primary);
  color: white;
}

.setup__bulk-summary {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.setup__bulk-item-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setup__badge {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.setup__badge--new {
  background: #e1f5fe;
  color: #0288d1;
}

.setup__badge--update {
  background: #fff3e0;
  color: #f57c00;
}

/* ── QR Codes Grid ───────────────────────────────────────────────── */
.setup__qr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px;
}

.setup__qr-grid--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.setup__qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}

.setup__qr-pulse {
  animation: setupPulse 1.5s infinite ease-in-out;
  color: var(--primary);
}

.setup__qr-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.setup__qr-img {
  width: 100%;
  aspect-ratio: 1;
  image-rendering: pixelated;
}

.setup__qr-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setup__qr-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}


.setup__dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

/* Print Overrides */
@media print {
  .app-shell, .app-nav, .print\:hidden, .setup__dialog-backdrop, .setup__dialog-header button:not(.setup__btn-primary) {
    display: none !important;
  }
  
  .setup__dialog {
    position: static !important;
    background: white !important;
  }
  
  .setup__dialog-box {
    box-shadow: none !important;
    border: none !important;
    width: 100% !important;
    max-width: none !important;
    padding: 0 !important;
  }

  .setup__qr-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 20px !important;
    max-height: none !important;
    overflow: visible !important;
  }

  .setup__qr-card {
    break-inside: avoid;
    border: 1px solid #eee !important;
  }
}

/* ── QR Print Grid (Credit Card Size) ────────────────────────────────── */
.setup__qr-print-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10mm;
  padding: 10mm;
  width: 100%;
}

.setup__qr-print-card {
  width: 85.6mm;
  height: 54mm;
  border: 1px solid #000;
  border-radius: 4mm;
  padding: 4mm;
  display: flex;
  flex-direction: row; /* Horizontal layout for credit card look */
  align-items: center;
  gap: 4mm;
  background: white;
  break-inside: avoid;
  page-break-inside: avoid;
  box-sizing: border-box;
}

.setup__qr-print-img {
  height: 100%;
  aspect-ratio: 1;
  image-rendering: pixelated;
}

.setup__qr-print-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.setup__qr-print-name {
  font-size: 14pt;
  font-weight: 700;
  color: #000;
  line-height: 1.2;
}

.setup__qr-print-header {
  display: none; /* Can add school/class info here if requested */
}

.setup__qr-print-class {
  font-size: 8pt;
  color: #666;
  margin-bottom: 2mm;
  display: block;
}

/* ── Data Health Audit Styles ────────────────────────────────────────── */
.setup__audit-results {
  margin-top: 1rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid var(--border);
}

.setup__audit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.92rem;
  padding: 4px 0;
}

.setup__audit-item--warn {
  color: var(--state-out);
  font-weight: 600;
}

.setup__audit-label {
  flex: 1;
  color: var(--text);
}

.setup__audit-value {
  font-weight: 800;
  min-width: 32px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  padding-right: 8px;
}

.setup__audit-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 400;
  max-width: 180px;
  line-height: 1.3;
}

.setup__result-ok {
  color: var(--state-success);
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.5rem;
}

.setup__category-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}

.setup__weight-total {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.setup__weight-total--under {
  color: #b45309; /* Deep Amber */
  font-weight: 700;
  background: #fef3c7; /* Amber 100 */
  border: 1px solid #fde68a;
}

.setup__weight-total--over {
  color: #b91c1c; /* Red 700 */
  font-weight: 700;
  background: #fee2e2; /* Red 100 */
  border: 1px solid #fecaca;
}

.setup__btn-text {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  text-decoration: underline;
  margin-left: auto;
}

.setup__audit-detail-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 1rem 1rem 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-sm);
}

.setup__audit-detail-list li {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}

.setup__audit-detail-list li:last-child {
  border-bottom: none;
}

/* ── RFID Enrollment Styles ───────────────────────────────────────── */
.setup__rfid-enroll-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  transition: all 0.2s ease;
}

.setup__rfid-enroll-box--active {
  border-color: var(--primary);
  background: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}

.setup__rfid-display {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.setup__rfid-hex {
  font-family: monospace;
  font-weight: 700;
  color: var(--text);
  font-size: 0.9rem;
}

.setup__rfid-empty {
  font-size: 0.85rem;
  font-style: italic;
  opacity: 0.6;
}

.setup__rfid-listening {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary);
  font-weight: 600;
  font-size: 0.85rem;
}

.setup__rfid-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: setup-spin 0.8s linear infinite;
}

@keyframes setup-spin {
  to { transform: rotate(360deg); }
}

.setup__btn-text--danger { color: var(--state-out) !important; }

/* ── Rapid RFID Linker ────────────────────────────────────────────── */
.rapid-rfid-linker {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rapid-rfid-active {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rapid-rfid-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.rapid-rfid-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
}

.rapid-rfid-id {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.rapid-rfid-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 100px;
  background: white;
  border: 1px solid var(--border);
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 200px;
  justify-content: center;
  transition: all 0.3s ease;
}

.rapid-rfid-status--error {
  color: var(--state-out);
  background: #fef2f2;
  border-color: #fca5a5;
}

.rapid-rfid-status--success {
  color: var(--state-success);
  background: #f0fdf4;
  border-color: #86efac;
}

.rapid-rfid-pulse {
  width: 12px;
  height: 12px;
  background: var(--primary);
  border-radius: 50%;
  animation: setupPulse 1.5s infinite ease-in-out;
}

.rapid-rfid-list-container {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.rapid-rfid-list-header {
  background: var(--bg-secondary);
  padding: 10px 16px;
  font-size: 0.8rem;
  font-weight: 700;
  border-bottom: 1px solid var(--border);
}

.rapid-rfid-list {
  max-height: 250px;
  overflow-y: auto;
}

.rapid-rfid-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.2s;
}

.rapid-rfid-item:hover {
  background: var(--bg-secondary);
}

.rapid-rfid-item:last-child {
  border-bottom: none;
}

.rapid-rfid-item--active {
  background: var(--primary-light) !important;
  border-left: 4px solid var(--primary);
}

.rapid-rfid-item--linked {
  opacity: 0.8;
}

.rapid-rfid-item-info {
  display: flex;
  flex-direction: column;
}

.rapid-rfid-item-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.rapid-rfid-tag-hex {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--primary);
  font-weight: 700;
}

.rapid-rfid-item-status {
  color: var(--state-success);
}

.rapid-rfid-mini-pulse {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: setupPulse 1.5s infinite ease-in-out;
}

@keyframes setupPulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.rapid-rfid-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}
</style>
