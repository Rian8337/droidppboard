import type { PPVariant, RecalcEntryView } from "app-structures";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Pill } from "../components/Pill";
import { getProfilePath } from "../routing/paths";
import { EntryStatus } from "./EntryStatus";
import styles from "./EntryRows.module.css";
import { formatAge, getVariantLabel } from "./queueFormatting";

export interface EntryRowsProps {
    entries: readonly RecalcEntryView[];

    /** The variants to name an entry's variant from, when `showVariant` is set. */
    variants: readonly PPVariant[];

    /** Whether to tag each entry with its variant, as in the global queue. */
    showVariant: boolean;

    /** The time the entries' ages are counted to, in milliseconds since the epoch. */
    now: number;

    /** Whether the age is when the entry finished rather than when it was queued. */
    isFinished: boolean;

    /** Whether each entry shows its number in the list, as in the queue. */
    isNumbered?: boolean;

    /** An action for an entry, such as Remove, or nothing. */
    renderAction?: (entry: RecalcEntryView) => ReactNode;
}

/** The queue for a phone: one stacked row per entry. */
export function EntryRows({
    entries,
    variants,
    showVariant,
    now,
    isFinished,
    isNumbered = false,
    renderAction,
}: EntryRowsProps) {
    return (
        <ul className={styles.rows}>
            {entries.map((entry, index) => (
                <li key={entry.id} className={styles.row}>
                    <span className={styles.player}>
                        {isNumbered && <span className={styles.position}>#{index + 1}</span>}
                        {entry.username}
                    </span>
                    {showVariant && <Pill>{getVariantLabel(variants, entry.variant)}</Pill>}
                    <span className={styles.status}>
                        <EntryStatus entry={entry} hasProfileLink={false} />
                    </span>
                    <span className={styles.sub}>
                        <span>
                            by {entry.queuedByUsername} · {isFinished ? "finished " : ""}
                            {formatAge(
                                isFinished ? (entry.finishedAt ?? entry.queuedAt) : entry.queuedAt,
                                now,
                            )}
                        </span>
                        {entry.status === "done" && (
                            <Link
                                to={getProfilePath(entry.variant, entry.uid)}
                                className={styles.profile}
                            >
                                Profile
                            </Link>
                        )}
                    </span>
                    {renderAction?.(entry)}
                </li>
            ))}
        </ul>
    );
}
