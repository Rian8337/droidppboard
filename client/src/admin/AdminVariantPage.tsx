import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, useParams } from "react-router";
import { useAdminVariants } from "../api/manage";
import { ErrorMessage } from "../components/ErrorMessage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { getVariantTitle } from "../variant/getVariantTitle";
import { VariantAdminTab } from "./VariantAdminTab";
import styles from "./AdminVariantPage.module.css";
import { formatError } from "../api/http";

/**
 * One variant's settings and access in the admin area, which reaches `droid-live` and the osu! variants as well.
 * The full run is left out: it belongs to the variants of the board, on their Admin tab.
 */
export function AdminVariantPage() {
    const { name } = useParams();
    const variants = useAdminVariants();

    if (variants.error) {
        return (
            <ErrorMessage
                message={formatError(variants.error)}
                onRetry={() => void variants.refetch()}
            />
        );
    }

    if (!variants.data) {
        return <p className={styles.note}>Loading...</p>;
    }

    const variant = variants.data.find((candidate) => candidate.name === name);

    if (!variant) {
        return <NotFoundPage message="Rework not found" />;
    }

    return (
        <div className={styles.page}>
            <Link to="/admin/variants" className={styles.back}>
                <FontAwesomeIcon icon={faChevronLeft} />
                All reworks
            </Link>
            <div>
                <h2 className={styles.title}>{getVariantTitle(variant)}</h2>
                <p className={styles.name}>{variant.name}</p>
            </div>
            <VariantAdminTab variant={variant} hasFullRun={false} />
        </div>
    );
}
