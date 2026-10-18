import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import type { CalculationResponse, CalculationScope } from "app-structures";
import { buildCalculationFormData, type CalculatorFormValues } from "../calculator/calculatorForm";
import { requestJson, type ApiError } from "./http";

/**
 * Calculates a score on a variant (scope `variant`) or on one of the Beatmap calculator's variants
 * (scope `tool`). Mutate with the form's values.
 */
export function useCalculation(
    scope: CalculationScope,
    variant: string,
): UseMutationResult<CalculationResponse, ApiError, CalculatorFormValues> {
    return useMutation({
        mutationFn: (values: CalculatorFormValues) =>
            requestJson<CalculationResponse>(
                "POST",
                "/api/ppboard/calculate",
                buildCalculationFormData(scope, variant, values),
            ),
    });
}
