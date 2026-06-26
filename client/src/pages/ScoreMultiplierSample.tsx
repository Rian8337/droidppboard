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
    const [response, setResponse] = useState<ModMultiplierSampleResponse | null>(null);
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
        const mods = modFilter.trim();
        if (mods) {
            params.set("mods", mods);
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
                Enter a beatmap ID or URL to retrieve the top 25 scores per mod
                combination. Adjust proposed multipliers to simulate re-ranking.
            </h3>

            <div className="search-container">
                <form onSubmit={onSubmit} style={{ textAlign: "center" }}>
                    <input
                        className="search"
                        type="text"
                        placeholder="Beatmap ID or URL..."
                        value={beatmapInput}
                        onChange={(e) => setBeatmapInput(e.target.value)}
                        disabled={loading}
                        style={{ width: "calc(50% - 20px)" }}
                    />
                    <input
                        className="search"
                        type="text"
                        placeholder="Mod filter, e.g. EZ,DT (optional)"
                        value={modFilter}
                        onChange={(e) => setModFilter(e.target.value)}
                        disabled={loading}
                        style={{ width: "calc(30% - 20px)", marginLeft: "10px" }}
                    />
                    <input
                        type="submit"
                        className="submit-search"
                        value={loading ? "Loading..." : "Sample"}
                        disabled={loading || !beatmapInput.trim()}
                        style={{ width: "calc(20% - 20px)", marginLeft: "10px" }}
                    />
                </form>
            </div>

            {error && (
                <h3 className="error-message">Error: {error}.</h3>
            )}

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
