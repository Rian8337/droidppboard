import type { ScoreColumn } from "./scoreColumns";
import type { ScoreRow } from "./rankChanges";

/** The byte order mark; written as a code so that no tool turns it into an invisible character. */
const byteOrderMark = String.fromCodePoint(0xfeff);

/** What a spreadsheet reads as the start of a formula. */
const formulaStart = /^[=+\-@\t\r]/;

/**
 * Quotes a value when RFC 4180 requires it: when it holds a comma, a quote or a line break. Text a
 * spreadsheet would run as a formula, such as a title starting with `=`, gets a `'` in front.
 */
function quoteCsvValue(value: string | number): string {
    const text =
        typeof value === "string" && formulaStart.test(value) ? `'${value}` : String(value);

    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The rows as CSV text: the column headers, then one line per row, separated by CRLF. */
export function buildScoresCsv(rows: ScoreRow[], columns: ScoreColumn[]): string {
    const lines = [
        columns.map((column) => quoteCsvValue(column.csvHeader ?? column.header)),
        ...rows.map((row) => columns.map((column) => quoteCsvValue(column.csvValue(row)))),
    ];

    return lines.map((line) => line.join(",")).join("\r\n");
}

/** Saves the rows as a CSV file through the browser. A byte order mark keeps non-ASCII titles intact in Excel. */
export function downloadScoresCsv(rows: ScoreRow[], columns: ScoreColumn[], fileName: string) {
    const blob = new Blob([byteOrderMark, buildScoresCsv(rows, columns)], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}
