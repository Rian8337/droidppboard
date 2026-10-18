import { formatDifference } from "./difference";
import styles from "./DifferenceText.module.css";

export interface DifferenceTextProps {
    difference: number;
}

/** A signed pp difference, green when positive and red when negative. */
export function DifferenceText({ difference }: DifferenceTextProps) {
    const { text, tone } = formatDifference(difference);

    return (
        <span className={styles.difference} data-tone={tone}>
            {text}
        </span>
    );
}
