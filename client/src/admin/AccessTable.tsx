import { useId } from "react";
import type { Me } from "../api/auth";
import {
    useAdminKeys,
    useChangeKeyGrant,
    useGrants,
    useUngrantUser,
    useUserRoles,
    useUsernames,
    type ManageRole,
} from "../api/manage";
import { Button } from "../components/Button";
import { DataTable, type Column } from "../components/DataTable";
import { ErrorMessage } from "../components/ErrorMessage";
import { canRemoveGrant } from "./accessRules";
import styles from "./AccessTable.module.css";

export interface AccessTableProps {
    /** The name of the variant. */
    variant: string;

    /** The person looking, who decides which Remove buttons show. */
    me: Me;
}

interface GrantedUser {
    uid: number;
    username: string | undefined;

    /** `undefined` while the role is not known. */
    role: ManageRole | null | undefined;
}

const roleLabels = { admin: "Admin", manager: "Manager" } as const;

/** Who and what can use the variant: granted people, and for admins the API keys. */
export function AccessTable({ variant, me }: AccessTableProps) {
    return (
        <div className={styles.access}>
            <GrantedUsers variant={variant} me={me} />
            {me.role === "admin" && <GrantedKeys variant={variant} />}
        </div>
    );
}

function GrantedUsers({ variant, me }: AccessTableProps) {
    const grants = useGrants(variant);
    const uids = grants.data ?? [];
    const usernames = useUsernames(uids);
    const roles = useUserRoles(uids);
    const ungranting = useUngrantUser(variant);
    const headingId = useId();

    if (grants.error) {
        return (
            <ErrorMessage message={grants.error.message} onRetry={() => void grants.refetch()} />
        );
    }

    if (!grants.data) {
        return <p className={styles.note}>Loading...</p>;
    }

    const rows: GrantedUser[] = grants.data.map((uid) => ({
        uid,
        username: usernames.data?.get(uid),
        role: roles.data?.get(uid),
    }));

    function canRemove(row: GrantedUser): boolean {
        // The broker lets admins remove anyone. For others the role must be known, as it decides.
        if (me.role === "admin") {
            return true;
        }

        return row.role !== undefined && canRemoveGrant(me, { uid: row.uid, role: row.role });
    }

    function getRoleLabel(row: GrantedUser): string {
        if (row.role === undefined) {
            return roles.error ? "Unknown" : "...";
        }

        return row.role === null ? "No role" : roleLabels[row.role];
    }

    const columns: Column<GrantedUser>[] = [
        { id: "uid", header: "User ID", render: (row) => row.uid },
        {
            id: "username",
            header: "Username",
            render: (row) => row.username ?? (usernames.isPending ? "..." : "Unknown user"),
        },
        { id: "role", header: "Role", render: getRoleLabel },
        {
            id: "actions",
            header: "Access",
            align: "right",
            render: (row) =>
                canRemove(row) ? (
                    <Button
                        variant="secondary"
                        size="small"
                        aria-label={`Remove access for ${row.username ?? row.uid}`}
                        disabled={ungranting.isPending}
                        onClick={() => ungranting.mutate(row.uid)}
                    >
                        Remove
                    </Button>
                ) : null,
        },
    ];

    return (
        <section aria-labelledby={headingId}>
            <h2 id={headingId} className={styles.heading}>
                People with access
            </h2>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => String(row.uid)}
                emptyText="Nobody has been granted this variant."
            />
            {me.role === "manager" && (
                <p className={styles.note}>
                    You can remove people who have no role. Managers and admins are removed by an
                    admin.
                </p>
            )}
            {ungranting.error && (
                <p role="alert" className={styles.error}>
                    {ungranting.error.message}
                </p>
            )}
        </section>
    );
}

interface KeyAccess {
    name: string;
    isInherited: boolean;
}

function GrantedKeys({ variant }: { variant: string }) {
    const keys = useAdminKeys({ isEnabled: true });
    const changing = useChangeKeyGrant(variant);
    const headingId = useId();

    if (keys.error) {
        return <ErrorMessage message={keys.error.message} onRetry={() => void keys.refetch()} />;
    }

    if (!keys.data) {
        return <p className={styles.note}>Loading...</p>;
    }

    // The broker has no per-variant key query, so the whole list is filtered. A revoked key can use nothing.
    const rows: KeyAccess[] = keys.data
        .filter(
            (key) => key.revokedAt === null && (key.allVariants || key.grants.includes(variant)),
        )
        .map((key) => ({ name: key.name, isInherited: key.allVariants }));

    const columns: Column<KeyAccess>[] = [
        { id: "name", header: "Key", render: (row) => row.name },
        {
            id: "access",
            header: "Access",
            render: (row) => (row.isInherited ? "Inherited" : "Granted"),
        },
        {
            id: "actions",
            header: "Remove",
            align: "right",
            render: (row) =>
                row.isInherited ? null : (
                    <Button
                        variant="secondary"
                        size="small"
                        aria-label={`Remove access for ${row.name}`}
                        disabled={changing.isPending}
                        onClick={() => changing.mutate({ key: row.name, isGranted: false })}
                    >
                        Remove
                    </Button>
                ),
        },
    ];

    return (
        <section aria-labelledby={headingId}>
            <h2 id={headingId} className={styles.heading}>
                API keys
            </h2>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.name}
                emptyText="No API key has access to this variant."
            />
            <p className={styles.note}>
                Inherited keys can use every variant, so there is no access to remove here.
            </p>
            {changing.error && (
                <p role="alert" className={styles.error}>
                    {changing.error.message}
                </p>
            )}
        </section>
    );
}
