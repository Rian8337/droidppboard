import { useId, useState } from "react";
import type { Me } from "../api/auth";
import {
    useAdminKeys,
    useAdminUsers,
    useChangeKeyGrant,
    useGrants,
    useUngrantUser,
    useUserRoles,
    useUsernames,
    type ManageRole,
} from "../api/manage";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type Column } from "../components/DataTable";
import { ErrorMessage } from "../components/ErrorMessage";
import { isAdmin, isAdminRole, isOwner } from "../variant/permissions";
import { canRemoveGrant } from "./accessRules";
import styles from "./AccessTable.module.css";
import { formatError } from "../api/http";

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

    /** Whether the person has access through the admin or owner role rather than a grant. */
    isAdmin: boolean;
}

const roleLabels = { owner: "Owner", admin: "Admin", manager: "Manager" } as const;

/**
 * Who and what can use the variant: granted people, for admins and owners also the admins and owners (who can use
 * every variant), and for owners the API keys.
 */
export function AccessTable({ variant, me }: AccessTableProps) {
    return (
        <div className={styles.access}>
            <GrantedUsers variant={variant} me={me} />
            {isOwner(me) && <GrantedKeys variant={variant} />}
        </div>
    );
}

function GrantedUsers({ variant, me }: AccessTableProps) {
    const grants = useGrants(variant);
    // Only admins and owners may list the users, so only they see the admins and owners who have no grant.
    const users = useAdminUsers({ isEnabled: isAdmin(me) });
    const adminUids = (users.data ?? [])
        .filter((user) => isAdminRole(user.role))
        .map((user) => user.uid);
    const uids = [...new Set([...(grants.data ?? []), ...adminUids])];
    const usernames = useUsernames(uids);
    const roles = useUserRoles(uids);
    const ungranting = useUngrantUser(variant);
    const [userToRemove, setUserToRemove] = useState<GrantedUser | null>(null);
    const headingId = useId();

    if (grants.error) {
        return (
            <ErrorMessage
                message={formatError(grants.error)}
                onRetry={() => void grants.refetch()}
            />
        );
    }

    if (!grants.data) {
        return <p className={styles.note}>Loading...</p>;
    }

    const grantedUids = new Set(grants.data);
    const rows: GrantedUser[] = uids.map((uid) => ({
        uid,
        username: usernames.data?.get(uid),
        role: roles.data?.get(uid),
        isAdmin: !grantedUids.has(uid),
    }));

    function canRemove(row: GrantedUser): boolean {
        // An admin's or owner's access comes with the role, so there is no grant to remove.
        if (row.isAdmin) {
            return false;
        }

        // The broker lets admins and owners remove anyone. For others the role must be known, as it decides.
        if (isAdmin(me)) {
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
            id: "access",
            header: "Access",
            render: (row) => (row.isAdmin ? "Every rework" : "Granted"),
        },
        {
            id: "actions",
            header: "Remove",
            align: "right",
            render: (row) =>
                canRemove(row) ? (
                    <Button
                        variant="secondary"
                        size="small"
                        aria-label={`Remove access for ${row.username ?? row.uid}`}
                        disabled={ungranting.isPending}
                        onClick={() => setUserToRemove(row)}
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
                emptyText="Nobody has been granted access to this rework."
            />
            {me.role === "manager" && (
                <p className={styles.note}>
                    Admins can use every rework too. You can remove people who have no role.
                    Managers and admins are removed by an admin.
                </p>
            )}
            <ConfirmDialog
                title={`Remove access for ${userToRemove?.username ?? userToRemove?.uid ?? ""}?`}
                message="They lose their access to this rework until it is granted to them again."
                confirmLabel="Remove"
                isOpen={userToRemove !== null}
                isPending={ungranting.isPending}
                onConfirm={() => {
                    if (userToRemove) {
                        ungranting.mutate(userToRemove.uid, {
                            onSettled: () => setUserToRemove(null),
                        });
                    }
                }}
                onClose={() => setUserToRemove(null)}
            />
            {ungranting.error && (
                <p role="alert" className={styles.error}>
                    {formatError(ungranting.error)}
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
    const [keyToRemove, setKeyToRemove] = useState<string | null>(null);
    const headingId = useId();

    if (keys.error) {
        return (
            <ErrorMessage message={formatError(keys.error)} onRetry={() => void keys.refetch()} />
        );
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
                        onClick={() => setKeyToRemove(row.name)}
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
                emptyText="No API key has access to this rework."
            />
            <p className={styles.note}>
                Inherited keys can use every rework, so there is no access to remove here.
            </p>
            {changing.error && (
                <p role="alert" className={styles.error}>
                    {formatError(changing.error)}
                </p>
            )}
            <ConfirmDialog
                title={`Remove access for ${keyToRemove ?? ""}?`}
                message="The key loses its access to this rework until it is granted again."
                confirmLabel="Remove"
                isOpen={keyToRemove !== null}
                isPending={changing.isPending}
                onConfirm={() => {
                    if (keyToRemove !== null) {
                        changing.mutate(
                            { key: keyToRemove, isGranted: false },
                            { onSettled: () => setKeyToRemove(null) },
                        );
                    }
                }}
                onClose={() => setKeyToRemove(null)}
            />
        </section>
    );
}
