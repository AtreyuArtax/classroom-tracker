# Graph Report - src  (2026-07-26)

## Corpus Check
- 101 files · ~135,078 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 654 nodes · 1062 edges · 81 communities (76 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7cb4526`
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
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 76 edges
2. `useMessage()` - 35 edges
3. `useClassroom()` - 12 edges
4. `_readSettings()` - 12 edges
5. `saveGradebookSettings()` - 11 edges
6. `enqueueDBSave()` - 9 edges
7. `calculateStudentGrade()` - 9 edges
8. `calculateClassAnalytics()` - 9 edges
9. `_activateClass()` - 8 edges
10. `calculateAssessmentAnalytics()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `onThresholdChange()` --calls--> `refreshClassAnalytics()`  [EXTRACTED]
  components/GradesAnalyticsPanel.vue → composables/useGradebook.js
- `downloadReportCardCsv()` --calls--> `loadGradebook()`  [EXTRACTED]
  components/reports/ReportsExportMenu.vue → composables/useGradebook.js
- `editEvent()` --calls--> `getDB()`  [EXTRACTED]
  composables/useClassroom.js → db/index.js
- `removeEvent()` --calls--> `getDB()`  [EXTRACTED]
  composables/useClassroom.js → db/index.js
- `checkSyncStatus()` --calls--> `isSyncActive()`  [EXTRACTED]
  App.vue → db/eventService.js

## Import Cycles
- None detected.

## Communities (81 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (33): addAssessment(), assessmentSortOrder, assessmentStats, assessmentTypes, classAnalytics, closeAddAssessment(), currentAssessmentId, dbSaveQueue (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (28): checkSyncStatus(), { computeSuggestedClass }, currentComponent, currentView, Grades, { init, isScannerOpen }, isSyncing, isSyncLinked (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (34): addAttempt(), buildDistributionBuckets(), buildLevelDistributionBuckets(), calculateAssessmentAnalytics(), _calculateCategoryGrade(), calculateClassAnalytics(), calculateClassGrades(), calculateMedian() (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (20): archivedRoster, checkResize(), confirmResize(), dismissedSuggestions, dismissSuggestion(), filteredArchivedClasses, filteredClassList, getStudentEventHistory() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (17): close(), emit, props, academicCategories, allDossierAssessments, attendanceAverages, behaviorWeeklyTrend, classAssessments (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (21): { activeClass, triggerActiveClass }, activeClassClassCategoriesUpdate(), addCategory(), addExpectation(), addUnit(), { alert, confirm }, deleteExpectation(), expandedUnitId (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (18): exportGradebookToExcel(), { activeClass, teacherName }, auditMsg, auditReport, backupMsg, { confirm, alert }, fixInvalidCategories(), fixMissingIds() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.08
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
Cohesion: 0.16
Nodes (15): _applyDateRange(), deleteEvent(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit(), exportAllData(), getAllEvents(), getEventsByPeriod(), getEventsByStudent() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (22): curriculumPresets, getPresetsByPanel(), activeTab, canSubmit, emit, getStrandExpectations(), granularity, isStrandFullySelected() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (20): auditSettingsIntegrity(), deleteBehaviorCode(), getAcademicTerms(), getAttendanceConfig(), getBehaviorCodes(), getNonSchoolDays(), getPeriodStartTimes(), getTeacherName() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (30): archiveClass(), archiveStudent(), bulkImportClasses(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), deleteClass(), getAllClasses() (+22 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (16): activeCategory, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap(), handleProfileTap() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (17): logAssessmentEvent(), state, useMessage(), archiveStudent(), assignSeat(), autoAssignSeats(), moveStudentFromClass(), permanentlyDeleteStudent() (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (16): academicTerms, activeStudentEvents, archivedClasses, attendanceMode, autoStartRFID, behaviorCodes, cloudModeEnabled, gridSize (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (13): allDossierAssessments, attendanceStats, behaviorCodesMap, evidenceMix, individualTasks, missingAssessments, outOfClassStats, overallMostConsistent (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (17): activeClassRecord, adjustStudentGrade(), assessments, classGrades, clearGrade(), enqueueDBSave(), enterGrade(), gradeMap (+9 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (12): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (8): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP()

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (10): handleRfidAttendanceScan(), logAttendanceEvent(), markAllPresentToday(), { push: pushUndo }, activeClass, classList, isTestDay, latenessGracePeriod (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (11): initializeRfidAttendance(), reconcileStaleTrips(), syncLateActiveState(), _activateClass(), archiveClass(), computeWeeklyStats(), createClass(), editEvent() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (8): acceptSuggestion(), { 
  activeClass, 
  suggestedClass, 
  switchClass,
  dismissSuggestion,
  filteredClassList
}, classesByTerm, emit, isOpen, selectClass(), suggestionText, switchClass()

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (28): analyticsSortBy, analyticsSortOrder, bucketChartData, bucketChartOptions, categoryWeightTotal, classEvidenceBlend, classMostConsistent, emit (+20 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (8): bulkImportClasses(), computeSuggestedClass(), hasBeenDismissedToday(), init(), loadDismissedSuggestions(), _reloadClasses(), _sortAndSplitClasses(), confirmBulkImport()

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (4): onThresholdChange(), refreshClassAnalytics(), setExclusionMode(), toggleStudentFromAnalytics()

### Community 78 - "Community 78"
Cohesion: 0.14
Nodes (12): filteredMilestones, globalMilestones, getDateRangeForClassPeriod(), getDateRangeForPeriod(), getEventsByClass(), { alert, confirm, select }, downloadReportCardCsv(), exportContainer (+4 more)

### Community 80 - "Community 80"
Cohesion: 0.50
Nodes (4): useClassroom(), saveStudentGradebookNote(), useStudentDossier(), toMinutes()

### Community 81 - "Community 81"
Cohesion: 0.70
Nodes (3): clearAllData(), getCurrentSchoolYear(), getCurrentSemester()

## Knowledge Gaps
- **188 isolated node(s):** `Reports`, `Grades`, `ScanStation`, `isUnsynced`, `queryParams` (+183 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 11` to `Community 1`, `Community 2`, `Community 3`, `Community 8`, `Community 10`, `Community 78`, `Community 80`, `Community 81`, `Community 20`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `useMessage()` connect `Community 13` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 38`, `Community 6`, `Community 7`, `Community 78`, `Community 16`, `Community 80`, `Community 17`, `Community 19`, `Community 20`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `useClassroom()` connect `Community 80` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 21`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `Reports`, `Grades`, `ScanStation` to the rest of the system?**
  _188 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07957957957957958 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._