import {
    DroidHitWindow,
    HitWindow,
    ModMap,
    ModPrecise,
    ModUtil,
    PreciseDroidHitWindow,
} from "@rian8337/osu-base";
import { PrototypePPEntry, TopPrototypePPEntry } from "app-structures";
import { useMemo, useState } from "react";
import { PlayListSortMode } from "../interfaces/PlayListSortMode";
import "../styles/play-list.css";
import PlayItem from "./PlayItem";

const areTopEntries = (
    data: PrototypePPEntry[] | TopPrototypePPEntry[]
): data is TopPrototypePPEntry[] => {
    return (data[0] as TopPrototypePPEntry).username !== undefined;
};

function DetailedEntryRow(props: {
    name: string;
    value: JSX.Element | number | string;
}) {
    return (
        <tr>
            <th>{props.name}</th>
            <td>{props.value}</td>
        </tr>
    );
}

function DetailedEntryPrevNewRow(props: {
    name: string;
    prevValue: number;
    newValue: number;
}) {
    return (
        <DetailedEntryRow
            name={props.name}
            value={
                <>
                    {props.prevValue.toFixed(2)} → {props.newValue.toFixed(2)} (
                    {(props.newValue - props.prevValue).toFixed(2)})
                </>
            }
        />
    );
}

export default function PlayList(props: {
    data: PrototypePPEntry[] | TopPrototypePPEntry[];
}) {
    const data = props.data.map((v, i) => {
        return {
            ...v,
            rank: i + 1,
        };
    });

    const [sortMode, setSortMode] = useState(PlayListSortMode.localDescending);
    const [detailedEntry, setDetailedEntry] = useState<
        (typeof data)[number] | null
    >(null);

    const topEntries = areTopEntries(data);
    const hasMaster = useMemo(() => data[0]?.master !== undefined, [data]);

    const generateHead = (
        name: string,
        width: number,
        ascendSort?: PlayListSortMode,
        descendSort?: PlayListSortMode
    ) => {
        if (ascendSort === undefined || descendSort === undefined) {
            return <th style={{ width: `${width}%` }}>{name}</th>;
        }

        return (
            <th
                style={{ width: `${width}%`, cursor: "pointer" }}
                onClick={() => {
                    if (sortMode === ascendSort) {
                        setSortMode(descendSort);
                    } else {
                        setSortMode(ascendSort);
                    }
                }}
            >
                {`${name}${
                    sortMode === ascendSort
                        ? " ↑"
                        : sortMode === descendSort
                        ? " ↓"
                        : ""
                }`}
            </th>
        );
    };

    switch (sortMode) {
        case PlayListSortMode.liveAscending:
        case PlayListSortMode.liveDescending:
            data.sort((a, b) => {
                const aVal = a.live.performance.total;
                const bVal = b.live.performance.total;

                if (aVal === bVal) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.liveAscending
                    ? aVal - bVal
                    : bVal - aVal;
            });
            break;

        case PlayListSortMode.localAscending:
        case PlayListSortMode.localDescending:
            data.sort((a, b) => {
                const aVal = a.local.performance.total;
                const bVal = b.local.performance.total;

                if (aVal === bVal) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.localAscending
                    ? aVal - bVal
                    : bVal - aVal;
            });
            break;

        case PlayListSortMode.masterAscending:
        case PlayListSortMode.masterDescending:
            data.sort((a, b) => {
                const aVal = a.master?.performance.total ?? 0;
                const bVal = b.master?.performance.total ?? 0;

                if (aVal === bVal) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.masterAscending
                    ? aVal - bVal
                    : bVal - aVal;
            });
            break;

        case PlayListSortMode.aimPPAscending:
        case PlayListSortMode.aimPPDescending:
            data.sort((a, b) => {
                const aVal = a.local.performance.aim;
                const bVal = b.local.performance.aim;

                if (aVal === bVal) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.aimPPAscending
                    ? aVal - bVal
                    : bVal - aVal;
            });
            break;

        case PlayListSortMode.tapPPAscending:
        case PlayListSortMode.tapPPDescending:
            data.sort((a, b) => {
                const aVal = a.local.performance.tap;
                const bVal = b.local.performance.tap;

                if (aVal === bVal) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.tapPPAscending
                    ? aVal - bVal
                    : bVal - aVal;
            });
            break;

        case PlayListSortMode.accPPAscending:
        case PlayListSortMode.accPPDescending:
            data.sort((a, b) => {
                const aVal = a.local.performance.accuracy;
                const bVal = b.local.performance.accuracy;

                if (aVal === bVal) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.accPPAscending
                    ? aVal - bVal
                    : bVal - aVal;
            });
            break;

        case PlayListSortMode.readingPPAscending:
        case PlayListSortMode.readingPPDescending:
            data.sort((a, b) => {
                const aVal = a.local.performance.reading;
                const bVal = b.local.performance.reading;

                if (aVal === bVal) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.readingPPAscending
                    ? aVal - bVal
                    : bVal - aVal;
            });
            break;

        case PlayListSortMode.diffAscending:
        case PlayListSortMode.diffDescending:
            data.sort((a, b) => {
                const diffA =
                    a.local.performance.total -
                    (a.master ?? a.live).performance.total;

                const diffB =
                    b.local.performance.total -
                    (b.master ?? b.live).performance.total;

                if (diffA === diffB) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.diffAscending
                    ? diffA - diffB
                    : diffB - diffA;
            });
            break;

        case PlayListSortMode.accuracyAscending:
        case PlayListSortMode.accuracyDescending:
            data.sort((a, b) => {
                if (a.accuracy === b.accuracy) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.accuracyAscending
                    ? a.accuracy - b.accuracy
                    : b.accuracy - a.accuracy;
            });
            break;

        case PlayListSortMode.comboAscending:
        case PlayListSortMode.comboDescending:
            data.sort((a, b) => {
                if (a.combo === b.combo) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.comboAscending
                    ? a.combo - b.combo
                    : b.combo - a.combo;
            });
            break;

        case PlayListSortMode.hit100Ascending:
        case PlayListSortMode.hit100Descending:
            data.sort((a, b) => {
                if (a.hit100 === b.hit100) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.hit100Ascending
                    ? a.hit100 - b.hit100
                    : b.hit100 - a.hit100;
            });
            break;

        case PlayListSortMode.hit50Ascending:
        case PlayListSortMode.hit50Descending:
            data.sort((a, b) => {
                if (a.hit50 === b.hit50) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.hit50Ascending
                    ? a.hit50 - b.hit50
                    : b.hit50 - a.hit50;
            });
            break;

        case PlayListSortMode.missAscending:
        case PlayListSortMode.missDescending:
            data.sort((a, b) => {
                if (a.miss === b.miss) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.missAscending
                    ? a.miss - b.miss
                    : b.miss - a.miss;
            });
            break;
    }

    const mods = useMemo(() => {
        if (!detailedEntry) {
            return new ModMap();
        }

        return ModUtil.deserializeMods(detailedEntry.mods);
    }, [detailedEntry]);

    const clockRate = useMemo(() => {
        if (!detailedEntry) {
            return 1;
        }

        return ModUtil.calculateRateWithMods(mods.values());
    }, [detailedEntry, mods]);

    const hitWindow = useMemo(() => {
        if (!detailedEntry) {
            return new DroidHitWindow();
        }

        const { overallDifficulty } = detailedEntry;
        const isPrecise = mods.has(ModPrecise);

        const hitWindow = isPrecise
            ? new PreciseDroidHitWindow(overallDifficulty)
            : new DroidHitWindow(overallDifficulty);

        const greatWindow = hitWindow.greatWindow * clockRate;

        if (isPrecise) {
            return new PreciseDroidHitWindow(
                PreciseDroidHitWindow.greatWindowToOD(greatWindow)
            );
        } else {
            return new DroidHitWindow(
                DroidHitWindow.greatWindowToOD(greatWindow)
            );
        }
    }, [detailedEntry, mods, clockRate]);

    return (
        <>
            <div className="play-list-container">
                <table className="play-list-table">
                    <thead>
                        <tr>
                            {generateHead(
                                "Rank",
                                5,
                                PlayListSortMode.localAscending,
                                PlayListSortMode.localDescending
                            )}

                            {topEntries && generateHead("Player", 10)}

                            {generateHead("Beatmap Name", 35)}

                            {generateHead(
                                "Live",
                                5,
                                PlayListSortMode.liveAscending,
                                PlayListSortMode.liveDescending
                            )}

                            {hasMaster &&
                                generateHead(
                                    "Master",
                                    5,
                                    PlayListSortMode.masterAscending,
                                    PlayListSortMode.masterDescending
                                )}

                            {generateHead(
                                "Local",
                                5,
                                PlayListSortMode.localAscending,
                                PlayListSortMode.localDescending
                            )}

                            {generateHead(
                                "Diff",
                                4,
                                PlayListSortMode.diffAscending,
                                PlayListSortMode.diffDescending
                            )}

                            {generateHead(
                                "Aim",
                                5,
                                PlayListSortMode.aimPPAscending,
                                PlayListSortMode.aimPPDescending
                            )}

                            {generateHead(
                                "Tap",
                                5,
                                PlayListSortMode.tapPPAscending,
                                PlayListSortMode.tapPPDescending
                            )}

                            {generateHead(
                                "Acc",
                                5,
                                PlayListSortMode.accPPAscending,
                                PlayListSortMode.accPPDescending
                            )}

                            {generateHead(
                                "Read",
                                5,
                                PlayListSortMode.readingPPAscending,
                                PlayListSortMode.readingPPDescending
                            )}

                            {generateHead("Mods", 10)}

                            {generateHead(
                                "Accuracy",
                                6,
                                PlayListSortMode.accuracyAscending,
                                PlayListSortMode.accuracyDescending
                            )}

                            {generateHead(
                                "Combo",
                                5,
                                PlayListSortMode.comboAscending,
                                PlayListSortMode.comboDescending
                            )}

                            {topEntries ? (
                                generateHead("100/50/0", 6)
                            ) : (
                                <>
                                    {generateHead(
                                        "100",
                                        3,
                                        PlayListSortMode.hit100Ascending,
                                        PlayListSortMode.hit100Descending
                                    )}

                                    {generateHead(
                                        "50",
                                        3,
                                        PlayListSortMode.hit50Ascending,
                                        PlayListSortMode.hit50Descending
                                    )}

                                    {generateHead(
                                        "Miss",
                                        4,
                                        PlayListSortMode.missAscending,
                                        PlayListSortMode.missDescending
                                    )}
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((play, index) => (
                            <PlayItem
                                key={index}
                                data={play}
                                index={index}
                                onClick={() => setDetailedEntry(play)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {detailedEntry !== null ? (
                <>
                    <hr />
                    <h3 className="subtitle">
                        #{detailedEntry.rank}: {detailedEntry.title}
                    </h3>
                    <table>
                        <tbody>
                            <DetailedEntryRow
                                name="Mods"
                                value={ModUtil.modsToOrderedString(mods)}
                            />

                            <DetailedEntryRow
                                name="Combo"
                                value={`${detailedEntry.combo}/${detailedEntry.maxCombo}`}
                            />

                            <DetailedEntryRow
                                name="Accuracy"
                                value={`${detailedEntry.accuracy.toFixed(
                                    2
                                )}% (${detailedEntry.hit300}/${
                                    detailedEntry.hit100
                                }/${detailedEntry.hit50}/${
                                    detailedEntry.miss
                                })`}
                            />

                            <DetailedEntryRow
                                name="Difficulty Statistics"
                                value={
                                    <>
                                        CS:{" "}
                                        {detailedEntry.circleSize.toFixed(2)}
                                        <br />
                                        AR:{" "}
                                        {detailedEntry.approachRate.toFixed(2)}
                                        <br />
                                        OD:{" "}
                                        {detailedEntry.overallDifficulty.toFixed(
                                            2
                                        )}
                                    </>
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Star Rating"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .difficulty.starRating
                                }
                                newValue={
                                    detailedEntry.local.difficulty.starRating
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Aim Difficulty"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .difficulty.aim
                                }
                                newValue={detailedEntry.local.difficulty.aim}
                            />

                            <DetailedEntryPrevNewRow
                                name="Tap Difficulty"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .difficulty.tap
                                }
                                newValue={detailedEntry.local.difficulty.tap}
                            />

                            <DetailedEntryPrevNewRow
                                name="Rhythm Difficulty"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .difficulty.rhythm
                                }
                                newValue={detailedEntry.local.difficulty.rhythm}
                            />

                            <DetailedEntryPrevNewRow
                                name="Flashlight Difficulty"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .difficulty.flashlight
                                }
                                newValue={
                                    detailedEntry.local.difficulty.flashlight
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Reading Difficulty"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .difficulty.reading
                                }
                                newValue={
                                    detailedEntry.local.difficulty.reading
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Total pp"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.total
                                }
                                newValue={detailedEntry.local.performance.total}
                            />

                            <DetailedEntryPrevNewRow
                                name="Aim pp"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.aim
                                }
                                newValue={detailedEntry.local.performance.aim}
                            />

                            <DetailedEntryPrevNewRow
                                name="Tap pp"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.tap
                                }
                                newValue={detailedEntry.local.performance.tap}
                            />

                            <DetailedEntryPrevNewRow
                                name="Accuracy pp"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.accuracy
                                }
                                newValue={
                                    detailedEntry.local.performance.accuracy
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Flashlight pp"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.flashlight
                                }
                                newValue={
                                    detailedEntry.local.performance.flashlight
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Reading pp"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.reading
                                }
                                newValue={
                                    detailedEntry.local.performance.reading
                                }
                            />

                            <DetailedEntryRow
                                name="Hit Windows"
                                value={
                                    <>
                                        <span style={{ color: "#66ccff" }}>
                                            <b>Great (300):</b> ±
                                            {(
                                                hitWindow.greatWindow /
                                                clockRate
                                            ).toFixed(2)}
                                            ms
                                        </span>
                                        <br />
                                        <span style={{ color: "#88b300" }}>
                                            <b>Ok (100):</b> ±
                                            {(
                                                hitWindow.okWindow / clockRate
                                            ).toFixed(2)}
                                            ms
                                        </span>
                                        <br />
                                        <span style={{ color: "#ffcc22" }}>
                                            <b>Meh (50):</b> ±
                                            {(
                                                hitWindow.mehWindow / clockRate
                                            ).toFixed(2)}
                                            ms
                                        </span>
                                        <br />
                                        <span style={{ color: "#ed1121" }}>
                                            <b>Miss:</b> ±
                                            {(
                                                HitWindow.missWindow / clockRate
                                            ).toFixed(2)}
                                            ms
                                        </span>
                                    </>
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Estimated Unstable Rate"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.estimatedUnstableRate
                                }
                                newValue={
                                    detailedEntry.local.performance
                                        .estimatedUnstableRate
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Estimated Tap Unstable Rate"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.estimatedTapUnstableRate
                                }
                                newValue={
                                    detailedEntry.local.performance
                                        .estimatedTapUnstableRate
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Speed Note Count"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .difficulty.speedNoteCount
                                }
                                newValue={
                                    detailedEntry.local.difficulty
                                        .speedNoteCount
                                }
                            />

                            <DetailedEntryPrevNewRow
                                name="Tap Penalty"
                                prevValue={
                                    (detailedEntry.master ?? detailedEntry.live)
                                        .performance.tapPenalty ?? 1
                                }
                                newValue={
                                    detailedEntry.local.performance
                                        .tapPenalty ?? 1
                                }
                            />
                        </tbody>
                    </table>
                </>
            ) : null}
        </>
    );
}
