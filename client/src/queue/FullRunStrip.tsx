import type { FullRunView } from "app-structures";
import { useId } from "react";
import { useStopFullRun } from "../api/recalc";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import styles from "./FullRunStrip.module.css";
import { formatError } from "../api/http";

export interface FullRunStripProps {
    /** The variant's full run, which is running or paused. */
    run: FullRunView;

    /** Whether the person may stop the run. */
    canStop: boolean;

    /** The time the start is counted back from, in milliseconds since the epoch. */
    now: number;
}

/** Where a full run stands, with Stop for people who may stop it. */
export function FullRunStrip({ run, canStop, now }: FullRunStripProps) {
    const headingId = useId();
    const stopping = useStopFullRun();

    return (
        <section aria-labelledby={headingId} className={styles.strip}>
            <div className={styles.header}>
                <h2 id={headingId} className={styles.heading}>
                    Recalculating all players
                </h2>
                {canStop && (
                    <Button
                        variant="secondary"
                        size="small"
                        disabled={stopping.isPending}
                        onClick={() => stopping.mutate(run.variant)}
                    >
                        Stop
                    </Button>
                )}
            </div>
            <div className={styles.bar}>
                <ProgressBar value={run.done} max={run.total} label="Players recalculated" />
            </div>
            <p className={styles.details}>
                <span>
                    {run.done.toLocaleString("en")} of {run.total.toLocaleString("en")} players done
                </span>
                {run.failed > 0 && (
                    <span>{run.failed.toLocaleString("en")} failed in this run</span>
                )}
                <span>
                    Started by {run.startedByUsername}{" "}
                    {formatRelativeTime(new Date(run.startedAt).toISOString(), now)}
                </span>
            </p>
            {run.status === "paused" && (
                <p className={styles.paused}>
                    Paused while this variant is unavailable. It continues when the variant is back.
                </p>
            )}
            {stopping.error && (
                <p role="alert" className={styles.error}>
                    {formatError(stopping.error)}
                </p>
            )}
        </section>
    );
}
