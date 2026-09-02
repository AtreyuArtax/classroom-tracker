<template>
  <div v-if="modelValue" class="eim-overlay" @click.self="onClose">
    <div class="eim-modal">
      <!-- Header -->
      <div class="eim-header">
        <div class="eim-header__title">
          <BookOpen :size="20" class="eim-header__icon" />
          <h3>Import Expectations into {{ targetSubjectName || 'Subject' }}</h3>
        </div>
        <button class="eim-close-btn" @click="onClose" title="Close">
          <X :size="18" />
        </button>
      </div>

      <!-- Tabs Navigation -->
      <div class="eim-tabs">
        <button 
          :class="['eim-tab', activeTab === 'presets' ? 'eim-tab--active' : '']" 
          @click="activeTab = 'presets'"
        >
          Curriculum Presets Library
        </button>
        <button 
          :class="['eim-tab', activeTab === 'paste' ? 'eim-tab--active' : '']" 
          @click="activeTab = 'paste'"
        >
          Bulk Paste / CSV / JSON
        </button>
        <button 
          :class="['eim-tab', activeTab === 'ai' ? 'eim-tab--active' : '']" 
          @click="activeTab = 'ai'"
        >
          <Sparkles :size="14" style="margin-right: 4px; display: inline-block; vertical-align: -2px; color: #a855f7;" /> AI Prompts &amp; Templates
        </button>
      </div>

      <!-- Body Content -->
      <div class="eim-body">
        <!-- TAB 1: PRESET CURRICULUM LIBRARY -->
        <div v-if="activeTab === 'presets'" class="eim-section">
          
          <!-- Filter Controls Stack -->
          <div class="eim-filter-stack">
            <!-- Row 1: Panel Segmented Control & Search -->
            <div class="eim-filter-toolbar">
              <div class="eim-segmented-control">
                <button 
                  type="button"
                  :class="['eim-seg-btn', panelFilter === 'elementary' ? 'eim-seg-btn--active' : '']"
                  @click="setPanelFilter('elementary')"
                >
                  Elementary (Grades 1–8)
                </button>
                <button 
                  type="button"
                  :class="['eim-seg-btn', panelFilter === 'secondary' ? 'eim-seg-btn--active' : '']"
                  @click="setPanelFilter('secondary')"
                >
                  Secondary (Grades 9–12)
                </button>
                <button 
                  type="button"
                  :class="['eim-seg-btn', panelFilter === 'all' ? 'eim-seg-btn--active' : '']"
                  @click="setPanelFilter('all')"
                >
                  All Presets
                </button>
              </div>

              <div class="eim-search-box">
                <Search :size="14" class="eim-search-icon" />
                <input 
                  v-model="searchQuery" 
                  type="text" 
                  class="eim-search-input" 
                  placeholder="Search preset, subject, code..." 
                />
                <button v-if="searchQuery" type="button" class="eim-search-clear" @click="searchQuery = ''" title="Clear search">
                  <X :size="12" />
                </button>
              </div>
            </div>

            <!-- Row 2: Grade Level Pills -->
            <div v-if="availableGrades.length > 0" class="eim-pills-row">
              <span class="eim-pills-label">Grade:</span>
              <div class="eim-pills-list">
                <button 
                  type="button"
                  :class="['eim-pill', gradeFilter === 'all' ? 'eim-pill--active' : '']"
                  @click="gradeFilter = 'all'"
                >
                  All Grades
                </button>
                <button 
                  v-for="g in availableGrades" 
                  :key="g"
                  type="button"
                  :class="['eim-pill', gradeFilter === g ? 'eim-pill--active' : '']"
                  @click="gradeFilter = g"
                >
                  {{ g }}
                </button>
              </div>
            </div>

            <!-- Row 3: Subject Category Pills -->
            <div class="eim-pills-row">
              <span class="eim-pills-label">Subject:</span>
              <div class="eim-pills-list">
                <button 
                  v-for="cat in availableSubjectCategories"
                  :key="cat.id"
                  type="button"
                  :class="['eim-pill', subjectFilter === cat.id ? 'eim-pill--active' : '']"
                  @click="subjectFilter = cat.id"
                >
                  {{ cat.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Selector Header & View Toggle -->
          <div class="eim-selector-header">
            <div class="eim-selector-count">
              <strong>{{ filteredPresets.length }}</strong> {{ filteredPresets.length === 1 ? 'preset' : 'presets' }} available
              <span v-if="gradeFilter !== 'all' || subjectFilter !== 'all' || searchQuery" class="eim-active-filter-badge">
                (filtered)
              </span>
            </div>
            <button 
              v-if="gradeFilter !== 'all' || subjectFilter !== 'all' || searchQuery" 
              type="button" 
              class="eim-action-link"
              @click="resetAllFilters"
            >
              Reset Filters
            </button>
          </div>

          <!-- Preset Cards Grid Selector -->
          <div v-if="filteredPresets.length > 0" class="eim-preset-grid">
            <div 
              v-for="p in filteredPresets" 
              :key="p.presetId"
              :class="['eim-preset-card', selectedPresetId === p.presetId ? 'eim-preset-card--selected' : '']"
              @click="selectedPresetId = p.presetId"
            >
              <div class="eim-preset-card__header">
                <div class="eim-preset-card__badges">
                  <span class="eim-preset-badge eim-preset-badge--grade">{{ p.grade }}</span>
                  <span v-if="p.subjectCode" class="eim-preset-badge eim-preset-badge--code">{{ p.subjectCode }}</span>
                  <span v-if="p.isSuccessCriteria" class="eim-preset-badge eim-preset-badge--sc">Success Criteria</span>
                </div>
                <span v-if="selectedPresetId === p.presetId" class="eim-preset-card__check">
                  <Check :size="14" /> Selected
                </span>
              </div>
              <h4 class="eim-preset-card__title">{{ p.title }}</h4>
              <div class="eim-preset-card__footer">
                <span>{{ p.strands ? p.strands.length : 0 }} Strands</span>
                <span>•</span>
                <span>{{ countPresetExpectations(p) }} Expectations</span>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="eim-presets-empty">
            <Filter :size="32" class="eim-empty-icon" />
            <p>No curriculum presets match your current filter criteria.</p>
            <button type="button" class="eim-btn eim-btn--secondary" @click="resetAllFilters">
              Clear All Filters
            </button>
          </div>

          <!-- Preset Details & Mode Selection -->
          <div v-if="selectedPreset" class="eim-preset-preview">
            <div class="eim-preset-summary">
              <strong>{{ (effectivePresetToUse || selectedPreset).title }}</strong> contains {{ totalPresetExpectations }} expectations across {{ (effectivePresetToUse || selectedPreset).strands ? (effectivePresetToUse || selectedPreset).strands.length : 0 }} strands.
            </div>

            <div v-if="granularity === 'success_criteria'" class="eim-preset-info-banner" style="background: rgba(147, 51, 234, 0.08); border-color: rgba(147, 51, 234, 0.25); color: #9333ea;">
              <Zap :size="16" class="eim-info-icon" />
              <span v-if="effectivePresetToUse?.isSuccessCriteria">Loaded Success Criteria ("I Can..." statements) for {{ effectivePresetToUse.subjectCode || effectivePresetToUse.title }}.</span>
              <span v-else>Success Criteria preset file not yet available for this course; using standard expectations.</span>
            </div>

            <div class="eim-field">
              <label class="eim-label">Granularity (Expectation Level)</label>
              <div class="eim-radio-group eim-radio-group--row">
                <label class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="granularity" value="overall" />
                  <span><strong>Overall Expectations Only</strong> (Streamlined ~10-15 per course)</span>
                </label>
                <label class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="granularity" value="all" />
                  <span><strong>Specific Expectations Only</strong> (Full Detail ~40-60 per course)</span>
                </label>
                <label v-if="hasSuccessCriteriaAvailable" class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="granularity" value="success_criteria" />
                  <span><strong>Success Criteria ("I Can..." Statements)</strong> (Student-friendly outcomes)</span>
                </label>
              </div>
            </div>

            <div class="eim-field">
              <label class="eim-label">Import Action</label>
              <div class="eim-radio-group eim-radio-group--row">
                <label class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="importBehavior" value="replace" />
                  <span><strong>Replace existing expectations</strong> (Resets previous list)</span>
                </label>
                <label class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="importBehavior" value="append" />
                  <span><strong>Append to existing expectations</strong></span>
                </label>
              </div>
            </div>

            <!-- ELEMENTARY: Auto-organizes into strands -->
            <template v-if="classType === 'elementary'">
              <div class="eim-preset-info-banner">
                <Zap :size="16" class="eim-info-icon" />
                <span>Importing this preset will automatically organize expectations into their respective curriculum strands/units.</span>
              </div>
            </template>

            <!-- SECONDARY: Unit picker + expectation checklist -->
            <template v-else>
              <div class="eim-secondary-import">
                <div class="eim-field">
                  <label class="eim-label">Target Unit</label>
                  <select v-model="targetUnitChoice" class="eim-select">
                    <option value="auto">-- Auto-Create Units from Preset Strands --</option>
                    <option value="new">-- Create Single New Unit --</option>
                    <option v-for="u in existingUnits" :key="u.unitId" :value="u.unitId">
                      Attach to: {{ u.name }}
                    </option>
                  </select>
                </div>

                <div v-if="targetUnitChoice === 'auto'" class="eim-preset-info-banner" style="margin-top: 10px;">
                  <Zap :size="16" class="eim-info-icon" />
                  <span>Importing this preset will automatically create units based on the curriculum strands and populate them with expectations.</span>
                </div>

                <div v-if="targetUnitChoice === 'new'" class="eim-field">
                  <label class="eim-label">New Unit Name</label>
                  <input v-model="newUnitName" type="text" class="eim-input" placeholder="e.g. Space & Earth Systems" />
                </div>

                <!-- Checklist of expectations -->
                <div v-if="targetUnitChoice !== 'auto'" class="eim-checklist-section">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <label class="eim-label">Select Expectations to Import</label>
                    <div class="eim-checklist-actions">
                      <button type="button" class="eim-action-link" @click="selectAllGlobal">Select All</button>
                      <span class="eim-action-separator">|</span>
                      <button type="button" class="eim-action-link" @click="deselectAllGlobal">Deselect All</button>
                    </div>
                  </div>
                  
                  <div class="eim-checklist">
                    <div v-for="strand in (effectivePresetToUse?.strands || selectedPreset.strands)" :key="strand.name" class="eim-checklist-strand">
                      <div class="eim-strand-header">
                        <h5 class="eim-strand-name">{{ strand.name }}</h5>
                        <button 
                          type="button" 
                          class="eim-action-link eim-action-link--small" 
                          @click="toggleStrandSelection(strand)"
                        >
                          {{ isStrandFullySelected(strand) ? 'Deselect Strand' : 'Select Strand' }}
                        </button>
                      </div>
                      <label 
                        v-for="exp in getStrandExpectations(strand)" 
                        :key="exp.code" 
                        :class="['eim-checkbox-item', exp.isOverall ? 'eim-checkbox-item--overall' : 'eim-checkbox-item--specific']"
                      >
                        <input 
                          type="checkbox" 
                          :value="exp" 
                          v-model="selectedExpectations" 
                        />
                        <span>
                          <strong :class="{ 'eim-code-overall': exp.isOverall }">{{ exp.code }}:</strong> 
                          {{ exp.description }}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- TAB 2: BULK PASTE / CSV IMPORTER -->
        <div v-if="activeTab === 'paste'" class="eim-section">
          <!-- Format Helper & Sample Inserters -->
          <div class="eim-format-guide-card">
            <div class="eim-guide-header">
              <div class="eim-guide-title">
                <FileSpreadsheet :size="16" class="eim-guide-icon" />
                <span>Bulk Import Format Guide &amp; Sample Templates</span>
              </div>
              <button 
                type="button" 
                class="eim-action-link eim-action-link--small"
                @click="downloadSampleCsv"
                title="Download ready-to-use CSV template"
              >
                <Download :size="13" /> Download Sample CSV
              </button>
            </div>
            
            <p class="eim-hint" style="margin-top: 4px;">
              Paste rows copied from Excel, Google Sheets, Word, or PDF, or upload a CSV file. Classroom Tracker automatically detects your format!
            </p>

            <div class="eim-sample-buttons-row">
              <span class="eim-sample-buttons-label">Insert Sample:</span>
              <div class="eim-sample-buttons-list">
                <button type="button" class="eim-sample-btn" @click="loadSampleFormat('pipe')">
                  Pipe (<code>A1.1 | Desc</code>)
                </button>
                <button type="button" class="eim-sample-btn" @click="loadSampleFormat('colon')">
                  Colon (<code>B2.1: Desc</code>)
                </button>
                <button type="button" class="eim-sample-btn" @click="loadSampleFormat('tab')">
                  Excel / Tab (<code>Code	Desc</code>)
                </button>
                <button type="button" class="eim-sample-btn" @click="loadSampleFormat('three_column')">
                  3-Col (<code>Strand | Code | Desc</code>)
                </button>
                <button type="button" class="eim-sample-btn" @click="loadSampleFormat('csv')">
                  CSV (<code>"Code","Desc"</code>)
                </button>
              </div>
            </div>
            <div class="eim-ai-shortcut-banner">
              <Sparkles :size="14" class="eim-ai-shortcut-icon" />
              <span>
                Want to create expectations for a new course with AI? 
                <button type="button" class="eim-inline-link" @click="activeTab = 'ai'">
                  View AI Prompts &amp; JSON Templates &rarr;
                </button>
              </span>
            </div>
          </div>

          <!-- File Upload Dropzone -->
          <div 
            class="eim-dropzone" 
            :class="{ 'eim-dropzone--active': pasteDragOver }"
            @dragover.prevent="pasteDragOver = true"
            @dragleave.prevent="pasteDragOver = false"
            @drop.prevent="handleFileDrop"
            @click="triggerFileInput"
          >
            <input 
              ref="fileInputRef" 
              type="file" 
              accept=".csv,.tsv,.txt,.json" 
              style="display: none;" 
              @change="handleFileSelect" 
            />
            <UploadCloud :size="22" class="eim-dropzone-icon" />
            <div class="eim-dropzone-text">
              <strong>Click to upload</strong> or drag and drop a <code>.json</code>, <code>.csv</code>, <code>.tsv</code>, or <code>.txt</code> file
            </div>
          </div>

          <!-- Target Unit & Import Behavior Stack -->
          <div class="eim-paste-controls-row">
            <div class="eim-field" style="flex: 1;">
              <label class="eim-label">Target Unit / Strand</label>
              <select v-model="targetUnitChoice" class="eim-select">
                <option v-if="hasParsedStrands" value="auto-strands">-- Auto-Create Units from Parsed Strands --</option>
                <option value="new">-- Create New Unit --</option>
                <option v-for="u in existingUnits" :key="u.unitId" :value="u.unitId">
                  Attach to: {{ u.name }}
                </option>
              </select>
            </div>

            <div v-if="targetUnitChoice === 'new'" class="eim-field" style="flex: 1;">
              <label class="eim-label">New Unit Name</label>
              <input v-model="newUnitName" type="text" class="eim-input" placeholder="e.g. Unit 1: Chemistry" />
            </div>

            <div class="eim-field" style="width: 220px;">
              <label class="eim-label">Import Behavior</label>
              <select v-model="importBehavior" class="eim-select">
                <option value="replace">Replace Existing</option>
                <option value="append">Append to Existing</option>
              </select>
            </div>
          </div>

          <!-- Raw Textarea Input -->
          <div class="eim-field">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label class="eim-label">Paste Raw Expectations Text</label>
              <button v-if="pasteRawText" type="button" class="eim-action-link eim-action-link--small" @click="pasteRawText = ''">
                Clear Text
              </button>
            </div>
            <textarea 
              v-model="pasteRawText" 
              class="eim-textarea" 
              rows="5" 
              placeholder="Paste rows here, e.g.:&#10;A1.1 | Apply scientific processes and research skills&#10;A1.2 | Apply engineering design processes&#10;B1.1 | Assess impacts of human activities on matter"
            ></textarea>
          </div>

          <!-- Live Interactive & Editable Preview Table -->
          <div v-if="parsedPasteList.length > 0" class="eim-preview-table-container">
            <div class="eim-preview-header">
              <div class="eim-preview-summary">
                <CheckCircle2 :size="16" class="eim-preview-success-icon" />
                <span>
                  <strong>{{ parsedPasteList.length }}</strong> expectation{{ parsedPasteList.length !== 1 ? 's' : '' }} ready to import
                </span>
                <span v-if="duplicateCodes.size > 0" class="eim-preview-duplicate-warning">
                  <AlertTriangle :size="13" /> {{ duplicateCodes.size }} duplicate code{{ duplicateCodes.size !== 1 ? 's' : '' }} detected
                </span>
                <span v-if="hasParsedStrands" class="eim-preview-strand-badge">
                  {{ uniqueParsedStrands.length }} Strands Detected
                </span>
              </div>
              <span class="eim-preview-edit-hint">💡 Click any cell below to edit before importing</span>
            </div>

            <div class="eim-table-scroll-wrapper">
              <table class="eim-preview-table">
                <thead>
                  <tr>
                    <th style="width: 38px; text-align: center;">#</th>
                    <th v-if="hasParsedStrands" style="width: 140px;">Strand / Unit</th>
                    <th style="width: 110px;">Code</th>
                    <th>Description</th>
                    <th style="width: 44px; text-align: center;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(item, idx) in parsedPasteList" 
                    :key="item.id || idx"
                    :class="{ 'eim-tr--duplicate': isDuplicateCode(item.code) }"
                  >
                    <td class="eim-td-num">{{ idx + 1 }}</td>
                    <td v-if="hasParsedStrands">
                      <input 
                        v-model="item.strand" 
                        type="text" 
                        class="eim-table-input" 
                        placeholder="Strand" 
                      />
                    </td>
                    <td>
                      <input 
                        v-model="item.code" 
                        type="text" 
                        class="eim-table-input eim-table-input--code" 
                        placeholder="Code" 
                      />
                    </td>
                    <td>
                      <input 
                        v-model="item.description" 
                        type="text" 
                        class="eim-table-input eim-table-input--desc" 
                        placeholder="Expectation description" 
                      />
                    </td>
                    <td style="text-align: center;">
                      <button 
                        type="button" 
                        class="eim-table-btn-delete" 
                        title="Remove row"
                        @click="deleteParsedRow(idx)"
                      >
                        <Trash2 :size="13" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 3: AI PROMPTS & JSON TEMPLATES -->
        <div v-if="activeTab === 'ai'" class="eim-section eim-ai-tab">
          <!-- Hero Banner -->
          <div class="eim-ai-hero-card">
            <div class="eim-ai-hero-header">
              <div class="eim-ai-hero-title">
                <Sparkles :size="20" class="eim-ai-sparkle-icon" />
                <h4>Generate Custom Curriculums &amp; Success Criteria with AI</h4>
              </div>
            </div>
            <p class="eim-ai-hero-desc">
              Have a course syllabus, PDF, or custom curriculum not in the presets? Use these optimized prompts with <strong>ChatGPT, Claude, or Gemini</strong> to convert raw course text into clean Classroom Tracker formats in seconds.
            </p>

            <!-- 3-Step Quick Visual Guide -->
            <div class="eim-ai-steps-row">
              <div class="eim-ai-step-item">
                <div class="eim-ai-step-badge">1</div>
                <div class="eim-ai-step-text">
                  <strong>Copy Prompt</strong>
                  <span>Choose your format below</span>
                </div>
              </div>
              <div class="eim-ai-step-arrow">&rarr;</div>
              <div class="eim-ai-step-item">
                <div class="eim-ai-step-badge">2</div>
                <div class="eim-ai-step-text">
                  <strong>Feed to AI</strong>
                  <span>Paste prompt + syllabus/PDF</span>
                </div>
              </div>
              <div class="eim-ai-step-arrow">&rarr;</div>
              <div class="eim-ai-step-item">
                <div class="eim-ai-step-badge">3</div>
                <div class="eim-ai-step-text">
                  <strong>Import File</strong>
                  <span>Upload .json or paste text</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: 1-Click Starter Template Downloads -->
          <div class="eim-templates-download-card">
            <div class="eim-templates-header">
              <div class="eim-templates-title">
                <FileCode :size="16" class="eim-templates-icon" />
                <span>Starter Boilerplate Templates</span>
              </div>
              <span class="eim-templates-subtitle">Download clean JSON schemas or CSV templates to inspect or edit directly</span>
            </div>
            <div class="eim-templates-buttons">
              <button 
                type="button" 
                class="eim-template-btn" 
                @click="downloadPresetJsonTemplate"
                title="Download starter Course Preset JSON template"
              >
                <Download :size="14" /> Download Course Preset (.json)
              </button>
              <button 
                type="button" 
                class="eim-template-btn" 
                @click="downloadSuccessCriteriaJsonTemplate"
                title="Download starter Success Criteria JSON template"
              >
                <Download :size="14" /> Download Success Criteria (.json)
              </button>
              <button 
                type="button" 
                class="eim-template-btn" 
                @click="downloadSampleCsv"
                title="Download sample Spreadsheet CSV template"
              >
                <Download :size="14" /> Download Sample CSV (.csv)
              </button>
            </div>
          </div>

          <!-- Section: Ready-to-Use AI Prompts -->
          <div class="eim-ai-prompts-section">
            <h5 class="eim-section-title">Ready-to-Use AI Prompts (Click to Copy)</h5>

            <!-- PROMPT 1: Course Preset JSON -->
            <div class="eim-prompt-card">
              <div class="eim-prompt-card__header">
                <div class="eim-prompt-card__meta">
                  <span class="eim-prompt-tag eim-prompt-tag--json">Full Course JSON</span>
                  <h6>1. Complete Course Preset Generator</h6>
                </div>
                <button 
                  type="button" 
                  class="eim-copy-prompt-btn" 
                  :class="{ 'eim-copy-prompt-btn--copied': copiedPromptKey === 'preset_json' }"
                  @click="copyPrompt('preset_json', aiPresetJsonPrompt)"
                >
                  <component :is="copiedPromptKey === 'preset_json' ? Check : Copy" :size="13" />
                  {{ copiedPromptKey === 'preset_json' ? 'Copied Prompt!' : 'Copy AI Prompt' }}
                </button>
              </div>
              <p class="eim-prompt-desc">
                Converts an entire curriculum document or course syllabus into structured strands, overall expectations, and specific expectations.
              </p>
              <div class="eim-prompt-code-preview">
                <pre><code>{{ aiPresetJsonPromptSample }}</code></pre>
              </div>
            </div>

            <!-- PROMPT 2: Success Criteria JSON -->
            <div class="eim-prompt-card">
              <div class="eim-prompt-card__header">
                <div class="eim-prompt-card__meta">
                  <span class="eim-prompt-tag eim-prompt-tag--purple">Success Criteria</span>
                  <h6>2. "I Can..." Success Criteria Generator</h6>
                </div>
                <button 
                  type="button" 
                  class="eim-copy-prompt-btn" 
                  :class="{ 'eim-copy-prompt-btn--copied': copiedPromptKey === 'success_criteria' }"
                  @click="copyPrompt('success_criteria', aiSuccessCriteriaPrompt)"
                >
                  <component :is="copiedPromptKey === 'success_criteria' ? Check : Copy" :size="13" />
                  {{ copiedPromptKey === 'success_criteria' ? 'Copied Prompt!' : 'Copy AI Prompt' }}
                </button>
              </div>
              <p class="eim-prompt-desc">
                Transforms formal curriculum expectations into student-friendly, actionable "I can..." achievement targets.
              </p>
              <div class="eim-prompt-code-preview">
                <pre><code>{{ aiSuccessCriteriaPromptSample }}</code></pre>
              </div>
            </div>

            <!-- PROMPT 3: Tabular Quick Paste -->
            <div class="eim-prompt-card">
              <div class="eim-prompt-card__header">
                <div class="eim-prompt-card__meta">
                  <span class="eim-prompt-tag eim-prompt-tag--blue">Quick Paste Table</span>
                  <h6>3. Quick 3-Column Pipe Table Generator</h6>
                </div>
                <button 
                  type="button" 
                  class="eim-copy-prompt-btn" 
                  :class="{ 'eim-copy-prompt-btn--copied': copiedPromptKey === 'table' }"
                  @click="copyPrompt('table', aiTablePrompt)"
                >
                  <component :is="copiedPromptKey === 'table' ? Check : Copy" :size="13" />
                  {{ copiedPromptKey === 'table' ? 'Copied Prompt!' : 'Copy AI Prompt' }}
                </button>
              </div>
              <p class="eim-prompt-desc">
                Generates a clean <code>Strand | Code | Description</code> table you can paste directly into the <strong>Bulk Paste</strong> tab.
              </p>
              <div class="eim-prompt-code-preview">
                <pre><code>{{ aiTablePromptSample }}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="eim-footer" style="display: flex; align-items: center; justify-content: space-between;">
        <button 
          v-if="existingCount > 0"
          type="button" 
          class="eim-btn-clear" 
          style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.825rem; padding: 6px 12px; border-radius: 6px; border: 1px solid #fca5a5; background: #fef2f2; color: #dc2626; cursor: pointer; font-weight: 600;"
          @click="emit('clear')"
        >
          <Trash2 :size="14" /> Clear Current Expectations ({{ existingCount }})
        </button>
        <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
          <button class="eim-btn eim-btn--secondary" @click="onClose">Cancel</button>
          <button 
            class="eim-btn eim-btn--primary" 
            :disabled="!canSubmit" 
            @click="onSubmit"
          >
            Import Expectations
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 
  BookOpen, X, Zap, Search, Check, Filter, Trash2, 
  FileSpreadsheet, UploadCloud, Download, AlertTriangle, CheckCircle2,
  Sparkles, Copy, FileCode
} from 'lucide-vue-next'
import { curriculumPresets } from '../../data/curriculum/index.js'
import { cleanExpectationText } from '../../utils/textUtils.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  existingUnits: { type: Array, default: () => [] },
  existingCount: { type: Number, default: 0 },
  targetSubjectId: { type: String, default: null },
  targetSubjectName: { type: String, default: '' },
  initialPresetId: { type: String, default: null },
  classType: { type: String, default: 'secondary' } // 'elementary' | 'secondary'
})

const emit = defineEmits(['update:modelValue', 'import', 'clear'])

const activeTab = ref('presets') // 'presets' | 'paste'

// Filter toolbar state
const panelFilter = ref(props.classType || 'secondary') // 'elementary' | 'secondary' | 'all'
const gradeFilter = ref('all')
const subjectFilter = ref('all')
const searchQuery = ref('')

// Presets state
const selectedPresetId = ref(null)
const granularity = ref('overall') // 'overall' | 'all'
const importBehavior = ref('replace') // 'replace' | 'append'
const selectedExpectations = ref([])

// Shared unit state
const targetUnitChoice = ref('auto')
const newUnitName = ref('')

function setPanelFilter(panel) {
  panelFilter.value = panel
  gradeFilter.value = 'all'
}

function resetAllFilters() {
  gradeFilter.value = 'all'
  subjectFilter.value = 'all'
  searchQuery.value = ''
}

watch(() => props.classType, (newVal) => {
  if (newVal) {
    panelFilter.value = newVal
  }
}, { immediate: true })

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    panelFilter.value = props.classType || 'secondary'
    if (props.initialPresetId) {
      selectedPresetId.value = props.initialPresetId
    }
  }
}, { immediate: true })

// Compute dynamic list of available grades based on panel filter
const availableGrades = computed(() => {
  let list = curriculumPresets
  if (panelFilter.value && panelFilter.value !== 'all') {
    list = list.filter(p => p.panel === panelFilter.value)
  }
  const gradesOrder = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
  const gradesSet = new Set(list.map(p => p.grade).filter(Boolean))

  return Array.from(gradesSet).sort((a, b) => {
    const idxA = gradesOrder.indexOf(a)
    const idxB = gradesOrder.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })
})

const availableSubjectCategories = computed(() => [
  { id: 'all', label: 'All Subjects' },
  { id: 'math', label: 'Math' },
  { id: 'sci', label: 'Science' },
  { id: 'lang', label: 'Language' },
  { id: 'french', label: 'French' },
  { id: 'arts', label: 'Arts' },
  { id: 'hpe', label: 'Health & PE' },
  { id: 'soc', label: 'History / Geo' }
])

const filteredPresets = computed(() => {
  let list = curriculumPresets

  // 1. Panel filter
  if (panelFilter.value && panelFilter.value !== 'all') {
    list = list.filter(p => p.panel === panelFilter.value)
  }

  // 2. Grade filter
  if (gradeFilter.value && gradeFilter.value !== 'all') {
    list = list.filter(p => (p.grade || '').toLowerCase() === gradeFilter.value.toLowerCase())
  }

  // 3. Subject filter (Department level)
  if (subjectFilter.value && subjectFilter.value !== 'all') {
    const s = subjectFilter.value.toLowerCase()
    list = list.filter(p => {
      const dept = (p.department || '').toLowerCase()
      const title = (p.title || '').toLowerCase()
      const code = (p.subjectCode || '').toLowerCase()
      const pId = (p.presetId || '').toLowerCase()

      if (s === 'math') {
        return dept === 'math' || title.includes('math') || title.includes('algebra') || title.includes('calculus') || title.includes('functions') || code.includes('mat') || code.startsWith('m') || pId.includes('math') || pId.includes('mth') || pId.includes('mpm') || pId.includes('mfm')
      }
      if (s === 'sci') {
        return dept === 'science' || title.includes('science') || title.includes('chem') || title.includes('physics') || title.includes('bio') || title.includes('earth') || title.includes('environment') || code.includes('sci') || code.startsWith('s') || pId.includes('sci') || pId.includes('sch') || pId.includes('sph') || pId.includes('sbi') || pId.includes('snc') || pId.includes('ses') || pId.includes('svn')
      }
      if (s === 'lang') {
        return dept === 'english' || dept === 'language' || title.includes('language') || title.includes('english') || code.includes('lang') || code.startsWith('eng') || pId.includes('lang')
      }
      if (s === 'french') {
        return dept === 'french' || title.includes('french') || code.includes('fsl') || code.startsWith('f') || code.includes('fi') || pId.includes('french')
      }
      if (s === 'arts') {
        return dept === 'arts' || title.includes('art') || title.includes('music') || title.includes('drama') || title.includes('dance') || code.includes('art') || code.startsWith('a') || pId.includes('art')
      }
      if (s === 'hpe') {
        return dept === 'hpe' || title.includes('health') || title.includes('physical') || title.includes('kinesiology') || code.includes('hpe') || code.startsWith('p') || pId.includes('hpe')
      }
      if (s === 'soc') {
        return dept === 'social' || title.includes('history') || title.includes('geography') || title.includes('civic') || title.includes('social') || code.includes('hist') || code.includes('geo') || code.startsWith('c') || code.startsWith('h')
      }
      return true
    })
  }

  // 4. Text search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p => 
      (p.title || '').toLowerCase().includes(q) ||
      (p.presetId || '').toLowerCase().includes(q) ||
      (p.grade || '').toLowerCase().includes(q) ||
      (p.subjectCode || '').toLowerCase().includes(q)
    )
  }

  // Exclude standalone success criteria entries from preset cards list
  list = list.filter(p => !p.isSuccessCriteria)

  return list
})

function countPresetExpectations(preset) {
  if (!preset || !preset.strands) return 0
  return preset.strands.reduce((acc, s) => {
    if (!s.overalls) return acc
    return acc + s.overalls.reduce((a, ov) => a + 1 + (ov.specifics ? ov.specifics.length : 0), 0)
  }, 0)
}

const selectedPreset = computed(() => {
  if (!selectedPresetId.value) return null
  return curriculumPresets.find(p => p.presetId === selectedPresetId.value)
})

const hasSuccessCriteriaAvailable = computed(() => {
  if (!selectedPreset.value) return false
  if (selectedPreset.value.isSuccessCriteria) return true
  const sCode = (selectedPreset.value.subjectCode || '').toLowerCase()
  const pId = (selectedPreset.value.presetId || '').toLowerCase()
  return curriculumPresets.some(p => p.isSuccessCriteria && (
    (sCode && p.subjectCode && p.subjectCode.toLowerCase() === sCode) ||
    (pId && p.presetId.toLowerCase().startsWith(pId))
  ))
})

watch(hasSuccessCriteriaAvailable, (available) => {
  if (!available && granularity.value === 'success_criteria') {
    granularity.value = 'all'
  }
})

const effectivePresetToUse = computed(() => {
  if (!selectedPreset.value) return null
  if (granularity.value === 'success_criteria') {
    if (selectedPreset.value.isSuccessCriteria) return selectedPreset.value
    const sCode = (selectedPreset.value.subjectCode || '').toLowerCase()
    const pId = (selectedPreset.value.presetId || '').toLowerCase()
    const scMatch = curriculumPresets.find(p => p.isSuccessCriteria && (
      (sCode && p.subjectCode && p.subjectCode.toLowerCase() === sCode) ||
      (pId && p.presetId.toLowerCase().startsWith(pId))
    ))
    if (scMatch) return scMatch
  }
  return selectedPreset.value
})

function getStrandExpectations(strand, currGranularity = granularity.value) {
  if (!strand || !strand.overalls) return []
  const list = []
  strand.overalls.forEach(ov => {
    if (currGranularity === 'overall') {
      list.push({ code: ov.code, description: ov.description, isOverall: true })
    } else if ((currGranularity === 'all' || currGranularity === 'success_criteria') && ov.specifics && ov.specifics.length > 0) {
      ov.specifics.forEach(sp => {
        list.push({ code: sp.code, description: sp.description, isOverall: false })
      })
    } else {
      // Preserve overall expectation if no specifics exist (e.g. foundational AA1/A1 in MTH1W)
      list.push({ code: ov.code, description: ov.description || ov.name, isOverall: true })
    }
  })
  return list
}

const totalPresetExpectations = computed(() => {
  const p = effectivePresetToUse.value
  if (!p || !p.strands) return 0
  return p.strands.reduce((acc, s) => acc + getStrandExpectations(s).length, 0)
})

watch(selectedPreset, () => {
  deselectAllGlobal()
})

watch(granularity, () => {
  deselectAllGlobal()
})

function selectAllGlobal() {
  const p = effectivePresetToUse.value
  if (!p || !p.strands) return
  const all = []
  p.strands.forEach(s => {
    getStrandExpectations(s).forEach(e => all.push(e))
  })
  selectedExpectations.value = all
}

function deselectAllGlobal() {
  selectedExpectations.value = []
}

function isStrandFullySelected(strand) {
  const strandExps = getStrandExpectations(strand)
  if (!strandExps.length) return false
  return strandExps.every(e => 
    selectedExpectations.value.some(sel => sel.code === e.code)
  )
}

function toggleStrandSelection(strand) {
  const strandExps = getStrandExpectations(strand)
  const isSelected = isStrandFullySelected(strand)
  if (isSelected) {
    selectedExpectations.value = selectedExpectations.value.filter(sel => 
      !strandExps.some(e => e.code === sel.code)
    )
  } else {
    const current = [...selectedExpectations.value]
    strandExps.forEach(e => {
      if (!current.some(sel => sel.code === e.code)) {
        current.push(e)
      }
    })
    selectedExpectations.value = current
  }
}

// Paste state & file upload
const pasteRawText = ref('')
const pasteDragOver = ref(false)
const fileInputRef = ref(null)
const parsedPasteList = ref([])

function parseCsvLine(text) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ''))
      cur = ''
    } else {
      cur += char
    }
  }
  if (cur) result.push(cur.trim().replace(/^["']|["']$/g, ''))
  return result
}

function parseRawExpectationsText(raw) {
  if (!raw || !raw.trim()) return []
  const lines = raw.split(/\r?\n/)
  const results = []

  let startIndex = 0
  if (lines.length > 0) {
    const first = lines[0].toLowerCase().trim()
    const tokens = first.split(/[\t\|,]/).map(t => t.trim().replace(/^["']|["']$/g, ''))
    const isHeader = tokens.some(t => 
      t === 'code' || 
      t === 'expectation' || 
      t === 'expectations' || 
      t === 'learning goal' || 
      t === 'description' || 
      t === 'expectation code' || 
      (t === 'strand' && tokens.length > 1 && tokens.some(tok => tok === 'code' || tok === 'description' || tok === 'expectation'))
    )
    if (isHeader) {
      startIndex = 1
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 1. Pipe-separated: Strand | Code | Desc OR Code | Desc
    if (line.includes('|')) {
      const parts = line.split('|').map(s => s.trim())
      if (parts.length >= 3) {
        results.push({
          id: `paste_${i}_${Date.now()}`,
          strand: cleanExpectationText(parts[0]),
          code: cleanExpectationText(parts[1]).toUpperCase(),
          description: cleanExpectationText(parts.slice(2).join(' | ')),
          isOverall: /^[A-Z]\d+$/i.test(parts[1])
        })
        continue
      } else if (parts.length === 2) {
        results.push({
          id: `paste_${i}_${Date.now()}`,
          strand: '',
          code: cleanExpectationText(parts[0]).toUpperCase(),
          description: cleanExpectationText(parts[1]),
          isOverall: /^[A-Z]\d+$/i.test(parts[0])
        })
        continue
      }
    }

    // 2. Tab-separated (Excel / Google Sheets paste)
    if (line.includes('\t')) {
      const parts = line.split('\t').map(s => s.trim())
      if (parts.length >= 3) {
        results.push({
          id: `paste_${i}_${Date.now()}`,
          strand: cleanExpectationText(parts[0]),
          code: cleanExpectationText(parts[1]).toUpperCase(),
          description: cleanExpectationText(parts.slice(2).join(' ')),
          isOverall: /^[A-Z]\d+$/i.test(parts[1])
        })
        continue
      } else if (parts.length === 2) {
        results.push({
          id: `paste_${i}_${Date.now()}`,
          strand: '',
          code: cleanExpectationText(parts[0]).toUpperCase(),
          description: cleanExpectationText(parts[1]),
          isOverall: /^[A-Z]\d+$/i.test(parts[0])
        })
        continue
      }
    }

    // 3. Colon-separated: Code: Description
    const matchColon = line.match(/^([A-Za-z0-9\.-]{1,12})\s*:\s*(.+)$/)
    if (matchColon) {
      results.push({
        id: `paste_${i}_${Date.now()}`,
        strand: '',
        code: cleanExpectationText(matchColon[1]).toUpperCase(),
        description: cleanExpectationText(matchColon[2]),
        isOverall: /^[A-Z]\d+$/i.test(matchColon[1].trim())
      })
      continue
    }

    // 4. CSV parsing with quotes
    const csvParts = parseCsvLine(line)
    if (csvParts.length >= 3) {
      results.push({
        id: `paste_${i}_${Date.now()}`,
        strand: cleanExpectationText(csvParts[0]),
        code: cleanExpectationText(csvParts[1]).toUpperCase(),
        description: cleanExpectationText(csvParts.slice(2).join(', ')),
        isOverall: /^[A-Z]\d+$/i.test(csvParts[1].trim())
      })
      continue
    } else if (csvParts.length === 2) {
      results.push({
        id: `paste_${i}_${Date.now()}`,
        strand: '',
        code: cleanExpectationText(csvParts[0]).toUpperCase(),
        description: cleanExpectationText(csvParts[1]),
        isOverall: /^[A-Z]\d+$/i.test(csvParts[0].trim())
      })
      continue
    }

    // 5. Code [space] Description match
    const matchSpace = line.match(/^([A-Za-z0-9\.-]{2,8})\s+(.+)$/)
    if (matchSpace) {
      results.push({
        id: `paste_${i}_${Date.now()}`,
        strand: '',
        code: cleanExpectationText(matchSpace[1]).toUpperCase(),
        description: cleanExpectationText(matchSpace[2]),
        isOverall: /^[A-Z]\d+$/i.test(matchSpace[1].trim())
      })
      continue
    }

    // Fallback: entire line as description
    results.push({
      id: `paste_${i}_${Date.now()}`,
      strand: '',
      code: `EXP-${results.length + 1}`,
      description: cleanExpectationText(line),
      isOverall: false
    })
  }

  return results
}

watch(pasteRawText, (newText) => {
  parsedPasteList.value = parseRawExpectationsText(newText)
  if (parsedPasteList.value.some(e => e.strand && e.strand.trim())) {
    targetUnitChoice.value = 'auto-strands'
  }
}, { immediate: true })

const duplicateCodes = computed(() => {
  const counts = {}
  parsedPasteList.value.forEach(item => {
    const c = (item.code || '').toUpperCase().trim()
    if (c) counts[c] = (counts[c] || 0) + 1
  })
  const dupes = new Set()
  Object.entries(counts).forEach(([code, cnt]) => {
    if (cnt > 1) dupes.add(code)
  })
  return dupes
})

function isDuplicateCode(code) {
  if (!code) return false
  return duplicateCodes.value.has(code.toUpperCase().trim())
}

const hasParsedStrands = computed(() => {
  return parsedPasteList.value.some(e => e.strand && e.strand.trim())
})

const uniqueParsedStrands = computed(() => {
  return Array.from(new Set(parsedPasteList.value.map(e => e.strand?.trim()).filter(Boolean)))
})

function deleteParsedRow(index) {
  parsedPasteList.value.splice(index, 1)
}

function loadSampleFormat(type) {
  if (type === 'pipe') {
    pasteRawText.value = `A1.1 | Apply scientific processes and research skills to investigate questions
A1.2 | Apply engineering design processes to construct working prototypes
B1.1 | Assess social and environmental impacts of emerging technologies
B1.2 | Investigate properties of matter and chemical changes in common substances`
  } else if (type === 'colon') {
    pasteRawText.value = `B1.1: Demonstrate understanding of integer operations and rational numbers
B1.2: Model linear equations and solve multi-step problems in context
C1.1: Collect, organize, and represent primary and secondary data distributions
C1.2: Apply statistical measures of central tendency to draw conclusions`
  } else if (type === 'tab') {
    pasteRawText.value = `A1.1\tListen in order to understand and respond appropriately in a variety of situations
A1.2\tUse speaking skills and strategies to communicate information clearly
B1.1\tRead a wide variety of increasingly complex texts for multiple purposes
B1.2\tDemonstrate understanding of literary elements and point of view`
  } else if (type === 'three_column') {
    pasteRawText.value = `Strand A: STEM Skills | A1.1 | Apply scientific processes and research skills
Strand A: STEM Skills | A1.2 | Use coding and computational thinking to model systems
Strand B: Matter & Energy | B1.1 | Investigate physical and chemical properties of matter
Strand B: Matter & Energy | B1.2 | Evaluate environmental impacts of material synthesis`
  } else if (type === 'csv') {
    pasteRawText.value = `"Code","Description"
"A1.1","Demonstrate understanding of explicit and implicit meanings in texts"
"A1.2","Analyze how texts reflect diverse perspectives and cultural contexts"
"B1.1","Draft coherent paragraphs with strong supporting evidence and transitions"`
  }
}

function downloadSampleCsv() {
  const csvContent = `"Strand","Code","Description"
"Number Sense","B1.1","Demonstrate understanding of integers, fractions, and decimals"
"Number Sense","B1.2","Apply order of operations and proportional reasoning"
"Algebra & Relations","C1.1","Model linear relationships using tables, graphs, and equations"
"Algebra & Relations","C1.2","Solve first-degree equations with rational coefficients"
"Data & Probability","D1.1","Collect, organize, and represent two-variable data sets"
"Spatial Sense","E1.1","Determine surface area and volume of composite geometric solids"`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'expectations_sample.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  readFileContent(file)
  e.target.value = ''
}

function handleFileDrop(e) {
  pasteDragOver.value = false
  const file = e.dataTransfer.files?.[0]
  if (!file) return
  readFileContent(file)
}

function downloadPresetJsonTemplate() {
  const templateObj = {
    presetId: 'ontario-g7-subjectname',
    title: 'Grade 7 Subject Name (2026)',
    panel: 'elementary',
    region: 'Ontario',
    grade: '7',
    subjectCode: 'SUB',
    department: 'Department Name',
    strands: [
      {
        name: 'Strand A: Title of Strand A',
        overalls: [
          {
            code: 'A1',
            title: 'Overall Topic Name',
            description: 'Demonstrate an understanding of key concepts, principles, and fundamental ideas related to this strand.',
            specifics: [
              {
                code: 'A1.1',
                description: 'identify and describe fundamental components, processes, and relationships using appropriate terminology.'
              },
              {
                code: 'A1.2',
                description: 'analyze practical applications, societal impacts, and environmental considerations related to the topic.'
              }
            ]
          }
        ]
      }
    ]
  }

  const blob = new Blob([JSON.stringify(templateObj, null, 2)], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'curriculum_preset_template.json')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function downloadSuccessCriteriaJsonTemplate() {
  const templateObj = {
    presetId: 'ontario-snc1w-success-criteria',
    title: 'Grade 9 Science (SNC1W) - Success Criteria',
    panel: 'secondary',
    region: 'Ontario',
    grade: '9',
    subjectCode: 'SNC1W',
    department: 'Science',
    isSuccessCriteria: true,
    strands: [
      {
        name: 'Strand A: STEM Skills',
        overalls: [
          {
            code: 'A1',
            title: 'STEM Investigation',
            description: 'I can apply scientific investigation and engineering design processes.',
            specifics: [
              {
                code: 'A1.1',
                description: 'I can formulate testable questions and hypotheses for scientific experiments.'
              },
              {
                code: 'A1.2',
                description: 'I can safely conduct lab investigations and gather accurate quantitative data.'
              }
            ]
          }
        ]
      }
    ]
  }

  const blob = new Blob([JSON.stringify(templateObj, null, 2)], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'success_criteria_template.json')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const copiedPromptKey = ref(null)

function copyPrompt(key, promptText) {
  navigator.clipboard.writeText(promptText).then(() => {
    copiedPromptKey.value = key
    setTimeout(() => {
      if (copiedPromptKey.value === key) {
        copiedPromptKey.value = null
      }
    }, 2500)
  })
}

const aiPresetJsonPrompt = `You are a curriculum data specialist. Convert the attached Ontario Ministry of Education curriculum text into a single, strictly valid JSON preset following this exact format:

Requirements:
1. Output ONLY valid JSON matching the schema below.
2. Ensure clean plain text descriptions with NO HTML entities (do NOT include &nbsp;, &amp;, &quot;, etc.). Use standard UTF-8 characters (e.g. standard space, en-dash –, curly apostrophe ’).
3. Ensure no trailing space before punctuation (write "systems." NOT "systems .").
4. Expectation codes must follow standard Ontario numbering (Overall: "A1", Specific: "A1.1").

Schema Template:
{
  "presetId": "ontario-[grade]-[subjectcode]",
  "title": "[Full Course Title (Year)]",
  "panel": "[elementary or secondary]",
  "region": "Ontario",
  "grade": "[Grade number, e.g. 7 or 10]",
  "subjectCode": "[Subject Code, e.g. SNC1W or SCI]",
  "department": "[Department name, e.g. Science]",
  "strands": [
    {
      "name": "Strand Name (e.g. Strand A: STEM Investigation)",
      "overalls": [
        {
          "code": "A1",
          "title": "Overall Topic Title",
          "description": "Full text of overall expectation.",
          "specifics": [
            {
              "code": "A1.1",
              "description": "Full text of specific expectation."
            }
          ]
        }
      ]
    }
  ]
}

Here is the source curriculum text:
[PASTE YOUR SYLLABUS OR CURRICULUM TEXT HERE]`

const aiPresetJsonPromptSample = `{
  "presetId": "ontario-snc1w",
  "title": "Grade 9 Science (2022)",
  "panel": "secondary",
  "strands": [ ... ]
}`

const aiSuccessCriteriaPrompt = `You are an educational assessment expert. Convert the following curriculum expectations into student-friendly Success Criteria ("I Can..." statements) structured in this exact JSON format:

Requirements:
1. Output ONLY valid JSON matching the schema below.
2. Start specific criteria with "I can..." in active, student-accessible language.
3. Clean plain text only (no &nbsp; or HTML entities).

Schema Template:
{
  "presetId": "ontario-[grade]-[subjectcode]-success-criteria",
  "title": "[Full Course Title] (Success Criteria)",
  "panel": "[elementary or secondary]",
  "region": "Ontario",
  "grade": "[Grade number]",
  "subjectCode": "[Course Code]",
  "isSuccessCriteria": true,
  "strands": [
    {
      "name": "Strand Name",
      "overalls": [
        {
          "code": "A1",
          "title": "Topic Name",
          "description": "I can demonstrate understanding of key concepts in this strand.",
          "specifics": [
            {
              "code": "A1.1",
              "description": "I can explain and apply [specific concept] using appropriate terminology."
            }
          ]
        }
      ]
    }
  ]
}

Here are the expectations to convert:
[PASTE YOUR CURRICULUM EXPECTATIONS HERE]`

const aiSuccessCriteriaPromptSample = `{
  "presetId": "ontario-snc1w-success-criteria",
  "title": "Grade 9 Science - Success Criteria",
  "isSuccessCriteria": true,
  "strands": [ ... "I can..." statements ]
}`

const aiTablePrompt = `Convert the following curriculum text into a clean 3-column table format for Classroom Tracker:

Format:
Strand Name | Expectation Code | Expectation Description

Example:
Strand A: Life Systems | A1.1 | Assess impacts of human activities on biodiversity
Strand A: Life Systems | A1.2 | Investigate interactions within ecosystems
Strand B: Structures & Mechanisms | B1.1 | Evaluate economic and environmental impacts of materials

Formatting rules:
- One expectation per line.
- Separate columns with a vertical pipe " | ".
- Plain text only (no HTML entities or symbols).

Here is the curriculum text:
[PASTE YOUR CURRICULUM TEXT HERE]`

const aiTablePromptSample = `Strand A: Life Systems | A1.1 | Assess impacts of human activities...
Strand A: Life Systems | A1.2 | Investigate interactions...
Strand B: Structures & Mechanisms | B1.1 | Evaluate economic...`

function readFileContent(file) {
  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result || ''
    if (file.name.endsWith('.json') || content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content)
        if (parsed.strands && Array.isArray(parsed.strands)) {
          const rows = []
          parsed.strands.forEach(strand => {
            const sName = strand.name || ''
            if (strand.overalls) {
              strand.overalls.forEach(ov => {
                rows.push(`${sName} | ${ov.code} | ${ov.description}`)
                if (ov.specifics) {
                  ov.specifics.forEach(sp => {
                    rows.push(`${sName} | ${sp.code} | ${sp.description}`)
                  })
                }
              })
            }
          })
          if (rows.length > 0) {
            pasteRawText.value = rows.join('\n')
            activeTab.value = 'paste'
            return
          }
        }
      } catch (err) {
        console.warn('Failed parsing JSON file, falling back to raw text', err)
      }
    }
    pasteRawText.value = content
  }
  reader.readAsText(file)
}

const canSubmit = computed(() => {
  if (activeTab.value === 'presets') {
    if (!selectedPreset.value) return false
    if (props.classType === 'elementary' || targetUnitChoice.value === 'auto') return true
    if (selectedExpectations.value.length === 0) return false
    if (targetUnitChoice.value === 'new' && !newUnitName.value.trim()) return false
    return true
  }

  if (activeTab.value === 'paste') {
    if (parsedPasteList.value.length === 0) return false
    if (targetUnitChoice.value === 'new' && !newUnitName.value.trim()) return false
    return true
  }

  return false
})

function onClose() {
  emit('update:modelValue', false)
}

function onSubmit() {
  if (!canSubmit.value) return

  if (activeTab.value === 'presets') {
    if (props.classType === 'elementary' || targetUnitChoice.value === 'auto') {
      emit('import', {
        mode: 'auto-units',
        preset: effectivePresetToUse.value || selectedPreset.value,
        granularity: granularity.value,
        importBehavior: importBehavior.value,
        targetSubjectId: props.targetSubjectId
      })
    } else {
      emit('import', {
        mode: 'attach-expectations',
        targetUnitChoice: targetUnitChoice.value,
        newUnitName: newUnitName.value.trim(),
        expectations: selectedExpectations.value,
        importBehavior: importBehavior.value,
        targetSubjectId: props.targetSubjectId
      })
    }
  } else if (activeTab.value === 'paste') {
    if (targetUnitChoice.value === 'auto-strands' && hasParsedStrands.value) {
      // Group expectations by parsed strand
      const strandMap = {}
      parsedPasteList.value.forEach(item => {
        const sName = item.strand?.trim() || 'General'
        if (!strandMap[sName]) strandMap[sName] = []
        strandMap[sName].push({
          code: item.code,
          description: item.description,
          isOverall: item.isOverall
        })
      })

      emit('import', {
        mode: 'auto-paste-strands',
        strands: Object.entries(strandMap).map(([name, exps]) => ({ name, expectations: exps })),
        expectations: parsedPasteList.value,
        importBehavior: importBehavior.value,
        targetSubjectId: props.targetSubjectId
      })
    } else {
      emit('import', {
        mode: 'attach-expectations',
        targetUnitChoice: targetUnitChoice.value,
        newUnitName: newUnitName.value.trim(),
        expectations: parsedPasteList.value,
        importBehavior: importBehavior.value,
        targetSubjectId: props.targetSubjectId
      })
    }
  }

  onClose()
  selectedExpectations.value = []
}
</script>

<style scoped>
.eim-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.eim-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 95vw;
  max-width: 900px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.eim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.eim-header__title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.eim-header__icon {
  color: var(--primary);
}

.eim-header__title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.eim-close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.eim-close-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.eim-tabs {
  display: flex;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.eim-tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.eim-tab:hover {
  color: var(--text);
}

.eim-tab--active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  background: var(--surface);
}

.eim-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eim-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eim-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
}

.eim-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}

.eim-select, .eim-input, .eim-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.85rem;
  box-sizing: border-box;
}

.eim-textarea {
  font-family: inherit;
  resize: vertical;
}

.eim-preset-preview {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eim-preset-summary {
  font-size: 0.85rem;
  color: var(--text);
  background: var(--bg-hover);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--primary);
}

.eim-preset-info-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.08);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.eim-info-icon {
  flex-shrink: 0;
}

.eim-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.eim-radio-label {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.eim-radio-label:hover {
  background: var(--bg-hover);
}

.eim-checklist-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.eim-radio-group--row {
  flex-direction: row;
  gap: 12px;
}

.eim-radio-label--compact {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.8rem;
}

.eim-checklist {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-secondary);
}

.eim-checkbox-item--overall {
  background: var(--bg-hover);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
}

.eim-checkbox-item--specific {
  padding-left: 24px;
}

.eim-code-overall {
  color: var(--primary);
  font-weight: 800;
}

.eim-strand-name {
  margin: 0 0 6px 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.eim-checkbox-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.8rem;
  color: var(--text);
  cursor: pointer;
}

.eim-preview-table-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.eim-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  border: 1px solid var(--border);
}

.eim-preview-table th, .eim-preview-table td {
  padding: 6px 10px;
  border: 1px solid var(--border);
  text-align: left;
}

.eim-preview-table th {
  background: var(--bg-secondary);
  font-weight: 700;
  color: var(--text-secondary);
}

.eim-code-badge {
  font-weight: 700;
  background: var(--bg-hover);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.eim-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.eim-btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.eim-btn--secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.eim-btn--secondary:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.eim-btn--primary {
  background: var(--primary);
  color: #fff;
}

.eim-btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.eim-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.eim-checklist-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.eim-action-link {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  transition: opacity 0.15s ease;
}

.eim-action-link:hover {
  opacity: 0.8;
}

.eim-action-link--small {
  font-size: 0.7rem;
  text-decoration: none;
}

.eim-action-separator {
  font-size: 0.75rem;
  color: var(--border);
}

.eim-strand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}

.eim-filter-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.eim-filter-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (min-width: 640px) {
  .eim-filter-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.eim-segmented-control {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}

.eim-seg-btn {
  padding: 5px 12px;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.eim-seg-btn:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.eim-seg-btn--active {
  background: var(--primary);
  color: #ffffff;
  font-weight: 700;
}

.eim-seg-btn--active:hover {
  background: var(--primary);
  opacity: 0.95;
}

.eim-search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 320px;
}

.eim-search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}

.eim-search-input {
  width: 100%;
  padding: 6px 30px 6px 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-size: 0.8rem;
  box-sizing: border-box;
}

.eim-search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.eim-search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.eim-search-clear:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.eim-pills-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
}

.eim-pills-label {
  font-weight: 700;
  color: var(--text-secondary);
  width: 55px;
  flex-shrink: 0;
}

.eim-pills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.eim-pill {
  padding: 3px 9px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-pill:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.eim-pill--active {
  background: rgba(59, 130, 246, 0.12);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}

.eim-selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.eim-selector-count {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.eim-active-filter-badge {
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 600;
  margin-left: 4px;
}

.eim-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 4px;
  margin-bottom: 14px;
}

.eim-preset-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eim-preset-card:hover {
  border-color: var(--primary);
  background: var(--bg-hover);

}

.eim-preset-card--selected {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.05);
  box-shadow: 0 0 0 1px var(--primary);
}

.eim-preset-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eim-preset-card__badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.eim-preset-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.eim-preset-badge--grade {
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary);
}

.eim-preset-badge--code {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.eim-preset-badge--sc {
  background: rgba(147, 51, 234, 0.12);
  color: #9333ea;
  border: 1px solid rgba(147, 51, 234, 0.3);
}

.eim-preset-card__check {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.eim-preset-card__title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.25;
}

.eim-preset-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: auto;
}

.eim-presets-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  gap: 10px;
  margin-bottom: 14px;
}

.eim-empty-icon {
  color: var(--text-secondary);
  opacity: 0.5;
}

.eim-presets-empty p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

/* Bulk Paste / CSV Importer Enhancements */
.eim-format-guide-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.eim-guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.eim-guide-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.eim-guide-icon {
  color: var(--primary);
}

.eim-sample-buttons-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.eim-sample-buttons-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.eim-sample-buttons-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.eim-sample-btn {
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-sample-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--bg-hover);
}

.eim-sample-btn code {
  font-size: 0.7rem;
  opacity: 0.85;
}

.eim-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-dropzone:hover, .eim-dropzone--active {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.04);
}

.eim-dropzone-icon {
  color: var(--primary);
}

.eim-dropzone-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.eim-dropzone-text strong {
  color: var(--primary);
}

.eim-paste-controls-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.eim-preview-table-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.eim-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.eim-preview-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--text);
}

.eim-preview-success-icon {
  color: #10b981;
}

.eim-preview-duplicate-warning {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
}

.eim-preview-strand-badge {
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
}

.eim-preview-edit-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.eim-table-scroll-wrapper {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.eim-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.eim-preview-table th {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  padding: 8px 10px;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  z-index: 1;
}

.eim-preview-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}

.eim-preview-table tr:last-child td {
  border-bottom: none;
}

.eim-tr--duplicate {
  background: rgba(239, 68, 68, 0.05);
}

.eim-td-num {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-align: center;
}

.eim-table-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font-size: 0.8rem;
  font-family: inherit;
  box-sizing: border-box;
}

.eim-table-input:hover {
  border-color: var(--border);
  background: var(--bg-secondary);
}

.eim-table-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

.eim-table-input--code {
  font-weight: 700;
  color: var(--primary);
}

.eim-table-btn-delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.eim-table-btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* AI Prompts & JSON Templates Tab Styles */
.eim-ai-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eim-ai-hero-card {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(59, 130, 246, 0.08));
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eim-ai-hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eim-ai-hero-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eim-ai-sparkle-icon {
  color: #a855f7;
}

.eim-ai-hero-title h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.eim-ai-hero-desc {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.eim-ai-steps-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(168, 85, 247, 0.15);
  flex-wrap: wrap;
}

.eim-ai-step-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eim-ai-step-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #a855f7;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.eim-ai-step-text {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
}

.eim-ai-step-text strong {
  color: var(--text);
}

.eim-ai-step-text span {
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.eim-ai-step-arrow {
  color: var(--text-secondary);
  font-size: 0.9rem;
  opacity: 0.6;
}

.eim-templates-download-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eim-templates-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.eim-templates-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.eim-templates-icon {
  color: var(--primary);
}

.eim-templates-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.eim-templates-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.eim-template-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-template-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--bg-hover);
}

.eim-ai-prompts-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.eim-section-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.eim-prompt-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease;
}

.eim-prompt-card:hover {
  border-color: rgba(168, 85, 247, 0.4);
}

.eim-prompt-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.eim-prompt-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eim-prompt-card__meta h6 {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.eim-prompt-tag {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
}

.eim-prompt-tag--json {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.eim-prompt-tag--purple {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.eim-prompt-tag--blue {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.eim-copy-prompt-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(168, 85, 247, 0.4);
  background: rgba(168, 85, 247, 0.08);
  color: #a855f7;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.eim-copy-prompt-btn:hover {
  background: #a855f7;
  color: #ffffff;
  border-color: #a855f7;
}

.eim-copy-prompt-btn--copied {
  background: #10b981 !important;
  color: #ffffff !important;
  border-color: #10b981 !important;
}

.eim-prompt-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.eim-prompt-code-preview {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  overflow-x: auto;
}

.eim-prompt-code-preview pre {
  margin: 0;
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.35;
}

.eim-ai-shortcut-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(168, 85, 247, 0.06);
  border: 1px dashed rgba(168, 85, 247, 0.3);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.eim-ai-shortcut-icon {
  color: #a855f7;
  flex-shrink: 0;
}

.eim-inline-link {
  background: transparent;
  border: none;
  color: #a855f7;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
}

.eim-inline-link:hover {
  color: #9333ea;
}
</style>

