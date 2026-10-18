import { useMemo, useState } from "react";
import { DataTable } from "../components/DataTable";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { filterScores } from "./modFilter";
import { addRankChanges, type ScoreRow } from "./rankChanges";
import { downloadScoresCsv } from "./scoreCsv";
import { scoreColumns } from "./scoreColumns";
import { defaultScoreSort, sortScores } from "./scoreSorting";
import { ScoreToolbar } from "./ScoreToolbar";
import type { PrototypePPEntry } from "app-structures";
import type { SortState } from "../components/DataTable";

/** Columns that stay in the table whatever the person picks. */
const requiredColumnIds = ["rank", "player", "map"];

/** Columns that stay in view while the table scrolls sideways. */
const pinnedColumnIds = ["rank", "map"];

/** The same, when the Player column shows too. */
const pinnedColumnIdsWithPlayer = ["rank", "player", "map"];

const defaultVisibleColumnIds = scoreColumns
    .filter((column) => column.isDefaultVisible)
    .map((column) => column.id);

/** The mod filter has no picker yet, so no mod is selected. */
const noModAcronyms: string[] = [];

export interface ScoreTableProps {
    /** Scores to rank by local pp, or scores that were ranked already. */
    scores: PrototypePPEntry[] | ScoreRow[];

    /** Adds the Player column, for scores of several players. */
    showPlayer?: boolean;

    /** Where the chosen columns are remembered in this browser. */
    storageKey: string;
}

function areRanked(scores: PrototypePPEntry[] | ScoreRow[]): scores is ScoreRow[] {
    return scores.length > 0 && "rankChange" in scores[0];
}

/** Identifies a score among the rows: the player (when known), the map and the in-game score. */
function getScoreKey(row: ScoreRow): string {
    return [row.uid ?? row.username ?? "", row.hash, row.scoreID ?? ""].join(":");
}

/** Reads the stored column ids, ignoring anything that is not a list of text. */
function readColumnIds(stored: unknown): string[] {
    return Array.isArray(stored) && stored.every((id) => typeof id === "string")
        ? stored
        : defaultVisibleColumnIds;
}

/**
 * Scores as a sortable table with a search, a column picker and CSV export. Full combos show green,
 * misses red, and differences green or red.
 */
export function ScoreTable({ scores, showPlayer = false, storageKey }: ScoreTableProps) {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortState>(defaultScoreSort);
    const [storedColumnIds, setStoredColumnIds] = useLocalStorage<unknown>(
        storageKey,
        defaultVisibleColumnIds,
    );
    const chosenColumnIds = readColumnIds(storedColumnIds);

    const rows = useMemo(() => (areRanked(scores) ? scores : addRankChanges(scores)), [scores]);
    const shownRows = useMemo(
        () => sortScores(filterScores(rows, { search, modAcronyms: noModAcronyms }), sort),
        [rows, search, sort],
    );
    const visibleColumns = scoreColumns.filter((column) =>
        column.id === "player"
            ? showPlayer
            : requiredColumnIds.includes(column.id) || chosenColumnIds.includes(column.id),
    );
    const pickableColumns = scoreColumns.filter((column) => !requiredColumnIds.includes(column.id));

    function toggleColumn(columnId: string) {
        setStoredColumnIds(
            chosenColumnIds.includes(columnId)
                ? chosenColumnIds.filter((id) => id !== columnId)
                : [...chosenColumnIds, columnId],
        );
    }

    return (
        <div>
            <ScoreToolbar
                search={search}
                onSearchChange={setSearch}
                columns={pickableColumns}
                visibleColumnIds={chosenColumnIds}
                onToggle={toggleColumn}
                onExport={() => downloadScoresCsv(shownRows, visibleColumns, "scores.csv")}
            />
            <DataTable
                columns={visibleColumns}
                rows={shownRows}
                rowKey={getScoreKey}
                sort={sort}
                onSortChange={setSort}
                pinnedColumnIds={showPlayer ? pinnedColumnIdsWithPlayer : pinnedColumnIds}
                emptyText="No scores found."
            />
        </div>
    );
}
