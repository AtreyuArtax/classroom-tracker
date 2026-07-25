# Graph Report - classroom-tracker  (2026-07-24)

## Corpus Check
- 111 files · ~168,360 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 865 nodes · 1395 edges · 94 communities (84 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a5e6133e`
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
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 77 edges
2. `useMessage()` - 35 edges
3. `get()` - 16 edges
4. `StrategyHandler` - 14 edges
5. `PrecacheController` - 13 edges
6. `useClassroom()` - 12 edges
7. `_readSettings()` - 12 edges
8. `Router` - 11 edges
9. `saveGradebookSettings()` - 11 edges
10. `patchStudent()` - 11 edges

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

## Communities (94 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (20): archivedRoster, checkResize(), confirmResize(), dismissedSuggestions, dismissSuggestion(), filteredArchivedClasses, filteredClassList, getStudentEventHistory() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (64): activeClassRecord, addAssessment(), adjustStudentGrade(), analyticsMode, assessments, assessmentSortOrder, assessmentStats, assessmentTypes (+56 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (40): addAttempt(), auditGradebookData(), buildDistributionBuckets(), buildLevelDistributionBuckets(), calculateAssessmentAnalytics(), _calculateCategoryGrade(), calculateClassAnalytics(), calculateClassGrades() (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (22): getLastSyncedAt(), hasUnsyncedChanges, isSyncActive(), checkSyncStatus(), { computeSuggestedClass }, currentComponent, currentView, Grades (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (27): BaseHTTPRequestHandler, Path, consume_scan(), _create_tray_icon_image(), get_app_dir(), keyboard_reader(), load_config(), log() (+19 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (19): addRoute(), CacheFirst, cacheMatchIgnoreParams(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), Deferred, executeQuotaErrorCallbacks() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (4): PrecacheStrategy, Strategy, StrategyHandler, toRequest()

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (27): dependencies, exceljs, file-saver, html5-qrcode, idb, lucide-vue-next, papaparse, qrcode (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (72): computeWeeklyStats(), editEvent(), removeEvent(), useClassroom(), saveStudentDemographics(), saveStudentGradebookNote(), useStudentDossier(), archiveClass() (+64 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (18): exportGradebookToExcel(), { activeClass, teacherName }, auditMsg, auditReport, backupMsg, { confirm, alert }, fixInvalidCategories(), fixMissingIds() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (16): activeCategory, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap(), handleProfileTap() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (4): createCacheKey(), PrecacheCacheKeyPlugin, PrecacheController, waitUntil()

### Community 13 - "Community 13"
Cohesion: 0.21
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

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (7): initializeRfidAttendance(), reconcileStaleTrips(), _activateClass(), archiveClass(), createClass(), logToggleEvent(), updateAttendanceConfig()

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (15): academicTerms, activeStudentEvents, archivedClasses, attendanceMode, autoStartRFID, behaviorCodes, cloudModeEnabled, isScannerOpen (+7 more)

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
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (21): logAttendanceEvent(), logAssessmentEvent(), classList, gridSize, students, state, useMessage(), archiveStudent() (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): background, service_worker, content_scripts, description, manifest_version, name, permissions, version

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (8): handleRfidAttendanceScan(), markAllPresentToday(), { push: pushUndo }, syncLateActiveState(), activeClass, isTestDay, latenessGracePeriod, periodStartTimes

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
Cohesion: 0.07
Nodes (16): close(), emit, props, academicCategories, allDossierAssessments, attendanceAverages, behaviorWeeklyTrend, classAssessments (+8 more)

### Community 42 - "Community 42"
Cohesion: 0.27
Nodes (8): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP()

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

### Community 78 - "Community 78"
Cohesion: 0.10
Nodes (22): curriculumPresets, getPresetsByPanel(), activeTab, canSubmit, emit, getStrandExpectations(), granularity, isStrandFullySelected() (+14 more)

### Community 85 - "Community 85"
Cohesion: 0.11
Nodes (21): { activeClass, triggerActiveClass }, activeClassClassCategoriesUpdate(), addCategory(), addExpectation(), addUnit(), { alert, confirm }, deleteExpectation(), expandedUnitId (+13 more)

### Community 95 - "Community 95"
Cohesion: 0.29
Nodes (8): cacheDonePromiseForTransaction(), deleteDB(), getCursorAdvanceMethods(), getIdbProxyableTypes(), promisifyRequest(), transformCachableValue(), wrap(), wrapFunction()

### Community 96 - "Community 96"
Cohesion: 0.33
Nodes (3): inputRef, isConfirmDisabled, { state, handleAction, handleSelectChoice }

### Community 97 - "Community 97"
Cohesion: 0.40
Nodes (4): allPossibleClasses, { 
  classList, 
  archivedClasses, 
  selectedYear, 
  selectedSemester 
}, uniqueSemesters, uniqueYears

## Knowledge Gaps
- **217 isolated node(s):** `scanBuffer`, `manifest_version`, `name`, `version`, `description` (+212 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 8` to `Community 0`, `Community 2`, `Community 3`, `Community 94`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `openDB()` connect `Community 94` to `Community 8`, `Community 5`, `Community 95`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Why does `useMessage()` connect `Community 24` to `Community 96`, `Community 0`, `Community 1`, `Community 8`, `Community 9`, `Community 72`, `Community 16`, `Community 18`, `Community 85`, `Community 26`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `scanBuffer`, `manifest_version`, `name` to the rest of the system?**
  _233 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06006006006006006 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05098934550989345 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09988385598141696 - nodes in this community are weakly interconnected._