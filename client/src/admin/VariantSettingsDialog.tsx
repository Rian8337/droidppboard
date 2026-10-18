import type { PPVariant } from "app-structures";
import { useState, type SubmitEvent } from "react";
import {
    maxVariantDescriptionLength,
    maxVariantTitleLength,
    useAdminVariants,
    useRemoveAlias,
    useSetAlias,
    useUpdateVariant,
    type VariantChanges,
} from "../api/manage";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Dialog } from "../components/Dialog";
import { TextField } from "../components/TextField";
import { DescriptionEditor } from "./DescriptionEditor";
import styles from "./VariantSettingsDialog.module.css";
import { formatError } from "../api/http";

/** What the settings need of a variant: both the site's variants and the admin list have it. */
export type SettingsVariant = Pick<
    PPVariant,
    "name" | "title" | "description" | "public" | "available"
> & { readonly aliases: readonly string[] };

export interface VariantSettingsDialogProps {
    variant: SettingsVariant;

    /** Whether the person may change who can see the variant, which only admins may. */
    canChangeVisibility: boolean;
    isOpen: boolean;
    onClose: () => void;
}

/** Edits a variant's title, description, aliases and, for admins, visibility. */
export function VariantSettingsDialog({
    variant,
    canChangeVisibility,
    isOpen,
    onClose,
}: VariantSettingsDialogProps) {
    return (
        <Dialog title="Edit settings" isOpen={isOpen} onClose={onClose} isWide>
            <SettingsForm
                variant={variant}
                canChangeVisibility={canChangeVisibility}
                onClose={onClose}
            />
        </Dialog>
    );
}

/** Aliases are path segments of the broker's admin routes, so they are plain names. */
const aliasPattern = /^[A-Za-z0-9_-]+$/;

function SettingsForm({
    variant,
    canChangeVisibility,
    onClose,
}: Omit<VariantSettingsDialogProps, "isOpen">) {
    const [title, setTitle] = useState(variant.title ?? "");
    const [description, setDescription] = useState(variant.description ?? "");
    const [isPublic, setIsPublic] = useState(variant.public);
    const updating = useUpdateVariant(variant.name);

    const isTitleTooLong = title.length > maxVariantTitleLength;
    const isDescriptionTooLong = description.length > maxVariantDescriptionLength;

    // Only what changed is sent, so that a stale form cannot overwrite what someone else saved.
    const changes: VariantChanges = {};

    if (title !== (variant.title ?? "")) {
        changes.title = title.trim() === "" ? null : title;
    }

    if (description !== (variant.description ?? "")) {
        changes.description = description.trim() === "" ? null : description;
    }

    if (canChangeVisibility && isPublic !== variant.public) {
        changes.public = isPublic;
    }

    const isChanged = Object.keys(changes).length > 0;
    const canSave = isChanged && !isTitleTooLong && !isDescriptionTooLong && !updating.isPending;

    function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (canSave) {
            updating.mutate(changes, { onSuccess: onClose });
        }
    }

    return (
        <form className={styles.form} onSubmit={save}>
            <div className={styles.field}>
                <TextField
                    label="Title"
                    maxLength={maxVariantTitleLength}
                    autoComplete="off"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                />
                <span className={isTitleTooLong ? styles.counterOver : styles.counter}>
                    {title.length} / {maxVariantTitleLength}
                </span>
            </div>
            <DescriptionEditor value={description} onChange={setDescription} />
            <p className={styles.note}>
                {variant.available
                    ? "This rework is available: it has a healthy calculator."
                    : "This rework is unavailable: it has no healthy calculator right now."}{" "}
                That follows the calculators and is not set here.
            </p>
            {canChangeVisibility && (
                <Checkbox
                    checked={isPublic}
                    onChange={(event) => setIsPublic(event.target.checked)}
                >
                    Public: anyone can see this rework
                </Checkbox>
            )}
            {updating.error && (
                <p role="alert" className={styles.error}>
                    {formatError(updating.error)}
                </p>
            )}
            <AliasEditor variant={variant} />
            <div className={styles.actions}>
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!canSave}>
                    {updating.isPending ? "Saving..." : "Save"}
                </Button>
            </div>
        </form>
    );
}

/** Adds and removes aliases. Each change is saved at once, apart from the form's Save. */
function AliasEditor({ variant }: { variant: SettingsVariant }) {
    const [alias, setAlias] = useState("");
    const [pendingOwner, setPendingOwner] = useState<string | null>(null);
    // Admins get every variant here, and managers the ones they were granted. A manager cannot see who owns an
    // alias of any other variant, so the broker refuses that move instead.
    const { data: variants = [] } = useAdminVariants();
    const setting = useSetAlias(variant.name);
    const removing = useRemoveAlias();
    const name = alias.trim();
    const isValid = aliasPattern.test(name);
    const currentOwner = variants.find(
        (candidate) => candidate.name !== variant.name && candidate.aliases.includes(name),
    );
    const error = setting.error ?? removing.error;

    function addAlias() {
        // Moving an alias changes where its links go, so the person confirms it.
        if (currentOwner && pendingOwner === null) {
            setPendingOwner(currentOwner.name);

            return;
        }

        setPendingOwner(null);
        setting.mutate(name, { onSuccess: () => setAlias("") });
    }

    return (
        <fieldset className={styles.aliases}>
            <legend>Aliases</legend>
            <p className={styles.note}>Aliases are saved as soon as you add or remove them.</p>
            {variant.aliases.length === 0 ? (
                <p className={styles.note}>This rework has no aliases.</p>
            ) : (
                <ul className={styles.aliasList}>
                    {variant.aliases.map((existing) => (
                        <li key={existing}>
                            <span>{existing}</span>
                            <Button
                                variant="secondary"
                                size="small"
                                aria-label={`Remove alias ${existing}`}
                                disabled={removing.isPending}
                                onClick={() => removing.mutate(existing)}
                            >
                                Remove
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <div className={styles.aliasAdd}>
                <TextField
                    aria-label="New alias"
                    placeholder="New alias"
                    autoComplete="off"
                    value={alias}
                    onChange={(event) => {
                        setAlias(event.target.value);
                        setPendingOwner(null);
                    }}
                    onKeyDown={(event) => {
                        // Enter adds the alias rather than submitting the whole form.
                        if (event.key === "Enter") {
                            event.preventDefault();

                            if (isValid && !setting.isPending) {
                                addAlias();
                            }
                        }
                    }}
                />
                <Button
                    variant="secondary"
                    disabled={!isValid || setting.isPending}
                    onClick={addAlias}
                >
                    {pendingOwner === null ? "Add alias" : "Move alias here"}
                </Button>
            </div>
            {name !== "" && !isValid && (
                <p className={styles.error}>Aliases can use letters, digits, - and _.</p>
            )}
            {pendingOwner !== null && (
                <p role="status" className={styles.note}>
                    {name} points to {pendingOwner} now. Move it to this variant?
                </p>
            )}
            {error && (
                <p role="alert" className={styles.error}>
                    {formatError(error)}
                </p>
            )}
        </fieldset>
    );
}
