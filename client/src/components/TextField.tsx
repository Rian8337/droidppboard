import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./TextField.module.css";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
    /** Visible label. Without one, pass `aria-label` so the field still has a name. */
    label?: string;
    /** Decoration shown inside the field before the text, such as a search icon. */
    icon?: ReactNode;
}

export function TextField({ label, icon, className, ...props }: TextFieldProps) {
    const id = useId();

    return (
        <div className={className ? `${styles.field} ${className}` : styles.field}>
            {label && (
                <label htmlFor={id} className={styles.label}>
                    {label}
                </label>
            )}
            <div className={styles.control}>
                {icon && (
                    <span className={styles.icon} aria-hidden="true">
                        {icon}
                    </span>
                )}
                <input {...props} id={id} className={styles.input} />
            </div>
        </div>
    );
}
