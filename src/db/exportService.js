import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generates and downloads a multi-sheet Excel report for the gradebook.
 */
export async function exportGradebookToExcel({ 
  className, 
  teacherName, 
  students, 
  assessments, 
  gradeMap, 
  summaryData 
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = teacherName || 'Classroom Tracker';
  workbook.created = new Date();

  // ---------------------------------------------------------------------------
  // SHEET 1: OVERVIEW SUMMARY
  // ---------------------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Overview Summary');
  
  summarySheet.columns = [
    { header: 'Student Name', key: 'name', width: 25 },
    { header: 'Overall Grade', key: 'grade', width: 15 },
    { header: 'Consistent Grade', key: 'consistent', width: 18 },
    { header: 'Weighted Median', key: 'median', width: 18 },
    { header: 'Absences', key: 'absences', width: 12 },
    { header: 'Lates', key: 'lates', width: 12 }
  ];

  // Style Header Row
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' }
  };

  summaryData.forEach(row => {
    const fullName = `${row.lastName || ''}, ${row.firstName || ''}`.replace(/^, /, '').trim() || row.studentId;
    
    summarySheet.addRow({
      name: fullName,
      grade: (typeof row.overallGrade === 'number' && !isNaN(row.overallGrade)) ? `${Math.round(row.overallGrade)}%` : '—',
      consistent: (typeof row.mostConsistent === 'number' && !isNaN(row.mostConsistent)) ? `${Math.round(row.mostConsistent)}%` : '—',
      median: (typeof row.median === 'number' && !isNaN(row.median)) ? `${Math.round(row.median)}%` : '—',
      absences: row.absences || 0,
      lates: row.lates || 0
    });
  });

  // ---------------------------------------------------------------------------
  // SHEET 2: THE GRADES GRID
  // ---------------------------------------------------------------------------
  const gridSheet = workbook.addWorksheet('Class Grade Grid', {
    views: [{ state: 'frozen', xSplit: 1 }]
  });

  const classAssessments = assessments.filter(a => !a.isIndividual);
  
  // Headers
  const gridHeaders = ['Student Name', ...classAssessments.map(a => a.name)];
  gridSheet.addRow(gridHeaders);
  
  const gridDates = ['', ...classAssessments.map(a => a.date ? new Date(a.date).toLocaleDateString() : '—')];
  gridSheet.addRow(gridDates);

  [1, 2].forEach(num => {
    const r = gridSheet.getRow(num);
    r.font = { bold: true };
    if (num === 1) r.height = 25;
  });

  // Data Rows
  students.forEach(student => {
    const fullName = `${student.firstName} ${student.lastName || ''}`.trim();
    const rowData = [fullName];
    
    classAssessments.forEach(a => {
      const entry = gradeMap[a.assessmentId]?.[student.studentId];
      if (!entry) {
        rowData.push('');
      } else if (entry.excluded) {
        rowData.push('EX');
      } else if (entry.missing) {
        rowData.push('MISSING');
      } else {
        const score = typeof entry.score === 'number' ? entry.score : 0;
        const total = a.totalPoints || 1;
        const pct = (score / total);
        rowData.push(isNaN(pct) ? 0 : pct); 
      }
    });

    const sheetRow = gridSheet.addRow(rowData);
    for (let i = 2; i <= rowData.length; i++) {
      const cell = sheetRow.getCell(i);
      if (typeof cell.value === 'number') {
        cell.numFmt = '0%';
      }
    }
  });

  gridSheet.getColumn(1).width = 25;
  gridSheet.getColumn(1).font = { bold: true };

  // ---------------------------------------------------------------------------
  // SHEET 3: RAW ANALYTIC DATA (Pivot Ready)
  // ---------------------------------------------------------------------------
  const rawSheet = workbook.addWorksheet('Raw Analytic Data');
  
  rawSheet.columns = [
    { header: 'Student Name', key: 'student', width: 25 },
    { header: 'Assessment', key: 'assessment', width: 20 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Attempt', key: 'attempt', width: 10 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Percentage', key: 'pct', width: 12 },
    { header: 'Weight', key: 'weight', width: 10 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  rawSheet.getRow(1).font = { bold: true };

  students.forEach(student => {
    const fullName = `${student.firstName} ${student.lastName || ''}`.trim();
    
    assessments.forEach(a => {
      const entry = gradeMap[a.assessmentId]?.[student.studentId];
      if (!entry) return;

      const attempts = entry.attempts && entry.attempts.length ? entry.attempts : [{
        score: entry.score,
        date: a.date
      }];

      attempts.forEach((att, idx) => {
        const score = typeof att.score === 'number' ? att.score : 0;
        const total = a.totalPoints || 1;
        const pct = (score / total);

        rawSheet.addRow({
          student: fullName,
          assessment: a.name,
          category: a.categoryName || 'General',
          date: att.date ? new Date(att.date).toLocaleDateString() : (a.date ? new Date(a.date).toLocaleDateString() : '—'),
          attempt: idx + 1,
          score: isNaN(score) ? 0 : score,
          total: total,
          pct: isNaN(pct) ? 0 : pct,
          weight: a.weight || 1,
          type: a.isIndividual ? 'Individual' : 'Class',
          status: entry.missing ? 'Missing' : (entry.excluded ? 'Excluded' : 'Graded')
        }).getCell('pct').numFmt = '0%';
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(new Blob([buffer]), `${className}_Gradebook_${dateStr}.xlsx`);
}
