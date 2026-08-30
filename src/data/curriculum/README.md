# Ontario Curriculum Presets

This directory contains standardized, pre-packaged Ontario Ministry of Education curriculum expectations for elementary and secondary courses in **Classroom Tracker**.

---

## 📁 Directory Structure

Presets are grouped by educational panel and subject discipline:

```text
src/data/curriculum/
├── schema.json               # JSON Schema definition for validation
├── template.json             # Starter boilerplate template
├── index.js                  # Central registry exporting presets array & lookup helpers
├── ontario/
│   ├── elementary/
│   │   ├── grade-7/          # Grade 7 Elementary subjects (Arts, French, Math, Science, etc.)
│   │   └── grade-8/          # Grade 8 Elementary subjects
│   └── secondary/
│       ├── math/             # High school math (MTH1W, MPM2D, MFM2P, etc.)
│       └── science/          # High school science (SNC1W, SNC2D, SCH3U, SPH3U, SPH4U, etc.)
```

---

## 📋 JSON Structure Specification

Every curriculum preset must adhere to [`schema.json`](file:///Users/kylestashuk/Projects/classroom-tracker/src/data/curriculum/schema.json):

```json
{
  "presetId": "ontario-g7-science-tech",
  "title": "Grade 7 Science and Technology (2022)",
  "panel": "elementary",
  "region": "Ontario",
  "grade": "7",
  "subjectCode": "SCI",
  "strands": [
    {
      "name": "A. STEM Investigation and Communication Skills",
      "overalls": [
        {
          "code": "A1",
          "title": "STEM Skills",
          "description": "apply an engineering design process and coding skills...",
          "specifics": [
            {
              "code": "A1.1",
              "description": "apply a scientific research process and associated skills..."
            }
          ]
        }
      ]
    }
  ]
}
```

### Key Field Rules:
- **`presetId`**: Lowercase alphanumeric with hyphens (e.g., `ontario-g7-science-tech`, `ontario-snc1w`).
- **`panel`**: Must be either `"elementary"` or `"secondary"`.
- **`code`**: Overall codes uppercase (e.g. `A1`, `B2`). Specific codes dotted uppercase (e.g. `A1.1`, `B2.3`).
- **`description`**: **Plain text only**. No HTML entities (`&nbsp;`, `&amp;`, `&quot;`), no unicode `\u00a0` non-breaking spaces, and no spaces before closing punctuation (`.` or `)`).

---

## 🤖 Generating New Presets with an LLM

You can generate new curriculum preset files by providing this prompt to an LLM (Gemini, Claude, GPT-4) along with the source curriculum PDF or text:

### Copy-Paste LLM Prompt Template:

````markdown
You are a curriculum data specialist. Convert the attached Ontario Ministry of Education curriculum text into a single, strictly valid JSON preset following this exact format:

Requirements:
1. Output ONLY valid JSON matching the schema below.
2. Ensure clean plain text descriptions with NO HTML entities (do NOT include `&nbsp;`, `&amp;`, `&quot;`, etc.). Use standard UTF-8 characters (e.g. standard space, en-dash `–`, curly apostrophe `’`).
3. Ensure no trailing space before punctuation (e.g. write "systems." NOT "systems .").
4. Expectation codes must follow standard Ontario numbering (Overall: "A1", Specific: "A1.1").

Schema Template:
```json
{
  "presetId": "ontario-grade-subjectcode",
  "title": "Full Course Title (Year)",
  "panel": "elementary or secondary",
  "region": "Ontario",
  "grade": "7/8/9/10/11/12",
  "subjectCode": "SUBJECT_CODE",
  "department": "Optional department for high school",
  "strands": [
    {
      "name": "Strand Name",
      "overalls": [
        {
          "code": "A1",
          "title": "Overall Topic Name",
          "description": "Full text of overall expectation.",
          "specifics": [
            {
              "code": "A1.1",
              "description": "Full text of specific expectation."
            }
          ]
        }
      ]
    }
  ]
}
```

Here is the source curriculum text:
[PASTE SOURCE CURRICULUM HERE]
````

---

## 🛠️ Validation and Auto-Fix Tools

Classroom Tracker includes an automated curriculum linter and auto-fix script:

### 1. Validate All Presets
```bash
npm run validate:curriculum
```
Checks for required properties, valid codes, registered imports, duplicate expectations, and entity hygiene.

### 2. Auto-Sanitize & Format Presets
```bash
npm run fix:curriculum
```
Automatically cleans any `&nbsp;` entities, formats whitespace, standardizes JSON indentation, and normalizes punctuation spacing across all preset files.

---

## 📦 Registering a New Preset

When you add a new `.json` file to `src/data/curriculum/`:

1. Save the file under the appropriate path (e.g. `src/data/curriculum/ontario/secondary/science/ontario-sph4u.json`).
2. Import and add it to `curriculumPresets` array in [`src/data/curriculum/index.js`](file:///Users/kylestashuk/Projects/classroom-tracker/src/data/curriculum/index.js).
3. Run `npm run validate:curriculum` to ensure it passes all checks.
