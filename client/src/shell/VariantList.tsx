import { faLock, faThumbtack } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { PPVariant } from "app-structures";
import { Link } from "react-router";
import { useVariants } from "../api/variants";
import { ErrorMessage } from "../components/ErrorMessage";
import { Tooltip } from "../components/Tooltip";
import { getVariantPath } from "../routing/paths";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { formatUtcTime } from "../utils/formatUtcTime";
import { findVariant } from "../variant/findVariant";
import { getVariantTitle } from "../variant/getVariantTitle";
import { isVariantPinned } from "../variant/isVariantPinned";
import { sortVariants } from "./sortVariants";
import styles from "./VariantList.module.css";
import { formatError } from "../api/http";

export interface VariantListProps {
    /** Only the variants whose title or name contains this, ignoring case, are listed. */
    filter: string;

    /** The name or alias of the variant being viewed, if any. */
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

/** The sidebar's flat list of variants, `droid-rebalance` first and then the pinned ones. */
export function VariantList({ filter, currentVariant, onNavigate }: VariantListProps) {
    const { data: variants, error, isPending, refetch } = useVariants();

    if (isPending) {
        return <p className={styles.note}>Loading reworks...</p>;
    }

    if (error) {
        return <ErrorMessage message={formatError(error)} onRetry={() => void refetch()} />;
    }

    const current = findVariant(variants, currentVariant);
    const shown = sortVariants(variants).filter((variant) => matchesFilter(variant, filter));

    if (shown.length === 0) {
        return <p className={styles.note}>No reworks match.</p>;
    }

    return (
        <ul className={styles.list}>
            {shown.map((variant) => {
                const isCurrent = variant.name === current?.name;

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
                                <span className={styles.title}>{getVariantTitle(variant)}</span>
                                <span className={styles.subtitle}>{variant.name}</span>
                                {variant.builtAt !== null && (
                                    <span className={styles.updated}>
                                        {`Last updated: ${formatRelativeTime(variant.builtAt)} (${formatUtcTime(variant.builtAt)})`}
                                    </span>
                                )}
                            </span>
                            {isVariantPinned(variant) && (
                                <FontAwesomeIcon
                                    icon={faThumbtack}
                                    className={styles.pin}
                                    aria-label="Pinned"
                                    role="img"
                                />
                            )}
                        </Link>
                        {!variant.public && (
                            <Tooltip content="Private rework" align="end">
                                <span
                                    className={styles.lock}
                                    tabIndex={0}
                                    role="img"
                                    aria-label="Private rework"
                                >
                                    <FontAwesomeIcon icon={faLock} />
                                </span>
                            </Tooltip>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
