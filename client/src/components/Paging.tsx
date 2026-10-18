import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, type FormEvent } from "react";
import { Button } from "./Button";
import styles from "./Paging.module.css";

export interface PagingProps {
    /** The current page, counted from 1. */
    page: number;
    onPageChange: (page: number) => void;
    /** Whether a page after this one may exist. The server does not say how many pages there are. */
    hasNext: boolean;
}

/** Previous and next buttons, the current page, and a way to jump to a page by number. */
export function Paging({ page, onPageChange, hasNext }: PagingProps) {
    const [target, setTarget] = useState("");

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const requested = Number.parseInt(target, 10);

        if (!Number.isNaN(requested)) {
            onPageChange(Math.max(requested, 1));
            setTarget("");
        }
    }

    return (
        <nav className={styles.paging} aria-label="Pages">
            <div className={styles.steps}>
                <Button
                    variant="secondary"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <FontAwesomeIcon icon={faChevronLeft} />
                </Button>
                <span className={styles.current}>Page {page}</span>
                <Button
                    variant="secondary"
                    aria-label="Next page"
                    disabled={!hasNext}
                    onClick={() => onPageChange(page + 1)}
                >
                    <FontAwesomeIcon icon={faChevronRight} />
                </Button>
            </div>
            <form className={styles.jump} onSubmit={handleSubmit}>
                <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className={styles.input}
                    aria-label="Go to page"
                    placeholder="Go to page"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                />
                <Button type="submit" variant="secondary">
                    Go
                </Button>
            </form>
        </nav>
    );
}
