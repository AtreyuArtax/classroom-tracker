<template>
  <div class="setup__framework-container" v-if="activeClass">
    <!-- Assessment Framework -->
    <div class="setup__card">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 1rem;">
        <h2 class="setup__card-title" style="margin: 0;">Assessment Framework</h2>
        
        <!-- Course Section Tabs for Split Classes -->
        <div v-if="availableCourseSections.length > 1" class="setup__toggle-group" style="display: flex; gap: 6px;">
          <button 
            v-for="section in availableCourseSections" 
            :key="section"
            type="button"
            class="setup__btn-ghost"
            :style="activeCourseSection === section ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6', fontWeight: 'bold' } : {}"
            @click="activeCourseSection = section"
          >
            {{ section }}
          </button>
        </div>
      </div>
      
      <div v-if="frameworkWarning" class="setup__inline-banner" :class="'setup__inline-banner--' + frameworkBannerType">
        <CheckCircle2 v-if="frameworkBannerType === 'success'" :size="16" />
        <AlertTriangle v-else :size="16" />
        <span>{{ frameworkWarning }}</span>
        <button type="button" class="setup__inline-banner-close" @click="frameworkWarning = ''">&times;</button>
      </div>
      
      <!-- Traditional Mode: Categories & Weights -->
      <template v-if="!isSBAR">
        <h3 class="setup__card-subtitle">Categories (Weights)</h3>
        <div class="setup__gb-list">
          <div v-for="(cat, idx) in activeCategories" :key="cat.categoryId" class="setup__gb-item">
            <input v-model="cat.name" class="setup__input setup__input--naked" @input="debouncedSave" @change="saveGradebookSettings" />
            <div class="setup__gb-actions">
              <input v-model.number="cat.weight" type="number" class="setup__input setup__input--weight" @input="onCategoryWeightInput" @change="saveGradebookSettings" /><span>%</span>
              <button class="setup__icon-btn" :disabled="idx === 0" @click="moveCategory(idx, -1)"><ChevronUp :size="16" /></button>
              <button class="setup__icon-btn" :disabled="idx === activeCategories.length - 1" @click="moveCategory(idx, 1)"><ChevronDown :size="16" /></button>
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
      </template>

      <!-- SBAR Mode: Final Evaluation & Category Weighting (Optional) -->
      <template v-else>
        <div class="setup__sbar-weighting-section" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 class="setup__card-subtitle" style="margin: 0; display: flex; align-items: center; gap: 6px;">
                <Sliders :size="15" /> Course Evaluation Weights (Optional)
              </h3>
              <p class="setup__hint" style="margin: 2px 0 0 0;">
                Incorporate fixed-percentage final evaluations (e.g. Ontario 65/25/10, 70/30) alongside SBAR expectation mastery.
              </p>
            </div>
            <div class="setup__segmented-toggle">
              <button
                type="button"
                class="setup__segmented-btn"
                :class="{ 'setup__segmented-btn--active': !sbarWeightingEnabled }"
                @click="setSbarWeightingMode(false)"
              >
                <span>Pure SBAR (100%)</span>
              </button>
              <button
                type="button"
                class="setup__segmented-btn"
                :class="{ 'setup__segmented-btn--active': sbarWeightingEnabled }"
                @click="setSbarWeightingMode(true)"
              >
                <Sliders :size="14" class="setup__segmented-icon" />
                <span>Weighting Enabled</span>
              </button>
            </div>
          </div>

          <div v-if="sbarWeightingEnabled" class="setup__sbar-weighting-body" style="margin-top: 12px;">
            <!-- Presets bar -->
            <div class="setup__presets-bar" style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
              <span class="setup__bar-label" style="font-size: 0.78rem; font-weight: 600; align-self: center; color: var(--text-secondary);">Presets:</span>
              <button type="button" class="setup__btn-ghost setup__btn--small" @click="applySbarPreset('gr9_10')">
                Ontario Gr. 9 and 10 (65 / 20 / 15)
              </button>
              <button type="button" class="setup__btn-ghost setup__btn--small" @click="applySbarPreset('gr11_12')">
                Ontario Gr. 11 and 12 (65 / 25 / 10)
              </button>
            </div>

            <!-- Term Mastery Weight Row -->
            <div class="setup__gb-list">
              <div class="setup__gb-item" style="background: var(--surface-hover);">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <Layers :size="14" style="color: var(--primary);" />
                  <span style="font-weight: 600; font-size: 0.88rem;">Coursework (SBAR Expectations Mastery)</span>
                </div>
                <div class="setup__gb-actions">
                  <input 
                    v-model.number="sbarTermWeight" 
                    type="number" 
                    class="setup__input setup__input--weight" 
                    min="1" 
                    max="100"
                    @input="onSbarWeightInput" 
                    @change="saveSbarWeighting" 
                  />
                  <span>%</span>
                </div>
              </div>

              <!-- Fixed Component Rows (Written Exam, Attendance & Participation, etc.) -->
              <div v-for="(comp, idx) in sbarComponents" :key="comp.componentId" class="setup__gb-item">
                <input 
                  v-model="comp.name" 
                  class="setup__input setup__input--naked" 
                  placeholder="Component Name (e.g. Final Exam)"
                  @change="saveSbarWeighting" 
                />
                <div class="setup__gb-actions">
                  <input 
                    v-model.number="comp.weight" 
                    type="number" 
                    class="setup__input setup__input--weight" 
                    min="1" 
                    max="100"
                    @input="onSbarWeightInput" 
                    @change="saveSbarWeighting" 
                  />
                  <span>%</span>
                  <button class="setup__icon-btn setup__icon-btn--danger" @click="removeSbarComponent(idx)">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer: Add component + Total validation -->
            <div class="setup__category-footer" style="margin-top: 10px;">
              <button class="setup__btn-ghost setup__btn--full" @click="addSbarComponent">
                <Plus :size="14" /> Add Final Evaluation Component
              </button>
              <div class="setup__weight-total" :class="{ 
                'setup__weight-total--under': sbarTotalWeight < 100 && sbarTotalWeight > 0,
                'setup__weight-total--over': sbarTotalWeight > 100 
              }">
                Total: <strong>{{ sbarTotalWeight }}%</strong>
                <AlertTriangle v-if="sbarTotalWeight !== 100" :size="14" />
              </div>
            </div>
          </div>
        </div>
      </template>

      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <h3 class="setup__card-subtitle" style="margin: 0;">Units &amp; Expectations</h3>
          <!-- Course Section Tabs for Split Classes (Units & Expectations) -->
          <div v-if="availableCourseSections.length > 1" class="setup__toggle-group" style="display: flex; gap: 6px;">
            <button 
              v-for="section in availableCourseSections" 
              :key="section"
              type="button"
              class="setup__btn-ghost setup__btn--small"
              :style="activeCourseSection === section ? { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6', fontWeight: 'bold' } : {}"
              @click="activeCourseSection = section"
            >
              {{ section }}
            </button>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <!-- Expectation Search Box -->
          <div class="setup__search-box" v-if="totalExpectationsCount > 5">
            <Search :size="13" class="setup__search-icon" />
            <input 
              v-model="expectationSearchQuery" 
              type="text" 
              class="setup__search-input" 
              placeholder="Search code or desc..." 
            />
            <button v-if="expectationSearchQuery" type="button" class="setup__search-clear" @click="expectationSearchQuery = ''">
              <X :size="12" />
            </button>
          </div>

          <button 
            v-if="availableCourseSections.length > 1"
            type="button" 
            class="setup__btn-ghost setup__btn--small" 
            @click="copyUnitsToAllSections"
            title="Mirror unit names from active course tab to all other courses"
          >
            <Copy :size="14" /> Mirror Units
          </button>
          <button 
            type="button" 
            class="setup__btn-ghost setup__btn--small" 
            @click="showImportModal = true"
          >
            <BookOpen :size="14" /> Import Expectations
          </button>
        </div>
      </div>

      <div v-if="frameworkWarning" class="setup__inline-banner" :class="'setup__inline-banner--' + frameworkBannerType" style="margin-top: 10px;">
        <CheckCircle2 v-if="frameworkBannerType === 'success'" :size="16" />
        <AlertTriangle v-else :size="16" />
        <span>{{ frameworkWarning }}</span>
        <button type="button" class="setup__inline-banner-close" @click="frameworkWarning = ''">&times;</button>
      </div>

      <div class="setup__gb-list">
        <div v-for="(unit, idx) in activeUnits" :key="unit.unitId" class="setup__unit-container">
          <div class="setup__gb-item">
            <div class="setup__unit-title-group">
              <button 
                type="button"
                class="setup__icon-btn setup__expand-btn"
                @click="toggleUnitExpand(unit.unitId)"
              >
                <component :is="expandedUnitId === unit.unitId ? ChevronDown : ChevronRight" :size="16" />
              </button>
              <input v-model="unit.name" class="setup__input setup__input--naked" @change="saveGradebookSettings" />
              <span class="setup__unit-exp-count-badge" v-if="unit.expectations?.length">
                {{ unit.expectations.length }} exp{{ unit.expectations.length === 1 ? '' : 's' }}
              </span>
            </div>
            <div class="setup__gb-actions">
              <button type="button" class="setup__icon-btn" :disabled="idx === 0" @click="moveUnit(idx, -1)"><ChevronUp :size="16" /></button>
              <button type="button" class="setup__icon-btn" :disabled="idx === activeUnits.length - 1" @click="moveUnit(idx, 1)"><ChevronDown :size="16" /></button>
              <button type="button" class="setup__icon-btn setup__icon-btn--danger" @click="onDeleteUnit(unit.unitId)"><Trash2 :size="14" /></button>
            </div>
          </div>

          <!-- Expectations Panel (Expandable) -->
          <div v-if="expandedUnitId === unit.unitId" class="setup__expectations-panel">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h4 class="setup__expectations-title">Curriculum Expectations</h4>
              <span v-if="expectationSearchQuery" class="setup__search-filtered-note">
                Filtered by "{{ expectationSearchQuery }}"
              </span>
            </div>
            
            <div class="setup__expectations-list" v-if="getFilteredUnitExpectations(unit).length">
              <div 
                v-for="exp in getFilteredUnitExpectations(unit)" 
                :key="exp.expectationId" 
                class="setup__expectation-item"
                :class="{ 'setup__expectation-item--editing': editingExpectationId === exp.expectationId }"
              >
                <!-- Edit Mode Form -->
                <template v-if="editingExpectationId === exp.expectationId">
                  <div class="setup__exp-edit-form">
                    <input 
                      v-model="editingExpectationCode" 
                      class="setup__input setup__input--exp-code" 
                      placeholder="Code (e.g. B1.2)"
                      @keydown.enter="saveEditExpectation(unit, exp)"
                      @keydown.esc="cancelEditExpectation"
                    />
                    <div class="setup__weight-input-group" title="Expectation Weight Multiplier (e.g. 1.0, 2.0, 0.5, 0)">
                      <input 
                        v-model.number="editingExpectationWeight" 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="10" 
                        class="setup__input setup__input--exp-weight" 
                        placeholder="1.0" 
                        @keydown.enter="saveEditExpectation(unit, exp)"
                        @keydown.esc="cancelEditExpectation"
                      />
                      <span class="setup__weight-unit">×</span>
                    </div>
                    <input 
                      v-model="editingExpectationDesc" 
                      class="setup__input setup__input--exp-desc" 
                      placeholder="Expectation Description"
                      @keydown.enter="saveEditExpectation(unit, exp)"
                      @keydown.esc="cancelEditExpectation"
                    />
                    <div class="setup__exp-edit-actions">
                      <button 
                        type="button" 
                        class="setup__icon-btn setup__icon-btn--save" 
                        title="Save Changes" 
                        @click="saveEditExpectation(unit, exp)"
                      >
                        <Check :size="14" />
                      </button>
                      <button 
                        type="button" 
                        class="setup__icon-btn" 
                        title="Cancel" 
                        @click="cancelEditExpectation"
                      >
                        <X :size="14" />
                      </button>
                    </div>
                  </div>
                </template>

                <!-- Normal View Mode -->
                <template v-else>
                  <span class="setup__expectation-code">{{ exp.code }}</span>
                  <ExpectationWeightBadge :weight="exp.weight" />
                  <span class="setup__expectation-desc" :title="exp.description">{{ exp.description }}</span>
                  <div class="setup__expectation-actions">
                    <button 
                      type="button" 
                      class="setup__icon-btn" 
                      title="Edit Expectation Code & Description" 
                      @click="startEditExpectation(exp)"
                    >
                      <Edit2 :size="13" />
                    </button>
                    <button 
                      type="button" 
                      class="setup__icon-btn setup__icon-btn--danger" 
                      title="Delete Expectation"
                      @click="deleteExpectation(unit, exp.expectationId)"
                    >
                      <Trash2 :size="13" />
                    </button>
                  </div>
                </template>
              </div>
            </div>
            <div v-else-if="unit.expectations?.length" class="setup__expectations-empty">
              No expectations in this unit match "{{ expectationSearchQuery }}".
            </div>
            <div v-else class="setup__expectations-empty">
              No expectations defined for this unit.
            </div>

            <!-- Add Expectation Form -->
            <div class="setup__expectation-form">
              <input 
                v-model="newExpectationCode" 
                class="setup__input setup__input--exp-code" 
                placeholder="Code (e.g. B1.2)" 
                @keydown.enter.prevent="addExpectation(unit)"
              />
              <div class="setup__weight-input-group" title="Expectation Weight Multiplier (e.g. 1.0, 2.0, 0.5, 0)">
                <input 
                  v-model.number="newExpectationWeight" 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="10" 
                  class="setup__input setup__input--exp-weight" 
                  placeholder="1.0" 
                  @keydown.enter.prevent="addExpectation(unit)"
                />
                <span class="setup__weight-unit">×</span>
              </div>
              <input 
                v-model="newExpectationDesc" 
                class="setup__input setup__input--exp-desc" 
                placeholder="Expectation description" 
                @keydown.enter.prevent="addExpectation(unit)"
              />
              <button 
                type="button"
                class="setup__btn-ghost setup__btn--small" 
                @click="addExpectation(unit)"
                :disabled="!newExpectationCode.trim()"
              >
                <Plus :size="13" /> Add
              </button>
            </div>
          </div>
        </div>
        <button class="setup__btn-ghost setup__btn--full" @click="addUnit"><Plus :size="14" /> Add Unit</button>
      </div>

      <!-- Reusable Assessment Templates Bar -->
      <div class="setup__template-bar" style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px dashed var(--border);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="setup__card-subtitle" style="margin: 0; display: flex; align-items: center; gap: 6px;">
              <LayoutTemplate :size="15" /> Assessment Templates
            </h3>
            <p class="setup__hint" style="margin: 2px 0 0 0;">
              Save or load category weights and unit structures across classes.
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button 
              type="button" 
              class="setup__btn-primary setup__btn--small" 
              @click="openSaveTemplateModal"
            >
              <Save :size="13" /> Save Current Setup as Template
            </button>
          </div>
        </div>

        <!-- Inline Status / Warning Banner for Assessment Templates -->
        <div 
          v-if="templateNotice.text" 
          class="setup__inline-banner" 
          :class="'setup__inline-banner--' + templateNotice.type" 
          style="margin-top: 10px;"
        >
          <CheckCircle2 v-if="templateNotice.type === 'success'" :size="15" />
          <AlertTriangle v-else :size="15" />
          <span style="font-size: 0.84rem; font-weight: 600;">{{ templateNotice.text }}</span>
          <button type="button" class="setup__inline-banner-close" @click="templateNotice.text = ''">&times;</button>
        </div>

        <!-- Saved Templates List -->
        <div v-if="templates.length > 0" class="setup__gb-list" style="margin-top: 12px;">
          <div v-for="tmpl in templates" :key="tmpl.templateId" class="setup__gb-item" style="padding: 6px 12px;">
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span class="setup__tmpl-name" style="font-size: 0.85rem; font-weight: 600;">{{ tmpl.name }}</span>
              <span class="setup__tmpl-badge" style="font-size: 0.72rem; color: var(--text-secondary); opacity: 0.8;">
                {{ tmpl.categories?.length || 0 }} Categories · {{ tmpl.gradebookUnits?.length || 0 }} Units
              </span>
            </div>
            <div class="setup__gb-actions">
              <button 
                type="button" 
                class="setup__icon-btn" 
                @click="openPreviewTemplate(tmpl)" 
                title="Preview template categories and units"
              >
                <Eye :size="14" />
              </button>
              <button 
                type="button" 
                class="setup__pill-btn" 
                @click="onApplyTemplate(tmpl)" 
                title="Apply this template's categories and units to this class"
              >
                Apply
              </button>
              <button 
                type="button" 
                class="setup__icon-btn setup__icon-btn--danger" 
                @click="onDeleteTemplate(tmpl.templateId)" 
                title="Delete template"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Save Template Modal ── -->
    <BaseModal
      v-if="showSaveModal"
      :show="showSaveModal"
      title="Save Current Setup as Template"
      maxWidth="650px"
      @close="closeSaveTemplateModal"
    >
      <div class="template-preview">
        <p class="setup__hint" style="margin: 0 0 14px 0;">
          Save the framework from 
          <strong>{{ (availableCourseSections.length > 1 && activeCourseSection) ? `Section [${activeCourseSection}]` : activeClass?.name }}</strong> 
          as a reusable assessment template:
        </p>

        <!-- Template Name Input -->
        <div style="margin-bottom: 16px;">
          <label class="setup__mini-label" style="display: block; margin-bottom: 6px;">Template Name</label>
          <input 
            v-model="newTemplateName" 
            class="setup__input" 
            :style="saveModalError ? 'border-color: #f59e0b;' : ''"
            placeholder="e.g. SNC2D Grade 10 Science, 70/30 Standard..." 
            @input="saveModalError = ''"
            @keydown.enter.prevent="saveTemplate"
            autofocus
          />
          <div 
            v-if="saveModalError" 
            class="setup__inline-banner setup__inline-banner--warning" 
            style="margin-top: 8px; padding: 6px 10px; font-size: 0.8rem;"
          >
            <AlertTriangle :size="14" style="flex-shrink: 0;" />
            <span style="font-weight: 600;">{{ saveModalError }}</span>
          </div>
        </div>

        <!-- Categories Section -->
        <div class="template-preview__section">
          <h4 class="template-preview__title">
            <LayoutTemplate :size="15" /> Categories & Weights ({{ totalWeight }}% Total)
          </h4>
          <div v-if="!activeCategories || activeCategories.length === 0" class="setup__hint">
            No weighted categories configured.
          </div>
          <div v-else class="template-preview__cat-grid">
            <div 
              v-for="cat in activeCategories" 
              :key="cat.categoryId || cat.name" 
              class="template-preview__cat-chip"
            >
              <span class="template-preview__cat-name">{{ cat.name }}</span>
              <span class="template-preview__cat-weight">{{ cat.weight }}%</span>
            </div>
          </div>
        </div>

        <!-- Units & Curriculum Expectations Section -->
        <div class="template-preview__section" style="margin-top: 16px;">
          <h4 class="template-preview__title">
            <BookOpen :size="15" /> Curriculum Units & Expectations ({{ totalExpectationsCount }} Expectations)
          </h4>
          <div v-if="!activeUnits || activeUnits.length === 0" class="setup__hint">
            No curriculum units configured for this class.
          </div>
          <div v-else class="template-preview__units-list">
            <div 
              v-for="(unit, uIdx) in activeUnits" 
              :key="unit.unitId || uIdx"
              class="template-preview__unit-item"
            >
              <div class="template-preview__unit-header">
                <strong>Unit {{ uIdx + 1 }}: {{ unit.name }}</strong>
                <span class="setup__tag-badge setup__tag-badge--cat">{{ unit.expectations?.length || 0 }} Expectations</span>
              </div>
              <div v-if="unit.expectations && unit.expectations.length > 0" class="template-preview__exp-chips">
                <span 
                  v-for="exp in unit.expectations" 
                  :key="exp.expectationId || exp.code" 
                  class="template-preview__exp-chip"
                  :title="exp.description || exp.code"
                >
                  {{ exp.code }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button type="button" class="setup__btn-ghost" @click="closeSaveTemplateModal">Cancel</button>
        <button 
          type="button" 
          class="setup__btn-primary" 
          :disabled="!newTemplateName.trim()" 
          @click="saveTemplate"
        >
          Save Template
        </button>
      </template>
    </BaseModal>

    <!-- ── Template Preview Modal ── -->
    <BaseModal
      v-if="showPreviewModal && previewTemplate"
      :show="showPreviewModal"
      :title="`Template Preview: ${previewTemplate.name}`"
      maxWidth="650px"
      @close="closePreviewModal"
    >
      <div class="template-preview">
        <!-- Categories Section -->
        <div class="template-preview__section">
          <h4 class="template-preview__title">
            <LayoutTemplate :size="15" /> Categories & Weights ({{ getTemplateTotalWeight(previewTemplate) }}% Total)
          </h4>
          <div v-if="!previewTemplate.categories || previewTemplate.categories.length === 0" class="setup__hint">
            No weighted categories saved in this template.
          </div>
          <div v-else class="template-preview__cat-grid">
            <div 
              v-for="cat in previewTemplate.categories" 
              :key="cat.categoryId || cat.name" 
              class="template-preview__cat-chip"
            >
              <span class="template-preview__cat-name">{{ cat.name }}</span>
              <span class="template-preview__cat-weight">{{ cat.weight }}%</span>
            </div>
          </div>
        </div>

        <!-- Units & Curriculum Expectations Section -->
        <div class="template-preview__section" style="margin-top: 16px;">
          <h4 class="template-preview__title">
            <BookOpen :size="15" /> Curriculum Units & Expectations ({{ getTemplateTotalExpectations(previewTemplate) }} Expectations)
          </h4>
          <div v-if="!previewTemplate.gradebookUnits || previewTemplate.gradebookUnits.length === 0" class="setup__hint">
            No curriculum units saved in this template.
          </div>
          <div v-else class="template-preview__units-list">
            <div 
              v-for="(unit, uIdx) in previewTemplate.gradebookUnits" 
              :key="unit.unitId || uIdx"
              class="template-preview__unit-item"
            >
              <div class="template-preview__unit-header">
                <strong>Unit {{ uIdx + 1 }}: {{ unit.name }}</strong>
                <span class="setup__tag-badge setup__tag-badge--cat">{{ unit.expectations?.length || 0 }} Expectations</span>
              </div>
              <div v-if="unit.expectations && unit.expectations.length > 0" class="template-preview__exp-chips">
                <span 
                  v-for="exp in unit.expectations" 
                  :key="exp.expectationId || exp.code" 
                  class="template-preview__exp-chip"
                  :title="exp.description || exp.code"
                >
                  {{ exp.code }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button type="button" class="setup__btn-ghost" @click="closePreviewModal">Close</button>
        <button 
          type="button" 
          class="setup__btn-primary" 
          @click="applyFromPreview(previewTemplate)"
        >
          Apply to {{ activeClass?.name || 'Class' }}
        </button>
      </template>
    </BaseModal>

    <!-- Expectation Importer Modal -->
    <ExpectationImportModal
      v-model="showImportModal"
      :existing-units="activeUnits || []"
      :existing-count="totalExpectationsCount"
      :class-type="activeClass.classType || 'secondary'"
      @import="onExpectationImport"
      @clear="onClearExpectationsFromModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { globalMilestones } from '../../composables/useGradebook.js'
import { useMessage } from '../../composables/useMessage.js'
import * as gradebookService from '../../db/gradebookService.js'
import * as classService from '../../db/classService.js'
import * as settingsService from '../../db/settingsService.js'
import * as eventService from '../../db/eventService.js'
import { 
  ChevronUp, ChevronDown, Trash2, Plus, AlertTriangle, CheckCircle2, 
  ChevronRight, BookOpen, Copy, LayoutTemplate, Save, Edit2, Check, X, Search, 
  Eye, Flag, Sliders, Layers 
} from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import ExpectationImportModal from './ExpectationImportModal.vue'
import ExpectationWeightBadge from './ExpectationWeightBadge.vue'
import { cleanExpectationText } from '../../utils/textUtils.js'

const { activeClass, updateActiveClass, triggerActiveClass } = useClassroom()
const { alert, confirm } = useMessage()

const isSBAR = computed(() => activeClass.value?.gradingFramework === 'sbar')

const templates = ref([])
const newTemplateName = ref('')
const showImportModal = ref(false)
const showSaveModal = ref(false)
const saveModalError = ref('')
const previewTemplate = ref(null)
const showPreviewModal = ref(false)

const templateNotice = ref({ text: '', type: 'warning' })
let templateNoticeTimer = null

function showTemplateNotice(text, type = 'warning') {
  if (templateNoticeTimer) clearTimeout(templateNoticeTimer)
  templateNotice.value = { text, type }
  templateNoticeTimer = setTimeout(() => {
    templateNotice.value = { text: '', type: 'warning' }
  }, 6000)
}

function openSaveTemplateModal() {
  const baseName = (availableCourseSections.value.length > 1 && activeCourseSection.value) 
    ? activeCourseSection.value 
    : (activeClass.value?.courseCode || activeClass.value?.name || '')
  newTemplateName.value = baseName
  saveModalError.value = ''
  showSaveModal.value = true
}

function closeSaveTemplateModal() {
  showSaveModal.value = false
  saveModalError.value = ''
  newTemplateName.value = ''
}

const expandedUnitId = ref(null)
const newExpectationCode = ref('')
const newExpectationDesc = ref('')
const newExpectationWeight = ref(1.0)
const expectationSearchQuery = ref('')

const editingExpectationId = ref(null)
const editingExpectationCode = ref('')
const editingExpectationDesc = ref('')
const editingExpectationWeight = ref(1.0)

function toggleUnitExpand(unitId) {
  expandedUnitId.value = expandedUnitId.value === unitId ? null : unitId
  newExpectationCode.value = ''
  newExpectationDesc.value = ''
  newExpectationWeight.value = 1.0
  cancelEditExpectation()
}

function getFilteredUnitExpectations(unit) {
  if (!unit || !unit.expectations) return []
  if (!expectationSearchQuery.value.trim()) return unit.expectations
  const q = expectationSearchQuery.value.toLowerCase().trim()
  return unit.expectations.filter(e => 
    (e.code || '').toLowerCase().includes(q) || 
    (e.description || '').toLowerCase().includes(q)
  )
}

function startEditExpectation(exp) {
  editingExpectationId.value = exp.expectationId
  editingExpectationCode.value = exp.code || ''
  editingExpectationDesc.value = exp.description || ''
  editingExpectationWeight.value = (exp.weight !== undefined && exp.weight !== null && !isNaN(exp.weight)) ? Number(exp.weight) : 1.0
}

function cancelEditExpectation() {
  editingExpectationId.value = null
  editingExpectationCode.value = ''
  editingExpectationDesc.value = ''
  editingExpectationWeight.value = 1.0
}

async function saveEditExpectation(unit, exp) {
  const newCode = (editingExpectationCode.value || '').trim().toUpperCase()
  const newDesc = (editingExpectationDesc.value || '').trim()
  if (!newCode) {
    showWarning('Expectation code cannot be empty.')
    return
  }

  const oldCode = (exp.code || '').trim().toUpperCase()
  const codeChanged = oldCode && oldCode !== newCode

  if (codeChanged && activeClass.value?.classId) {
    const usage = await gradebookService.getExpectationUsageCounts(activeClass.value.classId, oldCode, exp.expectationId)
    if (usage.totalCount > 0) {
      const ok = await confirm(
        `Expectation code changed from "${oldCode}" to "${newCode}". Update ${usage.assessmentCount} assessment(s), ${usage.gradeCount} student score(s), and ${usage.eventCount} observation(s) across the class?`,
        `Rename Expectation — ${oldCode}`,
        { confirmLabel: 'Update & Cascade Rename' }
      )
      if (!ok) return

      const res = await gradebookService.cascadeRenameExpectation(activeClass.value.classId, oldCode, newCode, exp.expectationId)
      showSuccess(`Renamed to ${newCode} (Updated ${res.affectedAssessments} assessment(s) and student grades)`)
    }
  }

  exp.code = cleanExpectationText(newCode).toUpperCase()
  exp.description = cleanExpectationText(newDesc)
  exp.weight = (editingExpectationWeight.value !== undefined && editingExpectationWeight.value !== null && !isNaN(editingExpectationWeight.value)) 
    ? Number(editingExpectationWeight.value) 
    : 1.0
  cancelEditExpectation()
  await saveGradebookSettings()
}

function onExpectationImport(payload) {
  if (!activeClass.value) return
  
  let targetUnitsList = activeClass.value.gradebookUnits || []
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    _ensureSectionFramework(activeCourseSection.value)
    if (!activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits) {
      activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits = []
    }
    targetUnitsList = activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits
  } else if (!activeClass.value.gradebookUnits) {
    activeClass.value.gradebookUnits = []
    targetUnitsList = activeClass.value.gradebookUnits
  }

  if (payload.mode === 'auto-units') {
    // Mode A: Auto-Create Units from preset strands
    if (payload.importBehavior === 'replace') {
      targetUnitsList.length = 0
    }

    payload.preset.strands.forEach(strand => {
      const expList = []
      if (strand.overalls) {
        strand.overalls.forEach(ov => {
          const ovWeight = (ov.weight !== undefined && ov.weight !== null && !isNaN(ov.weight)) ? Number(ov.weight) : 1.0
          if (payload.granularity === 'overall') {
            expList.push({ 
              code: cleanExpectationText(ov.code), 
              description: cleanExpectationText(ov.description),
              weight: ovWeight
            })
          } else if ((payload.granularity === 'all' || payload.granularity === 'success_criteria') && ov.specifics && ov.specifics.length > 0) {
            ov.specifics.forEach(sp => {
              const spWeight = (sp.weight !== undefined && sp.weight !== null && !isNaN(sp.weight)) ? Number(sp.weight) : ovWeight
              expList.push({ 
                code: cleanExpectationText(sp.code), 
                description: cleanExpectationText(sp.description),
                weight: spWeight
              })
            })
          } else {
            // Preserve overall expectation if no specifics exist (e.g. foundational AA1/A1 in MTH1W)
            expList.push({ 
              code: cleanExpectationText(ov.code), 
              description: cleanExpectationText(ov.description || ov.name),
              weight: ovWeight
            })
          }
        })
      } else if (strand.expectations) {
        strand.expectations.forEach(e => expList.push({
          code: cleanExpectationText(e.code),
          description: cleanExpectationText(e.description),
          weight: (e.weight !== undefined && e.weight !== null && !isNaN(e.weight)) ? Number(e.weight) : 1.0
        }))
      }

      targetUnitsList.push({
        unitId: crypto.randomUUID(),
        name: cleanExpectationText(strand.name),
        expectations: expList.map(e => ({
          expectationId: crypto.randomUUID(),
          code: e.code,
          description: e.description,
          weight: e.weight != null ? e.weight : 1.0
        }))
      })
    })
  } else if (payload.mode === 'auto-paste-strands') {
    // Mode B: Auto-Create Units from parsed strands in paste/CSV
    if (payload.importBehavior === 'replace') {
      targetUnitsList.length = 0
    }

    payload.strands.forEach(strand => {
      targetUnitsList.push({
        unitId: crypto.randomUUID(),
        name: cleanExpectationText(strand.name),
        expectations: (strand.expectations || []).map(e => ({
          expectationId: crypto.randomUUID(),
          code: cleanExpectationText(e.code),
          description: cleanExpectationText(e.description),
          weight: (e.weight !== undefined && e.weight !== null && !isNaN(e.weight)) ? Number(e.weight) : 1.0
        }))
      })
    })
  } else if (payload.mode === 'attach-expectations') {
    // Mode C: Attach expectations to a target unit (or new unit)
    let targetUnit = null
    if (payload.targetUnitChoice === 'new') {
      targetUnit = {
        unitId: crypto.randomUUID(),
        name: cleanExpectationText(payload.newUnitName || 'Imported Unit'),
        expectations: []
      }
      targetUnitsList.push(targetUnit)
    } else {
      targetUnit = targetUnitsList.find(u => u.unitId === payload.targetUnitChoice)
    }

    if (targetUnit) {
      if (!targetUnit.expectations || payload.importBehavior === 'replace') {
        targetUnit.expectations = []
      }
      payload.expectations.forEach(e => {
        targetUnit.expectations.push({
          expectationId: crypto.randomUUID(),
          code: cleanExpectationText(e.code),
          description: cleanExpectationText(e.description),
          weight: (e.weight !== undefined && e.weight !== null && !isNaN(e.weight)) ? Number(e.weight) : 1.0
        })
      })
    }
  }

  saveGradebookSettings()
}

async function copyUnitsToAllSections() {
  if (!activeClass.value || availableCourseSections.value.length <= 1 || !activeCourseSection.value) return
  
  const currentUnits = activeUnits.value
  if (!currentUnits || currentUnits.length === 0) {
    showWarning('The current section has no units to mirror.')
    return
  }

  const sourceName = activeCourseSection.value
  const targetSections = availableCourseSections.value.filter(s => s !== sourceName)

  if (!await confirm(`Mirror ${currentUnits.length} unit name(s) from ${sourceName} to ${targetSections.join(', ')}? Existing unit names will be matched and preserved.`)) return

  if (!activeClass.value.courseFrameworks) activeClass.value.courseFrameworks = {}

  targetSections.forEach(sec => {
    if (!activeClass.value.courseFrameworks[sec]) {
      activeClass.value.courseFrameworks[sec] = {
        gradebookCategories: JSON.parse(JSON.stringify(activeClass.value.gradebookCategories || [])),
        gradebookUnits: []
      }
    }
    const existingTargetUnits = activeClass.value.courseFrameworks[sec].gradebookUnits || []
    
    // For each unit in active section, ensure a unit with matching name exists in target section
    const newTargetUnits = currentUnits.map(srcU => {
      const match = existingTargetUnits.find(u => u.name && u.name.trim().toLowerCase() === srcU.name.trim().toLowerCase())
      if (match) {
        return match // Preserve target unit and its expectations
      }
      return {
        unitId: crypto.randomUUID(),
        name: srcU.name,
        expectations: []
      }
    })
    
    activeClass.value.courseFrameworks[sec].gradebookUnits = newTargetUnits
  })

  await saveGradebookSettings()
  showSuccess(`Units mirrored from ${sourceName} to ${targetSections.join(', ')}!`)
}

async function addExpectation(unit) {
  if (!newExpectationCode.value.trim()) return
  if (!unit.expectations) {
    unit.expectations = []
  }
  const cleanWeight = (newExpectationWeight.value !== undefined && newExpectationWeight.value !== null && !isNaN(newExpectationWeight.value))
    ? Number(newExpectationWeight.value)
    : 1.0
  unit.expectations.push({
    expectationId: crypto.randomUUID(),
    code: newExpectationCode.value.trim().toUpperCase(),
    description: newExpectationDesc.value.trim(),
    weight: cleanWeight
  })
  newExpectationCode.value = ''
  newExpectationDesc.value = ''
  newExpectationWeight.value = 1.0
  await saveGradebookSettings()
}

async function deleteExpectation(unit, expectationId) {
  if (!activeClass.value) return
  const targetExp = unit.expectations?.find(e => e.expectationId === expectationId)
  const expCode = targetExp?.code || ''

  const usage = await gradebookService.getExpectationUsageCounts(activeClass.value.classId, expCode, expectationId)

  if (usage.totalCount > 0) {
    const ok = await confirm(
      `Delete expectation "${expCode}"? Warning: It is referenced in ${usage.assessmentCount} assessment(s), ${usage.gradeCount} recorded student grade(s), and ${usage.eventCount} observation(s). Deleting it will detach it from future grading calculations.`,
      `Delete Assessed Expectation — ${expCode}`,
      { confirmLabel: 'Delete Expectation', danger: true }
    )
    if (!ok) return

    await gradebookService.detachExpectationFromAssessmentsAndGrades(activeClass.value.classId, expCode, expectationId)
    await eventService.detachEventsForDeletedExpectation(activeClass.value.classId, expectationId)
  } else {
    if (!await confirm(`Delete expectation "${expCode || 'this expectation'}"?`)) return
  }

  unit.expectations = unit.expectations.filter(e => e.expectationId !== expectationId)
  await saveGradebookSettings()
}

const activeCourseSection = ref('')

const availableCourseSections = computed(() => {
  if (!activeClass.value || activeClass.value.classType === 'elementary') return []
  const codes = new Set()
  if (activeClass.value.students) {
    Object.values(activeClass.value.students).forEach(st => {
      if (st.courseCode && !st.archived && st.courseCode.trim()) codes.add(st.courseCode.trim())
    })
  }
  if (activeClass.value.courseSections && activeClass.value.courseSections.length > 1) {
    const valid = activeClass.value.courseSections.filter(s => codes.has(s))
    if (valid.length > 1) return valid
  }
  if (codes.size <= 1) return []
  return Array.from(codes).sort()
})

watch(availableCourseSections, (list) => {
  if (list.length > 0 && (!activeCourseSection.value || !list.includes(activeCourseSection.value))) {
    activeCourseSection.value = list[0]
  }
}, { immediate: true })

function _ensureSectionFramework(section) {
  if (!activeClass.value || !section) return
  if (!activeClass.value.courseFrameworks) {
    activeClass.value.courseFrameworks = {}
  }
  if (!activeClass.value.courseFrameworks[section]) {
    activeClass.value.courseFrameworks[section] = {
      gradebookCategories: JSON.parse(JSON.stringify(activeClass.value.gradebookCategories || [])),
      gradebookUnits: JSON.parse(JSON.stringify(activeClass.value.gradebookUnits || []))
    }
  }
}

const activeCategories = computed(() => {
  categoriesRevision.value
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    _ensureSectionFramework(activeCourseSection.value)
    return activeClass.value.courseFrameworks[activeCourseSection.value].gradebookCategories
  }
  return activeClass.value?.gradebookCategories || []
})

const activeUnits = computed(() => {
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    _ensureSectionFramework(activeCourseSection.value)
    return activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits
  }
  return activeClass.value?.gradebookUnits || []
})

const totalExpectationsCount = computed(() => {
  return (activeUnits.value || []).reduce((acc, u) => acc + (u.expectations?.length || 0), 0)
})

async function onClearExpectationsFromModal() {
  if (!activeClass.value) return
  let loggedEventsCount = 0
  if (activeClass.value.classId) {
    const classEvents = await eventService.getEventsByClass(activeClass.value.classId)
    const currentExpIds = new Set(
      (activeUnits.value || []).flatMap(u => (u.expectations || []).map(e => e.expectationId || e.code).filter(Boolean))
    )
    loggedEventsCount = classEvents.filter(e => e.expectationId && currentExpIds.has(e.expectationId)).length
  }

  let promptMessage = `Clear all ${totalExpectationsCount.value} expectations? (Unit names will be preserved)`
  if (loggedEventsCount > 0) {
    promptMessage = `Clear all ${totalExpectationsCount.value} expectations? Warning: There are ${loggedEventsCount} logged student observations/conversations linked to these expectations. (Unit names will be preserved)`
  }

  const ok = await confirm(
    promptMessage,
    'Clear Expectations',
    { confirmLabel: 'Clear Expectations', danger: true }
  )
  if (!ok) return
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    (activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits || []).forEach(u => {
      u.expectations = []
    })
  } else {
    (activeClass.value.gradebookUnits || []).forEach(u => {
      u.expectations = []
    })
  }
  await saveGradebookSettings()
  showImportModal.value = false
}

const categoriesRevision = ref(0)

function onCategoryWeightInput() {
  categoriesRevision.value++
  debouncedSave()
}

const totalWeight = computed(() => {
  categoriesRevision.value
  if (!activeCategories.value) return 0
  return activeCategories.value.reduce((sum, c) => sum + (Number(c.weight) || 0), 0)
})

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
  () => activeClass.value?.gradebookUnits,
  () => debouncedSave(),
  { deep: true }
)

watch(
  () => activeClass.value?.courseFrameworks,
  () => debouncedSave(),
  { deep: true }
)

async function saveGradebookSettings() {
  if (!activeClass.value) return
  await updateActiveClass({
    gradebookCategories: activeClass.value.gradebookCategories,
    gradebookUnits: activeClass.value.gradebookUnits,
    gradebookNotes: activeClass.value.gradebookNotes,
    courseFrameworks: activeClass.value.courseFrameworks,
    sbarWeighting: activeClass.value.sbarWeighting
  })
  await settingsService.saveGlobalMilestones(JSON.parse(JSON.stringify(globalMilestones.value)))
}

// ── SBAR Evaluation Weighting Helpers ──
const sbarRevision = ref(0)
const sbarWeighting = computed(() => {
  sbarRevision.value
  return activeClass.value?.sbarWeighting || null
})
const sbarWeightingEnabled = computed(() => {
  sbarRevision.value
  return !!activeClass.value?.sbarWeighting?.enabled
})

const sbarTermWeight = computed({
  get: () => {
    sbarRevision.value
    return activeClass.value?.sbarWeighting?.termWeight ?? 65
  },
  set: (val) => {
    if (!activeClass.value) return
    if (!activeClass.value.sbarWeighting) {
      activeClass.value.sbarWeighting = { enabled: true, termWeight: 65, components: [] }
    }
    activeClass.value.sbarWeighting.termWeight = Number(val)
    sbarRevision.value++
  }
})

const sbarComponents = computed(() => {
  sbarRevision.value
  if (!activeClass.value?.sbarWeighting?.components) return []
  return activeClass.value.sbarWeighting.components
})

const sbarTotalWeight = computed(() => {
  sbarRevision.value
  if (!sbarWeightingEnabled.value) return 100
  const term = Number(sbarTermWeight.value || 0)
  const comps = (sbarComponents.value || []).reduce((sum, c) => sum + Number(c.weight || 0), 0)
  return term + comps
})

let sbarDebounceTimer = null
function onSbarWeightInput() {
  sbarRevision.value++
  if (sbarDebounceTimer) clearTimeout(sbarDebounceTimer)
  sbarDebounceTimer = setTimeout(() => {
    saveSbarWeighting()
  }, 400)
}

async function setSbarWeightingMode(enabled) {
  if (!activeClass.value) return
  if (enabled === sbarWeightingEnabled.value) return
  await toggleSbarWeighting()
}

async function toggleSbarWeighting() {
  if (!activeClass.value) return
  const current = activeClass.value.sbarWeighting
  if (!current || !current.enabled) {
    activeClass.value.sbarWeighting = {
      enabled: true,
      termWeight: 65,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 25, type: 'exam' },
        { componentId: 'comp_att', name: 'Attendance & Participation', weight: 10, type: 'attendance' }
      ]
    }
  } else {
    activeClass.value.sbarWeighting.enabled = false
  }
  sbarRevision.value++
  await saveSbarWeighting()
}

async function applySbarPreset(preset) {
  if (!activeClass.value) return
  if (preset === 'gr9_10') {
    activeClass.value.sbarWeighting = {
      enabled: true,
      termWeight: 65,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 20, type: 'exam' },
        { componentId: 'comp_att', name: 'Attendance & Participation', weight: 15, type: 'attendance' }
      ]
    }
  } else if (preset === 'gr11_12' || preset === 'gr11') {
    activeClass.value.sbarWeighting = {
      enabled: true,
      termWeight: 65,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 25, type: 'exam' },
        { componentId: 'comp_att', name: 'Attendance & Participation', weight: 10, type: 'attendance' }
      ]
    }
  } else if (preset === '70_30') {
    activeClass.value.sbarWeighting = {
      enabled: true,
      termWeight: 70,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 30, type: 'exam' }
      ]
    }
  }
  sbarRevision.value++
  await saveSbarWeighting()
}

async function addSbarComponent() {
  if (!activeClass.value) return
  if (!activeClass.value.sbarWeighting) {
    activeClass.value.sbarWeighting = { enabled: true, termWeight: 65, components: [] }
  }
  const compId = 'comp_' + crypto.randomUUID().slice(0, 8)
  activeClass.value.sbarWeighting.components.push({
    componentId: compId,
    name: 'New Component',
    weight: 0
  })
  sbarRevision.value++
  await saveSbarWeighting()
}

async function removeSbarComponent(idx) {
  if (!activeClass.value?.sbarWeighting?.components) return
  activeClass.value.sbarWeighting.components.splice(idx, 1)
  sbarRevision.value++
  await saveSbarWeighting()
}

async function saveSbarWeighting() {
  if (!activeClass.value) return
  if (activeClass.value.sbarWeighting?.enabled) {
    await gradebookService.ensureSbarComponentAssessments(activeClass.value)
  }
  await updateActiveClass({
    sbarWeighting: activeClass.value.sbarWeighting
  })
  triggerActiveClass()
}

async function addCategory() {
  if (!activeClass.value) return
  const newCat = {
    categoryId: crypto.randomUUID(),
    name: 'New Category',
    weight: 0
  }
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    _ensureSectionFramework(activeCourseSection.value)
    const current = activeClass.value.courseFrameworks[activeCourseSection.value].gradebookCategories || []
    activeClass.value.courseFrameworks[activeCourseSection.value].gradebookCategories = [...current, newCat]
  } else {
    const current = activeClass.value.gradebookCategories || []
    activeClass.value.gradebookCategories = [...current, newCat]
  }
  categoriesRevision.value++
  triggerActiveClass()
  await saveGradebookSettings()
}

async function moveCategory(index, direction) {
  if (!activeClass.value) return
  const cats = [...activeCategories.value]
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= cats.length) return

  const temp = cats[index]
  cats[index] = cats[newIndex]
  cats[newIndex] = temp

  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    activeClass.value.courseFrameworks[activeCourseSection.value].gradebookCategories = cats
  } else {
    activeClass.value.gradebookCategories = cats
  }
  categoriesRevision.value++
  triggerActiveClass()
  await saveGradebookSettings()
}

async function moveUnit(index, direction) {
  if (!activeClass.value) return
  const units = [...activeUnits.value]
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= units.length) return

  const temp = units[index]
  units[index] = units[newIndex]
  units[newIndex] = temp

  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits = units
  } else {
    activeClass.value.gradebookUnits = units
  }
  triggerActiveClass()
  await saveGradebookSettings()
}

const frameworkWarning = ref('')
const frameworkBannerType = ref('warning')

function showWarning(msg) {
  frameworkWarning.value = msg
  frameworkBannerType.value = 'warning'
  setTimeout(() => {
    if (frameworkWarning.value === msg) frameworkWarning.value = ''
  }, 6000)
}

function showSuccess(msg) {
  frameworkWarning.value = msg
  frameworkBannerType.value = 'success'
  setTimeout(() => {
    if (frameworkWarning.value === msg) frameworkWarning.value = ''
  }, 6000)
}

async function onDeleteCategory(cat) {
  if (!activeClass.value) return
  
  const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  const inUse = assessments.some(a => a.categoryId === cat.categoryId)
  
  if (inUse) {
    await alert(`Cannot delete category "${cat.name}" because it has assessments assigned to it in the Gradebook. Remove or reassign all assessments in this category first.`, 'Category In Use')
    return
  }

  if (!await confirm(`Delete category "${cat.name}"?`)) return

  if (activeCategories.value.length <= 1) {
    await alert('At least one category is required.', 'Cannot Delete')
    return
  }

  const updated = activeCategories.value.filter(c => c.categoryId !== cat.categoryId)
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    activeClass.value.courseFrameworks[activeCourseSection.value].gradebookCategories = updated
  } else {
    activeClass.value.gradebookCategories = updated
  }
  categoriesRevision.value++
  triggerActiveClass()
  await saveGradebookSettings()
}

async function addUnit() {
  if (!activeClass.value) return
  const newUnit = {
    unitId: crypto.randomUUID(),
    name: 'New Unit',
    expectations: []
  }
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    _ensureSectionFramework(activeCourseSection.value)
    const current = activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits || []
    activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits = [...current, newUnit]
  } else {
    const current = activeClass.value.gradebookUnits || []
    activeClass.value.gradebookUnits = [...current, newUnit]
  }
  triggerActiveClass()
  await saveGradebookSettings()
}

async function onDeleteUnit(unitId) {
  if (!activeClass.value) return
  const unit = activeUnits.value.find(u => u.unitId === unitId)
  
  const assessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  const inUse = assessments.some(a => a.unitId === unitId)
  
  if (inUse) {
    await alert(`Cannot delete unit "${unit?.name || 'this unit'}" because it has assessments assigned to it. Remove or reassign all assessments in this unit before deleting.`, 'Unit In Use')
    return
  }

  const classEvents = await eventService.getEventsByClass(activeClass.value.classId)
  const count = classEvents.filter(e => e.unitId === unitId).length

  let confirmMsg = `Delete unit "${unit?.name || 'this unit'}"?`
  if (count > 0) {
    confirmMsg = `Delete unit "${unit?.name || 'this unit'}"? Warning: There are ${count} logged student observations/conversations associated with it. Deleting it will convert these comments into general observations.`
  }

  if (!await confirm(confirmMsg)) return

  if (count > 0) {
    await eventService.detachEventsForDeletedUnit(activeClass.value.classId, unitId)
  }

  const updated = activeUnits.value.filter(u => u.unitId !== unitId)
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    activeClass.value.courseFrameworks[activeCourseSection.value].gradebookUnits = updated
  } else {
    activeClass.value.gradebookUnits = updated
  }
  triggerActiveClass()
  await saveGradebookSettings()
}

function openPreviewTemplate(tmpl) {
  previewTemplate.value = tmpl
  showPreviewModal.value = true
}

function closePreviewModal() {
  showPreviewModal.value = false
  previewTemplate.value = null
}

function getTemplateTotalWeight(tmpl) {
  if (!tmpl || !tmpl.categories) return 0
  return tmpl.categories.reduce((acc, c) => acc + (Number(c.weight) || 0), 0)
}

function getTemplateTotalExpectations(tmpl) {
  if (!tmpl || !tmpl.gradebookUnits) return 0
  return tmpl.gradebookUnits.reduce((acc, u) => acc + (u.expectations?.length || 0), 0)
}

async function applyFromPreview(tmpl) {
  closePreviewModal()
  await onApplyTemplate(tmpl)
}

async function saveTemplate() {
  if (!activeClass.value) return
  const name = newTemplateName.value.trim()
  if (!name) {
    saveModalError.value = 'Please enter a template name.'
    return
  }
  
  const existing = templates.value.some(t => t.name.toLowerCase() === name.toLowerCase())
  if (existing) {
    saveModalError.value = `A template named "${name}" already exists. Please choose a unique name.`
    return
  }

  const classData = {
    gradebookCategories: JSON.parse(JSON.stringify(activeCategories.value || [])),
    gradebookUnits: JSON.parse(JSON.stringify(activeUnits.value || []))
  }

  const template = await gradebookService.saveGradebookTemplate(name, classData)
  templates.value.push(template)
  closeSaveTemplateModal()
  showTemplateNotice(`Template "${template.name}" saved successfully!`, 'success')
}

async function onApplyTemplate(template) {
  if (!activeClass.value) return
  
  // Check if assessments exist for this class to avoid orphaning grades
  const classAssessments = await gradebookService.getAssessmentsByClass(activeClass.value.classId)
  if (classAssessments && classAssessments.length > 0) {
    showTemplateNotice(
      `Cannot apply template: "${activeClass.value.name}" already has ${classAssessments.length} assessment(s) logged in the Gradebook. Templates can only be applied to newly created or empty courses.`,
      'warning'
    )
    return
  }
  
  const targetLabel = (availableCourseSections.value.length > 1 && activeCourseSection.value)
    ? `section [${activeCourseSection.value}] in ${activeClass.value.name}`
    : `${activeClass.value.name}`

  const confirmMsg = `Apply template "${template.name}" to ${targetLabel}?\n\n⚠️ WARNING: This will overwrite and replace all currently configured categories, weights, and unit expectations for ${targetLabel}. Any unsaved custom category setup will be reset.\n\nAre you sure you want to proceed?`
  if (!await confirm(confirmMsg, 'Apply Assessment Template', { danger: true })) return
  
  const categories = (template.categories || []).map(c => ({ ...c, categoryId: crypto.randomUUID() }))
  const gradebookUnits = (template.gradebookUnits || []).map(u => ({
    ...u,
    unitId: crypto.randomUUID(),
    expectations: (u.expectations || []).map(e => ({
      ...e,
      expectationId: crypto.randomUUID()
    }))
  }))

  await activeClassClassCategoriesUpdate(categories, gradebookUnits)
  showTemplateNotice(`Template "${template.name}" applied successfully to ${targetLabel}!`, 'success')
}

async function activeClassClassCategoriesUpdate(categories, gradebookUnits = []) {
  if (availableCourseSections.value.length > 1 && activeCourseSection.value) {
    if (!activeClass.value.courseFrameworks) activeClass.value.courseFrameworks = {}
    activeClass.value.courseFrameworks[activeCourseSection.value] = {
      gradebookCategories: categories,
      gradebookUnits: gradebookUnits
    }
  } else {
    activeClass.value.gradebookCategories = categories
    activeClass.value.gradebookUnits = gradebookUnits
  }
  categoriesRevision.value++
  triggerActiveClass()
  await saveGradebookSettings()
}

async function onDeleteTemplate(templateId) {
  if (!await confirm('Delete this template?')) return
  await gradebookService.deleteGradebookTemplate(templateId)
  templates.value = templates.value.filter(t => t.templateId !== templateId)
}

onMounted(async () => {
  templates.value = await gradebookService.getGradebookTemplates()
})
</script>

<style scoped>
.template-preview {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.template-preview__section {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}

.template-preview__title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-preview__cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.template-preview__cat-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
}

.template-preview__cat-name {
  font-weight: 600;
  color: var(--text);
}

.template-preview__cat-weight {
  font-weight: 800;
  color: var(--primary);
}

.template-preview__units-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-preview__unit-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}

.template-preview__unit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.template-preview__exp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.template-preview__exp-chip {
  font-size: 0.72rem;
  font-family: monospace;
  font-weight: 700;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--text);
}

.template-preview__milestones-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.template-preview__ms-chip {
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--text);
}

.setup__gb-list { display: flex; flex-direction: column; gap: 8px; }
.setup__gb-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-secondary); border-radius: var(--radius-md); gap: 12px; }
.setup__gb-actions { display: flex; align-items: center; gap: 12px; }
.setup__card { background: var(--surface); padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
.setup__card-title { font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
.setup__hint { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; }
.setup__input { width: 100%; min-height: 44px; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-input, rgba(255,255,255,0.04)); color: var(--text); font-size: 0.9rem; font-weight: 600; transition: border-color 0.15s ease, box-shadow 0.15s ease; box-sizing: border-box; }
.setup__input:focus { outline: none; border-color: var(--primary); }
.setup__btn-ghost { min-height: 44px; padding: 0 20px; border: 1px solid var(--border); border-radius: var(--radius-md); background: transparent; color: var(--text); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.15s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.setup__btn-ghost:hover:not(:disabled) { background: var(--bg-hover); }
.setup__pill-btn { padding: 6px 12px; border-radius: 100px; border: 1px solid var(--border); background: transparent; color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
.setup__pill-btn:hover { border-color: var(--primary); color: var(--primary); }
.setup__icon-btn { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease, color 0.15s ease; }
.setup__icon-btn:hover { background: var(--bg-hover); color: var(--text); }
.setup__icon-btn--danger:hover { background: #fee2e2 !important; color: #dc2626 !important; }
.setup__input--naked { background: transparent !important; border: none !important; padding: 0 !important; min-height: auto !important; font-weight: 600 !important; flex-grow: 1; color: var(--text); }
.setup__input--weight { width: 65px !important; text-align: center; min-height: 32px !important; padding: 4px 6px !important; }
.setup__input--weight::-webkit-outer-spin-button, .setup__input--weight::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.setup__input--weight { -moz-appearance: textfield; }
.setup__textarea { width: 100%; min-height: 100px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text); font-size: 0.9rem; resize: vertical; box-sizing: border-box; }
.setup__textarea:focus { outline: none; border-color: var(--primary); }
.setup__template-save { display: flex; gap: 8px; }
.setup__template-save .setup__input { flex: 1; }
.setup__template-apply { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
.setup__card-subtitle { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; }
.setup__tmpl-name { font-size: 0.9rem; font-weight: 600; }
.setup__btn--full { width: 100%; }
.setup__category-footer { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 8px; }
.setup__weight-total { font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.setup__weight-total--under { color: #b45309; }
.setup__weight-total--over { color: #b91c1c; }
.setup__unit-container { display: flex; flex-direction: column; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border); overflow: hidden; }
.setup__unit-container .setup__gb-item { border-radius: 0; background: transparent; border: none; }
.setup__unit-title-group { display: flex; align-items: center; gap: 8px; flex-grow: 1; }
.setup__expand-btn { padding: 4px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
.setup__expectations-panel { padding: 12px 16px 16px 16px; background: rgba(0, 0, 0, 0.15); border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
.setup__expectations-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em; margin: 0; }
.setup__expectations-list { display: flex; flex-direction: column; gap: 6px; }
.setup__expectation-item { display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: var(--surface); border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 0.85rem; }
.setup__expectation-code { font-weight: 700; color: var(--primary); background: rgba(59, 130, 246, 0.1); padding: 2px 6px; border-radius: var(--radius-sm); font-size: 0.75rem; }
.setup__expectation-desc { flex: 1; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.setup__expectations-empty { font-size: 0.8rem; color: var(--text-secondary); font-style: italic; }
.setup__expectation-form { display: flex; gap: 8px; margin-top: 4px; }
.setup__input--exp-code { width: 120px !important; min-height: 36px !important; padding: 6px 10px !important; font-size: 0.8rem !important; }
.setup__input--exp-desc { flex: 1; min-height: 36px !important; padding: 6px 10px !important; font-size: 0.8rem !important; }
.setup__btn--small { min-height: 36px !important; padding: 0 12px !important; font-size: 0.8rem !important; }
.setup__inline-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 1rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.3; }
.setup__inline-banner--warning { background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b; }
.setup__inline-banner--success { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; }
.setup__inline-banner-close { margin-left: auto; background: none; border: none; color: currentColor; font-size: 1.1rem; cursor: pointer; opacity: 0.7; padding: 0 4px; }
.setup__inline-banner-close:hover { opacity: 1; }

/* Expectation Search & Unit Badges */
.setup__search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 170px;
}
.setup__search-icon {
  position: absolute;
  left: 8px;
  color: var(--text-secondary);
  pointer-events: none;
}
.setup__search-input {
  width: 100%;
  min-height: 32px !important;
  padding: 4px 26px 4px 28px !important;
  font-size: 0.78rem !important;
  border-radius: var(--radius-md) !important;
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border) !important;
}
.setup__search-clear {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.setup__unit-exp-count-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary);
  margin-left: 6px;
}
.setup__search-filtered-note {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* Expectation Item & Inline Edit Form */
.setup__expectation-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.setup__expectation-item--editing {
  background: var(--bg-hover) !important;
  border-color: var(--primary) !important;
  padding: 4px 8px !important;
}
.setup__exp-edit-form {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.setup__exp-edit-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.setup__icon-btn--save {
  color: #10b981 !important;
}
.setup__icon-btn--save:hover {
  background: rgba(16, 185, 129, 0.15) !important;
}

/* Save Template Modal Styles */
.template-save-modal {
  display: flex;
  flex-direction: column;
}
.template-save-modal__summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 8px;
  text-align: center;
}
.template-save-modal__summary-val {
  display: block;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--primary);
}
.template-save-modal__summary-lbl {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}

.setup__weight-input-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-surface, var(--bg-primary));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  padding: 0 4px;
  min-height: 36px;
}

.setup__input--exp-weight {
  width: 44px !important;
  min-height: 32px !important;
  padding: 4px 2px !important;
  font-size: 0.8rem !important;
  font-weight: 600 !important;
  border: none !important;
  background: transparent !important;
  color: var(--text) !important;
  text-align: right;
  outline: none;
}

.setup__weight-unit {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  user-select: none;
  padding-right: 2px;
}
</style>


