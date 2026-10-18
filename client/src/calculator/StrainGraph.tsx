import styles from "./StrainGraph.module.css";

export interface StrainGraphProps {
    /** The chart as a base64-encoded PNG. */
    chart: string | null;
}

/** The strain graph of a calculation. Nothing shows when the calculation has none. */
export function StrainGraph({ chart }: StrainGraphProps) {
    if (chart === null) {
        return null;
    }

    return (
        <img className={styles.graph} src={`data:image/png;base64,${chart}`} alt="Strain graph" />
    );
}
