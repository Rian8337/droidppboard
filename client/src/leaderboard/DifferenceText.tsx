import { formatDifference } from "./difference";
import styles from "./DifferenceText.module.css";

export interface DifferenceTextProps {
    difference: number;

    /** Decimals to show. Defaults to one. */
    fractionDigits?: number;

    /** Text after the number, such as `%`. */
    suffix?: string;
}

/** A signed pp difference, green when positive and red when negative. */
export function DifferenceText({ difference, fractionDigits, suffix = "" }: DifferenceTextProps) {
    const { text, tone } = formatDifference(difference, fractionDigits);

    return (
        <span className={styles.difference} data-tone={tone}>
            {text}
            {suffix}
        </span>
    );
}
