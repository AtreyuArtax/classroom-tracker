# Graph Report - classroom-tracker  (2026-07-16)

## Corpus Check
- 92 files · ~160,577 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 822 nodes · 1287 edges · 81 communities (73 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `97910397`
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
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 72|Community 72]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 72 edges
2. `useMessage()` - 31 edges
3. `get()` - 16 edges
4. `StrategyHandler` - 14 edges
5. `PrecacheController` - 13 edges
6. `_readSettings()` - 12 edges
7. `Router` - 11 edges
8. `patchStudent()` - 11 edges
9. `useClassroom()` - 10 edges
10. `CacheTimestampsModel` - 9 edges

## Surprising Connections (you probably didn't know these)
- `getDB()` --calls--> `openDB()`  [INFERRED]
  src/db/index.js → dev-dist/workbox-ca84f546.js
- `useGradeEditing()` --calls--> `useMessage()`  [EXTRACTED]
  src/composables/useGradeEditing.js → src/composables/useMessage.js
- `createAssessment()` --calls--> `getDB()`  [EXTRACTED]
  src/db/gradebookService.js → src/db/index.js
- `updateAssessment()` --calls--> `getDB()`  [EXTRACTED]
  src/db/gradebookService.js → src/db/index.js
- `deleteAssessment()` --calls--> `getDB()`  [EXTRACTED]
  src/db/gradebookService.js → src/db/index.js

## Import Cycles
- None detected.

## Communities (81 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (20): archivedRoster, checkResize(), confirmResize(), dismissedSuggestions, dismissSuggestion(), filteredArchivedClasses, filteredClassList, getStudentEventHistory() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (49): activeClassRecord, addAssessment(), adjustStudentGrade(), analyticsMode, assessments, assessmentSortOrder, assessmentStats, assessmentTypes (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (40): addAttempt(), auditGradebookData(), buildDistributionBuckets(), buildLevelDistributionBuckets(), calculateAssessmentAnalytics(), _calculateCategoryGrade(), calculateClassAnalytics(), calculateClassGrades() (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): allPossibleClasses, { 
  classList, 
  archivedClasses, 
  selectedYear, 
  selectedSemester 
}, uniqueSemesters, uniqueYears, isSyncActive(), checkSyncStatus(), { computeSuggestedClass }, currentComponent (+17 more)

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
Cohesion: 0.05
Nodes (72): useClassroom(), loadGradebook(), refreshAllAssessmentStats(), saveStudentDemographics(), saveStudentGradebookNote(), useStudentDossier(), archiveClass(), archiveStudent() (+64 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (15): analyticsSortBy, analyticsSortOrder, bucketChartData, bucketChartOptions, categoryWeightTotal, classEvidenceBlend, classMostConsistent, isWeightWarningVisible (+7 more)

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
Cohesion: 0.12
Nodes (13): allDossierAssessments, attendanceStats, behaviorCodesMap, evidenceMix, individualTasks, missingAssessments, outOfClassStats, overallMostConsistent (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (4): get(), getMethod(), has(), Router

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (12): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.27
Nodes (8): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP()

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (11): initializeRfidAttendance(), reconcileStaleTrips(), syncLateActiveState(), _activateClass(), archiveClass(), computeWeeklyStats(), createClass(), editEvent() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (16): academicTerms, activeStudentEvents, archivedClasses, attendanceMode, autoStartRFID, behaviorCodes, cloudModeEnabled, gridSize (+8 more)

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (8): acceptSuggestion(), { 
  activeClass, 
  suggestedClass, 
  switchClass,
  dismissSuggestion,
  filteredClassList
}, classesByTerm, emit, isOpen, selectClass(), suggestionText, switchClass()

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (16): logAssessmentEvent(), state, useMessage(), archiveStudent(), assignSeat(), moveStudentFromClass(), permanentlyDeleteStudent(), { push: pushUndo } (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): background, service_worker, content_scripts, description, manifest_version, name, permissions, version

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (8): cacheDonePromiseForTransaction(), getCursorAdvanceMethods(), getIdbProxyableTypes(), openDB(), promisifyRequest(), transformCachableValue(), wrap(), wrapFunction()

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): list_raw_input_devices(), list_serial_ports(), find_rfid.py — RFID Scanner Diagnostic Utility =================================, On Windows, use ctypes to enumerate Raw Input devices and print keyboard paths., Print all available serial ports on this machine., Listen for rapid keyboard bursts using pynput.     When a burst of ≥6 characters, sniff_keyboard_device()

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (8): bulkImportClasses(), computeSuggestedClass(), hasBeenDismissedToday(), init(), loadDismissedSuggestions(), _reloadClasses(), _sortAndSplitClasses(), confirmBulkImport()

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): calculateStandardDeviation(), classStats, detectOutliers(), result, result2, spreadClass

### Community 32 - "Community 32"
Cohesion: 0.50
Nodes (3): close(), emit, props

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (10): handleRfidAttendanceScan(), logAttendanceEvent(), markAllPresentToday(), { push: pushUndo }, activeClass, classList, isTestDay, latenessGracePeriod (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.04
Nodes (18): categoryWeightTotal, currentAssessment, currentAssessmentSummary, filteredClassGrades, filteredStudents, individualStudentAssessments, isWeightWarningVisible, missingStudentsList (+10 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (18): exportGradebookToExcel(), { activeClass, teacherName }, auditMsg, auditReport, backupMsg, { confirm, alert }, fixInvalidCategories(), fixMissingIds() (+10 more)

### Community 72 - "Community 72"
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

## Knowledge Gaps
- **207 isolated node(s):** `scanBuffer`, `manifest_version`, `name`, `version`, `description` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 8` to `Community 26`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Why does `openDB()` connect `Community 26` to `Community 8`, `Community 21`, `Community 5`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `useMessage()` connect `Community 24` to `Community 0`, `Community 1`, `Community 35`, `Community 8`, `Community 41`, `Community 72`, `Community 16`, `Community 18`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `scanBuffer`, `manifest_version`, `name` to the rest of the system?**
  _223 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06006006006006006 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06464646464646465 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09988385598141696 - nodes in this community are weakly interconnected._