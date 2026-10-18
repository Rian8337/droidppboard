import { useState, type SubmitEvent } from "react";
import { useAdminKeys, useChangeKeyGrant } from "../api/manage";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { ErrorMessage } from "../components/ErrorMessage";
import { Select } from "../components/Select";
import styles from "./dialogForm.module.css";
import { formatError } from "../api/http";

export interface GrantKeyDialogProps {
    /** The name of the variant to grant. */
    variant: string;
    isOpen: boolean;
    onClose: () => void;
}

/** Gives an API key access to the variant. Admins only. */
export function GrantKeyDialog({ variant, isOpen, onClose }: GrantKeyDialogProps) {
    return (
        <Dialog title="Grant access to key" isOpen={isOpen} onClose={onClose}>
            <GrantKeyForm variant={variant} onClose={onClose} />
        </Dialog>
    );
}

function GrantKeyForm({ variant, onClose }: Pick<GrantKeyDialogProps, "variant" | "onClose">) {
    const [keyName, setKeyName] = useState("");
    const keys = useAdminKeys({ isEnabled: true });
    const granting = useChangeKeyGrant(variant);

    if (keys.error) {
        return (
            <ErrorMessage message={formatError(keys.error)} onRetry={() => void keys.refetch()} />
        );
    }

    if (!keys.data) {
        return <p className={styles.note}>Loading...</p>;
    }

    // A revoked key can no longer be used, and a key for every variant has access already.
    const grantable = keys.data.filter(
        (key) => key.revokedAt === null && !key.allVariants && !key.grants.includes(variant),
    );

    function grantAccess(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (keyName === "" || granting.isPending) {
            return;
        }

        granting.mutate({ key: keyName, isGranted: true }, { onSuccess: onClose });
    }

    return (
        <form className={styles.form} onSubmit={grantAccess}>
            <Select
                label="Key"
                value={keyName}
                onChange={(event) => setKeyName(event.target.value)}
            >
                <option value="">Choose a key</option>
                {grantable.map((key) => (
                    <option key={key.name} value={key.name}>
                        {key.name}
                    </option>
                ))}
            </Select>
            {grantable.length === 0 && (
                <p className={styles.note}>Every active key can use this variant already.</p>
            )}
            {granting.error && (
                <p role="alert" className={styles.error}>
                    {formatError(granting.error)}
                </p>
            )}
            <div className={styles.actions}>
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit" disabled={keyName === "" || granting.isPending}>
                    {granting.isPending ? "Granting..." : "Grant access"}
                </Button>
            </div>
        </form>
    );
}
