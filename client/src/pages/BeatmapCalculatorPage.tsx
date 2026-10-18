import { useState } from "react";
import { useLocation } from "react-router";
import { CalculatorView } from "../calculator/CalculatorView";
import {
    getCalculatorToolVariant,
    getCalculatorValues,
} from "../calculator/calculatorLocationState";
import { GenerateLinkButton } from "../calculator/GenerateLinkButton";
import { MyScoreForm } from "../calculator/MyScoreForm";
import {
    defaultToolVariant,
    getToolVariantLabel,
    isToolVariantName,
    toolVariantLabels,
    toolVariantNames,
} from "../calculator/toolVariants";
import { Select } from "../components/Select";
import styles from "./BeatmapCalculatorPage.module.css";

/**
 * The Beatmap calculator tool: the calculator with a choice of four variants, osu!droid live by
 * default, for looking at a beatmap's star rating and performance rather than testing a variant.
 */
export function BeatmapCalculatorPage() {
    const { state } = useLocation() as { state: unknown };
    const [variant, setVariant] = useState(getCalculatorToolVariant(state) ?? defaultToolVariant);

    return (
        <>
            {/* The top bar names the page too; this is the page's own heading for screen readers. */}
            <h1 className={styles.title}>Beatmap calculator</h1>
            <CalculatorView
                scope="tool"
                variant={variant}
                initialValues={getCalculatorValues(state)}
                getVariantTitle={getToolVariantLabel}
                variantPicker={
                    <Select
                        label="Variant"
                        value={variant}
                        onChange={(event) => {
                            if (isToolVariantName(event.target.value)) {
                                setVariant(event.target.value);
                            }
                        }}
                    >
                        {toolVariantNames.map((name) => (
                            <option key={name} value={name}>
                                {toolVariantLabels[name]}
                            </option>
                        ))}
                    </Select>
                }
                renderGenerateLink={(response, submitted) => (
                    <GenerateLinkButton response={response} submitted={submitted} />
                )}
                renderMyScore={(showResult) => (
                    <MyScoreForm scope="tool" variant={variant} showResult={showResult} />
                )}
            />
        </>
    );
}
