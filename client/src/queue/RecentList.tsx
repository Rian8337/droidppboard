import type { RecalcEntryView, RecalcQueueView } from "app-structures";
import { useId } from "react";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { EntryRows } from "./EntryRows";
import { EntryStatus } from "./EntryStatus";
import { formatAge } from "./queueFormatting";
import styles from "./QueueSection.module.css";

export interface RecentListProps {
    /** The variant's queue view, whose finished entries are listed. */
    view: RecalcQueueView;

    /** The time the ages are counted to, in milliseconds since the epoch. */
    now: number;
}

/** The entries that finished or failed recently, newest first, apart from the queue. */
export function RecentList({ view, now }: RecentListProps) {
    const headingId = useId();
    const breakpoint = useBreakpoint();
    const entries = view.recent.filter(
        (entry) => entry.status === "done" || entry.status === "failed",
    );

    const columns: Column<RecalcEntryView>[] = [
        { id: "player", header: "Player", render: (entry) => entry.username },
        {
            id: "finished",
            header: "Finished",
            render: (entry) => formatAge(entry.finishedAt ?? entry.queuedAt, now),
        },
        { id: "queuedBy", header: "Queued by", render: (entry) => entry.queuedByUsername },
        { id: "result", header: "Result", render: (entry) => <EntryStatus entry={entry} /> },
    ];

    function renderBody() {
        if (entries.length === 0) {
            return <EmptyState message="Nothing has finished recently." />;
        }

        if (breakpoint === "phone") {
            return (
                <EntryRows
                    entries={entries}
                    variants={view.variants}
                    showVariant={false}
                    now={now}
                    isFinished
                />
            );
        }

        return (
            <DataTable
                columns={columns}
                rows={entries}
                rowKey={(entry) => entry.id}
                emptyText="Nothing has finished recently."
            />
        );
    }

    return (
        <section aria-labelledby={headingId} className={styles.section}>
            <div className={styles.header}>
                <h2 id={headingId} className={styles.heading}>
                    Recently finished
                </h2>
            </div>
            {renderBody()}
        </section>
    );
}
