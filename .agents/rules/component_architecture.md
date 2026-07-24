# Component Architecture & File Size Guidelines

Rules for code creation, component organization, and refactoring in Classroom Tracker.

## Rules:

1. **Strict File Line Limit (1,000 Lines Max)**:
   - No single `.vue` file or `.js` file should exceed **1,000 lines**.
   - If a file approaches 800–1,000 lines during feature development, proactive extraction into sub-components is mandatory.

2. **Modular Component Creation for New Additions**:
   - Always build new UI elements (modals, sub-tabs, export menus, detail views, custom toolbars) as dedicated components.
   - Store them in their corresponding component subdirectory:
     - `src/components/grades/`
     - `src/components/reports/`
     - `src/components/dossier/`
     - `src/components/setup/`
   - Do NOT inline large template sections, modal dialogs, or massive script blocks directly into top-level views.

3. **Orchestrator View Pattern**:
   - Views (`Dashboard.vue`, `Setup.vue`, `Reports.vue`, `Grades.vue`, `Student360.vue`) act as top-level orchestrators for routing state and layout coordinates.
   - Detail tables, modal forms, print dialogs, and tab panels must be delegated to child components.
