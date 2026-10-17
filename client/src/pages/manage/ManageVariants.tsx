import { Link } from "react-router-dom";
import ManageGuard from "../../components/manage/ManageGuard";
import { useManageData } from "../../hooks/useManageData";
import { AdminVariant } from "../../utils/manageApi";

export default function ManageVariants() {
    return (
        <ManageGuard title="Manage Variants">
            <VariantList />
        </ManageGuard>
    );
}

function VariantList() {
    const { data, error, isLoading } =
        useManageData<AdminVariant[]>("/variants");

    if (error) {
        return <p className="manage-error">{error}</p>;
    }

    if (isLoading || !data) {
        return <p className="manage-center">Loading...</p>;
    }

    if (data.length === 0) {
        return <p className="manage-center">There are no variants.</p>;
    }

    return (
        <table className="manage-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Title</th>
                    <th>Visibility</th>
                    <th>Availability</th>
                    <th>Instances</th>
                    <th>Aliases</th>
                </tr>
            </thead>
            <tbody>
                {data.map((variant) => (
                    <tr key={variant.name}>
                        <td>
                            <Link
                                to={`/manage/variants/${encodeURIComponent(
                                    variant.name
                                )}`}
                            >
                                {variant.name}
                            </Link>
                        </td>
                        <td>{variant.title ?? "-"}</td>
                        <td>{variant.public ? "Public" : "Private"}</td>
                        <td>
                            {variant.available ? "Available" : "Unavailable"}
                        </td>
                        <td>{variant.instanceCount}</td>
                        <td>
                            {variant.aliases.length > 0
                                ? variant.aliases.join(", ")
                                : "-"}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
