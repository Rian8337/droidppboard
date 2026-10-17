import { FormEvent, useState } from "react";
import ManageGuard from "../../components/manage/ManageGuard";
import {
    useManageAction,
    useManageData,
    useUsernames,
} from "../../hooks/useManageData";
import { AdminUser, manageRequest } from "../../utils/manageApi";

type RoleChoice = "admin" | "manager" | "none";

export default function ManageUsers() {
    return (
        <ManageGuard title="Manage Users" adminOnly>
            <UserList />
        </ManageGuard>
    );
}

function UserList() {
    const {
        data,
        error: loadError,
        isLoading,
        reload,
    } = useManageData<AdminUser[]>("/users");
    const { run, error, isBusy } = useManageAction(reload);
    const usernames = useUsernames((data ?? []).map((u) => u.uid));

    const [newUid, setNewUid] = useState("");
    const [newRole, setNewRole] = useState<RoleChoice>("manager");

    const parsedUid = /^[1-9][0-9]*$/.test(newUid.trim())
        ? parseInt(newUid)
        : null;

    function setRole(uid: number, role: RoleChoice): Promise<boolean> {
        if (
            role === "none" &&
            !window.confirm(
                `Remove the role of ${usernames.get(uid) ?? "uid " + uid}?`
            )
        ) {
            return Promise.resolve(false);
        }

        return run(() =>
            manageRequest("PUT", `/users/${uid}/role`, {
                role: role === "none" ? null : role,
            })
        );
    }

    async function add(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (parsedUid !== null && (await setRole(parsedUid, newRole))) {
            setNewUid("");
        }
    }

    return (
        <>
            {loadError ? (
                <p className="manage-error">{loadError}</p>
            ) : isLoading || !data ? (
                <p className="manage-center">Loading...</p>
            ) : data.length === 0 ? (
                <p className="manage-center">No user has a role or a grant.</p>
            ) : (
                <table className="manage-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Grants</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((user) => (
                            <tr key={user.uid}>
                                <td>
                                    {usernames.get(user.uid) ?? "Unknown user"}{" "}
                                    ({user.uid})
                                </td>
                                <td>
                                    <select
                                        className="manage-input"
                                        value={user.role ?? "none"}
                                        disabled={isBusy}
                                        onChange={(e) =>
                                            setRole(
                                                user.uid,
                                                e.target.value as RoleChoice
                                            )
                                        }
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="none">None</option>
                                    </select>
                                </td>
                                <td>
                                    {user.grants.length > 0
                                        ? user.grants.join(", ")
                                        : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <section className="manage-section">
                <h3>Set a role</h3>

                <form className="manage-inline-form" onSubmit={add}>
                    <input
                        className="manage-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="User ID"
                        value={newUid}
                        onChange={(e) => setNewUid(e.target.value)}
                        disabled={isBusy}
                    />
                    <select
                        className="manage-input"
                        value={newRole}
                        onChange={(e) =>
                            setNewRole(e.target.value as RoleChoice)
                        }
                        disabled={isBusy}
                    >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="none">None</option>
                    </select>
                    <button
                        className="manage-button"
                        type="submit"
                        disabled={isBusy || parsedUid === null}
                    >
                        Set
                    </button>
                </form>
            </section>

            {error ? <p className="manage-error">{error}</p> : null}
        </>
    );
}
