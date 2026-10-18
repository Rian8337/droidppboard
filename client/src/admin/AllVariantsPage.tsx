import { useNavigate } from "react-router";
import { useAdminVariants, type AdminVariant } from "../api/manage";
import { DataTable, type Column } from "../components/DataTable";
import { ErrorMessage } from "../components/ErrorMessage";
import { Pill } from "../components/Pill";
import { getAdminVariantPath } from "../routing/paths";
import styles from "./AllVariantsPage.module.css";

const columns: Column<AdminVariant>[] = [
    { id: "name", header: "Name", render: (variant) => variant.name },
    { id: "title", header: "Title", render: (variant) => variant.title ?? "-" },
    {
        id: "aliases",
        header: "Aliases",
        render: (variant) => (variant.aliases.length === 0 ? "-" : variant.aliases.join(", ")),
    },
    {
        id: "visibility",
        header: "Visibility",
        render: (variant) =>
            variant.public ? <Pill>Public</Pill> : <Pill tone="running">Private</Pill>,
    },
    {
        id: "availability",
        header: "Availability",
        render: (variant) =>
            variant.available ? (
                <Pill tone="success">Available</Pill>
            ) : (
                <Pill tone="failure">Unavailable</Pill>
            ),
    },
];

/**
 * Every variant, including `droid-live` and the osu! variants that have no sidebar entry. Opening one leads to its
 * settings and access.
 */
export function AllVariantsPage() {
    const variants = useAdminVariants();
    const navigate = useNavigate();

    if (variants.error) {
        return (
            <ErrorMessage
                message={variants.error.message}
                onRetry={() => void variants.refetch()}
            />
        );
    }

    if (!variants.data) {
        return <p className={styles.note}>Loading...</p>;
    }

    return (
        <DataTable
            columns={columns}
            rows={variants.data}
            rowKey={(variant) => variant.name}
            onRowClick={(variant) => void navigate(getAdminVariantPath(variant.name))}
            emptyText="There are no variants."
        />
    );
}
