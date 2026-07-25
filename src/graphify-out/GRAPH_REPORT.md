# Graph Report - src  (2026-07-25)

## Corpus Check
- 101 files · ~130,503 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 628 nodes · 1016 edges · 76 communities (72 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `966b4175`
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 30|Community 30]]

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
- `downloadReportCardCsv()` --calls--> `loadGradebook()`  [EXTRACTED]
  components/reports/ReportsExportMenu.vue → composables/useGradebook.js
- `editEvent()` --calls--> `getDB()`  [EXTRACTED]
  composables/useClassroom.js → db/index.js
- `removeEvent()` --calls--> `getDB()`  [EXTRACTED]
  composables/useClassroom.js → db/index.js
- `checkSyncStatus()` --calls--> `isSyncActive()`  [EXTRACTED]
  App.vue → db/eventService.js
- `selectClass()` --calls--> `switchClass()`  [EXTRACTED]
  components/ClassSwitcher.vue → composables/useClassroom.js

## Import Cycles
- None detected.

## Communities (76 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (50): activeClassRecord, addAssessment(), adjustStudentGrade(), analyticsMode, assessmentSortOrder, assessmentStats, assessmentTypes, classAnalytics (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (29): checkSyncStatus(), { computeSuggestedClass }, currentComponent, currentView, Grades, { init, isScannerOpen }, isSyncing, isSyncLinked (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (67): archiveClass(), archiveStudent(), bulkImportClasses(), clearAllData(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), deleteClass() (+59 more)

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
Cohesion: 0.11
Nodes (24): loadGradebook(), refreshAllAssessmentStats(), auditSettingsIntegrity(), deleteBehaviorCode(), getAcademicTerms(), getAttendanceConfig(), getBehaviorCodes(), getGlobalMilestones() (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (22): curriculumPresets, getPresetsByPanel(), activeTab, canSubmit, emit, getStrandExpectations(), granularity, isStrandFullySelected() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (32): useClassroom(), assessments, filteredMilestones, globalMilestones, gradeMap, saveStudentGradebookNote(), useStudentDossier(), _applyDateRange() (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (16): activeCategory, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap(), handleProfileTap() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (21): logAssessmentEvent(), activeClass, gridSize, students, saveStudentDemographics(), state, useMessage(), archiveStudent() (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (15): academicTerms, activeStudentEvents, archivedClasses, attendanceMode, autoStartRFID, behaviorCodes, cloudModeEnabled, isScannerOpen (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (13): allDossierAssessments, attendanceStats, behaviorCodesMap, evidenceMix, individualTasks, missingAssessments, outOfClassStats, overallMostConsistent (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (12): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (8): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP()

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (8): handleRfidAttendanceScan(), logAttendanceEvent(), markAllPresentToday(), { push: pushUndo }, classList, isTestDay, latenessGracePeriod, periodStartTimes

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

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (8): bulkImportClasses(), computeSuggestedClass(), hasBeenDismissedToday(), init(), loadDismissedSuggestions(), _reloadClasses(), _sortAndSplitClasses(), confirmBulkImport()

## Knowledge Gaps
- **173 isolated node(s):** `Reports`, `Grades`, `ScanStation`, `isUnsynced`, `queryParams` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 2` to `Community 1`, `Community 3`, `Community 8`, `Community 10`, `Community 20`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `useMessage()` connect `Community 13` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 10`, `Community 17`, `Community 19`, `Community 20`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `useClassroom()` connect `Community 10` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 21`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `Reports`, `Grades`, `ScanStation` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06936026936026936 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06651017214397496 - nodes in this community are weakly interconnected._