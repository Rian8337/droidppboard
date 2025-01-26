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
            data.sort((a, b) => a.prevPP - b.prevPP);
            break;

        case PlayListSortMode.liveDescending:
            data.sort((a, b) => b.prevPP - a.prevPP);
            break;

        case PlayListSortMode.localAscending:
            data.sort((a, b) => a.pp - b.pp);
            break;

        case PlayListSortMode.localDescending:
            data.sort((a, b) => b.pp - a.pp);
            break;

        case PlayListSortMode.diffAscending:
            data.sort((a, b) => a.pp - a.prevPP - (b.pp - b.prevPP));
            break;

        case PlayListSortMode.diffDescending:
            data.sort((a, b) => b.pp - b.prevPP - (a.pp - a.prevPP));
            break;

        case PlayListSortMode.rateAscending:
            data.sort(
                (a, b) => (a.speedMultiplier ?? 1) - (b.speedMultiplier ?? 1)
            );
            break;

        case PlayListSortMode.rateDescending:
            data.sort(
                (a, b) => (b.speedMultiplier ?? 1) - (a.speedMultiplier ?? 1)
            );
            break;

        case PlayListSortMode.accuracyAscending:
            data.sort((a, b) => a.accuracy - b.accuracy);
            break;

        case PlayListSortMode.accuracyDescending:
            data.sort((a, b) => b.accuracy - a.accuracy);
            break;

        case PlayListSortMode.comboAscending:
            data.sort((a, b) => a.combo - b.combo);
            break;

        case PlayListSortMode.comboDescending:
            data.sort((a, b) => b.combo - a.combo);
            break;

        case PlayListSortMode.hit100Ascending:
            data.sort((a, b) => a.hit100 - b.hit100);
            break;

        case PlayListSortMode.hit100Descending:
            data.sort((a, b) => b.hit100 - a.hit100);
            break;

        case PlayListSortMode.hit50Ascending:
            data.sort((a, b) => a.hit50 - b.hit50);
            break;

        case PlayListSortMode.hit50Descending:
            data.sort((a, b) => b.hit50 - a.hit50);
            break;

        case PlayListSortMode.missAscending:
            data.sort((a, b) => a.miss - b.miss);
            break;

        case PlayListSortMode.missDescending:
            data.sort((a, b) => b.miss - a.miss);
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
