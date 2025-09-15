import {
    DroidHitWindow,
    HitWindow,
    ModMap,
    ModPrecise,
    ModUtil,
    OsuHitWindow,
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
                if (a.prevPP === b.prevPP) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.liveAscending
                    ? a.prevPP - b.prevPP
                    : b.prevPP - a.prevPP;
            });
            break;

        case PlayListSortMode.localAscending:
        case PlayListSortMode.localDescending:
            data.sort((a, b) => {
                if (a.pp === b.pp) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.localAscending
                    ? a.pp - b.pp
                    : b.pp - a.pp;
            });
            break;

        case PlayListSortMode.aimPPAscending:
        case PlayListSortMode.aimPPDescending:
            data.sort((a, b) => {
                if (a.newAim === b.newAim) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.aimPPAscending
                    ? a.newAim - b.newAim
                    : b.newAim - a.newAim;
            });
            break;

        case PlayListSortMode.tapPPAscending:
        case PlayListSortMode.tapPPDescending:
            data.sort((a, b) => {
                if (a.newTap === b.newTap) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.tapPPAscending
                    ? a.newTap - b.newTap
                    : b.newTap - a.newTap;
            });
            break;

        case PlayListSortMode.accPPAscending:
        case PlayListSortMode.accPPDescending:
            data.sort((a, b) => {
                if (a.newAccuracy === b.newAccuracy) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.accPPAscending
                    ? a.newAccuracy - b.newAccuracy
                    : b.newAccuracy - a.newAccuracy;
            });
            break;

        case PlayListSortMode.visualPPAscending:
        case PlayListSortMode.visualPPDescending:
            data.sort((a, b) => {
                if (a.newVisual === b.newVisual) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.visualPPAscending
                    ? a.newVisual - b.newVisual
                    : b.newVisual - a.newVisual;
            });
            break;

        case PlayListSortMode.diffAscending:
        case PlayListSortMode.diffDescending:
            data.sort((a, b) => {
                const diffA = a.pp - a.prevPP;
                const diffB = b.pp - b.prevPP;

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

    const overallDifficulty = useMemo(() => {
        if (!detailedEntry) {
            return 5;
        }

        const greatWindow = new OsuHitWindow(detailedEntry.overallDifficulty)
            .greatWindow;

        return (
            mods.has(ModPrecise) ? PreciseDroidHitWindow : DroidHitWindow
        ).greatWindowToOD(greatWindow);
    }, [detailedEntry, mods]);

    const hitWindow = useMemo(() => {
        if (!detailedEntry) {
            return new DroidHitWindow();
        }

        const isPrecise = mods.has(ModPrecise);

        const greatWindow =
            (isPrecise
                ? new PreciseDroidHitWindow(overallDifficulty)
                : new DroidHitWindow(overallDifficulty)
            ).greatWindow * clockRate;

        if (isPrecise) {
            return new PreciseDroidHitWindow(
                PreciseDroidHitWindow.greatWindowToOD(greatWindow)
            );
        } else {
            return new DroidHitWindow(
                DroidHitWindow.greatWindowToOD(greatWindow)
            );
        }
    }, [detailedEntry, mods, overallDifficulty, clockRate]);

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

                            {generateHead("Beatmap Name", topEntries ? 30 : 35)}

                            {generateHead(
                                "Live",
                                5,
                                PlayListSortMode.liveAscending,
                                PlayListSortMode.liveDescending
                            )}

                            {generateHead(
                                "Local",
                                5,
                                PlayListSortMode.localAscending,
                                PlayListSortMode.localDescending
                            )}

                            {generateHead(
                                "Aim pp",
                                5,
                                PlayListSortMode.aimPPAscending,
                                PlayListSortMode.aimPPDescending
                            )}

                            {generateHead(
                                "Tap pp",
                                5,
                                PlayListSortMode.tapPPAscending,
                                PlayListSortMode.tapPPDescending
                            )}

                            {generateHead(
                                "Acc pp",
                                5,
                                PlayListSortMode.accPPAscending,
                                PlayListSortMode.accPPDescending
                            )}

                            {generateHead(
                                "Vis pp",
                                5,
                                PlayListSortMode.visualPPAscending,
                                PlayListSortMode.visualPPDescending
                            )}

                            {generateHead(
                                "Diff.",
                                4,
                                PlayListSortMode.diffAscending,
                                PlayListSortMode.diffDescending
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
                                generateHead("100/50/0", 5)
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
                            <tr>
                                <th>Total pp</th>
                                <td>
                                    {detailedEntry.prevPP.toFixed(2)} →{" "}
                                    {detailedEntry.pp.toFixed(2)} (
                                    {(
                                        detailedEntry.pp - detailedEntry.prevPP
                                    ).toFixed(2)}
                                    )
                                </td>
                            </tr>
                            <tr>
                                <th>Aim pp</th>
                                <td>
                                    {detailedEntry.prevAim.toFixed(2)} →{" "}
                                    {detailedEntry.newAim.toFixed(2)} (
                                    {(
                                        detailedEntry.newAim -
                                        detailedEntry.prevAim
                                    ).toFixed(2)}
                                    )
                                </td>
                            </tr>
                            <tr>
                                <th>Tap pp</th>
                                <td>
                                    {detailedEntry.prevTap.toFixed(2)} →{" "}
                                    {detailedEntry.newTap.toFixed(2)} (
                                    {(
                                        detailedEntry.newTap -
                                        detailedEntry.prevTap
                                    ).toFixed(2)}
                                    )
                                </td>
                            </tr>
                            <tr>
                                <th>Accuracy pp</th>
                                <td>
                                    {detailedEntry.prevAccuracy.toFixed(2)} →{" "}
                                    {detailedEntry.newAccuracy.toFixed(2)} (
                                    {(
                                        detailedEntry.newAccuracy -
                                        detailedEntry.prevAccuracy
                                    ).toFixed(2)}
                                    )
                                </td>
                            </tr>
                            <tr>
                                <th>Visual pp</th>
                                <td>
                                    {detailedEntry.prevVisual.toFixed(2)} →{" "}
                                    {detailedEntry.newVisual.toFixed(2)} (
                                    {(
                                        detailedEntry.newVisual -
                                        detailedEntry.prevVisual
                                    ).toFixed(2)}
                                    )
                                </td>
                            </tr>
                            <tr>
                                <th>Mods</th>
                                <td>{ModUtil.modsToOrderedString(mods)}</td>
                            </tr>
                            <tr>
                                <th>Combo</th>
                                <td>{detailedEntry.combo}</td>
                            </tr>
                            <tr>
                                <th>Accuracy</th>
                                <td>
                                    {detailedEntry.accuracy}% (
                                    {detailedEntry.hit300}/
                                    {detailedEntry.hit100}/{detailedEntry.hit50}
                                    /{detailedEntry.miss})
                                </td>
                            </tr>
                            <tr>
                                <th>Overall Difficulty</th>
                                <td>{overallDifficulty.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th>Hit Windows</th>
                                <td>
                                    <span style={{ color: "#66ccff" }}>
                                        <b>Great (300):</b> ±
                                        {(
                                            hitWindow.greatWindow / clockRate
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
                                </td>
                            </tr>
                            <tr>
                                <th>Estimated Unstable Rate</th>
                                <td>
                                    {detailedEntry.estimatedUnstableRate.toFixed(
                                        2
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <th>Estimated Speed Unstable Rate</th>
                                <td>
                                    {detailedEntry.estimatedSpeedUnstableRate.toFixed(
                                        2
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <th>Speed Note Count</th>
                                <td>{detailedEntry.speedNoteCount}</td>
                            </tr>
                        </tbody>
                    </table>
                </>
            ) : null}
        </>
    );
}
