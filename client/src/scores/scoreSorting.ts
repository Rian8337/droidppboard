import type { SortState } from "../components/DataTable";
import type { ScoreRow } from "./rankChanges";
import { scoreColumns } from "./scoreColumns";

/** Local pp, highest first. */
export const defaultScoreSort: SortState = { columnId: "local", direction: "descending" };

/** Orders numbers by value and text alphabetically; a number comes after text, which stands for a missing value. */
function compareValues(a: string | number, b: string | number): number {
    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }

    if (typeof a === "string" && typeof b === "string") {
        return a.localeCompare(b, undefined, { sensitivity: "base" });
    }

    return typeof a === "number" ? 1 : -1;
}

/** Sorts rows by a column without changing the given array. Rows that tie keep their order. */
export function sortScores(rows: ScoreRow[], sort: SortState): ScoreRow[] {
    const column = scoreColumns.find(({ id }) => id === sort.columnId);

    if (!column) {
        return [...rows];
    }

    const direction = sort.direction === "ascending" ? 1 : -1;

    return rows
        .map((row) => ({ row, value: column.csvValue(row) }))
        .sort((a, b) => direction * compareValues(a.value, b.value))
        .map(({ row }) => row);
}
