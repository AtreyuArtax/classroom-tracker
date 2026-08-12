# Graph Report - src  (2026-08-11)

## Corpus Check
- 151 files · ~264,679 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 855 nodes · 1480 edges · 83 communities (78 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6e27ae23`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 81 edges
2. `useMessage()` - 39 edges
3. `useClassroom()` - 14 edges
4. `saveGradebookSettings()` - 13 edges
5. `loadGradebook()` - 13 edges
6. `_readSettings()` - 12 edges
7. `enqueueDBSave()` - 10 edges
8. `patchStudent()` - 10 edges
9. `calculateStudentGrade()` - 10 edges
10. `preciseRound()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `onThresholdChange()` --calls--> `refreshClassAnalytics()`  [EXTRACTED]
  components/GradesAnalyticsPanel.vue → composables/useGradebook.js
- `fetchEvents()` --calls--> `getEventsByStudent()`  [EXTRACTED]
  components/dossier/ProgressReport.vue → db/eventService.js
- `formatDate()` --calls--> `formatLocalDisplay()`  [EXTRACTED]
  components/dossier/ProgressReport.vue → utils/dates.js
- `downloadReportCardCsv()` --calls--> `loadGradebook()`  [EXTRACTED]
  components/reports/ReportsExportMenu.vue → composables/useGradebook.js
- `editEvent()` --calls--> `getDB()`  [EXTRACTED]
  composables/useClassroom.js → db/index.js

## Import Cycles
- None detected.

## Communities (83 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (34): getStudentEffectiveGrade(), getUnitGradeLevel(), activeGradeFilter, addAssessment(), assessmentSortOrder, assessmentStats, assessmentTypes, availableCourseFilters (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (25): checkSyncStatus(), { clear: clearUndo }, { computeSuggestedClass }, currentComponent, currentView, Grades, { init, isScannerOpen }, isSyncing (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (29): getSettings(), getAssessmentsByClass(), auditGradebookData(), calculateAssessmentAnalytics(), calculateClassAnalytics(), deleteGradebookTemplate(), getExclusionResults(), getGradebookTemplates() (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (25): syncLateActiveState(), archivedRoster, checkResize(), computeWeeklyStats(), confirmResize(), dismissedSuggestions, dismissSuggestion(), editEvent() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (19): close(), emit, props, academicCategories, allDossierAssessments, attendanceAverages, behaviorWeeklyTrend, classAssessments (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (31): activeCategories, activeClassClassCategoriesUpdate(), activeCourseSection, activeUnits, addCategory(), addExpectation(), addUnit(), availableCourseSections (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (19): exportGradebookToExcel(), { activeClass, teacherName }, auditMsg, auditReport, backupMsg, { confirm, alert }, exportMsg, fixInvalidCategories() (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (16): { 
  activeClass, 
  classList,
  periodOptions, 
  periodStartTimes, 
  updatePeriodStartTimes, 
  selectedYear, 
  selectedSemester,
  teachingMode,
  importRoster, 
  bulkImportClasses, 
  moveStudentFromClass 
}, { alert, confirm }, bulkAvailableSemesters, bulkImportGroups, bulkImportSemesters, crossClassConflicts, currentSchoolYear, importResult (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (17): _applyDateRange(), deleteEvent(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit(), exportAllData(), getAllEvents(), getDateRangeForClassPeriod(), getDateRangeForPeriod() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (28): activeSubjectId, teachingMode, detectGradeFromClassName(), getEffectiveGradeLevel(), parseGradesFromClass(), populateSubjectFromPreset(), populateSubjectFromPresets(), curriculumPresets (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (22): auditSettingsIntegrity(), deleteBehaviorCode(), getAcademicTerms(), getAttendanceConfig(), getBehaviorCodes(), getGlobalMilestones(), getGradeBuckets(), getNonSchoolDays() (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (30): archiveClass(), archiveStudent(), bulkImportClasses(), clearAllData(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), deleteClass() (+22 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (16): activeCategory, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap(), handleProfileTap() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (19): logAssessmentEvent(), activeClass, gridSize, autoPopulateAllElementarySubjects(), ensureIEPPresetsForClass(), loadGradebook(), useMessage(), archiveStudent() (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (25): handleRfidAttendanceScan(), logAttendanceEvent(), markAllPresentToday(), { push: pushUndo }, academicTerms, activeStudentEvents, archivedClasses, attendanceMode (+17 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (29): isAssessmentInSubCohort(), allCombinedWork, allDossierAssessments, attendanceStats, behaviorCodesMap, currentStudentObj, displayMetaLine, effectiveClass (+21 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (13): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (9): activeClassRecord, effectiveClass, emit, isSBAR, isSystemPrinting, printConfig, props, showPrintPreview (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (9): formatGrade(), getHeatColor(), getHeatColorHex(), getHeatTextColor(), getSDColor(), getSectionColor(), SECTION_BADGE_STYLE, SECTION_PALETTES (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (17): initializeRfidAttendance(), reconcileStaleTrips(), _activateClass(), archiveClass(), bulkImportClasses(), computeSuggestedClass(), createClass(), hasBeenDismissedToday() (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (28): activeStudentGrades, analyticsSortBy, analyticsSortOrder, bucketChartData, bucketChartOptions, categoryWeightTotal, classEvidenceBlend, classMostConsistent (+20 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (8): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP()

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (4): isFormValid, selectedExpectationObj, selectedUnit, unitExpectations

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (13): classGrades, clearGrade(), enqueueDBSave(), enterGrade(), enterGradeSBAR(), markExcluded(), markMissing(), refreshSingleAssessmentStats() (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (11): onThresholdChange(), getEffectiveClassRecord(), adjustStudentGrade(), deleteAssessment(), editAssessment(), refreshClassAnalytics(), refreshGrades(), saveStudentOverride() (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (4): confirmBtnRef, inputRef, isConfirmDisabled, { state, handleAction, handleSelectChoice }

### Community 52 - "Community 52"
Cohesion: 0.06
Nodes (32): assessments, filteredMilestones, globalMilestones, gradeMap, useSBarPrintOptions(), toMinutes(), formatDate(), effectiveClass (+24 more)

### Community 77 - "Community 77"
Cohesion: 0.08
Nodes (23): aggregates, allClassEvents, assessmentsList, attendanceRate, behaviorCodesMap, chronicallyAbsentCount, classGrades, followUpExpanded (+15 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (14): hasUnsyncedChanges, createAssessment(), deleteAssessment(), updateAssessment(), addAttempt(), deleteAttempt(), deleteGrade(), _getGradeInTransaction() (+6 more)

### Community 80 - "Community 80"
Cohesion: 0.08
Nodes (30): activeBulkExp, activeLevelOptions, applyBulkFill(), assignLevel(), assignLevelByCode(), assignNumericPercentage(), bulkOnlyUnset, contextMenu (+22 more)

### Community 82 - "Community 82"
Cohesion: 0.20
Nodes (9): state, canRedo, canUndo, push(), redo(), _redoStack, undo(), _undoStack (+1 more)

## Knowledge Gaps
- **262 isolated node(s):** `Reports`, `Grades`, `ScanStation`, `isUnsynced`, `queryParams` (+257 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 11` to `Community 1`, `Community 2`, `Community 3`, `Community 8`, `Community 10`, `Community 78`, `Community 55`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `useMessage()` connect `Community 13` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 38`, `Community 6`, `Community 7`, `Community 14`, `Community 46`, `Community 49`, `Community 82`, `Community 17`, `Community 20`, `Community 52`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `useClassroom()` connect `Community 1` to `Community 0`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 15`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `Reports`, `Grades`, `ScanStation` to the rest of the system?**
  _262 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07112375533428165 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05426356589147287 - nodes in this community are weakly interconnected._