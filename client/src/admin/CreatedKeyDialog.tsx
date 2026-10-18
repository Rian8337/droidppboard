import { Button } from "../components/Button";
import { CopyButton } from "../components/CopyButton";
import { Dialog } from "../components/Dialog";
import { TextField } from "../components/TextField";
import type { CreatedKey } from "../api/manage";
import styles from "./CreatedKeyDialog.module.css";

export interface CreatedKeyDialogProps {
    /** The key that was just created, or `null` when there is none to show. */
    created: CreatedKey | null;
    onClose: () => void;
}

/**
 * Shows the raw key of a key that was just created. The server never shows it again, so it only lives in the
 * parent's state: closing the dialog drops it.
 */
export function CreatedKeyDialog({ created, onClose }: CreatedKeyDialogProps) {
    return (
        <Dialog
            title={created ? `Key "${created.key.name}" created` : "Key created"}
            isOpen={created !== null}
            onClose={onClose}
        >
            {created && (
                <div className={styles.content}>
                    <p role="alert" className={styles.warning}>
                        This key will not be shown again
                    </p>
                    <p className={styles.note}>
                        Copy it now and keep it somewhere safe. Once you close this, only a new key
                        can replace it.
                    </p>
                    <div className={styles.key}>
                        <TextField
                            aria-label="Raw API key"
                            readOnly
                            value={created.rawKey}
                            onFocus={(event) => event.target.select()}
                        />
                        <CopyButton text={created.rawKey} />
                    </div>
                    <div className={styles.actions}>
                        <Button onClick={onClose}>Done</Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
