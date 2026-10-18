import { useId, useState } from "react";
import { useRecalcQueue, useStartFullRun } from "../api/recalc";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { ErrorMessage } from "../components/ErrorMessage";
import styles from "./FullRunControls.module.css";
import { formatError } from "../api/http";

export interface FullRunControlsProps {
    /** The name of the variant to recalculate. */
    variant: string;
}

const startDescription =
    "Recalculates every player in this rework, first adding any droid-rebalance player it is missing. If you stop and start again, players already done are skipped.";
const restartDescription =
    "Clears the progress of the previous run, so every player is recalculated again.";

/**
 * Starts a variant's full run from where the last one stopped, or from the beginning after a confirmation. Admins
 * only; the server refuses anybody else. Progress and Stop are on the Queue tab.
 */
export function FullRunControls({ variant }: FullRunControlsProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const titleId = useId();
    const queue = useRecalcQueue(variant);
    const starting = useStartFullRun();

    if (!queue.data) {
        return queue.error ? (
            <ErrorMessage message={formatError(queue.error)} onRetry={() => void queue.refetch()} />
        ) : (
            <p className={styles.note}>Loading...</p>
        );
    }

    const run = queue.data.fullRuns.find((candidate) => candidate.variant === variant);
    const isGoing = run?.status === "running" || run?.status === "paused";
    // The queue only knows the runs of this server process. The server keeps which players are done on disk, so a
    // plain Start also continues after a restart; only the label can't say so without a run to show.
    const hasProgress = run !== undefined && !isGoing && run.done > 0;

    function start(restart: boolean) {
        starting.mutate({ variant, restart }, { onSettled: () => setIsConfirming(false) });
    }

    return (
        <section className={styles.controls} aria-labelledby={titleId}>
            <h2 id={titleId} className={styles.title}>
                Recalculate all players
            </h2>
            <p className={styles.description}>{startDescription}</p>
            {hasProgress && (
                <p className={styles.progress}>
                    {run.done.toLocaleString("en")} of {run.total.toLocaleString("en")} players done
                    in the previous run.
                </p>
            )}
            {isGoing && (
                <p className={styles.progress}>A run is going. Follow it on the Queue tab.</p>
            )}
            <div className={styles.actions}>
                <Button disabled={isGoing || starting.isPending} onClick={() => start(false)}>
                    {hasProgress ? "Continue" : "Start"}
                </Button>
            </div>
            <p className={styles.description}>{restartDescription}</p>
            <div className={styles.actions}>
                <Button
                    variant="secondary"
                    disabled={isGoing || starting.isPending}
                    onClick={() => setIsConfirming(true)}
                >
                    Restart from the beginning
                </Button>
            </div>
            {starting.error && (
                <p role="alert" className={styles.error}>
                    {formatError(starting.error)}
                </p>
            )}
            <Dialog
                title="Restart from the beginning?"
                isOpen={isConfirming}
                onClose={() => setIsConfirming(false)}
            >
                <p className={styles.description}>{restartDescription}</p>
                <div className={styles.confirmActions}>
                    <Button variant="ghost" onClick={() => setIsConfirming(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        disabled={starting.isPending}
                        onClick={() => start(true)}
                    >
                        Restart
                    </Button>
                </div>
            </Dialog>
        </section>
    );
}
