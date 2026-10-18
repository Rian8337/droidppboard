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

/** What My score is calculated for: the scope and variant, and the beatmap link or ID. */
export interface MyScoreRequest {
    scope: CalculationScope;
    variant: string;
    beatmap: string;
}

/**
 * Calculates the logged-in person's own score on a beatmap, on an osu!droid variant. A `404` says
 * they have no score on it.
 */
export function useMyScoreCalculation(): UseMutationResult<
    CalculationResponse,
    ApiError,
    MyScoreRequest
> {
    return useMutation({
        mutationFn: ({ scope, variant, beatmap }: MyScoreRequest) => {
            const form = new FormData();

            form.set("scope", scope);
            form.set("variant", variant);
            form.set("beatmap", beatmap.trim());

            return requestJson<CalculationResponse>(
                "POST",
                "/api/ppboard/calculate/my-score",
                form,
            );
        },
    });
}
