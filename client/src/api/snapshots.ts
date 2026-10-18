import {
    useMutation,
    useQuery,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query";
import type { CalculationScope, CalculationSnapshot } from "app-structures";
import { buildSnapshotFormData, type SubmittedCalculation } from "../calculator/calculatorForm";
import { requestJson, type ApiError } from "./http";
import { queryKeys } from "./queryKeys";

/** What the server answers when it stores a snapshot. */
export interface CreatedSnapshot {
    id: string;

    /** When the snapshot stops being served, as an ISO date. */
    expiresAt: string;
}

/** What a snapshot is made of: the scope and variant of the result, and what it was calculated from. */
export interface SnapshotRequest {
    scope: CalculationScope;
    variant: string;
    submitted: SubmittedCalculation;
}

/**
 * Stores a snapshot of a calculation. The server calculates it again from the form values that
 * were submitted (including an uploaded file) and stores its own answer, so a snapshot cannot hold
 * numbers that the calculator did not produce.
 */
export function useCreateSnapshot(): UseMutationResult<CreatedSnapshot, ApiError, SnapshotRequest> {
    return useMutation({
        mutationFn: ({ scope, variant, submitted }: SnapshotRequest) =>
            requestJson<CreatedSnapshot>(
                "POST",
                "/api/ppboard/snapshots",
                buildSnapshotFormData(scope, variant, submitted),
            ),
    });
}

/**
 * Loads a snapshot. A `404` means it does not exist or the person may not see it (the two look the
 * same), and a `410` means it has expired.
 */
export function useSnapshot(id: string): UseQueryResult<CalculationSnapshot, ApiError> {
    return useQuery({
        queryKey: queryKeys.snapshot(id),
        queryFn: () =>
            requestJson<CalculationSnapshot>(
                "GET",
                `/api/ppboard/snapshots/${encodeURIComponent(id)}`,
            ),
    });
}
