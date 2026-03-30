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
            <div class="setup__form-grid">
              <label class="setup__label">
                Term (from Calendar)
                <select v-model="newClassTermKey" class="setup__input" required>
                  <option v-for="t in academicTerms" :key="t.year + t.semester" :value="t.year + '|' + t.semester">
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
                  :value="activeClass.name"
                  class="setup__input"
                  @change="e => updateActiveClass({ name: e.target.value.trim() || activeClass.name })"
                />
              </label>
              <label class="setup__label">
                Academic Term
                <select
                  :value="activeClass.year + '|' + activeClass.semester"
                  class="setup__input"
                  @change="e => {
                    const [y, s] = e.target.value.split('|');
                    updateActiveClass({ year: y, semester: s });
                  }"
                >
                  <option v-for="t in academicTerms" :key="t.year + t.semester" :value="t.year + '|' + t.semester">
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
                  :value="activeClass.periodStartTime || '08:45'"
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
          </div>
          
          <!-- Manual Add -->
          <form class="setup__form setup__form--inline" @submit.prevent="addSingleStudent">
            <input v-model="newStudent.studentId" class="setup__input" placeholder="ID" required />
            <input v-model="newStudent.firstName" class="setup__input" placeholder="First Name" required />
            <input v-model="newStudent.lastName" class="setup__input" placeholder="Last Name" required />
            <button type="submit" class="setup__btn-primary">Add</button>
          </form>

          <!-- Roster List -->
          <ul class="setup__roster-list" style="margin-top: 1rem;">
            <li v-for="s in sortedRoster" :key="s.studentId" class="setup__roster-item">
              <div class="setup__roster-info">
                <span class="setup__roster-name">{{ s.lastName }}, {{ s.firstName }}</span>
                <span class="setup__roster-id">{{ s.studentId }}</span>
              </div>
              <div class="setup__roster-actions">
                <button class="setup__icon-btn" @click="onEditStudent(s)" title="Edit"><Pencil :size="14" /></button>
                <button class="setup__icon-btn setup__icon-btn--danger" @click="onRemoveStudent(s)" title="Remove"><Trash2 :size="14" /></button>
              </div>
            </li>
          </ul>
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
              <input v-model="cat.name" class="setup__input setup__input--naked" />
              <div class="setup__gb-actions">
                <input v-model.number="cat.weight" type="number" class="setup__input setup__input--weight" /><span>%</span>
                <button class="setup__icon-btn" :disabled="idx === 0" @click="moveCategory(idx, -1)"><ChevronUp :size="16" /></button>
                <button class="setup__icon-btn" :disabled="idx === activeClass.gradebookCategories.length - 1" @click="moveCategory(idx, 1)"><ChevronDown :size="16" /></button>
                <button class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteCategory(cat)"><Trash2 :size="14" /></button>
              </div>
            </div>
          </div>
          <button class="setup__btn-ghost setup__btn--full" @click="addCategory"><Plus :size="14" /> Add Category</button>

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
            <input :value="teacherName" class="setup__input" placeholder="" @change="e => updateTeacherName(e.target.value)" />
          </label>
        </div>

        <!-- School Calendar -->
        <div class="setup__card">
          <h2 class="setup__card-title">School Calendar</h2>
          <p class="setup__hint">Define semester date boundaries to enable automated class setup and historical tracking.</p>
          <div class="setup__gb-list">
            <div v-for="(term, idx) in academicTerms" :key="idx" class="setup__gb-item setup__gb-item--term">
              <div class="setup__term-row">
                <input v-model="term.year" class="setup__input setup__input--sm" placeholder="e.g. 2025-26" @change="saveTerms" />
                <select v-model="term.semester" class="setup__input setup__input--xs" @change="saveTerms">
                  <option value="1">Sem 1</option>
                  <option value="2">Sem 2</option>
                  <option value="Full">Full</option>
                </select>
                <input v-model="term.startDate" type="date" class="setup__input" @change="saveTerms" />
                <span>—</span>
                <input v-model="term.endDate" type="date" class="setup__input" @change="saveTerms" />
              </div>
              <button class="setup__icon-btn setup__icon-btn--danger" @click="removeTerm(idx)"><Trash2 :size="16" /></button>
            </div>
          </div>
          <p class="setup__hint" style="margin-top: 8px; font-style: italic;">
            Use the <b>2025-26</b> format for Year to match auto-detection from board CSVs.
          </p>
          <button class="setup__btn-ghost setup__btn--full" @click="addTerm"><Plus :size="14" /> Add Term</button>
        </div>

        <!-- Milestones (Moved from Class settings) -->
        <div class="setup__card">
          <h2 class="setup__card-title">Academic Milestones ({{ selectedYear }})</h2>
          <p class="setup__hint">Define key dates (e.g., Progress Reports) that apply to all classes for the current year.</p>
          <div v-if="filteredMilestones.length === 0" class="setup__empty">No milestones for this year.</div>
          <div class="setup__gb-list">
            <div v-for="ms in filteredMilestones" :key="ms.milestoneId" class="setup__gb-item">
              <input v-model="ms.name" class="setup__input setup__input--naked" placeholder="Milestone Name" @change="debouncedSave" />
              <div class="setup__gb-actions">
                <input v-model="ms.date" type="date" class="setup__input setup__input--date" @change="debouncedSave" />
                <button class="setup__icon-btn setup__icon-btn--danger" title="Delete Milestone" @click="onDeleteMilestone(ms.milestoneId)">
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
          <button class="setup__btn-ghost setup__btn--full" @click="addMilestone">
            <Plus :size="14" /> Add Milestone
          </button>
        </div>

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
          <div v-for="p in [1,2,3,4,5,6,7,8]" :key="p" class="setup__period-row">
            <span class="setup__period-label">Period {{ p }}</span>
            <input 
              v-model="periodStartTimes[p]" 
              type="time" 
              class="setup__input" 
              @change="updatePeriodStartTimes({...periodStartTimes})" 
            />
          </div>
        </div>
      </div>

      <!-- Data Engine (Moved to Data Tab) -->
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
import { Archive, ChevronDown, ChevronUp, FolderOpen, Trash2, FileText, Pencil, Download, Database, Cloud, Settings2, Plus, X, Save, FileUp, FileDown, GraduationCap, ArrowLeft, Zap, LayoutDashboard, Settings, QrCode, Printer, RefreshCcw, FileSpreadsheet, DatabaseIcon, AlertTriangle } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { exportGradebookToExcel } from '../db/exportService.js'
import { resolveIcon } from '../utils/icons.js'
import { useClassroom } from '../composables/useClassroom.js'
import { hasUnsyncedChanges, isSyncActive, getLastSyncedAt } from '../db/eventService.js'
import * as eventService from '../db/eventService.js'
import * as settingsService from '../db/settingsService.js'
import * as classService from '../db/classService.js'
import * as gradebookService from '../db/gradebookService.js'
import { globalMilestones, refreshGrades } from '../composables/useGradebook.js'
import PrintClassListModal from '../components/PrintClassListModal.vue'

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
  checkResize,
  confirmResize,
  updateTeacherName,
  updatePeriodStartTimes,
  bulkImportClasses
} = useClassroom()

const isUnsynced = eventService.hasUnsyncedChanges
const academicTerms = ref([])
const isArchivedPanelVisible = ref(false)
const showAllSessions = ref(false)

// --- QR Generation State ---
const isQRModalOpen = ref(false)
const qrCodes = ref([]) // Array of { studentId, name, qrUrl }
const isGeneratingQRs = ref(false)
const isSystemPrinting = ref(false)

// --- Print List State ---
const isPrintListModalOpen = ref(false)
const classToPrint = ref(null)

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
    const [terms, ms, tpls, settings] = await Promise.all([
      settingsService.getAcademicTerms(),
      settingsService.getGlobalMilestones(),
      gradebookService.getGradebookTemplates(),
      settingsService.getSettings()
    ])
    
    academicTerms.value = terms
    globalMilestones.value = ms
    templates.value = tpls
    isSyncLinked.value = await isSyncActive()

    // Set smart defaults for the term dropdown based on active header session
    if (selectedYear.value && selectedSemester.value) {
      newClassTermKey.value = `${selectedYear.value}|${selectedSemester.value}`
    } else if (academicTerms.value.length > 0) {
      const cur = currentSchoolYear.value
      // Try to find current term, else default to first
      const found = academicTerms.value.find(t => t.year === cur) || academicTerms.value[0]
      newClassTermKey.value = `${found.year}|${found.semester}`
    } else {
      // Fallback if no terms defined yet
      newClass.year = currentSchoolYear.value
      newClass.semester = '1'
    }

    // Ensure a class is selected if any exist
    if (!activeClass.value && classList.value.length > 0) {
      await switchToClass(classList.value[0].classId)
    }
})

// --- Standardized Options ---
const semesterOptions = ['1', '2']
const periodOptions = ['1', '2', '3', '4', '5', '6', '7', '8']

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

// --- Smart CSV Cleaning Helpers ---
function cleanPeriod(raw) {
  if (!raw) return '1'
  // Detect pattern "2(Y25)" -> extract "2"
  const match = raw.toString().match(/^(\d+)/)
  return match ? match[1] : raw.toString()
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

const addTerm = () => {
    academicTerms.value.push({ year: '', semester: '1', startDate: '', endDate: '' })
}

const removeTerm = async (index) => {
    const term = academicTerms.value[index]
    const label = term ? `${term.year} Sem ${term.semester}` : 'this term'
    if (!window.confirm(`Are you sure you want to remove the academic term "${label}"?`)) return
    academicTerms.value.splice(index, 1)
    await saveTerms()
}

const saveTerms = async () => {
    await settingsService.saveAcademicTerms(JSON.parse(JSON.stringify(academicTerms.value)))
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
  if (!window.confirm(`Permanently delete "${name}"? This cannot be undone. Event history will be retained.`)) return
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
  { id: 'manage', label: 'Class Manager',  icon: LayoutDashboard },
  { id: 'active', label: 'Class Settings', icon: Zap },
  { id: 'app',    label: 'App Settings',   icon: Settings },
  { id: 'data',   label: 'Data',           icon: Database },
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
  periodNumber: 1, 
  periodStartTime: '08:45',
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
    periodNumber: newClass.periodNumber,
    periodStartTime: newClass.periodStartTime,
    year: newClass.year,
    semester: newClass.semester
  })
  
  // Reset
  newClass.name = ''
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
        const rawPeriod = row['Period'] ?? row['Section'] ?? ''
        
        // Smart detected year from Period column pattern "2(Y25)"
        const detectedYear = extractYearFromPeriod(rawPeriod)
        const year = row['Year'] ?? detectedYear ?? (activeClass.value?.year || currentSchoolYear.value)
        
        const periodNumber = rawPeriod ? cleanPeriod(rawPeriod) : (activeClass.value?.periodNumber || '1')
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
          year
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
                  students: [],
                  selected: true
              }
          }
          groups[key].students.push(row)
      }

      const groupKeys = Object.keys(groups)

      if (groupKeys.length > 1) {
          // Multiple classes detected, show bulk import dialog
          bulkImportGroups.value = groups
      } else {
          // Single class — requires an active class to import into
          if (!activeClass.value) {
            alert('This CSV contains only one class group. Please select or create a class first, then re-import. Alternatively, make sure your CSV contains a "Period" or "Semester" column so the bulk importer can detect multiple classes.')
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
  window.alert('Bulk import complete!')
}

const newStudent = reactive({ studentId: '', firstName: '', lastName: '' })
const singleAddError = ref('')
const singleAddSuccess = ref('')
const isEditingStudent = ref(false)
const singleStudentCardRef = ref(null)

function onEditStudent(student) {
  isEditingStudent.value = true
  newStudent.studentId = student.studentId
  newStudent.firstName = student.firstName
  newStudent.lastName = student.lastName
  singleAddError.value = ''
  singleAddSuccess.value = ''
  
  if (singleStudentCardRef.value) {
    singleStudentCardRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function cancelEditStudent() {
  isEditingStudent.value = false
  newStudent.studentId = ''
  newStudent.firstName = ''
  newStudent.lastName = ''
  singleAddError.value = ''
  singleAddSuccess.value = ''
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
      newStudent.studentId = ''
      newStudent.firstName = ''
      newStudent.lastName = ''
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
  window.alert(`Saved ${newGrid.rows}x${newGrid.cols} as the default for future classes.`)
}

async function onRemoveStudent(student) {
  if (window.confirm(`Are you sure you want to remove ${student.firstName} ${student.lastName} from this class? This will not delete their past events.`)) {
    await removeStudent(student.studentId)
  }
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
      window.alert('The main menu is full (Max 6 custom items). Please unpin an existing behavior first by editing it.')
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
  if (!window.confirm(`Delete behavior code "${name}"? This will not affect past events, but will remove it from the radial menu.`)) return
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
    window.alert(`Cannot delete category "${cat.name}" because it has assessments assigned to it. Remove all assessments in this category first.`)
    return
  }

  if (!window.confirm(`Delete category "${cat.name}"?`)) return

  if (activeClass.value.gradebookCategories.length <= 1) {
    window.alert('At least one category is required.')
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
    window.alert(`Cannot delete unit "${unit?.name || 'this unit'}" because it has assessments assigned to it. Remove all assessments in this unit before deleting.`)
    return
  }

  if (!window.confirm(`Delete unit "${unit?.name || 'this unit'}"?`)) return

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
  if (!window.confirm(`Delete milestone "${ms?.name || 'this milestone'}"?`)) return
  globalMilestones.value = globalMilestones.value.filter(m => m.milestoneId !== milestoneId)
  await settingsService.saveGlobalMilestones(JSON.parse(JSON.stringify(globalMilestones.value)))
}

async function saveTemplate() {
  if (!activeClass.value || !newTemplateName.value.trim()) return
  
  // Check for uniqueness
  const existing = templates.value.some(t => t.name.toLowerCase() === newTemplateName.value.trim().toLowerCase())
  if (existing) {
    window.alert('A template with this name already exists.')
    return
  }

  const template = await gradebookService.saveGradebookTemplate(newTemplateName.value.trim(), activeClass.value, globalMilestones.value)
  templates.value.push(template)
  newTemplateName.value = ''
}

async function onApplyTemplate(template) {
  if (!activeClass.value) return
  if (!window.confirm('This will replace the current categories and milestones. Continue?')) return
  
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
  if (!window.confirm('Delete this template?')) return
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
    importPreview.value = null
    restoreMsg.value = `✅ Restore complete — ${result.classCount} classes, ${result.eventCount} events. Refreshing…`
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
  if (!window.confirm('WARNING: This will permanently delete ALL classes, students, and events from this device. Are you absolutely sure?')) return
  if (!window.confirm('FINAL CONFIRMATION: You are about to erase the entire database. This cannot be undone unless you have a backup file. Proceed?')) return
  
  try {
    await classService.clearAllData()
    window.location.reload()
  } catch (err) {
    alert('Failed to clear data: ' + err.message)
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
    
    // 4. Get the student list (sorted)
    const roster = Object.values(record.students || {}).sort((a, b) => 
      a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
    )

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
    const summaryArray = Object.entries(classGrades).map(([studentId, summary]) => {
      const student = record.students[studentId] || {}
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
      summaryData: summaryArray
    })
  } catch (err) {
    console.error('Excel Export Error:', err)
    alert('Failed to export Excel: ' + err.message)
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

.setup__card-header-row .setup__card-title {
  margin-bottom: 0;
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
  background: var(--bg-secondary);
  color:      var(--text);
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
  width: 60px !important;
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

.setup__input--xs {
  width: 70px !important;
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
</style>
