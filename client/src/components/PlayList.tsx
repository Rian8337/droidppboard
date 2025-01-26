import { PrototypePPEntry, TopPrototypePPEntry } from "app-structures";
import { useState } from "react";
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

        case PlayListSortMode.rateAscending:
        case PlayListSortMode.rateDescending:
            data.sort((a, b) => {
                const rateA = a.speedMultiplier ?? 1;
                const rateB = b.speedMultiplier ?? 1;

                if (rateA === rateB) {
                    return a.rank - b.rank;
                }

                return sortMode === PlayListSortMode.rateAscending
                    ? rateA - rateB
                    : rateB - rateA;
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

                return a.combo - b.combo;
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

    return (
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

                        {generateHead("Beatmap Name", 45)}

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
                            "Diff.",
                            4,
                            PlayListSortMode.diffAscending,
                            PlayListSortMode.diffDescending
                        )}

                        {generateHead("Mods", 5)}

                        {generateHead(
                            "Rate",
                            5,
                            PlayListSortMode.rateAscending,
                            PlayListSortMode.rateDescending
                        )}

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
                                    5,
                                    PlayListSortMode.hit100Ascending,
                                    PlayListSortMode.hit100Descending
                                )}

                                {generateHead(
                                    "50",
                                    5,
                                    PlayListSortMode.hit50Ascending,
                                    PlayListSortMode.hit50Descending
                                )}

                                {generateHead(
                                    "Miss",
                                    5,
                                    PlayListSortMode.missAscending,
                                    PlayListSortMode.missDescending
                                )}
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {data.map((play, index) => (
                        <PlayItem key={index} data={play} index={index} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
