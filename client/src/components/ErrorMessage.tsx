import { Button } from "./Button";
import styles from "./ErrorMessage.module.css";

export interface ErrorMessageProps {
    message: string;
    /** When given, a retry button calls it. */
    onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
    return (
        <div role="alert" className={styles.error}>
            <p className={styles.message}>{message}</p>
            {onRetry && (
                <Button variant="secondary" size="small" onClick={onRetry}>
                    Try again
                </Button>
            )}
        </div>
    );
}
