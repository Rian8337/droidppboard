import styles from "./ProgressBar.module.css";

export interface ProgressBarProps {
    value: number;
    max?: number;
    /** Names what is progressing, for assistive technology. */
    label: string;
}

export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
    const fraction = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            className={styles.track}
        >
            <i className={styles.fill} style={{ width: `${fraction * 100}%` }} />
        </div>
    );
}
