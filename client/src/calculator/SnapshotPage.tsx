import type { CalculationResponse, CalculationScope, PPVariant } from "app-structures";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../api/http";
import { useSnapshot } from "../api/snapshots";
import { useVariants } from "../api/variants";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { beatmapCalculatorPath, defaultVariant, getVariantPath } from "../routing/paths";
import { formatUtcTime } from "../utils/formatUtcTime";
import { canLoadFromResult, getFormValuesFromResult } from "./calculatorForm";
import { ResultPanel } from "./ResultPanel";
import { isToolVariantName, toolVariantLabels } from "./toolVariants";
import styles from "./SnapshotPage.module.css";

export interface SnapshotPageProps {
    /** `variant` for a variant's Calculator tab, `tool` for the Beatmap calculator. */
    scope: CalculationScope;
}

function getCalculatorPath(scope: CalculationScope, variant: string): string {
    return scope === "variant" ? getVariantPath(variant, "calculator") : beatmapCalculatorPath;
}

/** The name that people know the snapshot's variant by. */
function getSnapshotTitle(
    response: CalculationResponse,
    variants: PPVariant[] | undefined,
): string {
    if (response.scope === "tool") {
        return isToolVariantName(response.variant)
            ? toolVariantLabels[response.variant]
            : response.variant;
    }

    return (
        variants?.find((candidate) => candidate.name === response.variant)?.title ??
        response.variant
    );
}

/**
 * A snapshot of a calculation, opened by its link: the result as read-only text, when it was
 * taken and on which variant. An unknown snapshot and one the person may not see look the same.
 */
export function SnapshotPage({ scope }: SnapshotPageProps) {
    const { variant: variantParameter = defaultVariant, id = "" } = useParams();
    const { data: snapshot, error, isPending, refetch } = useSnapshot(id);
    const { data: variants } = useVariants();
    const navigate = useNavigate();

    if (error instanceof ApiError && error.status === 404) {
        return <NotFoundPage message="Snapshot not found" />;
    }

    if (error instanceof ApiError && error.status === 410) {
        return (
            <EmptyState
                message="This snapshot has expired"
                action={
                    <Link to={getCalculatorPath(scope, variantParameter)}>Open the calculator</Link>
                }
            />
        );
    }

    if (error) {
        return <ErrorMessage message={error.message} onRetry={() => void refetch()} />;
    }

    if (isPending) {
        return <p className={styles.note}>Loading...</p>;
    }

    const { calculation, createdAt } = snapshot;
    const canLoad = canLoadFromResult(calculation);
    const title = getSnapshotTitle(calculation, variants);

    function loadFromResult() {
        const calculatorValues = getFormValuesFromResult(calculation);

        void navigate(getCalculatorPath(calculation.scope, calculation.variant), {
            state:
                calculation.scope === "tool"
                    ? { calculatorValues, calculatorVariant: calculation.variant }
                    : { calculatorValues },
        });
    }

    return (
        <div className={styles.page}>
            <p className={styles.taken}>
                {`Snapshot taken ${formatUtcTime(createdAt)} on ${title}`}
            </p>
            <div className={styles.actions}>
                <Button variant="secondary" onClick={loadFromResult} disabled={!canLoad}>
                    Load data from result
                </Button>
                {!canLoad && (
                    <span className={styles.hint}>Not available for uploaded beatmaps</span>
                )}
            </div>
            <ResultPanel response={calculation} title={title} />
        </div>
    );
}
