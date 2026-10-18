import { useId, type SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
    /** Visible label. Without one, pass `aria-label` so the control still has a name. */
    label?: string;
}

/** A native `<select>`, so mobile browsers keep their own picker. Pass `<option>`s as children. */
export function Select({ label, className, ...props }: SelectProps) {
    const id = useId();

    return (
        <div className={className ? `${styles.field} ${className}` : styles.field}>
            {label && (
                <label htmlFor={id} className={styles.label}>
                    {label}
                </label>
            )}
            <select {...props} id={id} className={styles.select} />
        </div>
    );
}
