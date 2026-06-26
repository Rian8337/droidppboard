import { ModMultiplierSampleEntry } from "app-structures";
import { useState } from "react";
import { ScoreMultiplierSortMode } from "../../interfaces/ScoreMultiplierSortMode";
import "../../styles/play-list.css";
import { Precision } from "@rian8337/osu-base";

export default function ScoreMultiplierTable(props: {
    scores: ModMultiplierSampleEntry[];
}) {
    const [sortMode, setSortMode] = useState(
        ScoreMultiplierSortMode.newTotalScoreDescending
    );

    const data = props.scores.map((s, i) => ({ ...s, rank: i + 1 }));

    switch (sortMode) {
        case ScoreMultiplierSortMode.prevMultiplierAscending:
        case ScoreMultiplierSortMode.prevMultiplierDescending:
            data.sort((a, b) =>
                sortMode === ScoreMultiplierSortMode.prevMultiplierAscending
                    ? a.prevMultiplier - b.prevMultiplier
                    : b.prevMultiplier - a.prevMultiplier
            );
            break;

        case ScoreMultiplierSortMode.prevTotalScoreAscending:
        case ScoreMultiplierSortMode.prevTotalScoreDescending:
            data.sort((a, b) =>
                sortMode === ScoreMultiplierSortMode.prevTotalScoreAscending
                    ? a.prevTotalScore - b.prevTotalScore
                    : b.prevTotalScore - a.prevTotalScore
            );
            break;

        case ScoreMultiplierSortMode.newMultiplierAscending:
        case ScoreMultiplierSortMode.newMultiplierDescending:
            data.sort((a, b) =>
                sortMode === ScoreMultiplierSortMode.newMultiplierAscending
                    ? a.newMultiplier - b.newMultiplier
                    : b.newMultiplier - a.newMultiplier
            );
            break;

        case ScoreMultiplierSortMode.newTotalScoreAscending:
        case ScoreMultiplierSortMode.newTotalScoreDescending:
            data.sort((a, b) =>
                sortMode === ScoreMultiplierSortMode.newTotalScoreAscending
                    ? a.newTotalScore - b.newTotalScore
                    : b.newTotalScore - a.newTotalScore
            );
            break;
    }

    const generateHead = (
        name: string,
        ascendSort?: ScoreMultiplierSortMode,
        descendSort?: ScoreMultiplierSortMode
    ) => {
        if (ascendSort === undefined || descendSort === undefined) {
            return <th>{name}</th>;
        }

        return (
            <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                    setSortMode(
                        sortMode === ascendSort ? descendSort : ascendSort
                    );
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

    return (
        <div className="play-list-container">
            <table className="play-list-table" style={{ width: "100%" }}>
                <thead>
                    <tr>
                        {generateHead("#")}
                        {generateHead("UID")}
                        {generateHead("Mods")}
                        {generateHead(
                            "Prev ×",
                            ScoreMultiplierSortMode.prevMultiplierAscending,
                            ScoreMultiplierSortMode.prevMultiplierDescending
                        )}
                        {generateHead(
                            "Prev",
                            ScoreMultiplierSortMode.prevTotalScoreAscending,
                            ScoreMultiplierSortMode.prevTotalScoreDescending
                        )}
                        {generateHead(
                            "New ×",
                            ScoreMultiplierSortMode.newMultiplierAscending,
                            ScoreMultiplierSortMode.newMultiplierDescending
                        )}
                        {generateHead(
                            "New",
                            ScoreMultiplierSortMode.newTotalScoreAscending,
                            ScoreMultiplierSortMode.newTotalScoreDescending
                        )}
                        {generateHead("Combo")}
                        {generateHead("Acc")}
                        {generateHead("Rank")}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => {
                        const delta = row.newTotalScore - row.prevTotalScore;

                        let deltaColor = "inherit";

                        if (!Precision.almostEquals(delta, 0)) {
                            deltaColor =
                                delta > 0 ? "lightgreen" : "rgb(252, 161, 176)";
                        }

                        return (
                            <tr key={row.id}>
                                <td>{row.rank}</td>
                                <td>{row.uid}</td>
                                <td style={{ wordBreak: "break-all" }}>
                                    {row.mods || "NM"}
                                </td>
                                <td>{row.prevMultiplier.toFixed(2)}×</td>
                                <td>{row.prevTotalScore.toLocaleString()}</td>
                                <td style={{ color: deltaColor }}>
                                    {row.newMultiplier.toFixed(2)}×
                                </td>
                                <td style={{ color: deltaColor }}>
                                    {row.newTotalScore.toLocaleString()}
                                </td>
                                <td>{row.combo.toLocaleString()}x</td>
                                <td>{(row.accuracy * 100).toFixed(2)}%</td>
                                <td>{row.mark}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
