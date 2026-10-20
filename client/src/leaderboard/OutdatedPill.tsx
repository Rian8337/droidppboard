import { Pill } from "../components/Pill";
import styles from "./OutdatedPill.module.css";

/** Marks a player whose numbers were calculated before the variant was last updated. */
export function OutdatedPill() {
    return (
        <span className={styles.outdated} title="Calculated before this rework was last updated">
            <Pill tone="warning">Outdated</Pill>
        </span>
    );
}
