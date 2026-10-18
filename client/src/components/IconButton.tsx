import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import type { ButtonHTMLAttributes } from "react";
import styles from "./IconButton.module.css";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    icon: IconDefinition;
    /** The accessible name; an icon alone says nothing to a screen reader. */
    label: string;
}

export function IconButton({ icon, label, type = "button", className, ...props }: IconButtonProps) {
    return (
        <button
            {...props}
            type={type}
            aria-label={label}
            className={className ? `${styles.iconButton} ${className}` : styles.iconButton}
        >
            <FontAwesomeIcon icon={icon} fixedWidth />
        </button>
    );
}
