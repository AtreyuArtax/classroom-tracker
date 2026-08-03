# Graph Report - src  (2026-08-02)

## Corpus Check
- 117 files · ~163,070 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 778 nodes · 1295 edges · 83 communities (78 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86186613`
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 81 edges
2. `useMessage()` - 36 edges
3. `useClassroom()` - 13 edges
4. `_readSettings()` - 12 edges
5. `saveGradebookSettings()` - 11 edges
6. `enqueueDBSave()` - 10 edges
7. `calculateStudentGrade()` - 10 edges
8. `preciseRound()` - 10 edges
9. `loadGradebook()` - 9 edges
10. `getAssessmentsByClass()` - 9 edges

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

## Communities (83 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (56): getEffectiveClassRecord(), activeClassRecord, activeGradeFilter, addAssessment(), adjustStudentGrade(), assessmentSortOrder, assessmentStats, assessmentTypes (+48 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (28): checkSyncStatus(), { clear: clearUndo }, { computeSuggestedClass }, currentComponent, currentView, Grades, { init, isScannerOpen }, isSyncing (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (33): getSettings(), getAssessmentsByClass(), auditGradebookData(), calculateAssessmentAnalytics(), calculateClassAnalytics(), deleteGradebookTemplate(), getExclusionResults(), getGradebookTemplates() (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (21): archivedRoster, checkResize(), confirmResize(), dismissedSuggestions, dismissSuggestion(), filteredArchivedClasses, filteredClassList, getStudentEventHistory() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (17): close(), emit, props, academicCategories, allDossierAssessments, attendanceAverages, behaviorWeeklyTrend, classAssessments (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (25): { activeClass, triggerActiveClass }, activeClassClassCategoriesUpdate(), addCategory(), addExpectation(), addUnit(), { alert, confirm }, deleteExpectation(), expandedUnitId (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (19): exportGradebookToExcel(), { activeClass, teacherName }, auditMsg, auditReport, backupMsg, { confirm, alert }, exportMsg, fixInvalidCategories() (+11 more)

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
Cohesion: 0.12
Nodes (20): useStudentDossier(), _applyDateRange(), deleteEvent(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit(), exportAllData(), getAllEvents(), getDateRangeForClassPeriod() (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (50): createClass(), activeSubjectId, teachingMode, autoPopulateAllElementarySubjects(), detectGradeFromClassName(), getEffectiveGradeLevel(), parseGradesFromClass(), populateSubjectFromPreset() (+42 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (20): auditSettingsIntegrity(), deleteBehaviorCode(), getAcademicTerms(), getAttendanceConfig(), getBehaviorCodes(), getNonSchoolDays(), getPeriodStartTimes(), getTeacherName() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (25): archiveClass(), archiveStudent(), bulkImportClasses(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), deleteClass(), getAllClasses() (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (16): activeCategory, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap(), handleProfileTap() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (21): logAssessmentEvent(), saveStudentDemographics(), state, useMessage(), archiveStudent(), assignSeat(), autoAssignSeats(), moveStudentFromClass() (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (17): academicTerms, activeStudentEvents, archivedClasses, attendanceMode, autoStartRFID, behaviorCodes, cloudModeEnabled, gridSize (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (13): allDossierAssessments, attendanceStats, behaviorCodesMap, evidenceMix, individualTasks, missingAssessments, outOfClassStats, overallMostConsistent (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (10): handleRfidAttendanceScan(), logAttendanceEvent(), markAllPresentToday(), { push: pushUndo }, activeClass, classList, isTestDay, latenessGracePeriod (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (13): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (8): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP()

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (21): assessments, filteredMilestones, globalMilestones, gradeMap, algorithmLabel, allExpectations, availableStrands, displayedExpectations (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (11): initializeRfidAttendance(), reconcileStaleTrips(), syncLateActiveState(), _activateClass(), archiveClass(), computeWeeklyStats(), editEvent(), logToggleEvent() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.05
Nodes (35): analyticsSortBy, analyticsSortOrder, availableCourseFilters, bucketChartData, bucketChartOptions, categoryWeightTotal, classEvidenceBlend, classMostConsistent (+27 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (8): bulkImportClasses(), computeSuggestedClass(), hasBeenDismissedToday(), init(), loadDismissedSuggestions(), _reloadClasses(), _sortAndSplitClasses(), confirmBulkImport()

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (4): isFormValid, selectedExpectationObj, selectedUnit, unitExpectations

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (10): addAttempt(), deleteAttempt(), deleteGrade(), _getGradeInTransaction(), getOrCreateGrade(), saveFullGradeRecord(), saveSBARGrade(), setPrimaryAttempt() (+2 more)

### Community 77 - "Community 77"
Cohesion: 0.07
Nodes (23): aggregates, allClassEvents, assessmentsList, attendanceRate, behaviorCodesMap, chronicallyAbsentCount, classGrades, followUpExpanded (+15 more)

### Community 78 - "Community 78"
Cohesion: 0.40
Nodes (4): hasUnsyncedChanges, createAssessment(), deleteAssessment(), updateAssessment()

### Community 85 - "Community 85"
Cohesion: 0.70
Nodes (3): clearAllData(), getCurrentSchoolYear(), getCurrentSemester()

## Knowledge Gaps
- **237 isolated node(s):** `Reports`, `Grades`, `ScanStation`, `isUnsynced`, `queryParams` (+232 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 11` to `Community 1`, `Community 2`, `Community 3`, `Community 38`, `Community 8`, `Community 10`, `Community 78`, `Community 20`, `Community 85`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `useMessage()` connect `Community 13` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `useClassroom()` connect `Community 1` to `Community 0`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `Reports`, `Grades`, `ScanStation` to the rest of the system?**
  _237 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.059907834101382486 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05398110661268556 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12564102564102564 - nodes in this community are weakly interconnected._