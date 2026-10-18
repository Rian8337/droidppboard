import type { PPVariant } from "app-structures";
import { useLocation } from "react-router";
import { useSessionKey } from "../hooks/useSessionKey";
import { CalculatorView } from "../calculator/CalculatorView";
import { getCalculatorValues } from "../calculator/calculatorLocationState";
import { GenerateLinkButton } from "../calculator/GenerateLinkButton";
import { MyScoreForm } from "../calculator/MyScoreForm";
import { getVariantTitle } from "./getVariantTitle";

/** The variant's Calculator tab: the calculator, comparing the variant with live. */
export function CalculatorTab({ variant }: { variant: PPVariant }) {
    const { state } = useLocation() as { state: unknown };
    const sessionKey = useSessionKey();

    // A key per variant and person starts the form and the result over when either changes, so a
    // result is not kept from one person to the next after a logout and login.
    return (
        <CalculatorView
            key={`${variant.name}:${sessionKey}`}
            scope="variant"
            variant={variant.name}
            getVariantTitle={() => getVariantTitle(variant)}
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
