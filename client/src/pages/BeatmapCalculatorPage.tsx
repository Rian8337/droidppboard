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
    isToolVariantName,
    toolVariantLabels,
    toolVariantNames,
} from "../calculator/toolVariants";
import { Select } from "../components/Select";

function getToolVariantTitle(variantName: string): string {
    return isToolVariantName(variantName) ? toolVariantLabels[variantName] : variantName;
}

/**
 * The Beatmap calculator tool: the calculator with a choice of four variants, osu!droid live by
 * default, for looking at a beatmap's star rating and performance rather than testing a variant.
 */
export function BeatmapCalculatorPage() {
    const { state } = useLocation() as { state: unknown };
    const [variant, setVariant] = useState(getCalculatorToolVariant(state) ?? defaultToolVariant);

    return (
        <CalculatorView
            scope="tool"
            variant={variant}
            initialValues={getCalculatorValues(state)}
            getVariantTitle={getToolVariantTitle}
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
    );
}
