import { FullRunStatus, FullRunView } from "app-structures";
import { useState } from "react";
import {
    formatAge,
    getRecalcErrorMessage,
    recalcRequest,
} from "../../utils/recalcApi";

const statusText: Record<FullRunStatus, string> = {
    running: "Full run in progress",
    paused: "Full run paused (variant unavailable)",
    stopped: "Full run stopped",
    finished: "Full run finished",
};

function FullRunLine(props: {
    run: FullRunView;
    label: string | null;
    now: number;
}) {
    const { run } = props;

    return (
        <>
            <p>
                {props.label ? (
                    <span className="recalc-tag">{props.label}</span>
                ) : null}
                {statusText[run.status]}: {run.done} of {run.total} players
                {run.failed > 0 ? `, ${run.failed} failed` : ""}. Started by{" "}
                {run.startedByUsername} {formatAge(run.startedAt, props.now)}.
            </p>
            <span className="recalc-bar">
                <span
                    className="recalc-bar-fill"
                    style={{
                        width: `${
                            run.total > 0
                                ? Math.min(100, (run.done / run.total) * 100)
                                : 0
                        }%`,
                    }}
                />
            </span>
        </>
    );
}

export default function RecalcFullRunPanel(props: {
    /**
     * The full runs of every variant the viewer can see.
     */
    runs: readonly FullRunView[];

    /**
     * The selected variant, or `null` for the global queue, which lists every run.
     */
    variant: string | null;

    /**
     * Whether the viewer may start and control full runs.
     */
    canManage: boolean;

    /**
     * Gives the name to show for a variant.
     */
    variantLabel(name: string): string;

    /**
     * Called after a full run was started or stopped, or the server refused to.
     */
    onChanged(): void;
}) {
    const [busyVariant, setBusyVariant] = useState<string | undefined>();
    const [error, setError] = useState<string | undefined>();
    const now = Date.now();

    // The view lists the runs of every visible variant even when one is selected.
    const runs = props.runs.filter(
        (run) => props.variant === null || run.variant === props.variant
    );

    // A selected variant gets controls even without a run, as that is how a run starts.
    const controlled: { variant: string; run: FullRunView | undefined }[] =
        props.variant === null
            ? runs.map((run) => ({ variant: run.variant, run }))
            : [
                  {
                      variant: props.variant,
                      run: runs.find((run) => run.variant === props.variant),
                  },
              ];

    async function act(
        variant: string,
        action: "start" | "stop",
        restart = false
    ) {
        setBusyVariant(variant);
        setError(undefined);

        const result = await recalcRequest(
            "POST",
            `/full-runs/${encodeURIComponent(variant)}/${action}`,
            action === "start" ? { restart } : undefined
        );

        if (!result.ok) {
            setError(getRecalcErrorMessage(result));
        }

        props.onChanged();
        setBusyVariant(undefined);
    }

    function startOver(variant: string) {
        const label = props.variantLabel(variant);

        if (
            window.confirm(
                `Start over resets every ${label} profile to unscanned and recalculates all of them again. Continue?`
            )
        ) {
            act(variant, "start", true);
        }
    }

    if (controlled.every(({ run }) => !run) && !props.canManage) {
        return null;
    }

    return (
        <section className="recalc-panel">
            <h3>Full run</h3>
            {error ? (
                <p role="alert" className="recalc-error">
                    {error}
                </p>
            ) : null}
            {controlled.map(({ variant, run }) => {
                const isActive =
                    run?.status === "running" || run?.status === "paused";

                return (
                    <div key={variant} className="recalc-fullrun">
                        {run ? (
                            <FullRunLine
                                run={run}
                                label={
                                    props.variant === null
                                        ? props.variantLabel(variant)
                                        : null
                                }
                                now={now}
                            />
                        ) : (
                            <p className="recalc-hint">No full run is going.</p>
                        )}
                        {props.canManage ? (
                            <div className="recalc-inline">
                                {isActive ? (
                                    <button
                                        type="button"
                                        className="recalc-button"
                                        disabled={busyVariant === variant}
                                        onClick={() => act(variant, "stop")}
                                    >
                                        Stop
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="recalc-button"
                                            disabled={busyVariant === variant}
                                            onClick={() =>
                                                act(variant, "start")
                                            }
                                        >
                                            Start
                                        </button>
                                        <button
                                            type="button"
                                            className="recalc-button recalc-danger"
                                            disabled={busyVariant === variant}
                                            onClick={() => startOver(variant)}
                                        >
                                            Start over
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </section>
    );
}
