import type { PPVariant } from "app-structures";
import { useLocation } from "react-router";
import { CalculatorView } from "../calculator/CalculatorView";
import { getCalculatorValues } from "../calculator/calculatorLocationState";
import { GenerateLinkButton } from "../calculator/GenerateLinkButton";
import { MyScoreForm } from "../calculator/MyScoreForm";

/** The variant's Calculator tab: the calculator, comparing the variant with live. */
export function CalculatorTab({ variant }: { variant: PPVariant }) {
    const { state } = useLocation() as { state: unknown };

    // A key per variant starts the form and the result over when the variant changes.
    return (
        <CalculatorView
            key={variant.name}
            scope="variant"
            variant={variant.name}
            getVariantTitle={() => variant.title ?? variant.name}
            initialValues={getCalculatorValues(state)}
            renderGenerateLink={(response, submitted) => (
                <GenerateLinkButton response={response} submitted={submitted} />
            )}
            renderMyScore={(showResult) => (
                <MyScoreForm scope="variant" variant={variant.name} showResult={showResult} />
            )}
        />
    );
}
