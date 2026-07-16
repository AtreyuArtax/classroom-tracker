# Elementary Mode — Feedback on Your Vision

> Actionable feasibility response. No code.  
> July 2026

---

## Your Vision at a Glance

You've described four structural ideas:

1. **One roster, multiple subjects** — an elementary class has one set of students but several independent gradebooks (Math, Language, Science, etc.)
2. **Strands as weighted categories** — with optional sub-weighting for activity types within each strand
3. **Subject switcher in the Grades view** — a way to move between Math, Language, etc. while staying in the same class
4. **Student dossier with subject filtering** — view one subject at a time or all subjects together
5. **A settings toggle** — switch the app between Secondary and Elementary mode

All five of these ideas are sound. The challenge is not whether they're a good design — they clearly are — it's identifying which one is the structural load-bearer that everything else depends on, and being honest about what that change costs.

---

## The Load-Bearing Change: One Roster, Multiple Subjects

This is the biggest architectural shift in your entire proposal, and everything else — the subject switcher, the dossier filter, the strand weighting — depends on it being built correctly first.

### What You Have Now

The current data model treats a **class** as the atomic unit. One class = one roster + one gradebook. A secondary teacher who teaches Grade 10 Science has one class record. Period 2 Science has its own roster, its own categories, its own assessments, its own grades. That's clean and simple.

### What You're Proposing

An elementary teacher has **one roster** (her Grade 7 homeroom, 30 students) and **multiple gradebooks** hanging off that same set of students — one for Math, one for Language, one for Science and Technology, one for History, one for Health, one for Arts, and so on. The students never change. The subjects do.

This is a fundamentally different relationship than what the app currently supports.

### Feasibility: It's Doable, But It's the Biggest Single Change to the Codebase

The current design has the assumption "one class = one gradebook" baked into almost every layer:

- The **database** stores one `gradebookCategories` array per class record.
- The **gradebook service** (`gradebookService.js`) takes a `classRecord` and calculates grades using that class's categories — it has no concept of "which subject am I in right now."
- The **Grades view** is built entirely around one active class's worth of assessments and grades.
- The **student dossier** (`Student360.vue`) pulls grades for one class.
- The **reports view** reports on one class at a time.

To support multiple subjects per class, every one of these layers needs to learn about the concept of a `subject`. That's the migration, the service functions, the composable, and the UI — all touched.

### The Recommended Data Model

The cleanest approach (not the only one, but the most compatible with the existing code) is to store subjects **inside** the class record:

A class record would gain a `subjects` array. Each subject has its own name, its own strands (categories), and its own set of assessments. The assessments in the IDB store would gain a `subjectId` field so the calculation engine knows which subject they belong to.

The roster (`students` map) stays exactly where it is — on the class record, shared across all subjects. Student contact info, seating, attendance, behavior codes — all of that is class-level and remains unchanged.

**What this means practically:**
- The class record grows to contain a subjects list alongside the student map.
- Assessments get one new field: which subject they belong to.
- The gradebook calculation engine receives a subject context when running.
- The Grades view shows a subject picker at the top and loads accordingly.

**The migration:** Every existing secondary class would get a default `subjects` array containing one subject called whatever the class is named, using its existing categories. That preserves all current data perfectly and keeps secondary mode working without any visible change.

---

## The Subject Switcher in Grades View

**Feasibility: Straightforward once the data model is right.**

Once subjects exist on the class record, a dropdown or tab bar at the top of the Grades view is a minor UI addition. The view already knows how to load assessments and grades for an active class — it just needs to additionally filter by the selected subject.

This is one of the easier pieces of the whole feature.

---

## Strands as Weighted Categories

**Feasibility: Almost free. This is already how the current category system works.**

The current app already lets a teacher define categories with names and weights. Strands are just categories with Ontario-appropriate default names and the "weight" field meaning something slightly different in context.

For elementary, you'd:
- Pre-fill strand names from the Ontario curriculum when creating a subject (Math → Number, Algebra, Spatial Sense, etc.)
- Let the teacher rename, reorder, and adjust weights just like secondary categories
- Treat the "weight" field on each strand the same way the current category weight is treated

This is the cheapest part of the whole elementary mode to build.

### Sub-Weighting Within Strands

This is where you need to think carefully about scope.

You mentioned that teachers might also want to weight **activity types within each strand** — for example, within the Number strand: tests count 60%, activities 40%.

This is a two-level weighting hierarchy:
- **Level 1:** Strands weighted against each other (e.g., Number 30%, Algebra 25%)
- **Level 2:** Within each strand, activity types weighted (e.g., Tests 60%, Activities 40%)

**Feasibility: Possible, but meaningfully more complex than everything else combined.**

The current calculation engine operates on a flat list of categories — it does not have a concept of sub-categories. Supporting two-level weighting would require:
- A new nested data structure inside each strand
- A new two-pass calculation: first compute the weighted average within a strand, then weight the strand results together
- New UI for setting up weights at both levels during class/subject setup

This is real work. My honest recommendation: **treat sub-weighting within strands as a Phase 2 feature.** Ship the initial elementary mode with flat strand-level weighting first. The three Ontario evidence types (Product, Observation, Conversation) already exist as the `assessmentType` field on every assessment — teachers can see which type each assessment is, and they can filter by it, without necessarily weighting them separately. Weighting between evidence types within a strand can come later if teachers actually ask for it.

If you try to build all of this at once, the feature will take significantly longer and be harder to test correctly.

---

## Student Dossier — Filter by Subject or View All

**Feasibility: Moderate. The pattern exists — it just needs extending.**

The `Student360` component (the full student dossier) currently receives a `classId` and a `studentId` and builds everything from there. It already has a tab system (Summary, Academics, Attendance, Timeline, etc.) and filters data by the active class.

Extending it for elementary would add:
- A **subject filter** at the top of the Academics tab — a dropdown that lets the teacher select "Mathematics," "Language," or "All Subjects."
- When "All Subjects" is selected: the academics view groups assessments and grades by subject first, then by strand within each subject.
- When a specific subject is selected: shows only that subject's strands and evidence.

The summary card at the top (which currently shows the overall percentage) would need to adapt — in elementary mode, it would either show the active subject's mark or a row of subject-level marks when "All" is selected.

This is achievable and fits naturally within the existing tab-and-filter pattern of the dossier. It's not trivial work but it's not a structural rethink either.

---

## The Settings Toggle — Secondary vs. Elementary Mode

**Feasibility: Easy to add. But the framing matters enormously.**

A toggle in Settings is straightforward. The critical design decision is: **what does the toggle actually control?**

### Option A: Global App Toggle (Simpler)

One toggle for the whole app. "You are in Elementary Mode." All new classes created will be elementary classes. All existing secondary classes continue to work as before.

**Risk:** A teacher who has secondary classes from last year AND wants to start a new elementary class this year would be in an awkward situation where the toggle controls "default for new classes" but doesn't change existing ones.

### Option B: Per-Class Mode Set at Creation Time (Better)

When a teacher creates a new class, they choose whether it's a Secondary class or an Elementary class. The choice is locked in at creation. You cannot convert an existing secondary class to elementary (and you wouldn't want to — the data structures are different enough that it would risk data integrity).

The Settings toggle in this model acts as a "default" for new classes — if you're in a school year where you're building elementary classes, flip the toggle and every new class you create defaults to elementary. Flip it back for secondary setup. But existing classes keep their type.

**This is the recommended approach.** It's clean, it's safe, and it correctly models the reality that a secondary class and an elementary class are different things, not the same thing in two different views.

### One Additional Point

The mode also needs to be visible on the class itself — not just the toggle. When switching between classes in the app, the UI should clearly indicate whether the active class is Secondary or Elementary. This is especially important if a teacher ever has both types in their account simultaneously.

---

## Risk Assessment: What Could Go Wrong

### The "Subjects on a Class" model is a breaking change to the data model

The existing `gradebookCategories` array on the class record is used in roughly **15 different places** across the codebase — the grades view, the setup view, the calculation engine, the dossier, the print modal, the progress report, the analytics panel, and more. Every one of those places assumes a flat list of categories is the top-level gradebook organization. Once you introduce subjects above categories, all 15 of those spots need updating.

This is not a reason not to do it — but it should be planned carefully and done in one focused effort, not incrementally. A half-finished migration where some components know about subjects and others don't would cause subtle bugs that are hard to trace.

### The IDB migration must be bulletproof

The app's IndexedDB is currently at version 27. The subjects migration would be version 28. If the migration runs incorrectly for an existing user, it could corrupt their gradebook data. The migration logic — adding default subjects to existing secondary classes, pointing all existing assessments to that default subject — needs to be extremely carefully written and tested before release.

### The Reports view is large and tightly coupled

`Reports.vue` is 88,000 bytes. It makes direct assumptions about class structure in multiple places. It will need a meaningful update to understand subject context for elementary classes.

---

## Recommended Build Order (Phased)

The feature is large enough that trying to build it all at once is risky. A phased approach reduces that risk significantly.

### Phase 1 — The Foundation
- The Settings toggle (Elementary / Secondary default)
- The data model change: subjects array on class records, `subjectId` on assessments
- The IDB migration (v28)
- The subject setup UI in the Setup tab
- Elementary class creation with Ontario strand presets per subject
- **Nothing visible changes for existing secondary users**

### Phase 2 — The Grades View
- Subject switcher in the Grades view header
- Gradebook calculation engine updated to understand subject context
- The grid works per-subject for elementary classes

### Phase 3 — The Dossier
- Subject filter in Student360
- "All Subjects" combined view, organized by subject then strand

### Phase 4 — Reports and Print
- Elementary-aware report and print layouts

---

## Summary

| Your Idea | Feasibility | Notes |
|---|---|---|
| One roster, multiple subjects | ✅ Doable | Load-bearing change. Requires touching every layer. Must be planned carefully. |
| Subject switcher in Grades | ✅ Easy | Depends on subjects model being built first. |
| Strands as weighted categories | ✅ Very easy | This is essentially already how categories work. Pre-fill from curriculum. |
| Sub-weighting within strands | ⚠️ Defer | Real complexity. Recommend Phase 2 or later. |
| Student dossier — subject filter | ✅ Moderate | Fits existing tab/filter pattern. Not trivial but well within scope. |
| Settings toggle | ✅ Easy | Recommend per-class type set at creation, not a global flip. |

**The vision is sound and the final product would be genuinely useful.** The main message is that the "one roster, multiple subjects" change touches so many layers that it deserves to be its own focused project phase rather than something done alongside the UI work. Get the data model right first — everything else slots in relatively cleanly after that.

---

*Prepared July 2026.*
