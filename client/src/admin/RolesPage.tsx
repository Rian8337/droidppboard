import { useState, type SubmitEvent } from "react";
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

const roleLabels: Readonly<Record<ManageRole, string>> = { admin: "Admin", manager: "Manager" };

function isRole(value: string): value is ManageRole {
    return value === "admin" || value === "manager";
}

interface RoleHolder extends AdminUser {
    readonly role: ManageRole;
}

/** The site-wide roles: who has one, and a form to give one to a person by uid or take it away. */
export function RolesPage() {
    const users = useAdminUsers();
    const holders = (users.data ?? []).filter((user): user is RoleHolder => user.role !== null);
    const usernames = useUsernames(holders.map((user) => user.uid));
    const setting = useSetRole();
    const [removing, setRemoving] = useState<RoleHolder | null>(null);
    const [uid, setUid] = useState("");
    const [role, setRole] = useState<ManageRole>("manager");
    const parsedUid = /^[1-9][0-9]{0,9}$/.test(uid.trim()) ? Number.parseInt(uid, 10) : null;

    function getName(user: AdminUser): string {
        return usernames.data?.get(user.uid) ?? `uid ${user.uid}`;
    }

    function addRole(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (parsedUid !== null && !setting.isPending) {
            setting.mutate({ uid: parsedUid, role }, { onSuccess: () => setUid("") });
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
            render: (user) => (
                <Select
                    aria-label={`Role of ${getName(user)}`}
                    value={user.role}
                    disabled={setting.isPending}
                    onChange={(event) => {
                        if (isRole(event.target.value)) {
                            setting.mutate({ uid: user.uid, role: event.target.value });
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
            render: (user) => (
                <Button
                    variant="secondary"
                    size="small"
                    aria-label={`Remove role of ${getName(user)}`}
                    disabled={setting.isPending}
                    onClick={() => setRemoving(user)}
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
                        message={users.error.message}
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
                    <Button type="submit" disabled={parsedUid === null || setting.isPending}>
                        Set role
                    </Button>
                </form>
                {setting.error && (
                    <p role="alert" className={styles.error}>
                        {setting.error.message}
                    </p>
                )}
            </section>
            <Dialog
                title={removing ? `Remove the role of ${getName(removing)}?` : "Remove role"}
                isOpen={removing !== null}
                onClose={() => setRemoving(null)}
            >
                <p className={styles.note}>
                    They keep any variants they were granted, but lose the {removing?.role} role.
                </p>
                <div className={styles.actions}>
                    <Button variant="ghost" onClick={() => setRemoving(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        disabled={setting.isPending}
                        onClick={() => {
                            if (removing) {
                                setting.mutate(
                                    { uid: removing.uid, role: null },
                                    { onSuccess: () => setRemoving(null) },
                                );
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
