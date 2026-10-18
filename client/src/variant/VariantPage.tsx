import { useParams } from "react-router";
import { useMe } from "../api/auth";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { NotFoundPage } from "../pages/NotFoundPage";
import type { VariantTab } from "../routing/paths";
import { canManageVariant } from "./permissions";
import { useCurrentVariant } from "./useCurrentVariant";
import { VariantDescription } from "./VariantDescription";
import { VariantTabs } from "./VariantTabs";
import { variantTabContent } from "./variantTabContent";
import styles from "./VariantPage.module.css";

const tabIds: ReadonlySet<string> = new Set<VariantTab>([
    "info",
    "leaderboard",
    "top-plays",
    "queue",
    "calculator",
    "admin",
]);

function isVariantTab(value: string | undefined): value is VariantTab {
    return value !== undefined && tabIds.has(value);
}

/** A variant's page: its description above the tabs, and the tab the address names. */
export function VariantPage() {
    const { tab } = useParams();
    const { variant, isLoading, error, refetch } = useCurrentVariant();
    const { data: me = null, isPending: isMePending } = useMe();

    // Waiting for who is logged in keeps an Admin address from flashing "not found" first.
    if (isLoading || (tab === "admin" && isMePending)) {
        return <p className={styles.note}>Loading...</p>;
    }

    if (error) {
        return <ErrorMessage message={error.message} onRetry={refetch} />;
    }

    if (!variant) {
        return <NotFoundPage message="Variant not found" />;
    }

    if (!isVariantTab(tab) || (tab === "admin" && !canManageVariant(me, variant.name))) {
        return <NotFoundPage />;
    }

    const Content = variantTabContent[tab];

    return (
        <div>
            <VariantDescription description={variant.description} />
            <VariantTabs variant={variant.name} activeTab={tab} />
            {Content ? (
                <Content variant={variant} />
            ) : (
                <EmptyState message="This tab is not available yet." />
            )}
        </div>
    );
}
