import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router";
import styles from "./Tabs.module.css";

export interface Tab {
    id: string;
    label: string;
    icon?: ReactNode;
    to: string;
}

export interface TabsProps {
    tabs: Tab[];
    activeId: string;

    /** Names the row for assistive technology, such as "Variant pages". */
    "aria-label"?: string;
}

/**
 * Route-backed tabs: each is a link, and the row scrolls sideways when it does not fit, to
 * the active tab when it changes.
 */
export function Tabs({ tabs, activeId, "aria-label": label }: TabsProps) {
    const rowRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const active = rowRef.current?.querySelector<HTMLElement>("[aria-current=page]");

        // jsdom has no scrollIntoView.
        if (typeof active?.scrollIntoView === "function") {
            active.scrollIntoView({ inline: "nearest", block: "nearest" });
        }
    }, [activeId]);

    return (
        <nav ref={rowRef} className={styles.tabs} aria-label={label}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeId;

                return (
                    <Link
                        key={tab.id}
                        to={tab.to}
                        className={isActive ? `${styles.tab} ${styles.active}` : styles.tab}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
