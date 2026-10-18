import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Menu.module.css";

export interface MenuItem {
    label: string;
    icon?: ReactNode;
    tone?: "danger";
    onSelect: () => void;
}

export interface MenuProps {
    trigger: ReactNode;
    items: MenuItem[];
}

/** A popup list of actions that opens on click or tap and closes on an outside press, Escape or a choice. */
export function Menu({ trigger, items }: MenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function closeOnOutsidePress(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", closeOnOutsidePress);

        return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
    }, [isOpen]);

    function moveFocus(step: number) {
        const buttons = Array.from(
            listRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [],
        );

        if (buttons.length === 0) {
            return;
        }

        const current = buttons.indexOf(document.activeElement as HTMLElement);
        const next =
            current === -1
                ? step > 0
                    ? 0
                    : buttons.length - 1
                : (current + step + buttons.length) % buttons.length;

        buttons[next].focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (!isOpen) {
            return;
        }

        switch (event.key) {
            case "Escape":
                setIsOpen(false);
                triggerRef.current?.focus();
                break;
            case "ArrowDown":
                event.preventDefault();
                moveFocus(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                moveFocus(-1);
                break;
        }
    }

    return (
        <div ref={rootRef} className={styles.menu} onKeyDown={handleKeyDown}>
            <button
                ref={triggerRef}
                type="button"
                className={styles.trigger}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? listId : undefined}
                onClick={() => setIsOpen((wasOpen) => !wasOpen)}
            >
                {trigger}
            </button>
            {isOpen && (
                <div ref={listRef} id={listId} role="menu" className={styles.list}>
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            className={
                                item.tone === "danger"
                                    ? `${styles.item} ${styles.danger}`
                                    : styles.item
                            }
                            onClick={() => {
                                setIsOpen(false);
                                item.onSelect();
                            }}
                        >
                            {item.icon && <span aria-hidden="true">{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
