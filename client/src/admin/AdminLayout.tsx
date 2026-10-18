import { faKey, faLayerGroup, faUserShield } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Navigate, Outlet, useLocation, useMatch } from "react-router";
import { useMe } from "../api/auth";
import { EmptyState } from "../components/EmptyState";
import { Tabs, type Tab } from "../components/Tabs";
import { getVariantPath } from "../routing/paths";
import { canManageVariant, isAdmin } from "../variant/permissions";
import styles from "./AdminLayout.module.css";

const tabs: readonly Tab[] = [
    { id: "keys", label: "API keys", icon: <FontAwesomeIcon icon={faKey} />, to: "/admin/keys" },
    {
        id: "roles",
        label: "Roles",
        icon: <FontAwesomeIcon icon={faUserShield} />,
        to: "/admin/roles",
    },
    {
        id: "variants",
        label: "All variants",
        icon: <FontAwesomeIcon icon={faLayerGroup} />,
        to: "/admin/variants",
    },
];

/** The frame of the admin area: its tabs above the page. Everybody who is not an admin sees a message instead. */
export function AdminLayout() {
    const { data: me = null, isPending } = useMe();
    const { pathname } = useLocation();
    const variantMatch = useMatch("/admin/variants/:name");

    if (isPending) {
        return <p className={styles.note}>Loading...</p>;
    }

    // An old /manage/variants/:name link lands here; a manager of that variant has an admin tab of their own.
    if (
        !isAdmin(me) &&
        variantMatch?.params.name &&
        canManageVariant(me, variantMatch.params.name)
    ) {
        return <Navigate replace to={getVariantPath(variantMatch.params.name, "admin")} />;
    }

    // The broker refuses these requests to others anyway (with a 403); this is what the person reads.
    if (!isAdmin(me)) {
        return <EmptyState message="You need the admin role to see this page" />;
    }

    const activeId = tabs.find((tab) => pathname.startsWith(tab.to))?.id ?? tabs[0].id;

    return (
        <div>
            <Tabs tabs={[...tabs]} activeId={activeId} aria-label="Admin pages" />
            <div className={styles.page}>
                <Outlet />
            </div>
        </div>
    );
}
