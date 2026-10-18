import { faGlobe, faThumbtack } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { PPVariant } from "app-structures";
import { Link } from "react-router";
import { useVariants } from "../api/variants";
import { ErrorMessage } from "../components/ErrorMessage";
import { Tooltip } from "../components/Tooltip";
import { defaultVariant, getVariantPath } from "../routing/paths";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { sortVariants } from "./sortVariants";
import styles from "./VariantList.module.css";

export interface VariantListProps {
    /** Only the variants whose title or name contains this, ignoring case, are listed. */
    filter: string;

    /** The name of the variant being viewed, if any. */
    currentVariant?: string;

    /** Called when a variant is picked. */
    onNavigate: () => void;
}

function matchesFilter(variant: PPVariant, filter: string): boolean {
    const needle = filter.trim().toLowerCase();

    return (
        variant.name.toLowerCase().includes(needle) ||
        (variant.title?.toLowerCase().includes(needle) ?? false)
    );
}

/** The sidebar's flat list of variants, `droid-rebalance` pinned first. */
export function VariantList({ filter, currentVariant, onNavigate }: VariantListProps) {
    const { data: variants, error, isPending, refetch } = useVariants();

    if (isPending) {
        return <p className={styles.note}>Loading variants...</p>;
    }

    if (error) {
        return <ErrorMessage message={error.message} onRetry={() => void refetch()} />;
    }

    const shown = sortVariants(variants).filter((variant) => matchesFilter(variant, filter));

    if (shown.length === 0) {
        return <p className={styles.note}>No variants match.</p>;
    }

    return (
        <ul className={styles.list}>
            {shown.map((variant) => {
                const isCurrent = variant.name === currentVariant;

                return (
                    <li key={variant.name} className={styles.entry}>
                        <Link
                            to={getVariantPath(variant.name)}
                            className={isCurrent ? `${styles.link} ${styles.current}` : styles.link}
                            aria-current={isCurrent ? "true" : undefined}
                            onClick={onNavigate}
                        >
                            <span className={styles.dot} aria-hidden="true" />
                            <span className={styles.text}>
                                <span className={styles.title}>
                                    {variant.title ?? variant.name}
                                </span>
                                <span className={styles.subtitle}>
                                    {variant.builtAt === null
                                        ? variant.name
                                        : `${variant.name} | Last updated: ${formatRelativeTime(variant.builtAt)}`}
                                </span>
                            </span>
                            {variant.name === defaultVariant && (
                                <FontAwesomeIcon
                                    icon={faThumbtack}
                                    className={styles.pin}
                                    aria-label="Pinned"
                                    role="img"
                                />
                            )}
                        </Link>
                        {!variant.public && (
                            <Tooltip content="Private variant">
                                <span
                                    className={styles.globe}
                                    tabIndex={0}
                                    role="img"
                                    aria-label="Private variant"
                                >
                                    <FontAwesomeIcon icon={faGlobe} />
                                </span>
                            </Tooltip>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
