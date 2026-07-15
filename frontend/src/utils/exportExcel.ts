import * as XLSX from 'xlsx';

/**
 * Helper to export data to an Excel file with professional formatting
 * @param data Array of objects representing the rows
 * @param filename Name of the file to be downloaded
 * @param sheetName Name of the sheet
 * @param totals Optional object containing totals to append at the bottom
 */
export const exportToExcel = (
  data: any[],
  filename: string,
  sheetName: string = 'Sheet1',
  totals?: any
) => {
  // If totals are provided, append them as the last row
  const exportData = [...data];
  
  if (totals) {
    // Add an empty row for visual spacing
    exportData.push({});
    // Add the totals row
    exportData.push({
      ...totals,
      'Date': 'GRAND TOTAL' // Assuming 'Date' is usually the first column in these reports
    });
  }

  // Create a new workbook and a worksheet from the data
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Auto-size columns based on the longest content in each column
  const colWidths: { wch: number }[] = [];
  
  // Calculate column widths
  exportData.forEach((row) => {
    Object.keys(row).forEach((key, colIdx) => {
      const val = row[key] ? row[key].toString() : '';
      const len = Math.max(val.length, key.length) + 2; // +2 for padding
      
      if (!colWidths[colIdx]) {
        colWidths[colIdx] = { wch: len };
      } else if (colWidths[colIdx].wch < len) {
        colWidths[colIdx].wch = len;
      }
    });
  });

  // Cap column widths at 50 chars to avoid super wide columns for long descriptions
  ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w.wch, 50) }));

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
