import { faKey, faLayerGroup, faUserShield } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Navigate, Outlet, useLocation, useMatch } from "react-router";
import { useMe, type Me } from "../api/auth";
import { EmptyState } from "../components/EmptyState";
import { Tabs, type Tab } from "../components/Tabs";
import { getVariantPath } from "../routing/paths";
import { canManageVariant, isAdmin, isOwner } from "../variant/permissions";
import styles from "./AdminLayout.module.css";

const keysTab: Tab = {
    id: "keys",
    label: "API keys",
    icon: <FontAwesomeIcon icon={faKey} />,
    to: "/admin/keys",
};

// API keys are left out: a key that may act for users could get around every role, so only owners manage them.
const adminTabs: readonly Tab[] = [
    {
        id: "roles",
        label: "Roles",
        icon: <FontAwesomeIcon icon={faUserShield} />,
        to: "/admin/roles",
    },
    {
        id: "variants",
        label: "All reworks",
        icon: <FontAwesomeIcon icon={faLayerGroup} />,
        to: "/admin/variants",
    },
];

/** The admin pages the person may see, in order. */
function getTabs(me: Me | null): readonly Tab[] {
    return isOwner(me) ? [keysTab, ...adminTabs] : adminTabs;
}

/** Where `/admin` leads: the first admin page the person may see. */
export function AdminIndex() {
    const { data: me = null } = useMe();

    return <Navigate replace to={getTabs(me)[0].to} />;
}

/**
 * The frame of the admin area: its tabs above the page. Everybody who is not an admin or owner sees a message
 * instead, and so does an admin on the owner-only API keys page.
 */
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

    const tabs = getTabs(me);
    const activeId = tabs.find((tab) => pathname.startsWith(tab.to))?.id ?? tabs[0].id;
    const isKeysPage = pathname.startsWith(keysTab.to);

    return (
        <div>
            <Tabs tabs={[...tabs]} activeId={activeId} aria-label="Admin pages" />
            <div className={styles.page}>
                {isKeysPage && !isOwner(me) ? (
                    <EmptyState message="You need the owner role to see this page" />
                ) : (
                    <Outlet />
                )}
            </div>
        </div>
    );
}
