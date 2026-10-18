import type { RecalcEntryView, RecalcQueueView } from "app-structures";
import { useId } from "react";
import type { Me } from "../api/auth";
import type { ApiError } from "../api/http";
import { useRemoveQueueEntry } from "../api/recalc";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { Pill } from "../components/Pill";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { EntryRows } from "./EntryRows";
import { EntryStatus } from "./EntryStatus";
import { formatAge, formatEstimatedWait, getEntryCounts, getVariantLabel } from "./queueFormatting";
import styles from "./QueueSection.module.css";
import { formatError } from "../api/http";

export interface QueueListProps {
    /** The queue to list: the variant's, or the global one when `showAll` is set. Not loaded yet if absent. */
    view: RecalcQueueView | undefined;
    error: ApiError | null;
    onRetry: () => void;

    /** Whether the global queue is shown instead of the variant's. */
    showAll: boolean;
    onShowAllChange: (showAll: boolean) => void;

    /** The estimated wait of the variant's queue, in seconds, or `null` if unknown. */
    estimatedWaitSeconds: number | null;

    /** The person who is logged in, who may remove their own waiting entries. */
    me: Me | null;

    /** The time the ages are counted to, in milliseconds since the epoch. */
    now: number;
}

/** Whether the person may remove the entry: it must still wait, and be theirs or they manage. */
function canRemoveEntry(entry: RecalcEntryView, me: Me | null, canManage: boolean): boolean {
    return entry.status === "waiting" && me !== null && (canManage || entry.queuedByUid === me.uid);
}

/** The queue: entries that are being calculated, then those that wait, never finished ones. */
export function QueueList({
    view,
    error,
    onRetry,
    showAll,
    onShowAllChange,
    estimatedWaitSeconds,
    me,
    now,
}: QueueListProps) {
    const headingId = useId();
    const breakpoint = useBreakpoint();
    const removal = useRemoveQueueEntry();
    const entries = (view?.queue ?? []).filter(
        (entry) => entry.status === "calculating" || entry.status === "waiting",
    );
    const { running, waiting } = getEntryCounts(entries);
    const variants = view?.variants ?? [];

    function renderRemove(entry: RecalcEntryView) {
        if (!canRemoveEntry(entry, me, view?.canManageFullRuns ?? false)) {
            return null;
        }

        return (
            <Button
                variant="secondary"
                size="small"
                aria-label={`Remove ${entry.username}`}
                disabled={removal.isPending && removal.variables === entry.id}
                onClick={() => removal.mutate(entry.id)}
            >
                Remove
            </Button>
        );
    }

    const columns: Column<RecalcEntryView>[] = [
        // Numbered in list order: an entry that is being calculated has no waiting position.
        { id: "position", header: "#", render: (entry) => entries.indexOf(entry) + 1 },
        {
            id: "player",
            header: "Player",
            render: (entry) => (
                <>
                    {showAll && (
                        <span className={styles.tag}>
                            <Pill>{getVariantLabel(variants, entry.variant)}</Pill>
                        </span>
                    )}
                    {entry.username}
                </>
            ),
        },
        { id: "queued", header: "Queued", render: (entry) => formatAge(entry.queuedAt, now) },
        { id: "queuedBy", header: "Queued by", render: (entry) => entry.queuedByUsername },
        { id: "status", header: "Status", render: (entry) => <EntryStatus entry={entry} /> },
        { id: "actions", header: "", render: renderRemove },
    ];

    function renderBody() {
        if (error && !view) {
            return (
                <div className={styles.error}>
                    <ErrorMessage message={formatError(error)} onRetry={onRetry} />
                </div>
            );
        }

        if (!view) {
            return <p className={styles.note}>Loading...</p>;
        }

        if (entries.length === 0) {
            return <EmptyState message="The queue is empty." />;
        }

        if (breakpoint === "phone") {
            return (
                <EntryRows
                    entries={entries}
                    variants={variants}
                    showVariant={showAll}
                    now={now}
                    isFinished={false}
                    isNumbered
                    renderAction={renderRemove}
                />
            );
        }

        return (
            <DataTable
                columns={columns}
                rows={entries}
                rowKey={(entry) => entry.id}
                emptyText="The queue is empty."
            />
        );
    }

    return (
        <section aria-labelledby={headingId} className={styles.section}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <h2 id={headingId} className={styles.heading}>
                        Queue
                    </h2>
                    <span className={styles.count}>
                        {running} running, {waiting} waiting
                        {!showAll &&
                            ` · Estimated wait: ${formatEstimatedWait(estimatedWaitSeconds)}`}
                    </span>
                </div>
                <Checkbox
                    checked={showAll}
                    onChange={(event) => onShowAllChange(event.target.checked)}
                >
                    Show all reworks
                </Checkbox>
            </div>
            {removal.error && (
                <div className={styles.error}>
                    <ErrorMessage message={formatError(removal.error)} />
                </div>
            )}
            {renderBody()}
        </section>
    );
}
