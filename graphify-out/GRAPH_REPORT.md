# Graph Report - classroom-tracker  (2026-08-21)

## Corpus Check
- 207 files · ~388,843 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1170 nodes · 2007 edges · 108 communities (96 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5b75b2b7`
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
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 93 edges
2. `useMessage()` - 39 edges
3. `formatLocalDate()` - 31 edges
4. `get()` - 16 edges
5. `_readSettings()` - 15 edges
6. `StrategyHandler` - 14 edges
7. `loadGradebook()` - 14 edges
8. `patchStudent()` - 14 edges
9. `PrecacheController` - 13 edges
10. `saveGradebookSettings()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `getDB()` --calls--> `openDB()`  [INFERRED]
  src/db/index.js → dev-dist/workbox-ca84f546.js
- `fetchEvents()` --calls--> `getEventsByStudent()`  [EXTRACTED]
  src/components/dossier/ProgressReport.vue → src/db/eventService.js
- `downloadAggregateCsv()` --calls--> `formatLocalDate()`  [EXTRACTED]
  src/components/reports/ReportsExportMenu.vue → src/utils/dates.js
- `useGradeEditing()` --calls--> `useMessage()`  [EXTRACTED]
  src/composables/useGradeEditing.js → src/composables/useMessage.js
- `logEvent()` --calls--> `getDB()`  [EXTRACTED]
  src/db/eventService.js → src/db/index.js

## Import Cycles
- None detected.

## Communities (108 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (31): archivedRoster, dismissedSuggestions, filteredArchivedClasses, filteredClassList, globalStudentsOut, periodOptionsList, { push: pushUndo, clear: clearUndo }, sortedRoster (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (36): getUnitGradeLevel(), activeClassRecord, activeGradeFilter, addAssessment(), adjustStudentGrade(), analyticsMode, assessmentSortOrder, assessmentStats (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (39): getStudentEffectiveGrade(), isAssessmentApplicableToStudent(), isAssessmentInSubCohort(), isStudentInSubCohort(), executePrint(), getSettings(), getAssessmentsByClass(), auditGradebookData() (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (33): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (27): BaseHTTPRequestHandler, Path, consume_scan(), _create_tray_icon_image(), get_app_dir(), keyboard_reader(), load_config(), log() (+19 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (16): addRoute(), cacheMatchIgnoreParams(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), Deferred, NavigationRoute, _nestedGroup() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (7): CacheFirst, executeQuotaErrorCallbacks(), PrecacheStrategy, Strategy, StrategyHandler, timeout(), toRequest()

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (27): dependencies, exceljs, file-saver, html5-qrcode, idb, lucide-vue-next, papaparse, qrcode (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (36): saveStudentDemographics(), archiveClass(), archiveStudent(), bulkImportClasses(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), deleteClass() (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (25): exportGradebookToExcel(), { activeClass, teacherName, init }, auditMsg, auditReport, backupMsg, { confirm, alert }, exportMsg, fixInvalidCategories() (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (13): classGrades, clearGrade(), enqueueDBSave(), enterGrade(), enterGradeSBAR(), markExcluded(), markMissing(), refreshSingleAssessmentStats() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (16): activeCategory, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap(), handleProfileTap() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (4): createCacheKey(), PrecacheCacheKeyPlugin, PrecacheController, waitUntil()

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (5): CacheExpiration, dontWaitFor(), ExpirationPlugin, registerQuotaErrorCallback(), removeIgnoredSearchParams()

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (29): allCombinedWork, allDossierAssessments, attendanceStats, behaviorCodesMap, currentStudentObj, displayMetaLine, effectiveClass, events (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (4): get(), getMethod(), has(), Router

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (13): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): useSBarPrintOptions(), effectiveClass, emailConfig, emailRecipients, emit, generateEmailLink(), { getStudentOverallSBarBadge, prepareSBarReportData }, isSBAR (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (20): handleRfidAttendanceScan(), initializeRfidAttendance(), logAttendanceEvent(), markAllPresentToday(), { push: pushUndo }, reconcileStaleTrips(), dismissSuggestion(), getAttendanceOnDate() (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (8): canRedo, canUndo, push(), redo(), _redoStack, undo(), _undoStack, useUndo()

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (27): loadGradebook(), refreshAllAssessmentStats(), auditSettingsIntegrity(), deleteBehaviorCode(), deleteLayoutPreset(), getAcademicTerms(), getAttendanceConfig(), getBehaviorCodes() (+19 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (18): getStudentEventHistory(), logAssessmentEvent(), logStandardEvent(), ensureIEPPresetsForClass(), state, useMessage(), archiveStudent(), assignSeat() (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): background, service_worker, content_scripts, description, manifest_version, name, permissions, version

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (8): cacheDonePromiseForTransaction(), getCursorAdvanceMethods(), getIdbProxyableTypes(), openDB(), promisifyRequest(), transformCachableValue(), wrap(), wrapFunction()

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): list_raw_input_devices(), list_serial_ports(), find_rfid.py — RFID Scanner Diagnostic Utility =================================, On Windows, use ctypes to enumerate Raw Input devices and print keyboard paths., Print all available serial ports on this machine., Listen for rapid keyboard bursts using pynput.     When a burst of ≥6 characters, sniff_keyboard_device()

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): calculateStandardDeviation(), classStats, detectOutliers(), result, result2, spreadClass

### Community 32 - "Community 32"
Cohesion: 0.06
Nodes (19): close(), emit, props, academicCategories, allDossierAssessments, attendanceAverages, behaviorWeeklyTrend, classAssessments (+11 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (25): removeEvent(), clearAllData(), _applyDateRange(), createSafetySnapshot(), deleteEvent(), deleteSafetySnapshot(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit() (+17 more)

### Community 36 - "Community 36"
Cohesion: 0.05
Nodes (36): activeStudentGrades, analyticsSortBy, analyticsSortOrder, bucketChartData, bucketChartOptions, categoryWeightTotal, classEvidenceBlend, classMostConsistent (+28 more)

### Community 38 - "Community 38"
Cohesion: 0.08
Nodes (23): aggregates, allClassEvents, assessmentsList, attendanceRate, behaviorCodesMap, chronicallyAbsentCount, classGrades, followUpExpanded (+15 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (13): photoCache, photoIdsSet, showDeskPhotos, useStudentPhotos(), avatarStyle, cameraIconSize, emit, { getPhotoUrl, initPhotoIds } (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (6): assessments, gradeMap, availableStrands, displayedExpectations, displayedStrands, masteryMap

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (11): bottomHalf, classTitles, currentPreviewWeeks, getMonthName(), getRowSpanForMonth(), holidayCache, isRowStartOfMonth(), milestoneMap (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (4): isFormValid, selectedExpectationObj, selectedUnit, unitExpectations

### Community 61 - "Community 61"
Cohesion: 0.14
Nodes (12): filteredMilestones, globalMilestones, getEventsByClass(), formatDate(), { alert, confirm, select }, downloadAggregateCsv(), downloadReportCardCsv(), exportContainer (+4 more)

### Community 64 - "Community 64"
Cohesion: 0.08
Nodes (26): teachingMode, detectGradeFromClassName(), getEffectiveGradeLevel(), parseGradesFromClass(), populateSubjectFromPreset(), populateSubjectFromPresets(), curriculumPresets, findElementaryPreset() (+18 more)

### Community 72 - "Community 72"
Cohesion: 0.07
Nodes (17): { 
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
}, { alert, confirm }, bulkAvailableSemesters, bulkImportGroups, bulkImportSemesters, crossClassConflicts, currentSchoolYear, importResult (+9 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (9): activeSubjectId, effectiveClass, emit, isSBAR, isSystemPrinting, printConfig, props, showPrintPreview (+1 more)

### Community 85 - "Community 85"
Cohesion: 0.09
Nodes (31): activeCategories, activeClassClassCategoriesUpdate(), activeCourseSection, activeUnits, addCategory(), addExpectation(), addUnit(), availableCourseSections (+23 more)

### Community 87 - "Community 87"
Cohesion: 0.14
Nodes (15): syncLateActiveState(), _activateClass(), archiveClass(), bulkImportClasses(), computeSuggestedClass(), computeWeeklyStats(), editEvent(), hasBeenDismissedToday() (+7 more)

### Community 96 - "Community 96"
Cohesion: 0.33
Nodes (6): checkResize(), confirmResize(), createClass(), updateActiveClass(), autoPopulateAllElementarySubjects(), createDefaultElementarySubjects()

### Community 103 - "Community 103"
Cohesion: 0.18
Nodes (14): hasUnsyncedChanges, createAssessment(), deleteAssessment(), updateAssessment(), addAttempt(), deleteAttempt(), deleteGrade(), _getGradeInTransaction() (+6 more)

### Community 106 - "Community 106"
Cohesion: 0.40
Nodes (5): onThresholdChange(), getEffectiveClassRecord(), refreshClassAnalytics(), setExclusionMode(), toggleStudentFromAnalytics()

### Community 108 - "Community 108"
Cohesion: 0.08
Nodes (30): activeBulkExp, activeLevelOptions, applyBulkFill(), assignLevel(), assignLevelByCode(), assignNumericPercentage(), bulkOnlyUnset, contextMenu (+22 more)

### Community 109 - "Community 109"
Cohesion: 0.29
Nodes (4): confirmBtnRef, inputRef, isConfirmDisabled, { state, handleAction, handleSelectChoice }

## Knowledge Gaps
- **330 isolated node(s):** `scanBuffer`, `manifest_version`, `name`, `version`, `description` (+325 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 8` to `Community 0`, `Community 2`, `Community 3`, `Community 35`, `Community 103`, `Community 23`, `Community 87`, `Community 26`, `Community 61`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Why does `openDB()` connect `Community 26` to `Community 8`, `Community 5`, `Community 94`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `importAllData()` connect `Community 35` to `Community 8`, `Community 6`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `scanBuffer`, `manifest_version`, `name` to the rest of the system?**
  _346 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.053877551020408164 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07422402159244265 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09795918367346938 - nodes in this community are weakly interconnected._