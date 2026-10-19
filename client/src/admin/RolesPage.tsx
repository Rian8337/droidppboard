import { useState, type SubmitEvent } from "react";
import { useMe } from "../api/auth";
import {
    useAdminUsers,
    useSetRole,
    useUsernames,
    type AdminUser,
    type ManageRole,
} from "../api/manage";
import { Button } from "../components/Button";
import { DataTable, type Column } from "../components/DataTable";
import { Dialog } from "../components/Dialog";
import { ErrorMessage } from "../components/ErrorMessage";
import { Select } from "../components/Select";
import { TextField } from "../components/TextField";
import styles from "./RolesPage.module.css";
import { formatError } from "../api/http";

const roleLabels: Readonly<Record<ManageRole, string>> = { admin: "Admin", manager: "Manager" };

function isRole(value: string): value is ManageRole {
    return value === "admin" || value === "manager";
}

interface RoleHolder extends AdminUser {
    readonly role: ManageRole;
}

/** A change that waits for the person to confirm it. */
interface PendingChange {
    readonly uid: number;
    readonly role: ManageRole | null;
}

/**
 * The site-wide roles: who has one, and a form to give one to a person by uid or take it away. Nobody
 * can change their own role, so that the last admin cannot lock everybody out.
 */
export function RolesPage() {
    const users = useAdminUsers();
    const holders = (users.data ?? []).filter((user): user is RoleHolder => user.role !== null);
    const usernames = useUsernames(holders.map((user) => user.uid));
    const setting = useSetRole();
    const { data: me = null } = useMe();
    const [pending, setPending] = useState<PendingChange | null>(null);
    const [uid, setUid] = useState("");
    const [role, setRole] = useState<ManageRole>("manager");
    const parsedUid = /^[1-9][0-9]{0,9}$/.test(uid.trim()) ? Number.parseInt(uid, 10) : null;
    const isOwnUid = parsedUid !== null && parsedUid === me?.uid;

    function getName(user: { uid: number }): string {
        return usernames.data?.get(user.uid) ?? `uid ${user.uid}`;
    }

    /** Applies the change, or asks first when it removes a role. */
    function requestChange(change: PendingChange, onSuccess?: () => void) {
        if (change.role === null) {
            setPending(change);

            return;
        }

        setting.mutate(change, { onSuccess });
    }

    function addRole(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (parsedUid !== null && !isOwnUid && !setting.isPending) {
            requestChange({ uid: parsedUid, role }, () => setUid(""));
        }
    }

    const columns: Column<RoleHolder>[] = [
        { id: "uid", header: "User ID", render: (user) => user.uid },
        {
            id: "username",
            header: "Username",
            render: (user) => usernames.data?.get(user.uid) ?? "Unknown user",
        },
        {
            id: "role",
            header: "Role",
            render: (user) =>
                user.uid === me?.uid ? (
                    `${roleLabels[user.role]} (you)`
                ) : (
                    <Select
                        aria-label={`Role of ${getName(user)}`}
                        value={user.role}
                        disabled={setting.isPending}
                        onChange={(event) => {
                            if (isRole(event.target.value)) {
                                requestChange({ uid: user.uid, role: event.target.value });
                            }
                        }}
                    >
                        <option value="admin">{roleLabels.admin}</option>
                        <option value="manager">{roleLabels.manager}</option>
                    </Select>
                ),
        },
        {
            id: "actions",
            header: "Remove",
            align: "right",
            render: (user) =>
                user.uid === me?.uid ? null : (
                    <Button
                        variant="secondary"
                        size="small"
                        aria-label={`Remove role of ${getName(user)}`}
                        disabled={setting.isPending}
                        onClick={() => requestChange({ uid: user.uid, role: null })}
                    >
                        Remove
                    </Button>
                ),
        },
    ];

    return (
        <div className={styles.page}>
            <section className={styles.section}>
                <h2 className={styles.heading}>People with a role</h2>
                {users.error ? (
                    <ErrorMessage
                        message={formatError(users.error)}
                        onRetry={() => void users.refetch()}
                    />
                ) : users.data ? (
                    <DataTable
                        columns={columns}
                        rows={holders}
                        rowKey={(user) => String(user.uid)}
                        emptyText="Nobody has a role."
                    />
                ) : (
                    <p className={styles.note}>Loading...</p>
                )}
            </section>
            <section className={styles.section}>
                <h2 className={styles.heading}>Set a role</h2>
                <form className={styles.form} onSubmit={addRole}>
                    <TextField
                        label="User ID"
                        inputMode="numeric"
                        autoComplete="off"
                        value={uid}
                        onChange={(event) => setUid(event.target.value)}
                    />
                    <Select
                        label="Role"
                        value={role}
                        onChange={(event) => {
                            if (isRole(event.target.value)) {
                                setRole(event.target.value);
                            }
                        }}
                    >
                        <option value="admin">{roleLabels.admin}</option>
                        <option value="manager">{roleLabels.manager}</option>
                    </Select>
                    <Button
                        type="submit"
                        disabled={parsedUid === null || isOwnUid || setting.isPending}
                    >
                        Set role
                    </Button>
                </form>
                {isOwnUid && <p className={styles.note}>You cannot change your own role.</p>}
                {setting.error && (
                    <p role="alert" className={styles.error}>
                        {formatError(setting.error)}
                    </p>
                )}
            </section>
            <Dialog
                title={pending === null ? "Remove role" : `Remove the role of ${getName(pending)}?`}
                isOpen={pending !== null}
                onClose={() => setPending(null)}
            >
                <p className={styles.note}>They keep any reworks they were granted.</p>
                <div className={styles.actions}>
                    <Button variant="ghost" onClick={() => setPending(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        disabled={setting.isPending}
                        onClick={() => {
                            if (pending) {
                                setting.mutate(pending, { onSuccess: () => setPending(null) });
                            }
                        }}
                    >
                        Remove role
                    </Button>
                </div>
            </Dialog>
        </div>
    );
}
