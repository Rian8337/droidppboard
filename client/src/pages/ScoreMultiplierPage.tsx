import type { SerializedMod } from "@rian8337/osu-base";
import { useState, type FormEvent } from "react";
import { formatError } from "../api/http";
import { useScoreMultiplierSample, type ScoreMultiplierRequest } from "../api/scoreMultiplier";
import { Button } from "../components/Button";
import { ErrorMessage } from "../components/ErrorMessage";
import { TextField } from "../components/TextField";
import { getSelectedAcronyms } from "../mods/droidMods";
import { ModPicker } from "../mods/ModPicker";
import { MultiplierChangesTable } from "../scoreMultiplier/MultiplierChangesTable";
import { ScoreMultiplierTable } from "../scoreMultiplier/ScoreMultiplierTable";
import pageStyles from "./Page.module.css";
import styles from "./ScoreMultiplierPage.module.css";

/**
 * Compares top scores on a beatmap under the previous and the new score multipliers, to help
 * rebalancing them.
 */
export function ScoreMultiplierPage() {
    const [beatmapInput, setBeatmapInput] = useState("");
    const [mods, setMods] = useState<readonly SerializedMod[]>([]);
    const [request, setRequest] = useState<ScoreMultiplierRequest | null>(null);
    const { data: sample, error, isFetching, refetch } = useScoreMultiplierSample(request);
    const beatmapId = beatmapInput.trim();

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (beatmapId !== "") {
            setRequest({ beatmapId, modAcronyms: getSelectedAcronyms(mods) });
        }
    }

    function renderResult() {
        if (error) {
            return <ErrorMessage message={formatError(error)} onRetry={() => void refetch()} />;
        }

        if (sample) {
            return (
                <>
                    <h3 className={styles.heading}>{sample.beatmapTitle}</h3>
                    <ScoreMultiplierTable scores={sample.scores} />
                </>
            );
        }

        return (
            <p className={pageStyles.note}>
                {request === null ? "Enter a beatmap above to begin." : "Loading..."}
            </p>
        );
    }

    return (
        <div className={pageStyles.page}>
            <h2 className={pageStyles.title}>Score multiplier sample</h2>
            <p className={pageStyles.note}>
                Enter a beatmap ID or link to compare its top scores under the previous and the new
                score multipliers.
            </p>
            <MultiplierChangesTable />
            <form className={styles.form} onSubmit={handleSubmit}>
                <TextField
                    className={styles.field}
                    label="Beatmap ID or link"
                    placeholder="Beatmap ID or link"
                    value={beatmapInput}
                    onChange={(event) => setBeatmapInput(event.target.value)}
                />
                <ModPicker mods={mods} onChange={setMods} hasSettings={false} />
                <Button type="submit" disabled={beatmapId === "" || isFetching}>
                    {isFetching ? "Loading..." : "Sample"}
                </Button>
            </form>
            {renderResult()}
        </div>
    );
}
