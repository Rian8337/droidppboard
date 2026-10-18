import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Checkbox.module.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    children: ReactNode;
}

/** A checkbox with its label; the whole label is the tap target. */
export function Checkbox({ children, className, ...props }: CheckboxProps) {
    return (
        <label className={className ? `${styles.checkbox} ${className}` : styles.checkbox}>
            <input {...props} type="checkbox" />
            {children}
        </label>
    );
}
