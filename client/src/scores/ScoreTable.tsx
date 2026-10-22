import type { SerializedMod } from "@rian8337/osu-base";
import { useMemo, useState } from "react";
import { DataTable } from "../components/DataTable";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { getSelectedAcronyms } from "../mods/droidMods";
import { ModPicker } from "../mods/ModPicker";
import { filterScores } from "./modFilter";
import { addRankChanges, type ScoreRow } from "./rankChanges";
import { downloadScoresCsv } from "./scoreCsv";
import { scoreColumns } from "./scoreColumns";
import { defaultScoreSort, sortScores } from "./scoreSorting";
import { ScoreToolbar } from "./ScoreToolbar";
import styles from "./ScoreTable.module.css";
import type { PrototypePPEntry } from "app-structures";
import type { SortState } from "../components/DataTable";

/** Columns that stay in the table whatever the person picks. */
const requiredColumnIds = ["rank", "player", "map", "master"];

/** Columns that stay in view while the table scrolls sideways. */
const pinnedColumnIds = ["rank", "map"];

/** The same, when the Player column shows too. */
const pinnedColumnIdsWithPlayer = ["rank", "player", "map"];

const defaultVisibleColumnIds = scoreColumns
    .filter((column) => column.isDefaultVisible)
    .map((column) => column.id);

export interface ScoreTableProps {
    /** Scores to rank by local pp, or scores that were ranked already. */
    scores: PrototypePPEntry[] | ScoreRow[];

    /** Adds the Player column, for scores of several players. */
    showPlayer?: boolean;

    /** Adds the Master column, for scores that are compared with master rather than live. */
    showMaster?: boolean;

    /** Where the chosen columns are remembered in this browser. */
    storageKey: string;

    /**
     * The mods picked in the mod filter. Given together with `onModsChange`, the page owns the
     * selection (for a page that also asks the server for the mods); otherwise the table does.
     */
    mods?: readonly SerializedMod[];
    onModsChange?: (mods: readonly SerializedMod[]) => void;

    /** Shows a loading note instead of the rows, for scores that are about to be replaced. */
    isLoading?: boolean;
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
export function ScoreTable({
    scores,
    showPlayer = false,
    showMaster = false,
    storageKey,
    mods: controlledMods,
    onModsChange,
    isLoading = false,
}: ScoreTableProps) {
    const [search, setSearch] = useState("");
    const [ownMods, setOwnMods] = useState<readonly SerializedMod[]>([]);
    const mods = controlledMods ?? ownMods;
    const [sort, setSort] = useState<SortState>(defaultScoreSort);
    const [storedColumnIds, setStoredColumnIds] = useLocalStorage<unknown>(
        storageKey,
        defaultVisibleColumnIds,
    );
    const chosenColumnIds = readColumnIds(storedColumnIds);

    const rows = useMemo(() => (areRanked(scores) ? scores : addRankChanges(scores)), [scores]);
    const shownRows = useMemo(
        () =>
            sortScores(
                filterScores(rows, { search, modAcronyms: getSelectedAcronyms(mods) }),
                sort,
            ),
        [rows, search, mods, sort],
    );
    const visibleColumns = scoreColumns.filter((column) => {
        switch (column.id) {
            case "player":
                return showPlayer;
            case "master":
                return showMaster;
            default:
                return requiredColumnIds.includes(column.id) || chosenColumnIds.includes(column.id);
        }
    });
    const pickableColumns = scoreColumns.filter((column) => !requiredColumnIds.includes(column.id));

    function changeMods(newMods: readonly SerializedMod[]) {
        setOwnMods(newMods);
        onModsChange?.(newMods);
    }

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
                modFilter={<ModPicker mods={mods} onChange={changeMods} hasSettings={false} />}
                columns={pickableColumns}
                visibleColumnIds={chosenColumnIds}
                onToggle={toggleColumn}
                onExport={() => downloadScoresCsv(shownRows, visibleColumns, "scores.csv")}
            />
            {isLoading ? (
                <p className={styles.note}>Loading...</p>
            ) : (
                <DataTable
                    columns={visibleColumns}
                    rows={shownRows}
                    rowKey={getScoreKey}
                    sort={sort}
                    onSortChange={setSort}
                    pinnedColumnIds={showPlayer ? pinnedColumnIdsWithPlayer : pinnedColumnIds}
                    emptyText="No scores found."
                />
            )}
        </div>
    );
}
