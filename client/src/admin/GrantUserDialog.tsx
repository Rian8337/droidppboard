import { useState, type SubmitEvent } from "react";
import { useGrantUser } from "../api/manage";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { TextField } from "../components/TextField";
import styles from "./dialogForm.module.css";
import { formatError } from "../api/http";

export interface GrantUserDialogProps {
    /** The name of the variant to grant. */
    variant: string;

    /** Whether the person is an admin, who may grant anyone; managers may grant people without a role only. */
    isAdmin: boolean;
    isOpen: boolean;
    onClose: () => void;
}

const maxUid = 2_147_483_647;

/** Parses a uid, or gives `null` for anything that is not a positive whole number the broker accepts. */
function parseUid(text: string): number | null {
    const trimmed = text.trim();
    const uid = Number(trimmed);

    return /^[1-9][0-9]{0,9}$/.test(trimmed) && uid <= maxUid ? uid : null;
}

/** Gives a person access to the variant, by uid. */
export function GrantUserDialog({ variant, isAdmin, isOpen, onClose }: GrantUserDialogProps) {
    return (
        <Dialog title="Grant access to user" isOpen={isOpen} onClose={onClose}>
            <GrantUserForm variant={variant} isAdmin={isAdmin} onClose={onClose} />
        </Dialog>
    );
}

function GrantUserForm({
    variant,
    isAdmin,
    onClose,
}: Pick<GrantUserDialogProps, "variant" | "isAdmin" | "onClose">) {
    const [uidText, setUidText] = useState("");
    const granting = useGrantUser(variant);
    const uid = parseUid(uidText);

    function grantAccess(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (uid === null || granting.isPending) {
            return;
        }

        granting.mutate(uid, { onSuccess: onClose });
    }

    return (
        <form className={styles.form} onSubmit={grantAccess}>
            <TextField
                label="User ID"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={uidText}
                onChange={(event) => setUidText(event.target.value)}
            />
            <p className={styles.note}>
                {isAdmin
                    ? "A person can use the rework even if it is private. Managers and admins can too."
                    : "You can give access to people who have no role. Managers and admins are set up by an admin."}
            </p>
            {granting.error && (
                <p role="alert" className={styles.error}>
                    {formatError(granting.error)}
                </p>
            )}
            <div className={styles.actions}>
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit" disabled={uid === null || granting.isPending}>
                    {granting.isPending ? "Granting..." : "Grant access"}
                </Button>
            </div>
        </form>
    );
}
