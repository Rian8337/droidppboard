import { useMemo, useState } from "react";
import { ModMultiplierSampleEntry } from "app-structures";
import "../../styles/table-listing.css";
import "../../styles/input.css";

export default function ScoreMultiplierTable(props: {
    scores: ModMultiplierSampleEntry[];
}) {
    const { scores } = props;

    // One proposed multiplier input per unique mod combo, seeded from current values
    const [proposedMultipliers, setProposedMultipliers] = useState<
        Record<string, number>
    >(() => {
        const initial: Record<string, number> = {};
        for (const s of scores) {
            if (!(s.modCombo in initial)) {
                initial[s.modCombo] = s.scoreMultiplier;
            }
        }
        return initial;
    });

    function setMultiplier(modCombo: string, value: number) {
        setProposedMultipliers((prev) => ({ ...prev, [modCombo]: value }));
    }

    const uniqueCombos = useMemo(
        () => [...new Set(scores.map((s) => s.modCombo))].sort(),
        [scores]
    );

    // Re-rank by proposed total score
    const displayRows = useMemo(() => {
        return scores
            .map((s) => {
                const proposed =
                    proposedMultipliers[s.modCombo] ?? s.scoreMultiplier;
                return {
                    ...s,
                    proposedTotal: Math.round(s.score * proposed),
                    proposed,
                };
            })
            .sort((a, b) => b.proposedTotal - a.proposedTotal)
            .slice(0, 50);
    }, [scores, proposedMultipliers]);

    const multiplierChanged = (modCombo: string) =>
        (proposedMultipliers[modCombo] ?? 0) !==
        scores.find((s) => s.modCombo === modCombo)?.scoreMultiplier;

    return (
        <>
            <div style={{ maxWidth: "1000px", margin: "0 auto 16px" }}>
                <p style={{ marginBottom: "8px", fontWeight: "bold" }}>
                    Proposed multipliers:
                </p>
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                    }}
                >
                    {uniqueCombos.map((combo) => (
                        <label
                            key={combo}
                            style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        >
                            <span
                                style={{
                                    color: multiplierChanged(combo)
                                        ? "rgb(252, 161, 176)"
                                        : "white",
                                    fontWeight: multiplierChanged(combo)
                                        ? "bold"
                                        : "normal",
                                }}
                            >
                                {combo}
                            </span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={proposedMultipliers[combo] ?? 1}
                                onChange={(e) =>
                                    setMultiplier(
                                        combo,
                                        parseFloat(e.target.value) || 0
                                    )
                                }
                                style={{
                                    width: "70px",
                                    background: "#444",
                                    color: "white",
                                    border: "none",
                                    borderBottom: "2px solid rgb(252, 161, 176)",
                                    borderRadius: "4px",
                                    padding: "4px 6px",
                                    font: "13px Exo-Medium",
                                }}
                            />
                        </label>
                    ))}
                </div>
            </div>

            <div className="table-container">
                <table className="listing">
                    <thead>
                        <tr>
                            <th style={{ width: "4%" }}>#</th>
                            <th style={{ width: "6%" }}>UID</th>
                            <th style={{ width: "10%" }}>Mods</th>
                            <th style={{ width: "10%" }}>Current ×</th>
                            <th style={{ width: "14%" }}>Raw Score</th>
                            <th style={{ width: "14%" }}>Current Total</th>
                            <th style={{ width: "10%" }}>Proposed ×</th>
                            <th style={{ width: "14%" }}>Proposed Total</th>
                            <th style={{ width: "10%" }}>Accuracy</th>
                            <th style={{ width: "8%" }}>Mark</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((row, i) => {
                            const changed = multiplierChanged(row.modCombo);
                            return (
                                <tr key={row.id}>
                                    <td>{i + 1}</td>
                                    <td>{row.uid}</td>
                                    <td>{row.modCombo}</td>
                                    <td>{row.scoreMultiplier.toFixed(2)}×</td>
                                    <td>{row.score.toLocaleString()}</td>
                                    <td>{row.totalScore.toLocaleString()}</td>
                                    <td
                                        style={{
                                            color: changed
                                                ? "rgb(252, 161, 176)"
                                                : "inherit",
                                        }}
                                    >
                                        {row.proposed.toFixed(2)}×
                                    </td>
                                    <td
                                        style={{
                                            color: changed
                                                ? row.proposedTotal >
                                                  row.totalScore
                                                    ? "lightgreen"
                                                    : "rgb(252, 161, 176)"
                                                : "inherit",
                                        }}
                                    >
                                        {row.proposedTotal.toLocaleString()}
                                    </td>
                                    <td>
                                        {(row.accuracy * 100).toFixed(2)}%
                                    </td>
                                    <td>{row.mark}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
