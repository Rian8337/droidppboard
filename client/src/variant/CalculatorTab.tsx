import type { PPVariant } from "app-structures";
import { useLocation } from "react-router";
import { CalculatorView } from "../calculator/CalculatorView";
import type { CalculatorFormValues } from "../calculator/calculatorForm";

/** The navigation state that fills the calculator's form, such as from a snapshot's Load data from result. */
export interface CalculatorLocationState {
    calculatorValues?: CalculatorFormValues;
}

function getCalculatorValues(state: unknown): CalculatorFormValues | undefined {
    return typeof state === "object" && state !== null && "calculatorValues" in state
        ? (state as CalculatorLocationState).calculatorValues
        : undefined;
}

/** The variant's Calculator tab: the calculator, comparing the variant with live. */
export function CalculatorTab({ variant }: { variant: PPVariant }) {
    const { state } = useLocation() as { state: unknown };

    // A key per variant starts the form and the result over when the variant changes.
    return (
        <CalculatorView
            key={variant.name}
            scope="variant"
            variant={variant.name}
            initialValues={getCalculatorValues(state)}
        />
    );
}
