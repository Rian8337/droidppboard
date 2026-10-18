import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
    message: string;
    /** Something the person can do about it, such as a button. */
    action?: ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
    return (
        <div className={styles.emptyState}>
            <p className={styles.message}>{message}</p>
            {action}
        </div>
    );
}
