import { useState, type FormEvent } from "react";
import type { CalculationResponse, CalculationScope } from "app-structures";
import { useMe } from "../api/auth";
import { useMyScoreCalculation } from "../api/calculator";
import { formatApiError } from "../api/http";
import { Button } from "../components/Button";
import { ErrorMessage } from "../components/ErrorMessage";
import { TextField } from "../components/TextField";
import { emptyFormValues, type CalculatorFormValues } from "./calculatorForm";
import { isDroidVariant } from "./toolVariants";
import styles from "./MyScoreForm.module.css";

export interface MyScoreFormProps {
    scope: CalculationScope;
    variant: string;

    /** Shows the result in the calculator's result panel. */
    showResult: (response: CalculationResponse, values: CalculatorFormValues) => void;
}

const missingBeatmapMessage = "Please enter a valid beatmap link or ID";

/**
 * "Calculate my score on this beatmap": the logged-in person's own score on a beatmap, on an
 * osu!droid variant. It shows nothing to anyone else, as scores are osu!droid scores.
 */
export function MyScoreForm({ scope, variant, showResult }: MyScoreFormProps) {
    const { data: me = null } = useMe();
    const calculation = useMyScoreCalculation();
    const [beatmap, setBeatmap] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    if (me === null || !isDroidVariant(variant)) {
        return null;
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        const trimmedBeatmap = beatmap.trim();

        if (trimmedBeatmap === "") {
            setFormError(missingBeatmapMessage);

            return;
        }

        setFormError(null);
        calculation.mutate(
            { scope, variant, beatmap: trimmedBeatmap },
            {
                onSuccess: (response) =>
                    showResult(response, { ...emptyFormValues, beatmap: trimmedBeatmap }),
            },
        );
    }

    const error = formError ?? (calculation.error ? formatApiError(calculation.error) : null);

    return (
        <form className={styles.form} onSubmit={submit}>
            <h2 className={styles.title}>Calculate my score on this beatmap</h2>
            <TextField
                label="Beatmap for my score"
                placeholder="https://osu.ppy.sh/beatmapsets/…#osu/1234 or 1234"
                value={beatmap}
                onChange={(event) => setBeatmap(event.target.value)}
            />
            <div className={styles.actions}>
                <Button type="submit" disabled={calculation.isPending}>
                    {calculation.isPending ? "Calculating…" : "Calculate my score"}
                </Button>
            </div>
            {error !== null && <ErrorMessage message={error} />}
        </form>
    );
}
