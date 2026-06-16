<template>
  <div class="csv-guide">
    <div class="csv-guide__intro">
      <p class="csv-guide__text">
        Class Tracker can parse standard classroom rosters or multi-class schedule exports directly from your school information system (e.g., <strong>PowerSchool</strong>).
      </p>
      <div class="csv-guide__callout">
        <strong>Important:</strong> A header row is required. The columns can be in any order. The system will automatically map the headers below.
      </div>
    </div>

    <!-- Required Columns -->
    <div class="csv-guide__section">
      <h4 class="csv-guide__section-title">Required Columns (at least one mapping)</h4>
      <div class="csv-guide__table-wrapper">
        <table class="csv-guide__table">
          <thead>
            <tr>
              <th>Data Field</th>
              <th>Recognized Headers (Case-insensitive)</th>
              <th>Description / Formatting</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Student ID</strong></td>
              <td><code>Student ID</code>, <code>Student Number</code>, <code>StudentID</code>, <code>student_id</code></td>
              <td>Required. Used as the unique key. If duplicate IDs are found, records are updated.</td>
            </tr>
            <tr>
              <td><strong>First Name</strong></td>
              <td><code>First Name</code>, <code>FirstName</code>, <code>first_name</code></td>
              <td>Student's given name.</td>
            </tr>
            <tr>
              <td><strong>Last Name</strong></td>
              <td><code>Last Name</code>, <code>LastName</code>, <code>last_name</code></td>
              <td>Student's family name.</td>
            </tr>
            <tr>
              <td><strong>Student Name</strong> (Combined)</td>
              <td><code>Student Name</code>, <code>StudentName</code>, <code>student_name</code></td>
              <td>Alternative combined name. Must be formatted as <code>Last, First</code>.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Optional Demographic Columns -->
    <div class="csv-guide__section">
      <h4 class="csv-guide__section-title">Optional Student Information</h4>
      <div class="csv-guide__table-wrapper">
        <table class="csv-guide__table">
          <thead>
            <tr>
              <th>Data Field</th>
              <th>Recognized Headers</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Student Email</strong></td>
              <td><code>Student eMail</code>, <code>Student Email</code></td>
              <td>Student's email address.</td>
            </tr>
            <tr>
              <td><strong>Birth Date</strong></td>
              <td><code>Birth</code></td>
              <td>Student's date of birth.</td>
            </tr>
            <tr>
              <td><strong>Custody</strong></td>
              <td><code>Custody</code></td>
              <td>Special custody info/notes.</td>
            </tr>
            <tr>
              <td><strong>Living With</strong></td>
              <td><code>Living With</code></td>
              <td>Who the student lives with.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Optional Parent/Guardian Columns -->
    <div class="csv-guide__section">
      <h4 class="csv-guide__section-title">Optional Parent/Guardian Info (Up to 4 Parents)</h4>
      <p class="csv-guide__text">
        Prefix columns with <code>Par1</code>, <code>Par2</code>, <code>Par3</code>, or <code>Par4</code> to map up to four contacts.
      </p>
      <div class="csv-guide__table-wrapper">
        <table class="csv-guide__table">
          <thead>
            <tr>
              <th>Prefix</th>
              <th>Recognized Columns</th>
              <th>Example Headers</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Par1</code> to <code>Par4</code></td>
              <td>
                <code>Name</code>, <code>eMail</code>, <code>Mobile</code>, <code>Home</code>
              </td>
              <td>
                <code>Par1 Name</code>, <code>Par1 eMail</code>, <code>Par1 Mobile</code>, <code>Par2 Name</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Multi-Class / Schedule Columns -->
    <div class="csv-guide__section">
      <h4 class="csv-guide__section-title">Multi-Class / Schedule Import</h4>
      <p class="csv-guide__text">
        If your CSV contains students from multiple classes, the wizard will automatically group students into distinct classes using these columns:
      </p>
      <div class="csv-guide__table-wrapper">
        <table class="csv-guide__table">
          <thead>
            <tr>
              <th>Data Field</th>
              <th>Recognized Headers</th>
              <th>Auto-Extraction Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Semester</strong></td>
              <td><code>Semester</code>, <code>Sem</code>, <code>Schedule</code></td>
              <td>Normalizes to <code>1</code> or <code>2</code>.</td>
            </tr>
            <tr>
              <td><strong>Period</strong></td>
              <td><code>Period</code>, <code>Section</code>, <code>Sec Section</code></td>
              <td>Extracts the numeric period (e.g., <code>P1</code> or <code>2(Y25)</code> becomes period <code>2</code>).</td>
            </tr>
            <tr>
              <td><strong>Course Code</strong></td>
              <td><code>Course Code</code>, <code>CourseCode</code></td>
              <td>Extracted from Section if Course Code is not specified.</td>
            </tr>
            <tr>
              <td><strong>Year</strong></td>
              <td><code>Year</code></td>
              <td>Detected from period strings like <code>2(Y25)</code> (becomes <code>2025-26</code>) or defaults to current active semester.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.csv-guide {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-top: 12px;
}

.csv-guide__intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.csv-guide__text {
  margin: 0;
}

.csv-guide__callout {
  background: var(--primary-light);
  border-left: 3px solid var(--primary);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--primary-dark);
  font-size: 0.82rem;
}

.csv-guide__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.csv-guide__section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}

.csv-guide__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.csv-guide__table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.8rem;
}

.csv-guide__table th,
.csv-guide__table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.csv-guide__table th {
  background: var(--bg-secondary);
  font-weight: 600;
  color: var(--text);
}

.csv-guide__table tr:last-child td {
  border-bottom: none;
}

.csv-guide__table td strong {
  color: var(--text);
}

.csv-guide__table code {
  background: var(--bg-secondary);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text);
  white-space: nowrap;
}
</style>
