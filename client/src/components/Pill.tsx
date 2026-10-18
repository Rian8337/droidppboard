import type { ReactNode } from "react";
import styles from "./Pill.module.css";

export interface PillProps {
    tone?: "neutral" | "running" | "success" | "failure";
    children: ReactNode;
}

/** A small status badge. */
export function Pill({ tone = "neutral", children }: PillProps) {
    return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
}
