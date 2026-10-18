import { useState } from "react";
import { Button } from "../components/Button";
import { Markdown } from "../components/Markdown";
import { getCollapsedDescription, isCollapsible } from "./getCollapsedDescription";
import styles from "./VariantDescription.module.css";

export interface VariantDescriptionProps {
    description: string | null;
}

/** A variant's description, collapsed to its first block until the person expands it. */
export function VariantDescription({ description }: VariantDescriptionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (description === null || description.trim() === "") {
        return null;
    }

    const hasMore = isCollapsible(description);

    return (
        <section className={styles.description} aria-label="Description">
            <Markdown
                source={hasMore && !isExpanded ? getCollapsedDescription(description) : description}
            />
            {hasMore && (
                <Button
                    variant="ghost"
                    size="small"
                    className={styles.toggle}
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
                >
                    {isExpanded ? "Show less" : "Show more"}
                </Button>
            )}
        </section>
    );
}
