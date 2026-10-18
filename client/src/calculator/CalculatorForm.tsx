import { useId, type FormEvent, type ReactNode } from "react";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { ModPicker } from "../mods/ModPicker";
import type { CalculatorFormValues, numericFieldNames } from "./calculatorForm";
import styles from "./CalculatorForm.module.css";

export interface CalculatorFormProps {
    values: CalculatorFormValues;
    onChange: (values: CalculatorFormValues) => void;
    onSubmit: () => void;
    onReset: () => void;
    onLoadFromResult: () => void;
    canLoadFromResult: boolean;
    isCalculating: boolean;

    /** Changes when the file input must be emptied, since a file input cannot be set from outside. */
    fileInputKey: number;

    /** Chooses the variant, for the Beatmap calculator tool. Shown above the beatmap. */
    variantPicker?: ReactNode;
}

type NumericFieldName = (typeof numericFieldNames)[number];

interface NumericField {
    name: NumericFieldName;
    label: string;
    placeholder?: string;
    isDecimal?: boolean;
}

const scoreFields: NumericField[] = [
    { name: "combo", label: "Max combo", placeholder: "The beatmap's max combo" },
    { name: "accuracy", label: "Accuracy (%)", placeholder: "100", isDecimal: true },
    { name: "totalScore", label: "Legacy total score" },
];

const preciseFields: NumericField[] = [
    { name: "n100", label: "100 count" },
    { name: "n50", label: "50 count" },
    { name: "nmiss", label: "Miss count" },
    { name: "sliderTicksMissed", label: "Large tick misses" },
    { name: "sliderEndsDropped", label: "Slider tail misses" },
];

/** The "Calculate an imaginary score" form. The parent owns the values and what the buttons do. */
export function CalculatorForm({
    values,
    onChange,
    onSubmit,
    onReset,
    onLoadFromResult,
    canLoadFromResult,
    isCalculating,
    fileInputKey,
    variantPicker,
}: CalculatorFormProps) {
    const fileInputId = useId();

    function renderNumericField({ name, label, placeholder, isDecimal }: NumericField) {
        return (
            <TextField
                key={name}
                label={label}
                type="number"
                min={0}
                max={isDecimal ? 100 : undefined}
                step={isDecimal ? "any" : 1}
                inputMode={isDecimal ? "decimal" : "numeric"}
                placeholder={placeholder}
                value={values[name]}
                onChange={(event) => onChange({ ...values, [name]: event.target.value })}
            />
        );
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        onSubmit();
    }

    return (
        <form className={styles.form} onSubmit={submit}>
            <h2 className={styles.title}>Calculate an imaginary score</h2>
            {variantPicker}
            <TextField
                label="Beatmap link or ID"
                placeholder="https://osu.ppy.sh/beatmapsets/…#osu/1234 or 1234"
                value={values.beatmap}
                onChange={(event) => onChange({ ...values, beatmap: event.target.value })}
            />
            <div className={styles.fileField}>
                <label htmlFor={fileInputId} className={styles.label}>
                    Beatmap file
                </label>
                <input
                    key={fileInputKey}
                    id={fileInputId}
                    className={styles.fileInput}
                    type="file"
                    accept=".osu"
                    onChange={(event) =>
                        onChange({ ...values, beatmapFile: event.target.files?.[0] ?? null })
                    }
                />
                <p className={styles.hint}>A .osu file is used instead of the link or ID.</p>
            </div>
            <div className={styles.modsField}>
                <span className={styles.label}>Mods</span>
                <ModPicker
                    mods={values.mods}
                    onChange={(mods) => onChange({ ...values, mods: [...mods] })}
                />
            </div>
            <div className={styles.grid}>{scoreFields.map(renderNumericField)}</div>
            <p className={styles.note}>
                If you include any of the fields below, the accuracy field will be ignored, but the
                result will be more precise.
            </p>
            <div className={styles.grid}>{preciseFields.map(renderNumericField)}</div>
            <div className={styles.actions}>
                <Button type="submit" disabled={isCalculating}>
                    {isCalculating ? "Calculating…" : "Calculate"}
                </Button>
                <Button variant="secondary" onClick={onReset}>
                    Reset
                </Button>
                <Button
                    variant="secondary"
                    onClick={onLoadFromResult}
                    disabled={!canLoadFromResult}
                >
                    Load data from result
                </Button>
            </div>
        </form>
    );
}
