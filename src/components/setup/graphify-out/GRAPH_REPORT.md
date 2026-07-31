# Graph Report - setup  (2026-07-31)

## Corpus Check
- 14 files · ~19,768 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 130 nodes · 147 edges · 13 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `22bcbb4f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]

## God Nodes (most connected - your core abstractions)
1. `saveGradebookSettings()` - 11 edges
2. `showWarning()` - 5 edges
3. `validate()` - 5 edges
4. `runDataAudit()` - 4 edges
5. `onDeleteCategory()` - 3 edges
6. `onDeleteUnit()` - 3 edges
7. `onApplyTemplate()` - 3 edges
8. `activeClassClassCategoriesUpdate()` - 3 edges
9. `emit` - 3 edges
10. `getStrandExpectations()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (25): { activeClass, triggerActiveClass }, activeClassClassCategoriesUpdate(), addCategory(), addExpectation(), addUnit(), { alert, confirm }, deleteExpectation(), expandedUnitId (+17 more)

### Community 1 - "Community 1"
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

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (16): { activeClass, teacherName }, auditMsg, auditReport, backupMsg, { confirm, alert }, exportMsg, fixInvalidCategories(), fixMissingIds() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (20): activeTab, canSubmit, emit, getStrandExpectations(), granularity, isStrandFullySelected(), newUnitName, onClose() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (13): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+5 more)

## Knowledge Gaps
- **59 isolated node(s):** `{ activeClass, triggerActiveClass }`, `{ alert, confirm }`, `isSBAR`, `templates`, `newTemplateName` (+54 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `{ activeClass, triggerActiveClass }`, `{ alert, confirm }`, `isSBAR` to the rest of the system?**
  _59 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10591133004926108 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11067193675889328 - nodes in this community are weakly interconnected._