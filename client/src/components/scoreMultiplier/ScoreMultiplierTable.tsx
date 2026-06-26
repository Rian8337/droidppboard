import { ModMultiplierSampleEntry } from "app-structures";
import "../../styles/table-listing.css";

export default function ScoreMultiplierTable(props: {
    scores: ModMultiplierSampleEntry[];
}) {
    const { scores } = props;

    return (
        <div className="table-container">
            <table className="listing">
                <thead>
                    <tr>
                        <th style={{ width: "4%" }}>#</th>
                        <th style={{ width: "6%" }}>UID</th>
                        <th style={{ width: "10%" }}>Mods</th>
                        <th style={{ width: "10%" }}>Prev ×</th>
                        <th style={{ width: "14%" }}>Prev Total</th>
                        <th style={{ width: "10%" }}>New ×</th>
                        <th style={{ width: "14%" }}>New Total</th>
                        <th style={{ width: "14%" }}>Base Score</th>
                        <th style={{ width: "10%" }}>Accuracy</th>
                        <th style={{ width: "8%" }}>Mark</th>
                    </tr>
                </thead>
                <tbody>
                    {scores.map((row, i) => {
                        const delta = row.newTotalScore - row.prevTotalScore;
                        const deltaColor =
                            delta > 0
                                ? "lightgreen"
                                : delta < 0
                                  ? "rgb(252, 161, 176)"
                                  : "inherit";

                        return (
                            <tr key={row.id}>
                                <td>{i + 1}</td>
                                <td>{row.uid}</td>
                                <td>{row.mods || "NM"}</td>
                                <td>{row.prevMultiplier.toFixed(2)}×</td>
                                <td>{row.prevTotalScore.toLocaleString()}</td>
                                <td style={{ color: deltaColor }}>
                                    {row.newMultiplier.toFixed(2)}×
                                </td>
                                <td style={{ color: deltaColor }}>
                                    {row.newTotalScore.toLocaleString()}
                                </td>
                                <td>{row.baseScore.toLocaleString()}</td>
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
