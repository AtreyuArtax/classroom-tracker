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
            <option v-if="classList.length === 0" value="">No Classes</option>
            <option v-for="cls in classList" :key="cls.classId" :value="cls.classId">
              {{ cls.name }} (P{{ cls.periodNumber }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── Page tabs ─────────────────────────────────────────────── -->
    <div class="setup__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="setup__tab"
        :class="{ 'setup__tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TAB A: Classes                                           -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="activeTab === 'classes'" class="setup__panel">

      <!-- Class list -->
      <div class="setup__card">
        <h2 class="setup__card-title">Your Classes</h2>
        <div v-if="classList.length === 0" class="setup__empty">No classes yet.</div>
        <ul class="setup__class-list">
          <li
            v-for="cls in classList"
            :key="cls.classId"
            class="setup__class-item"
            :class="{ 'setup__class-item--active': cls.classId === activeClass?.classId }"
          >
            <div>
              <!-- Editable name for active class, static text for others -->
              <input
                v-if="cls.classId === activeClass?.classId"
                type="text"
                :value="cls.name"
                class="setup__class-name setup__class-name--edit"
                :aria-label="`Rename class ${cls.name}`"
                @change="e => updateActiveClass({ name: e.target.value.trim() || cls.name })"
                @keydown.enter.prevent="e => e.target.blur()"
              />
              <div v-else class="setup__class-name">{{ cls.name }}</div>
            <div class="setup__class-meta-group">
              <div class="setup__class-meta">Period {{ cls.periodNumber }} · {{ studentCount(cls) }} students</div>
              <div v-if="cls.classId === activeClass?.classId" class="setup__class-settings">
                <label class="setup__label setup__label--inline">
                  Start Time
                  <input
                    type="time"
                    :value="cls.periodStartTime || '08:45'"
                    class="setup__input setup__input--sm"
                    @change="e => updateActiveClass({ periodStartTime: e.target.value })"
                  />
                </label>
              </div>
            </div>
          </div>
            <div class="setup__class-actions">
              <button class="setup__pill-btn" @click="switchToClass(cls.classId)">
                {{ cls.classId === activeClass?.classId ? 'Active' : 'Switch' }}
              </button>
              <button
                class="setup__pill-btn setup__pill-btn--danger"
                :disabled="cls.classId === activeClass?.classId && classList.length === 1"
                :title="cls.classId === activeClass?.classId ? 'Switch to another class first, or archive as sole class' : 'Archive class'"
                @click="onArchiveClass(cls.classId)"
              >
                Archive
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Archived Classes -->
      <div v-if="archivedClasses.length > 0" class="setup__card setup__card--archived">
        <button class="setup__archived-toggle" @click="showArchived = !showArchived">
          <span class="setup__archived-label"><Archive :size="16" /> Archived ({{ archivedClasses.length }})</span>
          <span class="setup__archived-chevron"><component :is="showArchived ? ChevronUp : ChevronDown" :size="16" /></span>
        </button>
        <ul v-if="showArchived" class="setup__class-list setup__archived-list">
          <li v-for="cls in archivedClasses" :key="cls.classId" class="setup__class-item setup__class-item--archived">
            <div>
              <div class="setup__class-name">{{ cls.name }}</div>
              <div class="setup__class-meta">Period {{ cls.periodNumber }} · {{ studentCount(cls) }} students</div>
            </div>
            <div class="setup__class-actions">
              <button class="setup__pill-btn" @click="onRestoreClass(cls.classId)">Restore</button>
              <button class="setup__pill-btn setup__pill-btn--danger" @click="onDeleteClass(cls.classId)">Delete</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Create new class -->
      <div class="setup__card">
        <h2 class="setup__card-title">Create New Class</h2>
        <form class="setup__form" @submit.prevent="createNewClass">
          <label class="setup__label">
            Class name
            <input v-model="newClass.name" class="setup__input" placeholder="e.g. Period 1 — Science" required />
          </label>
          <label class="setup__label">
            Period number
            <input v-model.number="newClass.periodNumber" type="number" min="1" max="10" class="setup__input" required />
          </label>
          <label class="setup__label">
            Period start time
            <input v-model="newClass.periodStartTime" type="time" class="setup__input" required />
          </label>
          <button type="submit" class="setup__btn-primary">Create Class</button>
        </form>
        <p v-if="classError" class="setup__error">{{ classError }}</p>
      </div>

      <!-- Grid resize -->
      <div class="setup__card">
        <h2 class="setup__card-title">Grid Size</h2>
        <p class="setup__hint">Current: {{ gridSize.rows }} rows × {{ gridSize.cols }} columns</p>
        <form class="setup__form" @submit.prevent="requestResize">
          <label class="setup__label">
            Rows (1–10)
            <input v-model.number="newGrid.rows" type="number" min="1" max="10" class="setup__input" required />
          </label>
          <label class="setup__label">
            Columns (1–10)
            <input v-model.number="newGrid.cols" type="number" min="1" max="10" class="setup__input" required />
          </label>
          <button type="submit" class="setup__btn-primary">Apply Grid Size</button>
        </form>

        <!-- Resize conflict dialog (§11) -->
        <div v-if="resizeConflict.length > 0" class="setup__dialog" role="dialog" aria-modal="true">
          <div class="setup__dialog-box">
            <h3 class="setup__dialog-title">⚠️ Students will be moved</h3>
            <p class="setup__dialog-body">The following seated students fall outside the new grid bounds and will be moved to the roster pool:</p>
            <ul class="setup__dialog-list">
              <li v-for="s in resizeConflict" :key="s.studentId">
                {{ s.firstName }} {{ s.lastName }} (seat {{ s.seat.row }},{{ s.seat.col }})
              </li>
            </ul>
            <div class="setup__dialog-actions">
              <button class="setup__btn-danger" @click="applyResize">Move to pool &amp; resize</button>
              <button class="setup__btn-ghost" @click="resizeConflict = []">Cancel</button>
            </div>
          </div>
          <div class="setup__dialog-backdrop" @click="resizeConflict = []" />
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TAB B: Roster                                            -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'roster'" class="setup__panel">

      <div class="setup__card">
        <h2 class="setup__card-title">Import Roster — {{ activeClass?.name ?? 'No class selected' }}</h2>
        <p class="setup__hint">
          Required CSV columns: <code>Student ID</code>, <code>First Name</code>, <code>Last Name</code>.
          Column order is flexible. Rows without a Student ID are skipped.
        </p>

        <label 
          class="setup__file-label" 
          for="roster-file"
          :class="{ 'setup__file-label--drag': isDraggingRoster }"
          @dragover.prevent="activeClass && (isDraggingRoster = true)"
          @dragleave.prevent="isDraggingRoster = false"
          @drop.prevent="isDraggingRoster = false; onFileSelected($event)"
        >
          <FolderOpen :size="16" /> {{ isDraggingRoster ? 'Drop CSV here...' : 'Choose CSV file or drag & drop here' }}
          <input
            id="roster-file"
            type="file"
            accept=".csv,text/csv"
            class="setup__file-input"
            :disabled="!activeClass"
            @change="onFileSelected"
          />
        </label>

        <!-- Import result summary -->
        <div v-if="importResult" class="setup__import-result">
          <p v-if="importResult.inserted" class="setup__result-ok">✅ {{ importResult.inserted }} students added.</p>
          <p v-if="importResult.updated"  class="setup__result-ok">🔄 {{ importResult.updated }} students updated.</p>
          <div v-if="importResult.skipped.length" class="setup__result-warn">
            <strong>⚠️ Skipped (missing Student ID):</strong>
            <ul>
              <li v-for="(row, i) in importResult.skipped" :key="i">Row {{ i + 2 }}</li>
            </ul>
          </div>
        </div>

        <!-- Cross-class conflicts -->
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

      <!-- Add / Edit single student -->
      <div class="setup__card" ref="singleStudentCardRef">
        <h2 class="setup__card-title">{{ isEditingStudent ? 'Edit Student' : 'Add Student Manually' }}</h2>
        <form class="setup__form" @submit.prevent="addSingleStudent">
          <label class="setup__label">
            Student ID
            <input v-model="newStudent.studentId" class="setup__input" placeholder="e.g. 123456" :disabled="!activeClass || isEditingStudent" required />
          </label>
          <div style="display: flex; gap: 10px;">
            <label class="setup__label" style="flex: 1;">
              First Name
              <input v-model="newStudent.firstName" class="setup__input" placeholder="First" :disabled="!activeClass" required />
            </label>
            <label class="setup__label" style="flex: 1;">
              Last Name
              <input v-model="newStudent.lastName" class="setup__input" placeholder="Last" :disabled="!activeClass" required />
            </label>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="submit" class="setup__btn-primary" :disabled="!activeClass" style="flex: 1;">
              {{ isEditingStudent ? 'Save Changes' : 'Add Student' }}
            </button>
            <button v-if="isEditingStudent" type="button" class="setup__btn-ghost" @click="cancelEditStudent" style="flex: 1;">
              Cancel
            </button>
          </div>
        </form>
        <p v-if="singleAddError" class="setup__error">{{ singleAddError }}</p>
        <p v-if="singleAddSuccess" class="setup__result-ok">{{ singleAddSuccess }}</p>
      </div>

      <!-- Current roster -->
      <div class="setup__card">
        <h2 class="setup__card-title">Current Roster</h2>
        <p class="setup__hint">{{ sortedRoster.length }} students · {{ unseatedStudents.length }} unassigned</p>
        <ul class="setup__roster-list">
          <li
            v-for="s in sortedRoster"
            :key="s.studentId"
            class="setup__roster-item"
          >
            <div>
              <span class="setup__roster-name">{{ s.lastName }}, {{ s.firstName }}</span>
              <span class="setup__roster-id">{{ s.studentId }}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="setup__seat-badge" :class="s.seat ? 'setup__seat-badge--seated' : 'setup__seat-badge--pool'">
                {{ s.seat ? `R${s.seat.row} C${s.seat.col}` : 'Pool' }}
              </span>
              <button class="setup__icon-btn" aria-label="Edit student" @click="onEditStudent(s)" title="Edit student name">
                <Pencil :size="16" />
              </button>
              <button class="setup__icon-btn" aria-label="Remove student" @click="onRemoveStudent(s)" style="color: #ff3b30;" title="Remove student from class">
                <Trash2 :size="16" />
              </button>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TAB C: Behavior Codes                                    -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'codes'" class="setup__panel">

      <div class="setup__card">
        <h2 class="setup__card-title">Behavior Thresholds</h2>
        <p class="setup__hint">These thresholds control when a warning dot appears on a student's desk tile.</p>
        <form class="setup__form" @submit.prevent="saveThresholds">
          <label class="setup__label">
            Washroom trips per week
            <input v-model.number="editThresholds.washroomTripsPerWeek" type="number" min="1" max="20" class="setup__input" required />
          </label>
          <label class="setup__label">
            Device incidents per week
            <input v-model.number="editThresholds.deviceIncidentsPerWeek" type="number" min="1" max="20" class="setup__input" required />
          </label>
          <button type="submit" class="setup__btn-primary">Save Thresholds</button>
        </form>
        <p v-if="thresholdsSuccess" class="setup__result-ok">{{ thresholdsSuccess }}</p>
      </div>

      <div class="setup__card">
        <h2 class="setup__card-title">Behavior Codes</h2>

        <ul class="setup__code-list">
          <li v-for="code in behaviorCodes" :key="code.codeKey" class="setup__code-item">
            <span class="setup__code-icon"><component :is="resolveIcon(code.icon)" :size="20" /></span>
            <div class="setup__code-info">
              <span class="setup__code-key">{{ code.codeKey }}</span>
              <span class="setup__code-label">{{ code.label }}</span>
              <span class="setup__code-meta">{{ code.category }} · {{ code.type }}</span>
              <span v-if="code.isTopLevel" class="setup__code-note-badge">📍 Pinned to Menu</span>
              <span v-if="code.requiresNote" class="setup__code-note-badge"><FileText :size="14" class="setup__note-icon" /> Note required</span>
            </div>
            <div class="setup__code-actions">
              <button class="setup__icon-btn" aria-label="Edit {{ code.label }}" @click="editCode(code)"><Pencil :size="16" /></button>
              <button class="setup__icon-btn" aria-label="Delete {{ code.label }}" @click="deleteCode(code.codeKey)"><Trash2 :size="18" /></button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Add / edit code form -->
      <div class="setup__card">
        <h2 class="setup__card-title">Add Behavior Code</h2>
        <form class="setup__form" @submit.prevent="saveCode">
          <label class="setup__label">
            Key (single letter)
            <input v-model="newCode.codeKey" class="setup__input" maxlength="4" placeholder="e.g. p" required />
          </label>
          <label class="setup__label">
            Icon (Lucide name)
            <input v-model="newCode.icon" class="setup__input" placeholder="e.g. Hand" required />
          </label>
          <label class="setup__label">
            Label
            <input v-model="newCode.label" class="setup__input" placeholder="Participation" required />
          </label>
          <label class="setup__label">
            Category (used for folder grouping)
            <input v-model="newCode.category" list="category-list" class="setup__input" placeholder="e.g. positive" required />
            <datalist id="category-list">
              <option v-for="cat in existingCategories" :key="cat" :value="cat" />
            </datalist>
          </label>
          <label class="setup__label">
            Type
            <select v-model="newCode.type" class="setup__input">
              <option value="standard">standard</option>
              <option value="toggle">toggle</option>
            </select>
          </label>
          <label class="setup__label setup__label--checkbox">
            <input type="checkbox" v-model="newCode.requiresNote" class="setup__checkbox" />
            Requires a note when tapped
          </label>
          <label class="setup__label setup__label--checkbox">
            <input type="checkbox" v-model="newCode.isTopLevel" class="setup__checkbox" />
            Pin to main menu (Top Level)
          </label>
          <button type="submit" class="setup__btn-primary">Save Code</button>
        </form>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TAB E: Gradebook                                           -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'gradebook'" class="setup__panel">
      <div v-if="!activeClass" class="setup__empty-state">
        <p>Select a class to manage its gradebook settings.</p>
      </div>
      <template v-else>
        <!-- Grading Method -->
        <div class="setup__card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 class="setup__card-title">Grading Method</h2>
            <span class="setup__chip">Traditional</span>
          </div>
          <p class="setup__hint" style="margin-top: -8px;">Standards-based grading coming soon.</p>
        </div>

        <!-- Categories -->
        <div class="setup__card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 class="setup__card-title">Categories</h2>
            <span :class="['setup__total-weight', { 'setup__total-weight--error': categoryWeightTotal !== 100 }]">
              Total: {{ categoryWeightTotal }}%
            </span>
          </div>
          <p v-if="categoryWeightTotal !== 100" class="setup__error-msg">Weights must total 100%.</p>
          
          <div class="setup__gb-list">
            <div v-for="cat in activeClass.gradebookCategories" :key="cat.categoryId" class="setup__gb-item">
              <input 
                v-model="cat.name" 
                class="setup__input setup__input--naked" 
                placeholder="Category Name"
              />
              <div class="setup__gb-actions">
                <div class="setup__weight-input">
                  <input 
                    v-model.number="cat.weight" 
                    type="number" 
                    min="0" 
                    max="100" 
                    class="setup__input setup__input--weight"
                  />
                  <span>%</span>
                </div>
                <button 
                  class="setup__icon-btn setup__icon-btn--danger" 
                  title="Delete Category"
                  @click="onDeleteCategory(cat)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
          <button class="setup__btn-ghost setup__btn--full" @click="addCategory">
            <Plus :size="16" /> Add Category
          </button>
        </div>

        <!-- Units -->
        <div class="setup__card">
          <h2 class="setup__card-title">Units</h2>
          <div class="setup__gb-list">
            <div v-for="unit in activeClass.gradebookUnits" :key="unit.unitId" class="setup__gb-item">
              <input 
                v-model="unit.name" 
                class="setup__input setup__input--naked" 
                placeholder="Unit Name"
              />
              <div class="setup__gb-actions">
                <button 
                  class="setup__icon-btn setup__icon-btn--danger" 
                  title="Delete Unit"
                  @click="onDeleteUnit(unit.unitId)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
          <button class="setup__btn-ghost setup__btn--full" @click="addUnit">
            <Plus :size="16" /> Add Unit
          </button>
        </div>

        <!-- Milestones -->
        <div class="setup__card">
          <h2 class="setup__card-title">Milestones</h2>
          <div class="setup__gb-list">
            <div v-for="ms in activeClass.gradebookMilestones" :key="ms.milestoneId" class="setup__gb-item">
              <input 
                v-model="ms.name" 
                class="setup__input setup__input--naked" 
                placeholder="Milestone Name"
              />
              <div class="setup__gb-actions">
                <input 
                  v-model="ms.date" 
                  type="date" 
                  class="setup__input setup__input--date"
                />
                <button 
                  class="setup__icon-btn setup__icon-btn--danger" 
                  title="Delete Milestone"
                  @click="onDeleteMilestone(ms.milestoneId)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
          <button class="setup__btn-ghost setup__btn--full" @click="addMilestone">
            <Plus :size="16" /> Add Milestone
          </button>
        </div>

        <!-- Gradebook Notes -->
        <div class="setup__card">
          <h2 class="setup__card-title">Gradebook Notes</h2>
          <textarea 
            v-model="activeClass.gradebookNotes" 
            class="setup__textarea" 
            placeholder="Notes about grading decisions for this class..."
            @blur="saveGradebookSettings"
          ></textarea>
        </div>

        <!-- Templates -->
        <div class="setup__card">
          <h2 class="setup__card-title">Template Management</h2>
          
          <div class="setup__template-save">
            <input v-model="newTemplateName" class="setup__input" placeholder="Template Name" />
            <button class="setup__btn-primary" :disabled="!newTemplateName.trim()" @click="saveTemplate">
              Save Current as Template
            </button>
          </div>

          <div v-if="templates.length > 0" class="setup__template-apply">
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
      </template>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TAB D: Data Backup                                         -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'backup'" class="setup__panel">
      <!-- Live Quick Sync -->
      <div class="setup__card">
        <h2 class="setup__card-title">Live Quick Sync</h2>
        <p class="setup__hint">
          Link a JSON file in your local cloud drive (like OneDrive/Google Drive). Once linked, you can Quick Sync directly to it with one click.
        </p>
        <div style="display: flex; gap: 8px;">
          <button class="setup__btn-primary" @click="linkBackupFile">
            <Database :size="16" style="margin-right: 4px;" /> Link Sync File
          </button>
          <button class="setup__btn-ghost" @click="manualQuickSync" :disabled="!isSyncLinked">
            Quick Sync Now
          </button>
        </div>
        <p v-if="syncMsg" class="setup__msg" :class="{ 'setup__result-ok': syncMsg.startsWith('✅'), 'setup__error': syncMsg.startsWith('❌') }">{{ syncMsg }}</p>
      </div>

      <!-- Manual Backup -->
      <div class="setup__card">
        <h2 class="setup__card-title">Manual Export Backup</h2>
        <p class="setup__hint">Downloads all classes, students, and events as a single JSON file. No data leaves your device.</p>
        <button class="setup__btn-primary" @click="doExport">
          <Download :size="16" style="margin-right: 4px;" /> Download Backup
        </button>
        <p v-if="backupMsg" class="setup__msg">{{ backupMsg }}</p>
      </div>

      <!-- Restore from Backup -->
      <div class="setup__card">
        <h2 class="setup__card-title">Restore from Backup</h2>
        <p class="setup__hint" style="color: var(--state-danger);">⚠️ This will <strong>overwrite all existing data</strong>. A summary will be shown before anything is written.</p>
        <label 
          class="setup__file-label" 
          for="backup-file"
          :class="{ 'setup__file-label--drag': isDraggingBackup }"
          @dragover.prevent="isDraggingBackup = true"
          @dragleave.prevent="isDraggingBackup = false"
          @drop.prevent="isDraggingBackup = false; onBackupFileSelected($event)"
        >
          <FolderOpen :size="16" style="margin-right: 4px;" /> {{ isDraggingBackup ? 'Drop Backup JSON here...' : 'Choose backup JSON or drag & drop here' }}
          <input id="backup-file" type="file" accept=".json,application/json" class="setup__file-input" @change="onBackupFileSelected" />
        </label>

        <!-- Preview Dialog -->
        <div v-if="importPreview" class="setup__dialog" role="dialog" aria-modal="true">
          <div class="setup__dialog-box">
            <h3 class="setup__dialog-title">Confirm Restore</h3>
            <p class="setup__dialog-body">
              This backup was created on <strong>{{ formatDate(importPreview.exportedAt) }}</strong> and contains:
            </p>
            <ul class="setup__dialog-list" style="margin-left: 1rem; margin-top: 0.5rem; margin-bottom: 1rem; color: var(--text-secondary);">
              <li>{{ importPreview.classes?.length ?? 0 }} classes</li>
              <li>{{ importPreview.events?.length ?? 0 }} events</li>
            </ul>
            <p class="setup__dialog-warn" style="color: var(--state-danger); margin-bottom: 1rem; font-weight: 500;">
              All current data will be overwritten. This cannot be undone.
            </p>
            <div class="setup__dialog-actions">
              <button class="setup__btn-danger" @click="doImport">Restore Now</button>
              <button class="setup__btn-ghost" @click="importPreview = null">Cancel</button>
            </div>
          </div>
          <div class="setup__dialog-backdrop" @click="importPreview = null" />
        </div>
        <p v-if="restoreMsg" class="setup__msg" :class="{ 'setup__result-ok': restoreMsg.startsWith('✅'), 'setup__error': restoreMsg.startsWith('❌') }">{{ restoreMsg }}</p>
      </div>
    </section>

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

import { ref, reactive, computed, onMounted, watch } from 'vue'
import Papa from 'papaparse'
import { Archive, ChevronDown, ChevronUp, FolderOpen, Trash2, FileText, Pencil, Download, Database, Cloud, Settings2, Plus, X, Save, FileUp, FileDown, GraduationCap, ArrowLeft } from 'lucide-vue-next'
import { resolveIcon }       from '../utils/icons.js'
import { useClassroom }      from '../composables/useClassroom.js'
import * as eventService       from '../db/eventService.js'
import * as settingsService  from '../db/settingsService.js'
import * as classService     from '../db/classService.js'
import * as gradebookService from '../db/gradebookService.js'

const {
  classList,
  archivedClasses,
  activeClass,
  students,
  thresholds: classroomThresholds,
  behaviorCodes,
  gridSize,
  sortedRoster,
  unseatedStudents,
  switchClass,
  createClass,
  importRoster,
  moveStudentFromClass,
  removeStudent,
  checkResize,
  confirmResize,
  updateActiveClass,
  archiveClass,
  restoreClass,
  deleteClass,
  reloadBehaviorCodes,
} = useClassroom()

const showArchived = ref(false)

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

const tabs = [
  { id: 'classes', label: 'Classes' },
  { id: 'roster',  label: 'Roster'  },
  { id: 'codes',   label: 'Behavior Codes' },
  { id: 'gradebook', label: 'Gradebook' },
  { id: 'backup',  label: 'Data Backup' },
]
const activeTab = ref(props.tab)

watch(() => props.tab, (newTab) => {
  if (newTab) activeTab.value = newTab
})

// ─── class management ─────────────────────────────────────────────────────────

const newClass  = reactive({ name: '', periodNumber: 1, periodStartTime: '08:45' })
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
  const classId = `class_${Date.now()}`
  await createClass({
    classId: classId,
    name: newClass.name.trim(),
    periodNumber: newClass.periodNumber,
    periodStartTime: newClass.periodStartTime
  })
  newClass.name = ''
  newClass.periodNumber = 1
  newClass.periodStartTime = '08:45'
}

// ─── grid resize (§11) ────────────────────────────────────────────────────────

const newGrid        = reactive({ rows: 6, cols: 6 })
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
let   _pendingConflicts   = []
const isDraggingRoster    = ref(false)

function onFileSelected(evt) {
  const file = evt.dataTransfer?.files?.[0] || evt.target?.files?.[0]
  if (!file) return
  if (!activeClass.value) return

  // CLAUDE.md §6: Use papaparse — never split(',')
  Papa.parse(file, {
    header:         true,
    skipEmptyLines: true,
    complete: async (results) => {
      // Map header columns flexibly
      const rows = results.data.map(row => {
        // Support common header variants
        const studentId = row['Student ID'] ?? row['StudentID'] ?? row['student_id'] ?? ''
        const firstName = row['First Name'] ?? row['FirstName'] ?? row['first_name'] ?? ''
        const lastName  = row['Last Name']  ?? row['LastName']  ?? row['last_name']  ?? ''
        return { studentId: studentId.trim(), firstName: firstName.trim(), lastName: lastName.trim() }
      })

      const result = await importRoster(rows)
      importResult.value = result

      if (result.crossClassConflicts.length > 0) {
        _pendingConflicts       = result.crossClassConflicts
        crossClassConflicts.value = result.crossClassConflicts
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
    lastName: newStudent.lastName.trim()
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
  () => activeClass.value?.gradebookMilestones,
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
    gradebookMilestones: activeClass.value.gradebookMilestones,
    gradebookNotes: activeClass.value.gradebookNotes
  })
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

async function onDeleteCategory(cat) {
  if (!activeClass.value) return
  
  // Check if assessment exist for this category
  const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  const inUse = assessments.some(a => a.categoryId === cat.categoryId)
  
  if (inUse) {
    window.alert(`Cannot delete category "${cat.name}" because it has assessments assigned to it. Remove all assessments in this category first.`)
    return
  }

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
  const inUse = assessments.some(a => a.unit === unit?.name)
  
  if (inUse) {
    window.alert(`Cannot delete unit "${unit?.name || 'this unit'}" because it has assessments assigned to it. Remove all assessments in this unit before deleting.`)
    return
  }

  activeClass.value.gradebookUnits = activeClass.value.gradebookUnits.filter(u => u.unitId !== unitId)
  await saveGradebookSettings()
}

async function addMilestone() {
  if (!activeClass.value) return
  const newMs = {
    milestoneId: crypto.randomUUID(),
    name: 'Milestone',
    date: new Date().toISOString().slice(0, 10)
  }
  if (!activeClass.value.gradebookMilestones) {
    activeClass.value.gradebookMilestones = []
  }
  activeClass.value.gradebookMilestones.push(newMs)
  await saveGradebookSettings()
}

async function onDeleteMilestone(milestoneId) {
  if (!activeClass.value) return
  activeClass.value.gradebookMilestones = activeClass.value.gradebookMilestones.filter(m => m.milestoneId !== milestoneId)
  await saveGradebookSettings()
}

async function saveTemplate() {
  if (!activeClass.value || !newTemplateName.value.trim()) return
  
  // Check for uniqueness
  const existing = templates.value.some(t => t.name.toLowerCase() === newTemplateName.value.trim().toLowerCase())
  if (existing) {
    window.alert('A template with this name already exists.')
    return
  }

  const template = await gradebookService.saveGradebookTemplate(newTemplateName.value.trim(), activeClass.value)
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
  activeClass.value.gradebookMilestones = milestones
  
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
  flex:        1;
  padding:     12px 8px;
  border:      none;
  background:  transparent;
  font-size:   0.85rem;
  font-weight: 500;
  color:       var(--text-secondary);
  cursor:      pointer;
  min-height:  44px;
  border-bottom: 2px solid transparent;
  transition:  color 0.15s ease, border-color 0.15s ease;
}

.setup__tab--active {
  color:         var(--primary);
  font-weight:   700;
  border-bottom: 2px solid var(--primary);
}

/* ── Panel ───────────────────────────────────────────────────────── */
.setup__panel {
  flex:       1;
  overflow-y: auto;
  padding:    16px;
  display:    flex;
  flex-direction: column;
  gap:        16px;
}

/* ── Cards ───────────────────────────────────────────────────────── */
.setup__card {
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-sm);
  padding:       16px;
  display:       flex;
  flex-direction: column;
  gap:           12px;
}

.setup__card-title {
  font-size:   1rem;
  font-weight: 700;
  color:       var(--text);
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

.setup__input--sm {
  min-height: 32px !important;
  padding: 4px 8px !important;
  font-size: 0.8rem !important;
  width: auto !important;
}

/* ── Forms ───────────────────────────────────────────────────────── */
.setup__form {
  display:        flex;
  flex-direction: column;
  gap:            10px;
}

.setup__label {
  display:        flex;
  flex-direction: column;
  gap:            4px;
  font-size:      0.82rem;
  font-weight:    600;
  color:          var(--text-secondary);
}

.setup__input {
  padding:       10px 12px;
  border:        1px solid var(--border);
  border-radius: var(--radius-sm);
  background:    var(--bg-secondary);
  min-height:    44px;
  font-size:     0.9rem;
  color:         var(--text);
  transition:    border-color 0.15s ease;
}

.setup__input:focus {
  outline:      none;
  border-color: var(--primary);
}

/* ── Buttons ─────────────────────────────────────────────────────── */
.setup__btn-primary {
  padding:       12px 20px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--primary);
  color:         #fff;
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
  transition:    opacity 0.15s ease;
}
.setup__btn-primary:active { opacity: 0.8; }

.setup__btn-danger {
  padding:       12px 20px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--state-out);
  color:         #fff;
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
}

.setup__btn-ghost {
  padding:       12px 20px;
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  background:    transparent;
  color:         var(--text-secondary);
  font-size:     0.9rem;
  cursor:        pointer;
  min-height:    44px;
}

.setup__pill-btn {
  padding:       6px 14px;
  border:        none;
  border-radius: var(--radius-sm);
  background:    var(--primary);
  color:         #fff;
  font-size:     0.78rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    36px;
  white-space:   nowrap;
  flex-shrink:   0;
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
  max-height: 320px;
  overflow-y: auto;
}

.setup__roster-item {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         10px 12px;
  border-radius:   var(--radius-sm);
  background:      var(--bg-secondary);
  gap:             12px;
}

.setup__roster-name {
  font-size:   0.88rem;
  font-weight: 600;
  color:       var(--text);
}

.setup__roster-id {
  display:    block;
  font-size:  0.72rem;
  color:      var(--text-secondary);
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

/* Checkbox label row in Add Code form */
.setup__label--checkbox {
  flex-direction: row !important;
  align-items:    center !important;
  gap:            8px !important;
  font-size:      0.82rem !important;
  font-weight:    500 !important;
  color:          var(--text) !important;
  cursor:         pointer;
}

.setup__checkbox {
  width:  18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Dialog ──────────────────────────────────────────────────────── */
.setup__dialog {
  position: fixed;
  inset:    0;
  z-index:  900;
  display:  flex;
  align-items: center;
  justify-content: center;
}

.setup__dialog-backdrop {
  position: absolute;
  inset:    0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}

.setup__dialog-box {
  position:      relative;
  z-index:       1;
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-md);
  padding:       24px;
  max-width:     360px;
  width:         90%;
  display:       flex;
  flex-direction: column;
  gap:           12px;
}

.setup__dialog-title {
  font-size:   1.05rem;
  font-weight: 700;
  color:       var(--text);
}

.setup__dialog-body {
  font-size:   0.88rem;
  color:       var(--text-secondary);
  line-height: 1.5;
}

.setup__dialog-list {
  padding-left: 16px;
  font-size:    0.85rem;
  color:        var(--text);
  display:      flex;
  flex-direction: column;
  gap:          4px;
}

.setup__dialog-actions {
  display:   flex;
  gap:       10px;
  flex-wrap: wrap;
  margin-top: 4px;
}
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

.setup__empty-state {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border);
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
  gap: 8px;
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

.setup__icon-btn--danger {
  color: var(--state-out) !important;
}

.setup__icon-btn--danger:hover {
  background: rgba(255, 59, 48, 0.1) !important;
}
</style>
