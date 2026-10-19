import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
    /** The question, such as "Remove access for Alpha?". */
    title: string;

    /** What happens when the person confirms. */
    message: ReactNode;

    /** The label of the button that confirms, such as "Remove". */
    confirmLabel: string;

    isOpen: boolean;

    /** Whether the confirmed action is running, which disables the button that confirms. */
    isPending?: boolean;

    onConfirm: () => void;
    onClose: () => void;
}

/** Asks the person to confirm a destructive action before it runs. */
export function ConfirmDialog({
    title,
    message,
    confirmLabel,
    isOpen,
    isPending = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    return (
        <Dialog title={title} isOpen={isOpen} onClose={onClose}>
            <p className={styles.message}>{message}</p>
            <div className={styles.actions}>
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="danger" disabled={isPending} onClick={onConfirm}>
                    {confirmLabel}
                </Button>
            </div>
        </Dialog>
    );
}
