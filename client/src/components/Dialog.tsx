import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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

/** How long a closing dialog waits for its exit animation before it closes anyway. */
const closingFallbackMs = 500;

/** Whether the browser animates, and the person has not asked for less motion. */
function canAnimate(): boolean {
    return (
        typeof window.matchMedia === "function" &&
        typeof Element.prototype.getAnimations === "function" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

/**
 * A modal built on the native `<dialog>`: the browser traps focus, makes the page behind it inert and turns Escape
 * into a `cancel` event. The parent owns `isOpen`; every way of closing calls `onClose`. It fades in, and when it
 * closes it keeps its content until it has faded out.
 */
export function Dialog({ title, isOpen, onClose, isWide = false, children }: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const [wasOpen, setWasOpen] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        setIsClosing(!isOpen && canAnimate());
    }

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }

            return;
        }

        if (isClosing) {
            // The exit animation's end closes the dialog; this does if it never ends.
            const timeout = setTimeout(() => setIsClosing(false), closingFallbackMs);

            return () => clearTimeout(timeout);
        }

        if (dialog.open) {
            dialog.close();
        }
    }, [isOpen, isClosing]);

    return (
        <dialog
            ref={dialogRef}
            className={isWide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
            aria-labelledby={titleId}
            data-closing={isClosing || undefined}
            onCancel={(event) => {
                // Let the parent decide: it closes by flipping `isOpen`, which closes the element.
                event.preventDefault();

                if (isOpen) {
                    onClose();
                }
            }}
            onAnimationEnd={(event) => {
                if (isClosing && event.target === event.currentTarget) {
                    setIsClosing(false);
                }
            }}
        >
            {(isOpen || isClosing) && (
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
