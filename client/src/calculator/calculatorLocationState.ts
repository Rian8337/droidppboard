import type { CalculatorFormValues } from "./calculatorForm";
import { isToolVariantName, type ToolVariantName } from "./toolVariants";

/**
 * The navigation state that fills a calculator, such as from a snapshot's Load data from result.
 * The Beatmap calculator also takes the variant to start on.
 */
export interface CalculatorLocationState {
    calculatorValues?: CalculatorFormValues;
    calculatorVariant?: string;
}

function getState(state: unknown): CalculatorLocationState {
    return typeof state === "object" && state !== null ? (state as CalculatorLocationState) : {};
}

export function getCalculatorValues(state: unknown): CalculatorFormValues | undefined {
    return getState(state).calculatorValues;
}

/** The Beatmap calculator variant the state names, if it is one the tool offers. */
export function getCalculatorToolVariant(state: unknown): ToolVariantName | undefined {
    const { calculatorVariant } = getState(state);

    return isToolVariantName(calculatorVariant) ? calculatorVariant : undefined;
}
