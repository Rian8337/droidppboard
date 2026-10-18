import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "small" | "normal";
}

export function Button({
    variant = "primary",
    size = "normal",
    type = "button",
    className,
    ...props
}: ButtonProps) {
    const classes = [
        styles.button,
        styles[variant],
        size === "small" ? styles.small : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return <button {...props} type={type} className={classes} />;
}
