import type { ScoreColumn } from "./scoreColumns";
import type { ScoreRow } from "./rankChanges";

/** Quotes a value when RFC 4180 requires it: when it holds a comma, a quote or a line break. */
function quoteCsvValue(value: string | number): string {
    const text = String(value);

    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The rows as CSV text: the column headers, then one line per row, separated by CRLF. */
export function buildScoresCsv(rows: ScoreRow[], columns: ScoreColumn[]): string {
    const lines = [
        columns.map((column) => quoteCsvValue(column.header)),
        ...rows.map((row) => columns.map((column) => quoteCsvValue(column.csvValue(row)))),
    ];

    return lines.map((line) => line.join(",")).join("\r\n");
}

/** Saves the rows as a CSV file through the browser. A byte order mark keeps non-ASCII titles intact in Excel. */
export function downloadScoresCsv(rows: ScoreRow[], columns: ScoreColumn[], fileName: string) {
    const blob = new Blob(["﻿", buildScoresCsv(rows, columns)], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}
