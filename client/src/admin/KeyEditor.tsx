import { useState, type SubmitEvent } from "react";
import {
    useChangeVariantGrantOfKey,
    useCreateKey,
    useRevokeKey,
    useUpdateKey,
    type AdminKey,
    type CreatedKey,
} from "../api/manage";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Dialog } from "../components/Dialog";
import { ErrorMessage } from "../components/ErrorMessage";
import { Pill } from "../components/Pill";
import { TextField } from "../components/TextField";
import { formatUtcTime } from "../utils/formatUtcTime";
import styles from "./KeyEditor.module.css";
import { formatError } from "../api/http";

/** The state of the list of variants a key can be granted. */
export interface KeyVariantList {
    /** The names, or `undefined` while they load or if loading failed. */
    names: readonly string[] | undefined;
    error: Error | null;
    onRetry: () => void;
}

export interface KeyEditorProps {
    /** The key to edit, or `null` to create one. */
    apiKey: AdminKey | null;

    /** The variants a key can be granted, as they load. */
    variantList: KeyVariantList;
    onClose: () => void;

    /** Called with the answer to creating a key, which holds the raw key. */
    onCreated: (created: CreatedKey) => void;
}

/**
 * Parses a rate limit input.
 *
 * @returns `null` for an empty input (unlimited), `undefined` if the input is invalid, or the limit.
 */
function parseRateLimit(value: string): number | null | undefined {
    const trimmed = value.trim();

    if (trimmed === "") {
        return null;
    }

    return /^[1-9][0-9]{0,8}$/.test(trimmed) ? Number.parseInt(trimmed, 10) : undefined;
}

const rateLimitLabel = "Requests per minute (empty for unlimited)";
const rateLimitHint = "Enter a positive whole number, or leave empty.";

/** The editor of one API key, or the form that creates one. */
export function KeyEditor({ apiKey, variantList, onClose, onCreated }: KeyEditorProps) {
    return apiKey === null ? (
        <CreateKeyForm variantList={variantList} onClose={onClose} onCreated={onCreated} />
    ) : (
        <EditKeyPanel apiKey={apiKey} variantList={variantList} onClose={onClose} />
    );
}

interface VariantCheckboxesProps {
    variantList: KeyVariantList;

    /** Names to offer besides the listed ones, such as a grant of a variant that is gone. */
    extraNames?: readonly string[];
    isDisabled?: boolean;
    isGranted: (variant: string) => boolean;
    onToggle: (variant: string, isGranted: boolean) => void;
}

/** The variants as checkboxes, or a message while they load or when they could not. */
function VariantCheckboxes({
    variantList,
    extraNames = [],
    isDisabled = false,
    isGranted,
    onToggle,
}: VariantCheckboxesProps) {
    if (variantList.error) {
        return (
            <ErrorMessage message={formatError(variantList.error)} onRetry={variantList.onRetry} />
        );
    }

    if (!variantList.names) {
        return <p className={styles.note}>Loading reworks...</p>;
    }

    const names = [
        ...variantList.names,
        ...extraNames.filter((name) => !variantList.names?.includes(name)),
    ];

    return (
        <fieldset className={styles.variants}>
            <legend>Reworks</legend>
            {names.map((variant) => (
                <Checkbox
                    key={variant}
                    checked={isGranted(variant)}
                    disabled={isDisabled}
                    onChange={(event) => onToggle(variant, event.target.checked)}
                >
                    {variant}
                </Checkbox>
            ))}
        </fieldset>
    );
}

function CreateKeyForm({
    variantList,
    onClose,
    onCreated,
}: Pick<KeyEditorProps, "variantList" | "onClose" | "onCreated">) {
    const [name, setName] = useState("");
    const [limit, setLimit] = useState("");
    const [allVariants, setAllVariants] = useState(false);
    const [canActForUsers, setCanActForUsers] = useState(false);
    const [grants, setGrants] = useState<readonly string[]>([]);
    const creating = useCreateKey();
    const rateLimit = parseRateLimit(limit);
    const canCreate = name.trim() !== "" && rateLimit !== undefined && !creating.isPending;

    function create(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canCreate) {
            return;
        }

        creating.mutate(
            {
                name: name.trim(),
                rateLimitPerMinute: rateLimit,
                allVariants,
                canActForUsers,
                grants: allVariants ? [] : grants,
            },
            {
                onSuccess: (created) => {
                    onCreated(created);
                    // The raw key now lives with the dialog only.
                    creating.reset();
                },
            },
        );
    }

    return (
        <form className={styles.editor} onSubmit={create}>
            <h2 className={styles.title}>Create key</h2>
            <TextField
                label="Name"
                autoComplete="off"
                value={name}
                onChange={(event) => setName(event.target.value)}
            />
            <TextField
                label={rateLimitLabel}
                inputMode="numeric"
                autoComplete="off"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
            />
            {rateLimit === undefined && <p className={styles.error}>{rateLimitHint}</p>}
            <Checkbox
                checked={allVariants}
                onChange={(event) => setAllVariants(event.target.checked)}
            >
                Can use every rework
            </Checkbox>
            <Checkbox
                checked={canActForUsers}
                onChange={(event) => setCanActForUsers(event.target.checked)}
            >
                Can act for users
            </Checkbox>
            {!allVariants && (
                <VariantCheckboxes
                    variantList={variantList}
                    isGranted={(variant) => grants.includes(variant)}
                    onToggle={(variant, isGranted) =>
                        setGrants(
                            isGranted
                                ? [...grants, variant]
                                : grants.filter((granted) => granted !== variant),
                        )
                    }
                />
            )}
            {creating.error && (
                <p role="alert" className={styles.error}>
                    {formatError(creating.error)}
                </p>
            )}
            <div className={styles.actions}>
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!canCreate}>
                    {creating.isPending ? "Creating..." : "Create"}
                </Button>
            </div>
        </form>
    );
}

function EditKeyPanel({
    apiKey,
    variantList,
    onClose,
}: Pick<KeyEditorProps, "variantList" | "onClose"> & { apiKey: AdminKey }) {
    const [limit, setLimit] = useState(apiKey.rateLimitPerMinute?.toString() ?? "");
    const [isConfirmingRevoke, setIsConfirmingRevoke] = useState(false);
    const updating = useUpdateKey(apiKey.name);
    const granting = useChangeVariantGrantOfKey(apiKey.name);
    const revoking = useRevokeKey(apiKey.name);
    const rateLimit = parseRateLimit(limit);
    const isRevoked = apiKey.revokedAt !== null;
    const isBusy = updating.isPending || granting.isPending;
    const error = updating.error ?? granting.error;

    function openRevokeDialog() {
        revoking.reset();
        setIsConfirmingRevoke(true);
    }

    function closeRevokeDialog() {
        revoking.reset();
        setIsConfirmingRevoke(false);
    }

    function saveLimit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (rateLimit !== undefined && rateLimit !== apiKey.rateLimitPerMinute) {
            updating.mutate({ rateLimitPerMinute: rateLimit });
        }
    }

    return (
        <div className={styles.editor}>
            <div className={styles.heading}>
                <h2 className={styles.title}>{apiKey.name}</h2>
                <Pill tone={isRevoked ? "failure" : "success"}>
                    {isRevoked ? "Revoked" : "Active"}
                </Pill>
            </div>
            <p className={styles.note}>Created {formatUtcTime(apiKey.createdAt)}.</p>
            {isRevoked ? (
                <p className={styles.note}>
                    Revoked {formatUtcTime(apiKey.revokedAt)}. A revoked key can no longer be used
                    or changed.
                </p>
            ) : (
                <>
                    <form className={styles.limit} onSubmit={saveLimit}>
                        <TextField
                            label={rateLimitLabel}
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="Unlimited"
                            value={limit}
                            onChange={(event) => setLimit(event.target.value)}
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={
                                rateLimit === undefined ||
                                rateLimit === apiKey.rateLimitPerMinute ||
                                updating.isPending
                            }
                        >
                            Save limit
                        </Button>
                    </form>
                    {rateLimit === undefined && <p className={styles.error}>{rateLimitHint}</p>}
                    <Checkbox
                        checked={apiKey.allVariants}
                        disabled={isBusy}
                        onChange={(event) => updating.mutate({ allVariants: event.target.checked })}
                    >
                        Can use every rework
                    </Checkbox>
                    <Checkbox
                        checked={apiKey.canActForUsers}
                        disabled={isBusy}
                        onChange={(event) =>
                            updating.mutate({ canActForUsers: event.target.checked })
                        }
                    >
                        Can act for users
                    </Checkbox>
                    {apiKey.allVariants ? (
                        <p className={styles.note}>
                            This key can use every rework, so there are no reworks to pick.
                        </p>
                    ) : (
                        <VariantCheckboxes
                            variantList={variantList}
                            extraNames={apiKey.grants}
                            isDisabled={isBusy}
                            isGranted={(variant) => apiKey.grants.includes(variant)}
                            onToggle={(variant, isGranted) =>
                                granting.mutate({ variant, isGranted })
                            }
                        />
                    )}
                    {error && (
                        <p role="alert" className={styles.error}>
                            {formatError(error)}
                        </p>
                    )}
                </>
            )}
            <div className={styles.actions}>
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
                {!isRevoked && (
                    <Button variant="danger" onClick={openRevokeDialog}>
                        Revoke key
                    </Button>
                )}
            </div>
            <Dialog
                title={`Revoke ${apiKey.name}?`}
                isOpen={isConfirmingRevoke}
                onClose={closeRevokeDialog}
            >
                <p className={styles.note}>
                    Anything using this key stops working, and a revoked key cannot be restored.
                </p>
                {revoking.error && (
                    <p role="alert" className={styles.error}>
                        {formatError(revoking.error)}
                    </p>
                )}
                <div className={styles.actions}>
                    <Button variant="ghost" onClick={closeRevokeDialog}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        disabled={revoking.isPending}
                        onClick={() =>
                            revoking.mutate(undefined, {
                                onSuccess: () => setIsConfirmingRevoke(false),
                            })
                        }
                    >
                        Revoke
                    </Button>
                </div>
            </Dialog>
        </div>
    );
}
