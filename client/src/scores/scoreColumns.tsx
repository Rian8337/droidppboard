import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DroidHitWindow, ModPrecise, ModUtil, PreciseDroidHitWindow } from "@rian8337/osu-base";
import type { PrototypePPEntry, ScorePrototypeState } from "app-structures";
import { CountryFlag } from "../components/CountryFlag";
import type { Column } from "../components/DataTable";
import { getComparisonState, getScoreDifference } from "../leaderboard/difference";
import { DifferenceText } from "../leaderboard/DifferenceText";
import { formatMods } from "../utils/formatMods";
import { formatPp } from "../utils/formatPp";
import type { ScoreRow } from "./rankChanges";
import styles from "./scoreColumns.module.css";

export type ScoreColumn = Column<ScoreRow> & {
    /** Whether the column shows until the person hides it. */
    isDefaultVisible: boolean;

    /** The column's header in CSV, when the table shortens it. Defaults to the header. */
    csvHeader?: string;

    /** The column's value as exported to CSV, rounded as the table shows it; also what the column sorts by. */
    csvValue: (row: ScoreRow) => string | number;
};

export interface HitWindow {
    /** The half-width, in milliseconds, of the window for a great (300) hit. */
    great: number;

    /** The half-width, in milliseconds, of the window for an ok (100) hit. */
    ok: number;

    /** The half-width, in milliseconds, of the window for a meh (50) hit. */
    meh: number;
}

function roundToTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
}

/** The mods of a score as acronyms in game order with nothing between them, such as "HDDT", or "NM" for none. */
function getModsText(score: PrototypePPEntry): string {
    return formatMods(score.mods);
}

/**
 * The hit windows of a score's OD, in milliseconds. The old profile scaled them by the clock rate and
 * back, which cancels out, so they are read straight from the OD.
 */
export function getHitWindows(score: PrototypePPEntry): HitWindow {
    const { overallDifficulty } = score;
    const hitWindow = ModUtil.deserializeMods(score.mods).has(ModPrecise)
        ? new PreciseDroidHitWindow(overallDifficulty)
        : new DroidHitWindow(overallDifficulty);

    return { great: hitWindow.greatWindow, ok: hitWindow.okWindow, meh: hitWindow.mehWindow };
}

function getRelativeDifference(score: PrototypePPEntry): number | undefined {
    const base = getComparisonState(score).performance.total;

    return base === 0 ? undefined : (getScoreDifference(score) / base) * 100;
}

function renderRank(row: ScoreRow) {
    const { rank, rankChange } = row;

    return (
        <span className={styles.rank}>
            {rank}
            {rankChange !== 0 && (
                <span className={styles.rankChange} data-tone={rankChange > 0 ? "up" : "down"}>
                    <FontAwesomeIcon icon={rankChange > 0 ? faCaretUp : faCaretDown} />
                    {Math.abs(rankChange)}
                    <span className={styles.visuallyHidden}>
                        {`Moved ${rankChange > 0 ? "up" : "down"} ${Math.abs(rankChange)} ${
                            Math.abs(rankChange) === 1 ? "place" : "places"
                        }`}
                    </span>
                </span>
            )}
        </span>
    );
}

/** A value of the score's local state, with how far it is from what the score is compared with. */
function renderStateValue(local: number, base: number, digits = 2) {
    return (
        <>
            {local.toFixed(digits)}
            <small className={styles.delta}>
                <DifferenceText difference={local - base} fractionDigits={digits} />
            </small>
        </>
    );
}

/** A column for a number in the score's state (difficulty or performance), shown against what it is compared with. */
function createStateColumn(
    id: string,
    header: string,
    getValue: (state: ScorePrototypeState) => number,
): ScoreColumn {
    return {
        id,
        header,
        align: "right",
        isSortable: true,
        isDefaultVisible: false,
        render: (row) => renderStateValue(getValue(row.local), getValue(getComparisonState(row))),
        csvValue: (row) => roundToTwoDecimals(getValue(row.local)),
    };
}

function createNumberColumn(
    id: string,
    header: string,
    getValue: (row: ScoreRow) => number,
    isDefaultVisible = true,
): ScoreColumn {
    return {
        id,
        header,
        align: "right",
        isSortable: true,
        isDefaultVisible,
        render: (row) => getValue(row).toFixed(2),
        csvValue: (row) => roundToTwoDecimals(getValue(row)),
    };
}

function createCountColumn(
    id: string,
    header: string,
    getValue: (row: ScoreRow) => number,
): ScoreColumn {
    return {
        id,
        header,
        align: "right",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => getValue(row),
        csvValue: getValue,
    };
}

function createHitWindowColumn(
    id: string,
    header: string,
    getValue: (windows: HitWindow) => number,
): ScoreColumn {
    return createNumberColumn(id, header, (row) => getValue(getHitWindows(row)), false);
}

/**
 * Every column of the score table, in order. The Player column is for scores of several players;
 * a table of one player's scores leaves it out. The Master column is for scores of a variant that
 * is compared with master; a table of master's own scores leaves it out.
 */
export const scoreColumns: ScoreColumn[] = [
    {
        id: "rank",
        header: "Rank",
        isSortable: true,
        isDefaultVisible: true,
        render: renderRank,
        csvValue: (row) => row.rank,
    },
    {
        id: "player",
        header: "Player",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => (
            <span className={styles.player}>
                <CountryFlag code={row.country ?? null} />
                {row.username ?? ""}
            </span>
        ),
        csvValue: (row) => row.username ?? "",
    },
    {
        id: "map",
        header: "Map",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => <span className={styles.map}>{row.title}</span>,
        csvValue: (row) => row.title,
    },
    createNumberColumn("live", "Live", (row) => row.live.performance.total),
    {
        id: "master",
        header: "Master",
        align: "right",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => (row.master ? row.master.performance.total.toFixed(2) : "-"),
        csvValue: (row) => (row.master ? roundToTwoDecimals(row.master.performance.total) : ""),
    },
    {
        id: "local",
        header: "Local",
        align: "right",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => <b>{formatPp(row.local.performance.total)}</b>,
        csvValue: (row) => roundToTwoDecimals(row.local.performance.total),
    },
    {
        id: "difference",
        header: "Diff.",
        csvHeader: "Difference",
        align: "right",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => <DifferenceText difference={getScoreDifference(row)} fractionDigits={2} />,
        csvValue: (row) => roundToTwoDecimals(getScoreDifference(row)),
    },
    {
        id: "relativeDifference",
        header: "Rel. diff.",
        csvHeader: "Relative difference",
        align: "right",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => {
            const relativeDifference = getRelativeDifference(row);

            return relativeDifference === undefined ? (
                "-"
            ) : (
                <DifferenceText difference={relativeDifference} suffix="%" />
            );
        },
        csvValue: (row) => {
            const relativeDifference = getRelativeDifference(row);

            return relativeDifference === undefined ? "" : roundToTwoDecimals(relativeDifference);
        },
    },
    createNumberColumn("starRating", "SR", (row) => row.local.difficulty.starRating),
    {
        id: "starRatingDifference",
        header: "SR diff.",
        csvHeader: "SR difference",
        align: "right",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => (
            <DifferenceText
                difference={
                    row.local.difficulty.starRating - getComparisonState(row).difficulty.starRating
                }
                fractionDigits={2}
            />
        ),
        csvValue: (row) =>
            roundToTwoDecimals(
                row.local.difficulty.starRating - getComparisonState(row).difficulty.starRating,
            ),
    },
    {
        id: "mods",
        header: "Mods",
        isSortable: true,
        isDefaultVisible: true,
        render: getModsText,
        csvValue: getModsText,
    },
    createNumberColumn("accuracy", "Accuracy", (row) => row.accuracy),
    {
        id: "combo",
        header: "Combo",
        align: "right",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => (
            <>
                <span
                    data-tone={row.combo >= row.maxCombo ? "up" : undefined}
                    className={styles.highlight}
                >
                    {row.combo}
                </span>
                <span className={styles.maxCombo}>/{row.maxCombo}</span>
            </>
        ),
        csvValue: (row) => row.combo,
    },
    createCountColumn("n100", "100", (row) => row.hit100),
    createCountColumn("n50", "50", (row) => row.hit50),
    {
        id: "miss",
        header: "Miss",
        align: "right",
        isSortable: true,
        isDefaultVisible: true,
        render: (row) => (
            <span data-tone={row.miss > 0 ? "down" : undefined} className={styles.highlight}>
                {row.miss}
            </span>
        ),
        csvValue: (row) => row.miss,
    },
    createNumberColumn("cs", "CS", (row) => row.circleSize),
    createNumberColumn("ar", "AR", (row) => row.approachRate),
    createNumberColumn("od", "OD", (row) => row.overallDifficulty),
    createStateColumn("aimDifficulty", "Aim difficulty", (state) => state.difficulty.aim),
    createStateColumn("tapDifficulty", "Tap difficulty", (state) => state.difficulty.tap),
    createStateColumn("rhythmDifficulty", "Rhythm difficulty", (state) => state.difficulty.rhythm),
    createStateColumn(
        "flashlightDifficulty",
        "Flashlight difficulty",
        (state) => state.difficulty.flashlight,
    ),
    createStateColumn(
        "readingDifficulty",
        "Reading difficulty",
        (state) => state.difficulty.reading,
    ),
    createStateColumn("aimPp", "Aim pp", (state) => state.performance.aim),
    createStateColumn("tapPp", "Tap pp", (state) => state.performance.tap),
    createStateColumn("accuracyPp", "Accuracy pp", (state) => state.performance.accuracy),
    createStateColumn("flashlightPp", "Flashlight pp", (state) => state.performance.flashlight),
    createStateColumn("readingPp", "Reading pp", (state) => state.performance.reading),
    createHitWindowColumn("hitWindow300", "300 window (ms)", (windows) => windows.great),
    createHitWindowColumn("hitWindow100", "100 window (ms)", (windows) => windows.ok),
    createHitWindowColumn("hitWindow50", "50 window (ms)", (windows) => windows.meh),
    createStateColumn(
        "unstableRate",
        "Est. UR",
        (state) => state.performance.estimatedUnstableRate,
    ),
    createStateColumn(
        "tapUnstableRate",
        "Est. tap UR",
        (state) => state.performance.estimatedTapUnstableRate,
    ),
    createStateColumn("speedNoteCount", "Speed notes", (state) => state.difficulty.speedNoteCount),
    createStateColumn("tapPenalty", "Tap penalty", (state) => state.performance.tapPenalty ?? 1),
];
