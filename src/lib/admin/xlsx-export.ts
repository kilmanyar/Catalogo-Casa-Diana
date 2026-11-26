import * as XLSX from "xlsx";

/**
 * Descarga un array de objetos como archivo .xlsx (una sola hoja). Cliente
 * únicamente — no toca el servidor, solo arma el archivo en el navegador.
 */
export function exportToExcel(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Datos",
) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  XLSX.writeFile(book, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/** Varias hojas en un solo .xlsx (respaldo completo). */
export function exportSheetsToExcel(sheets: Record<string, Record<string, unknown>[]>, filename: string) {
  const book = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), name.slice(0, 31));
  }
  XLSX.writeFile(book, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
