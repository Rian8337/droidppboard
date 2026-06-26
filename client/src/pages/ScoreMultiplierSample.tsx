import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import Head from "../components/Head";
import ScoreMultiplierTable from "../components/scoreMultiplier/ScoreMultiplierTable";
import { ModMultiplierSampleResponse } from "app-structures";
import "../styles/main.css";
import "../styles/input.css";

export default function ScoreMultiplierSample() {
    const [beatmapInput, setBeatmapInput] = useState("");
    const [modFilter, setModFilter] = useState("");
    const [response, setResponse] =
        useState<ModMultiplierSampleResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const trimmed = beatmapInput.trim();
        if (!trimmed) {
            return;
        }

        setLoading(true);
        setError(undefined);
        setResponse(null);

        const params = new URLSearchParams({ beatmapId: trimmed });

        const trimmedMods = modFilter.trim();
        if (trimmedMods) {
            params.set("mods", trimmedMods);
        }

        try {
            const res = await fetch(
                `/api/ppboard/score-multiplier-sample?${params}`
            );

            if (res.status === 429) {
                throw new Error(
                    "You are being rate limited. Please try again later"
                );
            }

            if (res.status === 404) {
                throw new Error("Beatmap not found");
            }

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    (body as { message?: string }).message ?? "Unknown error"
                );
            }

            setResponse(await res.json());
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="Sample scores per mod combination for a beatmap to assist with score multiplier rebalancing."
                title="PP Board - Score Multiplier Sample"
            />
            <h2 className="subtitle">Score Multiplier Sample</h2>
            <h3 className="description" style={{ textAlign: "center" }}>
                Enter a beatmap ID or URL to compare top scores under the
                previous and new score multipliers.
            </h3>

            <table>
                <thead>
                    <tr>
                        <th>Mod</th>
                        <th>Old Multiplier</th>
                        <th>New Multiplier</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>EZ</td>
                        <td>0.5</td>
                        <td>0.8</td>
                    </tr>
                    <tr>
                        <td>RE</td>
                        <td>0.5</td>
                        <td>0.3</td>
                    </tr>
                    <tr>
                        <td>HR</td>
                        <td>1.06</td>
                        <td>1.04</td>
                    </tr>
                    <tr>
                        <td>PR</td>
                        <td>1.06</td>
                        <td>1.02 - 1.08 (OD-based)</td>
                    </tr>
                    <tr>
                        <td>HD</td>
                        <td>1.06 (default) / 1 (custom)</td>
                        <td>1.06 / 1.03 (only fade approach circles)</td>
                    </tr>
                    <tr>
                        <td>TC</td>
                        <td>1.06</td>
                        <td>1.02</td>
                    </tr>
                    <tr>
                        <td>FL</td>
                        <td>1.12 (default) / 1 (custom)</td>
                        <td>1.02 - 1.2 (size-based, combo-based)</td>
                    </tr>
                    <tr>
                        <td>FL + FR</td>
                        <td>1</td>
                        <td>FL bonus halved</td>
                    </tr>
                    <tr>
                        <td>DT / NC</td>
                        <td>1.12</td>
                        <td>1.23</td>
                    </tr>
                    <tr>
                        <td>HT</td>
                        <td>0.3</td>
                        <td>0.55</td>
                    </tr>
                    <tr>
                        <td>CS</td>
                        <td>0.09 (0.5x) - 1.24 (2x)</td>
                        <td>0.2 (0.5x) - 1.46 (2x)</td>
                    </tr>
                    <tr>
                        <td>WU / WD</td>
                        <td colSpan={2}>
                            Rate formula updated (same as CS changes above)
                        </td>
                    </tr>
                    <tr>
                        <td>RD</td>
                        <td>1</td>
                        <td>0.7</td>
                    </tr>
                    <tr>
                        <td>AD</td>
                        <td>1</td>
                        <td>0.7</td>
                    </tr>
                </tbody>
            </table>

            <div className="search-container">
                <form onSubmit={onSubmit} style={{ textAlign: "center" }}>
                    <input
                        className="search"
                        type="text"
                        placeholder="Beatmap ID or URL..."
                        value={beatmapInput}
                        onChange={(e) => setBeatmapInput(e.target.value)}
                        disabled={loading}
                    />
                    <br />
                    <input
                        className="search"
                        type="text"
                        placeholder="Mod filter (e.g. EZDT)..."
                        value={modFilter}
                        onChange={(e) => setModFilter(e.target.value)}
                        disabled={loading}
                    />
                    <br />
                    <input
                        type="submit"
                        className="submit-search"
                        value={loading ? "Loading..." : "Sample"}
                        disabled={loading || !beatmapInput.trim()}
                    />
                </form>
            </div>

            {error && <h3 className="error-message">Error: {error}.</h3>}

            {response && (
                <>
                    <h3 className="subtitle" style={{ marginTop: "16px" }}>
                        {response.beatmapTitle}
                    </h3>
                    <ScoreMultiplierTable scores={response.scores} />
                </>
            )}

            {!response && !loading && !error && (
                <h2 className="subtitle">Enter a beatmap above to begin.</h2>
            )}
        </motion.div>
    );
}
