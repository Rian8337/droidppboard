import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./IconButton";
import styles from "./Dialog.module.css";

export interface DialogProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    /** Makes the dialog wider, for content that needs room such as a form with a preview. */
    isWide?: boolean;
    children: ReactNode;
}

/**
 * A modal built on the native `<dialog>`: the browser traps focus, makes the page behind it inert and turns Escape
 * into a `cancel` event. The parent owns `isOpen`; every way of closing calls `onClose`.
 */
export function Dialog({ title, isOpen, onClose, isWide = false, children }: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (isOpen && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    return (
        <dialog
            ref={dialogRef}
            className={isWide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
            aria-labelledby={titleId}
            onCancel={(event) => {
                // Let the parent decide: it closes by flipping `isOpen`, which closes the element.
                event.preventDefault();
                onClose();
            }}
        >
            {isOpen && (
                <>
                    <header className={styles.header}>
                        <h2 id={titleId} className={styles.title}>
                            {title}
                        </h2>
                        <IconButton icon={faXmark} label="Close" onClick={onClose} />
                    </header>
                    <div className={styles.body}>{children}</div>
                </>
            )}
        </dialog>
    );
}
