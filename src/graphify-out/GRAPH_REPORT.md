# Graph Report - src  (2026-08-10)

## Corpus Check
- 151 files · ~253,518 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 885 nodes · 1479 edges · 83 communities (79 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e606e36`
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
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 81 edges
2. `useMessage()` - 39 edges
3. `useClassroom()` - 14 edges
4. `saveGradebookSettings()` - 13 edges
5. `_readSettings()` - 12 edges
6. `enqueueDBSave()` - 10 edges
7. `patchStudent()` - 10 edges
8. `calculateStudentGrade()` - 10 edges
9. `preciseRound()` - 10 edges
10. `activeSubjectId` - 9 edges

## Surprising Connections (you probably didn't know these)
- `onThresholdChange()` --calls--> `refreshClassAnalytics()`  [EXTRACTED]
  components/GradesAnalyticsPanel.vue → composables/useGradebook.js
- `fetchEvents()` --calls--> `getEventsByStudent()`  [EXTRACTED]
  components/dossier/ProgressReport.vue → db/eventService.js
- `formatDate()` --calls--> `formatLocalDisplay()`  [EXTRACTED]
  components/dossier/ProgressReport.vue → utils/dates.js
- `downloadReportCardCsv()` --calls--> `loadGradebook()`  [EXTRACTED]
  components/reports/ReportsExportMenu.vue → composables/useGradebook.js
- `downloadReportCardCsv()` --calls--> `getEventsByClass()`  [EXTRACTED]
  components/reports/ReportsExportMenu.vue → db/eventService.js

## Import Cycles
- None detected.

## Communities (83 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (36): getEffectiveClassRecord(), getStudentEffectiveGrade(), activeGradeFilter, addAssessment(), assessmentSortOrder, assessmentStats, assessmentTypes, availableCourseFilters (+28 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (30): checkSyncStatus(), { clear: clearUndo }, { computeSuggestedClass }, currentComponent, currentView, Grades, { init, isScannerOpen }, isSyncing (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (29): getSettings(), getAssessmentsByClass(), auditGradebookData(), calculateAssessmentAnalytics(), calculateClassAnalytics(), deleteGradebookTemplate(), getExclusionResults(), getGradebookTemplates() (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (21): archivedRoster, checkResize(), confirmResize(), dismissedSuggestions, dismissSuggestion(), filteredArchivedClasses, filteredClassList, getStudentEventHistory() (+13 more)

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
  importRoster, 
  bulkImportClasses, 
  moveStudentFromClass 
}, { alert, confirm }, bulkAvailableSemesters, bulkImportGroups, bulkImportSemesters, crossClassConflicts, currentSchoolYear, importResult (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (16): _applyDateRange(), deleteEvent(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit(), exportAllData(), getAllEvents(), getEventsByClass(), getEventsByPeriod() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (29): activeSubjectId, teachingMode, autoPopulateAllElementarySubjects(), detectGradeFromClassName(), getEffectiveGradeLevel(), parseGradesFromClass(), populateSubjectFromPreset(), populateSubjectFromPresets() (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (20): auditSettingsIntegrity(), deleteBehaviorCode(), getAcademicTerms(), getAttendanceConfig(), getBehaviorCodes(), getNonSchoolDays(), getPeriodStartTimes(), getTeacherName() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (27): archiveClass(), archiveStudent(), bulkImportClasses(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), deleteClass(), getAllClasses() (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (16): activeCategory, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap(), handleProfileTap() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (18): logAssessmentEvent(), activeClass, gridSize, saveStudentDemographics(), state, useMessage(), archiveStudent(), assignSeat() (+10 more)

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
Cohesion: 0.12
Nodes (12): confirmBtnRef, inputRef, isConfirmDisabled, { state, handleAction, handleSelectChoice }, effectiveClass, emit, isSBAR, isSystemPrinting (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (12): filteredMilestones, globalMilestones, getDateRangeForClassPeriod(), getDateRangeForPeriod(), formatDate(), { alert, confirm, select }, downloadReportCardCsv(), exportContainer (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (13): initializeRfidAttendance(), reconcileStaleTrips(), syncLateActiveState(), _activateClass(), archiveClass(), computeWeeklyStats(), createClass(), editEvent() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.05
Nodes (37): activeStudentGrades, analyticsSortBy, analyticsSortOrder, bucketChartData, bucketChartOptions, categoryWeightTotal, classEvidenceBlend, classMostConsistent (+29 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (8): bulkImportClasses(), computeSuggestedClass(), hasBeenDismissedToday(), init(), loadDismissedSuggestions(), _reloadClasses(), _sortAndSplitClasses(), confirmBulkImport()

### Community 31 - "Community 31"
Cohesion: 0.05
Nodes (30): applyResize(), crossClassConflicts, currentRapidStudent, enrollTimer, isArchivedPanelVisible, isEditingStudent, isElementaryImporterOpen, isEnrollingRFID (+22 more)

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (4): isFormValid, selectedExpectationObj, selectedUnit, unitExpectations

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (16): activeClassRecord, assessments, classGrades, clearGrade(), enqueueDBSave(), enterGrade(), enterGradeSBAR(), gradeMap (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.06
Nodes (19): availableCategories, availableCourseFilters, availableGradeFilters, availableUnits, CATEGORY_COLORS, getCellStyle(), headerMenu, highlightedColumnId (+11 more)

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (8): onThresholdChange(), adjustStudentGrade(), deleteAssessment(), refreshClassAnalytics(), refreshGrades(), saveStudentOverride(), setExclusionMode(), undoStudentGradeAdjustment()

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (4): useClassroom(), saveStudentGradebookNote(), useStudentDossier(), toMinutes()

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (16): useSBarPrintOptions(), effectiveClass, emailConfig, emailRecipients, emit, generateEmailLink(), { getStudentOverallSBarBadge, prepareSBarReportData }, isSBAR (+8 more)

### Community 77 - "Community 77"
Cohesion: 0.07
Nodes (23): aggregates, allClassEvents, assessmentsList, attendanceRate, behaviorCodesMap, chronicallyAbsentCount, classGrades, followUpExpanded (+15 more)

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (10): addAttempt(), deleteAttempt(), deleteGrade(), _getGradeInTransaction(), getOrCreateGrade(), saveFullGradeRecord(), saveSBARGrade(), setPrimaryAttempt() (+2 more)

### Community 82 - "Community 82"
Cohesion: 0.24
Nodes (8): canRedo, canUndo, push(), redo(), _redoStack, undo(), _undoStack, useUndo()

### Community 85 - "Community 85"
Cohesion: 0.27
Nodes (7): clearAllData(), hasUnsyncedChanges, createAssessment(), deleteAssessment(), updateAssessment(), getCurrentSchoolYear(), getCurrentSemester()

## Knowledge Gaps
- **283 isolated node(s):** `Reports`, `Grades`, `ScanStation`, `isUnsynced`, `queryParams` (+278 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 11` to `Community 1`, `Community 2`, `Community 3`, `Community 8`, `Community 10`, `Community 78`, `Community 49`, `Community 20`, `Community 85`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `useMessage()` connect `Community 13` to `Community 0`, `Community 3`, `Community 5`, `Community 38`, `Community 6`, `Community 7`, `Community 14`, `Community 46`, `Community 49`, `Community 18`, `Community 82`, `Community 20`, `Community 19`, `Community 17`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `useClassroom()` connect `Community 49` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 15`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `Reports`, `Grades`, `ScanStation` to the rest of the system?**
  _283 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07435897435897436 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06025641025641026 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05668016194331984 - nodes in this community are weakly interconnected._