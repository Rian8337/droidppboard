import { RecalcEntryView, RecalcQueueView } from "app-structures";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
    formatAge,
    formatEstimatedWait,
    getRecalcErrorMessage,
    recalcRequest,
} from "../../utils/recalcApi";

function formatPP(value: number | undefined): string {
    return value === undefined ? "?" : `${value.toFixed(2)}pp`;
}

function EntryStatus(props: { entry: RecalcEntryView }) {
    const { entry } = props;

    switch (entry.status) {
        case "waiting":
            return <>Waiting</>;
        case "calculating": {
            const { progress } = entry;

            return progress ? (
                <>
                    <span>
                        Calculating: {progress.done}/{progress.total} scores
                    </span>
                    <span className="recalc-bar">
                        <span
                            className="recalc-bar-fill"
                            style={{
                                width: `${
                                    progress.total > 0
                                        ? Math.min(
                                              100,
                                              (progress.done / progress.total) *
                                                  100
                                          )
                                        : 0
                                }%`,
                            }}
                        />
                    </span>
                </>
            ) : (
                <>Calculating</>
            );
        }
        case "done":
            return (
                <>
                    <span>
                        Done: {formatPP(entry.livePPTotal)} {"→"}{" "}
                        {formatPP(entry.localPPTotal)}
                    </span>{" "}
                    <Link
                        to={`/prototype/profile/${
                            entry.uid
                        }/${encodeURIComponent(entry.variant)}`}
                    >
                        Profile
                    </Link>
                </>
            );
        case "failed":
            return (
                <span className="recalc-error">
                    Failed: {entry.failureReason ?? "Unknown reason"}
                </span>
            );
    }
}

function EntryRow(props: {
    entry: RecalcEntryView;
    now: number;
    viewerUid: number | undefined;
    variantLabel: string | null;
    canRemove: boolean;
    isRemoving: boolean;
    onRemove(id: string): void;
}) {
    const { entry } = props;
    const isOwn = props.viewerUid === entry.queuedByUid;
    const time = entry.finishedAt ?? entry.queuedAt;

    return (
        <tr className={isOwn ? "recalc-own" : undefined}>
            <td>{entry.position === null ? "" : `#${entry.position}`}</td>
            <td>
                {props.variantLabel ? (
                    <span className="recalc-tag">{props.variantLabel}</span>
                ) : null}
                {entry.username}
            </td>
            <td>{formatAge(time, props.now)}</td>
            <td>{entry.queuedByUsername}</td>
            <td>
                <EntryStatus entry={entry} />
            </td>
            <td>
                {props.canRemove ? (
                    <button
                        type="button"
                        className="recalc-button"
                        disabled={props.isRemoving}
                        onClick={() => props.onRemove(entry.id)}
                    >
                        Remove
                    </button>
                ) : null}
            </td>
        </tr>
    );
}

function EntryTable(props: {
    entries: readonly RecalcEntryView[];
    emptyText: string;
    timeLabel: string;
    showVariant: boolean;
    now: number;
    viewerUid: number | undefined;
    canManage: boolean;
    variantLabel(name: string): string;
    removingId: string | undefined;
    onRemove(id: string): void;
}) {
    if (props.entries.length === 0) {
        return <p className="recalc-hint">{props.emptyText}</p>;
    }

    return (
        <div className="recalc-table-wrapper">
            <table className="recalc-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>{props.timeLabel}</th>
                        <th>Queued by</th>
                        <th>Status</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {props.entries.map((entry) => (
                        <EntryRow
                            key={entry.id}
                            entry={entry}
                            now={props.now}
                            viewerUid={props.viewerUid}
                            variantLabel={
                                props.showVariant
                                    ? props.variantLabel(entry.variant)
                                    : null
                            }
                            canRemove={
                                entry.status === "waiting" &&
                                props.viewerUid !== undefined &&
                                (props.canManage ||
                                    entry.queuedByUid === props.viewerUid)
                            }
                            isRemoving={props.removingId === entry.id}
                            onRemove={props.onRemove}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function RecalcQueueList(props: {
    view: RecalcQueueView;
    showGlobal: boolean;
    onShowGlobalChange(showGlobal: boolean): void;

    /**
     * The uid of the viewer, or `undefined` for a visitor.
     */
    viewerUid: number | undefined;

    /**
     * Gives the name to show for a variant.
     */
    variantLabel(name: string): string;

    /**
     * Called after an entry was removed, or the server refused to.
     */
    onChanged(): void;
}) {
    const { view } = props;
    const [removingId, setRemovingId] = useState<string | undefined>();
    const [error, setError] = useState<string | undefined>();
    const now = Date.now();

    async function remove(id: string) {
        setRemovingId(id);
        setError(undefined);

        const result = await recalcRequest(
            "DELETE",
            `/queue/${encodeURIComponent(id)}`
        );

        if (!result.ok) {
            setError(getRecalcErrorMessage(result));
        }

        // The entry may have started calculating or been removed meanwhile, so the list is
        // refreshed either way.
        props.onChanged();
        setRemovingId(undefined);
    }

    const shared = {
        now,
        showVariant: props.showGlobal,
        viewerUid: props.viewerUid,
        canManage: view.canManageFullRuns,
        variantLabel: props.variantLabel,
        removingId,
        onRemove: remove,
    };

    return (
        <section className="recalc-panel">
            <div className="recalc-header">
                <h3>
                    {props.showGlobal ? "Global queue" : "Queue"} (
                    {view.queue.length})
                </h3>
                <label className="recalc-check">
                    <input
                        type="checkbox"
                        checked={props.showGlobal}
                        onChange={(e) =>
                            props.onShowGlobalChange(e.target.checked)
                        }
                    />
                    Show global queue
                </label>
            </div>
            <p className="recalc-hint">
                Calculators: {view.calculators}
                {props.showGlobal
                    ? ""
                    : ` · Estimated wait: ${formatEstimatedWait(
                          view.estimatedWaitSeconds
                      )}`}
            </p>

            {error ? (
                <p role="alert" className="recalc-error">
                    {error}
                </p>
            ) : null}

            <EntryTable
                {...shared}
                entries={view.queue}
                emptyText="The queue is empty."
                timeLabel="Added"
            />

            <h4>Recently finished</h4>
            <EntryTable
                {...shared}
                entries={view.recent}
                emptyText="Nothing has finished recently."
                timeLabel="Finished"
            />
        </section>
    );
}
