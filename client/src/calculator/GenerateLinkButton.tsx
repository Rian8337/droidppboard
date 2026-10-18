import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CalculationResponse } from "app-structures";
import { Link } from "react-router";
import { useMe } from "../api/auth";
import { formatApiError } from "../api/http";
import { useCreateSnapshot } from "../api/snapshots";
import { Button } from "../components/Button";
import { CopyButton } from "../components/CopyButton";
import { ErrorMessage } from "../components/ErrorMessage";
import { getSnapshotPath } from "../routing/paths";
import { formatUtcTime } from "../utils/formatUtcTime";
import type { SubmittedCalculation } from "./calculatorForm";
import styles from "./GenerateLinkButton.module.css";

export interface GenerateLinkButtonProps {
    /** The result that is on show. */
    response: CalculationResponse;

    /** What the result was calculated from, which the snapshot is made from again. */
    submitted: SubmittedCalculation;
}

/**
 * Makes a link to a snapshot of the result and shows it with when it expires. Only a logged-in
 * person can make one, so it shows nothing to anyone else.
 */
export function GenerateLinkButton({ response, submitted }: GenerateLinkButtonProps) {
    const { data: me = null } = useMe();
    const creation = useCreateSnapshot();

    if (me === null) {
        return null;
    }

    const snapshot = creation.data;
    const path = snapshot ? getSnapshotPath(response.scope, response.variant, snapshot.id) : null;

    return (
        <>
            <Button
                variant="secondary"
                disabled={creation.isPending}
                onClick={() =>
                    creation.mutate({ scope: response.scope, variant: response.variant, submitted })
                }
            >
                <FontAwesomeIcon icon={faLink} />
                {creation.isPending ? "Generating…" : "Generate link"}
            </Button>
            {snapshot && path !== null && (
                <div className={styles.link}>
                    <Link to={path} className={styles.url}>
                        {window.location.origin + path}
                    </Link>
                    <CopyButton text={window.location.origin + path} />
                    <span className={styles.expiry}>
                        Expires {formatUtcTime(snapshot.expiresAt)}
                    </span>
                </div>
            )}
            {creation.error && (
                <div className={styles.error}>
                    <ErrorMessage message={formatApiError(creation.error)} />
                </div>
            )}
        </>
    );
}
