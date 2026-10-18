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
import { getVariantTitle } from "../variant/getVariantTitle";
import { canLoadFromResult, getFormValuesFromResult } from "./calculatorForm";
import { ResultPanel } from "./ResultPanel";
import { getToolVariantLabel } from "./toolVariants";
import styles from "./SnapshotPage.module.css";
import { formatError } from "../api/http";

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
        return getToolVariantLabel(response.variant);
    }

    const variant = variants?.find((candidate) => candidate.name === response.variant);

    return variant ? getVariantTitle(variant) : response.variant;
}

/**
 * A snapshot of a calculation, opened by its link: the result as read-only text, when it was
 * taken and on which variant. An unknown snapshot and one the person may not see look the same.
 */
export function SnapshotPage({ scope }: SnapshotPageProps) {
    const { variant: variantParameter = defaultVariant, id = "" } = useParams();
    const { data: snapshot, error, isPending, refetch } = useSnapshot(id);
    const { data: variants } = useVariants({ isEnabled: scope === "variant" });
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
        return <ErrorMessage message={formatError(error)} onRetry={() => void refetch()} />;
    }

    if (isPending) {
        return <p className={styles.note}>Loading...</p>;
    }

    const { calculation, createdAt, expiresAt } = snapshot;
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
            <h2 className={styles.taken}>
                {`Snapshot taken ${formatUtcTime(createdAt)} on ${title}`}
            </h2>
            <p className={styles.expiry}>Expires {formatUtcTime(expiresAt)}</p>
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
