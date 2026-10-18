import type { ReactNode } from "react";
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
}

/** Route-backed tabs: each is a link, and the row scrolls sideways when it does not fit. */
export function Tabs({ tabs, activeId }: TabsProps) {
    return (
        <nav className={styles.tabs}>
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
