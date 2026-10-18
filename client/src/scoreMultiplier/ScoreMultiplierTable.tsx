import type { ModMultiplierSampleEntry } from "app-structures";
import { useState } from "react";
import { DataTable, type Column, type SortState } from "../components/DataTable";
import styles from "./ScoreMultiplierTable.module.css";

interface SampleRow extends ModMultiplierSampleEntry {
    /** The place of the score by its new total score. */
    readonly rank: number;
}

const sortValues: Readonly<Record<string, (row: SampleRow) => number>> = {
    prevMultiplier: (row) => row.prevMultiplier,
    prevTotalScore: (row) => row.prevTotalScore,
    newMultiplier: (row) => row.newMultiplier,
    newTotalScore: (row) => row.newTotalScore,
};

function formatMultiplier(multiplier: number): string {
    return `${multiplier.toFixed(2)}×`;
}

/** The class of the new numbers: green when the new multiplier gives a higher score, red when lower. */
function getChangeClass(row: SampleRow): string | undefined {
    if (row.newTotalScore === row.prevTotalScore) {
        return undefined;
    }

    return row.newTotalScore > row.prevTotalScore ? styles.better : styles.worse;
}

const columns: Column<SampleRow>[] = [
    { id: "rank", header: "#", render: (row) => row.rank },
    { id: "uid", header: "UID", render: (row) => row.uid },
    {
        id: "mods",
        header: "Mods",
        render: (row) => <span className={styles.mods}>{row.mods || "NM"}</span>,
    },
    {
        id: "prevMultiplier",
        header: "Prev ×",
        isSortable: true,
        align: "right",
        render: (row) => formatMultiplier(row.prevMultiplier),
    },
    {
        id: "prevTotalScore",
        header: "Prev",
        isSortable: true,
        align: "right",
        render: (row) => row.prevTotalScore.toLocaleString(),
    },
    {
        id: "newMultiplier",
        header: "New ×",
        isSortable: true,
        align: "right",
        render: (row) => (
            <span className={getChangeClass(row)}>{formatMultiplier(row.newMultiplier)}</span>
        ),
    },
    {
        id: "newTotalScore",
        header: "New",
        isSortable: true,
        align: "right",
        render: (row) => (
            <span className={getChangeClass(row)}>{row.newTotalScore.toLocaleString()}</span>
        ),
    },
    {
        id: "combo",
        header: "Combo",
        align: "right",
        render: (row) => `${row.combo.toLocaleString()}x`,
    },
    {
        id: "accuracy",
        header: "Acc",
        align: "right",
        render: (row) => `${(row.accuracy * 100).toFixed(2)}%`,
    },
    { id: "mark", header: "Rank", render: (row) => row.mark },
];

export interface ScoreMultiplierTableProps {
    /** The scores, best new total score first. */
    scores: readonly ModMultiplierSampleEntry[];
}

/** Sampled scores with their total under the previous and the new multiplier, sortable by either. */
export function ScoreMultiplierTable({ scores }: ScoreMultiplierTableProps) {
    const [sort, setSort] = useState<SortState>({
        columnId: "newTotalScore",
        direction: "descending",
    });
    const rows = scores.map<SampleRow>((score, index) => ({ ...score, rank: index + 1 }));
    const getValue = sortValues[sort.columnId];
    const direction = sort.direction === "ascending" ? 1 : -1;

    return (
        <DataTable
            columns={columns}
            rows={rows.toSorted((a, b) => direction * (getValue(a) - getValue(b)))}
            rowKey={(row) => String(row.id)}
            sort={sort}
            onSortChange={setSort}
            emptyText="No scores found."
        />
    );
}
