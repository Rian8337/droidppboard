import { useState } from "react";
import { useMe } from "../api/auth";
import { Button } from "../components/Button";
import { canManageVariant, isAdmin } from "../variant/permissions";
import { AccessTable } from "./AccessTable";
import { FullRunControls } from "./FullRunControls";
import { GrantKeyDialog } from "./GrantKeyDialog";
import { GrantUserDialog } from "./GrantUserDialog";
import { VariantSettingsDialog, type SettingsVariant } from "./VariantSettingsDialog";
import styles from "./VariantAdminTab.module.css";

export interface VariantAdminTabProps {
    variant: SettingsVariant;

    /**
     * Whether to offer the full run, which only the variants of the board have. Defaults to yes; the admin area's
     * page for `droid-live` and the osu! variants turns it off.
     */
    hasFullRun?: boolean;
}

type OpenDialog = "settings" | "user" | "key" | null;

/**
 * The Admin tab of a variant, for people who manage it: its settings, who may use it, and for admins its API keys
 * and the full run.
 */
export function VariantAdminTab({ variant, hasFullRun = true }: VariantAdminTabProps) {
    const { data: me = null } = useMe();
    const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

    // The page already hides the tab from everyone else; this keeps the controls away from them anyway.
    if (!me || !canManageVariant(me, variant.name)) {
        return null;
    }

    const isAdminViewing = isAdmin(me);
    const closeDialog = () => setOpenDialog(null);

    return (
        <div className={styles.admin}>
            <div className={styles.buttons}>
                <Button onClick={() => setOpenDialog("settings")}>Edit settings</Button>
                <Button variant="secondary" onClick={() => setOpenDialog("user")}>
                    Grant access to user
                </Button>
                {isAdminViewing && (
                    <Button variant="secondary" onClick={() => setOpenDialog("key")}>
                        Grant access to key
                    </Button>
                )}
            </div>
            {isAdminViewing && hasFullRun && <FullRunControls variant={variant.name} />}
            <AccessTable variant={variant.name} me={me} />
            <VariantSettingsDialog
                variant={variant}
                canChangeAdminSettings={isAdminViewing}
                isOpen={openDialog === "settings"}
                onClose={closeDialog}
            />
            <GrantUserDialog
                variant={variant.name}
                isAdmin={isAdminViewing}
                isOpen={openDialog === "user"}
                onClose={closeDialog}
            />
            {isAdminViewing && (
                <GrantKeyDialog
                    variant={variant.name}
                    isOpen={openDialog === "key"}
                    onClose={closeDialog}
                />
            )}
        </div>
    );
}
