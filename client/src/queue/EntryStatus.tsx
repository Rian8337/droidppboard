import type { RecalcEntryView } from "app-structures";
import { Link } from "react-router";
import { Pill } from "../components/Pill";
import { ProgressBar } from "../components/ProgressBar";
import { getProfilePath } from "../routing/paths";
import { formatPp } from "../utils/formatPp";
import styles from "./EntryStatus.module.css";

export interface EntryStatusProps {
    entry: RecalcEntryView;
}

function formatTotals({ livePPTotal, localPPTotal }: RecalcEntryView): string {
    const format = (total: number | undefined) =>
        total === undefined ? "?" : `${formatPp(total)}pp`;

    return `${format(livePPTotal)} → ${format(localPPTotal)}`;
}

/** What became of an entry: waiting, how far it is, or how it finished. */
export function EntryStatus({ entry }: EntryStatusProps) {
    switch (entry.status) {
        case "waiting":
            return <Pill>Waiting</Pill>;
        case "calculating":
            return (
                <span className={styles.status}>
                    <Pill tone="running">Calculating</Pill>
                    {entry.progress && (
                        <>
                            <span className={styles.detail}>
                                {entry.progress.done}/{entry.progress.total} scores
                            </span>
                            <span className={styles.bar}>
                                <ProgressBar
                                    value={entry.progress.done}
                                    max={entry.progress.total}
                                    label={`${entry.username} scores calculated`}
                                />
                            </span>
                        </>
                    )}
                </span>
            );
        case "done":
            return (
                <span className={styles.status}>
                    <Pill tone="success">Done</Pill>
                    <span className={styles.detail}>{formatTotals(entry)}</span>
                    <Link to={getProfilePath(entry.variant, entry.uid)}>Profile</Link>
                </span>
            );
        case "failed":
            return (
                <span className={styles.status}>
                    <Pill tone="failure">Failed</Pill>
                    <span className={styles.detail}>{entry.failureReason ?? "Unknown reason"}</span>
                </span>
            );
    }
}
